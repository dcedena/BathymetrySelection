define(['dojo/_base/declare', 'dojo/_base/lang', 'dojo/_base/array',
        'dojo/_base/html', 'dojo/i18n!esri/nls/jsapi', 'dojo/on', 'dojo/dom',
        'dojo/query', 'dojo/json', 'dojo/Deferred',
        'dojo/aspect', 'dojo/promise/all',
        'dojo/parser', 'dijit/registry',

        'jimu/BaseWidget', 'dijit/_TemplatedMixin', 'dijit/_WidgetsInTemplateMixin', 
        'jimu/CSVUtils',

        'jimu/MapManager', 'jimu/LayerInfos/LayerInfos',
        'jimu/dijit/LoadingShelter', 'jimu/utils', 'jimu/portalUrlUtils',
        'jimu/portalUtils', 'jimu/SelectionManager', 'jimu/Role',
        'esri/request',
        'esri/map', 'esri/SpatialReference', 'esri/toolbars/draw', 'esri/InfoTemplate', 'esri/dijit/PopupTemplate','esri/graphicsUtils',
        'esri/dijit/editing/Editor', 'esri/dijit/Popup', 'esri/dijit/editing/TemplatePicker',
        'esri/geometry/Extent', 'esri/geometry/Point', 'esri/geometry/Polyline', 'esri/renderers/jsonUtils',
        'esri/geometry/webMercatorUtils', 'esri/graphic',

        'esri/Color', 'esri/layers/FeatureLayer', 'esri/layers/WMSLayer', 'esri/layers/WMSLayerInfo',
        'esri/layers/ArcGISDynamicMapServiceLayer', 'esri/layers/ImageParameters',
        'esri/layers/GraphicsLayer', 'esri/layers/LabelClass',
        'esri/geometry/geometryEngine',
        'esri/symbols/SimpleMarkerSymbol', 'esri/symbols/SimpleLineSymbol', 
        'esri/symbols/SimpleFillSymbol', 'esri/symbols/PictureMarkerSymbol',
        'esri/symbols/TextSymbol', 'esri/symbols/Font',
        'esri/tasks/query', 'esri/tasks/QueryTask', 'esri/tasks/GeometryService',
        'dijit/Menu', 'dijit/MenuItem', 'dijit/form/ComboButton',

        'dijit/form/Button',  'dijit/form/RadioButton', 'dijit/form/TextBox', 
        'dijit/form/CheckBox'
        ],
  function(declare, lang, array, 
           html, esriBundle, on, dom,
           query, Json, Deferred, 
           aspect, all,
           parser, registry,

           BaseWidget, _TemplatedMixin, _WidgetsInTemplateMixin,
           CSVUtils,

           MapManager, LayerInfos, 
           LoadingShelter, jimuUtils, portalUrlUtils, 
           portalUtils, SelectionManager, Role, 
           esriRequest, 
           Map, SpatialReference, Draw, InfoTemplate, PopupTemplate, graphicsUtils,
           Editor, Popup, TemplatePicker,
           Extent, Point, Polyline, rendererJsonUtils, 
           webMercatorUtils, Graphic, 
           Color, FeatureLayer, WMSLayer, WMSLayerInfo,
           ArcGISDynamicMapServiceLayer, ImageParameters,
           GraphicsLayer, LabelClass,
           geometryEngine,
           SimpleMarkerSymbol, SimpleLineSymbol,
           SimpleFillSymbol, PictureMarkerSymbol,
           TextSymbol, Font,
           Query, QueryTask, GeometryService,

           Menu, MenuItem, ComboButton

          ) {
    //To create a widget, you need to derive from BaseWidget.
      return declare([BaseWidget, _TemplatedMixin, _WidgetsInTemplateMixin], {
          // Custom widget code goes here
          name: 'BathymetrySelection',
          baseClass: 'jimu-widget-bathymetry-selection',
          dialog: null,
          url_srv_actual: null,
          toolbar_area_selected: null,

          id_gLayerSeleccion: 'glSeleccion',
          gLayerSeleccion: null, /* Rectangulo/Circulo, Líneas y Labels */
          id_wmsLayerSelection: 'wmsLayerBathy',

          indexLayerAreaSeleccion: 1,
          
          postCreate: function() {
              this.inherited(arguments);
          },

          startup: function() {
              this.inherited(arguments);
              this._initSubscribeClicks();
          },

          onOpen: function () {
              that_bathy = this;
              this.mapa = map;
          },

          _requestSucceeded : function (response, io) {

              debugger;

          },

          _requestFailed : function (error, io) {

              debugger;

          },

          _refrescoArea : function() {
              this._deactivateToolbar();

              if(!this.sel)
                  return;

              var d = new Date();
              console.log('_refrescoArea - ' + d);

              this._borrarGraphics();
              this._pintarSeleccion(this.sel);
              this._setTextInfoArea(this.sel);

              try {
                  var selectionLimits = this._obtenerLimitesSeleccion(this.sel);
                  var w_and_h = this._obtenerWidthHeight(selectionLimits);

                  var layer1 = new WMSLayerInfo({ name: 'emodnet:contours', title: 'Depth contours' });
                  var layer2 = new WMSLayerInfo({ name: 'coastlines', title: 'Coastlines' });
                  var layer3 = new WMSLayerInfo({ name: 'emodnet:mean_multicolour', title: 'Multicolor' });

                  var srs = new SpatialReference(4326);
                  var extent = new Extent(selectionLimits.west, selectionLimits.south,
                                          selectionLimits.east, selectionLimits.north, srs);

                  var wmsLayer = new WMSLayer("https://ows.emodnet-bathymetry.eu/wms", {
                          id: this.id_wmsLayerSelection,
                      resourceInfo: { extent: extent, layerInfos: [ layer1, layer2, layer3 ] },
                          visibleLayers: [ layer3.name ]
                  });

                  console.info('-wmsLayer-');
                  console.info(wmsLayer);

                  /*this.handleAddBathy = this.map.on('layer-add', function (e, a) {
                      debugger;
                      if (e.layer.id == that_bathy.id_wmsLayerSelection) {


                      }
                      if (that_bathy.handleAddBathy)
                        that_bathy.handleAddBathy.remove();
                  });*/
                  this.map.addLayers([wmsLayer]);

                  // --- URL --- //
                  var url = "https://ows.emodnet-bathymetry.eu/wms?REQUEST=GetMap&SERVICE=WMS&" +
                            "VERSION=1.3.0&" +
                            "FORMAT=image/png&" +
                            // "BGCOLOR=0x000000&" +
                            "TRANSPARENT=True&" +
                            "WIDTH=" + w_and_h.width + "&" + "HEIGHT=" + w_and_h.height + "&" +
                            "BBOX=" + selectionLimits.bbox + "&" + "LAYERS=emodnet:mean_multicolour";

                  var lblURL = document.getElementById('lblURL');
                  lblURL.innerHTML = "<a href='" +url + "' target='_blank' style='text-decoration:none'>Click para abrir [ " + w_and_h.width + " x " + w_and_h.height + " ] ..." +
                                        "<div><img src='" + url + "' style='width:300px' /></div>" +
                                     "</a>";
              }
              catch (err)
              {
                  console.error(err);
              }
          },

          _obtenerWidthHeight: function (selectionLimits) {
              var res = {
                  width: Math.ceil((selectionLimits.east_utm - selectionLimits.west_utm) / 10),
                  height: Math.ceil((selectionLimits.north_utm - selectionLimits.south_utm) / 10)
              };
              if (selectionLimits) {
                  while (res.width >= 5000 || res.height >= 5000) {
                      res.width /= 10;
                      res.height /= 10;
                  }
              }

              res.width = Math.ceil(res.width);
              res.height = Math.ceil(res.height);

              return res;
          },

          _obtenerLimitesSeleccion: function (seleccion) {
              // Valores por defecto: España
              var res = {};
              
              if (seleccion) {
                  var datos = this._obtenerDatosSeleccion(seleccion);

                  res.spatialReference = seleccion.geometry.spatialReference;
                  res.west =  Math.min(datos.initialPoint.getLongitude().toFixed(5), datos.finalPoint.getLongitude().toFixed(5));
                  res.south = Math.min(datos.initialPoint.getLatitude().toFixed(5), datos.finalPoint.getLatitude().toFixed(5));
                  res.east =  Math.max(datos.initialPoint.getLongitude().toFixed(5), datos.finalPoint.getLongitude().toFixed(5));
                  res.north = Math.max(datos.initialPoint.getLatitude().toFixed(5), datos.finalPoint.getLatitude().toFixed(5));
                  res.bbox = res.west + ',' + res.south + ',' + res.east + ',' + res.north;

                  res.west_utm =  Math.min(datos.initialPoint.x, datos.finalPoint.x);
                  res.south_utm = Math.min(datos.initialPoint.y, datos.finalPoint.y);
                  res.east_utm =  Math.max(datos.initialPoint.x, datos.finalPoint.x);
                  res.north_utm = Math.max(datos.initialPoint.y, datos.finalPoint.y);
                  res.bbox_utm = res.west_utm + ',' + res.south_utm + ',' + res.east_utm + ',' + res.north_utm;

                  /*var lblLimites = document.getElementById('lblLimites');
                  lblLimites.innerHTML = 'res.spatialReference = ' + res.spatialReference.wkid + '<br/>' +
                                         'res.west = ' + res.west + ' (UTM: ' + res.west_utm + ')<br/>' +
                                         'res.south = ' + res.south + ' (UTM: ' + res.south_utm + ')<br/>' +
                                         'res.east = ' + res.east + ' (UTM: ' + res.east_utm + ')<br/>' +
                                         'res.north = ' + res.north + ' (UTM: ' + res.north_utm + ')';*/
              }

              console.info('-Datos Limites Selección-');
              console.info(res);

              return res;
          },

          _initSubscribeClicks : function() {
              this.own(on(this.btnSeleccionarArea, 'click', lang.hitch(this, function() {
                  this._onBtnSeleccionarArea();
              })));
              this.own(on(this.btnReset, 'click', lang.hitch(this, function () {
                  this._onBtnReset();
              })));
          },

          _onChkActivarTimer : function() {
              this._deactivateToolbar();
          },

          _onBtnSeleccionarArea : function() {

              this._deactivateToolbar();

              this.toolbar = new Draw(this.map);
              this.toolbar.activate(esri.toolbars.Draw.RECTANGLE);
              this.toolbar.on("draw-end", _selectDraw);
              this.sel = null;
              function _selectDraw(sel) 
              {
                  that_bathy.sel = sel;
                  that_bathy._refrescoArea();
              }
          },
          
          _onBtnReset : function() {
              this._reset(false, true);
          },

          _reset : function(mantenerTextbox, resetHorasHistorico) {
              this._deactivateToolbar();

              this.sel = null;
              this.selLine = null;

              this._setTextInfoArea();
              this._borrarGraphics();
          },

          pad : function (n, width, z) {
            z = z || ' ';
            if(n)
              n = n.toString().trim() + '';
            else
              n = ''

            return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
          },

          _deg_to_dms : function (deg, isLat) {
             var d = Math.floor (deg);

             var signo = '';
             if(isLat)
             {
                signo = 'N';
                if(deg < 0)
                  signo = 'S';
             }
             else {
                signo = 'E';
                if(deg < 0)
                  signo = 'W';
              }

             var minfloat = (deg-d)*60;
             var m = Math.floor(minfloat);
             var secfloat = (minfloat-m)*60;
             var s = Math.round(secfloat);
                  // After rounding, the seconds might become 60. These two
                  // if-tests are not necessary if no rounding is done.
             if (s==60) {
               m++;
               s=0;
              }
             if (m==60) {
               d++;
               m=0;
              }

             var _d = '';
             if(isLat)
                _d = this.pad(Math.abs(d), 2, '0');
             else
                _d = this.pad(Math.abs(d), 3, '0');

             var _m = this.pad(m, 2, '0');
             var _s = this.pad(s, 2, '0');

             return ("" + _d + signo + " " + _m + "' " + _s + "''");
          },

          _obtenerDatosSeleccion : function(sel) {
            var res = {
                    "initialPoint": new Point(sel.geometry.rings[0][0][0], sel.geometry.rings[0][0][1], sel.geometry.spatialReference),
                    "finalPoint": new Point(sel.geometry.rings[0][2][0], sel.geometry.rings[0][2][1], sel.geometry.spatialReference)
                };
            return res;
          },

          _zoomIn : function(features) {
            var extensionMapa = graphicsUtils.graphicsExtent(features);
            if(features.length > 1) {
              if (extensionMapa.xmin == extensionMapa.xmax) {
                  extensionMapa.xmin -= 50000;
                  extensionMapa.xmax += 50000;
              }
              if (extensionMapa.ymin == extensionMapa.ymax) {
                  extensionMapa.ymin -= 50000;
                  extensionMapa.ymax += 50000;
              }
              extensionMapa = extensionMapa.expand(1.5);
            }
            this.map.setExtent(extensionMapa);
          },

          _pintarSeleccion : function(sel) {
              var linea = new SimpleLineSymbol(SimpleLineSymbol.STYLE_DASHDOT,
                                                   new Color([128, 128, 250]), 2);
                  /*var relleno = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
                                                         linea,
                                                         new Color([100, 100, 250, 0.25]));*/
              var gRect = new Graphic(sel.geometry, linea);
              gRect.id = 'AreaSeleccion';
              this.gLayerSeleccion = new GraphicsLayer( { id: this.id_gLayerSeleccion } );
              // Index=0 Para que todas las demás entidades estén por encima de la zona seleccionada.
              this.map.addLayer(this.gLayerSeleccion, this.indexLayerAreaSeleccion);

              this.gLayerSeleccion.add(gRect);
          },

          _setTextInfoArea: function (seleccion) {
              if (seleccion) {
                  var res = this._obtenerDatosSeleccion(seleccion);
                  this._setValueInitialPoint(res.initialPoint);
                  this._setValueFinalPoint(res.finalPoint);
              }
              else {
                  this._setValueInitialPoint();
                  this._setValueFinalPoint();
                  var lblURL = document.getElementById('lblURL');
                  lblURL.innerHTML = '';

                  var lblLimites = document.getElementById('lblLimites');
                  lblLimites.innerHTML = '';
              }
          },

          _setTitleInitialPoint : function(text) {
              var lblPuntoInicialTitle = document.getElementById('lblPuntoInicialTitle');
              if(text)
                lblPuntoInicialTitle.innerHTML = text;
              else
                lblPuntoInicialTitle.innerHTML = '';
          },

          _setTitleFinalPoint : function(text) {
              var lblPuntoFinalTitle = document.getElementById('lblPuntoFinalTitle');
              if(text)
                lblPuntoFinalTitle.innerHTML = text;
              else
                lblPuntoFinalTitle.innerHTML = '';
          },

          _setValueInitialPoint : function(initialPoint, onlyInitial) {
              var lblPuntoInicialValue = document.getElementById('lblPuntoInicialValue');

              if(initialPoint) {
                lblPuntoInicialValue.innerHTML = initialPoint.getLatitude().toFixed(3) + " " +
                                                 initialPoint.getLongitude().toFixed(3);
              }
              else {
                lblPuntoInicialValue.innerHTML = "";
              }
          },

          _setValueFinalPoint : function(finalPoint) {
              var lblPuntoFinalValue = document.getElementById('lblPuntoFinalValue');

              if(finalPoint) {
                lblPuntoFinalValue.innerHTML = finalPoint.getLatitude().toFixed(3) + " " +
                                               finalPoint.getLongitude().toFixed(3);
              }
              else {
                lblPuntoFinalValue.innerHTML = "";
              }
          },

          _borrarGraphics : function () {
              // Area Selección
              //var lyr = this.map.getLayer(this.id_gLayerSeleccion);
              if(this.gLayerSeleccion) {
                this.map.removeLayer(this.gLayerSeleccion);
              }

              var wmsLyrSel = this.map.getLayer(this.id_wmsLayerSelection);
              if (wmsLyrSel) {
                    this.map.removeLayer(wmsLyrSel);
              }
          },

          _deactivateToolbar: function () {
              if (this.toolbar)
                  this.toolbar.deactivate();
              this.toolbar = null;
          },

          onClose : function(){
              this._deactivateToolbar();
          }

        });
  });