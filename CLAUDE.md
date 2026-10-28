# www.valenciaandgo.com — migración de WordPress a Astro

## RAMA `empresa-nueva` (desde el 26-10-2026): la web de la empresa de turismo nueva
Esta rama parte de la copia fiel (`claude/data-migration-b8e01f`, 2d84324) y
NO es la migración: es la base de una empresa de turismo nueva, distinta de
Valencia&Go, que sigue funcionando aparte. Decisión del propietario
(26-10-2026): se conservan todos los tours por ahora; se cambian marca
(nombre, dominio, logo, colores/diseño) y TODAS las fotos; los textos y los
títulos, después. Advertido: contenido y fotos de la vieja son de otra
empresa y Google penaliza el duplicado; el propietario lo asume.
Plan completo: `PLAN-EMPRESA-NUEVA.md` (su recomendación original era no
clonar; la sección 4 queda como referencia).

Hecho el 26-10-2026 (todo en esta rama, nada en main ni en Netlify):
- Nombre "Excursiones Valencia" aplicado (`cambiar-marca`): nombre, logos,
  favicon/iconos, imagen de compartir (`public/marca/compartir.jpg`).
  Dominio, correo, teléfono, WhatsApp y redes siguen siendo los viejos
  (marca.json vacío en esos campos: el propietario no los ha dado).
- Logo hecho por Claude: `public/marca/logo.svg|png` (fondo claro),
  `logo-blanco.*` (fondo oscuro), `icono.*`. Sol naranja #F28C28 sobre olas
  azul marino #0B3D6E / azul claro #1E88C7. El SVG lleva el texto como
  <text> (letra del sistema): si el propietario lo aprueba, pasar a trazados.
- Colores (`cambiar-colores`, src/data/colores.json): #FF720D y #EF8031 →
  #F28C28; #006991 → #0B3D6E, en las hojas de Elementor y estilos en línea.
  El 27-10-2026 el propietario pidió quitar todas las opciones de rediseño:
  `public/rediseno/` y el selector se borraron (están en el historial,
  commit 845adc7), `rediseno:false` y `selectorRediseno:false` en site.json.
  Se queda el aspecto original con los colores nuevos.
- DISEÑO PROPIO (27-10-2026, cuatro vueltas el mismo día; la vigente: "otro
  acento y los banners de fotos también, como si fuera otra web que no se
  parezcan en nada"): blanco y gris claro #F7F8FA, azul noche #14213D, acento
  esmeralda #047857 (hover #065F46), dorado #F5B300, letra Plus Jakarta Sans.
  Composición propia en `src/estilos/composicion.css` (va detrás de
  excursiones-valencia.css; hoja-marca junta las dos): portada reordenada con
  `order`/rejilla (foto con tarjeta blanca a la izquierda, accesos rápidos
  debajo, tarjetas de tour horizontales a dos columnas, bloques de foto y
  texto invertidos, teambuilding y "diseña tu experiencia" como dos tarjetas
  lado a lado), cabecera de portada blanca, menú en pastilla, banners
  interiores sin la onda y con título a la izquierda, mosaico de fotos en las
  fichas. OCULTO con CSS por ser de Valencia&Go: reseñas y estrellas (iframes
  tour-widget-f5d2e, client=valgo), "Empresas que han confiado en nosotras",
  título de Instagram, franja de tres columnas del pie y sellos/acreditaciones
  (Tripadvisor, Civitatis, GetYourGuide, Fundació Visit València, Guías
  Oficiales, Creaturisme, FEDER). Antes fueron: verde y crema con serifa;
  azul marino y azafrán; blanco con rojo #D62839 (src/data/colores.json `_paleta`; cambiar-colores
  ahora también toca la hoja del plugin thegem-atracciones, los icono-*.svg
  de uploads y valores rgb()). Letra servida desde public/fuentes-marca/ (`fuentes-marca.mjs`), precargadas en
  velocidad.json. Hoja `src/estilos/excursiones-valencia.css` →
  `node scripts/hoja-marca.mjs` → public/rediseno/excursiones-valencia.css,
  encendida con `rediseno` en site.json (selector apagado). Logo nuevo
  (`logo-marca.mjs`, texto en trazos; necesita opentype.js y los TTF fuera del
  proyecto, ver cabecera del guion): sello azul noche con sol dorado y
  olas blancas; "VALENCIA" en rojo (en azul marino desde el cambio de paleta). Las 12 fotos que solo salían de fondo en las hojas (la de la
  portada incluida) ya tienen nombre (`fotos-fondo.py`, `<h1>-fondo-N`) y
  foto nueva. Los botones naranjas de reserva de las fichas y la nota de
  estrellas van en recuadros (iframe) de Turitop y del widget de opiniones de
  la cuenta de Valencia&Go: no se pueden recolorear y además enseñan SUS
  reseñas; se quitan o cambian cuando haya sistema de reservas propio.
