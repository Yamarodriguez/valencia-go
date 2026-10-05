# Prompt para migrar una web de WordPress a Astro (versión 5)

Sale de dos migraciones con OceanWP + Elementor:

| Web | Páginas | Qué aportó |
|---|---|---|
| **casascontenedores.es** (sep. 2026) | 263 | SEO, formularios, velocidad, cómo cambiar el DNS sin perder el correo (allí se perdió), auditoría, ahorro de tokens |
| **renders.studio** (versión 4) | 145 | Copia exacta comprobada pieza a pieza, referencia completa, contraste bien medido, método de rediseño |

Cada regla de aquí costó al menos una ronda de prueba y error en una de las
dos.

---

## PARA TI, YAMA: cómo se usa

1. **Crea una carpeta vacía** para la web nueva (por ejemplo
   `Escritorio\midominio`).
2. **Descomprime `kit-migracion-v5.zip` y copia su CONTENIDO a esa carpeta**:
   este fichero, la carpeta `kit` y la carpeta `analisis`. Ojo: al
   descomprimir, Windows crea una subcarpeta `kit-migracion-v5`. Lo que va en
   tu carpeta es lo que hay **dentro** de esa subcarpeta, no la subcarpeta.
3. **Añade** el export XML de WordPress y, si lo tienes, el de Search Console.
4. **Abre Claude Code en esa carpeta** y pega el mensaje de abajo, rellenando
   lo que va entre corchetes.

Antes, ten a mano lo de la sección 1 ("Lo que tienes que tener tú"). Cada
dato que falte a mitad de trabajo es una ronda perdida.

### El mensaje para la primera sesión

```
Quiero migrar [DOMINIO] (WordPress con [Elementor / Divi / otro], en vivo en
https://[DOMINIO]) a Astro en Netlify, conservando todas las URL y el
posicionamiento. Soy el propietario y no soy técnico: háblame en castellano
de España, de tú y sin jerga, y hazlo tú.

En esta carpeta tienes:
- PROMPT-MIGRACION-V5.md: el método. Léelo entero antes de nada.
- kit/: las herramientas de las migraciones anteriores. Reutilízalas.
- analisis/: los análisis de las migraciones anteriores. Consúltalos solo
  cuando el prompt te mande a ellos.
- [nombre].xml: el export de WordPress.
- [opcional] el export de Search Console (Rendimiento → Páginas).

Datos: AdSense [ca-pub-…], Analytics [G-…], WhatsApp [nº], correo [@],
titular [nombre, NIF, dirección]. Dominio registrado en [OVH / otro].
Formularios con [Web3Forms / otro]. Repositorio de GitHub: [URL / "créalo
tú"]. Netlify: [nombre del sitio / "todavía no hay"]. Precios y plazos
reales: [pégalos aquí o pon "te los paso en la fase 4"].

Decisiones: las de la sección 0 del prompt, salvo: [nada / lo que cambies].

Empieza por la FASE 0. No toques el motor ni arregles el kit hasta que te
confirme el inventario.
```

### El mensaje para las sesiones siguientes

Una sesión por fase. Para empezar cada fase basta con esto (no vuelvas a pegar
el mensaje largo):

```
Lee CLAUDE.md y empieza la Fase [N].
```

---

# 0. DECISIONES (con su opción por defecto)

Si no dices otra cosa en el mensaje, se aplica la opción **por defecto**.

| Decisión | Qué significa para ti | Por defecto | Alternativa |
|---|---|---|---|
| **Dec. 1** — Dónde trabaja Claude | Si Claude puede trabajar solo en tu ordenador | **Claude Code**: ejecuta, compila, comprueba y sube | Sin terminal: tú ejecutas ficheros de doble clic (**Anexo 1**) |
| **Dec. 2** — Quién sube a `main` | Quién publica los cambios | **Claude**, cuando las comprobaciones salen bien | Tú: Claude te deja el cambio preparado y te dice qué hacer |
| **Dec. 3** — Copia fiel | Cómo se copia la web vieja | **Exacta y comprobada pieza a pieza**. Es lo que demuestra que no se pierde nada | Directo a un diseño propio: más rápido, pero no se puede demostrar |
| **Dec. 4** — Rediseño | Cómo se decide el diseño nuevo | **Te enseña 2 o 3 opciones en imagen, se prueba en una página y se puede apagar** | Aplicarlo a todas las páginas de golpe (en renders.studio hubo que deshacerlo) |
| **Dec. 5** — DNS | Dónde se cambia la dirección del dominio | **En tu registrador (OVH u otro)**: el correo ni se toca | Pasarlo a Netlify, copiando antes todo lo del correo |
| **Dec. 6** — Ancho | Cómo se ve la web en pantallas grandes | **Igual que la vieja** (si estaba en una caja centrada, igual) | A todo lo ancho |
| **Dec. 7** — Texto que no se lee | Cómo se arreglan textos con poco contraste | **A mano y con tu permiso**, a partir de una lista | Corrección automática (ver la comprobación C3) |

---

# 1. LO QUE TIENES QUE TENER TÚ (antes de la primera sesión)

## Ficheros
- [ ] **Export XML de WordPress**: Herramientas → Exportar → Todo el contenido.
      Si hay varios, déjalos todos; Claude usa el que traiga la maquetación y
      te dice qué trae cada uno.
- [ ] **Captura o copia de la zona DNS completa**, tal como está hoy: MX, SPF,
      DKIM (`_domainkey`), SRV, `autoconfig`, `autodiscover` y TXT. **Es lo más
      importante de la lista**: sin ella, casascontenedores.es se quedó sin
      correo.
- [ ] **Export de Search Console**: Rendimiento → Páginas, últimos 12 meses.
      Dice qué páginas traen el tráfico de verdad.

## Accesos (que funcionen, no solo que existan)
- [ ] Registrador del dominio (zona DNS), hosting viejo, GitHub, Netlify,
      Search Console, Analytics, AdSense y el servicio de formularios. Este
      último tiene que enviar **a un correo que funcione**.
- [ ] **El hosting viejo no se cancela hasta un mes después del cambio.**

## Datos que solo sabes tú (Claude no puede inventarlos)
- [ ] Precios reales: por m², por modelo o por servicio, con o sin IVA.
- [ ] Plazos reales.
- [ ] Servicios y zonas que cubres de verdad.
- [ ] Teléfono, WhatsApp, correo y horario.
- [ ] Datos legales del titular (nombre o razón social, NIF y dirección).
- [ ] Identificadores de AdSense, Analytics y Search Console.
- [ ] Testimonios u obras reales que se puedan publicar.

---

# A. CÓMO TRABAJAMOS

## A1. Comprobar el entorno (lo primero de la Fase 0)

Claude comprueba y lo apunta en `informes/inventario.md`:
- que este fichero, `kit/` y `analisis/` están **en la raíz** de la carpeta y
  no dentro de una subcarpeta creada al descomprimir;
- **Node 22.12 o más** (`node --version`). Lo exige Astro 7, y Netlify compila
  con `NODE_VERSION = "22"`;
- **Python 3 con `beautifulsoup4` y `lxml`**: `python -c "import bs4, lxml"`.
  En Windows la orden es `python`, no `python3`. Hacen falta para `extraer.py`,
  `arbol.py` y `menus.py`;
- `git`, y `gh` con la sesión iniciada si Claude va a crear el repositorio;
- un navegador para Playwright: `channel: 'chrome'`, o
  `npx playwright install chromium`;
- **si llega al dominio**, con una petición de prueba.

