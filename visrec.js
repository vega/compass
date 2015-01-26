!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.vr=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var vr = module.exports = {};

vr.gen = require('./visgen');
vr.rank = require('./visrank');


},{"./visgen":2,"./visrank":3}],2:[function(require,module,exports){
(function (global){
var vl = (typeof window !== "undefined" ? window.vl : typeof global !== "undefined" ? global.vl : null),
  clusterfck = (typeof window !== "undefined" ? window.clusterfck : typeof global !== "undefined" ? global.clusterfck : null);

var vgn = module.exports = {}; //VisGeN

vgn.DEFAULT_OPT = {
  genAggr: true,
  genBin: true,
  genTypeCasting: false,

  aggrList: [undefined, "avg"], //undefined = no aggregation
  marktypeList: ["point", "bar", "line", "area", "text"], //filled_map

  // PRUNING RULES FOR ENCODING VARIATIONS

  /**
   * Eliminate all transpose
   * - keeping horizontal dot plot only.
   * - for OxQ charts, always put O on Y
   * - show only one OxO, QxQ (currently sorted by name)
   */
  omitTranpose: true,
  /** remove all dot plot with >1 encoding */
  omitDotPlotWithExtraEncoding: true,

  /** remove all aggregate charts with all dims on facets (row, col) */
  //FIXME this is good for text though!
  omitAggrWithAllDimsOnFacets: true,

  // PRUNING RULES FOR TRANFORMATION VARIATIONS

  /** omit field sets with only dimensions */
  omitDimensionOnly: true,
  /** omit aggregate field sets with only measures */
  omitAggregateWithMeasureOnly: true

};

var ENCODING_TYPES = vl.encodingTypes;

var CHART_TYPES = {
  TABLE: 'TABLE',
  BAR: 'BAR',
  PLOT: 'PLOT',
  LINE: 'LINE',
  AREA: 'AREA',
  MAP: 'MAP',
  HISTOGRAM: 'HISTOGRAM'
};

var ANY_DATA_TYPES = (1 << 4) - 1;

//FIXME move these to vl
var AGGREGATION_FN = { //all possible aggregate function listed by each data type
  Q: ["avg", "sum", "min", "max", "count"]
};

var TRANSFORM_FN = { //all possible transform function listed by each data type
  Q: ["log", "sqrt", "abs"], // "logit?"
  T: ["year", "month", "day"] //,"hr", "min", "bmon", "bday", "bdow", "bhr"]
};

var json = function(s,sp){ return JSON.stringify(s, null, sp);};

// Begin of Distance

var DIST_BY_ENCTYPE = [
    // positional
    ["x", "y", 0.2],
    ["row", "col", 0.2],

    // ordinal mark properties
    ["color", "shape", 0.2],

    // quantitative mark properties
    ["color", "alpha", 0.2],
    ["size", "alpha", 0.2],
    ["size", "color", 0.2]
  ].reduce(function(r, x) {
  var a=x[0], b=x[1], d=x[2];
    r[a] = r[a] || {};
    r[b] = r[b] || {};
    r[a][b] = r[b][a] = d;
    return r;
  }, {}),
  DIST_MISSING = 100, CLUSTER_THRESHOLD=1;

function colenc(encoding) {
  var _colenc = {},
    enc = encoding.enc;

  vl.keys(enc).forEach(function(encType) {
    var e = vl.duplicate(enc[encType]);
    e.type = encType;
    _colenc[e.name || ""] = e;
    delete e.name;
  });

  return {
    marktype: encoding.marktype,
    col: _colenc
  };
}

vgn._getDistance = function(colenc1, colenc2) {
  var cols = union(vl.keys(colenc1.col), vl.keys(colenc2.col)),
    dist = 0;

  cols.forEach(function(col) {
    var e1 = colenc1.col[col], e2 = colenc2.col[col];

    if (e1 && e2) {
      if (e1.type != e2.type) {
        dist += (DIST_BY_ENCTYPE[e1.type] || {})[e2.type] || 1;
      }
      //FIXME add aggregation
    } else {
      dist += DIST_MISSING;
    }
  });
  return dist;
};

vgn.getDistanceTable = function(encodings) {
  var len = encodings.length,
    colencs = encodings.map(function(e){ return colenc(e);}),
    diff = new Array(len), i;

  for (i = 0; i < len; i++) diff[i] = new Array(len);

  for (i = 0; i < len; i++) {
    for (j = i + 1; j < len; j++) {
      diff[j][i] = diff[i][j] = vgn._getDistance(colencs[i], colencs[j]);
    }
  }
  return diff;
};

vgn.cluster = function(encodings, maxDistance) {
  var dist = vgn.getDistanceTable(encodings),
    n = encodings.length;

  var clusterTrees = clusterfck.hcluster(range(n), function(i, j) {
    return dist[i][j];
  }, "average", CLUSTER_THRESHOLD);

  var clusters = clusterTrees.map(function(tree) {
    return traverse(tree, []);
  });

  //console.log("clusters", clusters.map(function(c){ return c.join("+"); }));
  return clusters;
};

function traverse(node, arr) {
  if (node.value !== undefined) {
    arr.push(node.value);
  } else {
    if (node.left) traverse(node.left, arr);
    if (node.right) traverse(node.right, arr);
  }
  return arr;
}

// End of Clustering


// BEGINING OF RULES

//TODO markTypesAggregateSupport

var marksRule = vgn.marksRule = generalRule;
marksRule.point = pointRule;
marksRule.bar = barRule;
marksRule.line = lineRule;
marksRule.area = lineRule;

function isDim(field){
  return field.bin || field.type === "O";
}

function xOyQ(enc) {
  return enc.x && enc.y && isDim(enc.x) && isDim(enc.y);
}

function generalRule(enc, opt) {
  // need at least one basic encoding
  if (enc.x || enc.y || enc.geo || enc.text || enc.arc) {

    if (enc.x && enc.y) {
      // show only one OxO, QxQ
      if (opt.omitTranpose && enc.x.type == enc.y.type) {
        //TODO better criteria than name
        if (enc.x.name > enc.y.name) return false;
      }
    }

    if (enc.row || enc.col) { //have facet(s)
      // don't use facets before filling up x,y
      if ((!enc.x || !enc.y)) return false;

      if (opt.omitAggrWithAllDimsOnFacets) {
        // don't use facet with aggregate plot with other other ordinal on LOD

        var hasAggr = false, hasOtherO = false;
        for (var encType in enc) {
          var field = enc[encType];
          if (field.aggr) {
            hasAggr = true;
          }
          if (isDim(field) && (encType !== "row" && encType !== "col")) {
            hasOtherO = true;
          }
          if (hasAggr && hasOtherO) break;
        }

        if (hasAggr && !hasOtherO) return false;
      }
    }

    // one dimension "count" is useless
    if (enc.x && enc.x.aggr == "count" && !enc.y) return false;
    if (enc.y && enc.y.aggr == "count" && !enc.x) return false;

    return true;
  }
  return false;
}

function pointRule(enc, opt) {
  if (enc.x && enc.y) {
    // have both x & y ==> scatter plot / bubble plot

    // For OxQ
    if (opt.omitTranpose && xOyQ(enc)) {
      // if omitTranpose, put Q on X, O on Y
      return false;
    }

    // For OxO
    if (isDim(enc.x) && isDim(enc.y)) {
      // shape doesn't work with both x, y as ordinal
      if (enc.shape) {
        return false;
      }

      // TODO(kanitw): check that there is quant at least ...
      if (enc.color && isDim(enc.color)) {
        return false;
      }
    }

  } else { // plot with one axis = dot plot
    // Dot plot should always be horizontal
    if (opt.omitTranpose && enc.y) return false;

    // dot plot shouldn't have other encoding
    if (opt.omitDotPlotWithExtraEncoding && vl.keys(enc).length > 1) return false;

    // dot plot with shape is non-sense
    if (enc.shape) return false;
  }
  return true;
}

function barRule(enc, opt) {
  // need to aggregate on either x or y
  if ((enc.x.aggr !== undefined) ^ (enc.y.aggr !== undefined)) {

    // if omitTranpose, put Q on X, O on Y
    if (opt.omitTranpose && xOyQ(enc)) return false;

    return true;
  }

  return false;
}

function lineRule(enc, opt) {
  // TODO(kanitw): add omitVerticalLine as config

  // Line chart should be only horizontal
  // and use only temporal data
  return enc.x == "T" && enc.y == "Q";
}

var ENCODING_RULES = {
  x: {
    dataTypes: vl.dataTypes.O + vl.dataTypes.Q + vl.dataTypes.T,
    multiple: true //FIXME should allow multiple only for Q, T
  },
  y: {
    dataTypes: vl.dataTypes.O + vl.dataTypes.Q + vl.dataTypes.T,
    multiple: true //FIXME should allow multiple only for Q, T
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

// END OF RULES

// Beginning of Chart Generation

var nonEmpty = function(grp) {
  return !isArray(grp) || grp.length > 0;
};

function nestedMap(col, f, level, filter) {
  return level === 0 ?
    col.map(f) :
    col.map(function(v) {
      var r = nestedMap(v, f, level - 1);
      return filter ? r.filter(nonEmpty) : r;
    });
}

function nestedReduce(col, f, level, filter) {
  return level === 0 ?
    col.reduce(f, []) :
    col.map(function(v) {
      var r = nestedReduce(v, f, level - 1);
      return filter ? r.filter(nonEmpty) : r;
    });
}

function getopt(opt) {
  //merge with default
  return (opt ? vl.keys(opt) : []).reduce(function(c, k) {
    c[k] = opt[k];
    return c;
  }, Object.create(vgn.DEFAULT_OPT));
}

vgn.generateCharts = function(fields, opt, cfg, flat) {
  opt = getopt(opt);
  flat = flat === undefined ? {encodings: 1} : flat;

  // TODO generate

  // generate permutation of encoding mappings
  var fieldSets = opt.genAggr ? vgn.genAggregate([], fields, opt) : [fields],
    encodings, charts, level = 0;

  if (flat === true || (flat && flat.aggr)) {
    encodings = fieldSets.reduce(function(output, fields) {
      return vgn.genFieldEncodings(output, fields, opt);
    }, []);
  } else {
    encodings = fieldSets.map(function(fields) {
      return vgn.genFieldEncodings([], fields, opt);
    }, true);
    level += 1;
  }

  if (flat === true || (flat && flat.encodings)) {
    charts = nestedReduce(encodings, function(output, encodings) {
      return vgn.genMarkTypes(output, encodings, opt, cfg);
    }, level, true);
  } else {
    charts = nestedMap(encodings, function(encodings) {
      return vgn.genMarkTypes([], encodings, opt, cfg);
    }, level, true);
    level += 1;
  }
  return charts;
};


vgn.genMarkTypes = function(output, enc, opt, cfg) {
  opt = getopt(opt);
  vgn._getSupportedMarkTypes(enc, opt)
    .forEach(function(markType) {
      output.push({ marktype: markType, enc: enc, cfg: cfg });
    });
  return output;
};

//TODO(kanitw): write test case
vgn._getSupportedMarkTypes = function(enc, opt) {
  var markTypes = opt.marktypeList.filter(function(markType) {
    var mark = vl.marks[markType],
      reqs = mark.requiredEncoding,
      support = mark.supportedEncoding;

    for (var i in reqs) { // all required encodings in enc
      if (!(reqs[i] in enc)) return false;
    }

    for (var encType in enc) { // all encodings in enc are supported
      if (!support[encType]) return false;
    }

    return !marksRule[markType] || marksRule[markType](enc, opt);
  });

  //console.log('enc:', json(enc), " ~ marks:", markTypes);

  return markTypes;
};

vgn.genAggregate = function(output, fields, opt) {
  var tf = new Array(fields.length);
  opt = getopt(opt);

  function assignField(i, hasAggr) {
    // If all fields are assigned, save
    if (i === fields.length) {
      if(opt.omitAggregateWithMeasureOnly || opt.omitDimensionOnly){
        var hasMeasure=false, hasDimension=false, hasRaw=false;
        tf.forEach(function(f){
          if (isDim(f)) {
            hasDimension = true;
          } else {
            hasMeasure = true;
            if(!f.aggr) hasRaw = true;
          }
        });
        if(!hasMeasure && opt.omitDimensionOnly) return;
        if(!hasDimension && !hasRaw && opt.omitAggregateWithMeasureOnly) return;
      }

      output.push(vl.duplicate(tf));
      return;
    }

    var f = fields[i];

    // Otherwise, assign i-th field
    switch (f.type) {
      //TODO "D", "G"
      case "Q":
        tf[i] = {name: f.name, type: f.type};
        if (f.aggr) {
          tf[i].aggr = f.aggr;
          assignField(i + 1, true);
        } else if (f._aggr) {
          var aggregates = f._aggr == "*" ? opt.aggrList : f._aggr;

          for (var j in aggregates) {
            var a = aggregates[j];
            if (a !== undefined) {
              if (hasAggr === true || hasAggr === null) {
                // must be aggregated, or no constraint
                //set aggregate to that one
                tf[i].aggr = a;
                assignField(i + 1, true);
              }
            } else { // if(a === undefined)
              if (hasAggr === false || hasAggr === null) {
                // must be raw plot, or no constraint
                delete tf[i].aggr;
                assignField(i + 1, false);
              }
            }
          }

          if (opt.genBin) {
            // bin the field instead!
            delete tf[i].aggr;
            tf[i].bin = true;
            tf[i].type = "Q";
            assignField(i + 1, hasAggr);
          }

          if (opt.genTypeCasting) {
            // we can also change it to dimension (cast type="O")
            delete tf[i].aggr;
            delete tf[i].bin;
            tf[i].type = "O";
            assignField(i + 1, hasAggr);
          }
        } else { // both "aggr", "_aggr" not in f
          assignField(i + 1, false);
        }
        break;

      case "O":
      default:
        tf[i] = f;
        assignField(i + 1, hasAggr);
        break;
    }

  }

  assignField(0, null);

  return output;
};

//TODO(kanitw): write test case
vgn.genFieldEncodings = function(encodings, fields, opt) { // generate encodings (_enc property in vega)
  var tmpEnc = {};

  function assignField(i) {
    // If all fields are assigned, save
    if (i === fields.length) {
      // at the minimal all chart should have x, y, geo, text or arc
      if (marksRule(tmpEnc, opt)) {
        encodings.push(vl.duplicate(tmpEnc));
      }
      return;
    }

    // Otherwise, assign i-th field
    var field = fields[i];
    for (var j in ENCODING_TYPES) {
      var et = ENCODING_TYPES[j];

      //TODO: support "multiple" assignment
      if (!(et in tmpEnc) &&
        (ENCODING_RULES[et].dataTypes & vl.dataTypes[field.type]) > 0) {
        tmpEnc[et] = field;
        assignField(i + 1);
        delete tmpEnc[et];
      }
    }
  }

  assignField(0);

  return encodings;
};

// UTILITY

var isArray = Array.isArray || function(obj) {
  return toString.call(obj) == '[object Array]';
};

function union(a, b) {
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
  start *= k; stop *= k; step *= k;
  if (step < 0) while ((j = start + step * ++i) > stop) range.push(j / k); else while ((j = start + step * ++i) < stop) range.push(j / k);
  return range;
}

function d3_range_integerScale(x) {
  var k = 1;
  while (x * k % 1) k *= 10;
  return k;
}
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],3:[function(require,module,exports){
(function (global){
var vl = (typeof window !== "undefined" ? window.vl : typeof global !== "undefined" ? global.vl : null);

var vrank = module.exports = {};

//TODO lower score if we use G as O?
var ENCODING_SCORE = {
  Q: {
    x: 1,
    y: 1,
    size: 0.6, //FIXME SIZE for Bar is horrible!
    color: 0.4,
    alpha: 0.4
  },
  O: { // TODO need to take cardinality into account
    x: 0.99, // harder to read axis
    y: 1,
    row: 0.7,
    col: 0.7,
    color: 0.8,
    shape: 0.6
  }
};

// bad score not specified in the table above
var BAD_ENCODING_SCORE = 0.01,
  UNUSED_POSITION = 0.5;

var MARK_SCORE = {
  line: 0.99,
  area: 0.98,
  bar: 0.97,
  point: 0.96,
  circle: 0.95,
  square: 0.95,
  text: 0.8
};

vrank.encodingScore = function(encoding){
  var features = {},
    encTypes = vl.keys(encoding.enc);
  encTypes.forEach(function(encType){
    var field = encoding.enc[encType];
    features[field.name] = {
      value: field.type+":"+encType,
      score: ENCODING_SCORE[field.type][encType] || BAD_ENCODING_SCORE
    };
  });

  // penalize not using positional
  if(encTypes.length > 1){
    if((!encoding.enc.x || !encoding.enc.y) && !encoding.enc.geo) {
      features.unusedPosition = {score: UNUSED_POSITION};
    }
  }

  features.markType = {
    value: encoding.marktype,
    score: MARK_SCORE[encoding.marktype]
  }

  return {
    score: vl.keys(features).reduce(function(p, s){ return p * features[s].score}, 1),
    features: features
  };
};


// raw > avg, sum > min,max > bin

vrank.fieldsScore = function(fields){

};


}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvdnIiLCJzcmMvdmlzZ2VuLmpzIiwic3JjL3Zpc3JhbmsuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3prQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgdnIgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG52ci5nZW4gPSByZXF1aXJlKCcuL3Zpc2dlbicpO1xudnIucmFuayA9IHJlcXVpcmUoJy4vdmlzcmFuaycpO1xuXG4iLCJ2YXIgdmwgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdy52bCA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwudmwgOiBudWxsKSxcbiAgY2x1c3RlcmZjayA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93LmNsdXN0ZXJmY2sgOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLmNsdXN0ZXJmY2sgOiBudWxsKTtcblxudmFyIHZnbiA9IG1vZHVsZS5leHBvcnRzID0ge307IC8vVmlzR2VOXG5cbnZnbi5ERUZBVUxUX09QVCA9IHtcbiAgZ2VuQWdncjogdHJ1ZSxcbiAgZ2VuQmluOiB0cnVlLFxuICBnZW5UeXBlQ2FzdGluZzogZmFsc2UsXG5cbiAgYWdnckxpc3Q6IFt1bmRlZmluZWQsIFwiYXZnXCJdLCAvL3VuZGVmaW5lZCA9IG5vIGFnZ3JlZ2F0aW9uXG4gIG1hcmt0eXBlTGlzdDogW1wicG9pbnRcIiwgXCJiYXJcIiwgXCJsaW5lXCIsIFwiYXJlYVwiLCBcInRleHRcIl0sIC8vZmlsbGVkX21hcFxuXG4gIC8vIFBSVU5JTkcgUlVMRVMgRk9SIEVOQ09ESU5HIFZBUklBVElPTlNcblxuICAvKipcbiAgICogRWxpbWluYXRlIGFsbCB0cmFuc3Bvc2VcbiAgICogLSBrZWVwaW5nIGhvcml6b250YWwgZG90IHBsb3Qgb25seS5cbiAgICogLSBmb3IgT3hRIGNoYXJ0cywgYWx3YXlzIHB1dCBPIG9uIFlcbiAgICogLSBzaG93IG9ubHkgb25lIE94TywgUXhRIChjdXJyZW50bHkgc29ydGVkIGJ5IG5hbWUpXG4gICAqL1xuICBvbWl0VHJhbnBvc2U6IHRydWUsXG4gIC8qKiByZW1vdmUgYWxsIGRvdCBwbG90IHdpdGggPjEgZW5jb2RpbmcgKi9cbiAgb21pdERvdFBsb3RXaXRoRXh0cmFFbmNvZGluZzogdHJ1ZSxcblxuICAvKiogcmVtb3ZlIGFsbCBhZ2dyZWdhdGUgY2hhcnRzIHdpdGggYWxsIGRpbXMgb24gZmFjZXRzIChyb3csIGNvbCkgKi9cbiAgLy9GSVhNRSB0aGlzIGlzIGdvb2QgZm9yIHRleHQgdGhvdWdoIVxuICBvbWl0QWdncldpdGhBbGxEaW1zT25GYWNldHM6IHRydWUsXG5cbiAgLy8gUFJVTklORyBSVUxFUyBGT1IgVFJBTkZPUk1BVElPTiBWQVJJQVRJT05TXG5cbiAgLyoqIG9taXQgZmllbGQgc2V0cyB3aXRoIG9ubHkgZGltZW5zaW9ucyAqL1xuICBvbWl0RGltZW5zaW9uT25seTogdHJ1ZSxcbiAgLyoqIG9taXQgYWdncmVnYXRlIGZpZWxkIHNldHMgd2l0aCBvbmx5IG1lYXN1cmVzICovXG4gIG9taXRBZ2dyZWdhdGVXaXRoTWVhc3VyZU9ubHk6IHRydWVcblxufTtcblxudmFyIEVOQ09ESU5HX1RZUEVTID0gdmwuZW5jb2RpbmdUeXBlcztcblxudmFyIENIQVJUX1RZUEVTID0ge1xuICBUQUJMRTogJ1RBQkxFJyxcbiAgQkFSOiAnQkFSJyxcbiAgUExPVDogJ1BMT1QnLFxuICBMSU5FOiAnTElORScsXG4gIEFSRUE6ICdBUkVBJyxcbiAgTUFQOiAnTUFQJyxcbiAgSElTVE9HUkFNOiAnSElTVE9HUkFNJ1xufTtcblxudmFyIEFOWV9EQVRBX1RZUEVTID0gKDEgPDwgNCkgLSAxO1xuXG4vL0ZJWE1FIG1vdmUgdGhlc2UgdG8gdmxcbnZhciBBR0dSRUdBVElPTl9GTiA9IHsgLy9hbGwgcG9zc2libGUgYWdncmVnYXRlIGZ1bmN0aW9uIGxpc3RlZCBieSBlYWNoIGRhdGEgdHlwZVxuICBROiBbXCJhdmdcIiwgXCJzdW1cIiwgXCJtaW5cIiwgXCJtYXhcIiwgXCJjb3VudFwiXVxufTtcblxudmFyIFRSQU5TRk9STV9GTiA9IHsgLy9hbGwgcG9zc2libGUgdHJhbnNmb3JtIGZ1bmN0aW9uIGxpc3RlZCBieSBlYWNoIGRhdGEgdHlwZVxuICBROiBbXCJsb2dcIiwgXCJzcXJ0XCIsIFwiYWJzXCJdLCAvLyBcImxvZ2l0P1wiXG4gIFQ6IFtcInllYXJcIiwgXCJtb250aFwiLCBcImRheVwiXSAvLyxcImhyXCIsIFwibWluXCIsIFwiYm1vblwiLCBcImJkYXlcIiwgXCJiZG93XCIsIFwiYmhyXCJdXG59O1xuXG52YXIganNvbiA9IGZ1bmN0aW9uKHMsc3ApeyByZXR1cm4gSlNPTi5zdHJpbmdpZnkocywgbnVsbCwgc3ApO307XG5cbi8vIEJlZ2luIG9mIERpc3RhbmNlXG5cbnZhciBESVNUX0JZX0VOQ1RZUEUgPSBbXG4gICAgLy8gcG9zaXRpb25hbFxuICAgIFtcInhcIiwgXCJ5XCIsIDAuMl0sXG4gICAgW1wicm93XCIsIFwiY29sXCIsIDAuMl0sXG5cbiAgICAvLyBvcmRpbmFsIG1hcmsgcHJvcGVydGllc1xuICAgIFtcImNvbG9yXCIsIFwic2hhcGVcIiwgMC4yXSxcblxuICAgIC8vIHF1YW50aXRhdGl2ZSBtYXJrIHByb3BlcnRpZXNcbiAgICBbXCJjb2xvclwiLCBcImFscGhhXCIsIDAuMl0sXG4gICAgW1wic2l6ZVwiLCBcImFscGhhXCIsIDAuMl0sXG4gICAgW1wic2l6ZVwiLCBcImNvbG9yXCIsIDAuMl1cbiAgXS5yZWR1Y2UoZnVuY3Rpb24ociwgeCkge1xuICB2YXIgYT14WzBdLCBiPXhbMV0sIGQ9eFsyXTtcbiAgICByW2FdID0gclthXSB8fCB7fTtcbiAgICByW2JdID0gcltiXSB8fCB7fTtcbiAgICByW2FdW2JdID0gcltiXVthXSA9IGQ7XG4gICAgcmV0dXJuIHI7XG4gIH0sIHt9KSxcbiAgRElTVF9NSVNTSU5HID0gMTAwLCBDTFVTVEVSX1RIUkVTSE9MRD0xO1xuXG5mdW5jdGlvbiBjb2xlbmMoZW5jb2RpbmcpIHtcbiAgdmFyIF9jb2xlbmMgPSB7fSxcbiAgICBlbmMgPSBlbmNvZGluZy5lbmM7XG5cbiAgdmwua2V5cyhlbmMpLmZvckVhY2goZnVuY3Rpb24oZW5jVHlwZSkge1xuICAgIHZhciBlID0gdmwuZHVwbGljYXRlKGVuY1tlbmNUeXBlXSk7XG4gICAgZS50eXBlID0gZW5jVHlwZTtcbiAgICBfY29sZW5jW2UubmFtZSB8fCBcIlwiXSA9IGU7XG4gICAgZGVsZXRlIGUubmFtZTtcbiAgfSk7XG5cbiAgcmV0dXJuIHtcbiAgICBtYXJrdHlwZTogZW5jb2RpbmcubWFya3R5cGUsXG4gICAgY29sOiBfY29sZW5jXG4gIH07XG59XG5cbnZnbi5fZ2V0RGlzdGFuY2UgPSBmdW5jdGlvbihjb2xlbmMxLCBjb2xlbmMyKSB7XG4gIHZhciBjb2xzID0gdW5pb24odmwua2V5cyhjb2xlbmMxLmNvbCksIHZsLmtleXMoY29sZW5jMi5jb2wpKSxcbiAgICBkaXN0ID0gMDtcblxuICBjb2xzLmZvckVhY2goZnVuY3Rpb24oY29sKSB7XG4gICAgdmFyIGUxID0gY29sZW5jMS5jb2xbY29sXSwgZTIgPSBjb2xlbmMyLmNvbFtjb2xdO1xuXG4gICAgaWYgKGUxICYmIGUyKSB7XG4gICAgICBpZiAoZTEudHlwZSAhPSBlMi50eXBlKSB7XG4gICAgICAgIGRpc3QgKz0gKERJU1RfQllfRU5DVFlQRVtlMS50eXBlXSB8fCB7fSlbZTIudHlwZV0gfHwgMTtcbiAgICAgIH1cbiAgICAgIC8vRklYTUUgYWRkIGFnZ3JlZ2F0aW9uXG4gICAgfSBlbHNlIHtcbiAgICAgIGRpc3QgKz0gRElTVF9NSVNTSU5HO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiBkaXN0O1xufTtcblxudmduLmdldERpc3RhbmNlVGFibGUgPSBmdW5jdGlvbihlbmNvZGluZ3MpIHtcbiAgdmFyIGxlbiA9IGVuY29kaW5ncy5sZW5ndGgsXG4gICAgY29sZW5jcyA9IGVuY29kaW5ncy5tYXAoZnVuY3Rpb24oZSl7IHJldHVybiBjb2xlbmMoZSk7fSksXG4gICAgZGlmZiA9IG5ldyBBcnJheShsZW4pLCBpO1xuXG4gIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKykgZGlmZltpXSA9IG5ldyBBcnJheShsZW4pO1xuXG4gIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgIGZvciAoaiA9IGkgKyAxOyBqIDwgbGVuOyBqKyspIHtcbiAgICAgIGRpZmZbal1baV0gPSBkaWZmW2ldW2pdID0gdmduLl9nZXREaXN0YW5jZShjb2xlbmNzW2ldLCBjb2xlbmNzW2pdKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGRpZmY7XG59O1xuXG52Z24uY2x1c3RlciA9IGZ1bmN0aW9uKGVuY29kaW5ncywgbWF4RGlzdGFuY2UpIHtcbiAgdmFyIGRpc3QgPSB2Z24uZ2V0RGlzdGFuY2VUYWJsZShlbmNvZGluZ3MpLFxuICAgIG4gPSBlbmNvZGluZ3MubGVuZ3RoO1xuXG4gIHZhciBjbHVzdGVyVHJlZXMgPSBjbHVzdGVyZmNrLmhjbHVzdGVyKHJhbmdlKG4pLCBmdW5jdGlvbihpLCBqKSB7XG4gICAgcmV0dXJuIGRpc3RbaV1bal07XG4gIH0sIFwiYXZlcmFnZVwiLCBDTFVTVEVSX1RIUkVTSE9MRCk7XG5cbiAgdmFyIGNsdXN0ZXJzID0gY2x1c3RlclRyZWVzLm1hcChmdW5jdGlvbih0cmVlKSB7XG4gICAgcmV0dXJuIHRyYXZlcnNlKHRyZWUsIFtdKTtcbiAgfSk7XG5cbiAgLy9jb25zb2xlLmxvZyhcImNsdXN0ZXJzXCIsIGNsdXN0ZXJzLm1hcChmdW5jdGlvbihjKXsgcmV0dXJuIGMuam9pbihcIitcIik7IH0pKTtcbiAgcmV0dXJuIGNsdXN0ZXJzO1xufTtcblxuZnVuY3Rpb24gdHJhdmVyc2Uobm9kZSwgYXJyKSB7XG4gIGlmIChub2RlLnZhbHVlICE9PSB1bmRlZmluZWQpIHtcbiAgICBhcnIucHVzaChub2RlLnZhbHVlKTtcbiAgfSBlbHNlIHtcbiAgICBpZiAobm9kZS5sZWZ0KSB0cmF2ZXJzZShub2RlLmxlZnQsIGFycik7XG4gICAgaWYgKG5vZGUucmlnaHQpIHRyYXZlcnNlKG5vZGUucmlnaHQsIGFycik7XG4gIH1cbiAgcmV0dXJuIGFycjtcbn1cblxuLy8gRW5kIG9mIENsdXN0ZXJpbmdcblxuXG4vLyBCRUdJTklORyBPRiBSVUxFU1xuXG4vL1RPRE8gbWFya1R5cGVzQWdncmVnYXRlU3VwcG9ydFxuXG52YXIgbWFya3NSdWxlID0gdmduLm1hcmtzUnVsZSA9IGdlbmVyYWxSdWxlO1xubWFya3NSdWxlLnBvaW50ID0gcG9pbnRSdWxlO1xubWFya3NSdWxlLmJhciA9IGJhclJ1bGU7XG5tYXJrc1J1bGUubGluZSA9IGxpbmVSdWxlO1xubWFya3NSdWxlLmFyZWEgPSBsaW5lUnVsZTtcblxuZnVuY3Rpb24gaXNEaW0oZmllbGQpe1xuICByZXR1cm4gZmllbGQuYmluIHx8IGZpZWxkLnR5cGUgPT09IFwiT1wiO1xufVxuXG5mdW5jdGlvbiB4T3lRKGVuYykge1xuICByZXR1cm4gZW5jLnggJiYgZW5jLnkgJiYgaXNEaW0oZW5jLngpICYmIGlzRGltKGVuYy55KTtcbn1cblxuZnVuY3Rpb24gZ2VuZXJhbFJ1bGUoZW5jLCBvcHQpIHtcbiAgLy8gbmVlZCBhdCBsZWFzdCBvbmUgYmFzaWMgZW5jb2RpbmdcbiAgaWYgKGVuYy54IHx8IGVuYy55IHx8IGVuYy5nZW8gfHwgZW5jLnRleHQgfHwgZW5jLmFyYykge1xuXG4gICAgaWYgKGVuYy54ICYmIGVuYy55KSB7XG4gICAgICAvLyBzaG93IG9ubHkgb25lIE94TywgUXhRXG4gICAgICBpZiAob3B0Lm9taXRUcmFucG9zZSAmJiBlbmMueC50eXBlID09IGVuYy55LnR5cGUpIHtcbiAgICAgICAgLy9UT0RPIGJldHRlciBjcml0ZXJpYSB0aGFuIG5hbWVcbiAgICAgICAgaWYgKGVuYy54Lm5hbWUgPiBlbmMueS5uYW1lKSByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGVuYy5yb3cgfHwgZW5jLmNvbCkgeyAvL2hhdmUgZmFjZXQocylcbiAgICAgIC8vIGRvbid0IHVzZSBmYWNldHMgYmVmb3JlIGZpbGxpbmcgdXAgeCx5XG4gICAgICBpZiAoKCFlbmMueCB8fCAhZW5jLnkpKSByZXR1cm4gZmFsc2U7XG5cbiAgICAgIGlmIChvcHQub21pdEFnZ3JXaXRoQWxsRGltc09uRmFjZXRzKSB7XG4gICAgICAgIC8vIGRvbid0IHVzZSBmYWNldCB3aXRoIGFnZ3JlZ2F0ZSBwbG90IHdpdGggb3RoZXIgb3RoZXIgb3JkaW5hbCBvbiBMT0RcblxuICAgICAgICB2YXIgaGFzQWdnciA9IGZhbHNlLCBoYXNPdGhlck8gPSBmYWxzZTtcbiAgICAgICAgZm9yICh2YXIgZW5jVHlwZSBpbiBlbmMpIHtcbiAgICAgICAgICB2YXIgZmllbGQgPSBlbmNbZW5jVHlwZV07XG4gICAgICAgICAgaWYgKGZpZWxkLmFnZ3IpIHtcbiAgICAgICAgICAgIGhhc0FnZ3IgPSB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoaXNEaW0oZmllbGQpICYmIChlbmNUeXBlICE9PSBcInJvd1wiICYmIGVuY1R5cGUgIT09IFwiY29sXCIpKSB7XG4gICAgICAgICAgICBoYXNPdGhlck8gPSB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoaGFzQWdnciAmJiBoYXNPdGhlck8pIGJyZWFrO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGhhc0FnZ3IgJiYgIWhhc090aGVyTykgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIG9uZSBkaW1lbnNpb24gXCJjb3VudFwiIGlzIHVzZWxlc3NcbiAgICBpZiAoZW5jLnggJiYgZW5jLnguYWdnciA9PSBcImNvdW50XCIgJiYgIWVuYy55KSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKGVuYy55ICYmIGVuYy55LmFnZ3IgPT0gXCJjb3VudFwiICYmICFlbmMueCkgcmV0dXJuIGZhbHNlO1xuXG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG5mdW5jdGlvbiBwb2ludFJ1bGUoZW5jLCBvcHQpIHtcbiAgaWYgKGVuYy54ICYmIGVuYy55KSB7XG4gICAgLy8gaGF2ZSBib3RoIHggJiB5ID09PiBzY2F0dGVyIHBsb3QgLyBidWJibGUgcGxvdFxuXG4gICAgLy8gRm9yIE94UVxuICAgIGlmIChvcHQub21pdFRyYW5wb3NlICYmIHhPeVEoZW5jKSkge1xuICAgICAgLy8gaWYgb21pdFRyYW5wb3NlLCBwdXQgUSBvbiBYLCBPIG9uIFlcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvLyBGb3IgT3hPXG4gICAgaWYgKGlzRGltKGVuYy54KSAmJiBpc0RpbShlbmMueSkpIHtcbiAgICAgIC8vIHNoYXBlIGRvZXNuJ3Qgd29yayB3aXRoIGJvdGggeCwgeSBhcyBvcmRpbmFsXG4gICAgICBpZiAoZW5jLnNoYXBlKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgLy8gVE9ETyhrYW5pdHcpOiBjaGVjayB0aGF0IHRoZXJlIGlzIHF1YW50IGF0IGxlYXN0IC4uLlxuICAgICAgaWYgKGVuYy5jb2xvciAmJiBpc0RpbShlbmMuY29sb3IpKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgfSBlbHNlIHsgLy8gcGxvdCB3aXRoIG9uZSBheGlzID0gZG90IHBsb3RcbiAgICAvLyBEb3QgcGxvdCBzaG91bGQgYWx3YXlzIGJlIGhvcml6b250YWxcbiAgICBpZiAob3B0Lm9taXRUcmFucG9zZSAmJiBlbmMueSkgcmV0dXJuIGZhbHNlO1xuXG4gICAgLy8gZG90IHBsb3Qgc2hvdWxkbid0IGhhdmUgb3RoZXIgZW5jb2RpbmdcbiAgICBpZiAob3B0Lm9taXREb3RQbG90V2l0aEV4dHJhRW5jb2RpbmcgJiYgdmwua2V5cyhlbmMpLmxlbmd0aCA+IDEpIHJldHVybiBmYWxzZTtcblxuICAgIC8vIGRvdCBwbG90IHdpdGggc2hhcGUgaXMgbm9uLXNlbnNlXG4gICAgaWYgKGVuYy5zaGFwZSkgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHJldHVybiB0cnVlO1xufVxuXG5mdW5jdGlvbiBiYXJSdWxlKGVuYywgb3B0KSB7XG4gIC8vIG5lZWQgdG8gYWdncmVnYXRlIG9uIGVpdGhlciB4IG9yIHlcbiAgaWYgKChlbmMueC5hZ2dyICE9PSB1bmRlZmluZWQpIF4gKGVuYy55LmFnZ3IgIT09IHVuZGVmaW5lZCkpIHtcblxuICAgIC8vIGlmIG9taXRUcmFucG9zZSwgcHV0IFEgb24gWCwgTyBvbiBZXG4gICAgaWYgKG9wdC5vbWl0VHJhbnBvc2UgJiYgeE95UShlbmMpKSByZXR1cm4gZmFsc2U7XG5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHJldHVybiBmYWxzZTtcbn1cblxuZnVuY3Rpb24gbGluZVJ1bGUoZW5jLCBvcHQpIHtcbiAgLy8gVE9ETyhrYW5pdHcpOiBhZGQgb21pdFZlcnRpY2FsTGluZSBhcyBjb25maWdcblxuICAvLyBMaW5lIGNoYXJ0IHNob3VsZCBiZSBvbmx5IGhvcml6b250YWxcbiAgLy8gYW5kIHVzZSBvbmx5IHRlbXBvcmFsIGRhdGFcbiAgcmV0dXJuIGVuYy54ID09IFwiVFwiICYmIGVuYy55ID09IFwiUVwiO1xufVxuXG52YXIgRU5DT0RJTkdfUlVMRVMgPSB7XG4gIHg6IHtcbiAgICBkYXRhVHlwZXM6IHZsLmRhdGFUeXBlcy5PICsgdmwuZGF0YVR5cGVzLlEgKyB2bC5kYXRhVHlwZXMuVCxcbiAgICBtdWx0aXBsZTogdHJ1ZSAvL0ZJWE1FIHNob3VsZCBhbGxvdyBtdWx0aXBsZSBvbmx5IGZvciBRLCBUXG4gIH0sXG4gIHk6IHtcbiAgICBkYXRhVHlwZXM6IHZsLmRhdGFUeXBlcy5PICsgdmwuZGF0YVR5cGVzLlEgKyB2bC5kYXRhVHlwZXMuVCxcbiAgICBtdWx0aXBsZTogdHJ1ZSAvL0ZJWE1FIHNob3VsZCBhbGxvdyBtdWx0aXBsZSBvbmx5IGZvciBRLCBUXG4gIH0sXG4gIHJvdzoge1xuICAgIGRhdGFUeXBlczogdmwuZGF0YVR5cGVzLk8sXG4gICAgbXVsdGlwbGU6IHRydWVcbiAgfSxcbiAgY29sOiB7XG4gICAgZGF0YVR5cGVzOiB2bC5kYXRhVHlwZXMuTyxcbiAgICBtdWx0aXBsZTogdHJ1ZVxuICB9LFxuICBzaGFwZToge1xuICAgIGRhdGFUeXBlczogdmwuZGF0YVR5cGVzLk9cbiAgfSxcbiAgc2l6ZToge1xuICAgIGRhdGFUeXBlczogdmwuZGF0YVR5cGVzLlFcbiAgfSxcbiAgY29sb3I6IHtcbiAgICBkYXRhVHlwZXM6IHZsLmRhdGFUeXBlcy5PICsgdmwuZGF0YVR5cGVzLlFcbiAgfSxcbiAgYWxwaGE6IHtcbiAgICBkYXRhVHlwZXM6IHZsLmRhdGFUeXBlcy5RXG4gIH0sXG4gIHRleHQ6IHtcbiAgICBkYXRhVHlwZXM6IEFOWV9EQVRBX1RZUEVTXG4gIH1cbiAgLy9nZW86IHtcbiAgLy8gIGRhdGFUeXBlczogW3ZsLmRhdGFUeXBlcy5HXVxuICAvL30sXG4gIC8vYXJjOiB7IC8vIHBpZVxuICAvL1xuICAvL31cbn07XG5cbi8vIEVORCBPRiBSVUxFU1xuXG4vLyBCZWdpbm5pbmcgb2YgQ2hhcnQgR2VuZXJhdGlvblxuXG52YXIgbm9uRW1wdHkgPSBmdW5jdGlvbihncnApIHtcbiAgcmV0dXJuICFpc0FycmF5KGdycCkgfHwgZ3JwLmxlbmd0aCA+IDA7XG59O1xuXG5mdW5jdGlvbiBuZXN0ZWRNYXAoY29sLCBmLCBsZXZlbCwgZmlsdGVyKSB7XG4gIHJldHVybiBsZXZlbCA9PT0gMCA/XG4gICAgY29sLm1hcChmKSA6XG4gICAgY29sLm1hcChmdW5jdGlvbih2KSB7XG4gICAgICB2YXIgciA9IG5lc3RlZE1hcCh2LCBmLCBsZXZlbCAtIDEpO1xuICAgICAgcmV0dXJuIGZpbHRlciA/IHIuZmlsdGVyKG5vbkVtcHR5KSA6IHI7XG4gICAgfSk7XG59XG5cbmZ1bmN0aW9uIG5lc3RlZFJlZHVjZShjb2wsIGYsIGxldmVsLCBmaWx0ZXIpIHtcbiAgcmV0dXJuIGxldmVsID09PSAwID9cbiAgICBjb2wucmVkdWNlKGYsIFtdKSA6XG4gICAgY29sLm1hcChmdW5jdGlvbih2KSB7XG4gICAgICB2YXIgciA9IG5lc3RlZFJlZHVjZSh2LCBmLCBsZXZlbCAtIDEpO1xuICAgICAgcmV0dXJuIGZpbHRlciA/IHIuZmlsdGVyKG5vbkVtcHR5KSA6IHI7XG4gICAgfSk7XG59XG5cbmZ1bmN0aW9uIGdldG9wdChvcHQpIHtcbiAgLy9tZXJnZSB3aXRoIGRlZmF1bHRcbiAgcmV0dXJuIChvcHQgPyB2bC5rZXlzKG9wdCkgOiBbXSkucmVkdWNlKGZ1bmN0aW9uKGMsIGspIHtcbiAgICBjW2tdID0gb3B0W2tdO1xuICAgIHJldHVybiBjO1xuICB9LCBPYmplY3QuY3JlYXRlKHZnbi5ERUZBVUxUX09QVCkpO1xufVxuXG52Z24uZ2VuZXJhdGVDaGFydHMgPSBmdW5jdGlvbihmaWVsZHMsIG9wdCwgY2ZnLCBmbGF0KSB7XG4gIG9wdCA9IGdldG9wdChvcHQpO1xuICBmbGF0ID0gZmxhdCA9PT0gdW5kZWZpbmVkID8ge2VuY29kaW5nczogMX0gOiBmbGF0O1xuXG4gIC8vIFRPRE8gZ2VuZXJhdGVcblxuICAvLyBnZW5lcmF0ZSBwZXJtdXRhdGlvbiBvZiBlbmNvZGluZyBtYXBwaW5nc1xuICB2YXIgZmllbGRTZXRzID0gb3B0LmdlbkFnZ3IgPyB2Z24uZ2VuQWdncmVnYXRlKFtdLCBmaWVsZHMsIG9wdCkgOiBbZmllbGRzXSxcbiAgICBlbmNvZGluZ3MsIGNoYXJ0cywgbGV2ZWwgPSAwO1xuXG4gIGlmIChmbGF0ID09PSB0cnVlIHx8IChmbGF0ICYmIGZsYXQuYWdncikpIHtcbiAgICBlbmNvZGluZ3MgPSBmaWVsZFNldHMucmVkdWNlKGZ1bmN0aW9uKG91dHB1dCwgZmllbGRzKSB7XG4gICAgICByZXR1cm4gdmduLmdlbkZpZWxkRW5jb2RpbmdzKG91dHB1dCwgZmllbGRzLCBvcHQpO1xuICAgIH0sIFtdKTtcbiAgfSBlbHNlIHtcbiAgICBlbmNvZGluZ3MgPSBmaWVsZFNldHMubWFwKGZ1bmN0aW9uKGZpZWxkcykge1xuICAgICAgcmV0dXJuIHZnbi5nZW5GaWVsZEVuY29kaW5ncyhbXSwgZmllbGRzLCBvcHQpO1xuICAgIH0sIHRydWUpO1xuICAgIGxldmVsICs9IDE7XG4gIH1cblxuICBpZiAoZmxhdCA9PT0gdHJ1ZSB8fCAoZmxhdCAmJiBmbGF0LmVuY29kaW5ncykpIHtcbiAgICBjaGFydHMgPSBuZXN0ZWRSZWR1Y2UoZW5jb2RpbmdzLCBmdW5jdGlvbihvdXRwdXQsIGVuY29kaW5ncykge1xuICAgICAgcmV0dXJuIHZnbi5nZW5NYXJrVHlwZXMob3V0cHV0LCBlbmNvZGluZ3MsIG9wdCwgY2ZnKTtcbiAgICB9LCBsZXZlbCwgdHJ1ZSk7XG4gIH0gZWxzZSB7XG4gICAgY2hhcnRzID0gbmVzdGVkTWFwKGVuY29kaW5ncywgZnVuY3Rpb24oZW5jb2RpbmdzKSB7XG4gICAgICByZXR1cm4gdmduLmdlbk1hcmtUeXBlcyhbXSwgZW5jb2RpbmdzLCBvcHQsIGNmZyk7XG4gICAgfSwgbGV2ZWwsIHRydWUpO1xuICAgIGxldmVsICs9IDE7XG4gIH1cbiAgcmV0dXJuIGNoYXJ0cztcbn07XG5cblxudmduLmdlbk1hcmtUeXBlcyA9IGZ1bmN0aW9uKG91dHB1dCwgZW5jLCBvcHQsIGNmZykge1xuICBvcHQgPSBnZXRvcHQob3B0KTtcbiAgdmduLl9nZXRTdXBwb3J0ZWRNYXJrVHlwZXMoZW5jLCBvcHQpXG4gICAgLmZvckVhY2goZnVuY3Rpb24obWFya1R5cGUpIHtcbiAgICAgIG91dHB1dC5wdXNoKHsgbWFya3R5cGU6IG1hcmtUeXBlLCBlbmM6IGVuYywgY2ZnOiBjZmcgfSk7XG4gICAgfSk7XG4gIHJldHVybiBvdXRwdXQ7XG59O1xuXG4vL1RPRE8oa2FuaXR3KTogd3JpdGUgdGVzdCBjYXNlXG52Z24uX2dldFN1cHBvcnRlZE1hcmtUeXBlcyA9IGZ1bmN0aW9uKGVuYywgb3B0KSB7XG4gIHZhciBtYXJrVHlwZXMgPSBvcHQubWFya3R5cGVMaXN0LmZpbHRlcihmdW5jdGlvbihtYXJrVHlwZSkge1xuICAgIHZhciBtYXJrID0gdmwubWFya3NbbWFya1R5cGVdLFxuICAgICAgcmVxcyA9IG1hcmsucmVxdWlyZWRFbmNvZGluZyxcbiAgICAgIHN1cHBvcnQgPSBtYXJrLnN1cHBvcnRlZEVuY29kaW5nO1xuXG4gICAgZm9yICh2YXIgaSBpbiByZXFzKSB7IC8vIGFsbCByZXF1aXJlZCBlbmNvZGluZ3MgaW4gZW5jXG4gICAgICBpZiAoIShyZXFzW2ldIGluIGVuYykpIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBmb3IgKHZhciBlbmNUeXBlIGluIGVuYykgeyAvLyBhbGwgZW5jb2RpbmdzIGluIGVuYyBhcmUgc3VwcG9ydGVkXG4gICAgICBpZiAoIXN1cHBvcnRbZW5jVHlwZV0pIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICByZXR1cm4gIW1hcmtzUnVsZVttYXJrVHlwZV0gfHwgbWFya3NSdWxlW21hcmtUeXBlXShlbmMsIG9wdCk7XG4gIH0pO1xuXG4gIC8vY29uc29sZS5sb2coJ2VuYzonLCBqc29uKGVuYyksIFwiIH4gbWFya3M6XCIsIG1hcmtUeXBlcyk7XG5cbiAgcmV0dXJuIG1hcmtUeXBlcztcbn07XG5cbnZnbi5nZW5BZ2dyZWdhdGUgPSBmdW5jdGlvbihvdXRwdXQsIGZpZWxkcywgb3B0KSB7XG4gIHZhciB0ZiA9IG5ldyBBcnJheShmaWVsZHMubGVuZ3RoKTtcbiAgb3B0ID0gZ2V0b3B0KG9wdCk7XG5cbiAgZnVuY3Rpb24gYXNzaWduRmllbGQoaSwgaGFzQWdncikge1xuICAgIC8vIElmIGFsbCBmaWVsZHMgYXJlIGFzc2lnbmVkLCBzYXZlXG4gICAgaWYgKGkgPT09IGZpZWxkcy5sZW5ndGgpIHtcbiAgICAgIGlmKG9wdC5vbWl0QWdncmVnYXRlV2l0aE1lYXN1cmVPbmx5IHx8IG9wdC5vbWl0RGltZW5zaW9uT25seSl7XG4gICAgICAgIHZhciBoYXNNZWFzdXJlPWZhbHNlLCBoYXNEaW1lbnNpb249ZmFsc2UsIGhhc1Jhdz1mYWxzZTtcbiAgICAgICAgdGYuZm9yRWFjaChmdW5jdGlvbihmKXtcbiAgICAgICAgICBpZiAoaXNEaW0oZikpIHtcbiAgICAgICAgICAgIGhhc0RpbWVuc2lvbiA9IHRydWU7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGhhc01lYXN1cmUgPSB0cnVlO1xuICAgICAgICAgICAgaWYoIWYuYWdncikgaGFzUmF3ID0gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBpZighaGFzTWVhc3VyZSAmJiBvcHQub21pdERpbWVuc2lvbk9ubHkpIHJldHVybjtcbiAgICAgICAgaWYoIWhhc0RpbWVuc2lvbiAmJiAhaGFzUmF3ICYmIG9wdC5vbWl0QWdncmVnYXRlV2l0aE1lYXN1cmVPbmx5KSByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIG91dHB1dC5wdXNoKHZsLmR1cGxpY2F0ZSh0ZikpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBmID0gZmllbGRzW2ldO1xuXG4gICAgLy8gT3RoZXJ3aXNlLCBhc3NpZ24gaS10aCBmaWVsZFxuICAgIHN3aXRjaCAoZi50eXBlKSB7XG4gICAgICAvL1RPRE8gXCJEXCIsIFwiR1wiXG4gICAgICBjYXNlIFwiUVwiOlxuICAgICAgICB0ZltpXSA9IHtuYW1lOiBmLm5hbWUsIHR5cGU6IGYudHlwZX07XG4gICAgICAgIGlmIChmLmFnZ3IpIHtcbiAgICAgICAgICB0ZltpXS5hZ2dyID0gZi5hZ2dyO1xuICAgICAgICAgIGFzc2lnbkZpZWxkKGkgKyAxLCB0cnVlKTtcbiAgICAgICAgfSBlbHNlIGlmIChmLl9hZ2dyKSB7XG4gICAgICAgICAgdmFyIGFnZ3JlZ2F0ZXMgPSBmLl9hZ2dyID09IFwiKlwiID8gb3B0LmFnZ3JMaXN0IDogZi5fYWdncjtcblxuICAgICAgICAgIGZvciAodmFyIGogaW4gYWdncmVnYXRlcykge1xuICAgICAgICAgICAgdmFyIGEgPSBhZ2dyZWdhdGVzW2pdO1xuICAgICAgICAgICAgaWYgKGEgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICBpZiAoaGFzQWdnciA9PT0gdHJ1ZSB8fCBoYXNBZ2dyID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgLy8gbXVzdCBiZSBhZ2dyZWdhdGVkLCBvciBubyBjb25zdHJhaW50XG4gICAgICAgICAgICAgICAgLy9zZXQgYWdncmVnYXRlIHRvIHRoYXQgb25lXG4gICAgICAgICAgICAgICAgdGZbaV0uYWdnciA9IGE7XG4gICAgICAgICAgICAgICAgYXNzaWduRmllbGQoaSArIDEsIHRydWUpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgeyAvLyBpZihhID09PSB1bmRlZmluZWQpXG4gICAgICAgICAgICAgIGlmIChoYXNBZ2dyID09PSBmYWxzZSB8fCBoYXNBZ2dyID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgLy8gbXVzdCBiZSByYXcgcGxvdCwgb3Igbm8gY29uc3RyYWludFxuICAgICAgICAgICAgICAgIGRlbGV0ZSB0ZltpXS5hZ2dyO1xuICAgICAgICAgICAgICAgIGFzc2lnbkZpZWxkKGkgKyAxLCBmYWxzZSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAob3B0LmdlbkJpbikge1xuICAgICAgICAgICAgLy8gYmluIHRoZSBmaWVsZCBpbnN0ZWFkIVxuICAgICAgICAgICAgZGVsZXRlIHRmW2ldLmFnZ3I7XG4gICAgICAgICAgICB0ZltpXS5iaW4gPSB0cnVlO1xuICAgICAgICAgICAgdGZbaV0udHlwZSA9IFwiUVwiO1xuICAgICAgICAgICAgYXNzaWduRmllbGQoaSArIDEsIGhhc0FnZ3IpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChvcHQuZ2VuVHlwZUNhc3RpbmcpIHtcbiAgICAgICAgICAgIC8vIHdlIGNhbiBhbHNvIGNoYW5nZSBpdCB0byBkaW1lbnNpb24gKGNhc3QgdHlwZT1cIk9cIilcbiAgICAgICAgICAgIGRlbGV0ZSB0ZltpXS5hZ2dyO1xuICAgICAgICAgICAgZGVsZXRlIHRmW2ldLmJpbjtcbiAgICAgICAgICAgIHRmW2ldLnR5cGUgPSBcIk9cIjtcbiAgICAgICAgICAgIGFzc2lnbkZpZWxkKGkgKyAxLCBoYXNBZ2dyKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7IC8vIGJvdGggXCJhZ2dyXCIsIFwiX2FnZ3JcIiBub3QgaW4gZlxuICAgICAgICAgIGFzc2lnbkZpZWxkKGkgKyAxLCBmYWxzZSk7XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgXCJPXCI6XG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0ZltpXSA9IGY7XG4gICAgICAgIGFzc2lnbkZpZWxkKGkgKyAxLCBoYXNBZ2dyKTtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuXG4gIH1cblxuICBhc3NpZ25GaWVsZCgwLCBudWxsKTtcblxuICByZXR1cm4gb3V0cHV0O1xufTtcblxuLy9UT0RPKGthbml0dyk6IHdyaXRlIHRlc3QgY2FzZVxudmduLmdlbkZpZWxkRW5jb2RpbmdzID0gZnVuY3Rpb24oZW5jb2RpbmdzLCBmaWVsZHMsIG9wdCkgeyAvLyBnZW5lcmF0ZSBlbmNvZGluZ3MgKF9lbmMgcHJvcGVydHkgaW4gdmVnYSlcbiAgdmFyIHRtcEVuYyA9IHt9O1xuXG4gIGZ1bmN0aW9uIGFzc2lnbkZpZWxkKGkpIHtcbiAgICAvLyBJZiBhbGwgZmllbGRzIGFyZSBhc3NpZ25lZCwgc2F2ZVxuICAgIGlmIChpID09PSBmaWVsZHMubGVuZ3RoKSB7XG4gICAgICAvLyBhdCB0aGUgbWluaW1hbCBhbGwgY2hhcnQgc2hvdWxkIGhhdmUgeCwgeSwgZ2VvLCB0ZXh0IG9yIGFyY1xuICAgICAgaWYgKG1hcmtzUnVsZSh0bXBFbmMsIG9wdCkpIHtcbiAgICAgICAgZW5jb2RpbmdzLnB1c2godmwuZHVwbGljYXRlKHRtcEVuYykpO1xuICAgICAgfVxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIE90aGVyd2lzZSwgYXNzaWduIGktdGggZmllbGRcbiAgICB2YXIgZmllbGQgPSBmaWVsZHNbaV07XG4gICAgZm9yICh2YXIgaiBpbiBFTkNPRElOR19UWVBFUykge1xuICAgICAgdmFyIGV0ID0gRU5DT0RJTkdfVFlQRVNbal07XG5cbiAgICAgIC8vVE9ETzogc3VwcG9ydCBcIm11bHRpcGxlXCIgYXNzaWdubWVudFxuICAgICAgaWYgKCEoZXQgaW4gdG1wRW5jKSAmJlxuICAgICAgICAoRU5DT0RJTkdfUlVMRVNbZXRdLmRhdGFUeXBlcyAmIHZsLmRhdGFUeXBlc1tmaWVsZC50eXBlXSkgPiAwKSB7XG4gICAgICAgIHRtcEVuY1tldF0gPSBmaWVsZDtcbiAgICAgICAgYXNzaWduRmllbGQoaSArIDEpO1xuICAgICAgICBkZWxldGUgdG1wRW5jW2V0XTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBhc3NpZ25GaWVsZCgwKTtcblxuICByZXR1cm4gZW5jb2RpbmdzO1xufTtcblxuLy8gVVRJTElUWVxuXG52YXIgaXNBcnJheSA9IEFycmF5LmlzQXJyYXkgfHwgZnVuY3Rpb24ob2JqKSB7XG4gIHJldHVybiB0b1N0cmluZy5jYWxsKG9iaikgPT0gJ1tvYmplY3QgQXJyYXldJztcbn07XG5cbmZ1bmN0aW9uIHVuaW9uKGEsIGIpIHtcbiAgdmFyIG8gPSB7fTtcbiAgYS5mb3JFYWNoKGZ1bmN0aW9uKHgpeyBvW3hdID0gdHJ1ZTt9KTtcbiAgYi5mb3JFYWNoKGZ1bmN0aW9uKHgpeyBvW3hdID0gdHJ1ZTt9KTtcbiAgcmV0dXJuIHZsLmtleXMobyk7XG59XG5cbnZhciBhYnMgPSBNYXRoLmFicztcblxuZnVuY3Rpb24gcmFuZ2Uoc3RhcnQsIHN0b3AsIHN0ZXApIHtcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPCAzKSB7XG4gICAgc3RlcCA9IDE7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPCAyKSB7XG4gICAgICBzdG9wID0gc3RhcnQ7XG4gICAgICBzdGFydCA9IDA7XG4gICAgfVxuICB9XG4gIGlmICgoc3RvcCAtIHN0YXJ0KSAvIHN0ZXAgPT09IEluZmluaXR5KSB0aHJvdyBuZXcgRXJyb3IoXCJpbmZpbml0ZSByYW5nZVwiKTtcbiAgdmFyIHJhbmdlID0gW10sIGsgPSBkM19yYW5nZV9pbnRlZ2VyU2NhbGUoYWJzKHN0ZXApKSwgaSA9IC0xLCBqO1xuICBzdGFydCAqPSBrOyBzdG9wICo9IGs7IHN0ZXAgKj0gaztcbiAgaWYgKHN0ZXAgPCAwKSB3aGlsZSAoKGogPSBzdGFydCArIHN0ZXAgKiArK2kpID4gc3RvcCkgcmFuZ2UucHVzaChqIC8gayk7IGVsc2Ugd2hpbGUgKChqID0gc3RhcnQgKyBzdGVwICogKytpKSA8IHN0b3ApIHJhbmdlLnB1c2goaiAvIGspO1xuICByZXR1cm4gcmFuZ2U7XG59XG5cbmZ1bmN0aW9uIGQzX3JhbmdlX2ludGVnZXJTY2FsZSh4KSB7XG4gIHZhciBrID0gMTtcbiAgd2hpbGUgKHggKiBrICUgMSkgayAqPSAxMDtcbiAgcmV0dXJuIGs7XG59IiwidmFyIHZsID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cudmwgOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLnZsIDogbnVsbCk7XG5cbnZhciB2cmFuayA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbi8vVE9ETyBsb3dlciBzY29yZSBpZiB3ZSB1c2UgRyBhcyBPP1xudmFyIEVOQ09ESU5HX1NDT1JFID0ge1xuICBROiB7XG4gICAgeDogMSxcbiAgICB5OiAxLFxuICAgIHNpemU6IDAuNiwgLy9GSVhNRSBTSVpFIGZvciBCYXIgaXMgaG9ycmlibGUhXG4gICAgY29sb3I6IDAuNCxcbiAgICBhbHBoYTogMC40XG4gIH0sXG4gIE86IHsgLy8gVE9ETyBuZWVkIHRvIHRha2UgY2FyZGluYWxpdHkgaW50byBhY2NvdW50XG4gICAgeDogMC45OSwgLy8gaGFyZGVyIHRvIHJlYWQgYXhpc1xuICAgIHk6IDEsXG4gICAgcm93OiAwLjcsXG4gICAgY29sOiAwLjcsXG4gICAgY29sb3I6IDAuOCxcbiAgICBzaGFwZTogMC42XG4gIH1cbn07XG5cbi8vIGJhZCBzY29yZSBub3Qgc3BlY2lmaWVkIGluIHRoZSB0YWJsZSBhYm92ZVxudmFyIEJBRF9FTkNPRElOR19TQ09SRSA9IDAuMDEsXG4gIFVOVVNFRF9QT1NJVElPTiA9IDAuNTtcblxudmFyIE1BUktfU0NPUkUgPSB7XG4gIGxpbmU6IDAuOTksXG4gIGFyZWE6IDAuOTgsXG4gIGJhcjogMC45NyxcbiAgcG9pbnQ6IDAuOTYsXG4gIGNpcmNsZTogMC45NSxcbiAgc3F1YXJlOiAwLjk1LFxuICB0ZXh0OiAwLjhcbn07XG5cbnZyYW5rLmVuY29kaW5nU2NvcmUgPSBmdW5jdGlvbihlbmNvZGluZyl7XG4gIHZhciBmZWF0dXJlcyA9IHt9LFxuICAgIGVuY1R5cGVzID0gdmwua2V5cyhlbmNvZGluZy5lbmMpO1xuICBlbmNUeXBlcy5mb3JFYWNoKGZ1bmN0aW9uKGVuY1R5cGUpe1xuICAgIHZhciBmaWVsZCA9IGVuY29kaW5nLmVuY1tlbmNUeXBlXTtcbiAgICBmZWF0dXJlc1tmaWVsZC5uYW1lXSA9IHtcbiAgICAgIHZhbHVlOiBmaWVsZC50eXBlK1wiOlwiK2VuY1R5cGUsXG4gICAgICBzY29yZTogRU5DT0RJTkdfU0NPUkVbZmllbGQudHlwZV1bZW5jVHlwZV0gfHwgQkFEX0VOQ09ESU5HX1NDT1JFXG4gICAgfTtcbiAgfSk7XG5cbiAgLy8gcGVuYWxpemUgbm90IHVzaW5nIHBvc2l0aW9uYWxcbiAgaWYoZW5jVHlwZXMubGVuZ3RoID4gMSl7XG4gICAgaWYoKCFlbmNvZGluZy5lbmMueCB8fCAhZW5jb2RpbmcuZW5jLnkpICYmICFlbmNvZGluZy5lbmMuZ2VvKSB7XG4gICAgICBmZWF0dXJlcy51bnVzZWRQb3NpdGlvbiA9IHtzY29yZTogVU5VU0VEX1BPU0lUSU9OfTtcbiAgICB9XG4gIH1cblxuICBmZWF0dXJlcy5tYXJrVHlwZSA9IHtcbiAgICB2YWx1ZTogZW5jb2RpbmcubWFya3R5cGUsXG4gICAgc2NvcmU6IE1BUktfU0NPUkVbZW5jb2RpbmcubWFya3R5cGVdXG4gIH1cblxuICByZXR1cm4ge1xuICAgIHNjb3JlOiB2bC5rZXlzKGZlYXR1cmVzKS5yZWR1Y2UoZnVuY3Rpb24ocCwgcyl7IHJldHVybiBwICogZmVhdHVyZXNbc10uc2NvcmV9LCAxKSxcbiAgICBmZWF0dXJlczogZmVhdHVyZXNcbiAgfTtcbn07XG5cblxuLy8gcmF3ID4gYXZnLCBzdW0gPiBtaW4sbWF4ID4gYmluXG5cbnZyYW5rLmZpZWxkc1Njb3JlID0gZnVuY3Rpb24oZmllbGRzKXtcblxufTtcblxuIl19
