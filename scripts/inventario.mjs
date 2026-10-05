/**
 * inventario.mjs — resumen de las paginas para el analisis SEO.
 *
 *   node scripts/inventario.mjs            tabla resumida por tipo
 *   node scripts/inventario.mjs --json     todo, en JSON (lo leen los agentes)
 *
 * Por cada pagina: ruta, tipo (portada / tema / localidad, casas o
 * maritimos / legal), localidad, palabra clave, titulo SEO, descripcion,
 * numero de palabras, encabezados (nivel + texto, en orden) y si trae FAQ.
 */
import fs from 'node:fs';
import path from 'node:path';

const DIR = path.resolve('src/content/pages');
const menus = JSON.parse(fs.readFileSync(path.resolve('src/data/menus.json'), 'utf8'));

const PRODUCTO = new Set(['casa', 'casas', 'contenedor', 'contenedores', 'container', 'containers',
  'maritimo', 'maritimos', 'marítimo', 'marítimos', 'vivienda', 'viviendas',
  'prefabricada', 'prefabricadas', 'modular', 'modulares', 'de', 'con', 'en']);
const sinTildes = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
function quitarProducto(rotulo) {
  const p = rotulo.trim().split(/\s+/); let i = 0;
  while (i < p.length && PRODUCTO.has(sinTildes(p[i]))) i++;
  return p.slice(i).join(' ').trim();
}
const TABLA = new Map();
for (const entradas of Object.values(menus)) for (const e of entradas) {
  if (!/provincia/i.test(e.rotulo || '')) continue;
  for (const h of e.hijos || []) {
    const nombre = quitarProducto(h.rotulo || ''); if (!h.url || !nombre) continue;
    const previo = TABLA.get(h.url); const mejor = /^[A-ZÁÉÍÓÚÑ]/.test(nombre);
    if (!previo || (mejor && !/^[A-ZÁÉÍÓÚÑ]/.test(previo))) TABLA.set(h.url, nombre);
  }
}

const plano = (h) => String(h ?? '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

function recorrer(bloques) {
  const encabezados = []; let texto = '';
  const w = (b) => {
    if (b.t === 'seccion') (b.columnas || []).forEach((c) => (c.elementos || []).forEach(w));
    else if (b.t === 'encabezado') { const t = plano(b.texto); encabezados.push(`${b.etiqueta || 'h2'}: ${t}`); texto += ' ' + t; }
    else if (b.t === 'texto') {
      const html = String(b.html || '');
      for (const m of html.matchAll(/<(h[1-6])[^>]*>([\s\S]*?)<\/\1>/gi)) encabezados.push(`${m[1]}: ${plano(m[2])}`);
      texto += ' ' + plano(html.replace(/<style[\s\S]*?<\/style>/gi, ''));
    }
  };
  (bloques || []).forEach(w);
  return { encabezados, palabras: texto.trim().split(/\s+/).filter(Boolean).length };
}

const paginas = fs.readdirSync(DIR).filter((f) => f.endsWith('.json')).map((f) => {
  const p = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
  const localidad = TABLA.get(p.ruta) || '';
  const maritimos = /contenedor(es)?-maritimo/.test(p.ruta);
  const legal = !(p.bloques && p.bloques.length);
  const tipo = p.ruta === '/' ? 'portada' : legal ? 'legal' : localidad ? (maritimos ? 'localidad-maritimos' : 'localidad-casas') : (maritimos ? 'tema-maritimos' : 'tema-casas');
  const { encabezados, palabras } = recorrer(p.bloques);
  return {
    fichero: f, ruta: p.ruta, tipo, localidad, palabraClave: p.palabraClave || '', titulo: p.titulo || '',
    tituloSeo: p.tituloSeo || '', descripcion: p.descripcion || '', h1: p.h1 || '', palabras,
    faq: (p.faq || []).length, encabezados, ampliacion: (p.ampliacion || []).length,
  };
});

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(paginas, null, 1));
} else {
  const porTipo = {};
  for (const p of paginas) (porTipo[p.tipo] ??= []).push(p);
  for (const [tipo, lista] of Object.entries(porTipo)) {
    const media = Math.round(lista.reduce((n, p) => n + p.palabras, 0) / lista.length);
    const conFaq = lista.filter((p) => p.faq).length;
    console.log(`${tipo.padEnd(22)} ${String(lista.length).padStart(3)} paginas  ${String(media).padStart(5)} palabras/media  faq en ${conFaq}`);
  }
  console.log('\n-- tema-casas:', porTipo['tema-casas']?.map((p) => p.ruta).join(' '));
  console.log('-- tema-maritimos:', porTipo['tema-maritimos']?.map((p) => p.ruta).join(' '));
}
