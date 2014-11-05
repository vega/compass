/** list of chart templates */
// Universal Module Pattern -- modified from https://github.com/umdjs/umd/blob/master/returnExports.js
// Uses Node, AMD or browser globals to create a module.

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
}(this, ['lodash', './dataTypes', './chartTypes', './chartTemplate'], function(_,dt,ct, ChartTemplate){


  // var _ = require('lodash');
  // var dt = require("./dataTypes");
  // var ct = require('./chartTypes');
  // var ChartTemplate = require('./chartTemplate');

  var templates = [], groups = {};

  var specs = [
    //1D -------------------------------------
    {
      type: ct.TABLE, //imply marks = text
      name:'Summary Table',
      id:"summary-table",
      note: "Table showing min,max, average, sum, median",
      encodings: {
        summary: {dataType: dt.quantitative}
      },
      transposable: false,
      smallMultiple: false
    },{
      type: ct.HISTOGRAM, //imply marks = rect
      name: "Histogram",
      id: "histogram",

      encodings: {
        hist: {dataType: dt.quantitative}
      }
    },
    //2D -------------------------------------
    {
      type: ct.BAR, //imply marks = rect
      name:"Bar Chart",
      id: "bar-chart",
      encodings: {
        x: {dataType: dt.aggregate, multiple:true},
        y: dt.categorical
      },
      transposable: true
    },{
      type: ct.TABLE,
      name:"Text Table",
      id:"text-table",
      encodings: {
        text: {dataType: dt.aggregate}
      },
      minField: 2,
      transposable: true
    },{
      type: ct.PLOT,
      name: "Scatter Plot (Raw)",
      id: "plot-raw",
      encodings: {
        x: {dataType: dt.quantitative, multiple:true},
        y: [{dataType: dt.quantitative, multiple:true},
            //{dataType:dt.categorical}
            ],
        //optional
        size: {dataType: dt.quantitative, optional: true},
        color: [null, dt.categorical, dt.quantitative],
        shape: {dataType: dt.categorical, optional: true}
      },
      transposable: true
      // scatter plot aggregated is possible too but is useless for this case
    },{
      type: ct.LINE,
      name: "Line Chart",
      id: "line-chart",
      encodings: {
        x: {dataType: dt.interval, multiple: true},
        y: {dataType: dt.aggregate, multiple:true}
      },
      transposable: false //line chart isn't normally transposed
    },{
      type: ct.MAP,
      name: "Symbol Map",
      id: "symbol-map",
      encodings: {
        geo: dt.geographic,
        size: {dataType: dt.aggregate}
      },
      minField: 2,
      transposable: false
    },{
      type: ct.MAP,
      name: "Colored Map",
      id: "colored-map",
      encodings: {
        geo: dt.geographic,
        color: {dataType: dt.aggregate}
      },
      transposable: false
    },
    //3D -------------------------------------
    {
      type: ct.BAR,
      name: "Stack Bar Chart",
      id: "stack-bar",
      encodings: {
        x: {dataType: dt.aggregate, multiple:true},
        y: dt.categorical,
        color: dt.categorical
      },
      transposable: true
    },{
      type: ct.PLOT,
      name: "Scatter Plot (Agg)",
      id: "plot-agg",
      encodings: {
        x: {dataType: dt.aggregate, multiple:true},
        y: [{dataType: dt.aggregate, multiple:true},
            //{dataType:dt.categorical}
            ],
        //optional
        size: {dataType: dt.aggregate, optional: true},
        color: [null, dt.categorical, dt.quantitative],
        shape: {dataType: dt.categorical, optional: true}
      },
      minField: 3,
      transposable: true
      // scatter plot aggregated is possible too but is useless for this case
    },{
    //  TODO(kanitw): support splom!
    //   type: ct.PLOT,
    //   name: "SPLOM",
    //   id: "splom",
    //   encodings: {
    //     "x&y": {dataType: dt.quantitative, multiple:true}
    //   },
    //   minField: 3
    // },{
      type: ct.LINE,
      name: "Colored Lines",
      id: "colored-line-C",
      note: "One measure per multiple, grouped by categorical variable on Color",
      encodings: {
        x: {dataType: dt.interval, multiple: true},
        y: {dataType: dt.aggregate, multiple:true},
        color: dt.categorical
      }
    },{
      type: ct.AREA,
      name: "Stacked Area",
      id: "stacked-area-C",
      note: "One measure per multiple, grouped by categorical variable on Color",
      encodings: {
        x: {dataType: dt.interval, multiple: true},
        y: {dataType: dt.aggregate, multiple:true},
        color: dt.categorical
      }
    },{
      type: ct.LINE,
      name: "Colored Lines",
      id: "colored-line-nQ",
      note: "Multi-measures with same unit",
      encodings: {
        x: {dataType: dt.interval, multiple: true},
        y: {dataType: dt.aggregate, multiple:true, "same-unit":true}
      }
    },{
      type: ct.AREA,
      name: "Stacked Area",
      id: "stacked-area-nQ",
      note: "Multi-measures with same unit",
      encodings: {
        x: {dataType: dt.interval, multiple: true},
        y: {dataType: dt.aggregate, multiple:true, "same-unit":true}
      }
    },{
      type: ct.MAP,
      name: "Symbol Pie Map",
      id: "pie-map",
      encodings: {
        geo: dt.geographic,
        size: {dataType: dt.aggregate},
        color: {dataType: dt.aggregate}
      }
    }
  ];

  var addTemplate = (function(){
    var key = 0, list=1;
    /**
     * recursive function for exhaustive search
     * @param {Object} spec         ChartTemplate spec (see ChartTemplates above)
     * @param {Array} encodingPairs list of encoding pairs (data attribute-visual variables)
     * @param {Int} i               i th pair
     * @param {[type]} output    output list of templates
     */
    function addTemplateVariation(spec, encodingPairs, i, output){ //
      var j, pair;

      // console.log(encodingPairs);

      if(i===encodingPairs.length){ // finish assigning all encoding
        var id = spec.id;

        if(i>0){ //append variation to id
          id += "--" + encodingPairs.map(function(p){
            var k = p[key], e = spec.encodings[k];
            return k+":"+ (e ?  dt[e.dataType || e].short : "_");
          }).join("-");
        }
        // console.log(id,spec.id);
        output.push(new ChartTemplate(spec,id));
        return;
      }

      pair = encodingPairs[i];

      for(j=0 ; j<pair[list].length; j++){
        if(pair[list][j])
          spec.encodings[pair[key]] = pair[list][j];
        else
          delete spec.encodings[pair[key]];
        addTemplateVariation(spec, encodingPairs, i+1, output);
      }
    }

    function groupSatisfyFieldTypeCount(fieldTypeCount){
      return _.any(this, function(template){
        return template.satisfyFieldTypeCount(fieldTypeCount);
      });
    }

    return function(spec){
      var encodingPairs = _(spec.encodings).pairs().filter(function(e){
        return _.isArray(e[list]);   //FIXME(kanitw): I forget why I need to check the pair here?
      }).value();

      var group = [];
      addTemplateVariation(spec, encodingPairs, 0, group);

      templates.push.apply(templates, group);
      group.satisfyFieldTypeCount = groupSatisfyFieldTypeCount;
      groups[spec.id] = group;
    };
  })();

  specs.forEach(addTemplate);

  templates.IDS = _.pluck(templates, "id");
  // console.log(templates.IDS);


  // make this array also works as dictionary!
  templates.forEach(function(t){
    templates[t.id] = t;
  });

  templates.GROUPS = groups;

  templates.findByDataTypes = function(typeCountMap){
    return _(this).filter(function(ct){
      return ct.satisfyFieldTypeCount(typeCountMap);
    }).value();
  };

  templates.generateCharts = function(fields, flat, typeCountMap){
    typeCountMap = typeCountMap || _.reduce(fields, function(m, x){
      var t = x.dataType;
      m[t] = (m[t] || 0) + 1;
      return m;
    },{});

    // console.log("typeCountMap", this.findByDataTypes(typeCountMap));

    var chartsGroup = this.findByDataTypes(typeCountMap).map(function(template){
        return template.generateCharts(fields);
      });

    return flat ? _.flatten(chartsGroup) : chartsGroup;
  };

  return templates;
}));