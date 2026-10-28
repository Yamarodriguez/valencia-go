/**
 * seo-archivos.mjs — los ficheros que leen los buscadores y las IA antes que
 * las paginas (28-10-2026, segun src/data/seo.json):
 *
 *   npm run seo            (node scripts/seo-archivos.mjs [--seco])
 *
 * 1. public/robots.txt: todos pueden entrar; se nombran los robots de
 *    buscadores y de IA de seo.json "robots"; mapa del sitio y llms.txt.
 * 2. Mapa del sitio: las paginas que se pueden indexar (sin noindex, sin
 *    paginacion) y que no estan en los mapas de la web vieja van a
 *    public/<seo.mapa.fichero>, enlazado desde sitemap_index.xml. De los mapas
 *    viejos se quitan las direcciones que ya no son pagina (redirigen).
 * 3. public/llms.txt: que es la web y sus paginas clave, por secciones, con el
 *    titulo y la descripcion que ya tiene cada pagina (formato llmstxt.org).
 *
 * El dominio sale de site.json "dominio": el dia que cambie, repetir.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const RAIZ = path.resolve('.');
const PUB = path.join(RAIZ, 'public');
const DIR = path.join(RAIZ, 'src', 'content', 'paginas');
const SECO = process.argv.includes('--seco');
const seo = JSON.parse(fs.readFileSync(path.join(RAIZ, 'src', 'data', 'seo.json'), 'utf8'));
const site = JSON.parse(fs.readFileSync(path.join(RAIZ, 'src', 'data', 'site.json'), 'utf8'));
const indice = JSON.parse(fs.readFileSync(path.join(DIR, 'indice.json'), 'utf8'));
const DOMINIO = site.dominio.replace(/\/$/, '');
const escribir = (nombre, texto) => {
  const f = path.join(PUB, nombre);
  const antes = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null;
  if (antes === texto) return console.log(`  ${nombre}: sin cambios`);
  console.log(`  ${nombre}: ${antes === null ? 'nuevo' : 'actualizado'}`);
  if (!SECO) fs.writeFileSync(f, texto);
};

// ---------------------------------------------------------------- paginas
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', ndash: '–', mdash: '—', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', euro: '€', laquo: '«', raquo: '»' };
const texto = (s) => s.replace(/<[^>]+>/g, ' ')
  .replace(/&#(\d+);/g, (t, n) => String.fromCodePoint(+n))
  .replace(/&#x([0-9a-f]+);/gi, (t, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&([a-z]+);/gi, (t, n) => ENT[n.toLowerCase()] ?? t)
  .replace(/\s+/g, ' ').trim();
const paginado = /\/(page|pagina|strona)\/\d+\/$/;
const paginas = indice.map((p) => {
  const t = fs.readFileSync(path.join(DIR, p.nombre + '.html'), 'utf8');
  const cab = t.split(/\n<!--@@antes@@-->\n/)[0];
  const meta = (re) => { const m = cab.match(re); return m ? texto(m[1]) : ''; };
  return {
    ...p,
    titulo: meta(/<title>([\s\S]*?)<\/title>/),
    descripcion: meta(/<meta name="description" content="([^"]*)"/),
    noindex: /<meta name=['"]robots['"] content=['"][^'"]*noindex/.test(cab),
    fichero: path.join(DIR, p.nombre + '.html'),
  };
});
const indexables = paginas.filter((p) => !p.noindex && !paginado.test(p.ruta) && p.ruta.endsWith('/'));

// --------------------------------------------------------------- robots.txt
{
  const r = seo.robots;
  const lineas = [
    `# robots.txt de ${site.nombre}. Lo escribe scripts/seo-archivos.mjs (src/data/seo.json).`,
    '# Todos los buscadores y asistentes de IA pueden leer la web entera.',
    '',
    'User-agent: *',
    ...(r.noRastrear.length ? r.noRastrear.map((x) => `Disallow: ${x}`) : ['Disallow:']),
    '',
    '# Buscadores y asistentes de IA, nombrados para que no haya dudas: bienvenidos.',
    ...r.bots.map((b) => `User-agent: ${b}`),
    'Allow: /',
    ...r.noRastrear.map((x) => `Disallow: ${x}`),
    '',
    `# Resumen de la web para asistentes de IA: ${DOMINIO}/llms.txt`,
    `Sitemap: ${DOMINIO}/sitemap_index.xml`,
    '',
  ];
  escribir('robots.txt', lineas.join('\n'));
}

// ------------------------------------------------------------- mapa del sitio
{
  const nombreNuevo = seo.mapa.fichero;
  const ruta = (u) => u.replace(/^https?:\/\/[^/]+/, '') || '/';
  const existe = new Set(paginas.map((p) => p.ruta));
  const enMapas = new Set();
  const viejos = fs.readdirSync(PUB).filter((f) => /-sitemap\.xml$/.test(f) && f !== nombreNuevo);
  let quitadas = 0;
  for (const f of viejos) {
    const xml = fs.readFileSync(path.join(PUB, f), 'utf8');
    const limpio = xml.replace(/[ \t]*<url>[\s\S]*?<\/url>\s*/g, (bloque) => {
      const loc = ruta((bloque.match(/<loc>([^<]+)<\/loc>/) || [])[1] || '');
      if (existe.has(loc)) {
        enMapas.add(loc);
        for (const m of bloque.matchAll(/<xhtml:link[^>]+href="([^"]+)"/g)) enMapas.add(ruta(m[1]));
        return bloque;
      }
      console.log(`  ${f}: fuera ${loc} (ya no es pagina)`);
      quitadas++;
      return '';
    });
    if (limpio !== xml) escribir(f, limpio);
  }
  const faltan = indexables.filter((p) => !enMapas.has(p.ruta) && p.ruta !== '/');
  // fecha de cada pagina: la del ultimo commit que toco su pieza (estable entre ejecuciones)
  const fecha = (f) => {
    try { return execFileSync('git', ['log', '-1', '--format=%cI', '--', f], { encoding: 'utf8' }).trim(); } catch { return ''; }
  };
  const hoy = new Date().toISOString().replace(/\.\d+Z$/, '+00:00');
  const urls = faltan.map((p) => ({ loc: DOMINIO + p.ruta, lastmod: fecha(p.fichero) || hoy }));
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!-- Paginas de Excursiones Valencia que no estaban en los mapas de la web vieja. Lo escribe scripts/seo-archivos.mjs. -->',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map((u) => `\t<url>\n\t\t<loc>${u.loc}</loc>\n\t\t<lastmod>${u.lastmod}</lastmod>\n\t</url>`),
    '</urlset>',
    '',
  ].join('\n');
  escribir(nombreNuevo, xml);
  const ultima = urls.map((u) => u.lastmod).sort().pop() || hoy;
  const fIndice = path.join(PUB, 'sitemap_index.xml');
  const idx = fs.readFileSync(fIndice, 'utf8');
  const entrada = `\t<sitemap>\n\t\t<loc>${DOMINIO}/${nombreNuevo}</loc>\n\t\t<lastmod>${ultima}</lastmod>\n\t</sitemap>\n`;
  const sinNuevo = idx.replace(new RegExp(`\\t<sitemap>\\s*<loc>[^<]*/${nombreNuevo.replace(/\./g, '\\.')}</loc>[\\s\\S]*?</sitemap>\\s*`), '');
  escribir('sitemap_index.xml', sinNuevo.replace('</sitemapindex>', entrada + '</sitemapindex>'));
  console.log(`mapa: ${urls.length} paginas en ${nombreNuevo}; ${quitadas} quitadas de los mapas viejos`);
}

