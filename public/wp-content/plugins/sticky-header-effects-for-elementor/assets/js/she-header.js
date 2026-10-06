var $j = jQuery.noConflict();

$j(document).ready(function () {
    "use strict";
    // She header
    sheHeader();

    // Anchor scroll offset — keep in-page links clear of the sticky header.
    sheAnchorOffset();

    // Back to Top button — inject + wire its own scroll/click handlers.
    sheBackToTop();

    // Debounce resize: sheHeader() re-runs the full per-header setup and
    // rebinds every scroll listener, so firing it on every resize pixel is
    // wasteful (and janky on devices that stream resize events). Run it once
    // the resize settles instead.
    var sheResizeTimer;
    $j(window).on('resize', function (e) {
        clearTimeout(sheResizeTimer);
        sheResizeTimer = setTimeout(function () {
            sheHeader(e);
            sheAnchorOffset();
        }, 150);
    });

    // The header height changes as it shrinks / becomes sticky, so keep the
    // anchor offset in sync on scroll. rAF-throttled and cheap: it reads one
    // height and sets one CSS property.
    var sheAnchorTicking = false;
    $j(window).on('scroll', function () {
        if (!sheAnchorTicking) {
            sheAnchorTicking = true;
            window.requestAnimationFrame(function () {
                sheAnchorOffset();
                sheAnchorTicking = false;
            });
        }
    });
});


/* ==============================================
HEADER EFFECTS
============================================== */


