# www.valenciaandgo.com — migración de WordPress a Astro

## Quién manda
Yama (yamarodriguez), propietario, no técnico: castellano de España, de tú,
sin jerga. Lo haces tú. Cada informe dice el estado del cambio (local /
commit / rama / main desplegado).

## Decisiones (sección 0 del prompt)
Dec. 1 Claude Code (ejecuta y llega al dominio) · Dec. 2 Claude sube a main
cuando las comprobaciones salen bien · Dec. 3 copia exacta y comprobada ·
Dec. 4 rediseño con 2-3 opciones en imagen, probado en una página, con
interruptor · Dec. 5 DNS en el registrador, el correo no se toca · Dec. 6
ancho igual que la vieja · Dec. 7 contraste a mano y con permiso.
Regla del H1 aprobada (5-10-2026): **se conserva el H1 que tiene hoy cada
página en vivo, tal cual; nada se asciende ni se baja.**
Decisiones del inventario (5-10-2026, "confirmo todo"): los 4 idiomas se
migran enteros (están en la copia); el botón de comprar enlazará a la
reserva de Turitop (Fase 5); LiteSpeed se esquiva con
`?LSCWP_CTRL=before_optm`, que devuelve el HTML limpio.

## Reglas
- Método: PROMPT-MIGRACION-V5.md. Antes de cada fase, lee esa fase y la
  sección E.
- Contenido original intocable salvo petición (regla + seco + commit propio).
- Nada inventado. Lo nuevo, desde src/data/, ALREDEDOR de las piezas.
- 0 fallos en `npm run todo` y `npm run todo:visual` antes de subir a main
  (lo impone scripts/hooks/pre-push; `git config core.hooksPath scripts/hooks`).
- Informes en informes/; no listar carpetas enormes (referencia/,
  descargas/, src/content/paginas/, public/wp-content/).
- Windows: TODO código con barras invertidas (regex, `\n`) se escribe con
  las herramientas de edición, nunca con heredoc ni `python -` desde la
  consola (se las come). `pip` no arranca: `python -m pip`. En Git Bash,
  un argumento que empieza por `/` se convierte en ruta de Windows: usar
  `MSYS_NO_PATHCONV=1` con `--rutas /a/`.
- Las tareas en segundo plano se cortan a los ~20-30 min: las comprobaciones
  con navegador se lanzan una a una (o `todo:visual` desde una terminal).
- Agentes: PROHIBIDO escribir ficheros.
- Nunca `git add .` ni `git add -A`.
- Esta carpeta es un worktree de Git (rama `claude/data-migration-b8e01f`).
  `kit/`, los XML, `referencia/` y `descargas/` no están en Git.

## Cómo está hecha la web nueva (Fase 2: copia fiel por captura)
La web vieja (Hello Elementor + Elementor Pro con contenedores y
constructor de temas, WooCommerce con Turitop, TranslatePress con 4
idiomas, 54 tipos de widget) no se puede pintar desde el árbol del export
con 0 diferencias. Se aplica a TODA la página lo que el método manda para
lo que pinta un plugin: **se captura del HTML vivo**.

- `src/content/paginas/<nombre>.html`: cada página partida en piezas
  (cabeza, antes, cabecera, contenido, pie, despues) + `indice.json`.
  `src/pages/[...slug].astro` y `src/layouts/Base.astro` las juntan sin
  tocarlas. `src/pages/404.astro` hace lo mismo con la 404 viva.
- Lo único que cambia respecto del original: direcciones absolutas →
  relativas (menos canonical, hreflang, sociales y datos estructurados), y
  lo que diga `src/data/cabeza.json` (se quitan del `<head>` RSS, wp-json,
  oEmbed, EditURI, shortlink y generator; Font Awesome 6.4.0 pasa de cdnjs
  a `/fontawesome/`, desde npm). `scripts/lib/relativizar.mjs` no toca
  nunca el texto visible.
- Hojas, guiones, fotos y letras van con SU MISMA RUTA en `public/wp-content/`
  y `public/wp-includes/` (en Git, 202 MB). `public/fontawesome/` lo genera
  `npm run fuentes` (Netlify: `npm run fuentes && npm run build`).
- `src/content/pages/*.json` son los datos del export XML (extraer.py +
  arbol.py): el motor ya NO los usa; sirven de consulta y para que montar
  baje las fotos del árbol.
