/**
 * zonas.mjs — genera src/data/zonas.json: a que provincia pertenece cada
 * pagina de localidad (casas contenedores y contenedores maritimos), para
 * enlazar entre si las de la misma provincia. Las comunidades con pagina
 * propia (Andalucia, Catalunya...) enlazan a sus provincias.
 *
 *   node scripts/zonas.mjs
 *
 * Solo entran rutas que existen de verdad en src/content/pages.
 */
import fs from 'node:fs';
import path from 'node:path';

// provincia -> [nombre, comunidad, paginas de casas, paginas de maritimos]
const PROVINCIAS = {
  alava: ['Álava', 'País Vasco', ['alava', 'vitoria-gasteiz'], ['contenedores-maritimos-alava']],
  albacete: ['Albacete', 'Castilla-La Mancha', ['albacete'], ['contenedores-maritimos-albacete']],
  alicante: ['Alicante', 'Comunitat Valenciana', ['alicante', 'crevillente', 'elche', 'orihuela', 'torrevieja'], ['contenedores-maritimos-alicante', 'contenedores-maritimos-crevillente']],
  almeria: ['Almería', 'Andalucía', ['almeria', 'el-ejido', 'roquetas-de-mar'], ['contenedores-maritimos-almeria', 'contenedores-maritimos-roquetas-de-mar']],
  asturias: ['Asturias', 'Asturias', ['asturias', 'aviles', 'gijon', 'oviedo'], ['contenedores-maritimos-asturias', 'contenedores-maritimos-aviles']],
  avila: ['Ávila', 'Castilla y León', ['avila'], ['contenedores-maritimos-avila']],
  badajoz: ['Badajoz', 'Extremadura', ['badajoz'], ['contenedores-maritimos-badajoz']],
  baleares: ['Islas Baleares', 'Illes Balears', ['islas-baleares', 'mallorca', 'ibiza'], ['contenedores-maritimos-baleares']],
  barcelona: ['Barcelona', 'Catalunya', ['barcelona', 'badalona', 'cornella-de-llobregat', 'manresa', 'mataro', 'rubi', 'sabadell', 'san-baudilio-de-llobregat', 'san-cugat-del-valles', 'santa-coloma-de-gramanet', 'terrassa'], ['contenedores-maritimos-barcelona', 'contenedores-maritimos-badalona', 'contenedores-maritimos-mataro', 'contenedores-maritimos-sabadell', 'contenedores-maritimos-santa-coloma-de-gramanet', 'contenedores-cornella-de-llobregat', 'contenedores-san-cugat-del-valles']],
  burgos: ['Burgos', 'Castilla y León', ['burgos'], ['contenedores-maritimos-burgos']],
  caceres: ['Cáceres', 'Extremadura', ['casas-contenedores-caceres'], ['contenedores-maritimos-caceres']],
  cadiz: ['Cádiz', 'Andalucía', ['cadiz', 'algeciras', 'chiclana-de-la-frontera', 'el-puerto-de-santa-maria', 'jerez-de-la-frontera', 'san-fernando'], ['contenedores-maritimos-cadiz', 'contenedores-maritimos-algeciras', 'contenedores-san-fernando']],
  cantabria: ['Cantabria', 'Cantabria', ['cantabria', 'santander'], ['contenedores-maritimos-cantabria']],
  castellon: ['Castellón', 'Comunitat Valenciana', ['castellon'], ['contenedores-maritimos-castellon']],
  ceuta: ['Ceuta', 'Ceuta', ['ceuta'], []],
  'ciudad-real': ['Ciudad Real', 'Castilla-La Mancha', ['ciudad-real'], ['contenedores-maritimos-ciudad-real']],
  cordoba: ['Córdoba', 'Andalucía', ['cordoba'], ['contenedores-maritimos-cordoba']],
  cuenca: ['Cuenca', 'Castilla-La Mancha', ['cuenca'], ['contenedores-maritimos-cuenca', 'contenedores-maritimos-alarcon']],
  gipuzkoa: ['Gipuzkoa', 'País Vasco', ['gipuzkoa', 'donostia-san-sebastian'], ['contenedores-maritimos-gipuzkoa']],
  girona: ['Girona', 'Catalunya', ['girona', 'figueres'], ['contenedores-maritimos-girona']],
  granada: ['Granada', 'Andalucía', ['granada'], ['contenedores-maritimos-granada']],
  guadalajara: ['Guadalajara', 'Castilla-La Mancha', ['guadalajara'], ['contenedores-maritimos-guadalajara']],
  huelva: ['Huelva', 'Andalucía', ['huelva'], ['contenedores-maritimos-huelva']],
  huesca: ['Huesca', 'Aragón', ['huesca'], ['contenedores-maritimos-huesca']],
  jaen: ['Jaén', 'Andalucía', ['jaen'], ['contenedores-maritimos-jaen']],
  'la-coruna': ['La Coruña', 'Galicia', ['la-coruna'], ['contenedores-maritimos-la-coruna']],
  'la-rioja': ['La Rioja', 'La Rioja', ['la-rioja', 'logrono'], ['contenedores-maritimos-la-rioja', 'contenedores-maritimos-logrono']],
  'las-palmas': ['Las Palmas', 'Canarias', ['las-palmas', 'telde'], ['contenedores-maritimos-las-palmas', 'contenedores-maritimos-telde']],
  leon: ['León', 'Castilla y León', ['leon'], ['contenedores-maritimos-leon']],
  lleida: ['Lleida', 'Catalunya', ['lleida'], ['contenedores-maritimos-lleida']],
  lugo: ['Lugo', 'Galicia', ['lugo'], ['contenedores-maritimos-lugo']],
  madrid: ['Madrid', 'Comunidad de Madrid', ['madrid', 'alcala-de-henares', 'alcobendas', 'alcorcon', 'coslada', 'fuenlabrada', 'getafe', 'las-rozas-de-madrid', 'leganes', 'mostoles', 'parla', 'pozuelo-de-alarcon', 'rivas-vaciamadrid', 'san-sebastian-de-los-reyes', 'torrejon-de-ardoz', 'valdemoro'], ['contenedores-maritimos-madrid', 'contenedores-maritimos-alcala-de-henares', 'contenedores-maritimos-fuenlabrada', 'contenedores-maritimos-getafe', 'contenedores-maritimos-leganes', 'contenedores-maritimos-mostoles', 'contenedores-maritimos-parla', 'contenedores-maritimos-torrejon-de-ardoz', 'contenedores-las-rozas-de-madrid', 'contenedores-rivas-vaciamadrid', 'contenedores-san-sebastian-de-los-reyes']],
  malaga: ['Málaga', 'Andalucía', ['malaga', 'estepona', 'fuengirola', 'marbella', 'mijas'], ['contenedores-maritimos-malaga', 'contenedores-maritimos-marbella', 'contenedores-mijas']],
  melilla: ['Melilla', 'Melilla', ['melilla'], []],
  murcia: ['Murcia', 'Región de Murcia', ['murcia', 'cartagena', 'lorca'], ['contenedores-maritimos-murcia', 'contenedores-maritimos-cartagena']],
  navarra: ['Navarra', 'Navarra', ['navarra', 'pamplona'], ['contenedores-maritimos-navarra']],
  ourense: ['Ourense', 'Galicia', ['ourense'], ['contenedores-maritimos-ourense']],
  palencia: ['Palencia', 'Castilla y León', ['palencia'], ['contenedores-maritimos-palencia']],
  pontevedra: ['Pontevedra', 'Galicia', ['pontevedra', 'vigo'], ['contenedores-maritimos-pontevedra']],
  salamanca: ['Salamanca', 'Castilla y León', ['salamanca'], ['contenedores-maritimos-salamanca']],
  tenerife: ['Santa Cruz de Tenerife', 'Canarias', ['tenerife', 'san-cristobal-de-la-laguna'], ['contenedores-maritimos-tenerife', 'contenedores-maritimos-san-cristobal-de-la-laguna']],
  segovia: ['Segovia', 'Castilla y León', ['segovia'], ['contenedores-maritimos-segovia']],
  sevilla: ['Sevilla', 'Andalucía', ['sevilla', 'alcala-de-guadaira', 'dos-hermanas'], ['contenedores-maritimos-sevilla', 'contenedores-maritimos-dos-hermanas']],
  soria: ['Soria', 'Castilla y León', ['soria'], ['contenedores-maritimos-soria']],
  tarragona: ['Tarragona', 'Catalunya', ['tarragona', 'reus'], ['contenedores-maritimos-tarragona', 'contenedores-maritimos-reus']],
  teruel: ['Teruel', 'Aragón', ['teruel'], ['contenedores-maritimos-teruel']],
  toledo: ['Toledo', 'Castilla-La Mancha', ['toledo', 'talavera-de-la-reina'], ['contenedores-maritimos-toledo']],
  valencia: ['Valencia', 'Comunitat Valenciana', ['valencia', 'gandia', 'torrente'], ['contenedor-maritimo-valencia']],
  valladolid: ['Valladolid', 'Castilla y León', ['valladolid'], ['contenedores-maritimos-valladolid']],
  vizcaya: ['Vizcaya', 'País Vasco', ['vizcaya', 'baracaldo'], ['contenedores-maritimos-vizcaya', 'contenedores-barakaldo']],
  zamora: ['Zamora', 'Castilla y León', ['zamora'], ['contenedores-maritimos-zamora']],
  zaragoza: ['Zaragoza', 'Aragón', ['zaragoza'], ['contenedores-maritimos-zaragoza']],
  andorra: ['Andorra', 'Andorra', ['andorra'], ['contenedores-maritimos-andorra']],
};

