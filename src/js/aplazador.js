/*
 * aplazador.js — carga los guiones de la pagina cuando el visitante hace algo
 * (mueve el raton, toca la pantalla, pulsa una tecla, hace scroll) o, como
 * mucho, pasados unos segundos. Es lo mismo que hace LiteSpeed en la web
 * vieja: asi la pagina se pinta antes y el JavaScript no estorba.
 *
 * scripts/partir-paginas.mjs deja cada <script> como
 *   <script type="text/plain" data-aplazado="js|module" …>
 * y este cargador los ejecuta EN SU ORDEN: los externos uno detras de otro
 * (esperando a que cargue cada uno), los de dentro de la pagina al momento.
 *
 * Para que ejecutar en orden no signifique DESCARGAR de uno en uno (con
 * Netlify, ~300 ms por peticion, serian varios segundos), en cuanto la pagina
 * termina de cargar se piden todos los guiones externos por adelantado con
 * <link rel="preload"> de prioridad baja: cuando el visitante hace algo, ya
 * estan aqui y solo queda ejecutarlos.
 *
 * El primer toque o clic del visitante llega antes de que los guiones esten
 * listos (es justo lo que los despierta): se guarda y, al terminar, se repite
 * sobre el mismo elemento, para que el boton del menu o de una ventana
 * responda a la primera. No se repite sobre enlaces normales (ya habrian
 * navegado) ni sobre botones de enviar un formulario.
 *
 * Mientras los ejecuta, la pagina "finge" que todavia se esta cargando
 * (document.readyState = "loading" y DOMContentLoaded aun no ha pasado), igual
 * que hace LiteSpeed: asi jQuery(document).ready() y los que esperan
 * DOMContentLoaded no se adelantan a los guiones que vienen detras (Swiper se
 * carga despues de Elementor y Elementor tiene que esperarle). Al terminar se
 * lanzan DOMContentLoaded y load y se marca <html data-js-aplazado="hecho">.
 * Va en linea al principio del <head> (Base.astro) y no se aplaza a si mismo.
 */
