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
      "range": "height",
      "domain": { "data": "all", "field": "__field_" + name + "__"}
    }, opt||{});
  };

  vlTemplates.scale_qnt = function(name){
    return {
      "name": name,
      "range": "width",
      "nice": true,
      "domain": { "data": "all", "field": "__field_" + name + "__"}
    }
  }

  // TODO add SCALE_X_QUANT,ORDINAL and Y
  //

  vlTemplates.scale_color = function(){
    return {
      "name": "color",
      "type": "ordinal",
      "range": "category20"
    };
  };

  // TODO(kanitw): split this to axes x/y, ordinal/quant
  vlTemplates.axes = function(){
    return [{
      "type": "x",
      "scale": "x"
    }, {
      "type": "y",
      "scale": "y"
    }];
  };

  vlTemplates.marks_bar = function(){
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
        "update": {"fill": { "value": "__markscolor__"}},
        "hover": {"fill": { "value": "red"}}
      }
    };
  };

  vlTemplates.marks_plot = function(){
    return {
        "type": "symbol",
        "from": {"data": "all"},
        "properties": {
          "enter": {
            "x": {"scale": "x", "field": "__field_x__"},
            "y": {"scale": "y", "field": "__field_y__"},
            // "fill": {"scale": "c", "field": "data.species"},
            "fillOpacity": {"value": 0.5},
            "size": {"value": 100}
          },
          "update": {
            "fill": {"value": "__markscolor__"},
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