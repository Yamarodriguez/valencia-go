/**
 * piezas.js — lee las piezas de una pagina (src/content/paginas/<nombre>.html),
 * tal como las dejo scripts/partir-paginas.mjs: cabeza, antes, cabecera,
 * contenido, pie y despues. No cambia nada: solo las separa.
 */
import fs from 'node:fs';
import path from 'node:path';

const DIR = path.resolve('src/content/paginas');

export function indice() {
  return JSON.parse(fs.readFileSync(path.join(DIR, 'indice.json'), 'utf8'));
}

export function leerPiezas(nombre) {
  const texto = fs.readFileSync(path.join(DIR, nombre + '.html'), 'utf8');
  const trozos = texto.split(/\n<!--@@(\w+)@@-->\n/);
  const piezas = {};
  for (let i = 1; i < trozos.length; i += 2) piezas[trozos[i]] = trozos[i + 1];
  return piezas;
}