(function () {
  var TOPE = window.__aplazadorTope || 6000;
  var hecho = false, temporizador;
  var eventos = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'touchmove', 'wheel', 'scroll'];
  function quitar() { eventos.forEach(function (e) { window.removeEventListener(e, arrancar, { passive: true, capture: true }); }); clearTimeout(temporizador); }

  // El primer clic o toque, para repetirlo cuando los guiones esten listos
  var clicPendiente = null;
  function guardarClic(ev) {
    if (document.documentElement.getAttribute('data-js-aplazado') === 'hecho') return;
    var el = ev.target && ev.target.nodeType === 1 ? ev.target : null;
    if (!el) return;
    var enlace = el.closest && el.closest('a[href]');
    if (enlace && !/^#/.test(enlace.getAttribute('href') || '')) return; // enlace normal: navega el solo
    var boton = el.closest && el.closest('button, input[type=submit], input[type=button]');
    if (boton && boton.closest('form') && (boton.type === 'submit' || !boton.type)) return; // enviar un formulario
    clicPendiente = enlace || boton || el;
  }
  // Las ventanas de Elementor (menu movil) se enganchan un poco despues de "load":
  // se espera (como mucho 3 s) a que todos los documentos de ventana tengan getModal.
  function ventanasListas() {
    try {
      var ef = window.elementorFrontend;
      if (!ef || !ef.documentsManager || !ef.documentsManager.documents) return !ef;
      var docs = ef.documentsManager.documents;
      for (var id in docs) {
        var d = docs[id];
        if (d && d.$element && d.$element.hasClass('elementor-location-popup') && typeof d.getModal !== 'function') return false;
      }
      return true;
    } catch (e) { return true; }
  }
  function repetirClic(intentos) {
    if (!clicPendiente || !document.contains(clicPendiente)) { clicPendiente = null; return; }
    if (!ventanasListas() && intentos < 60) return setTimeout(function () { repetirClic(intentos + 1); }, 50);
    var el = clicPendiente; clicPendiente = null;
    try { el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window })); } catch (e) {}
  }

  // Pedir por adelantado los guiones externos (prioridad baja), cuando la pagina ya esta cargada
  var precargados = false;
  function precargar() {
    if (precargados) return; precargados = true;
    var lista = document.querySelectorAll('script[data-aplazado][src]');
    for (var i = 0; i < lista.length; i++) {
      var l = document.createElement('link');
      var modulo = lista[i].getAttribute('data-aplazado') === 'module';
      l.rel = modulo ? 'modulepreload' : 'preload';
      if (!modulo) l.as = 'script';
      l.href = lista[i].getAttribute('src');
      l.setAttribute('fetchpriority', 'low');
      l.setAttribute('data-nuevo', 'precarga-guion');
      document.head.appendChild(l);
    }
  }

  // Fingir que la pagina se esta cargando mientras corren los guiones aplazados
  var estado = null;
  var pendientesDoc = [], pendientesWin = [];
  var addDoc = document.addEventListener, addWin = window.addEventListener;
  function fingirCarga() {
    estado = 'loading';
    try { Object.defineProperty(document, 'readyState', { get: function () { return estado; }, configurable: true }); } catch (e) {}
    document.addEventListener = function (tipo, fn, op) {
      if (tipo === 'DOMContentLoaded' || tipo === 'readystatechange') { pendientesDoc.push([tipo, fn, op]); return; }
      return addDoc.call(document, tipo, fn, op);
    };
    window.addEventListener = function (tipo, fn, op) {
      if (tipo === 'load' || tipo === 'DOMContentLoaded') { pendientesWin.push([tipo, fn, op]); return; }
      return addWin.call(window, tipo, fn, op);
    };
  }
  function terminarCarga() {
    document.addEventListener = addDoc; window.addEventListener = addWin;
    estado = 'interactive';
    pendientesDoc.forEach(function (p) { addDoc.call(document, p[0], p[1], p[2]); });
    pendientesWin.forEach(function (p) { addWin.call(window, p[0], p[1], p[2]); });
    try { document.dispatchEvent(new Event('readystatechange')); } catch (e) {}
    try { document.dispatchEvent(new Event('DOMContentLoaded', { bubbles: true })); } catch (e) {}
    estado = 'complete';
    try { document.dispatchEvent(new Event('readystatechange')); } catch (e) {}
    try { delete document.readyState; } catch (e) {}
    try { window.dispatchEvent(new Event('load')); } catch (e) {}
    document.documentElement.setAttribute('data-js-aplazado', 'hecho');
    window.removeEventListener('click', guardarClic, true);
    setTimeout(function () { repetirClic(0); }, 0);
  }

  function siguiente(lista, i, fin) {
    if (i >= lista.length) return fin();
    var viejo = lista[i];
    var nuevo = document.createElement('script');
    for (var k = 0; k < viejo.attributes.length; k++) {
      var a = viejo.attributes[k];
      if (a.name === 'type' || a.name === 'data-aplazado') continue;
      nuevo.setAttribute(a.name, a.value);
    }
    if (viejo.getAttribute('data-aplazado') === 'module') nuevo.type = 'module';
    var externo = viejo.hasAttribute('src');
    if (externo) {
      nuevo.onload = nuevo.onerror = function () { siguiente(lista, i + 1, fin); };
    } else {
      nuevo.text = viejo.text;
    }
    viejo.parentNode.replaceChild(nuevo, viejo);
    if (!externo) siguiente(lista, i + 1, fin);
  }
  function arrancar() {
    if (hecho) return; hecho = true; quitar();
    precargar();
    document.documentElement.setAttribute('data-js-aplazado', 'cargando');
    var lista = Array.prototype.slice.call(document.querySelectorAll('script[data-aplazado]'));
    var empezar = function () { fingirCarga(); siguiente(lista, 0, terminarCarga); };
    if (document.readyState === 'loading') addDoc.call(document, 'DOMContentLoaded', empezar); else empezar();
  }
  eventos.forEach(function (e) { window.addEventListener(e, arrancar, { passive: true, capture: true }); });
  window.addEventListener('click', guardarClic, true);
  if (document.readyState === 'complete') precargar(); else addWin.call(window, 'load', precargar);
  temporizador = setTimeout(arrancar, TOPE);
  document.documentElement.setAttribute('data-js-aplazado', 'espera');
})();
