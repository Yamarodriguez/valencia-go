/**
 * erratas.mjs — la funcion que corrige las erratas de src/data/erratas.json en
 * un texto plano. La usan scripts/corregir-erratas.mjs (sobre los JSON) y
 * scripts/comparar-encabezados.mjs (sobre los encabezados de la web en vivo).
 */
import fs from 'node:fs';
import path from 'node:path';

const datos = JSON.parse(fs.readFileSync(path.resolve('src/data/erratas.json'), 'utf8'));
const PALABRAS = Object.entries(datos.palabras).map(([de, a]) => [
  new RegExp(`(?<![\\p{L}\\p{N}])${de}(?![\\p{L}\\p{N}])`, 'giu'), a]);
const FRASES = datos.frases.map(([re, a]) => [new RegExp(re, 'giu'), a]);

// conserva la mayuscula inicial o todo en mayusculas del original
const comoOriginal = (original, nueva) => {
  if (original === original.toUpperCase() && original !== original.toLowerCase()) return nueva.toUpperCase();
  if (original[0] === original[0].toUpperCase()) return nueva[0].toUpperCase() + nueva.slice(1);
  return nueva;
};

// nombres propios que parecen erratas ("Mas del Jutge", un poligono): no se tocan
const PROTEGIDAS = (datos.protegidas || []).map((p, i) => [p, `\u0000${i}\u0000`]);

/** Texto plano con las erratas corregidas. */
export function corregir(texto) {
  let t = String(texto ?? '').normalize('NFC');
  for (const [p, marca] of PROTEGIDAS) t = t.split(p).join(marca);
  for (const [re, a] of PALABRAS) t = t.replace(re, (m) => comoOriginal(m, a));
  // las frases con grupos ($1...) se sustituyen tal cual; las demas conservan
  // las mayusculas del original (todo en mayusculas, inicial o minuscula)
  for (const [re, a] of FRASES) {
    t = /\$\d/.test(a) ? t.replace(re, a) : t.replace(re, (m) => {
      if (m === m.toUpperCase() && m !== m.toLowerCase()) return a.toUpperCase();
      return m[0] === m[0].toUpperCase() ? a[0].toUpperCase() + a.slice(1) : a[0].toLowerCase() + a.slice(1);
    });
  }
  for (const [p, marca] of PROTEGIDAS) t = t.split(marca).join(p);
  return t;
}

/** Lo mismo en HTML: solo los nodos de texto, nunca etiquetas ni atributos. */
export function corregirHtml(html) {
  return String(html ?? '').split(/(<[^>]*>)/).map((trozo) => (trozo.startsWith('<') ? trozo : corregir(trozo))).join('');
}