Qué hacer según el resultado:
- Si **no puede ejecutar comandos**, se trabaja con el **Anexo 1**.
- Si **ejecuta pero no llega al dominio**, todo lo de la Fase 1 que baja cosas
  de la web vieja lo lanza el propietario con ficheros `.cmd` (Anexo 1). El
  resto lo hace Claude.

## A2. El propietario y cómo se le habla

- No es técnico. Castellano de España, **de tú**, sin jerga y sin listas de
  comandos que tenga que interpretar. El trabajo lo hace Claude: edita,
  compila, comprueba y le cuenta qué ha cambiado.
- **Arreglado no es publicado.** Cada informe termina diciendo en qué estado
  está el cambio:
  - solo en local;
  - con commit sin subir;
  - en una rama;
  - en `main` y desplegado (comprobado pidiendo la URL).

  Para saber qué falta por subir: `git log origin/main..HEAD`.
- **Dile siempre dónde mirar.** El dominio solo cambia cuando se despliega
  `main`. En local, la versión compilada se ve con `npm run build` +
  `npm run preview`.

## A3. Las reglas de oro

1. **El contenido original no se toca**: ni un texto, ni un título, ni el nivel
   de un encabezado, ni un enlace, ni el orden.
   - La única excepción es **la regla del H1** que el propietario aprueba en la
     Fase 0.
   - Si el propietario pide corregir algo del contenido, se hace con una regla
     en un fichero de datos y un script que se pueda ejecutar dos veces sin
     estropear nada. Antes, una pasada en seco (`--seco`) con el recuento y 5
     ejemplos. Después, un commit propio con "(pedido por el propietario)".
2. **Lo nuevo se añade alrededor o al final**, desde **ficheros de datos**
   (`src/data/`) que el motor pinta al compilar.
3. **No se inventa ningún dato**: ni precios, ni plazos, ni normativa, ni
   testimonios. Lo que no está en la web se le pregunta al propietario.
   **Todo texto escrito por IA pasa una comprobación de hechos** antes de
   publicarse.
4. **Las URL y las rutas de las fotos no cambian nunca**, porque están en Google
   y en Google Imágenes. Además, la `<img src>` sigue apuntando a la foto
   original: la webp se sirve con
   `<picture><source type="image/webp">…<img src="ORIGINAL"></picture>`.
5. **Los fallos del original se enseñan y se decide.** No se copian en
   silencio ni se arreglan en silencio. Tampoco se sustituye una foto por otra
   "parecida" sin el visto bueno del propietario, apuntado.
6. **Antes de quitar algo "que no se ve"**, comprobar que nada dependa de su
   espacio. En casascontenedores había un margen negativo de −84 px que
   contaba con una franja invisible.
7. **Desde la Fase 2, nada se da por bueno sin `todo` y `todo:visual` a 0
   fallos** (sección C).
8. **Si una imagen de fondo no carga, no se sabe qué hay debajo del texto.** No
   se arregla nada: se apunta como fichero que falta y se avisa.

## A4. Gastar menos (tokens y rondas)

- **`CLAUDE.md` desde el primer día** (plantilla en G1). Claude Code lo lee
  solo en cada sesión. Se actualiza al cerrar cada fase.
- **Una sesión por fase.** Las conversaciones largas se resumen solas y pierden
  detalle.
- **Primero el análisis y luego los cambios**: "analízalo sin tocar nada" y,
  después, "haz el 1, el 3 y el 5". El propietario contesta todas las
  decisiones en un solo mensaje.
- **Los informes van a disco** (`informes/*.md`, fuera de Git). La consola
  enseña como mucho 30 líneas de resumen, y luego se busca en el informe con
  grep, sin volver a ejecutar nada.
- **No se listan carpetas enormes sin filtro** (`public/`, `dist/`,
  `node_modules/`, `referencia/`, `kit/`): se usan recuentos o patrones.
- **Las capturas las hace Claude**, de las dos webs y lado a lado. El
  propietario solo dice qué página y qué ve mal.
- **Reproducir antes de proponer**: se mide o se captura el fallo, se arregla y
  se comprueba que esa misma medida da 0.
- **Cambios masivos, primero en seco.** `aplicar-ampliacion.mjs`,
  `corregir-erratas.mjs` y `botones-descriptivos.mjs` traen `--seco`, y
  `descargar-fuentes.mjs` trae `--ensayo`.
- **Workflows solo para trabajos grandes**, como auditorías o cientos de
  páginas. Todo encargo a un agente lleva **"PROHIBIDO escribir ficheros"**: el
  agente devuelve datos y los cambios los aplica la sesión principal.
- **"Sigue igual" → mirar antes de suponer**, en este orden:
  1. `git status` y el diff;
  2. la fecha de `dist/`;
  3. el servidor de desarrollo con el CSS viejo (se reinicia);
  4. dev frente a build;
  5. la caché del navegador;
  6. el último despliegue.

  No se piden errores al propietario antes de haber mirado.
- **Windows:** el código con `\n`, `\s` o `\b` se escribe en ficheros con las
  herramientas de edición, **nunca** con `node -e` ni heredocs, porque la
  consola se come las barras invertidas.
- **Ficheros directamente en la carpeta, sin ZIP.**

## A5. Qué sube a Git y qué no

- El **`.gitignore` completo existe antes del primer `git add`** (plantilla
  en G2).
- **Nunca `git add .` ni `git add -A`**: siempre rutas concretas.
  `package.json` y `package-lock.json` van siempre en el mismo commit.
- **Sí sube:**
  - lo que Netlify necesita para compilar: `src/`, `public/` y
    `css-original/`;
  - `estructura-viva.json` y `legales-vivos.json`, que son la foto de la web
    vieja: después del cambio de DNS ya no se pueden volver a bajar, y
    `comparar` los necesita.

  Antes del primer push se avisa del peso de `public/`.
- **No sube:** `referencia/` (la copia de la web vieja de la Fase 1),
  `informes/`, `capturas*/`, `descargas/`, `dist/`, `node_modules/`, `kit/`,
  `analisis/`, los registros, los exports, ni lo que se genera al compilar
  (`public/css/`).
- Lo que no está en Git **lo genera la orden de compilación de Netlify**, por
  ejemplo `npm run css && npm run build`.
- **Antes de cada subida que añada ficheros de datos, se compila desde un clon
  limpio.** En renders.studio faltaba un fichero en Git y Netlify falló con
  `ENOENT` dos días después.

---

# B. EL KIT (lo que hay en `kit/`)

| Carpeta | Qué es | Cuándo se usa |
|---|---|---|
| `kit/scripts/` | Las herramientas de casascontenedores en su última versión | Siempre: descargas, comprobaciones y correcciones |
| `kit/extraer.py` | Pasa el XML a un JSON por página. **Va primero**, porque `arbol.py` rellena los JSON que ya existen pero no los crea. **Borra todos los JSON de `src/content/pages/` antes de escribir**: se lanza una sola vez, al principio | Fase 0 |
| `kit/copia-fiel/` | El proyecto en el commit `160944b`, antes del rediseño. Su motor **intenta** escribir el marcado de Elementor, pero no llega a 0: las columnas van sin `data-id` ni `data-e-type`, no hay `data-settings` ni `srcset`, todas las fotos llevan `lazy` y no pinta la altura de sección | Base de las Fases 0 a 2 |
| `kit/web-final/` | El proyecto terminado: motor con marcado propio, componentes, formulario AJAX, rejilla de servicios, galería, `netlify.toml` y `_redirects` | Ejemplo para las Fases 3 a 7 |

