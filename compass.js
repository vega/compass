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
"use strict";

module.exports = cluster;

var vl = (typeof window !== "undefined" ? window['vl'] : typeof global !== "undefined" ? global['vl'] : null),
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

},{"../util":19,"./clusterconsts":6,"./distance":7,"clusterfck":1}],6:[function(require,module,exports){
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

},{}],7:[function(require,module,exports){
(function (global){
'use strict';

var vl = (typeof window !== "undefined" ? window['vl'] : typeof global !== "undefined" ? global['vl'] : null),
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

},{"../util":19,"./clusterconsts":6}],8:[function(require,module,exports){
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




},{}],9:[function(require,module,exports){
module.exports = {
  consts: require('./consts'),
  cluster: require('./cluster/cluster'),
  gen: require('./gen/gen'),
  rank: require('./rank/rank'),
  util: require('./util'),
  auto: "-, sum"
};



},{"./cluster/cluster":5,"./consts":8,"./gen/gen":13,"./rank/rank":17,"./util":19}],10:[function(require,module,exports){
(function (global){
'use strict';

var vl = (typeof window !== "undefined" ? window['vl'] : typeof global !== "undefined" ? global['vl'] : null);

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

},{"../consts":8}],11:[function(require,module,exports){
(function (global){
'use strict';

var vl = (typeof window !== "undefined" ? window['vl'] : typeof global !== "undefined" ? global['vl'] : null),
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

},{"../consts":8,"../rank/rank":17,"./encs":12,"./marktypes":14}],12:[function(require,module,exports){
(function (global){
"use strict";
require('../globals');

var vl = (typeof window !== "undefined" ? window['vl'] : typeof global !== "undefined" ? global['vl'] : null),
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

},{"../consts":8,"../globals":16,"./marktypes":14}],13:[function(require,module,exports){
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
},{"../util":19,"./aggregates":10,"./encodings":11,"./encs":12,"./marktypes":14,"./projections":15}],14:[function(require,module,exports){
(function (global){
"use strict";

var vl = (typeof window !== "undefined" ? window['vl'] : typeof global !== "undefined" ? global['vl'] : null),
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

},{"../consts":8}],15:[function(require,module,exports){
(function (global){
'use strict';

var util = require('../util'),
  consts = require('../consts'),
  vl = (typeof window !== "undefined" ? window['vl'] : typeof global !== "undefined" ? global['vl'] : null),
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
    return vl.field.isCount(field) ? 'count' : field.name;
  }).join(',');
};


}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"../consts":8,"../util":19}],16:[function(require,module,exports){
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

},{"vega-lite/src/globals":20}],17:[function(require,module,exports){
module.exports = {
  encoding: require('./rankEncodings')
};



},{"./rankEncodings":18}],18:[function(require,module,exports){
(function (global){
'use strict';

require('../globals');

var vl = (typeof window !== "undefined" ? window['vl'] : typeof global !== "undefined" ? global['vl'] : null),
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
        var role = vl.field.isDimension(m.field) ? 'dimension' : 'measure';

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

},{"../globals":16}],19:[function(require,module,exports){
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


},{"./consts":8}],20:[function(require,module,exports){
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
g.TEXT = 'text';
g.DETAIL = 'detail';

g.N = 'N';
g.O = 'O';
g.Q = 'Q';
g.T = 'T';

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}]},{},[9])(9)
});
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvY2x1c3RlcmZjay9saWIvY2x1c3RlcmZjay5qcyIsIm5vZGVfbW9kdWxlcy9jbHVzdGVyZmNrL2xpYi9kaXN0YW5jZS5qcyIsIm5vZGVfbW9kdWxlcy9jbHVzdGVyZmNrL2xpYi9oY2x1c3Rlci5qcyIsIm5vZGVfbW9kdWxlcy9jbHVzdGVyZmNrL2xpYi9rbWVhbnMuanMiLCJzcmMvY2x1c3Rlci9jbHVzdGVyLmpzIiwic3JjL2NsdXN0ZXIvY2x1c3RlcmNvbnN0cy5qcyIsInNyYy9jbHVzdGVyL2Rpc3RhbmNlLmpzIiwic3JjL2NvbnN0cy5qcyIsInNyYy9jcCIsInNyYy9nZW4vYWdncmVnYXRlcy5qcyIsInNyYy9nZW4vZW5jb2RpbmdzLmpzIiwic3JjL2dlbi9lbmNzLmpzIiwic3JjL2dlbi9nZW4uanMiLCJzcmMvZ2VuL21hcmt0eXBlcy5qcyIsInNyYy9nZW4vcHJvamVjdGlvbnMuanMiLCJzcmMvZ2xvYmFscy5qcyIsInNyYy9yYW5rL3JhbmsuanMiLCJzcmMvcmFuay9yYW5rRW5jb2RpbmdzLmpzIiwic3JjL3V0aWwuanMiLCIuLi92ZWdhLWxpdGUvc3JjL2dsb2JhbHMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDN0dBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDdkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDNUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUMvS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDL0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNoTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDOUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ2hKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNoR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ2hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQy9MQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ3RJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgIGhjbHVzdGVyOiByZXF1aXJlKFwiLi9oY2x1c3RlclwiKSxcbiAgIEttZWFuczogcmVxdWlyZShcIi4va21lYW5zXCIpLFxuICAga21lYW5zOiByZXF1aXJlKFwiLi9rbWVhbnNcIikua21lYW5zXG59OyIsIm1vZHVsZS5leHBvcnRzID0ge1xuICBldWNsaWRlYW46IGZ1bmN0aW9uKHYxLCB2Mikge1xuICAgICAgdmFyIHRvdGFsID0gMDtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdjEubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgIHRvdGFsICs9IE1hdGgucG93KHYyW2ldIC0gdjFbaV0sIDIpOyAgICAgIFxuICAgICAgfVxuICAgICAgcmV0dXJuIE1hdGguc3FydCh0b3RhbCk7XG4gICB9LFxuICAgbWFuaGF0dGFuOiBmdW5jdGlvbih2MSwgdjIpIHtcbiAgICAgdmFyIHRvdGFsID0gMDtcbiAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB2MS5sZW5ndGggOyBpKyspIHtcbiAgICAgICAgdG90YWwgKz0gTWF0aC5hYnModjJbaV0gLSB2MVtpXSk7ICAgICAgXG4gICAgIH1cbiAgICAgcmV0dXJuIHRvdGFsO1xuICAgfSxcbiAgIG1heDogZnVuY3Rpb24odjEsIHYyKSB7XG4gICAgIHZhciBtYXggPSAwO1xuICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHYxLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIG1heCA9IE1hdGgubWF4KG1heCAsIE1hdGguYWJzKHYyW2ldIC0gdjFbaV0pKTsgICAgICBcbiAgICAgfVxuICAgICByZXR1cm4gbWF4O1xuICAgfVxufTsiLCJ2YXIgZGlzdGFuY2VzID0gcmVxdWlyZShcIi4vZGlzdGFuY2VcIik7XG5cbnZhciBIaWVyYXJjaGljYWxDbHVzdGVyaW5nID0gZnVuY3Rpb24oZGlzdGFuY2UsIGxpbmthZ2UsIHRocmVzaG9sZCkge1xuICAgdGhpcy5kaXN0YW5jZSA9IGRpc3RhbmNlO1xuICAgdGhpcy5saW5rYWdlID0gbGlua2FnZTtcbiAgIHRoaXMudGhyZXNob2xkID0gdGhyZXNob2xkID09IHVuZGVmaW5lZCA/IEluZmluaXR5IDogdGhyZXNob2xkO1xufVxuXG5IaWVyYXJjaGljYWxDbHVzdGVyaW5nLnByb3RvdHlwZSA9IHtcbiAgIGNsdXN0ZXIgOiBmdW5jdGlvbihpdGVtcywgc25hcHNob3RQZXJpb2QsIHNuYXBzaG90Q2IpIHtcbiAgICAgIHRoaXMuY2x1c3RlcnMgPSBbXTtcbiAgICAgIHRoaXMuZGlzdHMgPSBbXTsgIC8vIGRpc3RhbmNlcyBiZXR3ZWVuIGVhY2ggcGFpciBvZiBjbHVzdGVyc1xuICAgICAgdGhpcy5taW5zID0gW107IC8vIGNsb3Nlc3QgY2x1c3RlciBmb3IgZWFjaCBjbHVzdGVyXG4gICAgICB0aGlzLmluZGV4ID0gW107IC8vIGtlZXAgYSBoYXNoIG9mIGFsbCBjbHVzdGVycyBieSBrZXlcbiAgICAgIFxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBpdGVtcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgdmFyIGNsdXN0ZXIgPSB7XG4gICAgICAgICAgICB2YWx1ZTogaXRlbXNbaV0sXG4gICAgICAgICAgICBrZXk6IGksXG4gICAgICAgICAgICBpbmRleDogaSxcbiAgICAgICAgICAgIHNpemU6IDFcbiAgICAgICAgIH07XG4gICAgICAgICB0aGlzLmNsdXN0ZXJzW2ldID0gY2x1c3RlcjtcbiAgICAgICAgIHRoaXMuaW5kZXhbaV0gPSBjbHVzdGVyO1xuICAgICAgICAgdGhpcy5kaXN0c1tpXSA9IFtdO1xuICAgICAgICAgdGhpcy5taW5zW2ldID0gMDtcbiAgICAgIH1cblxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmNsdXN0ZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8PSBpOyBqKyspIHtcbiAgICAgICAgICAgIHZhciBkaXN0ID0gKGkgPT0gaikgPyBJbmZpbml0eSA6IFxuICAgICAgICAgICAgICAgdGhpcy5kaXN0YW5jZSh0aGlzLmNsdXN0ZXJzW2ldLnZhbHVlLCB0aGlzLmNsdXN0ZXJzW2pdLnZhbHVlKTtcbiAgICAgICAgICAgIHRoaXMuZGlzdHNbaV1bal0gPSBkaXN0O1xuICAgICAgICAgICAgdGhpcy5kaXN0c1tqXVtpXSA9IGRpc3Q7XG5cbiAgICAgICAgICAgIGlmIChkaXN0IDwgdGhpcy5kaXN0c1tpXVt0aGlzLm1pbnNbaV1dKSB7XG4gICAgICAgICAgICAgICB0aGlzLm1pbnNbaV0gPSBqOyAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgfVxuICAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB2YXIgbWVyZ2VkID0gdGhpcy5tZXJnZUNsb3Nlc3QoKTtcbiAgICAgIHZhciBpID0gMDtcbiAgICAgIHdoaWxlIChtZXJnZWQpIHtcbiAgICAgICAgaWYgKHNuYXBzaG90Q2IgJiYgKGkrKyAlIHNuYXBzaG90UGVyaW9kKSA9PSAwKSB7XG4gICAgICAgICAgIHNuYXBzaG90Q2IodGhpcy5jbHVzdGVycyk7ICAgICAgICAgICBcbiAgICAgICAgfVxuICAgICAgICBtZXJnZWQgPSB0aGlzLm1lcmdlQ2xvc2VzdCgpO1xuICAgICAgfVxuICAgIFxuICAgICAgdGhpcy5jbHVzdGVycy5mb3JFYWNoKGZ1bmN0aW9uKGNsdXN0ZXIpIHtcbiAgICAgICAgLy8gY2xlYW4gdXAgbWV0YWRhdGEgdXNlZCBmb3IgY2x1c3RlcmluZ1xuICAgICAgICBkZWxldGUgY2x1c3Rlci5rZXk7XG4gICAgICAgIGRlbGV0ZSBjbHVzdGVyLmluZGV4O1xuICAgICAgfSk7XG5cbiAgICAgIHJldHVybiB0aGlzLmNsdXN0ZXJzO1xuICAgfSxcbiAgXG4gICBtZXJnZUNsb3Nlc3Q6IGZ1bmN0aW9uKCkge1xuICAgICAgLy8gZmluZCB0d28gY2xvc2VzdCBjbHVzdGVycyBmcm9tIGNhY2hlZCBtaW5zXG4gICAgICB2YXIgbWluS2V5ID0gMCwgbWluID0gSW5maW5pdHk7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuY2x1c3RlcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgIHZhciBrZXkgPSB0aGlzLmNsdXN0ZXJzW2ldLmtleSxcbiAgICAgICAgICAgICBkaXN0ID0gdGhpcy5kaXN0c1trZXldW3RoaXMubWluc1trZXldXTtcbiAgICAgICAgIGlmIChkaXN0IDwgbWluKSB7XG4gICAgICAgICAgICBtaW5LZXkgPSBrZXk7XG4gICAgICAgICAgICBtaW4gPSBkaXN0O1xuICAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKG1pbiA+PSB0aGlzLnRocmVzaG9sZCkge1xuICAgICAgICAgcmV0dXJuIGZhbHNlOyAgICAgICAgIFxuICAgICAgfVxuXG4gICAgICB2YXIgYzEgPSB0aGlzLmluZGV4W21pbktleV0sXG4gICAgICAgICAgYzIgPSB0aGlzLmluZGV4W3RoaXMubWluc1ttaW5LZXldXTtcblxuICAgICAgLy8gbWVyZ2UgdHdvIGNsb3Nlc3QgY2x1c3RlcnNcbiAgICAgIHZhciBtZXJnZWQgPSB7XG4gICAgICAgICBsZWZ0OiBjMSxcbiAgICAgICAgIHJpZ2h0OiBjMixcbiAgICAgICAgIGtleTogYzEua2V5LFxuICAgICAgICAgc2l6ZTogYzEuc2l6ZSArIGMyLnNpemVcbiAgICAgIH07XG5cbiAgICAgIHRoaXMuY2x1c3RlcnNbYzEuaW5kZXhdID0gbWVyZ2VkO1xuICAgICAgdGhpcy5jbHVzdGVycy5zcGxpY2UoYzIuaW5kZXgsIDEpO1xuICAgICAgdGhpcy5pbmRleFtjMS5rZXldID0gbWVyZ2VkO1xuXG4gICAgICAvLyB1cGRhdGUgZGlzdGFuY2VzIHdpdGggbmV3IG1lcmdlZCBjbHVzdGVyXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuY2x1c3RlcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgIHZhciBjaSA9IHRoaXMuY2x1c3RlcnNbaV07XG4gICAgICAgICB2YXIgZGlzdDtcbiAgICAgICAgIGlmIChjMS5rZXkgPT0gY2kua2V5KSB7XG4gICAgICAgICAgICBkaXN0ID0gSW5maW5pdHk7ICAgICAgICAgICAgXG4gICAgICAgICB9XG4gICAgICAgICBlbHNlIGlmICh0aGlzLmxpbmthZ2UgPT0gXCJzaW5nbGVcIikge1xuICAgICAgICAgICAgZGlzdCA9IHRoaXMuZGlzdHNbYzEua2V5XVtjaS5rZXldO1xuICAgICAgICAgICAgaWYgKHRoaXMuZGlzdHNbYzEua2V5XVtjaS5rZXldID4gdGhpcy5kaXN0c1tjMi5rZXldW2NpLmtleV0pIHtcbiAgICAgICAgICAgICAgIGRpc3QgPSB0aGlzLmRpc3RzW2MyLmtleV1bY2kua2V5XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgIH1cbiAgICAgICAgIGVsc2UgaWYgKHRoaXMubGlua2FnZSA9PSBcImNvbXBsZXRlXCIpIHtcbiAgICAgICAgICAgIGRpc3QgPSB0aGlzLmRpc3RzW2MxLmtleV1bY2kua2V5XTtcbiAgICAgICAgICAgIGlmICh0aGlzLmRpc3RzW2MxLmtleV1bY2kua2V5XSA8IHRoaXMuZGlzdHNbYzIua2V5XVtjaS5rZXldKSB7XG4gICAgICAgICAgICAgICBkaXN0ID0gdGhpcy5kaXN0c1tjMi5rZXldW2NpLmtleV07ICAgICAgICAgICAgICBcbiAgICAgICAgICAgIH1cbiAgICAgICAgIH1cbiAgICAgICAgIGVsc2UgaWYgKHRoaXMubGlua2FnZSA9PSBcImF2ZXJhZ2VcIikge1xuICAgICAgICAgICAgZGlzdCA9ICh0aGlzLmRpc3RzW2MxLmtleV1bY2kua2V5XSAqIGMxLnNpemVcbiAgICAgICAgICAgICAgICAgICArIHRoaXMuZGlzdHNbYzIua2V5XVtjaS5rZXldICogYzIuc2l6ZSkgLyAoYzEuc2l6ZSArIGMyLnNpemUpO1xuICAgICAgICAgfVxuICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBkaXN0ID0gdGhpcy5kaXN0YW5jZShjaS52YWx1ZSwgYzEudmFsdWUpOyAgICAgICAgICAgIFxuICAgICAgICAgfVxuXG4gICAgICAgICB0aGlzLmRpc3RzW2MxLmtleV1bY2kua2V5XSA9IHRoaXMuZGlzdHNbY2kua2V5XVtjMS5rZXldID0gZGlzdDtcbiAgICAgIH1cblxuICAgIFxuICAgICAgLy8gdXBkYXRlIGNhY2hlZCBtaW5zXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuY2x1c3RlcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgIHZhciBrZXkxID0gdGhpcy5jbHVzdGVyc1tpXS5rZXk7ICAgICAgICBcbiAgICAgICAgIGlmICh0aGlzLm1pbnNba2V5MV0gPT0gYzEua2V5IHx8IHRoaXMubWluc1trZXkxXSA9PSBjMi5rZXkpIHtcbiAgICAgICAgICAgIHZhciBtaW4gPSBrZXkxO1xuICAgICAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCB0aGlzLmNsdXN0ZXJzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICB2YXIga2V5MiA9IHRoaXMuY2x1c3RlcnNbal0ua2V5O1xuICAgICAgICAgICAgICAgaWYgKHRoaXMuZGlzdHNba2V5MV1ba2V5Ml0gPCB0aGlzLmRpc3RzW2tleTFdW21pbl0pIHtcbiAgICAgICAgICAgICAgICAgIG1pbiA9IGtleTI7ICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLm1pbnNba2V5MV0gPSBtaW47XG4gICAgICAgICB9XG4gICAgICAgICB0aGlzLmNsdXN0ZXJzW2ldLmluZGV4ID0gaTtcbiAgICAgIH1cbiAgICBcbiAgICAgIC8vIGNsZWFuIHVwIG1ldGFkYXRhIHVzZWQgZm9yIGNsdXN0ZXJpbmdcbiAgICAgIGRlbGV0ZSBjMS5rZXk7IGRlbGV0ZSBjMi5rZXk7XG4gICAgICBkZWxldGUgYzEuaW5kZXg7IGRlbGV0ZSBjMi5pbmRleDtcblxuICAgICAgcmV0dXJuIHRydWU7XG4gICB9XG59XG5cbnZhciBoY2x1c3RlciA9IGZ1bmN0aW9uKGl0ZW1zLCBkaXN0YW5jZSwgbGlua2FnZSwgdGhyZXNob2xkLCBzbmFwc2hvdCwgc25hcHNob3RDYWxsYmFjaykge1xuICAgZGlzdGFuY2UgPSBkaXN0YW5jZSB8fCBcImV1Y2xpZGVhblwiO1xuICAgbGlua2FnZSA9IGxpbmthZ2UgfHwgXCJhdmVyYWdlXCI7XG5cbiAgIGlmICh0eXBlb2YgZGlzdGFuY2UgPT0gXCJzdHJpbmdcIikge1xuICAgICBkaXN0YW5jZSA9IGRpc3RhbmNlc1tkaXN0YW5jZV07XG4gICB9XG4gICB2YXIgY2x1c3RlcnMgPSAobmV3IEhpZXJhcmNoaWNhbENsdXN0ZXJpbmcoZGlzdGFuY2UsIGxpbmthZ2UsIHRocmVzaG9sZCkpXG4gICAgICAgICAgICAgICAgICAuY2x1c3RlcihpdGVtcywgc25hcHNob3QsIHNuYXBzaG90Q2FsbGJhY2spO1xuICAgICAgXG4gICBpZiAodGhyZXNob2xkID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBjbHVzdGVyc1swXTsgLy8gYWxsIGNsdXN0ZXJlZCBpbnRvIG9uZVxuICAgfVxuICAgcmV0dXJuIGNsdXN0ZXJzO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGhjbHVzdGVyO1xuIiwidmFyIGRpc3RhbmNlcyA9IHJlcXVpcmUoXCIuL2Rpc3RhbmNlXCIpO1xuXG5mdW5jdGlvbiBLTWVhbnMoY2VudHJvaWRzKSB7XG4gICB0aGlzLmNlbnRyb2lkcyA9IGNlbnRyb2lkcyB8fCBbXTtcbn1cblxuS01lYW5zLnByb3RvdHlwZS5yYW5kb21DZW50cm9pZHMgPSBmdW5jdGlvbihwb2ludHMsIGspIHtcbiAgIHZhciBjZW50cm9pZHMgPSBwb2ludHMuc2xpY2UoMCk7IC8vIGNvcHlcbiAgIGNlbnRyb2lkcy5zb3J0KGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIChNYXRoLnJvdW5kKE1hdGgucmFuZG9tKCkpIC0gMC41KTtcbiAgIH0pO1xuICAgcmV0dXJuIGNlbnRyb2lkcy5zbGljZSgwLCBrKTtcbn1cblxuS01lYW5zLnByb3RvdHlwZS5jbGFzc2lmeSA9IGZ1bmN0aW9uKHBvaW50LCBkaXN0YW5jZSkge1xuICAgdmFyIG1pbiA9IEluZmluaXR5LFxuICAgICAgIGluZGV4ID0gMDtcblxuICAgZGlzdGFuY2UgPSBkaXN0YW5jZSB8fCBcImV1Y2xpZGVhblwiO1xuICAgaWYgKHR5cGVvZiBkaXN0YW5jZSA9PSBcInN0cmluZ1wiKSB7XG4gICAgICBkaXN0YW5jZSA9IGRpc3RhbmNlc1tkaXN0YW5jZV07XG4gICB9XG5cbiAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5jZW50cm9pZHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBkaXN0ID0gZGlzdGFuY2UocG9pbnQsIHRoaXMuY2VudHJvaWRzW2ldKTtcbiAgICAgIGlmIChkaXN0IDwgbWluKSB7XG4gICAgICAgICBtaW4gPSBkaXN0O1xuICAgICAgICAgaW5kZXggPSBpO1xuICAgICAgfVxuICAgfVxuXG4gICByZXR1cm4gaW5kZXg7XG59XG5cbktNZWFucy5wcm90b3R5cGUuY2x1c3RlciA9IGZ1bmN0aW9uKHBvaW50cywgaywgZGlzdGFuY2UsIHNuYXBzaG90UGVyaW9kLCBzbmFwc2hvdENiKSB7XG4gICBrID0gayB8fCBNYXRoLm1heCgyLCBNYXRoLmNlaWwoTWF0aC5zcXJ0KHBvaW50cy5sZW5ndGggLyAyKSkpO1xuXG4gICBkaXN0YW5jZSA9IGRpc3RhbmNlIHx8IFwiZXVjbGlkZWFuXCI7XG4gICBpZiAodHlwZW9mIGRpc3RhbmNlID09IFwic3RyaW5nXCIpIHtcbiAgICAgIGRpc3RhbmNlID0gZGlzdGFuY2VzW2Rpc3RhbmNlXTtcbiAgIH1cblxuICAgdGhpcy5jZW50cm9pZHMgPSB0aGlzLnJhbmRvbUNlbnRyb2lkcyhwb2ludHMsIGspO1xuXG4gICB2YXIgYXNzaWdubWVudCA9IG5ldyBBcnJheShwb2ludHMubGVuZ3RoKTtcbiAgIHZhciBjbHVzdGVycyA9IG5ldyBBcnJheShrKTtcblxuICAgdmFyIGl0ZXJhdGlvbnMgPSAwO1xuICAgdmFyIG1vdmVtZW50ID0gdHJ1ZTtcbiAgIHdoaWxlIChtb3ZlbWVudCkge1xuICAgICAgLy8gdXBkYXRlIHBvaW50LXRvLWNlbnRyb2lkIGFzc2lnbm1lbnRzXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBvaW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgYXNzaWdubWVudFtpXSA9IHRoaXMuY2xhc3NpZnkocG9pbnRzW2ldLCBkaXN0YW5jZSk7XG4gICAgICB9XG5cbiAgICAgIC8vIHVwZGF0ZSBsb2NhdGlvbiBvZiBlYWNoIGNlbnRyb2lkXG4gICAgICBtb3ZlbWVudCA9IGZhbHNlO1xuICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBrOyBqKyspIHtcbiAgICAgICAgIHZhciBhc3NpZ25lZCA9IFtdO1xuICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhc3NpZ25tZW50Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAoYXNzaWdubWVudFtpXSA9PSBqKSB7XG4gICAgICAgICAgICAgICBhc3NpZ25lZC5wdXNoKHBvaW50c1tpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICB9XG5cbiAgICAgICAgIGlmICghYXNzaWduZWQubGVuZ3RoKSB7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgIH1cblxuICAgICAgICAgdmFyIGNlbnRyb2lkID0gdGhpcy5jZW50cm9pZHNbal07XG4gICAgICAgICB2YXIgbmV3Q2VudHJvaWQgPSBuZXcgQXJyYXkoY2VudHJvaWQubGVuZ3RoKTtcblxuICAgICAgICAgZm9yICh2YXIgZyA9IDA7IGcgPCBjZW50cm9pZC5sZW5ndGg7IGcrKykge1xuICAgICAgICAgICAgdmFyIHN1bSA9IDA7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFzc2lnbmVkLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICBzdW0gKz0gYXNzaWduZWRbaV1bZ107XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBuZXdDZW50cm9pZFtnXSA9IHN1bSAvIGFzc2lnbmVkLmxlbmd0aDtcblxuICAgICAgICAgICAgaWYgKG5ld0NlbnRyb2lkW2ddICE9IGNlbnRyb2lkW2ddKSB7XG4gICAgICAgICAgICAgICBtb3ZlbWVudCA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICB9XG5cbiAgICAgICAgIHRoaXMuY2VudHJvaWRzW2pdID0gbmV3Q2VudHJvaWQ7XG4gICAgICAgICBjbHVzdGVyc1tqXSA9IGFzc2lnbmVkO1xuICAgICAgfVxuXG4gICAgICBpZiAoc25hcHNob3RDYiAmJiAoaXRlcmF0aW9ucysrICUgc25hcHNob3RQZXJpb2QgPT0gMCkpIHtcbiAgICAgICAgIHNuYXBzaG90Q2IoY2x1c3RlcnMpO1xuICAgICAgfVxuICAgfVxuXG4gICByZXR1cm4gY2x1c3RlcnM7XG59XG5cbktNZWFucy5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24oKSB7XG4gICByZXR1cm4gSlNPTi5zdHJpbmdpZnkodGhpcy5jZW50cm9pZHMpO1xufVxuXG5LTWVhbnMucHJvdG90eXBlLmZyb21KU09OID0gZnVuY3Rpb24oanNvbikge1xuICAgdGhpcy5jZW50cm9pZHMgPSBKU09OLnBhcnNlKGpzb24pO1xuICAgcmV0dXJuIHRoaXM7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gS01lYW5zO1xuXG5tb2R1bGUuZXhwb3J0cy5rbWVhbnMgPSBmdW5jdGlvbih2ZWN0b3JzLCBrKSB7XG4gICByZXR1cm4gKG5ldyBLTWVhbnMoKSkuY2x1c3Rlcih2ZWN0b3JzLCBrKTtcbn0iLCJcInVzZSBzdHJpY3RcIjtcblxubW9kdWxlLmV4cG9ydHMgPSBjbHVzdGVyO1xuXG52YXIgdmwgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvd1sndmwnXSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWxbJ3ZsJ10gOiBudWxsKSxcbiAgY2x1c3RlcmZjayA9IHJlcXVpcmUoJ2NsdXN0ZXJmY2snKSxcbiAgY29uc3RzID0gcmVxdWlyZSgnLi9jbHVzdGVyY29uc3RzJyksXG4gIHV0aWwgPSByZXF1aXJlKCcuLi91dGlsJyk7XG5cbmNsdXN0ZXIuZGlzdGFuY2UgPSByZXF1aXJlKCcuL2Rpc3RhbmNlJyk7XG5cbmZ1bmN0aW9uIGNsdXN0ZXIoZW5jb2RpbmdzLCBvcHQpIHtcbiAgLy8ganNoaW50IHVudXNlZDpmYWxzZVxuICB2YXIgZGlzdCA9IGNsdXN0ZXIuZGlzdGFuY2UudGFibGUoZW5jb2RpbmdzKTtcblxuICB2YXIgY2x1c3RlclRyZWVzID0gY2x1c3RlcmZjay5oY2x1c3RlcihlbmNvZGluZ3MsIGZ1bmN0aW9uKGUxLCBlMikge1xuICAgIHZhciBzMSA9IHZsLkVuY29kaW5nLnNob3J0aGFuZChlMSksXG4gICAgICBzMiA9IHZsLkVuY29kaW5nLnNob3J0aGFuZChlMik7XG4gICAgcmV0dXJuIGRpc3RbczFdW3MyXTtcbiAgfSwgJ2F2ZXJhZ2UnLCBjb25zdHMuQ0xVU1RFUl9USFJFU0hPTEQpO1xuXG4gIHZhciBjbHVzdGVycyA9IGNsdXN0ZXJUcmVlcy5tYXAoZnVuY3Rpb24odHJlZSkge1xuICAgICAgcmV0dXJuIHV0aWwudHJhdmVyc2UodHJlZSwgW10pO1xuICAgIH0pXG4gICAubWFwKGZ1bmN0aW9uKGNsdXN0ZXIpIHtcbiAgICByZXR1cm4gY2x1c3Rlci5zb3J0KGZ1bmN0aW9uKGVuY29kaW5nMSwgZW5jb2RpbmcyKSB7XG4gICAgICAvLyBzb3J0IGVhY2ggY2x1c3RlciAtLSBoYXZlIHRoZSBoaWdoZXN0IHNjb3JlIGFzIDFzdCBpdGVtXG4gICAgICByZXR1cm4gZW5jb2RpbmcyLl9pbmZvLnNjb3JlIC0gZW5jb2RpbmcxLl9pbmZvLnNjb3JlO1xuICAgIH0pO1xuICB9KS5maWx0ZXIoZnVuY3Rpb24oY2x1c3RlcikgeyAgLy8gZmlsdGVyIGVtcHR5IGNsdXN0ZXJcbiAgICByZXR1cm4gY2x1c3Rlci5sZW5ndGggPjA7XG4gIH0pLnNvcnQoZnVuY3Rpb24oY2x1c3RlcjEsIGNsdXN0ZXIyKSB7XG4gICAgLy9zb3J0IGJ5IGhpZ2hlc3Qgc2NvcmluZyBpdGVtIGluIGVhY2ggY2x1c3RlclxuICAgIHJldHVybiBjbHVzdGVyMlswXS5faW5mby5zY29yZSAtIGNsdXN0ZXIxWzBdLl9pbmZvLnNjb3JlO1xuICB9KTtcblxuICBjbHVzdGVycy5kaXN0ID0gZGlzdDsgLy9hcHBlbmQgZGlzdCBpbiB0aGUgYXJyYXkgZm9yIGRlYnVnZ2luZ1xuXG4gIHJldHVybiBjbHVzdGVycztcbn0iLCIndXNlIHN0cmljdCc7XG5cbnZhciBjID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxuYy5TV0FQUEFCTEUgPSAwLjA1O1xuYy5ESVNUX01JU1NJTkcgPSAxO1xuYy5DTFVTVEVSX1RIUkVTSE9MRCA9IDE7XG5cbmZ1bmN0aW9uIHJlZHVjZVR1cGxlVG9UYWJsZShyLCB4KSB7XG4gIHZhciBhID0geFswXSwgYiA9IHhbMV0sIGQgPSB4WzJdO1xuICByW2FdID0gclthXSB8fCB7fTtcbiAgcltiXSA9IHJbYl0gfHwge307XG4gIHJbYV1bYl0gPSByW2JdW2FdID0gZDtcbiAgcmV0dXJuIHI7XG59XG5cbmMuRElTVF9CWV9FTkNUWVBFID0gW1xuICAvLyBwb3NpdGlvbmFsXG4gIFsneCcsICd5JywgYy5TV0FQUEFCTEVdLFxuICBbJ3JvdycsICdjb2wnLCBjLlNXQVBQQUJMRV0sXG5cbiAgLy8gb3JkaW5hbCBtYXJrIHByb3BlcnRpZXNcbiAgWydjb2xvcicsICdzaGFwZScsIGMuU1dBUFBBQkxFXSxcbiAgWydjb2xvcicsICdkZXRhaWwnLCBjLlNXQVBQQUJMRV0sXG4gIFsnZGV0YWlsJywgJ3NoYXBlJywgYy5TV0FQUEFCTEVdLFxuXG4gIC8vIHF1YW50aXRhdGl2ZSBtYXJrIHByb3BlcnRpZXNcbiAgWydjb2xvcicsICdhbHBoYScsIGMuU1dBUFBBQkxFXSxcbiAgWydzaXplJywgJ2FscGhhJywgYy5TV0FQUEFCTEVdLFxuICBbJ3NpemUnLCAnY29sb3InLCBjLlNXQVBQQUJMRV1cbl0ucmVkdWNlKHJlZHVjZVR1cGxlVG9UYWJsZSwge30pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgdmwgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvd1sndmwnXSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWxbJ3ZsJ10gOiBudWxsKSxcbiAgY29uc3RzID0gcmVxdWlyZSgnLi9jbHVzdGVyY29uc3RzJyksXG4gIHV0aWwgPSByZXF1aXJlKCcuLi91dGlsJyk7XG5cbnZhciBkaXN0YW5jZSA9IHt9O1xubW9kdWxlLmV4cG9ydHMgPSBkaXN0YW5jZTtcblxuZGlzdGFuY2UudGFibGUgPSBmdW5jdGlvbiAoZW5jb2RpbmdzKSB7XG4gIHZhciBsZW4gPSBlbmNvZGluZ3MubGVuZ3RoLFxuICAgIGNvbGVuY3MgPSBlbmNvZGluZ3MubWFwKGZ1bmN0aW9uKGUpIHsgcmV0dXJuIGRpc3RhbmNlLmdldEVuY1R5cGVCeUNvbHVtbk5hbWUoZSk7IH0pLFxuICAgIHNob3J0aGFuZHMgPSBlbmNvZGluZ3MubWFwKHZsLkVuY29kaW5nLnNob3J0aGFuZCksXG4gICAgZGlmZiA9IHt9LCBpLCBqO1xuXG4gIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKykgZGlmZltzaG9ydGhhbmRzW2ldXSA9IHt9O1xuXG4gIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgIGZvciAoaiA9IGkgKyAxOyBqIDwgbGVuOyBqKyspIHtcbiAgICAgIHZhciBzaiA9IHNob3J0aGFuZHNbal0sIHNpID0gc2hvcnRoYW5kc1tpXTtcblxuICAgICAgZGlmZltzal1bc2ldID0gZGlmZltzaV1bc2pdID0gZGlzdGFuY2UuZ2V0KGNvbGVuY3NbaV0sIGNvbGVuY3Nbal0pO1xuICAgIH1cbiAgfVxuICByZXR1cm4gZGlmZjtcbn07XG5cbmRpc3RhbmNlLmdldCA9IGZ1bmN0aW9uIChjb2xlbmMxLCBjb2xlbmMyKSB7XG4gIHZhciBjb2xzID0gdXRpbC51bmlvbih2bC5rZXlzKGNvbGVuYzEuY29sKSwgdmwua2V5cyhjb2xlbmMyLmNvbCkpLFxuICAgIGRpc3QgPSAwO1xuXG4gIGNvbHMuZm9yRWFjaChmdW5jdGlvbihjb2wpIHtcbiAgICB2YXIgZTEgPSBjb2xlbmMxLmNvbFtjb2xdLCBlMiA9IGNvbGVuYzIuY29sW2NvbF07XG5cbiAgICBpZiAoZTEgJiYgZTIpIHtcbiAgICAgIGlmIChlMS5lbmNUeXBlICE9IGUyLmVuY1R5cGUpIHtcbiAgICAgICAgZGlzdCArPSAoY29uc3RzLkRJU1RfQllfRU5DVFlQRVtlMS5lbmNUeXBlXSB8fCB7fSlbZTIuZW5jVHlwZV0gfHwgMTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgZGlzdCArPSBjb25zdHMuRElTVF9NSVNTSU5HO1xuICAgIH1cbiAgfSk7XG5cbiAgLy8gZG8gbm90IGdyb3VwIHN0YWNrZWQgY2hhcnQgd2l0aCBzaW1pbGFyIG5vbi1zdGFja2VkIGNoYXJ0IVxuICB2YXIgaXNTdGFjazEgPSB2bC5FbmNvZGluZy5pc1N0YWNrKGNvbGVuYzEpLFxuICAgIGlzU3RhY2syID0gdmwuRW5jb2RpbmcuaXNTdGFjayhjb2xlbmMyKTtcblxuICBpZihpc1N0YWNrMSB8fCBpc1N0YWNrMikge1xuICAgIGlmKGlzU3RhY2sxICYmIGlzU3RhY2syKSB7XG4gICAgICBpZihjb2xlbmMxLmVuY29kaW5nLmNvbG9yLm5hbWUgIT09IGNvbGVuYzIuZW5jb2RpbmcuY29sb3IubmFtZSkge1xuICAgICAgICBkaXN0Kz0xO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBkaXN0Kz0xOyAvLyBzdXJlbHkgZGlmZmVyZW50XG4gICAgfVxuICB9XG4gIHJldHVybiBkaXN0O1xufTtcblxuLy8gZ2V0IGVuY29kaW5nIHR5cGUgYnkgZmllbGRuYW1lXG5kaXN0YW5jZS5nZXRFbmNUeXBlQnlDb2x1bW5OYW1lID0gZnVuY3Rpb24oZW5jb2RpbmcpIHtcbiAgdmFyIF9jb2xlbmMgPSB7fSxcbiAgICBlbmMgPSBlbmNvZGluZy5lbmNvZGluZztcblxuICB2bC5rZXlzKGVuYykuZm9yRWFjaChmdW5jdGlvbihlbmNUeXBlKSB7XG4gICAgdmFyIGUgPSB2bC5kdXBsaWNhdGUoZW5jW2VuY1R5cGVdKTtcbiAgICBlLmVuY1R5cGUgPSBlbmNUeXBlO1xuICAgIF9jb2xlbmNbZS5uYW1lIHx8ICcnXSA9IGU7XG4gICAgZGVsZXRlIGUubmFtZTtcbiAgfSk7XG5cbiAgcmV0dXJuIHtcbiAgICBtYXJrdHlwZTogZW5jb2RpbmcubWFya3R5cGUsXG4gICAgY29sOiBfY29sZW5jLFxuICAgIGVuY29kaW5nOiBlbmNvZGluZy5lbmNvZGluZ1xuICB9O1xufTsiLCIndXNlIHN0cmljdCc7XG5cbnZhciBjb25zdHMgPSBtb2R1bGUuZXhwb3J0cyA9IHtcbiAgZ2VuOiB7fSxcbiAgY2x1c3Rlcjoge30sXG4gIHJhbms6IHt9XG59O1xuXG5jb25zdHMuZ2VuLnByb2plY3Rpb25zID0ge1xuICB0eXBlOiAnb2JqZWN0JyxcbiAgcHJvcGVydGllczoge1xuICAgIG9taXREb3RQbG90OiB7IC8vRklYTUUgcmVtb3ZlIHRoaXMhXG4gICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICBkZWZhdWx0OiBmYWxzZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAncmVtb3ZlIGFsbCBkb3QgcGxvdHMnXG4gICAgfSxcbiAgICBtYXhDYXJkaW5hbGl0eUZvckF1dG9BZGRPcmRpbmFsOiB7XG4gICAgICB0eXBlOiAnaW50ZWdlcicsXG4gICAgICBkZWZhdWx0OiA1MCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnbWF4IGNhcmRpbmFsaXR5IGZvciBvcmRpbmFsIGZpZWxkIHRvIGJlIGNvbnNpZGVyZWQgZm9yIGF1dG8gYWRkaW5nJ1xuICAgIH0sXG4gICAgYWx3YXlzQWRkSGlzdG9ncmFtOiB7XG4gICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICBkZWZhdWx0OiB0cnVlXG4gICAgfVxuICB9XG59O1xuXG5jb25zdHMuZ2VuLmFnZ3JlZ2F0ZXMgPSB7XG4gIHR5cGU6ICdvYmplY3QnLFxuICBwcm9wZXJ0aWVzOiB7XG4gICAgY29uZmlnOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0J1xuICAgIH0sXG4gICAgZGF0YToge1xuICAgICAgdHlwZTogJ29iamVjdCdcbiAgICB9LFxuICAgIHRhYmxlVHlwZXM6IHtcbiAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgIGRlZmF1bHQ6ICdib3RoJyxcbiAgICAgIGVudW06IFsnYm90aCcsICdhZ2dyZWdhdGVkJywgJ2Rpc2FnZ3JlZ2F0ZWQnXVxuICAgIH0sXG4gICAgZ2VuRGltUToge1xuICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICBkZWZhdWx0OiAnYXV0bycsXG4gICAgICBlbnVtOiBbJ2F1dG8nLCAnYmluJywgJ2Nhc3QnLCAnbm9uZSddLFxuICAgICAgZGVzY3JpcHRpb246ICdVc2UgUSBhcyBEaW1lbnNpb24gZWl0aGVyIGJ5IGJpbm5pbmcgb3IgY2FzdGluZydcbiAgICB9LFxuICAgIG1pbkNhcmRpbmFsaXR5Rm9yQmluOiB7XG4gICAgICB0eXBlOiAnaW50ZWdlcicsXG4gICAgICBkZWZhdWx0OiAyMCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnbWluaW11bSBjYXJkaW5hbGl0eSBvZiBhIGZpZWxkIGlmIHdlIHdlcmUgdG8gYmluJ1xuICAgIH0sXG4gICAgb21pdERvdFBsb3Q6IHtcbiAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgICAgZGVzY3JpcHRpb246ICdyZW1vdmUgYWxsIGRvdCBwbG90cydcbiAgICB9LFxuICAgIG9taXRNZWFzdXJlT25seToge1xuICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgZGVmYXVsdDogZmFsc2UsXG4gICAgICBkZXNjcmlwdGlvbjogJ09taXQgYWdncmVnYXRpb24gd2l0aCBtZWFzdXJlKHMpIG9ubHknXG4gICAgfSxcbiAgICBvbWl0RGltZW5zaW9uT25seToge1xuICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgZGVmYXVsdDogdHJ1ZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnT21pdCBhZ2dyZWdhdGlvbiB3aXRoIGRpbWVuc2lvbihzKSBvbmx5J1xuICAgIH0sXG4gICAgYWRkQ291bnRGb3JEaW1lbnNpb25Pbmx5OiB7XG4gICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICBkZWZhdWx0OiB0cnVlLFxuICAgICAgZGVzY3JpcHRpb246ICdBZGQgY291bnQgd2hlbiB0aGVyZSBhcmUgZGltZW5zaW9uKHMpIG9ubHknXG4gICAgfSxcbiAgICBhZ2dyTGlzdDoge1xuICAgICAgdHlwZTogJ2FycmF5JyxcbiAgICAgIGl0ZW1zOiB7XG4gICAgICAgIHR5cGU6IFsnc3RyaW5nJ11cbiAgICAgIH0sXG4gICAgICBkZWZhdWx0OiBbdW5kZWZpbmVkLCAnYXZnJ11cbiAgICB9LFxuICAgIHRpbWVVbml0TGlzdDoge1xuICAgICAgdHlwZTogJ2FycmF5JyxcbiAgICAgIGl0ZW1zOiB7XG4gICAgICAgIHR5cGU6IFsnc3RyaW5nJ11cbiAgICAgIH0sXG4gICAgICBkZWZhdWx0OiBbJ3llYXInXVxuICAgIH0sXG4gICAgY29uc2lzdGVudEF1dG9ROiB7XG4gICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICBkZWZhdWx0OiB0cnVlLFxuICAgICAgZGVzY3JpcHRpb246IFwiZ2VuZXJhdGUgc2ltaWxhciBhdXRvIHRyYW5zZm9ybSBmb3IgcXVhbnRcIlxuICAgIH1cbiAgfVxufTtcblxuY29uc3RzLmdlbi5lbmNvZGluZ3MgPSB7XG4gIHR5cGU6ICdvYmplY3QnLFxuICBwcm9wZXJ0aWVzOiB7XG4gICAgbWFya3R5cGVMaXN0OiB7XG4gICAgICB0eXBlOiAnYXJyYXknLFxuICAgICAgaXRlbXM6IHt0eXBlOiAnc3RyaW5nJ30sXG4gICAgICBkZWZhdWx0OiBbJ3BvaW50JywgJ2JhcicsICdsaW5lJywgJ2FyZWEnLCAndGV4dCcsICd0aWNrJ10sIC8vZmlsbGVkX21hcFxuICAgICAgZGVzY3JpcHRpb246ICdhbGxvd2VkIG1hcmt0eXBlcydcbiAgICB9LFxuICAgIGVuY29kaW5nVHlwZUxpc3Q6IHtcbiAgICAgIHR5cGU6ICdhcnJheScsXG4gICAgICBpdGVtczoge3R5cGU6ICdzdHJpbmcnfSxcbiAgICAgIGRlZmF1bHQ6IFsneCcsICd5JywgJ3JvdycsICdjb2wnLCAnc2l6ZScsICdjb2xvcicsICd0ZXh0JywgJ2RldGFpbCddLFxuICAgICAgZGVzY3JpcHRpb246ICdhbGxvd2VkIGVuY29kaW5nIHR5cGVzJ1xuICAgIH0sXG4gICAgbWF4R29vZENhcmRpbmFsaXR5Rm9yRmFjZXRzOiB7XG4gICAgICB0eXBlOiAnaW50ZWdlcicsXG4gICAgICBkZWZhdWx0OiA1LFxuICAgICAgZGVzY3JpcHRpb246ICdtYXhpbXVtIGNhcmRpbmFsaXR5IG9mIGEgZmllbGQgdG8gYmUgcHV0IG9uIGZhY2V0IChyb3cvY29sKSBlZmZlY3RpdmVseSdcbiAgICB9LFxuICAgIG1heENhcmRpbmFsaXR5Rm9yRmFjZXRzOiB7XG4gICAgICB0eXBlOiAnaW50ZWdlcicsXG4gICAgICBkZWZhdWx0OiAyMCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnbWF4aW11bSBjYXJkaW5hbGl0eSBvZiBhIGZpZWxkIHRvIGJlIHB1dCBvbiBmYWNldCAocm93L2NvbCknXG4gICAgfSxcbiAgICBtYXhHb29kQ2FyZGluYWxpdHlGb3JDb2xvcjoge1xuICAgICAgdHlwZTogJ2ludGVnZXInLFxuICAgICAgZGVmYXVsdDogNyxcbiAgICAgIGRlc2NyaXB0aW9uOiAnbWF4aW11bSBjYXJkaW5hbGl0eSBvZiBhbiBvcmRpbmFsIGZpZWxkIHRvIGJlIHB1dCBvbiBjb2xvciBlZmZlY3RpdmVseSdcbiAgICB9LFxuICAgIG1heENhcmRpbmFsaXR5Rm9yQ29sb3I6IHtcbiAgICAgIHR5cGU6ICdpbnRlZ2VyJyxcbiAgICAgIGRlZmF1bHQ6IDIwLFxuICAgICAgZGVzY3JpcHRpb246ICdtYXhpbXVtIGNhcmRpbmFsaXR5IG9mIGFuIG9yZGluYWwgZmllbGQgdG8gYmUgcHV0IG9uIGNvbG9yJ1xuICAgIH0sXG4gICAgbWF4Q2FyZGluYWxpdHlGb3JTaGFwZToge1xuICAgICAgdHlwZTogJ2ludGVnZXInLFxuICAgICAgZGVmYXVsdDogNixcbiAgICAgIGRlc2NyaXB0aW9uOiAnbWF4aW11bSBjYXJkaW5hbGl0eSBvZiBhbiBvcmRpbmFsIGZpZWxkIHRvIGJlIHB1dCBvbiBzaGFwZSdcbiAgICB9LFxuICAgIG9taXRUcmFucG9zZTogIHtcbiAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgIGRlZmF1bHQ6IHRydWUsXG4gICAgICBkZXNjcmlwdGlvbjogJ0VsaW1pbmF0ZSBhbGwgdHJhbnNwb3NlIGJ5ICgxKSBrZWVwaW5nIGhvcml6b250YWwgZG90IHBsb3Qgb25seSAoMikgZm9yIE94USBjaGFydHMsIGFsd2F5cyBwdXQgTyBvbiBZICgzKSBzaG93IG9ubHkgb25lIER4RCwgTXhNIChjdXJyZW50bHkgc29ydGVkIGJ5IG5hbWUpJ1xuICAgIH0sXG4gICAgb21pdERvdFBsb3Q6IHtcbiAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgICAgZGVzY3JpcHRpb246ICdyZW1vdmUgYWxsIGRvdCBwbG90cydcbiAgICB9LFxuICAgIG9taXREb3RQbG90V2l0aEV4dHJhRW5jb2Rpbmc6IHtcbiAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgIGRlZmF1bHQ6IHRydWUsXG4gICAgICBkZXNjcmlwdGlvbjogJ3JlbW92ZSBhbGwgZG90IHBsb3RzIHdpdGggPjEgZW5jb2RpbmcnXG4gICAgfSxcbiAgICBvbWl0TXVsdGlwbGVSZXRpbmFsRW5jb2RpbmdzOiB7XG4gICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICBkZWZhdWx0OiB0cnVlLFxuICAgICAgZGVzY3JpcHRpb246ICdvbWl0IHVzaW5nIG11bHRpcGxlIHJldGluYWwgdmFyaWFibGVzIChzaXplLCBjb2xvciwgYWxwaGEsIHNoYXBlKSdcbiAgICB9LFxuICAgIG9taXROb25UZXh0QWdncldpdGhBbGxEaW1zT25GYWNldHM6IHtcbiAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgIGRlZmF1bHQ6IHRydWUsXG4gICAgICBkZXNjcmlwdGlvbjogJ3JlbW92ZSBhbGwgYWdncmVnYXRlZCBjaGFydHMgKGV4Y2VwdCB0ZXh0IHRhYmxlcykgd2l0aCBhbGwgZGltcyBvbiBmYWNldHMgKHJvdywgY29sKSdcbiAgICB9LFxuICAgIG9taXRTaXplT25CYXI6IHtcbiAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgICAgZGVzY3JpcHRpb246ICdkbyBub3QgdXNlIGJhclxcJ3Mgc2l6ZSdcbiAgICB9LFxuICAgIG9taXRTdGFja2VkQXZlcmFnZToge1xuICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgZGVmYXVsdDogdHJ1ZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnZG8gbm90IHN0YWNrIGJhciBjaGFydCB3aXRoIGF2ZXJhZ2UnXG4gICAgfSxcbiAgICBhbHdheXNHZW5lcmF0ZVRhYmxlQXNIZWF0bWFwOiB7XG4gICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICBkZWZhdWx0OiB0cnVlXG4gICAgfVxuICB9XG59O1xuXG5cblxuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gIGNvbnN0czogcmVxdWlyZSgnLi9jb25zdHMnKSxcbiAgY2x1c3RlcjogcmVxdWlyZSgnLi9jbHVzdGVyL2NsdXN0ZXInKSxcbiAgZ2VuOiByZXF1aXJlKCcuL2dlbi9nZW4nKSxcbiAgcmFuazogcmVxdWlyZSgnLi9yYW5rL3JhbmsnKSxcbiAgdXRpbDogcmVxdWlyZSgnLi91dGlsJyksXG4gIGF1dG86IFwiLSwgc3VtXCJcbn07XG5cblxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgdmwgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvd1sndmwnXSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWxbJ3ZsJ10gOiBudWxsKTtcblxudmFyIGNvbnN0cyA9IHJlcXVpcmUoJy4uL2NvbnN0cycpO1xuXG52YXIgQVVUTz0nKic7XG5cbm1vZHVsZS5leHBvcnRzID0gZ2VuQWdncmVnYXRlcztcblxuZnVuY3Rpb24gZ2VuQWdncmVnYXRlcyhvdXRwdXQsIGZpZWxkcywgc3RhdHMsIG9wdCkge1xuICBvcHQgPSB2bC5zY2hlbWEudXRpbC5leHRlbmQob3B0fHx7fSwgY29uc3RzLmdlbi5hZ2dyZWdhdGVzKTtcbiAgdmFyIHRmID0gbmV3IEFycmF5KGZpZWxkcy5sZW5ndGgpO1xuICB2YXIgaGFzTm9yTyA9IHZsLmFueShmaWVsZHMsIGZ1bmN0aW9uKGYpIHtcbiAgICByZXR1cm4gdmwuZmllbGQuaXNUeXBlcyhmLCBbTiwgT10pO1xuICB9KTtcblxuICBmdW5jdGlvbiBlbWl0KGZpZWxkU2V0KSB7XG4gICAgZmllbGRTZXQgPSB2bC5kdXBsaWNhdGUoZmllbGRTZXQpO1xuICAgIGZpZWxkU2V0LmtleSA9IHZsLmZpZWxkLnNob3J0aGFuZHMoZmllbGRTZXQpO1xuICAgIG91dHB1dC5wdXNoKGZpZWxkU2V0KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNoZWNrQW5kUHVzaCgpIHtcbiAgICBpZiAob3B0Lm9taXRNZWFzdXJlT25seSB8fCBvcHQub21pdERpbWVuc2lvbk9ubHkpIHtcbiAgICAgIHZhciBoYXNNZWFzdXJlID0gZmFsc2UsIGhhc0RpbWVuc2lvbiA9IGZhbHNlLCBoYXNSYXcgPSBmYWxzZTtcbiAgICAgIHRmLmZvckVhY2goZnVuY3Rpb24oZikge1xuICAgICAgICBpZiAodmwuZmllbGQuaXNEaW1lbnNpb24oZikpIHtcbiAgICAgICAgICBoYXNEaW1lbnNpb24gPSB0cnVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGhhc01lYXN1cmUgPSB0cnVlO1xuICAgICAgICAgIGlmICghZi5hZ2dyZWdhdGUpIGhhc1JhdyA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgaWYgKCFoYXNEaW1lbnNpb24gJiYgIWhhc1JhdyAmJiBvcHQub21pdE1lYXN1cmVPbmx5KSByZXR1cm47XG4gICAgICBpZiAoIWhhc01lYXN1cmUpIHtcbiAgICAgICAgaWYgKG9wdC5hZGRDb3VudEZvckRpbWVuc2lvbk9ubHkpIHtcbiAgICAgICAgICB0Zi5wdXNoKHZsLmZpZWxkLmNvdW50KCkpO1xuICAgICAgICAgIGVtaXQodGYpO1xuICAgICAgICAgIHRmLnBvcCgpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChvcHQub21pdERpbWVuc2lvbk9ubHkpIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKG9wdC5vbWl0RG90UGxvdCAmJiB0Zi5sZW5ndGggPT09IDEpIHJldHVybjtcbiAgICBlbWl0KHRmKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGFzc2lnbkFnZ3JRKGksIGhhc0FnZ3IsIGF1dG9Nb2RlLCBhKSB7XG4gICAgdmFyIGNhbkhhdmVBZ2dyID0gaGFzQWdnciA9PT0gdHJ1ZSB8fCBoYXNBZ2dyID09PSBudWxsLFxuICAgICAgY2FudEhhdmVBZ2dyID0gaGFzQWdnciA9PT0gZmFsc2UgfHwgaGFzQWdnciA9PT0gbnVsbDtcbiAgICBpZiAoYSkge1xuICAgICAgaWYgKGNhbkhhdmVBZ2dyKSB7XG4gICAgICAgIHRmW2ldLmFnZ3JlZ2F0ZSA9IGE7XG4gICAgICAgIGFzc2lnbkZpZWxkKGkgKyAxLCB0cnVlLCBhdXRvTW9kZSk7XG4gICAgICAgIGRlbGV0ZSB0ZltpXS5hZ2dyZWdhdGU7XG4gICAgICB9XG4gICAgfSBlbHNlIHsgLy8gaWYoYSA9PT0gdW5kZWZpbmVkKVxuICAgICAgaWYgKGNhbnRIYXZlQWdncikge1xuICAgICAgICBhc3NpZ25GaWVsZChpICsgMSwgZmFsc2UsIGF1dG9Nb2RlKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBhc3NpZ25CaW5RKGksIGhhc0FnZ3IsIGF1dG9Nb2RlKSB7XG4gICAgdGZbaV0uYmluID0gdHJ1ZTtcbiAgICBhc3NpZ25GaWVsZChpICsgMSwgaGFzQWdnciwgYXV0b01vZGUpO1xuICAgIGRlbGV0ZSB0ZltpXS5iaW47XG4gIH1cblxuICBmdW5jdGlvbiBhc3NpZ25RKGksIGhhc0FnZ3IsIGF1dG9Nb2RlKSB7XG4gICAgdmFyIGYgPSBmaWVsZHNbaV0sXG4gICAgICBjYW5IYXZlQWdnciA9IGhhc0FnZ3IgPT09IHRydWUgfHwgaGFzQWdnciA9PT0gbnVsbDtcblxuICAgIHRmW2ldID0ge25hbWU6IGYubmFtZSwgdHlwZTogZi50eXBlfTtcblxuICAgIGlmIChmLmFnZ3JlZ2F0ZSA9PT0gJ2NvdW50JykgeyAvLyBpZiBjb3VudCBpcyBpbmNsdWRlZCBpbiB0aGUgc2VsZWN0ZWQgZmllbGRzXG4gICAgICBpZiAoY2FuSGF2ZUFnZ3IpIHtcbiAgICAgICAgdGZbaV0uYWdncmVnYXRlID0gZi5hZ2dyZWdhdGU7XG4gICAgICAgIGFzc2lnbkZpZWxkKGkgKyAxLCB0cnVlLCBhdXRvTW9kZSk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChmLl9hZ2dyZWdhdGUpIHtcbiAgICAgIC8vIFRPRE8gc3VwcG9ydCBhcnJheSBvZiBmLl9hZ2dycyB0b29cbiAgICAgIGFzc2lnbkFnZ3JRKGksIGhhc0FnZ3IsIGF1dG9Nb2RlLCBmLl9hZ2dyZWdhdGUpO1xuICAgIH0gZWxzZSBpZiAoZi5fcmF3KSB7XG4gICAgICBhc3NpZ25BZ2dyUShpLCBoYXNBZ2dyLCBhdXRvTW9kZSwgdW5kZWZpbmVkKTtcbiAgICB9IGVsc2UgaWYgKGYuX2Jpbikge1xuICAgICAgYXNzaWduQmluUShpLCBoYXNBZ2dyLCBhdXRvTW9kZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG9wdC5hZ2dyTGlzdC5mb3JFYWNoKGZ1bmN0aW9uKGEpIHtcbiAgICAgICAgaWYgKCFvcHQuY29uc2lzdGVudEF1dG9RIHx8IGF1dG9Nb2RlID09PSBBVVRPIHx8IGF1dG9Nb2RlID09PSBhKSB7XG4gICAgICAgICAgYXNzaWduQWdnclEoaSwgaGFzQWdnciwgYSAvKmFzc2lnbiBhdXRvTW9kZSovLCBhKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIGlmICgoIW9wdC5jb25zaXN0ZW50QXV0b1EgfHwgdmwuaXNpbihhdXRvTW9kZSwgW0FVVE8sICdiaW4nLCAnY2FzdCcsICdhdXRvY2FzdCddKSkgJiYgIWhhc05vck8pIHtcbiAgICAgICAgdmFyIGhpZ2hDYXJkaW5hbGl0eSA9IHZsLmZpZWxkLmNhcmRpbmFsaXR5KGYsIHN0YXRzKSA+IG9wdC5taW5DYXJkaW5hbGl0eUZvckJpbjtcblxuICAgICAgICB2YXIgaXNBdXRvID0gb3B0LmdlbkRpbVEgPT09ICdhdXRvJyxcbiAgICAgICAgICBnZW5CaW4gPSBvcHQuZ2VuRGltUSAgPT09ICdiaW4nIHx8IChpc0F1dG8gJiYgaGlnaENhcmRpbmFsaXR5KSxcbiAgICAgICAgICBnZW5DYXN0ID0gb3B0LmdlbkRpbVEgPT09ICdjYXN0JyB8fCAoaXNBdXRvICYmICFoaWdoQ2FyZGluYWxpdHkpO1xuXG4gICAgICAgIGlmIChnZW5CaW4gJiYgdmwuaXNpbihhdXRvTW9kZSwgW0FVVE8sICdiaW4nLCAnYXV0b2Nhc3QnXSkpIHtcbiAgICAgICAgICBhc3NpZ25CaW5RKGksIGhhc0FnZ3IsIGlzQXV0byA/ICdhdXRvY2FzdCcgOiAnYmluJyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGdlbkNhc3QgJiYgdmwuaXNpbihhdXRvTW9kZSwgW0FVVE8sICdjYXN0JywgJ2F1dG9jYXN0J10pKSB7XG4gICAgICAgICAgdGZbaV0udHlwZSA9ICdPJztcbiAgICAgICAgICBhc3NpZ25GaWVsZChpICsgMSwgaGFzQWdnciwgaXNBdXRvID8gJ2F1dG9jYXN0JyA6ICdjYXN0Jyk7XG4gICAgICAgICAgdGZbaV0udHlwZSA9ICdRJztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGFzc2lnblRpbWVVbml0VChpLCBoYXNBZ2dyLCBhdXRvTW9kZSwgdGltZVVuaXQpIHtcbiAgICB0ZltpXS50aW1lVW5pdCA9IHRpbWVVbml0O1xuICAgIGFzc2lnbkZpZWxkKGkrMSwgaGFzQWdnciwgYXV0b01vZGUpO1xuICAgIGRlbGV0ZSB0ZltpXS50aW1lVW5pdDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGFzc2lnblQoaSwgaGFzQWdnciwgYXV0b01vZGUpIHtcbiAgICB2YXIgZiA9IGZpZWxkc1tpXTtcbiAgICB0ZltpXSA9IHtuYW1lOiBmLm5hbWUsIHR5cGU6IGYudHlwZX07XG5cbiAgICAvLyBUT0RPIHN1cHBvcnQgYXJyYXkgb2YgZi5fdGltZVVuaXRzXG4gICAgaWYgKGYuX3RpbWVVbml0KSB7XG4gICAgICBhc3NpZ25UaW1lVW5pdFQoaSwgaGFzQWdnciwgYXV0b01vZGUsIGYuX3RpbWVVbml0KTtcbiAgICB9IGVsc2Uge1xuICAgICAgb3B0LnRpbWVVbml0TGlzdC5mb3JFYWNoKGZ1bmN0aW9uKHRpbWVVbml0KSB7XG4gICAgICAgIGlmICh0aW1lVW5pdCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgaWYgKCFoYXNBZ2dyKSB7IC8vIGNhbid0IGFnZ3JlZ2F0ZSBvdmVyIHJhdyB0aW1lXG4gICAgICAgICAgICBhc3NpZ25GaWVsZChpKzEsIGZhbHNlLCBhdXRvTW9kZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGFzc2lnblRpbWVVbml0VChpLCBoYXNBZ2dyLCBhdXRvTW9kZSwgdGltZVVuaXQpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBGSVhNRSB3aGF0IGlmIHlvdSBhZ2dyZWdhdGUgdGltZT9cbiAgfVxuXG4gIGZ1bmN0aW9uIGFzc2lnbkZpZWxkKGksIGhhc0FnZ3IsIGF1dG9Nb2RlKSB7XG4gICAgaWYgKGkgPT09IGZpZWxkcy5sZW5ndGgpIHsgLy8gSWYgYWxsIGZpZWxkcyBhcmUgYXNzaWduZWRcbiAgICAgIGNoZWNrQW5kUHVzaCgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBmID0gZmllbGRzW2ldO1xuICAgIC8vIE90aGVyd2lzZSwgYXNzaWduIGktdGggZmllbGRcbiAgICBzd2l0Y2ggKGYudHlwZSkge1xuICAgICAgLy9UT0RPIFwiRFwiLCBcIkdcIlxuICAgICAgY2FzZSBROlxuICAgICAgICBhc3NpZ25RKGksIGhhc0FnZ3IsIGF1dG9Nb2RlKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgVDpcbiAgICAgICAgYXNzaWduVChpLCBoYXNBZ2dyLCBhdXRvTW9kZSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBPOlxuICAgICAgICAvKiBmYWxscyB0aHJvdWdoICovXG4gICAgICBjYXNlIE46XG4gICAgICAgIC8qIGZhbGxzIHRocm91Z2ggKi9cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHRmW2ldID0gZjtcbiAgICAgICAgYXNzaWduRmllbGQoaSArIDEsIGhhc0FnZ3IsIGF1dG9Nb2RlKTtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgdmFyIGhhc0FnZ3IgPSBvcHQudGFibGVUeXBlcyA9PT0gJ2FnZ3JlZ2F0ZWQnID8gdHJ1ZSA6IG9wdC50YWJsZVR5cGVzID09PSAnZGlzYWdncmVnYXRlZCcgPyBmYWxzZSA6IG51bGw7XG4gIGFzc2lnbkZpZWxkKDAsIGhhc0FnZ3IsIEFVVE8pO1xuXG4gIHJldHVybiBvdXRwdXQ7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciB2bCA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93Wyd2bCddIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbFsndmwnXSA6IG51bGwpLFxuICBnZW5FbmNzID0gcmVxdWlyZSgnLi9lbmNzJyksXG4gIGdldE1hcmt0eXBlcyA9IHJlcXVpcmUoJy4vbWFya3R5cGVzJyksXG4gIHJhbmsgPSByZXF1aXJlKCcuLi9yYW5rL3JhbmsnKSxcbiAgY29uc3RzID0gcmVxdWlyZSgnLi4vY29uc3RzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZ2VuRW5jb2RpbmdzRnJvbUZpZWxkcztcblxuZnVuY3Rpb24gZ2VuRW5jb2RpbmdzRnJvbUZpZWxkcyhvdXRwdXQsIGZpZWxkcywgc3RhdHMsIG9wdCwgbmVzdGVkKSB7XG4gIG9wdCA9IHZsLnNjaGVtYS51dGlsLmV4dGVuZChvcHR8fHt9LCBjb25zdHMuZ2VuLmVuY29kaW5ncyk7XG4gIHZhciBlbmNzID0gZ2VuRW5jcyhbXSwgZmllbGRzLCBzdGF0cywgb3B0KTtcblxuICBpZiAobmVzdGVkKSB7XG4gICAgcmV0dXJuIGVuY3MucmVkdWNlKGZ1bmN0aW9uKGRpY3QsIGVuYykge1xuICAgICAgZGljdFtlbmNdID0gZ2VuRW5jb2RpbmdzRnJvbUVuY3MoW10sIGVuYywgc3RhdHMsIG9wdCk7XG4gICAgICByZXR1cm4gZGljdDtcbiAgICB9LCB7fSk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGVuY3MucmVkdWNlKGZ1bmN0aW9uKGxpc3QsIGVuYykge1xuICAgICAgcmV0dXJuIGdlbkVuY29kaW5nc0Zyb21FbmNzKGxpc3QsIGVuYywgc3RhdHMsIG9wdCk7XG4gICAgfSwgW10pO1xuICB9XG59XG5cbmZ1bmN0aW9uIGdlbkVuY29kaW5nc0Zyb21FbmNzKG91dHB1dCwgZW5jLCBzdGF0cywgb3B0KSB7XG4gIGdldE1hcmt0eXBlcyhlbmMsIHN0YXRzLCBvcHQpXG4gICAgLmZvckVhY2goZnVuY3Rpb24obWFya1R5cGUpIHtcbiAgICAgIHZhciBlID0gdmwuZHVwbGljYXRlKHtcbiAgICAgICAgICBkYXRhOiBvcHQuZGF0YSxcbiAgICAgICAgICBtYXJrdHlwZTogbWFya1R5cGUsXG4gICAgICAgICAgZW5jb2Rpbmc6IGVuYyxcbiAgICAgICAgICBjb25maWc6IG9wdC5jb25maWdcbiAgICAgICAgfSksXG4gICAgICAgIGVuY29kaW5nID0gZmluYWxUb3VjaChlLCBzdGF0cywgb3B0KSxcbiAgICAgICAgc2NvcmUgPSByYW5rLmVuY29kaW5nKGVuY29kaW5nLCBzdGF0cywgb3B0KTtcblxuICAgICAgZW5jb2RpbmcuX2luZm8gPSBzY29yZTtcbiAgICAgIG91dHB1dC5wdXNoKGVuY29kaW5nKTtcbiAgICB9KTtcbiAgcmV0dXJuIG91dHB1dDtcbn1cblxuLy9GSVhNRSB0aGlzIHNob3VsZCBiZSByZWZhY3RvcnNcbmZ1bmN0aW9uIGZpbmFsVG91Y2goZW5jb2RpbmcsIHN0YXRzLCBvcHQpIHtcbiAgaWYgKGVuY29kaW5nLm1hcmt0eXBlID09PSAndGV4dCcgJiYgb3B0LmFsd2F5c0dlbmVyYXRlVGFibGVBc0hlYXRtYXApIHtcbiAgICBlbmNvZGluZy5lbmNvZGluZy5jb2xvciA9IGVuY29kaW5nLmVuY29kaW5nLnRleHQ7XG4gIH1cblxuICAvLyBkb24ndCBpbmNsdWRlIHplcm8gaWYgc3RkZXYvYXZnIDwgMC4wMVxuICAvLyBodHRwczovL2dpdGh1Yi5jb20vdXdkYXRhL3Zpc3JlYy9pc3N1ZXMvNjlcbiAgdmFyIGVuYyA9IGVuY29kaW5nLmVuY29kaW5nO1xuICBbJ3gnLCAneSddLmZvckVhY2goZnVuY3Rpb24oZXQpIHtcbiAgICB2YXIgZmllbGQgPSBlbmNbZXRdO1xuICAgIGlmIChmaWVsZCAmJiB2bC5maWVsZC5pc01lYXN1cmUoZmllbGQpICYmICF2bC5maWVsZC5pc0NvdW50KGZpZWxkKSkge1xuICAgICAgdmFyIHN0YXQgPSBzdGF0c1tmaWVsZC5uYW1lXTtcbiAgICAgIGlmIChzdGF0ICYmIHN0YXQuc3RkZXYgLyBzdGF0LmF2ZyA8IDAuMDEpIHtcbiAgICAgICAgZmllbGQuc2NhbGUgPSB7emVybzogZmFsc2V9O1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG4gIHJldHVybiBlbmNvZGluZztcbn0iLCJcInVzZSBzdHJpY3RcIjtcbnJlcXVpcmUoJy4uL2dsb2JhbHMnKTtcblxudmFyIHZsID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3dbJ3ZsJ10gOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsWyd2bCddIDogbnVsbCksXG4gIGNvbnN0cyA9IHJlcXVpcmUoJy4uL2NvbnN0cycpLFxuICBnZW5NYXJrVHlwZXMgPSByZXF1aXJlKCcuL21hcmt0eXBlcycpLFxuICBpc0RpbWVuc2lvbiA9IHZsLmZpZWxkLmlzRGltZW5zaW9uLFxuICBpc01lYXN1cmUgPSB2bC5maWVsZC5pc01lYXN1cmU7XG5cbm1vZHVsZS5leHBvcnRzID0gZ2VuRW5jcztcblxuLy8gRklYTUUgcmVtb3ZlIGRpbWVuc2lvbiwgbWVhc3VyZSBhbmQgdXNlIGluZm9ybWF0aW9uIGluIHZlZ2EtbGl0ZSBpbnN0ZWFkIVxudmFyIHJ1bGVzID0ge1xuICB4OiB7XG4gICAgZGltZW5zaW9uOiB0cnVlLFxuICAgIG1lYXN1cmU6IHRydWUsXG4gICAgbXVsdGlwbGU6IHRydWUgLy9GSVhNRSBzaG91bGQgYWxsb3cgbXVsdGlwbGUgb25seSBmb3IgUSwgVFxuICB9LFxuICB5OiB7XG4gICAgZGltZW5zaW9uOiB0cnVlLFxuICAgIG1lYXN1cmU6IHRydWUsXG4gICAgbXVsdGlwbGU6IHRydWUgLy9GSVhNRSBzaG91bGQgYWxsb3cgbXVsdGlwbGUgb25seSBmb3IgUSwgVFxuICB9LFxuICByb3c6IHtcbiAgICBkaW1lbnNpb246IHRydWUsXG4gICAgbXVsdGlwbGU6IHRydWVcbiAgfSxcbiAgY29sOiB7XG4gICAgZGltZW5zaW9uOiB0cnVlLFxuICAgIG11bHRpcGxlOiB0cnVlXG4gIH0sXG4gIHNoYXBlOiB7XG4gICAgZGltZW5zaW9uOiB0cnVlLFxuICAgIHJ1bGVzOiBzaGFwZVJ1bGVzXG4gIH0sXG4gIHNpemU6IHtcbiAgICBtZWFzdXJlOiB0cnVlLFxuICAgIHJ1bGVzOiByZXRpbmFsRW5jUnVsZXNcbiAgfSxcbiAgY29sb3I6IHtcbiAgICBkaW1lbnNpb246IHRydWUsXG4gICAgbWVhc3VyZTogdHJ1ZSxcbiAgICBydWxlczogY29sb3JSdWxlc1xuICB9LFxuICBhbHBoYToge1xuICAgIG1lYXN1cmU6IHRydWUsXG4gICAgcnVsZXM6IHJldGluYWxFbmNSdWxlc1xuICB9LFxuICB0ZXh0OiB7XG4gICAgbWVhc3VyZTogdHJ1ZVxuICB9LFxuICBkZXRhaWw6IHtcbiAgICBkaW1lbnNpb246IHRydWVcbiAgfVxuICAvL2dlbzoge1xuICAvLyAgZ2VvOiB0cnVlXG4gIC8vfSxcbiAgLy9hcmM6IHsgLy8gcGllXG4gIC8vXG4gIC8vfVxufTtcblxuZnVuY3Rpb24gcmV0aW5hbEVuY1J1bGVzKGVuYywgZmllbGQsIHN0YXRzLCBvcHQpIHtcbiAgaWYgKG9wdC5vbWl0TXVsdGlwbGVSZXRpbmFsRW5jb2RpbmdzKSB7XG4gICAgaWYgKGVuYy5jb2xvciB8fCBlbmMuc2l6ZSB8fCBlbmMuc2hhcGUgfHwgZW5jLmFscGhhKSByZXR1cm4gZmFsc2U7XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59XG5cbmZ1bmN0aW9uIGNvbG9yUnVsZXMoZW5jLCBmaWVsZCwgc3RhdHMsIG9wdCkge1xuICBpZighcmV0aW5hbEVuY1J1bGVzKGVuYywgZmllbGQsIHN0YXRzLCBvcHQpKSByZXR1cm4gZmFsc2U7XG5cbiAgcmV0dXJuIHZsLmZpZWxkLmlzTWVhc3VyZShmaWVsZCkgfHxcbiAgICB2bC5maWVsZC5jYXJkaW5hbGl0eShmaWVsZCwgc3RhdHMpIDw9IG9wdC5tYXhDYXJkaW5hbGl0eUZvckNvbG9yO1xufVxuXG5mdW5jdGlvbiBzaGFwZVJ1bGVzKGVuYywgZmllbGQsIHN0YXRzLCBvcHQpIHtcbiAgaWYoIXJldGluYWxFbmNSdWxlcyhlbmMsIGZpZWxkLCBzdGF0cywgb3B0KSkgcmV0dXJuIGZhbHNlO1xuXG4gIGlmIChmaWVsZC5iaW4gJiYgZmllbGQudHlwZSA9PT0gUSkgcmV0dXJuIGZhbHNlO1xuICBpZiAoZmllbGQudGltZVVuaXQgJiYgZmllbGQudHlwZSA9PT0gVCkgcmV0dXJuIGZhbHNlO1xuICByZXR1cm4gdmwuZmllbGQuY2FyZGluYWxpdHkoZmllbGQsIHN0YXRzKSA8PSBvcHQubWF4Q2FyZGluYWxpdHlGb3JDb2xvcjtcbn1cblxuZnVuY3Rpb24gZGltTWVhVHJhbnNwb3NlUnVsZShlbmMpIHtcbiAgLy8gY3JlYXRlIGhvcml6b250YWwgaGlzdG9ncmFtIGZvciBvcmRpbmFsXG4gIGlmICh2bC5maWVsZC5pc1R5cGVzKGVuYy55LCBbTiwgT10pICYmIGlzTWVhc3VyZShlbmMueCkpIHJldHVybiB0cnVlO1xuXG4gIC8vIHZlcnRpY2FsIGhpc3RvZ3JhbSBmb3IgUSBhbmQgVFxuICBpZiAoaXNNZWFzdXJlKGVuYy55KSAmJiAoIXZsLmZpZWxkLmlzVHlwZXMoZW5jLngsIFtOLCBPXSkgJiYgaXNEaW1lbnNpb24oZW5jLngpKSkgcmV0dXJuIHRydWU7XG5cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG5mdW5jdGlvbiBnZW5lcmFsUnVsZXMoZW5jLCBzdGF0cywgb3B0KSB7XG4gIC8vIGVuYy50ZXh0IGlzIG9ubHkgdXNlZCBmb3IgVEVYVCBUQUJMRVxuICBpZiAoZW5jLnRleHQpIHtcbiAgICByZXR1cm4gZ2VuTWFya1R5cGVzLnNhdGlzZnlSdWxlcyhlbmMsIFRFWFQsIHN0YXRzLCBvcHQpO1xuICB9XG5cbiAgLy8gQ0FSVEVTSUFOIFBMT1QgT1IgTUFQXG4gIGlmIChlbmMueCB8fCBlbmMueSB8fCBlbmMuZ2VvIHx8IGVuYy5hcmMpIHtcblxuICAgIGlmIChlbmMucm93IHx8IGVuYy5jb2wpIHsgLy9oYXZlIGZhY2V0KHMpXG5cbiAgICAgIC8vIGRvbid0IHVzZSBmYWNldHMgYmVmb3JlIGZpbGxpbmcgdXAgeCx5XG4gICAgICBpZiAoIWVuYy54IHx8ICFlbmMueSkgcmV0dXJuIGZhbHNlO1xuXG4gICAgICBpZiAob3B0Lm9taXROb25UZXh0QWdncldpdGhBbGxEaW1zT25GYWNldHMpIHtcbiAgICAgICAgLy8gcmVtb3ZlIGFsbCBhZ2dyZWdhdGVkIGNoYXJ0cyB3aXRoIGFsbCBkaW1zIG9uIGZhY2V0cyAocm93LCBjb2wpXG4gICAgICAgIGlmIChnZW5FbmNzLmlzQWdncldpdGhBbGxEaW1PbkZhY2V0cyhlbmMpKSByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGVuYy54ICYmIGVuYy55KSB7XG4gICAgICB2YXIgaXNEaW1YID0gISFpc0RpbWVuc2lvbihlbmMueCksXG4gICAgICAgIGlzRGltWSA9ICEhaXNEaW1lbnNpb24oZW5jLnkpO1xuXG4gICAgICBpZiAoaXNEaW1YICYmIGlzRGltWSAmJiAhdmwuZW5jLmlzQWdncmVnYXRlKGVuYykpIHtcbiAgICAgICAgLy8gRklYTUUgYWN0dWFsbHkgY2hlY2sgaWYgdGhlcmUgd291bGQgYmUgb2NjbHVzaW9uICM5MFxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG5cbiAgICAgIGlmIChvcHQub21pdFRyYW5wb3NlKSB7XG4gICAgICAgIGlmIChpc0RpbVggXiBpc0RpbVkpIHsgLy8gZGltIHggbWVhXG4gICAgICAgICAgaWYgKCFkaW1NZWFUcmFuc3Bvc2VSdWxlKGVuYykpIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSBlbHNlIGlmIChlbmMueS50eXBlPT09VCB8fCBlbmMueC50eXBlID09PSBUKSB7XG4gICAgICAgICAgaWYgKGVuYy55LnR5cGU9PT1UICYmIGVuYy54LnR5cGUgIT09IFQpIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSBlbHNlIHsgLy8gc2hvdyBvbmx5IG9uZSBPeE8sIFF4UVxuICAgICAgICAgIGlmIChlbmMueC5uYW1lID4gZW5jLnkubmFtZSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICAvLyBET1QgUExPVFNcbiAgICAvLyAvLyBwbG90IHdpdGggb25lIGF4aXMgPSBkb3QgcGxvdFxuICAgIGlmIChvcHQub21pdERvdFBsb3QpIHJldHVybiBmYWxzZTtcblxuICAgIC8vIERvdCBwbG90IHNob3VsZCBhbHdheXMgYmUgaG9yaXpvbnRhbFxuICAgIGlmIChvcHQub21pdFRyYW5wb3NlICYmIGVuYy55KSByZXR1cm4gZmFsc2U7XG5cbiAgICAvLyBkb3QgcGxvdCBzaG91bGRuJ3QgaGF2ZSBvdGhlciBlbmNvZGluZ1xuICAgIGlmIChvcHQub21pdERvdFBsb3RXaXRoRXh0cmFFbmNvZGluZyAmJiB2bC5rZXlzKGVuYykubGVuZ3RoID4gMSkgcmV0dXJuIGZhbHNlO1xuXG4gICAgLy8gb25lIGRpbWVuc2lvbiBcImNvdW50XCIgaXMgdXNlbGVzc1xuICAgIGlmIChlbmMueCAmJiBlbmMueC5hZ2dyZWdhdGUgPT0gJ2NvdW50JyAmJiAhZW5jLnkpIHJldHVybiBmYWxzZTtcbiAgICBpZiAoZW5jLnkgJiYgZW5jLnkuYWdncmVnYXRlID09ICdjb3VudCcgJiYgIWVuYy54KSByZXR1cm4gZmFsc2U7XG5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG5cbmdlbkVuY3MuaXNBZ2dyV2l0aEFsbERpbU9uRmFjZXRzID0gZnVuY3Rpb24gKGVuYykge1xuICB2YXIgaGFzQWdnciA9IGZhbHNlLCBoYXNPdGhlck8gPSBmYWxzZTtcbiAgZm9yICh2YXIgZW5jVHlwZSBpbiBlbmMpIHtcbiAgICB2YXIgZmllbGQgPSBlbmNbZW5jVHlwZV07XG4gICAgaWYgKGZpZWxkLmFnZ3JlZ2F0ZSkge1xuICAgICAgaGFzQWdnciA9IHRydWU7XG4gICAgfVxuICAgIGlmICh2bC5maWVsZC5pc0RpbWVuc2lvbihmaWVsZCkgJiYgKGVuY1R5cGUgIT09IFJPVyAmJiBlbmNUeXBlICE9PSBDT0wpKSB7XG4gICAgICBoYXNPdGhlck8gPSB0cnVlO1xuICAgIH1cbiAgICBpZiAoaGFzQWdnciAmJiBoYXNPdGhlck8pIGJyZWFrO1xuICB9XG5cbiAgcmV0dXJuIGhhc0FnZ3IgJiYgIWhhc090aGVyTztcbn07XG5cblxuZnVuY3Rpb24gZ2VuRW5jcyhlbmNzLCBmaWVsZHMsIHN0YXRzLCBvcHQpIHtcbiAgb3B0ID0gdmwuc2NoZW1hLnV0aWwuZXh0ZW5kKG9wdHx8e30sIGNvbnN0cy5nZW4uZW5jb2RpbmdzKTtcbiAgLy8gZ2VuZXJhdGUgYSBjb2xsZWN0aW9uIHZlZ2EtbGl0ZSdzIGVuY1xuICB2YXIgdG1wRW5jID0ge307XG5cbiAgZnVuY3Rpb24gYXNzaWduRmllbGQoaSkge1xuICAgIC8vIElmIGFsbCBmaWVsZHMgYXJlIGFzc2lnbmVkLCBzYXZlXG4gICAgaWYgKGkgPT09IGZpZWxkcy5sZW5ndGgpIHtcbiAgICAgIC8vIGF0IHRoZSBtaW5pbWFsIGFsbCBjaGFydCBzaG91bGQgaGF2ZSB4LCB5LCBnZW8sIHRleHQgb3IgYXJjXG4gICAgICBpZiAoZ2VuZXJhbFJ1bGVzKHRtcEVuYywgc3RhdHMsIG9wdCkpIHtcbiAgICAgICAgZW5jcy5wdXNoKHZsLmR1cGxpY2F0ZSh0bXBFbmMpKTtcbiAgICAgIH1cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBPdGhlcndpc2UsIGFzc2lnbiBpLXRoIGZpZWxkXG4gICAgdmFyIGZpZWxkID0gZmllbGRzW2ldO1xuICAgIGZvciAodmFyIGogaW4gb3B0LmVuY29kaW5nVHlwZUxpc3QpIHtcbiAgICAgIHZhciBldCA9IG9wdC5lbmNvZGluZ1R5cGVMaXN0W2pdLFxuICAgICAgICBpc0RpbSA9IGlzRGltZW5zaW9uKGZpZWxkKTtcblxuICAgICAgLy9UT0RPOiBzdXBwb3J0IFwibXVsdGlwbGVcIiBhc3NpZ25tZW50XG4gICAgICBpZiAoIShldCBpbiB0bXBFbmMpICYmIC8vIGVuY29kaW5nIG5vdCB1c2VkXG4gICAgICAgICgoaXNEaW0gJiYgcnVsZXNbZXRdLmRpbWVuc2lvbikgfHwgKCFpc0RpbSAmJiBydWxlc1tldF0ubWVhc3VyZSkpICYmXG4gICAgICAgICghcnVsZXNbZXRdLnJ1bGVzIHx8IHJ1bGVzW2V0XS5ydWxlcyh0bXBFbmMsIGZpZWxkLCBzdGF0cywgb3B0KSlcbiAgICAgICkge1xuICAgICAgICB0bXBFbmNbZXRdID0gZmllbGQ7XG4gICAgICAgIGFzc2lnbkZpZWxkKGkgKyAxKTtcbiAgICAgICAgZGVsZXRlIHRtcEVuY1tldF07XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgYXNzaWduRmllbGQoMCk7XG5cbiAgcmV0dXJuIGVuY3M7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciB1dGlsID0gcmVxdWlyZSgnLi4vdXRpbCcpO1xuXG52YXIgZ2VuID0gbW9kdWxlLmV4cG9ydHMgPSB7XG4gIC8vIGRhdGEgdmFyaWF0aW9uc1xuICBhZ2dyZWdhdGVzOiByZXF1aXJlKCcuL2FnZ3JlZ2F0ZXMnKSxcbiAgcHJvamVjdGlvbnM6IHJlcXVpcmUoJy4vcHJvamVjdGlvbnMnKSxcbiAgLy8gZW5jb2RpbmdzIC8gdmlzdWFsIHZhcmlhdG9uc1xuICBlbmNvZGluZ3M6IHJlcXVpcmUoJy4vZW5jb2RpbmdzJyksXG4gIGVuY3M6IHJlcXVpcmUoJy4vZW5jcycpLFxuICBtYXJrdHlwZXM6IHJlcXVpcmUoJy4vbWFya3R5cGVzJylcbn07XG5cbmdlbi5jaGFydHMgPSBmdW5jdGlvbihmaWVsZHMsIG9wdCwgY2ZnLCBmbGF0KSB7XG4gIG9wdCA9IHV0aWwuZ2VuLmdldE9wdChvcHQpO1xuICBmbGF0ID0gZmxhdCA9PT0gdW5kZWZpbmVkID8ge2VuY29kaW5nczogMX0gOiBmbGF0O1xuXG4gIC8vIFRPRE8gZ2VuZXJhdGVcblxuICAvLyBnZW5lcmF0ZSBwZXJtdXRhdGlvbiBvZiBlbmNvZGluZyBtYXBwaW5nc1xuICB2YXIgZmllbGRTZXRzID0gb3B0LmdlbkFnZ3IgPyBnZW4uYWdncmVnYXRlcyhbXSwgZmllbGRzLCBvcHQpIDogW2ZpZWxkc10sXG4gICAgZW5jcywgY2hhcnRzLCBsZXZlbCA9IDA7XG5cbiAgaWYgKGZsYXQgPT09IHRydWUgfHwgKGZsYXQgJiYgZmxhdC5hZ2dyZWdhdGUpKSB7XG4gICAgZW5jcyA9IGZpZWxkU2V0cy5yZWR1Y2UoZnVuY3Rpb24ob3V0cHV0LCBmaWVsZHMpIHtcbiAgICAgIHJldHVybiBnZW4uZW5jcyhvdXRwdXQsIGZpZWxkcywgb3B0KTtcbiAgICB9LCBbXSk7XG4gIH0gZWxzZSB7XG4gICAgZW5jcyA9IGZpZWxkU2V0cy5tYXAoZnVuY3Rpb24oZmllbGRzKSB7XG4gICAgICByZXR1cm4gZ2VuLmVuY3MoW10sIGZpZWxkcywgb3B0KTtcbiAgICB9LCB0cnVlKTtcbiAgICBsZXZlbCArPSAxO1xuICB9XG5cbiAgaWYgKGZsYXQgPT09IHRydWUgfHwgKGZsYXQgJiYgZmxhdC5lbmNvZGluZ3MpKSB7XG4gICAgY2hhcnRzID0gdXRpbC5uZXN0ZWRSZWR1Y2UoZW5jcywgZnVuY3Rpb24ob3V0cHV0LCBlbmMpIHtcbiAgICAgIHJldHVybiBnZW4ubWFya3R5cGVzKG91dHB1dCwgZW5jLCBvcHQsIGNmZyk7XG4gICAgfSwgbGV2ZWwsIHRydWUpO1xuICB9IGVsc2Uge1xuICAgIGNoYXJ0cyA9IHV0aWwubmVzdGVkTWFwKGVuY3MsIGZ1bmN0aW9uKGVuYykge1xuICAgICAgcmV0dXJuIGdlbi5tYXJrdHlwZXMoW10sIGVuYywgb3B0LCBjZmcpO1xuICAgIH0sIGxldmVsLCB0cnVlKTtcbiAgICBsZXZlbCArPSAxO1xuICB9XG4gIHJldHVybiBjaGFydHM7XG59OyIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgdmwgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvd1sndmwnXSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWxbJ3ZsJ10gOiBudWxsKSxcbiAgY29uc3RzID0gcmVxdWlyZSgnLi4vY29uc3RzJyksXG4gIGlzRGltZW5zaW9uID0gdmwuZmllbGQuaXNEaW1lbnNpb24sXG4gIGlzT3JkaW5hbFNjYWxlID0gdmwuZmllbGQuaXNPcmRpbmFsU2NhbGU7XG5cbnZhciB2bG1hcmt0eXBlcyA9IG1vZHVsZS5leHBvcnRzID0gZ2V0TWFya3R5cGVzO1xuXG52YXIgbWFya3NSdWxlID0gdmxtYXJrdHlwZXMucnVsZSA9IHtcbiAgcG9pbnQ6ICBwb2ludFJ1bGUsXG4gIGJhcjogICAgYmFyUnVsZSxcbiAgbGluZTogICBsaW5lUnVsZSxcbiAgYXJlYTogICBhcmVhUnVsZSwgLy8gYXJlYSBpcyBzaW1pbGFyIHRvIGxpbmVcbiAgdGV4dDogICB0ZXh0UnVsZSxcbiAgdGljazogICB0aWNrUnVsZVxufTtcblxuZnVuY3Rpb24gZ2V0TWFya3R5cGVzKGVuYywgc3RhdHMsIG9wdCkge1xuICBvcHQgPSB2bC5zY2hlbWEudXRpbC5leHRlbmQob3B0fHx7fSwgY29uc3RzLmdlbi5lbmNvZGluZ3MpO1xuXG4gIHZhciBtYXJrVHlwZXMgPSBvcHQubWFya3R5cGVMaXN0LmZpbHRlcihmdW5jdGlvbihtYXJrVHlwZSl7XG4gICAgcmV0dXJuIHZsbWFya3R5cGVzLnNhdGlzZnlSdWxlcyhlbmMsIG1hcmtUeXBlLCBzdGF0cywgb3B0KTtcbiAgfSk7XG5cbiAgcmV0dXJuIG1hcmtUeXBlcztcbn1cblxudmxtYXJrdHlwZXMuc2F0aXNmeVJ1bGVzID0gZnVuY3Rpb24gKGVuYywgbWFya1R5cGUsIHN0YXRzLCBvcHQpIHtcbiAgdmFyIG1hcmsgPSB2bC5jb21waWxlci5tYXJrc1ttYXJrVHlwZV0sXG4gICAgcmVxcyA9IG1hcmsucmVxdWlyZWRFbmNvZGluZyxcbiAgICBzdXBwb3J0ID0gbWFyay5zdXBwb3J0ZWRFbmNvZGluZztcblxuICBmb3IgKHZhciBpIGluIHJlcXMpIHsgLy8gYWxsIHJlcXVpcmVkIGVuY29kaW5ncyBpbiBlbmNcbiAgICBpZiAoIShyZXFzW2ldIGluIGVuYykpIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGZvciAodmFyIGVuY1R5cGUgaW4gZW5jKSB7IC8vIGFsbCBlbmNvZGluZ3MgaW4gZW5jIGFyZSBzdXBwb3J0ZWRcbiAgICBpZiAoIXN1cHBvcnRbZW5jVHlwZV0pIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIHJldHVybiAhbWFya3NSdWxlW21hcmtUeXBlXSB8fCBtYXJrc1J1bGVbbWFya1R5cGVdKGVuYywgc3RhdHMsIG9wdCk7XG59O1xuXG5mdW5jdGlvbiBmYWNldFJ1bGUoZmllbGQsIHN0YXRzLCBvcHQpIHtcbiAgcmV0dXJuIHZsLmZpZWxkLmNhcmRpbmFsaXR5KGZpZWxkLCBzdGF0cykgPD0gb3B0Lm1heENhcmRpbmFsaXR5Rm9yRmFjZXRzO1xufVxuXG5mdW5jdGlvbiBmYWNldHNSdWxlKGVuYywgc3RhdHMsIG9wdCkge1xuICBpZihlbmMucm93ICYmICFmYWNldFJ1bGUoZW5jLnJvdywgc3RhdHMsIG9wdCkpIHJldHVybiBmYWxzZTtcbiAgaWYoZW5jLmNvbCAmJiAhZmFjZXRSdWxlKGVuYy5jb2wsIHN0YXRzLCBvcHQpKSByZXR1cm4gZmFsc2U7XG4gIHJldHVybiB0cnVlO1xufVxuXG5mdW5jdGlvbiBwb2ludFJ1bGUoZW5jLCBzdGF0cywgb3B0KSB7XG4gIGlmKCFmYWNldHNSdWxlKGVuYywgc3RhdHMsIG9wdCkpIHJldHVybiBmYWxzZTtcbiAgaWYgKGVuYy54ICYmIGVuYy55KSB7XG4gICAgLy8gaGF2ZSBib3RoIHggJiB5ID09PiBzY2F0dGVyIHBsb3QgLyBidWJibGUgcGxvdFxuXG4gICAgdmFyIHhJc0RpbSA9IGlzRGltZW5zaW9uKGVuYy54KSxcbiAgICAgIHlJc0RpbSA9IGlzRGltZW5zaW9uKGVuYy55KTtcblxuICAgIC8vIEZvciBPeE9cbiAgICBpZiAoeElzRGltICYmIHlJc0RpbSkge1xuICAgICAgLy8gc2hhcGUgZG9lc24ndCB3b3JrIHdpdGggYm90aCB4LCB5IGFzIG9yZGluYWxcbiAgICAgIGlmIChlbmMuc2hhcGUpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuXG4gICAgICAvLyBUT0RPKGthbml0dyk6IGNoZWNrIHRoYXQgdGhlcmUgaXMgcXVhbnQgYXQgbGVhc3QgLi4uXG4gICAgICBpZiAoZW5jLmNvbG9yICYmIGlzRGltZW5zaW9uKGVuYy5jb2xvcikpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cblxuICB9IGVsc2UgeyAvLyBwbG90IHdpdGggb25lIGF4aXMgPSBkb3QgcGxvdFxuICAgIGlmIChvcHQub21pdERvdFBsb3QpIHJldHVybiBmYWxzZTtcblxuICAgIC8vIERvdCBwbG90IHNob3VsZCBhbHdheXMgYmUgaG9yaXpvbnRhbFxuICAgIGlmIChvcHQub21pdFRyYW5wb3NlICYmIGVuYy55KSByZXR1cm4gZmFsc2U7XG5cbiAgICAvLyBkb3QgcGxvdCBzaG91bGRuJ3QgaGF2ZSBvdGhlciBlbmNvZGluZ1xuICAgIGlmIChvcHQub21pdERvdFBsb3RXaXRoRXh0cmFFbmNvZGluZyAmJiB2bC5rZXlzKGVuYykubGVuZ3RoID4gMSkgcmV0dXJuIGZhbHNlO1xuXG4gICAgLy8gZG90IHBsb3Qgd2l0aCBzaGFwZSBpcyBub24tc2Vuc2VcbiAgICBpZiAoZW5jLnNoYXBlKSByZXR1cm4gZmFsc2U7XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59XG5cbmZ1bmN0aW9uIHRpY2tSdWxlKGVuYywgc3RhdHMsIG9wdCkge1xuICAvLyBqc2hpbnQgdW51c2VkOmZhbHNlXG4gIGlmIChlbmMueCB8fCBlbmMueSkge1xuICAgIGlmKHZsLmVuYy5pc0FnZ3JlZ2F0ZShlbmMpKSByZXR1cm4gZmFsc2U7XG5cbiAgICB2YXIgeElzRGltID0gaXNEaW1lbnNpb24oZW5jLngpLFxuICAgICAgeUlzRGltID0gaXNEaW1lbnNpb24oZW5jLnkpO1xuXG4gICAgcmV0dXJuICgheElzRGltICYmICghZW5jLnkgfHwgaXNPcmRpbmFsU2NhbGUoZW5jLnkpKSkgfHxcbiAgICAgICgheUlzRGltICYmICghZW5jLnggfHwgaXNPcmRpbmFsU2NhbGUoZW5jLngpKSk7XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG5mdW5jdGlvbiBiYXJSdWxlKGVuYywgc3RhdHMsIG9wdCkge1xuICBpZighZmFjZXRzUnVsZShlbmMsIHN0YXRzLCBvcHQpKSByZXR1cm4gZmFsc2U7XG5cbiAgLy8gbmVlZCB0byBhZ2dyZWdhdGUgb24gZWl0aGVyIHggb3IgeVxuICBpZiAob3B0Lm9taXRTaXplT25CYXIgJiYgZW5jLnNpemUgIT09IHVuZGVmaW5lZCkgcmV0dXJuIGZhbHNlO1xuXG4gIC8vIEZJWE1FIGFjdHVhbGx5IGNoZWNrIGlmIHRoZXJlIHdvdWxkIGJlIG9jY2x1c2lvbiAjOTBcbiAgaWYgKCgoZW5jLnguYWdncmVnYXRlICE9PSB1bmRlZmluZWQpIF4gKGVuYy55LmFnZ3JlZ2F0ZSAhPT0gdW5kZWZpbmVkKSkgJiZcbiAgICAgIChpc0RpbWVuc2lvbihlbmMueCkgXiBpc0RpbWVuc2lvbihlbmMueSkpKSB7XG5cbiAgICB2YXIgYWdncmVnYXRlID0gZW5jLnguYWdncmVnYXRlIHx8IGVuYy55LmFnZ3JlZ2F0ZTtcbiAgICByZXR1cm4gIShvcHQub21pdFN0YWNrZWRBdmVyYWdlICYmIGFnZ3JlZ2F0ZSA9PT0nYXZnJyAmJiBlbmMuY29sb3IpO1xuICB9XG5cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG5mdW5jdGlvbiBsaW5lUnVsZShlbmMsIHN0YXRzLCBvcHQpIHtcbiAgaWYoIWZhY2V0c1J1bGUoZW5jLCBzdGF0cywgb3B0KSkgcmV0dXJuIGZhbHNlO1xuXG4gIC8vIFRPRE8oa2FuaXR3KTogYWRkIG9taXRWZXJ0aWNhbExpbmUgYXMgY29uZmlnXG5cbiAgLy8gRklYTUUgdHJ1bHkgb3JkaW5hbCBkYXRhIGlzIGZpbmUgaGVyZSB0b28uXG4gIC8vIExpbmUgY2hhcnQgc2hvdWxkIGJlIG9ubHkgaG9yaXpvbnRhbFxuICAvLyBhbmQgdXNlIG9ubHkgdGVtcG9yYWwgZGF0YVxuICByZXR1cm4gZW5jLngudHlwZSA9PSAnVCcgJiYgZW5jLngudGltZVVuaXQgJiYgZW5jLnkudHlwZSA9PSAnUScgJiYgZW5jLnkuYWdncmVnYXRlO1xufVxuXG5mdW5jdGlvbiBhcmVhUnVsZShlbmMsIHN0YXRzLCBvcHQpIHtcbiAgaWYoIWZhY2V0c1J1bGUoZW5jLCBzdGF0cywgb3B0KSkgcmV0dXJuIGZhbHNlO1xuXG4gIGlmKCFsaW5lUnVsZShlbmMsIHN0YXRzLCBvcHQpKSByZXR1cm4gZmFsc2U7XG5cbiAgcmV0dXJuICEob3B0Lm9taXRTdGFja2VkQXZlcmFnZSAmJiBlbmMueS5hZ2dyZWdhdGUgPT09J2F2ZycgJiYgZW5jLmNvbG9yKTtcbn1cblxuZnVuY3Rpb24gdGV4dFJ1bGUoZW5jLCBzdGF0cywgb3B0KSB7XG4gIC8vIGF0IGxlYXN0IG11c3QgaGF2ZSByb3cgb3IgY29sIGFuZCBhZ2dyZWdhdGVkIHRleHQgdmFsdWVzXG4gIHJldHVybiAoZW5jLnJvdyB8fCBlbmMuY29sKSAmJiBlbmMudGV4dCAmJiBlbmMudGV4dC5hZ2dyZWdhdGUgJiYgIWVuYy54ICYmICFlbmMueSAmJiAhZW5jLnNpemUgJiZcbiAgICAoIW9wdC5hbHdheXNHZW5lcmF0ZVRhYmxlQXNIZWF0bWFwIHx8ICFlbmMuY29sb3IpO1xufSIsIid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWwgPSByZXF1aXJlKCcuLi91dGlsJyksXG4gIGNvbnN0cyA9IHJlcXVpcmUoJy4uL2NvbnN0cycpLFxuICB2bCA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93Wyd2bCddIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbFsndmwnXSA6IG51bGwpLFxuICBpc0RpbWVuc2lvbiA9IHZsLmZpZWxkLmlzRGltZW5zaW9uO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHByb2plY3Rpb25zO1xuXG4vLyBUT0RPIHN1cHBvcnQgb3RoZXIgbW9kZSBvZiBwcm9qZWN0aW9ucyBnZW5lcmF0aW9uXG4vLyBwb3dlcnNldCwgY2hvb3NlSywgY2hvb3NlS29yTGVzcyBhcmUgYWxyZWFkeSBpbmNsdWRlZCBpbiB0aGUgdXRpbFxuXG4vKipcbiAqIGZpZWxkc1xuICogQHBhcmFtICB7W3R5cGVdfSBmaWVsZHMgYXJyYXkgb2YgZmllbGRzIGFuZCBxdWVyeSBpbmZvcm1hdGlvblxuICogQHJldHVybiB7W3R5cGVdfSAgICAgICAgW2Rlc2NyaXB0aW9uXVxuICovXG5mdW5jdGlvbiBwcm9qZWN0aW9ucyhmaWVsZHMsIHN0YXRzLCBvcHQpIHtcbiAgb3B0ID0gdmwuc2NoZW1hLnV0aWwuZXh0ZW5kKG9wdHx8e30sIGNvbnN0cy5nZW4ucHJvamVjdGlvbnMpO1xuXG4gIC8vIEZpcnN0IGNhdGVnb3JpemUgZmllbGQsIHNlbGVjdGVkLCBmaWVsZHNUb0FkZCwgYW5kIHNhdmUgaW5kaWNlc1xuICB2YXIgc2VsZWN0ZWQgPSBbXSwgZmllbGRzVG9BZGQgPSBbXSwgZmllbGRTZXRzID0gW10sXG4gICAgaGFzU2VsZWN0ZWREaW1lbnNpb24gPSBmYWxzZSxcbiAgICBoYXNTZWxlY3RlZE1lYXN1cmUgPSBmYWxzZSxcbiAgICBpbmRpY2VzID0ge307XG5cbiAgZmllbGRzLmZvckVhY2goZnVuY3Rpb24oZmllbGQsIGluZGV4KXtcbiAgICAvL3NhdmUgaW5kaWNlcyBmb3Igc3RhYmxlIHNvcnQgbGF0ZXJcbiAgICBpbmRpY2VzW2ZpZWxkLm5hbWVdID0gaW5kZXg7XG5cbiAgICBpZiAoZmllbGQuc2VsZWN0ZWQpIHtcbiAgICAgIHNlbGVjdGVkLnB1c2goZmllbGQpO1xuICAgICAgaWYgKGlzRGltZW5zaW9uKGZpZWxkKSB8fCBmaWVsZC50eXBlID09PSdUJykgeyAvLyBGSVhNRSAvIEhBQ0tcbiAgICAgICAgaGFzU2VsZWN0ZWREaW1lbnNpb24gPSB0cnVlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaGFzU2VsZWN0ZWRNZWFzdXJlID0gdHJ1ZTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGZpZWxkLnNlbGVjdGVkICE9PSBmYWxzZSAmJiAhdmwuZmllbGQuaXNDb3VudChmaWVsZCkpIHtcbiAgICAgIGlmICh2bC5maWVsZC5pc0RpbWVuc2lvbihmaWVsZCkgJiZcbiAgICAgICAgICAhb3B0Lm1heENhcmRpbmFsaXR5Rm9yQXV0b0FkZE9yZGluYWwgJiZcbiAgICAgICAgICB2bC5maWVsZC5jYXJkaW5hbGl0eShmaWVsZCwgc3RhdHMsIDE1KSA+IG9wdC5tYXhDYXJkaW5hbGl0eUZvckF1dG9BZGRPcmRpbmFsXG4gICAgICAgICkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBmaWVsZHNUb0FkZC5wdXNoKGZpZWxkKTtcbiAgICB9XG4gIH0pO1xuXG4gIGZpZWxkc1RvQWRkLnNvcnQoY29tcGFyZUZpZWxkc1RvQWRkKGhhc1NlbGVjdGVkRGltZW5zaW9uLCBoYXNTZWxlY3RlZE1lYXN1cmUsIGluZGljZXMpKTtcblxuICB2YXIgc2V0c1RvQWRkID0gdXRpbC5jaG9vc2VLb3JMZXNzKGZpZWxkc1RvQWRkLCAxKTtcblxuICBzZXRzVG9BZGQuZm9yRWFjaChmdW5jdGlvbihzZXRUb0FkZCkge1xuICAgIHZhciBmaWVsZFNldCA9IHNlbGVjdGVkLmNvbmNhdChzZXRUb0FkZCk7XG4gICAgaWYgKGZpZWxkU2V0Lmxlbmd0aCA+IDApIHtcbiAgICAgIGlmIChvcHQub21pdERvdFBsb3QgJiYgZmllbGRTZXQubGVuZ3RoID09PSAxKSByZXR1cm47XG4gICAgICBmaWVsZFNldHMucHVzaChmaWVsZFNldCk7XG4gICAgfVxuICB9KTtcblxuICBmaWVsZFNldHMuZm9yRWFjaChmdW5jdGlvbihmaWVsZFNldCkge1xuICAgICAgLy8gYWx3YXlzIGFwcGVuZCBwcm9qZWN0aW9uJ3Mga2V5IHRvIGVhY2ggcHJvamVjdGlvbiByZXR1cm5lZCwgZDMgc3R5bGUuXG4gICAgZmllbGRTZXQua2V5ID0gcHJvamVjdGlvbnMua2V5KGZpZWxkU2V0KTtcbiAgfSk7XG5cbiAgcmV0dXJuIGZpZWxkU2V0cztcbn1cblxudmFyIHR5cGVJc01lYXN1cmVTY29yZSA9IHtcbiAgTjogMCxcbiAgTzogMCxcbiAgVDogMixcbiAgUTogM1xufTtcblxuZnVuY3Rpb24gY29tcGFyZUZpZWxkc1RvQWRkKGhhc1NlbGVjdGVkRGltZW5zaW9uLCBoYXNTZWxlY3RlZE1lYXN1cmUsIGluZGljZXMpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKGEsIGIpe1xuICAgIC8vIHNvcnQgYnkgdHlwZSBvZiB0aGUgZGF0YVxuICAgIGlmIChhLnR5cGUgIT09IGIudHlwZSkge1xuICAgICAgaWYgKCFoYXNTZWxlY3RlZERpbWVuc2lvbikge1xuICAgICAgICByZXR1cm4gdHlwZUlzTWVhc3VyZVNjb3JlW2EudHlwZV0gLSB0eXBlSXNNZWFzdXJlU2NvcmVbYi50eXBlXTtcbiAgICAgIH0gZWxzZSB7IC8vaWYgKCFoYXNTZWxlY3RlZE1lYXN1cmUpIHtcbiAgICAgICAgcmV0dXJuIHR5cGVJc01lYXN1cmVTY29yZVtiLnR5cGVdIC0gdHlwZUlzTWVhc3VyZVNjb3JlW2EudHlwZV07XG4gICAgICB9XG4gICAgfVxuICAgIC8vbWFrZSB0aGUgc29ydCBzdGFibGVcbiAgICByZXR1cm4gaW5kaWNlc1thLm5hbWVdIC0gaW5kaWNlc1tiLm5hbWVdO1xuICB9O1xufVxuXG5wcm9qZWN0aW9ucy5rZXkgPSBmdW5jdGlvbihwcm9qZWN0aW9uKSB7XG4gIHJldHVybiBwcm9qZWN0aW9uLm1hcChmdW5jdGlvbihmaWVsZCkge1xuICAgIHJldHVybiB2bC5maWVsZC5pc0NvdW50KGZpZWxkKSA/ICdjb3VudCcgOiBmaWVsZC5uYW1lO1xuICB9KS5qb2luKCcsJyk7XG59O1xuXG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBnID0gZ2xvYmFsIHx8IHdpbmRvdztcblxucmVxdWlyZSgndmVnYS1saXRlL3NyYy9nbG9iYWxzJyk7XG5cbmcuQ0hBUlRfVFlQRVMgPSB7XG4gIFRBQkxFOiAnVEFCTEUnLFxuICBCQVI6ICdCQVInLFxuICBQTE9UOiAnUExPVCcsXG4gIExJTkU6ICdMSU5FJyxcbiAgQVJFQTogJ0FSRUEnLFxuICBNQVA6ICdNQVAnLFxuICBISVNUT0dSQU06ICdISVNUT0dSQU0nXG59O1xuXG5nLkFOWV9EQVRBX1RZUEVTID0gKDEgPDwgNCkgLSAxOyIsIm1vZHVsZS5leHBvcnRzID0ge1xuICBlbmNvZGluZzogcmVxdWlyZSgnLi9yYW5rRW5jb2RpbmdzJylcbn07XG5cblxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5yZXF1aXJlKCcuLi9nbG9iYWxzJyk7XG5cbnZhciB2bCA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93Wyd2bCddIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbFsndmwnXSA6IG51bGwpLFxuICBpc0RpbWVuc2lvbiA9IHZsLmZpZWxkLmlzRGltZW5zaW9uO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHJhbmtFbmNvZGluZ3M7XG5cbi8vIGJhZCBzY29yZSBub3Qgc3BlY2lmaWVkIGluIHRoZSB0YWJsZSBhYm92ZVxudmFyIFVOVVNFRF9QT1NJVElPTiA9IDAuNTtcblxudmFyIE1BUktfU0NPUkUgPSB7XG4gIGxpbmU6IDAuOTksXG4gIGFyZWE6IDAuOTgsXG4gIGJhcjogMC45NyxcbiAgdGljazogMC45NixcbiAgcG9pbnQ6IDAuOTUsXG4gIGNpcmNsZTogMC45NCxcbiAgc3F1YXJlOiAwLjk0LFxuICB0ZXh0OiAwLjhcbn07XG5cbmZ1bmN0aW9uIHJhbmtFbmNvZGluZ3MoZW5jb2RpbmcsIHN0YXRzLCBvcHQsIHNlbGVjdGVkKSB7XG4gIHZhciBmZWF0dXJlcyA9IFtdLFxuICAgIGVuY1R5cGVzID0gdmwua2V5cyhlbmNvZGluZy5lbmNvZGluZyksXG4gICAgbWFya3R5cGUgPSBlbmNvZGluZy5tYXJrdHlwZSxcbiAgICBlbmMgPSBlbmNvZGluZy5lbmNvZGluZztcblxuICB2YXIgZW5jb2RpbmdNYXBwaW5nQnlGaWVsZCA9IHZsLmVuYy5yZWR1Y2UoZW5jb2RpbmcuZW5jb2RpbmcsIGZ1bmN0aW9uKG8sIGZpZWxkLCBlbmNUeXBlKSB7XG4gICAgdmFyIGtleSA9IHZsLmZpZWxkLnNob3J0aGFuZChmaWVsZCk7XG4gICAgdmFyIG1hcHBpbmdzID0gb1trZXldID0gb1trZXldIHx8IFtdO1xuICAgIG1hcHBpbmdzLnB1c2goe2VuY1R5cGU6IGVuY1R5cGUsIGZpZWxkOiBmaWVsZH0pO1xuICAgIHJldHVybiBvO1xuICB9LCB7fSk7XG5cbiAgLy8gZGF0YSAtIGVuY29kaW5nIG1hcHBpbmcgc2NvcmVcbiAgdmwuZm9yRWFjaChlbmNvZGluZ01hcHBpbmdCeUZpZWxkLCBmdW5jdGlvbihtYXBwaW5ncykge1xuICAgIHZhciByZWFzb25zID0gbWFwcGluZ3MubWFwKGZ1bmN0aW9uKG0pIHtcbiAgICAgICAgcmV0dXJuIG0uZW5jVHlwZSArIHZsLnNob3J0aGFuZC5hc3NpZ24gKyB2bC5maWVsZC5zaG9ydGhhbmQobS5maWVsZCkgK1xuICAgICAgICAgICcgJyArIChzZWxlY3RlZCAmJiBzZWxlY3RlZFttLmZpZWxkLm5hbWVdID8gJ1t4XScgOiAnWyBdJyk7XG4gICAgICB9KSxcbiAgICAgIHNjb3JlcyA9IG1hcHBpbmdzLm1hcChmdW5jdGlvbihtKSB7XG4gICAgICAgIHZhciByb2xlID0gdmwuZmllbGQuaXNEaW1lbnNpb24obS5maWVsZCkgPyAnZGltZW5zaW9uJyA6ICdtZWFzdXJlJztcblxuICAgICAgICB2YXIgc2NvcmUgPSByYW5rRW5jb2RpbmdzLnNjb3JlW3JvbGVdKG0uZmllbGQsIG0uZW5jVHlwZSwgZW5jb2RpbmcubWFya3R5cGUsIHN0YXRzLCBvcHQpO1xuXG4gICAgICAgIHJldHVybiAhc2VsZWN0ZWQgfHwgc2VsZWN0ZWRbbS5maWVsZC5uYW1lXSA/IHNjb3JlIDogTWF0aC5wb3coc2NvcmUsIDAuMTI1KTtcbiAgICAgIH0pO1xuXG4gICAgZmVhdHVyZXMucHVzaCh7XG4gICAgICByZWFzb246IHJlYXNvbnMuam9pbihcIiB8IFwiKSxcbiAgICAgIHNjb3JlOiBNYXRoLm1heC5hcHBseShudWxsLCBzY29yZXMpXG4gICAgfSk7XG4gIH0pO1xuXG4gIC8vIHBsb3QgdHlwZVxuICBpZiAobWFya3R5cGUgPT09IFRFWFQpIHtcbiAgICAvLyBUT0RPXG4gIH0gZWxzZSB7XG4gICAgaWYgKGVuYy54ICYmIGVuYy55KSB7XG4gICAgICBpZiAoaXNEaW1lbnNpb24oZW5jLngpIF4gaXNEaW1lbnNpb24oZW5jLnkpKSB7XG4gICAgICAgIGZlYXR1cmVzLnB1c2goe1xuICAgICAgICAgIHJlYXNvbjogJ094USBwbG90JyxcbiAgICAgICAgICBzY29yZTogMC44XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIHBlbmFsaXplIG5vdCB1c2luZyBwb3NpdGlvbmFsIG9ubHkgcGVuYWxpemUgZm9yIG5vbi10ZXh0XG4gIGlmIChlbmNUeXBlcy5sZW5ndGggPiAxICYmIG1hcmt0eXBlICE9PSBURVhUKSB7XG4gICAgaWYgKCghZW5jLnggfHwgIWVuYy55KSAmJiAhZW5jLmdlbyAmJiAhZW5jLnRleHQpIHtcbiAgICAgIGZlYXR1cmVzLnB1c2goe1xuICAgICAgICByZWFzb246ICd1bnVzZWQgcG9zaXRpb24nLFxuICAgICAgICBzY29yZTogVU5VU0VEX1BPU0lUSU9OXG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICAvLyBtYXJrIHR5cGUgc2NvcmVcbiAgZmVhdHVyZXMucHVzaCh7XG4gICAgcmVhc29uOiAnbWFya3R5cGU9JyttYXJrdHlwZSxcbiAgICBzY29yZTogTUFSS19TQ09SRVttYXJrdHlwZV1cbiAgfSk7XG5cbiAgcmV0dXJuIHtcbiAgICBzY29yZTogZmVhdHVyZXMucmVkdWNlKGZ1bmN0aW9uKHAsIGYpIHtcbiAgICAgIHJldHVybiBwICogZi5zY29yZTtcbiAgICB9LCAxKSxcbiAgICBmZWF0dXJlczogZmVhdHVyZXNcbiAgfTtcbn1cblxuXG52YXIgRCA9IHt9LCBNID0ge30sIEJBRCA9IDAuMSwgVEVSUklCTEUgPSAwLjAxO1xuXG5ELm1pbm9yID0gMC4wMTtcbkQucG9zID0gMTtcbkQuWV9UID0gMC44O1xuRC5mYWNldF90ZXh0ID0gMTtcbkQuZmFjZXRfZ29vZCA9IDAuNjc1OyAvLyA8IGNvbG9yX29rLCA+IGNvbG9yX2JhZFxuRC5mYWNldF9vayA9IDAuNTU7XG5ELmZhY2V0X2JhZCA9IDAuNDtcbkQuY29sb3JfZ29vZCA9IDAuNztcbkQuY29sb3Jfb2sgPSAwLjY1OyAvLyA+IE0uU2l6ZVxuRC5jb2xvcl9iYWQgPSAwLjM7XG5ELmNvbG9yX3N0YWNrID0gMC42O1xuRC5zaGFwZSA9IDAuNjtcbkQuZGV0YWlsID0gMC41O1xuRC5iYWQgPSBCQUQ7XG5ELnRlcnJpYmxlID0gVEVSUklCTEU7XG5cbk0ucG9zID0gMTtcbk0uc2l6ZSA9IDAuNjtcbk0uY29sb3IgPSAwLjU7XG5NLmFscGhhID0gMC40NTtcbk0udGV4dCA9IDAuNDtcbk0uYmFkID0gQkFEO1xuTS50ZXJyaWJsZSA9IFRFUlJJQkxFO1xuXG5yYW5rRW5jb2RpbmdzLmRpbWVuc2lvblNjb3JlID0gZnVuY3Rpb24gKGZpZWxkLCBlbmNUeXBlLCBtYXJrdHlwZSwgc3RhdHMsIG9wdCl7XG4gIHZhciBjYXJkaW5hbGl0eSA9IHZsLmZpZWxkLmNhcmRpbmFsaXR5KGZpZWxkLCBzdGF0cyk7XG4gIHN3aXRjaCAoZW5jVHlwZSkge1xuICAgIGNhc2UgWDpcbiAgICAgIGlmICh2bC5maWVsZC5pc1R5cGVzKGZpZWxkLCBbTiwgT10pKSAgcmV0dXJuIEQucG9zIC0gRC5taW5vcjtcbiAgICAgIHJldHVybiBELnBvcztcblxuICAgIGNhc2UgWTpcbiAgICAgIGlmICh2bC5maWVsZC5pc1R5cGVzKGZpZWxkLCBbTiwgT10pKSByZXR1cm4gRC5wb3MgLSBELm1pbm9yOyAvL3ByZWZlciBvcmRpbmFsIG9uIHlcbiAgICAgIGlmKGZpZWxkLnR5cGUgPT09IFQpIHJldHVybiBELllfVDsgLy8gdGltZSBzaG91bGQgbm90IGJlIG9uIFlcbiAgICAgIHJldHVybiBELnBvcyAtIEQubWlub3I7XG5cbiAgICBjYXNlIENPTDpcbiAgICAgIGlmIChtYXJrdHlwZSA9PT0gVEVYVCkgcmV0dXJuIEQuZmFjZXRfdGV4dDtcbiAgICAgIC8vcHJlZmVyIGNvbHVtbiBvdmVyIHJvdyBkdWUgdG8gc2Nyb2xsaW5nIGlzc3Vlc1xuICAgICAgcmV0dXJuIGNhcmRpbmFsaXR5IDw9IG9wdC5tYXhHb29kQ2FyZGluYWxpdHlGb3JGYWNldHMgPyBELmZhY2V0X2dvb2QgOlxuICAgICAgICBjYXJkaW5hbGl0eSA8PSBvcHQubWF4Q2FyZGluYWxpdHlGb3JGYWNldHMgPyBELmZhY2V0X29rIDogRC5mYWNldF9iYWQ7XG5cbiAgICBjYXNlIFJPVzpcbiAgICAgIGlmIChtYXJrdHlwZSA9PT0gVEVYVCkgcmV0dXJuIEQuZmFjZXRfdGV4dDtcbiAgICAgIHJldHVybiAoY2FyZGluYWxpdHkgPD0gb3B0Lm1heEdvb2RDYXJkaW5hbGl0eUZvckZhY2V0cyA/IEQuZmFjZXRfZ29vZCA6XG4gICAgICAgIGNhcmRpbmFsaXR5IDw9IG9wdC5tYXhDYXJkaW5hbGl0eUZvckZhY2V0cyA/IEQuZmFjZXRfb2sgOiBELmZhY2V0X2JhZCkgLSBELm1pbm9yO1xuXG4gICAgY2FzZSBDT0xPUjpcbiAgICAgIHZhciBoYXNPcmRlciA9IChmaWVsZC5iaW4gJiYgZmllbGQudHlwZT09PVEpIHx8IChmaWVsZC50aW1lVW5pdCAmJiBmaWVsZC50eXBlPT09VCk7XG5cbiAgICAgIC8vRklYTUUgYWRkIHN0YWNraW5nIG9wdGlvbiBvbmNlIHdlIGhhdmUgY29udHJvbCAuLlxuICAgICAgdmFyIGlzU3RhY2tlZCA9IG1hcmt0eXBlID09PSAnYmFyJyB8fCBtYXJrdHlwZSA9PT0gJ2FyZWEnO1xuXG4gICAgICAvLyB0cnVlIG9yZGluYWwgb24gY29sb3IgaXMgY3VycmVudGx5IEJBRCAodW50aWwgd2UgaGF2ZSBnb29kIG9yZGluYWwgY29sb3Igc2NhbGUgc3VwcG9ydClcbiAgICAgIGlmIChoYXNPcmRlcikgcmV0dXJuIEQuY29sb3JfYmFkO1xuXG4gICAgICAvL3N0YWNraW5nIGdldHMgbG93ZXIgc2NvcmVcbiAgICAgIGlmIChpc1N0YWNrZWQpIHJldHVybiBELmNvbG9yX3N0YWNrO1xuXG4gICAgICByZXR1cm4gY2FyZGluYWxpdHkgPD0gb3B0Lm1heEdvb2RDYXJkaW5hbGl0eUZvckNvbG9yID8gRC5jb2xvcl9nb29kOiBjYXJkaW5hbGl0eSA8PSBvcHQubWF4Q2FyZGluYWxpdHlGb3JDb2xvciA/IEQuY29sb3Jfb2sgOiBELmNvbG9yX2JhZDtcbiAgICBjYXNlIFNIQVBFOlxuICAgICAgcmV0dXJuIGNhcmRpbmFsaXR5IDw9IG9wdC5tYXhDYXJkaW5hbGl0eUZvclNoYXBlID8gRC5zaGFwZSA6IFRFUlJJQkxFO1xuICAgIGNhc2UgREVUQUlMOlxuICAgICAgcmV0dXJuIEQuZGV0YWlsO1xuICB9XG4gIHJldHVybiBURVJSSUJMRTtcbn07XG5cbnJhbmtFbmNvZGluZ3MuZGltZW5zaW9uU2NvcmUuY29uc3RzID0gRDtcblxucmFua0VuY29kaW5ncy5tZWFzdXJlU2NvcmUgPSBmdW5jdGlvbiAoZmllbGQsIGVuY1R5cGUsIG1hcmt0eXBlLCBzdGF0cywgb3B0KSB7XG4gIC8vIGpzaGludCB1bnVzZWQ6ZmFsc2VcbiAgc3dpdGNoIChlbmNUeXBlKXtcbiAgICBjYXNlIFg6IHJldHVybiBNLnBvcztcbiAgICBjYXNlIFk6IHJldHVybiBNLnBvcztcbiAgICBjYXNlIFNJWkU6XG4gICAgICBpZiAobWFya3R5cGUgPT09ICdiYXInKSByZXR1cm4gQkFEOyAvL3NpemUgb2YgYmFyIGlzIHZlcnkgYmFkXG4gICAgICBpZiAobWFya3R5cGUgPT09IFRFWFQpIHJldHVybiBCQUQ7XG4gICAgICBpZiAobWFya3R5cGUgPT09ICdsaW5lJykgcmV0dXJuIEJBRDtcbiAgICAgIHJldHVybiBNLnNpemU7XG4gICAgY2FzZSBDT0xPUjogcmV0dXJuIE0uY29sb3I7XG4gICAgY2FzZSAnYWxwaGEnOiByZXR1cm4gTS5hbHBoYTtcbiAgICBjYXNlIFRFWFQ6IHJldHVybiBNLnRleHQ7XG4gIH1cbiAgcmV0dXJuIEJBRDtcbn07XG5cbnJhbmtFbmNvZGluZ3MubWVhc3VyZVNjb3JlLmNvbnN0cyA9IE07XG5cblxucmFua0VuY29kaW5ncy5zY29yZSA9IHtcbiAgZGltZW5zaW9uOiByYW5rRW5jb2RpbmdzLmRpbWVuc2lvblNjb3JlLFxuICBtZWFzdXJlOiByYW5rRW5jb2RpbmdzLm1lYXN1cmVTY29yZSxcbn07XG4iLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIGNvbnN0cyA9IHJlcXVpcmUoJy4vY29uc3RzJyk7XG5cbnZhciB1dGlsID0gbW9kdWxlLmV4cG9ydHMgPSB7XG4gIGdlbjoge31cbn07XG5cbnV0aWwuaXNBcnJheSA9IEFycmF5LmlzQXJyYXkgfHwgZnVuY3Rpb24gKG9iaikge1xuICByZXR1cm4ge30udG9TdHJpbmcuY2FsbChvYmopID09ICdbb2JqZWN0IEFycmF5XSc7XG59O1xuXG51dGlsLmpzb24gPSBmdW5jdGlvbihzLCBzcCkge1xuICByZXR1cm4gSlNPTi5zdHJpbmdpZnkocywgbnVsbCwgc3ApO1xufTtcblxudXRpbC5rZXlzID0gZnVuY3Rpb24ob2JqKSB7XG4gIHZhciBrID0gW10sIHg7XG4gIGZvciAoeCBpbiBvYmopIGsucHVzaCh4KTtcbiAgcmV0dXJuIGs7XG59O1xuXG51dGlsLm5lc3RlZE1hcCA9IGZ1bmN0aW9uIChjb2wsIGYsIGxldmVsLCBmaWx0ZXIpIHtcbiAgcmV0dXJuIGxldmVsID09PSAwID9cbiAgICBjb2wubWFwKGYpIDpcbiAgICBjb2wubWFwKGZ1bmN0aW9uKHYpIHtcbiAgICAgIHZhciByID0gdXRpbC5uZXN0ZWRNYXAodiwgZiwgbGV2ZWwgLSAxKTtcbiAgICAgIHJldHVybiBmaWx0ZXIgPyByLmZpbHRlcih1dGlsLm5vbkVtcHR5KSA6IHI7XG4gICAgfSk7XG59O1xuXG51dGlsLm5lc3RlZFJlZHVjZSA9IGZ1bmN0aW9uIChjb2wsIGYsIGxldmVsLCBmaWx0ZXIpIHtcbiAgcmV0dXJuIGxldmVsID09PSAwID9cbiAgICBjb2wucmVkdWNlKGYsIFtdKSA6XG4gICAgY29sLm1hcChmdW5jdGlvbih2KSB7XG4gICAgICB2YXIgciA9IHV0aWwubmVzdGVkUmVkdWNlKHYsIGYsIGxldmVsIC0gMSk7XG4gICAgICByZXR1cm4gZmlsdGVyID8gci5maWx0ZXIodXRpbC5ub25FbXB0eSkgOiByO1xuICAgIH0pO1xufTtcblxudXRpbC5ub25FbXB0eSA9IGZ1bmN0aW9uKGdycCkge1xuICByZXR1cm4gIXV0aWwuaXNBcnJheShncnApIHx8IGdycC5sZW5ndGggPiAwO1xufTtcblxuXG51dGlsLnRyYXZlcnNlID0gZnVuY3Rpb24gKG5vZGUsIGFycikge1xuICBpZiAobm9kZS52YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgYXJyLnB1c2gobm9kZS52YWx1ZSk7XG4gIH0gZWxzZSB7XG4gICAgaWYgKG5vZGUubGVmdCkgdXRpbC50cmF2ZXJzZShub2RlLmxlZnQsIGFycik7XG4gICAgaWYgKG5vZGUucmlnaHQpIHV0aWwudHJhdmVyc2Uobm9kZS5yaWdodCwgYXJyKTtcbiAgfVxuICByZXR1cm4gYXJyO1xufTtcblxudXRpbC51bmlvbiA9IGZ1bmN0aW9uIChhLCBiKSB7XG4gIHZhciBvID0ge307XG4gIGEuZm9yRWFjaChmdW5jdGlvbih4KSB7IG9beF0gPSB0cnVlO30pO1xuICBiLmZvckVhY2goZnVuY3Rpb24oeCkgeyBvW3hdID0gdHJ1ZTt9KTtcbiAgcmV0dXJuIHV0aWwua2V5cyhvKTtcbn07XG5cblxudXRpbC5nZW4uZ2V0T3B0ID0gZnVuY3Rpb24gKG9wdCkge1xuICAvL21lcmdlIHdpdGggZGVmYXVsdFxuICByZXR1cm4gKG9wdCA/IHV0aWwua2V5cyhvcHQpIDogW10pLnJlZHVjZShmdW5jdGlvbihjLCBrKSB7XG4gICAgY1trXSA9IG9wdFtrXTtcbiAgICByZXR1cm4gYztcbiAgfSwgT2JqZWN0LmNyZWF0ZShjb25zdHMuZ2VuLkRFRkFVTFRfT1BUKSk7XG59O1xuXG4vKipcbiAqIHBvd2Vyc2V0IGNvZGUgZnJvbSBodHRwOi8vcm9zZXR0YWNvZGUub3JnL3dpa2kvUG93ZXJfU2V0I0phdmFTY3JpcHRcbiAqXG4gKiAgIHZhciByZXMgPSBwb3dlcnNldChbMSwyLDMsNF0pO1xuICpcbiAqIHJldHVybnNcbiAqXG4gKiBbW10sWzFdLFsyXSxbMSwyXSxbM10sWzEsM10sWzIsM10sWzEsMiwzXSxbNF0sWzEsNF0sXG4gKiBbMiw0XSxbMSwyLDRdLFszLDRdLFsxLDMsNF0sWzIsMyw0XSxbMSwyLDMsNF1dXG5bZWRpdF1cbiovXG5cbnV0aWwucG93ZXJzZXQgPSBmdW5jdGlvbihsaXN0KSB7XG4gIHZhciBwcyA9IFtcbiAgICBbXVxuICBdO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGxpc3QubGVuZ3RoOyBpKyspIHtcbiAgICBmb3IgKHZhciBqID0gMCwgbGVuID0gcHMubGVuZ3RoOyBqIDwgbGVuOyBqKyspIHtcbiAgICAgIHBzLnB1c2gocHNbal0uY29uY2F0KGxpc3RbaV0pKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHBzO1xufTtcblxudXRpbC5jaG9vc2VLb3JMZXNzID0gZnVuY3Rpb24obGlzdCwgaykge1xuICB2YXIgc3Vic2V0ID0gW1tdXTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgZm9yICh2YXIgaiA9IDAsIGxlbiA9IHN1YnNldC5sZW5ndGg7IGogPCBsZW47IGorKykge1xuICAgICAgdmFyIHN1YiA9IHN1YnNldFtqXS5jb25jYXQobGlzdFtpXSk7XG4gICAgICBpZihzdWIubGVuZ3RoIDw9IGspe1xuICAgICAgICBzdWJzZXQucHVzaChzdWIpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gc3Vic2V0O1xufTtcblxudXRpbC5jaG9vc2VLID0gZnVuY3Rpb24obGlzdCwgaykge1xuICB2YXIgc3Vic2V0ID0gW1tdXTtcbiAgdmFyIGtBcnJheSA9W107XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7IGkrKykge1xuICAgIGZvciAodmFyIGogPSAwLCBsZW4gPSBzdWJzZXQubGVuZ3RoOyBqIDwgbGVuOyBqKyspIHtcbiAgICAgIHZhciBzdWIgPSBzdWJzZXRbal0uY29uY2F0KGxpc3RbaV0pO1xuICAgICAgaWYoc3ViLmxlbmd0aCA8IGspe1xuICAgICAgICBzdWJzZXQucHVzaChzdWIpO1xuICAgICAgfWVsc2UgaWYgKHN1Yi5sZW5ndGggPT09IGspe1xuICAgICAgICBrQXJyYXkucHVzaChzdWIpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4ga0FycmF5O1xufTtcblxudXRpbC5jcm9zcyA9IGZ1bmN0aW9uKGEsYil7XG4gIHZhciB4ID0gW107XG4gIGZvcih2YXIgaT0wOyBpPCBhLmxlbmd0aDsgaSsrKXtcbiAgICBmb3IodmFyIGo9MDtqPCBiLmxlbmd0aDsgaisrKXtcbiAgICAgIHgucHVzaChhW2ldLmNvbmNhdChiW2pdKSk7XG4gICAgfVxuICB9XG4gIHJldHVybiB4O1xufTtcblxuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vLyBkZWNsYXJlIGdsb2JhbCBjb25zdGFudFxudmFyIGcgPSBnbG9iYWwgfHwgd2luZG93O1xuXG5nLlRBQkxFID0gJ3RhYmxlJztcbmcuUkFXID0gJ3Jhdyc7XG5nLlNUQUNLRUQgPSAnc3RhY2tlZCc7XG5nLklOREVYID0gJ2luZGV4JztcblxuZy5YID0gJ3gnO1xuZy5ZID0gJ3knO1xuZy5ST1cgPSAncm93JztcbmcuQ09MID0gJ2NvbCc7XG5nLlNJWkUgPSAnc2l6ZSc7XG5nLlNIQVBFID0gJ3NoYXBlJztcbmcuQ09MT1IgPSAnY29sb3InO1xuZy5URVhUID0gJ3RleHQnO1xuZy5ERVRBSUwgPSAnZGV0YWlsJztcblxuZy5OID0gJ04nO1xuZy5PID0gJ08nO1xuZy5RID0gJ1EnO1xuZy5UID0gJ1QnO1xuIl19
