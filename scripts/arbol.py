#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
arbol.py — Saca del export la MAQUETACION real de Elementor y la mete en los
JSON de cada pagina, en el campo `bloques`.

    python3 scripts/arbol.py export.xml [--ensayo]

Por que existe: el HTML que guarda WordPress en `content:encoded` es el texto
renderizado y ha perdido las columnas, los anchos y las separaciones. El campo
`_elementor_data` si trae el arbol completo (secciones -> columnas -> widgets)
con sus ajustes. Reconstruir a partir de ahi da una copia fiel; deducirlo del
texto plano, no.

Lo que se guarda es una version NORMALIZADA del arbol, no el JSON de Elementor
en bruto: solo los ajustes que afectan a como se ve, con nombres en castellano
y un unico formato. Asi el renderizador es corto y se entiende.

Tambien se guarda, por pagina:
    menu         cual de los menus lleva (OceanWP lo fija por pagina)
    bandaTitulo  si enseña la banda de titulo del tema
"""
import re, os, sys, json, html
from collections import Counter

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGINAS = os.path.join(RAIZ, "src", "content", "pages")
BASE = "https://casascontenedores.es"

# Ids de termino de los menus de navegacion del WordPress -> nombre del menu.
# Salen de los <wp:term> del export; OceanWP guarda el id en el meta
# `ocean_header_custom_menu` de cada pagina (0 = el menu por defecto).
MENUS = {}


# ------------------------------------------------------------------ utilidades

def cdata(bloque, etiqueta, ns="wp"):
    m = re.search(r"<%s:%s><!\[CDATA\[(.*?)\]\]></%s:%s>" % (ns, etiqueta, ns, etiqueta),
                  bloque, re.S)
    return m.group(1) if m else ""


def meta(bloque, clave):
    m = re.search(
        r"<wp:meta_key><!\[CDATA\[%s\]\]></wp:meta_key>\s*"
        r"<wp:meta_value><!\[CDATA\[(.*?)\]\]></wp:meta_value>" % re.escape(clave),
        bloque, re.S)
    return m.group(1) if m else ""


def num(valor, defecto=None):
    """Saca el numero de un ajuste de Elementor.

    Los ajustes con unidad llegan como {"unit":"px","size":42}, pero algunos
    (el ancho real de columna, `_inline_size`) llegan como numero pelado. Si
    solo se acepta el diccionario, el ancho se pierde y todas las columnas
    salen al 50 %.
    """
    if isinstance(valor, (int, float)) and not isinstance(valor, bool):
        return float(valor)
    if isinstance(valor, str):
        try:
            return float(valor)
        except ValueError:
            return defecto
    if not isinstance(valor, dict):
        return defecto
    s = valor.get("size")
    if s in (None, ""):
        return defecto
    try:
        return float(s)
    except (TypeError, ValueError):
        return defecto


def unidad(valor, defecto="px"):
    return (valor or {}).get("unit") or defecto if isinstance(valor, dict) else defecto


def medida(valor):
    """{"unit":"%","size":67.3} -> "67.3%" ; None si no hay valor."""
    n = num(valor)
    if n is None:
        return None
    u = unidad(valor)
    if u == "custom":
        return None
    entero = int(n) if float(n).is_integer() else n
    return "%s%s" % (entero, "" if u == "px" and False else u)


def caja(valor):
    """{"unit":"px","top":"10","right":"0",...} -> "10px 0px 0px 0px" o None."""
    if not isinstance(valor, dict):
        return None
    u = valor.get("unit") or "px"
    lados = [valor.get(k) for k in ("top", "right", "bottom", "left")]
    if all(l in (None, "") for l in lados):
        return None
    def uno(v):
        if v in (None, ""):
            return "0" + u
        return "%s%s" % (v, u)
    return " ".join(uno(l) for l in lados)


def relativo(url):
    if not url:
        return url
    return re.sub(r"^https?://(?:www\.)?casascontenedores\.es", "", url)


def limpiar_html(h):
    """Limpia el HTML de un bloque de texto del editor."""
    if not h:
        return ""
    # El <script> fuera, pero el <style> NO: la portada y otras paginas llevan
    # bloques de HTML escritos a mano (rejillas de tarjetas, el acordeon de
    # preguntas) cuyo aspecto vive en un <style> pegado al lado. Quitarlo
    # dejaba esas tarjetas apiladas a todo lo ancho.
    h = re.sub(r"<script\b[\s\S]*?</script>", "", h, flags=re.I)
    h = re.sub(r"<!--[\s\S]*?-->", "", h)
    h = h.replace(BASE + "/", "/").replace(BASE, "/")
    h = re.sub(r"(https?:)?//(?:www\.)?casascontenedores\.es/", "/", h)
    # enlaces sin destino: se desenvuelven conservando el texto
    h = re.sub(r'<a(?=[\s>])(?![^>]*\shref="[^"]+")[^>]*>([\s\S]*?)</a\s*>', r"\1", h)
    # pegotes del traductor de Google
    h = re.sub(r'<span class="(?:zRhise|PkjLuf)"[^>]*>([\s\S]*?)</span>', r"\1", h)
    # tamanos en linea del editor
    h = re.sub(r'\sstyle="[^"]*font-size:[^"]*"', "", h)
    h = re.sub(r"<p>(?:\s|&nbsp;|<br\s*/?>)*</p>", "", h)
    return comillas(h).strip()


def comillas(h):
    """Pone las comillas como las pone WordPress al publicar.

    En el export del XML el texto lleva comillas rectas ("asi", 'asi'), porque
    es lo que se teclea en el editor. Pero WordPress, antes de enviar la pagina
    al navegador, las convierte a las comillas tipograficas del idioma: en
    castellano, «asi» y 'asi'. Por eso la web en vivo enseña «containers homes»
    donde el export dice "containers homes".

    Si no se hace aqui, el texto visible de la web nueva no es identico al de
    la web en vivo, y eso es justo lo que no puede pasar. Se toca SOLO el texto
    que se ve: lo que va dentro de una etiqueta (<a href="...">) se salta, que
    ahi una comilla rizada rompe el HTML.
    """
    if not h:
        return h
    # Los bloques <style> y <script> NO son texto visible: son codigo. Ahi una
    # comilla rizada rompe la regla. Paso en falso que ya costo un rato: el CSS
    # escrito a mano de las tarjetas decia  font-family: 'Segoe UI'  y salia
    # convertido en  ‘Segoe UI’ , que ningun navegador reconoce.
    trozos = re.split(r"(<(?:style|script)\b[\s\S]*?</(?:style|script)>)", h, flags=re.I)
    for j, trozo in enumerate(trozos):
        if re.match(r"<(?:style|script)\b", trozo, re.I):
            continue          # es codigo: se deja tal cual
        trozos[j] = _comillas_texto(trozo)
    return "".join(trozos)


def _comillas_texto(h):
    """Convierte las comillas de un trozo que ya no contiene <style> ni <script>."""
    partes = re.split(r"(<[^>]*>)", h)
    for i, p in enumerate(partes):
        if p.startswith("<"):
            continue          # es una etiqueta: no se toca
        # apostrofo dentro de una palabra: d'Or -> d’Or
        p = re.sub(r"(?<=\w)'(?=\w)", "’", p)
        # comillas dobles emparejadas -> « »
        p = re.sub(r'"([^"<>]+)"', "«\\1»", p)
        # comillas simples emparejadas -> ‘ ’
        p = re.sub(r"(?<![\w’])'([^'<>]+)'(?![\w])", "‘\\1’", p)
        partes[i] = p
    return "".join(partes)


# --------------------------------------------------------- tipografia y estilo

def tipografia(s, prefijo="typography"):
    """Ajustes de texto de un widget, ya normalizados."""
    t = {}
    fam = s.get(prefijo + "_font_family")
    if fam:
        t["familia"] = fam
    for clave, destino in (("_font_size", "tamano"), ("_font_size_tablet", "tamanoTablet"),
                           ("_font_size_mobile", "tamanoMovil")):
        n = num(s.get(prefijo + clave))
        if n is not None:
            t[destino] = n
    peso = s.get(prefijo + "_font_weight")
    if peso:
        t["peso"] = str(peso)
    alto = num(s.get(prefijo + "_line_height"))
    if alto is not None:
        t["interlineado"] = alto
        t["interlineadoUnidad"] = unidad(s.get(prefijo + "_line_height"), "em")
    esp = num(s.get(prefijo + "_letter_spacing"))
    if esp is not None:
        t["espaciado"] = esp
    tr = s.get(prefijo + "_text_transform")
    if tr and tr != "none":
        t["transformar"] = tr
    est = s.get(prefijo + "_font_style")
    if est and est != "normal":
        t["estilo"] = est
    return t


def comunes(s):
    """Ajustes que puede llevar cualquier widget."""
    c = {}
    for clave, destino in (("align", "alinear"), ("align_tablet", "alinearTablet"),
                           ("align_mobile", "alinearMovil")):
        if s.get(clave):
            c[destino] = s[clave]
    for clave, destino in (("_margin", "margen"), ("_margin_tablet", "margenTablet"),
                           ("_margin_mobile", "margenMovil"),
                           ("_padding", "relleno"), ("_padding_mobile", "rellenoMovil")):
        v = caja(s.get(clave))
        if v:
            c[destino] = v
    # Fondo y borde DEL PROPIO WIDGET (pestaña "Avanzado" de Elementor, que
    # guarda estos ajustes con guion bajo delante).
    #
    # Esto faltaba y se notaba: las tarjetas grises de la portada («Casa
    # contenedor 40 Pies», «Contenedores vivienda 75 m2») llevan el gris en el
    # widget, no en la columna ni en la seccion. Sin traerlo, el titulo blanco
    # de esas tarjetas se quedaba sobre fondo blanco y no se leia nada.
    f = {}
    if s.get("_background_color"):
        f["color"] = s["_background_color"]
    img = (s.get("_background_image") or {}).get("url")
    if img:
        f["imagen"] = relativo(img)
    if f:
        c["fondo"] = f

    b = {}
    if s.get("_border_border"):
        b["tipo"] = s["_border_border"]
    anchoBorde = caja(s.get("_border_width"))
    if anchoBorde:
        b["ancho"] = anchoBorde
    if s.get("_border_color"):
        b["color"] = s["_border_color"]
    radio = caja(s.get("_border_radius"))
    if radio:
        b["radio"] = radio
    if b:
        c["borde"] = b

    if s.get("_element_id"):
        c["ancla"] = s["_element_id"]
    return c


def tiene_superposicion(s):
    """¿Esta seccion o columna lleva "velo" (background overlay)?

    Elementor, cuando el usuario pone un velo, mete DENTRO del bloque un div
    vacio <div class="elementor-background-overlay"></div> y le cuelga a ese
    div el color o la foto del velo desde la hoja de la pagina. Sin ese div la
    regla no tiene a que aplicarse: el velo desaparece y, en las secciones con
    letra blanca sobre foto oscura, el texto se queda sin el fondo que lo hacia
    legible. Se detecta por cualquier ajuste que empiece por background_overlay_.
    """
    return any(k.startswith("background_overlay_") and s.get(k) not in (None, "", [], {})
               for k in s)


def fondo(s, prefijo=""):
    """Fondo de una seccion o columna: color, imagen y velo."""
    f = {}
    color = s.get(prefijo + "background_color")
    if color:
        f["color"] = color
    img = (s.get(prefijo + "background_image") or {}).get("url")
    if img:
        f["imagen"] = relativo(img)
        for clave, destino in ((prefijo + "background_position", "posicion"),
                               (prefijo + "background_size", "tamano"),
                               (prefijo + "background_repeat", "repetir"),
                               (prefijo + "background_attachment", "fijado")):
            if s.get(clave):
                f[destino] = s[clave]
    velo = s.get("background_overlay_color")
    if velo:
        f["velo"] = velo
        op = num(s.get("background_overlay_opacity"))
        f["veloOpacidad"] = op if op is not None else 0.5
    return f


# --------------------------------------------------- tamanos de las imagenes

# id de adjunto -> {"dir": "2021/09/", "full": "foo.jpg", "large": "foo-1024x1024.jpg", ...}
TAMANOS = {}


def leer_tamanos(xml):
    """Saca de los adjuntos que variantes genero WordPress de cada imagen.

    Por que hace falta: el widget de imagen de Elementor pinta por defecto la
    variante `large`, no el original. Si se sirve el original, una foto que en
    la web real es cuadrada de 1024 sale con otra proporcion y la pagina entera
    cambia de alto.
    """
    for it in re.findall(r"<item>(.*?)</item>", xml, re.S):
        if cdata(it, "post_type") != "attachment":
            continue
        m = re.search(r"<wp:post_id>(\d+)</wp:post_id>", it)
        if not m:
            continue
        pid = m.group(1)
        archivo = meta(it, "_wp_attached_file")
        if not archivo:
            continue
        carpeta = archivo.rsplit("/", 1)[0] + "/" if "/" in archivo else ""
        datos = {"dir": carpeta, "full": archivo.rsplit("/", 1)[-1]}
        crudo = meta(it, "_wp_attachment_metadata")
        if crudo:
            # PHP serializado: s:5:"large";a:4:{s:4:"file";s:NN:"nombre.jpg";
            for nombre, fichero in re.findall(
                    r's:\d+:"([a-z0-9_-]+)";a:\d+:\{s:4:"file";s:\d+:"([^"]+)"', crudo):
                if nombre not in ("sizes",):
                    datos[nombre] = fichero
        TAMANOS[pid] = datos


FALTAN_VARIANTES = set()


def variante(url, ident, nombre="large"):
    """URL de la variante que pinta Elementor, o la original si no la hay.

    Se comprueba que el archivo este descargado: apuntar a una variante que
    no existe deja la imagen rota, y una imagen rota mide cero, que es peor
    que servirla en otro tamano.
    """
    datos = TAMANOS.get(str(ident))
    if not datos or nombre not in datos:
        return url
    ruta = "/wp-content/uploads/" + datos["dir"] + datos[nombre]
    if os.path.exists(os.path.join(RAIZ, "public") + ruta):
        return ruta
    FALTAN_VARIANTES.add(ruta)
    return url


# ----------------------------------------------------------------- conversion

def convertir_widget(e):
    """Un widget de Elementor -> un bloque normalizado, o None si no pinta nada."""
    w = e.get("widgetType")
    s = e.get("settings") or {}
    b = {"t": None, "id": e.get("id")}
    b.update(comunes(s))

    if w == "heading":
        texto = (s.get("title") or "").strip()
        if not texto:
            return None
        b["t"] = "encabezado"
        b["texto"] = texto
        b["etiqueta"] = s.get("header_size") or "h2"
        if s.get("title_color"):
            b["color"] = s["title_color"]
        tip = tipografia(s)
        if tip:
            b["tipo"] = tip
        enlace = (s.get("link") or {}).get("url")
        if enlace:
            b["url"] = relativo(enlace)

    elif w == "text-editor":
        cuerpo = limpiar_html(s.get("editor") or "")
        if not cuerpo:
            return None
        b["t"] = "texto"
        b["html"] = cuerpo
        if s.get("text_color"):
            b["color"] = s["text_color"]
        tip = tipografia(s)
        if tip:
            b["tipo"] = tip

    elif w == "image":
        url = (s.get("image") or {}).get("url")
        if not url:
            return None
        b["t"] = "imagen"
        # Elementor sirve la variante `large` salvo que se diga otra cosa
        tam = s.get("image_size") or "large"
        b["src"] = variante(relativo(url), (s.get("image") or {}).get("id"), tam)
        b["alt"] = (s.get("image") or {}).get("alt") or ""
        an = medida(s.get("width"))
        if an:
            b["ancho"] = an
        anm = medida(s.get("width_mobile"))
        if anm:
            b["anchoMovil"] = anm
        if s.get("link_to") == "custom":
            u = (s.get("link") or {}).get("url")
            if u:
                b["url"] = relativo(u)
        elif s.get("link_to") == "file":
            b["url"] = relativo(url)
        if s.get("caption"):
            b["pie"] = s["caption"]

    elif w == "button":
        texto = (s.get("text") or "").strip()
        b["t"] = "boton"
        b["texto"] = texto
        b["url"] = relativo(((s.get("link") or {}).get("url") or "").strip())
        # OJO con los nombres: el fondo del boton es `background_color`, no
        # `button_background_color`. Leerlo mal dejaba el texto verde sobre
        # el verde por defecto, ilegible.
        for destino, claves in (("fondo", ("background_color", "button_background_color")),
                                ("colorTexto", ("button_text_color",)),
                                ("colorBorde", ("border_color",)),
                                ("fondoHover", ("button_background_hover_color", "background_hover_color")),
                                ("colorHover", ("button_hover_color",)),
                                ("colorBordeHover", ("button_border_hover_color", "border_hover_color"))):
            for clave in claves:
                if s.get(clave):
                    b[destino] = s[clave]
                    break
        r = caja(s.get("border_radius"))
        if r:
            b["radio"] = r
        bw = caja(s.get("border_width"))
        if bw:
            b["grosorBorde"] = bw
        tip = tipografia(s)
        if tip:
            b["tipo"] = tip
        rel = caja(s.get("text_padding"))
        if rel:
            b["rellenoBoton"] = rel

    elif w == "divider":
        b["t"] = "separador"
        b["color"] = s.get("color") or "#02E215"
        b["grosor"] = num(s.get("weight"), 1)
        an = medida(s.get("width"))
        if an:
            b["ancho"] = an
        b["hueco"] = num(s.get("gap"), 15)

    elif w == "spacer":
        alto = num(s.get("space"), 50)
        altoM = num(s.get("space_mobile"))
        b["t"] = "espaciador"
        b["alto"] = alto
        if altoM is not None:
            b["altoMovil"] = altoM

    elif w == "google_maps":
        b["t"] = "mapa"
        b["direccion"] = s.get("address") or ""
        b["zoom"] = num(s.get("zoom"), 10)
        b["alto"] = num(s.get("height"), 300)

    elif w in ("eael-contact-form-7", "shortcode"):
        if w == "shortcode" and "contact-form-7" not in str(s.get("shortcode", "")):
            return None
        b["t"] = "formulario"

    elif w == "video":
        b["t"] = "video"
        b["url"] = (s.get("youtube_url") or s.get("hosted_url", {}).get("url")
                    or s.get("vimeo_url") or "")
        b["url"] = relativo(b["url"])

    elif w == "image-gallery":
        imagenes = [relativo(i.get("url")) for i in (s.get("wp_gallery") or []) if i.get("url")]
        if not imagenes:
            return None
        b["t"] = "galeria"
        b["imagenes"] = imagenes
        b["columnas"] = int(num(s.get("gallery_columns"), 4))

    elif w == "menu-anchor":
        if not s.get("anchor"):
            return None
        b["t"] = "ancla"
        b["ancla"] = s["anchor"]

    else:
        return None

    return b


def convertir_columna(e):
    s = e.get("settings") or {}
    c = {"id": e.get("id"), "elementos": [convertir(h) for h in (e.get("elements") or [])]}
    c["elementos"] = [x for x in c["elementos"] if x]
    # _inline_size es el ancho que el usuario ajusto arrastrando; _column_size
    # es el de la estructura. Manda el primero cuando existe.
    an = num(s.get("_inline_size"))
    if an is None:
        an = num(s.get("_column_size"))
    if an is not None:
        c["ancho"] = round(an, 3)
    # el ancho de la ESTRUCTURA (25, 33, 50, 100...): Elementor lo usa para la
    # clase elementor-col-N, que es lo que engancha con sus hojas de estilo
    base = num(s.get("_column_size"))
    if base is not None:
        c["anchoBase"] = int(base)
    anm = num(s.get("_inline_size_mobile"))
    if anm is not None:
        c["anchoMovil"] = round(anm, 3)
    ant = num(s.get("_inline_size_tablet"))
    if ant is not None:
        c["anchoTablet"] = round(ant, 3)
    rel = caja(s.get("padding"))
    if rel:
        c["relleno"] = rel
    f = fondo(s)
    if f:
        c["fondo"] = f
    if tiene_superposicion(s):
        c["superposicion"] = True
    if s.get("align_self") or s.get("content_position"):
        c["alinearVertical"] = s.get("align_self") or s.get("content_position")
    return c


def convertir_seccion(e):
    s = e.get("settings") or {}
    sec = {"t": "seccion", "id": e.get("id")}
    if s.get("stretch_section") == "section-stretched":
        sec["estirada"] = True
    # boxed (el contenedor lleva ancho maximo) o full_width (no lo lleva).
    # Elementor lo escribe como clase, no como CSS: sin esto una seccion a
    # ancho completo se queda encogida al ancho del kit.
    sec["disposicion"] = s.get("layout") or "boxed"
    ancho = num(s.get("content_width"))
    if ancho and sec["disposicion"] == "boxed":
        sec["ancho"] = int(ancho)
    if s.get("gap"):
        sec["hueco"] = s["gap"]
    g = num(s.get("gap_columns_custom"))
    if g is not None:
        sec["huecoPx"] = g
    m = caja(s.get("margin"))
    if m:
        sec["margen"] = m
    mm = caja(s.get("margin_mobile"))
    if mm:
        sec["margenMovil"] = mm
    r = caja(s.get("padding"))
    if r:
        sec["relleno"] = r
    rm = caja(s.get("padding_mobile"))
    if rm:
        sec["rellenoMovil"] = rm
    f = fondo(s)
    if f:
        sec["fondo"] = f
    if tiene_superposicion(s):
        sec["superposicion"] = True
    alt = num(s.get("min_height"))
    if alt:
        sec["altoMinimo"] = alt
    if s.get("_element_id"):
        sec["ancla"] = s["_element_id"]
    sec["columnas"] = [convertir_columna(c) for c in (e.get("elements") or [])
                       if c.get("elType") == "column"]
    return sec


def convertir(e):
    if not isinstance(e, dict):
        return None
    t = e.get("elType")
    if t == "section":
        sec = convertir_seccion(e)
        return sec if any(c["elementos"] for c in sec["columnas"]) or sec.get("fondo") else None
    if t == "column":
        return convertir_columna(e)
    if t == "widget":
        return convertir_widget(e)
    if t == "container":     # Elementor 3.6+, por si acaso
        sec = {"t": "seccion", "id": e.get("id"),
               "columnas": [{"ancho": 100,
                             "elementos": [x for x in (convertir(h) for h in (e.get("elements") or [])) if x]}]}
        return sec
    return None


# ---------------------------------------------------------------------- main

def main():
    if len(sys.argv) < 2:
        sys.exit("uso: arbol.py export.xml [--ensayo]")
    ruta = sys.argv[1]
    ensayo = "--ensayo" in sys.argv

    xml = open(ruta, encoding="utf-8").read()
    leer_tamanos(xml)
    print("adjuntos con variantes:", len(TAMANOS))

    # H1 que enseña hoy cada pagina, medido sobre la web viva.
    h1_vivos = {}
    vivo = os.path.join(RAIZ, "estructura-viva.json")
    if os.path.exists(vivo):
        with open(vivo, encoding="utf-8") as fh:
            for r, datos in json.load(fh).items():
                lista = datos.get("h1") or []
                if lista and lista[0].strip():
                    h1_vivos[r] = lista[0].strip()

    # menus: id de termino -> nombre
    for t in re.findall(r"<wp:term>(.*?)</wp:term>", xml, re.S):
        tax = re.search(r"<wp:term_taxonomy>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</wp:term_taxonomy>", t, re.S)
        if not tax or tax.group(1).strip() != "nav_menu":
            continue
        tid = re.search(r"<wp:term_id>(\d+)</wp:term_id>", t)
        if tid:
            MENUS[tid.group(1)] = cdata(t, "term_slug")
    print("menus del export:", MENUS)

    # ruta -> fichero JSON
    por_ruta = {}
    for f in os.listdir(PAGINAS):
        if not f.endswith(".json"):
            continue
        with open(os.path.join(PAGINAS, f), encoding="utf-8") as fh:
            por_ruta[json.load(fh)["ruta"]] = f

    resumen = Counter()
    for it in re.findall(r"<item>(.*?)</item>", xml, re.S):
        if cdata(it, "post_type") != "page" or cdata(it, "status") != "publish":
            continue
        enlace = (re.search(r"<link>(.*?)</link>", it, re.S) or [None, ""])[1].strip() \
            if re.search(r"<link>(.*?)</link>", it, re.S) else ""
        ruta_url = relativo(enlace) or "/"
        if not ruta_url.endswith("/"):
            ruta_url += "/"
        fichero = por_ruta.get(ruta_url)
        if not fichero:
            resumen["sin_json"] += 1
            continue

        crudo = meta(it, "_elementor_data")
        bloques = []
        if crudo:
            try:
                datos = json.loads(html.unescape(crudo))
                bloques = [x for x in (convertir(s) for s in datos) if x]
                resumen["con_arbol"] += 1
            except Exception as e:
                resumen["arbol_ilegible"] += 1
                print("  arbol ilegible en %s: %s" % (ruta_url, e))
        else:
            resumen["sin_arbol"] += 1

        menu_id = meta(it, "ocean_header_custom_menu") or "0"
        menu = MENUS.get(menu_id, "")

        # La banda de titulo del tema solo se enseña cuando la pagina tiene un
        # <h1> en vivo que NO es el primer encabezado de su contenido. Si
        # coinciden, ese H1 lo pinta Elementor dentro del contenido y la banda
        # no existe. Medido, no deducido del meta del tema: `ocean_disable_title`
        # no es fiable (pagina con "default" sin banda y con "enable" con ella).
        h1v = h1_vivos.get(ruta_url, "")
        primero = ""
        def primer_encabezado(lista):
            for b in lista:
                if b.get("t") == "encabezado":
                    return b.get("texto", "")
                if b.get("t") == "seccion":
                    for c in b.get("columnas") or []:
                        t = primer_encabezado(c.get("elementos") or [])
                        if t:
                            return t
            return ""
        primero = primer_encabezado(bloques)
        # La "banda de titulo" del tema (la franja gris con el nombre de la
        # pagina) NO se enseña en ninguna pagina, y esto es a proposito.
        #
        # En la web en vivo esa franja existe en 7 paginas, pero su texto —el
        # H1 y las migas— esta escrito en BLANCO sobre gris claro (#f5f5f5):
        # no se lee nada. Lo que se ve es una franja gris vacia de 45 px
        # encima de la foto principal. Es un fallo de la configuracion del
        # tema, no una decision de diseño.
        #
        # Copiarla tal cual serian dos males: una franja inutil que empuja la
        # foto hacia abajo, y un H1 invisible (a Google no le gusta el texto
        # oculto). Copiarla pero con el texto legible tampoco vale: entonces
        # la web nueva enseña algo que la vieja no enseñaba.
        #
        # Asi que se quita el TEXTO en todas, y el H1 pasa a ser el primer
        # encabezado del contenido, igual que en las otras 256 paginas: un
        # solo H1, a la vista, y con el texto que de verdad describe la pagina.
        #
        # Pero la franja SI tiene que seguir ocupando su sitio (`huecoTitulo`).
        # No es un capricho: la primera seccion de estas paginas lleva un
        # margen superior NEGATIVO (-84 px en la portada) que el autor puso
        # contando con que la franja estuviera ahi. Si se quita del todo, la
        # foto principal sube 45 px de mas y se come la barra del menu.
        # Dejando el hueco vacio, la pagina queda EXACTAMENTE donde estaba en
        # la web en vivo, que es lo que se busca.
        banda = False
        hueco = bool(h1v) and h1v.strip().lower() != primero.strip().lower()

        destino = os.path.join(PAGINAS, fichero)
        with open(destino, encoding="utf-8") as fh:
            pagina = json.load(fh)
        # el id del post: con el se localiza la hoja de estilo que Elementor
        # escribio para esta pagina (/wp-content/uploads/elementor/css/post-ID.css)
        m_pid = re.search(r"<wp:post_id>(\d+)</wp:post_id>", it)
        pid = m_pid.group(1) if m_pid else ""
        if pid:
            pagina["postId"] = int(pid)
        pagina["bloques"] = bloques
        pagina["menu"] = menu
        pagina["bandaTitulo"] = banda
        pagina["huecoTitulo"] = hueco
        if not ensayo:
            with open(destino, "w", encoding="utf-8") as fh:
                json.dump(pagina, fh, ensure_ascii=False, indent=1)

        resumen["menu:" + (menu or "(por defecto)")] += 1

    if FALTAN_VARIANTES:
        lista = os.path.join(RAIZ, "scripts", "extra-imagenes.txt")
        previas = set()
        if os.path.exists(lista):
            previas = {l.strip() for l in open(lista, encoding="utf-8")}
        nuevas = sorted(FALTAN_VARIANTES - previas)
        if nuevas:
            with open(lista, "a", encoding="utf-8") as f:
                f.write("\n# Variantes que pinta Elementor y no estaban descargadas\n")
                f.write("\n".join(nuevas) + "\n")
        print("variantes sin descargar: %d (apuntadas en scripts/extra-imagenes.txt)"
              % len(FALTAN_VARIANTES))

    print("ENSAYO" if ensayo else "APLICADO")
    for k, v in sorted(resumen.items()):
        print("  %-28s %s" % (k, v))


if __name__ == "__main__":
    main()
