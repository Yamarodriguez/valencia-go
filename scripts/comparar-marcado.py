# -*- coding: utf-8 -*-
"""
comparar-marcado.py — compara el marcado de la web nueva (dist/) con el de la
web vieja (referencia/), pagina a pagina y pieza a pieza.

    python scripts/comparar-marcado.py [--solo-es] [--rutas /a/,/b/] [--max 0]

El MISMO lector de HTML (lxml) para los dos lados. Tres cuentas separadas:

  CABEZA     las etiquetas de <head>, en orden (el orden de las hojas manda).
             A la vieja se le aplican antes las reglas de src/data/cabeza.json
             (lo que se quita y lo que se sustituye a proposito) y las
             direcciones se comparan sin el dominio.
  ARMAZON    todo lo de <body> que no cuelga de un elemento de Elementor:
             envoltorios, cabecera, pie, ventanas, guiones en linea (con su
             texto), y los atributos de <html> y <body>.
  CONTENIDO  cada elemento con data-id (contenedores y widgets de Elementor):
             etiqueta, clases COMO CONJUNTO, data-* como objeto (los que son
             JSON se comparan como JSON) y lo que lleva dentro, incluido el
             atributo d de cada <path> de los iconos SVG. Lo que cuelga de otro
             data-id se compara en su propio elemento, no dos veces.

Lo que cambia en cada visita (nonces y similares) se ignora: lista en
src/data/marcado-volatil.json.

Informe completo en informes/comparacion-marcado.md, agrupado por tipo de
pagina, con lo que falta y lo que sobra. Sale con 1 si hay alguna diferencia o
falta alguna pagina en dist/.
"""
import os, re, sys, json, hashlib, html
from collections import Counter, defaultdict
import lxml.html

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = os.path.join(RAIZ, "referencia")
DIST = os.path.join(RAIZ, "dist")
INFORME = os.path.join(RAIZ, "informes", "comparacion-marcado.md")

def leer_json(ruta, defecto):
    return json.load(open(ruta, encoding="utf-8")) if os.path.exists(ruta) else defecto

site = leer_json(os.path.join(RAIZ, "src", "data", "site.json"), {})
cabeza_reglas = leer_json(os.path.join(RAIZ, "src", "data", "cabeza.json"), {"quitar": [], "sustituir": []})
volatil = leer_json(os.path.join(RAIZ, "src", "data", "marcado-volatil.json"), {"atributos": [], "atributos_json_claves": [], "guiones_id": []})
indice = leer_json(os.path.join(RAIZ, "src", "content", "paginas", "indice.json"), [])
HOST = re.sub(r"^www\.", "", re.sub(r"^https?://", "", site.get("dominio", "")).strip("/"))
# El dominio se quita igual que lo hace scripts/lib/relativizar.mjs:
#   https://dominio/x -> /x      https://dominio (sin barra) -> /
#   y en JSON escapado: https:\/\/dominio\/x -> \/x   https:\/\/dominio -> \/
RX_DOM = re.compile(r"(?:https?:)?(\\/\\/|//)(?:www\.)?" + re.escape(HOST) + r"(?:\\/|/)?", re.I)
def _sin_dom(m):
    return "/" if m.group(1) == "//" else "\\/"
ATR_VOLATIL = set(volatil.get("atributos", []))
CLAVES_VOLATIL = set(volatil.get("atributos_json_claves", []))
GUIONES_VOLATIL = set(volatil.get("guiones_id", []))

def arg(nombre, defecto=""):
    return sys.argv[sys.argv.index(nombre) + 1] if nombre in sys.argv else defecto

SOLO_ES = "--solo-es" in sys.argv
RUTAS = [r for r in arg("--rutas").split(",") if r]
MAXIMO = int(arg("--max", "0") or 0)

esp = lambda t: re.sub(r"\s+", " ", t or "").strip()
sin_dominio = lambda t: RX_DOM.sub(_sin_dom, t or "")

def quitar_claves(o):
    if isinstance(o, dict):
        return {k: quitar_claves(v) for k, v in o.items() if k not in CLAVES_VOLATIL}
    if isinstance(o, list):
        return [quitar_claves(x) for x in o]
    return sin_dominio(o) if isinstance(o, str) else o

def valor(nombre, v):
    """Normaliza el valor de un atributo para compararlo."""
    v = v or ""
    if nombre == "class":
        return " ".join(sorted(set(v.split())))
    if nombre == "style":
        return ";".join(sorted(esp(x).replace(": ", ":") for x in v.split(";") if esp(x)))
    s = v.strip()
    if s[:1] in "{[" and s[-1:] in "}]":
        try:
            return json.dumps(quitar_claves(json.loads(s)), sort_keys=True, ensure_ascii=False)
        except Exception:
            pass
    return esp(sin_dominio(v))

