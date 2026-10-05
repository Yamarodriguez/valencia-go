# Análisis de la migración de casascontenedores.es

Qué falló, por qué falló, y qué hay que hacer distinto la próxima vez.

---

## 1. El error de fondo: reconstruir en vez de copiar

El primer intento partía de una idea equivocada: **leer el contenido de
WordPress y volver a construir el diseño**. De ahí salieron varios fallos
encadenados, y explica por qué durante días la web "se parecía" pero nunca era
igual.

Lo correcto es lo contrario: **copiar el diseño real y no reconstruir nada**.
La web en vivo ya tiene el HTML y el CSS que queremos. No hay que interpretarlo,
hay que traerlo.

Tres consecuencias concretas de aquel enfoque:

**a) Se usó el campo equivocado del export.**
El XML de WordPress trae dos cosas. `content:encoded` es el texto ya renderizado:
ha perdido las columnas, los anchos, las separaciones. `_elementor_data` es el
árbol completo (secciones → columnas → widgets) con todos sus ajustes. El primer
intento usó `content:encoded` y trató de adivinar la maquetación con expresiones
regulares. Nunca podía salir bien.

**b) Se escribió CSS propio imitando el diseño.**
Unas 600 líneas de estilos "medidos a ojo" del sitio real. Cada ajuste acercaba
un poco y rompía otra cosa. La web real carga **26 hojas de estilo**; imitarlas
a mano es imposible.

**c) El CSS propio ganaba al original.**
Cuando por fin se cargaron las hojas reales, el CSS propio seguía ahí y se carga
**el último**, así que ganaba siempre. Definía `body { color: #7A7A7A; font-family: ... }`,
`.entrada { font-size: 14px }` y `.formulario *{ font-family: ... }`. Resultado:
todo el texto del sitio salía de otro color, otro tamaño y otra letra que en la
web en vivo. Se arregló **borrando** esas reglas, no añadiendo más.

> **Regla:** la hoja propia solo lleva lo que NO existe en el original
> (cabecera hecha a mano, pie, botón flotante, anuncios). Nunca color, tamaño
> ni tipografía del contenido.

---

## 2. El fallo más caro: el limpiador de CSS borraba reglas buenas

Este causó los huecos blancos de la portada y costó varios días de idas y venidas.

Elementor escribe los fondos así:

```css
.elementor-2 .elementor-element-0176463:not(.elementor-motion-effects-element-type-background) > .elementor-widget-wrap,
.elementor-2 .elementor-element-0176463 > .elementor-widget-wrap > .elementor-motion-effects-container > .elementor-motion-effects-layer
{ background-image: url(...) }
```

El limpiador quitaba las reglas cuyas clases no aparecían en el HTML. Las clases
`motion-effects` no aparecen — pero es que **una clase dentro de `:not()` no
tiene que existir**: precisamente dice "cuando NO esté". El limpiador la exigía,
daba la regla por inservible y la borraba. Con ella se iba el fondo oscuro de la
sección, y la letra blanca se quedaba sobre blanco.

Eso es lo que se veía como "zonas vacías" en el banner de Diseños 3D, en el
bloque de PRECIOS y en la franja verde de ventajas.

> **Regla:** un limpiador de CSS es una optimización, no una necesidad.
> **No adelgazar el CSS hasta que la web esté idéntica**, y cuando se haga, que
> ignore lo que va dentro de `:not()`, `:is()`, `:where()` y `:has()`, y que
> recorte selectores de la lista en vez de tirar la regla entera.

---

## 3. Las hojas de estilo: cuáles y en qué orden

Dos errores distintos:

**Faltaban 10 de las 26 hojas** que carga la página real (entre ellas la de los
widgets de Elementor y las seis de tipografías). La web nueva cargaba 215 reglas
donde la original carga unas 6.000.

**El orden estaba mal.** En la web real la secuencia es:

```
01..17   tema + Elementor + kit + widgets básicos
post-ID.css                    <-- la hoja de ESTA página
18..26   widgets de Elementor + tipografías
```

La hoja de la página va **en medio**, no al final. Se resolvió generando dos
hojas comunes (`comunes.css` y `comunes-final.css`) con la de la página entre
ellas.

