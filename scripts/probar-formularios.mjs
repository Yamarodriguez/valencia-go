/**
 * probar-formularios.mjs — prueba con el navegador que los formularios de la
 * web nueva envian bien SIN mandar nada de verdad: se intercepta el envio a
 * Netlify (POST /) y se mira que lleva.
 *
 *   node scripts/probar-formularios.mjs [--base http://localhost:4321]
 *
 * Prueba: el formulario de contacto (Elementor), el de experiencias a medida,
 * el de la ventana "Info bus" (Contact Form 7, esta en todas las paginas) y
 * uno traducido. Comprueba que el mensaje lleva form-name, pagina, Nombre,
 * Email y Mensaje, y que en la pagina sale el aviso de enviado.
 * Sale con 1 si algo falla.
 */
import { arg, abrirNavegador, nuevoContexto } from './lib/navegador.mjs';

const BASE = arg('--base', 'http://localhost:4321').replace(/\/$/, '');
const PRUEBAS = [
  { ruta: '/contacto/', form: 'form.elementor-form', nombre: 'contacto' },
  { ruta: '/experiencias-a-medida/', form: 'form.elementor-form', nombre: 'experiencias-a-medida' },
  { ruta: '/paella/', form: 'form.wpcf7-form', nombre: 'info-bus' },
  { ruta: '/en/contact/', form: 'form.elementor-form', nombre: 'contacto' },
];
const navegador = await abrirNavegador();
const ctx = await nuevoContexto(navegador, 1400);
const envios = [];
await ctx.route('**/*', (route) => {
  const req = route.request();
  const u = new URL(req.url());
  if (req.method() === 'POST' && (u.pathname === '/' || u.pathname === '') && u.hostname === 'localhost') {
    envios.push(Object.fromEntries(new URLSearchParams(req.postData() || '')));
    return route.fulfill({ status: 200, body: 'ok' });
  }
  return (u.hostname === 'localhost' || u.hostname === '127.0.0.1') ? route.continue() : route.abort();
});
const pagina = await ctx.newPage();
let fallos = 0;
for (const p of PRUEBAS) {
  const antes = envios.length;
  await pagina.goto(BASE + p.ruta, { waitUntil: 'load', timeout: 45000 }).catch(() => {});
  // los guiones estan aplazados hasta que el visitante hace algo
  await pagina.mouse.move(30, 30); await pagina.mouse.move(60, 60);
  await pagina.waitForFunction(() => document.documentElement.getAttribute('data-js-aplazado') !== 'espera', null, { timeout: 20000 }).catch(() => {});
  await pagina.waitForTimeout(800);
  // el de "Info bus" vive en una ventana emergente de Elementor: hay que abrirla
  if (p.nombre === 'info-bus') {
    await pagina.evaluate(() => { try { elementorProFrontend.modules.popup.showPopup({ id: 9016 }); } catch (e) {} });
    await pagina.waitForTimeout(800);
  }
  const resultado = await pagina.evaluate((sel) => {
    const form = document.querySelector(sel);
    if (!form) return 'no hay formulario ' + sel;
    form.querySelectorAll('input, textarea, select').forEach((c) => {
      if (c.type === 'hidden' || c.type === 'submit') return;
      if (c.type === 'checkbox') { c.checked = true; return; }
      if (c.tagName === 'SELECT') { c.selectedIndex = Math.min(1, c.options.length - 1); return; }
      if (c.type === 'email') c.value = 'prueba@ejemplo.com';
      else if (c.type === 'tel') c.value = '600000000';
      else if (c.type === 'date') c.value = '2026-12-01';
      else if (c.type === 'number') c.value = '2';
      else c.value = 'Prueba automatica (no es un mensaje real)';
    });
    form.requestSubmit ? form.requestSubmit() : form.submit();
    return 'enviado';
  }, p.form);
  await pagina.waitForTimeout(1500);
  const aviso = await pagina.evaluate((sel) => { const f = document.querySelector(sel); const c = f && f.querySelector('.elementor-message, .wpcf7-response-output'); return c ? c.textContent.trim() : ''; }, p.form);
  const envio = envios[antes];
  const bien = resultado === 'enviado' && envio && envio['form-name'] === p.nombre && envio.pagina && envio.Nombre && envio.Email && envio.Mensaje && /enviado|sent|inviato|envoy|wys/i.test(aviso);
  if (!bien) fallos++;
  console.log(`${bien ? 'BIEN ' : 'FALLO'} ${p.ruta}: ${resultado}; ${envio ? `form-name=${envio['form-name']}, campos=${Object.keys(envio).join(',')}` : 'sin envio interceptado'}; aviso="${aviso.slice(0, 60)}"`);
}
await navegador.close();
process.exit(fallos ? 1 : 0);