## B0. Cómo se monta el proyecto (Fase 0, antes del inventario)

Copiar no es escribir código. Se monta **en la raíz de la carpeta, nunca
dentro de `kit/`**: los scripts calculan sus rutas desde su propia carpeta, y
lanzados dentro de `kit/` escribirían en `kit/src/content/`.

1. De `kit/copia-fiel/` se copian a la raíz `src/`, `astro.config.mjs`,
   `package.json`, `package-lock.json` y `netlify.toml`. **Su `scripts/` no**,
   porque es más antiguo.
2. `kit/scripts/` → `scripts/`. Su `arbol.py` ya lee el fondo y el borde de cada
   widget, y no toca las comillas dentro de `<style>`.
3. `kit/extraer.py` → la raíz, porque escribe en `src/content/pages/` junto a
   sí mismo.
4. `src/data/` empieza con:
   - un `site.json` adaptado;
   - el `menus.json` que genera `menus.py`;
   - un `erratas.json` vacío, `{"palabras": {}, "frases": []}`. `erratas.mjs`
     lo lee siempre, y sin él `comparar-encabezados.mjs` se para.
5. `scripts/extra-imagenes.txt` se vacía. Trae 30 fotos de casascontenedores,
   y se rellena con las de la web nueva que WordPress guarda en la
   configuración del tema (el logo, por ejemplo).
6. `kit/` no se modifica: es la copia de consulta.

**No se copia ni se lee:**
- los datos de casascontenedores: `css-original/`, `estructura-viva.json`,
  `legales-vivos.json`, `muestra-viva/`, `Claude outputs/`, `*-fallidas.txt` y
  los `src/data/*.json`. Los de `kit/web-final/src/data/` solo sirven de
  ejemplo de formato;
- ojo con `estructura-viva.json`: `descargar-estructura.mjs` no vuelve a pedir
  las rutas que ya están en ese fichero, así que con el de casascontenedores
  no bajaría nada;
- documentos antiguos (`GUIA-*.md`, `PROMPT-*.md`, `LEEME*.md`, `.bat`). Son
  métodos anteriores y contradicen este.

## B1. Fallos conocidos del kit

**Se apuntan en la Fase 0. Cada uno se arregla, con el visto bueno del
propietario, antes de usar el script afectado.**

El detalle con fichero y línea está en `analisis/ANALISIS-PROMPT-V4.md`,
**líneas 261 a 295** (sección KIT PENDIENTE). **Solo se leen esas líneas.**
Allí las rutas son las del repositorio de casascontenedores:
- `scripts/` y `extraer.py` son `kit/scripts/` y `kit/extraer.py`;
- `src/` es `kit/web-final/src/`, salvo lo marcado como "fiel" (`render.js`
  fiel, `Base.astro`, `[...slug].astro`), que está en `kit/copia-fiel/src/`.

1. **Los descargadores terminan con código 0 aunque fallen descargas.** Tienen
   que salir con 1.
2. **`arbol.py` se calla lo que no conoce y tiene que contarlo y fallar:**
   - descarta los widgets desconocidos, entre ellos los de icono (`icon`,
     `icon-box`, `icon-list` y `social-icons`) y `hover_animation`;
   - manda los menús desconocidos al menú por defecto;
   - deja pasar los shortcodes como texto. Así se publicó
     `[modula id=«2806»]`.
3. **`arbol.py` no lee la altura de sección** (`height`, `custom_height`,
   `column_position`) **y aplana los contenedores `e-con`**. En
   casascontenedores, 105 secciones de pantalla completa salían con la altura
   por defecto.
4. **Faltan herramientas por escribir:**

   | Herramienta | Dónde se describe | Cuándo se escribe |
   |---|---|---|
   | Montador de la referencia | Fase 1 | Fase 1 |
   | Barrido de 404 | C5 | Fase 1 |
   | `scripts/todo.mjs` y `todo:visual` | sección C | Fase 1, y se completan en la Fase 2 |
   | Comparador de marcado | C2 | Fase 2, antes que el motor |
   | Contraste | C3 | Fase 2 |
   | Capturas lado a lado (vieja y nueva, por tipo y a 1400 y 390 px) | Fase 2 | Fase 2 |

5. **`descargar-css.mjs` da por buena cualquier respuesta 200**, incluido el
   error de 196 bytes de un `post-{ID}.css` que todavía no existe.
6. **`descargar-imagenes.mjs` no coge `uploads/elementor/thumbs/`.**
7. **`comparar-visual.mjs` está a medias:**
   - no compara la posición vertical;
   - usa una lista fija de 6 páginas;
   - no devuelve código de error.

   Además, tres de los scripts de capturas no arrancan sin el Chromium de
   Playwright: hay que usar `channel: 'chrome'`.
8. **`comparar-encabezados.mjs`** solo comprueba el nivel (h2/h3) cuando las
   dos listas miden lo mismo.
9. **`validar.mjs`** no comprueba nada de esto:
   - que no quede un shortcode literal;
   - que existan los fondos del árbol;
   - el canonical exacto;
   - que la hoja del rediseño sea la última.

   Además, recorta la salida.
10. **`imagenes.js`** cambia el `src` por la webp y tiene una lista de fotos
    "equivalentes" que sustituye unas por otras.
11. **`npm run todo`** encadena con `&&` fuentes, hojas (`css.mjs`), medidas de
    imagen, build, validar y comparar encabezados. No dice en qué paso se para,
    y le faltan marcado, geometría, contraste y 404.
12. **El kit trae ya tomada la decisión del H1 de casascontenedores:**
    - `asegurarH1` (en el `render.js` fiel) baja los h1 a h2 y sube el primer
      encabezado;
    - `arbol.py` quita la banda de título (`banda = False`);
    - `extraer.py` sube el primer encabezado si no hay `estructura-viva.json`;
    - los comparadores aceptan ese cambio sin contarlo.

    Se desactiva hasta que el propietario apruebe su regla.
13. **Números de casascontenedores metidos en el código:**
    - `css.mjs` corta las hojas comunes en la 17 (`CORTE = 17`);
    - `fuentes-locales.mjs` escribe `css-original/comunes/19-tipografias.css`.

    Se sacan del orden real del `<head>` de la web nueva.
14. **`descargar-legales.mjs` y `legales.mjs` no fallan si una legal sale
    vacía**, y `package.json` lleva versiones con `^`. Las versiones se fijan
    exactas.
15. **Lo que hay que corregir antes de copiar algo de `kit/web-final/`:**
    - su `diseno.css` da color y tamaño a todos los `h1`–`h6` y `<a>`, cuando
      cada regla debería ir acotada a un contenedor;
    - su `_redirects` manda todos los `?p=` a la portada;
    - su motor reconoce "patrones" y pinta a su manera, por ejemplo como
      tarjetas, bloques que no lo son (error de la tabla E).

---

# C. LAS COMPROBACIONES

| Orden | Qué hace | Necesita navegador |
|---|---|---|
| `npm run todo` | Genera (fuentes, `css.mjs`, medidas de imagen), compila, valida, compara encabezados y compara marcado | No |
| `npm run todo:visual` | Geometría, contraste y barrido de 404 | Sí |

- `todo` lo lanza `scripts/todo.mjs`, que anuncia `[n/N]` y, si algo falla,
  dice **"SE HA PARADO EN: <paso>"**.
- Todavía no existen (B1.4). Se crean en la Fase 1, con el validador y el
  barrido, y se completan en la Fase 2.