> **Regla:** sacar la lista de hojas del `<head>` de **varias** páginas de la web
> real (una de cada tipo), unirlas conservando el orden, y numerar los ficheros
> con ese orden en el nombre.

---

## 4. Lo que el HTML no dice: divs que Elementor añade

El "velo" (*background overlay*): cuando una sección lleva un velo sobre la foto,
Elementor mete dentro un `<div class="elementor-background-overlay"></div>` vacío
y le cuelga a ese div el color del velo desde la hoja de la página. Sin el div,
la regla no tiene a qué aplicarse y el velo desaparece.

> **Regla:** comparar el HTML generado con el HTML real y contar los elementos
> por clase. Si el original tiene 7 `elementor-background-overlay` y el nuevo 0,
> falta algo estructural.

---

## 5. Las fotos que no están en el texto

10 fotos de fondo (las franjas oscuras: "Ventajas de las casas de Contenedores",
la de presupuesto, la del diseño 3D) **se usan 1.295 veces** repartidas por casi
las 263 páginas, y ninguna estaba descargada. El descargador solo miraba los
JSON de contenido; esas fotos viven en el **CSS**.

Y no se notaba: en el HTML no hay ninguna imagen rota, simplemente esas franjas
salen de color liso.

> **Regla:** el descargador de imágenes tiene que recorrer **el contenido Y las
> hojas de estilo**. Y el validador tiene que comprobar que existe el fichero de
> cada `url(...)` del CSS, como **fallo**, no como aviso.

---

## 6. Los iconos y las letras no son imágenes, son tipografías

Los iconos de las tarjetas (rayo, reloj de arena, hoja) son Font Awesome: cada
"letra" es un icono. Sin el fichero `.woff2`, el navegador pinta un cuadrado
vacío. Lo mismo con Roboto: sin el fichero, cada palabra mide un ancho distinto
y los títulos que ocupaban una línea pasan a ocupar dos.

Se intentó descargarlas del servidor antiguo: 107 ficheros, con nombres ilegibles
generados por Elementor, y muchos de alfabetos que la web no usa (cirílico,
griego, vietnamita).

**La solución buena fue no descargarlas.** Font Awesome, Simple Line Icons,
Roboto, Roboto Slab, Roboto Condensed, Abel, Satisfy y Ubuntu están todas en npm
con su versión exacta. Un `npm install` y un script de 60 líneas que copia los
ficheros y genera la hoja `@font-face`. 40 ficheros, 896 KB, sin depender del
servidor viejo.

> **Regla:** antes de montar un descargador contra el servidor antiguo, mirar si
> el recurso está en npm. Las tipografías y los paquetes de iconos casi siempre
> lo están, y con la versión exacta (la pone el comentario de cabecera del CSS).

---

## 7. Fallos del original que hay que decidir, no copiar

**La banda de título.** 7 páginas llevan una franja gris con el nombre de la
página. Su texto —el H1 y las migas— está en **blanco sobre gris claro**: no se
lee. Lo que se ve es una franja gris vacía de 45 px.

Copiarla tal cual es malo (H1 invisible, y a Google no le gusta el texto oculto).
Copiarla legible también es malo (la web nueva enseña algo que la vieja no).
La decisión fue: **quitar el texto, dejar el hueco**.

Y aquí estuvo la trampa: al quitar la franja entera, la foto principal **tapaba
la barra del menú**. Resulta que la primera sección de esas páginas lleva un
margen superior **negativo de −84 px** que el autor puso contando con que la
franja estuviera ahí. Dejando el hueco vacío de 45 px, la foto queda a 1 píxel
de donde está hoy en la web real.

> **Regla:** un fallo visible del original se le enseña al propietario y se
> decide; no se copia en silencio ni se arregla en silencio. Y antes de quitar
> algo que "no se ve", comprobar que nada dependa de su **espacio**.

---

## 8. Detalles que solo se ven midiendo

