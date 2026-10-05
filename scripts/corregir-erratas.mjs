/**
 * corregir-erratas.mjs — aplica src/data/erratas.json al texto visible de las
 * paginas (pedido por el propietario el 28-09-2026):
 *   - bloques: html de los textos (solo nodos de texto), encabezados, botones
 *   - titulo, h1, tituloSeo, descripcion y la FAQ original de cada pagina
 *   - rotulos de src/data/menus.json
 *   - las claves y valores de src/data/encabezados.json (renombres), para que
 *     sigan casando con el encabezado ya corregido
 * No toca URLs, src, alt, nombres de fichero ni el contenido nuevo
 * (ampliacion), que ya se escribio sin erratas.
 *   node scripts/corregir-erratas.mjs [--seco]
 */
import fs from 'node:fs';
import path from 'node:path';
import { corregir, corregirHtml } from './erratas.mjs';

const seco = process.argv.includes('--seco');
const DIR = path.resolve('src/content/pages');
const recuento = {};
const contar = (antes, despues) => {
  if (antes === despues) return;
  const a = antes.split(/(?<![\p{L}\p{N}])/u), d = despues.split(/(?<![\p{L}\p{N}])/u);
  for (let i = 0; i < Math.min(a.length, d.length); i++) if (a[i] !== d[i]) { const k = `${a[i].trim().split(/\s/)[0]} -> ${d[i].trim().split(/\s/)[0]}`; recuento[k] = (recuento[k] || 0) + 1; }
};
const txt = (s) => { const n = corregir(s); contar(String(s ?? '').normalize('NFC'), n); return n; };
const html = (s) => { const n = corregirHtml(s); contar(String(s ?? '').normalize('NFC'), n); return n; };

let paginas = 0;
for (const f of fs.readdirSync(DIR)) {
  const ruta = path.join(DIR, f);
  const original = fs.readFileSync(ruta, 'utf8');
  const p = JSON.parse(original);
  for (const campo of ['titulo', 'h1', 'tituloSeo', 'descripcion']) if (typeof p[campo] === 'string') p[campo] = txt(p[campo]);
  if (typeof p.cuerpo === 'string') p.cuerpo = html(p.cuerpo);
  for (const i of p.faq || []) { if (i.pregunta) i.pregunta = txt(i.pregunta); if (i.respuesta) i.respuesta = html(i.respuesta); }
  const walk = (e) => {
    if (e.t === 'texto' && typeof e.html === 'string') e.html = html(e.html);
    if ((e.t === 'encabezado' || e.t === 'boton') && typeof e.texto === 'string') e.texto = txt(e.texto);
    if (e.t === 'seccion') (e.columnas || []).forEach((c) => (c.elementos || []).forEach(walk));
  };
  (p.bloques || []).forEach(walk);
  const nuevo = JSON.stringify(p, null, 1);
  if (nuevo !== JSON.stringify(JSON.parse(original), null, 1)) { paginas++; if (!seco) fs.writeFileSync(ruta, nuevo); }
}

// menus
const fMenus = path.resolve('src/data/menus.json');
const menus = JSON.parse(fs.readFileSync(fMenus, 'utf8'));
const walkMenu = (e) => { if (e.rotulo) e.rotulo = txt(e.rotulo); (e.hijos || []).forEach(walkMenu); };
Object.values(menus).forEach((m) => m.forEach(walkMenu));
if (!seco) fs.writeFileSync(fMenus, JSON.stringify(menus, null, 1) + '\n');

// renombres: la clave es el encabezado original, que ahora va corregido
const fEnc = path.resolve('src/data/encabezados.json');
const enc = JSON.parse(fs.readFileSync(fEnc, 'utf8'));
for (const [r, m] of Object.entries(enc)) enc[r] = Object.fromEntries(Object.entries(m).map(([k, v]) => [corregir(k), corregir(v)]));
if (!seco) fs.writeFileSync(fEnc, JSON.stringify(enc, null, 1) + '\n');

console.log(`${seco ? '(en seco) ' : ''}paginas con cambios: ${paginas}`);
console.log(Object.entries(recuento).sort((a, b) => b[1] - a[1]).slice(0, 40).map(([k, v]) => `${String(v).padStart(5)}  ${k}`).join('\n'));
