!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.cp=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports = {
  consts: require('./consts'),
  cluster: require('./cluster/cluster'),
  gen: require('./gen/gen'),
  rank: require('./rank/rank'),
  util: require('./util'),
  auto: "-, sum"
};



},{"./cluster/cluster":7,"./consts":10,"./gen/gen":14,"./rank/rank":18,"./util":20}],2:[function(require,module,exports){
module.exports = {
   hcluster: require("./hcluster"),
   Kmeans: require("./kmeans"),
   kmeans: require("./kmeans").kmeans
};
},{"./hcluster":4,"./kmeans":5}],3:[function(require,module,exports){
module.exports = {
  euclidean: function(v1, v2) {
      var total = 0;
      for (var i = 0; i < v1.length; i++) {
         total += Math.pow(v2[i] - v1[i], 2);      
      }
      return Math.sqrt(total);
   },
   manhattan: function(v1, v2) {
     var total = 0;
     for (var i = 0; i < v1.length ; i++) {
        total += Math.abs(v2[i] - v1[i]);      
     }
     return total;
   },
   max: function(v1, v2) {
     var max = 0;
     for (var i = 0; i < v1.length; i++) {
        max = Math.max(max , Math.abs(v2[i] - v1[i]));      
     }
     return max;
   }
};
},{}],4:[function(require,module,exports){
var distances = require("./distance");

var HierarchicalClustering = function(distance, linkage, threshold) {
   this.distance = distance;
   this.linkage = linkage;
   this.threshold = threshold == undefined ? Infinity : threshold;
}

HierarchicalClustering.prototype = {
   cluster : function(items, snapshotPeriod, snapshotCb) {
      this.clusters = [];
      this.dists = [];  // distances between each pair of clusters
      this.mins = []; // closest cluster for each cluster
      this.index = []; // keep a hash of all clusters by key
      
      for (var i = 0; i < items.length; i++) {
         var cluster = {
            value: items[i],
            key: i,
            index: i,
            size: 1
         };
         this.clusters[i] = cluster;
         this.index[i] = cluster;
         this.dists[i] = [];
         this.mins[i] = 0;
      }

      for (var i = 0; i < this.clusters.length; i++) {
         for (var j = 0; j <= i; j++) {
            var dist = (i == j) ? Infinity : 
               this.distance(this.clusters[i].value, this.clusters[j].value);
            this.dists[i][j] = dist;
            this.dists[j][i] = dist;

            if (dist < this.dists[i][this.mins[i]]) {
               this.mins[i] = j;               
            }
         }
      }

      var merged = this.mergeClosest();
      var i = 0;
      while (merged) {
        if (snapshotCb && (i++ % snapshotPeriod) == 0) {
           snapshotCb(this.clusters);           
        }
        merged = this.mergeClosest();
      }
    
      this.clusters.forEach(function(cluster) {
        // clean up metadata used for clustering
        delete cluster.key;
        delete cluster.index;
      });

      return this.clusters;
   },
  
   mergeClosest: function() {
      // find two closest clusters from cached mins
      var minKey = 0, min = Infinity;
      for (var i = 0; i < this.clusters.length; i++) {
         var key = this.clusters[i].key,
             dist = this.dists[key][this.mins[key]];
         if (dist < min) {
            minKey = key;
            min = dist;
         }
      }
      if (min >= this.threshold) {
         return false;         
      }

      var c1 = this.index[minKey],
          c2 = this.index[this.mins[minKey]];

      // merge two closest clusters
      var merged = {
         left: c1,
         right: c2,
         key: c1.key,
         size: c1.size + c2.size
      };

      this.clusters[c1.index] = merged;
      this.clusters.splice(c2.index, 1);
      this.index[c1.key] = merged;

      // update distances with new merged cluster
      for (var i = 0; i < this.clusters.length; i++) {
         var ci = this.clusters[i];
         var dist;
         if (c1.key == ci.key) {
            dist = Infinity;            
         }
         else if (this.linkage == "single") {
            dist = this.dists[c1.key][ci.key];
            if (this.dists[c1.key][ci.key] > this.dists[c2.key][ci.key]) {
               dist = this.dists[c2.key][ci.key];
            }
         }
         else if (this.linkage == "complete") {
            dist = this.dists[c1.key][ci.key];
            if (this.dists[c1.key][ci.key] < this.dists[c2.key][ci.key]) {
               dist = this.dists[c2.key][ci.key];              
            }
         }
         else if (this.linkage == "average") {
            dist = (this.dists[c1.key][ci.key] * c1.size
                   + this.dists[c2.key][ci.key] * c2.size) / (c1.size + c2.size);
         }
         else {
            dist = this.distance(ci.value, c1.value);            
         }

         this.dists[c1.key][ci.key] = this.dists[ci.key][c1.key] = dist;
      }

    
      // update cached mins
      for (var i = 0; i < this.clusters.length; i++) {
         var key1 = this.clusters[i].key;        
         if (this.mins[key1] == c1.key || this.mins[key1] == c2.key) {
            var min = key1;
            for (var j = 0; j < this.clusters.length; j++) {
               var key2 = this.clusters[j].key;
               if (this.dists[key1][key2] < this.dists[key1][min]) {
                  min = key2;                  
               }
            }
            this.mins[key1] = min;
         }
         this.clusters[i].index = i;
      }
    
      // clean up metadata used for clustering
      delete c1.key; delete c2.key;
      delete c1.index; delete c2.index;

      return true;
   }
}

var hcluster = function(items, distance, linkage, threshold, snapshot, snapshotCallback) {
   distance = distance || "euclidean";
   linkage = linkage || "average";

   if (typeof distance == "string") {
     distance = distances[distance];
   }
   var clusters = (new HierarchicalClustering(distance, linkage, threshold))
                  .cluster(items, snapshot, snapshotCallback);
      
   if (threshold === undefined) {
      return clusters[0]; // all clustered into one
   }
   return clusters;
}

module.exports = hcluster;

},{"./distance":3}],5:[function(require,module,exports){
var distances = require("./distance");

function KMeans(centroids) {
   this.centroids = centroids || [];
}

KMeans.prototype.randomCentroids = function(points, k) {
   var centroids = points.slice(0); // copy
   centroids.sort(function() {
      return (Math.round(Math.random()) - 0.5);
   });
   return centroids.slice(0, k);
}

KMeans.prototype.classify = function(point, distance) {
   var min = Infinity,
       index = 0;

   distance = distance || "euclidean";
   if (typeof distance == "string") {
      distance = distances[distance];
   }

   for (var i = 0; i < this.centroids.length; i++) {
      var dist = distance(point, this.centroids[i]);
      if (dist < min) {
         min = dist;
         index = i;
      }
   }

   return index;
}

KMeans.prototype.cluster = function(points, k, distance, snapshotPeriod, snapshotCb) {
   k = k || Math.max(2, Math.ceil(Math.sqrt(points.length / 2)));

   distance = distance || "euclidean";
   if (typeof distance == "string") {
      distance = distances[distance];
   }

   this.centroids = this.randomCentroids(points, k);

   var assignment = new Array(points.length);
   var clusters = new Array(k);

   var iterations = 0;
   var movement = true;
   while (movement) {
      // update point-to-centroid assignments
      for (var i = 0; i < points.length; i++) {
         assignment[i] = this.classify(points[i], distance);
      }

      // update location of each centroid
      movement = false;
      for (var j = 0; j < k; j++) {
         var assigned = [];
         for (var i = 0; i < assignment.length; i++) {
            if (assignment[i] == j) {
               assigned.push(points[i]);
            }
         }

         if (!assigned.length) {
            continue;
         }

         var centroid = this.centroids[j];
         var newCentroid = new Array(centroid.length);

         for (var g = 0; g < centroid.length; g++) {
            var sum = 0;
            for (var i = 0; i < assigned.length; i++) {
               sum += assigned[i][g];
            }
            newCentroid[g] = sum / assigned.length;

            if (newCentroid[g] != centroid[g]) {
               movement = true;
            }
         }

         this.centroids[j] = newCentroid;
         clusters[j] = assigned;
      }

      if (snapshotCb && (iterations++ % snapshotPeriod == 0)) {
         snapshotCb(clusters);
      }
   }

   return clusters;
}

KMeans.prototype.toJSON = function() {
   return JSON.stringify(this.centroids);
}

KMeans.prototype.fromJSON = function(json) {
   this.centroids = JSON.parse(json);
   return this;
}

module.exports = KMeans;

module.exports.kmeans = function(vectors, k) {
   return (new KMeans()).cluster(vectors, k);
}
},{"./distance":3}],6:[function(require,module,exports){
(function (global){
'use strict';

// declare global constant
var g = global || window;

g.TABLE = 'table';
g.RAW = 'raw';
g.STACKED = 'stacked';
g.INDEX = 'index';

g.X = 'x';
g.Y = 'y';
g.ROW = 'row';
g.COL = 'col';
g.SIZE = 'size';
g.SHAPE = 'shape';
g.COLOR = 'color';
g.ALPHA = 'alpha';
g.TEXT = 'text';
g.DETAIL = 'detail';

g.N = 'N';
g.O = 'O';
g.Q = 'Q';
g.T = 'T';

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],7:[function(require,module,exports){
(function (global){
"use strict";

module.exports = cluster;

var vl = (typeof window !== "undefined" ? window.vl : typeof global !== "undefined" ? global.vl : null),
  clusterfck = require('clusterfck'),
  consts = require('./clusterconsts'),
  util = require('../util');

cluster.distance = require('./distance');

function cluster(encodings, opt) {
  // jshint unused:false
  var dist = cluster.distance.table(encodings);

  var clusterTrees = clusterfck.hcluster(encodings, function(e1, e2) {
    var s1 = vl.Encoding.shorthand(e1),
      s2 = vl.Encoding.shorthand(e2);
    return dist[s1][s2];
  }, 'average', consts.CLUSTER_THRESHOLD);

  var clusters = clusterTrees.map(function(tree) {
      return util.traverse(tree, []);
    })
   .map(function(cluster) {
    return cluster.sort(function(encoding1, encoding2) {
      // sort each cluster -- have the highest score as 1st item
      return encoding2.score - encoding1.score;
    });
  }).filter(function(cluster) {  // filter empty cluster
    return cluster.length >0;
  }).sort(function(cluster1, cluster2) {
    //sort by highest scoring item in each cluster
    return cluster2[0].score - cluster1[0].score;
  });

  clusters.dist = dist; //append dist in the array for debugging

  return clusters;
}
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"../util":20,"./clusterconsts":8,"./distance":9,"clusterfck":2}],8:[function(require,module,exports){
'use strict';

var c = module.exports = {};

c.SWAPPABLE = 0.05;
c.DIST_MISSING = 1;
c.CLUSTER_THRESHOLD = 1;

function reduceTupleToTable(r, x) {
  var a = x[0], b = x[1], d = x[2];
  r[a] = r[a] || {};
  r[b] = r[b] || {};
  r[a][b] = r[b][a] = d;
  return r;
}

c.DIST_BY_ENCTYPE = [
  // positional
  ['x', 'y', c.SWAPPABLE],
  ['row', 'col', c.SWAPPABLE],

  // ordinal mark properties
  ['color', 'shape', c.SWAPPABLE],
  ['color', 'detail', c.SWAPPABLE],
  ['detail', 'shape', c.SWAPPABLE],

  // quantitative mark properties
  ['color', 'alpha', c.SWAPPABLE],
  ['size', 'alpha', c.SWAPPABLE],
  ['size', 'color', c.SWAPPABLE]
].reduce(reduceTupleToTable, {});

},{}],9:[function(require,module,exports){
(function (global){
'use strict';

var vl = (typeof window !== "undefined" ? window.vl : typeof global !== "undefined" ? global.vl : null),
  consts = require('./clusterconsts'),
  util = require('../util');

var distance = {};
module.exports = distance;

distance.table = function (encodings) {
  var len = encodings.length,
    colencs = encodings.map(function(e) { return distance.getEncTypeByColumnName(e); }),
    shorthands = encodings.map(vl.Encoding.shorthand),
    diff = {}, i, j;

  for (i = 0; i < len; i++) diff[shorthands[i]] = {};

  for (i = 0; i < len; i++) {
    for (j = i + 1; j < len; j++) {
      var sj = shorthands[j], si = shorthands[i];

      diff[sj][si] = diff[si][sj] = distance.get(colencs[i], colencs[j]);
    }
  }
  return diff;
};

distance.get = function (colenc1, colenc2) {
  var cols = util.union(vl.keys(colenc1.col), vl.keys(colenc2.col)),
    dist = 0;

  cols.forEach(function(col) {
    var e1 = colenc1.col[col], e2 = colenc2.col[col];

    if (e1 && e2) {
      if (e1.encType != e2.encType) {
        dist += (consts.DIST_BY_ENCTYPE[e1.encType] || {})[e2.encType] || 1;
      }
    } else {
      dist += consts.DIST_MISSING;
    }
  });

  // do not group stacked chart with similar non-stacked chart!
  var isStack1 = vl.Encoding.isStack(colenc1),
    isStack2 = vl.Encoding.isStack(colenc2);

  if(isStack1 || isStack2) {
    if(isStack1 && isStack2) {
      if(colenc1.encoding.color.name !== colenc2.encoding.color.name) {
        dist+=1;
      }
    } else {
      dist+=1; // surely different
    }
  }
  return dist;
};

// get encoding type by fieldname
distance.getEncTypeByColumnName = function(encoding) {
  var _colenc = {},
    enc = encoding.encoding;

  vl.keys(enc).forEach(function(encType) {
    var e = vl.duplicate(enc[encType]);
    e.encType = encType;
    _colenc[e.name || ''] = e;
    delete e.name;
  });

  return {
    marktype: encoding.marktype,
    col: _colenc,
    encoding: encoding.encoding
  };
};
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"../util":20,"./clusterconsts":8}],10:[function(require,module,exports){
'use strict';

var consts = module.exports = {
  gen: {},
  cluster: {},
  rank: {}
};

consts.gen.projections = {
  type: 'object',
  properties: {
    omitDotPlot: { //FIXME remove this!
      type: 'boolean',
      default: false,
      description: 'remove all dot plots'
    },
    maxCardinalityForAutoAddOrdinal: {
      type: 'integer',
      default: 50,
      description: 'max cardinality for ordinal field to be considered for auto adding'
    },
    alwaysAddHistogram: {
      type: 'boolean',
      default: true
    }
  }
};

consts.gen.aggregates = {
  type: 'object',
  properties: {
    config: {
      type: 'object'
    },
    data: {
      type: 'object'
    },
    tableTypes: {
      type: 'boolean',
      default: 'both',
      enum: ['both', 'aggregated', 'disaggregated']
    },
    genDimQ: {
      type: 'string',
      default: 'auto',
      enum: ['auto', 'bin', 'cast', 'none'],
      description: 'Use Q as Dimension either by binning or casting'
    },
    minCardinalityForBin: {
      type: 'integer',
      default: 20,
      description: 'minimum cardinality of a field if we were to bin'
    },
    omitDotPlot: {
      type: 'boolean',
      default: false,
      description: 'remove all dot plots'
    },
    omitMeasureOnly: {
      type: 'boolean',
      default: false,
      description: 'Omit aggregation with measure(s) only'
    },
    omitDimensionOnly: {
      type: 'boolean',
      default: true,
      description: 'Omit aggregation with dimension(s) only'
    },
    addCountForDimensionOnly: {
      type: 'boolean',
      default: true,
      description: 'Add count when there are dimension(s) only'
    },
    aggrList: {
      type: 'array',
      items: {
        type: ['string']
      },
      default: [undefined, 'avg']
    },
    timeFnList: {
      type: 'array',
      items: {
        type: ['string']
      },
      default: ['year']
    },
    consistentAutoQ: {
      type: 'boolean',
      default: true,
      description: "generate similar auto transform for quant"
    }
  }
};

consts.gen.encodings = {
  type: 'object',
  properties: {
    marktypeList: {
      type: 'array',
      items: {type: 'string'},
      default: ['point', 'bar', 'line', 'area', 'text', 'tick'], //filled_map
      description: 'allowed marktypes'
    },
    encodingTypeList: {
      type: 'array',
      items: {type: 'string'},
      default: ['x', 'y', 'row', 'col', 'size', 'color', 'text', 'detail'],
      description: 'allowed encoding types'
    },
    maxGoodCardinalityForFacets: {
      type: 'integer',
      default: 5,
      description: 'maximum cardinality of a field to be put on facet (row/col) effectively'
    },
    maxCardinalityForFacets: {
      type: 'integer',
      default: 20,
      description: 'maximum cardinality of a field to be put on facet (row/col)'
    },
    maxGoodCardinalityForColor: {
      type: 'integer',
      default: 7,
      description: 'maximum cardinality of an ordinal field to be put on color effectively'
    },
    maxCardinalityForColor: {
      type: 'integer',
      default: 20,
      description: 'maximum cardinality of an ordinal field to be put on color'
    },
    maxCardinalityForShape: {
      type: 'integer',
      default: 6,
      description: 'maximum cardinality of an ordinal field to be put on shape'
    },
    omitTranpose:  {
      type: 'boolean',
      default: true,
      description: 'Eliminate all transpose by (1) keeping horizontal dot plot only (2) for OxQ charts, always put O on Y (3) show only one DxD, MxM (currently sorted by name)'
    },
    omitDotPlot: {
      type: 'boolean',
      default: false,
      description: 'remove all dot plots'
    },
    omitDotPlotWithExtraEncoding: {
      type: 'boolean',
      default: true,
      description: 'remove all dot plots with >1 encoding'
    },
    omitMultipleRetinalEncodings: {
      type: 'boolean',
      default: true,
      description: 'omit using multiple retinal variables (size, color, alpha, shape)'
    },
    omitNonTextAggrWithAllDimsOnFacets: {
      type: 'boolean',
      default: true,
      description: 'remove all aggregated charts (except text tables) with all dims on facets (row, col)'
    },
    omitSizeOnBar: {
      type: 'boolean',
      default: false,
      description: 'do not use bar\'s size'
    },
    omitStackedAverage: {
      type: 'boolean',
      default: true,
      description: 'do not stack bar chart with average'
    },
    alwaysGenerateTableAsHeatmap: {
      type: 'boolean',
      default: true
    }
  }
};




},{}],11:[function(require,module,exports){
(function (global){
'use strict';

var vl = (typeof window !== "undefined" ? window.vl : typeof global !== "undefined" ? global.vl : null);

var consts = require('../consts');

var ANY='*';

module.exports = genAggregates;

function genAggregates(output, fields, stats, opt) {
  opt = vl.schema.util.extend(opt||{}, consts.gen.aggregates);
  var tf = new Array(fields.length);
  var hasNorO = vl.any(fields, function(f) {
    return vl.field.isTypes(f, [N, O]);
  });

  function emit(fieldSet) {
    fieldSet = vl.duplicate(fieldSet);
    fieldSet.key = vl.field.shorthands(fieldSet);
    output.push(fieldSet);
  }

  function checkAndPush() {
    if (opt.omitMeasureOnly || opt.omitDimensionOnly) {
      var hasMeasure = false, hasDimension = false, hasRaw = false;
      tf.forEach(function(f) {
        if (vl.field.isDimension(f)) {
          hasDimension = true;
        } else {
          hasMeasure = true;
          if (!f.aggregate) hasRaw = true;
        }
      });
      if (!hasDimension && !hasRaw && opt.omitMeasureOnly) return;
      if (!hasMeasure) {
        if (opt.addCountForDimensionOnly) {
          tf.push(vl.field.count());
          emit(tf);
          tf.pop();
        }
        if (opt.omitDimensionOnly) return;
      }
    }
    if (opt.omitDotPlot && tf.length === 1) return;
    emit(tf);
  }

  function assignAggrQ(i, hasAggr, autoMode, a) {
    var canHaveAggr = hasAggr === true || hasAggr === null,
      cantHaveAggr = hasAggr === false || hasAggr === null;
    if (a) {
      if (canHaveAggr) {
        tf[i].aggregate = a;
        assignField(i + 1, true, autoMode);
        delete tf[i].aggregate;
      }
    } else { // if(a === undefined)
      if (cantHaveAggr) {
        assignField(i + 1, false, autoMode);
      }
    }
  }

  function assignBinQ(i, hasAggr, autoMode) {
    tf[i].bin = true;
    assignField(i + 1, hasAggr, autoMode);
    delete tf[i].bin;
  }

  function assignQ(i, hasAggr, autoMode) {
    var f = fields[i],
      canHaveAggr = hasAggr === true || hasAggr === null;

    tf[i] = {name: f.name, type: f.type};

    if (f.aggregate === 'count') { // if count is included in the selected fields
      if (canHaveAggr) {
        tf[i].aggregate = f.aggregate;
        assignField(i + 1, true, autoMode);
      }
    } else if (f._aggregate) {
      // TODO support array of f._aggrs too
      assignAggrQ(i, hasAggr, autoMode, f._aggregate);
    } else if (f._raw) {
      assignAggrQ(i, hasAggr, autoMode, undefined);
    } else if (f._bin) {
      assignBinQ(i, hasAggr, autoMode);
    } else {
      opt.aggrList.forEach(function(a) {
        if (!opt.consistentAutoQ || autoMode === ANY || autoMode === a) {
          assignAggrQ(i, hasAggr, a /*assign autoMode*/, a);
        }
      });

      if ((!opt.consistentAutoQ || vl.isin(autoMode, [ANY, 'bin', 'cast', 'autocast'])) && !hasNorO) {
        var highCardinality = vl.field.cardinality(f, stats) > opt.minCardinalityForBin;

        var isAuto = opt.genDimQ === 'auto',
          genBin = opt.genDimQ  === 'bin' || (isAuto && highCardinality),
          genCast = opt.genDimQ === 'cast' || (isAuto && !highCardinality);

        if (genBin && vl.isin(autoMode, [ANY, 'bin', 'autocast'])) {
          assignBinQ(i, hasAggr, isAuto ? 'autocast' : 'bin');
        }
        if (genCast && vl.isin(autoMode, [ANY, 'cast', 'autocast'])) {
          tf[i].type = 'O';
          assignField(i + 1, hasAggr, isAuto ? 'autocast' : 'cast');
          tf[i].type = 'Q';
        }
      }
    }
  }

  function assignFnT(i, hasAggr, autoMode, fn) {
    tf[i].fn = fn;
    assignField(i+1, hasAggr, autoMode);
    delete tf[i].fn;
  }

  function assignT(i, hasAggr, autoMode) {
    var f = fields[i];
    tf[i] = {name: f.name, type: f.type};

    // TODO support array of f._fns
    if (f._fn) {
      assignFnT(i, hasAggr, autoMode, f._fn);
    } else {
      opt.timeFnList.forEach(function(fn) {
        if (fn === undefined) {
          if (!hasAggr) { // can't aggregate over raw time
            assignField(i+1, false, autoMode);
          }
        } else {
          assignFnT(i, hasAggr, autoMode, fn);
        }
      });
    }

    // FIXME what if you aggregate time?
  }

  function assignField(i, hasAggr, autoMode) {
    if (i === fields.length) { // If all fields are assigned
      checkAndPush();
      return;
    }

    var f = fields[i];
    // Otherwise, assign i-th field
    switch (f.type) {
      //TODO "D", "G"
      case Q:
        assignQ(i, hasAggr, autoMode);
        break;

      case T:
        assignT(i, hasAggr, autoMode);
        break;
      case O:
        /* falls through */
      case N:
        /* falls through */
      default:
        tf[i] = f;
        assignField(i + 1, hasAggr, autoMode);
        break;
    }
  }

  var hasAggr = opt.tableTypes === 'aggregated' ? true : opt.tableTypes === 'disaggregated' ? false : null;
  assignField(0, hasAggr, ANY);

  return output;
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"../consts":10}],12:[function(require,module,exports){
(function (global){
'use strict';

var vl = (typeof window !== "undefined" ? window.vl : typeof global !== "undefined" ? global.vl : null),
  genEncs = require('./encs'),
  getMarktypes = require('./marktypes'),
  rank = require('../rank/rank'),
  consts = require('../consts');

module.exports = genEncodingsFromFields;

function genEncodingsFromFields(output, fields, stats, opt, nested) {
  opt = vl.schema.util.extend(opt||{}, consts.gen.encodings);
  var encs = genEncs([], fields, stats, opt);

  if (nested) {
    return encs.reduce(function(dict, enc) {
      dict[enc] = genEncodingsFromEncs([], enc, stats, opt);
      return dict;
    }, {});
  } else {
    return encs.reduce(function(list, enc) {
      return genEncodingsFromEncs(list, enc, stats, opt);
    }, []);
  }
}

function genEncodingsFromEncs(output, enc, stats, opt) {
  getMarktypes(enc, stats, opt)
    .forEach(function(markType) {
      var e = vl.duplicate({
          data: opt.data,
          marktype: markType,
          encoding: enc,
          config: opt.config
        }),
        encoding = finalTouch(e, stats, opt),
        score = rank.encoding(encoding, stats, opt);

      encoding.score = score.score;
      encoding.scoreFeatures = score.features;
      output.push(encoding);
    });
  return output;
}

//FIXME this should be refactors
function finalTouch(encoding, stats, opt) {
  if (encoding.marktype === 'text' && opt.alwaysGenerateTableAsHeatmap) {
    encoding.encoding.color = encoding.encoding.text;
  }

  // don't include zero if stdev/avg < 0.01
  // https://github.com/uwdata/visrec/issues/69
  var enc = encoding.encoding;
  ['x', 'y'].forEach(function(et) {
    var field = enc[et];
    if (field && vl.field.isMeasure(field) && !vl.field.isCount(field)) {
      var stat = stats[field.name];
      if (stat && stat.stdev / stat.avg < 0.01) {
        field.scale = {zero: false};
      }
    }
  });
  return encoding;
}
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"../consts":10,"../rank/rank":18,"./encs":13,"./marktypes":15}],13:[function(require,module,exports){
(function (global){
"use strict";
require('../globals');

var vl = (typeof window !== "undefined" ? window.vl : typeof global !== "undefined" ? global.vl : null),
  consts = require('../consts'),
  genMarkTypes = require('./marktypes'),
  isDimension = vl.field.isDimension,
  isMeasure = vl.field.isMeasure;

module.exports = genEncs;

// FIXME remove dimension, measure and use information in vega-lite instead!
var rules = {
  x: {
    dimension: true,
    measure: true,
    multiple: true //FIXME should allow multiple only for Q, T
  },
  y: {
    dimension: true,
    measure: true,
    multiple: true //FIXME should allow multiple only for Q, T
  },
  row: {
    dimension: true,
    multiple: true
  },
  col: {
    dimension: true,
    multiple: true
  },
  shape: {
    dimension: true,
    rules: shapeRules
  },
  size: {
    measure: true,
    rules: retinalEncRules
  },
  color: {
    dimension: true,
    measure: true,
    rules: colorRules
  },
  alpha: {
    measure: true,
    rules: retinalEncRules
  },
  text: {
    measure: true
  },
  detail: {
    dimension: true
  }
  //geo: {
  //  geo: true
  //},
  //arc: { // pie
  //
  //}
};

function retinalEncRules(enc, field, stats, opt) {
  if (opt.omitMultipleRetinalEncodings) {
    if (enc.color || enc.size || enc.shape || enc.alpha) return false;
  }
  return true;
}

function colorRules(enc, field, stats, opt) {
  if(!retinalEncRules(enc, field, stats, opt)) return false;

  return vl.field.isMeasure(field) ||
    vl.field.cardinality(field, stats) <= opt.maxCardinalityForColor;
}

function shapeRules(enc, field, stats, opt) {
  if(!retinalEncRules(enc, field, stats, opt)) return false;

  if (field.bin && field.type === Q) return false;
  if (field.fn && field.type === T) return false;
  return vl.field.cardinality(field, stats) <= opt.maxCardinalityForColor;
}

function dimMeaTransposeRule(enc) {
  // create horizontal histogram for ordinal
  if (vl.field.isTypes(enc.y, [N, O]) && isMeasure(enc.x)) return true;

  // vertical histogram for Q and T
  if (isMeasure(enc.y) && (!vl.field.isTypes(enc.x, [N, O]) && isDimension(enc.x))) return true;

  return false;
}

function generalRules(enc, stats, opt) {
  // enc.text is only used for TEXT TABLE
  if (enc.text) {
    return genMarkTypes.satisfyRules(enc, TEXT, stats, opt);
  }

  // CARTESIAN PLOT OR MAP
  if (enc.x || enc.y || enc.geo || enc.arc) {

    if (enc.row || enc.col) { //have facet(s)

      // don't use facets before filling up x,y
      if (!enc.x || !enc.y) return false;

      if (opt.omitNonTextAggrWithAllDimsOnFacets) {
        // remove all aggregated charts with all dims on facets (row, col)
        if (genEncs.isAggrWithAllDimOnFacets(enc)) return false;
      }
    }

    if (enc.x && enc.y) {
      var isDimX = !!isDimension(enc.x),
        isDimY = !!isDimension(enc.y);

      if (isDimX && isDimY && !vl.enc.isAggregate(enc)) {
        // FIXME actually check if there would be occlusion #90
        return false;
      }

      if (opt.omitTranpose) {
        if (isDimX ^ isDimY) { // dim x mea
          if (!dimMeaTransposeRule(enc)) return false;
        } else if (enc.y.type===T || enc.x.type === T) {
          if (enc.y.type===T && enc.x.type !== T) return false;
        } else { // show only one OxO, QxQ
          if (enc.x.name > enc.y.name) return false;
        }
      }
      return true;
    }

    // DOT PLOTS
    // // plot with one axis = dot plot
    if (opt.omitDotPlot) return false;

    // Dot plot should always be horizontal
    if (opt.omitTranpose && enc.y) return false;

    // dot plot shouldn't have other encoding
    if (opt.omitDotPlotWithExtraEncoding && vl.keys(enc).length > 1) return false;

    // one dimension "count" is useless
    if (enc.x && enc.x.aggregate == 'count' && !enc.y) return false;
    if (enc.y && enc.y.aggregate == 'count' && !enc.x) return false;

    return true;
  }
  return false;
}

genEncs.isAggrWithAllDimOnFacets = function (enc) {
  var hasAggr = false, hasOtherO = false;
  for (var encType in enc) {
    var field = enc[encType];
    if (field.aggregate) {
      hasAggr = true;
    }
    if (vl.field.isDimension(field) && (encType !== ROW && encType !== COL)) {
      hasOtherO = true;
    }
    if (hasAggr && hasOtherO) break;
  }

  return hasAggr && !hasOtherO;
};


function genEncs(encs, fields, stats, opt) {
  opt = vl.schema.util.extend(opt||{}, consts.gen.encodings);
  // generate a collection vega-lite's enc
  var tmpEnc = {};

  function assignField(i) {
    // If all fields are assigned, save
    if (i === fields.length) {
      // at the minimal all chart should have x, y, geo, text or arc
      if (generalRules(tmpEnc, stats, opt)) {
        encs.push(vl.duplicate(tmpEnc));
      }
      return;
    }

    // Otherwise, assign i-th field
    var field = fields[i];
    for (var j in opt.encodingTypeList) {
      var et = opt.encodingTypeList[j],
        isDim = isDimension(field);

      //TODO: support "multiple" assignment
      if (!(et in tmpEnc) && // encoding not used
        ((isDim && rules[et].dimension) || (!isDim && rules[et].measure)) &&
        (!rules[et].rules || rules[et].rules(tmpEnc, field, stats, opt))
      ) {
        tmpEnc[et] = field;
        assignField(i + 1);
        delete tmpEnc[et];
      }
    }
  }

  assignField(0);

  return encs;
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"../consts":10,"../globals":17,"./marktypes":15}],14:[function(require,module,exports){
'use strict';

var util = require('../util');

var gen = module.exports = {
  // data variations
  aggregates: require('./aggregates'),
  projections: require('./projections'),
  // encodings / visual variatons
  encodings: require('./encodings'),
  encs: require('./encs'),
  marktypes: require('./marktypes')
};

gen.charts = function(fields, opt, cfg, flat) {
  opt = util.gen.getOpt(opt);
  flat = flat === undefined ? {encodings: 1} : flat;

  // TODO generate

  // generate permutation of encoding mappings
  var fieldSets = opt.genAggr ? gen.aggregates([], fields, opt) : [fields],
    encs, charts, level = 0;

  if (flat === true || (flat && flat.aggregate)) {
    encs = fieldSets.reduce(function(output, fields) {
      return gen.encs(output, fields, opt);
    }, []);
  } else {
    encs = fieldSets.map(function(fields) {
      return gen.encs([], fields, opt);
    }, true);
    level += 1;
  }

  if (flat === true || (flat && flat.encodings)) {
    charts = util.nestedReduce(encs, function(output, enc) {
      return gen.marktypes(output, enc, opt, cfg);
    }, level, true);
  } else {
    charts = util.nestedMap(encs, function(enc) {
      return gen.marktypes([], enc, opt, cfg);
    }, level, true);
    level += 1;
  }
  return charts;
};
},{"../util":20,"./aggregates":11,"./encodings":12,"./encs":13,"./marktypes":15,"./projections":16}],15:[function(require,module,exports){
(function (global){
"use strict";

var vl = (typeof window !== "undefined" ? window.vl : typeof global !== "undefined" ? global.vl : null),
  consts = require('../consts'),
  isDimension = vl.field.isDimension,
  isOrdinalScale = vl.field.isOrdinalScale;

var vlmarktypes = module.exports = getMarktypes;

var marksRule = vlmarktypes.rule = {
  point:  pointRule,
  bar:    barRule,
  line:   lineRule,
  area:   areaRule, // area is similar to line
  text:   textRule,
  tick:   tickRule
};

function getMarktypes(enc, stats, opt) {
  opt = vl.schema.util.extend(opt||{}, consts.gen.encodings);

  var markTypes = opt.marktypeList.filter(function(markType){
    return vlmarktypes.satisfyRules(enc, markType, stats, opt);
  });

  return markTypes;
}

vlmarktypes.satisfyRules = function (enc, markType, stats, opt) {
  var mark = vl.compile.marks[markType],
    reqs = mark.requiredEncoding,
    support = mark.supportedEncoding;

  for (var i in reqs) { // all required encodings in enc
    if (!(reqs[i] in enc)) return false;
  }

  for (var encType in enc) { // all encodings in enc are supported
    if (!support[encType]) return false;
  }

  return !marksRule[markType] || marksRule[markType](enc, stats, opt);
};

function facetRule(field, stats, opt) {
  return vl.field.cardinality(field, stats) <= opt.maxCardinalityForFacets;
}

function facetsRule(enc, stats, opt) {
  if(enc.row && !facetRule(enc.row, stats, opt)) return false;
  if(enc.col && !facetRule(enc.col, stats, opt)) return false;
  return true;
}

function pointRule(enc, stats, opt) {
  if(!facetsRule(enc, stats, opt)) return false;
  if (enc.x && enc.y) {
    // have both x & y ==> scatter plot / bubble plot

    var xIsDim = isDimension(enc.x),
      yIsDim = isDimension(enc.y);

    // For OxO
    if (xIsDim && yIsDim) {
      // shape doesn't work with both x, y as ordinal
      if (enc.shape) {
        return false;
      }

      // TODO(kanitw): check that there is quant at least ...
      if (enc.color && isDimension(enc.color)) {
        return false;
      }
    }

  } else { // plot with one axis = dot plot
    if (opt.omitDotPlot) return false;

    // Dot plot should always be horizontal
    if (opt.omitTranpose && enc.y) return false;

    // dot plot shouldn't have other encoding
    if (opt.omitDotPlotWithExtraEncoding && vl.keys(enc).length > 1) return false;

    // dot plot with shape is non-sense
    if (enc.shape) return false;
  }
  return true;
}

function tickRule(enc, stats, opt) {
  // jshint unused:false
  if (enc.x || enc.y) {
    if(vl.enc.isAggregate(enc)) return false;

    var xIsDim = isDimension(enc.x),
      yIsDim = isDimension(enc.y);

    return (!xIsDim && (!enc.y || isOrdinalScale(enc.y))) ||
      (!yIsDim && (!enc.x || isOrdinalScale(enc.x)));
  }
  return false;
}

function barRule(enc, stats, opt) {
  if(!facetsRule(enc, stats, opt)) return false;

  // need to aggregate on either x or y
  if (opt.omitSizeOnBar && enc.size !== undefined) return false;

  // FIXME actually check if there would be occlusion #90
  if (((enc.x.aggregate !== undefined) ^ (enc.y.aggregate !== undefined)) &&
      (isDimension(enc.x) ^ isDimension(enc.y))) {

    var aggregate = enc.x.aggregate || enc.y.aggregate;
    return !(opt.omitStackedAverage && aggregate ==='avg' && enc.color);
  }

  return false;
}

function lineRule(enc, stats, opt) {
  if(!facetsRule(enc, stats, opt)) return false;

  // TODO(kanitw): add omitVerticalLine as config

  // FIXME truly ordinal data is fine here too.
  // Line chart should be only horizontal
  // and use only temporal data
  return enc.x.type == 'T' && enc.x.fn && enc.y.type == 'Q' && enc.y.aggregate;
}

function areaRule(enc, stats, opt) {
  if(!facetsRule(enc, stats, opt)) return false;

  if(!lineRule(enc, stats, opt)) return false;

  return !(opt.omitStackedAverage && enc.y.aggregate ==='avg' && enc.color);
}

function textRule(enc, stats, opt) {
  // at least must have row or col and aggregated text values
  return (enc.row || enc.col) && enc.text && enc.text.aggregate && !enc.x && !enc.y && !enc.size &&
    (!opt.alwaysGenerateTableAsHeatmap || !enc.color);
}
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"../consts":10}],16:[function(require,module,exports){
(function (global){
'use strict';

var util = require('../util'),
  consts = require('../consts'),
  vl = (typeof window !== "undefined" ? window.vl : typeof global !== "undefined" ? global.vl : null),
  isDimension = vl.field.isDimension;

module.exports = projections;

// TODO support other mode of projections generation
// powerset, chooseK, chooseKorLess are already included in the util

/**
 * fields
 * @param  {[type]} fields array of fields and query information
 * @return {[type]}        [description]
 */
function projections(fields, stats, opt) {
  opt = vl.schema.util.extend(opt||{}, consts.gen.projections);

  // First categorize field, selected, fieldsToAdd, and save indices
  var selected = [], fieldsToAdd = [], fieldSets = [],
    hasSelectedDimension = false,
    hasSelectedMeasure = false,
    indices = {};

  fields.forEach(function(field, index){
    //save indices for stable sort later
    indices[field.name] = index;

    if (field.selected) {
      selected.push(field);
      if (isDimension(field) || field.type ==='T') { // FIXME / HACK
        hasSelectedDimension = true;
      } else {
        hasSelectedMeasure = true;
      }
    } else if (field.selected !== false && !vl.field.isCount(field)) {
      if (vl.field.isDimension(field) &&
          !opt.maxCardinalityForAutoAddOrdinal &&
          vl.field.cardinality(field, stats, 15) > opt.maxCardinalityForAutoAddOrdinal
        ) {
        return;
      }
      fieldsToAdd.push(field);
    }
  });

  fieldsToAdd.sort(compareFieldsToAdd(hasSelectedDimension, hasSelectedMeasure, indices));

  var setsToAdd = util.chooseKorLess(fieldsToAdd, 1);

  setsToAdd.forEach(function(setToAdd) {
    var fieldSet = selected.concat(setToAdd);
    if (fieldSet.length > 0) {
      if (opt.omitDotPlot && fieldSet.length === 1) return;
      fieldSets.push(fieldSet);
    }
  });

  fieldSets.forEach(function(fieldSet) {
      // always append projection's key to each projection returned, d3 style.
    fieldSet.key = projections.key(fieldSet);
  });

  return fieldSets;
}

var typeIsMeasureScore = {
  N: 0,
  O: 1,
  T: 2,
  Q: 3
};

function compareFieldsToAdd(hasSelectedDimension, hasSelectedMeasure, indices) {
  return function(a, b){
    // sort by type of the data
    if (a.type !== b.type) {
      if (!hasSelectedDimension) {
        return typeIsMeasureScore[a.type] - typeIsMeasureScore[b.type];
      } else if (!hasSelectedMeasure) {
        return typeIsMeasureScore[b.type] - typeIsMeasureScore[a.type];
      }
    }
    //make the sort stable
    return indices[a.name] - indices[b.name];
  };
}

projections.key = function(projection) {
  return projection.map(function(field) {
    return vl.field.isCount(field) ? 'count' : field.name;
  }).join(',');
};


}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"../consts":10,"../util":20}],17:[function(require,module,exports){
(function (global){
'use strict';

var g = global || window;

require('vega-lite/src/globals');

g.CHART_TYPES = {
  TABLE: 'TABLE',
  BAR: 'BAR',
  PLOT: 'PLOT',
  LINE: 'LINE',
  AREA: 'AREA',
  MAP: 'MAP',
  HISTOGRAM: 'HISTOGRAM'
};

g.ANY_DATA_TYPES = (1 << 4) - 1;
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"vega-lite/src/globals":6}],18:[function(require,module,exports){
module.exports = {
  encoding: require('./rankEncodings')
};



},{"./rankEncodings":19}],19:[function(require,module,exports){
(function (global){
'use strict';

require('../globals');

var vl = (typeof window !== "undefined" ? window.vl : typeof global !== "undefined" ? global.vl : null),
  isDimension = vl.field.isDimension;

module.exports = rankEncodings;

// bad score not specified in the table above
var UNUSED_POSITION = 0.5;

var MARK_SCORE = {
  line: 0.99,
  area: 0.98,
  bar: 0.97,
  tick: 0.96,
  point: 0.95,
  circle: 0.94,
  square: 0.94,
  text: 0.8
};

function rankEncodings(encoding, stats, opt, selected) {
  var features = [],
    encTypes = vl.keys(encoding.encoding),
    marktype = encoding.marktype,
    enc = encoding.encoding;

  var encodingMappingByField = vl.enc.reduce(encoding.encoding, function(o, field, encType) {
    var key = vl.field.shorthand(field);
    var mappings = o[key] = o[key] || [];
    mappings.push({encType: encType, field: field});
    return o;
  }, {});

  // data - encoding mapping score
  vl.forEach(encodingMappingByField, function(mappings) {
    var reasons = mappings.map(function(m) {
        return m.encType + vl.shorthand.assign + vl.field.shorthand(m.field) +
          ' ' + (selected && selected[m.field.name] ? '[x]' : '[ ]');
      }),
      scores = mappings.map(function(m) {
        var role = vl.field.role(m.field);
        var score = rankEncodings.score[role](m.field, m.encType, encoding.marktype, stats, opt);

        return !selected || selected[m.field.name] ? score : Math.pow(score, 0.125);
      });

    features.push({
      reason: reasons.join(" | "),
      score: Math.max.apply(null, scores)
    });
  });

  // plot type
  if (marktype === TEXT) {
    // TODO
  } else {
    if (enc.x && enc.y) {
      if (isDimension(enc.x) ^ isDimension(enc.y)) {
        features.push({
          reason: 'OxQ plot',
          score: 0.8
        });
      }
    }
  }

  // penalize not using positional only penalize for non-text
  if (encTypes.length > 1 && marktype !== TEXT) {
    if ((!enc.x || !enc.y) && !enc.geo && !enc.text) {
      features.push({
        reason: 'unused position',
        score: UNUSED_POSITION
      });
    }
  }

  // mark type score
  features.push({
    reason: 'marktype='+marktype,
    score: MARK_SCORE[marktype]
  });

  return {
    score: features.reduce(function(p, f) {
      return p * f.score;
    }, 1),
    features: features
  };
}


var D = {}, M = {}, BAD = 0.1, TERRIBLE = 0.01;

D.minor = 0.01;
D.pos = 1;
D.Y_T = 0.8;
D.facet_text = 1;
D.facet_good = 0.675; // < color_ok, > color_bad
D.facet_ok = 0.55;
D.facet_bad = 0.4;
D.color_good = 0.7;
D.color_ok = 0.65; // > M.Size
D.color_bad = 0.3;
D.color_stack = 0.6;
D.shape = 0.6;
D.detail = 0.5;
D.bad = BAD;
D.terrible = TERRIBLE;

M.pos = 1;
M.size = 0.6;
M.color = 0.5;
M.alpha = 0.45;
M.text = 0.4;
M.bad = BAD;
M.terrible = TERRIBLE;

rankEncodings.dimensionScore = function (field, encType, marktype, stats, opt){
  var cardinality = vl.field.cardinality(field, stats);
  switch (encType) {
    case X:
      if (vl.field.isTypes(field, [N, O]))  return D.pos - D.minor;
      return D.pos;

    case Y:
      if (vl.field.isTypes(field, [N, O])) return D.pos - D.minor; //prefer ordinal on y
      if(field.type === T) return D.Y_T; // time should not be on Y
      return D.pos - D.minor;

    case COL:
      if (marktype === TEXT) return D.facet_text;
      //prefer column over row due to scrolling issues
      return cardinality <= opt.maxGoodCardinalityForFacets ? D.facet_good :
        cardinality <= opt.maxCardinalityForFacets ? D.facet_ok : D.facet_bad;

    case ROW:
      if (marktype === TEXT) return D.facet_text;
      return (cardinality <= opt.maxGoodCardinalityForFacets ? D.facet_good :
        cardinality <= opt.maxCardinalityForFacets ? D.facet_ok : D.facet_bad) - D.minor;

    case COLOR:
      var hasOrder = (field.bin && field.type===Q) || (field.fn && field.type===T);

      //FIXME add stacking option once we have control ..
      var isStacked = marktype === 'bar' || marktype === 'area';

      // true ordinal on color is currently BAD (until we have good ordinal color scale support)
      if (hasOrder) return D.color_bad;

      //stacking gets lower score
      if (isStacked) return D.color_stack;

      return cardinality <= opt.maxGoodCardinalityForColor ? D.color_good: cardinality <= opt.maxCardinalityForColor ? D.color_ok : D.color_bad;
    case SHAPE:
      return cardinality <= opt.maxCardinalityForShape ? D.shape : TERRIBLE;
    case DETAIL:
      return D.detail;
  }
  return TERRIBLE;
};

rankEncodings.dimensionScore.consts = D;

rankEncodings.measureScore = function (field, encType, marktype, stats, opt) {
  // jshint unused:false
  switch (encType){
    case X: return M.pos;
    case Y: return M.pos;
    case SIZE:
      if (marktype === 'bar') return BAD; //size of bar is very bad
      if (marktype === TEXT) return BAD;
      if (marktype === 'line') return BAD;
      return M.size;
    case COLOR: return M.color;
    case 'alpha': return M.alpha;
    case TEXT: return M.text;
  }
  return BAD;
};

rankEncodings.measureScore.consts = M;


rankEncodings.score = {
  dimension: rankEncodings.dimensionScore,
  measure: rankEncodings.measureScore,
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"../globals":17}],20:[function(require,module,exports){
"use strict";

var consts = require('./consts');

var util = module.exports = {
  gen: {}
};

util.isArray = Array.isArray || function (obj) {
  return {}.toString.call(obj) == '[object Array]';
};

util.json = function(s, sp) {
  return JSON.stringify(s, null, sp);
};

util.keys = function(obj) {
  var k = [], x;
  for (x in obj) k.push(x);
  return k;
};

util.nestedMap = function (col, f, level, filter) {
  return level === 0 ?
    col.map(f) :
    col.map(function(v) {
      var r = util.nestedMap(v, f, level - 1);
      return filter ? r.filter(util.nonEmpty) : r;
    });
};

util.nestedReduce = function (col, f, level, filter) {
  return level === 0 ?
    col.reduce(f, []) :
    col.map(function(v) {
      var r = util.nestedReduce(v, f, level - 1);
      return filter ? r.filter(util.nonEmpty) : r;
    });
};

util.nonEmpty = function(grp) {
  return !util.isArray(grp) || grp.length > 0;
};


util.traverse = function (node, arr) {
  if (node.value !== undefined) {
    arr.push(node.value);
  } else {
    if (node.left) util.traverse(node.left, arr);
    if (node.right) util.traverse(node.right, arr);
  }
  return arr;
};

util.union = function (a, b) {
  var o = {};
  a.forEach(function(x) { o[x] = true;});
  b.forEach(function(x) { o[x] = true;});
  return util.keys(o);
};


util.gen.getOpt = function (opt) {
  //merge with default
  return (opt ? util.keys(opt) : []).reduce(function(c, k) {
    c[k] = opt[k];
    return c;
  }, Object.create(consts.gen.DEFAULT_OPT));
};

/**
 * powerset code from http://rosettacode.org/wiki/Power_Set#JavaScript
 *
 *   var res = powerset([1,2,3,4]);
 *
 * returns
 *
 * [[],[1],[2],[1,2],[3],[1,3],[2,3],[1,2,3],[4],[1,4],
 * [2,4],[1,2,4],[3,4],[1,3,4],[2,3,4],[1,2,3,4]]
[edit]
*/

util.powerset = function(list) {
  var ps = [
    []
  ];
  for (var i = 0; i < list.length; i++) {
    for (var j = 0, len = ps.length; j < len; j++) {
      ps.push(ps[j].concat(list[i]));
    }
  }
  return ps;
};

util.chooseKorLess = function(list, k) {
  var subset = [[]];
  for (var i = 0; i < list.length; i++) {
    for (var j = 0, len = subset.length; j < len; j++) {
      var sub = subset[j].concat(list[i]);
      if(sub.length <= k){
        subset.push(sub);
      }
    }
  }
  return subset;
};

util.chooseK = function(list, k) {
  var subset = [[]];
  var kArray =[];
  for (var i = 0; i < list.length; i++) {
    for (var j = 0, len = subset.length; j < len; j++) {
      var sub = subset[j].concat(list[i]);
      if(sub.length < k){
        subset.push(sub);
      }else if (sub.length === k){
        kArray.push(sub);
      }
    }
  }
  return kArray;
};

util.cross = function(a,b){
  var x = [];
  for(var i=0; i< a.length; i++){
    for(var j=0;j< b.length; j++){
      x.push(a[i].concat(b[j]));
    }
  }
  return x;
};


},{"./consts":10}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvY3AiLCJub2RlX21vZHVsZXMvY2x1c3RlcmZjay9saWIvY2x1c3RlcmZjay5qcyIsIm5vZGVfbW9kdWxlcy9jbHVzdGVyZmNrL2xpYi9kaXN0YW5jZS5qcyIsIm5vZGVfbW9kdWxlcy9jbHVzdGVyZmNrL2xpYi9oY2x1c3Rlci5qcyIsIm5vZGVfbW9kdWxlcy9jbHVzdGVyZmNrL2xpYi9rbWVhbnMuanMiLCJub2RlX21vZHVsZXMvdmVnYS1saXRlL3NyYy9nbG9iYWxzLmpzIiwic3JjL2NsdXN0ZXIvY2x1c3Rlci5qcyIsInNyYy9jbHVzdGVyL2NsdXN0ZXJjb25zdHMuanMiLCJzcmMvY2x1c3Rlci9kaXN0YW5jZS5qcyIsInNyYy9jb25zdHMuanMiLCJzcmMvZ2VuL2FnZ3JlZ2F0ZXMuanMiLCJzcmMvZ2VuL2VuY29kaW5ncy5qcyIsInNyYy9nZW4vZW5jcy5qcyIsInNyYy9nZW4vZ2VuLmpzIiwic3JjL2dlbi9tYXJrdHlwZXMuanMiLCJzcmMvZ2VuL3Byb2plY3Rpb25zLmpzIiwic3JjL2dsb2JhbHMuanMiLCJzcmMvcmFuay9yYW5rLmpzIiwic3JjL3JhbmsvcmFua0VuY29kaW5ncy5qcyIsInNyYy91dGlsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDN0dBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDekJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDdkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDNUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDbkxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDL0tBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDaEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNoTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDOUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ2hKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNoR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ2hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUM5TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIm1vZHVsZS5leHBvcnRzID0ge1xuICBjb25zdHM6IHJlcXVpcmUoJy4vY29uc3RzJyksXG4gIGNsdXN0ZXI6IHJlcXVpcmUoJy4vY2x1c3Rlci9jbHVzdGVyJyksXG4gIGdlbjogcmVxdWlyZSgnLi9nZW4vZ2VuJyksXG4gIHJhbms6IHJlcXVpcmUoJy4vcmFuay9yYW5rJyksXG4gIHV0aWw6IHJlcXVpcmUoJy4vdXRpbCcpLFxuICBhdXRvOiBcIi0sIHN1bVwiXG59O1xuXG5cbiIsIm1vZHVsZS5leHBvcnRzID0ge1xuICAgaGNsdXN0ZXI6IHJlcXVpcmUoXCIuL2hjbHVzdGVyXCIpLFxuICAgS21lYW5zOiByZXF1aXJlKFwiLi9rbWVhbnNcIiksXG4gICBrbWVhbnM6IHJlcXVpcmUoXCIuL2ttZWFuc1wiKS5rbWVhbnNcbn07IiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gIGV1Y2xpZGVhbjogZnVuY3Rpb24odjEsIHYyKSB7XG4gICAgICB2YXIgdG90YWwgPSAwO1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB2MS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgdG90YWwgKz0gTWF0aC5wb3codjJbaV0gLSB2MVtpXSwgMik7ICAgICAgXG4gICAgICB9XG4gICAgICByZXR1cm4gTWF0aC5zcXJ0KHRvdGFsKTtcbiAgIH0sXG4gICBtYW5oYXR0YW46IGZ1bmN0aW9uKHYxLCB2Mikge1xuICAgICB2YXIgdG90YWwgPSAwO1xuICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHYxLmxlbmd0aCA7IGkrKykge1xuICAgICAgICB0b3RhbCArPSBNYXRoLmFicyh2MltpXSAtIHYxW2ldKTsgICAgICBcbiAgICAgfVxuICAgICByZXR1cm4gdG90YWw7XG4gICB9LFxuICAgbWF4OiBmdW5jdGlvbih2MSwgdjIpIHtcbiAgICAgdmFyIG1heCA9IDA7XG4gICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdjEubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgbWF4ID0gTWF0aC5tYXgobWF4ICwgTWF0aC5hYnModjJbaV0gLSB2MVtpXSkpOyAgICAgIFxuICAgICB9XG4gICAgIHJldHVybiBtYXg7XG4gICB9XG59OyIsInZhciBkaXN0YW5jZXMgPSByZXF1aXJlKFwiLi9kaXN0YW5jZVwiKTtcblxudmFyIEhpZXJhcmNoaWNhbENsdXN0ZXJpbmcgPSBmdW5jdGlvbihkaXN0YW5jZSwgbGlua2FnZSwgdGhyZXNob2xkKSB7XG4gICB0aGlzLmRpc3RhbmNlID0gZGlzdGFuY2U7XG4gICB0aGlzLmxpbmthZ2UgPSBsaW5rYWdlO1xuICAgdGhpcy50aHJlc2hvbGQgPSB0aHJlc2hvbGQgPT0gdW5kZWZpbmVkID8gSW5maW5pdHkgOiB0aHJlc2hvbGQ7XG59XG5cbkhpZXJhcmNoaWNhbENsdXN0ZXJpbmcucHJvdG90eXBlID0ge1xuICAgY2x1c3RlciA6IGZ1bmN0aW9uKGl0ZW1zLCBzbmFwc2hvdFBlcmlvZCwgc25hcHNob3RDYikge1xuICAgICAgdGhpcy5jbHVzdGVycyA9IFtdO1xuICAgICAgdGhpcy5kaXN0cyA9IFtdOyAgLy8gZGlzdGFuY2VzIGJldHdlZW4gZWFjaCBwYWlyIG9mIGNsdXN0ZXJzXG4gICAgICB0aGlzLm1pbnMgPSBbXTsgLy8gY2xvc2VzdCBjbHVzdGVyIGZvciBlYWNoIGNsdXN0ZXJcbiAgICAgIHRoaXMuaW5kZXggPSBbXTsgLy8ga2VlcCBhIGhhc2ggb2YgYWxsIGNsdXN0ZXJzIGJ5IGtleVxuICAgICAgXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGl0ZW1zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICB2YXIgY2x1c3RlciA9IHtcbiAgICAgICAgICAgIHZhbHVlOiBpdGVtc1tpXSxcbiAgICAgICAgICAgIGtleTogaSxcbiAgICAgICAgICAgIGluZGV4OiBpLFxuICAgICAgICAgICAgc2l6ZTogMVxuICAgICAgICAgfTtcbiAgICAgICAgIHRoaXMuY2x1c3RlcnNbaV0gPSBjbHVzdGVyO1xuICAgICAgICAgdGhpcy5pbmRleFtpXSA9IGNsdXN0ZXI7XG4gICAgICAgICB0aGlzLmRpc3RzW2ldID0gW107XG4gICAgICAgICB0aGlzLm1pbnNbaV0gPSAwO1xuICAgICAgfVxuXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuY2x1c3RlcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgIGZvciAodmFyIGogPSAwOyBqIDw9IGk7IGorKykge1xuICAgICAgICAgICAgdmFyIGRpc3QgPSAoaSA9PSBqKSA/IEluZmluaXR5IDogXG4gICAgICAgICAgICAgICB0aGlzLmRpc3RhbmNlKHRoaXMuY2x1c3RlcnNbaV0udmFsdWUsIHRoaXMuY2x1c3RlcnNbal0udmFsdWUpO1xuICAgICAgICAgICAgdGhpcy5kaXN0c1tpXVtqXSA9IGRpc3Q7XG4gICAgICAgICAgICB0aGlzLmRpc3RzW2pdW2ldID0gZGlzdDtcblxuICAgICAgICAgICAgaWYgKGRpc3QgPCB0aGlzLmRpc3RzW2ldW3RoaXMubWluc1tpXV0pIHtcbiAgICAgICAgICAgICAgIHRoaXMubWluc1tpXSA9IGo7ICAgICAgICAgICAgICAgXG4gICAgICAgICAgICB9XG4gICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHZhciBtZXJnZWQgPSB0aGlzLm1lcmdlQ2xvc2VzdCgpO1xuICAgICAgdmFyIGkgPSAwO1xuICAgICAgd2hpbGUgKG1lcmdlZCkge1xuICAgICAgICBpZiAoc25hcHNob3RDYiAmJiAoaSsrICUgc25hcHNob3RQZXJpb2QpID09IDApIHtcbiAgICAgICAgICAgc25hcHNob3RDYih0aGlzLmNsdXN0ZXJzKTsgICAgICAgICAgIFxuICAgICAgICB9XG4gICAgICAgIG1lcmdlZCA9IHRoaXMubWVyZ2VDbG9zZXN0KCk7XG4gICAgICB9XG4gICAgXG4gICAgICB0aGlzLmNsdXN0ZXJzLmZvckVhY2goZnVuY3Rpb24oY2x1c3Rlcikge1xuICAgICAgICAvLyBjbGVhbiB1cCBtZXRhZGF0YSB1c2VkIGZvciBjbHVzdGVyaW5nXG4gICAgICAgIGRlbGV0ZSBjbHVzdGVyLmtleTtcbiAgICAgICAgZGVsZXRlIGNsdXN0ZXIuaW5kZXg7XG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuIHRoaXMuY2x1c3RlcnM7XG4gICB9LFxuICBcbiAgIG1lcmdlQ2xvc2VzdDogZnVuY3Rpb24oKSB7XG4gICAgICAvLyBmaW5kIHR3byBjbG9zZXN0IGNsdXN0ZXJzIGZyb20gY2FjaGVkIG1pbnNcbiAgICAgIHZhciBtaW5LZXkgPSAwLCBtaW4gPSBJbmZpbml0eTtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5jbHVzdGVycy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgdmFyIGtleSA9IHRoaXMuY2x1c3RlcnNbaV0ua2V5LFxuICAgICAgICAgICAgIGRpc3QgPSB0aGlzLmRpc3RzW2tleV1bdGhpcy5taW5zW2tleV1dO1xuICAgICAgICAgaWYgKGRpc3QgPCBtaW4pIHtcbiAgICAgICAgICAgIG1pbktleSA9IGtleTtcbiAgICAgICAgICAgIG1pbiA9IGRpc3Q7XG4gICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAobWluID49IHRoaXMudGhyZXNob2xkKSB7XG4gICAgICAgICByZXR1cm4gZmFsc2U7ICAgICAgICAgXG4gICAgICB9XG5cbiAgICAgIHZhciBjMSA9IHRoaXMuaW5kZXhbbWluS2V5XSxcbiAgICAgICAgICBjMiA9IHRoaXMuaW5kZXhbdGhpcy5taW5zW21pbktleV1dO1xuXG4gICAgICAvLyBtZXJnZSB0d28gY2xvc2VzdCBjbHVzdGVyc1xuICAgICAgdmFyIG1lcmdlZCA9IHtcbiAgICAgICAgIGxlZnQ6IGMxLFxuICAgICAgICAgcmlnaHQ6IGMyLFxuICAgICAgICAga2V5OiBjMS5rZXksXG4gICAgICAgICBzaXplOiBjMS5zaXplICsgYzIuc2l6ZVxuICAgICAgfTtcblxuICAgICAgdGhpcy5jbHVzdGVyc1tjMS5pbmRleF0gPSBtZXJnZWQ7XG4gICAgICB0aGlzLmNsdXN0ZXJzLnNwbGljZShjMi5pbmRleCwgMSk7XG4gICAgICB0aGlzLmluZGV4W2MxLmtleV0gPSBtZXJnZWQ7XG5cbiAgICAgIC8vIHVwZGF0ZSBkaXN0YW5jZXMgd2l0aCBuZXcgbWVyZ2VkIGNsdXN0ZXJcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5jbHVzdGVycy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgdmFyIGNpID0gdGhpcy5jbHVzdGVyc1tpXTtcbiAgICAgICAgIHZhciBkaXN0O1xuICAgICAgICAgaWYgKGMxLmtleSA9PSBjaS5rZXkpIHtcbiAgICAgICAgICAgIGRpc3QgPSBJbmZpbml0eTsgICAgICAgICAgICBcbiAgICAgICAgIH1cbiAgICAgICAgIGVsc2UgaWYgKHRoaXMubGlua2FnZSA9PSBcInNpbmdsZVwiKSB7XG4gICAgICAgICAgICBkaXN0ID0gdGhpcy5kaXN0c1tjMS5rZXldW2NpLmtleV07XG4gICAgICAgICAgICBpZiAodGhpcy5kaXN0c1tjMS5rZXldW2NpLmtleV0gPiB0aGlzLmRpc3RzW2MyLmtleV1bY2kua2V5XSkge1xuICAgICAgICAgICAgICAgZGlzdCA9IHRoaXMuZGlzdHNbYzIua2V5XVtjaS5rZXldO1xuICAgICAgICAgICAgfVxuICAgICAgICAgfVxuICAgICAgICAgZWxzZSBpZiAodGhpcy5saW5rYWdlID09IFwiY29tcGxldGVcIikge1xuICAgICAgICAgICAgZGlzdCA9IHRoaXMuZGlzdHNbYzEua2V5XVtjaS5rZXldO1xuICAgICAgICAgICAgaWYgKHRoaXMuZGlzdHNbYzEua2V5XVtjaS5rZXldIDwgdGhpcy5kaXN0c1tjMi5rZXldW2NpLmtleV0pIHtcbiAgICAgICAgICAgICAgIGRpc3QgPSB0aGlzLmRpc3RzW2MyLmtleV1bY2kua2V5XTsgICAgICAgICAgICAgIFxuICAgICAgICAgICAgfVxuICAgICAgICAgfVxuICAgICAgICAgZWxzZSBpZiAodGhpcy5saW5rYWdlID09IFwiYXZlcmFnZVwiKSB7XG4gICAgICAgICAgICBkaXN0ID0gKHRoaXMuZGlzdHNbYzEua2V5XVtjaS5rZXldICogYzEuc2l6ZVxuICAgICAgICAgICAgICAgICAgICsgdGhpcy5kaXN0c1tjMi5rZXldW2NpLmtleV0gKiBjMi5zaXplKSAvIChjMS5zaXplICsgYzIuc2l6ZSk7XG4gICAgICAgICB9XG4gICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGRpc3QgPSB0aGlzLmRpc3RhbmNlKGNpLnZhbHVlLCBjMS52YWx1ZSk7ICAgICAgICAgICAgXG4gICAgICAgICB9XG5cbiAgICAgICAgIHRoaXMuZGlzdHNbYzEua2V5XVtjaS5rZXldID0gdGhpcy5kaXN0c1tjaS5rZXldW2MxLmtleV0gPSBkaXN0O1xuICAgICAgfVxuXG4gICAgXG4gICAgICAvLyB1cGRhdGUgY2FjaGVkIG1pbnNcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5jbHVzdGVycy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgdmFyIGtleTEgPSB0aGlzLmNsdXN0ZXJzW2ldLmtleTsgICAgICAgIFxuICAgICAgICAgaWYgKHRoaXMubWluc1trZXkxXSA9PSBjMS5rZXkgfHwgdGhpcy5taW5zW2tleTFdID09IGMyLmtleSkge1xuICAgICAgICAgICAgdmFyIG1pbiA9IGtleTE7XG4gICAgICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IHRoaXMuY2x1c3RlcnMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgIHZhciBrZXkyID0gdGhpcy5jbHVzdGVyc1tqXS5rZXk7XG4gICAgICAgICAgICAgICBpZiAodGhpcy5kaXN0c1trZXkxXVtrZXkyXSA8IHRoaXMuZGlzdHNba2V5MV1bbWluXSkge1xuICAgICAgICAgICAgICAgICAgbWluID0ga2V5MjsgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMubWluc1trZXkxXSA9IG1pbjtcbiAgICAgICAgIH1cbiAgICAgICAgIHRoaXMuY2x1c3RlcnNbaV0uaW5kZXggPSBpO1xuICAgICAgfVxuICAgIFxuICAgICAgLy8gY2xlYW4gdXAgbWV0YWRhdGEgdXNlZCBmb3IgY2x1c3RlcmluZ1xuICAgICAgZGVsZXRlIGMxLmtleTsgZGVsZXRlIGMyLmtleTtcbiAgICAgIGRlbGV0ZSBjMS5pbmRleDsgZGVsZXRlIGMyLmluZGV4O1xuXG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgIH1cbn1cblxudmFyIGhjbHVzdGVyID0gZnVuY3Rpb24oaXRlbXMsIGRpc3RhbmNlLCBsaW5rYWdlLCB0aHJlc2hvbGQsIHNuYXBzaG90LCBzbmFwc2hvdENhbGxiYWNrKSB7XG4gICBkaXN0YW5jZSA9IGRpc3RhbmNlIHx8IFwiZXVjbGlkZWFuXCI7XG4gICBsaW5rYWdlID0gbGlua2FnZSB8fCBcImF2ZXJhZ2VcIjtcblxuICAgaWYgKHR5cGVvZiBkaXN0YW5jZSA9PSBcInN0cmluZ1wiKSB7XG4gICAgIGRpc3RhbmNlID0gZGlzdGFuY2VzW2Rpc3RhbmNlXTtcbiAgIH1cbiAgIHZhciBjbHVzdGVycyA9IChuZXcgSGllcmFyY2hpY2FsQ2x1c3RlcmluZyhkaXN0YW5jZSwgbGlua2FnZSwgdGhyZXNob2xkKSlcbiAgICAgICAgICAgICAgICAgIC5jbHVzdGVyKGl0ZW1zLCBzbmFwc2hvdCwgc25hcHNob3RDYWxsYmFjayk7XG4gICAgICBcbiAgIGlmICh0aHJlc2hvbGQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIGNsdXN0ZXJzWzBdOyAvLyBhbGwgY2x1c3RlcmVkIGludG8gb25lXG4gICB9XG4gICByZXR1cm4gY2x1c3RlcnM7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gaGNsdXN0ZXI7XG4iLCJ2YXIgZGlzdGFuY2VzID0gcmVxdWlyZShcIi4vZGlzdGFuY2VcIik7XG5cbmZ1bmN0aW9uIEtNZWFucyhjZW50cm9pZHMpIHtcbiAgIHRoaXMuY2VudHJvaWRzID0gY2VudHJvaWRzIHx8IFtdO1xufVxuXG5LTWVhbnMucHJvdG90eXBlLnJhbmRvbUNlbnRyb2lkcyA9IGZ1bmN0aW9uKHBvaW50cywgaykge1xuICAgdmFyIGNlbnRyb2lkcyA9IHBvaW50cy5zbGljZSgwKTsgLy8gY29weVxuICAgY2VudHJvaWRzLnNvcnQoZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gKE1hdGgucm91bmQoTWF0aC5yYW5kb20oKSkgLSAwLjUpO1xuICAgfSk7XG4gICByZXR1cm4gY2VudHJvaWRzLnNsaWNlKDAsIGspO1xufVxuXG5LTWVhbnMucHJvdG90eXBlLmNsYXNzaWZ5ID0gZnVuY3Rpb24ocG9pbnQsIGRpc3RhbmNlKSB7XG4gICB2YXIgbWluID0gSW5maW5pdHksXG4gICAgICAgaW5kZXggPSAwO1xuXG4gICBkaXN0YW5jZSA9IGRpc3RhbmNlIHx8IFwiZXVjbGlkZWFuXCI7XG4gICBpZiAodHlwZW9mIGRpc3RhbmNlID09IFwic3RyaW5nXCIpIHtcbiAgICAgIGRpc3RhbmNlID0gZGlzdGFuY2VzW2Rpc3RhbmNlXTtcbiAgIH1cblxuICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmNlbnRyb2lkcy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGRpc3QgPSBkaXN0YW5jZShwb2ludCwgdGhpcy5jZW50cm9pZHNbaV0pO1xuICAgICAgaWYgKGRpc3QgPCBtaW4pIHtcbiAgICAgICAgIG1pbiA9IGRpc3Q7XG4gICAgICAgICBpbmRleCA9IGk7XG4gICAgICB9XG4gICB9XG5cbiAgIHJldHVybiBpbmRleDtcbn1cblxuS01lYW5zLnByb3RvdHlwZS5jbHVzdGVyID0gZnVuY3Rpb24ocG9pbnRzLCBrLCBkaXN0YW5jZSwgc25hcHNob3RQZXJpb2QsIHNuYXBzaG90Q2IpIHtcbiAgIGsgPSBrIHx8IE1hdGgubWF4KDIsIE1hdGguY2VpbChNYXRoLnNxcnQocG9pbnRzLmxlbmd0aCAvIDIpKSk7XG5cbiAgIGRpc3RhbmNlID0gZGlzdGFuY2UgfHwgXCJldWNsaWRlYW5cIjtcbiAgIGlmICh0eXBlb2YgZGlzdGFuY2UgPT0gXCJzdHJpbmdcIikge1xuICAgICAgZGlzdGFuY2UgPSBkaXN0YW5jZXNbZGlzdGFuY2VdO1xuICAgfVxuXG4gICB0aGlzLmNlbnRyb2lkcyA9IHRoaXMucmFuZG9tQ2VudHJvaWRzKHBvaW50cywgayk7XG5cbiAgIHZhciBhc3NpZ25tZW50ID0gbmV3IEFycmF5KHBvaW50cy5sZW5ndGgpO1xuICAgdmFyIGNsdXN0ZXJzID0gbmV3IEFycmF5KGspO1xuXG4gICB2YXIgaXRlcmF0aW9ucyA9IDA7XG4gICB2YXIgbW92ZW1lbnQgPSB0cnVlO1xuICAgd2hpbGUgKG1vdmVtZW50KSB7XG4gICAgICAvLyB1cGRhdGUgcG9pbnQtdG8tY2VudHJvaWQgYXNzaWdubWVudHNcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcG9pbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICBhc3NpZ25tZW50W2ldID0gdGhpcy5jbGFzc2lmeShwb2ludHNbaV0sIGRpc3RhbmNlKTtcbiAgICAgIH1cblxuICAgICAgLy8gdXBkYXRlIGxvY2F0aW9uIG9mIGVhY2ggY2VudHJvaWRcbiAgICAgIG1vdmVtZW50ID0gZmFsc2U7XG4gICAgICBmb3IgKHZhciBqID0gMDsgaiA8IGs7IGorKykge1xuICAgICAgICAgdmFyIGFzc2lnbmVkID0gW107XG4gICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFzc2lnbm1lbnQubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmIChhc3NpZ25tZW50W2ldID09IGopIHtcbiAgICAgICAgICAgICAgIGFzc2lnbmVkLnB1c2gocG9pbnRzW2ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgIH1cblxuICAgICAgICAgaWYgKCFhc3NpZ25lZC5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgfVxuXG4gICAgICAgICB2YXIgY2VudHJvaWQgPSB0aGlzLmNlbnRyb2lkc1tqXTtcbiAgICAgICAgIHZhciBuZXdDZW50cm9pZCA9IG5ldyBBcnJheShjZW50cm9pZC5sZW5ndGgpO1xuXG4gICAgICAgICBmb3IgKHZhciBnID0gMDsgZyA8IGNlbnRyb2lkLmxlbmd0aDsgZysrKSB7XG4gICAgICAgICAgICB2YXIgc3VtID0gMDtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXNzaWduZWQubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgIHN1bSArPSBhc3NpZ25lZFtpXVtnXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG5ld0NlbnRyb2lkW2ddID0gc3VtIC8gYXNzaWduZWQubGVuZ3RoO1xuXG4gICAgICAgICAgICBpZiAobmV3Q2VudHJvaWRbZ10gIT0gY2VudHJvaWRbZ10pIHtcbiAgICAgICAgICAgICAgIG1vdmVtZW50ID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgIH1cblxuICAgICAgICAgdGhpcy5jZW50cm9pZHNbal0gPSBuZXdDZW50cm9pZDtcbiAgICAgICAgIGNsdXN0ZXJzW2pdID0gYXNzaWduZWQ7XG4gICAgICB9XG5cbiAgICAgIGlmIChzbmFwc2hvdENiICYmIChpdGVyYXRpb25zKysgJSBzbmFwc2hvdFBlcmlvZCA9PSAwKSkge1xuICAgICAgICAgc25hcHNob3RDYihjbHVzdGVycyk7XG4gICAgICB9XG4gICB9XG5cbiAgIHJldHVybiBjbHVzdGVycztcbn1cblxuS01lYW5zLnByb3RvdHlwZS50b0pTT04gPSBmdW5jdGlvbigpIHtcbiAgIHJldHVybiBKU09OLnN0cmluZ2lmeSh0aGlzLmNlbnRyb2lkcyk7XG59XG5cbktNZWFucy5wcm90b3R5cGUuZnJvbUpTT04gPSBmdW5jdGlvbihqc29uKSB7XG4gICB0aGlzLmNlbnRyb2lkcyA9IEpTT04ucGFyc2UoanNvbik7XG4gICByZXR1cm4gdGhpcztcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBLTWVhbnM7XG5cbm1vZHVsZS5leHBvcnRzLmttZWFucyA9IGZ1bmN0aW9uKHZlY3RvcnMsIGspIHtcbiAgIHJldHVybiAobmV3IEtNZWFucygpKS5jbHVzdGVyKHZlY3RvcnMsIGspO1xufSIsIid1c2Ugc3RyaWN0JztcblxuLy8gZGVjbGFyZSBnbG9iYWwgY29uc3RhbnRcbnZhciBnID0gZ2xvYmFsIHx8IHdpbmRvdztcblxuZy5UQUJMRSA9ICd0YWJsZSc7XG5nLlJBVyA9ICdyYXcnO1xuZy5TVEFDS0VEID0gJ3N0YWNrZWQnO1xuZy5JTkRFWCA9ICdpbmRleCc7XG5cbmcuWCA9ICd4JztcbmcuWSA9ICd5JztcbmcuUk9XID0gJ3Jvdyc7XG5nLkNPTCA9ICdjb2wnO1xuZy5TSVpFID0gJ3NpemUnO1xuZy5TSEFQRSA9ICdzaGFwZSc7XG5nLkNPTE9SID0gJ2NvbG9yJztcbmcuQUxQSEEgPSAnYWxwaGEnO1xuZy5URVhUID0gJ3RleHQnO1xuZy5ERVRBSUwgPSAnZGV0YWlsJztcblxuZy5OID0gJ04nO1xuZy5PID0gJ08nO1xuZy5RID0gJ1EnO1xuZy5UID0gJ1QnO1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbm1vZHVsZS5leHBvcnRzID0gY2x1c3RlcjtcblxudmFyIHZsID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cudmwgOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLnZsIDogbnVsbCksXG4gIGNsdXN0ZXJmY2sgPSByZXF1aXJlKCdjbHVzdGVyZmNrJyksXG4gIGNvbnN0cyA9IHJlcXVpcmUoJy4vY2x1c3RlcmNvbnN0cycpLFxuICB1dGlsID0gcmVxdWlyZSgnLi4vdXRpbCcpO1xuXG5jbHVzdGVyLmRpc3RhbmNlID0gcmVxdWlyZSgnLi9kaXN0YW5jZScpO1xuXG5mdW5jdGlvbiBjbHVzdGVyKGVuY29kaW5ncywgb3B0KSB7XG4gIC8vIGpzaGludCB1bnVzZWQ6ZmFsc2VcbiAgdmFyIGRpc3QgPSBjbHVzdGVyLmRpc3RhbmNlLnRhYmxlKGVuY29kaW5ncyk7XG5cbiAgdmFyIGNsdXN0ZXJUcmVlcyA9IGNsdXN0ZXJmY2suaGNsdXN0ZXIoZW5jb2RpbmdzLCBmdW5jdGlvbihlMSwgZTIpIHtcbiAgICB2YXIgczEgPSB2bC5FbmNvZGluZy5zaG9ydGhhbmQoZTEpLFxuICAgICAgczIgPSB2bC5FbmNvZGluZy5zaG9ydGhhbmQoZTIpO1xuICAgIHJldHVybiBkaXN0W3MxXVtzMl07XG4gIH0sICdhdmVyYWdlJywgY29uc3RzLkNMVVNURVJfVEhSRVNIT0xEKTtcblxuICB2YXIgY2x1c3RlcnMgPSBjbHVzdGVyVHJlZXMubWFwKGZ1bmN0aW9uKHRyZWUpIHtcbiAgICAgIHJldHVybiB1dGlsLnRyYXZlcnNlKHRyZWUsIFtdKTtcbiAgICB9KVxuICAgLm1hcChmdW5jdGlvbihjbHVzdGVyKSB7XG4gICAgcmV0dXJuIGNsdXN0ZXIuc29ydChmdW5jdGlvbihlbmNvZGluZzEsIGVuY29kaW5nMikge1xuICAgICAgLy8gc29ydCBlYWNoIGNsdXN0ZXIgLS0gaGF2ZSB0aGUgaGlnaGVzdCBzY29yZSBhcyAxc3QgaXRlbVxuICAgICAgcmV0dXJuIGVuY29kaW5nMi5zY29yZSAtIGVuY29kaW5nMS5zY29yZTtcbiAgICB9KTtcbiAgfSkuZmlsdGVyKGZ1bmN0aW9uKGNsdXN0ZXIpIHsgIC8vIGZpbHRlciBlbXB0eSBjbHVzdGVyXG4gICAgcmV0dXJuIGNsdXN0ZXIubGVuZ3RoID4wO1xuICB9KS5zb3J0KGZ1bmN0aW9uKGNsdXN0ZXIxLCBjbHVzdGVyMikge1xuICAgIC8vc29ydCBieSBoaWdoZXN0IHNjb3JpbmcgaXRlbSBpbiBlYWNoIGNsdXN0ZXJcbiAgICByZXR1cm4gY2x1c3RlcjJbMF0uc2NvcmUgLSBjbHVzdGVyMVswXS5zY29yZTtcbiAgfSk7XG5cbiAgY2x1c3RlcnMuZGlzdCA9IGRpc3Q7IC8vYXBwZW5kIGRpc3QgaW4gdGhlIGFycmF5IGZvciBkZWJ1Z2dpbmdcblxuICByZXR1cm4gY2x1c3RlcnM7XG59IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgYyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbmMuU1dBUFBBQkxFID0gMC4wNTtcbmMuRElTVF9NSVNTSU5HID0gMTtcbmMuQ0xVU1RFUl9USFJFU0hPTEQgPSAxO1xuXG5mdW5jdGlvbiByZWR1Y2VUdXBsZVRvVGFibGUociwgeCkge1xuICB2YXIgYSA9IHhbMF0sIGIgPSB4WzFdLCBkID0geFsyXTtcbiAgclthXSA9IHJbYV0gfHwge307XG4gIHJbYl0gPSByW2JdIHx8IHt9O1xuICByW2FdW2JdID0gcltiXVthXSA9IGQ7XG4gIHJldHVybiByO1xufVxuXG5jLkRJU1RfQllfRU5DVFlQRSA9IFtcbiAgLy8gcG9zaXRpb25hbFxuICBbJ3gnLCAneScsIGMuU1dBUFBBQkxFXSxcbiAgWydyb3cnLCAnY29sJywgYy5TV0FQUEFCTEVdLFxuXG4gIC8vIG9yZGluYWwgbWFyayBwcm9wZXJ0aWVzXG4gIFsnY29sb3InLCAnc2hhcGUnLCBjLlNXQVBQQUJMRV0sXG4gIFsnY29sb3InLCAnZGV0YWlsJywgYy5TV0FQUEFCTEVdLFxuICBbJ2RldGFpbCcsICdzaGFwZScsIGMuU1dBUFBBQkxFXSxcblxuICAvLyBxdWFudGl0YXRpdmUgbWFyayBwcm9wZXJ0aWVzXG4gIFsnY29sb3InLCAnYWxwaGEnLCBjLlNXQVBQQUJMRV0sXG4gIFsnc2l6ZScsICdhbHBoYScsIGMuU1dBUFBBQkxFXSxcbiAgWydzaXplJywgJ2NvbG9yJywgYy5TV0FQUEFCTEVdXG5dLnJlZHVjZShyZWR1Y2VUdXBsZVRvVGFibGUsIHt9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHZsID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cudmwgOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLnZsIDogbnVsbCksXG4gIGNvbnN0cyA9IHJlcXVpcmUoJy4vY2x1c3RlcmNvbnN0cycpLFxuICB1dGlsID0gcmVxdWlyZSgnLi4vdXRpbCcpO1xuXG52YXIgZGlzdGFuY2UgPSB7fTtcbm1vZHVsZS5leHBvcnRzID0gZGlzdGFuY2U7XG5cbmRpc3RhbmNlLnRhYmxlID0gZnVuY3Rpb24gKGVuY29kaW5ncykge1xuICB2YXIgbGVuID0gZW5jb2RpbmdzLmxlbmd0aCxcbiAgICBjb2xlbmNzID0gZW5jb2RpbmdzLm1hcChmdW5jdGlvbihlKSB7IHJldHVybiBkaXN0YW5jZS5nZXRFbmNUeXBlQnlDb2x1bW5OYW1lKGUpOyB9KSxcbiAgICBzaG9ydGhhbmRzID0gZW5jb2RpbmdzLm1hcCh2bC5FbmNvZGluZy5zaG9ydGhhbmQpLFxuICAgIGRpZmYgPSB7fSwgaSwgajtcblxuICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpKyspIGRpZmZbc2hvcnRoYW5kc1tpXV0gPSB7fTtcblxuICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICBmb3IgKGogPSBpICsgMTsgaiA8IGxlbjsgaisrKSB7XG4gICAgICB2YXIgc2ogPSBzaG9ydGhhbmRzW2pdLCBzaSA9IHNob3J0aGFuZHNbaV07XG5cbiAgICAgIGRpZmZbc2pdW3NpXSA9IGRpZmZbc2ldW3NqXSA9IGRpc3RhbmNlLmdldChjb2xlbmNzW2ldLCBjb2xlbmNzW2pdKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGRpZmY7XG59O1xuXG5kaXN0YW5jZS5nZXQgPSBmdW5jdGlvbiAoY29sZW5jMSwgY29sZW5jMikge1xuICB2YXIgY29scyA9IHV0aWwudW5pb24odmwua2V5cyhjb2xlbmMxLmNvbCksIHZsLmtleXMoY29sZW5jMi5jb2wpKSxcbiAgICBkaXN0ID0gMDtcblxuICBjb2xzLmZvckVhY2goZnVuY3Rpb24oY29sKSB7XG4gICAgdmFyIGUxID0gY29sZW5jMS5jb2xbY29sXSwgZTIgPSBjb2xlbmMyLmNvbFtjb2xdO1xuXG4gICAgaWYgKGUxICYmIGUyKSB7XG4gICAgICBpZiAoZTEuZW5jVHlwZSAhPSBlMi5lbmNUeXBlKSB7XG4gICAgICAgIGRpc3QgKz0gKGNvbnN0cy5ESVNUX0JZX0VOQ1RZUEVbZTEuZW5jVHlwZV0gfHwge30pW2UyLmVuY1R5cGVdIHx8IDE7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGRpc3QgKz0gY29uc3RzLkRJU1RfTUlTU0lORztcbiAgICB9XG4gIH0pO1xuXG4gIC8vIGRvIG5vdCBncm91cCBzdGFja2VkIGNoYXJ0IHdpdGggc2ltaWxhciBub24tc3RhY2tlZCBjaGFydCFcbiAgdmFyIGlzU3RhY2sxID0gdmwuRW5jb2RpbmcuaXNTdGFjayhjb2xlbmMxKSxcbiAgICBpc1N0YWNrMiA9IHZsLkVuY29kaW5nLmlzU3RhY2soY29sZW5jMik7XG5cbiAgaWYoaXNTdGFjazEgfHwgaXNTdGFjazIpIHtcbiAgICBpZihpc1N0YWNrMSAmJiBpc1N0YWNrMikge1xuICAgICAgaWYoY29sZW5jMS5lbmNvZGluZy5jb2xvci5uYW1lICE9PSBjb2xlbmMyLmVuY29kaW5nLmNvbG9yLm5hbWUpIHtcbiAgICAgICAgZGlzdCs9MTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgZGlzdCs9MTsgLy8gc3VyZWx5IGRpZmZlcmVudFxuICAgIH1cbiAgfVxuICByZXR1cm4gZGlzdDtcbn07XG5cbi8vIGdldCBlbmNvZGluZyB0eXBlIGJ5IGZpZWxkbmFtZVxuZGlzdGFuY2UuZ2V0RW5jVHlwZUJ5Q29sdW1uTmFtZSA9IGZ1bmN0aW9uKGVuY29kaW5nKSB7XG4gIHZhciBfY29sZW5jID0ge30sXG4gICAgZW5jID0gZW5jb2RpbmcuZW5jb2Rpbmc7XG5cbiAgdmwua2V5cyhlbmMpLmZvckVhY2goZnVuY3Rpb24oZW5jVHlwZSkge1xuICAgIHZhciBlID0gdmwuZHVwbGljYXRlKGVuY1tlbmNUeXBlXSk7XG4gICAgZS5lbmNUeXBlID0gZW5jVHlwZTtcbiAgICBfY29sZW5jW2UubmFtZSB8fCAnJ10gPSBlO1xuICAgIGRlbGV0ZSBlLm5hbWU7XG4gIH0pO1xuXG4gIHJldHVybiB7XG4gICAgbWFya3R5cGU6IGVuY29kaW5nLm1hcmt0eXBlLFxuICAgIGNvbDogX2NvbGVuYyxcbiAgICBlbmNvZGluZzogZW5jb2RpbmcuZW5jb2RpbmdcbiAgfTtcbn07IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgY29uc3RzID0gbW9kdWxlLmV4cG9ydHMgPSB7XG4gIGdlbjoge30sXG4gIGNsdXN0ZXI6IHt9LFxuICByYW5rOiB7fVxufTtcblxuY29uc3RzLmdlbi5wcm9qZWN0aW9ucyA9IHtcbiAgdHlwZTogJ29iamVjdCcsXG4gIHByb3BlcnRpZXM6IHtcbiAgICBvbWl0RG90UGxvdDogeyAvL0ZJWE1FIHJlbW92ZSB0aGlzIVxuICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgZGVmYXVsdDogZmFsc2UsXG4gICAgICBkZXNjcmlwdGlvbjogJ3JlbW92ZSBhbGwgZG90IHBsb3RzJ1xuICAgIH0sXG4gICAgbWF4Q2FyZGluYWxpdHlGb3JBdXRvQWRkT3JkaW5hbDoge1xuICAgICAgdHlwZTogJ2ludGVnZXInLFxuICAgICAgZGVmYXVsdDogNTAsXG4gICAgICBkZXNjcmlwdGlvbjogJ21heCBjYXJkaW5hbGl0eSBmb3Igb3JkaW5hbCBmaWVsZCB0byBiZSBjb25zaWRlcmVkIGZvciBhdXRvIGFkZGluZydcbiAgICB9LFxuICAgIGFsd2F5c0FkZEhpc3RvZ3JhbToge1xuICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgZGVmYXVsdDogdHJ1ZVxuICAgIH1cbiAgfVxufTtcblxuY29uc3RzLmdlbi5hZ2dyZWdhdGVzID0ge1xuICB0eXBlOiAnb2JqZWN0JyxcbiAgcHJvcGVydGllczoge1xuICAgIGNvbmZpZzoge1xuICAgICAgdHlwZTogJ29iamVjdCdcbiAgICB9LFxuICAgIGRhdGE6IHtcbiAgICAgIHR5cGU6ICdvYmplY3QnXG4gICAgfSxcbiAgICB0YWJsZVR5cGVzOiB7XG4gICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICBkZWZhdWx0OiAnYm90aCcsXG4gICAgICBlbnVtOiBbJ2JvdGgnLCAnYWdncmVnYXRlZCcsICdkaXNhZ2dyZWdhdGVkJ11cbiAgICB9LFxuICAgIGdlbkRpbVE6IHtcbiAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgZGVmYXVsdDogJ2F1dG8nLFxuICAgICAgZW51bTogWydhdXRvJywgJ2JpbicsICdjYXN0JywgJ25vbmUnXSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnVXNlIFEgYXMgRGltZW5zaW9uIGVpdGhlciBieSBiaW5uaW5nIG9yIGNhc3RpbmcnXG4gICAgfSxcbiAgICBtaW5DYXJkaW5hbGl0eUZvckJpbjoge1xuICAgICAgdHlwZTogJ2ludGVnZXInLFxuICAgICAgZGVmYXVsdDogMjAsXG4gICAgICBkZXNjcmlwdGlvbjogJ21pbmltdW0gY2FyZGluYWxpdHkgb2YgYSBmaWVsZCBpZiB3ZSB3ZXJlIHRvIGJpbidcbiAgICB9LFxuICAgIG9taXREb3RQbG90OiB7XG4gICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICBkZWZhdWx0OiBmYWxzZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAncmVtb3ZlIGFsbCBkb3QgcGxvdHMnXG4gICAgfSxcbiAgICBvbWl0TWVhc3VyZU9ubHk6IHtcbiAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgICAgZGVzY3JpcHRpb246ICdPbWl0IGFnZ3JlZ2F0aW9uIHdpdGggbWVhc3VyZShzKSBvbmx5J1xuICAgIH0sXG4gICAgb21pdERpbWVuc2lvbk9ubHk6IHtcbiAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgIGRlZmF1bHQ6IHRydWUsXG4gICAgICBkZXNjcmlwdGlvbjogJ09taXQgYWdncmVnYXRpb24gd2l0aCBkaW1lbnNpb24ocykgb25seSdcbiAgICB9LFxuICAgIGFkZENvdW50Rm9yRGltZW5zaW9uT25seToge1xuICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgZGVmYXVsdDogdHJ1ZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQWRkIGNvdW50IHdoZW4gdGhlcmUgYXJlIGRpbWVuc2lvbihzKSBvbmx5J1xuICAgIH0sXG4gICAgYWdnckxpc3Q6IHtcbiAgICAgIHR5cGU6ICdhcnJheScsXG4gICAgICBpdGVtczoge1xuICAgICAgICB0eXBlOiBbJ3N0cmluZyddXG4gICAgICB9LFxuICAgICAgZGVmYXVsdDogW3VuZGVmaW5lZCwgJ2F2ZyddXG4gICAgfSxcbiAgICB0aW1lRm5MaXN0OiB7XG4gICAgICB0eXBlOiAnYXJyYXknLFxuICAgICAgaXRlbXM6IHtcbiAgICAgICAgdHlwZTogWydzdHJpbmcnXVxuICAgICAgfSxcbiAgICAgIGRlZmF1bHQ6IFsneWVhciddXG4gICAgfSxcbiAgICBjb25zaXN0ZW50QXV0b1E6IHtcbiAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgIGRlZmF1bHQ6IHRydWUsXG4gICAgICBkZXNjcmlwdGlvbjogXCJnZW5lcmF0ZSBzaW1pbGFyIGF1dG8gdHJhbnNmb3JtIGZvciBxdWFudFwiXG4gICAgfVxuICB9XG59O1xuXG5jb25zdHMuZ2VuLmVuY29kaW5ncyA9IHtcbiAgdHlwZTogJ29iamVjdCcsXG4gIHByb3BlcnRpZXM6IHtcbiAgICBtYXJrdHlwZUxpc3Q6IHtcbiAgICAgIHR5cGU6ICdhcnJheScsXG4gICAgICBpdGVtczoge3R5cGU6ICdzdHJpbmcnfSxcbiAgICAgIGRlZmF1bHQ6IFsncG9pbnQnLCAnYmFyJywgJ2xpbmUnLCAnYXJlYScsICd0ZXh0JywgJ3RpY2snXSwgLy9maWxsZWRfbWFwXG4gICAgICBkZXNjcmlwdGlvbjogJ2FsbG93ZWQgbWFya3R5cGVzJ1xuICAgIH0sXG4gICAgZW5jb2RpbmdUeXBlTGlzdDoge1xuICAgICAgdHlwZTogJ2FycmF5JyxcbiAgICAgIGl0ZW1zOiB7dHlwZTogJ3N0cmluZyd9LFxuICAgICAgZGVmYXVsdDogWyd4JywgJ3knLCAncm93JywgJ2NvbCcsICdzaXplJywgJ2NvbG9yJywgJ3RleHQnLCAnZGV0YWlsJ10sXG4gICAgICBkZXNjcmlwdGlvbjogJ2FsbG93ZWQgZW5jb2RpbmcgdHlwZXMnXG4gICAgfSxcbiAgICBtYXhHb29kQ2FyZGluYWxpdHlGb3JGYWNldHM6IHtcbiAgICAgIHR5cGU6ICdpbnRlZ2VyJyxcbiAgICAgIGRlZmF1bHQ6IDUsXG4gICAgICBkZXNjcmlwdGlvbjogJ21heGltdW0gY2FyZGluYWxpdHkgb2YgYSBmaWVsZCB0byBiZSBwdXQgb24gZmFjZXQgKHJvdy9jb2wpIGVmZmVjdGl2ZWx5J1xuICAgIH0sXG4gICAgbWF4Q2FyZGluYWxpdHlGb3JGYWNldHM6IHtcbiAgICAgIHR5cGU6ICdpbnRlZ2VyJyxcbiAgICAgIGRlZmF1bHQ6IDIwLFxuICAgICAgZGVzY3JpcHRpb246ICdtYXhpbXVtIGNhcmRpbmFsaXR5IG9mIGEgZmllbGQgdG8gYmUgcHV0IG9uIGZhY2V0IChyb3cvY29sKSdcbiAgICB9LFxuICAgIG1heEdvb2RDYXJkaW5hbGl0eUZvckNvbG9yOiB7XG4gICAgICB0eXBlOiAnaW50ZWdlcicsXG4gICAgICBkZWZhdWx0OiA3LFxuICAgICAgZGVzY3JpcHRpb246ICdtYXhpbXVtIGNhcmRpbmFsaXR5IG9mIGFuIG9yZGluYWwgZmllbGQgdG8gYmUgcHV0IG9uIGNvbG9yIGVmZmVjdGl2ZWx5J1xuICAgIH0sXG4gICAgbWF4Q2FyZGluYWxpdHlGb3JDb2xvcjoge1xuICAgICAgdHlwZTogJ2ludGVnZXInLFxuICAgICAgZGVmYXVsdDogMjAsXG4gICAgICBkZXNjcmlwdGlvbjogJ21heGltdW0gY2FyZGluYWxpdHkgb2YgYW4gb3JkaW5hbCBmaWVsZCB0byBiZSBwdXQgb24gY29sb3InXG4gICAgfSxcbiAgICBtYXhDYXJkaW5hbGl0eUZvclNoYXBlOiB7XG4gICAgICB0eXBlOiAnaW50ZWdlcicsXG4gICAgICBkZWZhdWx0OiA2LFxuICAgICAgZGVzY3JpcHRpb246ICdtYXhpbXVtIGNhcmRpbmFsaXR5IG9mIGFuIG9yZGluYWwgZmllbGQgdG8gYmUgcHV0IG9uIHNoYXBlJ1xuICAgIH0sXG4gICAgb21pdFRyYW5wb3NlOiAge1xuICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgZGVmYXVsdDogdHJ1ZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnRWxpbWluYXRlIGFsbCB0cmFuc3Bvc2UgYnkgKDEpIGtlZXBpbmcgaG9yaXpvbnRhbCBkb3QgcGxvdCBvbmx5ICgyKSBmb3IgT3hRIGNoYXJ0cywgYWx3YXlzIHB1dCBPIG9uIFkgKDMpIHNob3cgb25seSBvbmUgRHhELCBNeE0gKGN1cnJlbnRseSBzb3J0ZWQgYnkgbmFtZSknXG4gICAgfSxcbiAgICBvbWl0RG90UGxvdDoge1xuICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgZGVmYXVsdDogZmFsc2UsXG4gICAgICBkZXNjcmlwdGlvbjogJ3JlbW92ZSBhbGwgZG90IHBsb3RzJ1xuICAgIH0sXG4gICAgb21pdERvdFBsb3RXaXRoRXh0cmFFbmNvZGluZzoge1xuICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgZGVmYXVsdDogdHJ1ZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAncmVtb3ZlIGFsbCBkb3QgcGxvdHMgd2l0aCA+MSBlbmNvZGluZydcbiAgICB9LFxuICAgIG9taXRNdWx0aXBsZVJldGluYWxFbmNvZGluZ3M6IHtcbiAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgIGRlZmF1bHQ6IHRydWUsXG4gICAgICBkZXNjcmlwdGlvbjogJ29taXQgdXNpbmcgbXVsdGlwbGUgcmV0aW5hbCB2YXJpYWJsZXMgKHNpemUsIGNvbG9yLCBhbHBoYSwgc2hhcGUpJ1xuICAgIH0sXG4gICAgb21pdE5vblRleHRBZ2dyV2l0aEFsbERpbXNPbkZhY2V0czoge1xuICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgZGVmYXVsdDogdHJ1ZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAncmVtb3ZlIGFsbCBhZ2dyZWdhdGVkIGNoYXJ0cyAoZXhjZXB0IHRleHQgdGFibGVzKSB3aXRoIGFsbCBkaW1zIG9uIGZhY2V0cyAocm93LCBjb2wpJ1xuICAgIH0sXG4gICAgb21pdFNpemVPbkJhcjoge1xuICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgZGVmYXVsdDogZmFsc2UsXG4gICAgICBkZXNjcmlwdGlvbjogJ2RvIG5vdCB1c2UgYmFyXFwncyBzaXplJ1xuICAgIH0sXG4gICAgb21pdFN0YWNrZWRBdmVyYWdlOiB7XG4gICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICBkZWZhdWx0OiB0cnVlLFxuICAgICAgZGVzY3JpcHRpb246ICdkbyBub3Qgc3RhY2sgYmFyIGNoYXJ0IHdpdGggYXZlcmFnZSdcbiAgICB9LFxuICAgIGFsd2F5c0dlbmVyYXRlVGFibGVBc0hlYXRtYXA6IHtcbiAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgIGRlZmF1bHQ6IHRydWVcbiAgICB9XG4gIH1cbn07XG5cblxuXG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciB2bCA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93LnZsIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbC52bCA6IG51bGwpO1xuXG52YXIgY29uc3RzID0gcmVxdWlyZSgnLi4vY29uc3RzJyk7XG5cbnZhciBBTlk9JyonO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGdlbkFnZ3JlZ2F0ZXM7XG5cbmZ1bmN0aW9uIGdlbkFnZ3JlZ2F0ZXMob3V0cHV0LCBmaWVsZHMsIHN0YXRzLCBvcHQpIHtcbiAgb3B0ID0gdmwuc2NoZW1hLnV0aWwuZXh0ZW5kKG9wdHx8e30sIGNvbnN0cy5nZW4uYWdncmVnYXRlcyk7XG4gIHZhciB0ZiA9IG5ldyBBcnJheShmaWVsZHMubGVuZ3RoKTtcbiAgdmFyIGhhc05vck8gPSB2bC5hbnkoZmllbGRzLCBmdW5jdGlvbihmKSB7XG4gICAgcmV0dXJuIHZsLmZpZWxkLmlzVHlwZXMoZiwgW04sIE9dKTtcbiAgfSk7XG5cbiAgZnVuY3Rpb24gZW1pdChmaWVsZFNldCkge1xuICAgIGZpZWxkU2V0ID0gdmwuZHVwbGljYXRlKGZpZWxkU2V0KTtcbiAgICBmaWVsZFNldC5rZXkgPSB2bC5maWVsZC5zaG9ydGhhbmRzKGZpZWxkU2V0KTtcbiAgICBvdXRwdXQucHVzaChmaWVsZFNldCk7XG4gIH1cblxuICBmdW5jdGlvbiBjaGVja0FuZFB1c2goKSB7XG4gICAgaWYgKG9wdC5vbWl0TWVhc3VyZU9ubHkgfHwgb3B0Lm9taXREaW1lbnNpb25Pbmx5KSB7XG4gICAgICB2YXIgaGFzTWVhc3VyZSA9IGZhbHNlLCBoYXNEaW1lbnNpb24gPSBmYWxzZSwgaGFzUmF3ID0gZmFsc2U7XG4gICAgICB0Zi5mb3JFYWNoKGZ1bmN0aW9uKGYpIHtcbiAgICAgICAgaWYgKHZsLmZpZWxkLmlzRGltZW5zaW9uKGYpKSB7XG4gICAgICAgICAgaGFzRGltZW5zaW9uID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBoYXNNZWFzdXJlID0gdHJ1ZTtcbiAgICAgICAgICBpZiAoIWYuYWdncmVnYXRlKSBoYXNSYXcgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIGlmICghaGFzRGltZW5zaW9uICYmICFoYXNSYXcgJiYgb3B0Lm9taXRNZWFzdXJlT25seSkgcmV0dXJuO1xuICAgICAgaWYgKCFoYXNNZWFzdXJlKSB7XG4gICAgICAgIGlmIChvcHQuYWRkQ291bnRGb3JEaW1lbnNpb25Pbmx5KSB7XG4gICAgICAgICAgdGYucHVzaCh2bC5maWVsZC5jb3VudCgpKTtcbiAgICAgICAgICBlbWl0KHRmKTtcbiAgICAgICAgICB0Zi5wb3AoKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAob3B0Lm9taXREaW1lbnNpb25Pbmx5KSByZXR1cm47XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChvcHQub21pdERvdFBsb3QgJiYgdGYubGVuZ3RoID09PSAxKSByZXR1cm47XG4gICAgZW1pdCh0Zik7XG4gIH1cblxuICBmdW5jdGlvbiBhc3NpZ25BZ2dyUShpLCBoYXNBZ2dyLCBhdXRvTW9kZSwgYSkge1xuICAgIHZhciBjYW5IYXZlQWdnciA9IGhhc0FnZ3IgPT09IHRydWUgfHwgaGFzQWdnciA9PT0gbnVsbCxcbiAgICAgIGNhbnRIYXZlQWdnciA9IGhhc0FnZ3IgPT09IGZhbHNlIHx8IGhhc0FnZ3IgPT09IG51bGw7XG4gICAgaWYgKGEpIHtcbiAgICAgIGlmIChjYW5IYXZlQWdncikge1xuICAgICAgICB0ZltpXS5hZ2dyZWdhdGUgPSBhO1xuICAgICAgICBhc3NpZ25GaWVsZChpICsgMSwgdHJ1ZSwgYXV0b01vZGUpO1xuICAgICAgICBkZWxldGUgdGZbaV0uYWdncmVnYXRlO1xuICAgICAgfVxuICAgIH0gZWxzZSB7IC8vIGlmKGEgPT09IHVuZGVmaW5lZClcbiAgICAgIGlmIChjYW50SGF2ZUFnZ3IpIHtcbiAgICAgICAgYXNzaWduRmllbGQoaSArIDEsIGZhbHNlLCBhdXRvTW9kZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gYXNzaWduQmluUShpLCBoYXNBZ2dyLCBhdXRvTW9kZSkge1xuICAgIHRmW2ldLmJpbiA9IHRydWU7XG4gICAgYXNzaWduRmllbGQoaSArIDEsIGhhc0FnZ3IsIGF1dG9Nb2RlKTtcbiAgICBkZWxldGUgdGZbaV0uYmluO1xuICB9XG5cbiAgZnVuY3Rpb24gYXNzaWduUShpLCBoYXNBZ2dyLCBhdXRvTW9kZSkge1xuICAgIHZhciBmID0gZmllbGRzW2ldLFxuICAgICAgY2FuSGF2ZUFnZ3IgPSBoYXNBZ2dyID09PSB0cnVlIHx8IGhhc0FnZ3IgPT09IG51bGw7XG5cbiAgICB0ZltpXSA9IHtuYW1lOiBmLm5hbWUsIHR5cGU6IGYudHlwZX07XG5cbiAgICBpZiAoZi5hZ2dyZWdhdGUgPT09ICdjb3VudCcpIHsgLy8gaWYgY291bnQgaXMgaW5jbHVkZWQgaW4gdGhlIHNlbGVjdGVkIGZpZWxkc1xuICAgICAgaWYgKGNhbkhhdmVBZ2dyKSB7XG4gICAgICAgIHRmW2ldLmFnZ3JlZ2F0ZSA9IGYuYWdncmVnYXRlO1xuICAgICAgICBhc3NpZ25GaWVsZChpICsgMSwgdHJ1ZSwgYXV0b01vZGUpO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoZi5fYWdncmVnYXRlKSB7XG4gICAgICAvLyBUT0RPIHN1cHBvcnQgYXJyYXkgb2YgZi5fYWdncnMgdG9vXG4gICAgICBhc3NpZ25BZ2dyUShpLCBoYXNBZ2dyLCBhdXRvTW9kZSwgZi5fYWdncmVnYXRlKTtcbiAgICB9IGVsc2UgaWYgKGYuX3Jhdykge1xuICAgICAgYXNzaWduQWdnclEoaSwgaGFzQWdnciwgYXV0b01vZGUsIHVuZGVmaW5lZCk7XG4gICAgfSBlbHNlIGlmIChmLl9iaW4pIHtcbiAgICAgIGFzc2lnbkJpblEoaSwgaGFzQWdnciwgYXV0b01vZGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBvcHQuYWdnckxpc3QuZm9yRWFjaChmdW5jdGlvbihhKSB7XG4gICAgICAgIGlmICghb3B0LmNvbnNpc3RlbnRBdXRvUSB8fCBhdXRvTW9kZSA9PT0gQU5ZIHx8IGF1dG9Nb2RlID09PSBhKSB7XG4gICAgICAgICAgYXNzaWduQWdnclEoaSwgaGFzQWdnciwgYSAvKmFzc2lnbiBhdXRvTW9kZSovLCBhKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIGlmICgoIW9wdC5jb25zaXN0ZW50QXV0b1EgfHwgdmwuaXNpbihhdXRvTW9kZSwgW0FOWSwgJ2JpbicsICdjYXN0JywgJ2F1dG9jYXN0J10pKSAmJiAhaGFzTm9yTykge1xuICAgICAgICB2YXIgaGlnaENhcmRpbmFsaXR5ID0gdmwuZmllbGQuY2FyZGluYWxpdHkoZiwgc3RhdHMpID4gb3B0Lm1pbkNhcmRpbmFsaXR5Rm9yQmluO1xuXG4gICAgICAgIHZhciBpc0F1dG8gPSBvcHQuZ2VuRGltUSA9PT0gJ2F1dG8nLFxuICAgICAgICAgIGdlbkJpbiA9IG9wdC5nZW5EaW1RICA9PT0gJ2JpbicgfHwgKGlzQXV0byAmJiBoaWdoQ2FyZGluYWxpdHkpLFxuICAgICAgICAgIGdlbkNhc3QgPSBvcHQuZ2VuRGltUSA9PT0gJ2Nhc3QnIHx8IChpc0F1dG8gJiYgIWhpZ2hDYXJkaW5hbGl0eSk7XG5cbiAgICAgICAgaWYgKGdlbkJpbiAmJiB2bC5pc2luKGF1dG9Nb2RlLCBbQU5ZLCAnYmluJywgJ2F1dG9jYXN0J10pKSB7XG4gICAgICAgICAgYXNzaWduQmluUShpLCBoYXNBZ2dyLCBpc0F1dG8gPyAnYXV0b2Nhc3QnIDogJ2JpbicpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChnZW5DYXN0ICYmIHZsLmlzaW4oYXV0b01vZGUsIFtBTlksICdjYXN0JywgJ2F1dG9jYXN0J10pKSB7XG4gICAgICAgICAgdGZbaV0udHlwZSA9ICdPJztcbiAgICAgICAgICBhc3NpZ25GaWVsZChpICsgMSwgaGFzQWdnciwgaXNBdXRvID8gJ2F1dG9jYXN0JyA6ICdjYXN0Jyk7XG4gICAgICAgICAgdGZbaV0udHlwZSA9ICdRJztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGFzc2lnbkZuVChpLCBoYXNBZ2dyLCBhdXRvTW9kZSwgZm4pIHtcbiAgICB0ZltpXS5mbiA9IGZuO1xuICAgIGFzc2lnbkZpZWxkKGkrMSwgaGFzQWdnciwgYXV0b01vZGUpO1xuICAgIGRlbGV0ZSB0ZltpXS5mbjtcbiAgfVxuXG4gIGZ1bmN0aW9uIGFzc2lnblQoaSwgaGFzQWdnciwgYXV0b01vZGUpIHtcbiAgICB2YXIgZiA9IGZpZWxkc1tpXTtcbiAgICB0ZltpXSA9IHtuYW1lOiBmLm5hbWUsIHR5cGU6IGYudHlwZX07XG5cbiAgICAvLyBUT0RPIHN1cHBvcnQgYXJyYXkgb2YgZi5fZm5zXG4gICAgaWYgKGYuX2ZuKSB7XG4gICAgICBhc3NpZ25GblQoaSwgaGFzQWdnciwgYXV0b01vZGUsIGYuX2ZuKTtcbiAgICB9IGVsc2Uge1xuICAgICAgb3B0LnRpbWVGbkxpc3QuZm9yRWFjaChmdW5jdGlvbihmbikge1xuICAgICAgICBpZiAoZm4gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGlmICghaGFzQWdncikgeyAvLyBjYW4ndCBhZ2dyZWdhdGUgb3ZlciByYXcgdGltZVxuICAgICAgICAgICAgYXNzaWduRmllbGQoaSsxLCBmYWxzZSwgYXV0b01vZGUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBhc3NpZ25GblQoaSwgaGFzQWdnciwgYXV0b01vZGUsIGZuKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gRklYTUUgd2hhdCBpZiB5b3UgYWdncmVnYXRlIHRpbWU/XG4gIH1cblxuICBmdW5jdGlvbiBhc3NpZ25GaWVsZChpLCBoYXNBZ2dyLCBhdXRvTW9kZSkge1xuICAgIGlmIChpID09PSBmaWVsZHMubGVuZ3RoKSB7IC8vIElmIGFsbCBmaWVsZHMgYXJlIGFzc2lnbmVkXG4gICAgICBjaGVja0FuZFB1c2goKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgZiA9IGZpZWxkc1tpXTtcbiAgICAvLyBPdGhlcndpc2UsIGFzc2lnbiBpLXRoIGZpZWxkXG4gICAgc3dpdGNoIChmLnR5cGUpIHtcbiAgICAgIC8vVE9ETyBcIkRcIiwgXCJHXCJcbiAgICAgIGNhc2UgUTpcbiAgICAgICAgYXNzaWduUShpLCBoYXNBZ2dyLCBhdXRvTW9kZSk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIFQ6XG4gICAgICAgIGFzc2lnblQoaSwgaGFzQWdnciwgYXV0b01vZGUpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgTzpcbiAgICAgICAgLyogZmFsbHMgdGhyb3VnaCAqL1xuICAgICAgY2FzZSBOOlxuICAgICAgICAvKiBmYWxscyB0aHJvdWdoICovXG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0ZltpXSA9IGY7XG4gICAgICAgIGFzc2lnbkZpZWxkKGkgKyAxLCBoYXNBZ2dyLCBhdXRvTW9kZSk7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuXG4gIHZhciBoYXNBZ2dyID0gb3B0LnRhYmxlVHlwZXMgPT09ICdhZ2dyZWdhdGVkJyA/IHRydWUgOiBvcHQudGFibGVUeXBlcyA9PT0gJ2Rpc2FnZ3JlZ2F0ZWQnID8gZmFsc2UgOiBudWxsO1xuICBhc3NpZ25GaWVsZCgwLCBoYXNBZ2dyLCBBTlkpO1xuXG4gIHJldHVybiBvdXRwdXQ7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciB2bCA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93LnZsIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbC52bCA6IG51bGwpLFxuICBnZW5FbmNzID0gcmVxdWlyZSgnLi9lbmNzJyksXG4gIGdldE1hcmt0eXBlcyA9IHJlcXVpcmUoJy4vbWFya3R5cGVzJyksXG4gIHJhbmsgPSByZXF1aXJlKCcuLi9yYW5rL3JhbmsnKSxcbiAgY29uc3RzID0gcmVxdWlyZSgnLi4vY29uc3RzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZ2VuRW5jb2RpbmdzRnJvbUZpZWxkcztcblxuZnVuY3Rpb24gZ2VuRW5jb2RpbmdzRnJvbUZpZWxkcyhvdXRwdXQsIGZpZWxkcywgc3RhdHMsIG9wdCwgbmVzdGVkKSB7XG4gIG9wdCA9IHZsLnNjaGVtYS51dGlsLmV4dGVuZChvcHR8fHt9LCBjb25zdHMuZ2VuLmVuY29kaW5ncyk7XG4gIHZhciBlbmNzID0gZ2VuRW5jcyhbXSwgZmllbGRzLCBzdGF0cywgb3B0KTtcblxuICBpZiAobmVzdGVkKSB7XG4gICAgcmV0dXJuIGVuY3MucmVkdWNlKGZ1bmN0aW9uKGRpY3QsIGVuYykge1xuICAgICAgZGljdFtlbmNdID0gZ2VuRW5jb2RpbmdzRnJvbUVuY3MoW10sIGVuYywgc3RhdHMsIG9wdCk7XG4gICAgICByZXR1cm4gZGljdDtcbiAgICB9LCB7fSk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGVuY3MucmVkdWNlKGZ1bmN0aW9uKGxpc3QsIGVuYykge1xuICAgICAgcmV0dXJuIGdlbkVuY29kaW5nc0Zyb21FbmNzKGxpc3QsIGVuYywgc3RhdHMsIG9wdCk7XG4gICAgfSwgW10pO1xuICB9XG59XG5cbmZ1bmN0aW9uIGdlbkVuY29kaW5nc0Zyb21FbmNzKG91dHB1dCwgZW5jLCBzdGF0cywgb3B0KSB7XG4gIGdldE1hcmt0eXBlcyhlbmMsIHN0YXRzLCBvcHQpXG4gICAgLmZvckVhY2goZnVuY3Rpb24obWFya1R5cGUpIHtcbiAgICAgIHZhciBlID0gdmwuZHVwbGljYXRlKHtcbiAgICAgICAgICBkYXRhOiBvcHQuZGF0YSxcbiAgICAgICAgICBtYXJrdHlwZTogbWFya1R5cGUsXG4gICAgICAgICAgZW5jb2Rpbmc6IGVuYyxcbiAgICAgICAgICBjb25maWc6IG9wdC5jb25maWdcbiAgICAgICAgfSksXG4gICAgICAgIGVuY29kaW5nID0gZmluYWxUb3VjaChlLCBzdGF0cywgb3B0KSxcbiAgICAgICAgc2NvcmUgPSByYW5rLmVuY29kaW5nKGVuY29kaW5nLCBzdGF0cywgb3B0KTtcblxuICAgICAgZW5jb2Rpbmcuc2NvcmUgPSBzY29yZS5zY29yZTtcbiAgICAgIGVuY29kaW5nLnNjb3JlRmVhdHVyZXMgPSBzY29yZS5mZWF0dXJlcztcbiAgICAgIG91dHB1dC5wdXNoKGVuY29kaW5nKTtcbiAgICB9KTtcbiAgcmV0dXJuIG91dHB1dDtcbn1cblxuLy9GSVhNRSB0aGlzIHNob3VsZCBiZSByZWZhY3RvcnNcbmZ1bmN0aW9uIGZpbmFsVG91Y2goZW5jb2RpbmcsIHN0YXRzLCBvcHQpIHtcbiAgaWYgKGVuY29kaW5nLm1hcmt0eXBlID09PSAndGV4dCcgJiYgb3B0LmFsd2F5c0dlbmVyYXRlVGFibGVBc0hlYXRtYXApIHtcbiAgICBlbmNvZGluZy5lbmNvZGluZy5jb2xvciA9IGVuY29kaW5nLmVuY29kaW5nLnRleHQ7XG4gIH1cblxuICAvLyBkb24ndCBpbmNsdWRlIHplcm8gaWYgc3RkZXYvYXZnIDwgMC4wMVxuICAvLyBodHRwczovL2dpdGh1Yi5jb20vdXdkYXRhL3Zpc3JlYy9pc3N1ZXMvNjlcbiAgdmFyIGVuYyA9IGVuY29kaW5nLmVuY29kaW5nO1xuICBbJ3gnLCAneSddLmZvckVhY2goZnVuY3Rpb24oZXQpIHtcbiAgICB2YXIgZmllbGQgPSBlbmNbZXRdO1xuICAgIGlmIChmaWVsZCAmJiB2bC5maWVsZC5pc01lYXN1cmUoZmllbGQpICYmICF2bC5maWVsZC5pc0NvdW50KGZpZWxkKSkge1xuICAgICAgdmFyIHN0YXQgPSBzdGF0c1tmaWVsZC5uYW1lXTtcbiAgICAgIGlmIChzdGF0ICYmIHN0YXQuc3RkZXYgLyBzdGF0LmF2ZyA8IDAuMDEpIHtcbiAgICAgICAgZmllbGQuc2NhbGUgPSB7emVybzogZmFsc2V9O1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG4gIHJldHVybiBlbmNvZGluZztcbn0iLCJcInVzZSBzdHJpY3RcIjtcbnJlcXVpcmUoJy4uL2dsb2JhbHMnKTtcblxudmFyIHZsID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cudmwgOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLnZsIDogbnVsbCksXG4gIGNvbnN0cyA9IHJlcXVpcmUoJy4uL2NvbnN0cycpLFxuICBnZW5NYXJrVHlwZXMgPSByZXF1aXJlKCcuL21hcmt0eXBlcycpLFxuICBpc0RpbWVuc2lvbiA9IHZsLmZpZWxkLmlzRGltZW5zaW9uLFxuICBpc01lYXN1cmUgPSB2bC5maWVsZC5pc01lYXN1cmU7XG5cbm1vZHVsZS5leHBvcnRzID0gZ2VuRW5jcztcblxuLy8gRklYTUUgcmVtb3ZlIGRpbWVuc2lvbiwgbWVhc3VyZSBhbmQgdXNlIGluZm9ybWF0aW9uIGluIHZlZ2EtbGl0ZSBpbnN0ZWFkIVxudmFyIHJ1bGVzID0ge1xuICB4OiB7XG4gICAgZGltZW5zaW9uOiB0cnVlLFxuICAgIG1lYXN1cmU6IHRydWUsXG4gICAgbXVsdGlwbGU6IHRydWUgLy9GSVhNRSBzaG91bGQgYWxsb3cgbXVsdGlwbGUgb25seSBmb3IgUSwgVFxuICB9LFxuICB5OiB7XG4gICAgZGltZW5zaW9uOiB0cnVlLFxuICAgIG1lYXN1cmU6IHRydWUsXG4gICAgbXVsdGlwbGU6IHRydWUgLy9GSVhNRSBzaG91bGQgYWxsb3cgbXVsdGlwbGUgb25seSBmb3IgUSwgVFxuICB9LFxuICByb3c6IHtcbiAgICBkaW1lbnNpb246IHRydWUsXG4gICAgbXVsdGlwbGU6IHRydWVcbiAgfSxcbiAgY29sOiB7XG4gICAgZGltZW5zaW9uOiB0cnVlLFxuICAgIG11bHRpcGxlOiB0cnVlXG4gIH0sXG4gIHNoYXBlOiB7XG4gICAgZGltZW5zaW9uOiB0cnVlLFxuICAgIHJ1bGVzOiBzaGFwZVJ1bGVzXG4gIH0sXG4gIHNpemU6IHtcbiAgICBtZWFzdXJlOiB0cnVlLFxuICAgIHJ1bGVzOiByZXRpbmFsRW5jUnVsZXNcbiAgfSxcbiAgY29sb3I6IHtcbiAgICBkaW1lbnNpb246IHRydWUsXG4gICAgbWVhc3VyZTogdHJ1ZSxcbiAgICBydWxlczogY29sb3JSdWxlc1xuICB9LFxuICBhbHBoYToge1xuICAgIG1lYXN1cmU6IHRydWUsXG4gICAgcnVsZXM6IHJldGluYWxFbmNSdWxlc1xuICB9LFxuICB0ZXh0OiB7XG4gICAgbWVhc3VyZTogdHJ1ZVxuICB9LFxuICBkZXRhaWw6IHtcbiAgICBkaW1lbnNpb246IHRydWVcbiAgfVxuICAvL2dlbzoge1xuICAvLyAgZ2VvOiB0cnVlXG4gIC8vfSxcbiAgLy9hcmM6IHsgLy8gcGllXG4gIC8vXG4gIC8vfVxufTtcblxuZnVuY3Rpb24gcmV0aW5hbEVuY1J1bGVzKGVuYywgZmllbGQsIHN0YXRzLCBvcHQpIHtcbiAgaWYgKG9wdC5vbWl0TXVsdGlwbGVSZXRpbmFsRW5jb2RpbmdzKSB7XG4gICAgaWYgKGVuYy5jb2xvciB8fCBlbmMuc2l6ZSB8fCBlbmMuc2hhcGUgfHwgZW5jLmFscGhhKSByZXR1cm4gZmFsc2U7XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59XG5cbmZ1bmN0aW9uIGNvbG9yUnVsZXMoZW5jLCBmaWVsZCwgc3RhdHMsIG9wdCkge1xuICBpZighcmV0aW5hbEVuY1J1bGVzKGVuYywgZmllbGQsIHN0YXRzLCBvcHQpKSByZXR1cm4gZmFsc2U7XG5cbiAgcmV0dXJuIHZsLmZpZWxkLmlzTWVhc3VyZShmaWVsZCkgfHxcbiAgICB2bC5maWVsZC5jYXJkaW5hbGl0eShmaWVsZCwgc3RhdHMpIDw9IG9wdC5tYXhDYXJkaW5hbGl0eUZvckNvbG9yO1xufVxuXG5mdW5jdGlvbiBzaGFwZVJ1bGVzKGVuYywgZmllbGQsIHN0YXRzLCBvcHQpIHtcbiAgaWYoIXJldGluYWxFbmNSdWxlcyhlbmMsIGZpZWxkLCBzdGF0cywgb3B0KSkgcmV0dXJuIGZhbHNlO1xuXG4gIGlmIChmaWVsZC5iaW4gJiYgZmllbGQudHlwZSA9PT0gUSkgcmV0dXJuIGZhbHNlO1xuICBpZiAoZmllbGQuZm4gJiYgZmllbGQudHlwZSA9PT0gVCkgcmV0dXJuIGZhbHNlO1xuICByZXR1cm4gdmwuZmllbGQuY2FyZGluYWxpdHkoZmllbGQsIHN0YXRzKSA8PSBvcHQubWF4Q2FyZGluYWxpdHlGb3JDb2xvcjtcbn1cblxuZnVuY3Rpb24gZGltTWVhVHJhbnNwb3NlUnVsZShlbmMpIHtcbiAgLy8gY3JlYXRlIGhvcml6b250YWwgaGlzdG9ncmFtIGZvciBvcmRpbmFsXG4gIGlmICh2bC5maWVsZC5pc1R5cGVzKGVuYy55LCBbTiwgT10pICYmIGlzTWVhc3VyZShlbmMueCkpIHJldHVybiB0cnVlO1xuXG4gIC8vIHZlcnRpY2FsIGhpc3RvZ3JhbSBmb3IgUSBhbmQgVFxuICBpZiAoaXNNZWFzdXJlKGVuYy55KSAmJiAoIXZsLmZpZWxkLmlzVHlwZXMoZW5jLngsIFtOLCBPXSkgJiYgaXNEaW1lbnNpb24oZW5jLngpKSkgcmV0dXJuIHRydWU7XG5cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG5mdW5jdGlvbiBnZW5lcmFsUnVsZXMoZW5jLCBzdGF0cywgb3B0KSB7XG4gIC8vIGVuYy50ZXh0IGlzIG9ubHkgdXNlZCBmb3IgVEVYVCBUQUJMRVxuICBpZiAoZW5jLnRleHQpIHtcbiAgICByZXR1cm4gZ2VuTWFya1R5cGVzLnNhdGlzZnlSdWxlcyhlbmMsIFRFWFQsIHN0YXRzLCBvcHQpO1xuICB9XG5cbiAgLy8gQ0FSVEVTSUFOIFBMT1QgT1IgTUFQXG4gIGlmIChlbmMueCB8fCBlbmMueSB8fCBlbmMuZ2VvIHx8IGVuYy5hcmMpIHtcblxuICAgIGlmIChlbmMucm93IHx8IGVuYy5jb2wpIHsgLy9oYXZlIGZhY2V0KHMpXG5cbiAgICAgIC8vIGRvbid0IHVzZSBmYWNldHMgYmVmb3JlIGZpbGxpbmcgdXAgeCx5XG4gICAgICBpZiAoIWVuYy54IHx8ICFlbmMueSkgcmV0dXJuIGZhbHNlO1xuXG4gICAgICBpZiAob3B0Lm9taXROb25UZXh0QWdncldpdGhBbGxEaW1zT25GYWNldHMpIHtcbiAgICAgICAgLy8gcmVtb3ZlIGFsbCBhZ2dyZWdhdGVkIGNoYXJ0cyB3aXRoIGFsbCBkaW1zIG9uIGZhY2V0cyAocm93LCBjb2wpXG4gICAgICAgIGlmIChnZW5FbmNzLmlzQWdncldpdGhBbGxEaW1PbkZhY2V0cyhlbmMpKSByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGVuYy54ICYmIGVuYy55KSB7XG4gICAgICB2YXIgaXNEaW1YID0gISFpc0RpbWVuc2lvbihlbmMueCksXG4gICAgICAgIGlzRGltWSA9ICEhaXNEaW1lbnNpb24oZW5jLnkpO1xuXG4gICAgICBpZiAoaXNEaW1YICYmIGlzRGltWSAmJiAhdmwuZW5jLmlzQWdncmVnYXRlKGVuYykpIHtcbiAgICAgICAgLy8gRklYTUUgYWN0dWFsbHkgY2hlY2sgaWYgdGhlcmUgd291bGQgYmUgb2NjbHVzaW9uICM5MFxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG5cbiAgICAgIGlmIChvcHQub21pdFRyYW5wb3NlKSB7XG4gICAgICAgIGlmIChpc0RpbVggXiBpc0RpbVkpIHsgLy8gZGltIHggbWVhXG4gICAgICAgICAgaWYgKCFkaW1NZWFUcmFuc3Bvc2VSdWxlKGVuYykpIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSBlbHNlIGlmIChlbmMueS50eXBlPT09VCB8fCBlbmMueC50eXBlID09PSBUKSB7XG4gICAgICAgICAgaWYgKGVuYy55LnR5cGU9PT1UICYmIGVuYy54LnR5cGUgIT09IFQpIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSBlbHNlIHsgLy8gc2hvdyBvbmx5IG9uZSBPeE8sIFF4UVxuICAgICAgICAgIGlmIChlbmMueC5uYW1lID4gZW5jLnkubmFtZSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICAvLyBET1QgUExPVFNcbiAgICAvLyAvLyBwbG90IHdpdGggb25lIGF4aXMgPSBkb3QgcGxvdFxuICAgIGlmIChvcHQub21pdERvdFBsb3QpIHJldHVybiBmYWxzZTtcblxuICAgIC8vIERvdCBwbG90IHNob3VsZCBhbHdheXMgYmUgaG9yaXpvbnRhbFxuICAgIGlmIChvcHQub21pdFRyYW5wb3NlICYmIGVuYy55KSByZXR1cm4gZmFsc2U7XG5cbiAgICAvLyBkb3QgcGxvdCBzaG91bGRuJ3QgaGF2ZSBvdGhlciBlbmNvZGluZ1xuICAgIGlmIChvcHQub21pdERvdFBsb3RXaXRoRXh0cmFFbmNvZGluZyAmJiB2bC5rZXlzKGVuYykubGVuZ3RoID4gMSkgcmV0dXJuIGZhbHNlO1xuXG4gICAgLy8gb25lIGRpbWVuc2lvbiBcImNvdW50XCIgaXMgdXNlbGVzc1xuICAgIGlmIChlbmMueCAmJiBlbmMueC5hZ2dyZWdhdGUgPT0gJ2NvdW50JyAmJiAhZW5jLnkpIHJldHVybiBmYWxzZTtcbiAgICBpZiAoZW5jLnkgJiYgZW5jLnkuYWdncmVnYXRlID09ICdjb3VudCcgJiYgIWVuYy54KSByZXR1cm4gZmFsc2U7XG5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG5cbmdlbkVuY3MuaXNBZ2dyV2l0aEFsbERpbU9uRmFjZXRzID0gZnVuY3Rpb24gKGVuYykge1xuICB2YXIgaGFzQWdnciA9IGZhbHNlLCBoYXNPdGhlck8gPSBmYWxzZTtcbiAgZm9yICh2YXIgZW5jVHlwZSBpbiBlbmMpIHtcbiAgICB2YXIgZmllbGQgPSBlbmNbZW5jVHlwZV07XG4gICAgaWYgKGZpZWxkLmFnZ3JlZ2F0ZSkge1xuICAgICAgaGFzQWdnciA9IHRydWU7XG4gICAgfVxuICAgIGlmICh2bC5maWVsZC5pc0RpbWVuc2lvbihmaWVsZCkgJiYgKGVuY1R5cGUgIT09IFJPVyAmJiBlbmNUeXBlICE9PSBDT0wpKSB7XG4gICAgICBoYXNPdGhlck8gPSB0cnVlO1xuICAgIH1cbiAgICBpZiAoaGFzQWdnciAmJiBoYXNPdGhlck8pIGJyZWFrO1xuICB9XG5cbiAgcmV0dXJuIGhhc0FnZ3IgJiYgIWhhc090aGVyTztcbn07XG5cblxuZnVuY3Rpb24gZ2VuRW5jcyhlbmNzLCBmaWVsZHMsIHN0YXRzLCBvcHQpIHtcbiAgb3B0ID0gdmwuc2NoZW1hLnV0aWwuZXh0ZW5kKG9wdHx8e30sIGNvbnN0cy5nZW4uZW5jb2RpbmdzKTtcbiAgLy8gZ2VuZXJhdGUgYSBjb2xsZWN0aW9uIHZlZ2EtbGl0ZSdzIGVuY1xuICB2YXIgdG1wRW5jID0ge307XG5cbiAgZnVuY3Rpb24gYXNzaWduRmllbGQoaSkge1xuICAgIC8vIElmIGFsbCBmaWVsZHMgYXJlIGFzc2lnbmVkLCBzYXZlXG4gICAgaWYgKGkgPT09IGZpZWxkcy5sZW5ndGgpIHtcbiAgICAgIC8vIGF0IHRoZSBtaW5pbWFsIGFsbCBjaGFydCBzaG91bGQgaGF2ZSB4LCB5LCBnZW8sIHRleHQgb3IgYXJjXG4gICAgICBpZiAoZ2VuZXJhbFJ1bGVzKHRtcEVuYywgc3RhdHMsIG9wdCkpIHtcbiAgICAgICAgZW5jcy5wdXNoKHZsLmR1cGxpY2F0ZSh0bXBFbmMpKTtcbiAgICAgIH1cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBPdGhlcndpc2UsIGFzc2lnbiBpLXRoIGZpZWxkXG4gICAgdmFyIGZpZWxkID0gZmllbGRzW2ldO1xuICAgIGZvciAodmFyIGogaW4gb3B0LmVuY29kaW5nVHlwZUxpc3QpIHtcbiAgICAgIHZhciBldCA9IG9wdC5lbmNvZGluZ1R5cGVMaXN0W2pdLFxuICAgICAgICBpc0RpbSA9IGlzRGltZW5zaW9uKGZpZWxkKTtcblxuICAgICAgLy9UT0RPOiBzdXBwb3J0IFwibXVsdGlwbGVcIiBhc3NpZ25tZW50XG4gICAgICBpZiAoIShldCBpbiB0bXBFbmMpICYmIC8vIGVuY29kaW5nIG5vdCB1c2VkXG4gICAgICAgICgoaXNEaW0gJiYgcnVsZXNbZXRdLmRpbWVuc2lvbikgfHwgKCFpc0RpbSAmJiBydWxlc1tldF0ubWVhc3VyZSkpICYmXG4gICAgICAgICghcnVsZXNbZXRdLnJ1bGVzIHx8IHJ1bGVzW2V0XS5ydWxlcyh0bXBFbmMsIGZpZWxkLCBzdGF0cywgb3B0KSlcbiAgICAgICkge1xuICAgICAgICB0bXBFbmNbZXRdID0gZmllbGQ7XG4gICAgICAgIGFzc2lnbkZpZWxkKGkgKyAxKTtcbiAgICAgICAgZGVsZXRlIHRtcEVuY1tldF07XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgYXNzaWduRmllbGQoMCk7XG5cbiAgcmV0dXJuIGVuY3M7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciB1dGlsID0gcmVxdWlyZSgnLi4vdXRpbCcpO1xuXG52YXIgZ2VuID0gbW9kdWxlLmV4cG9ydHMgPSB7XG4gIC8vIGRhdGEgdmFyaWF0aW9uc1xuICBhZ2dyZWdhdGVzOiByZXF1aXJlKCcuL2FnZ3JlZ2F0ZXMnKSxcbiAgcHJvamVjdGlvbnM6IHJlcXVpcmUoJy4vcHJvamVjdGlvbnMnKSxcbiAgLy8gZW5jb2RpbmdzIC8gdmlzdWFsIHZhcmlhdG9uc1xuICBlbmNvZGluZ3M6IHJlcXVpcmUoJy4vZW5jb2RpbmdzJyksXG4gIGVuY3M6IHJlcXVpcmUoJy4vZW5jcycpLFxuICBtYXJrdHlwZXM6IHJlcXVpcmUoJy4vbWFya3R5cGVzJylcbn07XG5cbmdlbi5jaGFydHMgPSBmdW5jdGlvbihmaWVsZHMsIG9wdCwgY2ZnLCBmbGF0KSB7XG4gIG9wdCA9IHV0aWwuZ2VuLmdldE9wdChvcHQpO1xuICBmbGF0ID0gZmxhdCA9PT0gdW5kZWZpbmVkID8ge2VuY29kaW5nczogMX0gOiBmbGF0O1xuXG4gIC8vIFRPRE8gZ2VuZXJhdGVcblxuICAvLyBnZW5lcmF0ZSBwZXJtdXRhdGlvbiBvZiBlbmNvZGluZyBtYXBwaW5nc1xuICB2YXIgZmllbGRTZXRzID0gb3B0LmdlbkFnZ3IgPyBnZW4uYWdncmVnYXRlcyhbXSwgZmllbGRzLCBvcHQpIDogW2ZpZWxkc10sXG4gICAgZW5jcywgY2hhcnRzLCBsZXZlbCA9IDA7XG5cbiAgaWYgKGZsYXQgPT09IHRydWUgfHwgKGZsYXQgJiYgZmxhdC5hZ2dyZWdhdGUpKSB7XG4gICAgZW5jcyA9IGZpZWxkU2V0cy5yZWR1Y2UoZnVuY3Rpb24ob3V0cHV0LCBmaWVsZHMpIHtcbiAgICAgIHJldHVybiBnZW4uZW5jcyhvdXRwdXQsIGZpZWxkcywgb3B0KTtcbiAgICB9LCBbXSk7XG4gIH0gZWxzZSB7XG4gICAgZW5jcyA9IGZpZWxkU2V0cy5tYXAoZnVuY3Rpb24oZmllbGRzKSB7XG4gICAgICByZXR1cm4gZ2VuLmVuY3MoW10sIGZpZWxkcywgb3B0KTtcbiAgICB9LCB0cnVlKTtcbiAgICBsZXZlbCArPSAxO1xuICB9XG5cbiAgaWYgKGZsYXQgPT09IHRydWUgfHwgKGZsYXQgJiYgZmxhdC5lbmNvZGluZ3MpKSB7XG4gICAgY2hhcnRzID0gdXRpbC5uZXN0ZWRSZWR1Y2UoZW5jcywgZnVuY3Rpb24ob3V0cHV0LCBlbmMpIHtcbiAgICAgIHJldHVybiBnZW4ubWFya3R5cGVzKG91dHB1dCwgZW5jLCBvcHQsIGNmZyk7XG4gICAgfSwgbGV2ZWwsIHRydWUpO1xuICB9IGVsc2Uge1xuICAgIGNoYXJ0cyA9IHV0aWwubmVzdGVkTWFwKGVuY3MsIGZ1bmN0aW9uKGVuYykge1xuICAgICAgcmV0dXJuIGdlbi5tYXJrdHlwZXMoW10sIGVuYywgb3B0LCBjZmcpO1xuICAgIH0sIGxldmVsLCB0cnVlKTtcbiAgICBsZXZlbCArPSAxO1xuICB9XG4gIHJldHVybiBjaGFydHM7XG59OyIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgdmwgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdy52bCA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwudmwgOiBudWxsKSxcbiAgY29uc3RzID0gcmVxdWlyZSgnLi4vY29uc3RzJyksXG4gIGlzRGltZW5zaW9uID0gdmwuZmllbGQuaXNEaW1lbnNpb24sXG4gIGlzT3JkaW5hbFNjYWxlID0gdmwuZmllbGQuaXNPcmRpbmFsU2NhbGU7XG5cbnZhciB2bG1hcmt0eXBlcyA9IG1vZHVsZS5leHBvcnRzID0gZ2V0TWFya3R5cGVzO1xuXG52YXIgbWFya3NSdWxlID0gdmxtYXJrdHlwZXMucnVsZSA9IHtcbiAgcG9pbnQ6ICBwb2ludFJ1bGUsXG4gIGJhcjogICAgYmFyUnVsZSxcbiAgbGluZTogICBsaW5lUnVsZSxcbiAgYXJlYTogICBhcmVhUnVsZSwgLy8gYXJlYSBpcyBzaW1pbGFyIHRvIGxpbmVcbiAgdGV4dDogICB0ZXh0UnVsZSxcbiAgdGljazogICB0aWNrUnVsZVxufTtcblxuZnVuY3Rpb24gZ2V0TWFya3R5cGVzKGVuYywgc3RhdHMsIG9wdCkge1xuICBvcHQgPSB2bC5zY2hlbWEudXRpbC5leHRlbmQob3B0fHx7fSwgY29uc3RzLmdlbi5lbmNvZGluZ3MpO1xuXG4gIHZhciBtYXJrVHlwZXMgPSBvcHQubWFya3R5cGVMaXN0LmZpbHRlcihmdW5jdGlvbihtYXJrVHlwZSl7XG4gICAgcmV0dXJuIHZsbWFya3R5cGVzLnNhdGlzZnlSdWxlcyhlbmMsIG1hcmtUeXBlLCBzdGF0cywgb3B0KTtcbiAgfSk7XG5cbiAgcmV0dXJuIG1hcmtUeXBlcztcbn1cblxudmxtYXJrdHlwZXMuc2F0aXNmeVJ1bGVzID0gZnVuY3Rpb24gKGVuYywgbWFya1R5cGUsIHN0YXRzLCBvcHQpIHtcbiAgdmFyIG1hcmsgPSB2bC5jb21waWxlLm1hcmtzW21hcmtUeXBlXSxcbiAgICByZXFzID0gbWFyay5yZXF1aXJlZEVuY29kaW5nLFxuICAgIHN1cHBvcnQgPSBtYXJrLnN1cHBvcnRlZEVuY29kaW5nO1xuXG4gIGZvciAodmFyIGkgaW4gcmVxcykgeyAvLyBhbGwgcmVxdWlyZWQgZW5jb2RpbmdzIGluIGVuY1xuICAgIGlmICghKHJlcXNbaV0gaW4gZW5jKSkgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgZm9yICh2YXIgZW5jVHlwZSBpbiBlbmMpIHsgLy8gYWxsIGVuY29kaW5ncyBpbiBlbmMgYXJlIHN1cHBvcnRlZFxuICAgIGlmICghc3VwcG9ydFtlbmNUeXBlXSkgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgcmV0dXJuICFtYXJrc1J1bGVbbWFya1R5cGVdIHx8IG1hcmtzUnVsZVttYXJrVHlwZV0oZW5jLCBzdGF0cywgb3B0KTtcbn07XG5cbmZ1bmN0aW9uIGZhY2V0UnVsZShmaWVsZCwgc3RhdHMsIG9wdCkge1xuICByZXR1cm4gdmwuZmllbGQuY2FyZGluYWxpdHkoZmllbGQsIHN0YXRzKSA8PSBvcHQubWF4Q2FyZGluYWxpdHlGb3JGYWNldHM7XG59XG5cbmZ1bmN0aW9uIGZhY2V0c1J1bGUoZW5jLCBzdGF0cywgb3B0KSB7XG4gIGlmKGVuYy5yb3cgJiYgIWZhY2V0UnVsZShlbmMucm93LCBzdGF0cywgb3B0KSkgcmV0dXJuIGZhbHNlO1xuICBpZihlbmMuY29sICYmICFmYWNldFJ1bGUoZW5jLmNvbCwgc3RhdHMsIG9wdCkpIHJldHVybiBmYWxzZTtcbiAgcmV0dXJuIHRydWU7XG59XG5cbmZ1bmN0aW9uIHBvaW50UnVsZShlbmMsIHN0YXRzLCBvcHQpIHtcbiAgaWYoIWZhY2V0c1J1bGUoZW5jLCBzdGF0cywgb3B0KSkgcmV0dXJuIGZhbHNlO1xuICBpZiAoZW5jLnggJiYgZW5jLnkpIHtcbiAgICAvLyBoYXZlIGJvdGggeCAmIHkgPT0+IHNjYXR0ZXIgcGxvdCAvIGJ1YmJsZSBwbG90XG5cbiAgICB2YXIgeElzRGltID0gaXNEaW1lbnNpb24oZW5jLngpLFxuICAgICAgeUlzRGltID0gaXNEaW1lbnNpb24oZW5jLnkpO1xuXG4gICAgLy8gRm9yIE94T1xuICAgIGlmICh4SXNEaW0gJiYgeUlzRGltKSB7XG4gICAgICAvLyBzaGFwZSBkb2Vzbid0IHdvcmsgd2l0aCBib3RoIHgsIHkgYXMgb3JkaW5hbFxuICAgICAgaWYgKGVuYy5zaGFwZSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG5cbiAgICAgIC8vIFRPRE8oa2FuaXR3KTogY2hlY2sgdGhhdCB0aGVyZSBpcyBxdWFudCBhdCBsZWFzdCAuLi5cbiAgICAgIGlmIChlbmMuY29sb3IgJiYgaXNEaW1lbnNpb24oZW5jLmNvbG9yKSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuXG4gIH0gZWxzZSB7IC8vIHBsb3Qgd2l0aCBvbmUgYXhpcyA9IGRvdCBwbG90XG4gICAgaWYgKG9wdC5vbWl0RG90UGxvdCkgcmV0dXJuIGZhbHNlO1xuXG4gICAgLy8gRG90IHBsb3Qgc2hvdWxkIGFsd2F5cyBiZSBob3Jpem9udGFsXG4gICAgaWYgKG9wdC5vbWl0VHJhbnBvc2UgJiYgZW5jLnkpIHJldHVybiBmYWxzZTtcblxuICAgIC8vIGRvdCBwbG90IHNob3VsZG4ndCBoYXZlIG90aGVyIGVuY29kaW5nXG4gICAgaWYgKG9wdC5vbWl0RG90UGxvdFdpdGhFeHRyYUVuY29kaW5nICYmIHZsLmtleXMoZW5jKS5sZW5ndGggPiAxKSByZXR1cm4gZmFsc2U7XG5cbiAgICAvLyBkb3QgcGxvdCB3aXRoIHNoYXBlIGlzIG5vbi1zZW5zZVxuICAgIGlmIChlbmMuc2hhcGUpIHJldHVybiBmYWxzZTtcbiAgfVxuICByZXR1cm4gdHJ1ZTtcbn1cblxuZnVuY3Rpb24gdGlja1J1bGUoZW5jLCBzdGF0cywgb3B0KSB7XG4gIC8vIGpzaGludCB1bnVzZWQ6ZmFsc2VcbiAgaWYgKGVuYy54IHx8IGVuYy55KSB7XG4gICAgaWYodmwuZW5jLmlzQWdncmVnYXRlKGVuYykpIHJldHVybiBmYWxzZTtcblxuICAgIHZhciB4SXNEaW0gPSBpc0RpbWVuc2lvbihlbmMueCksXG4gICAgICB5SXNEaW0gPSBpc0RpbWVuc2lvbihlbmMueSk7XG5cbiAgICByZXR1cm4gKCF4SXNEaW0gJiYgKCFlbmMueSB8fCBpc09yZGluYWxTY2FsZShlbmMueSkpKSB8fFxuICAgICAgKCF5SXNEaW0gJiYgKCFlbmMueCB8fCBpc09yZGluYWxTY2FsZShlbmMueCkpKTtcbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIGJhclJ1bGUoZW5jLCBzdGF0cywgb3B0KSB7XG4gIGlmKCFmYWNldHNSdWxlKGVuYywgc3RhdHMsIG9wdCkpIHJldHVybiBmYWxzZTtcblxuICAvLyBuZWVkIHRvIGFnZ3JlZ2F0ZSBvbiBlaXRoZXIgeCBvciB5XG4gIGlmIChvcHQub21pdFNpemVPbkJhciAmJiBlbmMuc2l6ZSAhPT0gdW5kZWZpbmVkKSByZXR1cm4gZmFsc2U7XG5cbiAgLy8gRklYTUUgYWN0dWFsbHkgY2hlY2sgaWYgdGhlcmUgd291bGQgYmUgb2NjbHVzaW9uICM5MFxuICBpZiAoKChlbmMueC5hZ2dyZWdhdGUgIT09IHVuZGVmaW5lZCkgXiAoZW5jLnkuYWdncmVnYXRlICE9PSB1bmRlZmluZWQpKSAmJlxuICAgICAgKGlzRGltZW5zaW9uKGVuYy54KSBeIGlzRGltZW5zaW9uKGVuYy55KSkpIHtcblxuICAgIHZhciBhZ2dyZWdhdGUgPSBlbmMueC5hZ2dyZWdhdGUgfHwgZW5jLnkuYWdncmVnYXRlO1xuICAgIHJldHVybiAhKG9wdC5vbWl0U3RhY2tlZEF2ZXJhZ2UgJiYgYWdncmVnYXRlID09PSdhdmcnICYmIGVuYy5jb2xvcik7XG4gIH1cblxuICByZXR1cm4gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIGxpbmVSdWxlKGVuYywgc3RhdHMsIG9wdCkge1xuICBpZighZmFjZXRzUnVsZShlbmMsIHN0YXRzLCBvcHQpKSByZXR1cm4gZmFsc2U7XG5cbiAgLy8gVE9ETyhrYW5pdHcpOiBhZGQgb21pdFZlcnRpY2FsTGluZSBhcyBjb25maWdcblxuICAvLyBGSVhNRSB0cnVseSBvcmRpbmFsIGRhdGEgaXMgZmluZSBoZXJlIHRvby5cbiAgLy8gTGluZSBjaGFydCBzaG91bGQgYmUgb25seSBob3Jpem9udGFsXG4gIC8vIGFuZCB1c2Ugb25seSB0ZW1wb3JhbCBkYXRhXG4gIHJldHVybiBlbmMueC50eXBlID09ICdUJyAmJiBlbmMueC5mbiAmJiBlbmMueS50eXBlID09ICdRJyAmJiBlbmMueS5hZ2dyZWdhdGU7XG59XG5cbmZ1bmN0aW9uIGFyZWFSdWxlKGVuYywgc3RhdHMsIG9wdCkge1xuICBpZighZmFjZXRzUnVsZShlbmMsIHN0YXRzLCBvcHQpKSByZXR1cm4gZmFsc2U7XG5cbiAgaWYoIWxpbmVSdWxlKGVuYywgc3RhdHMsIG9wdCkpIHJldHVybiBmYWxzZTtcblxuICByZXR1cm4gIShvcHQub21pdFN0YWNrZWRBdmVyYWdlICYmIGVuYy55LmFnZ3JlZ2F0ZSA9PT0nYXZnJyAmJiBlbmMuY29sb3IpO1xufVxuXG5mdW5jdGlvbiB0ZXh0UnVsZShlbmMsIHN0YXRzLCBvcHQpIHtcbiAgLy8gYXQgbGVhc3QgbXVzdCBoYXZlIHJvdyBvciBjb2wgYW5kIGFnZ3JlZ2F0ZWQgdGV4dCB2YWx1ZXNcbiAgcmV0dXJuIChlbmMucm93IHx8IGVuYy5jb2wpICYmIGVuYy50ZXh0ICYmIGVuYy50ZXh0LmFnZ3JlZ2F0ZSAmJiAhZW5jLnggJiYgIWVuYy55ICYmICFlbmMuc2l6ZSAmJlxuICAgICghb3B0LmFsd2F5c0dlbmVyYXRlVGFibGVBc0hlYXRtYXAgfHwgIWVuYy5jb2xvcik7XG59IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgdXRpbCA9IHJlcXVpcmUoJy4uL3V0aWwnKSxcbiAgY29uc3RzID0gcmVxdWlyZSgnLi4vY29uc3RzJyksXG4gIHZsID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cudmwgOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLnZsIDogbnVsbCksXG4gIGlzRGltZW5zaW9uID0gdmwuZmllbGQuaXNEaW1lbnNpb247XG5cbm1vZHVsZS5leHBvcnRzID0gcHJvamVjdGlvbnM7XG5cbi8vIFRPRE8gc3VwcG9ydCBvdGhlciBtb2RlIG9mIHByb2plY3Rpb25zIGdlbmVyYXRpb25cbi8vIHBvd2Vyc2V0LCBjaG9vc2VLLCBjaG9vc2VLb3JMZXNzIGFyZSBhbHJlYWR5IGluY2x1ZGVkIGluIHRoZSB1dGlsXG5cbi8qKlxuICogZmllbGRzXG4gKiBAcGFyYW0gIHtbdHlwZV19IGZpZWxkcyBhcnJheSBvZiBmaWVsZHMgYW5kIHF1ZXJ5IGluZm9ybWF0aW9uXG4gKiBAcmV0dXJuIHtbdHlwZV19ICAgICAgICBbZGVzY3JpcHRpb25dXG4gKi9cbmZ1bmN0aW9uIHByb2plY3Rpb25zKGZpZWxkcywgc3RhdHMsIG9wdCkge1xuICBvcHQgPSB2bC5zY2hlbWEudXRpbC5leHRlbmQob3B0fHx7fSwgY29uc3RzLmdlbi5wcm9qZWN0aW9ucyk7XG5cbiAgLy8gRmlyc3QgY2F0ZWdvcml6ZSBmaWVsZCwgc2VsZWN0ZWQsIGZpZWxkc1RvQWRkLCBhbmQgc2F2ZSBpbmRpY2VzXG4gIHZhciBzZWxlY3RlZCA9IFtdLCBmaWVsZHNUb0FkZCA9IFtdLCBmaWVsZFNldHMgPSBbXSxcbiAgICBoYXNTZWxlY3RlZERpbWVuc2lvbiA9IGZhbHNlLFxuICAgIGhhc1NlbGVjdGVkTWVhc3VyZSA9IGZhbHNlLFxuICAgIGluZGljZXMgPSB7fTtcblxuICBmaWVsZHMuZm9yRWFjaChmdW5jdGlvbihmaWVsZCwgaW5kZXgpe1xuICAgIC8vc2F2ZSBpbmRpY2VzIGZvciBzdGFibGUgc29ydCBsYXRlclxuICAgIGluZGljZXNbZmllbGQubmFtZV0gPSBpbmRleDtcblxuICAgIGlmIChmaWVsZC5zZWxlY3RlZCkge1xuICAgICAgc2VsZWN0ZWQucHVzaChmaWVsZCk7XG4gICAgICBpZiAoaXNEaW1lbnNpb24oZmllbGQpIHx8IGZpZWxkLnR5cGUgPT09J1QnKSB7IC8vIEZJWE1FIC8gSEFDS1xuICAgICAgICBoYXNTZWxlY3RlZERpbWVuc2lvbiA9IHRydWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBoYXNTZWxlY3RlZE1lYXN1cmUgPSB0cnVlO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoZmllbGQuc2VsZWN0ZWQgIT09IGZhbHNlICYmICF2bC5maWVsZC5pc0NvdW50KGZpZWxkKSkge1xuICAgICAgaWYgKHZsLmZpZWxkLmlzRGltZW5zaW9uKGZpZWxkKSAmJlxuICAgICAgICAgICFvcHQubWF4Q2FyZGluYWxpdHlGb3JBdXRvQWRkT3JkaW5hbCAmJlxuICAgICAgICAgIHZsLmZpZWxkLmNhcmRpbmFsaXR5KGZpZWxkLCBzdGF0cywgMTUpID4gb3B0Lm1heENhcmRpbmFsaXR5Rm9yQXV0b0FkZE9yZGluYWxcbiAgICAgICAgKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGZpZWxkc1RvQWRkLnB1c2goZmllbGQpO1xuICAgIH1cbiAgfSk7XG5cbiAgZmllbGRzVG9BZGQuc29ydChjb21wYXJlRmllbGRzVG9BZGQoaGFzU2VsZWN0ZWREaW1lbnNpb24sIGhhc1NlbGVjdGVkTWVhc3VyZSwgaW5kaWNlcykpO1xuXG4gIHZhciBzZXRzVG9BZGQgPSB1dGlsLmNob29zZUtvckxlc3MoZmllbGRzVG9BZGQsIDEpO1xuXG4gIHNldHNUb0FkZC5mb3JFYWNoKGZ1bmN0aW9uKHNldFRvQWRkKSB7XG4gICAgdmFyIGZpZWxkU2V0ID0gc2VsZWN0ZWQuY29uY2F0KHNldFRvQWRkKTtcbiAgICBpZiAoZmllbGRTZXQubGVuZ3RoID4gMCkge1xuICAgICAgaWYgKG9wdC5vbWl0RG90UGxvdCAmJiBmaWVsZFNldC5sZW5ndGggPT09IDEpIHJldHVybjtcbiAgICAgIGZpZWxkU2V0cy5wdXNoKGZpZWxkU2V0KTtcbiAgICB9XG4gIH0pO1xuXG4gIGZpZWxkU2V0cy5mb3JFYWNoKGZ1bmN0aW9uKGZpZWxkU2V0KSB7XG4gICAgICAvLyBhbHdheXMgYXBwZW5kIHByb2plY3Rpb24ncyBrZXkgdG8gZWFjaCBwcm9qZWN0aW9uIHJldHVybmVkLCBkMyBzdHlsZS5cbiAgICBmaWVsZFNldC5rZXkgPSBwcm9qZWN0aW9ucy5rZXkoZmllbGRTZXQpO1xuICB9KTtcblxuICByZXR1cm4gZmllbGRTZXRzO1xufVxuXG52YXIgdHlwZUlzTWVhc3VyZVNjb3JlID0ge1xuICBOOiAwLFxuICBPOiAxLFxuICBUOiAyLFxuICBROiAzXG59O1xuXG5mdW5jdGlvbiBjb21wYXJlRmllbGRzVG9BZGQoaGFzU2VsZWN0ZWREaW1lbnNpb24sIGhhc1NlbGVjdGVkTWVhc3VyZSwgaW5kaWNlcykge1xuICByZXR1cm4gZnVuY3Rpb24oYSwgYil7XG4gICAgLy8gc29ydCBieSB0eXBlIG9mIHRoZSBkYXRhXG4gICAgaWYgKGEudHlwZSAhPT0gYi50eXBlKSB7XG4gICAgICBpZiAoIWhhc1NlbGVjdGVkRGltZW5zaW9uKSB7XG4gICAgICAgIHJldHVybiB0eXBlSXNNZWFzdXJlU2NvcmVbYS50eXBlXSAtIHR5cGVJc01lYXN1cmVTY29yZVtiLnR5cGVdO1xuICAgICAgfSBlbHNlIGlmICghaGFzU2VsZWN0ZWRNZWFzdXJlKSB7XG4gICAgICAgIHJldHVybiB0eXBlSXNNZWFzdXJlU2NvcmVbYi50eXBlXSAtIHR5cGVJc01lYXN1cmVTY29yZVthLnR5cGVdO1xuICAgICAgfVxuICAgIH1cbiAgICAvL21ha2UgdGhlIHNvcnQgc3RhYmxlXG4gICAgcmV0dXJuIGluZGljZXNbYS5uYW1lXSAtIGluZGljZXNbYi5uYW1lXTtcbiAgfTtcbn1cblxucHJvamVjdGlvbnMua2V5ID0gZnVuY3Rpb24ocHJvamVjdGlvbikge1xuICByZXR1cm4gcHJvamVjdGlvbi5tYXAoZnVuY3Rpb24oZmllbGQpIHtcbiAgICByZXR1cm4gdmwuZmllbGQuaXNDb3VudChmaWVsZCkgPyAnY291bnQnIDogZmllbGQubmFtZTtcbiAgfSkuam9pbignLCcpO1xufTtcblxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgZyA9IGdsb2JhbCB8fCB3aW5kb3c7XG5cbnJlcXVpcmUoJ3ZlZ2EtbGl0ZS9zcmMvZ2xvYmFscycpO1xuXG5nLkNIQVJUX1RZUEVTID0ge1xuICBUQUJMRTogJ1RBQkxFJyxcbiAgQkFSOiAnQkFSJyxcbiAgUExPVDogJ1BMT1QnLFxuICBMSU5FOiAnTElORScsXG4gIEFSRUE6ICdBUkVBJyxcbiAgTUFQOiAnTUFQJyxcbiAgSElTVE9HUkFNOiAnSElTVE9HUkFNJ1xufTtcblxuZy5BTllfREFUQV9UWVBFUyA9ICgxIDw8IDQpIC0gMTsiLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgZW5jb2Rpbmc6IHJlcXVpcmUoJy4vcmFua0VuY29kaW5ncycpXG59O1xuXG5cbiIsIid1c2Ugc3RyaWN0JztcblxucmVxdWlyZSgnLi4vZ2xvYmFscycpO1xuXG52YXIgdmwgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdy52bCA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwudmwgOiBudWxsKSxcbiAgaXNEaW1lbnNpb24gPSB2bC5maWVsZC5pc0RpbWVuc2lvbjtcblxubW9kdWxlLmV4cG9ydHMgPSByYW5rRW5jb2RpbmdzO1xuXG4vLyBiYWQgc2NvcmUgbm90IHNwZWNpZmllZCBpbiB0aGUgdGFibGUgYWJvdmVcbnZhciBVTlVTRURfUE9TSVRJT04gPSAwLjU7XG5cbnZhciBNQVJLX1NDT1JFID0ge1xuICBsaW5lOiAwLjk5LFxuICBhcmVhOiAwLjk4LFxuICBiYXI6IDAuOTcsXG4gIHRpY2s6IDAuOTYsXG4gIHBvaW50OiAwLjk1LFxuICBjaXJjbGU6IDAuOTQsXG4gIHNxdWFyZTogMC45NCxcbiAgdGV4dDogMC44XG59O1xuXG5mdW5jdGlvbiByYW5rRW5jb2RpbmdzKGVuY29kaW5nLCBzdGF0cywgb3B0LCBzZWxlY3RlZCkge1xuICB2YXIgZmVhdHVyZXMgPSBbXSxcbiAgICBlbmNUeXBlcyA9IHZsLmtleXMoZW5jb2RpbmcuZW5jb2RpbmcpLFxuICAgIG1hcmt0eXBlID0gZW5jb2RpbmcubWFya3R5cGUsXG4gICAgZW5jID0gZW5jb2RpbmcuZW5jb2Rpbmc7XG5cbiAgdmFyIGVuY29kaW5nTWFwcGluZ0J5RmllbGQgPSB2bC5lbmMucmVkdWNlKGVuY29kaW5nLmVuY29kaW5nLCBmdW5jdGlvbihvLCBmaWVsZCwgZW5jVHlwZSkge1xuICAgIHZhciBrZXkgPSB2bC5maWVsZC5zaG9ydGhhbmQoZmllbGQpO1xuICAgIHZhciBtYXBwaW5ncyA9IG9ba2V5XSA9IG9ba2V5XSB8fCBbXTtcbiAgICBtYXBwaW5ncy5wdXNoKHtlbmNUeXBlOiBlbmNUeXBlLCBmaWVsZDogZmllbGR9KTtcbiAgICByZXR1cm4gbztcbiAgfSwge30pO1xuXG4gIC8vIGRhdGEgLSBlbmNvZGluZyBtYXBwaW5nIHNjb3JlXG4gIHZsLmZvckVhY2goZW5jb2RpbmdNYXBwaW5nQnlGaWVsZCwgZnVuY3Rpb24obWFwcGluZ3MpIHtcbiAgICB2YXIgcmVhc29ucyA9IG1hcHBpbmdzLm1hcChmdW5jdGlvbihtKSB7XG4gICAgICAgIHJldHVybiBtLmVuY1R5cGUgKyB2bC5zaG9ydGhhbmQuYXNzaWduICsgdmwuZmllbGQuc2hvcnRoYW5kKG0uZmllbGQpICtcbiAgICAgICAgICAnICcgKyAoc2VsZWN0ZWQgJiYgc2VsZWN0ZWRbbS5maWVsZC5uYW1lXSA/ICdbeF0nIDogJ1sgXScpO1xuICAgICAgfSksXG4gICAgICBzY29yZXMgPSBtYXBwaW5ncy5tYXAoZnVuY3Rpb24obSkge1xuICAgICAgICB2YXIgcm9sZSA9IHZsLmZpZWxkLnJvbGUobS5maWVsZCk7XG4gICAgICAgIHZhciBzY29yZSA9IHJhbmtFbmNvZGluZ3Muc2NvcmVbcm9sZV0obS5maWVsZCwgbS5lbmNUeXBlLCBlbmNvZGluZy5tYXJrdHlwZSwgc3RhdHMsIG9wdCk7XG5cbiAgICAgICAgcmV0dXJuICFzZWxlY3RlZCB8fCBzZWxlY3RlZFttLmZpZWxkLm5hbWVdID8gc2NvcmUgOiBNYXRoLnBvdyhzY29yZSwgMC4xMjUpO1xuICAgICAgfSk7XG5cbiAgICBmZWF0dXJlcy5wdXNoKHtcbiAgICAgIHJlYXNvbjogcmVhc29ucy5qb2luKFwiIHwgXCIpLFxuICAgICAgc2NvcmU6IE1hdGgubWF4LmFwcGx5KG51bGwsIHNjb3JlcylcbiAgICB9KTtcbiAgfSk7XG5cbiAgLy8gcGxvdCB0eXBlXG4gIGlmIChtYXJrdHlwZSA9PT0gVEVYVCkge1xuICAgIC8vIFRPRE9cbiAgfSBlbHNlIHtcbiAgICBpZiAoZW5jLnggJiYgZW5jLnkpIHtcbiAgICAgIGlmIChpc0RpbWVuc2lvbihlbmMueCkgXiBpc0RpbWVuc2lvbihlbmMueSkpIHtcbiAgICAgICAgZmVhdHVyZXMucHVzaCh7XG4gICAgICAgICAgcmVhc29uOiAnT3hRIHBsb3QnLFxuICAgICAgICAgIHNjb3JlOiAwLjhcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gcGVuYWxpemUgbm90IHVzaW5nIHBvc2l0aW9uYWwgb25seSBwZW5hbGl6ZSBmb3Igbm9uLXRleHRcbiAgaWYgKGVuY1R5cGVzLmxlbmd0aCA+IDEgJiYgbWFya3R5cGUgIT09IFRFWFQpIHtcbiAgICBpZiAoKCFlbmMueCB8fCAhZW5jLnkpICYmICFlbmMuZ2VvICYmICFlbmMudGV4dCkge1xuICAgICAgZmVhdHVyZXMucHVzaCh7XG4gICAgICAgIHJlYXNvbjogJ3VudXNlZCBwb3NpdGlvbicsXG4gICAgICAgIHNjb3JlOiBVTlVTRURfUE9TSVRJT05cbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIC8vIG1hcmsgdHlwZSBzY29yZVxuICBmZWF0dXJlcy5wdXNoKHtcbiAgICByZWFzb246ICdtYXJrdHlwZT0nK21hcmt0eXBlLFxuICAgIHNjb3JlOiBNQVJLX1NDT1JFW21hcmt0eXBlXVxuICB9KTtcblxuICByZXR1cm4ge1xuICAgIHNjb3JlOiBmZWF0dXJlcy5yZWR1Y2UoZnVuY3Rpb24ocCwgZikge1xuICAgICAgcmV0dXJuIHAgKiBmLnNjb3JlO1xuICAgIH0sIDEpLFxuICAgIGZlYXR1cmVzOiBmZWF0dXJlc1xuICB9O1xufVxuXG5cbnZhciBEID0ge30sIE0gPSB7fSwgQkFEID0gMC4xLCBURVJSSUJMRSA9IDAuMDE7XG5cbkQubWlub3IgPSAwLjAxO1xuRC5wb3MgPSAxO1xuRC5ZX1QgPSAwLjg7XG5ELmZhY2V0X3RleHQgPSAxO1xuRC5mYWNldF9nb29kID0gMC42NzU7IC8vIDwgY29sb3Jfb2ssID4gY29sb3JfYmFkXG5ELmZhY2V0X29rID0gMC41NTtcbkQuZmFjZXRfYmFkID0gMC40O1xuRC5jb2xvcl9nb29kID0gMC43O1xuRC5jb2xvcl9vayA9IDAuNjU7IC8vID4gTS5TaXplXG5ELmNvbG9yX2JhZCA9IDAuMztcbkQuY29sb3Jfc3RhY2sgPSAwLjY7XG5ELnNoYXBlID0gMC42O1xuRC5kZXRhaWwgPSAwLjU7XG5ELmJhZCA9IEJBRDtcbkQudGVycmlibGUgPSBURVJSSUJMRTtcblxuTS5wb3MgPSAxO1xuTS5zaXplID0gMC42O1xuTS5jb2xvciA9IDAuNTtcbk0uYWxwaGEgPSAwLjQ1O1xuTS50ZXh0ID0gMC40O1xuTS5iYWQgPSBCQUQ7XG5NLnRlcnJpYmxlID0gVEVSUklCTEU7XG5cbnJhbmtFbmNvZGluZ3MuZGltZW5zaW9uU2NvcmUgPSBmdW5jdGlvbiAoZmllbGQsIGVuY1R5cGUsIG1hcmt0eXBlLCBzdGF0cywgb3B0KXtcbiAgdmFyIGNhcmRpbmFsaXR5ID0gdmwuZmllbGQuY2FyZGluYWxpdHkoZmllbGQsIHN0YXRzKTtcbiAgc3dpdGNoIChlbmNUeXBlKSB7XG4gICAgY2FzZSBYOlxuICAgICAgaWYgKHZsLmZpZWxkLmlzVHlwZXMoZmllbGQsIFtOLCBPXSkpICByZXR1cm4gRC5wb3MgLSBELm1pbm9yO1xuICAgICAgcmV0dXJuIEQucG9zO1xuXG4gICAgY2FzZSBZOlxuICAgICAgaWYgKHZsLmZpZWxkLmlzVHlwZXMoZmllbGQsIFtOLCBPXSkpIHJldHVybiBELnBvcyAtIEQubWlub3I7IC8vcHJlZmVyIG9yZGluYWwgb24geVxuICAgICAgaWYoZmllbGQudHlwZSA9PT0gVCkgcmV0dXJuIEQuWV9UOyAvLyB0aW1lIHNob3VsZCBub3QgYmUgb24gWVxuICAgICAgcmV0dXJuIEQucG9zIC0gRC5taW5vcjtcblxuICAgIGNhc2UgQ09MOlxuICAgICAgaWYgKG1hcmt0eXBlID09PSBURVhUKSByZXR1cm4gRC5mYWNldF90ZXh0O1xuICAgICAgLy9wcmVmZXIgY29sdW1uIG92ZXIgcm93IGR1ZSB0byBzY3JvbGxpbmcgaXNzdWVzXG4gICAgICByZXR1cm4gY2FyZGluYWxpdHkgPD0gb3B0Lm1heEdvb2RDYXJkaW5hbGl0eUZvckZhY2V0cyA/IEQuZmFjZXRfZ29vZCA6XG4gICAgICAgIGNhcmRpbmFsaXR5IDw9IG9wdC5tYXhDYXJkaW5hbGl0eUZvckZhY2V0cyA/IEQuZmFjZXRfb2sgOiBELmZhY2V0X2JhZDtcblxuICAgIGNhc2UgUk9XOlxuICAgICAgaWYgKG1hcmt0eXBlID09PSBURVhUKSByZXR1cm4gRC5mYWNldF90ZXh0O1xuICAgICAgcmV0dXJuIChjYXJkaW5hbGl0eSA8PSBvcHQubWF4R29vZENhcmRpbmFsaXR5Rm9yRmFjZXRzID8gRC5mYWNldF9nb29kIDpcbiAgICAgICAgY2FyZGluYWxpdHkgPD0gb3B0Lm1heENhcmRpbmFsaXR5Rm9yRmFjZXRzID8gRC5mYWNldF9vayA6IEQuZmFjZXRfYmFkKSAtIEQubWlub3I7XG5cbiAgICBjYXNlIENPTE9SOlxuICAgICAgdmFyIGhhc09yZGVyID0gKGZpZWxkLmJpbiAmJiBmaWVsZC50eXBlPT09USkgfHwgKGZpZWxkLmZuICYmIGZpZWxkLnR5cGU9PT1UKTtcblxuICAgICAgLy9GSVhNRSBhZGQgc3RhY2tpbmcgb3B0aW9uIG9uY2Ugd2UgaGF2ZSBjb250cm9sIC4uXG4gICAgICB2YXIgaXNTdGFja2VkID0gbWFya3R5cGUgPT09ICdiYXInIHx8IG1hcmt0eXBlID09PSAnYXJlYSc7XG5cbiAgICAgIC8vIHRydWUgb3JkaW5hbCBvbiBjb2xvciBpcyBjdXJyZW50bHkgQkFEICh1bnRpbCB3ZSBoYXZlIGdvb2Qgb3JkaW5hbCBjb2xvciBzY2FsZSBzdXBwb3J0KVxuICAgICAgaWYgKGhhc09yZGVyKSByZXR1cm4gRC5jb2xvcl9iYWQ7XG5cbiAgICAgIC8vc3RhY2tpbmcgZ2V0cyBsb3dlciBzY29yZVxuICAgICAgaWYgKGlzU3RhY2tlZCkgcmV0dXJuIEQuY29sb3Jfc3RhY2s7XG5cbiAgICAgIHJldHVybiBjYXJkaW5hbGl0eSA8PSBvcHQubWF4R29vZENhcmRpbmFsaXR5Rm9yQ29sb3IgPyBELmNvbG9yX2dvb2Q6IGNhcmRpbmFsaXR5IDw9IG9wdC5tYXhDYXJkaW5hbGl0eUZvckNvbG9yID8gRC5jb2xvcl9vayA6IEQuY29sb3JfYmFkO1xuICAgIGNhc2UgU0hBUEU6XG4gICAgICByZXR1cm4gY2FyZGluYWxpdHkgPD0gb3B0Lm1heENhcmRpbmFsaXR5Rm9yU2hhcGUgPyBELnNoYXBlIDogVEVSUklCTEU7XG4gICAgY2FzZSBERVRBSUw6XG4gICAgICByZXR1cm4gRC5kZXRhaWw7XG4gIH1cbiAgcmV0dXJuIFRFUlJJQkxFO1xufTtcblxucmFua0VuY29kaW5ncy5kaW1lbnNpb25TY29yZS5jb25zdHMgPSBEO1xuXG5yYW5rRW5jb2RpbmdzLm1lYXN1cmVTY29yZSA9IGZ1bmN0aW9uIChmaWVsZCwgZW5jVHlwZSwgbWFya3R5cGUsIHN0YXRzLCBvcHQpIHtcbiAgLy8ganNoaW50IHVudXNlZDpmYWxzZVxuICBzd2l0Y2ggKGVuY1R5cGUpe1xuICAgIGNhc2UgWDogcmV0dXJuIE0ucG9zO1xuICAgIGNhc2UgWTogcmV0dXJuIE0ucG9zO1xuICAgIGNhc2UgU0laRTpcbiAgICAgIGlmIChtYXJrdHlwZSA9PT0gJ2JhcicpIHJldHVybiBCQUQ7IC8vc2l6ZSBvZiBiYXIgaXMgdmVyeSBiYWRcbiAgICAgIGlmIChtYXJrdHlwZSA9PT0gVEVYVCkgcmV0dXJuIEJBRDtcbiAgICAgIGlmIChtYXJrdHlwZSA9PT0gJ2xpbmUnKSByZXR1cm4gQkFEO1xuICAgICAgcmV0dXJuIE0uc2l6ZTtcbiAgICBjYXNlIENPTE9SOiByZXR1cm4gTS5jb2xvcjtcbiAgICBjYXNlICdhbHBoYSc6IHJldHVybiBNLmFscGhhO1xuICAgIGNhc2UgVEVYVDogcmV0dXJuIE0udGV4dDtcbiAgfVxuICByZXR1cm4gQkFEO1xufTtcblxucmFua0VuY29kaW5ncy5tZWFzdXJlU2NvcmUuY29uc3RzID0gTTtcblxuXG5yYW5rRW5jb2RpbmdzLnNjb3JlID0ge1xuICBkaW1lbnNpb246IHJhbmtFbmNvZGluZ3MuZGltZW5zaW9uU2NvcmUsXG4gIG1lYXN1cmU6IHJhbmtFbmNvZGluZ3MubWVhc3VyZVNjb3JlLFxufTtcbiIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgY29uc3RzID0gcmVxdWlyZSgnLi9jb25zdHMnKTtcblxudmFyIHV0aWwgPSBtb2R1bGUuZXhwb3J0cyA9IHtcbiAgZ2VuOiB7fVxufTtcblxudXRpbC5pc0FycmF5ID0gQXJyYXkuaXNBcnJheSB8fCBmdW5jdGlvbiAob2JqKSB7XG4gIHJldHVybiB7fS50b1N0cmluZy5jYWxsKG9iaikgPT0gJ1tvYmplY3QgQXJyYXldJztcbn07XG5cbnV0aWwuanNvbiA9IGZ1bmN0aW9uKHMsIHNwKSB7XG4gIHJldHVybiBKU09OLnN0cmluZ2lmeShzLCBudWxsLCBzcCk7XG59O1xuXG51dGlsLmtleXMgPSBmdW5jdGlvbihvYmopIHtcbiAgdmFyIGsgPSBbXSwgeDtcbiAgZm9yICh4IGluIG9iaikgay5wdXNoKHgpO1xuICByZXR1cm4gaztcbn07XG5cbnV0aWwubmVzdGVkTWFwID0gZnVuY3Rpb24gKGNvbCwgZiwgbGV2ZWwsIGZpbHRlcikge1xuICByZXR1cm4gbGV2ZWwgPT09IDAgP1xuICAgIGNvbC5tYXAoZikgOlxuICAgIGNvbC5tYXAoZnVuY3Rpb24odikge1xuICAgICAgdmFyIHIgPSB1dGlsLm5lc3RlZE1hcCh2LCBmLCBsZXZlbCAtIDEpO1xuICAgICAgcmV0dXJuIGZpbHRlciA/IHIuZmlsdGVyKHV0aWwubm9uRW1wdHkpIDogcjtcbiAgICB9KTtcbn07XG5cbnV0aWwubmVzdGVkUmVkdWNlID0gZnVuY3Rpb24gKGNvbCwgZiwgbGV2ZWwsIGZpbHRlcikge1xuICByZXR1cm4gbGV2ZWwgPT09IDAgP1xuICAgIGNvbC5yZWR1Y2UoZiwgW10pIDpcbiAgICBjb2wubWFwKGZ1bmN0aW9uKHYpIHtcbiAgICAgIHZhciByID0gdXRpbC5uZXN0ZWRSZWR1Y2UodiwgZiwgbGV2ZWwgLSAxKTtcbiAgICAgIHJldHVybiBmaWx0ZXIgPyByLmZpbHRlcih1dGlsLm5vbkVtcHR5KSA6IHI7XG4gICAgfSk7XG59O1xuXG51dGlsLm5vbkVtcHR5ID0gZnVuY3Rpb24oZ3JwKSB7XG4gIHJldHVybiAhdXRpbC5pc0FycmF5KGdycCkgfHwgZ3JwLmxlbmd0aCA+IDA7XG59O1xuXG5cbnV0aWwudHJhdmVyc2UgPSBmdW5jdGlvbiAobm9kZSwgYXJyKSB7XG4gIGlmIChub2RlLnZhbHVlICE9PSB1bmRlZmluZWQpIHtcbiAgICBhcnIucHVzaChub2RlLnZhbHVlKTtcbiAgfSBlbHNlIHtcbiAgICBpZiAobm9kZS5sZWZ0KSB1dGlsLnRyYXZlcnNlKG5vZGUubGVmdCwgYXJyKTtcbiAgICBpZiAobm9kZS5yaWdodCkgdXRpbC50cmF2ZXJzZShub2RlLnJpZ2h0LCBhcnIpO1xuICB9XG4gIHJldHVybiBhcnI7XG59O1xuXG51dGlsLnVuaW9uID0gZnVuY3Rpb24gKGEsIGIpIHtcbiAgdmFyIG8gPSB7fTtcbiAgYS5mb3JFYWNoKGZ1bmN0aW9uKHgpIHsgb1t4XSA9IHRydWU7fSk7XG4gIGIuZm9yRWFjaChmdW5jdGlvbih4KSB7IG9beF0gPSB0cnVlO30pO1xuICByZXR1cm4gdXRpbC5rZXlzKG8pO1xufTtcblxuXG51dGlsLmdlbi5nZXRPcHQgPSBmdW5jdGlvbiAob3B0KSB7XG4gIC8vbWVyZ2Ugd2l0aCBkZWZhdWx0XG4gIHJldHVybiAob3B0ID8gdXRpbC5rZXlzKG9wdCkgOiBbXSkucmVkdWNlKGZ1bmN0aW9uKGMsIGspIHtcbiAgICBjW2tdID0gb3B0W2tdO1xuICAgIHJldHVybiBjO1xuICB9LCBPYmplY3QuY3JlYXRlKGNvbnN0cy5nZW4uREVGQVVMVF9PUFQpKTtcbn07XG5cbi8qKlxuICogcG93ZXJzZXQgY29kZSBmcm9tIGh0dHA6Ly9yb3NldHRhY29kZS5vcmcvd2lraS9Qb3dlcl9TZXQjSmF2YVNjcmlwdFxuICpcbiAqICAgdmFyIHJlcyA9IHBvd2Vyc2V0KFsxLDIsMyw0XSk7XG4gKlxuICogcmV0dXJuc1xuICpcbiAqIFtbXSxbMV0sWzJdLFsxLDJdLFszXSxbMSwzXSxbMiwzXSxbMSwyLDNdLFs0XSxbMSw0XSxcbiAqIFsyLDRdLFsxLDIsNF0sWzMsNF0sWzEsMyw0XSxbMiwzLDRdLFsxLDIsMyw0XV1cbltlZGl0XVxuKi9cblxudXRpbC5wb3dlcnNldCA9IGZ1bmN0aW9uKGxpc3QpIHtcbiAgdmFyIHBzID0gW1xuICAgIFtdXG4gIF07XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7IGkrKykge1xuICAgIGZvciAodmFyIGogPSAwLCBsZW4gPSBwcy5sZW5ndGg7IGogPCBsZW47IGorKykge1xuICAgICAgcHMucHVzaChwc1tqXS5jb25jYXQobGlzdFtpXSkpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcHM7XG59O1xuXG51dGlsLmNob29zZUtvckxlc3MgPSBmdW5jdGlvbihsaXN0LCBrKSB7XG4gIHZhciBzdWJzZXQgPSBbW11dO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGxpc3QubGVuZ3RoOyBpKyspIHtcbiAgICBmb3IgKHZhciBqID0gMCwgbGVuID0gc3Vic2V0Lmxlbmd0aDsgaiA8IGxlbjsgaisrKSB7XG4gICAgICB2YXIgc3ViID0gc3Vic2V0W2pdLmNvbmNhdChsaXN0W2ldKTtcbiAgICAgIGlmKHN1Yi5sZW5ndGggPD0gayl7XG4gICAgICAgIHN1YnNldC5wdXNoKHN1Yik7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiBzdWJzZXQ7XG59O1xuXG51dGlsLmNob29zZUsgPSBmdW5jdGlvbihsaXN0LCBrKSB7XG4gIHZhciBzdWJzZXQgPSBbW11dO1xuICB2YXIga0FycmF5ID1bXTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgZm9yICh2YXIgaiA9IDAsIGxlbiA9IHN1YnNldC5sZW5ndGg7IGogPCBsZW47IGorKykge1xuICAgICAgdmFyIHN1YiA9IHN1YnNldFtqXS5jb25jYXQobGlzdFtpXSk7XG4gICAgICBpZihzdWIubGVuZ3RoIDwgayl7XG4gICAgICAgIHN1YnNldC5wdXNoKHN1Yik7XG4gICAgICB9ZWxzZSBpZiAoc3ViLmxlbmd0aCA9PT0gayl7XG4gICAgICAgIGtBcnJheS5wdXNoKHN1Yik7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiBrQXJyYXk7XG59O1xuXG51dGlsLmNyb3NzID0gZnVuY3Rpb24oYSxiKXtcbiAgdmFyIHggPSBbXTtcbiAgZm9yKHZhciBpPTA7IGk8IGEubGVuZ3RoOyBpKyspe1xuICAgIGZvcih2YXIgaj0wO2o8IGIubGVuZ3RoOyBqKyspe1xuICAgICAgeC5wdXNoKGFbaV0uY29uY2F0KGJbal0pKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHg7XG59O1xuXG4iXX0=
