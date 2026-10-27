"""
paginas-nuevas.py — monta las páginas nuevas de src/data/paginas-nuevas.json
(tours, excursiones, actividades en el agua y servicios que no estaban en la web
vieja). Cada ficha es una copia de la ficha del tour medieval
(tours-valencia--tour-de-valencia-medieval) con sus textos, fotos y preguntas;
quita lo que era de Valencia&Go en esa ficha: precio, duración, idiomas,
estrellas y opiniones, la caja de reserva de Turitop, su ficha de Google
(schema) y los enlaces a sus traducciones. En lugar del precio pone
"Precio a consultar" y los botones llevan a /contacto/.

También:
  - crea las categorías que no existen ('existe': false) copiando /excursiones/;
  - añade las tarjetas de las fichas nuevas a la primera página de
    /tours-valencia/ y /excursiones/ (entre marcas <!--ev-nuevas-->);
  - mete "En el agua" y "Servicios" en el menú de todas las páginas en castellano;
  - da de alta las páginas en indice.json.

    python scripts/paginas-nuevas.py

Se puede repetir: rehace las páginas nuevas y vuelve a poner tarjetas y menú
sin duplicarlos. Las fotos las prepara antes scripts/fotos-paginas-nuevas.mjs.
"""
import copy
import html
import json
import os
import re
import sys
import urllib.parse

from bs4 import BeautifulSoup

RAIZ = os.path.abspath('.')
DIR = os.path.join(RAIZ, 'src', 'content', 'paginas')
DATOS = json.load(open(os.path.join(RAIZ, 'src', 'data', 'paginas-nuevas.json'), encoding='utf-8'))
SITE = json.load(open(os.path.join(RAIZ, 'src', 'data', 'site.json'), encoding='utf-8'))
DOMINIO = SITE['dominio'].rstrip('/')
MARCA = SITE['nombre']
PLANTILLA = 'tours-valencia--tour-de-valencia-medieval'
PLANTILLA_CAT = 'excursiones'
FOTOS = os.path.join(RAIZ, 'public', 'fotos')
MARCA_INICIO = '<!--ev-nuevas-->'
MARCA_FIN = '<!--/ev-nuevas-->'
SEP = re.compile(r'\n<!--@@(\w+)@@-->\n')


# --- piezas ----------------------------------------------------------------------
def leer(nombre):
    texto = open(os.path.join(DIR, nombre + '.html'), encoding='utf-8').read()
    trozos = SEP.split(texto)
    piezas = {trozos[i]: trozos[i + 1] for i in range(1, len(trozos), 2)}
    return trozos[0], piezas


def escribir(nombre, prefijo, piezas):
    texto = prefijo + ''.join(f'\n<!--@@{k}@@-->\n{v}' for k, v in piezas.items())
    open(os.path.join(DIR, nombre + '.html'), 'w', encoding='utf-8', newline='\n').write(texto)


def sopa(h):
    return BeautifulSoup(h, 'html.parser')


def fragmento(h):
    """lista de nodos de un trozo de html, para meterlos dentro de un elemento"""
    return list(sopa(h).contents)


def poner_html(el, h):
    el.clear()
    for n in fragmento(h):
        el.append(n)


def esc(t):
    return html.escape(t, quote=True)


def texto_plano(h):
    return re.sub(r'\s+', ' ', sopa(h).get_text(' ')).strip()


def foto(nombre):
    if not os.path.exists(os.path.join(FOTOS, nombre)):
        print(f'  AVISO: falta /fotos/{nombre}')
    return '/fotos/' + nombre


CATS = DATOS['categorias']
PAGINAS = DATOS['paginas']
COMUNES = DATOS['comunes']
for p in PAGINAS:
    p['ruta'] = f"/{p['cat']}/{p['slug']}/"
    p['nombre'] = f"{p['cat']}--{p['slug']}"

INDICE_RUTA = os.path.join(DIR, 'indice.json')
INDICE = json.load(open(INDICE_RUTA, encoding='utf-8'))
POR_NOMBRE = {e['nombre']: e for e in INDICE}


