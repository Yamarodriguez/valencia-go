/**
 * nueva-pagina-modelo.mjs — monta una pagina de modelo de casa contenedor
 * (las de superficie: 15, 30, 45… m²) con la MISMA metodologia que las que
 * ya existen (casa-con-un-contenedor, casa-contenedor-40-pies…):
 *
 *   foto de cabecera · intro (h2 + texto) con el formulario al lado ·
 *   ficha del modelo (secciones propias) · galeria · catalogo · rejilla de
 *   modelos · 3D · precios · permisos y planos · ventajas · pasos · tiempo ·
 *   fotos · por dentro · presupuesto (estos ultimos, los bloques comunes que
 *   comparten todas las paginas de modelo, copiados de la portada) ·
 *   ampliacion SEO con preguntas frecuentes.
 *
 *   node scripts/nueva-pagina-modelo.mjs <spec.json> [...mas specs]
 *
 * Cada spec es un JSON con: slug, ruta, titulo, tituloSeo, descripcion,
 * palabraClave, foto, fotoAlt, intro {h2, html}, secciones [{nivel, titulo,
 * html}], galeria [rutas], ampliacion {secciones, faq}, y opcionalmente tipo
 * {singular, plural} para los h2 de los bloques comunes. Escribe
 * src/content/pages/<slug>.json (no pisa una pagina existente salvo --forzar).
 */
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve('.');
const PAGINAS = path.join(RAIZ, 'src', 'content', 'pages');
const PORTADA = JSON.parse(fs.readFileSync(path.join(PAGINAS, 'casas-contenedores.json'), 'utf8'));
const FOTOS = fs.existsSync(path.join(RAIZ, 'src/data/imagenes.json'))
  ? JSON.parse(fs.readFileSync(path.join(RAIZ, 'src/data/imagenes.json'), 'utf8')) : {};

const forzar = process.argv.includes('--forzar');
const specs = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (!specs.length) { console.error('uso: node scripts/nueva-pagina-modelo.mjs <spec.json> [...]'); process.exit(1); }

/* enlaces rotos que arrastra la plantilla de la portada; en la pagina nueva
   se corrigen (es contenido nuevo, no el original) */
const ENLACES = { '/casa-contendor-20-pies/': '/casa-contenedor-20-pies/', '/por-dentro': '/por-dentro/' };
const arreglarEnlaces = (b) => JSON.parse(JSON.stringify(b), (k, v) =>
  (k === 'url' && typeof v === 'string' && ENLACES[v]) ? ENLACES[v] : v);

const firma = (s) => {
  const t = [];
  const w = (b) => {
    if (b.t === 'seccion') (b.columnas || []).forEach((c) => (c.elementos || []).forEach(w));
    else if (b.t === 'encabezado') t.push(String(b.texto).replace(/<[^>]+>/g, ''));
    else if (b.t === 'texto') t.push(String(b.html).replace(/<[^>]+>/g, ' ').slice(0, 60));
  };
  w(s);
  return t.join(' | ');
};
const buscar = (re) => PORTADA.bloques.findIndex((s) => re.test(firma(s)));

// bloques comunes de la portada: catalogo, y desde "Modelos de casas de
// contenedores" hasta la franja de presupuesto (sin las FAQ ni el directorio)
const iCatalogo = buscar(/Descarga el Catalogo/i);
const iModelos = buscar(/^Modelos de casas de contenedores/i);
const iPresupuesto = buscar(/^Presupuesto casas de contenedores/i);
if (iCatalogo < 0 || iModelos < 0 || iPresupuesto < 0) { console.error('no encuentro los bloques comunes en la portada'); process.exit(1); }
const catalogo = arreglarEnlaces(PORTADA.bloques[iCatalogo]);
const comunesPortada = PORTADA.bloques.slice(iModelos, iPresupuesto + 1).map(arreglarEnlaces);

/* los h2 de los bloques comunes llevan el nombre del tipo de casa, como en
   las paginas de modelo originales ("Precios de Casa contenedor 20 pies!",
   "Permisos de Casas de contenedores 20 pies"...). El spec puede fijar
   tipo {singular, plural}; si no, se deriva del titulo. */