function sheHeader(e) {

    // Iterate each sticky header independently so that multiple sticky headers
    // each use their OWN settings/scroll-distance instead of all sharing the
    // first matched header's settings (the "sticks too early" group bug).
    $j('.elementor-element.she-header-yes').each(function (sheIndex) {

    var header = $j(this),
        container = header.find('.elementor-container').add(header.filter('.e-con')),
        header_elementor = header.closest('.elementor-edit-mode').length ? header : $j(),
        header_logo = header.find('.elementor-widget-theme-site-logo img:not(.elementor-widget-n-menu img), .elementor-widget-image img:not(.elementor-widget-n-menu img)'),
        header_logo_div = header.find('.elementor-widget-theme-site-logo a, .elementor-widget-image a'),
        data_settings = header.data('settings');

    if (typeof data_settings != 'undefined') {
        var responsive_settings = data_settings["transparent_on"];
        var width = $j(window).width(),
            header_height = header.height(),
            logo_width = header_logo.width(),
            logo_height = header_logo.height();
    }

    // Check responsive is enabled
    if (typeof width != 'undefined' && width) {
        if (width >= 1025) {
            var enabled = "desktop";
        } else if (width > 767 && width < 1025) {
            var enabled = "tablet";
        } else if (width <= 767) {
            var enabled = "mobile";
        }
    }

    if ($j.inArray(enabled, responsive_settings) !== -1) {

        var scroll_distance = data_settings["scroll_distance"];
        var she_offset = data_settings["she_offset_top"];
        var she_padding = data_settings["she_padding"];
        var she_width = data_settings["she_width"];
        var transparent_header = data_settings["transparent_header_show"];
        var background = data_settings["background"];
        var bottom_border_color = data_settings["custom_bottom_border_color"],
            bottom_border_view = data_settings["bottom_border"],
            bottom_border_width = data_settings["custom_bottom_border_width"];

        var shrink_header = data_settings["shrink_header"],
            data_height = data_settings["custom_height_header"],
            data_height_tablet = data_settings["custom_height_header_tablet"],
            data_height_mobile = data_settings["custom_height_header_mobile"];

        var shrink_logo = data_settings["shrink_header_logo"],
            data_logo_height = data_settings["custom_height_header_logo"],
            data_logo_height_tablet = data_settings["custom_height_header_logo_tablet"],
            data_logo_height_mobile = data_settings["custom_height_header_logo_mobile"];

        var change_logo_color = data_settings["change_logo_color"];

        var blur_bg = data_settings["blur_bg"];

        var scroll_distance_hide_header = data_settings["scroll_distance_hide_header"];

        // offset
        if (width >= 1025) {
            she_offset = data_settings["she_offset_top"];
            she_padding = data_settings["she_padding"];
            she_width = data_settings["she_width"];
        } else if (width > 767 && width < 1025) {
            she_offset = data_settings["she_offset_top_tablet"];
            she_padding = data_settings["she_padding_tablet"];
            she_width = data_settings["she_width_tablet"];
        } else if (width <= 767) {
            she_offset = data_settings["she_offset_top_mobile"];
            she_padding = data_settings["she_padding_mobile"];
            she_width = data_settings["she_width_mobile"];
        }

        if (header.hasClass("she-header")) {
            if( e?.type === 'resize' ){
                header.css("width", she_width.size + she_width.unit);
                header.css("padding-top", she_padding.top + she_padding.unit);
                header.css("padding-bottom", she_padding.bottom + she_padding.unit);
                header.css("padding-left", she_padding.left + she_padding.unit);
                header.css("padding-right", she_padding.right + she_padding.unit);
            }
        }

        // add transparent class
        if (transparent_header == "yes") {
            header.addClass('she-header-transparent-yes');
        }

        // header height shrink
        if (typeof data_height != "undefined" && data_height) {
            if (width >= 1025) {
                var shrink_height = data_height["size"];
            } else if (width > 767 && width < 1025) {
                var shrink_height = data_height_tablet["size"];
                if (shrink_height == "") {
                    shrink_height = data_height["size"];
                }
            } else if (width <= 767) {
                var shrink_height = data_height_mobile["size"];
                if (shrink_height == "") {
                    shrink_height = data_height["size"];
                }
            }
        }

        // Logo height shrink
        if (
            typeof data_logo_height != "undefined" &&
            data_logo_height
        ) {
            if (width >= 1025) {
                var shrink_logo_height = data_logo_height["size"];
            } else if (width > 767 && width < 1025) {
                var shrink_logo_height =
                    data_logo_height_tablet["size"];
            } else if (width <= 767) {
                var shrink_logo_height =
                    data_logo_height_mobile["size"];
            }

            //Calc New width and height
            if (shrink_logo_height == "") {
                //Get logo shrink settings from desktop
                shrink_logo_height = data_logo_height["size"];

                if (shrink_logo_height == "") {
                    // Shrink same settings from height shrink option
                    shrink_logo_height = shrink_height;

                    var percent =
                        parseInt(shrink_logo_height) /
                        parseInt(header_height),
                        width_l = logo_width * percent,
                        height_l = logo_height * percent;
                } else {
                    var width_l =
                        (logo_width * shrink_logo_height) / 100,
                        height_l =
                            (logo_height * shrink_logo_height) / 100;
                }
            } else {
                //Get logo shrink settings from the responsive option
                var width_l = (logo_width * shrink_logo_height) / 100,
                    height_l = (logo_height * shrink_logo_height) / 100;
            }
        }

        // border bottom
        if (typeof bottom_border_width != 'undefined' && bottom_border_width) {
            var bottom_border = bottom_border_width["size"] + "px solid " + bottom_border_color;
        }

        // hide header on scroll
        if (
            typeof scroll_distance_hide_header != "undefined" &&
            scroll_distance_hide_header
        ) {
            var mywindow = $j(window),
                mypos = mywindow.scrollTop();

            mywindow.off('scroll.sheHide' + sheIndex).on('scroll.sheHide' + sheIndex, function () {
                var sd_hh_s = scroll_distance_hide_header["size"],
                    sd_hh_u = scroll_distance_hide_header["unit"],
                    sd_hh_tablet =
                        data_settings[
                        "scroll_distance_hide_header_tablet"
                        ],
                    sd_hh_tablet_s = sd_hh_tablet["size"],
                    sd_hh_tablet_u = sd_hh_tablet["unit"],
                    sd_hh_mobile =
                        data_settings[
                        "scroll_distance_hide_header_mobile"
                        ],
                    sd_hh_mobile_s = sd_hh_mobile["size"],
                    sd_hh_mobile_u = sd_hh_mobile["unit"];

                // get responsive view
                if (
                    typeof scroll_distance_hide_header != "undefined" &&
                    scroll_distance_hide_header
                ) {
                    if (width >= 1025) {
                        var sd_hh = sd_hh_s,
                            sd_hh_u = sd_hh_u;
                        // calc sise for vh unit
                        if (sd_hh_u == "vh") {
                            sd_hh = window.innerHeight * (sd_hh / 100);
                        }
                    } else if (width > 767 && width < 1025) {
                        var sd_hh = sd_hh_tablet_s,
                            sd_hh_u = sd_hh_tablet_u;

                        if (sd_hh == "") {
                            sd_hh = sd_hh_s;
                        }
                        // calc sise for vh unit
                        if (sd_hh_u == "vh") {
                            sd_hh = window.innerHeight * (sd_hh / 100);
                        }
                    } else if (width <= 767) {
                        var sd_hh = sd_hh_mobile_s,
                            sd_hh_u = sd_hh_mobile_u;

                        if (sd_hh == "") {
                            sd_hh = sd_hh_s;
                        }
                        // calc sise for vh unit
                        if (sd_hh_u == "vh") {
                            sd_hh = window.innerHeight * (sd_hh / 100);
                        }
                    }
                }

                if (mypos > sd_hh) {
                    if (mywindow.scrollTop() > mypos) {
                        header.addClass("headerup");
                    } else {
                        header.removeClass("headerup");
                    }
                }
                mypos = mywindow.scrollTop();
            });
        }

        // scroll function — throttled with requestAnimationFrame so the
        // heavy per-property style writes below run at most once per frame.
        var she_scroll_ticking = false;
        $j(window).off("load.sheScroll" + sheIndex + " scroll.sheScroll" + sheIndex).on("load.sheScroll" + sheIndex + " scroll.sheScroll" + sheIndex, function (e) {
            if (she_scroll_ticking) {
                return;
            }
            she_scroll_ticking = true;
            requestAnimationFrame(function () {
                she_scroll_ticking = false;
            var scroll = $j(window).scrollTop();

            if (header_elementor.length) {
                header_elementor.css("position", "relative");
            }

            var sd_s = scroll_distance["size"],
                sd_u = scroll_distance["unit"],
                sd_tablet = data_settings["scroll_distance_tablet"],
                sd_tablet_s = sd_tablet["size"],
                sd_tablet_u = sd_tablet["unit"],
                sd_mobile = data_settings["scroll_distance_mobile"],
                sd_mobile_s = sd_mobile["size"],
                sd_mobile_u = sd_mobile["unit"];

            // get responsive view
            if (
                typeof scroll_distance != "undefined" &&
                scroll_distance
            ) {
                if (width >= 1025) {
                    var sd = sd_s,
                        sd_u = sd_u;
                    // calc sise for vh unit
                    if (sd_u == "vh") {
                        sd = window.innerHeight * (sd / 100);
                    }
                } else if (width > 767 && width < 1025) {
                    var sd = sd_tablet_s,
                        sd_u = sd_tablet_u;

                    if (sd == "") {
                        sd = sd_s;
                    }
                    // calc sise for vh unit
                    if (sd_u == "vh") {
                        sd = window.innerHeight * (sd / 100);
                    }
                } else if (width <= 767) {
                    var sd = sd_mobile_s,
                        sd_u = sd_mobile_u;

                    if (sd == "") {
                        sd = sd_s;
                    }
                    // calc sise for vh unit
                    if (sd_u == "vh") {
                        sd = window.innerHeight * (sd / 100);
                    }
                }
            }

            if (scroll >= sd) {
                header.removeClass('header').addClass("she-header");
                header.css("background-color", background);
                header.css("border-bottom", bottom_border);

                // Multi-Sticky (Pro) manages its own top / width / padding via a
                // placeholder spacer. Skip Free's geometry writes for those
                // containers so the two don't fight (cosmetic background/border
                // above still apply). Pure-Free headers have no
                // data-she-multi-mode attribute and get the full treatment.
                if (!header.attr("data-she-multi-mode")) {
                    header.css("top", she_offset.size + she_offset.unit);

                    if (width >= 783 && document.body.classList.contains('admin-bar')) {
                        if (she_offset.unit === 'px') {
                            header.css("top", (32 + she_offset.size) + "px");
                        } else {
                            header.css("top", "calc(32px + " + she_offset.size + she_offset.unit + ")");
                        }
                    }

                    header.css("padding-top", she_padding.top + she_padding.unit);
                    header.css("padding-bottom", she_padding.bottom + she_padding.unit);
                    header.css("padding-left", she_padding.left + she_padding.unit);
                    header.css("padding-right", she_padding.right + she_padding.unit);
                    header.css("width", she_width.size + she_width.unit);
                }

                header.removeClass('she-header-transparent-yes');

                if (shrink_header == "yes") {
                    header.css({ "padding-top": "0", "padding-bottom": "0", "margin-top": "0", "margin-bottom": "0" });
                    container.css({ "min-height": shrink_height, "transition": "all 0.4s ease-in-out", "-webkit-transition": "all 0.4s ease-in-out", "-moz-transition": "all 0.4s ease-in-out" });
                }

                if (change_logo_color == "yes") {
                    header_logo.addClass("change-logo-color");
                }

                // ---------------------------------- SHRINK LOGO
                if (shrink_logo == "yes") {
                    header_logo.css({
                        width: width_l,
                        transition: "all 0.4s ease-in-out",
                        "-webkit-transition": "all 0.4s ease-in-out",
                        "-moz-transition": "all 0.4s ease-in-out",
                    });
                }

            } else {
                header.removeClass("she-header").addClass('header');
                header.css("background-color", "");
                header.css("border-bottom", "");
                if (!header.attr("data-she-multi-mode")) {
                    header.css("top", "");
                    header.css("padding-top", "");
                    header.css("padding-bottom", "");
                    header.css("padding-left", "");
                    header.css("padding-right", "");
                    header.css("width", "");
                }

                if (transparent_header == "yes") {
                    header.addClass('she-header-transparent-yes');
                }
                if (shrink_header == "yes") {
                    header.css({ "padding-top": "", "padding-bottom": "", "margin-top": "", "margin-bottom": "" });
                    container.css("min-height", "");
                }

                // ---------------------------------- SHRINK LOGO
                if (shrink_logo == "yes") {
                    header_logo.css({ height: "", width: "" });
                }

                if (change_logo_color == "yes") {
                    header_logo.removeClass("change-logo-color");

                }

            }


            }); // end requestAnimationFrame
        });
    }

    }); // end .each — per sticky-header iteration

};


