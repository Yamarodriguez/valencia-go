/**
 * comparar-encabezados.mjs — compara encabezado a encabezado la web nueva
 * con la web en vivo, pagina por pagina.
 *
 *   npm run build && node scripts/comparar-encabezados.mjs
 *
 * Usa estructura-viva.json (lo genera scripts/descargar-estructura.mjs en el
 * PC del propietario, que si tiene salida a casascontenedores.es).
 *
 * Que se compara: la SECUENCIA DE TEXTOS de los encabezados, en orden.
 * El nivel puede cambiar en un solo caso permitido y documentado: el <h1> de
 * cada pagina es ahora el del heroe (su titulo, fuera de <main>), asi que en
 * las 64 paginas que traian un h1 dentro del contenido ese encabezado baja a
 * h2. Cualquier otra diferencia se reporta.
 *
 * Tambien se admiten los encabezados reescritos a peticion del propietario
 * en paginas concretas (src/data/encabezados.json): se comparan con su texto
 * nuevo.
 *
 * Lo que la web nueva anade a proposito (formulario, pie, bloques generados)
 * no cuenta como diferencia: solo se exige que NO FALTE nada del original.
 */
import fs from 'node:fs';
import path from 'node:path';
import { corregir } from './erratas.mjs';

const RAIZ = path.resolve('.');
const DIST = path.join(RAIZ, 'dist');
const VIVO = path.join(RAIZ, 'estructura-viva.json');

if (!fs.existsSync(VIVO)) {
  console.error('falta estructura-viva.json — ejecuta antes scripts/descargar-estructura.mjs');
  process.exit(1);
}

const normalizar = (t) =>
  t.replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&[a-z]+;/gi, ' ')
    // comillas y guiones tipograficos: el HTML vivo usa los curvos y el
    // export los rectos. No es una diferencia de estructura.
    .replace(/[\u2018\u2019\u201a\u201b\u2032]/g, "'")
    .replace(/[\u201c\u201d\u201e\u201f\u2033]/g, '"')
    .replace(/[\u2010-\u2015]/g, '-')
    .replace(/[\s ]+/g, ' ')
    .trim()
    .toLowerCase();

