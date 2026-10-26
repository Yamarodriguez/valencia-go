# Plan: web de la empresa de turismo nueva, usando la migración como base

Fecha: 26-10-2026. Estado: propuesta, sin empezar. Nada de lo que dice aquí
está hecho todavía.

## 1. La idea en tres líneas

valenciaandgo.com sigue funcionando y su migración (Fases 0-7) sigue aparte.
Para la empresa nueva **no se clona la web**: se aprovecha el motor, los
guiones y las comprobaciones que ya funcionan, y sobre eso va una web pequeña,
con marca, textos, fotos, legales y reservas propios, que crece cuando haga
falta.

## 2. Qué hay hoy y qué se puede aprovechar

Lo que tiene la copia de valenciaandgo.com (mirado el 26-10-2026):

| Qué | Cuánto | ¿Sirve para la empresa nueva? |
|---|---|---|
| Páginas capturadas del HTML vivo | 1.024 (204 en castellano, 816 en inglés, francés, italiano y polaco) | **No.** Son los textos de la empresa vieja. Dos webs con el mismo texto se perjudican en Google y el contenido no es tuyo para la nueva. |
| Fotos | 861 originales (1.262 ficheros, 202 MB) | **No.** Los derechos son de valenciaandgo. Hacen falta fotos propias o con licencia. |
| Logo | logo-valenciaandgo-azul.png y un isologo en SVG | **No.** Logo nuevo. |
| Nombre y dominio | "Valencia&Go" 9.179 veces; valenciaandgo.com 52.809 veces | **No.** En una web nueva no hay que reemplazar nada: nace con el nombre nuevo. |
| Reservas Turitop | en 1.021 páginas, ligadas a la cuenta de la empresa vieja | **No.** Cuenta de reservas propia. |
| Páginas legales | aviso legal, privacidad, cookies, condiciones de compra, en 5 idiomas | **Solo la estructura.** Los datos (razón social, CIF, dirección) son de la otra empresa. |
| Motor Astro (Base.astro, [...slug].astro, 404) y netlify.toml | — | **Sí**, tal cual. |
| Formularios de Netlify sin salir de la página, con aviso en el idioma de la página y evento en Analytics | — | **Sí**, cambiando el correo de destino. |
| Velocidad: aplazador de guiones, precarga de letras, reglas de especulación, webp, lazy | — | **Sí.** Gran parte sobra al no haber Elementor, y lo que queda ya está hecho. |
| Comprobaciones: `npm run todo` y `todo:visual` (enlaces, encabezados, marcado, 404, geometría, contraste, validador) | — | **Sí**, tal cual. |
| Guiones de Fase 4: `nueva-pagina.mjs` (página desde una ficha JSON), `aplicar-ampliacion.mjs` (secciones SEO y FAQ con su marcado), `botones-descriptivos.mjs`, `corregir-erratas.mjs` | — | **Sí.** Son justo lo que pide una web hecha desde datos. |
| Tres opciones de rediseño (civitatis, getyourguide, propio) con capturas en escritorio y móvil | — | **Sí, como punto de partida de gusto.** Se rehacen con los colores y la letra de la marca nueva. |
| Redirecciones, mapas del sitio de Yoast, alias `?p=ID` | — | **No.** Son direcciones de la web vieja. |

En resumen: se queda la **maquinaria**, se va el **contenido**.

## 3. Decisiones que tienes que tomar tú (antes de empezar)

Nada de esto lo puedo inventar. Lo pongo en el orden en que bloquea el trabajo.

1. **Nombre de la empresa y dominio.** El dominio se compra en el registrador
   que prefieras (donde está valenciaandgo.com, por ejemplo) y se apunta a
   Netlify. Correo del dominio: decidir si va a ir con Google Workspace,
   con el registrador o con otro; se configura antes de tocar DNS.
2. **Logo** en SVG, o PNG grande con fondo transparente, en versión para fondo
   claro y para fondo oscuro. Colores de marca (dos o tres) y, si la tienes,
   la letra.
3. **Catálogo.** Lista de tours o experiencias con los hechos de cada una:
   nombre, qué incluye, duración, punto de encuentro, precio, idiomas, tamaño
   del grupo, qué días. Sin eso no hay página.
4. **Fotos propias** por tour (mínimo 3 por tour, y una grande para la
   portada), con derechos de uso. Si no las hay todavía, se arranca con fotos
   de banco con licencia y se cambian después.
5. **Sistema de reservas.** Turitop de nuevo con cuenta propia, otro
   (Bokun, FareHarbor, Regiondo…) o, para empezar, solo formulario y WhatsApp.
   Cambia el botón de "Reservar" y las condiciones de compra.
6. **Datos legales de la empresa nueva:** razón social o autónomo, CIF/NIF,
   dirección, correo, y lo que te diga tu gestoría sobre la actividad
   (en la Comunitat Valenciana la actividad turística tiene registros y
   requisitos propios; eso lo confirma la gestoría, yo no lo invento).
7. **Idiomas.** Lo normal es arrancar en castellano e inglés y añadir el resto
   cuando haya textos. Cada idioma multiplica el contenido, no el trabajo
   técnico.
8. **Cuentas:** GitHub (repositorio nuevo), Netlify (sitio nuevo), Google
   Analytics 4, Search Console, perfil de empresa de Google y WhatsApp
   Business. Las creas tú; yo te digo qué poner en cada una.

## 4. Fases

Una fase por conversación, como en la migración. Al cerrar cada una se
actualiza el CLAUDE.md del proyecto nuevo con lo hecho y lo pendiente.

### N0. Arranque: datos y decisiones (1 sesión)
- Rellenas la lista de la sección 3. Te preparo un fichero `datos.md` con
  huecos para que lo completes, y de ahí sale el `site.json` nuevo.
