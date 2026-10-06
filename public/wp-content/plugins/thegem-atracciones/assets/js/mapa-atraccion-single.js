/**
 * Mapa de una sola atracción (página de detalle)
 * Soporta Leaflet/OpenStreetMap o Google Maps según tgaMapaSingleData.map_provider.
 */
;(function ($) {
  'use strict'

  function buildPopupContent(a) {
    return '<div class="mapa-popup mapa-popup-single">' +
      (a.imagen_url
        ? '<div class="mapa-popup-imagen"><img src="' + a.imagen_url + '" alt="' + (a.imagen_alt || a.title) + '" loading="lazy" /></div>'
        : '') +
      '<div class="mapa-popup-content">' +
      '<h4 class="mapa-popup-title">' + (a.title || '') + '</h4>' +
      (a.permalink ? '<a href="' + a.permalink + '" class="btn-popup-ver-mas">Ver más</a>' : '') +
      '</div></div>'
  }

  function initGoogleSingle() {
    if (typeof google === 'undefined' || !google.maps) return
    var root = document.getElementById('tga-atracciones')
    if (!root) return
    var container = root.querySelector('#mapa-atraccion-single')
    if (!container) return
    if (typeof tgaMapaSingleData === 'undefined' || !tgaMapaSingleData.atraccion) return
    var a = tgaMapaSingleData.atraccion
    var zoom = tgaMapaSingleData.zoom || 16
    var center = { lat: a.lat, lng: a.lng }
    var map = new google.maps.Map(container, {
      center: center,
      zoom: zoom,
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: true
    })
    var infoWindow = new google.maps.InfoWindow({ maxWidth: 320, content: buildPopupContent(a) })
    var marker = new google.maps.Marker({ position: center, map: map })
    marker.addListener('click', function () {
      infoWindow.open(map, marker)
    })
  }

  if (typeof tgaMapaSingleData !== 'undefined' && tgaMapaSingleData.map_provider === 'google') {
    window.tgaMapsSingleReady = function () {
      $(document).ready(initGoogleSingle)
    }
    if (typeof google !== 'undefined' && google.maps) {
      $(document).ready(initGoogleSingle)
    }
    return
  }

  $(document).ready(function () {
    var root = document.getElementById('tga-atracciones')
    if (!root) return
    if (typeof tgaMapaSingleData === 'undefined' || !tgaMapaSingleData.atraccion) return
    var container = root.querySelector('#mapa-atraccion-single')
    if (!container) return

    var a = tgaMapaSingleData.atraccion
    var zoom = tgaMapaSingleData.zoom || 16
    var center = [a.lat, a.lng]

    if (typeof L === 'undefined') return
    var map = L.map('mapa-atraccion-single').setView(center, zoom)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map)

    var icon = L.divIcon({
      className: 'location-marker-single',
      html: '<div class="marker-single-pin"><i class="fas fa-map-marker-alt"></i></div>',
      iconSize: [40, 40],
      iconAnchor: [20, 40],
      popupAnchor: [0, -40]
    })

    var marker = L.marker(center, { icon: icon })
    marker.bindPopup(buildPopupContent(a), {
      maxWidth: 320,
      className: 'mapa-popup-container mapa-popup-container-single'
    })
    marker.addTo(map)
  })
})(jQuery)
