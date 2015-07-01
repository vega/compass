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
      return encoding2._info.score - encoding1._info.score;
    });
  }).filter(function(cluster) {  // filter empty cluster
    return cluster.length >0;
  }).sort(function(cluster1, cluster2) {
    //sort by highest scoring item in each cluster
    return cluster2[0]._info.score - cluster1[0]._info.score;
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
    timeUnitList: {
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

var AUTO='*';

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
        if (!opt.consistentAutoQ || autoMode === AUTO || autoMode === a) {
          assignAggrQ(i, hasAggr, a /*assign autoMode*/, a);
        }
      });

      if ((!opt.consistentAutoQ || vl.isin(autoMode, [AUTO, 'bin', 'cast', 'autocast'])) && !hasNorO) {
        var highCardinality = vl.field.cardinality(f, stats) > opt.minCardinalityForBin;

        var isAuto = opt.genDimQ === 'auto',
          genBin = opt.genDimQ  === 'bin' || (isAuto && highCardinality),
          genCast = opt.genDimQ === 'cast' || (isAuto && !highCardinality);

        if (genBin && vl.isin(autoMode, [AUTO, 'bin', 'autocast'])) {
          assignBinQ(i, hasAggr, isAuto ? 'autocast' : 'bin');
        }
        if (genCast && vl.isin(autoMode, [AUTO, 'cast', 'autocast'])) {
          tf[i].type = 'O';
          assignField(i + 1, hasAggr, isAuto ? 'autocast' : 'cast');
          tf[i].type = 'Q';
        }
      }
    }
  }

  function assignTimeUnitT(i, hasAggr, autoMode, timeUnit) {
    tf[i].timeUnit = timeUnit;
    assignField(i+1, hasAggr, autoMode);
    delete tf[i].timeUnit;
  }

  function assignT(i, hasAggr, autoMode) {
    var f = fields[i];
    tf[i] = {name: f.name, type: f.type};

    // TODO support array of f._timeUnits
    if (f._timeUnit) {
      assignTimeUnitT(i, hasAggr, autoMode, f._timeUnit);
    } else {
      opt.timeUnitList.forEach(function(timeUnit) {
        if (timeUnit === undefined) {
          if (!hasAggr) { // can't aggregate over raw time
            assignField(i+1, false, autoMode);
          }
        } else {
          assignTimeUnitT(i, hasAggr, autoMode, timeUnit);
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
  assignField(0, hasAggr, AUTO);

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

      encoding._info = score;
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
  if (field.timeUnit && field.type === T) return false;
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
  var mark = vl.compiler.marks[markType],
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
  return enc.x.type == 'T' && enc.x.timeUnit && enc.y.type == 'Q' && enc.y.aggregate;
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
      var hasOrder = (field.bin && field.type===Q) || (field.timeUnit && field.type===T);

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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvY3AiLCJub2RlX21vZHVsZXMvY2x1c3RlcmZjay9saWIvY2x1c3RlcmZjay5qcyIsIm5vZGVfbW9kdWxlcy9jbHVzdGVyZmNrL2xpYi9kaXN0YW5jZS5qcyIsIm5vZGVfbW9kdWxlcy9jbHVzdGVyZmNrL2xpYi9oY2x1c3Rlci5qcyIsIm5vZGVfbW9kdWxlcy9jbHVzdGVyZmNrL2xpYi9rbWVhbnMuanMiLCJub2RlX21vZHVsZXMvdmVnYS1saXRlL3NyYy9nbG9iYWxzLmpzIiwic3JjL2NsdXN0ZXIvY2x1c3Rlci5qcyIsInNyYy9jbHVzdGVyL2NsdXN0ZXJjb25zdHMuanMiLCJzcmMvY2x1c3Rlci9kaXN0YW5jZS5qcyIsInNyYy9jb25zdHMuanMiLCJzcmMvZ2VuL2FnZ3JlZ2F0ZXMuanMiLCJzcmMvZ2VuL2VuY29kaW5ncy5qcyIsInNyYy9nZW4vZW5jcy5qcyIsInNyYy9nZW4vZ2VuLmpzIiwic3JjL2dlbi9tYXJrdHlwZXMuanMiLCJzcmMvZ2VuL3Byb2plY3Rpb25zLmpzIiwic3JjL2dsb2JhbHMuanMiLCJzcmMvcmFuay9yYW5rLmpzIiwic3JjL3JhbmsvcmFua0VuY29kaW5ncy5qcyIsInNyYy91dGlsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDN0dBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDekJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDdkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDNUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDbkxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDL0tBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQy9EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDaE5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQzlDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNoSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDaEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNoQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDOUxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgY29uc3RzOiByZXF1aXJlKCcuL2NvbnN0cycpLFxuICBjbHVzdGVyOiByZXF1aXJlKCcuL2NsdXN0ZXIvY2x1c3RlcicpLFxuICBnZW46IHJlcXVpcmUoJy4vZ2VuL2dlbicpLFxuICByYW5rOiByZXF1aXJlKCcuL3JhbmsvcmFuaycpLFxuICB1dGlsOiByZXF1aXJlKCcuL3V0aWwnKSxcbiAgYXV0bzogXCItLCBzdW1cIlxufTtcblxuXG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgIGhjbHVzdGVyOiByZXF1aXJlKFwiLi9oY2x1c3RlclwiKSxcbiAgIEttZWFuczogcmVxdWlyZShcIi4va21lYW5zXCIpLFxuICAga21lYW5zOiByZXF1aXJlKFwiLi9rbWVhbnNcIikua21lYW5zXG59OyIsIm1vZHVsZS5leHBvcnRzID0ge1xuICBldWNsaWRlYW46IGZ1bmN0aW9uKHYxLCB2Mikge1xuICAgICAgdmFyIHRvdGFsID0gMDtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdjEubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgIHRvdGFsICs9IE1hdGgucG93KHYyW2ldIC0gdjFbaV0sIDIpOyAgICAgIFxuICAgICAgfVxuICAgICAgcmV0dXJuIE1hdGguc3FydCh0b3RhbCk7XG4gICB9LFxuICAgbWFuaGF0dGFuOiBmdW5jdGlvbih2MSwgdjIpIHtcbiAgICAgdmFyIHRvdGFsID0gMDtcbiAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB2MS5sZW5ndGggOyBpKyspIHtcbiAgICAgICAgdG90YWwgKz0gTWF0aC5hYnModjJbaV0gLSB2MVtpXSk7ICAgICAgXG4gICAgIH1cbiAgICAgcmV0dXJuIHRvdGFsO1xuICAgfSxcbiAgIG1heDogZnVuY3Rpb24odjEsIHYyKSB7XG4gICAgIHZhciBtYXggPSAwO1xuICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHYxLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIG1heCA9IE1hdGgubWF4KG1heCAsIE1hdGguYWJzKHYyW2ldIC0gdjFbaV0pKTsgICAgICBcbiAgICAgfVxuICAgICByZXR1cm4gbWF4O1xuICAgfVxufTsiLCJ2YXIgZGlzdGFuY2VzID0gcmVxdWlyZShcIi4vZGlzdGFuY2VcIik7XG5cbnZhciBIaWVyYXJjaGljYWxDbHVzdGVyaW5nID0gZnVuY3Rpb24oZGlzdGFuY2UsIGxpbmthZ2UsIHRocmVzaG9sZCkge1xuICAgdGhpcy5kaXN0YW5jZSA9IGRpc3RhbmNlO1xuICAgdGhpcy5saW5rYWdlID0gbGlua2FnZTtcbiAgIHRoaXMudGhyZXNob2xkID0gdGhyZXNob2xkID09IHVuZGVmaW5lZCA/IEluZmluaXR5IDogdGhyZXNob2xkO1xufVxuXG5IaWVyYXJjaGljYWxDbHVzdGVyaW5nLnByb3RvdHlwZSA9IHtcbiAgIGNsdXN0ZXIgOiBmdW5jdGlvbihpdGVtcywgc25hcHNob3RQZXJpb2QsIHNuYXBzaG90Q2IpIHtcbiAgICAgIHRoaXMuY2x1c3RlcnMgPSBbXTtcbiAgICAgIHRoaXMuZGlzdHMgPSBbXTsgIC8vIGRpc3RhbmNlcyBiZXR3ZWVuIGVhY2ggcGFpciBvZiBjbHVzdGVyc1xuICAgICAgdGhpcy5taW5zID0gW107IC8vIGNsb3Nlc3QgY2x1c3RlciBmb3IgZWFjaCBjbHVzdGVyXG4gICAgICB0aGlzLmluZGV4ID0gW107IC8vIGtlZXAgYSBoYXNoIG9mIGFsbCBjbHVzdGVycyBieSBrZXlcbiAgICAgIFxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBpdGVtcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgdmFyIGNsdXN0ZXIgPSB7XG4gICAgICAgICAgICB2YWx1ZTogaXRlbXNbaV0sXG4gICAgICAgICAgICBrZXk6IGksXG4gICAgICAgICAgICBpbmRleDogaSxcbiAgICAgICAgICAgIHNpemU6IDFcbiAgICAgICAgIH07XG4gICAgICAgICB0aGlzLmNsdXN0ZXJzW2ldID0gY2x1c3RlcjtcbiAgICAgICAgIHRoaXMuaW5kZXhbaV0gPSBjbHVzdGVyO1xuICAgICAgICAgdGhpcy5kaXN0c1tpXSA9IFtdO1xuICAgICAgICAgdGhpcy5taW5zW2ldID0gMDtcbiAgICAgIH1cblxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmNsdXN0ZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8PSBpOyBqKyspIHtcbiAgICAgICAgICAgIHZhciBkaXN0ID0gKGkgPT0gaikgPyBJbmZpbml0eSA6IFxuICAgICAgICAgICAgICAgdGhpcy5kaXN0YW5jZSh0aGlzLmNsdXN0ZXJzW2ldLnZhbHVlLCB0aGlzLmNsdXN0ZXJzW2pdLnZhbHVlKTtcbiAgICAgICAgICAgIHRoaXMuZGlzdHNbaV1bal0gPSBkaXN0O1xuICAgICAgICAgICAgdGhpcy5kaXN0c1tqXVtpXSA9IGRpc3Q7XG5cbiAgICAgICAgICAgIGlmIChkaXN0IDwgdGhpcy5kaXN0c1tpXVt0aGlzLm1pbnNbaV1dKSB7XG4gICAgICAgICAgICAgICB0aGlzLm1pbnNbaV0gPSBqOyAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgfVxuICAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB2YXIgbWVyZ2VkID0gdGhpcy5tZXJnZUNsb3Nlc3QoKTtcbiAgICAgIHZhciBpID0gMDtcbiAgICAgIHdoaWxlIChtZXJnZWQpIHtcbiAgICAgICAgaWYgKHNuYXBzaG90Q2IgJiYgKGkrKyAlIHNuYXBzaG90UGVyaW9kKSA9PSAwKSB7XG4gICAgICAgICAgIHNuYXBzaG90Q2IodGhpcy5jbHVzdGVycyk7ICAgICAgICAgICBcbiAgICAgICAgfVxuICAgICAgICBtZXJnZWQgPSB0aGlzLm1lcmdlQ2xvc2VzdCgpO1xuICAgICAgfVxuICAgIFxuICAgICAgdGhpcy5jbHVzdGVycy5mb3JFYWNoKGZ1bmN0aW9uKGNsdXN0ZXIpIHtcbiAgICAgICAgLy8gY2xlYW4gdXAgbWV0YWRhdGEgdXNlZCBmb3IgY2x1c3RlcmluZ1xuICAgICAgICBkZWxldGUgY2x1c3Rlci5rZXk7XG4gICAgICAgIGRlbGV0ZSBjbHVzdGVyLmluZGV4O1xuICAgICAgfSk7XG5cbiAgICAgIHJldHVybiB0aGlzLmNsdXN0ZXJzO1xuICAgfSxcbiAgXG4gICBtZXJnZUNsb3Nlc3Q6IGZ1bmN0aW9uKCkge1xuICAgICAgLy8gZmluZCB0d28gY2xvc2VzdCBjbHVzdGVycyBmcm9tIGNhY2hlZCBtaW5zXG4gICAgICB2YXIgbWluS2V5ID0gMCwgbWluID0gSW5maW5pdHk7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuY2x1c3RlcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgIHZhciBrZXkgPSB0aGlzLmNsdXN0ZXJzW2ldLmtleSxcbiAgICAgICAgICAgICBkaXN0ID0gdGhpcy5kaXN0c1trZXldW3RoaXMubWluc1trZXldXTtcbiAgICAgICAgIGlmIChkaXN0IDwgbWluKSB7XG4gICAgICAgICAgICBtaW5LZXkgPSBrZXk7XG4gICAgICAgICAgICBtaW4gPSBkaXN0O1xuICAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKG1pbiA+PSB0aGlzLnRocmVzaG9sZCkge1xuICAgICAgICAgcmV0dXJuIGZhbHNlOyAgICAgICAgIFxuICAgICAgfVxuXG4gICAgICB2YXIgYzEgPSB0aGlzLmluZGV4W21pbktleV0sXG4gICAgICAgICAgYzIgPSB0aGlzLmluZGV4W3RoaXMubWluc1ttaW5LZXldXTtcblxuICAgICAgLy8gbWVyZ2UgdHdvIGNsb3Nlc3QgY2x1c3RlcnNcbiAgICAgIHZhciBtZXJnZWQgPSB7XG4gICAgICAgICBsZWZ0OiBjMSxcbiAgICAgICAgIHJpZ2h0OiBjMixcbiAgICAgICAgIGtleTogYzEua2V5LFxuICAgICAgICAgc2l6ZTogYzEuc2l6ZSArIGMyLnNpemVcbiAgICAgIH07XG5cbiAgICAgIHRoaXMuY2x1c3RlcnNbYzEuaW5kZXhdID0gbWVyZ2VkO1xuICAgICAgdGhpcy5jbHVzdGVycy5zcGxpY2UoYzIuaW5kZXgsIDEpO1xuICAgICAgdGhpcy5pbmRleFtjMS5rZXldID0gbWVyZ2VkO1xuXG4gICAgICAvLyB1cGRhdGUgZGlzdGFuY2VzIHdpdGggbmV3IG1lcmdlZCBjbHVzdGVyXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuY2x1c3RlcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgIHZhciBjaSA9IHRoaXMuY2x1c3RlcnNbaV07XG4gICAgICAgICB2YXIgZGlzdDtcbiAgICAgICAgIGlmIChjMS5rZXkgPT0gY2kua2V5KSB7XG4gICAgICAgICAgICBkaXN0ID0gSW5maW5pdHk7ICAgICAgICAgICAgXG4gICAgICAgICB9XG4gICAgICAgICBlbHNlIGlmICh0aGlzLmxpbmthZ2UgPT0gXCJzaW5nbGVcIikge1xuICAgICAgICAgICAgZGlzdCA9IHRoaXMuZGlzdHNbYzEua2V5XVtjaS5rZXldO1xuICAgICAgICAgICAgaWYgKHRoaXMuZGlzdHNbYzEua2V5XVtjaS5rZXldID4gdGhpcy5kaXN0c1tjMi5rZXldW2NpLmtleV0pIHtcbiAgICAgICAgICAgICAgIGRpc3QgPSB0aGlzLmRpc3RzW2MyLmtleV1bY2kua2V5XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgIH1cbiAgICAgICAgIGVsc2UgaWYgKHRoaXMubGlua2FnZSA9PSBcImNvbXBsZXRlXCIpIHtcbiAgICAgICAgICAgIGRpc3QgPSB0aGlzLmRpc3RzW2MxLmtleV1bY2kua2V5XTtcbiAgICAgICAgICAgIGlmICh0aGlzLmRpc3RzW2MxLmtleV1bY2kua2V5XSA8IHRoaXMuZGlzdHNbYzIua2V5XVtjaS5rZXldKSB7XG4gICAgICAgICAgICAgICBkaXN0ID0gdGhpcy5kaXN0c1tjMi5rZXldW2NpLmtleV07ICAgICAgICAgICAgICBcbiAgICAgICAgICAgIH1cbiAgICAgICAgIH1cbiAgICAgICAgIGVsc2UgaWYgKHRoaXMubGlua2FnZSA9PSBcImF2ZXJhZ2VcIikge1xuICAgICAgICAgICAgZGlzdCA9ICh0aGlzLmRpc3RzW2MxLmtleV1bY2kua2V5XSAqIGMxLnNpemVcbiAgICAgICAgICAgICAgICAgICArIHRoaXMuZGlzdHNbYzIua2V5XVtjaS5rZXldICogYzIuc2l6ZSkgLyAoYzEuc2l6ZSArIGMyLnNpemUpO1xuICAgICAgICAgfVxuICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBkaXN0ID0gdGhpcy5kaXN0YW5jZShjaS52YWx1ZSwgYzEudmFsdWUpOyAgICAgICAgICAgIFxuICAgICAgICAgfVxuXG4gICAgICAgICB0aGlzLmRpc3RzW2MxLmtleV1bY2kua2V5XSA9IHRoaXMuZGlzdHNbY2kua2V5XVtjMS5rZXldID0gZGlzdDtcbiAgICAgIH1cblxuICAgIFxuICAgICAgLy8gdXBkYXRlIGNhY2hlZCBtaW5zXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuY2x1c3RlcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgIHZhciBrZXkxID0gdGhpcy5jbHVzdGVyc1tpXS5rZXk7ICAgICAgICBcbiAgICAgICAgIGlmICh0aGlzLm1pbnNba2V5MV0gPT0gYzEua2V5IHx8IHRoaXMubWluc1trZXkxXSA9PSBjMi5rZXkpIHtcbiAgICAgICAgICAgIHZhciBtaW4gPSBrZXkxO1xuICAgICAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCB0aGlzLmNsdXN0ZXJzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICB2YXIga2V5MiA9IHRoaXMuY2x1c3RlcnNbal0ua2V5O1xuICAgICAgICAgICAgICAgaWYgKHRoaXMuZGlzdHNba2V5MV1ba2V5Ml0gPCB0aGlzLmRpc3RzW2tleTFdW21pbl0pIHtcbiAgICAgICAgICAgICAgICAgIG1pbiA9IGtleTI7ICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLm1pbnNba2V5MV0gPSBtaW47XG4gICAgICAgICB9XG4gICAgICAgICB0aGlzLmNsdXN0ZXJzW2ldLmluZGV4ID0gaTtcbiAgICAgIH1cbiAgICBcbiAgICAgIC8vIGNsZWFuIHVwIG1ldGFkYXRhIHVzZWQgZm9yIGNsdXN0ZXJpbmdcbiAgICAgIGRlbGV0ZSBjMS5rZXk7IGRlbGV0ZSBjMi5rZXk7XG4gICAgICBkZWxldGUgYzEuaW5kZXg7IGRlbGV0ZSBjMi5pbmRleDtcblxuICAgICAgcmV0dXJuIHRydWU7XG4gICB9XG59XG5cbnZhciBoY2x1c3RlciA9IGZ1bmN0aW9uKGl0ZW1zLCBkaXN0YW5jZSwgbGlua2FnZSwgdGhyZXNob2xkLCBzbmFwc2hvdCwgc25hcHNob3RDYWxsYmFjaykge1xuICAgZGlzdGFuY2UgPSBkaXN0YW5jZSB8fCBcImV1Y2xpZGVhblwiO1xuICAgbGlua2FnZSA9IGxpbmthZ2UgfHwgXCJhdmVyYWdlXCI7XG5cbiAgIGlmICh0eXBlb2YgZGlzdGFuY2UgPT0gXCJzdHJpbmdcIikge1xuICAgICBkaXN0YW5jZSA9IGRpc3RhbmNlc1tkaXN0YW5jZV07XG4gICB9XG4gICB2YXIgY2x1c3RlcnMgPSAobmV3IEhpZXJhcmNoaWNhbENsdXN0ZXJpbmcoZGlzdGFuY2UsIGxpbmthZ2UsIHRocmVzaG9sZCkpXG4gICAgICAgICAgICAgICAgICAuY2x1c3RlcihpdGVtcywgc25hcHNob3QsIHNuYXBzaG90Q2FsbGJhY2spO1xuICAgICAgXG4gICBpZiAodGhyZXNob2xkID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBjbHVzdGVyc1swXTsgLy8gYWxsIGNsdXN0ZXJlZCBpbnRvIG9uZVxuICAgfVxuICAgcmV0dXJuIGNsdXN0ZXJzO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGhjbHVzdGVyO1xuIiwidmFyIGRpc3RhbmNlcyA9IHJlcXVpcmUoXCIuL2Rpc3RhbmNlXCIpO1xuXG5mdW5jdGlvbiBLTWVhbnMoY2VudHJvaWRzKSB7XG4gICB0aGlzLmNlbnRyb2lkcyA9IGNlbnRyb2lkcyB8fCBbXTtcbn1cblxuS01lYW5zLnByb3RvdHlwZS5yYW5kb21DZW50cm9pZHMgPSBmdW5jdGlvbihwb2ludHMsIGspIHtcbiAgIHZhciBjZW50cm9pZHMgPSBwb2ludHMuc2xpY2UoMCk7IC8vIGNvcHlcbiAgIGNlbnRyb2lkcy5zb3J0KGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIChNYXRoLnJvdW5kKE1hdGgucmFuZG9tKCkpIC0gMC41KTtcbiAgIH0pO1xuICAgcmV0dXJuIGNlbnRyb2lkcy5zbGljZSgwLCBrKTtcbn1cblxuS01lYW5zLnByb3RvdHlwZS5jbGFzc2lmeSA9IGZ1bmN0aW9uKHBvaW50LCBkaXN0YW5jZSkge1xuICAgdmFyIG1pbiA9IEluZmluaXR5LFxuICAgICAgIGluZGV4ID0gMDtcblxuICAgZGlzdGFuY2UgPSBkaXN0YW5jZSB8fCBcImV1Y2xpZGVhblwiO1xuICAgaWYgKHR5cGVvZiBkaXN0YW5jZSA9PSBcInN0cmluZ1wiKSB7XG4gICAgICBkaXN0YW5jZSA9IGRpc3RhbmNlc1tkaXN0YW5jZV07XG4gICB9XG5cbiAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5jZW50cm9pZHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBkaXN0ID0gZGlzdGFuY2UocG9pbnQsIHRoaXMuY2VudHJvaWRzW2ldKTtcbiAgICAgIGlmIChkaXN0IDwgbWluKSB7XG4gICAgICAgICBtaW4gPSBkaXN0O1xuICAgICAgICAgaW5kZXggPSBpO1xuICAgICAgfVxuICAgfVxuXG4gICByZXR1cm4gaW5kZXg7XG59XG5cbktNZWFucy5wcm90b3R5cGUuY2x1c3RlciA9IGZ1bmN0aW9uKHBvaW50cywgaywgZGlzdGFuY2UsIHNuYXBzaG90UGVyaW9kLCBzbmFwc2hvdENiKSB7XG4gICBrID0gayB8fCBNYXRoLm1heCgyLCBNYXRoLmNlaWwoTWF0aC5zcXJ0KHBvaW50cy5sZW5ndGggLyAyKSkpO1xuXG4gICBkaXN0YW5jZSA9IGRpc3RhbmNlIHx8IFwiZXVjbGlkZWFuXCI7XG4gICBpZiAodHlwZW9mIGRpc3RhbmNlID09IFwic3RyaW5nXCIpIHtcbiAgICAgIGRpc3RhbmNlID0gZGlzdGFuY2VzW2Rpc3RhbmNlXTtcbiAgIH1cblxuICAgdGhpcy5jZW50cm9pZHMgPSB0aGlzLnJhbmRvbUNlbnRyb2lkcyhwb2ludHMsIGspO1xuXG4gICB2YXIgYXNzaWdubWVudCA9IG5ldyBBcnJheShwb2ludHMubGVuZ3RoKTtcbiAgIHZhciBjbHVzdGVycyA9IG5ldyBBcnJheShrKTtcblxuICAgdmFyIGl0ZXJhdGlvbnMgPSAwO1xuICAgdmFyIG1vdmVtZW50ID0gdHJ1ZTtcbiAgIHdoaWxlIChtb3ZlbWVudCkge1xuICAgICAgLy8gdXBkYXRlIHBvaW50LXRvLWNlbnRyb2lkIGFzc2lnbm1lbnRzXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBvaW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgYXNzaWdubWVudFtpXSA9IHRoaXMuY2xhc3NpZnkocG9pbnRzW2ldLCBkaXN0YW5jZSk7XG4gICAgICB9XG5cbiAgICAgIC8vIHVwZGF0ZSBsb2NhdGlvbiBvZiBlYWNoIGNlbnRyb2lkXG4gICAgICBtb3ZlbWVudCA9IGZhbHNlO1xuICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBrOyBqKyspIHtcbiAgICAgICAgIHZhciBhc3NpZ25lZCA9IFtdO1xuICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhc3NpZ25tZW50Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAoYXNzaWdubWVudFtpXSA9PSBqKSB7XG4gICAgICAgICAgICAgICBhc3NpZ25lZC5wdXNoKHBvaW50c1tpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICB9XG5cbiAgICAgICAgIGlmICghYXNzaWduZWQubGVuZ3RoKSB7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgIH1cblxuICAgICAgICAgdmFyIGNlbnRyb2lkID0gdGhpcy5jZW50cm9pZHNbal07XG4gICAgICAgICB2YXIgbmV3Q2VudHJvaWQgPSBuZXcgQXJyYXkoY2VudHJvaWQubGVuZ3RoKTtcblxuICAgICAgICAgZm9yICh2YXIgZyA9IDA7IGcgPCBjZW50cm9pZC5sZW5ndGg7IGcrKykge1xuICAgICAgICAgICAgdmFyIHN1bSA9IDA7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFzc2lnbmVkLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICBzdW0gKz0gYXNzaWduZWRbaV1bZ107XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBuZXdDZW50cm9pZFtnXSA9IHN1bSAvIGFzc2lnbmVkLmxlbmd0aDtcblxuICAgICAgICAgICAgaWYgKG5ld0NlbnRyb2lkW2ddICE9IGNlbnRyb2lkW2ddKSB7XG4gICAgICAgICAgICAgICBtb3ZlbWVudCA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICB9XG5cbiAgICAgICAgIHRoaXMuY2VudHJvaWRzW2pdID0gbmV3Q2VudHJvaWQ7XG4gICAgICAgICBjbHVzdGVyc1tqXSA9IGFzc2lnbmVkO1xuICAgICAgfVxuXG4gICAgICBpZiAoc25hcHNob3RDYiAmJiAoaXRlcmF0aW9ucysrICUgc25hcHNob3RQZXJpb2QgPT0gMCkpIHtcbiAgICAgICAgIHNuYXBzaG90Q2IoY2x1c3RlcnMpO1xuICAgICAgfVxuICAgfVxuXG4gICByZXR1cm4gY2x1c3RlcnM7XG59XG5cbktNZWFucy5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24oKSB7XG4gICByZXR1cm4gSlNPTi5zdHJpbmdpZnkodGhpcy5jZW50cm9pZHMpO1xufVxuXG5LTWVhbnMucHJvdG90eXBlLmZyb21KU09OID0gZnVuY3Rpb24oanNvbikge1xuICAgdGhpcy5jZW50cm9pZHMgPSBKU09OLnBhcnNlKGpzb24pO1xuICAgcmV0dXJuIHRoaXM7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gS01lYW5zO1xuXG5tb2R1bGUuZXhwb3J0cy5rbWVhbnMgPSBmdW5jdGlvbih2ZWN0b3JzLCBrKSB7XG4gICByZXR1cm4gKG5ldyBLTWVhbnMoKSkuY2x1c3Rlcih2ZWN0b3JzLCBrKTtcbn0iLCIndXNlIHN0cmljdCc7XG5cbi8vIGRlY2xhcmUgZ2xvYmFsIGNvbnN0YW50XG52YXIgZyA9IGdsb2JhbCB8fCB3aW5kb3c7XG5cbmcuVEFCTEUgPSAndGFibGUnO1xuZy5SQVcgPSAncmF3JztcbmcuU1RBQ0tFRCA9ICdzdGFja2VkJztcbmcuSU5ERVggPSAnaW5kZXgnO1xuXG5nLlggPSAneCc7XG5nLlkgPSAneSc7XG5nLlJPVyA9ICdyb3cnO1xuZy5DT0wgPSAnY29sJztcbmcuU0laRSA9ICdzaXplJztcbmcuU0hBUEUgPSAnc2hhcGUnO1xuZy5DT0xPUiA9ICdjb2xvcic7XG5nLkFMUEhBID0gJ2FscGhhJztcbmcuVEVYVCA9ICd0ZXh0JztcbmcuREVUQUlMID0gJ2RldGFpbCc7XG5cbmcuTiA9ICdOJztcbmcuTyA9ICdPJztcbmcuUSA9ICdRJztcbmcuVCA9ICdUJztcbiIsIlwidXNlIHN0cmljdFwiO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGNsdXN0ZXI7XG5cbnZhciB2bCA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93LnZsIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbC52bCA6IG51bGwpLFxuICBjbHVzdGVyZmNrID0gcmVxdWlyZSgnY2x1c3RlcmZjaycpLFxuICBjb25zdHMgPSByZXF1aXJlKCcuL2NsdXN0ZXJjb25zdHMnKSxcbiAgdXRpbCA9IHJlcXVpcmUoJy4uL3V0aWwnKTtcblxuY2x1c3Rlci5kaXN0YW5jZSA9IHJlcXVpcmUoJy4vZGlzdGFuY2UnKTtcblxuZnVuY3Rpb24gY2x1c3RlcihlbmNvZGluZ3MsIG9wdCkge1xuICAvLyBqc2hpbnQgdW51c2VkOmZhbHNlXG4gIHZhciBkaXN0ID0gY2x1c3Rlci5kaXN0YW5jZS50YWJsZShlbmNvZGluZ3MpO1xuXG4gIHZhciBjbHVzdGVyVHJlZXMgPSBjbHVzdGVyZmNrLmhjbHVzdGVyKGVuY29kaW5ncywgZnVuY3Rpb24oZTEsIGUyKSB7XG4gICAgdmFyIHMxID0gdmwuRW5jb2Rpbmcuc2hvcnRoYW5kKGUxKSxcbiAgICAgIHMyID0gdmwuRW5jb2Rpbmcuc2hvcnRoYW5kKGUyKTtcbiAgICByZXR1cm4gZGlzdFtzMV1bczJdO1xuICB9LCAnYXZlcmFnZScsIGNvbnN0cy5DTFVTVEVSX1RIUkVTSE9MRCk7XG5cbiAgdmFyIGNsdXN0ZXJzID0gY2x1c3RlclRyZWVzLm1hcChmdW5jdGlvbih0cmVlKSB7XG4gICAgICByZXR1cm4gdXRpbC50cmF2ZXJzZSh0cmVlLCBbXSk7XG4gICAgfSlcbiAgIC5tYXAoZnVuY3Rpb24oY2x1c3Rlcikge1xuICAgIHJldHVybiBjbHVzdGVyLnNvcnQoZnVuY3Rpb24oZW5jb2RpbmcxLCBlbmNvZGluZzIpIHtcbiAgICAgIC8vIHNvcnQgZWFjaCBjbHVzdGVyIC0tIGhhdmUgdGhlIGhpZ2hlc3Qgc2NvcmUgYXMgMXN0IGl0ZW1cbiAgICAgIHJldHVybiBlbmNvZGluZzIuX2luZm8uc2NvcmUgLSBlbmNvZGluZzEuX2luZm8uc2NvcmU7XG4gICAgfSk7XG4gIH0pLmZpbHRlcihmdW5jdGlvbihjbHVzdGVyKSB7ICAvLyBmaWx0ZXIgZW1wdHkgY2x1c3RlclxuICAgIHJldHVybiBjbHVzdGVyLmxlbmd0aCA+MDtcbiAgfSkuc29ydChmdW5jdGlvbihjbHVzdGVyMSwgY2x1c3RlcjIpIHtcbiAgICAvL3NvcnQgYnkgaGlnaGVzdCBzY29yaW5nIGl0ZW0gaW4gZWFjaCBjbHVzdGVyXG4gICAgcmV0dXJuIGNsdXN0ZXIyWzBdLl9pbmZvLnNjb3JlIC0gY2x1c3RlcjFbMF0uX2luZm8uc2NvcmU7XG4gIH0pO1xuXG4gIGNsdXN0ZXJzLmRpc3QgPSBkaXN0OyAvL2FwcGVuZCBkaXN0IGluIHRoZSBhcnJheSBmb3IgZGVidWdnaW5nXG5cbiAgcmV0dXJuIGNsdXN0ZXJzO1xufSIsIid1c2Ugc3RyaWN0JztcblxudmFyIGMgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG5jLlNXQVBQQUJMRSA9IDAuMDU7XG5jLkRJU1RfTUlTU0lORyA9IDE7XG5jLkNMVVNURVJfVEhSRVNIT0xEID0gMTtcblxuZnVuY3Rpb24gcmVkdWNlVHVwbGVUb1RhYmxlKHIsIHgpIHtcbiAgdmFyIGEgPSB4WzBdLCBiID0geFsxXSwgZCA9IHhbMl07XG4gIHJbYV0gPSByW2FdIHx8IHt9O1xuICByW2JdID0gcltiXSB8fCB7fTtcbiAgclthXVtiXSA9IHJbYl1bYV0gPSBkO1xuICByZXR1cm4gcjtcbn1cblxuYy5ESVNUX0JZX0VOQ1RZUEUgPSBbXG4gIC8vIHBvc2l0aW9uYWxcbiAgWyd4JywgJ3knLCBjLlNXQVBQQUJMRV0sXG4gIFsncm93JywgJ2NvbCcsIGMuU1dBUFBBQkxFXSxcblxuICAvLyBvcmRpbmFsIG1hcmsgcHJvcGVydGllc1xuICBbJ2NvbG9yJywgJ3NoYXBlJywgYy5TV0FQUEFCTEVdLFxuICBbJ2NvbG9yJywgJ2RldGFpbCcsIGMuU1dBUFBBQkxFXSxcbiAgWydkZXRhaWwnLCAnc2hhcGUnLCBjLlNXQVBQQUJMRV0sXG5cbiAgLy8gcXVhbnRpdGF0aXZlIG1hcmsgcHJvcGVydGllc1xuICBbJ2NvbG9yJywgJ2FscGhhJywgYy5TV0FQUEFCTEVdLFxuICBbJ3NpemUnLCAnYWxwaGEnLCBjLlNXQVBQQUJMRV0sXG4gIFsnc2l6ZScsICdjb2xvcicsIGMuU1dBUFBBQkxFXVxuXS5yZWR1Y2UocmVkdWNlVHVwbGVUb1RhYmxlLCB7fSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciB2bCA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93LnZsIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbC52bCA6IG51bGwpLFxuICBjb25zdHMgPSByZXF1aXJlKCcuL2NsdXN0ZXJjb25zdHMnKSxcbiAgdXRpbCA9IHJlcXVpcmUoJy4uL3V0aWwnKTtcblxudmFyIGRpc3RhbmNlID0ge307XG5tb2R1bGUuZXhwb3J0cyA9IGRpc3RhbmNlO1xuXG5kaXN0YW5jZS50YWJsZSA9IGZ1bmN0aW9uIChlbmNvZGluZ3MpIHtcbiAgdmFyIGxlbiA9IGVuY29kaW5ncy5sZW5ndGgsXG4gICAgY29sZW5jcyA9IGVuY29kaW5ncy5tYXAoZnVuY3Rpb24oZSkgeyByZXR1cm4gZGlzdGFuY2UuZ2V0RW5jVHlwZUJ5Q29sdW1uTmFtZShlKTsgfSksXG4gICAgc2hvcnRoYW5kcyA9IGVuY29kaW5ncy5tYXAodmwuRW5jb2Rpbmcuc2hvcnRoYW5kKSxcbiAgICBkaWZmID0ge30sIGksIGo7XG5cbiAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKSBkaWZmW3Nob3J0aGFuZHNbaV1dID0ge307XG5cbiAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgZm9yIChqID0gaSArIDE7IGogPCBsZW47IGorKykge1xuICAgICAgdmFyIHNqID0gc2hvcnRoYW5kc1tqXSwgc2kgPSBzaG9ydGhhbmRzW2ldO1xuXG4gICAgICBkaWZmW3NqXVtzaV0gPSBkaWZmW3NpXVtzal0gPSBkaXN0YW5jZS5nZXQoY29sZW5jc1tpXSwgY29sZW5jc1tqXSk7XG4gICAgfVxuICB9XG4gIHJldHVybiBkaWZmO1xufTtcblxuZGlzdGFuY2UuZ2V0ID0gZnVuY3Rpb24gKGNvbGVuYzEsIGNvbGVuYzIpIHtcbiAgdmFyIGNvbHMgPSB1dGlsLnVuaW9uKHZsLmtleXMoY29sZW5jMS5jb2wpLCB2bC5rZXlzKGNvbGVuYzIuY29sKSksXG4gICAgZGlzdCA9IDA7XG5cbiAgY29scy5mb3JFYWNoKGZ1bmN0aW9uKGNvbCkge1xuICAgIHZhciBlMSA9IGNvbGVuYzEuY29sW2NvbF0sIGUyID0gY29sZW5jMi5jb2xbY29sXTtcblxuICAgIGlmIChlMSAmJiBlMikge1xuICAgICAgaWYgKGUxLmVuY1R5cGUgIT0gZTIuZW5jVHlwZSkge1xuICAgICAgICBkaXN0ICs9IChjb25zdHMuRElTVF9CWV9FTkNUWVBFW2UxLmVuY1R5cGVdIHx8IHt9KVtlMi5lbmNUeXBlXSB8fCAxO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBkaXN0ICs9IGNvbnN0cy5ESVNUX01JU1NJTkc7XG4gICAgfVxuICB9KTtcblxuICAvLyBkbyBub3QgZ3JvdXAgc3RhY2tlZCBjaGFydCB3aXRoIHNpbWlsYXIgbm9uLXN0YWNrZWQgY2hhcnQhXG4gIHZhciBpc1N0YWNrMSA9IHZsLkVuY29kaW5nLmlzU3RhY2soY29sZW5jMSksXG4gICAgaXNTdGFjazIgPSB2bC5FbmNvZGluZy5pc1N0YWNrKGNvbGVuYzIpO1xuXG4gIGlmKGlzU3RhY2sxIHx8IGlzU3RhY2syKSB7XG4gICAgaWYoaXNTdGFjazEgJiYgaXNTdGFjazIpIHtcbiAgICAgIGlmKGNvbGVuYzEuZW5jb2RpbmcuY29sb3IubmFtZSAhPT0gY29sZW5jMi5lbmNvZGluZy5jb2xvci5uYW1lKSB7XG4gICAgICAgIGRpc3QrPTE7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGRpc3QrPTE7IC8vIHN1cmVseSBkaWZmZXJlbnRcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGRpc3Q7XG59O1xuXG4vLyBnZXQgZW5jb2RpbmcgdHlwZSBieSBmaWVsZG5hbWVcbmRpc3RhbmNlLmdldEVuY1R5cGVCeUNvbHVtbk5hbWUgPSBmdW5jdGlvbihlbmNvZGluZykge1xuICB2YXIgX2NvbGVuYyA9IHt9LFxuICAgIGVuYyA9IGVuY29kaW5nLmVuY29kaW5nO1xuXG4gIHZsLmtleXMoZW5jKS5mb3JFYWNoKGZ1bmN0aW9uKGVuY1R5cGUpIHtcbiAgICB2YXIgZSA9IHZsLmR1cGxpY2F0ZShlbmNbZW5jVHlwZV0pO1xuICAgIGUuZW5jVHlwZSA9IGVuY1R5cGU7XG4gICAgX2NvbGVuY1tlLm5hbWUgfHwgJyddID0gZTtcbiAgICBkZWxldGUgZS5uYW1lO1xuICB9KTtcblxuICByZXR1cm4ge1xuICAgIG1hcmt0eXBlOiBlbmNvZGluZy5tYXJrdHlwZSxcbiAgICBjb2w6IF9jb2xlbmMsXG4gICAgZW5jb2Rpbmc6IGVuY29kaW5nLmVuY29kaW5nXG4gIH07XG59OyIsIid1c2Ugc3RyaWN0JztcblxudmFyIGNvbnN0cyA9IG1vZHVsZS5leHBvcnRzID0ge1xuICBnZW46IHt9LFxuICBjbHVzdGVyOiB7fSxcbiAgcmFuazoge31cbn07XG5cbmNvbnN0cy5nZW4ucHJvamVjdGlvbnMgPSB7XG4gIHR5cGU6ICdvYmplY3QnLFxuICBwcm9wZXJ0aWVzOiB7XG4gICAgb21pdERvdFBsb3Q6IHsgLy9GSVhNRSByZW1vdmUgdGhpcyFcbiAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgICAgZGVzY3JpcHRpb246ICdyZW1vdmUgYWxsIGRvdCBwbG90cydcbiAgICB9LFxuICAgIG1heENhcmRpbmFsaXR5Rm9yQXV0b0FkZE9yZGluYWw6IHtcbiAgICAgIHR5cGU6ICdpbnRlZ2VyJyxcbiAgICAgIGRlZmF1bHQ6IDUwLFxuICAgICAgZGVzY3JpcHRpb246ICdtYXggY2FyZGluYWxpdHkgZm9yIG9yZGluYWwgZmllbGQgdG8gYmUgY29uc2lkZXJlZCBmb3IgYXV0byBhZGRpbmcnXG4gICAgfSxcbiAgICBhbHdheXNBZGRIaXN0b2dyYW06IHtcbiAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgIGRlZmF1bHQ6IHRydWVcbiAgICB9XG4gIH1cbn07XG5cbmNvbnN0cy5nZW4uYWdncmVnYXRlcyA9IHtcbiAgdHlwZTogJ29iamVjdCcsXG4gIHByb3BlcnRpZXM6IHtcbiAgICBjb25maWc6IHtcbiAgICAgIHR5cGU6ICdvYmplY3QnXG4gICAgfSxcbiAgICBkYXRhOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0J1xuICAgIH0sXG4gICAgdGFibGVUeXBlczoge1xuICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgZGVmYXVsdDogJ2JvdGgnLFxuICAgICAgZW51bTogWydib3RoJywgJ2FnZ3JlZ2F0ZWQnLCAnZGlzYWdncmVnYXRlZCddXG4gICAgfSxcbiAgICBnZW5EaW1ROiB7XG4gICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgIGRlZmF1bHQ6ICdhdXRvJyxcbiAgICAgIGVudW06IFsnYXV0bycsICdiaW4nLCAnY2FzdCcsICdub25lJ10sXG4gICAgICBkZXNjcmlwdGlvbjogJ1VzZSBRIGFzIERpbWVuc2lvbiBlaXRoZXIgYnkgYmlubmluZyBvciBjYXN0aW5nJ1xuICAgIH0sXG4gICAgbWluQ2FyZGluYWxpdHlGb3JCaW46IHtcbiAgICAgIHR5cGU6ICdpbnRlZ2VyJyxcbiAgICAgIGRlZmF1bHQ6IDIwLFxuICAgICAgZGVzY3JpcHRpb246ICdtaW5pbXVtIGNhcmRpbmFsaXR5IG9mIGEgZmllbGQgaWYgd2Ugd2VyZSB0byBiaW4nXG4gICAgfSxcbiAgICBvbWl0RG90UGxvdDoge1xuICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgZGVmYXVsdDogZmFsc2UsXG4gICAgICBkZXNjcmlwdGlvbjogJ3JlbW92ZSBhbGwgZG90IHBsb3RzJ1xuICAgIH0sXG4gICAgb21pdE1lYXN1cmVPbmx5OiB7XG4gICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICBkZWZhdWx0OiBmYWxzZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnT21pdCBhZ2dyZWdhdGlvbiB3aXRoIG1lYXN1cmUocykgb25seSdcbiAgICB9LFxuICAgIG9taXREaW1lbnNpb25Pbmx5OiB7XG4gICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICBkZWZhdWx0OiB0cnVlLFxuICAgICAgZGVzY3JpcHRpb246ICdPbWl0IGFnZ3JlZ2F0aW9uIHdpdGggZGltZW5zaW9uKHMpIG9ubHknXG4gICAgfSxcbiAgICBhZGRDb3VudEZvckRpbWVuc2lvbk9ubHk6IHtcbiAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgIGRlZmF1bHQ6IHRydWUsXG4gICAgICBkZXNjcmlwdGlvbjogJ0FkZCBjb3VudCB3aGVuIHRoZXJlIGFyZSBkaW1lbnNpb24ocykgb25seSdcbiAgICB9LFxuICAgIGFnZ3JMaXN0OiB7XG4gICAgICB0eXBlOiAnYXJyYXknLFxuICAgICAgaXRlbXM6IHtcbiAgICAgICAgdHlwZTogWydzdHJpbmcnXVxuICAgICAgfSxcbiAgICAgIGRlZmF1bHQ6IFt1bmRlZmluZWQsICdhdmcnXVxuICAgIH0sXG4gICAgdGltZVVuaXRMaXN0OiB7XG4gICAgICB0eXBlOiAnYXJyYXknLFxuICAgICAgaXRlbXM6IHtcbiAgICAgICAgdHlwZTogWydzdHJpbmcnXVxuICAgICAgfSxcbiAgICAgIGRlZmF1bHQ6IFsneWVhciddXG4gICAgfSxcbiAgICBjb25zaXN0ZW50QXV0b1E6IHtcbiAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgIGRlZmF1bHQ6IHRydWUsXG4gICAgICBkZXNjcmlwdGlvbjogXCJnZW5lcmF0ZSBzaW1pbGFyIGF1dG8gdHJhbnNmb3JtIGZvciBxdWFudFwiXG4gICAgfVxuICB9XG59O1xuXG5jb25zdHMuZ2VuLmVuY29kaW5ncyA9IHtcbiAgdHlwZTogJ29iamVjdCcsXG4gIHByb3BlcnRpZXM6IHtcbiAgICBtYXJrdHlwZUxpc3Q6IHtcbiAgICAgIHR5cGU6ICdhcnJheScsXG4gICAgICBpdGVtczoge3R5cGU6ICdzdHJpbmcnfSxcbiAgICAgIGRlZmF1bHQ6IFsncG9pbnQnLCAnYmFyJywgJ2xpbmUnLCAnYXJlYScsICd0ZXh0JywgJ3RpY2snXSwgLy9maWxsZWRfbWFwXG4gICAgICBkZXNjcmlwdGlvbjogJ2FsbG93ZWQgbWFya3R5cGVzJ1xuICAgIH0sXG4gICAgZW5jb2RpbmdUeXBlTGlzdDoge1xuICAgICAgdHlwZTogJ2FycmF5JyxcbiAgICAgIGl0ZW1zOiB7dHlwZTogJ3N0cmluZyd9LFxuICAgICAgZGVmYXVsdDogWyd4JywgJ3knLCAncm93JywgJ2NvbCcsICdzaXplJywgJ2NvbG9yJywgJ3RleHQnLCAnZGV0YWlsJ10sXG4gICAgICBkZXNjcmlwdGlvbjogJ2FsbG93ZWQgZW5jb2RpbmcgdHlwZXMnXG4gICAgfSxcbiAgICBtYXhHb29kQ2FyZGluYWxpdHlGb3JGYWNldHM6IHtcbiAgICAgIHR5cGU6ICdpbnRlZ2VyJyxcbiAgICAgIGRlZmF1bHQ6IDUsXG4gICAgICBkZXNjcmlwdGlvbjogJ21heGltdW0gY2FyZGluYWxpdHkgb2YgYSBmaWVsZCB0byBiZSBwdXQgb24gZmFjZXQgKHJvdy9jb2wpIGVmZmVjdGl2ZWx5J1xuICAgIH0sXG4gICAgbWF4Q2FyZGluYWxpdHlGb3JGYWNldHM6IHtcbiAgICAgIHR5cGU6ICdpbnRlZ2VyJyxcbiAgICAgIGRlZmF1bHQ6IDIwLFxuICAgICAgZGVzY3JpcHRpb246ICdtYXhpbXVtIGNhcmRpbmFsaXR5IG9mIGEgZmllbGQgdG8gYmUgcHV0IG9uIGZhY2V0IChyb3cvY29sKSdcbiAgICB9LFxuICAgIG1heEdvb2RDYXJkaW5hbGl0eUZvckNvbG9yOiB7XG4gICAgICB0eXBlOiAnaW50ZWdlcicsXG4gICAgICBkZWZhdWx0OiA3LFxuICAgICAgZGVzY3JpcHRpb246ICdtYXhpbXVtIGNhcmRpbmFsaXR5IG9mIGFuIG9yZGluYWwgZmllbGQgdG8gYmUgcHV0IG9uIGNvbG9yIGVmZmVjdGl2ZWx5J1xuICAgIH0sXG4gICAgbWF4Q2FyZGluYWxpdHlGb3JDb2xvcjoge1xuICAgICAgdHlwZTogJ2ludGVnZXInLFxuICAgICAgZGVmYXVsdDogMjAsXG4gICAgICBkZXNjcmlwdGlvbjogJ21heGltdW0gY2FyZGluYWxpdHkgb2YgYW4gb3JkaW5hbCBmaWVsZCB0byBiZSBwdXQgb24gY29sb3InXG4gICAgfSxcbiAgICBtYXhDYXJkaW5hbGl0eUZvclNoYXBlOiB7XG4gICAgICB0eXBlOiAnaW50ZWdlcicsXG4gICAgICBkZWZhdWx0OiA2LFxuICAgICAgZGVzY3JpcHRpb246ICdtYXhpbXVtIGNhcmRpbmFsaXR5IG9mIGFuIG9yZGluYWwgZmllbGQgdG8gYmUgcHV0IG9uIHNoYXBlJ1xuICAgIH0sXG4gICAgb21pdFRyYW5wb3NlOiAge1xuICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgZGVmYXVsdDogdHJ1ZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnRWxpbWluYXRlIGFsbCB0cmFuc3Bvc2UgYnkgKDEpIGtlZXBpbmcgaG9yaXpvbnRhbCBkb3QgcGxvdCBvbmx5ICgyKSBmb3IgT3hRIGNoYXJ0cywgYWx3YXlzIHB1dCBPIG9uIFkgKDMpIHNob3cgb25seSBvbmUgRHhELCBNeE0gKGN1cnJlbnRseSBzb3J0ZWQgYnkgbmFtZSknXG4gICAgfSxcbiAgICBvbWl0RG90UGxvdDoge1xuICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgZGVmYXVsdDogZmFsc2UsXG4gICAgICBkZXNjcmlwdGlvbjogJ3JlbW92ZSBhbGwgZG90IHBsb3RzJ1xuICAgIH0sXG4gICAgb21pdERvdFBsb3RXaXRoRXh0cmFFbmNvZGluZzoge1xuICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgZGVmYXVsdDogdHJ1ZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAncmVtb3ZlIGFsbCBkb3QgcGxvdHMgd2l0aCA+MSBlbmNvZGluZydcbiAgICB9LFxuICAgIG9taXRNdWx0aXBsZVJldGluYWxFbmNvZGluZ3M6IHtcbiAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgIGRlZmF1bHQ6IHRydWUsXG4gICAgICBkZXNjcmlwdGlvbjogJ29taXQgdXNpbmcgbXVsdGlwbGUgcmV0aW5hbCB2YXJpYWJsZXMgKHNpemUsIGNvbG9yLCBhbHBoYSwgc2hhcGUpJ1xuICAgIH0sXG4gICAgb21pdE5vblRleHRBZ2dyV2l0aEFsbERpbXNPbkZhY2V0czoge1xuICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgZGVmYXVsdDogdHJ1ZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAncmVtb3ZlIGFsbCBhZ2dyZWdhdGVkIGNoYXJ0cyAoZXhjZXB0IHRleHQgdGFibGVzKSB3aXRoIGFsbCBkaW1zIG9uIGZhY2V0cyAocm93LCBjb2wpJ1xuICAgIH0sXG4gICAgb21pdFNpemVPbkJhcjoge1xuICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgZGVmYXVsdDogZmFsc2UsXG4gICAgICBkZXNjcmlwdGlvbjogJ2RvIG5vdCB1c2UgYmFyXFwncyBzaXplJ1xuICAgIH0sXG4gICAgb21pdFN0YWNrZWRBdmVyYWdlOiB7XG4gICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICBkZWZhdWx0OiB0cnVlLFxuICAgICAgZGVzY3JpcHRpb246ICdkbyBub3Qgc3RhY2sgYmFyIGNoYXJ0IHdpdGggYXZlcmFnZSdcbiAgICB9LFxuICAgIGFsd2F5c0dlbmVyYXRlVGFibGVBc0hlYXRtYXA6IHtcbiAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgIGRlZmF1bHQ6IHRydWVcbiAgICB9XG4gIH1cbn07XG5cblxuXG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciB2bCA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93LnZsIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbC52bCA6IG51bGwpO1xuXG52YXIgY29uc3RzID0gcmVxdWlyZSgnLi4vY29uc3RzJyk7XG5cbnZhciBBVVRPPScqJztcblxubW9kdWxlLmV4cG9ydHMgPSBnZW5BZ2dyZWdhdGVzO1xuXG5mdW5jdGlvbiBnZW5BZ2dyZWdhdGVzKG91dHB1dCwgZmllbGRzLCBzdGF0cywgb3B0KSB7XG4gIG9wdCA9IHZsLnNjaGVtYS51dGlsLmV4dGVuZChvcHR8fHt9LCBjb25zdHMuZ2VuLmFnZ3JlZ2F0ZXMpO1xuICB2YXIgdGYgPSBuZXcgQXJyYXkoZmllbGRzLmxlbmd0aCk7XG4gIHZhciBoYXNOb3JPID0gdmwuYW55KGZpZWxkcywgZnVuY3Rpb24oZikge1xuICAgIHJldHVybiB2bC5maWVsZC5pc1R5cGVzKGYsIFtOLCBPXSk7XG4gIH0pO1xuXG4gIGZ1bmN0aW9uIGVtaXQoZmllbGRTZXQpIHtcbiAgICBmaWVsZFNldCA9IHZsLmR1cGxpY2F0ZShmaWVsZFNldCk7XG4gICAgZmllbGRTZXQua2V5ID0gdmwuZmllbGQuc2hvcnRoYW5kcyhmaWVsZFNldCk7XG4gICAgb3V0cHV0LnB1c2goZmllbGRTZXQpO1xuICB9XG5cbiAgZnVuY3Rpb24gY2hlY2tBbmRQdXNoKCkge1xuICAgIGlmIChvcHQub21pdE1lYXN1cmVPbmx5IHx8IG9wdC5vbWl0RGltZW5zaW9uT25seSkge1xuICAgICAgdmFyIGhhc01lYXN1cmUgPSBmYWxzZSwgaGFzRGltZW5zaW9uID0gZmFsc2UsIGhhc1JhdyA9IGZhbHNlO1xuICAgICAgdGYuZm9yRWFjaChmdW5jdGlvbihmKSB7XG4gICAgICAgIGlmICh2bC5maWVsZC5pc0RpbWVuc2lvbihmKSkge1xuICAgICAgICAgIGhhc0RpbWVuc2lvbiA9IHRydWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaGFzTWVhc3VyZSA9IHRydWU7XG4gICAgICAgICAgaWYgKCFmLmFnZ3JlZ2F0ZSkgaGFzUmF3ID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBpZiAoIWhhc0RpbWVuc2lvbiAmJiAhaGFzUmF3ICYmIG9wdC5vbWl0TWVhc3VyZU9ubHkpIHJldHVybjtcbiAgICAgIGlmICghaGFzTWVhc3VyZSkge1xuICAgICAgICBpZiAob3B0LmFkZENvdW50Rm9yRGltZW5zaW9uT25seSkge1xuICAgICAgICAgIHRmLnB1c2godmwuZmllbGQuY291bnQoKSk7XG4gICAgICAgICAgZW1pdCh0Zik7XG4gICAgICAgICAgdGYucG9wKCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG9wdC5vbWl0RGltZW5zaW9uT25seSkgcmV0dXJuO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAob3B0Lm9taXREb3RQbG90ICYmIHRmLmxlbmd0aCA9PT0gMSkgcmV0dXJuO1xuICAgIGVtaXQodGYpO1xuICB9XG5cbiAgZnVuY3Rpb24gYXNzaWduQWdnclEoaSwgaGFzQWdnciwgYXV0b01vZGUsIGEpIHtcbiAgICB2YXIgY2FuSGF2ZUFnZ3IgPSBoYXNBZ2dyID09PSB0cnVlIHx8IGhhc0FnZ3IgPT09IG51bGwsXG4gICAgICBjYW50SGF2ZUFnZ3IgPSBoYXNBZ2dyID09PSBmYWxzZSB8fCBoYXNBZ2dyID09PSBudWxsO1xuICAgIGlmIChhKSB7XG4gICAgICBpZiAoY2FuSGF2ZUFnZ3IpIHtcbiAgICAgICAgdGZbaV0uYWdncmVnYXRlID0gYTtcbiAgICAgICAgYXNzaWduRmllbGQoaSArIDEsIHRydWUsIGF1dG9Nb2RlKTtcbiAgICAgICAgZGVsZXRlIHRmW2ldLmFnZ3JlZ2F0ZTtcbiAgICAgIH1cbiAgICB9IGVsc2UgeyAvLyBpZihhID09PSB1bmRlZmluZWQpXG4gICAgICBpZiAoY2FudEhhdmVBZ2dyKSB7XG4gICAgICAgIGFzc2lnbkZpZWxkKGkgKyAxLCBmYWxzZSwgYXV0b01vZGUpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGFzc2lnbkJpblEoaSwgaGFzQWdnciwgYXV0b01vZGUpIHtcbiAgICB0ZltpXS5iaW4gPSB0cnVlO1xuICAgIGFzc2lnbkZpZWxkKGkgKyAxLCBoYXNBZ2dyLCBhdXRvTW9kZSk7XG4gICAgZGVsZXRlIHRmW2ldLmJpbjtcbiAgfVxuXG4gIGZ1bmN0aW9uIGFzc2lnblEoaSwgaGFzQWdnciwgYXV0b01vZGUpIHtcbiAgICB2YXIgZiA9IGZpZWxkc1tpXSxcbiAgICAgIGNhbkhhdmVBZ2dyID0gaGFzQWdnciA9PT0gdHJ1ZSB8fCBoYXNBZ2dyID09PSBudWxsO1xuXG4gICAgdGZbaV0gPSB7bmFtZTogZi5uYW1lLCB0eXBlOiBmLnR5cGV9O1xuXG4gICAgaWYgKGYuYWdncmVnYXRlID09PSAnY291bnQnKSB7IC8vIGlmIGNvdW50IGlzIGluY2x1ZGVkIGluIHRoZSBzZWxlY3RlZCBmaWVsZHNcbiAgICAgIGlmIChjYW5IYXZlQWdncikge1xuICAgICAgICB0ZltpXS5hZ2dyZWdhdGUgPSBmLmFnZ3JlZ2F0ZTtcbiAgICAgICAgYXNzaWduRmllbGQoaSArIDEsIHRydWUsIGF1dG9Nb2RlKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGYuX2FnZ3JlZ2F0ZSkge1xuICAgICAgLy8gVE9ETyBzdXBwb3J0IGFycmF5IG9mIGYuX2FnZ3JzIHRvb1xuICAgICAgYXNzaWduQWdnclEoaSwgaGFzQWdnciwgYXV0b01vZGUsIGYuX2FnZ3JlZ2F0ZSk7XG4gICAgfSBlbHNlIGlmIChmLl9yYXcpIHtcbiAgICAgIGFzc2lnbkFnZ3JRKGksIGhhc0FnZ3IsIGF1dG9Nb2RlLCB1bmRlZmluZWQpO1xuICAgIH0gZWxzZSBpZiAoZi5fYmluKSB7XG4gICAgICBhc3NpZ25CaW5RKGksIGhhc0FnZ3IsIGF1dG9Nb2RlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgb3B0LmFnZ3JMaXN0LmZvckVhY2goZnVuY3Rpb24oYSkge1xuICAgICAgICBpZiAoIW9wdC5jb25zaXN0ZW50QXV0b1EgfHwgYXV0b01vZGUgPT09IEFVVE8gfHwgYXV0b01vZGUgPT09IGEpIHtcbiAgICAgICAgICBhc3NpZ25BZ2dyUShpLCBoYXNBZ2dyLCBhIC8qYXNzaWduIGF1dG9Nb2RlKi8sIGEpO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgaWYgKCghb3B0LmNvbnNpc3RlbnRBdXRvUSB8fCB2bC5pc2luKGF1dG9Nb2RlLCBbQVVUTywgJ2JpbicsICdjYXN0JywgJ2F1dG9jYXN0J10pKSAmJiAhaGFzTm9yTykge1xuICAgICAgICB2YXIgaGlnaENhcmRpbmFsaXR5ID0gdmwuZmllbGQuY2FyZGluYWxpdHkoZiwgc3RhdHMpID4gb3B0Lm1pbkNhcmRpbmFsaXR5Rm9yQmluO1xuXG4gICAgICAgIHZhciBpc0F1dG8gPSBvcHQuZ2VuRGltUSA9PT0gJ2F1dG8nLFxuICAgICAgICAgIGdlbkJpbiA9IG9wdC5nZW5EaW1RICA9PT0gJ2JpbicgfHwgKGlzQXV0byAmJiBoaWdoQ2FyZGluYWxpdHkpLFxuICAgICAgICAgIGdlbkNhc3QgPSBvcHQuZ2VuRGltUSA9PT0gJ2Nhc3QnIHx8IChpc0F1dG8gJiYgIWhpZ2hDYXJkaW5hbGl0eSk7XG5cbiAgICAgICAgaWYgKGdlbkJpbiAmJiB2bC5pc2luKGF1dG9Nb2RlLCBbQVVUTywgJ2JpbicsICdhdXRvY2FzdCddKSkge1xuICAgICAgICAgIGFzc2lnbkJpblEoaSwgaGFzQWdnciwgaXNBdXRvID8gJ2F1dG9jYXN0JyA6ICdiaW4nKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZ2VuQ2FzdCAmJiB2bC5pc2luKGF1dG9Nb2RlLCBbQVVUTywgJ2Nhc3QnLCAnYXV0b2Nhc3QnXSkpIHtcbiAgICAgICAgICB0ZltpXS50eXBlID0gJ08nO1xuICAgICAgICAgIGFzc2lnbkZpZWxkKGkgKyAxLCBoYXNBZ2dyLCBpc0F1dG8gPyAnYXV0b2Nhc3QnIDogJ2Nhc3QnKTtcbiAgICAgICAgICB0ZltpXS50eXBlID0gJ1EnO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gYXNzaWduVGltZVVuaXRUKGksIGhhc0FnZ3IsIGF1dG9Nb2RlLCB0aW1lVW5pdCkge1xuICAgIHRmW2ldLnRpbWVVbml0ID0gdGltZVVuaXQ7XG4gICAgYXNzaWduRmllbGQoaSsxLCBoYXNBZ2dyLCBhdXRvTW9kZSk7XG4gICAgZGVsZXRlIHRmW2ldLnRpbWVVbml0O1xuICB9XG5cbiAgZnVuY3Rpb24gYXNzaWduVChpLCBoYXNBZ2dyLCBhdXRvTW9kZSkge1xuICAgIHZhciBmID0gZmllbGRzW2ldO1xuICAgIHRmW2ldID0ge25hbWU6IGYubmFtZSwgdHlwZTogZi50eXBlfTtcblxuICAgIC8vIFRPRE8gc3VwcG9ydCBhcnJheSBvZiBmLl90aW1lVW5pdHNcbiAgICBpZiAoZi5fdGltZVVuaXQpIHtcbiAgICAgIGFzc2lnblRpbWVVbml0VChpLCBoYXNBZ2dyLCBhdXRvTW9kZSwgZi5fdGltZVVuaXQpO1xuICAgIH0gZWxzZSB7XG4gICAgICBvcHQudGltZVVuaXRMaXN0LmZvckVhY2goZnVuY3Rpb24odGltZVVuaXQpIHtcbiAgICAgICAgaWYgKHRpbWVVbml0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBpZiAoIWhhc0FnZ3IpIHsgLy8gY2FuJ3QgYWdncmVnYXRlIG92ZXIgcmF3IHRpbWVcbiAgICAgICAgICAgIGFzc2lnbkZpZWxkKGkrMSwgZmFsc2UsIGF1dG9Nb2RlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgYXNzaWduVGltZVVuaXRUKGksIGhhc0FnZ3IsIGF1dG9Nb2RlLCB0aW1lVW5pdCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIEZJWE1FIHdoYXQgaWYgeW91IGFnZ3JlZ2F0ZSB0aW1lP1xuICB9XG5cbiAgZnVuY3Rpb24gYXNzaWduRmllbGQoaSwgaGFzQWdnciwgYXV0b01vZGUpIHtcbiAgICBpZiAoaSA9PT0gZmllbGRzLmxlbmd0aCkgeyAvLyBJZiBhbGwgZmllbGRzIGFyZSBhc3NpZ25lZFxuICAgICAgY2hlY2tBbmRQdXNoKCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIGYgPSBmaWVsZHNbaV07XG4gICAgLy8gT3RoZXJ3aXNlLCBhc3NpZ24gaS10aCBmaWVsZFxuICAgIHN3aXRjaCAoZi50eXBlKSB7XG4gICAgICAvL1RPRE8gXCJEXCIsIFwiR1wiXG4gICAgICBjYXNlIFE6XG4gICAgICAgIGFzc2lnblEoaSwgaGFzQWdnciwgYXV0b01vZGUpO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSBUOlxuICAgICAgICBhc3NpZ25UKGksIGhhc0FnZ3IsIGF1dG9Nb2RlKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIE86XG4gICAgICAgIC8qIGZhbGxzIHRocm91Z2ggKi9cbiAgICAgIGNhc2UgTjpcbiAgICAgICAgLyogZmFsbHMgdGhyb3VnaCAqL1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGZbaV0gPSBmO1xuICAgICAgICBhc3NpZ25GaWVsZChpICsgMSwgaGFzQWdnciwgYXV0b01vZGUpO1xuICAgICAgICBicmVhaztcbiAgICB9XG4gIH1cblxuICB2YXIgaGFzQWdnciA9IG9wdC50YWJsZVR5cGVzID09PSAnYWdncmVnYXRlZCcgPyB0cnVlIDogb3B0LnRhYmxlVHlwZXMgPT09ICdkaXNhZ2dyZWdhdGVkJyA/IGZhbHNlIDogbnVsbDtcbiAgYXNzaWduRmllbGQoMCwgaGFzQWdnciwgQVVUTyk7XG5cbiAgcmV0dXJuIG91dHB1dDtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHZsID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cudmwgOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLnZsIDogbnVsbCksXG4gIGdlbkVuY3MgPSByZXF1aXJlKCcuL2VuY3MnKSxcbiAgZ2V0TWFya3R5cGVzID0gcmVxdWlyZSgnLi9tYXJrdHlwZXMnKSxcbiAgcmFuayA9IHJlcXVpcmUoJy4uL3JhbmsvcmFuaycpLFxuICBjb25zdHMgPSByZXF1aXJlKCcuLi9jb25zdHMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBnZW5FbmNvZGluZ3NGcm9tRmllbGRzO1xuXG5mdW5jdGlvbiBnZW5FbmNvZGluZ3NGcm9tRmllbGRzKG91dHB1dCwgZmllbGRzLCBzdGF0cywgb3B0LCBuZXN0ZWQpIHtcbiAgb3B0ID0gdmwuc2NoZW1hLnV0aWwuZXh0ZW5kKG9wdHx8e30sIGNvbnN0cy5nZW4uZW5jb2RpbmdzKTtcbiAgdmFyIGVuY3MgPSBnZW5FbmNzKFtdLCBmaWVsZHMsIHN0YXRzLCBvcHQpO1xuXG4gIGlmIChuZXN0ZWQpIHtcbiAgICByZXR1cm4gZW5jcy5yZWR1Y2UoZnVuY3Rpb24oZGljdCwgZW5jKSB7XG4gICAgICBkaWN0W2VuY10gPSBnZW5FbmNvZGluZ3NGcm9tRW5jcyhbXSwgZW5jLCBzdGF0cywgb3B0KTtcbiAgICAgIHJldHVybiBkaWN0O1xuICAgIH0sIHt9KTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZW5jcy5yZWR1Y2UoZnVuY3Rpb24obGlzdCwgZW5jKSB7XG4gICAgICByZXR1cm4gZ2VuRW5jb2RpbmdzRnJvbUVuY3MobGlzdCwgZW5jLCBzdGF0cywgb3B0KTtcbiAgICB9LCBbXSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2VuRW5jb2RpbmdzRnJvbUVuY3Mob3V0cHV0LCBlbmMsIHN0YXRzLCBvcHQpIHtcbiAgZ2V0TWFya3R5cGVzKGVuYywgc3RhdHMsIG9wdClcbiAgICAuZm9yRWFjaChmdW5jdGlvbihtYXJrVHlwZSkge1xuICAgICAgdmFyIGUgPSB2bC5kdXBsaWNhdGUoe1xuICAgICAgICAgIGRhdGE6IG9wdC5kYXRhLFxuICAgICAgICAgIG1hcmt0eXBlOiBtYXJrVHlwZSxcbiAgICAgICAgICBlbmNvZGluZzogZW5jLFxuICAgICAgICAgIGNvbmZpZzogb3B0LmNvbmZpZ1xuICAgICAgICB9KSxcbiAgICAgICAgZW5jb2RpbmcgPSBmaW5hbFRvdWNoKGUsIHN0YXRzLCBvcHQpLFxuICAgICAgICBzY29yZSA9IHJhbmsuZW5jb2RpbmcoZW5jb2RpbmcsIHN0YXRzLCBvcHQpO1xuXG4gICAgICBlbmNvZGluZy5faW5mbyA9IHNjb3JlO1xuICAgICAgb3V0cHV0LnB1c2goZW5jb2RpbmcpO1xuICAgIH0pO1xuICByZXR1cm4gb3V0cHV0O1xufVxuXG4vL0ZJWE1FIHRoaXMgc2hvdWxkIGJlIHJlZmFjdG9yc1xuZnVuY3Rpb24gZmluYWxUb3VjaChlbmNvZGluZywgc3RhdHMsIG9wdCkge1xuICBpZiAoZW5jb2RpbmcubWFya3R5cGUgPT09ICd0ZXh0JyAmJiBvcHQuYWx3YXlzR2VuZXJhdGVUYWJsZUFzSGVhdG1hcCkge1xuICAgIGVuY29kaW5nLmVuY29kaW5nLmNvbG9yID0gZW5jb2RpbmcuZW5jb2RpbmcudGV4dDtcbiAgfVxuXG4gIC8vIGRvbid0IGluY2x1ZGUgemVybyBpZiBzdGRldi9hdmcgPCAwLjAxXG4gIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS91d2RhdGEvdmlzcmVjL2lzc3Vlcy82OVxuICB2YXIgZW5jID0gZW5jb2RpbmcuZW5jb2Rpbmc7XG4gIFsneCcsICd5J10uZm9yRWFjaChmdW5jdGlvbihldCkge1xuICAgIHZhciBmaWVsZCA9IGVuY1tldF07XG4gICAgaWYgKGZpZWxkICYmIHZsLmZpZWxkLmlzTWVhc3VyZShmaWVsZCkgJiYgIXZsLmZpZWxkLmlzQ291bnQoZmllbGQpKSB7XG4gICAgICB2YXIgc3RhdCA9IHN0YXRzW2ZpZWxkLm5hbWVdO1xuICAgICAgaWYgKHN0YXQgJiYgc3RhdC5zdGRldiAvIHN0YXQuYXZnIDwgMC4wMSkge1xuICAgICAgICBmaWVsZC5zY2FsZSA9IHt6ZXJvOiBmYWxzZX07XG4gICAgICB9XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIGVuY29kaW5nO1xufSIsIlwidXNlIHN0cmljdFwiO1xucmVxdWlyZSgnLi4vZ2xvYmFscycpO1xuXG52YXIgdmwgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdy52bCA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwudmwgOiBudWxsKSxcbiAgY29uc3RzID0gcmVxdWlyZSgnLi4vY29uc3RzJyksXG4gIGdlbk1hcmtUeXBlcyA9IHJlcXVpcmUoJy4vbWFya3R5cGVzJyksXG4gIGlzRGltZW5zaW9uID0gdmwuZmllbGQuaXNEaW1lbnNpb24sXG4gIGlzTWVhc3VyZSA9IHZsLmZpZWxkLmlzTWVhc3VyZTtcblxubW9kdWxlLmV4cG9ydHMgPSBnZW5FbmNzO1xuXG4vLyBGSVhNRSByZW1vdmUgZGltZW5zaW9uLCBtZWFzdXJlIGFuZCB1c2UgaW5mb3JtYXRpb24gaW4gdmVnYS1saXRlIGluc3RlYWQhXG52YXIgcnVsZXMgPSB7XG4gIHg6IHtcbiAgICBkaW1lbnNpb246IHRydWUsXG4gICAgbWVhc3VyZTogdHJ1ZSxcbiAgICBtdWx0aXBsZTogdHJ1ZSAvL0ZJWE1FIHNob3VsZCBhbGxvdyBtdWx0aXBsZSBvbmx5IGZvciBRLCBUXG4gIH0sXG4gIHk6IHtcbiAgICBkaW1lbnNpb246IHRydWUsXG4gICAgbWVhc3VyZTogdHJ1ZSxcbiAgICBtdWx0aXBsZTogdHJ1ZSAvL0ZJWE1FIHNob3VsZCBhbGxvdyBtdWx0aXBsZSBvbmx5IGZvciBRLCBUXG4gIH0sXG4gIHJvdzoge1xuICAgIGRpbWVuc2lvbjogdHJ1ZSxcbiAgICBtdWx0aXBsZTogdHJ1ZVxuICB9LFxuICBjb2w6IHtcbiAgICBkaW1lbnNpb246IHRydWUsXG4gICAgbXVsdGlwbGU6IHRydWVcbiAgfSxcbiAgc2hhcGU6IHtcbiAgICBkaW1lbnNpb246IHRydWUsXG4gICAgcnVsZXM6IHNoYXBlUnVsZXNcbiAgfSxcbiAgc2l6ZToge1xuICAgIG1lYXN1cmU6IHRydWUsXG4gICAgcnVsZXM6IHJldGluYWxFbmNSdWxlc1xuICB9LFxuICBjb2xvcjoge1xuICAgIGRpbWVuc2lvbjogdHJ1ZSxcbiAgICBtZWFzdXJlOiB0cnVlLFxuICAgIHJ1bGVzOiBjb2xvclJ1bGVzXG4gIH0sXG4gIGFscGhhOiB7XG4gICAgbWVhc3VyZTogdHJ1ZSxcbiAgICBydWxlczogcmV0aW5hbEVuY1J1bGVzXG4gIH0sXG4gIHRleHQ6IHtcbiAgICBtZWFzdXJlOiB0cnVlXG4gIH0sXG4gIGRldGFpbDoge1xuICAgIGRpbWVuc2lvbjogdHJ1ZVxuICB9XG4gIC8vZ2VvOiB7XG4gIC8vICBnZW86IHRydWVcbiAgLy99LFxuICAvL2FyYzogeyAvLyBwaWVcbiAgLy9cbiAgLy99XG59O1xuXG5mdW5jdGlvbiByZXRpbmFsRW5jUnVsZXMoZW5jLCBmaWVsZCwgc3RhdHMsIG9wdCkge1xuICBpZiAob3B0Lm9taXRNdWx0aXBsZVJldGluYWxFbmNvZGluZ3MpIHtcbiAgICBpZiAoZW5jLmNvbG9yIHx8IGVuYy5zaXplIHx8IGVuYy5zaGFwZSB8fCBlbmMuYWxwaGEpIHJldHVybiBmYWxzZTtcbiAgfVxuICByZXR1cm4gdHJ1ZTtcbn1cblxuZnVuY3Rpb24gY29sb3JSdWxlcyhlbmMsIGZpZWxkLCBzdGF0cywgb3B0KSB7XG4gIGlmKCFyZXRpbmFsRW5jUnVsZXMoZW5jLCBmaWVsZCwgc3RhdHMsIG9wdCkpIHJldHVybiBmYWxzZTtcblxuICByZXR1cm4gdmwuZmllbGQuaXNNZWFzdXJlKGZpZWxkKSB8fFxuICAgIHZsLmZpZWxkLmNhcmRpbmFsaXR5KGZpZWxkLCBzdGF0cykgPD0gb3B0Lm1heENhcmRpbmFsaXR5Rm9yQ29sb3I7XG59XG5cbmZ1bmN0aW9uIHNoYXBlUnVsZXMoZW5jLCBmaWVsZCwgc3RhdHMsIG9wdCkge1xuICBpZighcmV0aW5hbEVuY1J1bGVzKGVuYywgZmllbGQsIHN0YXRzLCBvcHQpKSByZXR1cm4gZmFsc2U7XG5cbiAgaWYgKGZpZWxkLmJpbiAmJiBmaWVsZC50eXBlID09PSBRKSByZXR1cm4gZmFsc2U7XG4gIGlmIChmaWVsZC50aW1lVW5pdCAmJiBmaWVsZC50eXBlID09PSBUKSByZXR1cm4gZmFsc2U7XG4gIHJldHVybiB2bC5maWVsZC5jYXJkaW5hbGl0eShmaWVsZCwgc3RhdHMpIDw9IG9wdC5tYXhDYXJkaW5hbGl0eUZvckNvbG9yO1xufVxuXG5mdW5jdGlvbiBkaW1NZWFUcmFuc3Bvc2VSdWxlKGVuYykge1xuICAvLyBjcmVhdGUgaG9yaXpvbnRhbCBoaXN0b2dyYW0gZm9yIG9yZGluYWxcbiAgaWYgKHZsLmZpZWxkLmlzVHlwZXMoZW5jLnksIFtOLCBPXSkgJiYgaXNNZWFzdXJlKGVuYy54KSkgcmV0dXJuIHRydWU7XG5cbiAgLy8gdmVydGljYWwgaGlzdG9ncmFtIGZvciBRIGFuZCBUXG4gIGlmIChpc01lYXN1cmUoZW5jLnkpICYmICghdmwuZmllbGQuaXNUeXBlcyhlbmMueCwgW04sIE9dKSAmJiBpc0RpbWVuc2lvbihlbmMueCkpKSByZXR1cm4gdHJ1ZTtcblxuICByZXR1cm4gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIGdlbmVyYWxSdWxlcyhlbmMsIHN0YXRzLCBvcHQpIHtcbiAgLy8gZW5jLnRleHQgaXMgb25seSB1c2VkIGZvciBURVhUIFRBQkxFXG4gIGlmIChlbmMudGV4dCkge1xuICAgIHJldHVybiBnZW5NYXJrVHlwZXMuc2F0aXNmeVJ1bGVzKGVuYywgVEVYVCwgc3RhdHMsIG9wdCk7XG4gIH1cblxuICAvLyBDQVJURVNJQU4gUExPVCBPUiBNQVBcbiAgaWYgKGVuYy54IHx8IGVuYy55IHx8IGVuYy5nZW8gfHwgZW5jLmFyYykge1xuXG4gICAgaWYgKGVuYy5yb3cgfHwgZW5jLmNvbCkgeyAvL2hhdmUgZmFjZXQocylcblxuICAgICAgLy8gZG9uJ3QgdXNlIGZhY2V0cyBiZWZvcmUgZmlsbGluZyB1cCB4LHlcbiAgICAgIGlmICghZW5jLnggfHwgIWVuYy55KSByZXR1cm4gZmFsc2U7XG5cbiAgICAgIGlmIChvcHQub21pdE5vblRleHRBZ2dyV2l0aEFsbERpbXNPbkZhY2V0cykge1xuICAgICAgICAvLyByZW1vdmUgYWxsIGFnZ3JlZ2F0ZWQgY2hhcnRzIHdpdGggYWxsIGRpbXMgb24gZmFjZXRzIChyb3csIGNvbClcbiAgICAgICAgaWYgKGdlbkVuY3MuaXNBZ2dyV2l0aEFsbERpbU9uRmFjZXRzKGVuYykpIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoZW5jLnggJiYgZW5jLnkpIHtcbiAgICAgIHZhciBpc0RpbVggPSAhIWlzRGltZW5zaW9uKGVuYy54KSxcbiAgICAgICAgaXNEaW1ZID0gISFpc0RpbWVuc2lvbihlbmMueSk7XG5cbiAgICAgIGlmIChpc0RpbVggJiYgaXNEaW1ZICYmICF2bC5lbmMuaXNBZ2dyZWdhdGUoZW5jKSkge1xuICAgICAgICAvLyBGSVhNRSBhY3R1YWxseSBjaGVjayBpZiB0aGVyZSB3b3VsZCBiZSBvY2NsdXNpb24gIzkwXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgaWYgKG9wdC5vbWl0VHJhbnBvc2UpIHtcbiAgICAgICAgaWYgKGlzRGltWCBeIGlzRGltWSkgeyAvLyBkaW0geCBtZWFcbiAgICAgICAgICBpZiAoIWRpbU1lYVRyYW5zcG9zZVJ1bGUoZW5jKSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9IGVsc2UgaWYgKGVuYy55LnR5cGU9PT1UIHx8IGVuYy54LnR5cGUgPT09IFQpIHtcbiAgICAgICAgICBpZiAoZW5jLnkudHlwZT09PVQgJiYgZW5jLngudHlwZSAhPT0gVCkgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9IGVsc2UgeyAvLyBzaG93IG9ubHkgb25lIE94TywgUXhRXG4gICAgICAgICAgaWYgKGVuYy54Lm5hbWUgPiBlbmMueS5uYW1lKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIC8vIERPVCBQTE9UU1xuICAgIC8vIC8vIHBsb3Qgd2l0aCBvbmUgYXhpcyA9IGRvdCBwbG90XG4gICAgaWYgKG9wdC5vbWl0RG90UGxvdCkgcmV0dXJuIGZhbHNlO1xuXG4gICAgLy8gRG90IHBsb3Qgc2hvdWxkIGFsd2F5cyBiZSBob3Jpem9udGFsXG4gICAgaWYgKG9wdC5vbWl0VHJhbnBvc2UgJiYgZW5jLnkpIHJldHVybiBmYWxzZTtcblxuICAgIC8vIGRvdCBwbG90IHNob3VsZG4ndCBoYXZlIG90aGVyIGVuY29kaW5nXG4gICAgaWYgKG9wdC5vbWl0RG90UGxvdFdpdGhFeHRyYUVuY29kaW5nICYmIHZsLmtleXMoZW5jKS5sZW5ndGggPiAxKSByZXR1cm4gZmFsc2U7XG5cbiAgICAvLyBvbmUgZGltZW5zaW9uIFwiY291bnRcIiBpcyB1c2VsZXNzXG4gICAgaWYgKGVuYy54ICYmIGVuYy54LmFnZ3JlZ2F0ZSA9PSAnY291bnQnICYmICFlbmMueSkgcmV0dXJuIGZhbHNlO1xuICAgIGlmIChlbmMueSAmJiBlbmMueS5hZ2dyZWdhdGUgPT0gJ2NvdW50JyAmJiAhZW5jLngpIHJldHVybiBmYWxzZTtcblxuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuZ2VuRW5jcy5pc0FnZ3JXaXRoQWxsRGltT25GYWNldHMgPSBmdW5jdGlvbiAoZW5jKSB7XG4gIHZhciBoYXNBZ2dyID0gZmFsc2UsIGhhc090aGVyTyA9IGZhbHNlO1xuICBmb3IgKHZhciBlbmNUeXBlIGluIGVuYykge1xuICAgIHZhciBmaWVsZCA9IGVuY1tlbmNUeXBlXTtcbiAgICBpZiAoZmllbGQuYWdncmVnYXRlKSB7XG4gICAgICBoYXNBZ2dyID0gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKHZsLmZpZWxkLmlzRGltZW5zaW9uKGZpZWxkKSAmJiAoZW5jVHlwZSAhPT0gUk9XICYmIGVuY1R5cGUgIT09IENPTCkpIHtcbiAgICAgIGhhc090aGVyTyA9IHRydWU7XG4gICAgfVxuICAgIGlmIChoYXNBZ2dyICYmIGhhc090aGVyTykgYnJlYWs7XG4gIH1cblxuICByZXR1cm4gaGFzQWdnciAmJiAhaGFzT3RoZXJPO1xufTtcblxuXG5mdW5jdGlvbiBnZW5FbmNzKGVuY3MsIGZpZWxkcywgc3RhdHMsIG9wdCkge1xuICBvcHQgPSB2bC5zY2hlbWEudXRpbC5leHRlbmQob3B0fHx7fSwgY29uc3RzLmdlbi5lbmNvZGluZ3MpO1xuICAvLyBnZW5lcmF0ZSBhIGNvbGxlY3Rpb24gdmVnYS1saXRlJ3MgZW5jXG4gIHZhciB0bXBFbmMgPSB7fTtcblxuICBmdW5jdGlvbiBhc3NpZ25GaWVsZChpKSB7XG4gICAgLy8gSWYgYWxsIGZpZWxkcyBhcmUgYXNzaWduZWQsIHNhdmVcbiAgICBpZiAoaSA9PT0gZmllbGRzLmxlbmd0aCkge1xuICAgICAgLy8gYXQgdGhlIG1pbmltYWwgYWxsIGNoYXJ0IHNob3VsZCBoYXZlIHgsIHksIGdlbywgdGV4dCBvciBhcmNcbiAgICAgIGlmIChnZW5lcmFsUnVsZXModG1wRW5jLCBzdGF0cywgb3B0KSkge1xuICAgICAgICBlbmNzLnB1c2godmwuZHVwbGljYXRlKHRtcEVuYykpO1xuICAgICAgfVxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIE90aGVyd2lzZSwgYXNzaWduIGktdGggZmllbGRcbiAgICB2YXIgZmllbGQgPSBmaWVsZHNbaV07XG4gICAgZm9yICh2YXIgaiBpbiBvcHQuZW5jb2RpbmdUeXBlTGlzdCkge1xuICAgICAgdmFyIGV0ID0gb3B0LmVuY29kaW5nVHlwZUxpc3Rbal0sXG4gICAgICAgIGlzRGltID0gaXNEaW1lbnNpb24oZmllbGQpO1xuXG4gICAgICAvL1RPRE86IHN1cHBvcnQgXCJtdWx0aXBsZVwiIGFzc2lnbm1lbnRcbiAgICAgIGlmICghKGV0IGluIHRtcEVuYykgJiYgLy8gZW5jb2Rpbmcgbm90IHVzZWRcbiAgICAgICAgKChpc0RpbSAmJiBydWxlc1tldF0uZGltZW5zaW9uKSB8fCAoIWlzRGltICYmIHJ1bGVzW2V0XS5tZWFzdXJlKSkgJiZcbiAgICAgICAgKCFydWxlc1tldF0ucnVsZXMgfHwgcnVsZXNbZXRdLnJ1bGVzKHRtcEVuYywgZmllbGQsIHN0YXRzLCBvcHQpKVxuICAgICAgKSB7XG4gICAgICAgIHRtcEVuY1tldF0gPSBmaWVsZDtcbiAgICAgICAgYXNzaWduRmllbGQoaSArIDEpO1xuICAgICAgICBkZWxldGUgdG1wRW5jW2V0XTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBhc3NpZ25GaWVsZCgwKTtcblxuICByZXR1cm4gZW5jcztcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWwgPSByZXF1aXJlKCcuLi91dGlsJyk7XG5cbnZhciBnZW4gPSBtb2R1bGUuZXhwb3J0cyA9IHtcbiAgLy8gZGF0YSB2YXJpYXRpb25zXG4gIGFnZ3JlZ2F0ZXM6IHJlcXVpcmUoJy4vYWdncmVnYXRlcycpLFxuICBwcm9qZWN0aW9uczogcmVxdWlyZSgnLi9wcm9qZWN0aW9ucycpLFxuICAvLyBlbmNvZGluZ3MgLyB2aXN1YWwgdmFyaWF0b25zXG4gIGVuY29kaW5nczogcmVxdWlyZSgnLi9lbmNvZGluZ3MnKSxcbiAgZW5jczogcmVxdWlyZSgnLi9lbmNzJyksXG4gIG1hcmt0eXBlczogcmVxdWlyZSgnLi9tYXJrdHlwZXMnKVxufTtcblxuZ2VuLmNoYXJ0cyA9IGZ1bmN0aW9uKGZpZWxkcywgb3B0LCBjZmcsIGZsYXQpIHtcbiAgb3B0ID0gdXRpbC5nZW4uZ2V0T3B0KG9wdCk7XG4gIGZsYXQgPSBmbGF0ID09PSB1bmRlZmluZWQgPyB7ZW5jb2RpbmdzOiAxfSA6IGZsYXQ7XG5cbiAgLy8gVE9ETyBnZW5lcmF0ZVxuXG4gIC8vIGdlbmVyYXRlIHBlcm11dGF0aW9uIG9mIGVuY29kaW5nIG1hcHBpbmdzXG4gIHZhciBmaWVsZFNldHMgPSBvcHQuZ2VuQWdnciA/IGdlbi5hZ2dyZWdhdGVzKFtdLCBmaWVsZHMsIG9wdCkgOiBbZmllbGRzXSxcbiAgICBlbmNzLCBjaGFydHMsIGxldmVsID0gMDtcblxuICBpZiAoZmxhdCA9PT0gdHJ1ZSB8fCAoZmxhdCAmJiBmbGF0LmFnZ3JlZ2F0ZSkpIHtcbiAgICBlbmNzID0gZmllbGRTZXRzLnJlZHVjZShmdW5jdGlvbihvdXRwdXQsIGZpZWxkcykge1xuICAgICAgcmV0dXJuIGdlbi5lbmNzKG91dHB1dCwgZmllbGRzLCBvcHQpO1xuICAgIH0sIFtdKTtcbiAgfSBlbHNlIHtcbiAgICBlbmNzID0gZmllbGRTZXRzLm1hcChmdW5jdGlvbihmaWVsZHMpIHtcbiAgICAgIHJldHVybiBnZW4uZW5jcyhbXSwgZmllbGRzLCBvcHQpO1xuICAgIH0sIHRydWUpO1xuICAgIGxldmVsICs9IDE7XG4gIH1cblxuICBpZiAoZmxhdCA9PT0gdHJ1ZSB8fCAoZmxhdCAmJiBmbGF0LmVuY29kaW5ncykpIHtcbiAgICBjaGFydHMgPSB1dGlsLm5lc3RlZFJlZHVjZShlbmNzLCBmdW5jdGlvbihvdXRwdXQsIGVuYykge1xuICAgICAgcmV0dXJuIGdlbi5tYXJrdHlwZXMob3V0cHV0LCBlbmMsIG9wdCwgY2ZnKTtcbiAgICB9LCBsZXZlbCwgdHJ1ZSk7XG4gIH0gZWxzZSB7XG4gICAgY2hhcnRzID0gdXRpbC5uZXN0ZWRNYXAoZW5jcywgZnVuY3Rpb24oZW5jKSB7XG4gICAgICByZXR1cm4gZ2VuLm1hcmt0eXBlcyhbXSwgZW5jLCBvcHQsIGNmZyk7XG4gICAgfSwgbGV2ZWwsIHRydWUpO1xuICAgIGxldmVsICs9IDE7XG4gIH1cbiAgcmV0dXJuIGNoYXJ0cztcbn07IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciB2bCA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93LnZsIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbC52bCA6IG51bGwpLFxuICBjb25zdHMgPSByZXF1aXJlKCcuLi9jb25zdHMnKSxcbiAgaXNEaW1lbnNpb24gPSB2bC5maWVsZC5pc0RpbWVuc2lvbixcbiAgaXNPcmRpbmFsU2NhbGUgPSB2bC5maWVsZC5pc09yZGluYWxTY2FsZTtcblxudmFyIHZsbWFya3R5cGVzID0gbW9kdWxlLmV4cG9ydHMgPSBnZXRNYXJrdHlwZXM7XG5cbnZhciBtYXJrc1J1bGUgPSB2bG1hcmt0eXBlcy5ydWxlID0ge1xuICBwb2ludDogIHBvaW50UnVsZSxcbiAgYmFyOiAgICBiYXJSdWxlLFxuICBsaW5lOiAgIGxpbmVSdWxlLFxuICBhcmVhOiAgIGFyZWFSdWxlLCAvLyBhcmVhIGlzIHNpbWlsYXIgdG8gbGluZVxuICB0ZXh0OiAgIHRleHRSdWxlLFxuICB0aWNrOiAgIHRpY2tSdWxlXG59O1xuXG5mdW5jdGlvbiBnZXRNYXJrdHlwZXMoZW5jLCBzdGF0cywgb3B0KSB7XG4gIG9wdCA9IHZsLnNjaGVtYS51dGlsLmV4dGVuZChvcHR8fHt9LCBjb25zdHMuZ2VuLmVuY29kaW5ncyk7XG5cbiAgdmFyIG1hcmtUeXBlcyA9IG9wdC5tYXJrdHlwZUxpc3QuZmlsdGVyKGZ1bmN0aW9uKG1hcmtUeXBlKXtcbiAgICByZXR1cm4gdmxtYXJrdHlwZXMuc2F0aXNmeVJ1bGVzKGVuYywgbWFya1R5cGUsIHN0YXRzLCBvcHQpO1xuICB9KTtcblxuICByZXR1cm4gbWFya1R5cGVzO1xufVxuXG52bG1hcmt0eXBlcy5zYXRpc2Z5UnVsZXMgPSBmdW5jdGlvbiAoZW5jLCBtYXJrVHlwZSwgc3RhdHMsIG9wdCkge1xuICB2YXIgbWFyayA9IHZsLmNvbXBpbGVyLm1hcmtzW21hcmtUeXBlXSxcbiAgICByZXFzID0gbWFyay5yZXF1aXJlZEVuY29kaW5nLFxuICAgIHN1cHBvcnQgPSBtYXJrLnN1cHBvcnRlZEVuY29kaW5nO1xuXG4gIGZvciAodmFyIGkgaW4gcmVxcykgeyAvLyBhbGwgcmVxdWlyZWQgZW5jb2RpbmdzIGluIGVuY1xuICAgIGlmICghKHJlcXNbaV0gaW4gZW5jKSkgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgZm9yICh2YXIgZW5jVHlwZSBpbiBlbmMpIHsgLy8gYWxsIGVuY29kaW5ncyBpbiBlbmMgYXJlIHN1cHBvcnRlZFxuICAgIGlmICghc3VwcG9ydFtlbmNUeXBlXSkgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgcmV0dXJuICFtYXJrc1J1bGVbbWFya1R5cGVdIHx8IG1hcmtzUnVsZVttYXJrVHlwZV0oZW5jLCBzdGF0cywgb3B0KTtcbn07XG5cbmZ1bmN0aW9uIGZhY2V0UnVsZShmaWVsZCwgc3RhdHMsIG9wdCkge1xuICByZXR1cm4gdmwuZmllbGQuY2FyZGluYWxpdHkoZmllbGQsIHN0YXRzKSA8PSBvcHQubWF4Q2FyZGluYWxpdHlGb3JGYWNldHM7XG59XG5cbmZ1bmN0aW9uIGZhY2V0c1J1bGUoZW5jLCBzdGF0cywgb3B0KSB7XG4gIGlmKGVuYy5yb3cgJiYgIWZhY2V0UnVsZShlbmMucm93LCBzdGF0cywgb3B0KSkgcmV0dXJuIGZhbHNlO1xuICBpZihlbmMuY29sICYmICFmYWNldFJ1bGUoZW5jLmNvbCwgc3RhdHMsIG9wdCkpIHJldHVybiBmYWxzZTtcbiAgcmV0dXJuIHRydWU7XG59XG5cbmZ1bmN0aW9uIHBvaW50UnVsZShlbmMsIHN0YXRzLCBvcHQpIHtcbiAgaWYoIWZhY2V0c1J1bGUoZW5jLCBzdGF0cywgb3B0KSkgcmV0dXJuIGZhbHNlO1xuICBpZiAoZW5jLnggJiYgZW5jLnkpIHtcbiAgICAvLyBoYXZlIGJvdGggeCAmIHkgPT0+IHNjYXR0ZXIgcGxvdCAvIGJ1YmJsZSBwbG90XG5cbiAgICB2YXIgeElzRGltID0gaXNEaW1lbnNpb24oZW5jLngpLFxuICAgICAgeUlzRGltID0gaXNEaW1lbnNpb24oZW5jLnkpO1xuXG4gICAgLy8gRm9yIE94T1xuICAgIGlmICh4SXNEaW0gJiYgeUlzRGltKSB7XG4gICAgICAvLyBzaGFwZSBkb2Vzbid0IHdvcmsgd2l0aCBib3RoIHgsIHkgYXMgb3JkaW5hbFxuICAgICAgaWYgKGVuYy5zaGFwZSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG5cbiAgICAgIC8vIFRPRE8oa2FuaXR3KTogY2hlY2sgdGhhdCB0aGVyZSBpcyBxdWFudCBhdCBsZWFzdCAuLi5cbiAgICAgIGlmIChlbmMuY29sb3IgJiYgaXNEaW1lbnNpb24oZW5jLmNvbG9yKSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuXG4gIH0gZWxzZSB7IC8vIHBsb3Qgd2l0aCBvbmUgYXhpcyA9IGRvdCBwbG90XG4gICAgaWYgKG9wdC5vbWl0RG90UGxvdCkgcmV0dXJuIGZhbHNlO1xuXG4gICAgLy8gRG90IHBsb3Qgc2hvdWxkIGFsd2F5cyBiZSBob3Jpem9udGFsXG4gICAgaWYgKG9wdC5vbWl0VHJhbnBvc2UgJiYgZW5jLnkpIHJldHVybiBmYWxzZTtcblxuICAgIC8vIGRvdCBwbG90IHNob3VsZG4ndCBoYXZlIG90aGVyIGVuY29kaW5nXG4gICAgaWYgKG9wdC5vbWl0RG90UGxvdFdpdGhFeHRyYUVuY29kaW5nICYmIHZsLmtleXMoZW5jKS5sZW5ndGggPiAxKSByZXR1cm4gZmFsc2U7XG5cbiAgICAvLyBkb3QgcGxvdCB3aXRoIHNoYXBlIGlzIG5vbi1zZW5zZVxuICAgIGlmIChlbmMuc2hhcGUpIHJldHVybiBmYWxzZTtcbiAgfVxuICByZXR1cm4gdHJ1ZTtcbn1cblxuZnVuY3Rpb24gdGlja1J1bGUoZW5jLCBzdGF0cywgb3B0KSB7XG4gIC8vIGpzaGludCB1bnVzZWQ6ZmFsc2VcbiAgaWYgKGVuYy54IHx8IGVuYy55KSB7XG4gICAgaWYodmwuZW5jLmlzQWdncmVnYXRlKGVuYykpIHJldHVybiBmYWxzZTtcblxuICAgIHZhciB4SXNEaW0gPSBpc0RpbWVuc2lvbihlbmMueCksXG4gICAgICB5SXNEaW0gPSBpc0RpbWVuc2lvbihlbmMueSk7XG5cbiAgICByZXR1cm4gKCF4SXNEaW0gJiYgKCFlbmMueSB8fCBpc09yZGluYWxTY2FsZShlbmMueSkpKSB8fFxuICAgICAgKCF5SXNEaW0gJiYgKCFlbmMueCB8fCBpc09yZGluYWxTY2FsZShlbmMueCkpKTtcbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIGJhclJ1bGUoZW5jLCBzdGF0cywgb3B0KSB7XG4gIGlmKCFmYWNldHNSdWxlKGVuYywgc3RhdHMsIG9wdCkpIHJldHVybiBmYWxzZTtcblxuICAvLyBuZWVkIHRvIGFnZ3JlZ2F0ZSBvbiBlaXRoZXIgeCBvciB5XG4gIGlmIChvcHQub21pdFNpemVPbkJhciAmJiBlbmMuc2l6ZSAhPT0gdW5kZWZpbmVkKSByZXR1cm4gZmFsc2U7XG5cbiAgLy8gRklYTUUgYWN0dWFsbHkgY2hlY2sgaWYgdGhlcmUgd291bGQgYmUgb2NjbHVzaW9uICM5MFxuICBpZiAoKChlbmMueC5hZ2dyZWdhdGUgIT09IHVuZGVmaW5lZCkgXiAoZW5jLnkuYWdncmVnYXRlICE9PSB1bmRlZmluZWQpKSAmJlxuICAgICAgKGlzRGltZW5zaW9uKGVuYy54KSBeIGlzRGltZW5zaW9uKGVuYy55KSkpIHtcblxuICAgIHZhciBhZ2dyZWdhdGUgPSBlbmMueC5hZ2dyZWdhdGUgfHwgZW5jLnkuYWdncmVnYXRlO1xuICAgIHJldHVybiAhKG9wdC5vbWl0U3RhY2tlZEF2ZXJhZ2UgJiYgYWdncmVnYXRlID09PSdhdmcnICYmIGVuYy5jb2xvcik7XG4gIH1cblxuICByZXR1cm4gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIGxpbmVSdWxlKGVuYywgc3RhdHMsIG9wdCkge1xuICBpZighZmFjZXRzUnVsZShlbmMsIHN0YXRzLCBvcHQpKSByZXR1cm4gZmFsc2U7XG5cbiAgLy8gVE9ETyhrYW5pdHcpOiBhZGQgb21pdFZlcnRpY2FsTGluZSBhcyBjb25maWdcblxuICAvLyBGSVhNRSB0cnVseSBvcmRpbmFsIGRhdGEgaXMgZmluZSBoZXJlIHRvby5cbiAgLy8gTGluZSBjaGFydCBzaG91bGQgYmUgb25seSBob3Jpem9udGFsXG4gIC8vIGFuZCB1c2Ugb25seSB0ZW1wb3JhbCBkYXRhXG4gIHJldHVybiBlbmMueC50eXBlID09ICdUJyAmJiBlbmMueC50aW1lVW5pdCAmJiBlbmMueS50eXBlID09ICdRJyAmJiBlbmMueS5hZ2dyZWdhdGU7XG59XG5cbmZ1bmN0aW9uIGFyZWFSdWxlKGVuYywgc3RhdHMsIG9wdCkge1xuICBpZighZmFjZXRzUnVsZShlbmMsIHN0YXRzLCBvcHQpKSByZXR1cm4gZmFsc2U7XG5cbiAgaWYoIWxpbmVSdWxlKGVuYywgc3RhdHMsIG9wdCkpIHJldHVybiBmYWxzZTtcblxuICByZXR1cm4gIShvcHQub21pdFN0YWNrZWRBdmVyYWdlICYmIGVuYy55LmFnZ3JlZ2F0ZSA9PT0nYXZnJyAmJiBlbmMuY29sb3IpO1xufVxuXG5mdW5jdGlvbiB0ZXh0UnVsZShlbmMsIHN0YXRzLCBvcHQpIHtcbiAgLy8gYXQgbGVhc3QgbXVzdCBoYXZlIHJvdyBvciBjb2wgYW5kIGFnZ3JlZ2F0ZWQgdGV4dCB2YWx1ZXNcbiAgcmV0dXJuIChlbmMucm93IHx8IGVuYy5jb2wpICYmIGVuYy50ZXh0ICYmIGVuYy50ZXh0LmFnZ3JlZ2F0ZSAmJiAhZW5jLnggJiYgIWVuYy55ICYmICFlbmMuc2l6ZSAmJlxuICAgICghb3B0LmFsd2F5c0dlbmVyYXRlVGFibGVBc0hlYXRtYXAgfHwgIWVuYy5jb2xvcik7XG59IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgdXRpbCA9IHJlcXVpcmUoJy4uL3V0aWwnKSxcbiAgY29uc3RzID0gcmVxdWlyZSgnLi4vY29uc3RzJyksXG4gIHZsID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cudmwgOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLnZsIDogbnVsbCksXG4gIGlzRGltZW5zaW9uID0gdmwuZmllbGQuaXNEaW1lbnNpb247XG5cbm1vZHVsZS5leHBvcnRzID0gcHJvamVjdGlvbnM7XG5cbi8vIFRPRE8gc3VwcG9ydCBvdGhlciBtb2RlIG9mIHByb2plY3Rpb25zIGdlbmVyYXRpb25cbi8vIHBvd2Vyc2V0LCBjaG9vc2VLLCBjaG9vc2VLb3JMZXNzIGFyZSBhbHJlYWR5IGluY2x1ZGVkIGluIHRoZSB1dGlsXG5cbi8qKlxuICogZmllbGRzXG4gKiBAcGFyYW0gIHtbdHlwZV19IGZpZWxkcyBhcnJheSBvZiBmaWVsZHMgYW5kIHF1ZXJ5IGluZm9ybWF0aW9uXG4gKiBAcmV0dXJuIHtbdHlwZV19ICAgICAgICBbZGVzY3JpcHRpb25dXG4gKi9cbmZ1bmN0aW9uIHByb2plY3Rpb25zKGZpZWxkcywgc3RhdHMsIG9wdCkge1xuICBvcHQgPSB2bC5zY2hlbWEudXRpbC5leHRlbmQob3B0fHx7fSwgY29uc3RzLmdlbi5wcm9qZWN0aW9ucyk7XG5cbiAgLy8gRmlyc3QgY2F0ZWdvcml6ZSBmaWVsZCwgc2VsZWN0ZWQsIGZpZWxkc1RvQWRkLCBhbmQgc2F2ZSBpbmRpY2VzXG4gIHZhciBzZWxlY3RlZCA9IFtdLCBmaWVsZHNUb0FkZCA9IFtdLCBmaWVsZFNldHMgPSBbXSxcbiAgICBoYXNTZWxlY3RlZERpbWVuc2lvbiA9IGZhbHNlLFxuICAgIGhhc1NlbGVjdGVkTWVhc3VyZSA9IGZhbHNlLFxuICAgIGluZGljZXMgPSB7fTtcblxuICBmaWVsZHMuZm9yRWFjaChmdW5jdGlvbihmaWVsZCwgaW5kZXgpe1xuICAgIC8vc2F2ZSBpbmRpY2VzIGZvciBzdGFibGUgc29ydCBsYXRlclxuICAgIGluZGljZXNbZmllbGQubmFtZV0gPSBpbmRleDtcblxuICAgIGlmIChmaWVsZC5zZWxlY3RlZCkge1xuICAgICAgc2VsZWN0ZWQucHVzaChmaWVsZCk7XG4gICAgICBpZiAoaXNEaW1lbnNpb24oZmllbGQpIHx8IGZpZWxkLnR5cGUgPT09J1QnKSB7IC8vIEZJWE1FIC8gSEFDS1xuICAgICAgICBoYXNTZWxlY3RlZERpbWVuc2lvbiA9IHRydWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBoYXNTZWxlY3RlZE1lYXN1cmUgPSB0cnVlO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoZmllbGQuc2VsZWN0ZWQgIT09IGZhbHNlICYmICF2bC5maWVsZC5pc0NvdW50KGZpZWxkKSkge1xuICAgICAgaWYgKHZsLmZpZWxkLmlzRGltZW5zaW9uKGZpZWxkKSAmJlxuICAgICAgICAgICFvcHQubWF4Q2FyZGluYWxpdHlGb3JBdXRvQWRkT3JkaW5hbCAmJlxuICAgICAgICAgIHZsLmZpZWxkLmNhcmRpbmFsaXR5KGZpZWxkLCBzdGF0cywgMTUpID4gb3B0Lm1heENhcmRpbmFsaXR5Rm9yQXV0b0FkZE9yZGluYWxcbiAgICAgICAgKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGZpZWxkc1RvQWRkLnB1c2goZmllbGQpO1xuICAgIH1cbiAgfSk7XG5cbiAgZmllbGRzVG9BZGQuc29ydChjb21wYXJlRmllbGRzVG9BZGQoaGFzU2VsZWN0ZWREaW1lbnNpb24sIGhhc1NlbGVjdGVkTWVhc3VyZSwgaW5kaWNlcykpO1xuXG4gIHZhciBzZXRzVG9BZGQgPSB1dGlsLmNob29zZUtvckxlc3MoZmllbGRzVG9BZGQsIDEpO1xuXG4gIHNldHNUb0FkZC5mb3JFYWNoKGZ1bmN0aW9uKHNldFRvQWRkKSB7XG4gICAgdmFyIGZpZWxkU2V0ID0gc2VsZWN0ZWQuY29uY2F0KHNldFRvQWRkKTtcbiAgICBpZiAoZmllbGRTZXQubGVuZ3RoID4gMCkge1xuICAgICAgaWYgKG9wdC5vbWl0RG90UGxvdCAmJiBmaWVsZFNldC5sZW5ndGggPT09IDEpIHJldHVybjtcbiAgICAgIGZpZWxkU2V0cy5wdXNoKGZpZWxkU2V0KTtcbiAgICB9XG4gIH0pO1xuXG4gIGZpZWxkU2V0cy5mb3JFYWNoKGZ1bmN0aW9uKGZpZWxkU2V0KSB7XG4gICAgICAvLyBhbHdheXMgYXBwZW5kIHByb2plY3Rpb24ncyBrZXkgdG8gZWFjaCBwcm9qZWN0aW9uIHJldHVybmVkLCBkMyBzdHlsZS5cbiAgICBmaWVsZFNldC5rZXkgPSBwcm9qZWN0aW9ucy5rZXkoZmllbGRTZXQpO1xuICB9KTtcblxuICByZXR1cm4gZmllbGRTZXRzO1xufVxuXG52YXIgdHlwZUlzTWVhc3VyZVNjb3JlID0ge1xuICBOOiAwLFxuICBPOiAxLFxuICBUOiAyLFxuICBROiAzXG59O1xuXG5mdW5jdGlvbiBjb21wYXJlRmllbGRzVG9BZGQoaGFzU2VsZWN0ZWREaW1lbnNpb24sIGhhc1NlbGVjdGVkTWVhc3VyZSwgaW5kaWNlcykge1xuICByZXR1cm4gZnVuY3Rpb24oYSwgYil7XG4gICAgLy8gc29ydCBieSB0eXBlIG9mIHRoZSBkYXRhXG4gICAgaWYgKGEudHlwZSAhPT0gYi50eXBlKSB7XG4gICAgICBpZiAoIWhhc1NlbGVjdGVkRGltZW5zaW9uKSB7XG4gICAgICAgIHJldHVybiB0eXBlSXNNZWFzdXJlU2NvcmVbYS50eXBlXSAtIHR5cGVJc01lYXN1cmVTY29yZVtiLnR5cGVdO1xuICAgICAgfSBlbHNlIGlmICghaGFzU2VsZWN0ZWRNZWFzdXJlKSB7XG4gICAgICAgIHJldHVybiB0eXBlSXNNZWFzdXJlU2NvcmVbYi50eXBlXSAtIHR5cGVJc01lYXN1cmVTY29yZVthLnR5cGVdO1xuICAgICAgfVxuICAgIH1cbiAgICAvL21ha2UgdGhlIHNvcnQgc3RhYmxlXG4gICAgcmV0dXJuIGluZGljZXNbYS5uYW1lXSAtIGluZGljZXNbYi5uYW1lXTtcbiAgfTtcbn1cblxucHJvamVjdGlvbnMua2V5ID0gZnVuY3Rpb24ocHJvamVjdGlvbikge1xuICByZXR1cm4gcHJvamVjdGlvbi5tYXAoZnVuY3Rpb24oZmllbGQpIHtcbiAgICByZXR1cm4gdmwuZmllbGQuaXNDb3VudChmaWVsZCkgPyAnY291bnQnIDogZmllbGQubmFtZTtcbiAgfSkuam9pbignLCcpO1xufTtcblxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgZyA9IGdsb2JhbCB8fCB3aW5kb3c7XG5cbnJlcXVpcmUoJ3ZlZ2EtbGl0ZS9zcmMvZ2xvYmFscycpO1xuXG5nLkNIQVJUX1RZUEVTID0ge1xuICBUQUJMRTogJ1RBQkxFJyxcbiAgQkFSOiAnQkFSJyxcbiAgUExPVDogJ1BMT1QnLFxuICBMSU5FOiAnTElORScsXG4gIEFSRUE6ICdBUkVBJyxcbiAgTUFQOiAnTUFQJyxcbiAgSElTVE9HUkFNOiAnSElTVE9HUkFNJ1xufTtcblxuZy5BTllfREFUQV9UWVBFUyA9ICgxIDw8IDQpIC0gMTsiLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgZW5jb2Rpbmc6IHJlcXVpcmUoJy4vcmFua0VuY29kaW5ncycpXG59O1xuXG5cbiIsIid1c2Ugc3RyaWN0JztcblxucmVxdWlyZSgnLi4vZ2xvYmFscycpO1xuXG52YXIgdmwgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdy52bCA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwudmwgOiBudWxsKSxcbiAgaXNEaW1lbnNpb24gPSB2bC5maWVsZC5pc0RpbWVuc2lvbjtcblxubW9kdWxlLmV4cG9ydHMgPSByYW5rRW5jb2RpbmdzO1xuXG4vLyBiYWQgc2NvcmUgbm90IHNwZWNpZmllZCBpbiB0aGUgdGFibGUgYWJvdmVcbnZhciBVTlVTRURfUE9TSVRJT04gPSAwLjU7XG5cbnZhciBNQVJLX1NDT1JFID0ge1xuICBsaW5lOiAwLjk5LFxuICBhcmVhOiAwLjk4LFxuICBiYXI6IDAuOTcsXG4gIHRpY2s6IDAuOTYsXG4gIHBvaW50OiAwLjk1LFxuICBjaXJjbGU6IDAuOTQsXG4gIHNxdWFyZTogMC45NCxcbiAgdGV4dDogMC44XG59O1xuXG5mdW5jdGlvbiByYW5rRW5jb2RpbmdzKGVuY29kaW5nLCBzdGF0cywgb3B0LCBzZWxlY3RlZCkge1xuICB2YXIgZmVhdHVyZXMgPSBbXSxcbiAgICBlbmNUeXBlcyA9IHZsLmtleXMoZW5jb2RpbmcuZW5jb2RpbmcpLFxuICAgIG1hcmt0eXBlID0gZW5jb2RpbmcubWFya3R5cGUsXG4gICAgZW5jID0gZW5jb2RpbmcuZW5jb2Rpbmc7XG5cbiAgdmFyIGVuY29kaW5nTWFwcGluZ0J5RmllbGQgPSB2bC5lbmMucmVkdWNlKGVuY29kaW5nLmVuY29kaW5nLCBmdW5jdGlvbihvLCBmaWVsZCwgZW5jVHlwZSkge1xuICAgIHZhciBrZXkgPSB2bC5maWVsZC5zaG9ydGhhbmQoZmllbGQpO1xuICAgIHZhciBtYXBwaW5ncyA9IG9ba2V5XSA9IG9ba2V5XSB8fCBbXTtcbiAgICBtYXBwaW5ncy5wdXNoKHtlbmNUeXBlOiBlbmNUeXBlLCBmaWVsZDogZmllbGR9KTtcbiAgICByZXR1cm4gbztcbiAgfSwge30pO1xuXG4gIC8vIGRhdGEgLSBlbmNvZGluZyBtYXBwaW5nIHNjb3JlXG4gIHZsLmZvckVhY2goZW5jb2RpbmdNYXBwaW5nQnlGaWVsZCwgZnVuY3Rpb24obWFwcGluZ3MpIHtcbiAgICB2YXIgcmVhc29ucyA9IG1hcHBpbmdzLm1hcChmdW5jdGlvbihtKSB7XG4gICAgICAgIHJldHVybiBtLmVuY1R5cGUgKyB2bC5zaG9ydGhhbmQuYXNzaWduICsgdmwuZmllbGQuc2hvcnRoYW5kKG0uZmllbGQpICtcbiAgICAgICAgICAnICcgKyAoc2VsZWN0ZWQgJiYgc2VsZWN0ZWRbbS5maWVsZC5uYW1lXSA/ICdbeF0nIDogJ1sgXScpO1xuICAgICAgfSksXG4gICAgICBzY29yZXMgPSBtYXBwaW5ncy5tYXAoZnVuY3Rpb24obSkge1xuICAgICAgICB2YXIgcm9sZSA9IHZsLmZpZWxkLnJvbGUobS5maWVsZCk7XG4gICAgICAgIHZhciBzY29yZSA9IHJhbmtFbmNvZGluZ3Muc2NvcmVbcm9sZV0obS5maWVsZCwgbS5lbmNUeXBlLCBlbmNvZGluZy5tYXJrdHlwZSwgc3RhdHMsIG9wdCk7XG5cbiAgICAgICAgcmV0dXJuICFzZWxlY3RlZCB8fCBzZWxlY3RlZFttLmZpZWxkLm5hbWVdID8gc2NvcmUgOiBNYXRoLnBvdyhzY29yZSwgMC4xMjUpO1xuICAgICAgfSk7XG5cbiAgICBmZWF0dXJlcy5wdXNoKHtcbiAgICAgIHJlYXNvbjogcmVhc29ucy5qb2luKFwiIHwgXCIpLFxuICAgICAgc2NvcmU6IE1hdGgubWF4LmFwcGx5KG51bGwsIHNjb3JlcylcbiAgICB9KTtcbiAgfSk7XG5cbiAgLy8gcGxvdCB0eXBlXG4gIGlmIChtYXJrdHlwZSA9PT0gVEVYVCkge1xuICAgIC8vIFRPRE9cbiAgfSBlbHNlIHtcbiAgICBpZiAoZW5jLnggJiYgZW5jLnkpIHtcbiAgICAgIGlmIChpc0RpbWVuc2lvbihlbmMueCkgXiBpc0RpbWVuc2lvbihlbmMueSkpIHtcbiAgICAgICAgZmVhdHVyZXMucHVzaCh7XG4gICAgICAgICAgcmVhc29uOiAnT3hRIHBsb3QnLFxuICAgICAgICAgIHNjb3JlOiAwLjhcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gcGVuYWxpemUgbm90IHVzaW5nIHBvc2l0aW9uYWwgb25seSBwZW5hbGl6ZSBmb3Igbm9uLXRleHRcbiAgaWYgKGVuY1R5cGVzLmxlbmd0aCA+IDEgJiYgbWFya3R5cGUgIT09IFRFWFQpIHtcbiAgICBpZiAoKCFlbmMueCB8fCAhZW5jLnkpICYmICFlbmMuZ2VvICYmICFlbmMudGV4dCkge1xuICAgICAgZmVhdHVyZXMucHVzaCh7XG4gICAgICAgIHJlYXNvbjogJ3VudXNlZCBwb3NpdGlvbicsXG4gICAgICAgIHNjb3JlOiBVTlVTRURfUE9TSVRJT05cbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIC8vIG1hcmsgdHlwZSBzY29yZVxuICBmZWF0dXJlcy5wdXNoKHtcbiAgICByZWFzb246ICdtYXJrdHlwZT0nK21hcmt0eXBlLFxuICAgIHNjb3JlOiBNQVJLX1NDT1JFW21hcmt0eXBlXVxuICB9KTtcblxuICByZXR1cm4ge1xuICAgIHNjb3JlOiBmZWF0dXJlcy5yZWR1Y2UoZnVuY3Rpb24ocCwgZikge1xuICAgICAgcmV0dXJuIHAgKiBmLnNjb3JlO1xuICAgIH0sIDEpLFxuICAgIGZlYXR1cmVzOiBmZWF0dXJlc1xuICB9O1xufVxuXG5cbnZhciBEID0ge30sIE0gPSB7fSwgQkFEID0gMC4xLCBURVJSSUJMRSA9IDAuMDE7XG5cbkQubWlub3IgPSAwLjAxO1xuRC5wb3MgPSAxO1xuRC5ZX1QgPSAwLjg7XG5ELmZhY2V0X3RleHQgPSAxO1xuRC5mYWNldF9nb29kID0gMC42NzU7IC8vIDwgY29sb3Jfb2ssID4gY29sb3JfYmFkXG5ELmZhY2V0X29rID0gMC41NTtcbkQuZmFjZXRfYmFkID0gMC40O1xuRC5jb2xvcl9nb29kID0gMC43O1xuRC5jb2xvcl9vayA9IDAuNjU7IC8vID4gTS5TaXplXG5ELmNvbG9yX2JhZCA9IDAuMztcbkQuY29sb3Jfc3RhY2sgPSAwLjY7XG5ELnNoYXBlID0gMC42O1xuRC5kZXRhaWwgPSAwLjU7XG5ELmJhZCA9IEJBRDtcbkQudGVycmlibGUgPSBURVJSSUJMRTtcblxuTS5wb3MgPSAxO1xuTS5zaXplID0gMC42O1xuTS5jb2xvciA9IDAuNTtcbk0uYWxwaGEgPSAwLjQ1O1xuTS50ZXh0ID0gMC40O1xuTS5iYWQgPSBCQUQ7XG5NLnRlcnJpYmxlID0gVEVSUklCTEU7XG5cbnJhbmtFbmNvZGluZ3MuZGltZW5zaW9uU2NvcmUgPSBmdW5jdGlvbiAoZmllbGQsIGVuY1R5cGUsIG1hcmt0eXBlLCBzdGF0cywgb3B0KXtcbiAgdmFyIGNhcmRpbmFsaXR5ID0gdmwuZmllbGQuY2FyZGluYWxpdHkoZmllbGQsIHN0YXRzKTtcbiAgc3dpdGNoIChlbmNUeXBlKSB7XG4gICAgY2FzZSBYOlxuICAgICAgaWYgKHZsLmZpZWxkLmlzVHlwZXMoZmllbGQsIFtOLCBPXSkpICByZXR1cm4gRC5wb3MgLSBELm1pbm9yO1xuICAgICAgcmV0dXJuIEQucG9zO1xuXG4gICAgY2FzZSBZOlxuICAgICAgaWYgKHZsLmZpZWxkLmlzVHlwZXMoZmllbGQsIFtOLCBPXSkpIHJldHVybiBELnBvcyAtIEQubWlub3I7IC8vcHJlZmVyIG9yZGluYWwgb24geVxuICAgICAgaWYoZmllbGQudHlwZSA9PT0gVCkgcmV0dXJuIEQuWV9UOyAvLyB0aW1lIHNob3VsZCBub3QgYmUgb24gWVxuICAgICAgcmV0dXJuIEQucG9zIC0gRC5taW5vcjtcblxuICAgIGNhc2UgQ09MOlxuICAgICAgaWYgKG1hcmt0eXBlID09PSBURVhUKSByZXR1cm4gRC5mYWNldF90ZXh0O1xuICAgICAgLy9wcmVmZXIgY29sdW1uIG92ZXIgcm93IGR1ZSB0byBzY3JvbGxpbmcgaXNzdWVzXG4gICAgICByZXR1cm4gY2FyZGluYWxpdHkgPD0gb3B0Lm1heEdvb2RDYXJkaW5hbGl0eUZvckZhY2V0cyA/IEQuZmFjZXRfZ29vZCA6XG4gICAgICAgIGNhcmRpbmFsaXR5IDw9IG9wdC5tYXhDYXJkaW5hbGl0eUZvckZhY2V0cyA/IEQuZmFjZXRfb2sgOiBELmZhY2V0X2JhZDtcblxuICAgIGNhc2UgUk9XOlxuICAgICAgaWYgKG1hcmt0eXBlID09PSBURVhUKSByZXR1cm4gRC5mYWNldF90ZXh0O1xuICAgICAgcmV0dXJuIChjYXJkaW5hbGl0eSA8PSBvcHQubWF4R29vZENhcmRpbmFsaXR5Rm9yRmFjZXRzID8gRC5mYWNldF9nb29kIDpcbiAgICAgICAgY2FyZGluYWxpdHkgPD0gb3B0Lm1heENhcmRpbmFsaXR5Rm9yRmFjZXRzID8gRC5mYWNldF9vayA6IEQuZmFjZXRfYmFkKSAtIEQubWlub3I7XG5cbiAgICBjYXNlIENPTE9SOlxuICAgICAgdmFyIGhhc09yZGVyID0gKGZpZWxkLmJpbiAmJiBmaWVsZC50eXBlPT09USkgfHwgKGZpZWxkLnRpbWVVbml0ICYmIGZpZWxkLnR5cGU9PT1UKTtcblxuICAgICAgLy9GSVhNRSBhZGQgc3RhY2tpbmcgb3B0aW9uIG9uY2Ugd2UgaGF2ZSBjb250cm9sIC4uXG4gICAgICB2YXIgaXNTdGFja2VkID0gbWFya3R5cGUgPT09ICdiYXInIHx8IG1hcmt0eXBlID09PSAnYXJlYSc7XG5cbiAgICAgIC8vIHRydWUgb3JkaW5hbCBvbiBjb2xvciBpcyBjdXJyZW50bHkgQkFEICh1bnRpbCB3ZSBoYXZlIGdvb2Qgb3JkaW5hbCBjb2xvciBzY2FsZSBzdXBwb3J0KVxuICAgICAgaWYgKGhhc09yZGVyKSByZXR1cm4gRC5jb2xvcl9iYWQ7XG5cbiAgICAgIC8vc3RhY2tpbmcgZ2V0cyBsb3dlciBzY29yZVxuICAgICAgaWYgKGlzU3RhY2tlZCkgcmV0dXJuIEQuY29sb3Jfc3RhY2s7XG5cbiAgICAgIHJldHVybiBjYXJkaW5hbGl0eSA8PSBvcHQubWF4R29vZENhcmRpbmFsaXR5Rm9yQ29sb3IgPyBELmNvbG9yX2dvb2Q6IGNhcmRpbmFsaXR5IDw9IG9wdC5tYXhDYXJkaW5hbGl0eUZvckNvbG9yID8gRC5jb2xvcl9vayA6IEQuY29sb3JfYmFkO1xuICAgIGNhc2UgU0hBUEU6XG4gICAgICByZXR1cm4gY2FyZGluYWxpdHkgPD0gb3B0Lm1heENhcmRpbmFsaXR5Rm9yU2hhcGUgPyBELnNoYXBlIDogVEVSUklCTEU7XG4gICAgY2FzZSBERVRBSUw6XG4gICAgICByZXR1cm4gRC5kZXRhaWw7XG4gIH1cbiAgcmV0dXJuIFRFUlJJQkxFO1xufTtcblxucmFua0VuY29kaW5ncy5kaW1lbnNpb25TY29yZS5jb25zdHMgPSBEO1xuXG5yYW5rRW5jb2RpbmdzLm1lYXN1cmVTY29yZSA9IGZ1bmN0aW9uIChmaWVsZCwgZW5jVHlwZSwgbWFya3R5cGUsIHN0YXRzLCBvcHQpIHtcbiAgLy8ganNoaW50IHVudXNlZDpmYWxzZVxuICBzd2l0Y2ggKGVuY1R5cGUpe1xuICAgIGNhc2UgWDogcmV0dXJuIE0ucG9zO1xuICAgIGNhc2UgWTogcmV0dXJuIE0ucG9zO1xuICAgIGNhc2UgU0laRTpcbiAgICAgIGlmIChtYXJrdHlwZSA9PT0gJ2JhcicpIHJldHVybiBCQUQ7IC8vc2l6ZSBvZiBiYXIgaXMgdmVyeSBiYWRcbiAgICAgIGlmIChtYXJrdHlwZSA9PT0gVEVYVCkgcmV0dXJuIEJBRDtcbiAgICAgIGlmIChtYXJrdHlwZSA9PT0gJ2xpbmUnKSByZXR1cm4gQkFEO1xuICAgICAgcmV0dXJuIE0uc2l6ZTtcbiAgICBjYXNlIENPTE9SOiByZXR1cm4gTS5jb2xvcjtcbiAgICBjYXNlICdhbHBoYSc6IHJldHVybiBNLmFscGhhO1xuICAgIGNhc2UgVEVYVDogcmV0dXJuIE0udGV4dDtcbiAgfVxuICByZXR1cm4gQkFEO1xufTtcblxucmFua0VuY29kaW5ncy5tZWFzdXJlU2NvcmUuY29uc3RzID0gTTtcblxuXG5yYW5rRW5jb2RpbmdzLnNjb3JlID0ge1xuICBkaW1lbnNpb246IHJhbmtFbmNvZGluZ3MuZGltZW5zaW9uU2NvcmUsXG4gIG1lYXN1cmU6IHJhbmtFbmNvZGluZ3MubWVhc3VyZVNjb3JlLFxufTtcbiIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgY29uc3RzID0gcmVxdWlyZSgnLi9jb25zdHMnKTtcblxudmFyIHV0aWwgPSBtb2R1bGUuZXhwb3J0cyA9IHtcbiAgZ2VuOiB7fVxufTtcblxudXRpbC5pc0FycmF5ID0gQXJyYXkuaXNBcnJheSB8fCBmdW5jdGlvbiAob2JqKSB7XG4gIHJldHVybiB7fS50b1N0cmluZy5jYWxsKG9iaikgPT0gJ1tvYmplY3QgQXJyYXldJztcbn07XG5cbnV0aWwuanNvbiA9IGZ1bmN0aW9uKHMsIHNwKSB7XG4gIHJldHVybiBKU09OLnN0cmluZ2lmeShzLCBudWxsLCBzcCk7XG59O1xuXG51dGlsLmtleXMgPSBmdW5jdGlvbihvYmopIHtcbiAgdmFyIGsgPSBbXSwgeDtcbiAgZm9yICh4IGluIG9iaikgay5wdXNoKHgpO1xuICByZXR1cm4gaztcbn07XG5cbnV0aWwubmVzdGVkTWFwID0gZnVuY3Rpb24gKGNvbCwgZiwgbGV2ZWwsIGZpbHRlcikge1xuICByZXR1cm4gbGV2ZWwgPT09IDAgP1xuICAgIGNvbC5tYXAoZikgOlxuICAgIGNvbC5tYXAoZnVuY3Rpb24odikge1xuICAgICAgdmFyIHIgPSB1dGlsLm5lc3RlZE1hcCh2LCBmLCBsZXZlbCAtIDEpO1xuICAgICAgcmV0dXJuIGZpbHRlciA/IHIuZmlsdGVyKHV0aWwubm9uRW1wdHkpIDogcjtcbiAgICB9KTtcbn07XG5cbnV0aWwubmVzdGVkUmVkdWNlID0gZnVuY3Rpb24gKGNvbCwgZiwgbGV2ZWwsIGZpbHRlcikge1xuICByZXR1cm4gbGV2ZWwgPT09IDAgP1xuICAgIGNvbC5yZWR1Y2UoZiwgW10pIDpcbiAgICBjb2wubWFwKGZ1bmN0aW9uKHYpIHtcbiAgICAgIHZhciByID0gdXRpbC5uZXN0ZWRSZWR1Y2UodiwgZiwgbGV2ZWwgLSAxKTtcbiAgICAgIHJldHVybiBmaWx0ZXIgPyByLmZpbHRlcih1dGlsLm5vbkVtcHR5KSA6IHI7XG4gICAgfSk7XG59O1xuXG51dGlsLm5vbkVtcHR5ID0gZnVuY3Rpb24oZ3JwKSB7XG4gIHJldHVybiAhdXRpbC5pc0FycmF5KGdycCkgfHwgZ3JwLmxlbmd0aCA+IDA7XG59O1xuXG5cbnV0aWwudHJhdmVyc2UgPSBmdW5jdGlvbiAobm9kZSwgYXJyKSB7XG4gIGlmIChub2RlLnZhbHVlICE9PSB1bmRlZmluZWQpIHtcbiAgICBhcnIucHVzaChub2RlLnZhbHVlKTtcbiAgfSBlbHNlIHtcbiAgICBpZiAobm9kZS5sZWZ0KSB1dGlsLnRyYXZlcnNlKG5vZGUubGVmdCwgYXJyKTtcbiAgICBpZiAobm9kZS5yaWdodCkgdXRpbC50cmF2ZXJzZShub2RlLnJpZ2h0LCBhcnIpO1xuICB9XG4gIHJldHVybiBhcnI7XG59O1xuXG51dGlsLnVuaW9uID0gZnVuY3Rpb24gKGEsIGIpIHtcbiAgdmFyIG8gPSB7fTtcbiAgYS5mb3JFYWNoKGZ1bmN0aW9uKHgpIHsgb1t4XSA9IHRydWU7fSk7XG4gIGIuZm9yRWFjaChmdW5jdGlvbih4KSB7IG9beF0gPSB0cnVlO30pO1xuICByZXR1cm4gdXRpbC5rZXlzKG8pO1xufTtcblxuXG51dGlsLmdlbi5nZXRPcHQgPSBmdW5jdGlvbiAob3B0KSB7XG4gIC8vbWVyZ2Ugd2l0aCBkZWZhdWx0XG4gIHJldHVybiAob3B0ID8gdXRpbC5rZXlzKG9wdCkgOiBbXSkucmVkdWNlKGZ1bmN0aW9uKGMsIGspIHtcbiAgICBjW2tdID0gb3B0W2tdO1xuICAgIHJldHVybiBjO1xuICB9LCBPYmplY3QuY3JlYXRlKGNvbnN0cy5nZW4uREVGQVVMVF9PUFQpKTtcbn07XG5cbi8qKlxuICogcG93ZXJzZXQgY29kZSBmcm9tIGh0dHA6Ly9yb3NldHRhY29kZS5vcmcvd2lraS9Qb3dlcl9TZXQjSmF2YVNjcmlwdFxuICpcbiAqICAgdmFyIHJlcyA9IHBvd2Vyc2V0KFsxLDIsMyw0XSk7XG4gKlxuICogcmV0dXJuc1xuICpcbiAqIFtbXSxbMV0sWzJdLFsxLDJdLFszXSxbMSwzXSxbMiwzXSxbMSwyLDNdLFs0XSxbMSw0XSxcbiAqIFsyLDRdLFsxLDIsNF0sWzMsNF0sWzEsMyw0XSxbMiwzLDRdLFsxLDIsMyw0XV1cbltlZGl0XVxuKi9cblxudXRpbC5wb3dlcnNldCA9IGZ1bmN0aW9uKGxpc3QpIHtcbiAgdmFyIHBzID0gW1xuICAgIFtdXG4gIF07XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7IGkrKykge1xuICAgIGZvciAodmFyIGogPSAwLCBsZW4gPSBwcy5sZW5ndGg7IGogPCBsZW47IGorKykge1xuICAgICAgcHMucHVzaChwc1tqXS5jb25jYXQobGlzdFtpXSkpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcHM7XG59O1xuXG51dGlsLmNob29zZUtvckxlc3MgPSBmdW5jdGlvbihsaXN0LCBrKSB7XG4gIHZhciBzdWJzZXQgPSBbW11dO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGxpc3QubGVuZ3RoOyBpKyspIHtcbiAgICBmb3IgKHZhciBqID0gMCwgbGVuID0gc3Vic2V0Lmxlbmd0aDsgaiA8IGxlbjsgaisrKSB7XG4gICAgICB2YXIgc3ViID0gc3Vic2V0W2pdLmNvbmNhdChsaXN0W2ldKTtcbiAgICAgIGlmKHN1Yi5sZW5ndGggPD0gayl7XG4gICAgICAgIHN1YnNldC5wdXNoKHN1Yik7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiBzdWJzZXQ7XG59O1xuXG51dGlsLmNob29zZUsgPSBmdW5jdGlvbihsaXN0LCBrKSB7XG4gIHZhciBzdWJzZXQgPSBbW11dO1xuICB2YXIga0FycmF5ID1bXTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgZm9yICh2YXIgaiA9IDAsIGxlbiA9IHN1YnNldC5sZW5ndGg7IGogPCBsZW47IGorKykge1xuICAgICAgdmFyIHN1YiA9IHN1YnNldFtqXS5jb25jYXQobGlzdFtpXSk7XG4gICAgICBpZihzdWIubGVuZ3RoIDwgayl7XG4gICAgICAgIHN1YnNldC5wdXNoKHN1Yik7XG4gICAgICB9ZWxzZSBpZiAoc3ViLmxlbmd0aCA9PT0gayl7XG4gICAgICAgIGtBcnJheS5wdXNoKHN1Yik7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiBrQXJyYXk7XG59O1xuXG51dGlsLmNyb3NzID0gZnVuY3Rpb24oYSxiKXtcbiAgdmFyIHggPSBbXTtcbiAgZm9yKHZhciBpPTA7IGk8IGEubGVuZ3RoOyBpKyspe1xuICAgIGZvcih2YXIgaj0wO2o8IGIubGVuZ3RoOyBqKyspe1xuICAgICAgeC5wdXNoKGFbaV0uY29uY2F0KGJbal0pKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHg7XG59O1xuXG4iXX0=
