/**
 * fotos-paginas-nuevas.mjs — fotos de las páginas nuevas (src/data/paginas-nuevas.json).
 * Para cada página busca en Wikimedia Commons con sus 'busquedas' y se queda con
 * fotos reales y libres (CC0, dominio público, CC BY, CC BY-SA; JPG apaisado de
 * 1000 px o más) cuyo título nombre alguna de sus 'claves'. Nunca repite una foto
 * ya usada en la web. Deja:
 *   fotos-nuevas/<slug>-N.jpg            (descarga, fuera de Git)
 *   public/fotos/<slug>-N.webp           920×688, la galería de la ficha
 *   public/fotos/<slug>-1-tarjeta.webp   616×461, la tarjeta de los listados
 *   public/fotos/<slug>-1-ancha.webp     1600×700, el banner de las categorías nuevas
 * y apunta autor y licencia en src/data/fotos-creditos.json (página /creditos-de-fotos/).
 *
 *   node scripts/fotos-paginas-nuevas.mjs [--slug <slug>] [--rehacer [--numeros 2,3]] [--buscar "texto"] [--claves a,b] [--pausa 900]
 *
 * Se puede cortar y volver a lanzar: lo descargado se queda. Con --slug y
 * --rehacer tira las fotos de esa página y las busca otra vez (con --buscar,
 * primero ese texto).
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const RAIZ = path.resolve('.');
const DESCARGAS = path.join(RAIZ, 'fotos-nuevas');
const PUBLICO = path.join(RAIZ, 'public', 'fotos');
const CREDITOS = path.join(RAIZ, 'src', 'data', 'fotos-creditos.json');
const DATOS = JSON.parse(fs.readFileSync(path.join(RAIZ, 'src', 'data', 'paginas-nuevas.json'), 'utf8'));
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > -1 ? process.argv[i + 1] : d; };
const SOLO = arg('--slug', null);
const REHACER = process.argv.includes('--rehacer');
// --numeros 2,3: con --rehacer, solo esas fotos de la página
const NUMEROS = (arg('--numeros', '') || '').split(',').map(Number).filter(Boolean);
// --claves a,b: palabras que valen además de las de la página (para búsquedas genéricas)
const CLAVES_EXTRA = (arg('--claves', '') || '').split(',').map((s) => s.trim()).filter(Boolean);
const BUSCAR = arg('--buscar', null);
const PAUSA = Number(arg('--pausa', 900));
const POR_PAGINA = 3;
const CALIDAD = 82;
const UA = 'ExcursionesValenciaWeb/1.0 (web de excursiones en Valencia; contacto por el formulario de la web)';

const creditos = fs.existsSync(CREDITOS) ? JSON.parse(fs.readFileSync(CREDITOS, 'utf8')) : {};
// fotos descartadas a mano (--rehacer): no vuelven a salir
const DESCARTADAS = path.join(RAIZ, 'src', 'data', 'fotos-descartadas.json');
const descartadas = new Set(fs.existsSync(DESCARTADAS) ? JSON.parse(fs.readFileSync(DESCARTADAS, 'utf8')) : []);
const guardar = () => fs.writeFileSync(CREDITOS, JSON.stringify(creditos, null, 1) + '\n');
fs.mkdirSync(DESCARGAS, { recursive: true });
fs.mkdirSync(PUBLICO, { recursive: true });

const quitarTildes = (t) => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const LICENCIA_OK = /^(cc0|public domain|pd|cc by(-sa)?( \d(\.\d)?)?|cc by \d|cc by-sa \d|cc-by|cc-by-sa|attribution)/i;
// aquí no se descartan barcos, estadios ni aeropuertos (hay páginas de eso); sí lo que no es una foto
const MALAS = /\b(map|mapa|plano|diagram|logo|escudo|coat of arms|flag|bandera|svg|scan|poster|cartel|sello|stamp|moneda|coin|ticket|billete|portada|cover|folleto|brochure|screenshot|captura|tabla|table|graph|chart|book|libro|engraving|grabado|postcard|postal|funeral|cemetery|cementerio|accident|accidente|protest|manifestaci[oó]n)\b/i;
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

async function buscar(q) {
  const u = new URL('https://commons.wikimedia.org/w/api.php');
  Object.entries({ action: 'query', generator: 'search', gsrsearch: q + ' filetype:bitmap', gsrnamespace: 6, gsrlimit: 50, prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata', iiurlwidth: 1280, iiextmetadatafilter: 'LicenseShortName|Artist|LicenseUrl', format: 'json', origin: '*' })
    .forEach(([k, v]) => u.searchParams.set(k, v));
  let datos = {};
  for (let intento = 0; intento < 3; intento++) {
    try { const r = await fetch(u, { headers: { 'User-Agent': UA } }); if (r.ok) { datos = await r.json(); break; } } catch {}
    await espera(2000);
  }
  const buenas = [];
  for (const p of Object.values(datos.query?.pages || {}).sort((a, b) => (a.index || 0) - (b.index || 0))) {
    const ii = p.imageinfo?.[0];
    if (!ii || ii.mime !== 'image/jpeg') continue;
    if (!ii.width || ii.width < 1000 || ii.width <= ii.height || ii.width / ii.height > 2.4) continue;
    const lic = ii.extmetadata?.LicenseShortName?.value || '';
    if (!LICENCIA_OK.test(lic) || MALAS.test(p.title)) continue;
    const autor = (ii.extmetadata?.Artist?.value || '').replace(/<[^>]+>/g, '').trim();
    buenas.push({ titulo: p.title, commons: ii.descriptionurl, url: ii.thumburl || ii.url, original: ii.size && ii.size <= 12 * 1024 * 1024 ? ii.url : null, ancho: ii.thumbwidth || ii.width, alto: ii.thumbheight || ii.height, licencia: lic, licenciaUrl: ii.extmetadata?.LicenseUrl?.value || '', autor });
  }
  await espera(400);
  return buenas;
}

async function descargar(c, destino) {
  for (const [i, url] of [c.url, c.original, c.url].filter(Boolean).entries()) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA } });
      if (r.ok) { fs.writeFileSync(destino, Buffer.from(await r.arrayBuffer())); return true; }
      console.log(`  (${r.status} al bajar, intento ${i + 1})`);
      await espera(r.status === 429 ? 5000 : 2000);
    } catch (e) { console.log(`  (fallo de red: ${e.message.slice(0, 60)})`); await espera(3000); }
  }
  return false;
}

async function convertir(slug, n) {
  const fuente = path.join(DESCARGAS, `${slug}-${n}.jpg`);
  if (!fs.existsSync(fuente)) return;
  const base = sharp(fuente).rotate();
  await base.clone().resize(920, 688, { fit: 'cover', position: 'centre' }).webp({ quality: CALIDAD }).toFile(path.join(PUBLICO, `${slug}-${n}.webp`));
  if (n === 1) {
    await base.clone().resize(616, 461, { fit: 'cover', position: 'centre' }).webp({ quality: CALIDAD }).toFile(path.join(PUBLICO, `${slug}-1-tarjeta.webp`));
    await base.clone().resize(1600, 700, { fit: 'cover', position: 'centre' }).webp({ quality: CALIDAD - 4 }).toFile(path.join(PUBLICO, `${slug}-1-ancha.webp`));
  }
}

const usadas = new Set(Object.values(creditos).map((c) => c.commons));
let hechas = 0, faltan = 0;
for (const p of DATOS.paginas) {
  if (SOLO && p.slug !== SOLO) continue;
  const ruta = `/${p.cat}/${p.slug}/`;
  if (REHACER) {
    for (let n = 1; n <= POR_PAGINA; n++) {
      if (NUMEROS.length && !NUMEROS.includes(n)) continue;
      const clave = `${p.slug}-${n}.webp`;
      if (creditos[clave]) { descartadas.add(creditos[clave].commons); delete creditos[clave]; }
      const f = path.join(DESCARGAS, `${p.slug}-${n}.jpg`);
      if (fs.existsSync(f)) fs.unlinkSync(f);
    }
  }
  fs.writeFileSync(DESCARTADAS, JSON.stringify([...descartadas].sort(), null, 1) + '\n');
  const pendientes = [];
  for (let n = 1; n <= POR_PAGINA; n++) if (!fs.existsSync(path.join(DESCARGAS, `${p.slug}-${n}.jpg`))) pendientes.push(n);
  if (pendientes.length) {
    const claves = [...p.claves, ...CLAVES_EXTRA].map(quitarTildes);
    const candidatas = [];
    for (const q of [...(BUSCAR ? [BUSCAR] : []), ...p.busquedas]) {
      if (candidatas.length >= pendientes.length) break;
      for (const c of await buscar(q)) {
        if (candidatas.length >= pendientes.length) break;
        const t = quitarTildes(c.titulo + ' ' + decodeURIComponent(c.commons || '').replace(/_/g, ' '));
        if (usadas.has(c.commons) || descartadas.has(c.commons) || !claves.some((k) => t.includes(k))) continue;
        usadas.add(c.commons);
        candidatas.push(c);
      }
    }
    for (const n of pendientes) {
      const c = candidatas.shift();
      if (!c) { faltan++; console.log(`  sin foto para ${p.slug}-${n}`); continue; }
      if (await descargar(c, path.join(DESCARGAS, `${p.slug}-${n}.jpg`))) {
        creditos[`${p.slug}-${n}.webp`] = { pagina: ruta, titulo: c.titulo.replace(/^File:/, ''), commons: c.commons, autor: c.autor, licencia: c.licencia, licenciaUrl: c.licenciaUrl, ancho: c.ancho, alto: c.alto };
        guardar();
        hechas++;
        console.log(`  ${p.slug}-${n} ← ${c.titulo.replace(/^File:/, '')} (${c.licencia})`);
      } else { usadas.delete(c.commons); faltan++; }
      await espera(PAUSA);
    }
  }
  for (let n = 1; n <= POR_PAGINA; n++) await convertir(p.slug, n);
  console.log(`${ruta} listo`);
}
console.log(`Descargadas ahora: ${hechas} · sin foto: ${faltan}`);