- **Desde la Fase 2, no se sube nada sin 0 fallos en las dos.** Al cerrar la
  Fase 2 se pone un hook `pre-push` que lo impone. Netlify solo compila.
- **Cada fallo que el propietario ve a ojo entra ese mismo día como FALLO.**
- Cada comprobación escribe su informe en `informes/` y **sale con un código
  distinto de 0** si falla.

**Excepciones.** `src/data/fallos-original.json` (sí sube a Git) lista los
fallos del original **con el visto bueno del propietario**, por ejemplo:
- un 404 que da también el servidor viejo;
- un contraste malo de la web viva;
- una diferencia de geometría inevitable, con su motivo.

Lo que está en esa lista sale como AVISO, con su número de páginas. **Todo lo
demás es FALLO.**

## C1. Encabezados
- Compara la secuencia de H1/H2/H3 de cada página con la de la web en vivo
  (`estructura-viva.json`), en orden. Avanza con un puntero y no con `indexOf`,
  porque hay títulos repetidos.
- Compara también el **nivel de cada pareja**.
- Las excepciones van en datos (`encabezados.json`, `orden-tipos.json`,
  `erratas.json`) más la regla del H1 aprobada.
- Objetivo: el 100 % idénticas.

## C2. Marcado (el comparador, escrito antes que el motor)
- Recorre los elementos con `data-id` del HTML real y los compara con los de
  la web generada: etiqueta, **clases como conjunto**, `data-*` como objeto y
  el contenido de cada widget.
- En los iconos SVG compara **el atributo `d` de cada `<path>`**. Un icono de
  otra versión de Font Awesome carga bien, y ninguna otra comprobación lo ve.
- **El mismo lector de HTML para los dos lados.**
- Salta los `data-id` que cuelgan de otro widget, porque hay marcado pegado a
  mano dentro de un texto.
- Normaliza lo que cambia en cada visita: el id de Content Views y
  `data-rsssl`.
- Agrupa por tipo (qué falta y qué sobra) y cuenta el **armazón** y el
  **contenido** por separado.
- Si se pasa a marcado propio (Fase 3, paso 8), sale de `todo`.

## C3. Contraste (texto que no se lee)
- **Qué hay debajo del texto:** se apilan y se componen todas las capas, con su
  transparencia:
  - el elemento y sus padres;
  - `::before` y `::after` (el contenedor `.e-con` pinta su fondo en
    `::before`);
  - **el `elementor-background-overlay`, que es HERMANO, no padre.** Sin él,
    en renders.studio salieron 87 avisos falsos de 98.
- **Fondo liso:** el mismo color del texto, más oscuro o más claro.
- **Foto con letra clara:** el texto no se toca nunca. Se refuerza el velo con
  un degradado suave.
- **Fondo desconocido porque la foto no cargó:** no se toca nada (A3.8). Se
  cruza con el barrido de 404.
- **Cómo se mide:**
  - con la hoja de correcciones desactivada, porque si no siempre da 0;
  - toda regla generada lleva el identificador del constructor.

## C4. Geometría
- Con Playwright, en la referencia y en la nueva, se mide cada texto, enlace e
  imagen:
  - x, y, ancho y alto;
  - si se ve (visibilidad y opacidad);
  - tamaño, grosor, color, tipografía y alineación de la letra.
- **Se mide a 1400 y a 390 px** en la misma pasada, para cada tipo de diseño.
  También lista lo que sobra en la nueva.
- Objetivo: 0 diferencias. Las inevitables van a la lista de excepciones.
- **Contra qué se mide:**
  - hasta la Fase 2, contra la referencia;
  - desde la Fase 3, con el interruptor del rediseño apagado y sin lo añadido
    en la Fase 4, contra la referencia, y tiene que seguir en 0;
  - con el interruptor encendido o con lo añadido, contra la última medida que
    aprobó el propietario, guardada en `informes/`.

## C5. Barrido de 404
- Recorre cada tipo de página entera, para que carguen las imágenes
  perezosas.
- Lista los 400 y 404 separando fotos, tipografías y otros.
- Las peticiones bloqueadas a propósito cuentan como fallo, salvo las de una
  lista blanca.
- Tiene que quedar en 0, salvo las excepciones.

## C6. El validador
- Etiquetas equilibradas.
- **Un solo H1, después de aplicar la regla aprobada.**
- Ningún bloque generado dentro de otro.
- Texto visible idéntico, salvo lo añadido.
- Ningún enlace perdido.
- Existe el fichero de cada imagen, **también las del CSS y los fondos del
  árbol**.
- **FALLO si queda un shortcode literal** (`[nombre …]`).
- El canonical es exactamente `https://DOMINIO/ruta/`, con barra final. El
  canonical y las etiquetas sociales van en absoluto; el cuerpo, en relativo.
- `astro.config.mjs` lleva `trailingSlash: 'always'` y
  `build.format: 'directory'`.
- Con el interruptor encendido, la hoja del rediseño es **la última** del
  `<head>`, también detrás del CSS de Astro (`/_astro/`).

(Las cinco últimas casillas no están todavía en `validar.mjs`: B1.9.)

---

# D. EL PASO A PASO

Son 9 fases, en orden, y **no se pasa a la siguiente sin cerrar la anterior.**
Al cerrar cada fase:
1. se cumple su **Cierre**; desde la Fase 2, además, `todo` y `todo:visual`
   terminan con 0 fallos;
2. se hace commit;
3. se actualiza `CLAUDE.md`;
4. se sube si la Dec. 2 lo permite;
5. se dice en qué estado queda el cambio (A2).

Como orientación, el calendario real de casascontenedores:

| Días | Qué se hizo |
|---|---|
| 1–2 | Extracción, copia fiel y rediseño |
| 3–4 | Menú, páginas nuevas, SEO de 173 páginas y formularios |
| 5 | DNS, galería, auditoría, correcciones y velocidad |

---

## FASE 0 — Reconocimiento

*"Sin escribir código" quiere decir sin tocar el motor, las plantillas ni el
kit.* Lo que sí se hace:
- montar el proyecto (B0);
- pasar `extraer.py`, `arbol.py` y `menus.py`;
- bajar el HTML de todas las páginas a `referencia/` (Fase 1, paso 2, a su
  ritmo lento);
- hacer recuentos.

Todo eso es solo lectura de la web vieja, y su salida va a `informes/`.

1. **Comprobar el entorno** (A1) y crear `CLAUDE.md` (G1).
2. **Montar el proyecto** (B0). Si hay varios XML, se usa el que trae las
   páginas con `_elementor_data`, y se dice qué trae cada uno.
3. **Apuntar los fallos del kit** (B1), diciendo en qué fase hace falta
   arreglar cada uno.