# --- cabeza: título, descripción y foto propios; sin traducciones ni schema -------
def cabeza_nueva(cabeza, titulo, desc, ruta, imagen):
    bloque = '\n'.join([
        '<!-- SEO de la página nueva (scripts/paginas-nuevas.py) -->',
        f'\t<title>{esc(titulo)}</title>',
        f'\t<meta name="description" content="{esc(desc)}" />',
        f'\t<link rel="canonical" href="{DOMINIO}{ruta}" />',
        '\t<meta property="og:locale" content="es_ES" />',
        '\t<meta property="og:type" content="article" />',
        f'\t<meta property="og:title" content="{esc(titulo)}" />',
        f'\t<meta property="og:description" content="{esc(desc)}" />',
        f'\t<meta property="og:url" content="{DOMINIO}{ruta}" />',
        f'\t<meta property="og:site_name" content="{esc(MARCA)}" />',
        f'\t<meta property="og:image" content="{DOMINIO}{imagen}" />',
        '\t<meta property="og:image:width" content="920" />',
        '\t<meta property="og:image:height" content="688" />',
        '\t<meta property="og:image:type" content="image/webp" />',
        '\t<meta name="twitter:card" content="summary_large_image" />',
        '<!-- / SEO de la página nueva -->',
    ])
    a = cabeza.index('<!-- This site is optimized with the Yoast SEO plugin')
    b = cabeza.index('<!-- / Yoast SEO plugin. -->') + len('<!-- / Yoast SEO plugin. -->')
    cabeza = cabeza[:a] + bloque + cabeza[b:]
    cabeza = re.sub(r'<link rel="alternate" hreflang="[^"]*" href="[^"]*"\s*/?>\s*', '', cabeza)
    return cabeza


def traducciones(cabeza):
    """rutas de las traducciones de la plantilla (de sus hreflang), para cambiarlas por la portada de cada idioma"""
    rutas = {}
    for lang, href in re.findall(r'<link rel="alternate" hreflang="([a-z]{2})-[A-Z]{2}" href="([^"]*)"', cabeza):
        ruta = re.sub(r'^https?://[^/]+', '', href)
        if lang != 'es':
            rutas[ruta] = f'/{lang}/'
    return rutas


def cabecera_nueva(cabecera, rutas_trad):
    for vieja, nueva in rutas_trad.items():
        cabecera = cabecera.replace(f'href="{vieja}"', f'href="{nueva}"')
    return cabecera


# --- tarjeta de listado -----------------------------------------------------------
_, _piezas_tours = leer('tours-valencia')
_lis_lugar = sopa(leer(PLANTILLA)[1]['contenido']).select('[data-id="6203db6"] li')
PIN = _lis_lugar[1].select_one('.elementor-icon-list-icon') if len(_lis_lugar) > 1 else None
_modelo_tarjeta = None
for t in sopa(_piezas_tours['contenido']).select('.e-loop-item'):
    if not t.select('.badge-agota'):
        _modelo_tarjeta = t
        break


def tarjeta(p):
    t = copy.copy(_modelo_tarjeta)
    clases = [c for c in t.get('class', []) if not re.match(r'(e-loop-item-|post-)\d+$', c) and not c.startswith('product_cat-')]
    t['class'] = clases + ['e-loop-item-ev', f"product_cat-{p['cat']}", 'ev-nueva']
    antigua = t.select_one('.elementor-widget-heading a')['href']
    for a in t.select('a[href]'):
        if a['href'] == antigua:
            a['href'] = p['ruta']
    tag = t.select_one('a[rel="tag"]')
    if tag:
        tag['href'] = f"/{p['cat']}/"
        tag.string = CATS[p['cat']]['nombre']
    img = t.select_one('img')
    for at in ('srcset', 'sizes'):
        if img.has_attr(at):
            del img[at]
    img['src'] = foto(f"{p['slug']}-1-tarjeta.webp")
    img['alt'] = p['titulo']
    img['title'] = p['titulo']
    t.select_one('.elementor-widget-heading a').string = p['titulo']
    lista = t.select_one('.elementor-icon-list-items')
    if lista:
        lis = lista.select('li')
        for li in lis[1:]:
            li.decompose()
        lis[0].select_one('.elementor-icon-list-text').string = p['lugar']
        # el lugar con el icono de ubicación de la ficha, no con el reloj de la duración
        icono = lis[0].select_one('.elementor-icon-list-icon')
        if icono and PIN is not None:
            icono.replace_with(copy.copy(PIN))
    for pr in t.select('.elementor-widget-woocommerce-product-price'):
        poner_html(pr, '<p class="price"><span class="ev-consultar">Precio a consultar</span></p>')
    for f in t.select('.flag-card, .tour-banderas, .badge-agota'):
        f.decompose()
    boton = t.select_one('.elementor-button-text')
    if boton:
        boton.string = 'Más información'
    return t


