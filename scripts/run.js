"use strict";

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
}(this, ['lodash', './chartTemplates', './dataTypes', './field', './chart','fs','util'],
  function(_,   chartTemplates, dt, field, chart, fs, util)
{

  var types = [ dt.ordinal, dt.datetime, dt.geographic, dt.quantitative, dt.count];


  var genTypeCountMaps = function(fieldsCount, t, dist, out){
    t = t || 0;
    dist = dist || {};
    out = out || [];

    var hasDist = function(_t){ return dist[_t.name] > 0;};

    if(fieldsCount===0){
      out.push(_.clone(dist));
      return out;
    }
    if(t==types.length) return out;

    var typeName = types[t].name, i,
      isCount = typeName === "count",
      maxAssignment = isCount ? 1 : fieldsCount;
    for(i= 0; i<=  maxAssignment ; i++){
      // have at least one categorical type
      if(isCount && !_.any([dt.ordinal, dt.datetime, dt.geographic], hasDist)) continue;

      if(i>0) dist[typeName] = (dist[typeName] || 0) + i; //add this to dist
      genTypeCountMaps(fieldsCount-i, t+1, dist, out);
      if(typeName in dist && (dist[typeName]-=i) === 0) delete dist[typeName]; //cancel out added value
    }
    return out;
  };

  var genCharts = function(typeCountMaps){
    return _.reduce(typeCountMaps, function(m, map){
      var key = field.typeCountMapToKey(map),
        fields = field.fromTypeCountMap(map),
        charts = chartTemplates.generateCharts(fields, true, map);

      if(charts.length > 0){
        console.log("charts for", key, ":", charts.map(chart.toShorthand));
        // console.log("charts for", key, ":", util.inspect(charts));
        m[key] = charts;
      }
      return m;
    }, {});
  };

  var fieldSets = {}, fieldsCount;

  for(fieldsCount=3; fieldsCount<4 ; fieldsCount++){
    var typeCountMaps = genTypeCountMaps(fieldsCount);
    console.log(typeCountMaps);
    fieldSets[fieldsCount] = genCharts(typeCountMaps);
    // console.log(fieldSets[fieldsCount]);
    //   .map(function(fields))
  }

  // var i, fieldTypes, templates;
  // var fieldSets = [
  //   // {ordinal:1, quantitative:1},
  //   // {geographic:1, quantitative:1}
  //   // {categorical:1, geographic:1, quantitative:1}
  //   [{type:"quantitative", count:3}]
  //   ];


  // fieldSets.forEach(function(fieldTypes){
  //   var fields = field.toFields(fieldTypes),
  //     fieldTypeCount = _.reduce(fieldTypes, function(m,f){
  //       m[f.type] = (f.count || 0) + 1; return m;
  //     },{}),
  //     templates = chartTemplates.findByDataTypes(fieldTypeCount);
  //   console.log("==", JSON.stringify(fields), "==");
  //   console.log(_.pluck(templates,'id'));
  //   templates.forEach(function(template){
  //     console.log("--", template.id, "--");
  //     var charts = template.generateCharts(fields);
  //     console.log(fields);
  //     console.log(JSON.stringify(charts,null, " "));
  //   });
  // });
}));


// var _ = require('lodash'),
//   chartTemplates = require('./chartTemplates'),
//   dt = require('./dataTypes'),
//   field = require('./field'),
//   chart = require('./chart'),
//   fs = require('fs'),
//   util = require('util');


// console.log(chartTemplates);