- PUBLICACIÓN (27-10-2026): el propietario decidió que esta web sea lo que
  publica el sitio de Netlify de siempre (valenciaandgo.netlify.app, que
  despliega `main`): `empresa-nueva` se subió a `main` por avance rápido. La
  copia fiel de la migración sigue en `claude/data-migration-b8e01f`; si se
  retoma la Fase 7 hará falta otro sitio de Netlify. El gancho pre-push de
  main ahora pasa fuentes+hojas+build+comprobar-recursos-nuevos (los antiguos
  `todo`/`todo:visual` no sirven aquí). Sigue el `X-Robots-Tag: noindex`.
- Feed de Instagram de la portada quitado (`quitar-instagram`, 5 idiomas).
- PÁGINAS NUEVAS (27-10-2026, "agrega todo y agrega buceo" tras el análisis
  de la competencia): 28 fichas que no existían en la web vieja + 2
  categorías nuevas, solo en castellano. Datos y textos en
  `src/data/paginas-nuevas.json`; las monta `python scripts/paginas-nuevas.py`
  (se puede repetir: rehace las nuevas, vuelve a poner tarjetas y menú sin
  duplicar). Cada ficha es copia de la del tour medieval con sus textos y
  SIN duración, idiomas, estrellas, sellos de "guía oficial", caja de
  Turitop, schema ni enlaces a traducciones; botones a /contacto/. PRECIOS
  (27-10-2026, "busca precios similares y pon 1 euro menos"): cada ficha
  lleva "desde" el precio de una actividad parecida de la competencia menos
  1 €, con la fuente en `precio.referencia` de paginas-nuevas.json; colegios
  sigue "a consultar" (no hay tarifa publicada por alumno).
  AVENTURA (28-10-2026, "agregar paracaidismo, viajes en avioneta y otros
  servicios que existan en Valencia"): categoría /aventura/ ("Aventura y
  vuelos", menú "Aventura"): paracaidismo en Requena, avioneta y helicóptero
  en La Llosa, parapente en Villar del Arzobispo, rafting en el Cabriel,
  quads y buggies; su listado incluye también el globo ('extra'). En el
  agua: moto de agua, velero, surf. Servicios: consigna de equipaje,
  fotógrafo de vacaciones (a consultar). Mismo criterio de precio. Barranquismo
  no añadido: sin precios ni sitios comprobables. Menú de siete secciones:
  composicion.css lo compacta entre 1025 y 1340 px para que quepa en una línea. Tours: misterios y leyendas, Valencia macabra, Santo Grial y
  Borgia, Guerra Civil, Carmen y arte urbano, Sorolla, modernismo, Cabanyal,
  con niños, horchata en Alboraya, cervezas en Ruzafa, tapas y flamenco,
  estadios. Excursiones: Chulilla, Montanejos, Guadalest y Algar, Albufera en
  bici y en 4x4, globo. Categoría nueva /actividades-en-el-agua/ (catamarán,
  kayak y paddle surf, bautismo de buceo, salidas de buceo) y /servicios/
  (traslados, entradas, audioguías "muy pronto", bicis, colegios), copiadas de
  /excursiones/ sin "cargar más". Menú: "En el agua" y "Servicios" tras
  Excursiones en todas las páginas en castellano. Tarjetas nuevas al final de
  la primera página de /tours-valencia/ y /excursiones/ (entre
  `<!--ev-nuevas-->`). Fotos: `node scripts/fotos-paginas-nuevas.mjs`
  (búsquedas y claves por página; `--slug x --rehacer [--numeros 2,3]
  [--buscar ".."]`; las descartadas a mano quedan en
  `src/data/fotos-descartadas.json` y no vuelven). Agencia de viajes NO
  añadida: exige inscripción y garantía en la Comunitat Valenciana. Las
  actividades de terceros (buceo, globo, catamarán, estadios, entradas) piden
  acuerdos con proveedores que el propietario aún no tiene.
- SEO Y ACCESO DE LAS IA (28-10-2026): análisis en
  `informes/ANALISIS-SEO-AEO.md` (informes/ no está en Git). Lo crítico
  sigue pendiente del propietario: dominio propio (canonical, mapas, robots,
  schema y llms.txt dicen www.valenciaandgo.com porque sale de site.json
  `dominio`), correo/teléfono, autor real, reservas y opiniones propias,
  textos reescritos. Arreglos rápidos hechos, todo desde `src/data/seo.json`:
  · `npm run seo` (scripts/seo-archivos.mjs) escribe public/robots.txt (todos
    pueden entrar; se nombran los robots de buscadores y de IA, también los
    que entrenan modelos, por decisión del propietario), public/llms.txt
    (resumen y páginas clave por secciones, con su título y descripción) y
    public/excursiones-valencia-sitemap.xml con las páginas indexables que no
    están en los mapas viejos (las 42 nuevas), enlazado en sitemap_index.xml;
    de los mapas viejos quita lo que ya no es página (/tours/ y traducciones).
    REPETIR al cambiar el dominio, al añadir páginas o al cambiar títulos.
  · Datos estructurados al construir (`src/utils/seo.js`, llamado desde
    [...slug].astro y 404.astro; las piezas no se tocan): FAQPage con las
    preguntas frecuentes visibles (274 páginas), TouristTrip/Service con
    Product y oferta en EUR si la ficha enseña precio (252), grafo completo
    en las categorías nuevas, y fuera el SearchAction (buscador ?s= que no
    existe). El precio es el primer widget de precio cuyo data-id no se repite
    en la página (los repetidos son las tarjetas de "otras actividades").
  · 17 enlaces rotos del original redirigidos (src/data/redirecciones.json,
    origen "SEO 28-10-2026"; fallos-original.json los marca "redirigido").
  · `scripts/seo-arreglos.mjs`: título del artículo de cócteles (llevaba el
    del eclipse, en los 5 idiomas) y los H1 de arriba.
  · Títulos y descripciones (28-10-2026, 2.ª tanda): `src/data/seo-metas.json`
    (ruta -> titulo/descripcion, lo aplica seo-arreglos.mjs) deja las 208
    páginas indexables en castellano con título ≤60 y descripción de 70 a
    160, sin repetidos, y arregla 7 artículos (5 idiomas) que llevaban el
    título y/o la descripción del eclipse (9 d'Octubre, niños en septiembre,
    El Carmen, octubre 2026, Tomatina, vendimia, cócteles). Las traducidas
    (en, fr, it, pl: 264 páginas) van en `src/data/seo-metas-traducciones.json`
    con el mismo criterio: 0 fallos en las 872 páginas indexables. Después de
    cambiar títulos, `npm run seo` (llms.txt). OJO: el artículo "Día de la
    mujer emprendedora" y el aviso legal (5 idiomas) atribuyen a Excursiones
    Valencia la fundadora y la historia de Valencia&Go: pendiente de los
    datos legales del propietario.
- Fotos: `fotos-commons.mjs` baja de Wikimedia Commons una foto real y libre
  (CC0/dominio público/CC BY/CC BY-SA, JPG apaisado ≥1000 px) por cada hueco
  del inventario, buscando por el H1 de la página; créditos en
  `src/data/fotos-creditos.json` → página `/creditos-de-fotos/`
  (`src/pages/creditos-de-fotos.astro`, enlazada en el pie de todas las
  páginas por `enlazar-creditos.mjs`). CC BY-SA obliga a esa página.
  Después, `cambiar-fotos` genera `public/fotos/` y reescribe las páginas.
  Estado 27-10-2026: 566 de 617 huecos con foto nueva de Commons (en
  public/fotos/, ~108 MB con todos los tamaños); 51 huecos siguen con la
  foto vieja (no hubo candidata que encajara). Primera tanda de 188 fotos
  descartadas por salir de otro sitio (Cracovia, Buenos Aires…): desde
  entonces una foto solo vale si su título en Commons nombra un sitio o
  cosa de la lista LUGARES del guion. Para rehacer una foto concreta:
  `node scripts/fotos-commons.mjs --rehacer <nombre> --buscar "texto"` y
  luego `npm run cambiar-fotos`; `--revertir-huerfanas` devuelve a la foto
  vieja las que se descartaron sin sustituta. Commons devuelve 429 si se
  baja deprisa: `--hilos 2 --pausa 800` como mucho; si la miniatura falla
  se baja el original (≤12 MB). `informes/fotos-sospechosas.json` fue la
  lista de la primera criba. El propietario aún no ha revisado ninguna.
- En esta rama NO sirven `npm run todo`, `validar` ni `comparar-marcado`
  (comparan con la web vieja, que ya no es la referencia): se comprueba con
  `npm run build`, el barrido de 404 local y las capturas.

Herramientas (26-10-2026):
- `npm run inventario-fotos` → `src/data/fotos.json` + `informes/fotos-inventario.md`:
  617 fotos del contenido con página dueña (más 90 miniaturas de tarjeta que
  salen de su foto madre), 8 logos, 8 logos de terceros, 17 iconos. Nombre
  nuevo: `<h1>-N.webp` bajo el H1, `<h1>-<sección>-N.webp` bajo un H2/H3;
  alt propuesto = H1 (y sección). Los nombres salen de los H1 ACTUALES: si
  los títulos cambian después, repetir inventario y cambio.
- `npm run cambiar-marca -- --seco` / sin `--seco`: lee `src/data/marca.json`
  (nombre, dominio, correo, teléfono, WhatsApp, redes, logos). Orden de
  reglas: direcciones primero, nombre a secas al final (la forma junta
  "valenciaandgo" solo como palabra suelta). Logos nuevos en `public/marca/`;
  en las `<img>` del logo quita srcset y pone width/height/alt. Actualiza
  `site.json`.
- `npm run cambiar-fotos -- --seco` / sin: el propietario deja las fotos en
  `fotos-nuevas/<nombre nuevo>.jpg|png|webp` (carpeta fuera de Git); genera
  `public/fotos/` a las medidas de la vieja y de cada tamaño -WxH que pidan
  las páginas, y reescribe src/data-src/srcset/fondos/JSON escapado y el alt.
  Se puede ejecutar por tandas.
Orden previsto: marca → inventario → fotos → diseño (hoja en
`public/rediseno/` con los colores nuevos, Fase 3) → textos (otra fase).
Pendiente aparte: el feed de Instagram de la portada (5 idiomas) enseña la
cuenta vieja (`sb-instagram-feed-images/valenciaandgo.webp`, plugin Smash
Balloon): hay que quitarlo o cambiarlo a mano; Turitop y las legales siguen
siendo de la empresa vieja. En esta rama NO se repite la cadena de datos
(`bajar`/`partir` pisarían los cambios). Git: `core.autocrlf=false` en el
repositorio (con `true`, el worktree salía con CRLF y `leerPiezas` no
partía las páginas).

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
página en vivo, tal cual; nada se asciende ni se baja.** Excepción
(28-10-2026, arreglos rápidos de SEO aprobados): Catedral y Santo Cáliz y
Condiciones de compra (5 idiomas cada una) no tenían H1; su rótulo de título
pasa a H1 con `scripts/seo-arreglos.mjs`.
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
- `netlify.toml`: las hojas reunidas (/css/*) se guardan un año en el
  navegador, como /wp-content/. El borde de Netlify ya guarda todo un año
  por defecto; aun así, desde España casi cada petición sale `fwd=miss` o
  `fwd=stale` (unos 300 ms hasta el primer byte; 130 ms cuando acierta)
  frente a 40 ms del hosting viejo con LiteSpeed. Eso no se arregla desde la
  web: es cosa del hosting. Medido el 6-10-2026 desde España: vieja 40-48 ms,
  Netlify ~300 ms, Cloudflare Pages 65-80 ms, GitHub Pages 50-90 ms. El
  propietario decidió (6-10-2026) SEGUIR EN NETLIFY.
- Con eso, lo que queda en nuestra mano (2af1aac): precarga también de Lato
  normal y negrita (el texto) y `anticipar` en velocidad.json: reglas de
  especulación propias (Base.astro, data-nuevo) para que Chrome pida la
  página de un enlace al posar el ratón (comprobado: la petición sale con
  Sec-Purpose: prefetch).
- Menú móvil (6-10-2026): el botón del menú abre una ventana de Elementor Pro
  y no respondía. Causa: los guiones aplazados se descargaban de uno en uno
  (23 externos × 300 ms de Netlify) y el toque que los despierta se perdía.
  aplazador.js ahora los pide por adelantado al terminar de cargar la página
  (`<link rel=preload>` de prioridad baja), guarda el primer clic o toque y lo
  repite cuando los guiones están listos (esperando a que las ventanas de
  Elementor tengan getModal). `node scripts/probar-menu-movil.mjs` lo
  comprueba (local: menú abierto con el primer toque a los ~330 ms).
  Al abrirse la ventana, Elementor pide AL VUELO hojas y guiones que ninguna
  página enlaza (conditionals/dialog.min.css, lightbox.min.css,
  lib/share-link/share-link.min.js): el barrido de 404 no los ve. Están
  bajados a mano de la web vieja en public/ (7e1d419+).
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
- Medida 2ª vuelta (6-10-2026, misma herramienta): la web vieja ese día servía
  la versión SIN optimizar de LiteSpeed (portada 5.543 KB / 206 peticiones;
  LCP 368 ms escritorio, 9,7 s móvil), así que no sirve de comparación.
  Copia en escritorio: portada 1.545 KB / 39 pet. / LCP 820 ms; /paella/
  604 KB / 22 / 1.396 ms. En móvil 4G lenta: portada LCP 2,2 s; /paella/
  3,5 s; Albufera 1,5 s. La portada carga 7 hojas (3 reunidas + 4 sueltas,
  ~150 KB comprimidas) y el HTML pesa 52 KB comprimido; lo que manda es la
  latencia de Netlify (~300 ms por petición), no el peso.
- Fallo que destapó la 2ª vuelta: `.gitignore` tenía `dist/` y dejaba fuera
  de Git 28 ficheros de public/ (wp-includes/js/dist: wp-hooks, wp-i18n…;
  block-library/style.min.css): en Netlify daban 404 y las comprobaciones no
  lo veían porque son locales. Arreglado (`/dist/`, 3b3b174).

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
