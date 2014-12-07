// Define module using Universal Module Definition pattern
// https://github.com/umdjs/umd/blob/master/returnExports.js

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['vega', 'vegalite', 'clusterfck'], factory);
  } else if (typeof exports === 'object') {
    // Node. Does not work with strict CommonJS, but
    // only CommonJS-like environments that support module.exports,
    // like Node.
    module.exports = factory(
      require('vega'),
      require('vegalite'),
      require('clusterfck')
    );
  } else {
    // Browser globals (root is window)
    root.vgn = factory(root.vg, root.vl, root.clusterfck);
  }
}(this, function (vg, vl, clusterfck) {
  var vgn = {}; //VisGeN

  vgn.DEFAULT_OPT = {
    /**
     * Eliminate all transpose
     * - keeping horizontal dot plot only.
     * - for OxQ charts, always put O on Y
     */
    omitTranpose: false,
    /** remove all dot plot with >1 encoding */
    omitDotPlotWithExtraEncoding: false

  };

  var ENCODING_TYPES = ["x", "y", "row", "col", "size", "shape", "color", "alpha"]; //geo

  var CHART_TYPES = {
    TABLE: 'TABLE',
    BAR: 'BAR',
    PLOT: 'PLOT',
    LINE: 'LINE',
    AREA: 'AREA',
    MAP: 'MAP',
    HISTOGRAM: 'HISTOGRAM'
  };

  var MARK_TYPES = ["point", "bar", "line", "area",  "text"]; //filled_map

  var ANY_DATA_TYPES= (1<<4)-1;

  // BEGINING OF RULES

  // each mark type support different sets of encodings
  var encodingSupport = {
    point: dict(["x", "y", "size", "shape", "color", "alpha"]),
    bar: dict(["x", "y", "size", "color", "alpha"]),
    line: dict(["x", "y", "color", "alpha"]),
    area: dict(["x", "y", "color", "alpha"]),
    circle: dict(["x", "y", "size", "color", "alpha"]),
    square: dict(["x", "y", "size", "color", "alpha"]),
    text: dict(["x", "y", "size", "color", "alpha", "text"])
  };

  // only point, circle, square, support aggregate well
  //TODO markTypesAggregateSupport

  var encodingRequirement = {
    bar: ["x", "y"],
    line: ["x", "y"],
    area: ["x", "y"],
    text: ["text"]
  };

  var marksRule = {
    point: pointRule,
    bar: barRule,
    line: lineRule,
    area: lineRule
  };


  function pointRule(enc, opt){
    if(enc.x && enc.y){
      // shape doesn't work with both x, y as ordinal
      if(enc.shape && enc.x.type == "O" && enc.y.type == "O"){
        return false;
      }
    }else{ // plot with one axis = dot plot

      // Dot plot should always be horizontal
      if(enc.y) return false;

      // dot plot shouldn't have other encoding
      if(opt.omitDotPlotWithExtraEncoding && vl.keys(enc).length > 1) return false;

      // dot plot with shape is non-sense
      if (enc.shape) return false;
    }
    return true;
  }

  function barRule(enc){
    // Bar Chart requires at least one aggregate
    var hasAgg = false;
    for(var e in enc){
      if(enc[e].aggr){
        hasAgg = true;
        break;
      }
    }
    return hasAgg;
  }

  function lineRule(enc){
    // Line chart should be only horizontal
    return enc.x == "T" && enc.y == "Q";
  }

  var ENCODING_RULES = {
    x: {
      dataTypes: vl.dataTypes.O + vl.dataTypes.Q + vl.dataTypes.T,
      multiple: true //FIXME should allow multiple only for Q
    },
    y: {
      dataTypes: vl.dataTypes.O + vl.dataTypes.Q + vl.dataTypes.T,
      multiple: true //FIXME should allow multiple only for Q
    },
    row: {
      dataTypes: vl.dataTypes.O,
      multiple: true
    },
    col: {
      dataTypes: vl.dataTypes.O,
      multiple: true
    },
    shape: {
      dataTypes: vl.dataTypes.O
    },
    size: {
      dataTypes: vl.dataTypes.Q
    },
    color: {
      dataTypes: vl.dataTypes.O + vl.dataTypes.Q
    },
    alpha: {
      dataTypes: vl.dataTypes.Q
    },
    text: {
      dataTypes: ANY_DATA_TYPES
    }
    //geo: {
    //  dataTypes: [vl.dataTypes.G]
    //},
    //arc: { // pie
    //
    //}
  };

  var AGGREGATION_FN = { //all possible aggregate function listed by each data type
    Q: ["avg", "sum", "min", "max", "count"]
  };

  var TRANSFORM_FN = { //all possible transform function listed by each data type
    Q: ["log", "sqrt", "abs"], // "logit?"
    T: ["year","month","day"] //,"hr", "min", "bmon", "bday", "bdow", "bhr"]
  };

  // END OF RULES

  /**
   * make a membership map from the input array
   */
  function dict(arr){
    var o={};
    for(var i in arr){
      o[arr[i]] = true;
    }
    return o;
  }

  var json = function(s,sp){ return JSON.stringify(s, null, sp);};

  vgn.generateCharts = function (fields, marktypes, cfg, flat, opt){
    marktypes = marktypes || MARK_TYPES; // assign * if there is no constraints

    opt = opt ? vl.keys(opt).reduce(function(c ,k){ //merge with default
      c[k] = opt[k];
      return c;
    }, Object.create(vgn.DEFAULT_OPT)) : Object.create(vgn.DEFAULT_OPT)

    // generate permutation of encoding mappings
    var encodings = vgn._generateEncodings(fields);

    //console.log("encodings", encodings.map(JSON.stringify));

    var chartGroups = encodings.map(function(enc){
      return vgn._getSupportedMarkTypes(enc, opt)
        .map(function(markType){
          return { marktype: markType, enc: enc, cfg: cfg };
        });
    });

    return flat ?
      [].concat.apply([], chartGroups) //flatten
      : chartGroups.filter(function(grp){ return grp.length > 0;}); //return non-empty groups
  };

  // Begin of Distance

  var DIST_BY_ENCTYPE = [
    ["x", "y", 0.6],
    ["color", "shape", 0.7],
    ["row", "col", 0.6],
    ["color", "alpha", 0.6]
  ].reduce(function(r, x){
    var a=x[0], b=x[1], d=x[2];
    r[a] = r[a] || {};
    r[b] = r[b] || {};
    r[a][b] = r[b][a] = d;
    return r;
  }, {}),
    DIST_MISSING = 100, CLUSTER_THRESHOLD=2;


  function colenc(encoding){
    var colenc = {},
      enc = encoding.enc;

    vl.keys(enc).forEach(function(encType){
      var e = vl.duplicate(enc[encType]);
      e.type = encType;
      colenc[e.name || ""] = e;
      delete e.name;
    });

    return {
      marktype: encoding.marktype,
      col: colenc
    };
  }

  vgn._getDistance = function(colenc1, colenc2){
    var cols = union(vl.keys(colenc1.col), vl.keys(colenc2.col)),
      dist = 0;

    cols.forEach(function(col){
      var e1 = colenc1.col[col], e2 = colenc2.col[col];

      if(e1 && e2){
        if(e1.type != e2.type){
          dist += (DIST_BY_ENCTYPE[e1.type]||{})[e2.type] || 1;
        }
        //FIXME add aggregation
      }else{
        dist += DIST_MISSING;
      }
    })
    return dist;
  }

  vgn.getDistanceTable = function(encodings){
    var len = encodings.length,
      colencs = encodings.map(function(e){ return colenc(e);}),
      diff = new Array(len), i;

    for(i=0; i<len; i++) diff[i] = new Array(len);

    for(i=0 ; i<len; i++){
      for(j=i+1; j<len; j++){
        diff[j][i] = diff[i][j] = vgn._getDistance(colencs[i], colencs[j]);
      }
    }
    return diff;
  }

  vgn.cluster = function(encodings, maxDistance){
    var dist = vgn.getDistanceTable(encodings),
      n = encodings.length;

    var clusterTrees = clusterfck.hcluster(range(n), function(i, j){
      return dist[i][j];
    }, "average", CLUSTER_THRESHOLD);

    var clusters = clusterTrees.map(function(tree){
      return traverse(tree, []);
    })

    console.log("clusters", clusters.map(function(c){ return c.join("+"); }));
    return clusters;
  }

  function traverse(node, arr){
    if(node.value !== undefined){
      arr.push(node.value);
    }else{
      if(node.left) traverse(node.left, arr)
      if(node.right) traverse(node.right, arr);
    }
    return arr;
  }


  //TODO(kanitw): write test case
  vgn._getSupportedMarkTypes = function(enc, opt){
    var markTypes = MARK_TYPES.filter(function(markType){
      var reqs = encodingRequirement[markType],
        support = encodingSupport[markType];

      for(var i in reqs){ // all required encodings in enc
        var req = reqs[i];
        if(! (req in enc)) return false;
      }

      for(var encType in enc){ // all encodings in enc are supported
        if(!(encType in support)) return false;
      }

      return !marksRule[markType] || marksRule[markType](enc, opt);
    });

    //console.log('enc:', json(enc), " ~ marks:", markTypes);

    return markTypes;
  };

  //TODO(kanitw): write test case
  vgn._generateEncodings = function (fields){ // generate encodings (_enc property in vega)
    var encodings=[], tmpEnc = {};

    function assignField(i){
      // If all fields are assigned, save
      if(i===fields.length){
        // at the minimal all chart should have x, y, geo, text or arc
        if("x" in tmpEnc ||
          "y" in tmpEnc ||
          "geo" in tmpEnc ||
          "text" in tmpEnc ||
          "arc" in tmpEnc
        ){
          encodings.push(vg.duplicate(tmpEnc));
        }
        return;
      }

      // Otherwise, assign i-th field
      var field = fields[i];

      // TODO(kanitw): Aggregation
      // TODO(kanitw): Bin

      for(var j in ENCODING_TYPES){
        var et = ENCODING_TYPES[j];

        //TODO: support "multiple" assignment
        if(!(et in tmpEnc) &&
          ENCODING_RULES[et].dataTypes & vl.dataTypes[field.type] > 0){
          tmpEnc[et] = field;
          assignField(i+1);
          delete tmpEnc[et];
        }
      }
    }

    assignField(0);

    return encodings;
  };

  // UTILITY

  function union(a,b){
    var o = {};
    a.forEach(function(x){ o[x] = true;});
    b.forEach(function(x){ o[x] = true;});
    return vl.keys(o);
  }

  var abs = Math.abs;

  function range(start, stop, step) {
    if (arguments.length < 3) {
      step = 1;
      if (arguments.length < 2) {
        stop = start;
        start = 0;
      }
    }
    if ((stop - start) / step === Infinity) throw new Error("infinite range");
    var range = [], k = d3_range_integerScale(abs(step)), i = -1, j;
    start *= k, stop *= k, step *= k;
    if (step < 0) while ((j = start + step * ++i) > stop) range.push(j / k); else while ((j = start + step * ++i) < stop) range.push(j / k);
    return range;
  };

  function d3_range_integerScale(x) {
    var k = 1;
    while (x * k % 1) k *= 10;
    return k;
  }

  return vgn;
}));