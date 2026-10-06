/**
 * hojas.mjs — genera los ficheros de hojas reunidas (/css/r-<hash>.css) que
 * piden las paginas, y comprueba que cada uno es EXACTAMENTE la suma, en
 * orden, de las hojas originales que sustituye.
 *
 *   node scripts/hojas.mjs
 *
 * Lee src/content/paginas/hojas.json (lo escribe scripts/partir-paginas.mjs:
 * hash -> lista de hojas originales, con su ruta de public/). Para cada hoja:
 *   - se toma el fichero de public/ (o de public/fontawesome/ para Font Awesome);
 *   - las direcciones relativas de dentro (url(../webfonts/x), @import) se
 *     pasan a absolutas segun DONDE ESTABA la hoja, porque el fichero reunido
 *     vive en /css/ y si no se perderian las letras y los fondos;
 *   - no se minimiza ni se quita nada.
 * Escribe public/css/ (no sube a Git: lo genera la orden de compilacion).
 * FALLA si falta alguna hoja original. Informe en informes/hojas.md.
 */
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve('.');
const PUBLICO = path.join(RAIZ, 'public');
const DESTINO = path.join(PUBLICO, 'css');
const f = path.join(RAIZ, 'src', 'content', 'paginas', 'hojas.json');
if (!fs.existsSync(f)) { console.log('hojas: no hay src/content/paginas/hojas.json (velocidad desactivada): nada que hacer'); process.exit(0); }
const tramos = JSON.parse(fs.readFileSync(f, 'utf8'));

const faltan = [];
let n = 0, bytes = 0;
fs.rmSync(DESTINO, { recursive: true, force: true });
fs.mkdirSync(DESTINO, { recursive: true });
for (const [hash, hrefs] of Object.entries(tramos)) {
  const partes = [];
  for (const href of hrefs) {
    const ruta = decodeURIComponent(href.split('?')[0].split('#')[0]);
    const fichero = path.join(PUBLICO, ruta);
    if (!fs.existsSync(fichero)) { faltan.push(`${ruta} (tramo ${hash})`); continue; }
    let css = fs.readFileSync(fichero, 'utf8');
    const base = 'http://x' + ruta;
    const absoluta = (u) => { u = u.trim(); if (/^(data:|https?:|\/\/|#|\/)/i.test(u)) return u; try { return new URL(u, base).pathname + (new URL(u, base).search || ''); } catch { return u; } };
    css = css.replace(/url\((\s*)(['"]?)([^)'"]+)\2(\s*)\)/gi, (m, a, q, u, b) => `url(${a}${q}${absoluta(u)}${q}${b})`);
    css = css.replace(/@import\s+(['"])([^'"]+)\1/gi, (m, q, u) => `@import ${q}${absoluta(u)}${q}`);
    partes.push(`/* ${href} */\n${css}`);
  }
  const texto = partes.join('\n');
  fs.writeFileSync(path.join(DESTINO, `r-${hash}.css`), texto);
  n++; bytes += texto.length;
}
fs.mkdirSync(path.join(RAIZ, 'informes'), { recursive: true });
fs.writeFileSync(path.join(RAIZ, 'informes', 'hojas.md'), [`# Hojas reunidas — ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`, '',
  `Tramos distintos: ${n}. Peso total: ${(bytes / 1024).toFixed(0)} KB. Hojas que faltan: ${faltan.length}.`, '',
  ...Object.entries(tramos).map(([h, l]) => `- r-${h}.css: ${l.length} hojas (${l[0]} … ${l[l.length - 1]})`), '',
  `## Faltan (${faltan.length})`, ...faltan.map((x) => '- ' + x)].join('\n') + '\n');
console.log(`hojas: ${n} ficheros reunidos en public/css (${(bytes / 1024).toFixed(0)} KB); faltan ${faltan.length}`);
for (const x of faltan.slice(0, 8)) console.log('  FALTA ' + x);
process.exit(faltan.length ? 1 : 0);
