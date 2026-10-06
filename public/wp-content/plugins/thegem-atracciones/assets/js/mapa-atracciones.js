/**
 * Mapa de Atracciones: Leaflet (OpenStreetMap) o Google Maps
 * Si tgaMapaData.map_provider === 'google' y hay API key, se usa Google; si no, Leaflet.
 */

;(function ($) {
  'use strict'

  /**
   * TranslatePress (y similares) traduce el HTML del listado en el DOM, no el JSON del mapa.
   * Si existe la tarjeta, usamos el texto ya traducido de .atraccion-descripcion.
   */
  function tgaGetPopupDescriptionFromDom(atraccionId, root) {
    if (!root) root = document.getElementById('tga-atracciones')
    if (!root || atraccionId == null || atraccionId === '') return ''
    var el = root.querySelector('.atraccion-card[data-atraccion-id="' + String(atraccionId) + '"] .atraccion-descripcion')
    if (!el) return ''
    return (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim()
  }

  function tgaEscapeHtmlForPopup(s) {
    if (!s) return ''
    var d = document.createElement('div')
    d.textContent = s
    return d.innerHTML
  }

  /** Ancho máximo del popup (Leaflet / Google) — más estrecho en móvil */
  function tgaMapPopupMaxWidthPx() {
    if (typeof window.matchMedia !== 'function') return 350
    return window.matchMedia('(max-width: 768px)').matches ? 220 : 350
  }

  function buildPopupContent(atraccion, root) {
    if (!root) root = document.getElementById('tga-atracciones')
    var toursHTML = ''
    var toursMax = typeof tgaMapaData !== 'undefined' && tgaMapaData.max_tours_popup != null
      ? parseInt(tgaMapaData.max_tours_popup, 10)
      : 3
    if (isNaN(toursMax) || toursMax < 1) toursMax = 3
    var toursList = (atraccion.tours_relacionados || []).slice(0, toursMax)
    if (toursList.length > 0) {
      toursHTML = '<div class="mapa-popup-tours"><h5 class="mapa-popup-tours-title">Tours relacionados</h5><ul class="mapa-popup-tours-list">' +
        toursList.map(function (tour) {
          var titleEsc = tgaEscapeHtmlForPopup(tour.title || '')
          return '<li class="mapa-popup-tour-item"><a href="' + tour.permalink + '" class="mapa-popup-tour-link mapa-popup-tour-link--text">' +
            '<i class="fas fa-ticket-alt mapa-popup-tour-icon" aria-hidden="true"></i>' +
            '<span class="mapa-popup-tour-title">' + titleEsc + '</span>' +
            '<span class="mapa-popup-tour-suffix" aria-hidden="true">&gt;&gt;</span></a></li>'
        }).join('') + '</ul></div>'
    }
    var descFromDom = tgaGetPopupDescriptionFromDom(atraccion.id, root)
    var descText = descFromDom || (atraccion.descripcion_completa || '')
    var desc = descText
      ? '<div class="mapa-popup-descripcion">' + tgaEscapeHtmlForPopup(descText.length > 200 ? descText.substring(0, 200) + '...' : descText) + '</div>'
      : ''
    var img = atraccion.imagen_url
      ? '<div class="mapa-popup-imagen"><img src="' + atraccion.imagen_url + '" alt="' + (atraccion.imagen_alt || atraccion.title) + '" loading="lazy" /></div>'
      : ''
    return '<div class="mapa-popup mapa-popup-container">' + img +
      '<div class="mapa-popup-content"><h4 class="mapa-popup-title">' + atraccion.title + '</h4>' + desc +
      toursHTML + '<a href="' + atraccion.permalink + '" class="btn-popup-ver-mas">Ver más</a></div></div>'
  }

  function scrollToCard(root, atraccionId) {
    var $card = $(root).find('[data-atraccion-id="' + atraccionId + '"]')
    if ($card.length) {
      $('html, body').animate({ scrollTop: $card.offset().top - 100 }, 500)
      $card.addClass('highlighted')
      setTimeout(function () { $card.removeClass('highlighted') }, 2000)
    }
  }

  function tgaNotifyMapReady(provider, markerCount) {
    window.tgaMapaReady = true
    window.tgaMapaProvider = provider
    window.tgaMapaMarkerCount = markerCount
    try {
      console.info('[TheGem Atracciones] Mapa OK (' + provider + '): ' + markerCount + ' marcador(es). Puedes filtrar.')
    } catch (e) {}
    if (typeof jQuery !== 'undefined') {
      jQuery(document).trigger('tga:mapa-listo', [{ provider: provider, marcadores: markerCount }])
    }
  }

  /**
   * Sustituye marcadores tras filtro AJAX (debe existir antes del return de Google Maps).
   */
  window.tgaRebuildMapMarkers = function (atracciones) {
    var atrs = atracciones || []
    if (typeof tgaMapaData !== 'undefined') {
      tgaMapaData.atracciones = atrs
    }
    var root = document.getElementById('tga-atracciones')
    if (!root) return

    if (window.tgaMapType === 'google' && window.tgaMapa && typeof google !== 'undefined' && google.maps) {
      var map = window.tgaMapa
      var center = tgaMapaData.valencia_center
      var logoUrl = (tgaMapaData.logo_url || '').trim()
      if (logoUrl && logoUrl.indexOf('//') === -1 && logoUrl.indexOf('/') === 0) {
        logoUrl = window.location.origin + logoUrl
      }
      if (window.tgaMarcadores) {
        window.tgaMarcadores.forEach(function (item) {
          if (item.marker) item.marker.setMap(null)
        })
      }
      window.tgaMarcadores = []
      var bounds = new google.maps.LatLngBounds()
      var iw = window.tgaGoogleInfoWindow || new google.maps.InfoWindow({ maxWidth: tgaMapPopupMaxWidthPx() })
      window.tgaGoogleInfoWindow = iw
      atrs.forEach(function (atraccion) {
        if (!atraccion.lat || !atraccion.lng) return
        var pos = { lat: atraccion.lat, lng: atraccion.lng }
        var markerOpt = { position: pos, map: map }
        if (logoUrl) {
          markerOpt.icon = {
            url: logoUrl,
            scaledSize: new google.maps.Size(40, 42),
            anchor: new google.maps.Point(20, 42)
          }
        }
        var marker = new google.maps.Marker(markerOpt)
        bounds.extend(pos)
        marker.addListener('click', function () {
          iw.setContent(buildPopupContent(atraccion, root))
          iw.open(map, marker)
          scrollToCard(root, atraccion.id)
        })
        window.tgaMarcadores.push({ marker: marker, atraccion: atraccion })
      })
      window.tgaOpenMarkerPopup = function (item) {
        iw.setContent(buildPopupContent(item.atraccion, root))
        iw.open(map, item.marker)
      }
      window.tgaSetMarkerVisible = function (item, visible) {
        item.marker.setMap(visible ? map : null)
      }
      window.tgaFitBounds = function (items) {
        if (!items || items.length === 0) return
        var b = new google.maps.LatLngBounds()
        items.forEach(function (item) {
          if (item.marker && item.marker.getPosition) b.extend(item.marker.getPosition())
        })
        if (!b.isEmpty()) map.fitBounds(b)
      }
      if (window.tgaMarcadores.length > 0) {
        map.fitBounds(bounds)
      } else {
        map.setCenter({ lat: center[0], lng: center[1] })
        map.setZoom(tgaMapaData.zoom != null ? tgaMapaData.zoom : 12)
      }
      if (typeof window.tgaInvalidateMapSize === 'function') window.tgaInvalidateMapSize()
      tgaNotifyMapReady('google', window.tgaMarcadores.length)
    } else if (window.tgaMapType === 'leaflet' && window.tgaMapa && typeof L !== 'undefined') {
      var map = window.tgaMapa
      var center = tgaMapaData.valencia_center
      var logoUrl = (tgaMapaData.logo_url || '').trim()
      if (logoUrl && logoUrl.indexOf('//') === -1 && logoUrl.indexOf('/') === 0) {
        logoUrl = window.location.origin + logoUrl
      }
      function createLogoIconLeaflet() {
        var html = logoUrl
          ? '<div class="marker-logo-wrap"><img src="' + logoUrl + '" alt="" class="marker-logo-img" /></div>'
          : '<div class="marker-logo-wrap marker-logo-fallback"><i class="fas fa-map-marker-alt"></i></div>'
        return L.divIcon({
          className: 'location-marker-logo',
          html: html,
          iconSize: [40, 42],
          iconAnchor: [20, 42],
          popupAnchor: [0, -42]
        })
      }
      if (window.tgaMarcadores) {
        window.tgaMarcadores.forEach(function (item) {
          if (item.marker) map.removeLayer(item.marker)
        })
      }
      window.tgaMarcadores = []
      atrs.forEach(function (atraccion) {
        if (!atraccion.lat || !atraccion.lng) return
        var marker = L.marker([atraccion.lat, atraccion.lng], { icon: createLogoIconLeaflet() })
        marker.bindPopup(function () {
          return buildPopupContent(atraccion, root)
        }, { maxWidth: tgaMapPopupMaxWidthPx(), className: 'mapa-popup-container' })
        marker.atraccionData = atraccion
        marker.on('click', function () { scrollToCard(root, atraccion.id) })
        marker.addTo(map)
        window.tgaMarcadores.push({ marker: marker, atraccion: atraccion })
      })
      window.tgaOpenMarkerPopup = function (item) {
        if (item.marker && item.marker.openPopup) item.marker.openPopup()
      }
      window.tgaSetMarkerVisible = function (item, visible) {
        if (visible) item.marker.addTo(map)
        else map.removeLayer(item.marker)
      }
      window.tgaFitBounds = function (items) {
        if (!items || items.length === 0) return
        var g = new L.featureGroup(items.map(function (m) { return m.marker }))
        map.fitBounds(g.getBounds().pad(0.1))
      }
      if (window.tgaMarcadores.length > 0) {
        var group = new L.featureGroup(window.tgaMarcadores.map(function (m) { return m.marker }))
        map.fitBounds(group.getBounds().pad(0.1))
      } else {
        map.setView(center, tgaMapaData.zoom != null ? tgaMapaData.zoom : 12)
      }
      if (typeof window.tgaInvalidateMapSize === 'function') window.tgaInvalidateMapSize()
      tgaNotifyMapReady('leaflet', window.tgaMarcadores.length)
    }
  }

  function initGoogleMap() {
    if (typeof google === 'undefined' || !google.maps) return
    var root = document.getElementById('tga-atracciones')
    if (!root) return
    var container = root.querySelector('#mapa-atracciones')
    if (!container) return
    var center = tgaMapaData.valencia_center
    var zoom = tgaMapaData.zoom
    var logoUrl = (tgaMapaData.logo_url || '').trim()
    if (logoUrl && logoUrl.indexOf('//') === -1 && logoUrl.indexOf('/') === 0) {
      logoUrl = window.location.origin + logoUrl
    }
    window.tgaMarcadores = []
    var map = new google.maps.Map(container, {
          center: { lat: center[0], lng: center[1] },
          zoom: zoom,
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: true
        })
        var infoWindow = new google.maps.InfoWindow({ maxWidth: tgaMapPopupMaxWidthPx() })
        window.tgaGoogleInfoWindow = infoWindow
        var bounds = new google.maps.LatLngBounds()

        tgaMapaData.atracciones.forEach(function (atraccion) {
          if (!atraccion.lat || !atraccion.lng) return
          var pos = { lat: atraccion.lat, lng: atraccion.lng }
          var markerOpt = { position: pos, map: map }
          if (logoUrl) {
            markerOpt.icon = {
              url: logoUrl,
              scaledSize: new google.maps.Size(40, 42),
              anchor: new google.maps.Point(20, 42)
            }
          }
          var marker = new google.maps.Marker(markerOpt)
          bounds.extend(pos)
          marker.addListener('click', function () {
            infoWindow.setContent(buildPopupContent(atraccion, root))
            infoWindow.open(map, marker)
            scrollToCard(root, atraccion.id)
          })
          window.tgaMarcadores.push({ marker: marker, atraccion: atraccion })
        })
        window.tgaOpenMarkerPopup = function (item) {
          infoWindow.setContent(buildPopupContent(item.atraccion, root))
          infoWindow.open(map, item.marker)
        }

        if (window.tgaMarcadores.length > 0) {
          map.fitBounds(bounds)
        }
        window.tgaMapa = map
        window.tgaMapType = 'google'
        tgaNotifyMapReady('google', window.tgaMarcadores.length)
        window.tgaSetMarkerVisible = function (item, visible) {
          item.marker.setMap(visible ? map : null)
        }
        window.tgaFitBounds = function (items) {
          if (!items || items.length === 0) return
          var b = new google.maps.LatLngBounds()
          items.forEach(function (item) {
            if (item.marker && item.marker.getPosition) b.extend(item.marker.getPosition())
          })
          if (!b.isEmpty()) map.fitBounds(b)
        }
        window.tgaInvalidateMapSize = function () {
          if (typeof google === 'undefined' || !google.maps || !map) return
          google.maps.event.trigger(map, 'resize')
        }
        window.tgaCentrarMapaDefecto = function () {
          if (!map || typeof tgaMapaData === 'undefined' || !tgaMapaData.valencia_center) return
          var c = tgaMapaData.valencia_center
          map.setCenter({ lat: c[0], lng: c[1] })
          map.setZoom(tgaMapaData.zoom != null ? tgaMapaData.zoom : 12)
        }
    if (typeof window.tgaMapsSingleReady === 'function') {
      window.tgaMapsSingleReady()
    }
  }

  if (typeof tgaMapaData !== 'undefined' && tgaMapaData.map_provider === 'google' && tgaMapaData.google_api_key) {
    window.tgaMapsReady = function () {
      $(document).ready(initGoogleMap)
    }
    return
  }

  $(document).ready(function () {
    var root = document.getElementById('tga-atracciones')
    if (!root) return
    if (typeof tgaMapaData === 'undefined' || !tgaMapaData.atracciones) return
    var container = root.querySelector('#mapa-atracciones')
    if (!container) return

    var center = tgaMapaData.valencia_center
    var zoom = tgaMapaData.zoom
    var logoUrl = (tgaMapaData.logo_url || '').trim()
    if (logoUrl && logoUrl.indexOf('//') === -1 && logoUrl.indexOf('/') === 0) {
      logoUrl = window.location.origin + logoUrl
    }

    // --- Leaflet (OpenStreetMap) ---
    if (typeof L === 'undefined') return
    var map = L.map('mapa-atracciones').setView(center, zoom)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map)

    function createLogoIcon() {
      var html = logoUrl
        ? '<div class="marker-logo-wrap"><img src="' + logoUrl + '" alt="" class="marker-logo-img" /></div>'
        : '<div class="marker-logo-wrap marker-logo-fallback"><i class="fas fa-map-marker-alt"></i></div>'
      return L.divIcon({
        className: 'location-marker-logo',
        html: html,
        iconSize: [40, 42],
        iconAnchor: [20, 42],
        popupAnchor: [0, -42]
      })
    }

    window.tgaMarcadores = []
    tgaMapaData.atracciones.forEach(function (atraccion) {
      if (!atraccion.lat || !atraccion.lng) return
      var marker = L.marker([atraccion.lat, atraccion.lng], { icon: createLogoIcon() })
      marker.bindPopup(function () {
        return buildPopupContent(atraccion, root)
      }, { maxWidth: tgaMapPopupMaxWidthPx(), className: 'mapa-popup-container' })
      marker.atraccionData = atraccion
      marker.on('click', function () { scrollToCard(root, atraccion.id) })
      marker.addTo(map)
      window.tgaMarcadores.push({ marker: marker, atraccion: atraccion })
    })

    if (window.tgaMarcadores.length > 0) {
      var group = new L.featureGroup(window.tgaMarcadores.map(function (m) { return m.marker }))
      map.fitBounds(group.getBounds().pad(0.1))
    }
    window.tgaMapa = map
    window.tgaMapType = 'leaflet'
    window.tgaSetMarkerVisible = function (item, visible) {
      if (visible) item.marker.addTo(map)
      else map.removeLayer(item.marker)
    }
    window.tgaFitBounds = function (items) {
      if (!items || items.length === 0) return
      var g = new L.featureGroup(items.map(function (m) { return m.marker }))
      map.fitBounds(g.getBounds().pad(0.1))
    }
    window.tgaInvalidateMapSize = function () {
      if (map && map.invalidateSize) map.invalidateSize({ animate: false })
    }
    window.tgaCentrarMapaDefecto = function () {
      if (!map || typeof tgaMapaData === 'undefined' || !tgaMapaData.valencia_center) return
      var c = tgaMapaData.valencia_center
      map.setView(c, tgaMapaData.zoom != null ? tgaMapaData.zoom : 12)
    }
    window.tgaOpenMarkerPopup = function (item) {
      if (item.marker && item.marker.openPopup) item.marker.openPopup()
    }
    tgaNotifyMapReady('leaflet', window.tgaMarcadores.length)
  })
})(jQuery)