def atributos(e, solo_data=False):
    a = {k: valor(k, v) for k, v in e.attrib.items()
         if k not in ATR_VOLATIL and (not solo_data or k.startswith("data-"))}
    if e.tag == "script":
        # la Fase 6 deja los guiones como type="text/plain" data-aplazado="js|module":
        # para comparar, se restaura su tipo; y el tipo "javascript" explicito no cuenta
        if "data-aplazado" in a:
            tipo = "module" if a.pop("data-aplazado") == "module" else ""
            a.pop("type", None)
            if tipo:
                a["type"] = tipo
        elif re.match(r"^(text|application)/(javascript|ecmascript|x-javascript)$", (a.get("type") or "").strip().lower()):
            a.pop("type", None)
    return a

def texto_guion(e):
    t = esp(sin_dominio(e.text_content() if e.tag != "script" else (e.text or "")))
    return hashlib.md5(t.encode("utf-8")).hexdigest()[:10] + ":" + str(len(t))

def interior(raiz):
    """Lo que lleva dentro un elemento, en forma canonica. Los descendientes
    con data-id se sustituyen por una marca (se comparan aparte)."""
    partes = []
    def rec(e, es_raiz=False):
        if not isinstance(e.tag, str):
            return
        if not es_raiz:
            if e.get("data-id") is not None:
                partes.append("<@%s>" % e.get("data-id"))
                return
            a = atributos(e)
            partes.append("<%s %s>" % (e.tag, " ".join('%s="%s"' % kv for kv in sorted(a.items()))))
        if e.tag in ("script", "style"):
            partes.append(texto_guion(e))
        else:
            if esp(e.text):
                partes.append(esp(sin_dominio(e.text)))
            for h in e:
                rec(h)
                if esp(h.tail):
                    partes.append(esp(sin_dominio(h.tail)))
        if not es_raiz:
            partes.append("</%s>" % e.tag)
    rec(raiz, True)
    return "".join(partes)

# Fase 6 (src/data/velocidad.json): guiones que la nueva quita y hojas que reune.
velocidad = leer_json(os.path.join(RAIZ, "src", "data", "velocidad.json"), {"activo": False})
VEL = bool(velocidad.get("activo"))
tramos_hojas = leer_json(os.path.join(RAIZ, "src", "content", "paginas", "hojas.json"), {}) if VEL else {}

def guion_quitado(e):
    """True si es un <script> que velocidad.json manda quitar (se salta en la vieja)."""
    if not VEL or e.tag != "script":
        return False
    i = e.get("id") or ""
    for r in velocidad.get("guiones_quitar", []):
        if r.get("id") and i and re.search(r["id"], i):
            return True
        if r.get("contenido") and not i and re.search(r["contenido"], e.text or ""):
            return True
    return False

def firmas_cabeza(e, es_vieja):
    """Una o varias firmas por elemento del <head>."""
    if not isinstance(e.tag, str):
        return []
    if e.get("data-nuevo") is not None:
        if e.get("data-nuevo") == "hojas":  # la hoja reunida vale por las piezas originales, en orden
            h = (e.get("id") or "").replace("hojas-", "")
            salida = []
            for x in tramos_hojas.get(h, []):
                if isinstance(x, str):
                    salida.append("<link stylesheet %s>" % sin_dominio(x))
                elif "css" in x:  # un <style id> absorbido: la misma firma que tendria en la vieja
                    t = esp(sin_dominio(html.unescape(x["css"])))
                    salida.append('<style id="%s"> %s:%d' % (x["id"], hashlib.md5(t.encode("utf-8")).hexdigest()[:10], len(t)))
                else:
                    salida.append("<link stylesheet %s>" % sin_dominio(x["href"]))
            return salida or ["?" + h]
        return []
    if guion_quitado(e):
        return []
    if VEL and e.tag == "link" and (e.get("rel") or "").lower() == "stylesheet":
        return ["<link stylesheet %s>" % sin_dominio(e.get("href") or "")]
    f = firma_cabeza(e)
    return [f] if f else []

def firma_cabeza(e):
    if not isinstance(e.tag, str):
        return None
    a = atributos(e)
    if e.tag in ("script", "style", "title", "noscript"):
        if e.tag == "script" and a.get("id") in GUIONES_VOLATIL:
            return "<script id=%s (volatil)>" % a.get("id")
        return "<%s %s> %s" % (e.tag, " ".join('%s="%s"' % kv for kv in sorted(a.items())), texto_guion(e))
    return "<%s %s>" % (e.tag, " ".join('%s="%s"' % kv for kv in sorted(a.items())))

