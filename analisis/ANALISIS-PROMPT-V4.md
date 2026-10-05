# Análisis del prompt V4 (renders.studio) frente a la guía de casascontenedores

Hecho el 4 de octubre de 2026. Compara `PROMPT-MIGRACION-V4.md` (la migración
de renders.studio, 145 páginas) con `GUIA-MIGRACION-PASO-A-PASO.md` y con el kit
de este repositorio (`scripts/`, `src/utils/`). Lo hicieron cuatro analistas y
cuatro verificadores que abrieron los ficheros: de 142 conclusiones, 98 se
confirmaron y 44 se corrigieron. Las referencias `fichero:línea` son del commit
`d64b7b1`.

Sirve de base para la guía v5. **La próxima sesión que la prepare debe leer
este fichero en vez de repetir el análisis.**

Dos correcciones a la guía actual que salieron al verificar:
- `paleta.js` no existe ni ha existido en este repositorio (Fase 3 de la guía).
- `npm run todo` solo hace build, validar y comparar. La geometría, el
  contraste y los 404 no están dentro, aunque la Fase 2 de la guía diga que sí.

## APORTA V4
- [alto] C1 + E Fase 1 (pasos 10-11) :: Escribir el comparador de marcado ANTES que el motor. Recorre los elementos con data-id del HTML real y compara la etiqueta, las clases, los data-* y el contenido de cada widget. Agrupa por tipo (qué falta y qué sobra), deja el detalle en informes/comparacion-marcado.md, sale con código distinto de 0 y cuenta por separado el armazón (cabecera, menú, pie y envoltorio) y el contenido.
   POR QUE: En renders.studio guió el motor de 1801 a 0 diferencias en el armazón y de 162 a 0 en el contenido. En casas no existió nunca: 'git log --all' sobre scripts/ no lo encuentra. El motor fiel (283c548) ya pintaba columnas sin data-id ni data-e-type y con las clases en otro orden, y nada lo detectó. El armazón nunca se comparó por programa: comparar-visual.mjs:58-63 lo deja fuera.
   ENCAJA: Parte 3, Fase 2: dos pasos nuevos al principio, 'escribir el comparador' y 'llevar el motor a 0'. Las trampas van al anexo técnico: el mismo lector de HTML para los dos lados, saltar los data-id anidados como los de planos.json y renders.json, y normalizar data-rsssl.
- [alto] A6 + E Fase 1 (paso 2) :: Bajar al principio el HTML completo de TODAS las páginas, no una muestra.
   POR QUE: En renders, con una muestra de 13 hubo tres rondas de 'me falta una página con este menú'. En casas, la muestra de 7 (descargar-muestra.mjs:18-27) no tenía /fotos-de-casas-containers/ (la de Modula) ni el menú sin-provincias. descargar-estructura.mjs:89 ya recibe el HTML de las 263 páginas y lo tira (:91). Son unos 60 MB.
   ENCAJA: Parte 3, Fase 1. Sustituye a 'HTML completo de una página de cada tipo' (GUIA l.197). Se guarda en referencia/, fuera de Git, al ritmo de descargar-estructura.mjs:20-23 (2 hilos y 400 ms).
- [alto] A5 (receta) + C2 + E Fase 1 (pasos 5-7) :: Montar la referencia completa antes de escribir el motor: HTML, todas las hojas del <head>, src y srcset, los url() del CSS, las tipografías y el JavaScript. Las direcciones absolutas al dominio viejo se reescriben con un script, y la referencia tiene que dar 0 errores 404 antes de medir nada.
   POR QUE: Con la referencia rota, la comparación da '0 diferencias' (es nuestro error 16) y el contraste 'arregla' lo que no está roto. En casas, muestra-viva/portada.html tiene 587 direcciones absolutas al dominio y sus <link> también lo son. Como comparar-visual.mjs:35 bloquea todo lo externo, la referencia se mediría sin hojas. Además, ningún script monta referencia/: esa carpeta no aparece en el historial.
   ENCAJA: Parte 3, Fase 1: paso nuevo 'montar la referencia' como cierre de la fase. Hoy es una casilla de la Fase 2 (GUIA l.221-222) que va detrás de 'pintar el árbol'.
- [alto] C2 (regla) + F3 (tercer caso) :: Si una imagen de fondo no carga, no se sabe qué hay debajo del texto. No se arregla nada: se apunta como fichero que falta y se avisa.
   POR QUE: Fue el peor error de renders: un titular blanco sobre un render acabó en negro. En casas, render.js:75-83 quita sin avisar las fotos de fondo que faltan (162 bloques), y validar.mjs:202-218 solo revisa las del CSS. Un bloque sin velo ni color se quedaría blanco y nadie lo sabría.
   ENCAJA: Parte 4, reglas innegociables, junto al error 16, y dentro de la comprobación de contraste.
- [alto] F3 :: Contraste bien medido: se componen todas las capas con su transparencia (el propio elemento y sus padres, ::before y ::after, y el elementor-background-overlay hermano). Hay dos arreglos distintos: con fondo liso, el mismo tono más oscuro o más claro; sobre una foto, se refuerza el velo y el texto no se toca. Se mide con la hoja de correcciones desactivada, y toda regla generada lleva el ID del constructor.
   POR QUE: En renders salieron 98 fallos y solo 11 eran reales; 87 falsos venían únicamente del overlay hermano, y una regla suelta sobre span.text-wrap dejó el menú blanco sobre blanco. Nuestro método (ANALISIS §10: subir por los padres hasta uno opaco) se queda a medias, y el script no está en el kit (git log --all). En casas el velo también se pinta en un ::before (diseno.css:152-160 y 239-247).
   ENCAJA: Parte de comprobaciones (la de texto invisible), con el detalle en el anexo técnico. El segundo arreglo, en la Fase 3.
- [alto] F (intro) + F4 + 'npm run todo' :: Ninguna comprobación se puede saltar, y cada fallo visto a ojo entra en el validador como FALLO bloqueante ese mismo día. El barrido de 400/404 recorre la página entera y separa fotos, tipografías y otros. No se sube nada sin 'fallos: 0'.
   POR QUE: En casas, tres de las cuatro comprobaciones (geometría, contraste y 404) no están en 'todo' (package.json:19), aunque la GUIA, Fase 2 (l.223-229), dice que sí. Los errores 9, 10 y 17 nunca llegaron al validador. La frase 'si falla, no se sube nada' se perdió al pasar a la guía nueva (estaba en PROMPT-NUEVA-MIGRACION.md:169-170).
   ENCAJA: Parte de comprobaciones: 'todo' para lo que no necesita servidor y 'todo:visual' para lo que necesita navegador. Reescribir las reglas 6 y 7 de la Parte 4.
- [alto] A1 + H3 :: Arreglado no es publicado. Cada informe termina diciendo dónde está el cambio: solo en local, con commit sin subir, en una rama, o en main y desplegado (comprobado en la URL).
   POR QUE: En renders, un rediseño quitado en local siguió en Netlify una hora más. La regla 'dime dónde estoy mirando' estaba en PROMPT-NUEVA-MIGRACION.md:193-195 y se perdió. En Claude Code se comprueba con 'git log origin/main..HEAD' ('git status -sb' no compara en ramas sin upstream) y pidiendo al dominio un texto que haya cambiado.
   ENCAJA: Parte 5 (plantilla de CLAUDE.md, 'Quién manda y cómo se habla') y Parte 2.
- [alto] A4 :: Cuando el propietario dice 'sigue igual', Claude mira antes de suponer nada. Orden fijo en Claude Code: git status y diff; fecha de dist/; servidor de desarrollo con el CSS viejo (error 11); dev frente a build (error 12); caché del navegador; último despliegue.
   POR QUE: Según ANALISIS-MIGRACION.md:200-203, listar scripts/ habría ahorrado dos rondas. Al pasar a la guía nueva se recortaron 'fecha y tamaño' y 'no supongas que se ejecutó'.
   ENCAJA: Parte 2, punto 8, ampliado.