/* ==============================================
ANCHOR SCROLL OFFSET
Keeps in-page anchor links (and keyboard focus) clear of the sticky header by
setting scroll-padding-top on <html> to the live header height. Using the CSS
scroll-padding mechanism means native #anchor jumps, scrollIntoView() and
focus scrolling all respect the offset — no click interception needed.
============================================== */
function sheAnchorOffset() {
    var html = document.documentElement;

    // First sticky header that has the anchor-offset option enabled.
    var $header = $j('.elementor-element.she-header-yes').filter(function () {
        var s = $j(this).data('settings') || {};
        return s.she_anchor_offset === 'yes';
    }).first();

    if (!$header.length) {
        // Feature off (or no such header) — clear anything we may have set.
        html.style.scrollPaddingTop = '';
        html.style.scrollBehavior = '';
        return;
    }

    var s = $header.data('settings') || {};

    // Extra offset (SLIDER → { size, unit }).
    var extra = 0;
    if (s.she_anchor_offset_extra && s.she_anchor_offset_extra.size !== '' && typeof s.she_anchor_offset_extra.size !== 'undefined') {
        extra = parseFloat(s.she_anchor_offset_extra.size) || 0;
    }

    var headerHeight = $header.outerHeight() || 0;
    html.style.scrollPaddingTop = (headerHeight + extra) + 'px';

    // Smooth scroll — honour the visitor's reduced-motion preference.
    var prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (s.she_anchor_smooth === 'yes' && !prefersReduced) {
        html.style.scrollBehavior = 'smooth';
    } else {
        html.style.scrollBehavior = '';
    }
}