// ----------------------------------------------------------------- llms.txt
{
  const L = seo.llms;
  const esp = indexables.filter((p) => p.idioma === 'es' || !/^\/(en|fr|it|pl)\//.test(p.ruta));
  const marca = new RegExp(`\\s*[|·–-]\\s*(Blog\\s+)?${site.nombre}\\s*$`, 'i');
  const linea = (p) => `- [${(p.titulo || p.ruta).replace(marca, '')}](${DOMINIO}${p.ruta})${p.descripcion ? ': ' + p.descripcion : ''}`;
  const usadas = new Set(['/']);
  const partes = [`# ${L.titulo}`, '', `> ${L.resumen}`, '', ...L.detalles.map((d) => `- ${d}`), '', `- [Portada](${DOMINIO}/)`, ''];
  const opcionales = [];
  for (const s of L.secciones) {
    const lista = esp.filter((p) => !usadas.has(p.ruta) && (
      (s.rutas && s.rutas.some((r) => p.ruta.startsWith(r))) ||
      (s.tipos && s.tipos.includes(p.tipo))
    )).sort((a, b) => (a.ruta.split('/').length - b.ruta.split('/').length) || a.ruta.localeCompare(b.ruta));
    if (!lista.length) continue;
    lista.forEach((p) => usadas.add(p.ruta));
    (s.opcional ? opcionales : partes).push(`## ${s.titulo}`, '', ...lista.map(linea), '');
  }
  const idiomas = [['en', 'English'], ['fr', 'Français'], ['it', 'Italiano'], ['pl', 'Polski']]
    .filter(([c]) => indexables.some((p) => p.ruta === `/${c}/`))
    .map(([c, n]) => `- [${n}](${DOMINIO}/${c}/)`);
  if (idiomas.length) partes.push('## Otros idiomas', '', ...idiomas, '');
  // "Optional" (llmstxt.org): lo que un asistente puede saltarse si va corto de espacio; siempre al final
  if (opcionales.length) partes.push('## Optional', '', ...opcionales.filter((x) => !x.startsWith('## ') && x !== ''));
  escribir('llms.txt', partes.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n');
}
