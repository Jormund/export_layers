# IITC Plugin : export_layers
Download : https://raw.githubusercontent.com/Jormund/export_layers/master/export_layers.user.js

Can export an IITC layer.

Open dialog with "Export layers" button in toolbox area (near "Draw tools opt")
You can then select a layer. The list is the same as IITC top right corner (the layer chooser), plus the search result (red polygon around a city for example)
It'll export the whole layer, let's say all level 1 portal if you check "Level 1 portals".
There are 2 export formats: Draw tools and GeoJSON

With draw tools format, portals will be circles, links will be lines and fields are polygons.

GeoJSON is a standard, for which I don't have much use, but it will contain all the information, so you will be able to do some advanced manipulation with it. Or import in a tool that read GeoJSON.

