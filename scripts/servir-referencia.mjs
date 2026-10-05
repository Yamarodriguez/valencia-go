/**
 * servir-referencia.mjs — sirve la copia de la web vieja (referencia/) en
 * http://localhost:8090 para medirla con el navegador.
 *
 *   node scripts/servir-referencia.mjs [--puerto 8090] [--carpeta referencia]
 *
 * /ruta/            -> referencia/ruta/index.html
 * /wp-content/x.css -> referencia/wp-content/x.css   (se ignora ?ver=)
 * Lo que no existe devuelve 404 (y asi lo cuenta scripts/barrido-404.mjs).
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';

const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const PUERTO = Number(arg('--puerto', 8090));
const CARPETA = path.resolve(arg('--carpeta', 'referencia'));

const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.gif': 'image/gif', '.avif': 'image/avif', '.ico': 'image/x-icon', '.woff': 'font/woff',
  '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf', '.eot': 'application/vnd.ms-fontobject',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime', '.xml': 'application/xml', '.txt': 'text/plain',
};

http.createServer((req, res) => {
  let ruta;
  try { ruta = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { ruta = '/'; }
  let fichero = path.join(CARPETA, ruta);
  if (!fichero.startsWith(CARPETA)) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(fichero) && fs.statSync(fichero).isDirectory()) {
    if (!ruta.endsWith('/')) { res.writeHead(301, { Location: ruta + '/' }); return res.end(); }
    fichero = path.join(fichero, 'index.html');
  }
  if (!fs.existsSync(fichero) || !fs.statSync(fichero).isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    return res.end('404 ' + ruta);
  }
  res.writeHead(200, { 'Content-Type': TIPOS[path.extname(fichero).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(fichero).pipe(res);
}).listen(PUERTO, () => console.log(`referencia en http://localhost:${PUERTO}/  (carpeta ${CARPETA})`));
