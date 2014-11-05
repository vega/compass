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
}(this, ['lodash', 'vega', 'vl.templates'], function (lodash, vg, mixins){

  var vl = {
    version:  "0.0.1", // semantic versioning
    vg:       vg,      // stash d3 for use
  };

  var defaultOpts = {
    width: 200,
    height: 200,
    "padding": {"top": 30, "left": 50, "bottom": 30, "right": 30},
    legends: false, // on for big visualization
    markscolor: "steelblue",
    markshovercolor: "red",
    fillplotopacity: 0.2,
    plotsize: 100
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
    var spec = mixins.spec(), props = {}, marksOpt={}, marks;

    var fieldX = (chart.fields.x||{})[0], //FIXME support 1 x only for now
      fieldY = (chart.fields.y||{})[0], //FIXME
      fieldColor = (chart.fields.color||{})[0],
      fieldShape = (chart.fields.shape||{})[0];

    // TODO(kanitw): support table algebra
    if(fieldX) props.field_x = 'data.' + fieldX.key;
    if(fieldY) props.field_y = 'data.' + fieldY.key;
    if(fieldColor) props.field_color = 'data.' + fieldColor.key;
    if(fieldShape) props.field_shape = 'data.' + fieldShape.key;

    //TODO:(kanitw): update scale based on x,y fields

    console.log("fields", fieldX, fieldY);

    if(chart.chart_type == "BAR"){
      spec.data = mixins.data();
      spec.scales = [
        mixins.scale_qnt('x'),
        mixins.scale_ord('y')
      ];

      //TODO make this code less redundant
      if(fieldColor){
        spec.scales.push(fieldColor.dataType == "quantitative" ? mixins.scale_color_quant() : mixins.scale_color_ord());
        marksOpt.color = {scale:"color", field: "__field_color__"};
      }

      spec.axes = mixins.axes();
      spec.marks = [
        mixins.marks_bar()
      ];

    }else if(chart.chart_type == "PLOT"){
      spec.data = mixins.data();
      spec.scales = [
        fieldX.dataType == "quantitative" ? mixins.scale_qnt('x') : mixins.scale_ord('x', {points:true}),
        fieldY.dataType == "quantitative" ? mixins.scale_qnt('y') : mixins.scale_ord('y', {points:true})
      ];

      //TODO make this code less redundant
      if(fieldColor){
        spec.scales.push(fieldColor.dataType == "quantitative" ? mixins.scale_color_quant() : mixins.scale_color_ord());
        marksOpt.color = {scale:"color", field: "__field_color__"};
      }
      if(fieldShape){
        spec.scales.push(mixins.scale_shape()) ;
        marksOpt.shape = {scale:"shape", field: "__field_shape__"};
        props.plotsize = 50;
      }

      //TODO make this code less redundant
      if(fieldColor){
        spec.scales.push(fieldColor.dataType == "quantitative" ? mixins.scale_color_quant() : mixins.scale_color_ord());
      }

      spec.axes = mixins.axes();
      if(chart.fields.size){
        spec.scales.push(mixins.scale_size());
        props.field_size = 'data.' + chart.fields.size[0].key;
        marksOpt.size = {scale:"size", field: "__field_size__"};
      }
      spec.marks = [
        mixins.marks_plot(marksOpt)
      ];

    }else{
      // TODO(kanitw): zening please add map case here!
      return null;
    }

    // ADD COLOR


    //
    // Determine properties
    // TODO(kanitw): create scale for color, shape, size



    // TODO(kanitw): adjust properties

    //traversing the spec and replace placeholder properties
    traverse(spec, function(node){
      // console.log('traverse replace', node);
      _.each(node, function(val, key, node){
        if( val && _.isString(val) &&
            val.indexOf("__")===0 &&
            val.lastIndexOf("__") ===val.length-2)
        { //is __placeholder__
          var propName = val.substring(2, val.length-2);
          node[key] = props[propName] || opt[propName];
          // console.log('placeholder', val, node);
        }
      })
    });

    return spec;
  }

  vl.parse = function(chart, schema, data, element, opt){
    opt = _.merge(opt || {}, defaultOpts)
    return getVGSpec(chart, schema, data, opt);
  };

  return vl;
}));