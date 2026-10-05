#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
menus.py - Extrae los menus de navegacion del export WXR a src/data/menus.json.

El menu se reproduce tal cual estaba en WordPress: mismo orden, mismos
submenus, mismos destinos. Cuando la entrada de menu no trae rotulo propio
(WordPress lo deja vacio y usa el titulo de la pagina), se toma el titulo
de la pagina enlazada.

Uso: python3 scripts/menus.py ruta/al/export.xml
"""
import re, os, sys, json, html
from xml.etree import ElementTree as ET

NS = {'wp': 'http://wordpress.org/export/1.2/'}
BASE = "https://casascontenedores.es"
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def main():
    ruta = sys.argv[1] if len(sys.argv) > 1 else "export.xml"
    canal = ET.parse(ruta).getroot().find('channel')
    items = canal.findall('item')

    # mapa id de pagina -> (ruta, titulo)
    paginas = {}
    for it in items:
        if it.findtext('wp:post_type', default='', namespaces=NS) != 'page':
            continue
        pid = it.findtext('wp:post_id', default='', namespaces=NS)
        enlace = (it.findtext('link') or '').replace(BASE, '') or '/'
        paginas[pid] = (enlace, (it.findtext('title') or '').strip())

    entradas = []
    for it in items:
        if it.findtext('wp:post_type', default='', namespaces=NS) != 'nav_menu_item':
            continue
        if it.findtext('wp:status', default='', namespaces=NS) != 'publish':
            continue
        m = {mm.findtext('wp:meta_key', default='', namespaces=NS):
             (mm.findtext('wp:meta_value', default='', namespaces=NS) or '')
             for mm in it.findall('wp:postmeta', NS)}
        cats = [c.get('nicename') for c in it.findall('category')
                if c.get('domain') == 'nav_menu']
        destino_id = m.get('_menu_item_object_id', '')
        ruta_pag, titulo_pag = paginas.get(destino_id, ('', ''))
        url = m.get('_menu_item_url', '') or ruta_pag or '#'
        url = url.replace(BASE, '') or '/'
        entradas.append({
            'menu': cats[0] if cats else '',
            'id': it.findtext('wp:post_id', default='', namespaces=NS),
            'padre': m.get('_menu_item_menu_item_parent', '0'),
            'orden': int(it.findtext('wp:menu_order', default='0', namespaces=NS) or 0),
            'rotulo': html.unescape((it.findtext('title') or '').strip()) or titulo_pag,
            'url': url,
        })

    menus = {}
    for nombre in sorted({e['menu'] for e in entradas}):
        sub = [e for e in entradas if e['menu'] == nombre]

        def rama(padre):
            hijos = sorted([e for e in sub if e['padre'] == padre], key=lambda x: x['orden'])
            salida = []
            for h in hijos:
                nodo = {'rotulo': h['rotulo'], 'url': h['url']}
                nietos = rama(h['id'])
                if nietos:
                    nodo['hijos'] = nietos
                salida.append(nodo)
            return salida

        menus[nombre] = rama('0')

    destino = os.path.join(RAIZ, 'src', 'data', 'menus.json')
    os.makedirs(os.path.dirname(destino), exist_ok=True)
    with open(destino, 'w', encoding='utf-8') as f:
        json.dump(menus, f, ensure_ascii=False, indent=1)

    for nombre, arbol in menus.items():
        total = sum(1 + len(n.get('hijos', [])) for n in arbol)
        print('%-32s %2d de primer nivel, %3d entradas' % (nombre, len(arbol), total))
    print('escrito', destino)


if __name__ == '__main__':
    main()