def aplicar_reglas_cabeza(elementos):
    """A la cabeza VIEJA: quita y sustituye lo mismo que partir-paginas.mjs."""
    salida = []
    for e in elementos:
        if not isinstance(e.tag, str):
            continue
        fuera = False
        for q in cabeza_reglas.get("quitar", []):
            if e.tag == q["etiqueta"] and e.get(q["atributo"]) is not None and re.search(q["valor"], e.get(q["atributo"]), re.I):
                fuera = True
        if fuera:
            continue
        for s in cabeza_reglas.get("sustituir", []):
            if e.tag == s["etiqueta"] and e.get(s["atributo"]) is not None and re.search(s["valor"], e.get(s["atributo"]), re.I):
                e.set(s["atributo"], s["por"])
        salida.append(e)
    return salida

def analizar(fichero, es_vieja):
    doc = lxml.html.fromstring(open(fichero, encoding="utf-8", errors="replace").read())
    raiz = doc if doc.tag == "html" else doc.getroottree().getroot()
    head = raiz.find("head"); body = raiz.find("body")
    cabeza = list(head) if head is not None else []
    if es_vieja:
        cabeza = aplicar_reglas_cabeza(cabeza)
    cabeza = [f for e in cabeza for f in firmas_cabeza(e, es_vieja)]
    armazon = ["<html %s>" % sorted(atributos(raiz).items()), "<body %s>" % sorted(atributos(body).items())]
    contenido = {}
    veces = Counter()
    def rec(e, camino, dentro):
        if not isinstance(e.tag, str):
            return
        # lo que la web nueva anade a proposito va marcado con data-nuevo: no se compara
        if e.get("data-nuevo") is not None:
            return
        # los guiones que velocidad.json quita: tampoco (en la vieja siguen estando)
        if guion_quitado(e):
            return
        did = e.get("data-id")
        if did is not None:
            veces[did] += 1
            clave = "%s#%d" % (did, veces[did])
            clases = set((e.get("class") or "").split())
            tipo = e.get("data-widget_type") or e.get("data-element_type") or e.get("data-e-type") or "?"
            contenido[clave] = {"tag": e.tag, "class": valor("class", e.get("class")), "data": atributos(e, True),
                                "otros": {k: v for k, v in atributos(e).items() if not k.startswith("data-") and k != "class"},
                                "dentro": hashlib.md5(interior(e).encode("utf-8")).hexdigest()[:12], "tipo": tipo}
            for h in e:
                rec(h, camino, True)
            return
        if not dentro:
            a = atributos(e)
            if e.tag in ("script", "style"):
                if e.tag == "script" and a.get("id") in GUIONES_VOLATIL:
                    armazon.append("%s>script id=%s (volatil)" % (camino, a.get("id")))
                else:
                    armazon.append("%s>%s %s %s" % (camino, e.tag, sorted(a.items()), texto_guion(e)))
                return
            texto = esp(sin_dominio(e.text))
            armazon.append("%s>%s %s%s" % (camino, e.tag, sorted(a.items()), (" «%s»" % texto[:60]) if texto else ""))
        for h in e:
            rec(h, camino + ">" + e.tag, dentro)
    if body is not None:
        for h in body:
            rec(h, "body", False)
    return cabeza, armazon, contenido

def diferencias_lista(vieja, nueva):
    cv, cn = Counter(vieja), Counter(nueva)
    faltan = list((cv - cn).elements()); sobran = list((cn - cv).elements())
    orden = (not faltan and not sobran and vieja != nueva)
    return faltan, sobran, orden

paginas = [p for p in indice if (not SOLO_ES or not re.match(r"^/(en|it|fr|pl)/", p["ruta"])) and (not RUTAS or p["ruta"] in RUTAS)]
if MAXIMO:
    paginas = paginas[:MAXIMO]
if not paginas:
    sys.exit("no hay paginas que comparar (falta src/content/paginas/indice.json)")

tot = Counter(); por_tipo = defaultdict(Counter); ejemplos = defaultdict(list); sin_dist = []; sin_ref = []; paginas_mal = set()
def apuntar(grupo, clase, tipo, ruta, detalle):
    tot[grupo] += 1; por_tipo[tipo][grupo] += 1; paginas_mal.add(ruta)
    k = "%s — %s" % (grupo, clase)
    tot[k] += 1
    if len(ejemplos[k]) < 12:
        ejemplos[k].append("%s: %s" % (ruta, detalle[:400]))