4. **Inventario**, en `informes/inventario.md` y resumido en el chat:
   - **el constructor y de qué campo sale la maquetación.** En Elementor es
     `_elementor_data`, **nunca** `content:encoded`;
   - **cuántas páginas y cuántos tipos de DISEÑO** (no de URL). Se agrupan por
     la huella de su árbol y su menú, en **un solo fichero** que leen todos los
     scripts;
   - **cuántas cabeceras distintas y qué ajuste las elige**
     (`ocean_header_custom_menu`). En renders.studio eran 5, y 82 páginas
     usaban una que no estaba en la muestra;
   - **widgets por tipo**, marcando los que el motor no sabe pintar;
   - **`section`/`column` o `container` (`e-con`)**. En renders.studio, 141 de
     145 páginas llevaban los dos. Si sale algún `container`, el kit necesita
     trabajo (B1.3);
   - **los iconos**: SVG dentro del HTML (`<svg class="e-font-icon-svg">`, en
     renders.studio con trazados de Font Awesome 5.15.4) o tipografía
     (`<i class="fa…">`, con la versión de la cabecera de su CSS). Pueden
     estar los dos;
   - **qué depende del JavaScript**: `elementor-invisible` (sin el JS, esos
     bloques no se ven), `_animation`, `stretch_section`, `sticky`…;
   - **las hojas de estilo**: la lista del `<head>` de todas las páginas, con
     `<link>` y `<style>`, agrupada por secuencia. Y las tipografías e iconos
     con su versión, y si están en npm;
   - **los plugins** (rutas `/wp-content/plugins/NOMBRE` del HTML) y **los
     shortcodes**, entre corchetes, con id o sin él, con su número de páginas.
     Galerías, formularios, mapas, rejillas y legales no vienen en el export;
   - **los H1**: las páginas con 0 y con 2 o más. El propietario aprueba **una
     sola regla** con la lista delante. Se apunta en `CLAUDE.md` y se aplica ya
     en la copia fiel (B1.12);
   - **enlaces rotos del original**: `#`, `#https://…` y vacíos;
   - **las páginas que traen tráfico**, según Search Console;
   - **los ID de WordPress** (`?p=`, `?page_id=`) con la página de cada uno.

**Cierre:** el propietario confirma el inventario y la regla del H1.

---

## FASE 1 — Bajar todo y montar la referencia

**Todo se baja ahora, mientras la web vieja sigue en el dominio.** Las
**páginas HTML** se piden despacio, con 2 hilos, 400 ms entre peticiones y
reintentos, y se descarta la página de menos de 5.000 caracteres: WordPress
devuelve errores 500 si se le pide deprisa. Ese límite no vale para las hojas
ni para las fotos: hay hojas buenas de 214 bytes.

1. **Arreglar los fallos del kit** que afectan a esta fase (B1.1, 2, 5, 6, 13
   y 14), con el visto bueno del propietario.
2. **El HTML de TODAS las páginas** a `referencia/`, si no quedó completo en la
   Fase 0, y `estructura-viva.json` con sus encabezados. Con muestras de 7 y
   de 13 páginas, las dos migraciones tuvieron rondas de "me falta una página
   con…".
3. **Las hojas de estilo**, incluida la `post-{ID}.css` de cada página.
   - Esa hoja no existe hasta que alguien visita la página. Si llega un error
     de unos 196 bytes o sin `{`, se visita la página y se vuelve a bajar.
   - Al cerrar, una página con árbol y sin hoja es un fallo.
4. **Reescribir las direcciones absolutas al dominio viejo**, en el HTML y en
   las hojas: `https://dominio`, `//dominio` y `https:\/\/dominio`. Lo hace un
   script, que falla si queda alguna.
5. **Las imágenes:**
   - las del contenido (`src` y `srcset`);
   - las de los `url(...)` de las hojas ya descargadas;
   - las de `uploads/elementor/thumbs/`;
   - las de los plugins (galerías, sliders), **con permiso del propietario**,
     diciéndole cuántas son y cuánto ocupan.

   Con sus rutas y nombres originales, y con la variante que usaba el
   constructor (Elementor usa `large`).
6. **El JavaScript** del tema y de Elementor, si el inventario dice que hace
   falta.
7. **Las tipografías y los iconos desde npm**, con versión exacta, sin `^`.
   - Solo `latin` y `latin-ext`, con `unicode-range`.
   - Lo que no esté en npm se baja con `descargar-fuentes.mjs`.
   - Si hacen falta dos versiones de Font Awesome, se añade un alias:
     `"fa5": "npm:@fortawesome/fontawesome-free@5.15.4"`.
8. **Las legales, desde la web en vivo**, porque el export las trae vacías o
   con el texto por defecto. Nunca se sobrescribe un texto bueno con uno
   vacío, y el script falla si alguna tiene menos de N caracteres.
9. **Servir la referencia en local** (puerto 8090) y escribir el barrido de 404
   (C5).
   - **Tiene que dar 0.** Una referencia que no carga sus fondos ni sus letras
     da aprobados falsos: la comparación sale a 0 porque los dos lados están
     igual de rotos.
   - Lo que da 404 **también en el servidor viejo** va a
     `src/data/fallos-original.json` y se le enseña al propietario.
10. **Primeros pasos de `scripts/todo.mjs`**: generar, compilar, validar y
    comparar encabezados.
11. **El repositorio y Netlify:**
    - si el propietario no los ha creado, Claude crea el repositorio con `gh`
      (si tiene sesión), o le pide que lo cree y le pase la dirección;
    - el `.gitignore` completo y el primer commit;
    - **el primer despliegue con `X-Robots-Tag: noindex`** (G3), compilando
      antes desde un clon limpio.

    Es la única subida sin `todo:visual`: se le dice así al propietario.

**Cierre:** la referencia da 0 errores 404, salvo los del servidor viejo que ya
están en la lista. El validador da 0 ficheros que falten, también los del CSS.

---

## FASE 2 — Copia fiel (exacta y comprobada)

Se trabaja sobre el proyecto montado en B0.

1. **Primero el comparador de marcado** (C2), y solo después se toca el motor.
   En renders.studio guió el armazón de 1.801 diferencias a 0, y el contenido
   de 162 a 0.
2. **El armazón** (cabecera, menú, pie y envoltorio del contenido) se saca del
   HTML real de cada tipo de cabecera, no se escribe de memoria.
3. **Lo que pinta un plugin se captura del HTML vivo:**
   - galería;
   - Contact Form 7, **uno por página**, porque lleva el número de la página;
   - mapa;
   - rejillas tipo Content Views, con su hoja suelta.
4. **El JavaScript en la web nueva.** Si el inventario encontró
   `elementor-invisible`, `_animation`, `sticky` u otro efecto que depende del
   JavaScript, la web nueva carga el mismo JavaScript que la referencia o
   reproduce su efecto sin él. `kit/copia-fiel/` no carga ninguno. Por eso la
   geometría mira también si cada elemento se ve.
5. **Los iconos:**
   - los de los widgets (SVG) se copian del árbol o del HTML vivo, con los
     trazados de su versión;
   - los `<i class="fa…">` del tema son tipografía de npm.
6. **El motor se lleva a 0 diferencias** con el comparador. Antes, se arreglan
   B1.2, B1.3 y B1.12. Las reglas técnicas están en el **Anexo 2**.
7. **El CSS se copia, no se escribe:**
   - la hoja de la página va **en medio** de las comunes, en el sitio exacto de
     su grupo;
   - el CSS propio solo lleva lo que no existe en el original. Nunca color,
     tamaño ni tipografía del contenido;
   - **si Claude se encuentra midiendo un margen a ojo, para y dice qué hoja
     falta.**
8. **Lo que WordPress cambia al publicar:**
   - en el texto visible: comillas a `«así»` y `...` a `…`;
   - en los atributos: lo del Anexo 2.
9. **Fallos del original**, en `src/data/fallos-original.json`, enseñados al
   propietario con el número de páginas afectadas:
   - se separa lo que da 404 **en el servidor viejo** de lo que no se llegó a
     descargar;
   - el contraste malo del original **se reproduce y se apunta**; se decide en
     la Fase 3;
   - ejemplos reales: botones a `#`, un título con otra ciudad (plantillas
     copiadas), avisos de "próximamente" o "en obras", enlaces naranja sobre
     naranja.
