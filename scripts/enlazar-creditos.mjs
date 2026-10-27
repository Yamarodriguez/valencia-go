/**
 * enlazar-creditos.mjs — añade en el menú del pie de todas las páginas, detrás
 * de "Política de cookies" (en el idioma de cada una), el enlace a
 * /creditos-de-fotos/. Clona el <li> de las cookies para heredar sus clases.
 * No repite si ya está.
 *
 *   node scripts/enlazar-creditos.mjs [--seco]
 */
import fs from 'node:fs';
import path from 'node:path';

const SECO = process.argv.includes('--seco');
const DIR = path.resolve('src/content/paginas');
const TEXTO = { 'es-es': 'Créditos de fotos', 'en-gb': 'Photo credits', 'fr-fr': 'Crédits photos', 'it-it': 'Crediti foto', 'pl-pl': 'Autorzy zdjęć' };
const indice = JSON.parse(fs.readFileSync(path.join(DIR, 'indice.json'), 'utf8'));
const RE_LI = /<li\b[^>]*>\s*<a\b[^>]*href="[^"]*(?:cookie|cookies|plikow-cookie)[^"]*"[^>]*>[\s\S]*?<\/a>\s*<\/li>/gi;

let paginas = 0, enlaces = 0, sin = [];
for (const p of indice) {
  const ruta = path.join(DIR, p.nombre + '.html');
  const antes = fs.readFileSync(ruta, 'utf8');
  if (antes.includes('href="/creditos-de-fotos/"')) continue;
  const texto = TEXTO[p.idioma] || TEXTO['es-es'];
  let n = 0;
  const despues = antes.replace(/\n<!--@@pie@@-->\n([\s\S]*?)(?=\n<!--@@despues@@-->\n|$)/, (todo, pie) => {
    const nuevo = pie.replace(RE_LI, (li) => {
      n++;
      const clon = li
        .replace(/\bcurrent[-\w]*\b/g, '').replace(/\bmenu-item-\d+\b/g, 'menu-item-creditos').replace(/\bpage-item-\d+\b/g, '')
        .replace(/href="[^"]*"/, 'href="/creditos-de-fotos/"')
        .replace(/aria-current="[^"]*"/, '')
        .replace(/(<a\b[^>]*>)([\s\S]*?)(<\/a>)/, (m, a, dentro, c) => a + dentro.replace(/>[^<]*</g, (t) => (t.trim().length > 2 ? '>' + texto + '<' : t)).replace(/^[^<]+$/, texto) + c);
      return li + clon;
    });
    return todo.replace(pie, nuevo);
  });
  if (!n) { sin.push(p.ruta); continue; }
  paginas++; enlaces += n;
  if (!SECO) fs.writeFileSync(ruta, despues);
  if (SECO && paginas === 1) console.log(despues.match(/<li\b[^>]*>\s*<a\b[^>]*href="\/creditos-de-fotos\/"[\s\S]*?<\/li>/)[0]);
}
console.log(`${SECO ? 'EN SECO. ' : ''}Páginas con enlace nuevo: ${paginas} (${enlaces} enlaces). Sin menú de cookies en el pie: ${sin.length}${sin.length ? ' → ' + sin.slice(0, 5).join(', ') : ''}`);
