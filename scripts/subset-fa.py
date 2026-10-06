# -*- coding: utf-8 -*-
"""
subset-fa.py — deja en Font Awesome solo los iconos que usa la web.

    python scripts/subset-fa.py

La web carga fa-solid-900.woff2 entero (147 KB) para pintar nueve iconos
(<i class="fa-bus-alt">...). Este script busca en src/content/paginas/ las
clases fa-* que se usan, saca su codigo de node_modules/@fortawesome/.../all.min.css
y recorta cada fichero de letra (solid, regular, brands) a esos glifos con
fontTools (python -m pip install fonttools brotli). Deja los recortes en
src/fuentes/ (SI suben a Git) y scripts/fuentes-locales.mjs los pone en
public/fontawesome/webfonts/ con el mismo nombre, asi la hoja no cambia.
Si mas adelante aparece un icono nuevo, se vuelve a pasar.
"""
import os, re, json, glob, subprocess, sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FA = os.path.join(RAIZ, "node_modules", "@fortawesome", "fontawesome-free")
DESTINO = os.path.join(RAIZ, "src", "fuentes")
css = open(os.path.join(FA, "css", "all.min.css"), encoding="utf-8").read()

usadas = set()
for f in glob.glob(os.path.join(RAIZ, "src", "content", "paginas", "*.html")):
    t = open(f, encoding="utf-8").read()
    for m in re.finditer(r'class="([^"]*\bfa[srbl]?\b[^"]*)"', t):
        for k in m.group(1).split():
            if k.startswith("fa-") and k not in ("fa-fw", "fa-lg", "fa-xs", "fa-sm", "fa-2x", "fa-3x", "fa-solid", "fa-regular", "fa-brands", "fa-light"):
                usadas.add(k)
    # tambien las que alguna hoja propia o en linea pinta por CSS (content:"\f...") no se detectan: se anaden a mano abajo si hiciera falta
codigos = {}
for k in sorted(usadas):
    m = re.search(r"\.%s(?::before|,)[^{]*\{content:\"\\([0-9a-f]{4})\"" % re.escape(k), css)
    if m:
        codigos[k] = m.group(1)
    else:
        print("  sin codigo (no es un icono de FA 6):", k)
if not codigos:
    sys.exit("no se ha encontrado ningun icono")
unicodes = ",".join("U+%s" % c for c in sorted(set(codigos.values())))
os.makedirs(DESTINO, exist_ok=True)
hechos = []
for fuente in ("fa-solid-900", "fa-regular-400", "fa-brands-400"):
    origen = os.path.join(FA, "webfonts", fuente + ".woff2")
    salida = os.path.join(DESTINO, fuente + ".woff2")
    r = subprocess.run([sys.executable, "-m", "fontTools.subset", origen, "--unicodes=" + unicodes, "--flavor=woff2", "--output-file=" + salida, "--no-hinting", "--desubroutinize"], capture_output=True, text=True)
    if r.returncode:
        print("  fallo con", fuente, r.stderr[-300:]); continue
    hechos.append((fuente, os.path.getsize(origen), os.path.getsize(salida)))
json.dump({"iconos": codigos, "unicodes": unicodes, "fuentes": [h[0] for h in hechos]}, open(os.path.join(DESTINO, "fa-subset.json"), "w", encoding="utf-8"), indent=1)
print("iconos usados: %d (%s)" % (len(codigos), ", ".join(sorted(codigos))))
for fuente, a, b in hechos:
    print("  %-16s %6d KB -> %4d KB" % (fuente, a // 1024, b // 1024))
