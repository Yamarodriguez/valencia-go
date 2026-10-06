/**
 * relativizar.mjs — pasa a relativas las direcciones absolutas al propio
 * dominio (https://www.dominio/x, //www.dominio/x, https:\/\/www.dominio\/x).
 * Lo usan montar-referencia.mjs (la copia de la web vieja) y
 * partir-paginas.mjs (la web nueva), para que las dos hagan EXACTAMENTE lo mismo.
 *
 * Dos reglas para no tocar el contenido:
 *  - En un HTML (relativizarHtml) solo se actua DENTRO de las etiquetas (sus
 *    atributos) y dentro de <script> y <style>. El texto visible no se toca
 *    nunca: si alguien escribio "visita https://www.dominio/tours" en un
 *    parrafo, se queda tal cual. Los comentarios tampoco.
 *  - Solo se cambia una direccion cuando EMPIEZA ahi: detras de comilla,
 *    parentesis, espacio, coma (srcset), '>' o ';' (de &quot;). Una direccion
 *    que va como parametro de otra (https://wa.me/?text=https://www.dominio/x)
 *    se queda como esta, y lo mismo las codificadas con %3A%2F%2F.
 */
const RX_TROZOS = /(<script\b[^>]*>[\s\S]*?<\/script>|<style\b[^>]*>[\s\S]*?<\/style>|<!--[\s\S]*?-->|<(?:[^<>"']|"[^"]*"|'[^']*')+>)/g;

export function crearRelativizador(dominio) {
  const host = new URL(dominio).host.replace(/^www\./, '').replace(/\./g, '\\.');
  const antes = `(?<=^|["'(\\s,>;])`;
  const reglas = [
    // JSON escapado: https:\/\/www.dominio\/ruta  ->  \/ruta
    [new RegExp(`${antes}https?:\\\\/\\\\/(?:www\\.)?${host}\\\\/`, 'gi'), '\\/'],
    [new RegExp(`${antes}https?:\\\\/\\\\/(?:www\\.)?${host}(?=["'\\\\&])`, 'gi'), '\\/'],
    // normales
    [new RegExp(`${antes}(?:https?:)?//(?:www\\.)?${host}/`, 'gi'), '/'],
    [new RegExp(`${antes}(?:https?:)?//(?:www\\.)?${host}(?=["'\\s<)?#&])`, 'gi'), '/'],
  ];
  const quedanG = new RegExp(`${antes}(?:https?:)?(?:\\\\/\\\\/|//)(?:www\\.)?${host}(?![\\w.-])`, 'gi');
  const relativizar = (texto) => { for (const [rx, por] of reglas) texto = texto.replace(rx, por); return texto; };
  const contar = (texto) => (texto.match(quedanG) || []).length;
  const porTrozos = (html, fn) => html.split(RX_TROZOS).map((t, i) => (i % 2 && !t.startsWith('<!--') ? fn(t) : null));
  return {
    /** Para hojas de estilo y trozos que ya son una etiqueta o un guion. */
    relativizar,
    contar,
    /** Para un HTML entero o un trozo de HTML: no toca el texto visible. */
    relativizarHtml(html) { return html.split(RX_TROZOS).map((t, i) => (i % 2 && !t.startsWith('<!--') ? relativizar(t) : t)).join(''); },
    contarHtml(html) { return porTrozos(html, contar).reduce((n, c) => n + (c || 0), 0); },
  };
}
