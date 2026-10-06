/**
 * contraste.mjs — busca texto que no se lee (poco contraste con lo que tiene
 * debajo) en la web nueva, que en la copia fiel es identica a la vieja.
 *
 *   node scripts/contraste.mjs [--base http://localhost:4321] [--por-tipo 2] [--rutas /a/,/b/] [--todas]
 *
 * Que hay debajo de cada texto: se apilan y se componen, con su transparencia,
 *   - el fondo del elemento y de todos sus padres;
 *   - sus ::before y ::after cuando cubren el elemento (el contenedor .e-con
 *     de Elementor pinta su fondo en ::before);
 *   - el velo .elementor-background-overlay y el fondo de diapositivas, que
 *     son HIJOS del contenedor y HERMANOS del contenido, no padres.
 * Si alguna capa es una foto o un degradado, el fondo es "foto" y no se
 * calcula (letra sobre foto: se mira a ojo, no se toca). Si la foto no cargo,
 * el fondo es "desconocido" y tampoco se toca nada (regla A3.8).
 *
 * Con fondo liso se calcula el contraste WCAG. Es FALLO por debajo de 4,5
 * (3 si la letra es grande: 24 px, o 18,66 px en negrita), salvo los casos
 * del original que el propietario ya ha visto (src/data/fallos-original.json,
 * lista "contraste": color de letra + color de fondo), que salen como aviso.
 *
 * Informe en informes/contraste.md y lista para decidir en
 * informes/contraste-casos.json. Sale con 1 si hay algun FALLO.
 */
import fs from 'node:fs';
import path from 'node:path';
import { RAIZ, leerJson, arg, abrirNavegador, nuevoContexto, preparar, rutasPorTipo } from './lib/navegador.mjs';

const BASE = arg('--base', 'http://localhost:4321').replace(/\/$/, '');
const fo = leerJson(path.join(RAIZ, 'src', 'data', 'fallos-original.json'), {});
const aprobados = new Set((fo.contraste || []).map((x) => `${x.letra}|${x.fondo}`));
const rutas = rutasPorTipo({ porTipo: 2, porTipoTraducido: 0 }).filter((r) => !r.tipo.startsWith('traducida-') || process.argv.includes('--todas') || arg('--rutas', ''));

