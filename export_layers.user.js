// ==UserScript==
// @id             iitc-plugin-export-layers@Jormund
// @name           IITC plugin: export layers 
// @category       Layer
// @version        0.1.2.20171010.2202
// @namespace      https://github.com/jonatkins/ingress-intel-total-conversion
// @updateURL      https://raw.githubusercontent.com/Jormund/export_layers/master/export_layers.meta.js
// @downloadURL    https://raw.githubusercontent.com/Jormund/export_layers/master/export_layers.user.js
// @description    [2017-10-10-2202] Export layers from Layer chooser
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
    window.plugin.exportLayers.debug = true; //log more messages if true

    window.plugin.exportLayers.KEY_STORAGE = 'exportLayers-storage';

	window.plugin.exportLayers.EXPORT_TYPE = { GEOGSON: {code:'GEOGSON',name:'GeoJSON'},
                                            DRAWTOOLS: {code:'DRAWTOOLS',name:'Draw tools'}/*,
                                            BOOKMARKS: {code:'BOOKMARKS',name:'Bookmarks (not implemented)'}*/
                                            };
											
    window.plugin.exportLayers.DEFAULT_LAYER_NAME = '';
	window.plugin.exportLayers.DEFAULT_EXPORT_TYPE = window.plugin.exportLayers.EXPORT_TYPE.GEOGSON;


    window.plugin.exportLayers.storage = {
        exportedLayerName: window.plugin.exportLayers.DEFAULT_LAYER_NAME,
		exportType: window.plugin.exportLayers.DEFAULT_EXPORT_TYPE
    };

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
		
        if (typeof window.plugin.exportLayers.storage.exportType == "undefined"
				|| typeof window.plugin.exportLayers.storage.exportType.code == 'undefined'
				|| typeof window.plugin.exportLayers.EXPORT_TYPE[window.plugin.exportLayers.storage.exportType.code] == 'undefined') {
			window.plugin.exportLayers.storage.exportType = window.plugin.exportLayers.DEFAULT_EXPORT_TYPE;
		}
		else {
			window.plugin.exportLayers.storage.exportType = window.plugin.exportLayers.EXPORT_TYPE[window.plugin.exportLayers.storage.exportType.code];//ensure instance is the same so equality works as intended
		}
    };

    /***************************************************************************************************************************************************************/
    /** extract layer **************************************************************************************************************************************************/
    /***************************************************************************************************************************************************************/
    window.plugin.exportLayers.extractClicked = function () {
        var options = {
            exportedLayerName: window.plugin.exportLayers.storage.exportedLayerName,
			exportType: window.plugin.exportLayers.storage.exportType
        };
        window.plugin.exportLayers.extractAndDisplay(options);
    }
	
	//recursive so we add the cumulated result as a parameter
	window.plugin.exportLayers.LeafletLayertoDrawTools = function(layerOrLayerGroup, result) {
		if(typeof result == 'undefined') result = [];
		
		if(layerOrLayerGroup instanceof L.LayerGroup) {
			var layers = layerOrLayerGroup.getLayers();
			for(var layerIndex = 0; layerIndex < layers.length; layerIndex++){
				var layer = layers[layerIndex];
				window.plugin.exportLayers.LeafletLayertoDrawTools(layer,result);
			}
		}
		else {
			var layer = layerOrLayerGroup;
			var item = {};
			//from window.plugin.drawTools.save
			if (layer instanceof L.GeodesicCircle || layer instanceof L.Circle) {
				item.type = 'circle';
				item.latLng = layer.getLatLng();
				item.radius = layer.getRadius();
				if(typeof layer.options.color != 'undefined')
					item.color = layer.options.color;
			} else if (layer instanceof L.GeodesicPolygon || layer instanceof L.Polygon) {
				item.type = 'polygon';
				item.latLngs = layer.getLatLngs();
				if(typeof layer.options.color != 'undefined')
					item.color = layer.options.color;
			} else if (layer instanceof L.GeodesicPolyline || layer instanceof L.Polyline) {
				item.type = 'polyline';
				item.latLngs = layer.getLatLngs();
				if(typeof layer.options.color != 'undefined')
					item.color = layer.options.color;
			} else if (layer instanceof L.Marker) {
				item.type = 'marker';
				item.latLng = layer.getLatLng();
				if(typeof layer.options.icon != 'undefined' && typeof layer.options.icon.options.color != 'undefined')
					item.color = layer.options.icon.options.color;
			} else {
				item = null;
				window.plugin.exportLayers.log('Unknown layer type when exporting to draw tools layer'+JSON.stringify(layer.toGeoJSON()));
			}
			
			if(item != null)
				result.push(item);
		}
		
		return result;
	}
	
	window.plugin.exportLayers.getLayerByName = function(layerName){
		var foundLayer = null;
		$.each(layerChooser._layers, function (layerId, layer) {
			if (layer.name == layerName) {
				foundLayer = layer;
				return false;
			}
		});
		return foundLayer;
	}

    window.plugin.exportLayers.extractAndDisplay = function (options) {
        if (typeof options == 'undefined') options = {};
        if (typeof options.exportedLayerName == 'undefined') options.exportedLayerName = window.plugin.exportLayers.DEFAULT_LAYER_NAME;
		if (typeof options.exportType == 'undefined') options.exportType = window.plugin.exportLayers.DEFAULT_EXPORT_TYPE;

        try {
            window.plugin.exportLayers.log('Start of export layer:' + options.exportedLayerName+', type:'+options.exportType.name);
            var result = '';

            if (typeof options.exportedLayerName == 'string' && options.exportedLayerName != '') {
                var layerChooserLayer = window.plugin.exportLayers.getLayerByName(options.exportedLayerName);
                
                if (layerChooserLayer == null) {
                    result = "Layer not found in layer chooser";
                }
                else {
                    try {
						if(options.exportType == window.plugin.exportLayers.EXPORT_TYPE.GEOGSON) {
							result = JSON.stringify(layerChooserLayer.layer.toGeoJSON()); //the actual export
						}
                        else if(options.exportType == window.plugin.exportLayers.EXPORT_TYPE.DRAWTOOLS) {
							result = window.plugin.exportLayers.LeafletLayertoDrawTools(layerChooserLayer.layer);
							result = JSON.stringify(result);
						}
						else {
							result = "Export type not implemented";
							if(typeof options.exportType.name != 'undefined')
								result += "("+options.exportType.name+")";
						}
                    }
                    catch (err) {
                        result = "Error: "+ err.message+'\r\n'+err.stack;
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
		window.plugin.exportLayers.storage.exportType = window.plugin.exportLayers.DEFAULT_EXPORT_TYPE;
		
        window.plugin.exportLayers.saveStorage();
        window.plugin.exportLayers.openOptDialog();
    }
    window.plugin.exportLayers.saveOpt = function () {
        var exportedLayerName = $('#exportLayers-exportedLayerName').val();
        window.plugin.exportLayers.storage.exportedLayerName = exportedLayerName;
		
		var exportTypeCode = $('#exportLayers-exportType').val();
		if(typeof window.plugin.exportLayers.EXPORT_TYPE[exportTypeCode] != 'undefined')
		{
			var exportType = window.plugin.exportLayers.EXPORT_TYPE[exportTypeCode];
			window.plugin.exportLayers.storage.exportType = exportType;
		}
		else {
			window.plugin.exportLayers.EXPORT_TYPE = window.plugin.exportLayers.DEFAULT_EXPORT_TYPE;
			$('#exportLayers-exportType').val(window.plugin.exportLayers.EXPORT_TYPE.code);
		}
		
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
        html +=
        			'<tr>' +
        				'<td>' +
        					'Format' +
        				'</td>' +
        				'<td>' +
                            '<select id="exportLayers-exportType">';
                            for(typeCode in window.plugin.exportLayers.EXPORT_TYPE){
                                var type = window.plugin.exportLayers.EXPORT_TYPE[typeCode];
                                html+= '<option value="'+type.code+'" '+
                                    (window.plugin.exportLayers.storage.exportType == type ? 'selected="selected" ' : '') + 
                                    '>' + type.name+'</option>';
                            }
                html += '</select>'+
        				'</td>' +
        			'</tr>';
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
            title: 'Export layer',
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
        if (window.plugin.exportLayers.debug || !!isError) {
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
