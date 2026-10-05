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

## Estado (se actualiza al cerrar cada fase)
- Fase actual: 0 — falta: que el propietario confirme el inventario, la
  regla del H1 y las 7 decisiones de informes/inventario.md §15.
- Hecho (5-10-2026): entorno comprobado; proyecto montado en la raíz desde
  kit/copia-fiel y kit/scripts (B0); `extraer.py` y `menus.py` pasados
  (13 páginas, 5 menús); `arbol.py` pasado pero da 0 bloques por el dominio
  fijo (K1); 178 páginas en castellano bajadas a referencia/ y las 668
  traducidas en curso (log en informes/descarga-*.log); `estructura-viva.json`
  escrito; inventario en informes/inventario.md.
- Fallos del kit arreglados: ninguno (no se toca el kit hasta confirmar).
  Lista completa: B1.1-15 del prompt + K1-K11 del inventario §14.
- Pendiente del propietario: todo lo del inventario §15.
- Todavía sin `npm install`: no hace falta hasta la Fase 1.
