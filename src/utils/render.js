/**
 * render.js — Pinta el arbol de maquetacion (`bloques`) de cada pagina.
 *
 * Escribe EL MISMO MARCADO que escribia Elementor: las mismas etiquetas, las
 * mismas clases y los mismos identificadores de elemento. Asi las hojas de
 * estilo originales del sitio (una por pagina, en `css-original/`) encajan
 * encima sin tocar nada y el diseno no es una reconstruccion: es el suyo.
 *
 * Por eso aqui NO se genera CSS. Lo unico que decide este modulo es la
 * estructura del HTML. Cualquier valor visual (tamanos, colores, margenes,
 * anchos) sale de las hojas originales.
 *
 * Anadir un tipo de bloque nuevo = anadir una funcion a PINTORES.
 */

const escapar = (s) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const ETIQUETAS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'div', 'span']);

/* Los titulos de Elementor pueden traer HTML por dentro (<strong>, <br>, un
   enlace). Se deja pasar solo un puñado de etiquetas de linea; el resto se
   escapa. */
const LINEA = /^<\/?(?:strong|b|em|i|u|br|span|small|sup|sub|a)(?:\s[^<>]*)?\/?>$/i;

function textoConLinea(t) {
  return String(t ?? '')
    .split(/(<[^<>]+>)/)
    .map((trozo) => (trozo.startsWith('<') && trozo.endsWith('>')
      ? (LINEA.test(trozo) ? trozo : escapar(trozo))
      : escapar(trozo)))
    .join('');
}

/** La clase elementor-col-N que usa Elementor para el ancho de estructura. */
function claseColumna(c) {
  const n = c.anchoBase ?? (c.ancho != null ? Math.round(c.ancho) : 100);
  return `elementor-col-${n}`;
}

/** La clase de separacion entre columnas de una seccion. */
function claseHueco(s) {
  return `elementor-column-gap-${s.hueco || 'default'}`;
}

/* ------------------------------------------------------------- los pintores
   Cada uno devuelve SOLO lo que va dentro de .elementor-widget-container.
   `extra` son clases adicionales para el <div> del widget. */

const PINTORES = {
  encabezado(b) {
    const etiqueta = ETIQUETAS.has(b.etiqueta) ? b.etiqueta : 'h2';
    const dentro = b.url
      ? `<a href="${escapar(b.url)}">${textoConLinea(b.texto)}</a>`
      : textoConLinea(b.texto);
    return {
      html: `<${etiqueta} class="elementor-heading-title elementor-size-default">${dentro}</${etiqueta}>`,
    };
  },

  texto(b, ctx) {
    return { html: ctx.imagenes(b.html) };
  },

  imagen(b, ctx) {
    const img = ctx.imagenes(
      `<img src="${escapar(b.src)}" alt="${escapar(b.alt)}" loading="lazy" decoding="async">`);
    const cuerpo = b.url ? `<a href="${escapar(b.url)}">${img}</a>` : img;
    const pie = b.pie
      ? `<figcaption class="widget-image-caption wp-caption-text">${escapar(b.pie)}</figcaption>`
      : '';
    return { html: pie ? `<figure class="wp-caption">${cuerpo}${pie}</figure>` : cuerpo };
  },

  boton(b) {
    const externo = /^https?:\/\//.test(b.url) && !b.url.includes('casascontenedores.es');
    const extra = externo ? ' rel="noopener" target="_blank"' : '';
    return {
      clases: b.alinear ? [`elementor-align-${b.alinear}`] : [],
      html: '<div class="elementor-button-wrapper">' +
        `<a class="elementor-button elementor-button-link elementor-size-sm" href="${escapar(b.url || '#')}"${extra}>` +
        '<span class="elementor-button-content-wrapper">' +
        `<span class="elementor-button-text">${textoConLinea(b.texto)}</span>` +
        '</span></a></div>',
    };
  },

  separador(b) {
    return {
      clases: ['elementor-widget-divider--view-line'],
      html: '<div class="elementor-divider"><span class="elementor-divider-separator"></span></div>',
    };
  },

  espaciador() {
    return { html: '<div class="elementor-spacer"><div class="elementor-spacer-inner"></div></div>' };
  },

  mapa(b) {
    const q = encodeURIComponent(b.direccion || '');
    return {
      html: '<div class="elementor-custom-embed">' +
        `<iframe loading="lazy" title="${escapar(b.direccion)}" aria-label="${escapar(b.direccion)}"` +
        ` src="https://maps.google.com/maps?q=${q}&amp;t=m&amp;z=${b.zoom || 10}&amp;output=embed&amp;iwloc=near"` +
        ' referrerpolicy="no-referrer-when-downgrade"></iframe></div>',
    };
  },

  formulario(b, ctx) {
    ctx.formularios.push(b.id);
    return { html: `<!--FORMULARIO:${b.id}-->` };
  },

  video(b) {
    if (!b.url) return { html: '' };
    const yt = b.url.match(/(?:youtu\.be\/|v=)([\w-]{6,})/);
    if (yt) {
      return {
        html: '<div class="elementor-wrapper elementor-fit-aspect-ratio elementor-aspect-ratio-169">' +
          `<iframe class="elementor-video" loading="lazy" title="Vídeo"` +
          ` src="https://www.youtube-nocookie.com/embed/${yt[1]}" allowfullscreen></iframe></div>`,
      };
    }
    return {
      html: '<div class="elementor-wrapper elementor-fit-aspect-ratio">' +
        `<video class="elementor-video" controls preload="none" src="${escapar(b.url)}"></video></div>`,
    };
  },

  galeria(b, ctx) {
    const fotos = b.imagenes
      .map((u) => '<div class="gallery-item">' +
        ctx.imagenes(`<img src="${escapar(u)}" alt="" loading="lazy" decoding="async">`) + '</div>')
      .join('');
    return { html: `<div class="gallery galley-columns-${b.columnas || 4}">${fotos}</div>` };
  },

  ancla(b) {
    return { html: `<div class="elementor-menu-anchor" id="${escapar(b.ancla)}"></div>` };
  },
};