# --- ficha -------------------------------------------------------------------------
PREFIJO, BASE = leer(PLANTILLA)
ENTRADA_BASE = POR_NOMBRE[PLANTILLA]
RUTA_BASE = ENTRADA_BASE['ruta']
H1_BASE = 'Tour de Valencia Medieval'
SEO_BASE = 'Tour por la Valencia medieval con guía oficial'
TRAD_BASE = traducciones(BASE['cabeza'])


def lista_iconos(widget, textos):
    ul = widget.select_one('ul')
    modelo = copy.copy(ul.select_one('li'))
    for li in ul.select('li'):
        li.decompose()
    for t in textos:
        li = copy.copy(modelo)
        li.select_one('.elementor-icon-list-text').string = t
        ul.append(li)


def preguntas(widget, faq):
    caja = widget.select_one('.e-n-accordion')
    items = caja.select('details.e-n-accordion-item')
    modelo = copy.copy(items[1] if len(items) > 1 else items[0])
    for it in items:
        it.decompose()
    for i, (q, r) in enumerate(faq):
        it = copy.copy(modelo)
        ident = f'e-n-accordion-item-{6000 + i}'
        it['id'] = ident
        s = it.select_one('summary')
        s['aria-controls'] = ident
        s['data-accordion-index'] = str(i + 1)
        s['tabindex'] = '0' if i == 0 else '-1'
        s.select_one('.e-n-accordion-item-title-text').string = f' {q} '
        for reg in it.select('[aria-labelledby]'):
            reg['aria-labelledby'] = ident
        poner_html(it.select_one('.elementor-widget-text-editor'), f'<p>{esc(r)}</p>')
        caja.append(it)


