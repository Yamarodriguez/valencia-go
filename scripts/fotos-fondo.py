"""
fotos-fondo.py — da nombre a las fotos que solo salen como fondo en las hojas
de Elementor (post-<ID>.css) y que el inventario dejó sin página dueña. La
dueña es la primera página en castellano cuyo postId tiene esa hoja; el nombre
es <h1>-fondo-N.webp y el texto alternativo, el H1. Escribe en
src/data/fotos.json (sin tocar las demás entradas).

    python scripts/fotos-fondo.py

Después: node scripts/fotos-commons.mjs y node scripts/cambiar-fotos.mjs.
"""
import json
import re
import unicodedata

FOTOS = 'src/data/fotos.json'
d = json.load(open(FOTOS, encoding='utf-8'))
indice = json.load(open('src/content/paginas/indice.json', encoding='utf-8'))
por_post = {}
for p in indice:
    if p['idioma'] == 'es-es':
        por_post.setdefault(str(p.get('postId')), p)


def h1_de(pagina):
    html = open('src/content/paginas/%s.html' % pagina['nombre'], encoding='utf-8').read()
    m = re.search(r'<h1\b[^>]*>(.*?)</h1>', html.split('<!--@@contenido@@-->')[-1], re.S | re.I)
    texto = re.sub(r'<[^>]+>', ' ', m.group(1)) if m else (pagina.get('titulo') or pagina['nombre'])
    return re.sub(r'\s+', ' ', texto.replace('&amp;', '&')).strip()


def slug(texto, maximo=60):
    s = unicodedata.normalize('NFD', texto)
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn').lower().replace('&', ' y ')
    s = re.sub(r'[^a-z0-9]+', '-', s).strip('-')
    if len(s) > maximo:
        s = s[:maximo].rsplit('-', 1)[0]
    return s


usados = {v['nuevo'] for v in d.values() if v.get('nuevo')}
n = 0
for ruta, e in d.items():
    if e['clase'] != 'foto' or e.get('nuevo') or not e.get('css') or not e.get('existe'):
        continue
    posts = [c.rsplit('post-', 1)[-1].replace('.css', '') for c in e['css']]
    pagina = next((por_post[x] for x in posts if x in por_post), None)
    h1 = h1_de(pagina) if pagina else 'Valencia'
    base = slug(h1, 50) + '-fondo'
    i = 1
    while '%s-%d.webp' % (base, i) in usados:
        i += 1
    nuevo = '%s-%d.webp' % (base, i)
    usados.add(nuevo)
    e.update({'nuevo': nuevo, 'alt': h1, 'pagina': pagina['ruta'] if pagina else '/', 'h1': h1, 'seccion': '', 'fondo': True})
    e.pop('nota', None)
    n += 1
    print(ruta.replace('/wp-content/uploads/', ''), '->', nuevo)
json.dump(d, open(FOTOS, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('fotos de fondo con nombre:', n)