- Los guiones de WordPress se cargan igual que en la vieja. Lo que llama a
  PHP (carrito, lista de deseos, formularios CF7 y de Elementor, wp-json)
  no funciona en estático: se sustituye en la Fase 5. Hoy el barrido lo
  acepta por `src/data/lista-blanca-404.json`.

## Cadena de datos (solo cuando cambia la web vieja; en este orden)
1. `npm run bajar` (scripts/bajar-paginas.mjs): HTML limpio de todas las
   rutas de `src/data/tipos.json` a `descargas/html/` y `referencia/`.
   `--solo-faltan` reanuda; `--lista fichero` o `--rutas`; `--404`.
2. `node scripts/alias.mjs`: direcciones alternativas → redirección.
3. `python scripts/inventario-vivo.py`: `estructura-viva.json` y `tipos.json`.
4. `npm run partir`: piezas en `src/content/paginas/`.
5. `npm run montar`: baja lo que piden las páginas y pasa la referencia a
   rutas relativas (antes de montar, si se re-baja: `cp -r descargas/html/. referencia/`).
6. `npm run recursos`: `referencia/wp-*` → `public/`.
7. `node scripts/redirecciones.mjs`: `src/data/redirecciones.json` → `public/_redirects`.
8. Enlaces: `node scripts/enlaces-internos.mjs`; si hay "sin decidir":
   `enlaces-estado.mjs` (pregunta a la web vieja) → `enlaces-resolver.mjs`
   → bajar `--lista informes/rutas-por-bajar.txt` → repetir desde 2.

## Comprobaciones
- `npm run todo` (≈3 min): fuentes → hojas → build → validar → enlaces
  internos → encabezados (C1) → marcado (C2). Cada paso deja su informe.
- `npm run todo:visual`: barridos de 404 (vieja y nueva, con errores de
  JavaScript apuntados), geometría (C4, 8090 frente a 4321, 1400 y 390 px) y
  contraste (C3). `--rapido` (una página por tipo) es lo que usa el hook;
  `--todas`, todo. `npm run lado-a-lado`: capturas por tipo.
- `node scripts/probar-formularios.mjs`: envío simulado de los 4 formularios.
- `node scripts/velocidad.mjs [--movil]`: peso y tiempos, vieja frente a
  nueva desplegada.
- Excepciones aprobadas: `src/data/fallos-original.json` (404 del servidor
  viejo, páginas sin H1, shortcodes a la vista, enlaces rotos, contraste,
  geometría). Lo "pendiente" está enseñado al propietario; falta su decisión.

## Fase 5 (formularios): hecho el 6-10-2026
- Formularios de Netlify. `public/js/formularios.js` (lo engancha Base.astro
  con `data-nuevo="formularios"` si `site.formulario.activo`) escucha el envío
  de los formularios de Elementor y de Contact Form 7, lo manda a Netlify sin
  salir de la página y pone el aviso en su sitio, en el idioma de la página,
  con la dirección de la página y un evento `generate_lead` en Analytics.
- `public/formularios-netlify.html` declara los 4 formularios (info-bus,
  contacto, contacto-entrada, experiencias-a-medida) con campos fijos.
- PENDIENTE del propietario: en Netlify → Forms → Notifications poner el
  correo de destino (info@valenciaandgo.com); un envío de prueba real.
- Reservas: Turitop es externo y funciona igual. Los 8 packs con descuento
  llevan "añadir al carrito" de WooCommerce (no funciona en estático):
  decisión pendiente del propietario.

## Fase 6 (velocidad, sin tocar el diseño): hecho el 6-10-2026
- `src/data/velocidad.json` (lo aplica partir-paginas, lo conoce
  comparar-marcado): quita los guiones muertos en estático (lista de deseos
  con React, pagos Stripe/PayPal, Contact Form 7, Turnstile), reúne las hojas
  consecutivas del `<head>` (también las post-ID.css de las plantillas y los
  `<style>` iguales en todas las páginas) en 44 ficheros compartidos por las
  1.020 páginas (`npm run hojas` → public/css/, no en Git; sueltas quedan la
  post-ID.css de la propia página y `elementor-frontend-inline-css`, que
  cambian por página), precarga la letra del título (`precargar.letras`) y
  pone `loading="lazy"` a las fotos salvo las 3 primeras del contenido (no
  en los carruseles).
