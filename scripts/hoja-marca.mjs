/**
 * hoja-marca.mjs — monta la hoja de diseño de Excursiones Valencia:
 * public/rediseno/excursiones-valencia.css = las @font-face de
 * public/fuentes-marca/fuentes.css (scripts/fuentes-marca.mjs) + las reglas de
 * src/estilos/excursiones-valencia.css. Se engancha como última hoja de cada
 * página con "rediseno": "excursiones-valencia" en src/data/site.json.
 *
 *   node scripts/hoja-marca.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const letras = fs.readFileSync(path.resolve('public/fuentes-marca/fuentes.css'), 'utf8');
const reglas = fs.readFileSync(path.resolve('src/estilos/excursiones-valencia.css'), 'utf8');
const salida = path.resolve('public/rediseno/excursiones-valencia.css');
fs.mkdirSync(path.dirname(salida), { recursive: true });
fs.writeFileSync(salida, `/* Generado por scripts/hoja-marca.mjs: no se edita a mano (editar src/estilos/excursiones-valencia.css). */\n${letras}\n${reglas}`);
console.log(`hoja-marca: ${path.relative(process.cwd(), salida)} (${Math.round(fs.statSync(salida).size / 1024)} KB)`);
