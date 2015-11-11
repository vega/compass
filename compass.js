(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.cp = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports = {
   hcluster: require("./hcluster"),
   Kmeans: require("./kmeans"),
   kmeans: require("./kmeans").kmeans
};
},{"./hcluster":3,"./kmeans":4}],2:[function(require,module,exports){
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
},{}],3:[function(require,module,exports){
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

},{"./distance":2}],4:[function(require,module,exports){
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
},{"./distance":2}],5:[function(require,module,exports){
(function (global){
'use strict';

// declare global constant
var g = global || window;

g.AGGREGATE = 'aggregate';
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
g.TEXT = 'text';
g.DETAIL = 'detail';

g.N = 'N';
g.O = 'O';
g.Q = 'Q';
g.T = 'T';

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],6:[function(require,module,exports){
(function (global){
"use strict";

module.exports = cluster;

var vl = (typeof window !== "undefined" ? window['vl'] : typeof global !== "undefined" ? global['vl'] : null),
  clusterfck = require('clusterfck'),
  consts = require('./clusterconsts'),
  util = require('../util');

cluster.distance = require('./distance');

function cluster(specs, opt) {
  // jshint unused:false
  var dist = cluster.distance.table(specs);

  var clusterTrees = clusterfck.hcluster(specs, function(e1, e2) {
    var s1 = vl.Encoding.shorthand(e1),
      s2 = vl.Encoding.shorthand(e2);
    return dist[s1][s2];
  }, 'average', consts.CLUSTER_THRESHOLD);

  var clusters = clusterTrees.map(function(tree) {
      return util.traverse(tree, []);
    })
   .map(function(cluster) {
    return cluster.sort(function(spec1, spec2) {
      // sort each cluster -- have the highest score as 1st item
      return spec2._info.score - spec1._info.score;
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

},{"../util":20,"./clusterconsts":7,"./distance":8,"clusterfck":1}],7:[function(require,module,exports){
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
  ['size', 'color', c.SWAPPABLE]
].reduce(reduceTupleToTable, {});

},{}],8:[function(require,module,exports){
(function (global){
'use strict';

var vl = (typeof window !== "undefined" ? window['vl'] : typeof global !== "undefined" ? global['vl'] : null),
  consts = require('./clusterconsts'),
  util = require('../util');

var distance = {};
module.exports = distance;

distance.table = function (specs) {
  var len = specs.length,
    extendedSpecs = specs.map(function(e) { return distance.extendSpecWithEncTypeByColumnName(e); }),
    shorthands = specs.map(vl.Encoding.shorthand),
    diff = {}, i, j;

  for (i = 0; i < len; i++) diff[shorthands[i]] = {};

  for (i = 0; i < len; i++) {
    for (j = i + 1; j < len; j++) {
      var sj = shorthands[j], si = shorthands[i];

      diff[sj][si] = diff[si][sj] = distance.get(extendedSpecs[i], extendedSpecs[j]);
    }
  }
  return diff;
};

distance.get = function (extendedSpec1, extendedSpec2) {
  var cols = util.union(vl.keys(extendedSpec1.encTypeByField), vl.keys(extendedSpec2.encTypeByField)),
    dist = 0;

  cols.forEach(function(col) {
    var e1 = extendedSpec1.encTypeByField[col], e2 = extendedSpec2.encTypeByField[col];

    if (e1 && e2) {
      if (e1.encType != e2.encType) {
        dist += (consts.DIST_BY_ENCTYPE[e1.encType] || {})[e2.encType] || 1;
      }
    } else {
      dist += consts.DIST_MISSING;
    }
  });

  // do not group stacked chart with similar non-stacked chart!
  var isStack1 = vl.Encoding.isStack(extendedSpec1),
    isStack2 = vl.Encoding.isStack(extendedSpec2);

  if(isStack1 || isStack2) {
    if(isStack1 && isStack2) {
      if(extendedSpec1.encoding.color.name !== extendedSpec2.encoding.color.name) {
        dist+=1;
      }
    } else {
      dist+=1; // surely different
    }
  }
  return dist;
};

// get encoding type by fieldname
distance.extendSpecWithEncTypeByColumnName = function(spec) {
  var _encTypeByField = {},
    encoding = spec.encoding;

  vl.keys(encoding).forEach(function(encType) {
    var e = vl.duplicate(encoding[encType]);
    e.encType = encType;
    _encTypeByField[e.name || ''] = e;
    delete e.name;
  });

  return {
    marktype: spec.marktype,
    encTypeByField: _encTypeByField,
    encoding: spec.encoding
  };
};
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"../util":20,"./clusterconsts":7}],9:[function(require,module,exports){
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
      default: [undefined, 'mean']
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
      description: 'omit using multiple retinal variables (size, color, shape)'
    },
    omitNonTextAggrWithAllDimsOnFacets: {
      type: 'boolean',
      default: true,
      description: 'remove all aggregated charts (except text tables) with all dims on facets (row, col)'
    },
    omitOneDimensionCount: {
      type: 'boolean',
      default: false,
      description: 'omit one dimension count'
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

},{}],10:[function(require,module,exports){
module.exports = {
  consts: require('./consts'),
  cluster: require('./cluster/cluster'),
  gen: require('./gen/gen'),
  rank: require('./rank/rank'),
  util: require('./util'),
  auto: "-, sum"
};



},{"./cluster/cluster":6,"./consts":9,"./gen/gen":13,"./rank/rank":18,"./util":20}],11:[function(require,module,exports){
(function (global){
'use strict';

var vl = (typeof window !== "undefined" ? window['vl'] : typeof global !== "undefined" ? global['vl'] : null);

var consts = require('../consts');

var AUTO = '*';

module.exports = genAggregates;

function genAggregates(output, fieldDefs, stats, opt) {
  opt = vl.schema.util.extend(opt||{}, consts.gen.aggregates);
  var tf = new Array(fieldDefs.length);
  var hasNorO = vl.any(fieldDefs, function(f) {
    return vl.encDef.isTypes(f, [N, O]);
  });

  function emit(fieldSet) {
    fieldSet = vl.duplicate(fieldSet);
    fieldSet.key = vl.encDef.shorthands(fieldSet);
    output.push(fieldSet);
  }

  function checkAndPush() {
    if (opt.omitMeasureOnly || opt.omitDimensionOnly) {
      var hasMeasure = false, hasDimension = false, hasRaw = false;
      tf.forEach(function(f) {
        if (vl.encDef.isDimension(f)) {
          hasDimension = true;
        } else {
          hasMeasure = true;
          if (!f.aggregate) hasRaw = true;
        }
      });
      if (!hasDimension && !hasRaw && opt.omitMeasureOnly) return;
      if (!hasMeasure) {
        if (opt.addCountForDimensionOnly) {
          tf.push(vl.encDef.count());
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
    var f = fieldDefs[i],
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
        var highCardinality = vl.encDef.cardinality(f, stats) > opt.minCardinalityForBin;

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
    var f = fieldDefs[i];
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
    if (i === fieldDefs.length) { // If all fields are assigned
      checkAndPush();
      return;
    }

    var f = fieldDefs[i];
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

},{"../consts":9}],12:[function(require,module,exports){
(function (global){
"use strict";
require('../globals');

var vl = (typeof window !== "undefined" ? window['vl'] : typeof global !== "undefined" ? global['vl'] : null),
  genMarkTypes = require('./marktypes'),
  isDimension = vl.encDef.isDimension,
  isMeasure = vl.encDef.isMeasure;

module.exports = genEncodings;

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

function retinalEncRules(encoding, fieldDef, stats, opt) {
  if (opt.omitMultipleRetinalEncodings) {
    if (encoding.color || encoding.size || encoding.shape) return false;
  }
  return true;
}

function colorRules(encoding, fieldDef, stats, opt) {
  if(!retinalEncRules(encoding, fieldDef, stats, opt)) return false;

  return vl.encDef.isMeasure(fieldDef) ||
    vl.encDef.cardinality(fieldDef, stats) <= opt.maxCardinalityForColor;
}

function shapeRules(encoding, fieldDef, stats, opt) {
  if(!retinalEncRules(encoding, fieldDef, stats, opt)) return false;

  if (fieldDef.bin && fieldDef.type === Q) return false;
  if (fieldDef.timeUnit && fieldDef.type === T) return false;
  return vl.encDef.cardinality(fieldDef, stats) <= opt.maxCardinalityForColor;
}

function dimMeaTransposeRule(encoding) {
  // create horizontal histogram for ordinal
  if (vl.encDef.isTypes(encoding.y, [N, O]) && isMeasure(encoding.x)) return true;

  // vertical histogram for Q and T
  if (isMeasure(encoding.y) && (!vl.encDef.isTypes(encoding.x, [N, O]) && isDimension(encoding.x))) return true;

  return false;
}

function generalRules(encoding, stats, opt) {
  // enc.text is only used for TEXT TABLE
  if (encoding.text) {
    return genMarkTypes.satisfyRules(encoding, TEXT, stats, opt);
  }

  // CARTESIAN PLOT OR MAP
  if (encoding.x || encoding.y || encoding.geo || encoding.arc) {

    if (encoding.row || encoding.col) { //have facet(s)

      // don't use facets before filling up x,y
      if (!encoding.x || !encoding.y) return false;

      if (opt.omitNonTextAggrWithAllDimsOnFacets) {
        // remove all aggregated charts with all dims on facets (row, col)
        if (genEncodings.isAggrWithAllDimOnFacets(encoding)) return false;
      }
    }

    if (encoding.x && encoding.y) {
      var isDimX = !!isDimension(encoding.x),
        isDimY = !!isDimension(encoding.y);

      if (isDimX && isDimY && !vl.enc.isAggregate(encoding)) {
        // FIXME actually check if there would be occlusion #90
        return false;
      }

      if (opt.omitTranpose) {
        if (isDimX ^ isDimY) { // dim x mea
          if (!dimMeaTransposeRule(encoding)) return false;
        } else if (encoding.y.type===T || encoding.x.type === T) {
          if (encoding.y.type===T && encoding.x.type !== T) return false;
        } else { // show only one OxO, QxQ
          if (encoding.x.name > encoding.y.name) return false;
        }
      }
      return true;
    }

    // DOT PLOTS
    // // plot with one axis = dot plot
    if (opt.omitDotPlot) return false;

    // Dot plot should always be horizontal
    if (opt.omitTranpose && encoding.y) return false;

    // dot plot shouldn't have other encoding
    if (opt.omitDotPlotWithExtraEncoding && vl.keys(encoding).length > 1) return false;

    if (opt.omitOneDimensionCount) {
      // one dimension "count"
      if (encoding.x && encoding.x.aggregate == 'count' && !encoding.y) return false;
      if (encoding.y && encoding.y.aggregate == 'count' && !encoding.x) return false;
    }

    return true;
  }
  return false;
}

genEncodings.isAggrWithAllDimOnFacets = function (encoding) {
  var hasAggr = false, hasOtherO = false;
  for (var encType in encoding) {
    var field = encoding[encType];
    if (field.aggregate) {
      hasAggr = true;
    }
    if (vl.encDef.isDimension(field) && (encType !== ROW && encType !== COL)) {
      hasOtherO = true;
    }
    if (hasAggr && hasOtherO) break;
  }

  return hasAggr && !hasOtherO;
};


function genEncodings(encodings, fieldDefs, stats, opt) {
  // generate a collection vega-lite's enc
  var tmpEncoding = {};

  function assignField(i) {
    // If all fields are assigned, save
    if (i === fieldDefs.length) {
      // at the minimal all chart should have x, y, geo, text or arc
      if (generalRules(tmpEncoding, stats, opt)) {
        encodings.push(vl.duplicate(tmpEncoding));
      }
      return;
    }

    // Otherwise, assign i-th field
    var fieldDef = fieldDefs[i];
    for (var j in opt.encodingTypeList) {
      var encType = opt.encodingTypeList[j],
        isDim = isDimension(fieldDef);

      //TODO: support "multiple" assignment
      if (!(encType in tmpEncoding) && // encoding not used
        ((isDim && rules[encType].dimension) || (!isDim && rules[encType].measure)) &&
        (!rules[encType].rules || rules[encType].rules(tmpEncoding, fieldDef, stats, opt))
      ) {
        tmpEncoding[encType] = fieldDef;
        assignField(i + 1);
        delete tmpEncoding[encType];
      }
    }
  }

  assignField(0);

  return encodings;
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"../globals":17,"./marktypes":14}],13:[function(require,module,exports){
'use strict';

var util = require('../util');

/**
 * Module for generating visualizations
 */

var gen = module.exports = {
  // data variations
  aggregates: require('./aggregates'),
  projections: require('./projections'),
  // encodings / visual variations
  specs: require('./specs'),
  encodings: require('./encodings'),
  marktypes: require('./marktypes')
};


// TODO(kanitw): revise if this is still working
gen.charts = function(fieldDefs, opt, config, flat) {
  opt = util.gen.getOpt(opt);
  flat = flat === undefined ? {encodings: 1} : flat;

  // TODO generate

  // generate permutation of encoding mappings
  var fieldSets = opt.genAggr ? gen.aggregates([], fieldDefs, opt) : [fieldDefs],
    encodings, charts, level = 0;

  if (flat === true || (flat && flat.aggregate)) {
    encodings = fieldSets.reduce(function(output, fieldDefs) {
      return gen.encs(output, fieldDefs, opt);
    }, []);
  } else {
    encodings = fieldSets.map(function(fieldDefs) {
      return gen.encs([], fieldDefs, opt);
    }, true);
    level += 1;
  }

  if (flat === true || (flat && flat.encodings)) {
    charts = util.nestedReduce(encodings, function(output, encoding) {
      return gen.marktypes(output, encoding, opt, config);
    }, level, true);
  } else {
    charts = util.nestedMap(encodings, function(encoding) {
      return gen.marktypes([], encoding, opt, config);
    }, level, true);
    level += 1;
  }
  return charts;
};
},{"../util":20,"./aggregates":11,"./encodings":12,"./marktypes":14,"./projections":15,"./specs":16}],14:[function(require,module,exports){
(function (global){
"use strict";

var vl = (typeof window !== "undefined" ? window['vl'] : typeof global !== "undefined" ? global['vl'] : null),
  isDimension = vl.encDef.isDimension,
  isOrdinalScale = vl.encDef.isOrdinalScale;

var vlmarktypes = module.exports = getMarktypes;

var marksRule = vlmarktypes.rule = {
  point:  pointRule,
  bar:    barRule,
  line:   lineRule,
  area:   areaRule, // area is similar to line
  text:   textRule,
  tick:   tickRule
};

function getMarktypes(encoding, stats, opt) {
  return opt.marktypeList.filter(function(markType){
    return vlmarktypes.satisfyRules(encoding, markType, stats, opt);
  });
}

vlmarktypes.satisfyRules = function (encoding, markType, stats, opt) {
  var mark = vl.compiler.marks[markType],
    reqs = mark.requiredEncoding,
    support = mark.supportedEncoding;

  for (var i in reqs) { // all required encodings in enc
    if (!(reqs[i] in encoding)) return false;
  }

  for (var encType in encoding) { // all encodings in enc are supported
    if (!support[encType]) return false;
  }

  return !marksRule[markType] || marksRule[markType](encoding, stats, opt);
};

function facetRule(fieldDef, stats, opt) {
  return vl.encDef.cardinality(fieldDef, stats) <= opt.maxCardinalityForFacets;
}

function facetsRule(encoding, stats, opt) {
  if(encoding.row && !facetRule(encoding.row, stats, opt)) return false;
  if(encoding.col && !facetRule(encoding.col, stats, opt)) return false;
  return true;
}

function pointRule(encoding, stats, opt) {
  if(!facetsRule(encoding, stats, opt)) return false;
  if (encoding.x && encoding.y) {
    // have both x & y ==> scatter plot / bubble plot

    var xIsDim = isDimension(encoding.x),
      yIsDim = isDimension(encoding.y);

    // For OxO
    if (xIsDim && yIsDim) {
      // shape doesn't work with both x, y as ordinal
      if (encoding.shape) {
        return false;
      }

      // TODO(kanitw): check that there is quant at least ...
      if (encoding.color && isDimension(encoding.color)) {
        return false;
      }
    }

  } else { // plot with one axis = dot plot
    if (opt.omitDotPlot) return false;

    // Dot plot should always be horizontal
    if (opt.omitTranpose && encoding.y) return false;

    // dot plot shouldn't have other encoding
    if (opt.omitDotPlotWithExtraEncoding && vl.keys(encoding).length > 1) return false;

    // dot plot with shape is non-sense
    if (encoding.shape) return false;
  }
  return true;
}

function tickRule(encoding, stats, opt) {
  // jshint unused:false
  if (encoding.x || encoding.y) {
    if(vl.enc.isAggregate(encoding)) return false;

    var xIsDim = isDimension(encoding.x),
      yIsDim = isDimension(encoding.y);

    return (!xIsDim && (!encoding.y || isOrdinalScale(encoding.y))) ||
      (!yIsDim && (!encoding.x || isOrdinalScale(encoding.x)));
  }
  return false;
}

function barRule(encoding, stats, opt) {
  if(!facetsRule(encoding, stats, opt)) return false;

  // bar requires at least x or y
  if (!encoding.x && !encoding.y) return false;

  if (opt.omitSizeOnBar && encoding.size !== undefined) return false;

  // FIXME actually check if there would be occlusion #90
  // need to aggregate on either x or y
  var aggEitherXorY =
    (!encoding.x || encoding.x.aggregate === undefined) ^
    (!encoding.y || encoding.y.aggregate === undefined);


  if (aggEitherXorY) {
    var eitherXorYisDimOrNull =
      (!encoding.x || isDimension(encoding.x)) ^
      (!encoding.y || isDimension(encoding.y));

    if (eitherXorYisDimOrNull) {
      var aggregate = encoding.x.aggregate || encoding.y.aggregate;
      return !(opt.omitStackedAverage && aggregate ==='mean' && encoding.color);
    }
  }

  return false;
}

function lineRule(encoding, stats, opt) {
  if(!facetsRule(encoding, stats, opt)) return false;

  // TODO(kanitw): add omitVerticalLine as config

  // FIXME truly ordinal data is fine here too.
  // Line chart should be only horizontal
  // and use only temporal data
  return encoding.x.type == 'T' && encoding.x.timeUnit && encoding.y.type == 'Q' && encoding.y.aggregate;
}

function areaRule(encoding, stats, opt) {
  if(!facetsRule(encoding, stats, opt)) return false;

  if(!lineRule(encoding, stats, opt)) return false;

  return !(opt.omitStackedAverage && encoding.y.aggregate ==='mean' && encoding.color);
}

function textRule(encoding, stats, opt) {
  // at least must have row or col and aggregated text values
  return (encoding.row || encoding.col) && encoding.text && encoding.text.aggregate && !encoding.x && !encoding.y && !encoding.size &&
    (!opt.alwaysGenerateTableAsHeatmap || !encoding.color);
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],15:[function(require,module,exports){
(function (global){
'use strict';

var util = require('../util'),
  consts = require('../consts'),
  vl = (typeof window !== "undefined" ? window['vl'] : typeof global !== "undefined" ? global['vl'] : null),
  isDimension = vl.encDef.isDimension;

module.exports = projections;

// TODO support other mode of projections generation
// powerset, chooseK, chooseKorLess are already included in the util

/**
 * fields
 * @param  {[type]} fieldDefs array of fields and query information
 * @return {[type]}        [description]
 */
function projections(fieldDefs, stats, opt) {
  opt = vl.schema.util.extend(opt||{}, consts.gen.projections);

  // First categorize field, selected, fieldsToAdd, and save indices
  var selected = [], fieldsToAdd = [], fieldSets = [],
    hasSelectedDimension = false,
    hasSelectedMeasure = false,
    indices = {};

  fieldDefs.forEach(function(fieldDef, index){
    //save indices for stable sort later
    indices[fieldDef.name] = index;

    if (fieldDef.selected) {
      selected.push(fieldDef);
      if (isDimension(fieldDef) || fieldDef.type ==='T') { // FIXME / HACK
        hasSelectedDimension = true;
      } else {
        hasSelectedMeasure = true;
      }
    } else if (fieldDef.selected !== false && !vl.encDef.isCount(fieldDef)) {
      if (vl.encDef.isDimension(fieldDef) &&
          !opt.maxCardinalityForAutoAddOrdinal &&
          vl.encDef.cardinality(fieldDef, stats, 15) > opt.maxCardinalityForAutoAddOrdinal
        ) {
        return;
      }
      fieldsToAdd.push(fieldDef);
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
  O: 0,
  T: 2,
  Q: 3
};

function compareFieldsToAdd(hasSelectedDimension, hasSelectedMeasure, indices) {
  return function(a, b){
    // sort by type of the data
    if (a.type !== b.type) {
      if (!hasSelectedDimension) {
        return typeIsMeasureScore[a.type] - typeIsMeasureScore[b.type];
      } else { //if (!hasSelectedMeasure) {
        return typeIsMeasureScore[b.type] - typeIsMeasureScore[a.type];
      }
    }
    //make the sort stable
    return indices[a.name] - indices[b.name];
  };
}

projections.key = function(projection) {
  return projection.map(function(field) {
    return vl.encDef.isCount(field) ? 'count' : field.name;
  }).join(',');
};


}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"../consts":9,"../util":20}],16:[function(require,module,exports){
(function (global){
'use strict';

var vl = (typeof window !== "undefined" ? window['vl'] : typeof global !== "undefined" ? global['vl'] : null),
  genEncodings = require('./encodings'),
  getMarktypes = require('./marktypes'),
  rank = require('../rank/rank'),
  consts = require('../consts');

module.exports = genSpecsFromFieldDefs;

/** Design Encodings for a set of field definition */

function genSpecsFromFieldDefs(output, fieldDefs, stats, opt, nested) {
  // opt must be augmented before being passed to genEncodings or getMarktypes
  opt = vl.schema.util.extend(opt||{}, consts.gen.encodings);
  var encodings = genEncodings([], fieldDefs, stats, opt);

  if (nested) {
    return encodings.reduce(function(dict, encoding) {
      dict[encoding] = genSpecsFromEncodings([], encoding, stats, opt);
      return dict;
    }, {});
  } else {
    return encodings.reduce(function(list, encoding) {
      return genSpecsFromEncodings(list, encoding, stats, opt);
    }, []);
  }
}

function genSpecsFromEncodings(output, encoding, stats, opt) {
  getMarktypes(encoding, stats, opt)
    .forEach(function(markType) {
      var spec = vl.duplicate({
          // Clone config & encoding to unique objects
          encoding: encoding,
          config: opt.config
        });

      spec.marktype = markType;
      // Data object is the same across charts: pass by reference
      spec.data = opt.data;

      spec = finalTouch(spec, stats, opt);
      var score = rank.encoding(spec, stats, opt);

      spec._info = score;
      output.push(spec);
    });
  return output;
}

//FIXME this should be refactors
function finalTouch(spec, stats, opt) {
  if (spec.marktype === 'text' && opt.alwaysGenerateTableAsHeatmap) {
    spec.encoding.color = spec.encoding.text;
  }

  // don't include zero if stdev/mean < 0.01
  // https://github.com/uwdata/visrec/issues/69
  var encoding = spec.encoding;
  ['x', 'y'].forEach(function(encType) {
    var field = encoding[encType];
    if (field && vl.encDef.isMeasure(field) && !vl.encDef.isCount(field)) {
      var stat = stats[field.name];
      if (stat && stat.stdev / stat.mean < 0.01) {
        field.scale = {zero: false};
      }
    }
  });
  return spec;
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"../consts":9,"../rank/rank":18,"./encodings":12,"./marktypes":14}],17:[function(require,module,exports){
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

},{"vega-lite/src/globals":5}],18:[function(require,module,exports){
module.exports = {
  encoding: require('./rankEncodings')
};



},{"./rankEncodings":19}],19:[function(require,module,exports){
(function (global){
'use strict';

require('../globals');

var vl = (typeof window !== "undefined" ? window['vl'] : typeof global !== "undefined" ? global['vl'] : null),
  isDimension = vl.encDef.isDimension;

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

function rankEncodings(spec, stats, opt, selected) {
  var features = [],
    encTypes = vl.keys(spec.encoding),
    marktype = spec.marktype,
    encoding = spec.encoding;

  var encodingMappingByField = vl.enc.reduce(spec.encoding, function(o, fieldDef, encType) {
    var key = vl.encDef.shorthand(fieldDef);
    var mappings = o[key] = o[key] || [];
    mappings.push({encType: encType, field: fieldDef});
    return o;
  }, {});

  // data - encoding mapping score
  vl.forEach(encodingMappingByField, function(mappings) {
    var reasons = mappings.map(function(m) {
        return m.encType + vl.shorthand.assign + vl.encDef.shorthand(m.field) +
          ' ' + (selected && selected[m.field.name] ? '[x]' : '[ ]');
      }),
      scores = mappings.map(function(m) {
        var role = vl.encDef.isDimension(m.field) ? 'dimension' : 'measure';

        var score = rankEncodings.score[role](m.field, m.encType, spec.marktype, stats, opt);

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
    if (encoding.x && encoding.y) {
      if (isDimension(encoding.x) ^ isDimension(encoding.y)) {
        features.push({
          reason: 'OxQ plot',
          score: 0.8
        });
      }
    }
  }

  // penalize not using positional only penalize for non-text
  if (encTypes.length > 1 && marktype !== TEXT) {
    if ((!encoding.x || !encoding.y) && !encoding.geo && !encoding.text) {
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
M.text = 0.4;
M.bad = BAD;
M.terrible = TERRIBLE;

rankEncodings.dimensionScore = function (fieldDef, encType, marktype, stats, opt){
  var cardinality = vl.encDef.cardinality(fieldDef, stats);
  switch (encType) {
    case X:
      if (vl.encDef.isTypes(fieldDef, [N, O]))  return D.pos - D.minor;
      return D.pos;

    case Y:
      if (vl.encDef.isTypes(fieldDef, [N, O])) return D.pos - D.minor; //prefer ordinal on y
      if (fieldDef.type === T) return D.Y_T; // time should not be on Y
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
      var hasOrder = (fieldDef.bin && fieldDef.type===Q) || (fieldDef.timeUnit && fieldDef.type===T);

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

rankEncodings.measureScore = function (fieldDef, encType, marktype, stats, opt) {
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


},{"./consts":9}]},{},[10])(10)
});
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvY2x1c3RlcmZjay9saWIvY2x1c3RlcmZjay5qcyIsIm5vZGVfbW9kdWxlcy9jbHVzdGVyZmNrL2xpYi9kaXN0YW5jZS5qcyIsIm5vZGVfbW9kdWxlcy9jbHVzdGVyZmNrL2xpYi9oY2x1c3Rlci5qcyIsIm5vZGVfbW9kdWxlcy9jbHVzdGVyZmNrL2xpYi9rbWVhbnMuanMiLCJub2RlX21vZHVsZXMvdmVnYS1saXRlL3NyYy9nbG9iYWxzLmpzIiwic3JjL2NsdXN0ZXIvY2x1c3Rlci5qcyIsInNyYy9jbHVzdGVyL2NsdXN0ZXJjb25zdHMuanMiLCJzcmMvY2x1c3Rlci9kaXN0YW5jZS5qcyIsInNyYy9jb25zdHMuanMiLCJzcmMvY3AiLCJzcmMvZ2VuL2FnZ3JlZ2F0ZXMuanMiLCJzcmMvZ2VuL2VuY29kaW5ncy5qcyIsInNyYy9nZW4vZ2VuLmpzIiwic3JjL2dlbi9tYXJrdHlwZXMuanMiLCJzcmMvZ2VuL3Byb2plY3Rpb25zLmpzIiwic3JjL2dlbi9zcGVjcy5qcyIsInNyYy9nbG9iYWxzLmpzIiwic3JjL3JhbmsvcmFuay5qcyIsInNyYy9yYW5rL3JhbmtFbmNvZGluZ3MuanMiLCJzcmMvdXRpbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUM3R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDeEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDdkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUM1RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUMvS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUM1TUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDcERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUN4SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDaEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUN2RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ2hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDN0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgIGhjbHVzdGVyOiByZXF1aXJlKFwiLi9oY2x1c3RlclwiKSxcbiAgIEttZWFuczogcmVxdWlyZShcIi4va21lYW5zXCIpLFxuICAga21lYW5zOiByZXF1aXJlKFwiLi9rbWVhbnNcIikua21lYW5zXG59OyIsIm1vZHVsZS5leHBvcnRzID0ge1xuICBldWNsaWRlYW46IGZ1bmN0aW9uKHYxLCB2Mikge1xuICAgICAgdmFyIHRvdGFsID0gMDtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdjEubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgIHRvdGFsICs9IE1hdGgucG93KHYyW2ldIC0gdjFbaV0sIDIpOyAgICAgIFxuICAgICAgfVxuICAgICAgcmV0dXJuIE1hdGguc3FydCh0b3RhbCk7XG4gICB9LFxuICAgbWFuaGF0dGFuOiBmdW5jdGlvbih2MSwgdjIpIHtcbiAgICAgdmFyIHRvdGFsID0gMDtcbiAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB2MS5sZW5ndGggOyBpKyspIHtcbiAgICAgICAgdG90YWwgKz0gTWF0aC5hYnModjJbaV0gLSB2MVtpXSk7ICAgICAgXG4gICAgIH1cbiAgICAgcmV0dXJuIHRvdGFsO1xuICAgfSxcbiAgIG1heDogZnVuY3Rpb24odjEsIHYyKSB7XG4gICAgIHZhciBtYXggPSAwO1xuICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHYxLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIG1heCA9IE1hdGgubWF4KG1heCAsIE1hdGguYWJzKHYyW2ldIC0gdjFbaV0pKTsgICAgICBcbiAgICAgfVxuICAgICByZXR1cm4gbWF4O1xuICAgfVxufTsiLCJ2YXIgZGlzdGFuY2VzID0gcmVxdWlyZShcIi4vZGlzdGFuY2VcIik7XG5cbnZhciBIaWVyYXJjaGljYWxDbHVzdGVyaW5nID0gZnVuY3Rpb24oZGlzdGFuY2UsIGxpbmthZ2UsIHRocmVzaG9sZCkge1xuICAgdGhpcy5kaXN0YW5jZSA9IGRpc3RhbmNlO1xuICAgdGhpcy5saW5rYWdlID0gbGlua2FnZTtcbiAgIHRoaXMudGhyZXNob2xkID0gdGhyZXNob2xkID09IHVuZGVmaW5lZCA/IEluZmluaXR5IDogdGhyZXNob2xkO1xufVxuXG5IaWVyYXJjaGljYWxDbHVzdGVyaW5nLnByb3RvdHlwZSA9IHtcbiAgIGNsdXN0ZXIgOiBmdW5jdGlvbihpdGVtcywgc25hcHNob3RQZXJpb2QsIHNuYXBzaG90Q2IpIHtcbiAgICAgIHRoaXMuY2x1c3RlcnMgPSBbXTtcbiAgICAgIHRoaXMuZGlzdHMgPSBbXTsgIC8vIGRpc3RhbmNlcyBiZXR3ZWVuIGVhY2ggcGFpciBvZiBjbHVzdGVyc1xuICAgICAgdGhpcy5taW5zID0gW107IC8vIGNsb3Nlc3QgY2x1c3RlciBmb3IgZWFjaCBjbHVzdGVyXG4gICAgICB0aGlzLmluZGV4ID0gW107IC8vIGtlZXAgYSBoYXNoIG9mIGFsbCBjbHVzdGVycyBieSBrZXlcbiAgICAgIFxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBpdGVtcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgdmFyIGNsdXN0ZXIgPSB7XG4gICAgICAgICAgICB2YWx1ZTogaXRlbXNbaV0sXG4gICAgICAgICAgICBrZXk6IGksXG4gICAgICAgICAgICBpbmRleDogaSxcbiAgICAgICAgICAgIHNpemU6IDFcbiAgICAgICAgIH07XG4gICAgICAgICB0aGlzLmNsdXN0ZXJzW2ldID0gY2x1c3RlcjtcbiAgICAgICAgIHRoaXMuaW5kZXhbaV0gPSBjbHVzdGVyO1xuICAgICAgICAgdGhpcy5kaXN0c1tpXSA9IFtdO1xuICAgICAgICAgdGhpcy5taW5zW2ldID0gMDtcbiAgICAgIH1cblxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmNsdXN0ZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8PSBpOyBqKyspIHtcbiAgICAgICAgICAgIHZhciBkaXN0ID0gKGkgPT0gaikgPyBJbmZpbml0eSA6IFxuICAgICAgICAgICAgICAgdGhpcy5kaXN0YW5jZSh0aGlzLmNsdXN0ZXJzW2ldLnZhbHVlLCB0aGlzLmNsdXN0ZXJzW2pdLnZhbHVlKTtcbiAgICAgICAgICAgIHRoaXMuZGlzdHNbaV1bal0gPSBkaXN0O1xuICAgICAgICAgICAgdGhpcy5kaXN0c1tqXVtpXSA9IGRpc3Q7XG5cbiAgICAgICAgICAgIGlmIChkaXN0IDwgdGhpcy5kaXN0c1tpXVt0aGlzLm1pbnNbaV1dKSB7XG4gICAgICAgICAgICAgICB0aGlzLm1pbnNbaV0gPSBqOyAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgfVxuICAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB2YXIgbWVyZ2VkID0gdGhpcy5tZXJnZUNsb3Nlc3QoKTtcbiAgICAgIHZhciBpID0gMDtcbiAgICAgIHdoaWxlIChtZXJnZWQpIHtcbiAgICAgICAgaWYgKHNuYXBzaG90Q2IgJiYgKGkrKyAlIHNuYXBzaG90UGVyaW9kKSA9PSAwKSB7XG4gICAgICAgICAgIHNuYXBzaG90Q2IodGhpcy5jbHVzdGVycyk7ICAgICAgICAgICBcbiAgICAgICAgfVxuICAgICAgICBtZXJnZWQgPSB0aGlzLm1lcmdlQ2xvc2VzdCgpO1xuICAgICAgfVxuICAgIFxuICAgICAgdGhpcy5jbHVzdGVycy5mb3JFYWNoKGZ1bmN0aW9uKGNsdXN0ZXIpIHtcbiAgICAgICAgLy8gY2xlYW4gdXAgbWV0YWRhdGEgdXNlZCBmb3IgY2x1c3RlcmluZ1xuICAgICAgICBkZWxldGUgY2x1c3Rlci5rZXk7XG4gICAgICAgIGRlbGV0ZSBjbHVzdGVyLmluZGV4O1xuICAgICAgfSk7XG5cbiAgICAgIHJldHVybiB0aGlzLmNsdXN0ZXJzO1xuICAgfSxcbiAgXG4gICBtZXJnZUNsb3Nlc3Q6IGZ1bmN0aW9uKCkge1xuICAgICAgLy8gZmluZCB0d28gY2xvc2VzdCBjbHVzdGVycyBmcm9tIGNhY2hlZCBtaW5zXG4gICAgICB2YXIgbWluS2V5ID0gMCwgbWluID0gSW5maW5pdHk7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuY2x1c3RlcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgIHZhciBrZXkgPSB0aGlzLmNsdXN0ZXJzW2ldLmtleSxcbiAgICAgICAgICAgICBkaXN0ID0gdGhpcy5kaXN0c1trZXldW3RoaXMubWluc1trZXldXTtcbiAgICAgICAgIGlmIChkaXN0IDwgbWluKSB7XG4gICAgICAgICAgICBtaW5LZXkgPSBrZXk7XG4gICAgICAgICAgICBtaW4gPSBkaXN0O1xuICAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKG1pbiA+PSB0aGlzLnRocmVzaG9sZCkge1xuICAgICAgICAgcmV0dXJuIGZhbHNlOyAgICAgICAgIFxuICAgICAgfVxuXG4gICAgICB2YXIgYzEgPSB0aGlzLmluZGV4W21pbktleV0sXG4gICAgICAgICAgYzIgPSB0aGlzLmluZGV4W3RoaXMubWluc1ttaW5LZXldXTtcblxuICAgICAgLy8gbWVyZ2UgdHdvIGNsb3Nlc3QgY2x1c3RlcnNcbiAgICAgIHZhciBtZXJnZWQgPSB7XG4gICAgICAgICBsZWZ0OiBjMSxcbiAgICAgICAgIHJpZ2h0OiBjMixcbiAgICAgICAgIGtleTogYzEua2V5LFxuICAgICAgICAgc2l6ZTogYzEuc2l6ZSArIGMyLnNpemVcbiAgICAgIH07XG5cbiAgICAgIHRoaXMuY2x1c3RlcnNbYzEuaW5kZXhdID0gbWVyZ2VkO1xuICAgICAgdGhpcy5jbHVzdGVycy5zcGxpY2UoYzIuaW5kZXgsIDEpO1xuICAgICAgdGhpcy5pbmRleFtjMS5rZXldID0gbWVyZ2VkO1xuXG4gICAgICAvLyB1cGRhdGUgZGlzdGFuY2VzIHdpdGggbmV3IG1lcmdlZCBjbHVzdGVyXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuY2x1c3RlcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgIHZhciBjaSA9IHRoaXMuY2x1c3RlcnNbaV07XG4gICAgICAgICB2YXIgZGlzdDtcbiAgICAgICAgIGlmIChjMS5rZXkgPT0gY2kua2V5KSB7XG4gICAgICAgICAgICBkaXN0ID0gSW5maW5pdHk7ICAgICAgICAgICAgXG4gICAgICAgICB9XG4gICAgICAgICBlbHNlIGlmICh0aGlzLmxpbmthZ2UgPT0gXCJzaW5nbGVcIikge1xuICAgICAgICAgICAgZGlzdCA9IHRoaXMuZGlzdHNbYzEua2V5XVtjaS5rZXldO1xuICAgICAgICAgICAgaWYgKHRoaXMuZGlzdHNbYzEua2V5XVtjaS5rZXldID4gdGhpcy5kaXN0c1tjMi5rZXldW2NpLmtleV0pIHtcbiAgICAgICAgICAgICAgIGRpc3QgPSB0aGlzLmRpc3RzW2MyLmtleV1bY2kua2V5XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgIH1cbiAgICAgICAgIGVsc2UgaWYgKHRoaXMubGlua2FnZSA9PSBcImNvbXBsZXRlXCIpIHtcbiAgICAgICAgICAgIGRpc3QgPSB0aGlzLmRpc3RzW2MxLmtleV1bY2kua2V5XTtcbiAgICAgICAgICAgIGlmICh0aGlzLmRpc3RzW2MxLmtleV1bY2kua2V5XSA8IHRoaXMuZGlzdHNbYzIua2V5XVtjaS5rZXldKSB7XG4gICAgICAgICAgICAgICBkaXN0ID0gdGhpcy5kaXN0c1tjMi5rZXldW2NpLmtleV07ICAgICAgICAgICAgICBcbiAgICAgICAgICAgIH1cbiAgICAgICAgIH1cbiAgICAgICAgIGVsc2UgaWYgKHRoaXMubGlua2FnZSA9PSBcImF2ZXJhZ2VcIikge1xuICAgICAgICAgICAgZGlzdCA9ICh0aGlzLmRpc3RzW2MxLmtleV1bY2kua2V5XSAqIGMxLnNpemVcbiAgICAgICAgICAgICAgICAgICArIHRoaXMuZGlzdHNbYzIua2V5XVtjaS5rZXldICogYzIuc2l6ZSkgLyAoYzEuc2l6ZSArIGMyLnNpemUpO1xuICAgICAgICAgfVxuICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBkaXN0ID0gdGhpcy5kaXN0YW5jZShjaS52YWx1ZSwgYzEudmFsdWUpOyAgICAgICAgICAgIFxuICAgICAgICAgfVxuXG4gICAgICAgICB0aGlzLmRpc3RzW2MxLmtleV1bY2kua2V5XSA9IHRoaXMuZGlzdHNbY2kua2V5XVtjMS5rZXldID0gZGlzdDtcbiAgICAgIH1cblxuICAgIFxuICAgICAgLy8gdXBkYXRlIGNhY2hlZCBtaW5zXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuY2x1c3RlcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgIHZhciBrZXkxID0gdGhpcy5jbHVzdGVyc1tpXS5rZXk7ICAgICAgICBcbiAgICAgICAgIGlmICh0aGlzLm1pbnNba2V5MV0gPT0gYzEua2V5IHx8IHRoaXMubWluc1trZXkxXSA9PSBjMi5rZXkpIHtcbiAgICAgICAgICAgIHZhciBtaW4gPSBrZXkxO1xuICAgICAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCB0aGlzLmNsdXN0ZXJzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICB2YXIga2V5MiA9IHRoaXMuY2x1c3RlcnNbal0ua2V5O1xuICAgICAgICAgICAgICAgaWYgKHRoaXMuZGlzdHNba2V5MV1ba2V5Ml0gPCB0aGlzLmRpc3RzW2tleTFdW21pbl0pIHtcbiAgICAgICAgICAgICAgICAgIG1pbiA9IGtleTI7ICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLm1pbnNba2V5MV0gPSBtaW47XG4gICAgICAgICB9XG4gICAgICAgICB0aGlzLmNsdXN0ZXJzW2ldLmluZGV4ID0gaTtcbiAgICAgIH1cbiAgICBcbiAgICAgIC8vIGNsZWFuIHVwIG1ldGFkYXRhIHVzZWQgZm9yIGNsdXN0ZXJpbmdcbiAgICAgIGRlbGV0ZSBjMS5rZXk7IGRlbGV0ZSBjMi5rZXk7XG4gICAgICBkZWxldGUgYzEuaW5kZXg7IGRlbGV0ZSBjMi5pbmRleDtcblxuICAgICAgcmV0dXJuIHRydWU7XG4gICB9XG59XG5cbnZhciBoY2x1c3RlciA9IGZ1bmN0aW9uKGl0ZW1zLCBkaXN0YW5jZSwgbGlua2FnZSwgdGhyZXNob2xkLCBzbmFwc2hvdCwgc25hcHNob3RDYWxsYmFjaykge1xuICAgZGlzdGFuY2UgPSBkaXN0YW5jZSB8fCBcImV1Y2xpZGVhblwiO1xuICAgbGlua2FnZSA9IGxpbmthZ2UgfHwgXCJhdmVyYWdlXCI7XG5cbiAgIGlmICh0eXBlb2YgZGlzdGFuY2UgPT0gXCJzdHJpbmdcIikge1xuICAgICBkaXN0YW5jZSA9IGRpc3RhbmNlc1tkaXN0YW5jZV07XG4gICB9XG4gICB2YXIgY2x1c3RlcnMgPSAobmV3IEhpZXJhcmNoaWNhbENsdXN0ZXJpbmcoZGlzdGFuY2UsIGxpbmthZ2UsIHRocmVzaG9sZCkpXG4gICAgICAgICAgICAgICAgICAuY2x1c3RlcihpdGVtcywgc25hcHNob3QsIHNuYXBzaG90Q2FsbGJhY2spO1xuICAgICAgXG4gICBpZiAodGhyZXNob2xkID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBjbHVzdGVyc1swXTsgLy8gYWxsIGNsdXN0ZXJlZCBpbnRvIG9uZVxuICAgfVxuICAgcmV0dXJuIGNsdXN0ZXJzO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGhjbHVzdGVyO1xuIiwidmFyIGRpc3RhbmNlcyA9IHJlcXVpcmUoXCIuL2Rpc3RhbmNlXCIpO1xuXG5mdW5jdGlvbiBLTWVhbnMoY2VudHJvaWRzKSB7XG4gICB0aGlzLmNlbnRyb2lkcyA9IGNlbnRyb2lkcyB8fCBbXTtcbn1cblxuS01lYW5zLnByb3RvdHlwZS5yYW5kb21DZW50cm9pZHMgPSBmdW5jdGlvbihwb2ludHMsIGspIHtcbiAgIHZhciBjZW50cm9pZHMgPSBwb2ludHMuc2xpY2UoMCk7IC8vIGNvcHlcbiAgIGNlbnRyb2lkcy5zb3J0KGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIChNYXRoLnJvdW5kKE1hdGgucmFuZG9tKCkpIC0gMC41KTtcbiAgIH0pO1xuICAgcmV0dXJuIGNlbnRyb2lkcy5zbGljZSgwLCBrKTtcbn1cblxuS01lYW5zLnByb3RvdHlwZS5jbGFzc2lmeSA9IGZ1bmN0aW9uKHBvaW50LCBkaXN0YW5jZSkge1xuICAgdmFyIG1pbiA9IEluZmluaXR5LFxuICAgICAgIGluZGV4ID0gMDtcblxuICAgZGlzdGFuY2UgPSBkaXN0YW5jZSB8fCBcImV1Y2xpZGVhblwiO1xuICAgaWYgKHR5cGVvZiBkaXN0YW5jZSA9PSBcInN0cmluZ1wiKSB7XG4gICAgICBkaXN0YW5jZSA9IGRpc3RhbmNlc1tkaXN0YW5jZV07XG4gICB9XG5cbiAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5jZW50cm9pZHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBkaXN0ID0gZGlzdGFuY2UocG9pbnQsIHRoaXMuY2VudHJvaWRzW2ldKTtcbiAgICAgIGlmIChkaXN0IDwgbWluKSB7XG4gICAgICAgICBtaW4gPSBkaXN0O1xuICAgICAgICAgaW5kZXggPSBpO1xuICAgICAgfVxuICAgfVxuXG4gICByZXR1cm4gaW5kZXg7XG59XG5cbktNZWFucy5wcm90b3R5cGUuY2x1c3RlciA9IGZ1bmN0aW9uKHBvaW50cywgaywgZGlzdGFuY2UsIHNuYXBzaG90UGVyaW9kLCBzbmFwc2hvdENiKSB7XG4gICBrID0gayB8fCBNYXRoLm1heCgyLCBNYXRoLmNlaWwoTWF0aC5zcXJ0KHBvaW50cy5sZW5ndGggLyAyKSkpO1xuXG4gICBkaXN0YW5jZSA9IGRpc3RhbmNlIHx8IFwiZXVjbGlkZWFuXCI7XG4gICBpZiAodHlwZW9mIGRpc3RhbmNlID09IFwic3RyaW5nXCIpIHtcbiAgICAgIGRpc3RhbmNlID0gZGlzdGFuY2VzW2Rpc3RhbmNlXTtcbiAgIH1cblxuICAgdGhpcy5jZW50cm9pZHMgPSB0aGlzLnJhbmRvbUNlbnRyb2lkcyhwb2ludHMsIGspO1xuXG4gICB2YXIgYXNzaWdubWVudCA9IG5ldyBBcnJheShwb2ludHMubGVuZ3RoKTtcbiAgIHZhciBjbHVzdGVycyA9IG5ldyBBcnJheShrKTtcblxuICAgdmFyIGl0ZXJhdGlvbnMgPSAwO1xuICAgdmFyIG1vdmVtZW50ID0gdHJ1ZTtcbiAgIHdoaWxlIChtb3ZlbWVudCkge1xuICAgICAgLy8gdXBkYXRlIHBvaW50LXRvLWNlbnRyb2lkIGFzc2lnbm1lbnRzXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBvaW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgYXNzaWdubWVudFtpXSA9IHRoaXMuY2xhc3NpZnkocG9pbnRzW2ldLCBkaXN0YW5jZSk7XG4gICAgICB9XG5cbiAgICAgIC8vIHVwZGF0ZSBsb2NhdGlvbiBvZiBlYWNoIGNlbnRyb2lkXG4gICAgICBtb3ZlbWVudCA9IGZhbHNlO1xuICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBrOyBqKyspIHtcbiAgICAgICAgIHZhciBhc3NpZ25lZCA9IFtdO1xuICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhc3NpZ25tZW50Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAoYXNzaWdubWVudFtpXSA9PSBqKSB7XG4gICAgICAgICAgICAgICBhc3NpZ25lZC5wdXNoKHBvaW50c1tpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICB9XG5cbiAgICAgICAgIGlmICghYXNzaWduZWQubGVuZ3RoKSB7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgIH1cblxuICAgICAgICAgdmFyIGNlbnRyb2lkID0gdGhpcy5jZW50cm9pZHNbal07XG4gICAgICAgICB2YXIgbmV3Q2VudHJvaWQgPSBuZXcgQXJyYXkoY2VudHJvaWQubGVuZ3RoKTtcblxuICAgICAgICAgZm9yICh2YXIgZyA9IDA7IGcgPCBjZW50cm9pZC5sZW5ndGg7IGcrKykge1xuICAgICAgICAgICAgdmFyIHN1bSA9IDA7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFzc2lnbmVkLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICBzdW0gKz0gYXNzaWduZWRbaV1bZ107XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBuZXdDZW50cm9pZFtnXSA9IHN1bSAvIGFzc2lnbmVkLmxlbmd0aDtcblxuICAgICAgICAgICAgaWYgKG5ld0NlbnRyb2lkW2ddICE9IGNlbnRyb2lkW2ddKSB7XG4gICAgICAgICAgICAgICBtb3ZlbWVudCA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICB9XG5cbiAgICAgICAgIHRoaXMuY2VudHJvaWRzW2pdID0gbmV3Q2VudHJvaWQ7XG4gICAgICAgICBjbHVzdGVyc1tqXSA9IGFzc2lnbmVkO1xuICAgICAgfVxuXG4gICAgICBpZiAoc25hcHNob3RDYiAmJiAoaXRlcmF0aW9ucysrICUgc25hcHNob3RQZXJpb2QgPT0gMCkpIHtcbiAgICAgICAgIHNuYXBzaG90Q2IoY2x1c3RlcnMpO1xuICAgICAgfVxuICAgfVxuXG4gICByZXR1cm4gY2x1c3RlcnM7XG59XG5cbktNZWFucy5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24oKSB7XG4gICByZXR1cm4gSlNPTi5zdHJpbmdpZnkodGhpcy5jZW50cm9pZHMpO1xufVxuXG5LTWVhbnMucHJvdG90eXBlLmZyb21KU09OID0gZnVuY3Rpb24oanNvbikge1xuICAgdGhpcy5jZW50cm9pZHMgPSBKU09OLnBhcnNlKGpzb24pO1xuICAgcmV0dXJuIHRoaXM7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gS01lYW5zO1xuXG5tb2R1bGUuZXhwb3J0cy5rbWVhbnMgPSBmdW5jdGlvbih2ZWN0b3JzLCBrKSB7XG4gICByZXR1cm4gKG5ldyBLTWVhbnMoKSkuY2x1c3Rlcih2ZWN0b3JzLCBrKTtcbn0iLCIndXNlIHN0cmljdCc7XG5cbi8vIGRlY2xhcmUgZ2xvYmFsIGNvbnN0YW50XG52YXIgZyA9IGdsb2JhbCB8fCB3aW5kb3c7XG5cbmcuQUdHUkVHQVRFID0gJ2FnZ3JlZ2F0ZSc7XG5nLlJBVyA9ICdyYXcnO1xuZy5TVEFDS0VEID0gJ3N0YWNrZWQnO1xuZy5JTkRFWCA9ICdpbmRleCc7XG5cbmcuWCA9ICd4JztcbmcuWSA9ICd5JztcbmcuUk9XID0gJ3Jvdyc7XG5nLkNPTCA9ICdjb2wnO1xuZy5TSVpFID0gJ3NpemUnO1xuZy5TSEFQRSA9ICdzaGFwZSc7XG5nLkNPTE9SID0gJ2NvbG9yJztcbmcuVEVYVCA9ICd0ZXh0JztcbmcuREVUQUlMID0gJ2RldGFpbCc7XG5cbmcuTiA9ICdOJztcbmcuTyA9ICdPJztcbmcuUSA9ICdRJztcbmcuVCA9ICdUJztcbiIsIlwidXNlIHN0cmljdFwiO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGNsdXN0ZXI7XG5cbnZhciB2bCA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93Wyd2bCddIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbFsndmwnXSA6IG51bGwpLFxuICBjbHVzdGVyZmNrID0gcmVxdWlyZSgnY2x1c3RlcmZjaycpLFxuICBjb25zdHMgPSByZXF1aXJlKCcuL2NsdXN0ZXJjb25zdHMnKSxcbiAgdXRpbCA9IHJlcXVpcmUoJy4uL3V0aWwnKTtcblxuY2x1c3Rlci5kaXN0YW5jZSA9IHJlcXVpcmUoJy4vZGlzdGFuY2UnKTtcblxuZnVuY3Rpb24gY2x1c3RlcihzcGVjcywgb3B0KSB7XG4gIC8vIGpzaGludCB1bnVzZWQ6ZmFsc2VcbiAgdmFyIGRpc3QgPSBjbHVzdGVyLmRpc3RhbmNlLnRhYmxlKHNwZWNzKTtcblxuICB2YXIgY2x1c3RlclRyZWVzID0gY2x1c3RlcmZjay5oY2x1c3RlcihzcGVjcywgZnVuY3Rpb24oZTEsIGUyKSB7XG4gICAgdmFyIHMxID0gdmwuRW5jb2Rpbmcuc2hvcnRoYW5kKGUxKSxcbiAgICAgIHMyID0gdmwuRW5jb2Rpbmcuc2hvcnRoYW5kKGUyKTtcbiAgICByZXR1cm4gZGlzdFtzMV1bczJdO1xuICB9LCAnYXZlcmFnZScsIGNvbnN0cy5DTFVTVEVSX1RIUkVTSE9MRCk7XG5cbiAgdmFyIGNsdXN0ZXJzID0gY2x1c3RlclRyZWVzLm1hcChmdW5jdGlvbih0cmVlKSB7XG4gICAgICByZXR1cm4gdXRpbC50cmF2ZXJzZSh0cmVlLCBbXSk7XG4gICAgfSlcbiAgIC5tYXAoZnVuY3Rpb24oY2x1c3Rlcikge1xuICAgIHJldHVybiBjbHVzdGVyLnNvcnQoZnVuY3Rpb24oc3BlYzEsIHNwZWMyKSB7XG4gICAgICAvLyBzb3J0IGVhY2ggY2x1c3RlciAtLSBoYXZlIHRoZSBoaWdoZXN0IHNjb3JlIGFzIDFzdCBpdGVtXG4gICAgICByZXR1cm4gc3BlYzIuX2luZm8uc2NvcmUgLSBzcGVjMS5faW5mby5zY29yZTtcbiAgICB9KTtcbiAgfSkuZmlsdGVyKGZ1bmN0aW9uKGNsdXN0ZXIpIHsgIC8vIGZpbHRlciBlbXB0eSBjbHVzdGVyXG4gICAgcmV0dXJuIGNsdXN0ZXIubGVuZ3RoID4wO1xuICB9KS5zb3J0KGZ1bmN0aW9uKGNsdXN0ZXIxLCBjbHVzdGVyMikge1xuICAgIC8vc29ydCBieSBoaWdoZXN0IHNjb3JpbmcgaXRlbSBpbiBlYWNoIGNsdXN0ZXJcbiAgICByZXR1cm4gY2x1c3RlcjJbMF0uX2luZm8uc2NvcmUgLSBjbHVzdGVyMVswXS5faW5mby5zY29yZTtcbiAgfSk7XG5cbiAgY2x1c3RlcnMuZGlzdCA9IGRpc3Q7IC8vYXBwZW5kIGRpc3QgaW4gdGhlIGFycmF5IGZvciBkZWJ1Z2dpbmdcblxuICByZXR1cm4gY2x1c3RlcnM7XG59IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgYyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbmMuU1dBUFBBQkxFID0gMC4wNTtcbmMuRElTVF9NSVNTSU5HID0gMTtcbmMuQ0xVU1RFUl9USFJFU0hPTEQgPSAxO1xuXG5mdW5jdGlvbiByZWR1Y2VUdXBsZVRvVGFibGUociwgeCkge1xuICB2YXIgYSA9IHhbMF0sIGIgPSB4WzFdLCBkID0geFsyXTtcbiAgclthXSA9IHJbYV0gfHwge307XG4gIHJbYl0gPSByW2JdIHx8IHt9O1xuICByW2FdW2JdID0gcltiXVthXSA9IGQ7XG4gIHJldHVybiByO1xufVxuXG5jLkRJU1RfQllfRU5DVFlQRSA9IFtcbiAgLy8gcG9zaXRpb25hbFxuICBbJ3gnLCAneScsIGMuU1dBUFBBQkxFXSxcbiAgWydyb3cnLCAnY29sJywgYy5TV0FQUEFCTEVdLFxuXG4gIC8vIG9yZGluYWwgbWFyayBwcm9wZXJ0aWVzXG4gIFsnY29sb3InLCAnc2hhcGUnLCBjLlNXQVBQQUJMRV0sXG4gIFsnY29sb3InLCAnZGV0YWlsJywgYy5TV0FQUEFCTEVdLFxuICBbJ2RldGFpbCcsICdzaGFwZScsIGMuU1dBUFBBQkxFXSxcblxuICAvLyBxdWFudGl0YXRpdmUgbWFyayBwcm9wZXJ0aWVzXG4gIFsnc2l6ZScsICdjb2xvcicsIGMuU1dBUFBBQkxFXVxuXS5yZWR1Y2UocmVkdWNlVHVwbGVUb1RhYmxlLCB7fSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciB2bCA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93Wyd2bCddIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbFsndmwnXSA6IG51bGwpLFxuICBjb25zdHMgPSByZXF1aXJlKCcuL2NsdXN0ZXJjb25zdHMnKSxcbiAgdXRpbCA9IHJlcXVpcmUoJy4uL3V0aWwnKTtcblxudmFyIGRpc3RhbmNlID0ge307XG5tb2R1bGUuZXhwb3J0cyA9IGRpc3RhbmNlO1xuXG5kaXN0YW5jZS50YWJsZSA9IGZ1bmN0aW9uIChzcGVjcykge1xuICB2YXIgbGVuID0gc3BlY3MubGVuZ3RoLFxuICAgIGV4dGVuZGVkU3BlY3MgPSBzcGVjcy5tYXAoZnVuY3Rpb24oZSkgeyByZXR1cm4gZGlzdGFuY2UuZXh0ZW5kU3BlY1dpdGhFbmNUeXBlQnlDb2x1bW5OYW1lKGUpOyB9KSxcbiAgICBzaG9ydGhhbmRzID0gc3BlY3MubWFwKHZsLkVuY29kaW5nLnNob3J0aGFuZCksXG4gICAgZGlmZiA9IHt9LCBpLCBqO1xuXG4gIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKykgZGlmZltzaG9ydGhhbmRzW2ldXSA9IHt9O1xuXG4gIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgIGZvciAoaiA9IGkgKyAxOyBqIDwgbGVuOyBqKyspIHtcbiAgICAgIHZhciBzaiA9IHNob3J0aGFuZHNbal0sIHNpID0gc2hvcnRoYW5kc1tpXTtcblxuICAgICAgZGlmZltzal1bc2ldID0gZGlmZltzaV1bc2pdID0gZGlzdGFuY2UuZ2V0KGV4dGVuZGVkU3BlY3NbaV0sIGV4dGVuZGVkU3BlY3Nbal0pO1xuICAgIH1cbiAgfVxuICByZXR1cm4gZGlmZjtcbn07XG5cbmRpc3RhbmNlLmdldCA9IGZ1bmN0aW9uIChleHRlbmRlZFNwZWMxLCBleHRlbmRlZFNwZWMyKSB7XG4gIHZhciBjb2xzID0gdXRpbC51bmlvbih2bC5rZXlzKGV4dGVuZGVkU3BlYzEuZW5jVHlwZUJ5RmllbGQpLCB2bC5rZXlzKGV4dGVuZGVkU3BlYzIuZW5jVHlwZUJ5RmllbGQpKSxcbiAgICBkaXN0ID0gMDtcblxuICBjb2xzLmZvckVhY2goZnVuY3Rpb24oY29sKSB7XG4gICAgdmFyIGUxID0gZXh0ZW5kZWRTcGVjMS5lbmNUeXBlQnlGaWVsZFtjb2xdLCBlMiA9IGV4dGVuZGVkU3BlYzIuZW5jVHlwZUJ5RmllbGRbY29sXTtcblxuICAgIGlmIChlMSAmJiBlMikge1xuICAgICAgaWYgKGUxLmVuY1R5cGUgIT0gZTIuZW5jVHlwZSkge1xuICAgICAgICBkaXN0ICs9IChjb25zdHMuRElTVF9CWV9FTkNUWVBFW2UxLmVuY1R5cGVdIHx8IHt9KVtlMi5lbmNUeXBlXSB8fCAxO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBkaXN0ICs9IGNvbnN0cy5ESVNUX01JU1NJTkc7XG4gICAgfVxuICB9KTtcblxuICAvLyBkbyBub3QgZ3JvdXAgc3RhY2tlZCBjaGFydCB3aXRoIHNpbWlsYXIgbm9uLXN0YWNrZWQgY2hhcnQhXG4gIHZhciBpc1N0YWNrMSA9IHZsLkVuY29kaW5nLmlzU3RhY2soZXh0ZW5kZWRTcGVjMSksXG4gICAgaXNTdGFjazIgPSB2bC5FbmNvZGluZy5pc1N0YWNrKGV4dGVuZGVkU3BlYzIpO1xuXG4gIGlmKGlzU3RhY2sxIHx8IGlzU3RhY2syKSB7XG4gICAgaWYoaXNTdGFjazEgJiYgaXNTdGFjazIpIHtcbiAgICAgIGlmKGV4dGVuZGVkU3BlYzEuZW5jb2RpbmcuY29sb3IubmFtZSAhPT0gZXh0ZW5kZWRTcGVjMi5lbmNvZGluZy5jb2xvci5uYW1lKSB7XG4gICAgICAgIGRpc3QrPTE7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGRpc3QrPTE7IC8vIHN1cmVseSBkaWZmZXJlbnRcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGRpc3Q7XG59O1xuXG4vLyBnZXQgZW5jb2RpbmcgdHlwZSBieSBmaWVsZG5hbWVcbmRpc3RhbmNlLmV4dGVuZFNwZWNXaXRoRW5jVHlwZUJ5Q29sdW1uTmFtZSA9IGZ1bmN0aW9uKHNwZWMpIHtcbiAgdmFyIF9lbmNUeXBlQnlGaWVsZCA9IHt9LFxuICAgIGVuY29kaW5nID0gc3BlYy5lbmNvZGluZztcblxuICB2bC5rZXlzKGVuY29kaW5nKS5mb3JFYWNoKGZ1bmN0aW9uKGVuY1R5cGUpIHtcbiAgICB2YXIgZSA9IHZsLmR1cGxpY2F0ZShlbmNvZGluZ1tlbmNUeXBlXSk7XG4gICAgZS5lbmNUeXBlID0gZW5jVHlwZTtcbiAgICBfZW5jVHlwZUJ5RmllbGRbZS5uYW1lIHx8ICcnXSA9IGU7XG4gICAgZGVsZXRlIGUubmFtZTtcbiAgfSk7XG5cbiAgcmV0dXJuIHtcbiAgICBtYXJrdHlwZTogc3BlYy5tYXJrdHlwZSxcbiAgICBlbmNUeXBlQnlGaWVsZDogX2VuY1R5cGVCeUZpZWxkLFxuICAgIGVuY29kaW5nOiBzcGVjLmVuY29kaW5nXG4gIH07XG59OyIsIid1c2Ugc3RyaWN0JztcblxudmFyIGNvbnN0cyA9IG1vZHVsZS5leHBvcnRzID0ge1xuICBnZW46IHt9LFxuICBjbHVzdGVyOiB7fSxcbiAgcmFuazoge31cbn07XG5cbmNvbnN0cy5nZW4ucHJvamVjdGlvbnMgPSB7XG4gIHR5cGU6ICdvYmplY3QnLFxuICBwcm9wZXJ0aWVzOiB7XG4gICAgb21pdERvdFBsb3Q6IHsgLy9GSVhNRSByZW1vdmUgdGhpcyFcbiAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgICAgZGVzY3JpcHRpb246ICdyZW1vdmUgYWxsIGRvdCBwbG90cydcbiAgICB9LFxuICAgIG1heENhcmRpbmFsaXR5Rm9yQXV0b0FkZE9yZGluYWw6IHtcbiAgICAgIHR5cGU6ICdpbnRlZ2VyJyxcbiAgICAgIGRlZmF1bHQ6IDUwLFxuICAgICAgZGVzY3JpcHRpb246ICdtYXggY2FyZGluYWxpdHkgZm9yIG9yZGluYWwgZmllbGQgdG8gYmUgY29uc2lkZXJlZCBmb3IgYXV0byBhZGRpbmcnXG4gICAgfSxcbiAgICBhbHdheXNBZGRIaXN0b2dyYW06IHtcbiAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgIGRlZmF1bHQ6IHRydWVcbiAgICB9XG4gIH1cbn07XG5cbmNvbnN0cy5nZW4uYWdncmVnYXRlcyA9IHtcbiAgdHlwZTogJ29iamVjdCcsXG4gIHByb3BlcnRpZXM6IHtcbiAgICBjb25maWc6IHtcbiAgICAgIHR5cGU6ICdvYmplY3QnXG4gICAgfSxcbiAgICBkYXRhOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0J1xuICAgIH0sXG4gICAgdGFibGVUeXBlczoge1xuICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgZGVmYXVsdDogJ2JvdGgnLFxuICAgICAgZW51bTogWydib3RoJywgJ2FnZ3JlZ2F0ZWQnLCAnZGlzYWdncmVnYXRlZCddXG4gICAgfSxcbiAgICBnZW5EaW1ROiB7XG4gICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgIGRlZmF1bHQ6ICdhdXRvJyxcbiAgICAgIGVudW06IFsnYXV0bycsICdiaW4nLCAnY2FzdCcsICdub25lJ10sXG4gICAgICBkZXNjcmlwdGlvbjogJ1VzZSBRIGFzIERpbWVuc2lvbiBlaXRoZXIgYnkgYmlubmluZyBvciBjYXN0aW5nJ1xuICAgIH0sXG4gICAgbWluQ2FyZGluYWxpdHlGb3JCaW46IHtcbiAgICAgIHR5cGU6ICdpbnRlZ2VyJyxcbiAgICAgIGRlZmF1bHQ6IDIwLFxuICAgICAgZGVzY3JpcHRpb246ICdtaW5pbXVtIGNhcmRpbmFsaXR5IG9mIGEgZmllbGQgaWYgd2Ugd2VyZSB0byBiaW4nXG4gICAgfSxcbiAgICBvbWl0RG90UGxvdDoge1xuICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgZGVmYXVsdDogZmFsc2UsXG4gICAgICBkZXNjcmlwdGlvbjogJ3JlbW92ZSBhbGwgZG90IHBsb3RzJ1xuICAgIH0sXG4gICAgb21pdE1lYXN1cmVPbmx5OiB7XG4gICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICBkZWZhdWx0OiBmYWxzZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnT21pdCBhZ2dyZWdhdGlvbiB3aXRoIG1lYXN1cmUocykgb25seSdcbiAgICB9LFxuICAgIG9taXREaW1lbnNpb25Pbmx5OiB7XG4gICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICBkZWZhdWx0OiB0cnVlLFxuICAgICAgZGVzY3JpcHRpb246ICdPbWl0IGFnZ3JlZ2F0aW9uIHdpdGggZGltZW5zaW9uKHMpIG9ubHknXG4gICAgfSxcbiAgICBhZGRDb3VudEZvckRpbWVuc2lvbk9ubHk6IHtcbiAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgIGRlZmF1bHQ6IHRydWUsXG4gICAgICBkZXNjcmlwdGlvbjogJ0FkZCBjb3VudCB3aGVuIHRoZXJlIGFyZSBkaW1lbnNpb24ocykgb25seSdcbiAgICB9LFxuICAgIGFnZ3JMaXN0OiB7XG4gICAgICB0eXBlOiAnYXJyYXknLFxuICAgICAgaXRlbXM6IHtcbiAgICAgICAgdHlwZTogWydzdHJpbmcnXVxuICAgICAgfSxcbiAgICAgIGRlZmF1bHQ6IFt1bmRlZmluZWQsICdtZWFuJ11cbiAgICB9LFxuICAgIHRpbWVVbml0TGlzdDoge1xuICAgICAgdHlwZTogJ2FycmF5JyxcbiAgICAgIGl0ZW1zOiB7XG4gICAgICAgIHR5cGU6IFsnc3RyaW5nJ11cbiAgICAgIH0sXG4gICAgICBkZWZhdWx0OiBbJ3llYXInXVxuICAgIH0sXG4gICAgY29uc2lzdGVudEF1dG9ROiB7XG4gICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICBkZWZhdWx0OiB0cnVlLFxuICAgICAgZGVzY3JpcHRpb246IFwiZ2VuZXJhdGUgc2ltaWxhciBhdXRvIHRyYW5zZm9ybSBmb3IgcXVhbnRcIlxuICAgIH1cbiAgfVxufTtcblxuY29uc3RzLmdlbi5lbmNvZGluZ3MgPSB7XG4gIHR5cGU6ICdvYmplY3QnLFxuICBwcm9wZXJ0aWVzOiB7XG4gICAgbWFya3R5cGVMaXN0OiB7XG4gICAgICB0eXBlOiAnYXJyYXknLFxuICAgICAgaXRlbXM6IHt0eXBlOiAnc3RyaW5nJ30sXG4gICAgICBkZWZhdWx0OiBbJ3BvaW50JywgJ2JhcicsICdsaW5lJywgJ2FyZWEnLCAndGV4dCcsICd0aWNrJ10sIC8vZmlsbGVkX21hcFxuICAgICAgZGVzY3JpcHRpb246ICdhbGxvd2VkIG1hcmt0eXBlcydcbiAgICB9LFxuICAgIGVuY29kaW5nVHlwZUxpc3Q6IHtcbiAgICAgIHR5cGU6ICdhcnJheScsXG4gICAgICBpdGVtczoge3R5cGU6ICdzdHJpbmcnfSxcbiAgICAgIGRlZmF1bHQ6IFsneCcsICd5JywgJ3JvdycsICdjb2wnLCAnc2l6ZScsICdjb2xvcicsICd0ZXh0JywgJ2RldGFpbCddLFxuICAgICAgZGVzY3JpcHRpb246ICdhbGxvd2VkIGVuY29kaW5nIHR5cGVzJ1xuICAgIH0sXG4gICAgbWF4R29vZENhcmRpbmFsaXR5Rm9yRmFjZXRzOiB7XG4gICAgICB0eXBlOiAnaW50ZWdlcicsXG4gICAgICBkZWZhdWx0OiA1LFxuICAgICAgZGVzY3JpcHRpb246ICdtYXhpbXVtIGNhcmRpbmFsaXR5IG9mIGEgZmllbGQgdG8gYmUgcHV0IG9uIGZhY2V0IChyb3cvY29sKSBlZmZlY3RpdmVseSdcbiAgICB9LFxuICAgIG1heENhcmRpbmFsaXR5Rm9yRmFjZXRzOiB7XG4gICAgICB0eXBlOiAnaW50ZWdlcicsXG4gICAgICBkZWZhdWx0OiAyMCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnbWF4aW11bSBjYXJkaW5hbGl0eSBvZiBhIGZpZWxkIHRvIGJlIHB1dCBvbiBmYWNldCAocm93L2NvbCknXG4gICAgfSxcbiAgICBtYXhHb29kQ2FyZGluYWxpdHlGb3JDb2xvcjoge1xuICAgICAgdHlwZTogJ2ludGVnZXInLFxuICAgICAgZGVmYXVsdDogNyxcbiAgICAgIGRlc2NyaXB0aW9uOiAnbWF4aW11bSBjYXJkaW5hbGl0eSBvZiBhbiBvcmRpbmFsIGZpZWxkIHRvIGJlIHB1dCBvbiBjb2xvciBlZmZlY3RpdmVseSdcbiAgICB9LFxuICAgIG1heENhcmRpbmFsaXR5Rm9yQ29sb3I6IHtcbiAgICAgIHR5cGU6ICdpbnRlZ2VyJyxcbiAgICAgIGRlZmF1bHQ6IDIwLFxuICAgICAgZGVzY3JpcHRpb246ICdtYXhpbXVtIGNhcmRpbmFsaXR5IG9mIGFuIG9yZGluYWwgZmllbGQgdG8gYmUgcHV0IG9uIGNvbG9yJ1xuICAgIH0sXG4gICAgbWF4Q2FyZGluYWxpdHlGb3JTaGFwZToge1xuICAgICAgdHlwZTogJ2ludGVnZXInLFxuICAgICAgZGVmYXVsdDogNixcbiAgICAgIGRlc2NyaXB0aW9uOiAnbWF4aW11bSBjYXJkaW5hbGl0eSBvZiBhbiBvcmRpbmFsIGZpZWxkIHRvIGJlIHB1dCBvbiBzaGFwZSdcbiAgICB9LFxuICAgIG9taXRUcmFucG9zZTogIHtcbiAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgIGRlZmF1bHQ6IHRydWUsXG4gICAgICBkZXNjcmlwdGlvbjogJ0VsaW1pbmF0ZSBhbGwgdHJhbnNwb3NlIGJ5ICgxKSBrZWVwaW5nIGhvcml6b250YWwgZG90IHBsb3Qgb25seSAoMikgZm9yIE94USBjaGFydHMsIGFsd2F5cyBwdXQgTyBvbiBZICgzKSBzaG93IG9ubHkgb25lIER4RCwgTXhNIChjdXJyZW50bHkgc29ydGVkIGJ5IG5hbWUpJ1xuICAgIH0sXG4gICAgb21pdERvdFBsb3Q6IHtcbiAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgICAgZGVzY3JpcHRpb246ICdyZW1vdmUgYWxsIGRvdCBwbG90cydcbiAgICB9LFxuICAgIG9taXREb3RQbG90V2l0aEV4dHJhRW5jb2Rpbmc6IHtcbiAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgIGRlZmF1bHQ6IHRydWUsXG4gICAgICBkZXNjcmlwdGlvbjogJ3JlbW92ZSBhbGwgZG90IHBsb3RzIHdpdGggPjEgZW5jb2RpbmcnXG4gICAgfSxcbiAgICBvbWl0TXVsdGlwbGVSZXRpbmFsRW5jb2RpbmdzOiB7XG4gICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICBkZWZhdWx0OiB0cnVlLFxuICAgICAgZGVzY3JpcHRpb246ICdvbWl0IHVzaW5nIG11bHRpcGxlIHJldGluYWwgdmFyaWFibGVzIChzaXplLCBjb2xvciwgc2hhcGUpJ1xuICAgIH0sXG4gICAgb21pdE5vblRleHRBZ2dyV2l0aEFsbERpbXNPbkZhY2V0czoge1xuICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgZGVmYXVsdDogdHJ1ZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAncmVtb3ZlIGFsbCBhZ2dyZWdhdGVkIGNoYXJ0cyAoZXhjZXB0IHRleHQgdGFibGVzKSB3aXRoIGFsbCBkaW1zIG9uIGZhY2V0cyAocm93LCBjb2wpJ1xuICAgIH0sXG4gICAgb21pdE9uZURpbWVuc2lvbkNvdW50OiB7XG4gICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICBkZWZhdWx0OiBmYWxzZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnb21pdCBvbmUgZGltZW5zaW9uIGNvdW50J1xuICAgIH0sXG4gICAgb21pdFNpemVPbkJhcjoge1xuICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgZGVmYXVsdDogZmFsc2UsXG4gICAgICBkZXNjcmlwdGlvbjogJ2RvIG5vdCB1c2UgYmFyXFwncyBzaXplJ1xuICAgIH0sXG4gICAgb21pdFN0YWNrZWRBdmVyYWdlOiB7XG4gICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICBkZWZhdWx0OiB0cnVlLFxuICAgICAgZGVzY3JpcHRpb246ICdkbyBub3Qgc3RhY2sgYmFyIGNoYXJ0IHdpdGggYXZlcmFnZSdcbiAgICB9LFxuICAgIGFsd2F5c0dlbmVyYXRlVGFibGVBc0hlYXRtYXA6IHtcbiAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgIGRlZmF1bHQ6IHRydWVcbiAgICB9XG4gIH1cbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgY29uc3RzOiByZXF1aXJlKCcuL2NvbnN0cycpLFxuICBjbHVzdGVyOiByZXF1aXJlKCcuL2NsdXN0ZXIvY2x1c3RlcicpLFxuICBnZW46IHJlcXVpcmUoJy4vZ2VuL2dlbicpLFxuICByYW5rOiByZXF1aXJlKCcuL3JhbmsvcmFuaycpLFxuICB1dGlsOiByZXF1aXJlKCcuL3V0aWwnKSxcbiAgYXV0bzogXCItLCBzdW1cIlxufTtcblxuXG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciB2bCA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93Wyd2bCddIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbFsndmwnXSA6IG51bGwpO1xuXG52YXIgY29uc3RzID0gcmVxdWlyZSgnLi4vY29uc3RzJyk7XG5cbnZhciBBVVRPID0gJyonO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGdlbkFnZ3JlZ2F0ZXM7XG5cbmZ1bmN0aW9uIGdlbkFnZ3JlZ2F0ZXMob3V0cHV0LCBmaWVsZERlZnMsIHN0YXRzLCBvcHQpIHtcbiAgb3B0ID0gdmwuc2NoZW1hLnV0aWwuZXh0ZW5kKG9wdHx8e30sIGNvbnN0cy5nZW4uYWdncmVnYXRlcyk7XG4gIHZhciB0ZiA9IG5ldyBBcnJheShmaWVsZERlZnMubGVuZ3RoKTtcbiAgdmFyIGhhc05vck8gPSB2bC5hbnkoZmllbGREZWZzLCBmdW5jdGlvbihmKSB7XG4gICAgcmV0dXJuIHZsLmVuY0RlZi5pc1R5cGVzKGYsIFtOLCBPXSk7XG4gIH0pO1xuXG4gIGZ1bmN0aW9uIGVtaXQoZmllbGRTZXQpIHtcbiAgICBmaWVsZFNldCA9IHZsLmR1cGxpY2F0ZShmaWVsZFNldCk7XG4gICAgZmllbGRTZXQua2V5ID0gdmwuZW5jRGVmLnNob3J0aGFuZHMoZmllbGRTZXQpO1xuICAgIG91dHB1dC5wdXNoKGZpZWxkU2V0KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNoZWNrQW5kUHVzaCgpIHtcbiAgICBpZiAob3B0Lm9taXRNZWFzdXJlT25seSB8fCBvcHQub21pdERpbWVuc2lvbk9ubHkpIHtcbiAgICAgIHZhciBoYXNNZWFzdXJlID0gZmFsc2UsIGhhc0RpbWVuc2lvbiA9IGZhbHNlLCBoYXNSYXcgPSBmYWxzZTtcbiAgICAgIHRmLmZvckVhY2goZnVuY3Rpb24oZikge1xuICAgICAgICBpZiAodmwuZW5jRGVmLmlzRGltZW5zaW9uKGYpKSB7XG4gICAgICAgICAgaGFzRGltZW5zaW9uID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBoYXNNZWFzdXJlID0gdHJ1ZTtcbiAgICAgICAgICBpZiAoIWYuYWdncmVnYXRlKSBoYXNSYXcgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIGlmICghaGFzRGltZW5zaW9uICYmICFoYXNSYXcgJiYgb3B0Lm9taXRNZWFzdXJlT25seSkgcmV0dXJuO1xuICAgICAgaWYgKCFoYXNNZWFzdXJlKSB7XG4gICAgICAgIGlmIChvcHQuYWRkQ291bnRGb3JEaW1lbnNpb25Pbmx5KSB7XG4gICAgICAgICAgdGYucHVzaCh2bC5lbmNEZWYuY291bnQoKSk7XG4gICAgICAgICAgZW1pdCh0Zik7XG4gICAgICAgICAgdGYucG9wKCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG9wdC5vbWl0RGltZW5zaW9uT25seSkgcmV0dXJuO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAob3B0Lm9taXREb3RQbG90ICYmIHRmLmxlbmd0aCA9PT0gMSkgcmV0dXJuO1xuICAgIGVtaXQodGYpO1xuICB9XG5cbiAgZnVuY3Rpb24gYXNzaWduQWdnclEoaSwgaGFzQWdnciwgYXV0b01vZGUsIGEpIHtcbiAgICB2YXIgY2FuSGF2ZUFnZ3IgPSBoYXNBZ2dyID09PSB0cnVlIHx8IGhhc0FnZ3IgPT09IG51bGwsXG4gICAgICBjYW50SGF2ZUFnZ3IgPSBoYXNBZ2dyID09PSBmYWxzZSB8fCBoYXNBZ2dyID09PSBudWxsO1xuICAgIGlmIChhKSB7XG4gICAgICBpZiAoY2FuSGF2ZUFnZ3IpIHtcbiAgICAgICAgdGZbaV0uYWdncmVnYXRlID0gYTtcbiAgICAgICAgYXNzaWduRmllbGQoaSArIDEsIHRydWUsIGF1dG9Nb2RlKTtcbiAgICAgICAgZGVsZXRlIHRmW2ldLmFnZ3JlZ2F0ZTtcbiAgICAgIH1cbiAgICB9IGVsc2UgeyAvLyBpZihhID09PSB1bmRlZmluZWQpXG4gICAgICBpZiAoY2FudEhhdmVBZ2dyKSB7XG4gICAgICAgIGFzc2lnbkZpZWxkKGkgKyAxLCBmYWxzZSwgYXV0b01vZGUpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGFzc2lnbkJpblEoaSwgaGFzQWdnciwgYXV0b01vZGUpIHtcbiAgICB0ZltpXS5iaW4gPSB0cnVlO1xuICAgIGFzc2lnbkZpZWxkKGkgKyAxLCBoYXNBZ2dyLCBhdXRvTW9kZSk7XG4gICAgZGVsZXRlIHRmW2ldLmJpbjtcbiAgfVxuXG4gIGZ1bmN0aW9uIGFzc2lnblEoaSwgaGFzQWdnciwgYXV0b01vZGUpIHtcbiAgICB2YXIgZiA9IGZpZWxkRGVmc1tpXSxcbiAgICAgIGNhbkhhdmVBZ2dyID0gaGFzQWdnciA9PT0gdHJ1ZSB8fCBoYXNBZ2dyID09PSBudWxsO1xuXG4gICAgdGZbaV0gPSB7bmFtZTogZi5uYW1lLCB0eXBlOiBmLnR5cGV9O1xuXG4gICAgaWYgKGYuYWdncmVnYXRlID09PSAnY291bnQnKSB7IC8vIGlmIGNvdW50IGlzIGluY2x1ZGVkIGluIHRoZSBzZWxlY3RlZCBmaWVsZHNcbiAgICAgIGlmIChjYW5IYXZlQWdncikge1xuICAgICAgICB0ZltpXS5hZ2dyZWdhdGUgPSBmLmFnZ3JlZ2F0ZTtcbiAgICAgICAgYXNzaWduRmllbGQoaSArIDEsIHRydWUsIGF1dG9Nb2RlKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGYuX2FnZ3JlZ2F0ZSkge1xuICAgICAgLy8gVE9ETyBzdXBwb3J0IGFycmF5IG9mIGYuX2FnZ3JzIHRvb1xuICAgICAgYXNzaWduQWdnclEoaSwgaGFzQWdnciwgYXV0b01vZGUsIGYuX2FnZ3JlZ2F0ZSk7XG4gICAgfSBlbHNlIGlmIChmLl9yYXcpIHtcbiAgICAgIGFzc2lnbkFnZ3JRKGksIGhhc0FnZ3IsIGF1dG9Nb2RlLCB1bmRlZmluZWQpO1xuICAgIH0gZWxzZSBpZiAoZi5fYmluKSB7XG4gICAgICBhc3NpZ25CaW5RKGksIGhhc0FnZ3IsIGF1dG9Nb2RlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgb3B0LmFnZ3JMaXN0LmZvckVhY2goZnVuY3Rpb24oYSkge1xuICAgICAgICBpZiAoIW9wdC5jb25zaXN0ZW50QXV0b1EgfHwgYXV0b01vZGUgPT09IEFVVE8gfHwgYXV0b01vZGUgPT09IGEpIHtcbiAgICAgICAgICBhc3NpZ25BZ2dyUShpLCBoYXNBZ2dyLCBhIC8qYXNzaWduIGF1dG9Nb2RlKi8sIGEpO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgaWYgKCghb3B0LmNvbnNpc3RlbnRBdXRvUSB8fCB2bC5pc2luKGF1dG9Nb2RlLCBbQVVUTywgJ2JpbicsICdjYXN0JywgJ2F1dG9jYXN0J10pKSAmJiAhaGFzTm9yTykge1xuICAgICAgICB2YXIgaGlnaENhcmRpbmFsaXR5ID0gdmwuZW5jRGVmLmNhcmRpbmFsaXR5KGYsIHN0YXRzKSA+IG9wdC5taW5DYXJkaW5hbGl0eUZvckJpbjtcblxuICAgICAgICB2YXIgaXNBdXRvID0gb3B0LmdlbkRpbVEgPT09ICdhdXRvJyxcbiAgICAgICAgICBnZW5CaW4gPSBvcHQuZ2VuRGltUSAgPT09ICdiaW4nIHx8IChpc0F1dG8gJiYgaGlnaENhcmRpbmFsaXR5KSxcbiAgICAgICAgICBnZW5DYXN0ID0gb3B0LmdlbkRpbVEgPT09ICdjYXN0JyB8fCAoaXNBdXRvICYmICFoaWdoQ2FyZGluYWxpdHkpO1xuXG4gICAgICAgIGlmIChnZW5CaW4gJiYgdmwuaXNpbihhdXRvTW9kZSwgW0FVVE8sICdiaW4nLCAnYXV0b2Nhc3QnXSkpIHtcbiAgICAgICAgICBhc3NpZ25CaW5RKGksIGhhc0FnZ3IsIGlzQXV0byA/ICdhdXRvY2FzdCcgOiAnYmluJyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGdlbkNhc3QgJiYgdmwuaXNpbihhdXRvTW9kZSwgW0FVVE8sICdjYXN0JywgJ2F1dG9jYXN0J10pKSB7XG4gICAgICAgICAgdGZbaV0udHlwZSA9ICdPJztcbiAgICAgICAgICBhc3NpZ25GaWVsZChpICsgMSwgaGFzQWdnciwgaXNBdXRvID8gJ2F1dG9jYXN0JyA6ICdjYXN0Jyk7XG4gICAgICAgICAgdGZbaV0udHlwZSA9ICdRJztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGFzc2lnblRpbWVVbml0VChpLCBoYXNBZ2dyLCBhdXRvTW9kZSwgdGltZVVuaXQpIHtcbiAgICB0ZltpXS50aW1lVW5pdCA9IHRpbWVVbml0O1xuICAgIGFzc2lnbkZpZWxkKGkrMSwgaGFzQWdnciwgYXV0b01vZGUpO1xuICAgIGRlbGV0ZSB0ZltpXS50aW1lVW5pdDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGFzc2lnblQoaSwgaGFzQWdnciwgYXV0b01vZGUpIHtcbiAgICB2YXIgZiA9IGZpZWxkRGVmc1tpXTtcbiAgICB0ZltpXSA9IHtuYW1lOiBmLm5hbWUsIHR5cGU6IGYudHlwZX07XG5cbiAgICAvLyBUT0RPIHN1cHBvcnQgYXJyYXkgb2YgZi5fdGltZVVuaXRzXG4gICAgaWYgKGYuX3RpbWVVbml0KSB7XG4gICAgICBhc3NpZ25UaW1lVW5pdFQoaSwgaGFzQWdnciwgYXV0b01vZGUsIGYuX3RpbWVVbml0KTtcbiAgICB9IGVsc2Uge1xuICAgICAgb3B0LnRpbWVVbml0TGlzdC5mb3JFYWNoKGZ1bmN0aW9uKHRpbWVVbml0KSB7XG4gICAgICAgIGlmICh0aW1lVW5pdCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgaWYgKCFoYXNBZ2dyKSB7IC8vIGNhbid0IGFnZ3JlZ2F0ZSBvdmVyIHJhdyB0aW1lXG4gICAgICAgICAgICBhc3NpZ25GaWVsZChpKzEsIGZhbHNlLCBhdXRvTW9kZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGFzc2lnblRpbWVVbml0VChpLCBoYXNBZ2dyLCBhdXRvTW9kZSwgdGltZVVuaXQpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBGSVhNRSB3aGF0IGlmIHlvdSBhZ2dyZWdhdGUgdGltZT9cbiAgfVxuXG4gIGZ1bmN0aW9uIGFzc2lnbkZpZWxkKGksIGhhc0FnZ3IsIGF1dG9Nb2RlKSB7XG4gICAgaWYgKGkgPT09IGZpZWxkRGVmcy5sZW5ndGgpIHsgLy8gSWYgYWxsIGZpZWxkcyBhcmUgYXNzaWduZWRcbiAgICAgIGNoZWNrQW5kUHVzaCgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBmID0gZmllbGREZWZzW2ldO1xuICAgIC8vIE90aGVyd2lzZSwgYXNzaWduIGktdGggZmllbGRcbiAgICBzd2l0Y2ggKGYudHlwZSkge1xuICAgICAgLy9UT0RPIFwiRFwiLCBcIkdcIlxuICAgICAgY2FzZSBROlxuICAgICAgICBhc3NpZ25RKGksIGhhc0FnZ3IsIGF1dG9Nb2RlKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgVDpcbiAgICAgICAgYXNzaWduVChpLCBoYXNBZ2dyLCBhdXRvTW9kZSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBPOlxuICAgICAgICAvKiBmYWxscyB0aHJvdWdoICovXG4gICAgICBjYXNlIE46XG4gICAgICAgIC8qIGZhbGxzIHRocm91Z2ggKi9cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHRmW2ldID0gZjtcbiAgICAgICAgYXNzaWduRmllbGQoaSArIDEsIGhhc0FnZ3IsIGF1dG9Nb2RlKTtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgdmFyIGhhc0FnZ3IgPSBvcHQudGFibGVUeXBlcyA9PT0gJ2FnZ3JlZ2F0ZWQnID8gdHJ1ZSA6IG9wdC50YWJsZVR5cGVzID09PSAnZGlzYWdncmVnYXRlZCcgPyBmYWxzZSA6IG51bGw7XG4gIGFzc2lnbkZpZWxkKDAsIGhhc0FnZ3IsIEFVVE8pO1xuXG4gIHJldHVybiBvdXRwdXQ7XG59XG4iLCJcInVzZSBzdHJpY3RcIjtcbnJlcXVpcmUoJy4uL2dsb2JhbHMnKTtcblxudmFyIHZsID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3dbJ3ZsJ10gOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsWyd2bCddIDogbnVsbCksXG4gIGdlbk1hcmtUeXBlcyA9IHJlcXVpcmUoJy4vbWFya3R5cGVzJyksXG4gIGlzRGltZW5zaW9uID0gdmwuZW5jRGVmLmlzRGltZW5zaW9uLFxuICBpc01lYXN1cmUgPSB2bC5lbmNEZWYuaXNNZWFzdXJlO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGdlbkVuY29kaW5ncztcblxuLy8gRklYTUUgcmVtb3ZlIGRpbWVuc2lvbiwgbWVhc3VyZSBhbmQgdXNlIGluZm9ybWF0aW9uIGluIHZlZ2EtbGl0ZSBpbnN0ZWFkIVxudmFyIHJ1bGVzID0ge1xuICB4OiB7XG4gICAgZGltZW5zaW9uOiB0cnVlLFxuICAgIG1lYXN1cmU6IHRydWUsXG4gICAgbXVsdGlwbGU6IHRydWUgLy9GSVhNRSBzaG91bGQgYWxsb3cgbXVsdGlwbGUgb25seSBmb3IgUSwgVFxuICB9LFxuICB5OiB7XG4gICAgZGltZW5zaW9uOiB0cnVlLFxuICAgIG1lYXN1cmU6IHRydWUsXG4gICAgbXVsdGlwbGU6IHRydWUgLy9GSVhNRSBzaG91bGQgYWxsb3cgbXVsdGlwbGUgb25seSBmb3IgUSwgVFxuICB9LFxuICByb3c6IHtcbiAgICBkaW1lbnNpb246IHRydWUsXG4gICAgbXVsdGlwbGU6IHRydWVcbiAgfSxcbiAgY29sOiB7XG4gICAgZGltZW5zaW9uOiB0cnVlLFxuICAgIG11bHRpcGxlOiB0cnVlXG4gIH0sXG4gIHNoYXBlOiB7XG4gICAgZGltZW5zaW9uOiB0cnVlLFxuICAgIHJ1bGVzOiBzaGFwZVJ1bGVzXG4gIH0sXG4gIHNpemU6IHtcbiAgICBtZWFzdXJlOiB0cnVlLFxuICAgIHJ1bGVzOiByZXRpbmFsRW5jUnVsZXNcbiAgfSxcbiAgY29sb3I6IHtcbiAgICBkaW1lbnNpb246IHRydWUsXG4gICAgbWVhc3VyZTogdHJ1ZSxcbiAgICBydWxlczogY29sb3JSdWxlc1xuICB9LFxuICB0ZXh0OiB7XG4gICAgbWVhc3VyZTogdHJ1ZVxuICB9LFxuICBkZXRhaWw6IHtcbiAgICBkaW1lbnNpb246IHRydWVcbiAgfVxuICAvL2dlbzoge1xuICAvLyAgZ2VvOiB0cnVlXG4gIC8vfSxcbiAgLy9hcmM6IHsgLy8gcGllXG4gIC8vXG4gIC8vfVxufTtcblxuZnVuY3Rpb24gcmV0aW5hbEVuY1J1bGVzKGVuY29kaW5nLCBmaWVsZERlZiwgc3RhdHMsIG9wdCkge1xuICBpZiAob3B0Lm9taXRNdWx0aXBsZVJldGluYWxFbmNvZGluZ3MpIHtcbiAgICBpZiAoZW5jb2RpbmcuY29sb3IgfHwgZW5jb2Rpbmcuc2l6ZSB8fCBlbmNvZGluZy5zaGFwZSkgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHJldHVybiB0cnVlO1xufVxuXG5mdW5jdGlvbiBjb2xvclJ1bGVzKGVuY29kaW5nLCBmaWVsZERlZiwgc3RhdHMsIG9wdCkge1xuICBpZighcmV0aW5hbEVuY1J1bGVzKGVuY29kaW5nLCBmaWVsZERlZiwgc3RhdHMsIG9wdCkpIHJldHVybiBmYWxzZTtcblxuICByZXR1cm4gdmwuZW5jRGVmLmlzTWVhc3VyZShmaWVsZERlZikgfHxcbiAgICB2bC5lbmNEZWYuY2FyZGluYWxpdHkoZmllbGREZWYsIHN0YXRzKSA8PSBvcHQubWF4Q2FyZGluYWxpdHlGb3JDb2xvcjtcbn1cblxuZnVuY3Rpb24gc2hhcGVSdWxlcyhlbmNvZGluZywgZmllbGREZWYsIHN0YXRzLCBvcHQpIHtcbiAgaWYoIXJldGluYWxFbmNSdWxlcyhlbmNvZGluZywgZmllbGREZWYsIHN0YXRzLCBvcHQpKSByZXR1cm4gZmFsc2U7XG5cbiAgaWYgKGZpZWxkRGVmLmJpbiAmJiBmaWVsZERlZi50eXBlID09PSBRKSByZXR1cm4gZmFsc2U7XG4gIGlmIChmaWVsZERlZi50aW1lVW5pdCAmJiBmaWVsZERlZi50eXBlID09PSBUKSByZXR1cm4gZmFsc2U7XG4gIHJldHVybiB2bC5lbmNEZWYuY2FyZGluYWxpdHkoZmllbGREZWYsIHN0YXRzKSA8PSBvcHQubWF4Q2FyZGluYWxpdHlGb3JDb2xvcjtcbn1cblxuZnVuY3Rpb24gZGltTWVhVHJhbnNwb3NlUnVsZShlbmNvZGluZykge1xuICAvLyBjcmVhdGUgaG9yaXpvbnRhbCBoaXN0b2dyYW0gZm9yIG9yZGluYWxcbiAgaWYgKHZsLmVuY0RlZi5pc1R5cGVzKGVuY29kaW5nLnksIFtOLCBPXSkgJiYgaXNNZWFzdXJlKGVuY29kaW5nLngpKSByZXR1cm4gdHJ1ZTtcblxuICAvLyB2ZXJ0aWNhbCBoaXN0b2dyYW0gZm9yIFEgYW5kIFRcbiAgaWYgKGlzTWVhc3VyZShlbmNvZGluZy55KSAmJiAoIXZsLmVuY0RlZi5pc1R5cGVzKGVuY29kaW5nLngsIFtOLCBPXSkgJiYgaXNEaW1lbnNpb24oZW5jb2RpbmcueCkpKSByZXR1cm4gdHJ1ZTtcblxuICByZXR1cm4gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIGdlbmVyYWxSdWxlcyhlbmNvZGluZywgc3RhdHMsIG9wdCkge1xuICAvLyBlbmMudGV4dCBpcyBvbmx5IHVzZWQgZm9yIFRFWFQgVEFCTEVcbiAgaWYgKGVuY29kaW5nLnRleHQpIHtcbiAgICByZXR1cm4gZ2VuTWFya1R5cGVzLnNhdGlzZnlSdWxlcyhlbmNvZGluZywgVEVYVCwgc3RhdHMsIG9wdCk7XG4gIH1cblxuICAvLyBDQVJURVNJQU4gUExPVCBPUiBNQVBcbiAgaWYgKGVuY29kaW5nLnggfHwgZW5jb2RpbmcueSB8fCBlbmNvZGluZy5nZW8gfHwgZW5jb2RpbmcuYXJjKSB7XG5cbiAgICBpZiAoZW5jb2Rpbmcucm93IHx8IGVuY29kaW5nLmNvbCkgeyAvL2hhdmUgZmFjZXQocylcblxuICAgICAgLy8gZG9uJ3QgdXNlIGZhY2V0cyBiZWZvcmUgZmlsbGluZyB1cCB4LHlcbiAgICAgIGlmICghZW5jb2RpbmcueCB8fCAhZW5jb2RpbmcueSkgcmV0dXJuIGZhbHNlO1xuXG4gICAgICBpZiAob3B0Lm9taXROb25UZXh0QWdncldpdGhBbGxEaW1zT25GYWNldHMpIHtcbiAgICAgICAgLy8gcmVtb3ZlIGFsbCBhZ2dyZWdhdGVkIGNoYXJ0cyB3aXRoIGFsbCBkaW1zIG9uIGZhY2V0cyAocm93LCBjb2wpXG4gICAgICAgIGlmIChnZW5FbmNvZGluZ3MuaXNBZ2dyV2l0aEFsbERpbU9uRmFjZXRzKGVuY29kaW5nKSkgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChlbmNvZGluZy54ICYmIGVuY29kaW5nLnkpIHtcbiAgICAgIHZhciBpc0RpbVggPSAhIWlzRGltZW5zaW9uKGVuY29kaW5nLngpLFxuICAgICAgICBpc0RpbVkgPSAhIWlzRGltZW5zaW9uKGVuY29kaW5nLnkpO1xuXG4gICAgICBpZiAoaXNEaW1YICYmIGlzRGltWSAmJiAhdmwuZW5jLmlzQWdncmVnYXRlKGVuY29kaW5nKSkge1xuICAgICAgICAvLyBGSVhNRSBhY3R1YWxseSBjaGVjayBpZiB0aGVyZSB3b3VsZCBiZSBvY2NsdXNpb24gIzkwXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgaWYgKG9wdC5vbWl0VHJhbnBvc2UpIHtcbiAgICAgICAgaWYgKGlzRGltWCBeIGlzRGltWSkgeyAvLyBkaW0geCBtZWFcbiAgICAgICAgICBpZiAoIWRpbU1lYVRyYW5zcG9zZVJ1bGUoZW5jb2RpbmcpKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0gZWxzZSBpZiAoZW5jb2RpbmcueS50eXBlPT09VCB8fCBlbmNvZGluZy54LnR5cGUgPT09IFQpIHtcbiAgICAgICAgICBpZiAoZW5jb2RpbmcueS50eXBlPT09VCAmJiBlbmNvZGluZy54LnR5cGUgIT09IFQpIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSBlbHNlIHsgLy8gc2hvdyBvbmx5IG9uZSBPeE8sIFF4UVxuICAgICAgICAgIGlmIChlbmNvZGluZy54Lm5hbWUgPiBlbmNvZGluZy55Lm5hbWUpIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLy8gRE9UIFBMT1RTXG4gICAgLy8gLy8gcGxvdCB3aXRoIG9uZSBheGlzID0gZG90IHBsb3RcbiAgICBpZiAob3B0Lm9taXREb3RQbG90KSByZXR1cm4gZmFsc2U7XG5cbiAgICAvLyBEb3QgcGxvdCBzaG91bGQgYWx3YXlzIGJlIGhvcml6b250YWxcbiAgICBpZiAob3B0Lm9taXRUcmFucG9zZSAmJiBlbmNvZGluZy55KSByZXR1cm4gZmFsc2U7XG5cbiAgICAvLyBkb3QgcGxvdCBzaG91bGRuJ3QgaGF2ZSBvdGhlciBlbmNvZGluZ1xuICAgIGlmIChvcHQub21pdERvdFBsb3RXaXRoRXh0cmFFbmNvZGluZyAmJiB2bC5rZXlzKGVuY29kaW5nKS5sZW5ndGggPiAxKSByZXR1cm4gZmFsc2U7XG5cbiAgICBpZiAob3B0Lm9taXRPbmVEaW1lbnNpb25Db3VudCkge1xuICAgICAgLy8gb25lIGRpbWVuc2lvbiBcImNvdW50XCJcbiAgICAgIGlmIChlbmNvZGluZy54ICYmIGVuY29kaW5nLnguYWdncmVnYXRlID09ICdjb3VudCcgJiYgIWVuY29kaW5nLnkpIHJldHVybiBmYWxzZTtcbiAgICAgIGlmIChlbmNvZGluZy55ICYmIGVuY29kaW5nLnkuYWdncmVnYXRlID09ICdjb3VudCcgJiYgIWVuY29kaW5nLngpIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG5cbmdlbkVuY29kaW5ncy5pc0FnZ3JXaXRoQWxsRGltT25GYWNldHMgPSBmdW5jdGlvbiAoZW5jb2RpbmcpIHtcbiAgdmFyIGhhc0FnZ3IgPSBmYWxzZSwgaGFzT3RoZXJPID0gZmFsc2U7XG4gIGZvciAodmFyIGVuY1R5cGUgaW4gZW5jb2RpbmcpIHtcbiAgICB2YXIgZmllbGQgPSBlbmNvZGluZ1tlbmNUeXBlXTtcbiAgICBpZiAoZmllbGQuYWdncmVnYXRlKSB7XG4gICAgICBoYXNBZ2dyID0gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKHZsLmVuY0RlZi5pc0RpbWVuc2lvbihmaWVsZCkgJiYgKGVuY1R5cGUgIT09IFJPVyAmJiBlbmNUeXBlICE9PSBDT0wpKSB7XG4gICAgICBoYXNPdGhlck8gPSB0cnVlO1xuICAgIH1cbiAgICBpZiAoaGFzQWdnciAmJiBoYXNPdGhlck8pIGJyZWFrO1xuICB9XG5cbiAgcmV0dXJuIGhhc0FnZ3IgJiYgIWhhc090aGVyTztcbn07XG5cblxuZnVuY3Rpb24gZ2VuRW5jb2RpbmdzKGVuY29kaW5ncywgZmllbGREZWZzLCBzdGF0cywgb3B0KSB7XG4gIC8vIGdlbmVyYXRlIGEgY29sbGVjdGlvbiB2ZWdhLWxpdGUncyBlbmNcbiAgdmFyIHRtcEVuY29kaW5nID0ge307XG5cbiAgZnVuY3Rpb24gYXNzaWduRmllbGQoaSkge1xuICAgIC8vIElmIGFsbCBmaWVsZHMgYXJlIGFzc2lnbmVkLCBzYXZlXG4gICAgaWYgKGkgPT09IGZpZWxkRGVmcy5sZW5ndGgpIHtcbiAgICAgIC8vIGF0IHRoZSBtaW5pbWFsIGFsbCBjaGFydCBzaG91bGQgaGF2ZSB4LCB5LCBnZW8sIHRleHQgb3IgYXJjXG4gICAgICBpZiAoZ2VuZXJhbFJ1bGVzKHRtcEVuY29kaW5nLCBzdGF0cywgb3B0KSkge1xuICAgICAgICBlbmNvZGluZ3MucHVzaCh2bC5kdXBsaWNhdGUodG1wRW5jb2RpbmcpKTtcbiAgICAgIH1cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBPdGhlcndpc2UsIGFzc2lnbiBpLXRoIGZpZWxkXG4gICAgdmFyIGZpZWxkRGVmID0gZmllbGREZWZzW2ldO1xuICAgIGZvciAodmFyIGogaW4gb3B0LmVuY29kaW5nVHlwZUxpc3QpIHtcbiAgICAgIHZhciBlbmNUeXBlID0gb3B0LmVuY29kaW5nVHlwZUxpc3Rbal0sXG4gICAgICAgIGlzRGltID0gaXNEaW1lbnNpb24oZmllbGREZWYpO1xuXG4gICAgICAvL1RPRE86IHN1cHBvcnQgXCJtdWx0aXBsZVwiIGFzc2lnbm1lbnRcbiAgICAgIGlmICghKGVuY1R5cGUgaW4gdG1wRW5jb2RpbmcpICYmIC8vIGVuY29kaW5nIG5vdCB1c2VkXG4gICAgICAgICgoaXNEaW0gJiYgcnVsZXNbZW5jVHlwZV0uZGltZW5zaW9uKSB8fCAoIWlzRGltICYmIHJ1bGVzW2VuY1R5cGVdLm1lYXN1cmUpKSAmJlxuICAgICAgICAoIXJ1bGVzW2VuY1R5cGVdLnJ1bGVzIHx8IHJ1bGVzW2VuY1R5cGVdLnJ1bGVzKHRtcEVuY29kaW5nLCBmaWVsZERlZiwgc3RhdHMsIG9wdCkpXG4gICAgICApIHtcbiAgICAgICAgdG1wRW5jb2RpbmdbZW5jVHlwZV0gPSBmaWVsZERlZjtcbiAgICAgICAgYXNzaWduRmllbGQoaSArIDEpO1xuICAgICAgICBkZWxldGUgdG1wRW5jb2RpbmdbZW5jVHlwZV07XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgYXNzaWduRmllbGQoMCk7XG5cbiAgcmV0dXJuIGVuY29kaW5ncztcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWwgPSByZXF1aXJlKCcuLi91dGlsJyk7XG5cbi8qKlxuICogTW9kdWxlIGZvciBnZW5lcmF0aW5nIHZpc3VhbGl6YXRpb25zXG4gKi9cblxudmFyIGdlbiA9IG1vZHVsZS5leHBvcnRzID0ge1xuICAvLyBkYXRhIHZhcmlhdGlvbnNcbiAgYWdncmVnYXRlczogcmVxdWlyZSgnLi9hZ2dyZWdhdGVzJyksXG4gIHByb2plY3Rpb25zOiByZXF1aXJlKCcuL3Byb2plY3Rpb25zJyksXG4gIC8vIGVuY29kaW5ncyAvIHZpc3VhbCB2YXJpYXRpb25zXG4gIHNwZWNzOiByZXF1aXJlKCcuL3NwZWNzJyksXG4gIGVuY29kaW5nczogcmVxdWlyZSgnLi9lbmNvZGluZ3MnKSxcbiAgbWFya3R5cGVzOiByZXF1aXJlKCcuL21hcmt0eXBlcycpXG59O1xuXG5cbi8vIFRPRE8oa2FuaXR3KTogcmV2aXNlIGlmIHRoaXMgaXMgc3RpbGwgd29ya2luZ1xuZ2VuLmNoYXJ0cyA9IGZ1bmN0aW9uKGZpZWxkRGVmcywgb3B0LCBjb25maWcsIGZsYXQpIHtcbiAgb3B0ID0gdXRpbC5nZW4uZ2V0T3B0KG9wdCk7XG4gIGZsYXQgPSBmbGF0ID09PSB1bmRlZmluZWQgPyB7ZW5jb2RpbmdzOiAxfSA6IGZsYXQ7XG5cbiAgLy8gVE9ETyBnZW5lcmF0ZVxuXG4gIC8vIGdlbmVyYXRlIHBlcm11dGF0aW9uIG9mIGVuY29kaW5nIG1hcHBpbmdzXG4gIHZhciBmaWVsZFNldHMgPSBvcHQuZ2VuQWdnciA/IGdlbi5hZ2dyZWdhdGVzKFtdLCBmaWVsZERlZnMsIG9wdCkgOiBbZmllbGREZWZzXSxcbiAgICBlbmNvZGluZ3MsIGNoYXJ0cywgbGV2ZWwgPSAwO1xuXG4gIGlmIChmbGF0ID09PSB0cnVlIHx8IChmbGF0ICYmIGZsYXQuYWdncmVnYXRlKSkge1xuICAgIGVuY29kaW5ncyA9IGZpZWxkU2V0cy5yZWR1Y2UoZnVuY3Rpb24ob3V0cHV0LCBmaWVsZERlZnMpIHtcbiAgICAgIHJldHVybiBnZW4uZW5jcyhvdXRwdXQsIGZpZWxkRGVmcywgb3B0KTtcbiAgICB9LCBbXSk7XG4gIH0gZWxzZSB7XG4gICAgZW5jb2RpbmdzID0gZmllbGRTZXRzLm1hcChmdW5jdGlvbihmaWVsZERlZnMpIHtcbiAgICAgIHJldHVybiBnZW4uZW5jcyhbXSwgZmllbGREZWZzLCBvcHQpO1xuICAgIH0sIHRydWUpO1xuICAgIGxldmVsICs9IDE7XG4gIH1cblxuICBpZiAoZmxhdCA9PT0gdHJ1ZSB8fCAoZmxhdCAmJiBmbGF0LmVuY29kaW5ncykpIHtcbiAgICBjaGFydHMgPSB1dGlsLm5lc3RlZFJlZHVjZShlbmNvZGluZ3MsIGZ1bmN0aW9uKG91dHB1dCwgZW5jb2RpbmcpIHtcbiAgICAgIHJldHVybiBnZW4ubWFya3R5cGVzKG91dHB1dCwgZW5jb2RpbmcsIG9wdCwgY29uZmlnKTtcbiAgICB9LCBsZXZlbCwgdHJ1ZSk7XG4gIH0gZWxzZSB7XG4gICAgY2hhcnRzID0gdXRpbC5uZXN0ZWRNYXAoZW5jb2RpbmdzLCBmdW5jdGlvbihlbmNvZGluZykge1xuICAgICAgcmV0dXJuIGdlbi5tYXJrdHlwZXMoW10sIGVuY29kaW5nLCBvcHQsIGNvbmZpZyk7XG4gICAgfSwgbGV2ZWwsIHRydWUpO1xuICAgIGxldmVsICs9IDE7XG4gIH1cbiAgcmV0dXJuIGNoYXJ0cztcbn07IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciB2bCA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93Wyd2bCddIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbFsndmwnXSA6IG51bGwpLFxuICBpc0RpbWVuc2lvbiA9IHZsLmVuY0RlZi5pc0RpbWVuc2lvbixcbiAgaXNPcmRpbmFsU2NhbGUgPSB2bC5lbmNEZWYuaXNPcmRpbmFsU2NhbGU7XG5cbnZhciB2bG1hcmt0eXBlcyA9IG1vZHVsZS5leHBvcnRzID0gZ2V0TWFya3R5cGVzO1xuXG52YXIgbWFya3NSdWxlID0gdmxtYXJrdHlwZXMucnVsZSA9IHtcbiAgcG9pbnQ6ICBwb2ludFJ1bGUsXG4gIGJhcjogICAgYmFyUnVsZSxcbiAgbGluZTogICBsaW5lUnVsZSxcbiAgYXJlYTogICBhcmVhUnVsZSwgLy8gYXJlYSBpcyBzaW1pbGFyIHRvIGxpbmVcbiAgdGV4dDogICB0ZXh0UnVsZSxcbiAgdGljazogICB0aWNrUnVsZVxufTtcblxuZnVuY3Rpb24gZ2V0TWFya3R5cGVzKGVuY29kaW5nLCBzdGF0cywgb3B0KSB7XG4gIHJldHVybiBvcHQubWFya3R5cGVMaXN0LmZpbHRlcihmdW5jdGlvbihtYXJrVHlwZSl7XG4gICAgcmV0dXJuIHZsbWFya3R5cGVzLnNhdGlzZnlSdWxlcyhlbmNvZGluZywgbWFya1R5cGUsIHN0YXRzLCBvcHQpO1xuICB9KTtcbn1cblxudmxtYXJrdHlwZXMuc2F0aXNmeVJ1bGVzID0gZnVuY3Rpb24gKGVuY29kaW5nLCBtYXJrVHlwZSwgc3RhdHMsIG9wdCkge1xuICB2YXIgbWFyayA9IHZsLmNvbXBpbGVyLm1hcmtzW21hcmtUeXBlXSxcbiAgICByZXFzID0gbWFyay5yZXF1aXJlZEVuY29kaW5nLFxuICAgIHN1cHBvcnQgPSBtYXJrLnN1cHBvcnRlZEVuY29kaW5nO1xuXG4gIGZvciAodmFyIGkgaW4gcmVxcykgeyAvLyBhbGwgcmVxdWlyZWQgZW5jb2RpbmdzIGluIGVuY1xuICAgIGlmICghKHJlcXNbaV0gaW4gZW5jb2RpbmcpKSByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBmb3IgKHZhciBlbmNUeXBlIGluIGVuY29kaW5nKSB7IC8vIGFsbCBlbmNvZGluZ3MgaW4gZW5jIGFyZSBzdXBwb3J0ZWRcbiAgICBpZiAoIXN1cHBvcnRbZW5jVHlwZV0pIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIHJldHVybiAhbWFya3NSdWxlW21hcmtUeXBlXSB8fCBtYXJrc1J1bGVbbWFya1R5cGVdKGVuY29kaW5nLCBzdGF0cywgb3B0KTtcbn07XG5cbmZ1bmN0aW9uIGZhY2V0UnVsZShmaWVsZERlZiwgc3RhdHMsIG9wdCkge1xuICByZXR1cm4gdmwuZW5jRGVmLmNhcmRpbmFsaXR5KGZpZWxkRGVmLCBzdGF0cykgPD0gb3B0Lm1heENhcmRpbmFsaXR5Rm9yRmFjZXRzO1xufVxuXG5mdW5jdGlvbiBmYWNldHNSdWxlKGVuY29kaW5nLCBzdGF0cywgb3B0KSB7XG4gIGlmKGVuY29kaW5nLnJvdyAmJiAhZmFjZXRSdWxlKGVuY29kaW5nLnJvdywgc3RhdHMsIG9wdCkpIHJldHVybiBmYWxzZTtcbiAgaWYoZW5jb2RpbmcuY29sICYmICFmYWNldFJ1bGUoZW5jb2RpbmcuY29sLCBzdGF0cywgb3B0KSkgcmV0dXJuIGZhbHNlO1xuICByZXR1cm4gdHJ1ZTtcbn1cblxuZnVuY3Rpb24gcG9pbnRSdWxlKGVuY29kaW5nLCBzdGF0cywgb3B0KSB7XG4gIGlmKCFmYWNldHNSdWxlKGVuY29kaW5nLCBzdGF0cywgb3B0KSkgcmV0dXJuIGZhbHNlO1xuICBpZiAoZW5jb2RpbmcueCAmJiBlbmNvZGluZy55KSB7XG4gICAgLy8gaGF2ZSBib3RoIHggJiB5ID09PiBzY2F0dGVyIHBsb3QgLyBidWJibGUgcGxvdFxuXG4gICAgdmFyIHhJc0RpbSA9IGlzRGltZW5zaW9uKGVuY29kaW5nLngpLFxuICAgICAgeUlzRGltID0gaXNEaW1lbnNpb24oZW5jb2RpbmcueSk7XG5cbiAgICAvLyBGb3IgT3hPXG4gICAgaWYgKHhJc0RpbSAmJiB5SXNEaW0pIHtcbiAgICAgIC8vIHNoYXBlIGRvZXNuJ3Qgd29yayB3aXRoIGJvdGggeCwgeSBhcyBvcmRpbmFsXG4gICAgICBpZiAoZW5jb2Rpbmcuc2hhcGUpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuXG4gICAgICAvLyBUT0RPKGthbml0dyk6IGNoZWNrIHRoYXQgdGhlcmUgaXMgcXVhbnQgYXQgbGVhc3QgLi4uXG4gICAgICBpZiAoZW5jb2RpbmcuY29sb3IgJiYgaXNEaW1lbnNpb24oZW5jb2RpbmcuY29sb3IpKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgfSBlbHNlIHsgLy8gcGxvdCB3aXRoIG9uZSBheGlzID0gZG90IHBsb3RcbiAgICBpZiAob3B0Lm9taXREb3RQbG90KSByZXR1cm4gZmFsc2U7XG5cbiAgICAvLyBEb3QgcGxvdCBzaG91bGQgYWx3YXlzIGJlIGhvcml6b250YWxcbiAgICBpZiAob3B0Lm9taXRUcmFucG9zZSAmJiBlbmNvZGluZy55KSByZXR1cm4gZmFsc2U7XG5cbiAgICAvLyBkb3QgcGxvdCBzaG91bGRuJ3QgaGF2ZSBvdGhlciBlbmNvZGluZ1xuICAgIGlmIChvcHQub21pdERvdFBsb3RXaXRoRXh0cmFFbmNvZGluZyAmJiB2bC5rZXlzKGVuY29kaW5nKS5sZW5ndGggPiAxKSByZXR1cm4gZmFsc2U7XG5cbiAgICAvLyBkb3QgcGxvdCB3aXRoIHNoYXBlIGlzIG5vbi1zZW5zZVxuICAgIGlmIChlbmNvZGluZy5zaGFwZSkgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHJldHVybiB0cnVlO1xufVxuXG5mdW5jdGlvbiB0aWNrUnVsZShlbmNvZGluZywgc3RhdHMsIG9wdCkge1xuICAvLyBqc2hpbnQgdW51c2VkOmZhbHNlXG4gIGlmIChlbmNvZGluZy54IHx8IGVuY29kaW5nLnkpIHtcbiAgICBpZih2bC5lbmMuaXNBZ2dyZWdhdGUoZW5jb2RpbmcpKSByZXR1cm4gZmFsc2U7XG5cbiAgICB2YXIgeElzRGltID0gaXNEaW1lbnNpb24oZW5jb2RpbmcueCksXG4gICAgICB5SXNEaW0gPSBpc0RpbWVuc2lvbihlbmNvZGluZy55KTtcblxuICAgIHJldHVybiAoIXhJc0RpbSAmJiAoIWVuY29kaW5nLnkgfHwgaXNPcmRpbmFsU2NhbGUoZW5jb2RpbmcueSkpKSB8fFxuICAgICAgKCF5SXNEaW0gJiYgKCFlbmNvZGluZy54IHx8IGlzT3JkaW5hbFNjYWxlKGVuY29kaW5nLngpKSk7XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG5mdW5jdGlvbiBiYXJSdWxlKGVuY29kaW5nLCBzdGF0cywgb3B0KSB7XG4gIGlmKCFmYWNldHNSdWxlKGVuY29kaW5nLCBzdGF0cywgb3B0KSkgcmV0dXJuIGZhbHNlO1xuXG4gIC8vIGJhciByZXF1aXJlcyBhdCBsZWFzdCB4IG9yIHlcbiAgaWYgKCFlbmNvZGluZy54ICYmICFlbmNvZGluZy55KSByZXR1cm4gZmFsc2U7XG5cbiAgaWYgKG9wdC5vbWl0U2l6ZU9uQmFyICYmIGVuY29kaW5nLnNpemUgIT09IHVuZGVmaW5lZCkgcmV0dXJuIGZhbHNlO1xuXG4gIC8vIEZJWE1FIGFjdHVhbGx5IGNoZWNrIGlmIHRoZXJlIHdvdWxkIGJlIG9jY2x1c2lvbiAjOTBcbiAgLy8gbmVlZCB0byBhZ2dyZWdhdGUgb24gZWl0aGVyIHggb3IgeVxuICB2YXIgYWdnRWl0aGVyWG9yWSA9XG4gICAgKCFlbmNvZGluZy54IHx8IGVuY29kaW5nLnguYWdncmVnYXRlID09PSB1bmRlZmluZWQpIF5cbiAgICAoIWVuY29kaW5nLnkgfHwgZW5jb2RpbmcueS5hZ2dyZWdhdGUgPT09IHVuZGVmaW5lZCk7XG5cblxuICBpZiAoYWdnRWl0aGVyWG9yWSkge1xuICAgIHZhciBlaXRoZXJYb3JZaXNEaW1Pck51bGwgPVxuICAgICAgKCFlbmNvZGluZy54IHx8IGlzRGltZW5zaW9uKGVuY29kaW5nLngpKSBeXG4gICAgICAoIWVuY29kaW5nLnkgfHwgaXNEaW1lbnNpb24oZW5jb2RpbmcueSkpO1xuXG4gICAgaWYgKGVpdGhlclhvcllpc0RpbU9yTnVsbCkge1xuICAgICAgdmFyIGFnZ3JlZ2F0ZSA9IGVuY29kaW5nLnguYWdncmVnYXRlIHx8IGVuY29kaW5nLnkuYWdncmVnYXRlO1xuICAgICAgcmV0dXJuICEob3B0Lm9taXRTdGFja2VkQXZlcmFnZSAmJiBhZ2dyZWdhdGUgPT09J21lYW4nICYmIGVuY29kaW5nLmNvbG9yKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIGxpbmVSdWxlKGVuY29kaW5nLCBzdGF0cywgb3B0KSB7XG4gIGlmKCFmYWNldHNSdWxlKGVuY29kaW5nLCBzdGF0cywgb3B0KSkgcmV0dXJuIGZhbHNlO1xuXG4gIC8vIFRPRE8oa2FuaXR3KTogYWRkIG9taXRWZXJ0aWNhbExpbmUgYXMgY29uZmlnXG5cbiAgLy8gRklYTUUgdHJ1bHkgb3JkaW5hbCBkYXRhIGlzIGZpbmUgaGVyZSB0b28uXG4gIC8vIExpbmUgY2hhcnQgc2hvdWxkIGJlIG9ubHkgaG9yaXpvbnRhbFxuICAvLyBhbmQgdXNlIG9ubHkgdGVtcG9yYWwgZGF0YVxuICByZXR1cm4gZW5jb2RpbmcueC50eXBlID09ICdUJyAmJiBlbmNvZGluZy54LnRpbWVVbml0ICYmIGVuY29kaW5nLnkudHlwZSA9PSAnUScgJiYgZW5jb2RpbmcueS5hZ2dyZWdhdGU7XG59XG5cbmZ1bmN0aW9uIGFyZWFSdWxlKGVuY29kaW5nLCBzdGF0cywgb3B0KSB7XG4gIGlmKCFmYWNldHNSdWxlKGVuY29kaW5nLCBzdGF0cywgb3B0KSkgcmV0dXJuIGZhbHNlO1xuXG4gIGlmKCFsaW5lUnVsZShlbmNvZGluZywgc3RhdHMsIG9wdCkpIHJldHVybiBmYWxzZTtcblxuICByZXR1cm4gIShvcHQub21pdFN0YWNrZWRBdmVyYWdlICYmIGVuY29kaW5nLnkuYWdncmVnYXRlID09PSdtZWFuJyAmJiBlbmNvZGluZy5jb2xvcik7XG59XG5cbmZ1bmN0aW9uIHRleHRSdWxlKGVuY29kaW5nLCBzdGF0cywgb3B0KSB7XG4gIC8vIGF0IGxlYXN0IG11c3QgaGF2ZSByb3cgb3IgY29sIGFuZCBhZ2dyZWdhdGVkIHRleHQgdmFsdWVzXG4gIHJldHVybiAoZW5jb2Rpbmcucm93IHx8IGVuY29kaW5nLmNvbCkgJiYgZW5jb2RpbmcudGV4dCAmJiBlbmNvZGluZy50ZXh0LmFnZ3JlZ2F0ZSAmJiAhZW5jb2RpbmcueCAmJiAhZW5jb2RpbmcueSAmJiAhZW5jb2Rpbmcuc2l6ZSAmJlxuICAgICghb3B0LmFsd2F5c0dlbmVyYXRlVGFibGVBc0hlYXRtYXAgfHwgIWVuY29kaW5nLmNvbG9yKTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWwgPSByZXF1aXJlKCcuLi91dGlsJyksXG4gIGNvbnN0cyA9IHJlcXVpcmUoJy4uL2NvbnN0cycpLFxuICB2bCA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93Wyd2bCddIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbFsndmwnXSA6IG51bGwpLFxuICBpc0RpbWVuc2lvbiA9IHZsLmVuY0RlZi5pc0RpbWVuc2lvbjtcblxubW9kdWxlLmV4cG9ydHMgPSBwcm9qZWN0aW9ucztcblxuLy8gVE9ETyBzdXBwb3J0IG90aGVyIG1vZGUgb2YgcHJvamVjdGlvbnMgZ2VuZXJhdGlvblxuLy8gcG93ZXJzZXQsIGNob29zZUssIGNob29zZUtvckxlc3MgYXJlIGFscmVhZHkgaW5jbHVkZWQgaW4gdGhlIHV0aWxcblxuLyoqXG4gKiBmaWVsZHNcbiAqIEBwYXJhbSAge1t0eXBlXX0gZmllbGREZWZzIGFycmF5IG9mIGZpZWxkcyBhbmQgcXVlcnkgaW5mb3JtYXRpb25cbiAqIEByZXR1cm4ge1t0eXBlXX0gICAgICAgIFtkZXNjcmlwdGlvbl1cbiAqL1xuZnVuY3Rpb24gcHJvamVjdGlvbnMoZmllbGREZWZzLCBzdGF0cywgb3B0KSB7XG4gIG9wdCA9IHZsLnNjaGVtYS51dGlsLmV4dGVuZChvcHR8fHt9LCBjb25zdHMuZ2VuLnByb2plY3Rpb25zKTtcblxuICAvLyBGaXJzdCBjYXRlZ29yaXplIGZpZWxkLCBzZWxlY3RlZCwgZmllbGRzVG9BZGQsIGFuZCBzYXZlIGluZGljZXNcbiAgdmFyIHNlbGVjdGVkID0gW10sIGZpZWxkc1RvQWRkID0gW10sIGZpZWxkU2V0cyA9IFtdLFxuICAgIGhhc1NlbGVjdGVkRGltZW5zaW9uID0gZmFsc2UsXG4gICAgaGFzU2VsZWN0ZWRNZWFzdXJlID0gZmFsc2UsXG4gICAgaW5kaWNlcyA9IHt9O1xuXG4gIGZpZWxkRGVmcy5mb3JFYWNoKGZ1bmN0aW9uKGZpZWxkRGVmLCBpbmRleCl7XG4gICAgLy9zYXZlIGluZGljZXMgZm9yIHN0YWJsZSBzb3J0IGxhdGVyXG4gICAgaW5kaWNlc1tmaWVsZERlZi5uYW1lXSA9IGluZGV4O1xuXG4gICAgaWYgKGZpZWxkRGVmLnNlbGVjdGVkKSB7XG4gICAgICBzZWxlY3RlZC5wdXNoKGZpZWxkRGVmKTtcbiAgICAgIGlmIChpc0RpbWVuc2lvbihmaWVsZERlZikgfHwgZmllbGREZWYudHlwZSA9PT0nVCcpIHsgLy8gRklYTUUgLyBIQUNLXG4gICAgICAgIGhhc1NlbGVjdGVkRGltZW5zaW9uID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGhhc1NlbGVjdGVkTWVhc3VyZSA9IHRydWU7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChmaWVsZERlZi5zZWxlY3RlZCAhPT0gZmFsc2UgJiYgIXZsLmVuY0RlZi5pc0NvdW50KGZpZWxkRGVmKSkge1xuICAgICAgaWYgKHZsLmVuY0RlZi5pc0RpbWVuc2lvbihmaWVsZERlZikgJiZcbiAgICAgICAgICAhb3B0Lm1heENhcmRpbmFsaXR5Rm9yQXV0b0FkZE9yZGluYWwgJiZcbiAgICAgICAgICB2bC5lbmNEZWYuY2FyZGluYWxpdHkoZmllbGREZWYsIHN0YXRzLCAxNSkgPiBvcHQubWF4Q2FyZGluYWxpdHlGb3JBdXRvQWRkT3JkaW5hbFxuICAgICAgICApIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgZmllbGRzVG9BZGQucHVzaChmaWVsZERlZik7XG4gICAgfVxuICB9KTtcblxuICBmaWVsZHNUb0FkZC5zb3J0KGNvbXBhcmVGaWVsZHNUb0FkZChoYXNTZWxlY3RlZERpbWVuc2lvbiwgaGFzU2VsZWN0ZWRNZWFzdXJlLCBpbmRpY2VzKSk7XG5cbiAgdmFyIHNldHNUb0FkZCA9IHV0aWwuY2hvb3NlS29yTGVzcyhmaWVsZHNUb0FkZCwgMSk7XG5cbiAgc2V0c1RvQWRkLmZvckVhY2goZnVuY3Rpb24oc2V0VG9BZGQpIHtcbiAgICB2YXIgZmllbGRTZXQgPSBzZWxlY3RlZC5jb25jYXQoc2V0VG9BZGQpO1xuICAgIGlmIChmaWVsZFNldC5sZW5ndGggPiAwKSB7XG4gICAgICBpZiAob3B0Lm9taXREb3RQbG90ICYmIGZpZWxkU2V0Lmxlbmd0aCA9PT0gMSkgcmV0dXJuO1xuICAgICAgZmllbGRTZXRzLnB1c2goZmllbGRTZXQpO1xuICAgIH1cbiAgfSk7XG5cbiAgZmllbGRTZXRzLmZvckVhY2goZnVuY3Rpb24oZmllbGRTZXQpIHtcbiAgICAgIC8vIGFsd2F5cyBhcHBlbmQgcHJvamVjdGlvbidzIGtleSB0byBlYWNoIHByb2plY3Rpb24gcmV0dXJuZWQsIGQzIHN0eWxlLlxuICAgIGZpZWxkU2V0LmtleSA9IHByb2plY3Rpb25zLmtleShmaWVsZFNldCk7XG4gIH0pO1xuXG4gIHJldHVybiBmaWVsZFNldHM7XG59XG5cbnZhciB0eXBlSXNNZWFzdXJlU2NvcmUgPSB7XG4gIE46IDAsXG4gIE86IDAsXG4gIFQ6IDIsXG4gIFE6IDNcbn07XG5cbmZ1bmN0aW9uIGNvbXBhcmVGaWVsZHNUb0FkZChoYXNTZWxlY3RlZERpbWVuc2lvbiwgaGFzU2VsZWN0ZWRNZWFzdXJlLCBpbmRpY2VzKSB7XG4gIHJldHVybiBmdW5jdGlvbihhLCBiKXtcbiAgICAvLyBzb3J0IGJ5IHR5cGUgb2YgdGhlIGRhdGFcbiAgICBpZiAoYS50eXBlICE9PSBiLnR5cGUpIHtcbiAgICAgIGlmICghaGFzU2VsZWN0ZWREaW1lbnNpb24pIHtcbiAgICAgICAgcmV0dXJuIHR5cGVJc01lYXN1cmVTY29yZVthLnR5cGVdIC0gdHlwZUlzTWVhc3VyZVNjb3JlW2IudHlwZV07XG4gICAgICB9IGVsc2UgeyAvL2lmICghaGFzU2VsZWN0ZWRNZWFzdXJlKSB7XG4gICAgICAgIHJldHVybiB0eXBlSXNNZWFzdXJlU2NvcmVbYi50eXBlXSAtIHR5cGVJc01lYXN1cmVTY29yZVthLnR5cGVdO1xuICAgICAgfVxuICAgIH1cbiAgICAvL21ha2UgdGhlIHNvcnQgc3RhYmxlXG4gICAgcmV0dXJuIGluZGljZXNbYS5uYW1lXSAtIGluZGljZXNbYi5uYW1lXTtcbiAgfTtcbn1cblxucHJvamVjdGlvbnMua2V5ID0gZnVuY3Rpb24ocHJvamVjdGlvbikge1xuICByZXR1cm4gcHJvamVjdGlvbi5tYXAoZnVuY3Rpb24oZmllbGQpIHtcbiAgICByZXR1cm4gdmwuZW5jRGVmLmlzQ291bnQoZmllbGQpID8gJ2NvdW50JyA6IGZpZWxkLm5hbWU7XG4gIH0pLmpvaW4oJywnKTtcbn07XG5cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHZsID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3dbJ3ZsJ10gOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsWyd2bCddIDogbnVsbCksXG4gIGdlbkVuY29kaW5ncyA9IHJlcXVpcmUoJy4vZW5jb2RpbmdzJyksXG4gIGdldE1hcmt0eXBlcyA9IHJlcXVpcmUoJy4vbWFya3R5cGVzJyksXG4gIHJhbmsgPSByZXF1aXJlKCcuLi9yYW5rL3JhbmsnKSxcbiAgY29uc3RzID0gcmVxdWlyZSgnLi4vY29uc3RzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZ2VuU3BlY3NGcm9tRmllbGREZWZzO1xuXG4vKiogRGVzaWduIEVuY29kaW5ncyBmb3IgYSBzZXQgb2YgZmllbGQgZGVmaW5pdGlvbiAqL1xuXG5mdW5jdGlvbiBnZW5TcGVjc0Zyb21GaWVsZERlZnMob3V0cHV0LCBmaWVsZERlZnMsIHN0YXRzLCBvcHQsIG5lc3RlZCkge1xuICAvLyBvcHQgbXVzdCBiZSBhdWdtZW50ZWQgYmVmb3JlIGJlaW5nIHBhc3NlZCB0byBnZW5FbmNvZGluZ3Mgb3IgZ2V0TWFya3R5cGVzXG4gIG9wdCA9IHZsLnNjaGVtYS51dGlsLmV4dGVuZChvcHR8fHt9LCBjb25zdHMuZ2VuLmVuY29kaW5ncyk7XG4gIHZhciBlbmNvZGluZ3MgPSBnZW5FbmNvZGluZ3MoW10sIGZpZWxkRGVmcywgc3RhdHMsIG9wdCk7XG5cbiAgaWYgKG5lc3RlZCkge1xuICAgIHJldHVybiBlbmNvZGluZ3MucmVkdWNlKGZ1bmN0aW9uKGRpY3QsIGVuY29kaW5nKSB7XG4gICAgICBkaWN0W2VuY29kaW5nXSA9IGdlblNwZWNzRnJvbUVuY29kaW5ncyhbXSwgZW5jb2RpbmcsIHN0YXRzLCBvcHQpO1xuICAgICAgcmV0dXJuIGRpY3Q7XG4gICAgfSwge30pO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBlbmNvZGluZ3MucmVkdWNlKGZ1bmN0aW9uKGxpc3QsIGVuY29kaW5nKSB7XG4gICAgICByZXR1cm4gZ2VuU3BlY3NGcm9tRW5jb2RpbmdzKGxpc3QsIGVuY29kaW5nLCBzdGF0cywgb3B0KTtcbiAgICB9LCBbXSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2VuU3BlY3NGcm9tRW5jb2RpbmdzKG91dHB1dCwgZW5jb2RpbmcsIHN0YXRzLCBvcHQpIHtcbiAgZ2V0TWFya3R5cGVzKGVuY29kaW5nLCBzdGF0cywgb3B0KVxuICAgIC5mb3JFYWNoKGZ1bmN0aW9uKG1hcmtUeXBlKSB7XG4gICAgICB2YXIgc3BlYyA9IHZsLmR1cGxpY2F0ZSh7XG4gICAgICAgICAgLy8gQ2xvbmUgY29uZmlnICYgZW5jb2RpbmcgdG8gdW5pcXVlIG9iamVjdHNcbiAgICAgICAgICBlbmNvZGluZzogZW5jb2RpbmcsXG4gICAgICAgICAgY29uZmlnOiBvcHQuY29uZmlnXG4gICAgICAgIH0pO1xuXG4gICAgICBzcGVjLm1hcmt0eXBlID0gbWFya1R5cGU7XG4gICAgICAvLyBEYXRhIG9iamVjdCBpcyB0aGUgc2FtZSBhY3Jvc3MgY2hhcnRzOiBwYXNzIGJ5IHJlZmVyZW5jZVxuICAgICAgc3BlYy5kYXRhID0gb3B0LmRhdGE7XG5cbiAgICAgIHNwZWMgPSBmaW5hbFRvdWNoKHNwZWMsIHN0YXRzLCBvcHQpO1xuICAgICAgdmFyIHNjb3JlID0gcmFuay5lbmNvZGluZyhzcGVjLCBzdGF0cywgb3B0KTtcblxuICAgICAgc3BlYy5faW5mbyA9IHNjb3JlO1xuICAgICAgb3V0cHV0LnB1c2goc3BlYyk7XG4gICAgfSk7XG4gIHJldHVybiBvdXRwdXQ7XG59XG5cbi8vRklYTUUgdGhpcyBzaG91bGQgYmUgcmVmYWN0b3JzXG5mdW5jdGlvbiBmaW5hbFRvdWNoKHNwZWMsIHN0YXRzLCBvcHQpIHtcbiAgaWYgKHNwZWMubWFya3R5cGUgPT09ICd0ZXh0JyAmJiBvcHQuYWx3YXlzR2VuZXJhdGVUYWJsZUFzSGVhdG1hcCkge1xuICAgIHNwZWMuZW5jb2RpbmcuY29sb3IgPSBzcGVjLmVuY29kaW5nLnRleHQ7XG4gIH1cblxuICAvLyBkb24ndCBpbmNsdWRlIHplcm8gaWYgc3RkZXYvbWVhbiA8IDAuMDFcbiAgLy8gaHR0cHM6Ly9naXRodWIuY29tL3V3ZGF0YS92aXNyZWMvaXNzdWVzLzY5XG4gIHZhciBlbmNvZGluZyA9IHNwZWMuZW5jb2Rpbmc7XG4gIFsneCcsICd5J10uZm9yRWFjaChmdW5jdGlvbihlbmNUeXBlKSB7XG4gICAgdmFyIGZpZWxkID0gZW5jb2RpbmdbZW5jVHlwZV07XG4gICAgaWYgKGZpZWxkICYmIHZsLmVuY0RlZi5pc01lYXN1cmUoZmllbGQpICYmICF2bC5lbmNEZWYuaXNDb3VudChmaWVsZCkpIHtcbiAgICAgIHZhciBzdGF0ID0gc3RhdHNbZmllbGQubmFtZV07XG4gICAgICBpZiAoc3RhdCAmJiBzdGF0LnN0ZGV2IC8gc3RhdC5tZWFuIDwgMC4wMSkge1xuICAgICAgICBmaWVsZC5zY2FsZSA9IHt6ZXJvOiBmYWxzZX07XG4gICAgICB9XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIHNwZWM7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBnID0gZ2xvYmFsIHx8IHdpbmRvdztcblxucmVxdWlyZSgndmVnYS1saXRlL3NyYy9nbG9iYWxzJyk7XG5cbmcuQ0hBUlRfVFlQRVMgPSB7XG4gIFRBQkxFOiAnVEFCTEUnLFxuICBCQVI6ICdCQVInLFxuICBQTE9UOiAnUExPVCcsXG4gIExJTkU6ICdMSU5FJyxcbiAgQVJFQTogJ0FSRUEnLFxuICBNQVA6ICdNQVAnLFxuICBISVNUT0dSQU06ICdISVNUT0dSQU0nXG59O1xuXG5nLkFOWV9EQVRBX1RZUEVTID0gKDEgPDwgNCkgLSAxOyIsIm1vZHVsZS5leHBvcnRzID0ge1xuICBlbmNvZGluZzogcmVxdWlyZSgnLi9yYW5rRW5jb2RpbmdzJylcbn07XG5cblxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5yZXF1aXJlKCcuLi9nbG9iYWxzJyk7XG5cbnZhciB2bCA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93Wyd2bCddIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbFsndmwnXSA6IG51bGwpLFxuICBpc0RpbWVuc2lvbiA9IHZsLmVuY0RlZi5pc0RpbWVuc2lvbjtcblxubW9kdWxlLmV4cG9ydHMgPSByYW5rRW5jb2RpbmdzO1xuXG4vLyBiYWQgc2NvcmUgbm90IHNwZWNpZmllZCBpbiB0aGUgdGFibGUgYWJvdmVcbnZhciBVTlVTRURfUE9TSVRJT04gPSAwLjU7XG5cbnZhciBNQVJLX1NDT1JFID0ge1xuICBsaW5lOiAwLjk5LFxuICBhcmVhOiAwLjk4LFxuICBiYXI6IDAuOTcsXG4gIHRpY2s6IDAuOTYsXG4gIHBvaW50OiAwLjk1LFxuICBjaXJjbGU6IDAuOTQsXG4gIHNxdWFyZTogMC45NCxcbiAgdGV4dDogMC44XG59O1xuXG5mdW5jdGlvbiByYW5rRW5jb2RpbmdzKHNwZWMsIHN0YXRzLCBvcHQsIHNlbGVjdGVkKSB7XG4gIHZhciBmZWF0dXJlcyA9IFtdLFxuICAgIGVuY1R5cGVzID0gdmwua2V5cyhzcGVjLmVuY29kaW5nKSxcbiAgICBtYXJrdHlwZSA9IHNwZWMubWFya3R5cGUsXG4gICAgZW5jb2RpbmcgPSBzcGVjLmVuY29kaW5nO1xuXG4gIHZhciBlbmNvZGluZ01hcHBpbmdCeUZpZWxkID0gdmwuZW5jLnJlZHVjZShzcGVjLmVuY29kaW5nLCBmdW5jdGlvbihvLCBmaWVsZERlZiwgZW5jVHlwZSkge1xuICAgIHZhciBrZXkgPSB2bC5lbmNEZWYuc2hvcnRoYW5kKGZpZWxkRGVmKTtcbiAgICB2YXIgbWFwcGluZ3MgPSBvW2tleV0gPSBvW2tleV0gfHwgW107XG4gICAgbWFwcGluZ3MucHVzaCh7ZW5jVHlwZTogZW5jVHlwZSwgZmllbGQ6IGZpZWxkRGVmfSk7XG4gICAgcmV0dXJuIG87XG4gIH0sIHt9KTtcblxuICAvLyBkYXRhIC0gZW5jb2RpbmcgbWFwcGluZyBzY29yZVxuICB2bC5mb3JFYWNoKGVuY29kaW5nTWFwcGluZ0J5RmllbGQsIGZ1bmN0aW9uKG1hcHBpbmdzKSB7XG4gICAgdmFyIHJlYXNvbnMgPSBtYXBwaW5ncy5tYXAoZnVuY3Rpb24obSkge1xuICAgICAgICByZXR1cm4gbS5lbmNUeXBlICsgdmwuc2hvcnRoYW5kLmFzc2lnbiArIHZsLmVuY0RlZi5zaG9ydGhhbmQobS5maWVsZCkgK1xuICAgICAgICAgICcgJyArIChzZWxlY3RlZCAmJiBzZWxlY3RlZFttLmZpZWxkLm5hbWVdID8gJ1t4XScgOiAnWyBdJyk7XG4gICAgICB9KSxcbiAgICAgIHNjb3JlcyA9IG1hcHBpbmdzLm1hcChmdW5jdGlvbihtKSB7XG4gICAgICAgIHZhciByb2xlID0gdmwuZW5jRGVmLmlzRGltZW5zaW9uKG0uZmllbGQpID8gJ2RpbWVuc2lvbicgOiAnbWVhc3VyZSc7XG5cbiAgICAgICAgdmFyIHNjb3JlID0gcmFua0VuY29kaW5ncy5zY29yZVtyb2xlXShtLmZpZWxkLCBtLmVuY1R5cGUsIHNwZWMubWFya3R5cGUsIHN0YXRzLCBvcHQpO1xuXG4gICAgICAgIHJldHVybiAhc2VsZWN0ZWQgfHwgc2VsZWN0ZWRbbS5maWVsZC5uYW1lXSA/IHNjb3JlIDogTWF0aC5wb3coc2NvcmUsIDAuMTI1KTtcbiAgICAgIH0pO1xuXG4gICAgZmVhdHVyZXMucHVzaCh7XG4gICAgICByZWFzb246IHJlYXNvbnMuam9pbihcIiB8IFwiKSxcbiAgICAgIHNjb3JlOiBNYXRoLm1heC5hcHBseShudWxsLCBzY29yZXMpXG4gICAgfSk7XG4gIH0pO1xuXG4gIC8vIHBsb3QgdHlwZVxuICBpZiAobWFya3R5cGUgPT09IFRFWFQpIHtcbiAgICAvLyBUT0RPXG4gIH0gZWxzZSB7XG4gICAgaWYgKGVuY29kaW5nLnggJiYgZW5jb2RpbmcueSkge1xuICAgICAgaWYgKGlzRGltZW5zaW9uKGVuY29kaW5nLngpIF4gaXNEaW1lbnNpb24oZW5jb2RpbmcueSkpIHtcbiAgICAgICAgZmVhdHVyZXMucHVzaCh7XG4gICAgICAgICAgcmVhc29uOiAnT3hRIHBsb3QnLFxuICAgICAgICAgIHNjb3JlOiAwLjhcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gcGVuYWxpemUgbm90IHVzaW5nIHBvc2l0aW9uYWwgb25seSBwZW5hbGl6ZSBmb3Igbm9uLXRleHRcbiAgaWYgKGVuY1R5cGVzLmxlbmd0aCA+IDEgJiYgbWFya3R5cGUgIT09IFRFWFQpIHtcbiAgICBpZiAoKCFlbmNvZGluZy54IHx8ICFlbmNvZGluZy55KSAmJiAhZW5jb2RpbmcuZ2VvICYmICFlbmNvZGluZy50ZXh0KSB7XG4gICAgICBmZWF0dXJlcy5wdXNoKHtcbiAgICAgICAgcmVhc29uOiAndW51c2VkIHBvc2l0aW9uJyxcbiAgICAgICAgc2NvcmU6IFVOVVNFRF9QT1NJVElPTlxuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgLy8gbWFyayB0eXBlIHNjb3JlXG4gIGZlYXR1cmVzLnB1c2goe1xuICAgIHJlYXNvbjogJ21hcmt0eXBlPScrbWFya3R5cGUsXG4gICAgc2NvcmU6IE1BUktfU0NPUkVbbWFya3R5cGVdXG4gIH0pO1xuXG4gIHJldHVybiB7XG4gICAgc2NvcmU6IGZlYXR1cmVzLnJlZHVjZShmdW5jdGlvbihwLCBmKSB7XG4gICAgICByZXR1cm4gcCAqIGYuc2NvcmU7XG4gICAgfSwgMSksXG4gICAgZmVhdHVyZXM6IGZlYXR1cmVzXG4gIH07XG59XG5cblxudmFyIEQgPSB7fSwgTSA9IHt9LCBCQUQgPSAwLjEsIFRFUlJJQkxFID0gMC4wMTtcblxuRC5taW5vciA9IDAuMDE7XG5ELnBvcyA9IDE7XG5ELllfVCA9IDAuODtcbkQuZmFjZXRfdGV4dCA9IDE7XG5ELmZhY2V0X2dvb2QgPSAwLjY3NTsgLy8gPCBjb2xvcl9vaywgPiBjb2xvcl9iYWRcbkQuZmFjZXRfb2sgPSAwLjU1O1xuRC5mYWNldF9iYWQgPSAwLjQ7XG5ELmNvbG9yX2dvb2QgPSAwLjc7XG5ELmNvbG9yX29rID0gMC42NTsgLy8gPiBNLlNpemVcbkQuY29sb3JfYmFkID0gMC4zO1xuRC5jb2xvcl9zdGFjayA9IDAuNjtcbkQuc2hhcGUgPSAwLjY7XG5ELmRldGFpbCA9IDAuNTtcbkQuYmFkID0gQkFEO1xuRC50ZXJyaWJsZSA9IFRFUlJJQkxFO1xuXG5NLnBvcyA9IDE7XG5NLnNpemUgPSAwLjY7XG5NLmNvbG9yID0gMC41O1xuTS50ZXh0ID0gMC40O1xuTS5iYWQgPSBCQUQ7XG5NLnRlcnJpYmxlID0gVEVSUklCTEU7XG5cbnJhbmtFbmNvZGluZ3MuZGltZW5zaW9uU2NvcmUgPSBmdW5jdGlvbiAoZmllbGREZWYsIGVuY1R5cGUsIG1hcmt0eXBlLCBzdGF0cywgb3B0KXtcbiAgdmFyIGNhcmRpbmFsaXR5ID0gdmwuZW5jRGVmLmNhcmRpbmFsaXR5KGZpZWxkRGVmLCBzdGF0cyk7XG4gIHN3aXRjaCAoZW5jVHlwZSkge1xuICAgIGNhc2UgWDpcbiAgICAgIGlmICh2bC5lbmNEZWYuaXNUeXBlcyhmaWVsZERlZiwgW04sIE9dKSkgIHJldHVybiBELnBvcyAtIEQubWlub3I7XG4gICAgICByZXR1cm4gRC5wb3M7XG5cbiAgICBjYXNlIFk6XG4gICAgICBpZiAodmwuZW5jRGVmLmlzVHlwZXMoZmllbGREZWYsIFtOLCBPXSkpIHJldHVybiBELnBvcyAtIEQubWlub3I7IC8vcHJlZmVyIG9yZGluYWwgb24geVxuICAgICAgaWYgKGZpZWxkRGVmLnR5cGUgPT09IFQpIHJldHVybiBELllfVDsgLy8gdGltZSBzaG91bGQgbm90IGJlIG9uIFlcbiAgICAgIHJldHVybiBELnBvcyAtIEQubWlub3I7XG5cbiAgICBjYXNlIENPTDpcbiAgICAgIGlmIChtYXJrdHlwZSA9PT0gVEVYVCkgcmV0dXJuIEQuZmFjZXRfdGV4dDtcbiAgICAgIC8vcHJlZmVyIGNvbHVtbiBvdmVyIHJvdyBkdWUgdG8gc2Nyb2xsaW5nIGlzc3Vlc1xuICAgICAgcmV0dXJuIGNhcmRpbmFsaXR5IDw9IG9wdC5tYXhHb29kQ2FyZGluYWxpdHlGb3JGYWNldHMgPyBELmZhY2V0X2dvb2QgOlxuICAgICAgICBjYXJkaW5hbGl0eSA8PSBvcHQubWF4Q2FyZGluYWxpdHlGb3JGYWNldHMgPyBELmZhY2V0X29rIDogRC5mYWNldF9iYWQ7XG5cbiAgICBjYXNlIFJPVzpcbiAgICAgIGlmIChtYXJrdHlwZSA9PT0gVEVYVCkgcmV0dXJuIEQuZmFjZXRfdGV4dDtcbiAgICAgIHJldHVybiAoY2FyZGluYWxpdHkgPD0gb3B0Lm1heEdvb2RDYXJkaW5hbGl0eUZvckZhY2V0cyA/IEQuZmFjZXRfZ29vZCA6XG4gICAgICAgIGNhcmRpbmFsaXR5IDw9IG9wdC5tYXhDYXJkaW5hbGl0eUZvckZhY2V0cyA/IEQuZmFjZXRfb2sgOiBELmZhY2V0X2JhZCkgLSBELm1pbm9yO1xuXG4gICAgY2FzZSBDT0xPUjpcbiAgICAgIHZhciBoYXNPcmRlciA9IChmaWVsZERlZi5iaW4gJiYgZmllbGREZWYudHlwZT09PVEpIHx8IChmaWVsZERlZi50aW1lVW5pdCAmJiBmaWVsZERlZi50eXBlPT09VCk7XG5cbiAgICAgIC8vRklYTUUgYWRkIHN0YWNraW5nIG9wdGlvbiBvbmNlIHdlIGhhdmUgY29udHJvbCAuLlxuICAgICAgdmFyIGlzU3RhY2tlZCA9IG1hcmt0eXBlID09PSAnYmFyJyB8fCBtYXJrdHlwZSA9PT0gJ2FyZWEnO1xuXG4gICAgICAvLyB0cnVlIG9yZGluYWwgb24gY29sb3IgaXMgY3VycmVudGx5IEJBRCAodW50aWwgd2UgaGF2ZSBnb29kIG9yZGluYWwgY29sb3Igc2NhbGUgc3VwcG9ydClcbiAgICAgIGlmIChoYXNPcmRlcikgcmV0dXJuIEQuY29sb3JfYmFkO1xuXG4gICAgICAvL3N0YWNraW5nIGdldHMgbG93ZXIgc2NvcmVcbiAgICAgIGlmIChpc1N0YWNrZWQpIHJldHVybiBELmNvbG9yX3N0YWNrO1xuXG4gICAgICByZXR1cm4gY2FyZGluYWxpdHkgPD0gb3B0Lm1heEdvb2RDYXJkaW5hbGl0eUZvckNvbG9yID8gRC5jb2xvcl9nb29kOiBjYXJkaW5hbGl0eSA8PSBvcHQubWF4Q2FyZGluYWxpdHlGb3JDb2xvciA/IEQuY29sb3Jfb2sgOiBELmNvbG9yX2JhZDtcbiAgICBjYXNlIFNIQVBFOlxuICAgICAgcmV0dXJuIGNhcmRpbmFsaXR5IDw9IG9wdC5tYXhDYXJkaW5hbGl0eUZvclNoYXBlID8gRC5zaGFwZSA6IFRFUlJJQkxFO1xuICAgIGNhc2UgREVUQUlMOlxuICAgICAgcmV0dXJuIEQuZGV0YWlsO1xuICB9XG4gIHJldHVybiBURVJSSUJMRTtcbn07XG5cbnJhbmtFbmNvZGluZ3MuZGltZW5zaW9uU2NvcmUuY29uc3RzID0gRDtcblxucmFua0VuY29kaW5ncy5tZWFzdXJlU2NvcmUgPSBmdW5jdGlvbiAoZmllbGREZWYsIGVuY1R5cGUsIG1hcmt0eXBlLCBzdGF0cywgb3B0KSB7XG4gIC8vIGpzaGludCB1bnVzZWQ6ZmFsc2VcbiAgc3dpdGNoIChlbmNUeXBlKXtcbiAgICBjYXNlIFg6IHJldHVybiBNLnBvcztcbiAgICBjYXNlIFk6IHJldHVybiBNLnBvcztcbiAgICBjYXNlIFNJWkU6XG4gICAgICBpZiAobWFya3R5cGUgPT09ICdiYXInKSByZXR1cm4gQkFEOyAvL3NpemUgb2YgYmFyIGlzIHZlcnkgYmFkXG4gICAgICBpZiAobWFya3R5cGUgPT09IFRFWFQpIHJldHVybiBCQUQ7XG4gICAgICBpZiAobWFya3R5cGUgPT09ICdsaW5lJykgcmV0dXJuIEJBRDtcbiAgICAgIHJldHVybiBNLnNpemU7XG4gICAgY2FzZSBDT0xPUjogcmV0dXJuIE0uY29sb3I7XG4gICAgY2FzZSBURVhUOiByZXR1cm4gTS50ZXh0O1xuICB9XG4gIHJldHVybiBCQUQ7XG59O1xuXG5yYW5rRW5jb2RpbmdzLm1lYXN1cmVTY29yZS5jb25zdHMgPSBNO1xuXG5cbnJhbmtFbmNvZGluZ3Muc2NvcmUgPSB7XG4gIGRpbWVuc2lvbjogcmFua0VuY29kaW5ncy5kaW1lbnNpb25TY29yZSxcbiAgbWVhc3VyZTogcmFua0VuY29kaW5ncy5tZWFzdXJlU2NvcmUsXG59O1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBjb25zdHMgPSByZXF1aXJlKCcuL2NvbnN0cycpO1xuXG52YXIgdXRpbCA9IG1vZHVsZS5leHBvcnRzID0ge1xuICBnZW46IHt9XG59O1xuXG51dGlsLmlzQXJyYXkgPSBBcnJheS5pc0FycmF5IHx8IGZ1bmN0aW9uIChvYmopIHtcbiAgcmV0dXJuIHt9LnRvU3RyaW5nLmNhbGwob2JqKSA9PSAnW29iamVjdCBBcnJheV0nO1xufTtcblxudXRpbC5qc29uID0gZnVuY3Rpb24ocywgc3ApIHtcbiAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KHMsIG51bGwsIHNwKTtcbn07XG5cbnV0aWwua2V5cyA9IGZ1bmN0aW9uKG9iaikge1xuICB2YXIgayA9IFtdLCB4O1xuICBmb3IgKHggaW4gb2JqKSBrLnB1c2goeCk7XG4gIHJldHVybiBrO1xufTtcblxudXRpbC5uZXN0ZWRNYXAgPSBmdW5jdGlvbiAoY29sLCBmLCBsZXZlbCwgZmlsdGVyKSB7XG4gIHJldHVybiBsZXZlbCA9PT0gMCA/XG4gICAgY29sLm1hcChmKSA6XG4gICAgY29sLm1hcChmdW5jdGlvbih2KSB7XG4gICAgICB2YXIgciA9IHV0aWwubmVzdGVkTWFwKHYsIGYsIGxldmVsIC0gMSk7XG4gICAgICByZXR1cm4gZmlsdGVyID8gci5maWx0ZXIodXRpbC5ub25FbXB0eSkgOiByO1xuICAgIH0pO1xufTtcblxudXRpbC5uZXN0ZWRSZWR1Y2UgPSBmdW5jdGlvbiAoY29sLCBmLCBsZXZlbCwgZmlsdGVyKSB7XG4gIHJldHVybiBsZXZlbCA9PT0gMCA/XG4gICAgY29sLnJlZHVjZShmLCBbXSkgOlxuICAgIGNvbC5tYXAoZnVuY3Rpb24odikge1xuICAgICAgdmFyIHIgPSB1dGlsLm5lc3RlZFJlZHVjZSh2LCBmLCBsZXZlbCAtIDEpO1xuICAgICAgcmV0dXJuIGZpbHRlciA/IHIuZmlsdGVyKHV0aWwubm9uRW1wdHkpIDogcjtcbiAgICB9KTtcbn07XG5cbnV0aWwubm9uRW1wdHkgPSBmdW5jdGlvbihncnApIHtcbiAgcmV0dXJuICF1dGlsLmlzQXJyYXkoZ3JwKSB8fCBncnAubGVuZ3RoID4gMDtcbn07XG5cblxudXRpbC50cmF2ZXJzZSA9IGZ1bmN0aW9uIChub2RlLCBhcnIpIHtcbiAgaWYgKG5vZGUudmFsdWUgIT09IHVuZGVmaW5lZCkge1xuICAgIGFyci5wdXNoKG5vZGUudmFsdWUpO1xuICB9IGVsc2Uge1xuICAgIGlmIChub2RlLmxlZnQpIHV0aWwudHJhdmVyc2Uobm9kZS5sZWZ0LCBhcnIpO1xuICAgIGlmIChub2RlLnJpZ2h0KSB1dGlsLnRyYXZlcnNlKG5vZGUucmlnaHQsIGFycik7XG4gIH1cbiAgcmV0dXJuIGFycjtcbn07XG5cbnV0aWwudW5pb24gPSBmdW5jdGlvbiAoYSwgYikge1xuICB2YXIgbyA9IHt9O1xuICBhLmZvckVhY2goZnVuY3Rpb24oeCkgeyBvW3hdID0gdHJ1ZTt9KTtcbiAgYi5mb3JFYWNoKGZ1bmN0aW9uKHgpIHsgb1t4XSA9IHRydWU7fSk7XG4gIHJldHVybiB1dGlsLmtleXMobyk7XG59O1xuXG5cbnV0aWwuZ2VuLmdldE9wdCA9IGZ1bmN0aW9uIChvcHQpIHtcbiAgLy9tZXJnZSB3aXRoIGRlZmF1bHRcbiAgcmV0dXJuIChvcHQgPyB1dGlsLmtleXMob3B0KSA6IFtdKS5yZWR1Y2UoZnVuY3Rpb24oYywgaykge1xuICAgIGNba10gPSBvcHRba107XG4gICAgcmV0dXJuIGM7XG4gIH0sIE9iamVjdC5jcmVhdGUoY29uc3RzLmdlbi5ERUZBVUxUX09QVCkpO1xufTtcblxuLyoqXG4gKiBwb3dlcnNldCBjb2RlIGZyb20gaHR0cDovL3Jvc2V0dGFjb2RlLm9yZy93aWtpL1Bvd2VyX1NldCNKYXZhU2NyaXB0XG4gKlxuICogICB2YXIgcmVzID0gcG93ZXJzZXQoWzEsMiwzLDRdKTtcbiAqXG4gKiByZXR1cm5zXG4gKlxuICogW1tdLFsxXSxbMl0sWzEsMl0sWzNdLFsxLDNdLFsyLDNdLFsxLDIsM10sWzRdLFsxLDRdLFxuICogWzIsNF0sWzEsMiw0XSxbMyw0XSxbMSwzLDRdLFsyLDMsNF0sWzEsMiwzLDRdXVxuW2VkaXRdXG4qL1xuXG51dGlsLnBvd2Vyc2V0ID0gZnVuY3Rpb24obGlzdCkge1xuICB2YXIgcHMgPSBbXG4gICAgW11cbiAgXTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgZm9yICh2YXIgaiA9IDAsIGxlbiA9IHBzLmxlbmd0aDsgaiA8IGxlbjsgaisrKSB7XG4gICAgICBwcy5wdXNoKHBzW2pdLmNvbmNhdChsaXN0W2ldKSk7XG4gICAgfVxuICB9XG4gIHJldHVybiBwcztcbn07XG5cbnV0aWwuY2hvb3NlS29yTGVzcyA9IGZ1bmN0aW9uKGxpc3QsIGspIHtcbiAgdmFyIHN1YnNldCA9IFtbXV07XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7IGkrKykge1xuICAgIGZvciAodmFyIGogPSAwLCBsZW4gPSBzdWJzZXQubGVuZ3RoOyBqIDwgbGVuOyBqKyspIHtcbiAgICAgIHZhciBzdWIgPSBzdWJzZXRbal0uY29uY2F0KGxpc3RbaV0pO1xuICAgICAgaWYoc3ViLmxlbmd0aCA8PSBrKXtcbiAgICAgICAgc3Vic2V0LnB1c2goc3ViKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIHN1YnNldDtcbn07XG5cbnV0aWwuY2hvb3NlSyA9IGZ1bmN0aW9uKGxpc3QsIGspIHtcbiAgdmFyIHN1YnNldCA9IFtbXV07XG4gIHZhciBrQXJyYXkgPVtdO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGxpc3QubGVuZ3RoOyBpKyspIHtcbiAgICBmb3IgKHZhciBqID0gMCwgbGVuID0gc3Vic2V0Lmxlbmd0aDsgaiA8IGxlbjsgaisrKSB7XG4gICAgICB2YXIgc3ViID0gc3Vic2V0W2pdLmNvbmNhdChsaXN0W2ldKTtcbiAgICAgIGlmKHN1Yi5sZW5ndGggPCBrKXtcbiAgICAgICAgc3Vic2V0LnB1c2goc3ViKTtcbiAgICAgIH1lbHNlIGlmIChzdWIubGVuZ3RoID09PSBrKXtcbiAgICAgICAga0FycmF5LnB1c2goc3ViKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIGtBcnJheTtcbn07XG5cbnV0aWwuY3Jvc3MgPSBmdW5jdGlvbihhLGIpe1xuICB2YXIgeCA9IFtdO1xuICBmb3IodmFyIGk9MDsgaTwgYS5sZW5ndGg7IGkrKyl7XG4gICAgZm9yKHZhciBqPTA7ajwgYi5sZW5ndGg7IGorKyl7XG4gICAgICB4LnB1c2goYVtpXS5jb25jYXQoYltqXSkpO1xuICAgIH1cbiAgfVxuICByZXR1cm4geDtcbn07XG5cbiJdfQ==