10. **Las comprobaciones que faltan** (C3, C4, capturas lado a lado), y
    `todo.mjs` y `todo:visual` completos.

**Cierre:**
- `todo` y `todo:visual` dan 0 fallos;
- capturas lado a lado, en escritorio y en móvil, de cada tipo de diseño;
- hook `pre-push` puesto;
- **el propietario dice que está bien.**

---

## FASE 3 — Rediseño (Dec. 4)

1. **El diseño es un gusto, no una comprobación.** Primero se enseñan **dos o
   tres opciones en imagen**: la misma página tratada de varias maneras.
   - Las cuestiones de gusto van como opciones, no como regla: el velo sobre
     la foto (mínimo o fuerte) y la cabecera (clara con un filete fino o barra
     oscura).
   - El ancho ya está decidido (Dec. 6).
2. **Se prueba en una sola página** hasta que el propietario diga que sí.
   Después, en el resto.
3. **Todo va detrás de un interruptor:**
   - una hoja propia en `public/rediseno/` (no en `public/css/`, que no sube a
     Git);
   - enganchada con **una línea**: un `<link>` condicionado por
     `site.rediseno`, una clave nueva de `site.json`;
   - es la **última hoja** de la página (C6);
   - no se tocan el motor ni el HTML hasta que esté aprobado;
   - para enseñarlo antes, una rama de Git con su vista previa en Netlify.
4. **Trucos que funcionaron:**
   - redefinir `--e-global-color-*` y `--e-global-typography-*` con
     `body.elementor-kit-{ID}`: cambia media web sin `!important`;
   - **acotar cada regla de color a un contenedor** (el ID de Elementor o la
     clase del bloque). Una regla suelta sobre `span.text-wrap` dejó un menú
     blanco sobre blanco;
   - si se cambia `font-family` con `!important`, excluir `<i>` y las clases
     `fa-`, `eicon-` e `icon-`. Si no, los iconos salen como cuadrados vacíos;
   - sobre una foto manda el peso de la letra: 600, con sombra suave o velo
     en degradado. Nunca una letra fina de 300. Si hay que oscurecer, el velo
     mínimo;
   - en el tema, `1rem` son 10 px (`html { font-size: 62.5% }`): se escribe en
     px.
5. **El contraste malo del original:** se le enseña la lista al propietario y
   se arregla lo que él diga (Dec. 7), con las reglas de C3.
6. **La foto principal:**
   - no se estira si es pequeña;
   - nada de rótulos incrustados ni marcas de agua ajenas;
   - en webp a varios tamaños (`srcset`), con `preload` e `imagesrcset`.
7. **Antes y después, medido** (C4): un cambio "que no toca el diseño" se
   demuestra con 0 diferencias.
8. **Si no gusta:** se apaga el interruptor sin discutir, se dice el estado
   (A2) y la hoja se guarda. Los fallos del original siguen en su fichero.
9. **Opcional, más adelante:** pasar a marcado propio, como hizo
   casascontenedores (`kit/web-final/`), como tarea aparte y con 0
   diferencias frente al diseño aprobado.

**Cierre:** el propietario aprueba el diseño en todas las páginas.

---

## FASE 4 — Contenido nuevo y SEO

Todo sale de **ficheros de datos**. El motor lo añade al compilar y los JSON de
las páginas no se editan a mano. Las piezas que pintan esto están en
`kit/web-final/`:
- en `src/pages/[...slug].astro`, los pasos que añaden intro, servicios, FAQ y
  renombres;
- `src/utils/intro.js` y `tipos.js`;
- `src/components/ServiciosContenedores.astro`.

Hay que llevarlas al motor que se esté usando.

| Fichero | Qué hace |
|---|---|
| `ampliacion` dentro del JSON de cada página (su formato y cómo se vuelca, con `--seco`, en `scripts/aplicar-ampliacion.mjs`) | Secciones SEO y FAQ al final, con su JSON-LD |
| `encabezados.json` | Títulos que cambian a propósito. El comparador los acepta |
| `orden-tipos.json` | Orden de los tipos en menús y rejillas |
| `intro-ciudades.json`, `intro-libres.json` | Párrafos de entrada para cuadrar el texto con el formulario. **Sin enlaces** |
| `servicios.json` | Rejilla de servicios con foto en todas las páginas |
| `erratas.json` | Correcciones de texto, con palabras protegidas |

(Hay ejemplos de todos, menos de `ampliacion`, en
`kit/web-final/src/data/`.)

- [ ] **Una sola FAQ por página**, con su `FAQPage`.
- [ ] Los H2 y H3 nuevos nombran el tema de la página.
- [ ] **Ningún dato inventado, y los hechos comprobados.** En
      casascontenedores, 6 textos decían que sin cédula "no puedes
      empadronarte", y es falso.
- [ ] Páginas nuevas con `nueva-pagina.mjs`, enlazadas desde el menú, desde la
      rejilla y desde el texto. Ninguna huérfana.
- [ ] Enlaces a otras webs del propietario: se pregunta si deben ir a una
      página propia.
- [ ] Botones que dicen adónde llevan ("Ver precios"), no "Haz clic aquí", con
      dos variantes por destino (`botones-descriptivos.mjs`).
- [ ] **Correcciones de texto** (erratas, tuteo frente a "usted" o voseo):
  - solo con permiso, por la vía de A3.1 (`corregir-erratas.mjs --seco`);
  - con reglas que no se puedan aplicar dos veces. En casascontenedores, una
    regla que cambiaba "desea" por "deseas" volvió a aplicarse sobre la
    palabra ya corregida y dio "deseass" 206 veces;
  - conservando mayúsculas y minúsculas;
  - aplicadas también por el comparador a la web viva.

**Cierre:** `todo` y `todo:visual` a 0, y el propietario revisa una muestra.

---

## FASE 5 — Formularios y contacto

- [ ] Envío **sin salir de la página** (AJAX), con "Mensaje enviado" o el error
      en el mismo sitio. La redirección de Web3Forms lleva a una página en
      inglés. Ejemplo: `kit/web-final/src/scripts/formularios.js`.
- [ ] El aviso dice **de qué página viene** cada mensaje, y se registra un
      evento de conversión en Analytics.
- [ ] WhatsApp con un mensaje distinto según la familia de páginas.
- [ ] La prueba de envío real la hace el propietario, o Claude con su permiso
      expreso en ese momento.

**Cierre:** el propietario recibe un envío de prueba.

---

## FASE 6 — Velocidad (sin tocar el diseño)

- [ ] Fuera las tipografías que no se usan, y `unicode-range` en las demás.
      En casascontenedores fueron 113 KB menos por página.
- [ ] `width` y `height` en cada foto, con sus medidas reales, para que la
      página no salte al cargar.
- [ ] La webp con `<picture>`, manteniendo el `src` original (A3.4).
- [ ] Sin `loading="lazy"` en las primeras imágenes de cada página (el número
      se cuenta en la web viva), ni en una foto repetida que ya salió sin él.
- [ ] **Se mide sobre la web compilada, no sobre `npm run dev`**, que añade
      descargas propias y engaña.

**Cierre:** el antes y el después dan 0 diferencias (C4).

---

## FASE 7 — Mudanza al dominio (el día del cambio, en este orden)

1. [ ] Comprobar que **no queda nada por bajar** de la web vieja (Fase 1).
2. [ ] Tener delante **la zona DNS completa** (sección 1).
3. [ ] **En Netlify:** añadir el dominio, y que la orden de compilación genere
       todo lo que no está en Git.
