/**
 * nueva-pagina.mjs — monta una pagina nueva de guia o de servicio con la
 * misma estructura que las demas: foto de cabecera (la pinta el heroe) ·
 * intro (h2 + texto) con el formulario "¿Te llamamos?" al lado · componente
 * opcional (calculadora…) · secciones del cuerpo · componente final opcional
 * (presupuesto por pasos) · preguntas frecuentes (van en "ampliacion", que las
 * pinta al final con su marcado FAQPage).
 *
 *   node scripts/nueva-pagina.mjs <specs.json> [--forzar]
 *
 * <specs.json> es una lista de specs: { slug, titulo, tituloSeo, descripcion,
 * palabraClave, foto, fotoAlt, intro {h2, html}, secciones [{nivel, titulo,
 * html}], faq {titulo, items}, trasIntro?, alFinal?, menu? }. trasIntro y
 * alFinal son nombres de componente (calculadora-hipoteca, formulario-pasos,
 * catalogo-modelos). No pisa una pagina existente salvo --forzar.
 */
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve('.');
const PAGINAS = path.join(RAIZ, 'src', 'content', 'pages');
const PORTADA = JSON.parse(fs.readFileSync(path.join(PAGINAS, 'casas-contenedores.json'), 'utf8'));
const FOTOS = JSON.parse(fs.readFileSync(path.join(RAIZ, 'src/data/imagenes.json'), 'utf8'));
const forzar = process.argv.includes('--forzar');
const fichero = process.argv.slice(2).find((a) => !a.startsWith('--'));
if (!fichero) { console.error('uso: node scripts/nueva-pagina.mjs <specs.json> [--forzar]'); process.exit(1); }

// la columna del formulario ("¿Te llamamos?"), tal cual esta en la portada
const colFormulario = JSON.parse(JSON.stringify(PORTADA.bloques[1].columnas[1]));
colFormulario.elementos = colFormulario.elementos.filter((e) => e.t !== 'espaciador');

for (const spec of JSON.parse(fs.readFileSync(path.resolve(fichero), 'utf8'))) {
  const destino = path.join(PAGINAS, `${spec.slug}.json`);
  if (fs.existsSync(destino) && !forzar) { console.log(`ya existe ${spec.slug}.json (usa --forzar)`); continue; }
  let id = 0;
  const nuevoId = () => `${spec.slug.slice(0, 12)}-${String(++id).padStart(3, '0')}`;
  const seccion = (columnas, extra = {}) => ({ t: 'seccion', id: nuevoId(), columnas, ...extra });
  const col = (elementos, ancho = 100) => ({ id: nuevoId(), ancho, elementos });
  const componente = (nombre) => seccion([col([{ t: 'componente', id: nuevoId(), nombre }])]);

  const medida = FOTOS[spec.foto] || {};
  if (!FOTOS[spec.foto]) console.log(`  AVISO ${spec.slug}: la foto ${spec.foto} no esta en imagenes.json`);
  const pagina = {
    slug: spec.slug,
    ruta: `/${spec.slug}/`,
    titulo: spec.titulo,
    h1: spec.titulo,
    tituloSeo: spec.tituloSeo,
    descripcion: spec.descripcion,
    palabraClave: spec.palabraClave,
    noindex: false,
    hero: { src: spec.foto, alt: spec.fotoAlt || spec.titulo, ancho: medida.ancho || 1200, alto: medida.alto || 675 },
    faq: [],
    cuerpo: '',
    palabras: [],
    bloques: [
      seccion([col([{ t: 'imagen', id: nuevoId(), src: spec.foto, alt: spec.fotoAlt || spec.titulo }])]),
      seccion([
        col([
          { t: 'encabezado', id: nuevoId(), etiqueta: 'h2', texto: spec.intro.h2, color: '#414141' },
          { t: 'texto', id: nuevoId(), html: spec.intro.html, color: '#373535' },
        ], 67.28),
        { ...colFormulario, id: nuevoId(), ancho: 32.59 },
      ]),
      ...(spec.trasIntro ? [componente(spec.trasIntro)] : []),
      seccion([col((spec.secciones || []).flatMap((s) => [
        { t: 'encabezado', id: nuevoId(), etiqueta: s.nivel === 'h3' ? 'h3' : 'h2', texto: s.titulo },
        ...(s.html ? [{ t: 'texto', id: nuevoId(), html: s.html }] : []),
      ]))], { libre: true }),
      ...(spec.alFinal ? [componente(spec.alFinal)] : []),
    ],
    menu: spec.menu || 'menu-principal',
    ampliacion: spec.faq?.items?.length ? { secciones: [], faq: spec.faq } : undefined,
  };
  fs.writeFileSync(destino, JSON.stringify(pagina, null, 1));
  console.log(`escrita ${path.relative(RAIZ, destino)}`);
}