- Font Awesome recortada a los 9 iconos que usa la web: `python
  scripts/subset-fa.py` → `src/fuentes/` (en Git); fuentes-locales.mjs los
  copia encima de public/fontawesome/webfonts/. Si aparece un icono nuevo,
  repetir.
- `netlify.toml`: `Netlify-CDN-Cache-Control` durable para que el borde no
  vaya al origen en cada visita (antes `Cache-Status: fwd=miss`).
- `node scripts/radiografia.mjs [--movil]`: radiografía de carga de una
  página (TTFB, primera pintura, LCP, qué bloquea) en vieja y nueva.
- NO se quitan: wp-hooks y wp-i18n (los usa Elementor Pro) ni el guion de
  emojis (sin él la bandera del idioma cambia de aspecto en Windows).
- Y, como LiteSpeed en la vieja, TODOS los guiones se aplazan hasta que el
  visitante hace algo (ratón, tecla, scroll) o pasan 6 s: `src/js/aplazador.js`
  en línea al principio del `<head>` (Base.astro) los ejecuta en orden
  fingiendo que la página aún carga (readyState) y relanza DOMContentLoaded
  y load al final. Las pruebas con navegador mueven el ratón y esperan a
  `<html data-js-aplazado="hecho">`.
- Medida (6-10-2026, `scripts/velocidad.mjs`, mediana de 3 cargas sin caché):
  portada en escritorio, vieja 1.534 KB / 48 peticiones / LCP 284 ms; copia
  antes 2.925 KB / 170 / 964 ms; copia después 1.693 KB / 49 / 752 ms. En
  móvil con 4G lenta, LCP de la portada: vieja 1,2 s; copia antes 7,1 s;
  después 1,8 s. Entrada /paella/ en móvil: 3,6 s vieja, 3,5 s copia.
  Queda un margen frente a LiteSpeed (sobre todo el tiempo hasta "listo"):
  las hojas van en ~15 ficheros compartidos en vez de 1 por página.

## Fase 7 (mudanza): preparado, NO hecho
- `public/sitemap_index.xml` y los mapas de Yoast copiados con su nombre
  (`npm run sitemaps`); `public/robots.txt`; `_redirects` con las 54
  redirecciones de la vieja y las 176 direcciones cortas `?p=ID`; el validador
  comprueba que todo lo del mapa es página o redirección.
- Falta el día del cambio: repetir la cadena de datos, quitar el noindex de
  netlify.toml, activar en `_redirects` la línea del dominio de pruebas, DNS
  en el registrador (sin tocar MX/SPF/DKIM), Search Console.

## Datos
AdSense · GA4 · WhatsApp · correo · formulario · DNS: PENDIENTES (el
propietario no los ha pasado todavía).
Repositorio: https://github.com/Yamarodriguez/valencia-go (rama main).
Netlify: https://valenciaandgo.netlify.app (despliega main; lleva
X-Robots-Tag noindex hasta la Fase 7).
Páginas con tráfico (Search Console): sin export todavía.
Dominio: https://www.valenciaandgo.com (sin www redirige con 301).
La web vieja sigue viva y cambia (el 6-10 habían cambiado 4 direcciones
traducidas): antes de la Fase 7 hay que repetir la cadena de datos.

## Estado (se actualiza al cerrar cada fase)
- Fase actual: 2 cerrada técnicamente (falta el visto bueno del propietario
  a la web de pruebas); 5 y 6 hechas; 7 preparada. Sin hacer: 3 (rediseño:
  el propietario no lo ha pedido; se le ofrece) y 4 (contenido nuevo: no hay
  datos del propietario).
- Hecho Fase 0 (5-10-2026, 83b72f8); Fase 1 (5-10-2026, ec93a15…a313e80);
  Fase 2 (6-10-2026, 7acd4ab…c3a9c3f): 1.020 páginas, todo a 0.
- Fases 5 y 6 y preparación de la 7: 6-10-2026 (ver arriba).
- La copia es del 6-10-2026 (01:30-03:00), posterior a la última modificación
  de la web vieja según su mapa (5-10 09:45).
- Pendiente del propietario: visto bueno a la web de pruebas; fallos del
  original "pendientes" (shortcodes de Turitop en los packs, 17 enlaces
  rotos, contraste); qué hacer con los 8 packs (carrito); correo de avisos en
  Netlify Forms y envío de prueba; DNS, Search Console, AdSense, GA4.