- [alto] A5 :: No se piden capturas al propietario. Claude hace las de las dos webs y las enseña lado a lado.
   POR QUE: Cada captura pedida es una ronda más. En Claude Code, capturar.mjs ya funciona tal cual con el Chrome del equipo. Choca con la Parte 2, punto 5.
   ENCAJA: Parte 2, punto 5 ('dime la página y qué está mal; la captura la hago yo') y el cierre de las Fases 2 y 3.
- [alto] A6 :: Reproducir el fallo antes de proponer un arreglo, con una captura o una medida, y comprobar después que esa misma medida da 0.
   POR QUE: Evita arreglos a ciegas. Nuestra guía solo lo da a entender (Parte 2, punto 3, y reglas 7 y 8); no lo pide en ningún sitio.
   ENCAJA: Parte 4, reglas.
- [alto] B1.3 + E Fase 0 :: Lo que pinta un plugin no está en el export: se captura del HTML vivo. Eso incluye galerías, Contact Form 7 (uno por página), mapas, rejillas tipo Content Views con su hoja suelta y legales. La lista de plugins sale de las rutas /wp-content/plugins/NOMBRE del HTML de todas las páginas.
   POR QUE: En casas, [modula id="2806"] estaba dentro de un text-editor. arbol.py lo dejó pasar como texto y comillas() lo publicó como [modula id=«2806»] (lo arregló el parche 84e604f), sin que validar ni comparar lo vieran. Nuestra búsqueda de '[algo id=…]' se hace a mano y deja fuera los shortcodes sin id.
   ENCAJA: Parte 3, Fase 0.2 y Fase 1. El validador tiene que fallar si queda un shortcode literal en el HTML.
- [alto] B1.2 :: Si Claude se sorprende midiendo un margen a ojo, para y dice qué hoja falta.
   POR QUE: Es el freno práctico de 'el CSS no se escribe, se copia'. Solo estaba en PROMPT-NUEVA-MIGRACION (l.57) y no pasó a la guía nueva.
   ENCAJA: Parte 3, Fase 2.
- [alto] B6 + E Fase 0 :: Decir cuántas cabeceras distintas hay y qué ajuste las elige (ocean_header_custom_menu). La muestra lleva una página por cabecera, y el extractor avisa, con el número de páginas, si falta la referencia de un menú.
   POR QUE: En renders había 5 cabeceras y 82 páginas usaban una que no estaba en la muestra. En casas había 4. arbol.py:666 convierte en silencio un id desconocido en el menú por defecto, y ese menú por defecto se fijó a mano (site.json:167).
   ENCAJA: Parte 3, Fase 0.2.
- [alto] B2 + E Fase 0 (section y container) :: Contar los section y los container, porque una página puede mezclar los dos sistemas.
   POR QUE: En renders, las 141 páginas llevaban los dos. El kit de casas aplana el container (arbol.py:590-594) y el render fiel solo pinta section y column. Nunca se probó, porque casas tenía 0 container.
   ENCAJA: Parte 3, Fase 0.2. Si aparece algún container, avisar de que el kit necesita trabajo nuevo.
- [alto] B2 (altura de sección) :: Clases elementor-section-height-{full|min-height} y elementor-section-items-{posición}.
   POR QUE: Al verificarlo salió que arbol.py no lee height, custom_height ni column_position, y en cambio busca min_height, que no existe en el XML. En casas, la copia fiel pintaba como height-default 105 secciones que eran de pantalla completa (100vh).
   ENCAJA: Anexo técnico del marcado de Elementor (y kit pendiente).
- [alto] B3 :: Los iconos de los widgets son SVG metidos en el HTML, con los trazados de Font Awesome 5.15.4, aunque el tema cargue la 6.7.2 como tipografía.
   POR QUE: Con la versión del tema salen con otro dibujo y ninguna comprobación lo ve. Nuestra regla (ANALISIS §6: 'los iconos son tipografías', y la versión se lee en la cabecera del CSS) lleva justo a la versión equivocada.
   ENCAJA: Fase 0.2: buscar <svg class="e-font-icon-svg"> o <i class="fa…">. Fase 2: alias fa5 solo si hace falta. El comparador compara el atributo d de los <path>.
- [alto] B7 (post-{ID}.css) :: post-{ID}.css no existe hasta que alguien visita la página. Si la descarga trae un error de unos 196 bytes, se visita la página y se vuelve a bajar.
   POR QUE: descargar-css.mjs:50 da por buena cualquier copia de más de 0 bytes, y :53-58 guarda cualquier respuesta 200. En renders costó una ronda; en casas no llegó a pasar.
   ENCAJA: Parte 3, Fase 1 (hojas). Al cierre, las páginas con árbol y sin hoja cuentan como fallo.
- [alto] E Fase 0 (widgets) :: Recuento de widgets por tipo, avisando de los que el motor no pinta.
   POR QUE: arbol.py:494-495 descarta en silencio los widgetType que no conoce. Casas se libró solo porque sus 11 tipos estaban tratados.
   ENCAJA: Parte 3, Fase 0.2.
- [alto] E Fase 0 (tipos de diseño) :: Contar tipos de DISEÑO, no URL ni tipos de contenido, y guardar la lista en un único fichero.
   POR QUE: En casas hay cuatro listas de tipos escritas a mano: descargar-muestra, capturas, capturar-referencia y comparar-visual, y a esta última le falta 'legal'. inventario.mjs:7-8 clasifica por contenido.
   ENCAJA: Parte 3, Fase 0.2.
- [alto] E Fase 0 (Search Console) :: Saber qué páginas traen tráfico de verdad.
   POR QUE: Decide qué se mira a ojo y se mide, qué páginas no pueden perder encabezados y cuáles se vigilan después de la mudanza. Nada del kit lo usa (.gitignore:1 solo lo nombra en un comentario).
   ENCAJA: Parte 1 (pedir el export de Rendimiento → Páginas) y Fase 0.2.
- [alto] G (noindex) :: X-Robots-Tag: noindex en toda la web de pruebas desde el primer despliegue.
   POR QUE: Nuestra guía solo dice que se quite en la Fase 7 (l.384-388), pero nunca que se ponga. En casas se puso (b4cdb6a:netlify.toml:37-43), pero no quedó como paso de la guía.
   ENCAJA: Primer despliegue (Fase 1 o 2) y plantilla de netlify.toml.
- [alto] G (configuración y canonical) :: trailingSlash: 'always' y build.format: 'directory'. En el cuerpo, rutas relativas; el canonical y las etiquetas sociales, en absoluto.
   POR QUE: Ya está en el kit (astro.config.mjs:6-7; Base.astro:31, 90 y 97-98), pero la guía no lo dice. validar.mjs:191 solo mira que el canonical exista.
   ENCAJA: Fase 0.3 (configuración base) y validador.
- [alto] A7 + G :: Qué sube a Git y qué no. El .gitignore completo existe antes del primer 'git add'. Antes del primer push se avisa del peso de public/ y se compila desde un clon limpio.
   POR QUE: En renders, un fichero de datos que faltaba rompió Netlify (ENOENT). En casas entraron en Git muestra-viva/, 'Claude outputs/' y los *-fallidas.txt por 'git add .' (GUIA-GIT.md:65) o 'git add -A' (RAMA.bat:33). 260 ficheros de public/css siguen en Git aunque .gitignore:17 los excluye. public/ ocupa 226,6 MB en Git, con un mp4 de 60,6 MiB.
   ENCAJA: Fase 1 (antes del primer commit), Fase 7 (paso 3) y anexo 'mapa del kit' (script → qué genera → ¿lo ejecuta Netlify? → ¿va en Git?).
- [alto] H1 :: Antes de aplicar un rediseño, enseñar dos o tres opciones en imagen: la misma página tratada de varias maneras.
   POR QUE: En renders hubo que deshacer entera la fase de diseño. En casas, 58fd1f4 aplicó el rediseño directamente: 'rediseno-1.png' es un antes y después ya aplicado, y la decisión de la web encajonada llegó 12 días más tarde (b90419d).
   ENCAJA: Parte 3, Fase 3, primer paso.
