/**
 * fotos-commons.mjs — busca en Wikimedia Commons una foto real y con licencia
 * libre para cada foto del inventario (src/data/fotos.json) y la deja en
 * fotos-nuevas/<nombre nuevo>.jpg, lista para cambiar-fotos.mjs. Apunta el
 * autor y la licencia de cada una en src/data/fotos-creditos.json y en
 * informes/fotos-creditos.md (las licencias CC BY y CC BY-SA obligan a citar).
 *
 *   node scripts/fotos-commons.mjs [--limite N] [--pagina /ruta/] [--seco]
 *
 * Cómo busca: por página, con las palabras del H1 sin las genéricas
 * (excursión, tour, pack…), en Commons; se queda con JPG apaisados de al menos
 * 1000 px, con licencia CC0, dominio público, CC BY o CC BY-SA, y descarta
 * mapas, planos, logos, escudos y banderas. Si no llega, acorta la búsqueda y,
 * al final, tira de un fondo general de Valencia. Nunca repite una foto.
 * Se puede cortar y volver a lanzar: lo descargado se queda.
 */
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve('.');
const SALIDA = path.join(RAIZ, 'fotos-nuevas');
const CREDITOS = path.join(RAIZ, 'src', 'data', 'fotos-creditos.json');
const INFORME = path.join(RAIZ, 'informes', 'fotos-creditos.md');
const LISTA = JSON.parse(fs.readFileSync(path.join(RAIZ, 'src', 'data', 'fotos.json'), 'utf8'));
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > -1 ? process.argv[i + 1] : d; };
const LIMITE = Number(arg('--limite', 0));
const SOLO = arg('--pagina', null);
const SECO = process.argv.includes('--seco');
const UA = 'ExcursionesValenciaWeb/1.0 (web de excursiones en Valencia; contacto por el formulario de la web)';

const creditos = fs.existsSync(CREDITOS) ? JSON.parse(fs.readFileSync(CREDITOS, 'utf8')) : {};
const usadas = new Set(Object.values(creditos).map((c) => c.commons));
fs.mkdirSync(SALIDA, { recursive: true });

// --rehacer foto1,foto2 --buscar "texto": tira esas fotos (fichero y crédito) y
// las vuelve a buscar con ese texto en vez de con el H1. Después, cambiar-fotos.
// --rehacer admite una lista separada por comas o @fichero.json (lista de {foto} o de nombres)
let rehacerArg = arg('--rehacer', '') || '';
if (rehacerArg.startsWith('@')) rehacerArg = JSON.parse(fs.readFileSync(rehacerArg.slice(1), 'utf8')).map((x) => (typeof x === 'string' ? x : x.foto)).join(',');
const REHACER = rehacerArg.split(',').map((s) => s.trim().replace(/\.(jpg|webp)$/i, '')).filter(Boolean);
const BUSCAR = arg('--buscar', null);
for (const n of REHACER) {
  const clave = n + '.webp';
  if (creditos[clave]) { usadas.delete(creditos[clave].commons); delete creditos[clave]; }
  const f = path.join(SALIDA, n + '.jpg');
  if (fs.existsSync(f)) fs.unlinkSync(f);
}

// --- consulta a partir del H1 --------------------------------------------------
const GENERICAS = new Set(('excursion excursiones tour tours visita visitas guiada guiado guiadas guiados pack packs familiar actividades actividad dto descuento ' +
  'cruceros crucero desde puerto con y a de la el los las del al en por para un una uno completo completa dia días dias especial premium entradas entrada ' +
  'comida cena almuerzo ruta rutas privado privada privados grupo grupos reserva reservar precio precios oferta ofertas mejor mejores que como donde cuando ' +
  'razones ideas planes planazos imprescindibles datos horas guia guias oficial oficiales nuestros nuestro tu tus te se es son hay mas más sin medida ' +
  'experiencia experiencias empresa empresas evento eventos team building teambuilding equipo quienes somos contacto informacion información bus autobus autobús ' +
  'vivirlo podrás podras veras verás dentro qué cómo dónde quién 2023 2024 2025 2026 todo año ano semana fin').split(/\s+/));
