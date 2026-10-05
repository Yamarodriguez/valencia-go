# -*- coding: utf-8 -*-
"""inventario-vivo.py — analiza el HTML bajado a referencia/ (solo lectura).

    python scripts/inventario-vivo.py [--solo-es]

Escribe informes/inventario-vivo.json (tipos, cabeceras, hojas, plugins, iconos,
JS, shortcodes, enlaces rotos) y estructura-viva.json (h1/h2/h3, titulo,
descripcion y canonical de cada ruta, que leen comparar-encabezados.mjs y
extraer.py). Hay que pasarlo ANTES de montar-referencia.mjs, que reescribe las
direcciones absolutas (el canonical se guarda tal como estaba en vivo)."""
import re, os, sys, json, html, hashlib
from collections import Counter, defaultdict

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = os.path.join(RAIZ, "referencia")
SOLO_ES = "--solo-es" in sys.argv
BASE = json.load(open(os.path.join(RAIZ, "src", "data", "site.json"), encoding="utf-8"))["dominio"].rstrip("/")

def plano(h):
    h = re.sub(r"<[^>]+>", " ", h)
    return re.sub(r"\s+", " ", html.unescape(h).replace("\xa0", " ")).strip()

paginas = {}
estructura = {}
hojas_sec = Counter(); hojas_ej = {}
plugins = Counter(); plugins_pg = defaultdict(set)
cabeceras = Counter(); cabeceras_pg = defaultdict(list)
pies = Counter(); popups = Counter()
fuentes = Counter(); fuentes_pg = defaultdict(set)
tipos_cuerpo = Counter(); tipos_pg = defaultdict(list)
h1_n = Counter()
shortcodes = Counter(); shortcodes_pg = defaultdict(set)
js_marcas = Counter(); js_pg = defaultdict(set)
enlaces_rotos = {}
iconos = Counter()
externos = Counter()
tamanos = []
secuencias_por_tipo = defaultdict(Counter)

