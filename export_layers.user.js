// ==UserScript==
// @id             iitc-plugin-export-layers@Jormund
// @name           IITC plugin: export layers 
// @category       Layer
// @version        0.1.1.201701006.2124
// @namespace      https://github.com/jonatkins/ingress-intel-total-conversion
// @updateURL      https://raw.githubusercontent.com/Jormund/export_layers/master/export_layers.meta.js
// @downloadURL    https://raw.githubusercontent.com/Jormund/export_layers/master/export_layers.user.js
// @description    [2017-10-06-2124] Export layers from Layer chooser
// @include        https://ingress.com/intel*
// @include        http://ingress.com/intel*
// @include        https://*.ingress.com/intel*
// @include        http://*.ingress.com/intel*
// @match          https://*.ingress.com/intel*
// @match          http://*.ingress.com/intel*
// @grant          none 
// ==/UserScript==

function wrapper(plugin_info) {
    // ensure plugin framework is there, even if iitc is not yet loaded
    if (typeof window.plugin !== 'function') window.plugin = function () { };

    // PLUGIN START ////////////////////////////////////////////////////////

    // use own namespace for plugin
    window.plugin.exportLayers = function () { };
    window.plugin.exportLayers.debug = false; //log more messages if true

    window.plugin.exportLayers.KEY_STORAGE = 'exportLayers-storage';

    window.plugin.exportLayers.DEFAULT_LAYER_NAME = '';

    window.plugin.exportLayers.storage = {
        exportedLayerName: window.plugin.exportLayers.DEFAULT_LAYER_NAME
    }

    window.plugin.exportLayers.isSmart = undefined; //will be true on smartphones after setup

    // update the localStorage datas
    window.plugin.exportLayers.saveStorage = function () {
        localStorage[window.plugin.exportLayers.KEY_STORAGE] = JSON.stringify(window.plugin.exportLayers.storage);
    };

    // load the localStorage datas
    window.plugin.exportLayers.loadStorage = function () {
        if (typeof localStorage[window.plugin.exportLayers.KEY_STORAGE] != "undefined") {
            window.plugin.exportLayers.storage = JSON.parse(localStorage[window.plugin.exportLayers.KEY_STORAGE]);
        }

        //ensure default values are always set
        if (typeof window.plugin.exportLayers.storage.exportedLayerName == "undefined") {
            window.plugin.exportLayers.storage.exportedLayerName = window.plugin.exportLayers.DEFAULT_LAYER_NAME;
        }
        else {

        }
    };

    /***************************************************************************************************************************************************************/
    /** get log **************************************************************************************************************************************************/
    /***************************************************************************************************************************************************************/
    window.plugin.exportLayers.extractClicked = function () {
        var options = {
            exportedLayerName: window.plugin.exportLayers.storage.exportedLayerName
        };
        window.plugin.exportLayers.extractAndDisplay(options);
    }

    window.plugin.exportLayers.extractAndDisplay = function (options) {
        if (typeof options == 'undefined') options = {};
        if (typeof options.exportedLayerName == 'undefined') options.exportedLayerName = window.plugin.exportLayers.DEFAULT_LAYER_NAME;

        try {
            window.plugin.exportLayers.log('Start of export layer:' + options.exportedLayerName);
            var result = '';

            if (!!options.exportedLayerName) {
                var foundLayer = null;
                $.each(layerChooser._layers, function (layerId, layer) {
                    if (layer.name == options.exportedLayerName) {
                        foundLayer = layer;
                        return false;
                    }
                });
                if (foundLayer == null) {
                    result = "Layer not found in layer chooser";
                }
                else {
                    try {
                        result = JSON.stringify(foundLayer.layer.toGeoJSON()); //the actual export
                    }
                    catch (err) {
                        result = err.stack;
                    }
                }
            }
            else {
                //if layer name is invalid or empty, we do nothing
                result = "Invalid or empty layer name";
            }

            $('#exportLayers-exportResult').val(result);

            window.plugin.exportLayers.log('End of export layer');
        }
        catch (err) {
            if (window.plugin.exportLayers.isSmart)
                window.plugin.exportLayers.log(err.stack, true);
            else
                throw err;
        }

    }
    /***************************************************************************************************************************************************************/
    //Options//
    /*********/
    window.plugin.exportLayers.resetOpt = function () {
        window.plugin.exportLayers.storage.exportedLayerName = window.plugin.exportLayers.DEFAULT_LAYER_NAME;

        window.plugin.exportLayers.saveStorage();
        window.plugin.exportLayers.openOptDialog();
    }
    window.plugin.exportLayers.saveOpt = function () {
        var exportedLayerName = $('#exportLayers-exportedLayerName').val();
        window.plugin.exportLayers.storage.exportedLayerName = exportedLayerName;

        window.plugin.exportLayers.saveStorage();
    }
    window.plugin.exportLayers.optClicked = function () {
        window.plugin.exportLayers.openOptDialog();
    }
    window.plugin.exportLayers.openOptDialog = function () {
        var html =
		'<div>' +
			'<table>';
        html +=
        			'<tr>' +
        				'<td>' +
        					'Layer' +
        				'</td>' +
        				'<td>' +
                            '<select id="exportLayers-exportedLayerName">';
        for (layerId in window.layerChooser._layers) {
            var layer = window.layerChooser._layers[layerId];
            html += '<option value="' + layer.name + '" ' +
                                    (window.plugin.exportLayers.storage.exportedLayerName == layer.name ? 'selected="selected" ' : '') +
                                    '>' + layer.name + '</option>';
        }
        html += '</select>' +
        				'</td>' +
        			'</tr>';
        //        html +=
        //        			'<tr>' +
        //        				'<td>' +
        //        					'Format'+
        //                        '</td>' +
        //                        '<td>' +
        //        					'GeoJSON'+
        //                        '</td>' +
        //                    '</tr>';
        html +=
        			'<tr>' +
        				'<td colspan="2">' +
        					'<textarea id="exportLayers-exportResult"></textarea>' +
        				'</td>' +
                    '</tr>';
        html +=
			'</table>' +
		'</div>'
        ;
        dialog({
            html: html,
            id: 'exportLayers_opt',
            title: 'Export layers',
            width: 'auto',
            buttons: {
                'Reset': function () {
                    window.plugin.exportLayers.resetOpt();
                },
                'Export': function () {
                    window.plugin.exportLayers.saveOpt();
                    window.plugin.exportLayers.extractClicked();
                    //$(this).dialog('close');
                }
            }
        });
    }

    /***************************************************************************************************************************************************************/

    window.plugin.exportLayers.log = function (text, isError) {
        if (window.plugin.exportLayers.debug || isError) {
            if (window.plugin.exportLayers.isSmart) {
                $('#exportLayers-log').prepend(text + '<br/>');
            }
            else {
                console.log(text);
            }
        }
    }

    /***************************************************************************************************************************************************************/

    var setup = function () {
        window.plugin.exportLayers.isSmart = window.isSmartphone();

        window.plugin.exportLayers.loadStorage();
        // window.plugin.exportLayers.setupCSS();

        // toolbox menu
        $('#toolbox').append('<a onclick="window.plugin.exportLayers.optClicked();return false;">Export layers</a>');

        //alert('end of exportLayers setup');
    }

    // PLUGIN END //////////////////////////////////////////////////////////


    setup.info = plugin_info; //add the script info data to the function as a property
    if (!window.bootPlugins) window.bootPlugins = [];
    window.bootPlugins.push(setup);
    // if IITC has already booted, immediately run the 'setup' function
    if (window.iitcLoaded && typeof setup === 'function') setup();
} // wrapper end
// inject code into site context
var script = document.createElement('script');
var info = {};
if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) info.script = { version: GM_info.script.version, name: GM_info.script.name, description: GM_info.script.description };
script.appendChild(document.createTextNode('(' + wrapper + ')(' + JSON.stringify(info) + ');'));
(document.body || document.head || document.documentElement).appendChild(script);