const RENOMBRAR = [
  [/^Casas con contenedores PRECIOS/i, (t) => `Precios de una ${t.singular}`],
  [/^Casas contenedores PERMISOS/i, (t) => `Permisos para una ${t.singular}`],
  [/^Casas contenedores PLANOS/i, (t) => `Planos de ${t.plural}`],
  [/^Pasos para Construir tu casa de contenedor/i, (t) => `Pasos para la construcción de una ${t.singular}`],
  [/^Tiempo de construcción de casas contenedores/i, (t) => `Tiempo de construcción de ${t.plural}`],
  [/^Fotos de casas Container/i, (t) => `Imágenes de ${t.plural}`],
  [/^Presupuesto casas de contenedores/i, (t) => `Presupuesto de ${t.plural}`],
];
const tipoDe = (spec) => {
  const singular = spec.tipo?.singular || spec.titulo.charAt(0).toLowerCase() + spec.titulo.slice(1);
  return { singular, plural: spec.tipo?.plural || singular.replace(/^casa /, 'casas ') };
};
const comunesPara = (spec) => {
  const tipo = tipoDe(spec);
  return JSON.parse(JSON.stringify(comunesPortada), (k, v) => {
    if (k !== 'texto' || typeof v !== 'string') return v;
    const plano = v.replace(/<[^>]+>/g, '').trim();
    const regla = RENOMBRAR.find(([re]) => re.test(plano));
    return regla ? regla[1](tipo) : v;
  });
};

// la columna del formulario ("¿Te llamamos?"), tal cual esta en la portada
const colFormulario = JSON.parse(JSON.stringify(PORTADA.bloques[1].columnas[1]));
colFormulario.elementos = colFormulario.elementos.filter((e) => e.t !== 'espaciador');

let id = 0;
const nuevoId = () => `m2-${String(++id).padStart(3, '0')}`;
const seccion = (columnas, extra = {}) => ({ t: 'seccion', id: nuevoId(), columnas, ...extra });
const col = (elementos, ancho = 100) => ({ id: nuevoId(), ancho, elementos });

for (const ruta of specs) {
  const spec = JSON.parse(fs.readFileSync(path.resolve(ruta), 'utf8'));
  const destino = path.join(PAGINAS, `${spec.slug}.json`);
  if (fs.existsSync(destino) && !forzar) { console.log(`ya existe ${spec.slug}.json (usa --forzar)`); continue; }

  const medida = FOTOS[spec.foto] || {};
  const pagina = {
    slug: spec.slug,
    ruta: spec.ruta,
    titulo: spec.titulo,
    h1: spec.titulo,
    tituloSeo: spec.tituloSeo,
    descripcion: spec.descripcion,
    palabraClave: spec.palabraClave,
    noindex: false,
    hero: { src: spec.foto, alt: spec.fotoAlt || spec.titulo, ancho: medida.ancho || 1024, alto: medida.alto || 576 },
    faq: [],
    cuerpo: '',
    palabras: [],
    bloques: [
      // 1. foto de cabecera (la representa el heroe; render.js no la repite)
      seccion([col([{ t: 'imagen', id: nuevoId(), src: spec.foto, alt: spec.fotoAlt || spec.titulo }])]),
      // 2. intro + formulario
      seccion([
        col([
          { t: 'encabezado', id: nuevoId(), etiqueta: 'h2', texto: spec.intro.h2, color: '#414141' },
          { t: 'texto', id: nuevoId(), html: spec.intro.html, color: '#373535' },
        ], 67.28),
        { ...colFormulario, id: nuevoId(), ancho: 32.59 },
      ]),
      // 3. ficha del modelo: texto corrido, sin detectores de patrones
      seccion([col((spec.secciones || []).flatMap((s) => [
        { t: 'encabezado', id: nuevoId(), etiqueta: s.nivel === 'h3' ? 'h3' : 'h2', texto: s.titulo },
        ...(s.html ? [{ t: 'texto', id: nuevoId(), html: s.html }] : []),
      ]))], { libre: true }),
      // 4. galeria
      ...(spec.galeria?.length ? [seccion([col([{ t: 'galeria', id: nuevoId(), imagenes: spec.galeria, columnas: Math.min(4, spec.galeria.length) }])])] : []),
      // 5. catalogo y bloques comunes de toda pagina de modelo
      catalogo,
      ...comunesPara(spec),
    ],
    menu: 'menu-principal',
    bandaTitulo: false,
    postId: 0,
    huecoTitulo: false,
    ampliacion: spec.ampliacion || undefined,
  };

  fs.writeFileSync(destino, JSON.stringify(pagina, null, 1));
  console.log(`escrita ${path.relative(RAIZ, destino)} (${pagina.bloques.length} bloques)`);
}
