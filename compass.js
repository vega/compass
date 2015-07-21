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
    if (enc.color || enc.size || enc.shape) return false;
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

    if (opt.omitOneDimensionCount) {
      // one dimension "count"
    if (enc.x && enc.x.aggregate == 'count' && !enc.y) return false;
    if (enc.y && enc.y.aggregate == 'count' && !enc.x) return false;
    }

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

  // bar requires at least x or y
  if (!enc.x && !enc.y) return false;

  if (opt.omitSizeOnBar && enc.size !== undefined) return false;

  // FIXME actually check if there would be occlusion #90
  // need to aggregate on either x or y
  var aggEitherXorY =
    (!enc.x || enc.x.aggregate === undefined) ^
    (!enc.y || enc.y.aggregate === undefined);


  if (aggEitherXorY) {
    var eitherXorYisDimOrNull =
      (!enc.x || isDimension(enc.x)) ^
      (!enc.y || isDimension(enc.y));

    if (eitherXorYisDimOrNull) {
      var aggregate = enc.x.aggregate || enc.y.aggregate;
      return !(opt.omitStackedAverage && aggregate ==='avg' && enc.color);
    }
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
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvY2x1c3RlcmZjay9saWIvY2x1c3RlcmZjay5qcyIsIm5vZGVfbW9kdWxlcy9jbHVzdGVyZmNrL2xpYi9kaXN0YW5jZS5qcyIsIm5vZGVfbW9kdWxlcy9jbHVzdGVyZmNrL2xpYi9oY2x1c3Rlci5qcyIsIm5vZGVfbW9kdWxlcy9jbHVzdGVyZmNrL2xpYi9rbWVhbnMuanMiLCJzcmMvY2x1c3Rlci9jbHVzdGVyLmpzIiwic3JjL2NsdXN0ZXIvY2x1c3RlcmNvbnN0cy5qcyIsInNyYy9jbHVzdGVyL2Rpc3RhbmNlLmpzIiwic3JjL2NvbnN0cy5qcyIsInNyYy9jcCIsInNyYy9nZW4vYWdncmVnYXRlcy5qcyIsInNyYy9nZW4vZW5jb2RpbmdzLmpzIiwic3JjL2dlbi9lbmNzLmpzIiwic3JjL2dlbi9nZW4uanMiLCJzcmMvZ2VuL21hcmt0eXBlcy5qcyIsInNyYy9nZW4vcHJvamVjdGlvbnMuanMiLCJzcmMvZ2xvYmFscy5qcyIsInNyYy9yYW5rL3JhbmsuanMiLCJzcmMvcmFuay9yYW5rRW5jb2RpbmdzLmpzIiwic3JjL3V0aWwuanMiLCIuLi92ZWdhLWxpdGUvc3JjL2dsb2JhbHMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDN0dBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDdkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUM1RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUMvS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDL0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQzlNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUM5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUM3SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDaEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNoQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQzdMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ3RJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgIGhjbHVzdGVyOiByZXF1aXJlKFwiLi9oY2x1c3RlclwiKSxcbiAgIEttZWFuczogcmVxdWlyZShcIi4va21lYW5zXCIpLFxuICAga21lYW5zOiByZXF1aXJlKFwiLi9rbWVhbnNcIikua21lYW5zXG59OyIsIm1vZHVsZS5leHBvcnRzID0ge1xuICBldWNsaWRlYW46IGZ1bmN0aW9uKHYxLCB2Mikge1xuICAgICAgdmFyIHRvdGFsID0gMDtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdjEubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgIHRvdGFsICs9IE1hdGgucG93KHYyW2ldIC0gdjFbaV0sIDIpOyAgICAgIFxuICAgICAgfVxuICAgICAgcmV0dXJuIE1hdGguc3FydCh0b3RhbCk7XG4gICB9LFxuICAgbWFuaGF0dGFuOiBmdW5jdGlvbih2MSwgdjIpIHtcbiAgICAgdmFyIHRvdGFsID0gMDtcbiAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB2MS5sZW5ndGggOyBpKyspIHtcbiAgICAgICAgdG90YWwgKz0gTWF0aC5hYnModjJbaV0gLSB2MVtpXSk7ICAgICAgXG4gICAgIH1cbiAgICAgcmV0dXJuIHRvdGFsO1xuICAgfSxcbiAgIG1heDogZnVuY3Rpb24odjEsIHYyKSB7XG4gICAgIHZhciBtYXggPSAwO1xuICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHYxLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIG1heCA9IE1hdGgubWF4KG1heCAsIE1hdGguYWJzKHYyW2ldIC0gdjFbaV0pKTsgICAgICBcbiAgICAgfVxuICAgICByZXR1cm4gbWF4O1xuICAgfVxufTsiLCJ2YXIgZGlzdGFuY2VzID0gcmVxdWlyZShcIi4vZGlzdGFuY2VcIik7XG5cbnZhciBIaWVyYXJjaGljYWxDbHVzdGVyaW5nID0gZnVuY3Rpb24oZGlzdGFuY2UsIGxpbmthZ2UsIHRocmVzaG9sZCkge1xuICAgdGhpcy5kaXN0YW5jZSA9IGRpc3RhbmNlO1xuICAgdGhpcy5saW5rYWdlID0gbGlua2FnZTtcbiAgIHRoaXMudGhyZXNob2xkID0gdGhyZXNob2xkID09IHVuZGVmaW5lZCA/IEluZmluaXR5IDogdGhyZXNob2xkO1xufVxuXG5IaWVyYXJjaGljYWxDbHVzdGVyaW5nLnByb3RvdHlwZSA9IHtcbiAgIGNsdXN0ZXIgOiBmdW5jdGlvbihpdGVtcywgc25hcHNob3RQZXJpb2QsIHNuYXBzaG90Q2IpIHtcbiAgICAgIHRoaXMuY2x1c3RlcnMgPSBbXTtcbiAgICAgIHRoaXMuZGlzdHMgPSBbXTsgIC8vIGRpc3RhbmNlcyBiZXR3ZWVuIGVhY2ggcGFpciBvZiBjbHVzdGVyc1xuICAgICAgdGhpcy5taW5zID0gW107IC8vIGNsb3Nlc3QgY2x1c3RlciBmb3IgZWFjaCBjbHVzdGVyXG4gICAgICB0aGlzLmluZGV4ID0gW107IC8vIGtlZXAgYSBoYXNoIG9mIGFsbCBjbHVzdGVycyBieSBrZXlcbiAgICAgIFxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBpdGVtcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgdmFyIGNsdXN0ZXIgPSB7XG4gICAgICAgICAgICB2YWx1ZTogaXRlbXNbaV0sXG4gICAgICAgICAgICBrZXk6IGksXG4gICAgICAgICAgICBpbmRleDogaSxcbiAgICAgICAgICAgIHNpemU6IDFcbiAgICAgICAgIH07XG4gICAgICAgICB0aGlzLmNsdXN0ZXJzW2ldID0gY2x1c3RlcjtcbiAgICAgICAgIHRoaXMuaW5kZXhbaV0gPSBjbHVzdGVyO1xuICAgICAgICAgdGhpcy5kaXN0c1tpXSA9IFtdO1xuICAgICAgICAgdGhpcy5taW5zW2ldID0gMDtcbiAgICAgIH1cblxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmNsdXN0ZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8PSBpOyBqKyspIHtcbiAgICAgICAgICAgIHZhciBkaXN0ID0gKGkgPT0gaikgPyBJbmZpbml0eSA6IFxuICAgICAgICAgICAgICAgdGhpcy5kaXN0YW5jZSh0aGlzLmNsdXN0ZXJzW2ldLnZhbHVlLCB0aGlzLmNsdXN0ZXJzW2pdLnZhbHVlKTtcbiAgICAgICAgICAgIHRoaXMuZGlzdHNbaV1bal0gPSBkaXN0O1xuICAgICAgICAgICAgdGhpcy5kaXN0c1tqXVtpXSA9IGRpc3Q7XG5cbiAgICAgICAgICAgIGlmIChkaXN0IDwgdGhpcy5kaXN0c1tpXVt0aGlzLm1pbnNbaV1dKSB7XG4gICAgICAgICAgICAgICB0aGlzLm1pbnNbaV0gPSBqOyAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgfVxuICAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB2YXIgbWVyZ2VkID0gdGhpcy5tZXJnZUNsb3Nlc3QoKTtcbiAgICAgIHZhciBpID0gMDtcbiAgICAgIHdoaWxlIChtZXJnZWQpIHtcbiAgICAgICAgaWYgKHNuYXBzaG90Q2IgJiYgKGkrKyAlIHNuYXBzaG90UGVyaW9kKSA9PSAwKSB7XG4gICAgICAgICAgIHNuYXBzaG90Q2IodGhpcy5jbHVzdGVycyk7ICAgICAgICAgICBcbiAgICAgICAgfVxuICAgICAgICBtZXJnZWQgPSB0aGlzLm1lcmdlQ2xvc2VzdCgpO1xuICAgICAgfVxuICAgIFxuICAgICAgdGhpcy5jbHVzdGVycy5mb3JFYWNoKGZ1bmN0aW9uKGNsdXN0ZXIpIHtcbiAgICAgICAgLy8gY2xlYW4gdXAgbWV0YWRhdGEgdXNlZCBmb3IgY2x1c3RlcmluZ1xuICAgICAgICBkZWxldGUgY2x1c3Rlci5rZXk7XG4gICAgICAgIGRlbGV0ZSBjbHVzdGVyLmluZGV4O1xuICAgICAgfSk7XG5cbiAgICAgIHJldHVybiB0aGlzLmNsdXN0ZXJzO1xuICAgfSxcbiAgXG4gICBtZXJnZUNsb3Nlc3Q6IGZ1bmN0aW9uKCkge1xuICAgICAgLy8gZmluZCB0d28gY2xvc2VzdCBjbHVzdGVycyBmcm9tIGNhY2hlZCBtaW5zXG4gICAgICB2YXIgbWluS2V5ID0gMCwgbWluID0gSW5maW5pdHk7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuY2x1c3RlcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgIHZhciBrZXkgPSB0aGlzLmNsdXN0ZXJzW2ldLmtleSxcbiAgICAgICAgICAgICBkaXN0ID0gdGhpcy5kaXN0c1trZXldW3RoaXMubWluc1trZXldXTtcbiAgICAgICAgIGlmIChkaXN0IDwgbWluKSB7XG4gICAgICAgICAgICBtaW5LZXkgPSBrZXk7XG4gICAgICAgICAgICBtaW4gPSBkaXN0O1xuICAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKG1pbiA+PSB0aGlzLnRocmVzaG9sZCkge1xuICAgICAgICAgcmV0dXJuIGZhbHNlOyAgICAgICAgIFxuICAgICAgfVxuXG4gICAgICB2YXIgYzEgPSB0aGlzLmluZGV4W21pbktleV0sXG4gICAgICAgICAgYzIgPSB0aGlzLmluZGV4W3RoaXMubWluc1ttaW5LZXldXTtcblxuICAgICAgLy8gbWVyZ2UgdHdvIGNsb3Nlc3QgY2x1c3RlcnNcbiAgICAgIHZhciBtZXJnZWQgPSB7XG4gICAgICAgICBsZWZ0OiBjMSxcbiAgICAgICAgIHJpZ2h0OiBjMixcbiAgICAgICAgIGtleTogYzEua2V5LFxuICAgICAgICAgc2l6ZTogYzEuc2l6ZSArIGMyLnNpemVcbiAgICAgIH07XG5cbiAgICAgIHRoaXMuY2x1c3RlcnNbYzEuaW5kZXhdID0gbWVyZ2VkO1xuICAgICAgdGhpcy5jbHVzdGVycy5zcGxpY2UoYzIuaW5kZXgsIDEpO1xuICAgICAgdGhpcy5pbmRleFtjMS5rZXldID0gbWVyZ2VkO1xuXG4gICAgICAvLyB1cGRhdGUgZGlzdGFuY2VzIHdpdGggbmV3IG1lcmdlZCBjbHVzdGVyXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuY2x1c3RlcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgIHZhciBjaSA9IHRoaXMuY2x1c3RlcnNbaV07XG4gICAgICAgICB2YXIgZGlzdDtcbiAgICAgICAgIGlmIChjMS5rZXkgPT0gY2kua2V5KSB7XG4gICAgICAgICAgICBkaXN0ID0gSW5maW5pdHk7ICAgICAgICAgICAgXG4gICAgICAgICB9XG4gICAgICAgICBlbHNlIGlmICh0aGlzLmxpbmthZ2UgPT0gXCJzaW5nbGVcIikge1xuICAgICAgICAgICAgZGlzdCA9IHRoaXMuZGlzdHNbYzEua2V5XVtjaS5rZXldO1xuICAgICAgICAgICAgaWYgKHRoaXMuZGlzdHNbYzEua2V5XVtjaS5rZXldID4gdGhpcy5kaXN0c1tjMi5rZXldW2NpLmtleV0pIHtcbiAgICAgICAgICAgICAgIGRpc3QgPSB0aGlzLmRpc3RzW2MyLmtleV1bY2kua2V5XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgIH1cbiAgICAgICAgIGVsc2UgaWYgKHRoaXMubGlua2FnZSA9PSBcImNvbXBsZXRlXCIpIHtcbiAgICAgICAgICAgIGRpc3QgPSB0aGlzLmRpc3RzW2MxLmtleV1bY2kua2V5XTtcbiAgICAgICAgICAgIGlmICh0aGlzLmRpc3RzW2MxLmtleV1bY2kua2V5XSA8IHRoaXMuZGlzdHNbYzIua2V5XVtjaS5rZXldKSB7XG4gICAgICAgICAgICAgICBkaXN0ID0gdGhpcy5kaXN0c1tjMi5rZXldW2NpLmtleV07ICAgICAgICAgICAgICBcbiAgICAgICAgICAgIH1cbiAgICAgICAgIH1cbiAgICAgICAgIGVsc2UgaWYgKHRoaXMubGlua2FnZSA9PSBcImF2ZXJhZ2VcIikge1xuICAgICAgICAgICAgZGlzdCA9ICh0aGlzLmRpc3RzW2MxLmtleV1bY2kua2V5XSAqIGMxLnNpemVcbiAgICAgICAgICAgICAgICAgICArIHRoaXMuZGlzdHNbYzIua2V5XVtjaS5rZXldICogYzIuc2l6ZSkgLyAoYzEuc2l6ZSArIGMyLnNpemUpO1xuICAgICAgICAgfVxuICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBkaXN0ID0gdGhpcy5kaXN0YW5jZShjaS52YWx1ZSwgYzEudmFsdWUpOyAgICAgICAgICAgIFxuICAgICAgICAgfVxuXG4gICAgICAgICB0aGlzLmRpc3RzW2MxLmtleV1bY2kua2V5XSA9IHRoaXMuZGlzdHNbY2kua2V5XVtjMS5rZXldID0gZGlzdDtcbiAgICAgIH1cblxuICAgIFxuICAgICAgLy8gdXBkYXRlIGNhY2hlZCBtaW5zXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuY2x1c3RlcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgIHZhciBrZXkxID0gdGhpcy5jbHVzdGVyc1tpXS5rZXk7ICAgICAgICBcbiAgICAgICAgIGlmICh0aGlzLm1pbnNba2V5MV0gPT0gYzEua2V5IHx8IHRoaXMubWluc1trZXkxXSA9PSBjMi5rZXkpIHtcbiAgICAgICAgICAgIHZhciBtaW4gPSBrZXkxO1xuICAgICAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCB0aGlzLmNsdXN0ZXJzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICB2YXIga2V5MiA9IHRoaXMuY2x1c3RlcnNbal0ua2V5O1xuICAgICAgICAgICAgICAgaWYgKHRoaXMuZGlzdHNba2V5MV1ba2V5Ml0gPCB0aGlzLmRpc3RzW2tleTFdW21pbl0pIHtcbiAgICAgICAgICAgICAgICAgIG1pbiA9IGtleTI7ICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLm1pbnNba2V5MV0gPSBtaW47XG4gICAgICAgICB9XG4gICAgICAgICB0aGlzLmNsdXN0ZXJzW2ldLmluZGV4ID0gaTtcbiAgICAgIH1cbiAgICBcbiAgICAgIC8vIGNsZWFuIHVwIG1ldGFkYXRhIHVzZWQgZm9yIGNsdXN0ZXJpbmdcbiAgICAgIGRlbGV0ZSBjMS5rZXk7IGRlbGV0ZSBjMi5rZXk7XG4gICAgICBkZWxldGUgYzEuaW5kZXg7IGRlbGV0ZSBjMi5pbmRleDtcblxuICAgICAgcmV0dXJuIHRydWU7XG4gICB9XG59XG5cbnZhciBoY2x1c3RlciA9IGZ1bmN0aW9uKGl0ZW1zLCBkaXN0YW5jZSwgbGlua2FnZSwgdGhyZXNob2xkLCBzbmFwc2hvdCwgc25hcHNob3RDYWxsYmFjaykge1xuICAgZGlzdGFuY2UgPSBkaXN0YW5jZSB8fCBcImV1Y2xpZGVhblwiO1xuICAgbGlua2FnZSA9IGxpbmthZ2UgfHwgXCJhdmVyYWdlXCI7XG5cbiAgIGlmICh0eXBlb2YgZGlzdGFuY2UgPT0gXCJzdHJpbmdcIikge1xuICAgICBkaXN0YW5jZSA9IGRpc3RhbmNlc1tkaXN0YW5jZV07XG4gICB9XG4gICB2YXIgY2x1c3RlcnMgPSAobmV3IEhpZXJhcmNoaWNhbENsdXN0ZXJpbmcoZGlzdGFuY2UsIGxpbmthZ2UsIHRocmVzaG9sZCkpXG4gICAgICAgICAgICAgICAgICAuY2x1c3RlcihpdGVtcywgc25hcHNob3QsIHNuYXBzaG90Q2FsbGJhY2spO1xuICAgICAgXG4gICBpZiAodGhyZXNob2xkID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBjbHVzdGVyc1swXTsgLy8gYWxsIGNsdXN0ZXJlZCBpbnRvIG9uZVxuICAgfVxuICAgcmV0dXJuIGNsdXN0ZXJzO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGhjbHVzdGVyO1xuIiwidmFyIGRpc3RhbmNlcyA9IHJlcXVpcmUoXCIuL2Rpc3RhbmNlXCIpO1xuXG5mdW5jdGlvbiBLTWVhbnMoY2VudHJvaWRzKSB7XG4gICB0aGlzLmNlbnRyb2lkcyA9IGNlbnRyb2lkcyB8fCBbXTtcbn1cblxuS01lYW5zLnByb3RvdHlwZS5yYW5kb21DZW50cm9pZHMgPSBmdW5jdGlvbihwb2ludHMsIGspIHtcbiAgIHZhciBjZW50cm9pZHMgPSBwb2ludHMuc2xpY2UoMCk7IC8vIGNvcHlcbiAgIGNlbnRyb2lkcy5zb3J0KGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIChNYXRoLnJvdW5kKE1hdGgucmFuZG9tKCkpIC0gMC41KTtcbiAgIH0pO1xuICAgcmV0dXJuIGNlbnRyb2lkcy5zbGljZSgwLCBrKTtcbn1cblxuS01lYW5zLnByb3RvdHlwZS5jbGFzc2lmeSA9IGZ1bmN0aW9uKHBvaW50LCBkaXN0YW5jZSkge1xuICAgdmFyIG1pbiA9IEluZmluaXR5LFxuICAgICAgIGluZGV4ID0gMDtcblxuICAgZGlzdGFuY2UgPSBkaXN0YW5jZSB8fCBcImV1Y2xpZGVhblwiO1xuICAgaWYgKHR5cGVvZiBkaXN0YW5jZSA9PSBcInN0cmluZ1wiKSB7XG4gICAgICBkaXN0YW5jZSA9IGRpc3RhbmNlc1tkaXN0YW5jZV07XG4gICB9XG5cbiAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5jZW50cm9pZHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBkaXN0ID0gZGlzdGFuY2UocG9pbnQsIHRoaXMuY2VudHJvaWRzW2ldKTtcbiAgICAgIGlmIChkaXN0IDwgbWluKSB7XG4gICAgICAgICBtaW4gPSBkaXN0O1xuICAgICAgICAgaW5kZXggPSBpO1xuICAgICAgfVxuICAgfVxuXG4gICByZXR1cm4gaW5kZXg7XG59XG5cbktNZWFucy5wcm90b3R5cGUuY2x1c3RlciA9IGZ1bmN0aW9uKHBvaW50cywgaywgZGlzdGFuY2UsIHNuYXBzaG90UGVyaW9kLCBzbmFwc2hvdENiKSB7XG4gICBrID0gayB8fCBNYXRoLm1heCgyLCBNYXRoLmNlaWwoTWF0aC5zcXJ0KHBvaW50cy5sZW5ndGggLyAyKSkpO1xuXG4gICBkaXN0YW5jZSA9IGRpc3RhbmNlIHx8IFwiZXVjbGlkZWFuXCI7XG4gICBpZiAodHlwZW9mIGRpc3RhbmNlID09IFwic3RyaW5nXCIpIHtcbiAgICAgIGRpc3RhbmNlID0gZGlzdGFuY2VzW2Rpc3RhbmNlXTtcbiAgIH1cblxuICAgdGhpcy5jZW50cm9pZHMgPSB0aGlzLnJhbmRvbUNlbnRyb2lkcyhwb2ludHMsIGspO1xuXG4gICB2YXIgYXNzaWdubWVudCA9IG5ldyBBcnJheShwb2ludHMubGVuZ3RoKTtcbiAgIHZhciBjbHVzdGVycyA9IG5ldyBBcnJheShrKTtcblxuICAgdmFyIGl0ZXJhdGlvbnMgPSAwO1xuICAgdmFyIG1vdmVtZW50ID0gdHJ1ZTtcbiAgIHdoaWxlIChtb3ZlbWVudCkge1xuICAgICAgLy8gdXBkYXRlIHBvaW50LXRvLWNlbnRyb2lkIGFzc2lnbm1lbnRzXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBvaW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgYXNzaWdubWVudFtpXSA9IHRoaXMuY2xhc3NpZnkocG9pbnRzW2ldLCBkaXN0YW5jZSk7XG4gICAgICB9XG5cbiAgICAgIC8vIHVwZGF0ZSBsb2NhdGlvbiBvZiBlYWNoIGNlbnRyb2lkXG4gICAgICBtb3ZlbWVudCA9IGZhbHNlO1xuICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBrOyBqKyspIHtcbiAgICAgICAgIHZhciBhc3NpZ25lZCA9IFtdO1xuICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhc3NpZ25tZW50Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAoYXNzaWdubWVudFtpXSA9PSBqKSB7XG4gICAgICAgICAgICAgICBhc3NpZ25lZC5wdXNoKHBvaW50c1tpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICB9XG5cbiAgICAgICAgIGlmICghYXNzaWduZWQubGVuZ3RoKSB7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgIH1cblxuICAgICAgICAgdmFyIGNlbnRyb2lkID0gdGhpcy5jZW50cm9pZHNbal07XG4gICAgICAgICB2YXIgbmV3Q2VudHJvaWQgPSBuZXcgQXJyYXkoY2VudHJvaWQubGVuZ3RoKTtcblxuICAgICAgICAgZm9yICh2YXIgZyA9IDA7IGcgPCBjZW50cm9pZC5sZW5ndGg7IGcrKykge1xuICAgICAgICAgICAgdmFyIHN1bSA9IDA7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFzc2lnbmVkLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICBzdW0gKz0gYXNzaWduZWRbaV1bZ107XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBuZXdDZW50cm9pZFtnXSA9IHN1bSAvIGFzc2lnbmVkLmxlbmd0aDtcblxuICAgICAgICAgICAgaWYgKG5ld0NlbnRyb2lkW2ddICE9IGNlbnRyb2lkW2ddKSB7XG4gICAgICAgICAgICAgICBtb3ZlbWVudCA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICB9XG5cbiAgICAgICAgIHRoaXMuY2VudHJvaWRzW2pdID0gbmV3Q2VudHJvaWQ7XG4gICAgICAgICBjbHVzdGVyc1tqXSA9IGFzc2lnbmVkO1xuICAgICAgfVxuXG4gICAgICBpZiAoc25hcHNob3RDYiAmJiAoaXRlcmF0aW9ucysrICUgc25hcHNob3RQZXJpb2QgPT0gMCkpIHtcbiAgICAgICAgIHNuYXBzaG90Q2IoY2x1c3RlcnMpO1xuICAgICAgfVxuICAgfVxuXG4gICByZXR1cm4gY2x1c3RlcnM7XG59XG5cbktNZWFucy5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24oKSB7XG4gICByZXR1cm4gSlNPTi5zdHJpbmdpZnkodGhpcy5jZW50cm9pZHMpO1xufVxuXG5LTWVhbnMucHJvdG90eXBlLmZyb21KU09OID0gZnVuY3Rpb24oanNvbikge1xuICAgdGhpcy5jZW50cm9pZHMgPSBKU09OLnBhcnNlKGpzb24pO1xuICAgcmV0dXJuIHRoaXM7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gS01lYW5zO1xuXG5tb2R1bGUuZXhwb3J0cy5rbWVhbnMgPSBmdW5jdGlvbih2ZWN0b3JzLCBrKSB7XG4gICByZXR1cm4gKG5ldyBLTWVhbnMoKSkuY2x1c3Rlcih2ZWN0b3JzLCBrKTtcbn0iLCJcInVzZSBzdHJpY3RcIjtcblxubW9kdWxlLmV4cG9ydHMgPSBjbHVzdGVyO1xuXG52YXIgdmwgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvd1sndmwnXSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWxbJ3ZsJ10gOiBudWxsKSxcbiAgY2x1c3RlcmZjayA9IHJlcXVpcmUoJ2NsdXN0ZXJmY2snKSxcbiAgY29uc3RzID0gcmVxdWlyZSgnLi9jbHVzdGVyY29uc3RzJyksXG4gIHV0aWwgPSByZXF1aXJlKCcuLi91dGlsJyk7XG5cbmNsdXN0ZXIuZGlzdGFuY2UgPSByZXF1aXJlKCcuL2Rpc3RhbmNlJyk7XG5cbmZ1bmN0aW9uIGNsdXN0ZXIoZW5jb2RpbmdzLCBvcHQpIHtcbiAgLy8ganNoaW50IHVudXNlZDpmYWxzZVxuICB2YXIgZGlzdCA9IGNsdXN0ZXIuZGlzdGFuY2UudGFibGUoZW5jb2RpbmdzKTtcblxuICB2YXIgY2x1c3RlclRyZWVzID0gY2x1c3RlcmZjay5oY2x1c3RlcihlbmNvZGluZ3MsIGZ1bmN0aW9uKGUxLCBlMikge1xuICAgIHZhciBzMSA9IHZsLkVuY29kaW5nLnNob3J0aGFuZChlMSksXG4gICAgICBzMiA9IHZsLkVuY29kaW5nLnNob3J0aGFuZChlMik7XG4gICAgcmV0dXJuIGRpc3RbczFdW3MyXTtcbiAgfSwgJ2F2ZXJhZ2UnLCBjb25zdHMuQ0xVU1RFUl9USFJFU0hPTEQpO1xuXG4gIHZhciBjbHVzdGVycyA9IGNsdXN0ZXJUcmVlcy5tYXAoZnVuY3Rpb24odHJlZSkge1xuICAgICAgcmV0dXJuIHV0aWwudHJhdmVyc2UodHJlZSwgW10pO1xuICAgIH0pXG4gICAubWFwKGZ1bmN0aW9uKGNsdXN0ZXIpIHtcbiAgICByZXR1cm4gY2x1c3Rlci5zb3J0KGZ1bmN0aW9uKGVuY29kaW5nMSwgZW5jb2RpbmcyKSB7XG4gICAgICAvLyBzb3J0IGVhY2ggY2x1c3RlciAtLSBoYXZlIHRoZSBoaWdoZXN0IHNjb3JlIGFzIDFzdCBpdGVtXG4gICAgICByZXR1cm4gZW5jb2RpbmcyLl9pbmZvLnNjb3JlIC0gZW5jb2RpbmcxLl9pbmZvLnNjb3JlO1xuICAgIH0pO1xuICB9KS5maWx0ZXIoZnVuY3Rpb24oY2x1c3RlcikgeyAgLy8gZmlsdGVyIGVtcHR5IGNsdXN0ZXJcbiAgICByZXR1cm4gY2x1c3Rlci5sZW5ndGggPjA7XG4gIH0pLnNvcnQoZnVuY3Rpb24oY2x1c3RlcjEsIGNsdXN0ZXIyKSB7XG4gICAgLy9zb3J0IGJ5IGhpZ2hlc3Qgc2NvcmluZyBpdGVtIGluIGVhY2ggY2x1c3RlclxuICAgIHJldHVybiBjbHVzdGVyMlswXS5faW5mby5zY29yZSAtIGNsdXN0ZXIxWzBdLl9pbmZvLnNjb3JlO1xuICB9KTtcblxuICBjbHVzdGVycy5kaXN0ID0gZGlzdDsgLy9hcHBlbmQgZGlzdCBpbiB0aGUgYXJyYXkgZm9yIGRlYnVnZ2luZ1xuXG4gIHJldHVybiBjbHVzdGVycztcbn0iLCIndXNlIHN0cmljdCc7XG5cbnZhciBjID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxuYy5TV0FQUEFCTEUgPSAwLjA1O1xuYy5ESVNUX01JU1NJTkcgPSAxO1xuYy5DTFVTVEVSX1RIUkVTSE9MRCA9IDE7XG5cbmZ1bmN0aW9uIHJlZHVjZVR1cGxlVG9UYWJsZShyLCB4KSB7XG4gIHZhciBhID0geFswXSwgYiA9IHhbMV0sIGQgPSB4WzJdO1xuICByW2FdID0gclthXSB8fCB7fTtcbiAgcltiXSA9IHJbYl0gfHwge307XG4gIHJbYV1bYl0gPSByW2JdW2FdID0gZDtcbiAgcmV0dXJuIHI7XG59XG5cbmMuRElTVF9CWV9FTkNUWVBFID0gW1xuICAvLyBwb3NpdGlvbmFsXG4gIFsneCcsICd5JywgYy5TV0FQUEFCTEVdLFxuICBbJ3JvdycsICdjb2wnLCBjLlNXQVBQQUJMRV0sXG5cbiAgLy8gb3JkaW5hbCBtYXJrIHByb3BlcnRpZXNcbiAgWydjb2xvcicsICdzaGFwZScsIGMuU1dBUFBBQkxFXSxcbiAgWydjb2xvcicsICdkZXRhaWwnLCBjLlNXQVBQQUJMRV0sXG4gIFsnZGV0YWlsJywgJ3NoYXBlJywgYy5TV0FQUEFCTEVdLFxuXG4gIC8vIHF1YW50aXRhdGl2ZSBtYXJrIHByb3BlcnRpZXNcbiAgWydzaXplJywgJ2NvbG9yJywgYy5TV0FQUEFCTEVdXG5dLnJlZHVjZShyZWR1Y2VUdXBsZVRvVGFibGUsIHt9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHZsID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3dbJ3ZsJ10gOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsWyd2bCddIDogbnVsbCksXG4gIGNvbnN0cyA9IHJlcXVpcmUoJy4vY2x1c3RlcmNvbnN0cycpLFxuICB1dGlsID0gcmVxdWlyZSgnLi4vdXRpbCcpO1xuXG52YXIgZGlzdGFuY2UgPSB7fTtcbm1vZHVsZS5leHBvcnRzID0gZGlzdGFuY2U7XG5cbmRpc3RhbmNlLnRhYmxlID0gZnVuY3Rpb24gKGVuY29kaW5ncykge1xuICB2YXIgbGVuID0gZW5jb2RpbmdzLmxlbmd0aCxcbiAgICBjb2xlbmNzID0gZW5jb2RpbmdzLm1hcChmdW5jdGlvbihlKSB7IHJldHVybiBkaXN0YW5jZS5nZXRFbmNUeXBlQnlDb2x1bW5OYW1lKGUpOyB9KSxcbiAgICBzaG9ydGhhbmRzID0gZW5jb2RpbmdzLm1hcCh2bC5FbmNvZGluZy5zaG9ydGhhbmQpLFxuICAgIGRpZmYgPSB7fSwgaSwgajtcblxuICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpKyspIGRpZmZbc2hvcnRoYW5kc1tpXV0gPSB7fTtcblxuICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICBmb3IgKGogPSBpICsgMTsgaiA8IGxlbjsgaisrKSB7XG4gICAgICB2YXIgc2ogPSBzaG9ydGhhbmRzW2pdLCBzaSA9IHNob3J0aGFuZHNbaV07XG5cbiAgICAgIGRpZmZbc2pdW3NpXSA9IGRpZmZbc2ldW3NqXSA9IGRpc3RhbmNlLmdldChjb2xlbmNzW2ldLCBjb2xlbmNzW2pdKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGRpZmY7XG59O1xuXG5kaXN0YW5jZS5nZXQgPSBmdW5jdGlvbiAoY29sZW5jMSwgY29sZW5jMikge1xuICB2YXIgY29scyA9IHV0aWwudW5pb24odmwua2V5cyhjb2xlbmMxLmNvbCksIHZsLmtleXMoY29sZW5jMi5jb2wpKSxcbiAgICBkaXN0ID0gMDtcblxuICBjb2xzLmZvckVhY2goZnVuY3Rpb24oY29sKSB7XG4gICAgdmFyIGUxID0gY29sZW5jMS5jb2xbY29sXSwgZTIgPSBjb2xlbmMyLmNvbFtjb2xdO1xuXG4gICAgaWYgKGUxICYmIGUyKSB7XG4gICAgICBpZiAoZTEuZW5jVHlwZSAhPSBlMi5lbmNUeXBlKSB7XG4gICAgICAgIGRpc3QgKz0gKGNvbnN0cy5ESVNUX0JZX0VOQ1RZUEVbZTEuZW5jVHlwZV0gfHwge30pW2UyLmVuY1R5cGVdIHx8IDE7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGRpc3QgKz0gY29uc3RzLkRJU1RfTUlTU0lORztcbiAgICB9XG4gIH0pO1xuXG4gIC8vIGRvIG5vdCBncm91cCBzdGFja2VkIGNoYXJ0IHdpdGggc2ltaWxhciBub24tc3RhY2tlZCBjaGFydCFcbiAgdmFyIGlzU3RhY2sxID0gdmwuRW5jb2RpbmcuaXNTdGFjayhjb2xlbmMxKSxcbiAgICBpc1N0YWNrMiA9IHZsLkVuY29kaW5nLmlzU3RhY2soY29sZW5jMik7XG5cbiAgaWYoaXNTdGFjazEgfHwgaXNTdGFjazIpIHtcbiAgICBpZihpc1N0YWNrMSAmJiBpc1N0YWNrMikge1xuICAgICAgaWYoY29sZW5jMS5lbmNvZGluZy5jb2xvci5uYW1lICE9PSBjb2xlbmMyLmVuY29kaW5nLmNvbG9yLm5hbWUpIHtcbiAgICAgICAgZGlzdCs9MTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgZGlzdCs9MTsgLy8gc3VyZWx5IGRpZmZlcmVudFxuICAgIH1cbiAgfVxuICByZXR1cm4gZGlzdDtcbn07XG5cbi8vIGdldCBlbmNvZGluZyB0eXBlIGJ5IGZpZWxkbmFtZVxuZGlzdGFuY2UuZ2V0RW5jVHlwZUJ5Q29sdW1uTmFtZSA9IGZ1bmN0aW9uKGVuY29kaW5nKSB7XG4gIHZhciBfY29sZW5jID0ge30sXG4gICAgZW5jID0gZW5jb2RpbmcuZW5jb2Rpbmc7XG5cbiAgdmwua2V5cyhlbmMpLmZvckVhY2goZnVuY3Rpb24oZW5jVHlwZSkge1xuICAgIHZhciBlID0gdmwuZHVwbGljYXRlKGVuY1tlbmNUeXBlXSk7XG4gICAgZS5lbmNUeXBlID0gZW5jVHlwZTtcbiAgICBfY29sZW5jW2UubmFtZSB8fCAnJ10gPSBlO1xuICAgIGRlbGV0ZSBlLm5hbWU7XG4gIH0pO1xuXG4gIHJldHVybiB7XG4gICAgbWFya3R5cGU6IGVuY29kaW5nLm1hcmt0eXBlLFxuICAgIGNvbDogX2NvbGVuYyxcbiAgICBlbmNvZGluZzogZW5jb2RpbmcuZW5jb2RpbmdcbiAgfTtcbn07IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgY29uc3RzID0gbW9kdWxlLmV4cG9ydHMgPSB7XG4gIGdlbjoge30sXG4gIGNsdXN0ZXI6IHt9LFxuICByYW5rOiB7fVxufTtcblxuY29uc3RzLmdlbi5wcm9qZWN0aW9ucyA9IHtcbiAgdHlwZTogJ29iamVjdCcsXG4gIHByb3BlcnRpZXM6IHtcbiAgICBvbWl0RG90UGxvdDogeyAvL0ZJWE1FIHJlbW92ZSB0aGlzIVxuICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgZGVmYXVsdDogZmFsc2UsXG4gICAgICBkZXNjcmlwdGlvbjogJ3JlbW92ZSBhbGwgZG90IHBsb3RzJ1xuICAgIH0sXG4gICAgbWF4Q2FyZGluYWxpdHlGb3JBdXRvQWRkT3JkaW5hbDoge1xuICAgICAgdHlwZTogJ2ludGVnZXInLFxuICAgICAgZGVmYXVsdDogNTAsXG4gICAgICBkZXNjcmlwdGlvbjogJ21heCBjYXJkaW5hbGl0eSBmb3Igb3JkaW5hbCBmaWVsZCB0byBiZSBjb25zaWRlcmVkIGZvciBhdXRvIGFkZGluZydcbiAgICB9LFxuICAgIGFsd2F5c0FkZEhpc3RvZ3JhbToge1xuICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgZGVmYXVsdDogdHJ1ZVxuICAgIH1cbiAgfVxufTtcblxuY29uc3RzLmdlbi5hZ2dyZWdhdGVzID0ge1xuICB0eXBlOiAnb2JqZWN0JyxcbiAgcHJvcGVydGllczoge1xuICAgIGNvbmZpZzoge1xuICAgICAgdHlwZTogJ29iamVjdCdcbiAgICB9LFxuICAgIGRhdGE6IHtcbiAgICAgIHR5cGU6ICdvYmplY3QnXG4gICAgfSxcbiAgICB0YWJsZVR5cGVzOiB7XG4gICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICBkZWZhdWx0OiAnYm90aCcsXG4gICAgICBlbnVtOiBbJ2JvdGgnLCAnYWdncmVnYXRlZCcsICdkaXNhZ2dyZWdhdGVkJ11cbiAgICB9LFxuICAgIGdlbkRpbVE6IHtcbiAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgZGVmYXVsdDogJ2F1dG8nLFxuICAgICAgZW51bTogWydhdXRvJywgJ2JpbicsICdjYXN0JywgJ25vbmUnXSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnVXNlIFEgYXMgRGltZW5zaW9uIGVpdGhlciBieSBiaW5uaW5nIG9yIGNhc3RpbmcnXG4gICAgfSxcbiAgICBtaW5DYXJkaW5hbGl0eUZvckJpbjoge1xuICAgICAgdHlwZTogJ2ludGVnZXInLFxuICAgICAgZGVmYXVsdDogMjAsXG4gICAgICBkZXNjcmlwdGlvbjogJ21pbmltdW0gY2FyZGluYWxpdHkgb2YgYSBmaWVsZCBpZiB3ZSB3ZXJlIHRvIGJpbidcbiAgICB9LFxuICAgIG9taXREb3RQbG90OiB7XG4gICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICBkZWZhdWx0OiBmYWxzZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAncmVtb3ZlIGFsbCBkb3QgcGxvdHMnXG4gICAgfSxcbiAgICBvbWl0TWVhc3VyZU9ubHk6IHtcbiAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgICAgZGVzY3JpcHRpb246ICdPbWl0IGFnZ3JlZ2F0aW9uIHdpdGggbWVhc3VyZShzKSBvbmx5J1xuICAgIH0sXG4gICAgb21pdERpbWVuc2lvbk9ubHk6IHtcbiAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgIGRlZmF1bHQ6IHRydWUsXG4gICAgICBkZXNjcmlwdGlvbjogJ09taXQgYWdncmVnYXRpb24gd2l0aCBkaW1lbnNpb24ocykgb25seSdcbiAgICB9LFxuICAgIGFkZENvdW50Rm9yRGltZW5zaW9uT25seToge1xuICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgZGVmYXVsdDogdHJ1ZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQWRkIGNvdW50IHdoZW4gdGhlcmUgYXJlIGRpbWVuc2lvbihzKSBvbmx5J1xuICAgIH0sXG4gICAgYWdnckxpc3Q6IHtcbiAgICAgIHR5cGU6ICdhcnJheScsXG4gICAgICBpdGVtczoge1xuICAgICAgICB0eXBlOiBbJ3N0cmluZyddXG4gICAgICB9LFxuICAgICAgZGVmYXVsdDogW3VuZGVmaW5lZCwgJ2F2ZyddXG4gICAgfSxcbiAgICB0aW1lVW5pdExpc3Q6IHtcbiAgICAgIHR5cGU6ICdhcnJheScsXG4gICAgICBpdGVtczoge1xuICAgICAgICB0eXBlOiBbJ3N0cmluZyddXG4gICAgICB9LFxuICAgICAgZGVmYXVsdDogWyd5ZWFyJ11cbiAgICB9LFxuICAgIGNvbnNpc3RlbnRBdXRvUToge1xuICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgZGVmYXVsdDogdHJ1ZSxcbiAgICAgIGRlc2NyaXB0aW9uOiBcImdlbmVyYXRlIHNpbWlsYXIgYXV0byB0cmFuc2Zvcm0gZm9yIHF1YW50XCJcbiAgICB9XG4gIH1cbn07XG5cbmNvbnN0cy5nZW4uZW5jb2RpbmdzID0ge1xuICB0eXBlOiAnb2JqZWN0JyxcbiAgcHJvcGVydGllczoge1xuICAgIG1hcmt0eXBlTGlzdDoge1xuICAgICAgdHlwZTogJ2FycmF5JyxcbiAgICAgIGl0ZW1zOiB7dHlwZTogJ3N0cmluZyd9LFxuICAgICAgZGVmYXVsdDogWydwb2ludCcsICdiYXInLCAnbGluZScsICdhcmVhJywgJ3RleHQnLCAndGljayddLCAvL2ZpbGxlZF9tYXBcbiAgICAgIGRlc2NyaXB0aW9uOiAnYWxsb3dlZCBtYXJrdHlwZXMnXG4gICAgfSxcbiAgICBlbmNvZGluZ1R5cGVMaXN0OiB7XG4gICAgICB0eXBlOiAnYXJyYXknLFxuICAgICAgaXRlbXM6IHt0eXBlOiAnc3RyaW5nJ30sXG4gICAgICBkZWZhdWx0OiBbJ3gnLCAneScsICdyb3cnLCAnY29sJywgJ3NpemUnLCAnY29sb3InLCAndGV4dCcsICdkZXRhaWwnXSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnYWxsb3dlZCBlbmNvZGluZyB0eXBlcydcbiAgICB9LFxuICAgIG1heEdvb2RDYXJkaW5hbGl0eUZvckZhY2V0czoge1xuICAgICAgdHlwZTogJ2ludGVnZXInLFxuICAgICAgZGVmYXVsdDogNSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnbWF4aW11bSBjYXJkaW5hbGl0eSBvZiBhIGZpZWxkIHRvIGJlIHB1dCBvbiBmYWNldCAocm93L2NvbCkgZWZmZWN0aXZlbHknXG4gICAgfSxcbiAgICBtYXhDYXJkaW5hbGl0eUZvckZhY2V0czoge1xuICAgICAgdHlwZTogJ2ludGVnZXInLFxuICAgICAgZGVmYXVsdDogMjAsXG4gICAgICBkZXNjcmlwdGlvbjogJ21heGltdW0gY2FyZGluYWxpdHkgb2YgYSBmaWVsZCB0byBiZSBwdXQgb24gZmFjZXQgKHJvdy9jb2wpJ1xuICAgIH0sXG4gICAgbWF4R29vZENhcmRpbmFsaXR5Rm9yQ29sb3I6IHtcbiAgICAgIHR5cGU6ICdpbnRlZ2VyJyxcbiAgICAgIGRlZmF1bHQ6IDcsXG4gICAgICBkZXNjcmlwdGlvbjogJ21heGltdW0gY2FyZGluYWxpdHkgb2YgYW4gb3JkaW5hbCBmaWVsZCB0byBiZSBwdXQgb24gY29sb3IgZWZmZWN0aXZlbHknXG4gICAgfSxcbiAgICBtYXhDYXJkaW5hbGl0eUZvckNvbG9yOiB7XG4gICAgICB0eXBlOiAnaW50ZWdlcicsXG4gICAgICBkZWZhdWx0OiAyMCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnbWF4aW11bSBjYXJkaW5hbGl0eSBvZiBhbiBvcmRpbmFsIGZpZWxkIHRvIGJlIHB1dCBvbiBjb2xvcidcbiAgICB9LFxuICAgIG1heENhcmRpbmFsaXR5Rm9yU2hhcGU6IHtcbiAgICAgIHR5cGU6ICdpbnRlZ2VyJyxcbiAgICAgIGRlZmF1bHQ6IDYsXG4gICAgICBkZXNjcmlwdGlvbjogJ21heGltdW0gY2FyZGluYWxpdHkgb2YgYW4gb3JkaW5hbCBmaWVsZCB0byBiZSBwdXQgb24gc2hhcGUnXG4gICAgfSxcbiAgICBvbWl0VHJhbnBvc2U6ICB7XG4gICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICBkZWZhdWx0OiB0cnVlLFxuICAgICAgZGVzY3JpcHRpb246ICdFbGltaW5hdGUgYWxsIHRyYW5zcG9zZSBieSAoMSkga2VlcGluZyBob3Jpem9udGFsIGRvdCBwbG90IG9ubHkgKDIpIGZvciBPeFEgY2hhcnRzLCBhbHdheXMgcHV0IE8gb24gWSAoMykgc2hvdyBvbmx5IG9uZSBEeEQsIE14TSAoY3VycmVudGx5IHNvcnRlZCBieSBuYW1lKSdcbiAgICB9LFxuICAgIG9taXREb3RQbG90OiB7XG4gICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICBkZWZhdWx0OiBmYWxzZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAncmVtb3ZlIGFsbCBkb3QgcGxvdHMnXG4gICAgfSxcbiAgICBvbWl0RG90UGxvdFdpdGhFeHRyYUVuY29kaW5nOiB7XG4gICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICBkZWZhdWx0OiB0cnVlLFxuICAgICAgZGVzY3JpcHRpb246ICdyZW1vdmUgYWxsIGRvdCBwbG90cyB3aXRoID4xIGVuY29kaW5nJ1xuICAgIH0sXG4gICAgb21pdE11bHRpcGxlUmV0aW5hbEVuY29kaW5nczoge1xuICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgZGVmYXVsdDogdHJ1ZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnb21pdCB1c2luZyBtdWx0aXBsZSByZXRpbmFsIHZhcmlhYmxlcyAoc2l6ZSwgY29sb3IsIHNoYXBlKSdcbiAgICB9LFxuICAgIG9taXROb25UZXh0QWdncldpdGhBbGxEaW1zT25GYWNldHM6IHtcbiAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgIGRlZmF1bHQ6IHRydWUsXG4gICAgICBkZXNjcmlwdGlvbjogJ3JlbW92ZSBhbGwgYWdncmVnYXRlZCBjaGFydHMgKGV4Y2VwdCB0ZXh0IHRhYmxlcykgd2l0aCBhbGwgZGltcyBvbiBmYWNldHMgKHJvdywgY29sKSdcbiAgICB9LFxuICAgIG9taXRPbmVEaW1lbnNpb25Db3VudDoge1xuICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgZGVmYXVsdDogZmFsc2UsXG4gICAgICBkZXNjcmlwdGlvbjogJ29taXQgb25lIGRpbWVuc2lvbiBjb3VudCdcbiAgICB9LFxuICAgIG9taXRTaXplT25CYXI6IHtcbiAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgICAgZGVzY3JpcHRpb246ICdkbyBub3QgdXNlIGJhclxcJ3Mgc2l6ZSdcbiAgICB9LFxuICAgIG9taXRTdGFja2VkQXZlcmFnZToge1xuICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgZGVmYXVsdDogdHJ1ZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnZG8gbm90IHN0YWNrIGJhciBjaGFydCB3aXRoIGF2ZXJhZ2UnXG4gICAgfSxcbiAgICBhbHdheXNHZW5lcmF0ZVRhYmxlQXNIZWF0bWFwOiB7XG4gICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICBkZWZhdWx0OiB0cnVlXG4gICAgfVxuICB9XG59O1xuXG5cblxuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gIGNvbnN0czogcmVxdWlyZSgnLi9jb25zdHMnKSxcbiAgY2x1c3RlcjogcmVxdWlyZSgnLi9jbHVzdGVyL2NsdXN0ZXInKSxcbiAgZ2VuOiByZXF1aXJlKCcuL2dlbi9nZW4nKSxcbiAgcmFuazogcmVxdWlyZSgnLi9yYW5rL3JhbmsnKSxcbiAgdXRpbDogcmVxdWlyZSgnLi91dGlsJyksXG4gIGF1dG86IFwiLSwgc3VtXCJcbn07XG5cblxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgdmwgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvd1sndmwnXSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWxbJ3ZsJ10gOiBudWxsKTtcblxudmFyIGNvbnN0cyA9IHJlcXVpcmUoJy4uL2NvbnN0cycpO1xuXG52YXIgQVVUTz0nKic7XG5cbm1vZHVsZS5leHBvcnRzID0gZ2VuQWdncmVnYXRlcztcblxuZnVuY3Rpb24gZ2VuQWdncmVnYXRlcyhvdXRwdXQsIGZpZWxkcywgc3RhdHMsIG9wdCkge1xuICBvcHQgPSB2bC5zY2hlbWEudXRpbC5leHRlbmQob3B0fHx7fSwgY29uc3RzLmdlbi5hZ2dyZWdhdGVzKTtcbiAgdmFyIHRmID0gbmV3IEFycmF5KGZpZWxkcy5sZW5ndGgpO1xuICB2YXIgaGFzTm9yTyA9IHZsLmFueShmaWVsZHMsIGZ1bmN0aW9uKGYpIHtcbiAgICByZXR1cm4gdmwuZmllbGQuaXNUeXBlcyhmLCBbTiwgT10pO1xuICB9KTtcblxuICBmdW5jdGlvbiBlbWl0KGZpZWxkU2V0KSB7XG4gICAgZmllbGRTZXQgPSB2bC5kdXBsaWNhdGUoZmllbGRTZXQpO1xuICAgIGZpZWxkU2V0LmtleSA9IHZsLmZpZWxkLnNob3J0aGFuZHMoZmllbGRTZXQpO1xuICAgIG91dHB1dC5wdXNoKGZpZWxkU2V0KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNoZWNrQW5kUHVzaCgpIHtcbiAgICBpZiAob3B0Lm9taXRNZWFzdXJlT25seSB8fCBvcHQub21pdERpbWVuc2lvbk9ubHkpIHtcbiAgICAgIHZhciBoYXNNZWFzdXJlID0gZmFsc2UsIGhhc0RpbWVuc2lvbiA9IGZhbHNlLCBoYXNSYXcgPSBmYWxzZTtcbiAgICAgIHRmLmZvckVhY2goZnVuY3Rpb24oZikge1xuICAgICAgICBpZiAodmwuZmllbGQuaXNEaW1lbnNpb24oZikpIHtcbiAgICAgICAgICBoYXNEaW1lbnNpb24gPSB0cnVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGhhc01lYXN1cmUgPSB0cnVlO1xuICAgICAgICAgIGlmICghZi5hZ2dyZWdhdGUpIGhhc1JhdyA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgaWYgKCFoYXNEaW1lbnNpb24gJiYgIWhhc1JhdyAmJiBvcHQub21pdE1lYXN1cmVPbmx5KSByZXR1cm47XG4gICAgICBpZiAoIWhhc01lYXN1cmUpIHtcbiAgICAgICAgaWYgKG9wdC5hZGRDb3VudEZvckRpbWVuc2lvbk9ubHkpIHtcbiAgICAgICAgICB0Zi5wdXNoKHZsLmZpZWxkLmNvdW50KCkpO1xuICAgICAgICAgIGVtaXQodGYpO1xuICAgICAgICAgIHRmLnBvcCgpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChvcHQub21pdERpbWVuc2lvbk9ubHkpIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKG9wdC5vbWl0RG90UGxvdCAmJiB0Zi5sZW5ndGggPT09IDEpIHJldHVybjtcbiAgICBlbWl0KHRmKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGFzc2lnbkFnZ3JRKGksIGhhc0FnZ3IsIGF1dG9Nb2RlLCBhKSB7XG4gICAgdmFyIGNhbkhhdmVBZ2dyID0gaGFzQWdnciA9PT0gdHJ1ZSB8fCBoYXNBZ2dyID09PSBudWxsLFxuICAgICAgY2FudEhhdmVBZ2dyID0gaGFzQWdnciA9PT0gZmFsc2UgfHwgaGFzQWdnciA9PT0gbnVsbDtcbiAgICBpZiAoYSkge1xuICAgICAgaWYgKGNhbkhhdmVBZ2dyKSB7XG4gICAgICAgIHRmW2ldLmFnZ3JlZ2F0ZSA9IGE7XG4gICAgICAgIGFzc2lnbkZpZWxkKGkgKyAxLCB0cnVlLCBhdXRvTW9kZSk7XG4gICAgICAgIGRlbGV0ZSB0ZltpXS5hZ2dyZWdhdGU7XG4gICAgICB9XG4gICAgfSBlbHNlIHsgLy8gaWYoYSA9PT0gdW5kZWZpbmVkKVxuICAgICAgaWYgKGNhbnRIYXZlQWdncikge1xuICAgICAgICBhc3NpZ25GaWVsZChpICsgMSwgZmFsc2UsIGF1dG9Nb2RlKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBhc3NpZ25CaW5RKGksIGhhc0FnZ3IsIGF1dG9Nb2RlKSB7XG4gICAgdGZbaV0uYmluID0gdHJ1ZTtcbiAgICBhc3NpZ25GaWVsZChpICsgMSwgaGFzQWdnciwgYXV0b01vZGUpO1xuICAgIGRlbGV0ZSB0ZltpXS5iaW47XG4gIH1cblxuICBmdW5jdGlvbiBhc3NpZ25RKGksIGhhc0FnZ3IsIGF1dG9Nb2RlKSB7XG4gICAgdmFyIGYgPSBmaWVsZHNbaV0sXG4gICAgICBjYW5IYXZlQWdnciA9IGhhc0FnZ3IgPT09IHRydWUgfHwgaGFzQWdnciA9PT0gbnVsbDtcblxuICAgIHRmW2ldID0ge25hbWU6IGYubmFtZSwgdHlwZTogZi50eXBlfTtcblxuICAgIGlmIChmLmFnZ3JlZ2F0ZSA9PT0gJ2NvdW50JykgeyAvLyBpZiBjb3VudCBpcyBpbmNsdWRlZCBpbiB0aGUgc2VsZWN0ZWQgZmllbGRzXG4gICAgICBpZiAoY2FuSGF2ZUFnZ3IpIHtcbiAgICAgICAgdGZbaV0uYWdncmVnYXRlID0gZi5hZ2dyZWdhdGU7XG4gICAgICAgIGFzc2lnbkZpZWxkKGkgKyAxLCB0cnVlLCBhdXRvTW9kZSk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChmLl9hZ2dyZWdhdGUpIHtcbiAgICAgIC8vIFRPRE8gc3VwcG9ydCBhcnJheSBvZiBmLl9hZ2dycyB0b29cbiAgICAgIGFzc2lnbkFnZ3JRKGksIGhhc0FnZ3IsIGF1dG9Nb2RlLCBmLl9hZ2dyZWdhdGUpO1xuICAgIH0gZWxzZSBpZiAoZi5fcmF3KSB7XG4gICAgICBhc3NpZ25BZ2dyUShpLCBoYXNBZ2dyLCBhdXRvTW9kZSwgdW5kZWZpbmVkKTtcbiAgICB9IGVsc2UgaWYgKGYuX2Jpbikge1xuICAgICAgYXNzaWduQmluUShpLCBoYXNBZ2dyLCBhdXRvTW9kZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG9wdC5hZ2dyTGlzdC5mb3JFYWNoKGZ1bmN0aW9uKGEpIHtcbiAgICAgICAgaWYgKCFvcHQuY29uc2lzdGVudEF1dG9RIHx8IGF1dG9Nb2RlID09PSBBVVRPIHx8IGF1dG9Nb2RlID09PSBhKSB7XG4gICAgICAgICAgYXNzaWduQWdnclEoaSwgaGFzQWdnciwgYSAvKmFzc2lnbiBhdXRvTW9kZSovLCBhKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIGlmICgoIW9wdC5jb25zaXN0ZW50QXV0b1EgfHwgdmwuaXNpbihhdXRvTW9kZSwgW0FVVE8sICdiaW4nLCAnY2FzdCcsICdhdXRvY2FzdCddKSkgJiYgIWhhc05vck8pIHtcbiAgICAgICAgdmFyIGhpZ2hDYXJkaW5hbGl0eSA9IHZsLmZpZWxkLmNhcmRpbmFsaXR5KGYsIHN0YXRzKSA+IG9wdC5taW5DYXJkaW5hbGl0eUZvckJpbjtcblxuICAgICAgICB2YXIgaXNBdXRvID0gb3B0LmdlbkRpbVEgPT09ICdhdXRvJyxcbiAgICAgICAgICBnZW5CaW4gPSBvcHQuZ2VuRGltUSAgPT09ICdiaW4nIHx8IChpc0F1dG8gJiYgaGlnaENhcmRpbmFsaXR5KSxcbiAgICAgICAgICBnZW5DYXN0ID0gb3B0LmdlbkRpbVEgPT09ICdjYXN0JyB8fCAoaXNBdXRvICYmICFoaWdoQ2FyZGluYWxpdHkpO1xuXG4gICAgICAgIGlmIChnZW5CaW4gJiYgdmwuaXNpbihhdXRvTW9kZSwgW0FVVE8sICdiaW4nLCAnYXV0b2Nhc3QnXSkpIHtcbiAgICAgICAgICBhc3NpZ25CaW5RKGksIGhhc0FnZ3IsIGlzQXV0byA/ICdhdXRvY2FzdCcgOiAnYmluJyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGdlbkNhc3QgJiYgdmwuaXNpbihhdXRvTW9kZSwgW0FVVE8sICdjYXN0JywgJ2F1dG9jYXN0J10pKSB7XG4gICAgICAgICAgdGZbaV0udHlwZSA9ICdPJztcbiAgICAgICAgICBhc3NpZ25GaWVsZChpICsgMSwgaGFzQWdnciwgaXNBdXRvID8gJ2F1dG9jYXN0JyA6ICdjYXN0Jyk7XG4gICAgICAgICAgdGZbaV0udHlwZSA9ICdRJztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGFzc2lnblRpbWVVbml0VChpLCBoYXNBZ2dyLCBhdXRvTW9kZSwgdGltZVVuaXQpIHtcbiAgICB0ZltpXS50aW1lVW5pdCA9IHRpbWVVbml0O1xuICAgIGFzc2lnbkZpZWxkKGkrMSwgaGFzQWdnciwgYXV0b01vZGUpO1xuICAgIGRlbGV0ZSB0ZltpXS50aW1lVW5pdDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGFzc2lnblQoaSwgaGFzQWdnciwgYXV0b01vZGUpIHtcbiAgICB2YXIgZiA9IGZpZWxkc1tpXTtcbiAgICB0ZltpXSA9IHtuYW1lOiBmLm5hbWUsIHR5cGU6IGYudHlwZX07XG5cbiAgICAvLyBUT0RPIHN1cHBvcnQgYXJyYXkgb2YgZi5fdGltZVVuaXRzXG4gICAgaWYgKGYuX3RpbWVVbml0KSB7XG4gICAgICBhc3NpZ25UaW1lVW5pdFQoaSwgaGFzQWdnciwgYXV0b01vZGUsIGYuX3RpbWVVbml0KTtcbiAgICB9IGVsc2Uge1xuICAgICAgb3B0LnRpbWVVbml0TGlzdC5mb3JFYWNoKGZ1bmN0aW9uKHRpbWVVbml0KSB7XG4gICAgICAgIGlmICh0aW1lVW5pdCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgaWYgKCFoYXNBZ2dyKSB7IC8vIGNhbid0IGFnZ3JlZ2F0ZSBvdmVyIHJhdyB0aW1lXG4gICAgICAgICAgICBhc3NpZ25GaWVsZChpKzEsIGZhbHNlLCBhdXRvTW9kZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGFzc2lnblRpbWVVbml0VChpLCBoYXNBZ2dyLCBhdXRvTW9kZSwgdGltZVVuaXQpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBGSVhNRSB3aGF0IGlmIHlvdSBhZ2dyZWdhdGUgdGltZT9cbiAgfVxuXG4gIGZ1bmN0aW9uIGFzc2lnbkZpZWxkKGksIGhhc0FnZ3IsIGF1dG9Nb2RlKSB7XG4gICAgaWYgKGkgPT09IGZpZWxkcy5sZW5ndGgpIHsgLy8gSWYgYWxsIGZpZWxkcyBhcmUgYXNzaWduZWRcbiAgICAgIGNoZWNrQW5kUHVzaCgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBmID0gZmllbGRzW2ldO1xuICAgIC8vIE90aGVyd2lzZSwgYXNzaWduIGktdGggZmllbGRcbiAgICBzd2l0Y2ggKGYudHlwZSkge1xuICAgICAgLy9UT0RPIFwiRFwiLCBcIkdcIlxuICAgICAgY2FzZSBROlxuICAgICAgICBhc3NpZ25RKGksIGhhc0FnZ3IsIGF1dG9Nb2RlKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgVDpcbiAgICAgICAgYXNzaWduVChpLCBoYXNBZ2dyLCBhdXRvTW9kZSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBPOlxuICAgICAgICAvKiBmYWxscyB0aHJvdWdoICovXG4gICAgICBjYXNlIE46XG4gICAgICAgIC8qIGZhbGxzIHRocm91Z2ggKi9cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHRmW2ldID0gZjtcbiAgICAgICAgYXNzaWduRmllbGQoaSArIDEsIGhhc0FnZ3IsIGF1dG9Nb2RlKTtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgdmFyIGhhc0FnZ3IgPSBvcHQudGFibGVUeXBlcyA9PT0gJ2FnZ3JlZ2F0ZWQnID8gdHJ1ZSA6IG9wdC50YWJsZVR5cGVzID09PSAnZGlzYWdncmVnYXRlZCcgPyBmYWxzZSA6IG51bGw7XG4gIGFzc2lnbkZpZWxkKDAsIGhhc0FnZ3IsIEFVVE8pO1xuXG4gIHJldHVybiBvdXRwdXQ7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciB2bCA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93Wyd2bCddIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbFsndmwnXSA6IG51bGwpLFxuICBnZW5FbmNzID0gcmVxdWlyZSgnLi9lbmNzJyksXG4gIGdldE1hcmt0eXBlcyA9IHJlcXVpcmUoJy4vbWFya3R5cGVzJyksXG4gIHJhbmsgPSByZXF1aXJlKCcuLi9yYW5rL3JhbmsnKSxcbiAgY29uc3RzID0gcmVxdWlyZSgnLi4vY29uc3RzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZ2VuRW5jb2RpbmdzRnJvbUZpZWxkcztcblxuZnVuY3Rpb24gZ2VuRW5jb2RpbmdzRnJvbUZpZWxkcyhvdXRwdXQsIGZpZWxkcywgc3RhdHMsIG9wdCwgbmVzdGVkKSB7XG4gIG9wdCA9IHZsLnNjaGVtYS51dGlsLmV4dGVuZChvcHR8fHt9LCBjb25zdHMuZ2VuLmVuY29kaW5ncyk7XG4gIHZhciBlbmNzID0gZ2VuRW5jcyhbXSwgZmllbGRzLCBzdGF0cywgb3B0KTtcblxuICBpZiAobmVzdGVkKSB7XG4gICAgcmV0dXJuIGVuY3MucmVkdWNlKGZ1bmN0aW9uKGRpY3QsIGVuYykge1xuICAgICAgZGljdFtlbmNdID0gZ2VuRW5jb2RpbmdzRnJvbUVuY3MoW10sIGVuYywgc3RhdHMsIG9wdCk7XG4gICAgICByZXR1cm4gZGljdDtcbiAgICB9LCB7fSk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGVuY3MucmVkdWNlKGZ1bmN0aW9uKGxpc3QsIGVuYykge1xuICAgICAgcmV0dXJuIGdlbkVuY29kaW5nc0Zyb21FbmNzKGxpc3QsIGVuYywgc3RhdHMsIG9wdCk7XG4gICAgfSwgW10pO1xuICB9XG59XG5cbmZ1bmN0aW9uIGdlbkVuY29kaW5nc0Zyb21FbmNzKG91dHB1dCwgZW5jLCBzdGF0cywgb3B0KSB7XG4gIGdldE1hcmt0eXBlcyhlbmMsIHN0YXRzLCBvcHQpXG4gICAgLmZvckVhY2goZnVuY3Rpb24obWFya1R5cGUpIHtcbiAgICAgIHZhciBlID0gdmwuZHVwbGljYXRlKHtcbiAgICAgICAgICBkYXRhOiBvcHQuZGF0YSxcbiAgICAgICAgICBtYXJrdHlwZTogbWFya1R5cGUsXG4gICAgICAgICAgZW5jb2Rpbmc6IGVuYyxcbiAgICAgICAgICBjb25maWc6IG9wdC5jb25maWdcbiAgICAgICAgfSksXG4gICAgICAgIGVuY29kaW5nID0gZmluYWxUb3VjaChlLCBzdGF0cywgb3B0KSxcbiAgICAgICAgc2NvcmUgPSByYW5rLmVuY29kaW5nKGVuY29kaW5nLCBzdGF0cywgb3B0KTtcblxuICAgICAgZW5jb2RpbmcuX2luZm8gPSBzY29yZTtcbiAgICAgIG91dHB1dC5wdXNoKGVuY29kaW5nKTtcbiAgICB9KTtcbiAgcmV0dXJuIG91dHB1dDtcbn1cblxuLy9GSVhNRSB0aGlzIHNob3VsZCBiZSByZWZhY3RvcnNcbmZ1bmN0aW9uIGZpbmFsVG91Y2goZW5jb2RpbmcsIHN0YXRzLCBvcHQpIHtcbiAgaWYgKGVuY29kaW5nLm1hcmt0eXBlID09PSAndGV4dCcgJiYgb3B0LmFsd2F5c0dlbmVyYXRlVGFibGVBc0hlYXRtYXApIHtcbiAgICBlbmNvZGluZy5lbmNvZGluZy5jb2xvciA9IGVuY29kaW5nLmVuY29kaW5nLnRleHQ7XG4gIH1cblxuICAvLyBkb24ndCBpbmNsdWRlIHplcm8gaWYgc3RkZXYvYXZnIDwgMC4wMVxuICAvLyBodHRwczovL2dpdGh1Yi5jb20vdXdkYXRhL3Zpc3JlYy9pc3N1ZXMvNjlcbiAgdmFyIGVuYyA9IGVuY29kaW5nLmVuY29kaW5nO1xuICBbJ3gnLCAneSddLmZvckVhY2goZnVuY3Rpb24oZXQpIHtcbiAgICB2YXIgZmllbGQgPSBlbmNbZXRdO1xuICAgIGlmIChmaWVsZCAmJiB2bC5maWVsZC5pc01lYXN1cmUoZmllbGQpICYmICF2bC5maWVsZC5pc0NvdW50KGZpZWxkKSkge1xuICAgICAgdmFyIHN0YXQgPSBzdGF0c1tmaWVsZC5uYW1lXTtcbiAgICAgIGlmIChzdGF0ICYmIHN0YXQuc3RkZXYgLyBzdGF0LmF2ZyA8IDAuMDEpIHtcbiAgICAgICAgZmllbGQuc2NhbGUgPSB7emVybzogZmFsc2V9O1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG4gIHJldHVybiBlbmNvZGluZztcbn0iLCJcInVzZSBzdHJpY3RcIjtcbnJlcXVpcmUoJy4uL2dsb2JhbHMnKTtcblxudmFyIHZsID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3dbJ3ZsJ10gOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsWyd2bCddIDogbnVsbCksXG4gIGNvbnN0cyA9IHJlcXVpcmUoJy4uL2NvbnN0cycpLFxuICBnZW5NYXJrVHlwZXMgPSByZXF1aXJlKCcuL21hcmt0eXBlcycpLFxuICBpc0RpbWVuc2lvbiA9IHZsLmZpZWxkLmlzRGltZW5zaW9uLFxuICBpc01lYXN1cmUgPSB2bC5maWVsZC5pc01lYXN1cmU7XG5cbm1vZHVsZS5leHBvcnRzID0gZ2VuRW5jcztcblxuLy8gRklYTUUgcmVtb3ZlIGRpbWVuc2lvbiwgbWVhc3VyZSBhbmQgdXNlIGluZm9ybWF0aW9uIGluIHZlZ2EtbGl0ZSBpbnN0ZWFkIVxudmFyIHJ1bGVzID0ge1xuICB4OiB7XG4gICAgZGltZW5zaW9uOiB0cnVlLFxuICAgIG1lYXN1cmU6IHRydWUsXG4gICAgbXVsdGlwbGU6IHRydWUgLy9GSVhNRSBzaG91bGQgYWxsb3cgbXVsdGlwbGUgb25seSBmb3IgUSwgVFxuICB9LFxuICB5OiB7XG4gICAgZGltZW5zaW9uOiB0cnVlLFxuICAgIG1lYXN1cmU6IHRydWUsXG4gICAgbXVsdGlwbGU6IHRydWUgLy9GSVhNRSBzaG91bGQgYWxsb3cgbXVsdGlwbGUgb25seSBmb3IgUSwgVFxuICB9LFxuICByb3c6IHtcbiAgICBkaW1lbnNpb246IHRydWUsXG4gICAgbXVsdGlwbGU6IHRydWVcbiAgfSxcbiAgY29sOiB7XG4gICAgZGltZW5zaW9uOiB0cnVlLFxuICAgIG11bHRpcGxlOiB0cnVlXG4gIH0sXG4gIHNoYXBlOiB7XG4gICAgZGltZW5zaW9uOiB0cnVlLFxuICAgIHJ1bGVzOiBzaGFwZVJ1bGVzXG4gIH0sXG4gIHNpemU6IHtcbiAgICBtZWFzdXJlOiB0cnVlLFxuICAgIHJ1bGVzOiByZXRpbmFsRW5jUnVsZXNcbiAgfSxcbiAgY29sb3I6IHtcbiAgICBkaW1lbnNpb246IHRydWUsXG4gICAgbWVhc3VyZTogdHJ1ZSxcbiAgICBydWxlczogY29sb3JSdWxlc1xuICB9LFxuICB0ZXh0OiB7XG4gICAgbWVhc3VyZTogdHJ1ZVxuICB9LFxuICBkZXRhaWw6IHtcbiAgICBkaW1lbnNpb246IHRydWVcbiAgfVxuICAvL2dlbzoge1xuICAvLyAgZ2VvOiB0cnVlXG4gIC8vfSxcbiAgLy9hcmM6IHsgLy8gcGllXG4gIC8vXG4gIC8vfVxufTtcblxuZnVuY3Rpb24gcmV0aW5hbEVuY1J1bGVzKGVuYywgZmllbGQsIHN0YXRzLCBvcHQpIHtcbiAgaWYgKG9wdC5vbWl0TXVsdGlwbGVSZXRpbmFsRW5jb2RpbmdzKSB7XG4gICAgaWYgKGVuYy5jb2xvciB8fCBlbmMuc2l6ZSB8fCBlbmMuc2hhcGUpIHJldHVybiBmYWxzZTtcbiAgfVxuICByZXR1cm4gdHJ1ZTtcbn1cblxuZnVuY3Rpb24gY29sb3JSdWxlcyhlbmMsIGZpZWxkLCBzdGF0cywgb3B0KSB7XG4gIGlmKCFyZXRpbmFsRW5jUnVsZXMoZW5jLCBmaWVsZCwgc3RhdHMsIG9wdCkpIHJldHVybiBmYWxzZTtcblxuICByZXR1cm4gdmwuZmllbGQuaXNNZWFzdXJlKGZpZWxkKSB8fFxuICAgIHZsLmZpZWxkLmNhcmRpbmFsaXR5KGZpZWxkLCBzdGF0cykgPD0gb3B0Lm1heENhcmRpbmFsaXR5Rm9yQ29sb3I7XG59XG5cbmZ1bmN0aW9uIHNoYXBlUnVsZXMoZW5jLCBmaWVsZCwgc3RhdHMsIG9wdCkge1xuICBpZighcmV0aW5hbEVuY1J1bGVzKGVuYywgZmllbGQsIHN0YXRzLCBvcHQpKSByZXR1cm4gZmFsc2U7XG5cbiAgaWYgKGZpZWxkLmJpbiAmJiBmaWVsZC50eXBlID09PSBRKSByZXR1cm4gZmFsc2U7XG4gIGlmIChmaWVsZC50aW1lVW5pdCAmJiBmaWVsZC50eXBlID09PSBUKSByZXR1cm4gZmFsc2U7XG4gIHJldHVybiB2bC5maWVsZC5jYXJkaW5hbGl0eShmaWVsZCwgc3RhdHMpIDw9IG9wdC5tYXhDYXJkaW5hbGl0eUZvckNvbG9yO1xufVxuXG5mdW5jdGlvbiBkaW1NZWFUcmFuc3Bvc2VSdWxlKGVuYykge1xuICAvLyBjcmVhdGUgaG9yaXpvbnRhbCBoaXN0b2dyYW0gZm9yIG9yZGluYWxcbiAgaWYgKHZsLmZpZWxkLmlzVHlwZXMoZW5jLnksIFtOLCBPXSkgJiYgaXNNZWFzdXJlKGVuYy54KSkgcmV0dXJuIHRydWU7XG5cbiAgLy8gdmVydGljYWwgaGlzdG9ncmFtIGZvciBRIGFuZCBUXG4gIGlmIChpc01lYXN1cmUoZW5jLnkpICYmICghdmwuZmllbGQuaXNUeXBlcyhlbmMueCwgW04sIE9dKSAmJiBpc0RpbWVuc2lvbihlbmMueCkpKSByZXR1cm4gdHJ1ZTtcblxuICByZXR1cm4gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIGdlbmVyYWxSdWxlcyhlbmMsIHN0YXRzLCBvcHQpIHtcbiAgLy8gZW5jLnRleHQgaXMgb25seSB1c2VkIGZvciBURVhUIFRBQkxFXG4gIGlmIChlbmMudGV4dCkge1xuICAgIHJldHVybiBnZW5NYXJrVHlwZXMuc2F0aXNmeVJ1bGVzKGVuYywgVEVYVCwgc3RhdHMsIG9wdCk7XG4gIH1cblxuICAvLyBDQVJURVNJQU4gUExPVCBPUiBNQVBcbiAgaWYgKGVuYy54IHx8IGVuYy55IHx8IGVuYy5nZW8gfHwgZW5jLmFyYykge1xuXG4gICAgaWYgKGVuYy5yb3cgfHwgZW5jLmNvbCkgeyAvL2hhdmUgZmFjZXQocylcblxuICAgICAgLy8gZG9uJ3QgdXNlIGZhY2V0cyBiZWZvcmUgZmlsbGluZyB1cCB4LHlcbiAgICAgIGlmICghZW5jLnggfHwgIWVuYy55KSByZXR1cm4gZmFsc2U7XG5cbiAgICAgIGlmIChvcHQub21pdE5vblRleHRBZ2dyV2l0aEFsbERpbXNPbkZhY2V0cykge1xuICAgICAgICAvLyByZW1vdmUgYWxsIGFnZ3JlZ2F0ZWQgY2hhcnRzIHdpdGggYWxsIGRpbXMgb24gZmFjZXRzIChyb3csIGNvbClcbiAgICAgICAgaWYgKGdlbkVuY3MuaXNBZ2dyV2l0aEFsbERpbU9uRmFjZXRzKGVuYykpIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoZW5jLnggJiYgZW5jLnkpIHtcbiAgICAgIHZhciBpc0RpbVggPSAhIWlzRGltZW5zaW9uKGVuYy54KSxcbiAgICAgICAgaXNEaW1ZID0gISFpc0RpbWVuc2lvbihlbmMueSk7XG5cbiAgICAgIGlmIChpc0RpbVggJiYgaXNEaW1ZICYmICF2bC5lbmMuaXNBZ2dyZWdhdGUoZW5jKSkge1xuICAgICAgICAvLyBGSVhNRSBhY3R1YWxseSBjaGVjayBpZiB0aGVyZSB3b3VsZCBiZSBvY2NsdXNpb24gIzkwXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgaWYgKG9wdC5vbWl0VHJhbnBvc2UpIHtcbiAgICAgICAgaWYgKGlzRGltWCBeIGlzRGltWSkgeyAvLyBkaW0geCBtZWFcbiAgICAgICAgICBpZiAoIWRpbU1lYVRyYW5zcG9zZVJ1bGUoZW5jKSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9IGVsc2UgaWYgKGVuYy55LnR5cGU9PT1UIHx8IGVuYy54LnR5cGUgPT09IFQpIHtcbiAgICAgICAgICBpZiAoZW5jLnkudHlwZT09PVQgJiYgZW5jLngudHlwZSAhPT0gVCkgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9IGVsc2UgeyAvLyBzaG93IG9ubHkgb25lIE94TywgUXhRXG4gICAgICAgICAgaWYgKGVuYy54Lm5hbWUgPiBlbmMueS5uYW1lKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIC8vIERPVCBQTE9UU1xuICAgIC8vIC8vIHBsb3Qgd2l0aCBvbmUgYXhpcyA9IGRvdCBwbG90XG4gICAgaWYgKG9wdC5vbWl0RG90UGxvdCkgcmV0dXJuIGZhbHNlO1xuXG4gICAgLy8gRG90IHBsb3Qgc2hvdWxkIGFsd2F5cyBiZSBob3Jpem9udGFsXG4gICAgaWYgKG9wdC5vbWl0VHJhbnBvc2UgJiYgZW5jLnkpIHJldHVybiBmYWxzZTtcblxuICAgIC8vIGRvdCBwbG90IHNob3VsZG4ndCBoYXZlIG90aGVyIGVuY29kaW5nXG4gICAgaWYgKG9wdC5vbWl0RG90UGxvdFdpdGhFeHRyYUVuY29kaW5nICYmIHZsLmtleXMoZW5jKS5sZW5ndGggPiAxKSByZXR1cm4gZmFsc2U7XG5cbiAgICBpZiAob3B0Lm9taXRPbmVEaW1lbnNpb25Db3VudCkge1xuICAgICAgLy8gb25lIGRpbWVuc2lvbiBcImNvdW50XCJcbiAgICBpZiAoZW5jLnggJiYgZW5jLnguYWdncmVnYXRlID09ICdjb3VudCcgJiYgIWVuYy55KSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKGVuYy55ICYmIGVuYy55LmFnZ3JlZ2F0ZSA9PSAnY291bnQnICYmICFlbmMueCkgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuZ2VuRW5jcy5pc0FnZ3JXaXRoQWxsRGltT25GYWNldHMgPSBmdW5jdGlvbiAoZW5jKSB7XG4gIHZhciBoYXNBZ2dyID0gZmFsc2UsIGhhc090aGVyTyA9IGZhbHNlO1xuICBmb3IgKHZhciBlbmNUeXBlIGluIGVuYykge1xuICAgIHZhciBmaWVsZCA9IGVuY1tlbmNUeXBlXTtcbiAgICBpZiAoZmllbGQuYWdncmVnYXRlKSB7XG4gICAgICBoYXNBZ2dyID0gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKHZsLmZpZWxkLmlzRGltZW5zaW9uKGZpZWxkKSAmJiAoZW5jVHlwZSAhPT0gUk9XICYmIGVuY1R5cGUgIT09IENPTCkpIHtcbiAgICAgIGhhc090aGVyTyA9IHRydWU7XG4gICAgfVxuICAgIGlmIChoYXNBZ2dyICYmIGhhc090aGVyTykgYnJlYWs7XG4gIH1cblxuICByZXR1cm4gaGFzQWdnciAmJiAhaGFzT3RoZXJPO1xufTtcblxuXG5mdW5jdGlvbiBnZW5FbmNzKGVuY3MsIGZpZWxkcywgc3RhdHMsIG9wdCkge1xuICBvcHQgPSB2bC5zY2hlbWEudXRpbC5leHRlbmQob3B0fHx7fSwgY29uc3RzLmdlbi5lbmNvZGluZ3MpO1xuICAvLyBnZW5lcmF0ZSBhIGNvbGxlY3Rpb24gdmVnYS1saXRlJ3MgZW5jXG4gIHZhciB0bXBFbmMgPSB7fTtcblxuICBmdW5jdGlvbiBhc3NpZ25GaWVsZChpKSB7XG4gICAgLy8gSWYgYWxsIGZpZWxkcyBhcmUgYXNzaWduZWQsIHNhdmVcbiAgICBpZiAoaSA9PT0gZmllbGRzLmxlbmd0aCkge1xuICAgICAgLy8gYXQgdGhlIG1pbmltYWwgYWxsIGNoYXJ0IHNob3VsZCBoYXZlIHgsIHksIGdlbywgdGV4dCBvciBhcmNcbiAgICAgIGlmIChnZW5lcmFsUnVsZXModG1wRW5jLCBzdGF0cywgb3B0KSkge1xuICAgICAgICBlbmNzLnB1c2godmwuZHVwbGljYXRlKHRtcEVuYykpO1xuICAgICAgfVxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIE90aGVyd2lzZSwgYXNzaWduIGktdGggZmllbGRcbiAgICB2YXIgZmllbGQgPSBmaWVsZHNbaV07XG4gICAgZm9yICh2YXIgaiBpbiBvcHQuZW5jb2RpbmdUeXBlTGlzdCkge1xuICAgICAgdmFyIGV0ID0gb3B0LmVuY29kaW5nVHlwZUxpc3Rbal0sXG4gICAgICAgIGlzRGltID0gaXNEaW1lbnNpb24oZmllbGQpO1xuXG4gICAgICAvL1RPRE86IHN1cHBvcnQgXCJtdWx0aXBsZVwiIGFzc2lnbm1lbnRcbiAgICAgIGlmICghKGV0IGluIHRtcEVuYykgJiYgLy8gZW5jb2Rpbmcgbm90IHVzZWRcbiAgICAgICAgKChpc0RpbSAmJiBydWxlc1tldF0uZGltZW5zaW9uKSB8fCAoIWlzRGltICYmIHJ1bGVzW2V0XS5tZWFzdXJlKSkgJiZcbiAgICAgICAgKCFydWxlc1tldF0ucnVsZXMgfHwgcnVsZXNbZXRdLnJ1bGVzKHRtcEVuYywgZmllbGQsIHN0YXRzLCBvcHQpKVxuICAgICAgKSB7XG4gICAgICAgIHRtcEVuY1tldF0gPSBmaWVsZDtcbiAgICAgICAgYXNzaWduRmllbGQoaSArIDEpO1xuICAgICAgICBkZWxldGUgdG1wRW5jW2V0XTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBhc3NpZ25GaWVsZCgwKTtcblxuICByZXR1cm4gZW5jcztcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWwgPSByZXF1aXJlKCcuLi91dGlsJyk7XG5cbnZhciBnZW4gPSBtb2R1bGUuZXhwb3J0cyA9IHtcbiAgLy8gZGF0YSB2YXJpYXRpb25zXG4gIGFnZ3JlZ2F0ZXM6IHJlcXVpcmUoJy4vYWdncmVnYXRlcycpLFxuICBwcm9qZWN0aW9uczogcmVxdWlyZSgnLi9wcm9qZWN0aW9ucycpLFxuICAvLyBlbmNvZGluZ3MgLyB2aXN1YWwgdmFyaWF0b25zXG4gIGVuY29kaW5nczogcmVxdWlyZSgnLi9lbmNvZGluZ3MnKSxcbiAgZW5jczogcmVxdWlyZSgnLi9lbmNzJyksXG4gIG1hcmt0eXBlczogcmVxdWlyZSgnLi9tYXJrdHlwZXMnKVxufTtcblxuZ2VuLmNoYXJ0cyA9IGZ1bmN0aW9uKGZpZWxkcywgb3B0LCBjZmcsIGZsYXQpIHtcbiAgb3B0ID0gdXRpbC5nZW4uZ2V0T3B0KG9wdCk7XG4gIGZsYXQgPSBmbGF0ID09PSB1bmRlZmluZWQgPyB7ZW5jb2RpbmdzOiAxfSA6IGZsYXQ7XG5cbiAgLy8gVE9ETyBnZW5lcmF0ZVxuXG4gIC8vIGdlbmVyYXRlIHBlcm11dGF0aW9uIG9mIGVuY29kaW5nIG1hcHBpbmdzXG4gIHZhciBmaWVsZFNldHMgPSBvcHQuZ2VuQWdnciA/IGdlbi5hZ2dyZWdhdGVzKFtdLCBmaWVsZHMsIG9wdCkgOiBbZmllbGRzXSxcbiAgICBlbmNzLCBjaGFydHMsIGxldmVsID0gMDtcblxuICBpZiAoZmxhdCA9PT0gdHJ1ZSB8fCAoZmxhdCAmJiBmbGF0LmFnZ3JlZ2F0ZSkpIHtcbiAgICBlbmNzID0gZmllbGRTZXRzLnJlZHVjZShmdW5jdGlvbihvdXRwdXQsIGZpZWxkcykge1xuICAgICAgcmV0dXJuIGdlbi5lbmNzKG91dHB1dCwgZmllbGRzLCBvcHQpO1xuICAgIH0sIFtdKTtcbiAgfSBlbHNlIHtcbiAgICBlbmNzID0gZmllbGRTZXRzLm1hcChmdW5jdGlvbihmaWVsZHMpIHtcbiAgICAgIHJldHVybiBnZW4uZW5jcyhbXSwgZmllbGRzLCBvcHQpO1xuICAgIH0sIHRydWUpO1xuICAgIGxldmVsICs9IDE7XG4gIH1cblxuICBpZiAoZmxhdCA9PT0gdHJ1ZSB8fCAoZmxhdCAmJiBmbGF0LmVuY29kaW5ncykpIHtcbiAgICBjaGFydHMgPSB1dGlsLm5lc3RlZFJlZHVjZShlbmNzLCBmdW5jdGlvbihvdXRwdXQsIGVuYykge1xuICAgICAgcmV0dXJuIGdlbi5tYXJrdHlwZXMob3V0cHV0LCBlbmMsIG9wdCwgY2ZnKTtcbiAgICB9LCBsZXZlbCwgdHJ1ZSk7XG4gIH0gZWxzZSB7XG4gICAgY2hhcnRzID0gdXRpbC5uZXN0ZWRNYXAoZW5jcywgZnVuY3Rpb24oZW5jKSB7XG4gICAgICByZXR1cm4gZ2VuLm1hcmt0eXBlcyhbXSwgZW5jLCBvcHQsIGNmZyk7XG4gICAgfSwgbGV2ZWwsIHRydWUpO1xuICAgIGxldmVsICs9IDE7XG4gIH1cbiAgcmV0dXJuIGNoYXJ0cztcbn07IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciB2bCA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93Wyd2bCddIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbFsndmwnXSA6IG51bGwpLFxuICBjb25zdHMgPSByZXF1aXJlKCcuLi9jb25zdHMnKSxcbiAgaXNEaW1lbnNpb24gPSB2bC5maWVsZC5pc0RpbWVuc2lvbixcbiAgaXNPcmRpbmFsU2NhbGUgPSB2bC5maWVsZC5pc09yZGluYWxTY2FsZTtcblxudmFyIHZsbWFya3R5cGVzID0gbW9kdWxlLmV4cG9ydHMgPSBnZXRNYXJrdHlwZXM7XG5cbnZhciBtYXJrc1J1bGUgPSB2bG1hcmt0eXBlcy5ydWxlID0ge1xuICBwb2ludDogIHBvaW50UnVsZSxcbiAgYmFyOiAgICBiYXJSdWxlLFxuICBsaW5lOiAgIGxpbmVSdWxlLFxuICBhcmVhOiAgIGFyZWFSdWxlLCAvLyBhcmVhIGlzIHNpbWlsYXIgdG8gbGluZVxuICB0ZXh0OiAgIHRleHRSdWxlLFxuICB0aWNrOiAgIHRpY2tSdWxlXG59O1xuXG5mdW5jdGlvbiBnZXRNYXJrdHlwZXMoZW5jLCBzdGF0cywgb3B0KSB7XG4gIG9wdCA9IHZsLnNjaGVtYS51dGlsLmV4dGVuZChvcHR8fHt9LCBjb25zdHMuZ2VuLmVuY29kaW5ncyk7XG5cbiAgdmFyIG1hcmtUeXBlcyA9IG9wdC5tYXJrdHlwZUxpc3QuZmlsdGVyKGZ1bmN0aW9uKG1hcmtUeXBlKXtcbiAgICByZXR1cm4gdmxtYXJrdHlwZXMuc2F0aXNmeVJ1bGVzKGVuYywgbWFya1R5cGUsIHN0YXRzLCBvcHQpO1xuICB9KTtcblxuICByZXR1cm4gbWFya1R5cGVzO1xufVxuXG52bG1hcmt0eXBlcy5zYXRpc2Z5UnVsZXMgPSBmdW5jdGlvbiAoZW5jLCBtYXJrVHlwZSwgc3RhdHMsIG9wdCkge1xuICB2YXIgbWFyayA9IHZsLmNvbXBpbGVyLm1hcmtzW21hcmtUeXBlXSxcbiAgICByZXFzID0gbWFyay5yZXF1aXJlZEVuY29kaW5nLFxuICAgIHN1cHBvcnQgPSBtYXJrLnN1cHBvcnRlZEVuY29kaW5nO1xuXG4gIGZvciAodmFyIGkgaW4gcmVxcykgeyAvLyBhbGwgcmVxdWlyZWQgZW5jb2RpbmdzIGluIGVuY1xuICAgIGlmICghKHJlcXNbaV0gaW4gZW5jKSkgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgZm9yICh2YXIgZW5jVHlwZSBpbiBlbmMpIHsgLy8gYWxsIGVuY29kaW5ncyBpbiBlbmMgYXJlIHN1cHBvcnRlZFxuICAgIGlmICghc3VwcG9ydFtlbmNUeXBlXSkgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgcmV0dXJuICFtYXJrc1J1bGVbbWFya1R5cGVdIHx8IG1hcmtzUnVsZVttYXJrVHlwZV0oZW5jLCBzdGF0cywgb3B0KTtcbn07XG5cbmZ1bmN0aW9uIGZhY2V0UnVsZShmaWVsZCwgc3RhdHMsIG9wdCkge1xuICByZXR1cm4gdmwuZmllbGQuY2FyZGluYWxpdHkoZmllbGQsIHN0YXRzKSA8PSBvcHQubWF4Q2FyZGluYWxpdHlGb3JGYWNldHM7XG59XG5cbmZ1bmN0aW9uIGZhY2V0c1J1bGUoZW5jLCBzdGF0cywgb3B0KSB7XG4gIGlmKGVuYy5yb3cgJiYgIWZhY2V0UnVsZShlbmMucm93LCBzdGF0cywgb3B0KSkgcmV0dXJuIGZhbHNlO1xuICBpZihlbmMuY29sICYmICFmYWNldFJ1bGUoZW5jLmNvbCwgc3RhdHMsIG9wdCkpIHJldHVybiBmYWxzZTtcbiAgcmV0dXJuIHRydWU7XG59XG5cbmZ1bmN0aW9uIHBvaW50UnVsZShlbmMsIHN0YXRzLCBvcHQpIHtcbiAgaWYoIWZhY2V0c1J1bGUoZW5jLCBzdGF0cywgb3B0KSkgcmV0dXJuIGZhbHNlO1xuICBpZiAoZW5jLnggJiYgZW5jLnkpIHtcbiAgICAvLyBoYXZlIGJvdGggeCAmIHkgPT0+IHNjYXR0ZXIgcGxvdCAvIGJ1YmJsZSBwbG90XG5cbiAgICB2YXIgeElzRGltID0gaXNEaW1lbnNpb24oZW5jLngpLFxuICAgICAgeUlzRGltID0gaXNEaW1lbnNpb24oZW5jLnkpO1xuXG4gICAgLy8gRm9yIE94T1xuICAgIGlmICh4SXNEaW0gJiYgeUlzRGltKSB7XG4gICAgICAvLyBzaGFwZSBkb2Vzbid0IHdvcmsgd2l0aCBib3RoIHgsIHkgYXMgb3JkaW5hbFxuICAgICAgaWYgKGVuYy5zaGFwZSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG5cbiAgICAgIC8vIFRPRE8oa2FuaXR3KTogY2hlY2sgdGhhdCB0aGVyZSBpcyBxdWFudCBhdCBsZWFzdCAuLi5cbiAgICAgIGlmIChlbmMuY29sb3IgJiYgaXNEaW1lbnNpb24oZW5jLmNvbG9yKSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuXG4gIH0gZWxzZSB7IC8vIHBsb3Qgd2l0aCBvbmUgYXhpcyA9IGRvdCBwbG90XG4gICAgaWYgKG9wdC5vbWl0RG90UGxvdCkgcmV0dXJuIGZhbHNlO1xuXG4gICAgLy8gRG90IHBsb3Qgc2hvdWxkIGFsd2F5cyBiZSBob3Jpem9udGFsXG4gICAgaWYgKG9wdC5vbWl0VHJhbnBvc2UgJiYgZW5jLnkpIHJldHVybiBmYWxzZTtcblxuICAgIC8vIGRvdCBwbG90IHNob3VsZG4ndCBoYXZlIG90aGVyIGVuY29kaW5nXG4gICAgaWYgKG9wdC5vbWl0RG90UGxvdFdpdGhFeHRyYUVuY29kaW5nICYmIHZsLmtleXMoZW5jKS5sZW5ndGggPiAxKSByZXR1cm4gZmFsc2U7XG5cbiAgICAvLyBkb3QgcGxvdCB3aXRoIHNoYXBlIGlzIG5vbi1zZW5zZVxuICAgIGlmIChlbmMuc2hhcGUpIHJldHVybiBmYWxzZTtcbiAgfVxuICByZXR1cm4gdHJ1ZTtcbn1cblxuZnVuY3Rpb24gdGlja1J1bGUoZW5jLCBzdGF0cywgb3B0KSB7XG4gIC8vIGpzaGludCB1bnVzZWQ6ZmFsc2VcbiAgaWYgKGVuYy54IHx8IGVuYy55KSB7XG4gICAgaWYodmwuZW5jLmlzQWdncmVnYXRlKGVuYykpIHJldHVybiBmYWxzZTtcblxuICAgIHZhciB4SXNEaW0gPSBpc0RpbWVuc2lvbihlbmMueCksXG4gICAgICB5SXNEaW0gPSBpc0RpbWVuc2lvbihlbmMueSk7XG5cbiAgICByZXR1cm4gKCF4SXNEaW0gJiYgKCFlbmMueSB8fCBpc09yZGluYWxTY2FsZShlbmMueSkpKSB8fFxuICAgICAgKCF5SXNEaW0gJiYgKCFlbmMueCB8fCBpc09yZGluYWxTY2FsZShlbmMueCkpKTtcbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIGJhclJ1bGUoZW5jLCBzdGF0cywgb3B0KSB7XG4gIGlmKCFmYWNldHNSdWxlKGVuYywgc3RhdHMsIG9wdCkpIHJldHVybiBmYWxzZTtcblxuICAvLyBiYXIgcmVxdWlyZXMgYXQgbGVhc3QgeCBvciB5XG4gIGlmICghZW5jLnggJiYgIWVuYy55KSByZXR1cm4gZmFsc2U7XG5cbiAgaWYgKG9wdC5vbWl0U2l6ZU9uQmFyICYmIGVuYy5zaXplICE9PSB1bmRlZmluZWQpIHJldHVybiBmYWxzZTtcblxuICAvLyBGSVhNRSBhY3R1YWxseSBjaGVjayBpZiB0aGVyZSB3b3VsZCBiZSBvY2NsdXNpb24gIzkwXG4gIC8vIG5lZWQgdG8gYWdncmVnYXRlIG9uIGVpdGhlciB4IG9yIHlcbiAgdmFyIGFnZ0VpdGhlclhvclkgPVxuICAgICghZW5jLnggfHwgZW5jLnguYWdncmVnYXRlID09PSB1bmRlZmluZWQpIF5cbiAgICAoIWVuYy55IHx8IGVuYy55LmFnZ3JlZ2F0ZSA9PT0gdW5kZWZpbmVkKTtcblxuXG4gIGlmIChhZ2dFaXRoZXJYb3JZKSB7XG4gICAgdmFyIGVpdGhlclhvcllpc0RpbU9yTnVsbCA9XG4gICAgICAoIWVuYy54IHx8IGlzRGltZW5zaW9uKGVuYy54KSkgXlxuICAgICAgKCFlbmMueSB8fCBpc0RpbWVuc2lvbihlbmMueSkpO1xuXG4gICAgaWYgKGVpdGhlclhvcllpc0RpbU9yTnVsbCkge1xuICAgICAgdmFyIGFnZ3JlZ2F0ZSA9IGVuYy54LmFnZ3JlZ2F0ZSB8fCBlbmMueS5hZ2dyZWdhdGU7XG4gICAgICByZXR1cm4gIShvcHQub21pdFN0YWNrZWRBdmVyYWdlICYmIGFnZ3JlZ2F0ZSA9PT0nYXZnJyAmJiBlbmMuY29sb3IpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBmYWxzZTtcbn1cblxuZnVuY3Rpb24gbGluZVJ1bGUoZW5jLCBzdGF0cywgb3B0KSB7XG4gIGlmKCFmYWNldHNSdWxlKGVuYywgc3RhdHMsIG9wdCkpIHJldHVybiBmYWxzZTtcblxuICAvLyBUT0RPKGthbml0dyk6IGFkZCBvbWl0VmVydGljYWxMaW5lIGFzIGNvbmZpZ1xuXG4gIC8vIEZJWE1FIHRydWx5IG9yZGluYWwgZGF0YSBpcyBmaW5lIGhlcmUgdG9vLlxuICAvLyBMaW5lIGNoYXJ0IHNob3VsZCBiZSBvbmx5IGhvcml6b250YWxcbiAgLy8gYW5kIHVzZSBvbmx5IHRlbXBvcmFsIGRhdGFcbiAgcmV0dXJuIGVuYy54LnR5cGUgPT0gJ1QnICYmIGVuYy54LnRpbWVVbml0ICYmIGVuYy55LnR5cGUgPT0gJ1EnICYmIGVuYy55LmFnZ3JlZ2F0ZTtcbn1cblxuZnVuY3Rpb24gYXJlYVJ1bGUoZW5jLCBzdGF0cywgb3B0KSB7XG4gIGlmKCFmYWNldHNSdWxlKGVuYywgc3RhdHMsIG9wdCkpIHJldHVybiBmYWxzZTtcblxuICBpZighbGluZVJ1bGUoZW5jLCBzdGF0cywgb3B0KSkgcmV0dXJuIGZhbHNlO1xuXG4gIHJldHVybiAhKG9wdC5vbWl0U3RhY2tlZEF2ZXJhZ2UgJiYgZW5jLnkuYWdncmVnYXRlID09PSdhdmcnICYmIGVuYy5jb2xvcik7XG59XG5cbmZ1bmN0aW9uIHRleHRSdWxlKGVuYywgc3RhdHMsIG9wdCkge1xuICAvLyBhdCBsZWFzdCBtdXN0IGhhdmUgcm93IG9yIGNvbCBhbmQgYWdncmVnYXRlZCB0ZXh0IHZhbHVlc1xuICByZXR1cm4gKGVuYy5yb3cgfHwgZW5jLmNvbCkgJiYgZW5jLnRleHQgJiYgZW5jLnRleHQuYWdncmVnYXRlICYmICFlbmMueCAmJiAhZW5jLnkgJiYgIWVuYy5zaXplICYmXG4gICAgKCFvcHQuYWx3YXlzR2VuZXJhdGVUYWJsZUFzSGVhdG1hcCB8fCAhZW5jLmNvbG9yKTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWwgPSByZXF1aXJlKCcuLi91dGlsJyksXG4gIGNvbnN0cyA9IHJlcXVpcmUoJy4uL2NvbnN0cycpLFxuICB2bCA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93Wyd2bCddIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbFsndmwnXSA6IG51bGwpLFxuICBpc0RpbWVuc2lvbiA9IHZsLmZpZWxkLmlzRGltZW5zaW9uO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHByb2plY3Rpb25zO1xuXG4vLyBUT0RPIHN1cHBvcnQgb3RoZXIgbW9kZSBvZiBwcm9qZWN0aW9ucyBnZW5lcmF0aW9uXG4vLyBwb3dlcnNldCwgY2hvb3NlSywgY2hvb3NlS29yTGVzcyBhcmUgYWxyZWFkeSBpbmNsdWRlZCBpbiB0aGUgdXRpbFxuXG4vKipcbiAqIGZpZWxkc1xuICogQHBhcmFtICB7W3R5cGVdfSBmaWVsZHMgYXJyYXkgb2YgZmllbGRzIGFuZCBxdWVyeSBpbmZvcm1hdGlvblxuICogQHJldHVybiB7W3R5cGVdfSAgICAgICAgW2Rlc2NyaXB0aW9uXVxuICovXG5mdW5jdGlvbiBwcm9qZWN0aW9ucyhmaWVsZHMsIHN0YXRzLCBvcHQpIHtcbiAgb3B0ID0gdmwuc2NoZW1hLnV0aWwuZXh0ZW5kKG9wdHx8e30sIGNvbnN0cy5nZW4ucHJvamVjdGlvbnMpO1xuXG4gIC8vIEZpcnN0IGNhdGVnb3JpemUgZmllbGQsIHNlbGVjdGVkLCBmaWVsZHNUb0FkZCwgYW5kIHNhdmUgaW5kaWNlc1xuICB2YXIgc2VsZWN0ZWQgPSBbXSwgZmllbGRzVG9BZGQgPSBbXSwgZmllbGRTZXRzID0gW10sXG4gICAgaGFzU2VsZWN0ZWREaW1lbnNpb24gPSBmYWxzZSxcbiAgICBoYXNTZWxlY3RlZE1lYXN1cmUgPSBmYWxzZSxcbiAgICBpbmRpY2VzID0ge307XG5cbiAgZmllbGRzLmZvckVhY2goZnVuY3Rpb24oZmllbGQsIGluZGV4KXtcbiAgICAvL3NhdmUgaW5kaWNlcyBmb3Igc3RhYmxlIHNvcnQgbGF0ZXJcbiAgICBpbmRpY2VzW2ZpZWxkLm5hbWVdID0gaW5kZXg7XG5cbiAgICBpZiAoZmllbGQuc2VsZWN0ZWQpIHtcbiAgICAgIHNlbGVjdGVkLnB1c2goZmllbGQpO1xuICAgICAgaWYgKGlzRGltZW5zaW9uKGZpZWxkKSB8fCBmaWVsZC50eXBlID09PSdUJykgeyAvLyBGSVhNRSAvIEhBQ0tcbiAgICAgICAgaGFzU2VsZWN0ZWREaW1lbnNpb24gPSB0cnVlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaGFzU2VsZWN0ZWRNZWFzdXJlID0gdHJ1ZTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGZpZWxkLnNlbGVjdGVkICE9PSBmYWxzZSAmJiAhdmwuZmllbGQuaXNDb3VudChmaWVsZCkpIHtcbiAgICAgIGlmICh2bC5maWVsZC5pc0RpbWVuc2lvbihmaWVsZCkgJiZcbiAgICAgICAgICAhb3B0Lm1heENhcmRpbmFsaXR5Rm9yQXV0b0FkZE9yZGluYWwgJiZcbiAgICAgICAgICB2bC5maWVsZC5jYXJkaW5hbGl0eShmaWVsZCwgc3RhdHMsIDE1KSA+IG9wdC5tYXhDYXJkaW5hbGl0eUZvckF1dG9BZGRPcmRpbmFsXG4gICAgICAgICkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBmaWVsZHNUb0FkZC5wdXNoKGZpZWxkKTtcbiAgICB9XG4gIH0pO1xuXG4gIGZpZWxkc1RvQWRkLnNvcnQoY29tcGFyZUZpZWxkc1RvQWRkKGhhc1NlbGVjdGVkRGltZW5zaW9uLCBoYXNTZWxlY3RlZE1lYXN1cmUsIGluZGljZXMpKTtcblxuICB2YXIgc2V0c1RvQWRkID0gdXRpbC5jaG9vc2VLb3JMZXNzKGZpZWxkc1RvQWRkLCAxKTtcblxuICBzZXRzVG9BZGQuZm9yRWFjaChmdW5jdGlvbihzZXRUb0FkZCkge1xuICAgIHZhciBmaWVsZFNldCA9IHNlbGVjdGVkLmNvbmNhdChzZXRUb0FkZCk7XG4gICAgaWYgKGZpZWxkU2V0Lmxlbmd0aCA+IDApIHtcbiAgICAgIGlmIChvcHQub21pdERvdFBsb3QgJiYgZmllbGRTZXQubGVuZ3RoID09PSAxKSByZXR1cm47XG4gICAgICBmaWVsZFNldHMucHVzaChmaWVsZFNldCk7XG4gICAgfVxuICB9KTtcblxuICBmaWVsZFNldHMuZm9yRWFjaChmdW5jdGlvbihmaWVsZFNldCkge1xuICAgICAgLy8gYWx3YXlzIGFwcGVuZCBwcm9qZWN0aW9uJ3Mga2V5IHRvIGVhY2ggcHJvamVjdGlvbiByZXR1cm5lZCwgZDMgc3R5bGUuXG4gICAgZmllbGRTZXQua2V5ID0gcHJvamVjdGlvbnMua2V5KGZpZWxkU2V0KTtcbiAgfSk7XG5cbiAgcmV0dXJuIGZpZWxkU2V0cztcbn1cblxudmFyIHR5cGVJc01lYXN1cmVTY29yZSA9IHtcbiAgTjogMCxcbiAgTzogMCxcbiAgVDogMixcbiAgUTogM1xufTtcblxuZnVuY3Rpb24gY29tcGFyZUZpZWxkc1RvQWRkKGhhc1NlbGVjdGVkRGltZW5zaW9uLCBoYXNTZWxlY3RlZE1lYXN1cmUsIGluZGljZXMpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKGEsIGIpe1xuICAgIC8vIHNvcnQgYnkgdHlwZSBvZiB0aGUgZGF0YVxuICAgIGlmIChhLnR5cGUgIT09IGIudHlwZSkge1xuICAgICAgaWYgKCFoYXNTZWxlY3RlZERpbWVuc2lvbikge1xuICAgICAgICByZXR1cm4gdHlwZUlzTWVhc3VyZVNjb3JlW2EudHlwZV0gLSB0eXBlSXNNZWFzdXJlU2NvcmVbYi50eXBlXTtcbiAgICAgIH0gZWxzZSB7IC8vaWYgKCFoYXNTZWxlY3RlZE1lYXN1cmUpIHtcbiAgICAgICAgcmV0dXJuIHR5cGVJc01lYXN1cmVTY29yZVtiLnR5cGVdIC0gdHlwZUlzTWVhc3VyZVNjb3JlW2EudHlwZV07XG4gICAgICB9XG4gICAgfVxuICAgIC8vbWFrZSB0aGUgc29ydCBzdGFibGVcbiAgICByZXR1cm4gaW5kaWNlc1thLm5hbWVdIC0gaW5kaWNlc1tiLm5hbWVdO1xuICB9O1xufVxuXG5wcm9qZWN0aW9ucy5rZXkgPSBmdW5jdGlvbihwcm9qZWN0aW9uKSB7XG4gIHJldHVybiBwcm9qZWN0aW9uLm1hcChmdW5jdGlvbihmaWVsZCkge1xuICAgIHJldHVybiB2bC5maWVsZC5pc0NvdW50KGZpZWxkKSA/ICdjb3VudCcgOiBmaWVsZC5uYW1lO1xuICB9KS5qb2luKCcsJyk7XG59O1xuXG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBnID0gZ2xvYmFsIHx8IHdpbmRvdztcblxucmVxdWlyZSgndmVnYS1saXRlL3NyYy9nbG9iYWxzJyk7XG5cbmcuQ0hBUlRfVFlQRVMgPSB7XG4gIFRBQkxFOiAnVEFCTEUnLFxuICBCQVI6ICdCQVInLFxuICBQTE9UOiAnUExPVCcsXG4gIExJTkU6ICdMSU5FJyxcbiAgQVJFQTogJ0FSRUEnLFxuICBNQVA6ICdNQVAnLFxuICBISVNUT0dSQU06ICdISVNUT0dSQU0nXG59O1xuXG5nLkFOWV9EQVRBX1RZUEVTID0gKDEgPDwgNCkgLSAxOyIsIm1vZHVsZS5leHBvcnRzID0ge1xuICBlbmNvZGluZzogcmVxdWlyZSgnLi9yYW5rRW5jb2RpbmdzJylcbn07XG5cblxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5yZXF1aXJlKCcuLi9nbG9iYWxzJyk7XG5cbnZhciB2bCA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93Wyd2bCddIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbFsndmwnXSA6IG51bGwpLFxuICBpc0RpbWVuc2lvbiA9IHZsLmZpZWxkLmlzRGltZW5zaW9uO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHJhbmtFbmNvZGluZ3M7XG5cbi8vIGJhZCBzY29yZSBub3Qgc3BlY2lmaWVkIGluIHRoZSB0YWJsZSBhYm92ZVxudmFyIFVOVVNFRF9QT1NJVElPTiA9IDAuNTtcblxudmFyIE1BUktfU0NPUkUgPSB7XG4gIGxpbmU6IDAuOTksXG4gIGFyZWE6IDAuOTgsXG4gIGJhcjogMC45NyxcbiAgdGljazogMC45NixcbiAgcG9pbnQ6IDAuOTUsXG4gIGNpcmNsZTogMC45NCxcbiAgc3F1YXJlOiAwLjk0LFxuICB0ZXh0OiAwLjhcbn07XG5cbmZ1bmN0aW9uIHJhbmtFbmNvZGluZ3MoZW5jb2RpbmcsIHN0YXRzLCBvcHQsIHNlbGVjdGVkKSB7XG4gIHZhciBmZWF0dXJlcyA9IFtdLFxuICAgIGVuY1R5cGVzID0gdmwua2V5cyhlbmNvZGluZy5lbmNvZGluZyksXG4gICAgbWFya3R5cGUgPSBlbmNvZGluZy5tYXJrdHlwZSxcbiAgICBlbmMgPSBlbmNvZGluZy5lbmNvZGluZztcblxuICB2YXIgZW5jb2RpbmdNYXBwaW5nQnlGaWVsZCA9IHZsLmVuYy5yZWR1Y2UoZW5jb2RpbmcuZW5jb2RpbmcsIGZ1bmN0aW9uKG8sIGZpZWxkLCBlbmNUeXBlKSB7XG4gICAgdmFyIGtleSA9IHZsLmZpZWxkLnNob3J0aGFuZChmaWVsZCk7XG4gICAgdmFyIG1hcHBpbmdzID0gb1trZXldID0gb1trZXldIHx8IFtdO1xuICAgIG1hcHBpbmdzLnB1c2goe2VuY1R5cGU6IGVuY1R5cGUsIGZpZWxkOiBmaWVsZH0pO1xuICAgIHJldHVybiBvO1xuICB9LCB7fSk7XG5cbiAgLy8gZGF0YSAtIGVuY29kaW5nIG1hcHBpbmcgc2NvcmVcbiAgdmwuZm9yRWFjaChlbmNvZGluZ01hcHBpbmdCeUZpZWxkLCBmdW5jdGlvbihtYXBwaW5ncykge1xuICAgIHZhciByZWFzb25zID0gbWFwcGluZ3MubWFwKGZ1bmN0aW9uKG0pIHtcbiAgICAgICAgcmV0dXJuIG0uZW5jVHlwZSArIHZsLnNob3J0aGFuZC5hc3NpZ24gKyB2bC5maWVsZC5zaG9ydGhhbmQobS5maWVsZCkgK1xuICAgICAgICAgICcgJyArIChzZWxlY3RlZCAmJiBzZWxlY3RlZFttLmZpZWxkLm5hbWVdID8gJ1t4XScgOiAnWyBdJyk7XG4gICAgICB9KSxcbiAgICAgIHNjb3JlcyA9IG1hcHBpbmdzLm1hcChmdW5jdGlvbihtKSB7XG4gICAgICAgIHZhciByb2xlID0gdmwuZmllbGQuaXNEaW1lbnNpb24obS5maWVsZCkgPyAnZGltZW5zaW9uJyA6ICdtZWFzdXJlJztcblxuICAgICAgICB2YXIgc2NvcmUgPSByYW5rRW5jb2RpbmdzLnNjb3JlW3JvbGVdKG0uZmllbGQsIG0uZW5jVHlwZSwgZW5jb2RpbmcubWFya3R5cGUsIHN0YXRzLCBvcHQpO1xuXG4gICAgICAgIHJldHVybiAhc2VsZWN0ZWQgfHwgc2VsZWN0ZWRbbS5maWVsZC5uYW1lXSA/IHNjb3JlIDogTWF0aC5wb3coc2NvcmUsIDAuMTI1KTtcbiAgICAgIH0pO1xuXG4gICAgZmVhdHVyZXMucHVzaCh7XG4gICAgICByZWFzb246IHJlYXNvbnMuam9pbihcIiB8IFwiKSxcbiAgICAgIHNjb3JlOiBNYXRoLm1heC5hcHBseShudWxsLCBzY29yZXMpXG4gICAgfSk7XG4gIH0pO1xuXG4gIC8vIHBsb3QgdHlwZVxuICBpZiAobWFya3R5cGUgPT09IFRFWFQpIHtcbiAgICAvLyBUT0RPXG4gIH0gZWxzZSB7XG4gICAgaWYgKGVuYy54ICYmIGVuYy55KSB7XG4gICAgICBpZiAoaXNEaW1lbnNpb24oZW5jLngpIF4gaXNEaW1lbnNpb24oZW5jLnkpKSB7XG4gICAgICAgIGZlYXR1cmVzLnB1c2goe1xuICAgICAgICAgIHJlYXNvbjogJ094USBwbG90JyxcbiAgICAgICAgICBzY29yZTogMC44XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIHBlbmFsaXplIG5vdCB1c2luZyBwb3NpdGlvbmFsIG9ubHkgcGVuYWxpemUgZm9yIG5vbi10ZXh0XG4gIGlmIChlbmNUeXBlcy5sZW5ndGggPiAxICYmIG1hcmt0eXBlICE9PSBURVhUKSB7XG4gICAgaWYgKCghZW5jLnggfHwgIWVuYy55KSAmJiAhZW5jLmdlbyAmJiAhZW5jLnRleHQpIHtcbiAgICAgIGZlYXR1cmVzLnB1c2goe1xuICAgICAgICByZWFzb246ICd1bnVzZWQgcG9zaXRpb24nLFxuICAgICAgICBzY29yZTogVU5VU0VEX1BPU0lUSU9OXG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICAvLyBtYXJrIHR5cGUgc2NvcmVcbiAgZmVhdHVyZXMucHVzaCh7XG4gICAgcmVhc29uOiAnbWFya3R5cGU9JyttYXJrdHlwZSxcbiAgICBzY29yZTogTUFSS19TQ09SRVttYXJrdHlwZV1cbiAgfSk7XG5cbiAgcmV0dXJuIHtcbiAgICBzY29yZTogZmVhdHVyZXMucmVkdWNlKGZ1bmN0aW9uKHAsIGYpIHtcbiAgICAgIHJldHVybiBwICogZi5zY29yZTtcbiAgICB9LCAxKSxcbiAgICBmZWF0dXJlczogZmVhdHVyZXNcbiAgfTtcbn1cblxuXG52YXIgRCA9IHt9LCBNID0ge30sIEJBRCA9IDAuMSwgVEVSUklCTEUgPSAwLjAxO1xuXG5ELm1pbm9yID0gMC4wMTtcbkQucG9zID0gMTtcbkQuWV9UID0gMC44O1xuRC5mYWNldF90ZXh0ID0gMTtcbkQuZmFjZXRfZ29vZCA9IDAuNjc1OyAvLyA8IGNvbG9yX29rLCA+IGNvbG9yX2JhZFxuRC5mYWNldF9vayA9IDAuNTU7XG5ELmZhY2V0X2JhZCA9IDAuNDtcbkQuY29sb3JfZ29vZCA9IDAuNztcbkQuY29sb3Jfb2sgPSAwLjY1OyAvLyA+IE0uU2l6ZVxuRC5jb2xvcl9iYWQgPSAwLjM7XG5ELmNvbG9yX3N0YWNrID0gMC42O1xuRC5zaGFwZSA9IDAuNjtcbkQuZGV0YWlsID0gMC41O1xuRC5iYWQgPSBCQUQ7XG5ELnRlcnJpYmxlID0gVEVSUklCTEU7XG5cbk0ucG9zID0gMTtcbk0uc2l6ZSA9IDAuNjtcbk0uY29sb3IgPSAwLjU7XG5NLnRleHQgPSAwLjQ7XG5NLmJhZCA9IEJBRDtcbk0udGVycmlibGUgPSBURVJSSUJMRTtcblxucmFua0VuY29kaW5ncy5kaW1lbnNpb25TY29yZSA9IGZ1bmN0aW9uIChmaWVsZCwgZW5jVHlwZSwgbWFya3R5cGUsIHN0YXRzLCBvcHQpe1xuICB2YXIgY2FyZGluYWxpdHkgPSB2bC5maWVsZC5jYXJkaW5hbGl0eShmaWVsZCwgc3RhdHMpO1xuICBzd2l0Y2ggKGVuY1R5cGUpIHtcbiAgICBjYXNlIFg6XG4gICAgICBpZiAodmwuZmllbGQuaXNUeXBlcyhmaWVsZCwgW04sIE9dKSkgIHJldHVybiBELnBvcyAtIEQubWlub3I7XG4gICAgICByZXR1cm4gRC5wb3M7XG5cbiAgICBjYXNlIFk6XG4gICAgICBpZiAodmwuZmllbGQuaXNUeXBlcyhmaWVsZCwgW04sIE9dKSkgcmV0dXJuIEQucG9zIC0gRC5taW5vcjsgLy9wcmVmZXIgb3JkaW5hbCBvbiB5XG4gICAgICBpZihmaWVsZC50eXBlID09PSBUKSByZXR1cm4gRC5ZX1Q7IC8vIHRpbWUgc2hvdWxkIG5vdCBiZSBvbiBZXG4gICAgICByZXR1cm4gRC5wb3MgLSBELm1pbm9yO1xuXG4gICAgY2FzZSBDT0w6XG4gICAgICBpZiAobWFya3R5cGUgPT09IFRFWFQpIHJldHVybiBELmZhY2V0X3RleHQ7XG4gICAgICAvL3ByZWZlciBjb2x1bW4gb3ZlciByb3cgZHVlIHRvIHNjcm9sbGluZyBpc3N1ZXNcbiAgICAgIHJldHVybiBjYXJkaW5hbGl0eSA8PSBvcHQubWF4R29vZENhcmRpbmFsaXR5Rm9yRmFjZXRzID8gRC5mYWNldF9nb29kIDpcbiAgICAgICAgY2FyZGluYWxpdHkgPD0gb3B0Lm1heENhcmRpbmFsaXR5Rm9yRmFjZXRzID8gRC5mYWNldF9vayA6IEQuZmFjZXRfYmFkO1xuXG4gICAgY2FzZSBST1c6XG4gICAgICBpZiAobWFya3R5cGUgPT09IFRFWFQpIHJldHVybiBELmZhY2V0X3RleHQ7XG4gICAgICByZXR1cm4gKGNhcmRpbmFsaXR5IDw9IG9wdC5tYXhHb29kQ2FyZGluYWxpdHlGb3JGYWNldHMgPyBELmZhY2V0X2dvb2QgOlxuICAgICAgICBjYXJkaW5hbGl0eSA8PSBvcHQubWF4Q2FyZGluYWxpdHlGb3JGYWNldHMgPyBELmZhY2V0X29rIDogRC5mYWNldF9iYWQpIC0gRC5taW5vcjtcblxuICAgIGNhc2UgQ09MT1I6XG4gICAgICB2YXIgaGFzT3JkZXIgPSAoZmllbGQuYmluICYmIGZpZWxkLnR5cGU9PT1RKSB8fCAoZmllbGQudGltZVVuaXQgJiYgZmllbGQudHlwZT09PVQpO1xuXG4gICAgICAvL0ZJWE1FIGFkZCBzdGFja2luZyBvcHRpb24gb25jZSB3ZSBoYXZlIGNvbnRyb2wgLi5cbiAgICAgIHZhciBpc1N0YWNrZWQgPSBtYXJrdHlwZSA9PT0gJ2JhcicgfHwgbWFya3R5cGUgPT09ICdhcmVhJztcblxuICAgICAgLy8gdHJ1ZSBvcmRpbmFsIG9uIGNvbG9yIGlzIGN1cnJlbnRseSBCQUQgKHVudGlsIHdlIGhhdmUgZ29vZCBvcmRpbmFsIGNvbG9yIHNjYWxlIHN1cHBvcnQpXG4gICAgICBpZiAoaGFzT3JkZXIpIHJldHVybiBELmNvbG9yX2JhZDtcblxuICAgICAgLy9zdGFja2luZyBnZXRzIGxvd2VyIHNjb3JlXG4gICAgICBpZiAoaXNTdGFja2VkKSByZXR1cm4gRC5jb2xvcl9zdGFjaztcblxuICAgICAgcmV0dXJuIGNhcmRpbmFsaXR5IDw9IG9wdC5tYXhHb29kQ2FyZGluYWxpdHlGb3JDb2xvciA/IEQuY29sb3JfZ29vZDogY2FyZGluYWxpdHkgPD0gb3B0Lm1heENhcmRpbmFsaXR5Rm9yQ29sb3IgPyBELmNvbG9yX29rIDogRC5jb2xvcl9iYWQ7XG4gICAgY2FzZSBTSEFQRTpcbiAgICAgIHJldHVybiBjYXJkaW5hbGl0eSA8PSBvcHQubWF4Q2FyZGluYWxpdHlGb3JTaGFwZSA/IEQuc2hhcGUgOiBURVJSSUJMRTtcbiAgICBjYXNlIERFVEFJTDpcbiAgICAgIHJldHVybiBELmRldGFpbDtcbiAgfVxuICByZXR1cm4gVEVSUklCTEU7XG59O1xuXG5yYW5rRW5jb2RpbmdzLmRpbWVuc2lvblNjb3JlLmNvbnN0cyA9IEQ7XG5cbnJhbmtFbmNvZGluZ3MubWVhc3VyZVNjb3JlID0gZnVuY3Rpb24gKGZpZWxkLCBlbmNUeXBlLCBtYXJrdHlwZSwgc3RhdHMsIG9wdCkge1xuICAvLyBqc2hpbnQgdW51c2VkOmZhbHNlXG4gIHN3aXRjaCAoZW5jVHlwZSl7XG4gICAgY2FzZSBYOiByZXR1cm4gTS5wb3M7XG4gICAgY2FzZSBZOiByZXR1cm4gTS5wb3M7XG4gICAgY2FzZSBTSVpFOlxuICAgICAgaWYgKG1hcmt0eXBlID09PSAnYmFyJykgcmV0dXJuIEJBRDsgLy9zaXplIG9mIGJhciBpcyB2ZXJ5IGJhZFxuICAgICAgaWYgKG1hcmt0eXBlID09PSBURVhUKSByZXR1cm4gQkFEO1xuICAgICAgaWYgKG1hcmt0eXBlID09PSAnbGluZScpIHJldHVybiBCQUQ7XG4gICAgICByZXR1cm4gTS5zaXplO1xuICAgIGNhc2UgQ09MT1I6IHJldHVybiBNLmNvbG9yO1xuICAgIGNhc2UgVEVYVDogcmV0dXJuIE0udGV4dDtcbiAgfVxuICByZXR1cm4gQkFEO1xufTtcblxucmFua0VuY29kaW5ncy5tZWFzdXJlU2NvcmUuY29uc3RzID0gTTtcblxuXG5yYW5rRW5jb2RpbmdzLnNjb3JlID0ge1xuICBkaW1lbnNpb246IHJhbmtFbmNvZGluZ3MuZGltZW5zaW9uU2NvcmUsXG4gIG1lYXN1cmU6IHJhbmtFbmNvZGluZ3MubWVhc3VyZVNjb3JlLFxufTtcbiIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgY29uc3RzID0gcmVxdWlyZSgnLi9jb25zdHMnKTtcblxudmFyIHV0aWwgPSBtb2R1bGUuZXhwb3J0cyA9IHtcbiAgZ2VuOiB7fVxufTtcblxudXRpbC5pc0FycmF5ID0gQXJyYXkuaXNBcnJheSB8fCBmdW5jdGlvbiAob2JqKSB7XG4gIHJldHVybiB7fS50b1N0cmluZy5jYWxsKG9iaikgPT0gJ1tvYmplY3QgQXJyYXldJztcbn07XG5cbnV0aWwuanNvbiA9IGZ1bmN0aW9uKHMsIHNwKSB7XG4gIHJldHVybiBKU09OLnN0cmluZ2lmeShzLCBudWxsLCBzcCk7XG59O1xuXG51dGlsLmtleXMgPSBmdW5jdGlvbihvYmopIHtcbiAgdmFyIGsgPSBbXSwgeDtcbiAgZm9yICh4IGluIG9iaikgay5wdXNoKHgpO1xuICByZXR1cm4gaztcbn07XG5cbnV0aWwubmVzdGVkTWFwID0gZnVuY3Rpb24gKGNvbCwgZiwgbGV2ZWwsIGZpbHRlcikge1xuICByZXR1cm4gbGV2ZWwgPT09IDAgP1xuICAgIGNvbC5tYXAoZikgOlxuICAgIGNvbC5tYXAoZnVuY3Rpb24odikge1xuICAgICAgdmFyIHIgPSB1dGlsLm5lc3RlZE1hcCh2LCBmLCBsZXZlbCAtIDEpO1xuICAgICAgcmV0dXJuIGZpbHRlciA/IHIuZmlsdGVyKHV0aWwubm9uRW1wdHkpIDogcjtcbiAgICB9KTtcbn07XG5cbnV0aWwubmVzdGVkUmVkdWNlID0gZnVuY3Rpb24gKGNvbCwgZiwgbGV2ZWwsIGZpbHRlcikge1xuICByZXR1cm4gbGV2ZWwgPT09IDAgP1xuICAgIGNvbC5yZWR1Y2UoZiwgW10pIDpcbiAgICBjb2wubWFwKGZ1bmN0aW9uKHYpIHtcbiAgICAgIHZhciByID0gdXRpbC5uZXN0ZWRSZWR1Y2UodiwgZiwgbGV2ZWwgLSAxKTtcbiAgICAgIHJldHVybiBmaWx0ZXIgPyByLmZpbHRlcih1dGlsLm5vbkVtcHR5KSA6IHI7XG4gICAgfSk7XG59O1xuXG51dGlsLm5vbkVtcHR5ID0gZnVuY3Rpb24oZ3JwKSB7XG4gIHJldHVybiAhdXRpbC5pc0FycmF5KGdycCkgfHwgZ3JwLmxlbmd0aCA+IDA7XG59O1xuXG5cbnV0aWwudHJhdmVyc2UgPSBmdW5jdGlvbiAobm9kZSwgYXJyKSB7XG4gIGlmIChub2RlLnZhbHVlICE9PSB1bmRlZmluZWQpIHtcbiAgICBhcnIucHVzaChub2RlLnZhbHVlKTtcbiAgfSBlbHNlIHtcbiAgICBpZiAobm9kZS5sZWZ0KSB1dGlsLnRyYXZlcnNlKG5vZGUubGVmdCwgYXJyKTtcbiAgICBpZiAobm9kZS5yaWdodCkgdXRpbC50cmF2ZXJzZShub2RlLnJpZ2h0LCBhcnIpO1xuICB9XG4gIHJldHVybiBhcnI7XG59O1xuXG51dGlsLnVuaW9uID0gZnVuY3Rpb24gKGEsIGIpIHtcbiAgdmFyIG8gPSB7fTtcbiAgYS5mb3JFYWNoKGZ1bmN0aW9uKHgpIHsgb1t4XSA9IHRydWU7fSk7XG4gIGIuZm9yRWFjaChmdW5jdGlvbih4KSB7IG9beF0gPSB0cnVlO30pO1xuICByZXR1cm4gdXRpbC5rZXlzKG8pO1xufTtcblxuXG51dGlsLmdlbi5nZXRPcHQgPSBmdW5jdGlvbiAob3B0KSB7XG4gIC8vbWVyZ2Ugd2l0aCBkZWZhdWx0XG4gIHJldHVybiAob3B0ID8gdXRpbC5rZXlzKG9wdCkgOiBbXSkucmVkdWNlKGZ1bmN0aW9uKGMsIGspIHtcbiAgICBjW2tdID0gb3B0W2tdO1xuICAgIHJldHVybiBjO1xuICB9LCBPYmplY3QuY3JlYXRlKGNvbnN0cy5nZW4uREVGQVVMVF9PUFQpKTtcbn07XG5cbi8qKlxuICogcG93ZXJzZXQgY29kZSBmcm9tIGh0dHA6Ly9yb3NldHRhY29kZS5vcmcvd2lraS9Qb3dlcl9TZXQjSmF2YVNjcmlwdFxuICpcbiAqICAgdmFyIHJlcyA9IHBvd2Vyc2V0KFsxLDIsMyw0XSk7XG4gKlxuICogcmV0dXJuc1xuICpcbiAqIFtbXSxbMV0sWzJdLFsxLDJdLFszXSxbMSwzXSxbMiwzXSxbMSwyLDNdLFs0XSxbMSw0XSxcbiAqIFsyLDRdLFsxLDIsNF0sWzMsNF0sWzEsMyw0XSxbMiwzLDRdLFsxLDIsMyw0XV1cbltlZGl0XVxuKi9cblxudXRpbC5wb3dlcnNldCA9IGZ1bmN0aW9uKGxpc3QpIHtcbiAgdmFyIHBzID0gW1xuICAgIFtdXG4gIF07XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7IGkrKykge1xuICAgIGZvciAodmFyIGogPSAwLCBsZW4gPSBwcy5sZW5ndGg7IGogPCBsZW47IGorKykge1xuICAgICAgcHMucHVzaChwc1tqXS5jb25jYXQobGlzdFtpXSkpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcHM7XG59O1xuXG51dGlsLmNob29zZUtvckxlc3MgPSBmdW5jdGlvbihsaXN0LCBrKSB7XG4gIHZhciBzdWJzZXQgPSBbW11dO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGxpc3QubGVuZ3RoOyBpKyspIHtcbiAgICBmb3IgKHZhciBqID0gMCwgbGVuID0gc3Vic2V0Lmxlbmd0aDsgaiA8IGxlbjsgaisrKSB7XG4gICAgICB2YXIgc3ViID0gc3Vic2V0W2pdLmNvbmNhdChsaXN0W2ldKTtcbiAgICAgIGlmKHN1Yi5sZW5ndGggPD0gayl7XG4gICAgICAgIHN1YnNldC5wdXNoKHN1Yik7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiBzdWJzZXQ7XG59O1xuXG51dGlsLmNob29zZUsgPSBmdW5jdGlvbihsaXN0LCBrKSB7XG4gIHZhciBzdWJzZXQgPSBbW11dO1xuICB2YXIga0FycmF5ID1bXTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgZm9yICh2YXIgaiA9IDAsIGxlbiA9IHN1YnNldC5sZW5ndGg7IGogPCBsZW47IGorKykge1xuICAgICAgdmFyIHN1YiA9IHN1YnNldFtqXS5jb25jYXQobGlzdFtpXSk7XG4gICAgICBpZihzdWIubGVuZ3RoIDwgayl7XG4gICAgICAgIHN1YnNldC5wdXNoKHN1Yik7XG4gICAgICB9ZWxzZSBpZiAoc3ViLmxlbmd0aCA9PT0gayl7XG4gICAgICAgIGtBcnJheS5wdXNoKHN1Yik7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiBrQXJyYXk7XG59O1xuXG51dGlsLmNyb3NzID0gZnVuY3Rpb24oYSxiKXtcbiAgdmFyIHggPSBbXTtcbiAgZm9yKHZhciBpPTA7IGk8IGEubGVuZ3RoOyBpKyspe1xuICAgIGZvcih2YXIgaj0wO2o8IGIubGVuZ3RoOyBqKyspe1xuICAgICAgeC5wdXNoKGFbaV0uY29uY2F0KGJbal0pKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHg7XG59O1xuXG4iLCIndXNlIHN0cmljdCc7XG5cbi8vIGRlY2xhcmUgZ2xvYmFsIGNvbnN0YW50XG52YXIgZyA9IGdsb2JhbCB8fCB3aW5kb3c7XG5cbmcuVEFCTEUgPSAndGFibGUnO1xuZy5SQVcgPSAncmF3JztcbmcuU1RBQ0tFRCA9ICdzdGFja2VkJztcbmcuSU5ERVggPSAnaW5kZXgnO1xuXG5nLlggPSAneCc7XG5nLlkgPSAneSc7XG5nLlJPVyA9ICdyb3cnO1xuZy5DT0wgPSAnY29sJztcbmcuU0laRSA9ICdzaXplJztcbmcuU0hBUEUgPSAnc2hhcGUnO1xuZy5DT0xPUiA9ICdjb2xvcic7XG5nLlRFWFQgPSAndGV4dCc7XG5nLkRFVEFJTCA9ICdkZXRhaWwnO1xuXG5nLk4gPSAnTic7XG5nLk8gPSAnTyc7XG5nLlEgPSAnUSc7XG5nLlQgPSAnVCc7XG4iXX0=
