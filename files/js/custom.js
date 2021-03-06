$(function() {
    var mobile   = ($('#sidebar').width() < 300);
    var wayPoint = false;

    if (localStorage['sfw']) {
        $('span#brothel-text').text('Love Interest');
        $('div#sfw').find('a').hide();
        $('div#sfw').find('a.original').show();
    }

    if (localStorage['hideWarn']) {
        $('#warn').remove();
    }

    var hackySticky = function () {
        if ($(window).height() > $('#sidebar-wrap').outerHeight() + $('div#copyright').outerHeight() + 45) {
            $('div#copyright').addClass('absolute');
        } else {
            $('div#copyright').removeClass('absolute');
        }
    };
    hackySticky();
    $(window).on('resize', function(){ hackySticky() });

    $('div#sidebar').niceScroll({
        cursorcolor  : '#5E4F32',
        cursorborder : 'none',
    });

    $('div#info').niceScroll({
        cursorcolor  : '#5E4F32',
        cursorborder : 'none',
    });

    var map = L.map('map', {
        minZoom: 2,
        maxZoom: window.map_mZoom,
        center: window.map_center,
        zoom: 3,
        attributionControl: false,
        zoomControl: false,
        layers: allLayers
    });

    var go = function (cords) {
        map.panTo(cords);
        map.setZoom(window.map_mZoom);
        new L.marker(cords, {
            icon : L.icon({
                iconUrl  : '/files/img/searchhover.png',
                iconSize : [22, 22]
            })
        }).addTo(map);
    };

    new L.Control.Zoom({ position: 'topright' }).addTo(map);
    new L.Control.Fullscreen({ position: 'topright' }).addTo(map);
    var hash = new L.Hash(map);
    var bounds = new L.LatLngBounds(window.map_sWest, window.map_nEast);
    map.setMaxBounds(bounds);

    if (!mobile) {
        var searchData = [];
        $.each(allLayers, function(key, layer) {
            $.each(layer._layers, function(key, marker) {
                searchData.push({ loc : [marker._latlng.lat,marker._latlng.lng] , title : marker._popup._content.replace(/<h1>/, '').replace(/<\/h1>/, ' - ').replace(/\\'/g, '') });
            });
        });

        searchData.sort(function(a,b) {
            if (a.title < b.title) {
                return -1;
            }
            if (a.title > b.title) {
                return 1;
            }
            return 0;
        });

        map.addControl(new L.Control.Search({
            autoResize   : false,
            autoType     : false,
            minLength    : 2,
            position     : 'topright',
            autoCollapse : false,
            zoom         : 5,
            filterJSON   : function(json){ return json; },
            callData     : function(text, callResponse) {
                callResponse($.grep(searchData, function(data) {
                    return data.title.match(new RegExp(text, 'i'));
                }));
                setTimeout(function() {
                    $('.search-tooltip').getNiceScroll().resize();
                },200);
                return { abort: function(){ console.log('aborted request: ' + text); } };
            }
        }));

        $('.search-tooltip').niceScroll({
            cursorcolor      : '#5E4F32',
            cursorborder     : 'none',
            horizrailenabled : false
        });
    }

    L.tileLayer('../files/maps/' + window.map_path + '/{z}/{x}/{y}.png', {
        tms: true,
        bounds: bounds,
        noWrap: true
    }).addTo(map);

    map.dragging._draggable.on('predrag', function() {
        var pos = map._initialTopLeftPoint.subtract(this._newPos);
        this._newPos = this._newPos.subtract(map._getBoundsOffset(new L.Bounds(pos, pos.add(map.getSize())), map.options.maxBounds));
    });

    map.on('contextmenu', function(e) {
        if (!bounds.contains(e.latlng)) {
            return false;
        }
        if (wayPoint) {
            map.removeLayer(wayPoint);
        }
        wayPoint = new L.marker(e.latlng, {
            icon : L.icon({
                iconUrl  : '/files/img/icons/waypoint.png',
                iconSize : [26, 32]
            })
        }).on('click', function() {
            map.removeLayer(wayPoint);
        }).on('contextmenu', function() {
            map.removeLayer(wayPoint);
        }).addTo(map);
    });

    $('.leaflet-marker-icon').on('contextmenu',function(e){ return false; });

    map.on('click', function(e) {
// for dev
//      prompt('', '[' + e.latlng.lat.toFixed(3) + ', ' + e.latlng.lng.toFixed(3) + ']');
        console.log('Clicked at:');
        console.log('[' + e.latlng.lat.toFixed(3) + ', ' + e.latlng.lng.toFixed(3) + ']');
    });

    map.on('popupopen', function(e) {
        $('#info-wrap').stop();
        if (localStorage['sfw'] && e.popup._source._popup._content.match(/prostitute/i)) {
            $('#info').html('<h1>Love Interest</h1>Meet your love interest here');
        } else {
            $('#info').html(e.popup._source._popup._content);
        }
        $('#info').getNiceScroll(0).doScrollTop(0,0);
        $('#info-wrap').fadeIn('fast');
        console.log('Popup at:');
        console.log('[' + e.popup._latlng.lat.toFixed(3) + ', ' + e.popup._latlng.lng.toFixed(3) + ']');
    });

    map.on('popupclose', function(e) {
        $('#info-wrap').fadeOut('fast', function() {
            $('#info').html('');
        });
    });

    $(document).on('click', '*', function() {
        map.closePopup();
    });

    $('div#sidebar').on('mouseover', function() {
        map.closePopup();
    });

    if (localStorage['markers-' + window.map_path]) {
        $.each($.parseJSON(localStorage['markers-' + window.map_path]), function(key, val) {
            if (val === false) {
                $('i.' + key).parent().addClass('layer-disabled');
                map.removeLayer(window.markers[key]);
            }
        });
    }

    $('ul.key').on('click', 'li:not(.none)', function(e) {
        var marker   = $(this).find('i').attr('class');
        var remember = (!localStorage['markers-' + window.map_path]) ? {} : $.parseJSON(localStorage['markers-' + window.map_path]);
        if (marker == 'hide') {
            $.each(allLayers, function(key, val) {
                map.removeLayer(val);
            });
            $.each($('ul.key:not(.controls) li:not(.none) i'), function(key, val) {
                remember[$(this).attr('class')] = false;
            });
            $('ul.key:first li').each(function(id, li) {
                $(li).addClass('layer-disabled');
            });
        } else if (marker == 'show') {
            $.each(allLayers, function(key, val) {
                map.addLayer(val);
            });
            $.each($('ul.key:not(.controls) li:not(.none) i'), function(key, val) {
                remember[$(this).attr('class')] = true;
            });
            $('ul.key:first li').each(function(id, li) {
                $(li).removeClass('layer-disabled');
            });
        } else {
            if ($(this).hasClass('layer-disabled')) {
                map.addLayer(window.markers[marker]);
                $(this).removeClass('layer-disabled');
                remember[marker] = true;
            } else {
                map.removeLayer(window.markers[marker]);
                $(this).addClass('layer-disabled');
                remember[marker] = false;
            }
        }
        localStorage['markers-' + window.map_path] = JSON.stringify(remember);
    });

    var origSidebar;
    var origBorder;
    var origHide;
    var origMap;

    $(document).on('click', 'div#hide-sidebar:not(.show-sidebar)', function(e) {
        origSidebar = $('#sidebar').css('left');
        origBorder = $('#sidebar-border').css('left');
        origHide = $('#hide-sidebar').css('left');
        origMap = $('#map').css('left');

        $('#info-wrap').css({'left' : '0px' , 'width' : '100%' });
        $('#map').css('left', '0px');
        map.invalidateSize();

        var base = $('#sidebar').outerWidth();
        $('#sidebar').animate({left : '-' + base + 'px'}, 200);
        $('#sidebar-border').animate({left : '-' + (base + 15) + 'px'}, 200);
        $('#hide-sidebar').animate({left : '0px'}, 200, function() {
            $('#hide-sidebar').addClass('show-sidebar');
        });
    });

    $(document).on('click', 'div#hide-sidebar.show-sidebar', function(e) {
        $('#sidebar').animate({left : origSidebar}, 200);
        $(this).animate({left : origHide}, 200);
        $('#sidebar-border').animate({left : origBorder}, 200, function() {
            $('#map').css('left', origMap);
            map.invalidateSize();
            $('.show-sidebar').removeClass('show-sidebar');
            $('#sidebar').attr('style', '');
            $('#sidebar-border').attr('style', '');
            $('#info-wrap').attr('style', '');
            $('#map').attr('style', '');
        });
    });

    $(window).on('resize', function() {
        if ($('.show-sidebar').length && $(this).width() > 768) {
            $('#map').css('left', origMap);
            map.invalidateSize();
            $('.show-sidebar').removeClass('show-sidebar');
            $('#hide-sidebar').attr('style', '');
            $('#sidebar').attr('style', '');
            $('#sidebar-border').attr('style', '');
            $('#info-wrap').attr('style', '');
            $('#map').attr('style', '');
        }
    });

    $(document).on('click', 'div#warn', function(e) {
        localStorage['hideWarn'] = true;
        $(this).remove();
    });

    $('div#sfw').on('click', 'a.gotosfw', function(e) {
        e.preventDefault();
        if (confirm('This will change \'Brothel\' to \'Love Interest\', are you sure?')) {
            localStorage['sfw'] = true;
            $('span#brothel-text').text('Love Interest');
            $('div#sfw > a.gotosfw').hide();
            $('div#sfw > a.original').show();
        }
    });

    $('div#sfw').on('click', 'a.original', function(e) {
        e.preventDefault();
        if (confirm('Are you sure you want to go back?')) {
            localStorage.removeItem('sfw');
            $('span#brothel-text').text('Brothel');
            $('div#sfw > a.original').hide();
            $('div#sfw > a.gotosfw').show();
        }
    });

    $('div#copyright').on('click', 'a.js-credits', function(e) {
        e.preventDefault();
        alert([
            'This page makes use of the following Javascript libraries:',
            '',
            'jQuery (MIT) - http://jquery.com',
            'jQuery.NiceScroll (MIT) - http://git.io/vkLly',
            'Leaflet (BSD2) - http://leafletjs.com',
            'Leaflet.label (MIT) - http://git.io/vkfA2',
            'Leaflet-hash (MIT) - http://git.io/mwK1oA',
            'Leaflet.fullscreen (BSD2) - http://git.io/vJw5v',
            'Leaflet Control Search (MIT) - http://git.io/vkCPC',
            '',
            'Many thanks to the developers for their hard work.'
        ].join('\n'));
    });

jQuery(document).ready(function() {
    if (mobile) {
    setTimeout(function() { 
        origSidebar = $('#sidebar').css('left');
        origBorder = $('#sidebar-border').css('left');
        origHide = $('#hide-sidebar').css('left');
        origMap = $('#map').css('left');

        $('#info-wrap').css({'left' : '0px' , 'width' : '100%' });
        $('#map').css('left', '0px');
        map.invalidateSize();

        var base = $('#sidebar').outerWidth();
        $('#sidebar').animate({left : '-' + base + 'px'}, 200);
        $('#sidebar-border').animate({left : '-' + (base + 15) + 'px'}, 200);
        $('#hide-sidebar').animate({left : '0px'}, 200, function() {
            $('#hide-sidebar').addClass('show-sidebar');
        });
    }, 200); }
});
 
});