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
página en vivo, tal cual; nada se asciende ni se baja.** La atracción
Catedral se queda sin H1 y va a fallos-original.json.
Decisiones del inventario §15 (confirmadas el 5-10-2026 con "confirmo todo"):
idiomas: se bajan los 4 enteros (si se migran se decide con Search Console);
tienda: el botón de comprar enlaza a la reserva de Turitop; LiteSpeed: sigue
activo, así que la referencia se reconstruye con las hojas y guiones
originales (post-ID.css por página) y se vuelve a bajar si lo desactiva.

## Reglas
- Método: PROMPT-MIGRACION-V5.md. Antes de cada fase, lee esa fase y la
  sección E.
- Contenido original intocable salvo petición (regla + seco + commit propio).
- Nada inventado. Lo nuevo, desde src/data/.
- Desde la Fase 2: 0 fallos en `npm run todo` y `npm run todo:visual` antes
  de subir.
- Informes en informes/; no listar carpetas enormes (referencia/ tiene 850
  carpetas).
- Windows: código con barras invertidas, en ficheros. `pip` no arranca:
  usar `python -m pip`.
- Agentes: PROHIBIDO escribir ficheros.
- Nunca `git add .` ni `git add -A`. `.gitignore` ya existe.
- Esta carpeta es un worktree de Git (rama `claude/data-migration-b8e01f`).
  `kit/` y los XML no están en Git: viven aquí y en D:\web\valenciaandgo.

## Lo que esta web tiene y el kit no esperaba (detalle en informes/inventario.md)
- Tema Hello Elementor + hijo, Elementor 4.3.3 **Pro** con constructor de
  temas: 2 cabeceras en uso (10365, 10594), pie 8452, 3 popups en todas.
- Todo son contenedores `e-con` (2.534) y no secciones (14): B1.3 es lo
  primero del motor.
- WooCommerce (51 productos) con reservas por Turitop; TranslatePress con 4
  idiomas (668 páginas traducidas, no están en el export); 71 entradas de
  blog con plantilla single-post; 29 atracciones (ACF + plugin propio).
- LiteSpeed Cache combina CSS/JS y hace perezosas las fotos en el HTML vivo:
  decisión pendiente (inventario §9).
- El export que se usa: `valenciaampgo.WordPress.2026-10-04.xml` (el de
  18,5 MB).

## Datos
AdSense · GA4 · WhatsApp · correo · formulario · DNS · sitio de Netlify:
PENDIENTES (el propietario no los ha pasado todavía).
Repositorio: el `origin` de esta carpeta (confirmar).
Páginas con tráfico (Search Console): sin export todavía.
Dominio: https://www.valenciaandgo.com (sin www redirige con 301).

## Cómo se trabaja aquí (Fase 1 en adelante)
- `npm run todo` = fuentes → css → build → validar → encabezados
  (scripts/todo.mjs). `npm run todo:visual` = servidor 8090 + barrido de
  404 de la referencia (scripts/todo-visual.mjs). Fase 2 añade marcado,
  geometría y contraste.
- La referencia (`referencia/`, 850 carpetas, 350 MB, fuera de Git) se
  completa con `npm run montar` (scripts/montar-referencia.mjs): baja lo que
  piden las páginas, el árbol del export, scripts/extra-imagenes.txt y
  scripts/extra-recursos.txt, y reescribe las direcciones absolutas. Se
  sirve con `npm run referencia` en http://localhost:8090/.
- Si falta algo en referencia/ tras el cambio de DNS ya no se puede bajar:
  todo lo que compila está en Git (src/, public/, css-original/,
  estructura-viva.json, legales-vivos.json).
- `python scripts/inventario-vivo.py` se pasa ANTES de montar (guarda el
  canonical tal como estaba). Orden completo tras un export nuevo:
  extraer.py → arbol.py → menus.py → inventario-vivo.py → montar →
  css-original.mjs → publicar-recursos.mjs → todo → todo:visual.
- Hojas: css-original/comunes (59, orden real del <head> de la portada
  cruda; corte en la 46 = orden.json) + css-original/paginas (171
  post-ID.css: páginas, entradas y plantillas del constructor). Las
  plantillas por tipo (cabeceras 10365/10594, entrada 8657, archivos,
  productos) NO están en comunes: el motor las engancha por tipo (Fase 2).
- LiteSpeed sigue activo en la web vieja: 838 de 842 páginas de
  referencia/ llevan CSS combinado e imágenes perezosas (data-src). Solo la
  portada y 3 productos llegaron crudos. Las post-ID.css se bajaron sueltas.

## Estado (se actualiza al cerrar cada fase)
- Fase actual: 1 — cerrada el 5-10-2026 salvo lo pendiente de abajo.
  Siguiente: Fase 2 (comparador de marcado antes que el motor; B1.3
  contenedores y K5/K6 plantillas del constructor son lo primero).
- Hecho Fase 0 (5-10-2026, commit 83b72f8): entorno, proyecto montado (B0),
  inventario (informes/inventario.md), regla del H1 y decisiones aprobadas.
- Hecho Fase 1 (5-10-2026, commit ec93a15 y siguientes): referencia completa
  (842 páginas, 5 idiomas, 0 errores de descarga, 0 direcciones absolutas),
  hojas y post-ID.css, letras e iconos desde npm con versión exacta,
  legales de la web viva, estructura-viva.json, primeros pasos de `todo`
  (fuentes, css y build en verde; validar para en las legales y en 1 H1 de
  plantilla: cosas del motor, Fase 2), barrido de 404, compilado desde un
  clon limpio con la orden de Netlify (165 páginas).
- Fallos del kit arreglados: K1 (dominio), K2 (4 tipos en extraer/arbol),
  B1.12 (regla del H1), B1.13 (corte desde orden.json), B1.14 (versiones
  exactas; legales con mínimo y sin sobrescribir), B1.1/5/6 (sustituidos por
  montar-referencia.mjs, que sale con 1 y comprueba las hojas), B1.9 parcial
  (validar respeta fallos-original.json). Pendientes: B1.2, 3, 7, 8, 9
  (resto), 10, 11 (marcado/geometría/contraste), 15; K3-K6, K10, K11.
- Fallos del original aprobados: src/data/fallos-original.json (4 ficheros
  que faltan también en el servidor viejo, 2 páginas sin H1).
- Aviso: la entrada 17636 (/donde-tomar-algo-en-valencia-.../) tiene árbol
  de Elementor (6 bloques) y el servidor no tiene su post-17636.css (404
  también tras visitarla). Se mira en la Fase 2 si sus bloques necesitan CSS.
- Pendiente del propietario: crear el sitio en Netlify (o darme acceso) y
  conectarlo al repositorio; el primer despliegue lleva `noindex`
  (netlify.toml). Datos de la sección 1 del prompt (DNS, Search Console,
  AdSense, GA4, titular, formularios). Si desactiva LiteSpeed un rato, se
  repite la descarga de las 842 páginas (bajar.sh + montar).
