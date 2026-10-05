#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
extraer.py - Convierte el export WXR de casascontenedores.es a JSON.

Uso:  python3 extraer.py ruta/al/export.xml [--ensayo]

Reglas que no se rompen:
  - Las rutas /wp-content/uploads/ NO se renombran nunca (indexadas en Google Imagenes).
  - Las rutas de pagina se conservan tal cual estaban en WordPress.
  - El <h1> real de Elementor es el PRIMER encabezado del cuerpo, aunque venga como <h2>.
  - Tras cada cambio hay que auditar el recuento de etiquetas contra el XML bruto.
"""
import re, os, sys, json, html
from collections import Counter

BASE = "https://casascontenedores.es"
NOMBRE_SITIO = "Casas Contenedores"
RAIZ = os.path.dirname(os.path.abspath(__file__))
SALIDA = os.path.join(RAIZ, "src", "content", "pages")

# ---------------------------------------------------------------- utilidades

def cdata(bloque, etiqueta, ns="wp"):
    m = re.search(r"<%s:%s><!\[CDATA\[(.*?)\]\]></%s:%s>" % (ns, etiqueta, ns, etiqueta),
                  bloque, re.S)
    return m.group(1) if m else ""

def simple(bloque, etiqueta):
    m = re.search(r"<%s>(.*?)</%s>" % (etiqueta, etiqueta), bloque, re.S)
    if not m:
        return ""
    return m.group(1).replace("<![CDATA[", "").replace("]]>", "").strip()

def meta(bloque, clave):
    m = re.search(
        r"<wp:meta_key><!\[CDATA\[%s\]\]></wp:meta_key>\s*"
        r"<wp:meta_value><!\[CDATA\[(.*?)\]\]></wp:meta_value>" % re.escape(clave),
        bloque, re.S)
    return m.group(1) if m else ""

def texto_plano(h):
    h = re.sub(r"<[^>]+>", " ", h)
    h = html.unescape(h).replace("\xa0", " ")
    return re.sub(r"\s+", " ", h).strip()

# ---------------------------------------------------------- limpieza del HTML

RE_FORM = re.compile(r"<form\b.*?</form>", re.S | re.I)
RE_SCRIPT = re.compile(r"<(script|style|noscript)\b.*?</\1>", re.S | re.I)
RE_COMENT = re.compile(r"<!--.*?-->", re.S)
RE_VACIO = re.compile(r"<p>(?:\s|&nbsp;|<br\s*/?>)*</p>", re.I)

def limpiar(cuerpo):
    """Deja HTML semantico limpio. Devuelve (html, avisos)."""
    avisos = Counter()

    cuerpo = RE_SCRIPT.sub("", cuerpo)
    cuerpo = RE_COMENT.sub("", cuerpo)

    # Formularios: se sustituyen por un marcador; el componente los repone.
    n_form = len(RE_FORM.findall(cuerpo))
    if n_form:
        avisos["formularios_eliminados"] += n_form
        cuerpo = RE_FORM.sub('<aside data-formulario="1"></aside>', cuerpo)
    cuerpo = re.sub(r'<div[^>]*class="[^"]*wpcf7[^"]*"[^>]*>', "", cuerpo, flags=re.I)
    cuerpo = re.sub(r"\[contact-form-7[^\]]*\]", '<aside data-formulario="1"></aside>', cuerpo, flags=re.I)

    # Atributos de Elementor / WordPress que no aportan nada.
    cuerpo = re.sub(r'\s(?:data-elementor[a-z-]*|data-id|data-settings|data-widget_type|'
                    r'data-element_type|aria-invalid|aria-required|novalidate|data-status)="[^"]*"',
                    "", cuerpo, flags=re.I)
    cuerpo = re.sub(r'\sclass="(?:[^"]*\b(?:elementor|wpcf7|wp-block)[^"]*)"', "", cuerpo, flags=re.I)

    # URLs absolutas del propio dominio -> relativas. Las de uploads NO se renombran.
    cuerpo = cuerpo.replace(BASE + "/", "/").replace(BASE, "/")
    cuerpo = re.sub(r'(https?:)?//(?:www\.)?casascontenedores\.es/', "/", cuerpo)

    # Imagenes: lazy, sin tocar rutas ni dimensiones.
    def arregla_img(m):
        tag = m.group(0)
        if "loading=" not in tag:
            tag = tag[:-1].rstrip(" /") + ' loading="lazy" decoding="async">'
        return tag
    cuerpo = re.sub(r"<img\b[^>]*>", arregla_img, cuerpo, flags=re.I)

    # Mapas perezosos.
    cuerpo = re.sub(r"<iframe\b(?![^>]*loading=)", '<iframe loading="lazy"', cuerpo, flags=re.I)

    # Restos del acordeon de Elementor.
    cuerpo = re.sub(r'\s(?:id="elementor-tab[^"]*"|data-tab="[^"]*"|role="[^"]*"|'
                    r'aria-controls="[^"]*"|aria-expanded="[^"]*"|aria-live="[^"]*"|'
                    r'aria-atomic="[^"]*"|tabindex="[^"]*")',
                    "", cuerpo, flags=re.I)

    # <a> sin destino: se desenvuelve conservando el texto.
    # OJO: <a(?=[\s>]) o si no tambien casa <aside> y se lo come entero.
    cuerpo = re.sub(r'<a(?=[\s>])(?![^>]*\shref="[^"]+")[^>]*>(.*?)</a\s*>',
                    r"\1", cuerpo, flags=re.S | re.I)

    avisos["href_vacios"] += len(re.findall(r'href="#"', cuerpo))

    # Cascarones vacios.
    for _ in range(3):
        cuerpo = re.sub(r"<(ul|ol|div|span|p)\b[^>]*>\s*</\1>", "", cuerpo, flags=re.I)
    cuerpo = RE_VACIO.sub("", cuerpo)

    cuerpo = envolver_texto(cuerpo)

    cuerpo = re.sub(r"[ \t]+", " ", cuerpo)
    cuerpo = re.sub(r"\n{3,}", "\n\n", cuerpo)
    return cuerpo.strip(), avisos


BLOQUE = {"p", "div", "ul", "ol", "li", "h1", "h2", "h3", "h4", "h5", "h6",
          "table", "thead", "tbody", "tr", "td", "th", "figure", "figcaption",
          "section", "article", "blockquote", "form", "iframe", "img", "hr",
          "dl", "dt", "dd", "picture", "video", "aside"}

def envolver_texto(cuerpo):
    """Envuelve en <p> el texto suelto respetando el arbol HTML.

    Elementor deja nodos de texto colgando de la raiz. Trocear la cadena por
    saltos de linea despedaza los <img> y los <iframe> escritos en varias
    lineas, asi que se recorre el arbol y se corta SOLO dentro de los nodos
    de texto.
    """
    from bs4 import BeautifulSoup, NavigableString, Comment

    sopa = BeautifulSoup(cuerpo, "html.parser")
    acumulado = []

    def volcar():
        if not acumulado:
            return
        grupos, actual = [], []
        for nodo in acumulado:
            if isinstance(nodo, NavigableString):
                partes = str(nodo).split("\n")
                for i, parte in enumerate(partes):
                    if i:
                        grupos.append(actual)
                        actual = []
                    if parte.strip():
                        actual.append(parte)
            else:
                actual.append(str(nodo))
        grupos.append(actual)

        ancla = acumulado[0]
        for grupo in grupos:
            trozo = "".join(grupo).strip()
            if not trozo:
                continue
            if not (texto_plano(trozo) or re.search(r"<(img|iframe)\b", trozo, re.I)):
                continue
            ancla.insert_before(BeautifulSoup("<p>%s</p>" % trozo, "html.parser"))
        for n in acumulado:
            n.extract()
        acumulado.clear()

    for nodo in list(sopa.children):
        if isinstance(nodo, Comment):
            volcar()
            continue
        if isinstance(nodo, NavigableString):
            if nodo.strip():
                acumulado.append(nodo)
            continue
        if nodo.name in BLOQUE:
            volcar()
        else:
            acumulado.append(nodo)
    volcar()

    salida = str(BeautifulSoup(str(sopa), "lxml"))
    salida = re.sub(r"</?(?:html|body)>", "", salida)
    salida = re.sub(r"<p>\s*</p>", "", salida)
    salida = re.sub(r"\s*\n\s*", "\n", salida)
    salida = re.sub(r"\n{2,}", "\n", salida)
    return salida.strip()


def separar_h1(cuerpo, h1_vivo=""):
    """Decide el <h1> de la pagina. Lo pone el layout; el cuerpo no lo lleva.

    Dos casos, medidos contra la web en vivo (estructura-viva.json):

    a) La pagina YA tiene un <h1> hoy (71 de 263: las que llevan activa la
       banda de titulo de OceanWP). Se respeta ese H1 tal cual y el cuerpo
       NO se toca: la jerarquia queda exactamente igual que ahora.

    b) La pagina NO tiene ningun <h1> (192 de 263). Se asciende a H1 el
       PRIMER encabezado del contenido, sin cambiar su texto ni su sitio:
       lo unico que cambia es el nivel. Es la correccion acordada.
    """
    primero = re.search(r"<(h[1234])\b[^>]*>(.*?)</\1>", cuerpo, re.S | re.I)
    texto_primero = texto_plano(primero.group(2)) if primero else ""

    if h1_vivo:
        # 64 de las 71: el H1 que se ve es el primer encabezado del contenido
        # (Elementor lo renderiza como h1). Se saca del cuerpo, como siempre.
        if texto_primero and texto_primero.lower() == h1_vivo.lower():
            cuerpo = cuerpo[:primero.start()] + cuerpo[primero.end():]
            cuerpo = re.sub(r"<(/?)h1\b", r"<\1h2", cuerpo, flags=re.I)
            return cuerpo.strip(), h1_vivo
        # las otras 7 (portada, /renders/, /piscina-contenedor/...): el H1 es
        # el titulo corto de la banda del tema y ademas hay un encabezado
        # propio en el contenido. Se respetan los dos, como estan hoy.
        cuerpo = re.sub(r"<(/?)h1\b", r"<\1h2", cuerpo, flags=re.I)
        return cuerpo.strip(), h1_vivo

    m = re.search(r"<h([12])\b[^>]*>(.*?)</h\1>", cuerpo, re.S | re.I)
    if not m:
        return cuerpo, ""
    h1 = texto_plano(m.group(2))
    if not h1:
        return cuerpo, ""
    cuerpo = cuerpo[:m.start()] + cuerpo[m.end():]
    cuerpo = re.sub(r"<(/?)h1\b", r"<\1h2", cuerpo, flags=re.I)
    return cuerpo.strip(), h1


def extraer_hero(cuerpo):
    """La primera imagen del cuerpo pasa a ser el hero del layout."""
    m = re.search(r'<img\b[^>]*\ssrc="([^"]+)"[^>]*>', cuerpo, re.I)
    if not m:
        return cuerpo, {}
    tag = m.group(0)
    alt = re.search(r'\salt="([^"]*)"', tag, re.I)
    w = re.search(r'\swidth="(\d+)"', tag, re.I)
    h = re.search(r'\sheight="(\d+)"', tag, re.I)
    srcset = re.search(r'\ssrcset="([^"]*)"', tag, re.I)
    hero = {"src": m.group(1), "alt": alt.group(1) if alt else ""}
    if w: hero["ancho"] = int(w.group(1))
    if h: hero["alto"] = int(h.group(1))
    if srcset: hero["srcset"] = srcset.group(1)
    cuerpo = (cuerpo[:m.start()] + cuerpo[m.end():]).strip()
    return cuerpo, hero


def extraer_faq(bloque_item):
    """Saca el acordeon de Elementor como FAQ (alimenta el JSON-LD FAQPage)."""
    m = re.search(r"<wp:meta_key><!\[CDATA\[_elementor_data\]\]></wp:meta_key>\s*"
                  r"<wp:meta_value><!\[CDATA\[(.*?)\]\]></wp:meta_value>", bloque_item, re.S)
    if not m:
        return []
    try:
        datos = json.loads(html.unescape(m.group(1)))
    except Exception:
        return []
    widgets = []
    def recorrer(els):
        for e in els:
            if isinstance(e, dict):
                if e.get("elType") == "widget":
                    widgets.append(e)
                recorrer(e.get("elements", []) or [])
    recorrer(datos)
    faq = []
    for w in widgets:
        if w.get("widgetType") not in ("accordion", "toggle"):
            continue
        for t in (w.get("settings", {}) or {}).get("tabs", []) or []:
            preg = texto_plano(str(t.get("tab_title", "")))
            resp = texto_plano(str(t.get("tab_content", "")))
            if preg and resp and len(resp) > 25:
                faq.append({"pregunta": preg, "respuesta": resp})
    return faq


# -------------------------------------------------------- auditoria de perdidas

ETIQUETAS = ("img", "a", "h2", "h3", "h4", "li", "iframe", "table", "strong")

def contar(h):
    c = Counter()
    for e in ETIQUETAS:
        c[e] = len(re.findall(r"<%s(?=[\s>])" % e, h, re.I))
    return c


# ------------------------------------------------------------------- extraer

def main():
    if len(sys.argv) < 2:
        sys.exit("uso: extraer.py export.xml [--ensayo]")
    ruta = sys.argv[1]
    ensayo = "--ensayo" in sys.argv

    # H1 que tiene hoy cada pagina en la web viva, medido con
    # scripts/descargar-estructura.mjs. Si no esta el fichero, se asciende
    # el primer encabezado en todas.
    h1_vivos = {}
    fichero_vivo = os.path.join(RAIZ, "estructura-viva.json")
    if os.path.exists(fichero_vivo):
        with open(fichero_vivo, encoding="utf-8") as f:
            for r, datos in json.load(f).items():
                lista = datos.get("h1") or []
                if lista and lista[0].strip():
                    h1_vivos[r] = lista[0].strip()
        print("H1 leidos de la web viva: %d" % len(h1_vivos))

    xml = open(ruta, encoding="utf-8").read()
    items = re.findall(r"<item>(.*?)</item>", xml, re.S)

    paginas, resumen = [], Counter()
    antes, despues = Counter(), Counter()

    for it in items:
        if cdata(it, "post_type") != "page":
            continue
        if cdata(it, "status") != "publish":
            resumen["no_publicadas"] += 1
            continue

        slug = cdata(it, "post_name")
        enlace = simple(it, "link")
        m = re.search(r"<content:encoded><!\[CDATA\[(.*?)\]\]></content:encoded>", it, re.S)
        bruto = m.group(1) if m else ""

        titulo_wp = html.unescape(simple(it, "title"))

        titulo_seo = html.unescape(meta(it, "_yoast_wpseo_title")) or ""
        titulo_seo = (titulo_seo.replace("%%title%%", titulo_wp)
                                .replace("%%page%%", "")
                                .replace("%%sep%%", "-")
                                .replace("%%sitename%%", NOMBRE_SITIO)).strip(" -")
        descripcion = html.unescape(meta(it, "_yoast_wpseo_metadesc")).strip()
        foco = html.unescape(meta(it, "_yoast_wpseo_focuskw")).strip()
        noindex = meta(it, "_yoast_wpseo_meta-robots-noindex") == "1"

        # auditoria: se cuenta el bruto sin formularios (los quitamos a proposito)
        bruto_sin_form = RE_SCRIPT.sub("", RE_FORM.sub("", bruto))
        antes.update(contar(bruto_sin_form))

        ruta_provisional = enlace.replace(BASE, "").strip() or "/"
        if not ruta_provisional.endswith("/"):
            ruta_provisional += "/"

        cuerpo, avisos = limpiar(bruto)
        cuerpo, h1 = separar_h1(cuerpo, h1_vivos.get(ruta_provisional, ""))
        cuerpo, hero = extraer_hero(cuerpo)
        faq = extraer_faq(it)

        # el h1 y el hero salen del cuerpo a proposito: se suman para cuadrar
        cuenta = contar(cuerpo)
        if hero:
            cuenta["img"] += 1
        despues.update(cuenta)

        resumen.update(avisos)
        if faq:
            resumen["paginas_con_faq"] += 1
            resumen["preguntas_faq"] += len(faq)
        if hero:
            resumen["con_hero"] += 1

        ruta_url = "/" if slug in ("", "inicio", "home") else "/%s/" % slug
        if enlace:
            p = enlace.replace(BASE, "").strip()
            if p in ("", "/"):
                ruta_url = "/"
            elif p.startswith("/"):
                ruta_url = p if p.endswith("/") else p + "/"

        paginas.append({
            "slug": slug or "inicio",
            "ruta": ruta_url,
            "titulo": titulo_wp,
            "h1": h1 or titulo_wp,
            "tituloSeo": titulo_seo or titulo_wp,
            "descripcion": descripcion,
            "palabraClave": foco,
            "noindex": noindex,
            "hero": hero,
            "faq": faq,
            "cuerpo": cuerpo,
            "palabras": len(texto_plano(cuerpo).split()),
        })
        resumen["paginas"] += 1
        if not descripcion:
            resumen["sin_metadesc"] += 1
        if not h1:
            resumen["sin_h1"] += 1
        if not foco:
            resumen["sin_palabra_clave"] += 1

    print("ENSAYO" if ensayo else "APLICANDO")
    for k, v in sorted(resumen.items()):
        print("  %-26s %s" % (k, v))

    print("\n  AUDITORIA DE ETIQUETAS (bruto -> json)")
    for e in ETIQUETAS:
        a, d = antes[e], despues[e]
        marca = "ok" if a == d else ("PIERDE %d" % (a - d) if a > d else "SOBRAN %d" % (d - a))
        print("  %-10s %7d -> %7d   %s" % (e, a, d, marca))

    vacias = [p["slug"] for p in paginas if p["palabras"] < 40]
    print("\n  paginas con menos de 40 palabras: %d  %s" % (len(vacias), vacias[:10]))

    # rutas duplicadas: romperia el enrutado
    rutas = Counter(p["ruta"] for p in paginas)
    dup = [r for r, n in rutas.items() if n > 1]
    if dup:
        print("  RUTAS DUPLICADAS:", dup)

    if ensayo:
        return

    os.makedirs(SALIDA, exist_ok=True)
    for f in os.listdir(SALIDA):
        if f.endswith(".json"):
            os.remove(os.path.join(SALIDA, f))
    for p in paginas:
        with open(os.path.join(SALIDA, p["slug"] + ".json"), "w", encoding="utf-8") as f:
            json.dump(p, f, ensure_ascii=False, indent=1)
    print("\nescritos %d JSON en %s" % (len(paginas), SALIDA))


if __name__ == "__main__":
    main()