/* Nombre del widget en las clases de Elementor. */
const NOMBRE = {
  encabezado: 'heading',
  texto: 'text-editor',
  imagen: 'image',
  boton: 'button',
  separador: 'divider',
  espaciador: 'spacer',
  mapa: 'google_maps',
  formulario: 'eael-contact-form-7',
  video: 'video',
  galeria: 'image-gallery',
  ancla: 'menu-anchor',
};

/* ------------------------------------------------------------- el recorrido */

function pintarElemento(b, ctx, nivel) {
  if (b.t === 'seccion') return pintarSeccion(b, ctx, nivel);
  const pintor = PINTORES[b.t];
  if (!pintor) return '';
  const { html, clases = [] } = pintor(b, ctx);
  if (html === '') return '';
  const tipo = NOMBRE[b.t] || b.t;
  const todas = ['elementor-element', `elementor-element-${b.id}`, ...clases,
    'elementor-widget', `elementor-widget-${tipo}`].join(' ');
  return `<div class="${todas}" data-id="${b.id}" data-element_type="widget" data-widget_type="${tipo}.default">` +
    `<div class="elementor-widget-container">${html}</div></div>`;
}

/**
 * El "velo" de Elementor: un div vacio al principio del bloque, al que la hoja
 * de la pagina le cuelga el color o la foto que va POR ENCIMA del fondo.
 * Sin ese div la regla no tiene a que aplicarse y el velo desaparece; en las
 * secciones de letra blanca sobre foto oscura eso dejaba el texto ilegible.
 */
const velo = (b) => (b.superposicion ? '<div class="elementor-background-overlay"></div>' : '');

function pintarColumna(c, ctx, nivel) {
  const clases = ['elementor-column', claseColumna(c),
    nivel === 0 ? 'elementor-top-column' : 'elementor-inner-column',
    'elementor-element', `elementor-element-${c.id || 'c' + ctx.n++}`].join(' ');
  const dentro = (c.elementos || []).map((e) => pintarElemento(e, ctx, nivel + 1)).join('');
  // en la columna el velo va DENTRO de .elementor-widget-wrap, no fuera
  return `<div class="${clases}" data-element_type="column">` +
    `<div class="elementor-widget-wrap elementor-element-populated">${velo(c)}${dentro}</div></div>`;
}

function pintarSeccion(s, ctx, nivel) {
  const clases = ['elementor-section',
    nivel === 0 ? 'elementor-top-section' : 'elementor-inner-section',
    'elementor-element', `elementor-element-${s.id}`,
    s.estirada ? 'elementor-section-stretched' : '',
    `elementor-section-${s.disposicion || 'boxed'}`,
    'elementor-section-height-default'].filter(Boolean).join(' ');
  const columnas = (s.columnas || []).map((c) => pintarColumna(c, ctx, nivel)).join('');
  const ancla = s.ancla ? ` id="${escapar(s.ancla)}"` : '';
  // en la seccion el velo va justo dentro de <section>, antes del contenedor
  return `<section class="${clases}"${ancla} data-id="${s.id}" data-element_type="section">` +
    `${velo(s)}<div class="elementor-container ${claseHueco(s)}">${columnas}</div></section>`;
}

/**
 * Pinta el arbol entero con el marcado de Elementor.
 * @param {Array} bloques   arbol de la pagina
 * @param {Object} opciones { imagenes, postId }
 * @returns {{html: string, formularios: string[]}}
 */
export function pintar(bloques, { imagenes = (h) => h, postId = 0 } = {}) {
  const ctx = { n: 0, imagenes, formularios: [] };
  const dentro = (bloques || []).map((s) => pintarElemento(s, ctx, 0)).join('\n');
  const html = `<div class="elementor elementor-${postId}">` +
    `<div class="elementor-inner"><div class="elementor-section-wrap">${dentro}</div></div></div>`;
  return { html, formularios: ctx.formularios };
}

/**
 * Deja exactamente un <h1> en la pagina.
 *  - Si la pagina enseña la banda de titulo del tema, el H1 es el de la banda
 *    y los encabezados del contenido se quedan como estan.
 *  - Si no la enseña, el PRIMER encabezado del contenido asciende a h1, sin
 *    cambiar su texto ni su sitio.
 * Devuelve el texto del H1.
 */
export function asegurarH1(bloques, banda, titulo) {
  let primero = null;
  const recorrer = (lista) => {
    for (const b of lista || []) {
      if (b.t === 'seccion') { for (const c of b.columnas || []) recorrer(c.elementos); }
      else if (b.t === 'encabezado') {
        if (!primero) primero = b;
        if (b.etiqueta === 'h1') b.etiqueta = 'h2';   // primero se bajan todos
      }
    }
  };
  recorrer(bloques);

  if (banda || !primero) return titulo;
  primero.etiqueta = 'h1';
  return primero.texto;
}

export default { pintar, asegurarH1 };