4. [ ] **En el registrador** (Dec. 5, por defecto):
   - registro A de `@` a la IP de Netlify (`75.2.60.5`; compruébalo en su
     panel);
   - `www`: A a la misma IP, o CNAME a `sitio.netlify.app`;
   - **borrar los AAAA** del hosting viejo;
   - **no** poner un CNAME en el dominio raíz (OVH le añade el dominio detrás);
   - si vuelve la IP vieja, quitar el dominio de **Multisitio** en el hosting
     de OVH;
   - **no tocar MX, SPF, DKIM, SRV ni TXT.**
5. [ ] **Si se pasan los servidores DNS a Netlify:** antes, copiar en Netlify
       **todos** los registros del correo y los TXT.
6. [ ] **Comprobar preguntando a los servidores DNS del dominio**, no al
       ordenador. Con TTL corto se ve en minutos; si no se ve, es que no está
       guardado. En el PC del propietario: ventana de incógnito o
       `ipconfig /flushdns`.
7. [ ] Netlify → HTTPS → **Verify DNS configuration**.
8. [ ] **El mismo día:**
   - quitar el `noindex` de `netlify.toml`;
   - activar en `public/_redirects` la redirección de `*.netlify.app` al
     dominio.

   Esa redirección tiene que estar desactivada hasta ese día. Si no, mientras
   el dominio apunta al hosting viejo, manda las visitas de la web de pruebas
   a la web vieja.
9. [ ] **Correo:** un correo de prueba y un envío del formulario.
10. [ ] **Redirecciones:**
    - las URL de WordPress que desaparecen;
    - **cada `?p=ID` y `?page_id=ID` a su página**, no a la portada. Una línea
      por ID con la sintaxis de parámetros de Netlify
      (`/  p=123  /ruta-de-la-pagina/  301!`), y se comprueba pidiendo la URL
      vieja. La línea `/?p=*  /  301!` de `kit/web-final` se quita;
    - las páginas renombradas, con un 301 de verdad;
    - los enlaces internos apuntan directamente a la dirección final.
11. [ ] **Caché:** se guarda un año solo lo que existe, no los 404.
12. [ ] **Cookies:** el CMP certificado de AdSense, conectado a Analytics y
        AdSense **antes** de que pongan cookies (lo exige la AEPD).
13. [ ] **Search Console:**
    - enviar `sitemap-index.xml`;
    - comprobar que todas sus URL dan 200;
    - pedir la indexación de las páginas nuevas y de las más cambiadas;
    - vigilar las que traen tráfico.
14. [ ] **El hosting viejo, un mes más.**

**Cierre:** dominio y `www` por HTTPS con la web nueva, el correo llega y el
sitemap está enviado.

---

## FASE 8 — Auditoría (solo lee, con workflow)

Entrega una lista y el propietario dice qué se hace. Se busca:
- títulos o descripciones con otra ciudad;
- erratas repetidas;
- voseo o "usted" mezclados con el tuteo;
- botones a `#`;
- "Haz clic aquí";
- enlaces internos que pasan por una redirección;
- páginas huérfanas;
- **precios y plazos que se contradicen entre páginas** (se arreglan con los
  datos reales del propietario);
- avisos de "próximamente";
- FAQ del tipo de página equivocado;
- migas de pan y datos estructurados.

---

# E. ERRORES QUE YA NOS PASARON

| Qué pasó | Por qué | Regla |
|---|---|---|
| El diseño "se parecía" pero nunca era igual (casas) | Se maquetó desde `content:encoded` y con CSS escrito a ojo | Árbol del constructor y CSS copiado (Fase 2) |
| Letra blanca sobre blanco (casas) | El limpiador de CSS tiraba reglas con clases dentro de `:not()` | No adelgazar el CSS. Si se hace, no mirar dentro de `:not/:is/:where/:has` |
| 10 fotos de fondo usadas 1.295 veces, sin bajar (casas) | El descargador solo miraba el contenido | Descargar los `url()` del CSS. El validador lo exige |
| Iconos con otro dibujo (renders) | Se usó la Font Awesome del tema para iconos que eran SVG de otra versión | Fase 2, paso 5, y C2 |
| Titular blanco pasado a negro sobre un render (renders) | La foto de fondo no cargaba en la referencia | A3.8 |
| 87 avisos falsos de contraste de 98 (renders) | No se contaba el velo hermano | C3 |
| Menú blanco sobre blanco (renders) | Regla generada sin el ID del constructor | Reglas acotadas a un contenedor |
| Faltaba una cabecera en 82 páginas (renders) | La muestra no la incluía | Fase 0: contar cabeceras |
| Rondas de "me falta una página" (las dos) | Muestras de 7 y de 13 páginas | Bajar todas |
| La galería de Fotos sin sus 58 fotos, y `[modula id=«2806»]` publicado como texto (casas) | Plugin fuera del export | Plugins y shortcodes en la Fase 0, y FALLO en el validador |
| 105 secciones de pantalla completa con la altura por defecto (casas) | `arbol.py` no lee la altura | B1.3 |
| Bloques pintados como tarjetas sin serlo (casas) | El motor de marcado propio reconocía "patrones" | Probar con capturas cada bloque movido |
| `npm run datos` falló en el 4.º paso y nadie se enteró (renders) | Pasos encadenados sin decir cuál falla | `todo.mjs` con "SE HA PARADO EN" |
| El rediseño quitado siguió una hora en Netlify (renders) | El cambio no llegó a Git | A2 |
| Hubo que deshacer el rediseño entero (renders) | Se aplicó sin enseñar opciones | Fase 3 |
| "Sigo viendo la web vieja" tras el cambio de DNS (casas) | Cambios sin guardar en OVH, AAAA viejos y un CNAME en el dominio raíz | Fase 7, pasos 4 y 6 |
| Se quedó sin correo (casas) | Se pasaron los DNS a Netlify sin MX, SPF ni DKIM | Dec. 5 y la zona DNS a mano |
| El formulario llevaba a una página en inglés (casas) | La redirección de Web3Forms | Fase 5 |
| "deseass" 206 veces y "Disculpa" con mayúscula a mitad de frase (casas) | Reglas aplicadas dos veces y sin respetar mayúsculas | Fase 4 |
| El comparador falló tras corregir el tuteo (casas) | La corrección cambió una clave de `encabezados.json` | Correcciones en `erratas.json`, que el comparador aplica |
| Textos con datos falsos (casas) | IA sin comprobar hechos | A3.3 |
| Un agente cambió ficheros por su cuenta (casas) | El encargo no lo prohibía | "PROHIBIDO escribir ficheros" |
| Expresiones regulares rotas (casas) | Windows se come las barras invertidas | A4 |
| CSS viejo en el navegador de pruebas (casas) | El servidor de desarrollo lo guardaba | Reiniciarlo tras cambiar el CSS de un componente |
| La foto principal "se bajaba dos veces" (casas) | La barra de herramientas del modo de desarrollo | Medir sobre la compilada |
| La FAQ desapareció de una página (casas) | Un caso vacío que el motor no contemplaba | Probar los casos vacíos |
| Carpetas de pruebas metidas en Git (casas) | `git add .` y `git add -A` | A5 |
| Netlify falló con `ENOENT` (renders) | Faltaba un fichero de datos en Git | Clon limpio antes de subir |
| ZIPs que no llegaban a su sitio (casas) | Acababan en otra carpeta | Ficheros directamente en la carpeta |

---

# F. ANEXO 2 — Detalles técnicos de Elementor y WordPress

