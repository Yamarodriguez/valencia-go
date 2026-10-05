/**
 * legales.mjs — mete en los JSON de las paginas legales el texto que tienen
 * hoy en la web en vivo.
 *
 *   node scripts/descargar-legales.mjs    (baja legales-vivos.json)
 *   node scripts/legales.mjs              (lo mete en src/content/pages/)
 *
 * WordPress las exporto vacias porque el plugin de RGPD las pintaba al vuelo.
 * El texto no se inventa: es el del propio sitio, limpiado de los restos del
 * tema. Las paginas legales quedan en noindex.
 */
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve('.');
const PAGINAS = path.join(RAIZ, 'src', 'content', 'pages');
const FUENTE = path.join(RAIZ, 'legales-vivos.json');

if (!fs.existsSync(FUENTE)) {
  console.error('falta legales-vivos.json — ejecuta antes scripts/descargar-legales.mjs');
  process.exit(1);
}

const vivos = JSON.parse(fs.readFileSync(FUENTE, 'utf8'));

function limpiar(html) {
  let c = html;
  c = c.replace(/<(script|style|noscript)\b[\s\S]*?<\/\1>/gi, '');
  c = c.replace(/<!--[\s\S]*?-->/g, '');
  // restos del tema y del plugin
  c = c.replace(/\s(?:itemprop|itemscope|itemtype|data-[a-z-]+|id|role|tabindex)="[^"]*"/gi, '');
  c = c.replace(/\sclass="[^"]*"/gi, '');
  c = c.replace(/<div\b[^>]*>/gi, '').replace(/<\/div\s*>/gi, '');
  // enlaces absolutos del propio dominio -> relativos
  c = c.replace(/https?:\/\/(?:www\.)?casascontenedores\.es\/?/gi, '/');
  // enlaces sin destino que deja el plugin: se desenvuelven conservando el texto
  // (ojo con \b tras la "a": </aside> tambien empieza por </a)
  c = c.replace(/<a(?=[\s>])(?![^>]*\shref="[^"]+")[^>]*>([\s\S]*?)<\/a\s*>/gi, '$1');
  // <ul> dentro de <p>: HTML invalido que trae el plugin
  c = c.replace(/<p>\s*(<ul[\s\S]*?<\/ul>)\s*<\/p>/gi, '$1');
  c = c.replace(/<p>(?:\s|&nbsp;|<br\s*\/?>)*<\/p>/gi, '');
  c = c.replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').replace(/\n{2,}/g, '\n');
  return c.trim();
}

const textoPlano = (h) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

let tocadas = 0;
for (const [ruta, html] of Object.entries(vivos)) {
  if (!html || html.length < 200) {
    console.log(`saltada ${ruta} (la web viva no devolvio texto)`);
    continue;
  }
  const fichero = fs.readdirSync(PAGINAS)
    .filter((f) => f.endsWith('.json'))
    .find((f) => JSON.parse(fs.readFileSync(path.join(PAGINAS, f), 'utf8')).ruta === ruta);
  if (!fichero) {
    console.log(`saltada ${ruta} (no hay pagina con esa ruta)`);
    continue;
  }

  const destino = path.join(PAGINAS, fichero);
  const pagina = JSON.parse(fs.readFileSync(destino, 'utf8'));
  let cuerpo = limpiar(html);

  // el primer encabezado pasa a ser el H1 de la pagina, como en el resto
  const m = cuerpo.match(/<(h[1-3])\b[^>]*>([\s\S]*?)<\/\1>/i);
  if (m && !pagina.h1) {
    pagina.h1 = textoPlano(m[2]);
    cuerpo = cuerpo.slice(0, m.index) + cuerpo.slice(m.index + m[0].length);
  }
  cuerpo = cuerpo.replace(/<(\/?)h1\b/gi, '<$1h2');

  pagina.cuerpo = cuerpo.trim();
  pagina.palabras = textoPlano(cuerpo).split(/\s+/).filter(Boolean).length;
  pagina.noindex = true;          // las legales no van al indice ni al sitemap
  if (!pagina.h1) pagina.h1 = pagina.titulo;
  if (!pagina.descripcion) {
    pagina.descripcion = `${pagina.titulo} de casascontenedores.es. Información legal del titular del sitio web.`;
  }

  fs.writeFileSync(destino, JSON.stringify(pagina, null, 1), 'utf8');
  console.log(`${ruta} -> ${pagina.palabras} palabras, noindex`);
  tocadas++;
}

console.log(`\n${tocadas} pagina(s) legales actualizadas`);