const quitarTildes = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '');
function palabras(texto) {
  return quitarTildes(String(texto)).toLowerCase().replace(/&amp;/g, ' ').replace(/[^a-z0-9ñ\s-]/g, ' ').split(/[\s-]+/)
    .filter((p) => p.length > 2 && !GENERICAS.has(p) && !/^\d+$/.test(p));
}
// fondo general: sitios concretos de Valencia, para que "valencia" a secas no
// traiga Valencia de Venezuela, Filipinas o un tren
const FONDO = ['Ciudad de las Artes y las Ciencias Valencia', 'Plaza de la Virgen Valencia', 'Mercado Central de Valencia', 'Lonja de la Seda Valencia', 'Torres de Serranos Valencia',
  'Catedral de Valencia Miguelete', 'Playa de la Malvarrosa Valencia', 'Jardín del Turia Valencia', 'Plaza del Ayuntamiento Valencia', 'Albufera de Valencia atardecer', 'Barrio del Carmen Valencia calle',
  'Mercado de Colón Valencia', 'Oceanogràfic Valencia', 'Palau de la Música Valencia', 'Puerto de Valencia Marina', 'Torres de Quart Valencia', 'Estación del Norte Valencia fachada', 'Fallas Valencia ninot'];
let fondoIndice = 0;
// sitios y cosas de aquí: una foto solo vale si su título en Commons nombra
// alguno (o una palabra concreta de la búsqueda); así no cuelan Cracovia,
// Buenos Aires o un plato chileno por "semana santa"
const LUGARES = ('valencia valencian valenciana valenciano albufera lonja miguelete serranos quart ruzafa russafa malvarrosa turia saler palmar cullera sagunt sagunto xativa jativa ' +
  'peniscola requena utiel pedrones bocairent tabarca altea benidorm guadalest terra mitica morella montanejos uixo sant josep coves cuevas calaveras denia culla maestrat ' +
  'fallas falla ninot mascleta paella horchata orxata fartons mercado central mercat colon oceanografic hemisferic ciutat ciudad artes ciencias umbracle bioparc viveros monforte ' +
  'cabanyal canyamelar grao grau marina castellon castello alicante alacant comunitat comunidad paterna manises sueca gandia alboraya alboraia godella chulilla bunol ' +
  'carmen carme virgen mare de deu catedral cathedral seu almoina santos juanes nicolas patriarca dos aguas aigues ayuntamiento ajuntament norte nord estacio bellas artes ' +
  'ivam torres puente pont flores exposicion calatrava jardin jardi botanico palau musica mestalla benimaclet patacona alqueria huerta horta naranjo naranjos taronja ' +
  'bodega vinedo vina vineyard tapas vino wine queso arroz all i pebre barca albufereta eclipse').split(/\s+/);
const encaja = (c, q) => {
  const t = quitarTildes(c.titulo + ' ' + decodeURIComponent(c.commons || '')).toLowerCase();
  if (LUGARES.some((l) => t.includes(l))) return true;
  return palabras(q).some((w) => w.length > 3 && w !== 'valencia' && t.includes(w));
};
function consultas(h1) {
  const p = palabras(h1).filter((w) => w !== 'valencia');
  const lista = [];
  // la búsqueda por el título solo si nombra un sitio o cosa conocida; si no, directamente el fondo
  const conocido = p.some((w) => LUGARES.includes(w));
  if (conocido && p.length) lista.push(p.slice(0, 5).join(' '));
  if (conocido && p.length > 3) lista.push(p.slice(0, 3).join(' '));
  if (conocido && p.length > 1) lista.push(p.slice(0, 2).join(' ') + ' Valencia');
  if (conocido && p.length > 1) lista.push(p.slice(0, 2).join(' '));
  if (conocido && p.length === 1) lista.push(p[0] + ' Valencia España');
  // el fondo va rotando para no repetir siempre los mismos sitios
  for (let i = 0; i < FONDO.length; i++) lista.push(FONDO[(fondoIndice + i) % FONDO.length]);
  fondoIndice = (fondoIndice + 3) % FONDO.length;
  return [...new Set(lista)];
}