for n, p in enumerate(paginas, 1):
    ruta = p["ruta"]; sub = ruta.strip("/").split("/") if ruta != "/" else []
    fv = os.path.join(REF, *sub, "index.html"); fn = os.path.join(DIST, *sub, "index.html")
    if not os.path.exists(fv): sin_ref.append(ruta); continue
    if not os.path.exists(fn): sin_dist.append(ruta); continue
    cv, av, kv = analizar(fv, True)
    cn, an, kn = analizar(fn, False)
    tipo = p.get("tipo", "?")
    f, s, o = diferencias_lista(cv, cn)
    for x in f: apuntar("CABEZA", "falta en la nueva", tipo, ruta, x)
    for x in s: apuntar("CABEZA", "sobra en la nueva", tipo, ruta, x)
    if o: apuntar("CABEZA", "mismo contenido en otro orden", tipo, ruta, "el orden de las etiquetas de <head> no coincide")
    f, s, o = diferencias_lista(av, an)
    for x in f: apuntar("ARMAZON", "falta en la nueva", tipo, ruta, x)
    for x in s: apuntar("ARMAZON", "sobra en la nueva", tipo, ruta, x)
    if o: apuntar("ARMAZON", "mismo contenido en otro orden", tipo, ruta, "el orden no coincide")
    for clave in kv.keys() - kn.keys(): apuntar("CONTENIDO", "falta el elemento (%s)" % kv[clave]["tipo"], tipo, ruta, clave)
    for clave in kn.keys() - kv.keys(): apuntar("CONTENIDO", "sobra el elemento (%s)" % kn[clave]["tipo"], tipo, ruta, clave)
    for clave in kv.keys() & kn.keys():
        a, b = kv[clave], kn[clave]
        for campo, nombre in (("tag", "etiqueta"), ("class", "clases"), ("data", "data-*"), ("otros", "otros atributos"), ("dentro", "lo de dentro")):
            if a[campo] != b[campo]:
                apuntar("CONTENIDO", "distinto: %s (%s)" % (nombre, a["tipo"]), tipo, ruta, "%s  vieja=%s  nueva=%s" % (clave, str(a[campo])[:150], str(b[campo])[:150]))
    tot["elementos"] += len(kv); tot["paginas"] += 1
    if n % 200 == 0:
        print("  %d/%d" % (n, len(paginas)), flush=True)

lineas = ["# Comparacion de marcado — vieja (referencia/) frente a nueva (dist/)", "",
          "Paginas comparadas: %d. Elementos de Elementor (data-id) comparados: %d." % (tot["paginas"], tot["elementos"]),
          "Diferencias: CABEZA %d · ARMAZON %d · CONTENIDO %d. Paginas con alguna diferencia: %d." % (tot["CABEZA"], tot["ARMAZON"], tot["CONTENIDO"], len(paginas_mal)),
          "Paginas que faltan en dist/: %d. Paginas sin referencia: %d." % (len(sin_dist), len(sin_ref)), "",
          "## Por tipo de pagina", "", "| Tipo | CABEZA | ARMAZON | CONTENIDO |", "|---|---|---|---|"]
for t in sorted(por_tipo):
    lineas.append("| %s | %d | %d | %d |" % (t, por_tipo[t]["CABEZA"], por_tipo[t]["ARMAZON"], por_tipo[t]["CONTENIDO"]))
lineas += ["", "## Por clase de diferencia", ""]
for k in sorted(ejemplos, key=lambda k: -tot[k]):
    lineas += ["### %s (%d)" % (k, tot[k])] + ["- " + e for e in ejemplos[k]] + [""]
lineas += ["## Faltan en dist/ (%d)" % len(sin_dist)] + ["- " + r for r in sin_dist[:200]] + ["", "## Sin referencia (%d)" % len(sin_ref)] + ["- " + r for r in sin_ref[:200]]
os.makedirs(os.path.dirname(INFORME), exist_ok=True)
open(INFORME, "w", encoding="utf-8").write("\n".join(lineas) + "\n")

total = tot["CABEZA"] + tot["ARMAZON"] + tot["CONTENIDO"]
print("marcado: %d paginas, %d elementos; diferencias CABEZA %d, ARMAZON %d, CONTENIDO %d (en %d paginas); faltan en dist %d, sin referencia %d -> informes/comparacion-marcado.md"
      % (tot["paginas"], tot["elementos"], tot["CABEZA"], tot["ARMAZON"], tot["CONTENIDO"], len(paginas_mal), len(sin_dist), len(sin_ref)))
for k in sorted(ejemplos, key=lambda k: -tot[k])[:8]:
    print("  %5d  %s" % (tot[k], k))
sys.exit(1 if (total or sin_dist or sin_ref) else 0)
