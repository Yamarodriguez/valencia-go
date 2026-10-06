/**
 * Filtros por categoría: consulta en servidor (AJAX) + actualización del mapa
 * Modal de tours por categoría (listado)
 */

(function ($) {
    'use strict';

    if (typeof jQuery === 'undefined') {
        return;
    }

    $(document).ready(function () {
        var $root = $('#tga-atracciones');
        if (!$root.length) {
            return;
        }

        if (typeof tgaFiltrosAjax === 'undefined') {
            return;
        }

        var $filtros = $root.find('.filtro-icono');
        var $lista = $root.find('#atracciones-lista');
        var $contador = $root.find('#atracciones-contador-texto');
        var $loader = $root.find('#tga-atracciones-loader');
        var $wrap = $root.find('.tga-lista-atracciones-wrap');

        var $toursModal = $root.find('#tga-tours-modal');
        var $toursModalBody = $toursModal.find('.tga-tours-modal-body');
        var $toursModalTitle = $toursModal.find('#tga-tours-modal-title');
        var $toursModalLoader = $toursModal.find('.tga-tours-modal-loader');

        function tgaEscapeHtml(text) {
            var d = document.createElement('div');
            d.textContent = text;
            return d.innerHTML;
        }

        function openToursModal() {
            $toursModal.addClass('is-open').attr('aria-hidden', 'false');
            $('body').addClass('tga-tours-modal-open');
        }

        function closeToursModal() {
            $toursModal.removeClass('is-open').attr('aria-hidden', 'true');
            $('body').removeClass('tga-tours-modal-open');
        }

        function setToursModalLoading(visible) {
            if (visible) {
                $toursModalLoader.show();
                $toursModalBody.empty();
            } else {
                $toursModalLoader.hide();
            }
        }

        $root.on('click', '.atraccion-tours-info-btn', function (e) {
            e.preventDefault();
            if (!$toursModal.length) {
                return;
            }
            var aid = parseInt($(this).attr('data-atraccion-id'), 10) || 0;
            if (!aid) {
                return;
            }
            openToursModal();
            setToursModalLoading(true);
            $.ajax({
                url: tgaFiltrosAjax.ajaxUrl,
                type: 'POST',
                dataType: 'json',
                data: {
                    action: tgaFiltrosAjax.toursModalAction,
                    nonce: tgaFiltrosAjax.toursModalNonce,
                    atraccion_id: aid
                }
            })
                .done(function (res) {
                    if (!res || !res.success || !res.data) {
                        $toursModalBody.html('<p class="tga-tours-modal-empty">' + tgaEscapeHtml('Error al cargar.') + '</p>');
                        return;
                    }
                    var d = res.data;
                    if (d.title) {
                        $toursModalTitle.text(d.title);
                    }
                    if (d.html) {
                        $toursModalBody.html(d.html);
                    }
                })
                .fail(function () {
                    $toursModalBody.html('<p class="tga-tours-modal-empty">' + tgaEscapeHtml('No se pudieron cargar los tours.') + '</p>');
                })
                .always(function () {
                    setToursModalLoading(false);
                });
        });

        if ($toursModal.length) {
            $toursModal.on('click', '.tga-tours-modal-close, .tga-tours-modal-backdrop', function (e) {
                e.preventDefault();
                closeToursModal();
            });

            $(document).on('keydown.tgaToursModal', function (e) {
                if (e.key === 'Escape' && $toursModal.hasClass('is-open')) {
                    closeToursModal();
                }
            });
        }

        function setLoader(visible) {
            if (!$loader.length) {
                return;
            }
            if (visible) {
                $loader.css('display', 'flex').attr('aria-busy', 'true');
                if ($wrap.length) {
                    $wrap.addClass('tga-lista-cargando');
                }
            } else {
                $loader.hide().attr('aria-busy', 'false');
                if ($wrap.length) {
                    $wrap.removeClass('tga-lista-cargando');
                }
            }
        }

        function actualizarContadorDesdeTotal(n) {
            if (!$contador.length) {
                return;
            }
            var texto = parseInt(n, 10) === 1 ? 'resultado encontrado' : 'resultados encontrados';
            $contador.text(n + ' ' + texto);
        }

        function aplicarFiltro(termId) {
            setLoader(true);

            $.ajax({
                url: tgaFiltrosAjax.ajaxUrl,
                type: 'POST',
                dataType: 'json',
                data: {
                    action: tgaFiltrosAjax.action,
                    nonce: tgaFiltrosAjax.nonce,
                    term_id: termId,
                    paged: 1,
                    posts_per_page: tgaFiltrosAjax.postsPerPage
                }
            })
                .done(function (res) {
                    if (!res || !res.success || !res.data) {
                        return;
                    }
                    var d = res.data;
                    if (d.html) {
                        $lista.html(d.html);
                    }
                    actualizarContadorDesdeTotal(d.found_posts);

                    if (d.map_atracciones && typeof window.tgaRebuildMapMarkers === 'function') {
                        window.tgaRebuildMapMarkers(d.map_atracciones);
                    }

                    if (window.history && window.history.replaceState) {
                        try {
                            var url = new URL(window.location.href);
                            if (termId > 0) {
                                url.searchParams.set('tga_cat', String(termId));
                            } else {
                                url.searchParams.delete('tga_cat');
                            }
                            url.searchParams.delete('paged');
                            window.history.replaceState({}, '', url.toString());
                        } catch (e) {}
                    }
                })
                .fail(function () {
                    if (window.console && console.warn) {
                        console.warn('[TheGem Atracciones] Error al filtrar la lista.');
                    }
                })
                .always(function () {
                    setLoader(false);
                });
        }

        if ($filtros.length) {
            $filtros.on('click', function (e) {
                e.preventDefault();
                var $filtro = $(this);
                var categoriaId = $filtro.attr('data-categoria-id');
                if (!categoriaId || categoriaId === '') {
                    categoriaId = '0';
                }
                if (categoriaId === 'todos') {
                    categoriaId = '0';
                }
                var termId = parseInt(categoriaId, 10) || 0;

                $filtros.removeClass('active');
                $filtro.addClass('active');

                aplicarFiltro(termId);
            });
        }

        $root.on('mouseenter', '.atraccion-card', function () {
            var atraccionId = $(this).data('atraccion-id');
            if (window.tgaMarcadores && window.tgaMarcadores.length > 0) {
                window.tgaMarcadores.forEach(function (item) {
                    if (item.atraccion.id == atraccionId) {
                        if (window.tgaOpenMarkerPopup) {
                            window.tgaOpenMarkerPopup(item);
                        } else if (item.marker && item.marker.openPopup) {
                            item.marker.openPopup();
                        }
                        var iconEl = item.marker._icon;
                        if (iconEl) {
                            $(iconEl).addClass('marker-highlighted');
                        }
                    }
                });
            }
        }).on('mouseleave', '.atraccion-card', function () {
            if (window.tgaMarcadores && window.tgaMarcadores.length > 0) {
                window.tgaMarcadores.forEach(function (item) {
                    var iconEl = item.marker._icon;
                    if (iconEl) {
                        $(iconEl).removeClass('marker-highlighted');
                    }
                });
            }
        });

        $(document).on('tga:mapa-listo', function () {
            if (typeof window.tgaInvalidateMapSize === 'function') {
                window.tgaInvalidateMapSize();
            }
            if (window.tgaMarcadores && window.tgaMarcadores.length && window.tgaFitBounds) {
                window.setTimeout(function () {
                    window.tgaFitBounds(window.tgaMarcadores);
                }, 100);
            }
        });
    });
})(jQuery);