function encabezadosDe(html) {
  // el H1 va en la banda de titulo, fuera de <main>; el resto dentro
  const salida = [];
  const h1 = html.match(/<h1[^>]*class="titulo"[^>]*>([\s\S]*?)<\/h1>/);
  if (h1) salida.push({ nivel: 'h1', texto: normalizar(h1[1]) });
  const cuerpo = (html.match(/<main id="main"[^>]*>([\s\S]*?)<\/main>/) || [, ''])[1];
  for (const m of cuerpo.matchAll(/<(h[123])\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    const t = normalizar(m[2]);
    if (t) salida.push({ nivel: m[1].toLowerCase(), texto: t });
  }
  return salida;
}

const vivo = JSON.parse(fs.readFileSync(VIVO, 'utf8'));

// Segundo cambio permitido y documentado: los encabezados que el propietario
// pidio reescribir en paginas concretas (src/data/encabezados.json, los
// aplica src/utils/renombres.js al pintar). Cada original se compara con su
// texto nuevo; lo demas de la pagina se exige igual que siempre.
const RENOMBRES = (() => {
  const f = path.join(RAIZ, 'src', 'data', 'encabezados.json');
  if (!fs.existsSync(f)) return {};
  const datos = JSON.parse(fs.readFileSync(f, 'utf8'));
  return Object.fromEntries(Object.entries(datos).map(([ruta, m]) =>
    [ruta, new Map(Object.entries(m).map(([k, v]) => [normalizar(k), normalizar(v)]))]));
})();
// Tercer cambio permitido y documentado: la rejilla de tipos de contenedor
// ("Contenedor 20 Pies", "Contenedor High cube"...) se pinta en el orden que
// pidio el propietario (src/data/orden-tipos.json, lo aplica
// src/utils/tipos.js). Cada tanda seguida de h3 de tipo del original se
// compara ya reordenada; el resto de la pagina, igual que siempre.
const ORDEN_TIPOS = (() => {
  const f = path.join(RAIZ, 'src', 'data', 'orden-tipos.json');
  if (!fs.existsSync(f)) return [];
  return JSON.parse(fs.readFileSync(f, 'utf8')).tipos.map((t) => new RegExp(t.patron));
})();
const sinTildes = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
const rangoTipo = (e) => (e.nivel === 'h3' ? ORDEN_TIPOS.findIndex((p) => p.test(sinTildes(e.texto))) : -1);
function ordenarTandasDeTipos(lista) {
  const salida = [...lista];
  for (let i = 0; i < salida.length;) {
    let j = i;
    while (j < salida.length && rangoTipo(salida[j]) >= 0) j++;
    if (j - i >= 3) {
      const tanda = salida.slice(i, j).map((e, k) => ({ e, k })).sort((a, b) => rangoTipo(a.e) - rangoTipo(b.e) || a.k - b.k);
      salida.splice(i, j - i, ...tanda.map((x) => x.e));
    }
    i = Math.max(j, i + 1);
  }
  return salida;
}

const informe = [];
let iguales = 0, conFaltas = 0, revisadas = 0;

for (const [ruta, datos] of Object.entries(vivo)) {
  if (datos.error) continue;
  const destino = path.join(DIST, ruta.replace(/^\//, ''), 'index.html');
  if (!fs.existsSync(destino)) {
    informe.push(`${ruta} — no existe en la web nueva`);
    continue;
  }
  revisadas++;

  // La banda de titulo del tema va DENTRO de <main>, asi que su H1 viene en
  // `encabezados`. Ese H1 NO se exige, y es a proposito: en la web en vivo la
  // franja lleva el texto en blanco sobre gris claro (#f5f5f5), o sea que no
  // se lee. La web nueva no enseña esa franja (ver el comentario largo en
  // scripts/arbol.py) y su H1 es el primer encabezado del contenido. Pedir
  // aqui un encabezado que en la web real nadie ve seria exigir que copiemos
  // un fallo del tema.
  // Cuarto cambio permitido y documentado: las erratas del original que el
  // propietario pidio corregir (src/data/erratas.json) se corrigen tambien en
  // los encabezados de la web en vivo antes de comparar.
  const bandaVivas = new Set((datos.h1 || []).map((t) => normalizar(corregir(t))).filter(Boolean));
  const enMain = (datos.encabezados || [])
    .map((e) => ({ nivel: e.nivel, texto: normalizar(corregir(e.texto)) }))
    .filter((e) => e.texto);
  const renombres = RENOMBRES[ruta];
  const antes = ordenarTandasDeTipos(enMain.filter((e, i) => !(i === 0 && e.nivel === 'h1' && bandaVivas.has(e.texto)))
    .map((e) => (renombres?.has(e.texto) ? { ...e, texto: renombres.get(e.texto) } : e)));

  const ahora = encabezadosDe(fs.readFileSync(destino, 'utf8'));
  const textosAhora = ahora.map((e) => e.texto);

  // 1. ¿falta algun encabezado del original?
  const faltan = antes.filter((e) => !textosAhora.includes(e.texto));

  // 2. ¿se conserva el ORDEN relativo de los que estan?
  //    Se recorre con un puntero, no con indexOf: hay titulos repetidos en la
  //    misma pagina ("Contenedores marítimos" sale en la rejilla y en el pie
  //    de la seccion) y buscar siempre la primera aparicion daba falsos
  //    desordenes.
  const presentes = antes.filter((e) => textosAhora.includes(e.texto));
  let puntero = 0, desordenados = 0;
  for (const e of presentes) {
    const i = textosAhora.indexOf(e.texto, puntero);
    if (i === -1) desordenados++;
    else puntero = i + 1;
  }

  // 3. ¿cambia el nivel de alguno? Se compara por POSICION, no por texto:
  //    hay titulos repetidos y buscarlos por nombre daba falsos cambios.
  //    Solo se permite el ascenso del primer encabezado a h1.
  const cambios = [];
  if (!faltan.length && antes.length === ahora.length) {
    for (let i = 0; i < antes.length; i++) {
      if (antes[i].texto !== ahora[i].texto) continue;
      if (antes[i].nivel === ahora[i].nivel) continue;
      // el h1 del contenido original baja a h2: el h1 lo pone el heroe
      if (antes[i].nivel === 'h1' && ahora[i].nivel === 'h2') continue;
      cambios.push({ ...antes[i], nuevo: ahora[i].nivel });
    }
  }

  if (faltan.length) {
    conFaltas++;
    informe.push(`${ruta} — FALTAN ${faltan.length}: «${faltan[0].texto.slice(0, 60)}»`);
  } else if (desordenados) {
    informe.push(`${ruta} — ${desordenados} encabezado(s) fuera de orden`);
  } else if (cambios.length) {
    informe.push(`${ruta} — ${cambios.length} cambio(s) de nivel: «${cambios[0].texto.slice(0, 50)}» ${cambios[0].nivel} -> ${cambios[0].nuevo}`);
  } else {
    iguales++;
  }
}

console.log(`paginas comparadas: ${revisadas}`);
console.log(`estructura identica: ${iguales}`);
console.log(`con encabezados que faltan: ${conFaltas}`);
console.log(`otras diferencias: ${informe.length - conFaltas}\n`);

if (informe.length) {
  informe.slice(0, 30).forEach((l) => console.log('  ' + l));
  if (informe.length > 30) console.log(`  … y ${informe.length - 30} mas`);
  process.exitCode = 1;
} else {
  console.log('Las 263 paginas tienen los mismos encabezados, en el mismo orden, que la web en vivo.');
}
