/**
 * estructura.js — Motor de reconstruccion de la maquetacion.
 *
 * El export de WordPress guarda el TEXTO de Elementor pero pierde su
 * maquetacion: lo que en la web viva es una rejilla de tarjetas llega aqui
 * como una fila de <h3> y <p><a><img></a></p> sueltos. Este modulo vuelve a
 * montar esos bloques.
 *
 * Reglas de las expresiones regulares (aprendidas a golpes):
 *   - Nunca [\s\S]*? que pueda cruzar bloques. Siempre (?:(?!<\/p>)[\s\S])*?
 *   - Se recogen TODAS las coincidencias primero y se sustituye de atras
 *     hacia delante, para que los indices no se muevan.
 *   - El nivel de encabezado del original se conserva SIEMPRE (h2 sigue
 *     siendo h2, h3 sigue siendo h3): la jerarquia tiene que quedar igual
 *     que en la web en vivo.
 *   - Ningun titulo inventado va en un encabezado: va en <p class="...">.
 */

const RE_IMG = /<img\b[^>]*>/i;

/** Aplica una lista de sustituciones [inicio, fin, texto] de atras hacia delante. */
function sustituir(html, cambios) {
  cambios.sort((a, b) => b[0] - a[0]);
  for (const [ini, fin, texto] of cambios) {
    html = html.slice(0, ini) + texto + html.slice(fin);
  }
  return html;
}

const textoPlano = (h) =>
  h.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

/* ------------------------------------------------------------------ 1. tarjetas
 * Patron real: <h3>Titulo</h3> seguido de <p>[<a>]<img>[</a>]</p>, repetido.
 * En la web viva es una rejilla de tarjetas con banda gris de titulo.
 */
function rejillaTarjetas(html) {
  const PAR = /<(h[23])\b[^>]*>((?:(?!<\/\1>)[\s\S])*?)<\/\1>\s*<p\b[^>]*>((?:(?!<\/p>)[\s\S])*?)<\/p>/gi;

  const pares = [];
  for (const m of html.matchAll(PAR)) {
    const cuerpo = m[3];
    if (!RE_IMG.test(cuerpo)) continue;
    // el <p> tiene que ser SOLO la imagen (con o sin enlace), nada de prosa
    if (textoPlano(cuerpo).length > 3) continue;
    pares.push({
      ini: m.index,
      fin: m.index + m[0].length,
      nivel: m[1].toLowerCase(),
      titulo: m[2].trim(),
      figura: cuerpo.trim(),
    });
  }
  if (!pares.length) return html;

  // agrupar los pares consecutivos (sin nada entre medias) en una sola rejilla
  const grupos = [];
  let actual = [pares[0]];
  for (let i = 1; i < pares.length; i++) {
    const hueco = html.slice(pares[i - 1].fin, pares[i].ini).trim();
    if (hueco === '' && pares[i].nivel === actual[0].nivel) actual.push(pares[i]);
    else { grupos.push(actual); actual = [pares[i]]; }
  }
  grupos.push(actual);

  const cambios = [];
  for (const g of grupos) {
    if (g.length < 2) continue;          // una sola tarjeta no es una rejilla
    const n = g.length;
    const columnas = n % 4 === 0 ? 4 : n % 3 === 0 ? 3 : n >= 5 ? 4 : n;
    const tarjetas = g.map((t) =>
      `<div class="tarjeta">${t.figura}` +
      `<${t.nivel} class="tarjeta-titulo">${t.titulo}</${t.nivel}></div>`
    ).join('');
    cambios.push([g[0].ini, g[g.length - 1].fin,
      `<div class="rejilla rejilla-${columnas}">${tarjetas}</div>`]);
  }
  return sustituir(html, cambios);
}

/* --------------------------------------------------- 1b. fila de titulos
 * En la web viva hay secciones que son SOLO encabezados repartidos en
 * columnas, sin foto (comprobado en /galicia/: la fila "30 m2 / 90 m2 /
 * 120 m2" es una seccion de tres columnas con un widget heading en cada
 * una). En el export llegan como encabezados consecutivos.
 * Se conserva el nivel del original; solo cambia la maquetacion.
 */
