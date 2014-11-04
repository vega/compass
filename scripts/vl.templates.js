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

  vlTemplates.scale_y_ord = function(){
    return {
      "name": "y",
      "type": "ordinal",
      "range": "height",
      "domain": { "data": "all", "field": "__field_y__"}
    };
  };

  vlTemplates.scale_x_quant = function(){
    return {
      "name": "x",
      "range": "width",
      "nice": true,
      "domain": { "data": "all", "field": "__field_x__"}
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

  vlTemplates.FILL_COLOR_FIELD = {"scale": "color", "field": "__field_color__"};

  vlTemplates.axes = function(){
    return [{
      "type": "x",
      "scale": "x"
    }, {
      "type": "y",
      "scale": "y"
    }];
  };

  vlTemplates.PLOT = {
    "width": "__width__",
    "height": "__height__",
    "padding": "__padding__",
    "data": [
      {"name": "all"},
      {"name": "selected"},
      {"name": "filtered"}
    ],
    "scales": [
      {
        "name": "x",
        "nice": true,
        "range": "width",
        "domain": {"data": "all", "field": "__field_x__"}
      },
      {
        "name": "y",
        "nice": true,
        "range": "height",
        "domain": {"data": "all", "field": "__field_y__"}
      }
      // ,
      // {
      //   "name": "c",
      //   "type": "ordinal",
      //   "domain": {"data": "iris", "field": "data.species"},
      //   "range": ["#800", "#080", "#008"]
      // }
    ],
    "axes": [
      {"type": "x", "scale": "x"}, //TODO(kanitw): title
      {"type": "y", "scale": "y"} //TODO(kanitw): title
    ],
    // "legends": [
    //   {
    //     "fill": "c",
    //     "title": "Species",
    //     "offset": 0,
    //     "properties": {
    //       "symbols": {
    //         "fillOpacity": {"value": 0.5},
    //         "stroke": {"value": "transparent"}
    //       }
    //     }
    //   }
    // ],
    "marks": [
      {
        "type": "symbol",
        "from": {"data": "all"},
        "properties": {
          "enter": {
            "x": {"scale": "x", "field": "__field_x__"},
            "y": {"scale": "y", "field": "__field_y__"},
            "fill": {"value": "steelblue"},
            // "fill": {"scale": "c", "field": "data.species"},
            "fillOpacity": {"value": 0.5}
          },
          "update": {
            "size": {"value": 100},
            "stroke": {"value": "transparent"}
          },
          "hover": {
            "size": {"value": 300}
            // ,"stroke": {"value": "white"}
          }
        }
      }
    ]
  };

  return vlTemplates;
}));