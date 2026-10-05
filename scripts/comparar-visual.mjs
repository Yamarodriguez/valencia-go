/**
 * comparar-visual.mjs — mide la web original y la nueva y saca las
 * diferencias de geometria, elemento a elemento.
 *
 *   node scripts/comparar-visual.mjs [pagina] [ancho]
 *
 * Necesita los dos servidores levantados:
 *   8090  la web original montada en local (referencia/)
 *   8080  la web nueva compilada (dist/)
 *
 * No compara pixeles: compara DONDE esta cada cosa. Para cada texto que
 * aparece en las dos, dice si cambia de sitio, de tamano o de color. Es lo
 * que permite ir cerrando diferencias sin mirar capturas a ojo.
 */
import { chromium } from 'playwright';

const PAGINAS = {
  portada: ['/portada.html', '/'],
  'tema-precios': ['/tema-precios.html', '/precios/'],
  'tema-modelos': ['/tema-modelos.html', '/modelos/'],
  'localidad-casas': ['/localidad-casas.html', '/galicia/'],
  'localidad-maritimos': ['/localidad-maritimos.html', '/contenedores-maritimos-madrid/'],
  producto: ['/producto.html', '/piscina-contenedor/'],
};

const cual = process.argv[2] || 'localidad-casas';
const ancho = Number(process.argv[3]) || 1400;
const [rutaVieja, rutaNueva] = PAGINAS[cual] || PAGINAS['localidad-casas'];

const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM });

async function medir(base, ruta) {
  const ctx = await navegador.newContext({ viewport: { width: ancho, height: 1000 } });
  const pag = await ctx.newPage();
  await ctx.route('**://**', (r) => (r.request().url().startsWith(base) ? r.continue() : r.abort()));
  await pag.goto(base + ruta, { waitUntil: 'load' });
  // Hay que recorrer la pagina antes de medir: las imagenes perezosas que no
  // se han cargado miden cero y falsean tanto las posiciones como el alto.
  await pag.evaluate(async () => {
    for (const img of document.querySelectorAll('img[data-src]')) img.src = img.getAttribute('data-src');
    for (const img of document.querySelectorAll('img[loading="lazy"]')) img.loading = 'eager';
    await new Promise((listo) => {
      let y = 0;
      const paso = () => {
        window.scrollTo(0, y); y += 600;
        if (y < document.body.scrollHeight) setTimeout(paso, 30);
        else { window.scrollTo(0, 0); setTimeout(listo, 500); }
      };
      paso();
    });
    await Promise.all([...document.images].filter((i) => !i.complete)
      .map((i) => new Promise((r) => { i.onload = i.onerror = r; })));
  });
  await pag.waitForTimeout(800);

  const datos = await pag.evaluate(() => {
    const salida = [];
    // Se mide el CONTENIDO, no la pagina entera: la cabecera, el menu y el pie
    // estan hechos a mano y se comparan aparte con capturas. Si se metieran
    // aqui, sus diferencias taparian las del contenido, que es lo que importa.
    // La banda de titulo y las migas viven fuera de <main> en la web nueva:
    // salen como "elementos que faltan" y es esperado, no es un defecto.
    const raiz = document.querySelector('main, #main, #content') || document.body;
    const visto = new Set();
    for (const el of raiz.querySelectorAll('h1,h2,h3,h4,p,a,img,iframe,input,button,li')) {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      const texto = (el.tagName === 'IMG'
        ? 'IMG:' + (el.currentSrc || el.src).split('/').pop().split('?')[0]
        : (el.textContent || '').replace(/\s+/g, ' ').trim()).slice(0, 70);
      if (!texto) continue;
      const clave = el.tagName + '|' + texto;
      if (visto.has(clave)) continue;
      visto.add(clave);
      const e = getComputedStyle(el);
      salida.push({
        etiqueta: el.tagName,
        texto,
        x: Math.round(r.x + window.scrollX),
        y: Math.round(r.y + window.scrollY),
        w: Math.round(r.width),
        h: Math.round(r.height),
        tam: e.fontSize,
        peso: e.fontWeight,
        color: e.color,
        fondo: e.backgroundColor,
        familia: e.fontFamily.split(',')[0].replace(/["']/g, ''),
        alinear: e.textAlign,
      });
    }
    return { elementos: salida, alto: document.body.scrollHeight };
  });
  await ctx.close();
  return datos;
}

const vieja = await medir('http://127.0.0.1:8090', rutaVieja);
const nueva = await medir('http://127.0.0.1:8080', rutaNueva);
await navegador.close();

const indice = new Map();
const porTexto = new Map();
for (const e of nueva.elementos) {
  indice.set(e.etiqueta + '|' + e.texto, e);
  if (!porTexto.has(e.texto)) porTexto.set(e.texto, e);
}

// Diferencia acordada y documentada: en las 192 paginas que hoy no tienen
// ningun <h1>, el primer encabezado sube de h2 (o h3) a h1. El texto y el
// sitio son los mismos, solo cambia la etiqueta, asi que no es una falta.
const ASCENSO = { H2: 'H1', H3: 'H1', H4: 'H1' };

console.log(`\n=== ${cual} a ${ancho} px ===`);
console.log(`alto de pagina:  original ${vieja.alto}  nueva ${nueva.alto}  (${nueva.alto - vieja.alto >= 0 ? '+' : ''}${nueva.alto - vieja.alto})`);
console.log(`elementos medidos: original ${vieja.elementos.length}, nueva ${nueva.elementos.length}\n`);

const faltan = [];
const diferencias = [];

const ascendidos = [];

for (const a of vieja.elementos) {
  let b = indice.get(a.etiqueta + '|' + a.texto);
  if (!b && ASCENSO[a.etiqueta]) {
    const sube = indice.get(ASCENSO[a.etiqueta] + '|' + a.texto);
    if (sube) { ascendidos.push(a); continue; }   // h2 -> h1: previsto
  }
  if (!b) { faltan.push(a); continue; }
  const d = [];
  if (Math.abs(a.x - b.x) > 12) d.push(`x ${a.x}→${b.x}`);
  if (Math.abs(a.w - b.w) > 20) d.push(`ancho ${a.w}→${b.w}`);
  if (Math.abs(a.h - b.h) > 20) d.push(`alto ${a.h}→${b.h}`);
  // En una imagen el color y la fuente son los que hereda: no significan nada.
  if (a.etiqueta !== 'IMG') {
    if (a.tam !== b.tam) d.push(`letra ${a.tam}→${b.tam}`);
    if (a.peso !== b.peso) d.push(`peso ${a.peso}→${b.peso}`);
    if (a.color !== b.color) d.push(`color ${a.color}→${b.color}`);
    // "Open Sans" no se carga en ninguna de las dos: las dos ven la del sistema
    const sistema = (f) => /open sans|-apple-system|segoe ui|tahoma|system-ui/i.test(f);
    if (a.familia !== b.familia && !(sistema(a.familia) && sistema(b.familia))) {
      d.push(`fuente ${a.familia}→${b.familia}`);
    }
    // "start" y "left" son lo mismo escrito distinto
    const ali = (x) => (x === 'start' ? 'left' : x === 'end' ? 'right' : x);
    if (ali(a.alinear) !== ali(b.alinear)) d.push(`alineado ${a.alinear}→${b.alinear}`);
  }
  if (d.length) diferencias.push({ a, d });
}

if (ascendidos.length) {
  console.log(`(${ascendidos.length} encabezado(s) ascendidos a H1 — previsto, no es una falta)\n`);
}

console.log(`--- ${faltan.length} elemento(s) del original que no aparecen en la nueva ---`);
faltan.slice(0, 25).forEach((a) => console.log(`  ${a.etiqueta.padEnd(6)} ${a.texto}`));
if (faltan.length > 25) console.log(`  … y ${faltan.length - 25} mas`);

console.log(`\n--- ${diferencias.length} elemento(s) con diferencias ---`);
diferencias.slice(0, 40).forEach(({ a, d }) =>
  console.log(`  ${a.etiqueta.padEnd(6)} ${a.texto.slice(0, 46).padEnd(48)} ${d.join(' | ')}`));
if (diferencias.length > 40) console.log(`  … y ${diferencias.length - 40} mas`);