for dirpath, dirs, files in os.walk(REF):
    if "index.html" not in files:
        continue
    ruta = dirpath.replace(REF, "").replace("\\", "/") or "/"
    if not ruta.endswith("/"):
        ruta += "/"
    if SOLO_ES and re.match(r"^/(en|it|fr|pl)/", ruta):
        continue
    h = open(os.path.join(dirpath, "index.html"), encoding="utf-8", errors="replace").read()
    tamanos.append(len(h))
    body = re.search(r"<body\b([^>]*)>([\s\S]*)</body>", h)
    clases = re.search(r'class="([^"]*)"', body.group(1)).group(1).split() if body and re.search(r'class="([^"]*)"', body.group(1)) else []
    cuerpo = body.group(2) if body else h
    # tipo de pagina segun las clases del body
    if "home" in clases: tipo = "portada"
    elif "single-post" in clases: tipo = "entrada"
    elif "single-product" in clases: tipo = "producto"
    elif "single-atraccion" in clases: tipo = "atraccion"
    elif "tax-product_cat" in clases: tipo = "categoria-productos"
    elif "category" in clases: tipo = "categoria-blog"
    elif "page" in clases: tipo = "pagina"
    else: tipo = "otro"
    tipos_cuerpo[tipo] += 1; tipos_pg[tipo].append(ruta)
    # encabezados (dentro de body, quitando scripts/plantillas)
    cuerpo_sin = re.sub(r"<(script|style|template|noscript)\b[\s\S]*?</\1>", "", cuerpo)
    encs = [(m.group(1).lower(), plano(m.group(2))) for m in re.finditer(r"<(h[1-6])\b[^>]*>([\s\S]*?)</\1>", cuerpo_sin, re.I)]
    est = {"h1": [t for n, t in encs if n == "h1" and t], "h2": [t for n, t in encs if n == "h2" and t], "h3": [t for n, t in encs if n == "h3" and t],
           "orden": [n + ": " + t for n, t in encs if t and n in ("h1", "h2", "h3")],
           "titulo": plano((re.search(r"<title[^>]*>([\s\S]*?)</title>", h) or [None, ""])[1]),
           "descripcion": html.unescape((re.search(r'<meta name="description" content="([^"]*)"', h) or [None, ""])[1]),
           "canonical": (re.search(r'<link rel="canonical" href="([^"]*)"', h) or [None, ""])[1]}
    estructura[ruta] = est
    h1_n[len(est["h1"])] += 1
    # plantillas del constructor de temas
    cab = re.findall(r'data-elementor-type="header"[^>]*data-elementor-id="(\d+)"|data-elementor-id="(\d+)"[^>]*data-elementor-type="header"', h)
    cab = [a or b for a, b in cab]
    pie = re.findall(r'data-elementor-type="footer"[^>]*data-elementor-id="(\d+)"|data-elementor-id="(\d+)"[^>]*data-elementor-type="footer"', h)
    pie = [a or b for a, b in pie]
    pops = re.findall(r'data-elementor-type="popup"[^>]*data-elementor-id="(\d+)"|data-elementor-id="(\d+)"[^>]*data-elementor-type="popup"', h)
    pops = sorted(set(a or b for a, b in pops))
    tipos_el = Counter(re.findall(r'data-elementor-type="([^"]+)"', h))
    cabeceras[",".join(cab)] += 1; cabeceras_pg[",".join(cab)].append(ruta)
    pies[",".join(pie)] += 1
    for p in pops: popups[p] += 1
    # hojas
    links = re.findall(r"<link rel='stylesheet' id='([^']+)'|<link rel=\"stylesheet\" id=\"([^\"]+)\"", h)
    ids = [a or b for a, b in links]
    styles = re.findall(r"<style id=['\"]([^'\"]+)['\"]", h)
    sec = "|".join(ids)
    hojas_sec[sec] += 1; hojas_ej.setdefault(sec, ruta)
    secuencias_por_tipo[tipo][hashlib.md5(sec.encode()).hexdigest()[:6]] += 1
    # plugins
    for p in set(re.findall(r"/wp-content/plugins/([a-z0-9_-]+)/", h)):
        plugins[p] += 1; plugins_pg[p].add(ruta)
    # fuentes
    for f in set(re.findall(r"/wp-content/uploads/elementor/google-fonts/css/([a-z0-9-]+)\.css", h)):
        fuentes["elementor-gf:" + f] += 1; fuentes_pg["elementor-gf:" + f].add(ruta)
    for f in set(re.findall(r"(fonts\.googleapis\.com/css2?\?[^\"']+)", h)):
        fuentes["google:" + f[:80]] += 1
    for f in set(re.findall(r"cdnjs\.cloudflare\.com/ajax/libs/font-awesome/([0-9.]+)", h)):
        fuentes["fontawesome-cdn:" + f] += 1; fuentes_pg["fontawesome-cdn:" + f].add(ruta)
    for f in set(re.findall(r"/wp-content/uploads/fonts/([^\"'/]+)/", h)):
        fuentes["wp-font-library:" + f] += 1
    # iconos
    iconos["svg e-font-icon-svg"] += len(re.findall(r"e-font-icon-svg", cuerpo))
    iconos["<i class=fa>"] += len(re.findall(r'<i class="[^"]*\bfa[sbrl]?\b[^"]*"', cuerpo))
    iconos["<i class=eicon>"] += len(re.findall(r'<i class="[^"]*\beicon-', cuerpo))
    # js / efectos
    for marca, rx in (("elementor-invisible", r"elementor-invisible"), ("e-con", r'class="[^"]*\be-con\b'), ("elementor-section", r'class="[^"]*\belementor-section\b'),
                      ("swiper", r"\bswiper\b"), ("elementor-sticky", r"elementor-sticky|data-settings=\"[^\"]*sticky"), ("elementor-popup", r"elementor-popup-modal"),
                      ("loop-grid", r"elementor-widget-loop-grid"), ("turitop", r"turitop"), ("sbi instagram", r"sbi_|instagram-feed"), ("yith wishlist", r"yith-wcwl"),
                      ("wc cart", r"woocommerce-menu-cart|wc-block|add_to_cart|add-to-cart"), ("cf7", r"wpcf7"), ("elementor-form", r"elementor-form\b"), ("joinchat", r"joinchat"),
                      ("complianz", r"cmplz"), ("translatepress", r"trp-language"), ("ivory-search", r"is-search-form|ivory"), ("nested-tabs/accordion", r"e-n-tabs|e-n-accordion"),
                      ("countdown", r"elementor-countdown"), ("mega-menu", r"e-n-menu"), ("iframe", r"<iframe"), ("video", r"elementor-widget-video|<video"), ("background-slideshow", r"background_slideshow|elementor-background-slideshow"),
                      ("shape-divider", r"elementor-shape"), ("eael", r"\beael-"), ("thegem", r"thegem")):
        n = len(re.findall(rx, cuerpo))
        if n:
            js_marcas[marca] += n; js_pg[marca].add(ruta)
    # shortcodes literales en el cuerpo (fuera de script/json)
    for sc in re.findall(r"\[([a-z_][a-z0-9_-]*)(?:\s[^\]]*)?\]", cuerpo_sin):
        if sc in ("a", "i", "sizes", "if"):
            continue
        shortcodes[sc] += 1; shortcodes_pg[sc].add(ruta)
    # enlaces rotos
    rotos = re.findall(r'href="(#|#https?://[^"]*|)"', cuerpo_sin)
    if rotos:
        enlaces_rotos[ruta] = len(rotos)
    # externos
    for d in set(re.findall(r'(?:src|href)="https?://([^/"]+)', h)):
        if "valenciaandgo" not in d:
            externos[d] += 1
    paginas[ruta] = {"tipo": tipo, "h1": est["h1"], "cabecera": cab, "pie": pie, "popups": pops, "tipos_elementor": dict(tipos_el),
                     "n_hojas": len(ids), "n_styles": len(styles), "hojas_hash": hashlib.md5(sec.encode()).hexdigest()[:6],
                     "clases_body": [c for c in clases if c.startswith(("elementor-page-", "elementor-kit", "page-id", "postid", "single-", "tax-", "term-", "category-"))],
                     "img": len(re.findall(r"<img\b", cuerpo)), "lazy": len(re.findall(r'loading="lazy"', cuerpo)), "srcset": len(re.findall(r"\bsrcset=", cuerpo)),
                     "bytes": len(h)}