// --- Commons -------------------------------------------------------------------
const LICENCIA_OK = /^(cc0|public domain|pd|cc by(-sa)?( \d(\.\d)?)?|cc by \d|cc by-sa \d|cc-by|cc-by-sa|attribution)/i;
const MALAS = /\b(map|mapa|plano|plan|diagram|logo|escudo|coat of arms|flag|bandera|svg|scan|poster|cartel|sello|stamp|moneda|coin|ticket|billete|portada|cover|page|p[aá]gina|folleto|brochure|screenshot|captura|texto|text|tabla|table|graph|gr[aá]fico|chart|book|libro|drawing|dibujo|engraving|grabado|postcard|postal|bohol|philippines|filipinas|venezuela|carabobo|colombia|m[eé]xico|argentina|feve|renfe|train|tren|metro|tranv[ií]a|tram|station|estaci[oó]n|bus|autob[uú]s|truck|cami[oó]n|coche|cars?|football|f[uú]tbol|soccer|player|jugador|match|partido|aircraft|avi[oó]n|airport|aeropuerto|ship|cruise|crucero|funeral|cemetery|cementerio|hospital|police|polic[ií]a|military|militar|protest|manifestaci[oó]n|accident|accidente|fire|incendio|ruins?\s+of\s+war)\b/i;
const cache = new Map();
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

async function buscar(q) {
  if (cache.has(q)) return cache.get(q);
  const u = new URL('https://commons.wikimedia.org/w/api.php');
  // 1280 px es un tamaño que Commons suele tener ya generado (menos 429 que uno raro)
  Object.entries({ action: 'query', generator: 'search', gsrsearch: q + ' filetype:bitmap', gsrnamespace: 6, gsrlimit: 50, prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata', iiurlwidth: 1280, iiextmetadatafilter: 'LicenseShortName|Artist|LicenseUrl|Credit', format: 'json', origin: '*' })
    .forEach(([k, v]) => u.searchParams.set(k, v));
  let datos = {};
  for (let intento = 0; intento < 3; intento++) {
    try { const r = await fetch(u, { headers: { 'User-Agent': UA } }); if (r.ok) { datos = await r.json(); break; } } catch {}
    await espera(1500);
  }
  const paginas = Object.values(datos.query?.pages || {});
  const buenas = [];
  for (const p of paginas) {
    const ii = p.imageinfo?.[0];
    if (!ii || ii.mime !== 'image/jpeg') continue;
    if (!ii.width || ii.width < 1000 || ii.width <= ii.height || ii.width / ii.height > 2.4) continue;
    const lic = ii.extmetadata?.LicenseShortName?.value || '';
    if (!LICENCIA_OK.test(lic)) continue;
    if (MALAS.test(p.title)) continue;
    const autor = (ii.extmetadata?.Artist?.value || '').replace(/<[^>]+>/g, '').trim();
    buenas.push({ titulo: p.title, commons: ii.descriptionurl, url: ii.thumburl || ii.url, original: ii.size && ii.size <= 12 * 1024 * 1024 ? ii.url : null, ancho: ii.thumbwidth || ii.width, alto: ii.thumbheight || ii.height, licencia: lic, licenciaUrl: ii.extmetadata?.LicenseUrl?.value || '', autor });
  }
  cache.set(q, buenas);
  await espera(300);
  return buenas;
}

// baja la miniatura de 1280 px; si el generador de miniaturas de Commons
// devuelve 429 (va saturado), baja el original (si no pasa de 12 MB), que
// sale de otro servidor y no tiene ese límite; cambiar-fotos lo reduce luego
async function descargar(c, destino) {
  const intentos = [c.url, c.original, c.url].filter(Boolean);
  for (let i = 0; i < intentos.length; i++) {
    const url = intentos[i];
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA } });
      if (r.ok) { fs.writeFileSync(destino, Buffer.from(await r.arrayBuffer())); return true; }
      console.log(`  (${r.status} al bajar ${url.split('/').pop().slice(0, 60)}, intento ${i + 1})`);
      await espera(r.status === 429 ? 4000 : 2000);
    } catch (e) { console.log(`  (fallo de red: ${e.message.slice(0, 60)}, intento ${i + 1})`); await espera(3000); }
  }
  return false;
}

