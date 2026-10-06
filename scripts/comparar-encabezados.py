# -*- coding: utf-8 -*-
"""
comparar-encabezados.py — compara encabezado a encabezado (H1, H2 y H3) la web
nueva (dist/) con la web en vivo (estructura-viva.json), pagina por pagina.

    python scripts/comparar-encabezados.py

Que se compara: la SECUENCIA de encabezados, en orden, con su NIVEL. Se avanza
con un puntero (hay titulos repetidos, asi que no vale buscar por texto).
  FALLO  un encabezado de la web viva que no esta en la nueva, o que esta con
         otro nivel (h2 por h3...).
  aviso  un encabezado que la nueva anade (lo anadido a proposito no es fallo).

Excepciones, todas en datos:
  src/data/encabezados.json  {"/ruta/": {"texto viejo": "texto nuevo"}}
                             titulos que el propietario pidio cambiar
  src/data/erratas.json      palabras corregidas a peticion del propietario
                             (se aplican tambien a la web viva antes de comparar)
La regla del H1 aprobada es "se conserva el de la web viva", asi que el H1 se
compara como cualquier otro.

El texto se saca igual en los dos lados (el mismo codigo que usa
scripts/inventario-vivo.py). Informe completo en informes/encabezados.md.
Sale con 1 si hay algun FALLO.
"""
import os, re, sys, json, html

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(RAIZ, "dist")
VIVO = os.path.join(RAIZ, "estructura-viva.json")

def leer(f, d):
    return json.load(open(f, encoding="utf-8")) if os.path.exists(f) else d

if not os.path.exists(VIVO):
    sys.exit("falta estructura-viva.json — ejecuta antes scripts/inventario-vivo.py")
vivo = leer(VIVO, {})
indice = leer(os.path.join(RAIZ, "src", "content", "paginas", "indice.json"), [])
cambios = leer(os.path.join(RAIZ, "src", "data", "encabezados.json"), {})
erratas = leer(os.path.join(RAIZ, "src", "data", "erratas.json"), {"palabras": {}, "frases": []})

def plano(h):
    h = re.sub(r"<[^>]+>", " ", h)
    return re.sub(r"\s+", " ", html.unescape(h).replace("\xa0", " ")).strip()

def corregir(t):
    for mal, bien in (erratas.get("palabras") or {}).items():
        def r(m, bien=bien):
            o = m.group(0)
            return bien.capitalize() if o[:1].isupper() and not o.isupper() else (bien.upper() if o.isupper() and len(o) > 1 else bien)
        t = re.sub(r"(?<!\w)%s(?!\w)" % re.escape(mal), r, t, flags=re.I)
    return t

def encabezados(fichero):
    h = open(fichero, encoding="utf-8", errors="replace").read()
    m = re.search(r"<body\b[^>]*>([\s\S]*)</body>", h)
    cuerpo = re.sub(r"<(script|style|template|noscript)\b[\s\S]*?</\1>", "", m.group(1) if m else h)
    return [(x.group(1).lower(), plano(x.group(2))) for x in re.finditer(r"<(h[1-3])\b[^>]*>([\s\S]*?)</\1>", cuerpo, re.I) if plano(x.group(2))]

fallos, avisos = [], []
iguales = 0; revisadas = 0
for p in indice:
    ruta = p["ruta"]
    if ruta not in vivo:
        fallos.append("%s — no esta en estructura-viva.json" % ruta); continue
    f = os.path.join(DIST, *[x for x in ruta.split("/") if x], "index.html")
    if not os.path.exists(f):
        fallos.append("%s — no esta en dist/" % ruta); continue
    revisadas += 1
    renombres = cambios.get(ruta, {})
    viejos = []
    for linea in vivo[ruta].get("orden", []):
        nivel, texto = linea.split(": ", 1)
        texto = corregir(texto)
        viejos.append((nivel, renombres.get(texto, texto)))
    nuevos = encabezados(f)
    if viejos == nuevos:
        iguales += 1; continue
    puntero = 0; mal = 0; usados = set()
    for nivel, texto in viejos:
        encontrado = None
        for i in range(puntero, len(nuevos)):
            if nuevos[i][1] == texto:
                encontrado = i; break
        if encontrado is None:
            fallos.append("%s — falta el encabezado %s «%s»" % (ruta, nivel, texto[:90])); mal += 1; continue
        if nuevos[encontrado][0] != nivel:
            fallos.append("%s — «%s» era %s y ahora es %s" % (ruta, texto[:90], nivel, nuevos[encontrado][0])); mal += 1
        usados.add(encontrado); puntero = encontrado + 1
    for i, (nivel, texto) in enumerate(nuevos):
        if i not in usados:
            avisos.append("%s — la nueva anade %s «%s»" % (ruta, nivel, texto[:90]))
    if not mal and not any(a.startswith(ruta + " ") for a in avisos[-len(nuevos):]):
        iguales += 1

lineas = ["# Encabezados — web viva frente a nueva", "",
          "Paginas revisadas: %d. Identicas: %d (%.1f %%). FALLOS: %d. Avisos: %d." % (revisadas, iguales, 100.0 * iguales / max(1, revisadas), len(fallos), len(avisos)), "",
          "## FALLOS (%d)" % len(fallos)] + ["- " + x for x in fallos] + ["", "## Avisos (%d)" % len(avisos)] + ["- " + x for x in avisos]
os.makedirs(os.path.join(RAIZ, "informes"), exist_ok=True)
open(os.path.join(RAIZ, "informes", "encabezados.md"), "w", encoding="utf-8").write("\n".join(lineas) + "\n")
print("encabezados: %d paginas, %d identicas (%.1f %%); FALLOS %d, avisos %d -> informes/encabezados.md" % (revisadas, iguales, 100.0 * iguales / max(1, revisadas), len(fallos), len(avisos)))
for x in fallos[:8]:
    print("  FALLO " + x[:200])
sys.exit(1 if fallos else 0)