out = {"paginas": paginas, "tipos": {k: {"n": v, "ejemplos": tipos_pg[k][:4]} for k, v in tipos_cuerpo.most_common()},
       "h1_por_pagina": {str(k): v for k, v in sorted(h1_n.items())},
       "h1_0": [r for r, p in paginas.items() if len(p["h1"]) == 0], "h1_2mas": [r for r, p in paginas.items() if len(p["h1"]) >= 2],
       "cabeceras": {k or "(ninguna)": {"n": v, "ejemplos": cabeceras_pg[k][:4], "tipos": dict(Counter(paginas[r]["tipo"] for r in cabeceras_pg[k]))} for k, v in cabeceras.most_common()},
       "pies": dict(pies), "popups": dict(popups),
       "hojas_secuencias": [{"n": v, "ejemplo": hojas_ej[k], "n_hojas": len(k.split("|")), "ids": k.split("|")} for k, v in hojas_sec.most_common()],
       "secuencias_por_tipo": {t: dict(c) for t, c in secuencias_por_tipo.items()},
       "plugins": {k: {"paginas": v} for k, v in plugins.most_common()},
       "fuentes": {k: v for k, v in fuentes.most_common()},
       "iconos": dict(iconos), "js": {k: {"n": v, "paginas": len(js_pg[k])} for k, v in js_marcas.most_common()},
       "shortcodes_literales": {k: {"n": v, "paginas": sorted(shortcodes_pg[k])} for k, v in shortcodes.most_common()},
       "enlaces_rotos": enlaces_rotos, "externos": dict(externos.most_common()),
       "bytes_medio": sum(tamanos) // max(1, len(tamanos)), "n": len(paginas)}
json.dump(out, open(os.path.join(RAIZ, "informes", "inventario-vivo.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
json.dump(estructura, open(os.path.join(RAIZ, "estructura-viva.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

print("paginas:", len(paginas), "bytes medio:", out["bytes_medio"])
print("TIPOS:", {k: v["n"] for k, v in out["tipos"].items()})
print("H1 por pagina:", out["h1_por_pagina"])
print("  con 0 H1:", out["h1_0"])
print("  con 2+ H1:", out["h1_2mas"])
print("CABECERAS:", {k: (v["n"], v["tipos"]) for k, v in out["cabeceras"].items()})
print("PIES:", out["pies"], "POPUPS:", out["popups"])
print("SECUENCIAS DE HOJAS distintas:", len(out["hojas_secuencias"]), "| por tipo:", {t: len(c) for t, c in out["secuencias_por_tipo"].items()})
for s in out["hojas_secuencias"][:8]:
    print("   n=%-3d hojas=%-3d %s" % (s["n"], s["n_hojas"], s["ejemplo"]))
print("PLUGINS:", {k: v["paginas"] for k, v in out["plugins"].items()})
print("FUENTES:", out["fuentes"])
print("ICONOS:", out["iconos"])
print("JS/EFECTOS:", {k: (v["n"], v["paginas"]) for k, v in out["js"].items()})
print("SHORTCODES LITERALES:", {k: (v["n"], v["paginas"][:3]) for k, v in out["shortcodes_literales"].items()})
print("ENLACES ROTOS (#/vacios):", sum(enlaces_rotos.values()), "en", len(enlaces_rotos), "paginas", dict(list(enlaces_rotos.items())[:6]))
print("EXTERNOS:", out["externos"])
