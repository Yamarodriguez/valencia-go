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
- `npm run todo` (≈3 min): fuentes → build → validar → enlaces internos →
  encabezados (C1) → marcado (C2). Cada paso deja su informe en informes/.
- `npm run todo:visual`: barrido de 404 de la referencia y de la nueva,
  geometría (C4, vieja 8090 frente a nueva 4321, a 1400 y 390 px) y
  contraste (C3). `npm run lado-a-lado` hace las capturas de cada tipo.
- Excepciones aprobadas: `src/data/fallos-original.json` (404 del servidor
  viejo, páginas sin H1, shortcodes que se ven escritos, enlaces rotos,
  contraste, geometría). Lo marcado "pendiente" está enseñado al
  propietario y falta su decisión.

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
- Fase actual: 2 — ver "Pendiente" abajo. Siguiente: Fase 3 (rediseño).
- Hecho Fase 0 (5-10-2026, 83b72f8): entorno, inventario, regla del H1.
- Hecho Fase 1 (5-10-2026, ec93a15…a313e80): referencia, barrido de 404,
  primer despliegue.
- Hecho Fase 2 (6-10-2026, 7acd4ab y siguientes): motor por captura; 1.020
  páginas (5 idiomas, paginaciones, legales y packs traducidos); `todo` a 0
  (marcado: 173.433 elementos, 0 diferencias; encabezados 100 %); 54
  redirecciones de la web vieja en `public/_redirects`.
- Fallos del kit: el motor y los scripts del kit ligados a OceanWP se han
  retirado (render.js, componentes, css.mjs, descargadores). Quedan en
  `kit/` de consulta. B1.2/3/12 ya no aplican (no se pinta desde el árbol).
- Pendiente del propietario: decidir los fallos del original "pendientes"
  (shortcodes de Turitop a la vista en los packs, 17 enlaces rotos,
  contraste); datos de la sección 1 del prompt (DNS, Search Console,
  AdSense, GA4, titular, formularios).