// comunidades con pagina propia -> sus provincias
const COMUNIDADES = {
  andalucia: ['Andalucía', ['almeria', 'cadiz', 'cordoba', 'granada', 'huelva', 'jaen', 'malaga', 'sevilla'], ['andalucia'], ['contenedores-maritimos-andalucia']],
  catalunya: ['Catalunya', ['barcelona', 'girona', 'lleida', 'tarragona'], ['catalunya'], ['contenedores-maritimos-catalunya']],
  galicia: ['Galicia', ['la-coruna', 'lugo', 'ourense', 'pontevedra'], ['galicia'], ['contenedores-maritimos-galicia']],
  canarias: ['Canarias', ['las-palmas', 'tenerife'], ['canarias'], ['contenedores-maritimos-canarias']],
  extremadura: ['Extremadura', ['badajoz', 'caceres'], ['extremadura'], []],
};

const PAGINAS = path.resolve('src/content/pages');
const existe = new Set(fs.readdirSync(PAGINAS).filter((f) => f.endsWith('.json')).map((f) => f.replace('.json', '')));
const faltan = [];
const rutas = (lista) => lista.filter((s) => existe.has(s) || !faltan.push(s)).map((s) => `/${s}/`);

const salida = { provincias: {}, comunidades: {} };
for (const [clave, [nombre, comunidad, casas, maritimos]] of Object.entries(PROVINCIAS)) {
  salida.provincias[clave] = { nombre, comunidad, casas: rutas(casas), maritimos: rutas(maritimos) };
}
for (const [clave, [nombre, provincias, casas, maritimos]] of Object.entries(COMUNIDADES)) {
  salida.comunidades[clave] = { nombre, provincias, casas: rutas(casas), maritimos: rutas(maritimos) };
}

// comprobacion: cada pagina de localidad sale en una sola provincia o comunidad
const vistas = new Map();
for (const [k, p] of [...Object.entries(salida.provincias), ...Object.entries(salida.comunidades)]) {
  for (const r of [...p.casas, ...p.maritimos]) { if (vistas.has(r)) console.log(`REPETIDA ${r}: ${vistas.get(r)} y ${k}`); vistas.set(r, k); }
}
fs.writeFileSync('src/data/zonas.json', JSON.stringify(salida, null, 1) + '\n');
console.log(`provincias: ${Object.keys(salida.provincias).length} · comunidades: ${Object.keys(salida.comunidades).length} · paginas: ${vistas.size}${faltan.length ? ` · NO EXISTEN: ${faltan.join(', ')}` : ''}`);