- Compras el dominio y creas repositorio y sitio de Netlify (te doy los
  pasos uno a uno).
- **Cierre:** nombre, dominio, logo, colores, catálogo y datos legales en
  mi mano, aunque falten fotos.

### N1. Proyecto nuevo con la maquinaria (1 sesión)
- Carpeta nueva (por ejemplo `D:\web\<nombre>`), repositorio nuevo. Se copian
  del proyecto de valenciaandgo: motor, `scripts/`, `netlify.toml`,
  `formularios.js`, `aplazador.js`, Font Awesome local, el hook de
  comprobaciones. **No se copian** `src/content/paginas/`, `public/wp-content/`,
  redirecciones, mapas del sitio ni los XML.
- Netlify despliega `main` con `X-Robots-Tag: noindex` hasta el lanzamiento.
- **Cierre:** web vacía (portada de prueba) desplegada en
  `<nombre>.netlify.app`, comprobaciones a 0.

### N2. Plantillas propias con la marca (2-3 sesiones)
- Marcado propio, sin Elementor (lo que la Fase 3 del método deja como
  "opcional, más adelante"). Seis plantillas: portada, tour, lista de tours,
  entrada de blog, página suelta (quiénes somos, contacto), legal.
- Primero **dos o tres opciones en imagen** de la portada y de un tour,
  partiendo de las tres hojas de rediseño que ya existen pero con tu logo,
  colores y letra. Eliges una; se prueba en una página; luego en todas.
- Ancho, contraste y foto principal según las reglas de la Fase 3.
- **Cierre:** apruebas el diseño viendo la web de pruebas en móvil y
  escritorio.

### N3. Contenido (2-4 sesiones, según el número de tours)
- Cada tour es una ficha de datos (JSON o Markdown) con los hechos que me des.
  `nueva-pagina.mjs` monta la página; `aplicar-ampliacion.mjs` añade la FAQ
  con su marcado `FAQPage`.
- Los textos los redacto a partir de tus hechos y los revisas; **ningún
  precio, plazo, norma ni testimonio inventado**.
- Fotos en webp a varios tamaños, con medidas reales para que la página no
  salte, y las primeras sin carga perezosa.
- Datos estructurados de cada tour (producto u oferta turística) para que
  Google los entienda.
- Botones que dicen adónde llevan. Ninguna página huérfana: cada una
  enlazada desde menú, rejilla y texto.
- **Cierre:** `todo` y `todo:visual` a 0, y revisas una muestra.

### N4. Reservas, contacto y medición (1 sesión)
- Botón de reservar con el sistema que hayas elegido.
- Formularios de Netlify con el correo de destino nuevo; WhatsApp con un
  mensaje distinto según la página; GA4 con evento de contacto; Search
  Console preparado.
- **Cierre:** recibes un envío de prueba y una reserva de prueba.

### N5. Idiomas (1 sesión por idioma, si los quieres)
- Misma estructura con `/en/`, `/fr/`… y `hreflang` entre versiones.
- Traducción desde tu texto en castellano, revisada por ti o por alguien
  que hable el idioma.

### N6. Legales, SEO técnico y velocidad (1 sesión)
- Aviso legal, privacidad, cookies y condiciones con los datos de la empresa
  nueva y lo que diga la gestoría. Aviso de cookies acorde a lo que se cargue
  (si solo hay GA4 con consentimiento, el aviso es sencillo).
- Mapa del sitio, robots, 404 propia, favicon, imágenes para redes.
- Medida de velocidad sobre la web compilada, en móvil con 4G lenta.
- **Cierre:** comprobaciones a 0 y velocidad medida.

### N7. Lanzamiento (1 sesión, el día que digas)
- Quitar el noindex, DNS en el registrador (correo configurado antes),
  Search Console con el mapa del sitio, perfil de empresa de Google.
- Al ser dominio nuevo no hay redirecciones que hacer ni posicionamiento que
  conservar: Google empieza de cero, y lo que manda es el contenido propio y
  las reseñas.

## 5. Lo que NO conviene hacer

- **Copiar la web vieja y cambiarle nombre y fotos.** Quedarían 60.000
  referencias que reemplazar en 1.024 páginas de HTML de Elementor, los
  textos seguirían siendo de la otra empresa, Google lo vería como duplicado
  y cualquier retoque de diseño sería un parche sobre otro parche.
- **Mezclar los dos proyectos** en la misma carpeta o repositorio. La
  migración de valenciaandgo tiene pendiente su Fase 7 y debe seguir limpia.
- **Reutilizar fotos o textos** de valenciaandgo "mientras tanto". Mejor una
  web pequeña y limpia que una grande con contenido ajeno.

## 6. Tamaño orientativo

| Arranque | Páginas | Sesiones aproximadas |
|---|---|---|
| Mínimo (castellano, 5 tours, blog vacío) | 12-15 | 7-9 |
| Normal (castellano e inglés, 10 tours, 5 entradas) | 40-50 | 10-13 |

Cada idioma más añade una sesión y las páginas de ese idioma. Las sesiones
son de trabajo mío; lo que tarde el conjunto depende sobre todo de cuándo
tenga los datos, las fotos y tus decisiones.

## 7. Lo primero que necesito de ti

Para empezar la fase N0 basta con:

1. Nombre de la empresa y dominio elegido (aunque no esté comprado).
2. Logo y colores, o decirme que hay que diseñarlos (puedo proponer
   opciones).
3. La lista de tours con sus hechos, aunque sea en un correo o en una nota.
4. Qué sistema de reservas quieres, o "de momento formulario y WhatsApp".
5. Idiomas con los que arrancamos.