def ficha(p):
    cat = CATS[p['cat']]
    piezas = dict(BASE)
    imagen = foto(f"{p['slug']}-1.webp")
    piezas['cabeza'] = cabeza_nueva(BASE['cabeza'], p['seo'], p['desc'], p['ruta'], imagen)
    piezas['cabecera'] = limpiar_activo(cabecera_nueva(BASE['cabecera'], TRAD_BASE))

    s = sopa(BASE['contenido'])
    uno = lambda i: s.select_one(f'[data-id="{i}"]')
    poner_html(uno('26ffdeb8').select_one('nav'),
               f'<a href="/">Inicio</a>&nbsp;&#47;&nbsp;<a href="/{p["cat"]}/">{esc(cat["nombre"])}</a>&nbsp;&#47;&nbsp;{esc(p["corto"])}')
    uno('6a450b9c').select_one('h1').string = p['titulo']
    # duración fuera (no la sabemos); se queda el lugar
    lis = uno('6203db6').select('li')
    lis[0].decompose()
    lis[1].select_one('.elementor-icon-list-text').string = p['lugar']
    # estrellas, idiomas, sellos de "guía oficial" y opiniones de Valencia&Go: fuera
    for i in ('f4407b1', '35e2214b', '3ed645c', 'cbd975b'):
        if uno(i):
            uno(i).decompose()
    for ifr in s.select('iframe'):
        ifr.decompose()
    # galería: tres fotos (el mosaico pinta una grande y dos pequeñas)
    carrusel = uno('7f739cd8').select_one('.swiper-wrapper')
    modelo = copy.copy(carrusel.select_one('.swiper-slide'))
    for sl in carrusel.select('.swiper-slide'):
        sl.decompose()
    for n in range(1, 4):
        sl = copy.copy(modelo)
        sl['aria-label'] = f'{n} de 3'
        img = sl.select_one('img')
        img['data-src'] = foto(f"{p['slug']}-{n}.webp")
        img['alt'] = p['titulo']
        carrusel.append(sl)
    # entradilla y destacados (la ficha los repite para móvil)
    for i in ('ae952d9', '3324d459'):
        poner_html(uno(i), p['intro'])
    for i in ('cfac3ff', '2c071db4'):
        uno(i).select_one('.elementor-heading-title').string = 'Lo más destacado'
    for i in ('d600073', '2bad175'):
        lista_iconos(uno(i), p['destacados'])
    # precio y reserva
    uno('5632bc4').select_one('p').string = 'Precio'
    poner_html(uno('784e99b'), '<p class="price"><span class="ev-consultar">A consultar</span></p>')
    uno('a9cd1ad').decompose()
    for b in s.select('.elementor-button-text'):
        if b.get_text(strip=True).upper() == 'SOLICITA INFORMACIÓN':
            b.string = 'PEDIR INFORMACIÓN'
    boton = uno('13e524a').select_one('a')
    boton['href'] = '/contacto/'
    boton.select_one('.elementor-button-text').string = 'Pedir información'
    # descripción, qué verás, punto de encuentro, preguntas
    uno('53eed259').select_one('.elementor-heading-title').string = p['subtitulo']
    poner_html(uno('24fe9608'), p['cuerpo'])
    uno('2b96ffd4').select_one('.elementor-heading-title').string = 'Qué verás'
    poner_html(uno('5db82776'), p['queVeras'] + COMUNES['saber'])
    uno('57839307').select_one('.elementor-heading-title').string = 'Punto de encuentro'
    poner_html(uno('bf6d1a0'), '<p>Te lo indicamos al confirmar la reserva.</p>')
    preguntas(uno('2fba6b6'), p['faq'] + COMUNES['faq'])
    # otros de la misma sección (nuevos)
    grid = uno('a3953c1').select_one('.elementor-loop-container')
    for it in grid.select('.e-loop-item'):
        it.decompose()
    otros = [q for q in PAGINAS if q['cat'] == p['cat'] and q is not p]
    if len(otros) < 3:
        otros += [q for q in PAGINAS if q['cat'] != p['cat'] and q is not p][:3 - len(otros)]
    i0 = PAGINAS.index(p)
    otros = sorted(otros, key=lambda q: (PAGINAS.index(q) - i0) % len(PAGINAS))[:3]
    for q in otros:
        grid.append(tarjeta(q))
    uno('69c8c90').select_one('.elementor-heading-title').string = 'Otras experiencias que te pueden interesar:'
    piezas['contenido'] = str(s)

    # después: guiones de Turitop fuera; migas, datos de la página y enlaces a esta ficha
    d = BASE['despues']
    d = re.sub(r'<script[^>]*id="js-turitop"[^>]*></script>\s*', '', d)
    migas = {'@context': 'https://schema.org/', '@type': 'BreadcrumbList', 'itemListElement': [
        {'@type': 'ListItem', 'position': 1, 'item': {'name': 'Inicio', '@id': DOMINIO + '/'}},
        {'@type': 'ListItem', 'position': 2, 'item': {'name': cat['nombre'], '@id': f"{DOMINIO}/{p['cat']}/"}},
        {'@type': 'ListItem', 'position': 3, 'item': {'name': p['titulo'], '@id': DOMINIO + p['ruta']}}]}
    d = re.sub(r'<script type="application/ld\+json">\{"@context":"https://schema.org/","@type":"BreadcrumbList".*?</script>',
               lambda m: '<script type="application/ld+json">' + json.dumps(migas, ensure_ascii=False) + '</script>', d, count=1, flags=re.S)
    post = json.dumps({'id': 0, 'title': urllib.parse.quote(p['seo']), 'excerpt': texto_plano(p['intro']), 'featuredImage': imagen}).replace('/', '\\/')
    d = re.sub(r'"post":\{"id":\d+,"title":"[^"]*","excerpt":"(?:[^"\\]|\\.)*","featuredImage":"[^"]*"\}', lambda m: '"post":' + post, d, count=1)
    piezas['despues'] = limpiar_activo(d)

    for k in ('cabeza', 'contenido', 'despues'):
        piezas[k] = piezas[k].replace(RUTA_BASE, p['ruta']).replace(SEO_BASE, p['seo']).replace(H1_BASE, p['titulo'])
    escribir(p['nombre'], PREFIJO, piezas)
    entrada = copy.deepcopy(ENTRADA_BASE)
    entrada.update({'ruta': p['ruta'], 'nombre': p['nombre'], 'titulo': p['seo'], 'postId': 0, 'nueva': True})
    ACTIVO[p['nombre']] = (f"/{p['cat']}/", 'parent')
    entrada['body'] = dict(entrada['body'])
    entrada['body']['class'] = entrada['body']['class'].replace('product_cat-tours-valencia', f"product_cat-{p['cat']}")
    return entrada