- [alto] H2 :: El rediseño se prueba en una sola página y, cuando el propietario dice que sí, se extiende al resto.
   POR QUE: 58fd1f4 cambió todas las páginas de golpe: 266 líneas de render.js, 374 de diseno.css y 735 de rediseno.css.
   ENCAJA: Parte 3, Fase 3.
- [alto] H3 + H5 :: El rediseño va en una hoja propia enganchada con una sola línea (un interruptor) y no toca el motor ni el HTML hasta que se aprueba. Si no gusta, se apaga sin discutir y la hoja se guarda.
   POR QUE: En renders, deshacerlo fue quitar dos líneas. En casas, el rediseño reescribió el motor (render.js:4-5, 'marcado PROPIO') y solo lo aisló la rama 'rediseno' (RAMA.bat). Ojo con Astro: el CSS que empaqueta va detrás de cualquier <link> que se ponga en el <head>.
   ENCAJA: Parte 3, Fase 3.
- [alto] H4 (variables del kit de Elementor) :: Cambiar color y tipografía redefiniendo las variables --e-global-* con body.elementor-kit-{ID}.
   POR QUE: Cambia media web sin usar !important. Nuestra guía habla de paleta.js, que no existe ni ha existido en el repositorio.
   ENCAJA: Parte 3, Fase 3, si se adopta el interruptor.
- [alto] D1 :: Separar lo que da 404 en el propio servidor original de lo que no se ha descargado, y enseñar lo primero como fallo del original, con el número de páginas afectadas.
   POR QUE: En casas, los 404 de origen se taparon sin preguntar. Por ejemplo, 2022/01/casa-hechas-con-contenedores-scaled.jpg sale en 156 JSON. EQUIVALENTES (imagenes.js:54-62) pone otra foto en su lugar y validar solo da un AVISO.
   ENCAJA: Parte 3, Fase 2, 'Fallos del original'.
