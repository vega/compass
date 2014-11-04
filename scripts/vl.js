// Define module using Universal Module Definition pattern
// https://github.com/umdjs/umd/blob/master/amdWeb.js

(function (root, deps, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(deps, factory);
  } else if (typeof exports === 'object') {
    // Node. Does not work with strict CommonJS, but
    // only CommonJS-like environments that support module.exports,
    // like Node.

    module.exports = factory.apply(this, deps.map(function(dep){ return require(dep);}));
  } else {
    // Browser globals (root is window)
    root.returnExports = factory.apply(this, deps.map(function(dep){ return root[dep];}));
  }
}(this, ['lodash', 'vega', 'vl.templates'], function (lodash, vg, vlTemplates){

  var vl = {
    version:  "0.0.1", // semantic versioning
    vg:       vg,      // stash d3 for use
  };

  var defaultOpts = {
    width: 200,
    height: 200,
    "padding": {"top": 20, "left": 50, "bottom": 20, "right": 20},
    legends: false, // on for big visualization
    markscolor: "steelblue"
  }

  function traverse(node, fn){
    if(_.isArray(node)){
      // console.log('isArray',node);
      _.each(node, function(child){
        traverse(child, fn);
      });
    }
    if(!_.isObject(node)) return;
    fn(node);
    _.each(node, function(child, key){
      // console.log('accessing child key', key, child);
      traverse(child, fn);
    })
  }

  function getVGSpec(chart, schema, data, opt){
    var spec = vlTemplates.spec(), props = {};
    if(chart.chart_type == "BAR"){
      spec.data = vlTemplates.data();
      spec.scales = [
        vlTemplates.scale_x_quant(),
        vlTemplates.scale_y_ord()
      ];
      //TODO add color, shape
      spec.axes = vlTemplates.axes();
      spec.marks = [
        vlTemplates.marks_bar()
      ];
    }else if(chart.chart_type == "PLOT"){
      spec = _.cloneDeep(vlTemplates.PLOT);
      // return;
    }else{
      return null;
    }

    // Determine properties

    // TODO(kanitw): determine properties for field
    console.log('getVGSpec', chart);

    // TODO(kanitw): support table algebra
    props.field_x = 'data.' + chart.fields.x[0].key;
    //TODO:(kanitw): update scale based on x fields

    // TODO(kanitw): support table algebra
    props.field_y = 'data.' + chart.fields.y[0].key;
    //TODO:(kanitw): update scale based on x fields

    // TODO(kanitw): create scale for color, shape, size


    // TODO(kanitw): adjust properties

    traverse(spec, function(node){
      // console.log('traverse replace', node);
      _.each(node, function(val, key, node){
        if( val && _.isString(val) &&
            val.indexOf("__")===0 &&
            val.lastIndexOf("__") ===val.length-2)
        { //is __placeholder
          var propName = val.substring(2, val.length-2);
          node[key] = props[propName] || opt[propName];
          console.log('placeholder', val, node);
        }
      })
    });

    return spec;
  }

  vl.parse = function(chart, schema, data, element, opt){
    opt = _.merge(opt || {}, defaultOpts)

    var spec = getVGSpec(chart, schema, data, opt);
    if(!spec) return; // do nothing for unsupported spec

    console.log('vega (',chart.type,'):', JSON.stringify(spec, "  "));

    vg.parse.spec(spec, function(vgChart){
      vgChart({el: element}).data({
        all: data,
        selected: [],
        filtered: []
      }).update();
    });
  };

  return vl;
}));