/*
 * selector-rediseno.js — barra para elegir el diseño en la web de PRUEBAS
 * (Fase 3): Original · 1 Propio · 2 GetYourGuide · 3 Civitatis.
 * Cambia la hoja de rediseño al momento, sin recargar, y recuerda la elección
 * en el navegador al pasar de página. Se enciende con "selectorRediseno": true
 * en src/data/site.json y se apaga antes del cambio de dominio.
 * Va marcado con data-nuevo (las comprobaciones lo saltan).
 */
(function () {
  'use strict';
  var OPCIONES = [['', 'Original'], ['propio', '1 · Propio'], ['getyourguide', '2 · GetYourGuide'], ['civitatis', '3 · Civitatis']];
  var CLAVE = 'vgo-rediseno';
  var actual = '';
  try { actual = localStorage.getItem(CLAVE) || ''; } catch (e) {}

  function aplicar(nombre) {
    actual = nombre;
    try { if (nombre) localStorage.setItem(CLAVE, nombre); else localStorage.removeItem(CLAVE); } catch (e) {}
    var viejo = document.getElementById('rediseno-hoja');
    if (viejo) viejo.parentNode.removeChild(viejo);
    if (nombre) {
      var link = document.createElement('link');
      link.id = 'rediseno-hoja'; link.rel = 'stylesheet'; link.href = '/rediseno/' + nombre + '.css';
      link.setAttribute('data-nuevo', 'rediseno');
      document.head.appendChild(link); // la última hoja del <head>
    }
    var botones = document.querySelectorAll('#vgo-selector-rediseno button');
    for (var i = 0; i < botones.length; i++) botones[i].setAttribute('aria-pressed', botones[i].getAttribute('data-opcion') === nombre ? 'true' : 'false');
  }

  function pintar() {
    var barra = document.createElement('div');
    barra.id = 'vgo-selector-rediseno';
    barra.setAttribute('data-nuevo', 'selector-rediseno');
    barra.setAttribute('role', 'group');
    barra.setAttribute('aria-label', 'Elegir diseño (solo en la web de pruebas)');
    var estilo = document.createElement('style');
    estilo.textContent = '#vgo-selector-rediseno{position:fixed;left:12px;bottom:12px;z-index:2147483000;display:flex;gap:6px;align-items:center;padding:8px 10px;background:#111;color:#fff;border-radius:999px;font:600 13px/1 Arial,sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.35)}#vgo-selector-rediseno span{padding:0 6px 0 4px;opacity:.75;font-weight:400}#vgo-selector-rediseno button{appearance:none;border:1px solid #555;background:#222;color:#fff;border-radius:999px;padding:7px 11px;font:inherit;cursor:pointer}#vgo-selector-rediseno button[aria-pressed="true"]{background:#F26A1B;border-color:#F26A1B;color:#fff}@media (max-width:600px){#vgo-selector-rediseno{left:8px;right:72px;bottom:8px;flex-wrap:wrap;border-radius:16px}#vgo-selector-rediseno button{padding:6px 9px;font-size:12px}}';
    barra.appendChild(estilo);
    var rotulo = document.createElement('span'); rotulo.textContent = 'Diseño:'; barra.appendChild(rotulo);
    OPCIONES.forEach(function (o) {
      var b = document.createElement('button');
      b.type = 'button'; b.textContent = o[1]; b.setAttribute('data-opcion', o[0]);
      b.addEventListener('click', function () { aplicar(o[0]); });
      barra.appendChild(b);
    });
    document.body.appendChild(barra);
    aplicar(actual);
  }
  if (document.body) pintar(); else document.addEventListener('DOMContentLoaded', pintar);
})();