/** Dentro de la pagina. */
function medir() {
  const rgba = (c) => {
    const m = /rgba?\(([^)]+)\)/.exec(c || ''); if (!m) return null;
    const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const sobre = (arriba, abajo) => ({ r: arriba.r * arriba.a + abajo.r * (1 - arriba.a), g: arriba.g * arriba.a + abajo.g * (1 - arriba.a), b: arriba.b * arriba.a + abajo.b * (1 - arriba.a), a: 1 });
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const hex = (c) => '#' + [c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
  const fotoCargada = (url) => { const i = new Image(); i.src = url; return i.complete && i.naturalWidth > 0; };
  const cubre = (cs) => cs.content !== 'none' && cs.display !== 'none' && (cs.position === 'absolute' || cs.position === 'fixed');
  /** Capas de un estilo: [{color}|{foto:true, cargada}] de abajo arriba. */
  const capasDe = (cs, opacidad = 1) => {
    const capas = [];
    const c = rgba(cs.backgroundColor);
    if (c && c.a > 0) capas.push({ color: { ...c, a: c.a * opacidad } });
    const img = cs.backgroundImage;
    if (img && img !== 'none') {
      const url = /url\(["']?([^"')]+)["']?\)/.exec(img);
      capas.push({ foto: true, cargada: url ? fotoCargada(url[1]) : true, degradado: !url });
    }
    return capas;
  };
  const casos = [];
  const caminar = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
  for (let e = caminar.currentNode; e; e = caminar.nextNode()) {
    const tag = e.tagName;
    if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'OPTION'].includes(tag) || e.closest('svg') || e.closest('[data-nuevo]')) continue;
    let conTexto = false;
    for (const n of e.childNodes) if (n.nodeType === 3 && n.nodeValue.trim().length > 1) { conTexto = true; break; }
    if (!conTexto) continue;
    const r = e.getBoundingClientRect();
    const cs = getComputedStyle(e);
    if (r.width < 2 || r.height < 2 || cs.display === 'none' || cs.visibility === 'hidden') continue;
    let visible = true, op = 1;
    for (let p = e; p && p.nodeType === 1; p = p.parentElement) { const c = getComputedStyle(p); op *= parseFloat(c.opacity); if (c.display === 'none' || c.visibility === 'hidden') visible = false; }
    if (!visible || op < 0.05) continue;
    // fuera de la pantalla a los lados (menus y ventanas escondidos)
    if (r.right < 0 || r.left > innerWidth) continue;
    const letra = rgba(cs.color); if (!letra || letra.a === 0) continue;
    // de dentro afuera: se guardan las capas y luego se componen de abajo arriba
    const pila = []; // de arriba (cerca del texto) a abajo
    let fondo = null, tipo = 'liso', opacaPropia = false;
    for (let p = e; p && p.nodeType === 1; p = p.parentElement) {
      const c = getComputedStyle(p);
      const capas = [];
      // orden de pintado dentro del elemento: fondo propio, ::before, velo/diapositivas (hijos), ::after
      capas.push(...capasDe(c));
      const antes = getComputedStyle(p, '::before'); if (cubre(antes)) capas.push(...capasDe(antes, parseFloat(antes.opacity)));
      if (p !== e) for (const h of p.children) {
        if (h.contains(e)) continue;
        if (h.classList.contains('elementor-background-overlay') || h.classList.contains('elementor-background-slideshow') || h.classList.contains('elementor-background-video-container')) {
          const ch = getComputedStyle(h);
          if (h.classList.contains('elementor-background-overlay')) capas.push(...capasDe(ch, parseFloat(ch.opacity)));
          else capas.push({ foto: true, cargada: true });
        }
      }
      const despues = getComputedStyle(p, '::after'); if (cubre(despues) && p !== e) capas.push(...capasDe(despues, parseFloat(despues.opacity)));
      pila.push(...capas.reverse());
      const opaca = capas.find((k) => k.color && k.color.a >= 0.999);
      // el blanco del <body> no cuenta como fondo propio: puede haber otra cosa pintada encima
      if (opaca) { opacaPropia = p !== document.body && p !== document.documentElement; break; }
    }
    pila.push({ color: { r: 255, g: 255, b: 255, a: 1 } }); // el lienzo
    let acumulado = null;
    for (let i = pila.length - 1; i >= 0; i--) {
      const k = pila[i];
      if (k.foto) { tipo = k.cargada ? (k.degradado ? 'degradado' : 'foto') : 'desconocido'; acumulado = null; continue; }
      if (!acumulado) { if (tipo !== 'liso' && k.color.a < 0.999) continue; acumulado = { ...k.color, a: 1 }; if (k.color.a >= 0.999) tipo = 'liso'; }
      else acumulado = sobre(k.color, acumulado);
    }
    fondo = acumulado;
    const px = parseFloat(cs.fontSize), negrita = parseInt(cs.fontWeight, 10) >= 700;
    const grande = px >= 24 || (px >= 18.66 && negrita);
    const texto = [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.nodeValue).join(' ').replace(/\s+/g, ' ').trim().slice(0, 50);
    let did = ''; for (let p = e; p && p !== document.body; p = p.parentElement) { const d = p.getAttribute('data-id'); if (d) { did = d; break; } }
    if (tipo !== 'liso' || !fondo) { casos.push({ tipo, letra: hex(letra), texto, did, px, tag: tag.toLowerCase() }); continue; }
    const razon = (f) => { const fg = letra.a < 1 ? sobre(letra, f) : letra; const l1 = lum(fg), l2 = lum(f); return { fg, ratio: (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05) }; };
    let { fg, ratio } = razon(fondo);
    if (ratio < (grande ? 3 : 4.5)) {
      // Antes de darlo por malo: que hay pintado DEBAJO del texto que no sea
      // padre suyo (una cabecera transparente encima de la foto de portada,
      // un bloque subido con margen negativo...). Se mira el punto central.
      if (!opacaPropia) {
        e.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
        const q = e.getBoundingClientRect();
        const pila2 = document.elementsFromPoint(Math.min(innerWidth - 1, Math.max(0, q.left + q.width / 2)), Math.min(innerHeight - 1, Math.max(0, q.top + q.height / 2)));
        let i = pila2.findIndex((x) => x === e || x.contains(e) || e.contains(x));
        let debajo = null;
        for (i = Math.max(0, i); i < pila2.length; i++) {
          const x = pila2[i];
          if (x === e || x.contains(e) || x === document.documentElement || x === document.body) continue;
          const cx = getComputedStyle(x);
          const conImagen = (s) => s.backgroundImage && s.backgroundImage !== 'none';
          const pseudo = [getComputedStyle(x, '::before'), getComputedStyle(x, '::after')].some((s) => s.content !== 'none' && conImagen(s));
          const hijoFondo = [...x.children].some((h) => /elementor-background-(slideshow|video-container)/.test(h.className || '') || (/elementor-background-overlay/.test(h.className || '') && conImagen(getComputedStyle(h))));
          if (['IMG', 'VIDEO', 'CANVAS', 'PICTURE', 'IFRAME'].includes(x.tagName) || conImagen(cx) || pseudo || hijoFondo) { debajo = 'foto'; break; }
          const c = rgba(cx.backgroundColor);
          if (c && c.a >= 0.999) { debajo = c; break; }
        }
        if (debajo === 'foto') { casos.push({ tipo: 'foto', letra: hex(letra), texto, did, px, tag: tag.toLowerCase() }); continue; }
        if (debajo) { fondo = debajo; ({ fg, ratio } = razon(fondo)); }
      }
      if (ratio < (grande ? 3 : 4.5)) casos.push({ tipo: 'liso', letra: hex(fg), fondo: hex(fondo), ratio: Math.round(ratio * 100) / 100, minimo: grande ? 3 : 4.5, texto, did, px, tag: tag.toLowerCase() });
    }
  }
  return casos;
}