function filaTitulos(html) {
  const H = /<(h[23])\b[^>]*>((?:(?!<\/\1>)[\s\S])*?)<\/\1>/gi;
  const sueltos = [];
  for (const m of html.matchAll(H)) {
    sueltos.push({
      ini: m.index,
      fin: m.index + m[0].length,
      nivel: m[1].toLowerCase(),
      titulo: m[2].trim(),
    });
  }
  if (sueltos.length < 2) return html;

  const grupos = [];
  let actual = [sueltos[0]];
  for (let i = 1; i < sueltos.length; i++) {
    const pegados = html.slice(sueltos[i - 1].fin, sueltos[i].ini).trim() === '';
    if (pegados && sueltos[i].nivel === actual[0].nivel) actual.push(sueltos[i]);
    else { grupos.push(actual); actual = [sueltos[i]]; }
  }
  grupos.push(actual);

  const cambios = [];
  for (const g of grupos) {
    if (g.length < 2 || g.length > 4) continue;
    const celdas = g.map((t) =>
      `<div class="celda-titulo"><${t.nivel}>${t.titulo}</${t.nivel}></div>`).join('');
    cambios.push([g[0].ini, g[g.length - 1].fin,
      `<div class="fila-titulos fila-${g.length}">${celdas}</div>`]);
  }
  return sustituir(html, cambios);
}

/* -------------------------------------------- 2a. botones muertos rescatados
 * En la web viva el boton WHATSAPP tiene href="" (roto) y LLAMAR apunta a
 * "tel: 666171391". Al limpiar el export, el enlace sin destino se desenvuelve
 * y queda un parrafo de texto suelto. Se reponen los dos como botones de
 * verdad. Regla documentada: solo afecta a parrafos cuyo texto visible es
 * exactamente una de estas palabras.
 */
const RESCATES = [
  [/^llamar$/i, 'tel:+34666171391'],
  [/^whatsapp$/i, 'https://wa.me/34666171391'],
  [/^presupuesto$/i, '/presupuesto-casas-contenedores/'],
];

function botonesMuertos(html) {
  const P = /<p\b[^>]*>((?:(?!<\/p>)[\s\S])*?)<\/p>/gi;
  const cambios = [];
  for (const m of html.matchAll(P)) {
    const dentro = m[1];
    if (/<a\b/i.test(dentro) || RE_IMG.test(dentro)) continue;
    const texto = textoPlano(dentro);
    const regla = RESCATES.find(([re]) => re.test(texto));
    if (!regla) continue;
    cambios.push([m.index, m.index + m[0].length,
      `<p class="fila-boton"><a class="boton boton-primario" href="${regla[1]}">${texto}</a></p>`]);
  }
  return sustituir(html, cambios);
}

/* ------------------------------------------------------------------ 2. botones
 * Un <p> que contiene UNICAMENTE un enlace de texto corto es un boton.
 */
const PALABRAS_BOTON = /^(llamar|whatsapp|presupuesto|contactar|contacto|descargar|descarga|ver m[aá]s|m[aá]s informaci[oó]n|solicitar|pedir presupuesto|cat[aá]logo|env[ií]ar)/i;

function botones(html) {
  const P = /<p\b[^>]*>((?:(?!<\/p>)[\s\S])*?)<\/p>/gi;
  const cambios = [];
  for (const m of html.matchAll(P)) {
    const dentro = m[1].trim();
    const enlaces = [...dentro.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>((?:(?!<\/a>)[\s\S])*?)<\/a\s*>/gi)];
    if (enlaces.length !== 1) continue;
    if (RE_IMG.test(dentro)) continue;
    const texto = textoPlano(enlaces[0][2]);
    const resto = textoPlano(dentro.replace(enlaces[0][0], ''));
    if (resto !== '') continue;                       // el <p> es solo el enlace
    if (!texto || texto.length > 42) continue;
    const destacado = PALABRAS_BOTON.test(texto);
    const clase = destacado ? 'boton boton-primario' : 'boton';
    cambios.push([m.index, m.index + m[0].length,
      `<p class="fila-boton"><a class="${clase}" href="${enlaces[0][1]}">${texto}</a></p>`]);
  }
  return sustituir(html, cambios);
}

/* ------------------------------------------------------------------ 3. figuras
 * Un <p> que contiene solo una imagen (suelta o enlazada) es una figura.
 */
