/*
 * formularios.js — hace funcionar los formularios de la web vieja (Elementor y
 * Contact Form 7) sin WordPress: el envio va a los formularios de Netlify, sin
 * salir de la pagina, y el aviso ("Mensaje enviado" o el error) sale en el
 * mismo sitio donde lo ponia la web vieja. Cada mensaje lleva la pagina desde
 * la que se envio. Si hay Google Analytics, se registra un evento de contacto.
 *
 * No toca el marcado de los formularios: solo escucha el envio.
 * Los formularios y sus campos estan declarados en /formularios-netlify.html
 * (Netlify los lee al desplegar). Los campos llegan con nombres fijos (Nombre,
 * Email, Telefono, Mensaje...) sea cual sea el idioma de la pagina.
 */
(function () {
  'use strict';
  var TEXTOS = {
    es: { ok: 'Mensaje enviado. Te contestamos lo antes posible.', error: 'No se ha podido enviar. Prueba otra vez o escríbenos a ', falta: 'Rellena los campos obligatorios.', enviando: 'Enviando…' },
    en: { ok: 'Message sent. We will get back to you shortly.', error: 'The message could not be sent. Try again or email us at ', falta: 'Please fill in the required fields.', enviando: 'Sending…' },
    it: { ok: 'Messaggio inviato. Ti risponderemo al più presto.', error: 'Invio non riuscito. Riprova o scrivici a ', falta: 'Compila i campi obbligatori.', enviando: 'Invio…' },
    fr: { ok: 'Message envoyé. Nous vous répondrons au plus vite.', error: "L'envoi a échoué. Réessayez ou écrivez-nous à ", falta: 'Remplissez les champs obligatoires.', enviando: 'Envoi…' },
    pl: { ok: 'Wiadomość wysłana. Odpowiemy najszybciej, jak to możliwe.', error: 'Nie udało się wysłać. Spróbuj ponownie lub napisz do nas: ', falta: 'Wypełnij wymagane pola.', enviando: 'Wysyłanie…' },
  };
  var idioma = (document.documentElement.lang || 'es').slice(0, 2).toLowerCase();
  var T = TEXTOS[idioma] || TEXTOS.es;
  var CORREO = (document.querySelector('a[href^="mailto:"]') || {}).href;
  CORREO = CORREO ? CORREO.replace('mailto:', '').split('?')[0] : '';

  function etiqueta(campo, form) {
    var id = campo.getAttribute('id');
    var lab = id && form.querySelector('label[for="' + id + '"]');
    if (!lab && campo.parentElement && campo.parentElement.tagName === 'LABEL') lab = campo.parentElement;
    var texto = (lab && lab.textContent) || campo.getAttribute('placeholder') || campo.getAttribute('aria-label') || campo.name || '';
    return texto.replace(/\s+/g, ' ').replace(/\*$/, '').trim();
  }

  // nombre fijo de cada campo, para que los mensajes lleguen igual en los 5 idiomas
  function clave(c) {
    var n = c.name, t = c.type;
    if (/your-name|\[name\]/.test(n)) return 'Nombre';
    if (/your-email|\[email\]/.test(n) || t === 'email') return 'Email';
    if (/phone|tel/.test(n) || t === 'tel') return 'Telefono';
    if (/your-message|\[message\]/.test(n) || c.tagName === 'TEXTAREA') return 'Mensaje';
    if (/your-subject|field_8621329/.test(n)) return 'Asunto';
    if (/tipo-vehiculo/.test(n)) return 'Tipo de vehiculo';
    if (/field_35f4403/.test(n)) return 'Experiencia';
    if (t === 'date') return 'Fecha';
    if (t === 'number') return 'Personas';
    if (/Privacidad|field_23c782a|field_bc09346/.test(n)) return 'Privacidad';
    return null;
  }

  function nombreFormulario(form) {
    if (form.classList.contains('wpcf7-form')) return 'info-bus';
    var id = (form.querySelector('input[name="form_id"]') || {}).value || '';
    return { b62b86b: 'contacto', '96872f0': 'contacto-entrada', b81544f: 'experiencias-a-medida' }[id] || 'contacto';
  }

  function datos(form) {
    var valores = {};
    var faltan = false;
    var campos = form.querySelectorAll('input, textarea, select');
    for (var i = 0; i < campos.length; i++) {
      var c = campos[i];
      if (!c.name || c.type === 'hidden' || c.type === 'submit' || c.type === 'button') continue;
      if (/^(_wp|_wpcf7|form_id|post_id|referer_title|queried_id|action|cf-turnstile|g-recaptcha)/.test(c.name)) continue;
      var k = clave(c) || etiqueta(c, form) || c.name;
      if (c.type === 'checkbox' || c.type === 'radio') {
        if (c.required && !form.querySelector('[name="' + c.name + '"]:checked')) faltan = true;
        if (!c.checked) continue;
        var v = (k === 'Privacidad') ? 'si' : (etiqueta(c, form) || c.value);
        valores[k] = valores[k] ? valores[k] + ', ' + v : v;
        continue;
      }
      var valor = (c.value || '').trim();
      if (c.required && !valor) faltan = true;
      valores[k] = valor;
    }
    var cuerpo = new URLSearchParams();
    cuerpo.set('form-name', nombreFormulario(form));
    cuerpo.set('pagina', location.href);
    for (var kk in valores) cuerpo.set(kk, valores[kk]);
    return { cuerpo: cuerpo, faltan: faltan };
  }

  function aviso(form, texto, bien) {
    var caja = form.querySelector('.elementor-message, .wpcf7-response-output');
    if (!caja) { caja = document.createElement('div'); form.appendChild(caja); }
    caja.textContent = texto;
    caja.className = (form.classList.contains('wpcf7-form') ? 'wpcf7-response-output ' : 'elementor-message ') + (bien ? 'elementor-message-success' : 'elementor-message-danger');
    caja.style.display = 'block';
    caja.style.marginTop = '12px';
    caja.style.color = bien ? '#1a7f37' : '#b42318';
    caja.setAttribute('role', 'alert');
  }

  function enviar(ev) {
    var form = ev.target;
    if (!form.matches || !form.matches('form.elementor-form, form.wpcf7-form')) return;
    ev.preventDefault();
    ev.stopImmediatePropagation();
    var d = datos(form);
    if (d.faltan) { aviso(form, T.falta, false); return; }
    var boton = form.querySelector('button[type="submit"], input[type="submit"]');
    if (boton) boton.disabled = true;
    aviso(form, T.enviando, true);
    fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: d.cuerpo.toString() })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        aviso(form, T.ok, true);
        form.reset();
        if (typeof gtag === 'function') gtag('event', 'generate_lead', { formulario: d.cuerpo.get('form-name'), pagina: location.pathname });
      })
      .catch(function () { aviso(form, T.error + CORREO, false); })
      .then(function () { if (boton) boton.disabled = false; });
  }
  // en fase de captura: antes que los guiones de Elementor y de Contact Form 7
  document.addEventListener('submit', enviar, true);
})();