| Qué | Síntoma | Causa |
|---|---|---|
| `_inline_size` llega como número pelado (`67.28`), no como `{size:...}` | Todas las columnas al 50 % | El lector solo aceptaba el diccionario |
| Hueco entre columnas emitido como `gap` **y** como `padding` | Rejillas de 4 columnas partidas en 3 | En Elementor el hueco es **padding**, no `gap` |
| Faltaba la clase `elementor-section-full_width` | Secciones a ancho completo encogidas a 1140 px | Elementor lo pone como clase, no como CSS |
| Faltaba la clase `elementor-kit-13` en el `<body>` | Grosores y variables de color mal | El "kit" cuelga de esa clase |
| Se quitaba el `<style>` de los bloques de texto | Tarjetas apiladas a todo lo ancho, +3.246 px de alto | Hay HTML escrito a mano cuyo aspecto vive en ese `<style>` |
| Tamaño de imagen: se usaba la original | Proporciones distintas | Elementor usa la variante `large` por defecto |
| Comillas rectas `"así"` | Texto distinto al de la web real | WordPress convierte a `«así»` al publicar (*wptexturize*) |

---

## 9. Los fallos de método (los que más tiempo costaron)

Estos no son de código. Son de cómo trabajamos.

**Entregar ZIPs.** Los ficheros se entregaban comprimidos y acababan en
`Claude outputs\`, no en la raíz del proyecto. El comando `Expand-Archive` no
encontraba el fichero, fallaba, y los comandos siguientes se ejecutaban con los
scripts **viejos**. Pasó tres veces. Cada vez la respuesta era "sigue igual" y se
perdía una ronda entera buscando un fallo que no existía.

> **Regla:** los ficheros se escriben **directamente** en la carpeta del
> proyecto, sin comprimir. Si hay que comprimir (muchos ficheros), el ZIP se
> deja en la raíz del proyecto y se comprueba después que el contenido llegó.

**No comprobar el estado real.** Se daba por hecho que los comandos se habían
ejecutado. La comprobación (listar `scripts/` y ver que `descargar-fuentes.mjs`
no existía) tardó 10 segundos y habría ahorrado dos rondas.

> **Regla:** ante un "sigue igual", lo PRIMERO es mirar la carpeta del
> propietario: qué ficheros hay, de qué fecha y de qué tamaño. Nunca suponer.

**Una copia de referencia incompleta.** Se montó la web real en local para poder
medirla, pero sus CSS apuntaban al dominio antiguo, así que **no cargaba las
tipografías**. La comparación daba "0 diferencias" porque **los dos lados**
estaban mal. Comparar contra una referencia rota da falsos aprobados.

> **Regla:** la copia de referencia tiene que cargar exactamente lo mismo que
> la web real: hojas, tipografías, imágenes. Comprobarlo mirando los errores 404
> del navegador antes de fiarse de ninguna medición.

**Un validador que aprobaba lo que estaba mal.** Decía "VALIDACIÓN SUPERADA:
el 100 % de las páginas está correcto" mientras faltaban 10 fotos usadas 1.295
veces. Un validador que no comprueba lo que de verdad rompe la web da falsa
tranquilidad.

> **Regla:** cada fallo nuevo que se descubra a ojo se añade al validador como
> **fallo bloqueante**, ese mismo día. El validador crece con los errores.

---

## 10. Lo que sí funcionó y hay que repetir

- **Montar la web real en local** y medirla, en vez de mirar capturas. Una
  comparación de geometría elemento a elemento (posición, tamaño, color, letra,
  alineación) encuentra en segundos lo que a ojo no se ve.
- **Comparar encabezado a encabezado** con la web en vivo, las 263 páginas.
  Es la garantía de que no se pierde estructura ni SEO.
- **Detectar texto invisible por programa**: comparar el color del texto con el
  color de fondo real (subiendo por los padres) y avisar si se parecen. Así
  aparecieron los bloques en blanco sobre blanco, y también el fallo del
  original en la banda de título.
- **Barrer los errores 404** de cada tipo de página con el navegador. Es lo que
  destapó las fotos de fondo y las tipografías.
- **Un solo comando que lo hace todo** (`npm run todo`) y que **no deja subir
  nada si algo falla**.

---

## 11. Resultado final

- 263/263 páginas con los mismos encabezados, en el mismo orden, que la web en vivo.
- 0–1 diferencias de geometría por página frente al original (la que queda es la
  tipografía de un enlace del formulario).
- 0 imágenes, iconos o tipografías que no carguen.
- Diferencia de alto de página entre −4 % y +3 %.