# --- categorías nuevas ----------------------------------------------------------------
PREFIJO_CAT, BASE_CAT = leer(PLANTILLA_CAT)
ENTRADA_CAT = POR_NOMBRE[PLANTILLA_CAT]
TRAD_CAT = traducciones(BASE_CAT['cabeza'])


def categoria(clave, cat):
    ruta = f'/{clave}/'
    suyas = [p for p in PAGINAS if p['cat'] == clave]
    piezas = dict(BASE_CAT)
    piezas['cabeza'] = cabeza_nueva(BASE_CAT['cabeza'], cat['seo'], cat['desc'], ruta, foto(f"{suyas[0]['slug']}-1.webp"))
    piezas['cabecera'] = limpiar_activo(cabecera_nueva(BASE_CAT['cabecera'], TRAD_CAT))
    s = sopa(BASE_CAT['contenido'])
    banner = s.select_one('[data-id="5d8665f"]')
    banner['style'] = f"background-image:url('{foto(suyas[0]['slug'] + '-1-ancha.webp')}');background-size:cover;background-position:center"
    banner.select_one('h1').string = cat['nombre']
    poner_html(s.select_one('[data-id="40bbf21"]'), f'<p><span style="color: #ffffff;">{esc(cat["intro"])}</span></p>')
    rejilla = s.select_one('[data-id="1ce9807"]')
    poner_html(rejilla.select_one('.woocommerce-breadcrumb'), f'<a href="/">Inicio</a>&nbsp;&#47;&nbsp;{esc(cat["nombre"])}')
    for h in rejilla.select('.elementor-heading-title'):
        if not h.find_parent(class_='e-loop-item') and h.get_text(strip=True) == 'Excursiones':
            h.string = cat['nombre']
    grid = rejilla.select_one('.elementor-loop-container')
    for it in grid.select('.e-loop-item'):
        it.decompose()
    for p in suyas:
        grid.append(tarjeta(p))
    # sin "cargar más": la rejilla de /excursiones/ pedía su página 2 al hacer scroll
    w = rejilla.select_one('.elementor-widget-loop-grid')
    ajustes = json.loads(w['data-settings'])
    ajustes['pagination_type'] = ''
    w['data-settings'] = json.dumps(ajustes)
    for e in rejilla.select('.e-load-more-anchor, .e-load-more-spinner, .e-load-more-message'):
        e.decompose()
    piezas['contenido'] = str(s)
    d = re.sub(r'<script[^>]*id="js-turitop"[^>]*></script>\s*', '', BASE_CAT['despues'])
    d = re.sub(r'<script type="application/ld\+json">.*?</script>', '', d, flags=re.S)
    d = d.replace('"page_permalink":"/excursiones/"', f'"page_permalink":"{ruta}"')
    piezas['despues'] = limpiar_activo(d)
    nombre = clave
    escribir(nombre, PREFIJO_CAT, piezas)
    entrada = copy.deepcopy(ENTRADA_CAT)
    entrada.update({'ruta': ruta, 'nombre': nombre, 'titulo': cat['seo'], 'nueva': True})
    ACTIVO[nombre] = (ruta, 'item')
    entrada['body'] = dict(entrada['body'])
    entrada['body']['class'] = entrada['body']['class'].replace('term-excursiones', f'term-{clave}')
    return entrada


# --- tarjetas en los listados que ya existen ----------------------------------------------
def anadir_a_listado(nombre, suyas):
    prefijo, piezas = leer(nombre)
    c = piezas['contenido']
    c = re.sub(re.escape(MARCA_INICIO) + r'.*?' + re.escape(MARCA_FIN), '', c, flags=re.S)
    if suyas:
        i = c.index('<span class="e-load-more-spinner">')
        j = c.rindex('</div>', 0, i)
        bloque = MARCA_INICIO + ''.join(str(tarjeta(p)) for p in suyas) + MARCA_FIN
        c = c[:j] + bloque + c[j:]
        # comprobación: las tarjetas nuevas quedan dentro de la rejilla
        dentro = sopa(c).select('.elementor-loop-container .ev-nueva')
        if len(dentro) != len(suyas):
            sys.exit(f'ERROR: en {nombre} las tarjetas nuevas no quedan dentro de la rejilla')
    piezas['contenido'] = c
    escribir(nombre, prefijo, piezas)