function figuras(html) {
  const P = /<p\b[^>]*>((?:(?!<\/p>)[\s\S])*?)<\/p>/gi;
  const cambios = [];
  for (const m of html.matchAll(P)) {
    const dentro = m[1].trim();
    if (!RE_IMG.test(dentro)) continue;
    if (textoPlano(dentro).length > 3) continue;
    cambios.push([m.index, m.index + m[0].length, `<figure class="figura">${dentro}</figure>`]);
  }
  return sustituir(html, cambios);
}

/* ------------------------------------------------------------------ 4. mapas */
function mapas(html) {
  const IF = /<iframe\b[^>]*><\/iframe>/gi;
  const cambios = [];
  for (const m of html.matchAll(IF)) {
    cambios.push([m.index, m.index + m[0].length, `<div class="mapa">${m[0]}</div>`]);
  }
  return sustituir(html, cambios);
}

/* ------------------------------------------------------------------ 5. listas a mano
 * Parrafos que empiezan por un simbolo de vineta escrito a mano.
 */
function listasAMano(html) {
  const VINETA = /^(?:[●•▪·‣]|-\s)\s*/;
  const P = /<p\b[^>]*>((?:(?!<\/p>)[\s\S])*?)<\/p>/gi;
  const trozos = [];
  for (const m of html.matchAll(P)) {
    const t = textoPlano(m[1]);
    if (VINETA.test(t)) trozos.push({ ini: m.index, fin: m.index + m[0].length, dentro: m[1] });
  }
  if (!trozos.length) return html;

  const grupos = [];
  let actual = [trozos[0]];
  for (let i = 1; i < trozos.length; i++) {
    if (html.slice(trozos[i - 1].fin, trozos[i].ini).trim() === '') actual.push(trozos[i]);
    else { grupos.push(actual); actual = [trozos[i]]; }
  }
  grupos.push(actual);

  const cambios = [];
  for (const g of grupos) {
    const items = g.map((t) => `<li>${t.dentro.replace(/^\s*(?:<[^>]+>\s*)*?[●•▪·‣]\s*/, '')}</li>`).join('');
    cambios.push([g[0].ini, g[g.length - 1].fin, `<ul class="lista-vinetas">${items}</ul>`]);
  }
  return sustituir(html, cambios);
}

/* ------------------------------------------------------------------ 6. limpieza
 * Restos concretos que trae el export y que en la web viva no se ven.
 */
function limpiezas(html) {
  // pegotes del traductor de Google dentro de <strong>
  html = html.replace(/<span class="(?:zRhise|PkjLuf)"[^>]*>((?:(?!<\/span>)[\s\S])*?)<\/span>/gi, '$1');
  // estilos en linea del editor (font-size en <strong>)
  html = html.replace(/\sstyle="[^"]*font-size:[^"]*"/gi, '');
  // aviso de obras olvidado
  html = html.replace(
    /<p\b[^>]*>(?:(?!<\/p>)[\s\S])*?Estamos realizando modificaciones(?:(?!<\/p>)[\s\S])*?<\/p>/gi, '');
  // logo repetido dentro del cuerpo
  html = html.replace(
    /<(?:p|figure)\b[^>]*>(?:\s*)<img\b[^>]*(?:logo|Logo|LOGO)[^>]*>(?:\s*)<\/(?:p|figure)>/g, '');
  // parrafos que quedan vacios
  html = html.replace(/<p\b[^>]*>(?:\s|&nbsp;|<br\s*\/?>)*<\/p>/gi, '');
  return html;
}

/* ------------------------------------------------------------------ 7. formulario */
function formulario(html) {
  return html.replace(/<aside\b[^>]*data-formulario="1"[^>]*>\s*<\/aside>/gi,
    '<div data-formulario="1"></div>');
}

/**
 * Reconstruye la maquetacion de un cuerpo plano.
 * El orden importa: primero lo que consume parejas (tarjetas), luego lo que
 * mira parrafos sueltos.
 */
export function reconstruir(html) {
  if (!html) return '';
  let salida = limpiezas(html);
  salida = rejillaTarjetas(salida);
  salida = filaTitulos(salida);
  salida = listasAMano(salida);
  salida = botonesMuertos(salida);
  salida = botones(salida);
  salida = figuras(salida);
  salida = mapas(salida);
  salida = formulario(salida);
  return salida;
}

export default { reconstruir };
