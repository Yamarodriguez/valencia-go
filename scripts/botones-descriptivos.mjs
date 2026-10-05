/**
 * botones-descriptivos.mjs — los botones "Haz clic aquí" del original pasan a
 * decir adonde llevan (pedido por el propietario el 28-09-2026). El boton se
 * ve igual: solo cambia el texto. Dos variantes por destino, alternadas por
 * pagina, para no repetir la misma ancla exacta en cientos de paginas. Textos
 * de 20 caracteres como mucho, para que quepan en una linea.
 *   node scripts/botones-descriptivos.mjs [--seco]
 */
import fs from 'node:fs';
import path from 'node:path';

const TEXTOS = {
  '/tiempos-de-construccion-de-casas-con-contenedores/': ['Ver tiempos de obra', 'Cuánto tarda la obra'],
  '/fotos-de-casas-containers/': ['Ver fotos de casas', 'Ver más fotos'],
  '/casa-container-paso-a-paso/': ['Ver el paso a paso', 'Ver los pasos'],
  '/por-dentro/': ['Ver casas por dentro', 'Ver interiores'],
  '/contenedores-maritimos-segunda-mano/': ['Ver segunda mano', 'Ver usados'],
  '/medidas-contenedores-maritimos/': ['Ver medidas', 'Ver tabla de medidas'],
  '/precios-contenedores-maritimos/': ['Ver precios', 'Consultar precios'],
  '/venta-contenedores-maritimos/': ['Ver venta', 'Comprar contenedor'],
  '/transporte-contenedores-maritimos/': ['Ver transporte', 'Cómo se transporta'],
  '/alquiler-contenedores-maritimos/': ['Ver alquiler', 'Alquilar contenedor'],
  '/contenedores-maritimos-catalogo/': ['Ver catálogo', 'Ver el catálogo'],
  '/presupuesto-casas-contenedores/': ['Pedir presupuesto'],
  '/comprar-contenedores-maritimos/': ['Pedir presupuesto'],
};
const seco = process.argv.includes('--seco');
const DIR = path.resolve('src/content/pages');
// variante estable por pagina
const hash = (s) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
const cuenta = {}, sinTexto = {};
for (const f of fs.readdirSync(DIR)) {
  const ruta = path.join(DIR, f);
  const p = JSON.parse(fs.readFileSync(ruta, 'utf8'));
  let cambios = 0;
  const walk = (e) => {
    if (e.t === 'boton' && /^\s*haz clic aqu[ií]\s*$/i.test(e.texto || '')) {
      const destino = String(e.url || '').replace(/\/?$/, '/');
      const opciones = TEXTOS[destino];
      if (!opciones) { sinTexto[destino] = (sinTexto[destino] || 0) + 1; return; }
      e.texto = opciones[hash(p.ruta) % opciones.length];
      cuenta[e.texto] = (cuenta[e.texto] || 0) + 1;
      cambios++;
    }
    if (e.t === 'seccion') (e.columnas || []).forEach((c) => (c.elementos || []).forEach(walk));
  };
  (p.bloques || []).forEach(walk);
  if (cambios && !seco) fs.writeFileSync(ruta, JSON.stringify(p, null, 1));
}
console.log(`${seco ? '(en seco) ' : ''}botones:`, Object.values(cuenta).reduce((a, b) => a + b, 0));
console.log(Object.entries(cuenta).sort((a, b) => b[1] - a[1]).map(([t, n]) => `${String(n).padStart(4)}  ${t}`).join('\n'));
if (Object.keys(sinTexto).length) console.log('SIN TEXTO PARA:', sinTexto);
