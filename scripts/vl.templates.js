// Universal Module Pattern from https://github.com/umdjs/umd/blob/master/returnExports.js
// Uses Node, AMD or browser globals to create a module.

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([], factory);
    } else if (typeof exports === 'object') {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = factory();
    } else {
        // Browser globals (root is window)
        root.encodings = factory();
  }
}(this, function () {
  var vlTemplates = {};

  vlTemplates.spec = function(){
    return {
      "width": "__width__",
      "height": "__height__",
      "padding": "__padding__"
    };
  };

  vlTemplates.data = function(){
    return [{
      "name": "all"
    }, {
      "name": "selected"
    }, {
      "name": "filtered"
    }];
  };

  vlTemplates.scale_ord = function(name, opt){
    return _.merge({
      "name": name,
      "type": "ordinal",
      "domain": { "data": "all", "field": "__field_" + name + "__"}, //__field_x__  or __field_y__
      "range": "height"
    }, opt||{});
  };

  vlTemplates.scale_qnt = function(name){
    return {
      "name": name,
      "nice": true,
      "domain": { "data": "all", "field": "__field_" + name + "__"},
      "range": "width"
    }
  }

  vlTemplates.scale_color_quant = function(){
    return {
      "name": "color",
      "domain": { "data": "all", "field": "__field_color__"},
      "range": ["#b0c6a5","#0d511f"]
    };
  };

  vlTemplates.scale_color_ord = function(){
    return {
      "name": "color",
      "type": "ordinal",
      "domain": { "data": "all", "field": "__field_color__"},
      "range": "category20"
    };
  };

  vlTemplates.scale_shape = function(){
    return {
      "name": "shape",
      "type": "ordinal",
      "domain": { "data": "all", "field": "__field_shape__"},
      "range": "shapes"
    }
  };

  vlTemplates.scale_size = function(){
    return {
      "name": "size",
      "domain": { "data": "all", "field": "__field_size__"},
      "range": [0, 1000]
    };
  }

  vlTemplates.axis_x = function(opt){
    return _.merge({
      "type": "x",
      "scale": "x"
    },opt||{});
  }

  vlTemplates.axis_y = function(opt){
    return _.merge({
      "type": "y",
      "scale": "y"
    },opt||{});
  }

  vlTemplates.axes = function(optX,optY){
    return [ vlTemplates.axis_x(optX), vlTemplates.axis_y(optY) ];
  };


  vlTemplates.marks_bar = function(opt){
    var color = ((opt||{}).color) || {"value": "__markscolor__"};

    return {
      "type": "rect",
      "from": { "data": "all"},
      "properties": {
        "enter": {
          "x": { "scale": "x", "field": "__field_x__"},
          "x2": {"scale": "x", "value": 0},
          "y": {"scale": "y", "field": "__field_y__"},
          "height": { "scale": "y", "band": true, "offset": -1}
        },
        "update": {"fill": color},
        "hover": {"fill": { "value": "red"}}
      }
    };
  };

  vlTemplates.marks_plot = function(opt){
    var color = opt.color || {"value": "__markscolor__"},
      shape = opt.shape || {"value": "circle"},
      size = opt.size || {"value": "__plotsize__"};

    return {
        "type": "symbol",
        "from": {"data": "all"},
        "properties": {
          "enter": {
            "x": {"scale": "x", "field": "__field_x__"},
            "y": {"scale": "y", "field": "__field_y__"},
            // "fill": {"scale": "c", "field": "data.species"},
            "fillOpacity": {"value": "__fillplotopacity__"},
            "size": size,
            "shape": shape
          },
          "update": {
            "fill": color,
          },
          "hover": {
            "fill": {"value": "__markshovercolor__"}
            // ,"stroke": {"value": "white"}
          }
        }
      };
  };

  vlTemplates.FILL_COLOR_FIELD = {"scale": "color", "field": "__field_color__"};

  return vlTemplates;
}));