# -*- coding: utf-8 -*-
"""
inventario-formularios.py — lista (solo lee) todo lo que en la web copiada
depende de WordPress para funcionar: formularios, botones de compra, carrito,
buscador y reservas. Sirve de base para la Fase 5.

    python scripts/inventario-formularios.py

Escribe informes/formularios.md.
"""
import os, re, json, html
from collections import Counter, defaultdict

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIR = os.path.join(RAIZ, "src", "content", "paginas")
indice = json.load(open(os.path.join(DIR, "indice.json"), encoding="utf-8"))

forms = defaultdict(lambda: {"paginas": [], "campos": None, "ejemplo": ""})
cosas = defaultdict(set)
turitop = Counter()
for p in indice:
    t = open(os.path.join(DIR, p["nombre"] + ".html"), encoding="utf-8").read()
    cuerpo = t.split("<!--@@antes@@-->", 1)[-1]
    es = not re.match(r"^/(en|it|fr|pl)/", p["ruta"])
    for m in re.finditer(r"<form\b([^>]*)>([\s\S]*?)</form>", cuerpo, re.I):
        atr, dentro = m.group(1), m.group(2)
        clase = (re.search(r'class="([^"]*)"', atr) or [None, ""])[1]
        accion = html.unescape((re.search(r'action="([^"]*)"', atr) or [None, ""])[1])
        nombre = (re.search(r'name="([^"]*)"', atr) or [None, ""])[1]
        fid = (re.search(r'name="form_id"[^>]*value="([^"]*)"', dentro) or re.search(r'name="_wpcf7"[^>]*value="([^"]*)"', dentro) or [None, ""])[1]
        tipo = ("elementor" if "elementor-form" in clase else "cf7" if "wpcf7" in clase else "buscador" if ("search" in clase or 'name="s"' in dentro) else
                "carrito" if ("cart" in clase or "add-to-cart" in dentro) else "otro")
        campos = [(c.group(1), (re.search(r'name="([^"]*)"', c.group(2)) or [None, ""])[1], (re.search(r'type="([^"]*)"', c.group(2)) or [None, ""])[1])
                  for c in re.finditer(r"<(input|textarea|select)\b([^>]*)>", dentro)]
        visibles = [n for tag, n, ty in campos if ty not in ("hidden", "submit") and n]
        clave = "%s | id=%s | nombre=%s | campos=%s" % (tipo, fid, nombre, ",".join(visibles))
        f = forms[clave]
        f["paginas"].append(p["ruta"]); f["campos"] = campos; f["accion"] = accion[:80]; f["tipo"] = tipo
        f["donde"] = "popup/pie/cabecera" if m.start() > cuerpo.find("<!--@@pie@@-->") or m.start() < cuerpo.find("<!--@@contenido@@-->") else "contenido"
    if es:
        if re.search(r"add-to-cart=\d+", cuerpo): cosas["enlace ?add-to-cart= (anadir al carrito)"].add(p["ruta"])
        if "elementor-menu-cart" in cuerpo: cosas["carrito en la cabecera (elementor-menu-cart)"].add(p["ruta"])
        if "single_add_to_cart_button" in cuerpo: cosas["boton de compra de WooCommerce (single_add_to_cart_button)"].add(p["ruta"])
        if "yith-wcwl" in cuerpo.split("<!--@@despues@@-->")[0]: cosas["lista de deseos YITH en la pagina"].add(p["ruta"])
        if re.search(r"load-turitop|turitop-calendar|data-service=", cuerpo): cosas["reserva de Turitop (calendario o boton)"].add(p["ruta"])
        for s in re.findall(r"setAttribute\('data-service','([^']+)'\)|data-service=\"([^\"]+)\"", cuerpo): turitop[s[0] or s[1]] += 1
        if "cf-turnstile" in cuerpo: cosas["Turnstile de Cloudflare (antirrobots de WordPress)"].add(p["ruta"])
        if re.search(r'href="[^"]*(/carrito/|/cart/|/finalizar-compra/|/checkout/|/mi-cuenta/|/wishlist/)', cuerpo): cosas["enlace a carrito/pago/cuenta"].add(p["ruta"])

L = ["# Lo que depende de WordPress para funcionar (base de la Fase 5)", "", "## Formularios (%d distintos)" % len(forms), ""]
for clave, f in sorted(forms.items(), key=lambda kv: -len(kv[1]["paginas"])):
    es_p = [r for r in f["paginas"] if not re.match(r"^/(en|it|fr|pl)/", r)]
    L += ["### %s" % clave, "- paginas: %d (%d en castellano), p. ej. %s" % (len(f["paginas"]), len(es_p), ", ".join((es_p or f["paginas"])[:3])),
          "- donde: %s · action: `%s`" % (f["donde"], f["accion"]),
          "- campos: " + ", ".join("%s:%s(%s)" % c for c in f["campos"] if c[2] != "hidden")[:600], ""]
L += ["## Compra, carrito y reservas (paginas en castellano)", ""]
for k, v in sorted(cosas.items(), key=lambda kv: -len(kv[1])):
    L.append("- %s: %d paginas (p. ej. %s)" % (k, len(v), ", ".join(sorted(v)[:3])))
L += ["", "Servicios de Turitop distintos (data-service): %d — %s" % (len(turitop), ", ".join(sorted(turitop)[:40]))]
os.makedirs(os.path.join(RAIZ, "informes"), exist_ok=True)
open(os.path.join(RAIZ, "informes", "formularios.md"), "w", encoding="utf-8").write("\n".join(L) + "\n")
print("\n".join(L[:400]))