// --- recorrido por páginas -------------------------------------------------------
const porPagina = new Map();
for (const [vieja, e] of Object.entries(LISTA)) {
  if (e.clase !== 'foto' || !e.nuevo || e.miniatura) continue;
  if (SOLO && e.pagina !== SOLO) continue;
  if (REHACER.length && !REHACER.includes(e.nuevo.replace(/\.webp$/, ''))) continue;
  if (!porPagina.has(e.pagina)) porPagina.set(e.pagina, { h1: e.h1, fotos: [] });
  porPagina.get(e.pagina).fotos.push({ vieja, ...e });
}
let hechas = 0, faltan = 0, paginasHechas = 0;
const HILOS = Number(arg('--hilos', 2));
const PAUSA = Number(arg('--pausa', 1200)); // ms entre descargas, por hilo (Commons devuelve 429 si se va más deprisa)
const cola = [...porPagina.entries()].filter(([, p]) => p.fotos.some((f) => !fs.existsSync(path.join(SALIDA, f.nuevo.replace(/\.webp$/, '.jpg')))));
if (LIMITE) cola.splice(LIMITE);
const guardar = () => fs.writeFileSync(CREDITOS, JSON.stringify(creditos, null, 1) + '\n');

async function pagina([ruta, p]) {
  const pendientes = p.fotos.filter((f) => !fs.existsSync(path.join(SALIDA, f.nuevo.replace(/\.webp$/, '.jpg'))));
  paginasHechas++;
  const qs = BUSCAR ? [BUSCAR, ...consultas(p.h1)] : consultas(p.h1);
  console.log(`${ruta} · ${pendientes.length} fotos · busca: ${qs.slice(0, 2).join(' | ')}`);
  if (SECO) return;
  const candidatas = [];
  for (const q of qs) {
    if (candidatas.length >= pendientes.length) break;
    const r = await buscar(q);
    // de una búsqueda de fondo se toman 2 como mucho, para variar de sitio
    const tope = FONDO.includes(q) ? 2 : Infinity;
    let n = 0;
    for (const c of r) {
      if (n >= tope || candidatas.length >= pendientes.length) break;
      if (usadas.has(c.commons) || !encaja(c, q)) continue;
      usadas.add(c.commons); // se reserva ya, para que otro hilo no la coja
      candidatas.push(c); n++;
    }
  }
  for (const f of pendientes) {
    const c = candidatas.shift();
    if (!c) { faltan++; console.log(`  sin foto para ${f.nuevo}`); continue; }
    const destino = path.join(SALIDA, f.nuevo.replace(/\.webp$/, '.jpg'));
    if (await descargar(c, destino)) {
      creditos[f.nuevo] = { pagina: ruta, titulo: c.titulo.replace(/^File:/, ''), commons: c.commons, autor: c.autor, licencia: c.licencia, licenciaUrl: c.licenciaUrl, ancho: c.ancho, alto: c.alto };
      hechas++;
      guardar();
    } else { usadas.delete(c.commons); faltan++; console.log(`  no se pudo bajar ${c.titulo}`); }
    await espera(PAUSA);
  }
}

// varias páginas a la vez (las búsquedas van en caché; Commons admite este ritmo con User-Agent)
await Promise.all(Array.from({ length: Math.min(HILOS, cola.length) }, async () => { while (cola.length) await pagina(cola.shift()); }));

// --- créditos ------------------------------------------------------------------
const lineas = ['# Créditos de las fotos (Wikimedia Commons)', '', `Generado el ${new Date().toISOString().slice(0, 10)} por scripts/fotos-commons.mjs. Las fotos con licencia CC BY o CC BY-SA deben citarse así en una página de créditos de la web.`, '', '| Foto en la web | Página | Autor | Licencia | Original |', '|---|---|---|---|---|'];
for (const [nuevo, c] of Object.entries(creditos).sort((a, b) => a[1].pagina.localeCompare(b[1].pagina))) lineas.push(`| \`${nuevo}\` | ${c.pagina} | ${c.autor || '(sin autor indicado)'} | [${c.licencia}](${c.licenciaUrl || c.commons}) | [${c.titulo}](${c.commons}) |`);
fs.mkdirSync(path.dirname(INFORME), { recursive: true });
fs.writeFileSync(INFORME, lineas.join('\n') + '\n');
console.log(`Descargadas ahora: ${hechas} · sin foto: ${faltan} · total con crédito: ${Object.keys(creditos).length} de ${[...porPagina.values()].reduce((s, p) => s + p.fotos.length, 0)}`);