const navegador = await abrirNavegador();
const ctx = await nuevoContexto(navegador, 1400);
const pagina = await ctx.newPage();
const grupos = new Map(); // letra|fondo -> {paginas:Set, ejemplos:[]}
const sobreFoto = { foto: 0, degradado: 0, desconocido: 0 };
const desconocidos = [];
let medidas = 0;
for (const { ruta } of rutas) {
  if (!(await preparar(pagina, BASE + ruta))) continue;
  medidas++;
  for (const c of await pagina.evaluate(medir)) {
    if (c.tipo !== 'liso') { sobreFoto[c.tipo]++; if (c.tipo === 'desconocido' && desconocidos.length < 40) desconocidos.push(`${ruta}: «${c.texto}» (${c.letra}, ${c.did})`); continue; }
    const k = `${c.letra}|${c.fondo}`;
    if (!grupos.has(k)) grupos.set(k, { letra: c.letra, fondo: c.fondo, ratio: c.ratio, minimo: c.minimo, paginas: new Set(), veces: 0, ejemplos: [] });
    const g = grupos.get(k); g.paginas.add(ruta); g.veces++; g.minimo = Math.max(g.minimo, c.minimo);
    if (g.ejemplos.length < 4) g.ejemplos.push(`${ruta} <${c.tag}> ${c.px}px [${c.did}] «${c.texto}»`);
  }
}
await navegador.close();

const lista = [...grupos.values()].sort((a, b) => b.paginas.size - a.paginas.size || a.ratio - b.ratio);
const nuevos = lista.filter((g) => !aprobados.has(`${g.letra}|${g.fondo}`));
const vistos = lista.filter((g) => aprobados.has(`${g.letra}|${g.fondo}`));
const fila = (g) => `| ${g.letra} | ${g.fondo} | ${g.ratio} (min. ${g.minimo}) | ${g.paginas.size} | ${g.veces} | ${g.ejemplos[0]} |`;
const lineas = [
  `# Contraste — ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`, '',
  `Paginas medidas: ${medidas} a 1400 px. Combinaciones de letra y fondo liso por debajo del minimo: ${lista.length} (${nuevos.length} sin aprobar, ${vistos.length} ya vistas por el propietario).`,
  `Textos sobre foto: ${sobreFoto.foto}; sobre degradado: ${sobreFoto.degradado}; con el fondo desconocido porque la foto no cargo: ${sobreFoto.desconocido} (no se tocan).`, '',
  `## Sin aprobar (${nuevos.length}) — FALLO`, '', '| Letra | Fondo | Contraste | Paginas | Veces | Ejemplo |', '|---|---|---|---|---|---|', ...nuevos.map(fila), '',
  `## Del original, ya vistas (${vistos.length}) — aviso`, '', '| Letra | Fondo | Contraste | Paginas | Veces | Ejemplo |', '|---|---|---|---|---|---|', ...vistos.map(fila), '',
  `## Fondo desconocido (${sobreFoto.desconocido})`, ...desconocidos.map((x) => '- ' + x),
];
fs.mkdirSync(path.join(RAIZ, 'informes'), { recursive: true });
fs.writeFileSync(path.join(RAIZ, 'informes', 'contraste.md'), lineas.join('\n') + '\n');
fs.writeFileSync(path.join(RAIZ, 'informes', 'contraste-casos.json'), JSON.stringify(lista.map((g) => ({ letra: g.letra, fondo: g.fondo, contraste: g.ratio, minimo: g.minimo, paginas: g.paginas.size, veces: g.veces, ejemplos: g.ejemplos })), null, 1));
// --apuntar: lo encontrado se apunta en fallos-original.json como contraste
// del ORIGINAL pendiente de decision (se le ensena al propietario; Fase 3, Dec. 7)
if (process.argv.includes('--apuntar') && nuevos.length) {
  const f = path.join(RAIZ, 'src', 'data', 'fallos-original.json');
  const d = leerJson(f, {});
  d.contraste = d.contraste || [];
  for (const g of nuevos) d.contraste.push({ letra: g.letra, fondo: g.fondo, contraste: g.ratio, minimo: g.minimo, paginas: g.paginas.size, ejemplo: g.ejemplos[0], estado: 'pendiente' });
  fs.writeFileSync(f, JSON.stringify(d, null, 1));
  console.log(`contraste: ${nuevos.length} combinaciones apuntadas en src/data/fallos-original.json como pendientes`);
  process.exit(0);
}
console.log(`contraste: ${medidas} paginas; ${lista.length} combinaciones por debajo del minimo (${nuevos.length} sin aprobar = FALLO, ${vistos.length} ya vistas); sobre foto ${sobreFoto.foto}, degradado ${sobreFoto.degradado}, desconocido ${sobreFoto.desconocido} -> informes/contraste.md`);
for (const g of nuevos.slice(0, 8)) console.log(`  ${g.letra} sobre ${g.fondo}: ${g.ratio} en ${g.paginas.size} paginas — ${g.ejemplos[0].slice(0, 110)}`);
process.exit(nuevos.length || sobreFoto.desconocido ? 1 : 0);
