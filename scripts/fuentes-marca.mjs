/**
 * fuentes-marca.mjs — baja de Google Fonts la letra de la marca Excursiones
 * Valencia (Plus Jakarta Sans, títulos y texto, desde el 27-10-2026), solo los
 * subconjuntos latin y latin-ext (castellano, inglés, francés, italiano y
 * polaco), y escribe public/fuentes-marca/fuentes.css con sus @font-face,
 * servidas desde la propia web.
 *
 *   node scripts/fuentes-marca.mjs
 *
 * Son fuentes variables: un fichero sirve para todos los pesos.
 */
import fs from 'node:fs';
import path from 'node:path';

const SALIDA = path.resolve('public', 'fuentes-marca');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const URL_CSS = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400..800;1,400..600&display=swap';

fs.mkdirSync(SALIDA, { recursive: true });
const css = await (await fetch(URL_CSS, { headers: { 'User-Agent': UA } })).text();

// agrupa los bloques por (familia, estilo, subconjunto, fichero) y junta los pesos
const grupos = new Map();
for (const m of css.matchAll(/\/\*\s*([\w-]+)\s*\*\/\s*@font-face\s*\{([^}]*)\}/g)) {
  const [, subconjunto, cuerpo] = m;
  if (!['latin', 'latin-ext'].includes(subconjunto)) continue;
  const valor = (p) => (cuerpo.match(new RegExp(p + ':\\s*([^;]+);')) || [])[1];
  const familia = valor('font-family').replace(/'/g, '');
  const estilo = valor('font-style');
  const pesos = valor('font-weight').trim().split(/\s+/).map(Number); // "600" o "400 800"
  const url = cuerpo.match(/url\(([^)]+)\)/)[1];
  const rango = valor('unicode-range');
  const clave = [familia, estilo, subconjunto, url].join('|');
  if (!grupos.has(clave)) grupos.set(clave, { familia, estilo, subconjunto, url, rango, pesos: [] });
  grupos.get(clave).pesos.push(...pesos);
}

const caras = [];
for (const g of grupos.values()) {
  const nombre = `${g.familia.toLowerCase().replace(/\s+/g, '-')}-${g.estilo}-${g.subconjunto}.woff2`;
  const r = await fetch(g.url, { headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error(`no se pudo bajar ${g.url}: ${r.status}`);
  fs.writeFileSync(path.join(SALIDA, nombre), Buffer.from(await r.arrayBuffer()));
  const pesos = `${Math.min(...g.pesos)} ${Math.max(...g.pesos)}`;
  caras.push(`/* ${g.familia} ${g.estilo} ${g.subconjunto} */\n@font-face { font-family: '${g.familia}'; font-style: ${g.estilo}; font-weight: ${pesos}; font-display: swap; src: url(/fuentes-marca/${nombre}) format('woff2'); unicode-range: ${g.rango}; }`);
  console.log(`${nombre} (${g.pesos.join(', ')})`);
}
fs.writeFileSync(path.join(SALIDA, 'fuentes.css'), `/* Letras de Excursiones Valencia (scripts/fuentes-marca.mjs). Licencia SIL Open Font License. */\n${caras.join('\n')}\n`);
console.log(`→ public/fuentes-marca/ (${caras.length} ficheros)`);