/* ==============================================
BACK TO TOP BUTTON
Injects a floating button into <body> (NOT the header) that appears after a
configurable scroll distance and scrolls back to the top on click. It must live
in <body>, not inside the header: a position:fixed element is positioned
relative to any ancestor that has a transform, and the header frequently gets
one (e.g. .headerup's translateY when Hide-on-scroll-down is active), which
would drag the button off-screen. Styling is read from the element settings and
applied inline, since the button is outside the Elementor wrapper.
============================================== */
function sheBackToTop() {
    if (document.querySelector('.she-totop-btn')) {
        return; // already injected.
    }

    // First sticky header that has the Back to Top option enabled.
    var $header = $j('.elementor-element.she-header-yes').filter(function () {
        var s = $j(this).data('settings') || {};
        return s.she_totop_enable === 'yes';
    }).first();

    if (!$header.length) {
        return;
    }

    var s = $header.data('settings') || {};

    // Scroll distance before the button appears (SLIDER → { size, unit }).
    var threshold = sheSliderNum(s.she_totop_display_after, 300);

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'she-totop-btn';
    btn.setAttribute('aria-label', 'Back to top');
    btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 8.29l-6.29 6.3 1.41 1.41L12 11.12l4.88 4.88 1.41-1.41z"></path></svg>';

    // Inline styling (button lives in <body>, so Elementor selectors can't
    // reach it — mirror the announcement bar's approach).
    var offset = sheSliderNum(s.she_totop_offset, 24);
    btn.style.bottom = offset + 'px';
    if (s.she_totop_position === 'left') {
        btn.style.left = offset + 'px';
        btn.style.right = 'auto';
    } else {
        btn.style.right = offset + 'px';
        btn.style.left = 'auto';
    }

    var size = sheSliderNum(s.she_totop_size, 44);
    btn.style.width = size + 'px';
    btn.style.height = size + 'px';

    if (s.she_totop_radius && s.she_totop_radius.size !== '' && typeof s.she_totop_radius.size !== 'undefined') {
        btn.style.borderRadius = s.she_totop_radius.size + ( s.she_totop_radius.unit || 'px' );
    }
    if (s.she_totop_bg) {
        btn.style.backgroundColor = s.she_totop_bg;
    }
    if (s.she_totop_icon_color) {
        btn.style.color = s.she_totop_icon_color;
    }
    if (s.she_totop_bg_hover) {
        btn.style.setProperty('--she-totop-hover', s.she_totop_bg_hover);
    }

    document.body.appendChild(btn);

    btn.addEventListener('click', function () {
        var prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' });
    });

    var ticking = false;
    function toggle() {
        var y = window.pageYOffset || document.documentElement.scrollTop;
        if (y > threshold) {
            btn.classList.add('she-totop-visible');
        } else {
            btn.classList.remove('she-totop-visible');
        }
        ticking = false;
    }

    $j(window).on('scroll', function () {
        if (!ticking) {
            ticking = true;
            window.requestAnimationFrame(toggle);
        }
    });

    toggle(); // set initial state (e.g. page loaded already scrolled down).
}

// Read an Elementor SLIDER value ({ size, unit }) as a number, with a fallback.
function sheSliderNum(ctrl, fallback) {
    if (ctrl && ctrl.size !== '' && typeof ctrl.size !== 'undefined') {
        var n = parseFloat(ctrl.size);
        if (!isNaN(n)) {
            return n;
        }
    }
    return fallback;
}