**Marcado**
- `_inline_size` llega unas veces como `{size: 67.28}` y otras como `67.28`.
- `elementor-col-N` sale de `_column_size`.
- El hueco entre columnas es **padding**, no `gap`.
- "Ancho completo" es una **clase**, `elementor-section-full_width`.
- `elementor-kit-{ID}` va en el `<body>`.
- La sección con velo lleva dentro un
  `<div class="elementor-background-overlay"></div>` vacío.
- **Altura de sección:**
  - altura normal: `elementor-section-height-default` sale **dos veces**;
  - con altura: la primera clase pasa a `elementor-section-height-full` o
    `elementor-section-height-min-height`, la segunda
    (`elementor-section-height-default`) se queda, y se añade
    `elementor-section-items-{posición}`. En casascontenedores:
    `elementor-section-height-full elementor-section-height-default elementor-section-items-middle`.

  Se comprueba en el HTML real.
- **Contenedor nuevo:** `e-con-full e-flex` a ancho completo y
  `e-flex e-con-boxed` en caja. Pinta su fondo en `::before`.
- Las clases salen en el orden en que se guardaron los ajustes. El comparador
  las trata como conjunto.
- `data-settings` lleva solo unas pocas claves: `background_background`,
  `_animation`, `_animation_delay`, `shape_divider_*` y `stretch_section`.
- No se quita el `<style>` de los bloques de texto: hay HTML escrito a mano
  cuyo aspecto vive en él.

**Iconos**
- Los de los widgets son SVG dentro del HTML (`<svg class="e-font-icon-svg">`).
  Se copian con los trazados del HTML vivo, nunca con la tipografía del tema:
  la dibuja distinto y ninguna comprobación falla, salvo C2.
- Los `<i class="fa…">` son tipografía, con la versión de la cabecera del CSS.

**Imágenes**
- Variante `large`.
- `srcset` con la variante usada, luego las demás de la **misma proporción** en
  su orden, y el original al final.
- Las primeras, sin `lazy`.
- La clase de animación al pasar el ratón va en la propia `<img>`.

**Lo que WordPress cambia al publicar**
- En el texto visible: comillas a `«»` y `‘’`, y `...` a `…` (wptexturize).
- En los atributos:
  - quita el `;` final de los `style` escritos a mano;
  - añade `decoding="async"`;
  - los enlaces sin protocolo y los `http://` internos salen en `https://`.

**Hojas de estilo**
- `post-{ID}.css` va en medio: detrás quedan de 5 a 7 hojas según la página.
- Un plugin puede añadir hojas solo en algunas páginas.
- El `<style>` del personalizador de OceanWP también cuenta.
- La versión exacta de letras e iconos sale de la cabecera del CSS o del
  `?ver=` del `<link>`.

---

# G. PLANTILLAS

## G1. `CLAUDE.md` (Claude lo crea en la Fase 0)

```markdown
# [DOMINIO] — migración de WordPress a Astro

## Quién manda
[NOMBRE], no técnico: castellano de España, de tú, sin jerga. Lo haces tú.
Cada informe dice el estado del cambio (local / commit / main desplegado).

## Decisiones (sección 0 del prompt)
Dec. 1 [..] · Dec. 2 [..] · Dec. 3 [..] · Dec. 4 [..] · Dec. 5 [..] ·
Dec. 6 [..] · Dec. 7 [..]
Regla del H1 aprobada: [..]

## Reglas
- Método: PROMPT-MIGRACION-V5.md. Antes de cada fase, lee esa fase y la
  sección E.
- Contenido original intocable salvo petición (regla + seco + commit propio).
- Nada inventado. Lo nuevo, desde src/data/.
- Desde la Fase 2: 0 fallos en `npm run todo` y `npm run todo:visual` antes
  de subir.
- Informes en informes/; no listar carpetas enormes.
- Windows: código con barras invertidas, en ficheros.
- Agentes: PROHIBIDO escribir ficheros.

## Datos
AdSense · GA4 · WhatsApp · correo · formulario · DNS en [registrador] ·
repositorio · sitio de Netlify.
Páginas con tráfico (Search Console): [las 10 primeras].

## Estado (se actualiza al cerrar cada fase)
- Fase actual: [n] — falta: [...]
- Hecho: [fase, fecha y commit]
- Fallos del kit arreglados: [B1.x, ...]
- Pendiente del propietario: [...]
```

## G2. `.gitignore`

```
node_modules/
dist/
.astro/
*.xml
*.zip
*.log
kit/
analisis/
referencia/
informes/
capturas*/
descargas/
muestra-viva/
*-fallidas.txt
Claude outputs/
public/css/
```

## G3. `netlify.toml`: el bloque de la web de pruebas

```toml
# Se QUITA el día del cambio de DNS (Fase 7, paso 8), ni antes ni después.
[[headers]]
  for = "/*"
  [headers.values]
    X-Robots-Tag = "noindex, nofollow"
```

---

# ANEXO 1 — Si Claude NO puede ejecutar comandos (o no llega al dominio)

Solo se aplica si la comprobación A1 lo dice. Así se trabajó en
renders.studio, y en los dos primeros días de casascontenedores.

- **El propietario ejecuta; Claude analiza, escribe y decide.** Si Claude tiene
  una máquina propia (como en renders.studio), allí monta las dos webs y hace
  las capturas.
- **Git también lo hace el propietario:** cada "ya está" lleva la línea
  **"falta que lo subas tú"** y el fichero que lo sube, con rutas concretas y
  nunca `git add -A`.
- **Todo lo que haya que ejecutar se entrega como `.cmd` de doble clic**, nunca
  como comandos para pegar. Cada `.cmd`:
  1. empieza con `cd /d "%~dp0"`, o con la ruta hasta la raíz si vive en una
     subcarpeta;
  2. comprueba sus requisitos: Node 22.12 o más, Python con `bs4` y `lxml`, y
     la dependencia clave mirando un fichero suyo. Si falta algo, avisa, hace
     `pause` y sale;
  3. anuncia cada paso (`[3/5] Descargando hojas...`) y mira el `errorlevel`
     **después de cada paso**. Si falla: `SE HA PARADO AQUI: <paso>`;
  4. deja el registro en `descargas\log-AAAAMMDD-HHMM.txt`, que Claude lee
     después;
  5. termina siempre con `pause`.
- **Tras añadir una dependencia**, el siguiente `.cmd` empieza con
  `npm install` y comprueba que la dependencia está.
- **Si el propietario dice "sigue igual":**
  1. listar la carpeta con fecha y tamaño;
  2. mirar `.git`:
     - `logs/HEAD` dice los commits;
     - `refs/remotes/origin/main` o `packed-refs` dicen si se subió.

     En un worktree, `.git` es un fichero. `logs/HEAD` está en la carpeta del
     worktree, y las `refs` y `packed-refs`, en la carpeta común (`commondir`);
  3. no suponer que el `.cmd` se ejecutó.
- **Límites de la herramienta de ficheros de aquel entorno:**
  - no más de 50 ficheros por vez;
  - nada a más de 7 carpetas de profundidad, donde viven las animaciones de
    Elementor y la Font Awesome del tema.

  Se cuenta antes y se le dice al propietario qué copiar a mano.
- No se le pide al propietario que pegue registros largos: los escribe el
  `.cmd`.

---

*Los porqués de casascontenedores están en `analisis/ANALISIS-MIGRACION.md`.
La comparación de las dos migraciones está en
`analisis/ANALISIS-PROMPT-V4.md`; para el kit, basta con las líneas 261 a 295.*