- [medio] A6 + C1.3 :: El detalle completo va a informes/*.md (fuera de Git) y la consola enseña un resumen de 30 líneas como mucho.
   POR QUE: validar.mjs:236-237 y comparar-encabezados.mjs:186-187 recortan a 40 y 30 líneas, y el resto no queda guardado en ninguna parte. Con el informe en disco, Claude busca con grep sin volver a ejecutar nada, y ahorra tokens.
   ENCAJA: Plantilla de CLAUDE.md y norma del kit.
- [medio] A6 :: No listar carpetas enormes sin filtro: usar recuentos o Glob con un patrón.
   POR QUE: public/wp-content tiene 2.344 ficheros; dist/, 3.004 (258 MB); capturas-tmp/, 836 (211 MB); node_modules/ ocupa 216 MB.
   ENCAJA: Plantilla de CLAUDE.md.
- [medio] A2 (parar en el primer error) + C1.4 :: Toda comprobación y todo descargador salen con un código distinto de 0 si algo falla, y 'todo' dice en qué paso se ha parado.
   POR QUE: En renders, 'npm run datos' falló en el cuarto paso y nadie se enteró. En casas los descargadores salen con 0 aunque fallen descargas (descargar-imagenes.mjs:130-138, descargar-estructura.mjs:122-125, descargar-legales.mjs:40-42, descargar-muestra.mjs:51-53), y comparar-visual.mjs no devuelve ningún código.
   ENCAJA: Parte de comprobaciones y norma del kit.
- [medio] A3 :: Comprobar que la dependencia está de verdad mirando un fichero concreto, y subir package.json y package-lock.json en el mismo commit.
   POR QUE: fuentes-locales.mjs:49-52 solo mira la carpeta y sigue adelante con avisos. Playwright pide Chromium 1243, que no está instalado, y tres de los cuatro scripts de capturas no arrancan.
   ENCAJA: Norma del kit y comprobación del entorno en la Fase 0.
- [medio] B1.3 (hojas sueltas) + B7 :: Un plugin puede añadir una hoja solo en las páginas donde aparece. La lista sale del <head> de todas las páginas, con los <link> y también los <style>.
   POR QUE: En casas, widget-google_maps, jquery.rating y block-library solo salen en algunas páginas, y hay una eael-ID.css por página. descargar-muestra.mjs:47 solo recoge <link>, así que el <style> del personalizador de OceanWP hubo que añadirlo a mano (00-personalizador.css).
   ENCAJA: Fase 0.2 (hojas) y Fase 1.
- [medio] B1.4 :: Las fotos recortadas a medida de uploads/elementor/thumbs/ se capturan del HTML vivo.
   POR QUE: La expresión de descargar-imagenes.mjs:34 exige /uploads/AAAA/MM/ y no las coge.
   ENCAJA: Parte 3, Fase 1.
- [medio] E Fase 1 ('El JavaScript no es opcional') + B2 data-settings :: En la Fase 0 se cuentan los elementor-invisible y los data-settings que dependen del JavaScript (_animation, stretch_section, sticky…). Después, o se carga el JavaScript de Elementor o se reproduce su efecto sin él.
   POR QUE: En renders, sin ese JavaScript media web no se veía. En casas no había ningún elementor-invisible, pero sí stretch_section (837 secciones), que se resolvió con CSS (arbol.py:538-539).
   ENCAJA: Fase 0.2 y Fase 1.
- [medio] E Fase 1 (paso 8) :: El armazón y el envoltorio del contenido se sacan del HTML real de cada tipo de cabecera, no se escriben de memoria.
   POR QUE: En casas, el envoltorio del tema se escribió a mano en el Base.astro de 160944b y desapareció en 58fd1f4.
   ENCAJA: Parte 3, Fase 2.
- [medio] B4 (lazy y srcset) :: Las primeras imágenes de cada página van sin loading=lazy (el número se cuenta en la web viva). El srcset lleva las variantes de la misma proporción.
   POR QUE: render.js pone lazy a todas las imágenes. En la portada viva de casas, el logo y las dos imágenes siguientes van sin lazy. También mejora el LCP.
   ENCAJA: Anexo técnico.
- [medio] B5 :: Lista de lo que WordPress cambia al publicar, para reproducirlo o normalizarlo en el comparador: comillas, el ';' final de los style, decoding=async, enlaces sin protocolo y http interno.
   POR QUE: El kit no convierte los tres puntos: la portada viva dice 'posibilidades&#8230;' y el JSON 'posibilidades...', y ninguna comprobación lo ve.
   ENCAJA: Anexo técnico y comparador.
- [medio] D2 :: Buscar en la Fase 0 los enlaces '#https://…', los '#' sueltos y las url vacías, y enseñarlos como fallo del original.
   POR QUE: render.js:169 pinta '#' sin avisar, validar.mjs:178 no revisa los '#', menus.py:48 rellena con '#' y arbol.py:127-128 quita los <a> sin href sin decir nada.
   ENCAJA: Fase 0 y 'Fallos del original'.
- [medio] D4 :: En la copia fiel, el contraste malo del original se reproduce y se apunta. Arreglarlo se decide en la fase de diseño.
   POR QUE: Evita mezclar la copia con mejoras. La guía lo deja a medias (Fase 2, l.227 y 230).
   ENCAJA: Fase 2, 'Fallos del original'.
- [medio] H5 (fallos del original) :: Los fallos reales del original se guardan en un fichero propio que no depende del diseño, para que sobrevivan si se deshace el rediseño.
   POR QUE: Hoy están en LEEME.md:62-69, que está desactualizado, y en mensajes de commit (d96d5a5).
   ENCAJA: Fase 2 (informes/fallos-original.json).
- [medio] H4 (iconos y !important) :: Si se cambia font-family con !important, hay que excluir <i> y las clases fa-, eicon- e icon-.
   POR QUE: Si no, todos los iconos se ven como cuadrados vacíos.
   ENCAJA: Fase 3, trampas.
- [medio] H4 (letra sobre foto) :: Sobre una foto manda el peso de la letra: titulares de grosor 600 con sombra suave o velo en degradado, nunca letra de 300.
   POR QUE: La letra fina desaparece sobre la foto. En casas ya se hizo así (global.css:333-344).
   ENCAJA: Fase 3, lecciones de diseño.
- [bajo] B2 / B4 (detalles) :: El orden de las clases y de las claves de data-settings, la foto repetida sin lazy y la clase de animación al pasar el ratón en la <img>.
   POR QUE: Solo hacen falta para llegar a 0 diferencias de marcado. El comparador puede tratar las clases como conjunto.
   ENCAJA: Anexo técnico.
- [bajo] H4 (velo mínimo, cabecera clara) :: La foto es el producto: primero el velo mínimo. La cabecera, clara y con un filete fino, sin barras negras ni cristal esmerilado.
   POR QUE: Es cuestión de gusto. En casas se hizo lo contrario: velo de 0,62 a 0,92 (diseno.css:162-168) y barra #12171b con desenfoque (global.css:30-31 y 53-61).
   ENCAJA: Fase 3, como opciones en imagen, no como regla.

## CHOQUES
- Quién ejecuta los comandos
   V4: Claude no puede ejecutar node, npm, git ni curl, ni llega al dominio. Todo lo ejecuta el propietario (A1).
   NUESTRA: Lo contrario: Claude edita, compila y verifica (plantilla de CLAUDE.md, l.503-505). No hay ningún apartado para cuando no hay terminal.
   CONVIENE: Las dos, según el entorno. La v5 empieza con un interruptor: '¿Claude puede ejecutar comandos?'. Si sí (Claude Code), manda nuestra guía. Si no, el anexo 'sin terminal' con A1-A5 del V4. Casas pasó dos días en ese modo (15-16 sep: LEEME-PRIMERO.md, VER/ARREGLAR/RAMA.bat), así que no es un caso teórico.
- Comandos: .cmd de doble clic o Claude los lanza
   V4: Todo se entrega como .cmd: comprueba requisitos, numera los pasos, se para en el primer error diciendo cuál, termina con pause y deja un registro.
   NUESTRA: No habla de .cmd. En Claude Code los comandos los lanza Claude.
   CONVIENE: En Claude Code no hacen falta los .cmd. Lo que sí vale es la idea: un scripts/todo.mjs que anuncie [n/N] y diga 'SE HA PARADO EN: …'. La plantilla .cmd va al anexo sin terminal, con ARREGLAR.bat:19 como ejemplo de lo que no hay que hacer (lanza 'npm run todo' sin mirar el errorlevel y luego dice TERMINADO).
- Git: quién hace commit y push
   V4: Claude no puede hacer commit ni push (A1). Pero su propio mensaje de arranque pide 'súbelo a Git cuando esté verificado' (l.21-22): el V4 se contradice.
   NUESTRA: Es una decisión del propietario en el primer mensaje (Parte 1, l.70-72; Parte 6, l.558).
   CONVIENE: La nuestra, porque en Claude Code Claude sí puede subir. Del V4 se toma que cada informe diga en qué estado queda el cambio. En el anexo sin terminal, cada entrega termina con un .cmd de commit y push que use rutas explícitas, no 'git add -A'.
- Muestra o todas las páginas
   V4: Se descarga el HTML de TODAS las páginas al principio (A6, E Fase 1 paso 2).
   NUESTRA: HTML completo de una página de cada tipo; de todas, solo los encabezados (Fase 1, l.196-197; tabla 0.3, l.165).
   CONVIENE: El V4. La muestra se quedó corta en las dos webs: en casas faltaron la página de Modula y el menú sin-provincias. descargar-estructura.mjs ya recibe el HTML de las 263 páginas, así que basta con guardarlo en referencia/, fuera de Git, respetando 2 hilos y 400 ms. estructura-viva.json se puede seguir usando como comparación barata de encabezados.
- Capturas
   V4: No se piden capturas al propietario: las hace Claude, lado a lado (A5).
   NUESTRA: Parte 2, punto 5: el propietario da la página, la captura y qué está mal.
   CONVIENE: El V4. En Claude Code, capturar.mjs funciona con el Chrome del equipo. El propietario dice la página y qué ve mal, y Claude hace la captura. Falta en el kit el script que junte las dos capturas lado a lado.
- Iconos: tipografía o SVG
   V4: Los iconos de los widgets son SVG de Font Awesome 5.15.4 metidos en el HTML; la tipografía 6.7.2 es solo la del tema (B3).
   NUESTRA: ANALISIS §6: 'los iconos y las letras no son imágenes, son tipografías', y la versión se lee en la cabecera del CSS.
   CONVIENE: Distinguir los dos casos. Los iconos de widget de Elementor se copian del árbol o del HTML vivo, con la versión que dicen sus trazados. Los <i class="fa…"> del tema o del HTML escrito a mano son tipografía de npm, con la versión de la cabecera. Casas solo tenía el segundo caso, por eso nuestra regla no falló.
- Cómo se hace el rediseño
   V4: Primero opciones en imagen y una sola página. Después, una hoja propia con interruptor, cargada la última, sin tocar el motor ni el HTML (H1-H3).
   NUESTRA: Fase 3: paleta.js (no existe), diseno.css y cabecera, foto principal y pie nuevos. En la práctica, 58fd1f4 reescribió el motor con marcado propio y lo aplicó a todas las páginas.
   CONVIENE: El V4, en dos tiempos: (1) el diseño como capa con interruptor sobre la copia fiel hasta que el propietario lo apruebe; (2) después, si compensa por velocidad, pasar a marcado propio como tarea aparte, medida con 0 diferencias frente al diseño aprobado. En Astro, el interruptor tiene que ser un <link> a public/ condicionado por site.rediseno, y validar debe comprobar que es la última hoja, porque el CSS que empaqueta Astro va detrás. La rama de Git (RAMA.bat) es un buen complemento para tener vista previa.
- Orden de trabajo de la copia fiel
   V4: Primero se monta la referencia con 0 errores 404, después el armazón y los plugins, luego el comparador y al final el motor (E Fase 1, pasos 7 a 11).
   NUESTRA: 'Montar la web vieja en local… 0 errores 404' es una casilla de la Fase 2 que va detrás de 'pintar el árbol' (l.210-222). En el proyecto, el motor (a587d83) se escribió sin script de referencia, y ese script sigue sin existir.
   CONVIENE: El orden del V4. Sin referencia fiable, el motor se ajusta a ojo y las comparaciones dan aprobados falsos (error 16).
- Comprobación de contraste
   V4: Se componen todas las capas con su transparencia, incluidos ::before y el overlay hermano. Si una foto no cargó, el fondo es desconocido (F3 y C2).
   NUESTRA: ANALISIS §10 y PROMPT-NUEVA-MIGRACION l.151-153: subir por los padres hasta uno opaco. El script no quedó en el kit.
   CONVIENE: El V4. Nuestro método no es el contrario, pero se queda a medias y da los falsos positivos que describe el V4 (87 solo por el overlay).
- Clases en orden o como conjunto
   V4: El comparador mira la lista de clases EN ORDEN, y el orden depende de cómo se guardaron los ajustes (C1.1 y B2).
   NUESTRA: No compara marcado.
   CONVIENE: Comparar las clases como conjunto (separando por espacios, como validar.mjs:55 y 133-135), y data-settings como objeto. El orden no cambia cómo se ve la página y reproducirlo cuesta rondas. Solo hay que exigir el orden si se busca 0 diferencias literales.
- Qué hace 'npm run todo'
   V4: Un solo comando que genera, compila, valida y compara, y sin 'fallos: 0' no se sube nada (F).
   NUESTRA: La Fase 2 (l.223-229) dice que 'todo' incluye geometría, texto invisible y 404. La Parte 5 (l.512-513) dice 'build + validar + comparar', que es lo que hace de verdad package.json:19. La guía se contradice a sí misma.
   CONVIENE: Juntar las dos y corregir la guía: 'todo' sin servidor y 'todo:visual' con navegador (geometría, contraste y 404). Al cerrar cada fase hacen falta los dos. Para que la regla se cumpla sola, añadir un hook pre-push o que Netlify ejecute también validar y comparar.
- El H1
   V4: Las páginas con dos H1 o sin ninguno se enseñan como fallo del original y se pregunta (D3).
   NUESTRA: Regla fija de antemano: el primer encabezado sube a H1 (Fase 2, l.217-218). Pero el kit actual hace otra cosa: usa el título de la página en el héroe ([...slug].astro:59-64; Hero.astro:67).
   CONVIENE: Una sola regla, que la guía y el kit digan lo mismo y que el propietario la apruebe una vez con la lista delante: cuántas páginas tienen 0 o 2 o más H1 en vivo, sacada de estructura-viva.json.
- Rutas de las fotos y copias webp
   V4: Las rutas y los nombres no se tocan, porque están indexados en Google Imágenes (B4).
   NUESTRA: Regla 5, lo mismo. Pero el kit cambia el src y el srcset por la copia .webp (imagenes.js:91, 105 y 114-119).
   CONVIENE: Cumplir la regla de verdad: <picture><source type="image/webp"><img src="ORIGINAL"></picture>, para que la <img> siga apuntando a la URL indexada.
- Fotos que dan 404 en el original
   V4: Se enseñan y se pregunta. No se copian ni se arreglan en silencio (D).
   NUESTRA: La regla 9 dice lo mismo, pero el kit pone otra foto sin preguntar (EQUIVALENTES, imagenes.js:54-62, 'pendiente de confirmar') o un marcador SVG, y validar solo da un AVISO.
   CONVIENE: El V4 y nuestra regla 9: lista de fallos del original con el número de páginas afectadas, y EQUIVALENTES solo con el visto bueno del propietario apuntado.
- Alcance de las reglas de color
   V4: No se generan reglas sin el identificador del constructor (F3).
   NUESTRA: Fase 3 (l.250-252): diseno.css no fuerza colores ni tamaños globales. Pero diseno.css:73-87 da color y tamaño a h1-h6 y color a todos los <a>, y en las l.58-68 usa varios !important.
   CONVIENE: Toda regla de color, generada o escrita a mano, se limita a un contenedor (el ID de Elementor o la clase del bloque). O se corrige diseno.css, o se cambia la regla de la Fase 3 si esos estilos globales son intencionados en un rediseño con marcado propio.
- Velo y cabecera
   V4: El mínimo velo posible, y cabecera clara con filete fino, sin barras negras ni cristal (H4).
   NUESTRA: En casas se hizo lo contrario y el propietario lo aprobó: velo de 0,62 a 0,92 y barra superior #12171b con desenfoque.
   CONVIENE: Ninguna como regla, porque es cuestión de gusto. Se presentan como opciones en imagen (H1) y decide el propietario.

## DEPENDE DEL ENTORNO
- Reparto de papeles (A1): Claude lee, escribe, analiza y decide; el propietario ejecuta todo lo que haya que ejecutar. Para saber en qué modo se está, en la Fase 0 se prueba si Claude puede ejecutar comandos y si llega al dominio con un fetch de prueba.
- Sin salida al dominio (A1): las descargas las lanza el propietario en su PC. Los descargadores tienen que poder relanzarse sin estropear nada; hoy descargar-legales.mjs (:41 y :47) y descargar-muestra.mjs (:42-68) no lo cumplen.
- Todo lo que haya que ejecutar se entrega como fichero .cmd de doble clic, nunca como comandos para pegar, porque se cuelan caracteres, se pega en PowerShell en vez del símbolo del sistema o se ejecuta a medias. El doble clic abre siempre cmd.exe. Si la plantilla vive en una subcarpeta, empieza con 'cd /d "%~dp0..\.."', porque fuentes-locales.mjs:26 y validar.mjs:20 dependen de la carpeta actual.
- Cada .cmd comprueba antes sus requisitos: 'node --version' 18 o superior (los descargadores usan el fetch de Node con AbortSignal.timeout). Si falta algo, da un mensaje claro, hace pause y sale con exit /b 1.
- Cada .cmd anuncia en qué paso va ([3/5] …), comprueba el errorlevel después de CADA call y, si algo falla, se para diciendo 'SE HA PARADO AQUI: <paso>'. Ejemplo de lo que no hay que hacer: ARREGLAR.bat:19.
- Cada .cmd termina con pause, tanto si sale bien como si falla.
- Cada paso deja su salida en descargas\log-AAAAMMDD-HHMM.txt ('>> … 2>&1'), que Claude lee después: sin terminal es el único canal de vuelta. descargas/ y *.log van en el .gitignore antes del primer .cmd.
- Después de añadir una dependencia, el siguiente .cmd empieza con npm install y comprueba que existe un fichero concreto de esa dependencia (A3).
- Git (A1): el propietario hace commit y push. Cada entrega termina con el .cmd de commit y push, que añade rutas explícitas (no 'git add -A') o exige antes un .gitignore completo.
- Cada 'ya está arreglado' lleva la línea 'falta que lo subas tú' y el .cmd que lo hace (A1 y H3). Quitar líneas no deshace nada hasta el commit y el push.
- Ante 'sigue igual' (A4): listar la carpeta con fecha y tamaño de los ficheros. No dar por hecho que el .cmd se ejecutó. No pedir errores antes de haber mirado.
- Problemas de Git o de Netlify sin terminal (A4): logs/HEAD dice los commits y refs/remotes/origin/main si se llegó a subir. En un worktree, .git es un fichero: logs/HEAD se busca en su gitdir y refs/remotes en la carpeta común (commondir). Hay que mirar también packed-refs.
- Límite de la herramienta de ficheros de aquel entorno: no más de 50 ficheros de una vez (A5). Los lotes se planifican antes de empezar.
- Límite de profundidad: no se trae nada que esté a más de 7 carpetas (A5). Se cuenta antes, se dice qué no se puede traer y el propietario lo copia a mano a una ruta menos honda. Sacar letras e iconos de npm evita esas rutas.
- No pedir que se peguen registros largos: Claude lee el fichero de registro (A6). En Claude Code esto se convierte en la norma general de escribir los informes en disco.

## SOLO NUESTRA GUIA
- Parte 1: la lista de lo que tiene que preparar el propietario, sobre todo la captura de la zona DNS completa (el error 1 dejó sin correo a casas), los accesos que funcionen y los datos que solo sabe él (precios, plazos, servicios, zonas, titular legal).
- Decisiones desde el principio: quién sube a Git, dónde se queda el DNS y si la web va encajonada o a todo lo ancho.
- Parte 2, hábitos para gastar menos: una sesión por fase con CLAUDE.md como memoria; decir dónde está un documento en vez de pegarlo; primero el análisis y luego 'haz el 1, el 3 y el 5'; contestar todas las decisiones en un solo mensaje; workflow solo para trabajos grandes; cambios masivos primero en seco, con recuento y 5 ejemplos.
- Cierre de cada fase: npm run todo, commit, actualizar CLAUDE.md y push si está autorizado. Más el calendario real de días por fase.
- Fase 0.3: tabla del kit reutilizable. Ojo: no dice que los motores y la maqueta de HEAD son los del rediseño; los de la copia fiel están en 160944b.
- Fase 1: todo se baja mientras la web vieja sigue en el dominio. Las fotos de plugins, solo con permiso y diciendo cuántas son y cuánto ocupan. Lista de los ID de WordPress (?p=, ?page_id=) para las redirecciones.
- Fase 2: el validador (equilibrio de etiquetas, un H1, bloques anidados, palabras perdidas, enlaces, fotos del CSS, title y canonical) y la comparación de encabezados de las 263 páginas contra la web viva, con las excepciones en ficheros de datos (encabezados.json, orden-tipos.json, erratas.json).
- Fase 2: letras e iconos desde npm, solo latin y latin-ext y con unicode-range desde el principio (113 KB menos por página). La conversión de comillas, solo en el texto visible. elementor-kit-N en el <body>.
- Reglas de CSS que el V4 no tiene: la hoja propia solo lleva lo que no existe en el original; el hueco entre columnas es padding, no gap; los <style> de los bloques de texto escritos a mano no se quitan; si se limpia el CSS, no mirar dentro de :not(), :is(), :where() ni :has() (error 17).
- Antes y después, medido: 'sin tocar el diseño' se demuestra con 0 diferencias de posición y tamaño, también en el rediseño y en la velocidad. El V4 solo mide la copia fiel.
- Medir sobre la web compilada (build + preview), no sobre npm run dev, y reiniciar el servidor de desarrollo después de cambiar el CSS de un componente (errores 11 y 12).
- Fase 4 (contenido y SEO), que el V4 no tiene: lo nuevo sale de ficheros de datos; una sola FAQ con FAQPage; no inventar precios, plazos, normativa ni testimonios; comprobar los hechos de todo texto escrito por IA; nueva-pagina.mjs; ninguna página huérfana; botones que dicen adónde llevan.
- Cambios en el texto original solo con permiso: regla en erratas.json, script que se puede ejecutar dos veces, pasada en seco con recuento y commit propio '(pedido por el propietario)'. comparar aplica las mismas correcciones a la web viva (errores 6, 7 y 8).
- Fase 5 (formularios): envío AJAX, la página de origen en el aviso, evento de conversión en Analytics, WhatsApp con mensaje distinto por familia y prueba real solo con permiso.
- Fase 6 (velocidad): quitar las tipografías que no se usan, width y height en cada foto, foto principal en webp a varios tamaños con preload e imagesrcset.
- Fase 7 (mudanza al dominio) completa: A y www hacia Netlify, borrar los AAAA, nada de CNAME en el dominio raíz, Multisitio de OVH, no tocar MX, SPF, DKIM, SRV ni TXT, comprobar contra los servidores DNS del dominio, Verify DNS, correo de prueba, cada ?p=ID a su página, no guardar en caché los 404, CMP de cookies antes de Analytics y AdSense, sitemap a 200, y el hosting viejo un mes más.
- Fase 8: auditoría que solo lee, con su lista: ciudades cruzadas, erratas repetidas, voseo y usted, 'Haz clic aquí', enlaces internos que pasan por una redirección, huérfanas, precios que se contradicen, 'próximamente', FAQ del tipo equivocado y migas de pan.
- Fallos del original que el V4 no menciona: avisos de 'en obras' o 'próximamente', títulos con otra ciudad (plantillas copiadas) y botones a '#'.
- Parte 4, errores al trabajar con Claude: los agentes de un workflow tienen PROHIBIDO escribir ficheros; en Windows, el código con barras invertidas va en ficheros, nunca con node -e ni heredocs; los ficheros se escriben en la carpeta del proyecto, sin ZIP.
- Parte 5: plantilla de CLAUDE.md con quién manda, las reglas, los datos del sitio y el estado de cada fase. Parte 6: el mensaje para empezar.
- Lo que está en el kit y en ninguna guía: descargadores con modo --ensayo; descargar despacio (2 hilos, 400 ms, reintentos y descartar respuestas de menos de 5.000 caracteres, descargar-estructura.mjs:20-23 y 89-95), porque WordPress devolvía HTTP 500; probar los cambios grandes en una rama aparte (RAMA.bat); las variantes de imagen que faltan van a extra-imagenes.txt; elementor-col-N sale de _column_size; el orden de los encabezados se comprueba con un puntero y no con indexOf, porque hay títulos repetidos.

## KIT PENDIENTE
- Mover extraer.py a scripts/ y ponerlo en la tabla 0.3 como primer paso. [extraer.py (está en la raíz) → scripts/extraer.py] — arbol.py no crea las páginas: rellena los JSON que ya existen y salta las que no tienen (arbol.py:630-650). La guía manda copiar solo scripts/, así que extraer.py se quedaría fuera, y no lo nombra nunca.
- Rescatar el motor fiel de 160944b como versión con nombre propio, separada del rediseño. [src/utils/render.js, src/layouts/Base.astro, src/pages/[...slug].astro y scripts/arbol.py (huecoTitulo)] — El render.js de HEAD pinta marcado propio (render.js:4-5: 0 elementor-element y 0 data-id) y Base.astro no carga las hojas de Elementor. 160944b es el último estado fiel completo; 75f5157 no tiene el hueco de la banda de título.
- arbol.py: imprimir el recuento de cada widgetType y fallar si hay alguno desconocido; listar los shortcodes (en widgets y en texto) con su número de páginas; no tocar las comillas de lo que va entre corchetes; separar el id 0 de un menú desconocido y fallar con la lista de páginas. [scripts/arbol.py (494-495, 165-178 y 666)] — Hoy descarta en silencio, publicó [modula id=«2806»] y manda en silencio los menús desconocidos al menú por defecto.
- arbol.py y render fiel: leer height, custom_height, height_inner, column_position y content_position, y pintar elementor-section-height-{full|min-height} y items-{posición}. Quitar min_height, que no existe. [scripts/arbol.py (569-571), src/utils/render.js fiel (197)] — 105 secciones de pantalla completa (100vh) salían como height-default.
- Tratar el container (e-con, content_width, flex_direction, fondo y relleno) como un nodo propio, y procesar los widgets de icono (icon, icon-box, icon-list, social-icons) y hover_animation. [scripts/arbol.py (590-594, 356-497 y 391-413), src/utils/render.js] — El container se aplana a una sección con una columna, y los widgets de icono caen en el descarte silencioso.
- Nuevo comparador de marcado por data-id: clases como conjunto, data-* como objeto, agrupado por tipo con lo que falta y lo que sobra, armazón y contenido por separado, informe en informes/comparacion-marcado.md, código de salida distinto de 0, el mismo lector de HTML para los dos lados, saltar los data-id anidados y una lista configurable de atributos que cambian (data-rsssl…). [scripts/comparar-marcado.mjs (nuevo)] — No existe y nunca ha existido (git log --all). Es la herramienta central de la copia fiel del V4.
- Nuevo montador de la referencia: guarda el HTML de todas las páginas, reescribe las direcciones absolutas en el HTML y en las hojas (también //dominio y https:\/\/dominio), enlaza las hojas renombradas, baja el JavaScript y los url(), falla si queda alguna dirección absoluta y sirve la referencia en el 8090. [scripts/montar-referencia.mjs (nuevo), package.json y .claude/launch.json] — referencia/ no existe. comparar-visual.mjs:8 y capturar-referencia.mjs:9 la dan por hecha. muestra-viva/portada.html tiene 587 direcciones absolutas.
- descargar-estructura.mjs: guardar también el HTML crudo de cada página en referencia/, al mismo ritmo. [scripts/descargar-estructura.mjs (89-91)] — Ya recibe el HTML de las 263 páginas y lo tira. Así se tiene todo sin una muestra.
- Nuevo barrido de 400/404 con Playwright: recorre la página para que carguen las imágenes perezosas, separa fotos, tipografías y otros, cuenta como fallo las peticiones abortadas por route() salvo las de una lista blanca, escribe un informe y sale con código distinto de 0. [scripts/barrido-404.mjs (nuevo), reutilizando el bucle de comparar-visual.mjs:39-53] — No hay ningún script que escuche las respuestas del navegador. comparar-visual.mjs:35 y capturar-referencia.mjs:33 abortan en silencio todo lo externo.
- Nuevo script de contraste: compone las capas con su transparencia, ::before y ::after, y los hermanos superpuestos. Si una capa es una foto, el resultado es 'foto'; si no cargó, 'desconocido' (cruzando con el barrido de 404). [scripts/contraste.mjs (nuevo)] — La comprobación de ANALISIS §10 se hizo a mano en una sesión y no quedó en el kit.
- comparar-visual.mjs: comparar también la y; sacar los tipos de un fichero de inventario en vez de una lista fija (a la actual le falta 'legal'); medir 1400 y 390 en una sola pasada; listar lo que sobra en la nueva; salir con código distinto de 0. [scripts/comparar-visual.mjs (17-24, 27, 130-132 y 161)] — Hoy solo compara x, ancho y alto en 6 páginas fijas y no devuelve ningún código.
- Un arranque de navegador común para todos los scripts de capturas: channel 'chrome' como capturar.mjs:21, o comprobar el navegador de Playwright y fallar con 'npx playwright install chromium'. Quitar la ruta /tmp/cc. [scripts/capturas.mjs (34-36), scripts/capturar-referencia.mjs (10 y 28), scripts/comparar-visual.mjs (30)] — Dependen de process.env.CHROMIUM, el Chromium 1243 que pide Playwright no está instalado y tres de los cuatro no arrancan.
- Nuevo script que junte en una imagen la captura de la web vieja y la de la nueva, por tipo y por ancho. [scripts/lado-a-lado.mjs (nuevo)] — Los *-original-vs-nueva.png de 'Claude outputs/' se hicieron fuera del kit.
- comparar-encabezados.mjs: comparar el nivel de cada encabezado con su pareja encontrada por el puntero, no solo cuando las dos listas tienen la misma longitud. Escribir el informe completo en disco. [scripts/comparar-encabezados.mjs (154-166 y 186-187)] — Tal como está, el control de nivel solo funciona en 3 de las 263 páginas.
- validar.mjs: FALLO si queda un shortcode literal [nombre …]; avisar de las fotos de fondo del árbol que faltan, y FALLO si el bloque no tiene velo ni color; pasar los 404 de origen de imagenes-fallidas.txt a una lista de fallos del original; canonical = https://DOMINIO + ruta con barra final; informe completo en informes/. [scripts/validar.mjs (184-185, 191, 202-218 y 236-237)] — Hoy no vio el texto de Modula, solo revisa los fondos del CSS y recorta la salida.
- Que todos los descargadores salgan con código 1 si algo falla. [scripts/descargar-imagenes.mjs (130-138), descargar-estructura.mjs (122-125), descargar-legales.mjs (40-42), descargar-muestra.mjs (51-53), descargar-css.mjs (94 y 124)] — Ahora terminan con 0 aunque haya fallos, así que ni errorlevel ni && detectan una descarga a medias.
- descargar-legales.mjs y legales.mjs: sacar la lista de legales del XML y del menú legal, bajar y comparar TODAS, no sobrescribir nunca un texto bueno con uno vacío y FALLAR si alguna tiene menos de N caracteres. [scripts/descargar-legales.mjs (18-23, 35-38, 41 y 47), scripts/legales.mjs (49-51)] — /politica-de-cookies/ salió con 0 caracteres y nadie se enteró. politica-privacidad traía en el XML el texto por defecto de WordPress.
- descargar-css.mjs: si una hoja da 404, pesa menos de ~1 KB o no contiene '{', pedir la página, esperar y volver a bajarla; al final, dar como fallo las páginas con árbol que sigan sin hoja. Usar la lista sacada del <head>, no COMPARTIDAS. [scripts/descargar-css.mjs (27-38, 50, 53-58)] — Las post-{ID}.css se generan al vuelo y hoy un error guardado con código 200 se da por bueno.
- Sacar el orden de las hojas del <head> de cada página, con <link> y <style>, agrupar las páginas por secuencia y generar las comunes de cada grupo. Quitar el CORTE fijo y los duplicados. [scripts/css.mjs (184 y 197-198), scripts/descargar-muestra.mjs (40-68), css-original/comunes/] — El corte de 17 vale para todas las páginas, pero detrás de post-ID quedan de 5 a 7 hojas según la página. Hay duplicados que se cargan dos veces: 03-all y 03-fontawesome, 10-eael y 20-eael.
- Ampliar la expresión del descargador de fotos a cualquier ruta bajo /wp-content/uploads/ (como ya hace descargar-css.mjs) y cambiar el dominio que se quedó en el comentario. [scripts/descargar-imagenes.mjs (6 y 34)] — No coge uploads/elementor/thumbs/, y el comentario dice 'prefabricadascasas.es'.
- fuentes-locales.mjs: comprobar el woff2 exacto que va a usar y salir con exit 1 en vez de dar un aviso. Fijar las versiones exactas en package.json, sin ^, y comprobarlas contra el ?ver= de la hoja original. [scripts/fuentes-locales.mjs (49-52, 78, 84 y 128), package.json (38)] — Los paquetes que faltan se saltan sin decir nada. simple-line-icons está instalado en 2.5.5 y el original usa 2.4.0.
- imagenes.js: servir la webp con <picture> manteniendo el src original; usar EQUIVALENTES solo con el visto bueno del propietario; añadir decoding=async en sanearImagenes. [src/utils/imagenes.js (54-62, 91, 105 y 114-119)] — La URL .jpg que tiene indexada Google desaparece de la página, y se sustituyen fotos sin preguntar.
- Render fiel: un contador por página para las primeras imágenes sin lazy (y un Set de las ya pintadas), srcset con las variantes de la misma proporción, y data-settings con background_background, _animation y stretch_section. [src/utils/render.js fiel (65-67, 158, 169 y 201)] — Hoy todas las imágenes van con lazy y ninguna lleva srcset ni data-settings.
- limpiar_html: pasar los enlaces externos //x a https://x y convertir '...' en '…' (wptexturize). [scripts/arbol.py (126 y 137-178)] — La web viva dice 'posibilidades&#8230;' y el JSON 'posibilidades...'.
- Inventario de la Fase 0: agrupar las páginas por la huella de su árbol (bloques y menú) y escribir un único fichero de tipos que lean los cuatro scripts. Añadir el inventario de tipografías e iconos con su versión. [scripts/inventario.mjs (7-8), descargar-muestra.mjs (19-27), capturas.mjs (16-24), capturar-referencia.mjs (13-21), comparar-visual.mjs (17-24)] — Hay cuatro listas escritas a mano y no coinciden.
- Header.astro: avisar en la compilación si falta un menú. El menú por defecto se saca del HTML vivo de una página con id 0. [src/components/Header.astro (22), src/data/site.json (167)] — Hoy cae en silencio a menuPorDefecto, que se puso a mano.
- package.json: un 'todo' que anuncie [n/6] y diga en qué paso se para (scripts/todo.mjs), un 'todo:visual' aparte, "engines": {"node": ">=18"}, órdenes para servir la referencia y la preview, y el alias fa5 solo si hacen falta los SVG de FA5. [package.json (19)] — 'todo' encadena con && y no dice qué falló. La guía le atribuye comprobaciones que no tiene.
- Imponer el bloqueo antes de subir: un hook pre-push, o que netlify.toml ejecute 'npm run css && npm run build && npm run validar && npm run comparar'. [netlify.toml (5), .git/hooks] — validar.mjs:6 dice que no se sube nada que no pase la validación, pero nada lo impone: no hay hooks ni CI.
- Plantilla de .gitignore: node_modules/, dist/, .astro/, *.xml, *.zip, referencia/, capturas*/, informes/, descargas/, *.log, *-fallidas.txt, 'Claude outputs/', muestra-viva/ y public/css/. Sacar de Git public/css (260 ficheros) y los 89 woff2 de Google Fonts que no se usan. [.gitignore] — Por 'git add .' y 'git add -A' entraron en Git 41 ficheros de muestra-viva/, 21 de 'Claude outputs/' y los *-fallidas.txt. public/css sigue en Git aunque está ignorado.
- Plantilla de netlify.toml con el bloque X-Robots-Tag noindex y su comentario. La redirección *.netlify.app sigue comentada, y '/?p=*' va a la portada en contra de la guía. [netlify.toml, public/_redirects (33 y 49)] — El noindex se quitó en f6572ee y la plantilla no lo conserva. La redirección no está activa.
- Plantilla .cmd genérica para el anexo sin terminal: cd a la raíz, comprobar node 18, errorlevel después de cada call con el nombre del paso, registro en descargas\ y pause. [scripts/plantillas-cmd/plantilla.cmd (nuevo); corregir ARREGLAR.bat (19)] — Las .bat actuales no comprueban node, dan un mensaje de error genérico, no dejan registro y ARREGLAR.bat da por terminado un 'todo' que ha fallado.
- Que las reglas de color de diseno.css se limiten a un contenedor (#main o .bloque) en vez de aplicarse a etiquetas en toda la página. [src/styles/diseno.css (58-68 y 73-87)] — Incumple la regla de la Fase 3 y la del V4 sobre el alcance de las reglas: es la vía del error del menú blanco sobre blanco.
- Marcar descargar-fuentes.mjs como 'solo para lo que no esté en npm' y ponerle al día LEEME.md. [scripts/descargar-fuentes.mjs, LEEME.md (62-69)] — El LEEME dice que la banda de título 'ahora se lee', pero arbol.py:686-702 dice que no se enseña en ninguna página.

## ESTRUCTURA V5
- Portada: para qué sirve la guía y cómo leerla, más el INTERRUPTOR de entorno: '¿Claude puede ejecutar comandos y llega al dominio?'. Si sí, Partes 1-8. Si no, además el Anexo A. (Nuevo, a partir de V4 A1 y de nuestra Parte 5.)
- Parte 1 — Antes de empezar (lo que tienes que tener tú). Base: nuestra Parte 1. Añadir el export de Search Console Rendimiento → Páginas (V4 E Fase 0) y la decisión de cómo se hará el rediseño (V4 H3).
- Parte 2 — Cómo trabajamos y cómo pedir las cosas. Base: nuestra Parte 2. Añadir del V4: el estado de cada cambio (A1/H3), 'sigue igual' con un orden fijo (A4), las capturas las hace Claude (A5, sustituye a nuestro punto 5), reproducir antes de proponer (A6), informes en disco y no listar carpetas enormes (A6).
- Parte 3, Fase 0 — Reconocimiento, sin escribir código. Base: nuestra 0.1-0.3 junto con V4 E Fase 0: tipos de diseño, cabeceras y su ajuste, recuento de widgets, section y container, iconos SVG o tipografía, JavaScript necesario (elementor-invisible, stretch_section), lista de plugins sacada del HTML, Search Console y comprobación del entorno (Node 18, navegador de Playwright). La tabla 0.3 indica el commit del motor fiel (160944b) y pone extraer.py como primer paso.
- Parte 3, Fase 1 — Bajar todo y montar la referencia. Base: nuestra Fase 1 junto con V4 E pasos 1-7, A5 (receta) y C2. HTML de TODAS las páginas, hojas con post-{ID}.css recuperadas, thumbs, JavaScript, reescritura de las direcciones absolutas y referencia con 0 errores 404 como cierre. Antes del primer commit, el .gitignore completo; en el primer despliegue, noindex (V4 G).
- Parte 3, Fase 2 — Copia fiel. Primero el comparador de marcado (V4 C1), después el armazón sacado del HTML real (V4 E8), lo que pintan los plugins (V4 B1.3 y E9) y el motor llevado a 0 diferencias (V4 E11). Se mantienen nuestras casillas: npm, unicode-range, comillas, kit-N y las excepciones en ficheros de datos. Al final, 'Fallos del original' (nuestra Fase 2 + V4 D, guardados en informes/fallos-original.json) y capturas lado a lado.
- Parte 3, Fase 3 — Rediseño. El método sale del V4 H1-H5: opciones en imagen, una página primero, interruptor como hoja propia o rama, variables --e-global-*, y si no gusta se apaga y se guarda. El contenido técnico sale de la nuestra: la caja, la foto principal en webp con srcset y medir antes y después. Consolidar en marcado propio es un paso posterior y opcional, medido.
- Parte 3, Fases 4 a 8 — Contenido y SEO, formularios, velocidad, mudanza y auditoría. Se quedan como están en nuestra guía, con estos cambios: canonical y og absolutos, y trailingSlash en la configuración base (V4 G); la redirección de netlify.app está en public/_redirects y no en netlify.toml; compilar desde un clon limpio antes de empujar (V4 A7/G).
- Parte 4 — Las comprobaciones. Base: V4 F, con nuestras excepciones en ficheros de datos y las mediciones de antes y después. Encabezados (con el nivel arreglado), marcado, geometría a 1400 y 390, contraste con capas, 404 y el validador. 'todo' y 'todo:visual'; ninguna se puede saltar; cada fallo visto a ojo pasa a ser FALLO; si falla, no se sube nada.
- Parte 5 — Errores que ya nos pasaron y reglas. Base: nuestra Parte 4. Añadir los errores reales del V4: rediseño que siguió en Netlify, 'npm run datos', titular pasado a negro, 87 falsos por el overlay, span.text-wrap, muestra de 13 páginas, cabecera que faltaba en 82 páginas. Y los de casas que salieron al verificar: Modula publicada como texto, legal vacía, 105 secciones de 100vh y 'git add -A' metiendo carpetas que no tocaba. Añadir la regla innegociable de C2.
- Parte 6 — Anexo técnico del marcado de Elementor y de WordPress. Sale del V4 B1-B7 y de la tabla de ANALISIS §8: altura de sección, e-con, data-settings, overlay, srcset y lazy, iconos FA5, lo que cambia WordPress al publicar, orden de las hojas por página y versiones exactas.
- Parte 7 — Plantillas. CLAUDE.md (nuestra Parte 5, con la línea de estado, la regla de no listar carpetas enormes y qué shell usar en Windows), .gitignore, netlify.toml con noindex y el mapa del kit: script → qué genera → ¿lo ejecuta Netlify? → ¿va en Git?
- Parte 8 — El mensaje para empezar. Nuestra Parte 6, eligiendo una sola opción de Git y sin la contradicción interna del V4.
- Anexo A — Si trabajas sin terminal. Sale del V4 A1-A5: reparto de papeles, plantilla .cmd (requisitos, [n/N], parar en el primer error nombrando el paso, pause y registro), npm install primero, 'falta que lo subas tú', mirar la carpeta y .git (con la nota de los worktrees), y los límites de 50 ficheros y 7 carpetas.
- Anexo B — El kit. Lista de scripts con su estado (funciona, a medias o pendiente, con fichero:línea) y la lista de mejoras pendientes antes de la próxima migración.

## DUDAS PARA YAMA
- En la próxima migración, ¿Claude va a trabajar en Claude Code (ejecuta comandos y puede subir a Git) o en un entorno sin terminal como el de renders.studio? ¿Y quién hace el push a main? De eso depende si el modo 'sin terminal' va en un anexo o es la base de la guía.
- Copia fiel: ¿quieres reproducir exactamente el marcado de Elementor y medirlo con un comparador por data-id (método del V4, rescatando el motor de 160944b), o ir directamente a marcado propio como hizo casascontenedores después del rediseño? Lo primero da una copia demostrable; lo segundo ahorra trabajo, pero no se puede comparar elemento a elemento.
- Rediseño: ¿adoptamos el método del V4 (dos o tres opciones en imagen, una sola página primero y una hoja con interruptor que se apaga sin tocar el motor), o seguimos como en casas, con la rama 'rediseno' y el rediseño aplicado a todas las páginas? El velo de la foto y la cabecera (clara o barra oscura) ¿se presentan como opciones?
- Contraste: ¿quieres un corrector automático (una hoja generada, con el ID del constructor y medida con la hoja desactivada) o prefieres que los arreglos de contraste sean siempre manuales y con tu permiso, como ahora?
- ¿Arreglamos el kit en el propio repositorio de casascontenedores (sacar de Git muestra-viva/, 'Claude outputs/', public/css y los 89 woff2 que no se usan; servir las webp sin cambiar la URL de las fotos; activar la redirección de *.netlify.app; decidir qué hacer con las fotos sustituidas por EQUIVALENTES), o preparamos un kit aparte para la v5 y casascontenedores no se toca?