# --- menú -------------------------------------------------------------------------------
MENU = re.compile(r'(<li class="(menu-item menu-item-type-taxonomy menu-item-object-product_cat[^"]*)"><a href="/excursiones/"([^>]*)>Excursiones</a></li>)')
ACTIVO_LI = re.compile(r' (current-menu-item|current_page_item|current-menu-parent|current-menu-ancestor|current-product-ancestor|current-product-parent|current-product_cat-ancestor|current-product_cat-parent)\b')


def limpiar_activo(h):
    """quita la marca de 'sección actual' que la plantilla traía en el menú"""
    h = re.sub(r'<li class="(menu-item [^"]*)"', lambda m: '<li class="' + ACTIVO_LI.sub('', ' ' + m.group(1)).strip() + '"', h)
    return h.replace(' aria-current="page"', '').replace(' elementor-item-active', '')


def menu_en(nombre, activo=None):
    """activo = (ruta de la sección, 'item' si es la propia categoría o 'parent' si es una ficha suya)"""
    prefijo, piezas = leer(nombre)
    cambiado = False
    for k in ('cabecera', 'pie', 'despues'):
        v = original = piezas.get(k, '')
        if not MENU.search(v):
            continue
        def poner(m):
            tab = ' tabindex="-1"' if 'tabindex="-1"' in m.group(3) else ''
            extra = ''.join(
                f'<li class="menu-item menu-item-type-taxonomy menu-item-object-product_cat menu-item-ev-{c}"><a href="/{c}/" class="elementor-item"{tab}>{CATS[c]["menu"]}</a></li>'
                for c in CATS if not CATS[c].get('existe'))
            return m.group(1) + extra
        if 'menu-item-ev-' not in v:
            v = MENU.sub(poner, v)
        # las páginas nuevas se rehacen en cada pase (sin marca de activo): se marca su sección
        if activo:
            ruta, tipo = activo
            def marcar(m):
                li, a = m.group(1), m.group(2)
                if tipo == 'item':
                    return f'<li class="{li} current-menu-item"><a href="{ruta}" aria-current="page"' + a.replace('class="elementor-item"', 'class="elementor-item elementor-item-active"') + '>'
                return f'<li class="{li} current-menu-parent"><a href="{ruta}"{a}>'
            v = re.sub(r'<li class="(menu-item [^"]*)"><a href="' + re.escape(ruta) + r'"([^>]*)>', marcar, v)
        if v != original:
            piezas[k] = v
            cambiado = True
    if cambiado:
        escribir(nombre, prefijo, piezas)
    return cambiado


# --- todo ----------------------------------------------------------------------------------
ACTIVO = {}
nuevas = []
for p in PAGINAS:
    nuevas.append(ficha(p))
    print('ficha', p['ruta'])
for clave, cat in CATS.items():
    if not cat.get('existe'):
        nuevas.append(categoria(clave, cat))
        print('categoría', f'/{clave}/')
for clave, cat in CATS.items():
    if cat.get('existe'):
        anadir_a_listado(clave, [p for p in PAGINAS if p['cat'] == clave])
        print('tarjetas en', f'/{clave}/')

rutas_nuevas = {e['ruta'] for e in nuevas}
INDICE = [e for e in INDICE if e['ruta'] not in rutas_nuevas] + nuevas
# el índice va con fin de línea CRLF en el repositorio: se respeta
open(INDICE_RUTA, 'w', encoding='utf-8', newline='\r\n').write(json.dumps(INDICE, ensure_ascii=False, indent=1))

n = 0
for e in INDICE:
    if e.get('idioma') == 'es-es' and menu_en(e['nombre'], ACTIVO.get(e['nombre'])):
        n += 1
print(f'menú puesto en {n} páginas · {len(nuevas)} páginas nuevas en el índice')
