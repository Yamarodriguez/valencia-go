/**
 * redirecciones.mjs — escribe public/_redirects (Netlify) a partir de
 * src/data/redirecciones.json: las redirecciones que YA HACIA la web vieja y
 * que la copia tiene que seguir haciendo.
 *
 *   node scripts/redirecciones.mjs
 *
 * - Netlify trata igual /ruta y /ruta/, asi que se quitan los duplicados.
 * - Si el origen de una redireccion existe como pagina en la copia, NO se
 *   escribe (mandaria la pagina) y se avisa.
 * - Si el destino no existe en la copia (ni es un fichero de public/), FALLA.
 * - El bloque marcado "FASE 7" (del dominio de pruebas al dominio de verdad)
 *   se deja comentado hasta el dia del cambio de DNS.
 */
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve('.');
const datos = JSON.parse(fs.readFileSync(path.join(RAIZ, 'src', 'data', 'redirecciones.json'), 'utf8'));
const site = JSON.parse(fs.readFileSync(path.join(RAIZ, 'src', 'data', 'site.json'), 'utf8'));
const indice = JSON.parse(fs.readFileSync(path.join(RAIZ, 'src', 'content', 'paginas', 'indice.json'), 'utf8'));
const paginas = new Set(indice.map((p) => p.ruta));
const sinBarra = (r) => (r.length > 1 ? r.replace(/\/$/, '') : r);
const conBarra = (r) => (r.endsWith('/') ? r : r + '/');

const vistos = new Set();
const lineas = [];
const avisos = [], fallos = [];
for (const r of datos.lista) {
  const de = sinBarra(r.de);
  if (vistos.has(de)) continue;
  vistos.add(de);
  if (paginas.has(conBarra(r.de))) { avisos.push(`${r.de} existe como pagina: no se redirige`); continue; }
  const destino = r.a.split('#')[0].split('?')[0];
  const existe = paginas.has(conBarra(destino)) || fs.existsSync(path.join(RAIZ, 'public', decodeURIComponent(destino)));
  if (!existe) { fallos.push(`${r.de} -> ${r.a}: el destino no existe en la copia`); continue; }
  lineas.push(`${de}  ${r.a}  ${r.codigo || 301}`);
}
// Las direcciones cortas de WordPress (?p=ID y ?page_id=ID): cada una a SU pagina,
// no a la portada. Salen del identificador que cada pagina lleva en su <body>.
// Solo las del idioma principal (las traducidas comparten identificador).
const cortas = [];
const idsVistos = new Set();
for (const p of indice) {
  if (!p.postId || /^\/(en|it|fr|pl)\//.test(p.ruta) || /\/(page|strona|pagina)\/\d+\/$/.test(p.ruta) || idsVistos.has(p.postId)) continue;
  if (!/\b(postid|page-id)-\d+/.test(p.body?.class || '')) continue;
  idsVistos.add(p.postId);
  cortas.push(`/  p=${p.postId}  ${p.ruta}  301!`);
  if (/\bpage-id-\d+/.test(p.body.class)) cortas.push(`/  page_id=${p.postId}  ${p.ruta}  301!`);
}

const texto = [
  '# Generado por scripts/redirecciones.mjs desde src/data/redirecciones.json. No editar a mano.',
  '# Son las redirecciones que ya hacia la web vieja (WordPress).',
  '',
  ...lineas,
  '',
  '# Direcciones cortas de WordPress (?p=ID): cada una a su pagina.',
  ...cortas,
  '',
  '# ---------------------------------------------------------------- FASE 7',
  '# El dia del cambio de DNS (ni antes ni despues) se quita la almohadilla:',
  '# manda las visitas del dominio de pruebas al dominio de verdad.',
  `# https://valenciaandgo.netlify.app/*  ${site.dominio}/:splat  301!`,
  '',
].join('\n');
fs.mkdirSync(path.join(RAIZ, 'public'), { recursive: true });
fs.writeFileSync(path.join(RAIZ, 'public', '_redirects'), texto);
console.log(`direcciones cortas ?p=ID: ${cortas.length}`);
console.log(`redirecciones: ${lineas.length} en public/_redirects (${avisos.length} no escritas porque el origen existe, ${fallos.length} con destino inexistente)`);
for (const a of avisos) console.log('  aviso ' + a);
for (const f of fallos) console.log('  FALLO ' + f);
process.exit(fallos.length ? 1 : 0);
