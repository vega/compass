(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.cp = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

},{}],2:[function(require,module,exports){
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
"use strict";

module.exports = cluster;

var vlShorthand = require('vega-lite/src/shorthand'),
  clusterfck = require('clusterfck'),
  consts = require('./clusterconsts'),
  util = require('../util');

cluster.distance = require('./distance');

function cluster(specs, opt) {
  // jshint unused:false
  var dist = cluster.distance.table(specs);

  var clusterTrees = clusterfck.hcluster(specs, function(e1, e2) {
    var s1 = vlShorthand.shorten(e1),
      s2 = vlShorthand.shorten(e2);
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
},{"../util":19,"./clusterconsts":7,"./distance":8,"clusterfck":2,"vega-lite/src/shorthand":52}],7:[function(require,module,exports){
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

c.DIST_BY_CHANNEL = [
  // positional
  ['x', 'y', c.SWAPPABLE],
  ['row', 'column', c.SWAPPABLE],

  // ordinal mark properties
  ['color', 'shape', c.SWAPPABLE],
  ['color', 'detail', c.SWAPPABLE],
  ['detail', 'shape', c.SWAPPABLE],

  // quantitative mark properties
  ['size', 'color', c.SWAPPABLE]
].reduce(reduceTupleToTable, {});

},{}],8:[function(require,module,exports){
'use strict';

var vlSpec = require('vega-lite/src/spec'),
  vlShorthand = require('vega-lite/src/shorthand'),
  consts = require('./clusterconsts'),
  util = require('../util');

var distance = {};
module.exports = distance;

distance.table = function (specs) {
  var len = specs.length,
    extendedSpecs = specs.map(function(e) { return distance.extendSpecWithChannelByColumnName(e); }),
    shorthands = specs.map(vlShorthand.shorten),
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
  var cols = util.union(util.keys(extendedSpec1.channelByField), util.keys(extendedSpec2.channelByField)),
    dist = 0;

  cols.forEach(function(column) {
    var e1 = extendedSpec1.channelByField[column], e2 = extendedSpec2.channelByField[column];

    if (e1 && e2) {
      if (e1.channel != e2.channel) {
        dist += (consts.DIST_BY_CHANNEL[e1.channel] || {})[e2.channel] || 1;
      }
    } else {
      dist += consts.DIST_MISSING;
    }
  });

  // do not group stacked chart with similar non-stacked chart!
  var isStack1 = vlSpec.isStack(extendedSpec1),
    isStack2 = vlSpec.isStack(extendedSpec2);

  if (isStack1 || isStack2) {
    if (isStack1 && isStack2) {
      if ((extendedSpec1.encoding.color && extendedSpec2.encoding.color &&
          extendedSpec1.encoding.color.field !== extendedSpec2.encoding.color.field) ||
          (extendedSpec1.encoding.detail && extendedSpec2.encoding.detail &&
          extendedSpec1.encoding.detail.field !== extendedSpec2.encoding.detail.field)
         ) {
        dist+=1;
      }
    } else {
      dist+=1; // surely different
    }
  }
  return dist;
};

// get encoding type by fieldname
distance.extendSpecWithChannelByColumnName = function(spec) {
  var _channelByField = {},
    encoding = spec.encoding;

  util.keys(encoding).forEach(function(channel) {
    var e = util.duplicate(encoding[channel]);
    e.channel = channel;
    _channelByField[e.field || ''] = e;
    delete e.field;
  });

  return {
    mark: spec.mark,
    channelByField: _channelByField,
    encoding: spec.encoding
  };
};
},{"../util":19,"./clusterconsts":7,"vega-lite/src/shorthand":52,"vega-lite/src/spec":53}],9:[function(require,module,exports){
'use strict';

var consts = module.exports = {
  gen: {},
  cluster: {},
  rank: {}
};

consts.X = 'x';
consts.Y = 'y';
consts.ROW = 'row';
consts.COL = 'column';
consts.SIZE = 'size';
consts.SHAPE = 'shape';
consts.COLOR = 'color';
consts.TEXT = 'text';
consts.DETAIL = 'detail';


// rename these
consts.Type = {};
consts.Type.Nominal = 'nominal';
consts.Type.Ordinal = 'ordinal';
consts.Type.Quantitative = 'quantitative';
consts.Type.Temporal = 'temporal';


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
      description: 'max cardinality for an ordinal variable to be considered for auto adding'
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
      description: 'minimum cardinality of an ordinal variable if we were to bin'
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
    markList: {
      type: 'array',
      items: {type: 'string'},
      default: ['point', 'bar', 'line', 'area', 'text', 'tick'], //filled_map
      description: 'allowed marks'
    },
    encodingTypeList: {
      type: 'array',
      items: {type: 'string'},
      default: ['x', 'y', 'row', 'column', 'size', 'color', 'text', 'detail'],
      description: 'allowed encoding types'
    },
    requiredEncodings: {
      type: 'object',
      default: undefined,
      description: 'required encodings for each mark type'
    },
    supportedEncodings: {
      type: 'object',
      default: undefined,
      description: 'supported encoding for each mark type'
    },
    // TODO: is this used in generation?
    maxGoodCardinalityForFacets: {
      type: 'integer',
      default: 5,
      description: 'maximum cardinality of an ordinal variable to be put on facet (row/column) effectively'
    },
    maxCardinalityForFacets: {
      type: 'integer',
      default: 20,
      description: 'maximum cardinality of an ordinal variable to be put on facet (row/column)'
    },
    maxGoodCardinalityForColor: {
      type: 'integer',
      default: 7,
      description: 'maximum cardinality of an ordinal variable to be put on color effectively'
    },
    maxCardinalityForColor: {
      type: 'integer',
      default: 20,
      description: 'maximum cardinality of an ordinal variable to be put on color'
    },
    maxCardinalityForShape: {
      type: 'integer',
      default: 6,
      description: 'maximum cardinality of an ordinal variable to be put on shape'
    },
    omitTranpose:  {
      type: 'boolean',
      default: true,
      description: 'Eliminate all transpose by (1) keeping horizontal dot plot only (2) for OxQ charts, always put O on Y (3) show only one DxD, MxM (currently sorted by name)'
    },
    // TODO: create chart type name
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
    // TODO: revise
    omitNonTextAggrWithAllDimsOnFacets: {
      type: 'boolean',
      default: true,
      description: 'remove all aggregated charts (except text tables) with all dims on facets (row, column)'
    },
    // TODO: revise
    omitOneDimensionCount: {
      type: 'boolean',
      default: false,
      description: 'omit one dimension count'
    },
    // TODO remove this and merge with supportedEncodings
    omitSizeOnBar: {
      type: 'boolean',
      default: false,
      description: 'do not use bar\'s size'
    },
    // TODO: change to omit non-summative stack
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



},{"./cluster/cluster":6,"./consts":9,"./gen/gen":13,"./rank/rank":17,"./util":19}],11:[function(require,module,exports){
'use strict';

var vlFieldDef = require('vega-lite/src/fielddef');
var vlSchemaUtil = require('vega-lite/src/schema/schemautil');
var vlShorthand = require('vega-lite/src/shorthand');

var consts = require('../consts');
var Type = consts.Type;
var util = require('../util');

var AUTO = '*';

module.exports = genAggregates;


function genAggregates(output, fieldDefs, stats, opt) {
  opt = vlSchemaUtil.extend(opt||{}, consts.gen.aggregates);
  var tf = new Array(fieldDefs.length);
  var hasNorO = util.any(fieldDefs, function(f) {
    return f.type === Type.Nominal || f.type == Type.Ordinal;
  });

  function emit(fieldSet) {
    fieldSet = util.duplicate(fieldSet);
    fieldSet.key = fieldSet.map(function(fieldDef) {
      return vlShorthand.shortenFieldDef(fieldDef);
    }).join(vlShorthand.DELIM);
    output.push(fieldSet);
  }

  function checkAndPush() {
    if (opt.omitMeasureOnly || opt.omitDimensionOnly) {
      var hasMeasure = false, hasDimension = false, hasRaw = false;
      tf.forEach(function(f) {
        if (vlFieldDef.isDimension(f)) {
          hasDimension = true;
        } else {
          hasMeasure = true;
          if (!f.aggregate) hasRaw = true;
        }
      });
      if (!hasDimension && !hasRaw && opt.omitMeasureOnly) return;
      if (!hasMeasure) {
        if (opt.addCountForDimensionOnly) {
          tf.push(vlFieldDef.count());
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

    tf[i] = {field: f.field, type: f.type};

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

      if ((!opt.consistentAutoQ || util.isin(autoMode, [AUTO, 'bin', 'cast', 'autocast'])) && !hasNorO) {
        var highCardinality = vlFieldDef.cardinality(f, stats) > opt.minCardinalityForBin;

        var isAuto = opt.genDimQ === 'auto',
          genBin = opt.genDimQ  === 'bin' || (isAuto && highCardinality),
          genCast = opt.genDimQ === 'cast' || (isAuto && !highCardinality);

        if (genBin && util.isin(autoMode, [AUTO, 'bin', 'autocast'])) {
          assignBinQ(i, hasAggr, isAuto ? 'autocast' : 'bin');
        }
        if (genCast && util.isin(autoMode, [AUTO, 'cast', 'autocast'])) {
          tf[i].type = Type.Ordinal;
          assignField(i + 1, hasAggr, isAuto ? 'autocast' : 'cast');
          tf[i].type = Type.Quantitative;
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
    tf[i] = {field: f.field, type: f.type};

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
      case Type.Quantitative:
        assignQ(i, hasAggr, autoMode);
        break;

      case Type.Temporal:
        assignT(i, hasAggr, autoMode);
        break;
      case Type.Ordinal:
        /* falls through */
      case Type.Nominal:
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

},{"../consts":9,"../util":19,"vega-lite/src/fielddef":35,"vega-lite/src/schema/schemautil":50,"vega-lite/src/shorthand":52}],12:[function(require,module,exports){
"use strict";

var vlFieldDef = require('vega-lite/src/fielddef');
var vlEncoding = require('vega-lite/src/encoding');
var util = require('../util');

var genMarks = require('./marks'),
  isDimension = vlFieldDef.isDimension,
  isMeasure = vlFieldDef.isMeasure;

var consts = require('../consts');
var Type = consts.Type;

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
  column: {
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

  return vlFieldDef.isMeasure(fieldDef) ||
    vlFieldDef.cardinality(fieldDef, stats) <= opt.maxCardinalityForColor;
}

function shapeRules(encoding, fieldDef, stats, opt) {
  if(!retinalEncRules(encoding, fieldDef, stats, opt)) return false;

  if (fieldDef.bin && fieldDef.type === Type.Quantitative) return false;
  if (fieldDef.timeUnit && fieldDef.type === Type.Temporal) return false;
  return vlFieldDef.cardinality(fieldDef, stats) <= opt.maxCardinalityForColor;
}

function dimMeaTransposeRule(encoding) {
  // create horizontal histogram for ordinal
  if ((encoding.y.type === Type.Nominal || encoding.y.type === Type.Ordinal) && isMeasure(encoding.x)) {
    return true;
  }

  // vertical histogram for Q and T
  if (isMeasure(encoding.y) &&
      !(encoding.x.type === Type.Nominal || encoding.x.type === Type.Ordinal) &&
      isDimension(encoding.x)
      ) {
    return true;
  }

  return false;
}

function generalRules(encoding, stats, opt) {
  // encoding.text is only used for TEXT TABLE
  if (encoding.text) {
    return genMarks.satisfyRules(encoding, 'text', stats, opt);
  }

  // CARTESIAN PLOT OR MAP
  if (encoding.x || encoding.y || encoding.geo || encoding.arc) {

    if (encoding.row || encoding.column) { //have facet(s)

      // don't use facets before filling up x,y
      if (!encoding.x || !encoding.y) return false;

      if (opt.omitNonTextAggrWithAllDimsOnFacets) {
        // remove all aggregated charts with all dims on facets (row, column)
        if (genEncodings.isAggrWithAllDimOnFacets(encoding)) return false;
      }
    }

    if (encoding.x && encoding.y) {
      var isDimX = !!isDimension(encoding.x),
        isDimY = !!isDimension(encoding.y);

      if (isDimX && isDimY && !vlEncoding.isAggregate(encoding)) {
        // FIXME actually check if there would be occlusion #90
        return false;
      }

      if (opt.omitTranpose) {
        if (isDimX ^ isDimY) { // dim x mea
          if (!dimMeaTransposeRule(encoding)) {
            return false;
          }
        } else if (encoding.y.type=== Type.Temporal|| encoding.x.type === Type.Temporal) {
          if (encoding.y.type=== Type.Temporal && encoding.x.type !== Type.Temporal) {
            return false;
          }
        } else { // show only one OxO, QxQ
          if (encoding.x.field > encoding.y.field) {
            return false;
          }
        }
      }
      return true;
    }

    // DOT PLOTS
    // // plot with one axis = dot plot
    if (opt.omitDotPlot) {
      return false;
    }

    // Dot plot should always be horizontal
    if (opt.omitTranpose && encoding.y) {
      return false;
    }

    // dot plot shouldn't have other encoding
    if (opt.omitDotPlotWithExtraEncoding && util.keys(encoding).length > 1) {
      return false;
    }

    if (opt.omitOneDimensionCount) {
      // one dimension "count"
      if (encoding.x && encoding.x.aggregate == 'count' && !encoding.y) {
        return false;
      }
      if (encoding.y && encoding.y.aggregate == 'count' && !encoding.x) {
        return false;
      }
    }

    return true;
  }
  return false;
}

genEncodings.isAggrWithAllDimOnFacets = function (encoding) {
  var hasAggr = false, hasOtherO = false;
  for (var channel in encoding) {
    var fieldDef = encoding[channel];
    if (fieldDef.aggregate) {
      hasAggr = true;
    }
    if (vlFieldDef.isDimension(fieldDef) && (channel !== consts.ROW && channel !== consts.COL)) {
      hasOtherO = true;
    }
    if (hasAggr && hasOtherO) break;
  }

  return hasAggr && !hasOtherO;
};


function genEncodings(encodings, fieldDefs, stats, opt) {
  // generate a collection vega-lite's encoding
  var tmpEncoding = {};

  function assignField(i) {
    // If all fields are assigned, save
    if (i === fieldDefs.length) {
      // at the minimal all chart should have x, y, geo, text or arc
      if (generalRules(tmpEncoding, stats, opt)) {
        encodings.push(util.duplicate(tmpEncoding));
      }
      return;
    }

    // Otherwise, assign i-th field
    var fieldDef = fieldDefs[i];
    for (var j in opt.encodingTypeList) {
      var channel = opt.encodingTypeList[j],
        isDim = isDimension(fieldDef);

      //TODO: support "multiple" assignment
      if (!(channel in tmpEncoding) && // encoding not used
        ((isDim && rules[channel].dimension) || (!isDim && rules[channel].measure)) &&
        (!rules[channel].rules || rules[channel].rules(tmpEncoding, fieldDef, stats, opt))
      ) {
        tmpEncoding[channel] = fieldDef;
        assignField(i + 1);
        delete tmpEncoding[channel];
      }
    }
  }

  assignField(0);

  return encodings;
}

},{"../consts":9,"../util":19,"./marks":14,"vega-lite/src/encoding":34,"vega-lite/src/fielddef":35}],13:[function(require,module,exports){
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
  marks: require('./marks')
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
      return gen.marks(output, encoding, opt, config);
    }, level, true);
  } else {
    charts = util.nestedMap(encodings, function(encoding) {
      return gen.marks([], encoding, opt, config);
    }, level, true);
    level += 1;
  }
  return charts;
};
},{"../util":19,"./aggregates":11,"./encodings":12,"./marks":14,"./projections":15,"./specs":16}],14:[function(require,module,exports){
"use strict";

var vlEncoding = require('vega-lite/src/encoding');
var vlFieldDef = require('vega-lite/src/fielddef');
var vlValidate = require('vega-lite/src/validate');

var isDimension = vlFieldDef.isDimension;
var util = require('../util');

var consts = require('../consts');
var Type = consts.Type;

var genMarks = module.exports = getMarks;

var marksRule = genMarks.rule = {
  point:  pointRule,
  bar:    barRule,
  line:   lineRule,
  area:   areaRule, // area is similar to line
  text:   textRule,
  tick:   tickRule
};

function getMarks(encoding, stats, opt) {
  return opt.markList.filter(function(mark){
    return genMarks.satisfyRules(encoding, mark, stats, opt);
  });
}

genMarks.satisfyRules = function (encoding, mark, stats, opt) {
  return vlValidate.getEncodingMappingError({
      mark: mark,
      encoding: encoding
    }) === null &&
    (!marksRule[mark] || marksRule[mark](encoding, stats, opt));
};

function facetRule(fieldDef, stats, opt) {
  return vlFieldDef.cardinality(fieldDef, stats) <= opt.maxCardinalityForFacets;
}

function facetsRule(encoding, stats, opt) {
  if(encoding.row && !facetRule(encoding.row, stats, opt)) return false;
  if(encoding.column && !facetRule(encoding.column, stats, opt)) return false;
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
    if (opt.omitDotPlotWithExtraEncoding && util.keys(encoding).length > 1) return false;

    // dot plot with shape is non-sense
    if (encoding.shape) return false;
  }
  return true;
}

function tickRule(encoding, stats, opt) {
  // jshint unused:false
  if (encoding.x || encoding.y) {
    if(vlEncoding.isAggregate(encoding)) return false;

    var xIsDim = isDimension(encoding.x),
      yIsDim = isDimension(encoding.y);

    return (!xIsDim && (!encoding.y || yIsDim)) ||
      (!yIsDim && (!encoding.x || xIsDim));
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
  return encoding.x.type == Type.Temporal && encoding.x.timeUnit && encoding.y.type == Type.Quantitative && encoding.y.aggregate;
}

function areaRule(encoding, stats, opt) {
  if(!facetsRule(encoding, stats, opt)) return false;

  if(!lineRule(encoding, stats, opt)) return false;

  return !(opt.omitStackedAverage && encoding.y.aggregate ==='mean' && encoding.color);
}

function textRule(encoding, stats, opt) {
  // at least must have row or column and aggregated text values
  return (encoding.row || encoding.column) && encoding.text && encoding.text.aggregate && !encoding.x && !encoding.y && !encoding.size &&
    (!opt.alwaysGenerateTableAsHeatmap || !encoding.color);
}

},{"../consts":9,"../util":19,"vega-lite/src/encoding":34,"vega-lite/src/fielddef":35,"vega-lite/src/validate":57}],15:[function(require,module,exports){
'use strict';

var vlFieldDef = require('vega-lite/src/fielddef');
var vlSchemaUtil = require('vega-lite/src/schema/schemautil');

var util = require('../util'),
  consts = require('../consts'),
  isDimension = vlFieldDef.isDimension;

module.exports = projections;

// TODO support other mode of projections generation
// powerset, chooseK, chooseKorLess are already included in the util

/**
 * fields
 * @param  {[type]} fieldDefs array of fields and query information
 * @return {[type]}        [description]
 */
function projections(fieldDefs, stats, opt) {
  opt = vlSchemaUtil.extend(opt||{}, consts.gen.projections);

  // First categorize field, selected, fieldsToAdd, and save indices
  var selected = [], fieldsToAdd = [], fieldSets = [],
    hasSelectedDimension = false,
    hasSelectedMeasure = false,
    indices = {};

  fieldDefs.forEach(function(fieldDef, index){
    //save indices for stable sort later
    indices[fieldDef.field] = index;

    if (fieldDef.selected) {
      selected.push(fieldDef);
      if (isDimension(fieldDef) || fieldDef.type ==='temporal') { // FIXME / HACK
        hasSelectedDimension = true;
      } else {
        hasSelectedMeasure = true;
      }
    } else if (fieldDef.selected !== false && !vlFieldDef.isCount(fieldDef)) {
      if (vlFieldDef.isDimension(fieldDef) &&
          !opt.maxCardinalityForAutoAddOrdinal &&
          vlFieldDef.cardinality(fieldDef, stats, 15) > opt.maxCardinalityForAutoAddOrdinal
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
  nominal: 0,
  ordinal: 0,
  temporal: 2,
  quantitative: 3
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
    return indices[a.field] - indices[b.field];
  };
}

projections.key = function(projection) {
  return projection.map(function(fieldDef) {
    return vlFieldDef.isCount(fieldDef) ? 'count' : fieldDef.field;
  }).join(',');
};


},{"../consts":9,"../util":19,"vega-lite/src/fielddef":35,"vega-lite/src/schema/schemautil":50}],16:[function(require,module,exports){
'use strict';

var vlFieldDef = require('vega-lite/src/fielddef');
var vlSchemaUtil = require('vega-lite/src/schema/schemautil');
var util = require('../util');

var genEncodings = require('./encodings'),
  getMarks = require('./marks'),
  rank = require('../rank/rank'),
  consts = require('../consts');

module.exports = genSpecsFromFieldDefs;

/** Design Encodings for a set of field definition */

function genSpecsFromFieldDefs(output, fieldDefs, stats, opt, nested) {
  // opt must be augmented before being passed to genEncodings or getMarks
  opt = vlSchemaUtil.extend(opt||{}, consts.gen.encodings);
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
  getMarks(encoding, stats, opt)
    .forEach(function(mark) {
      var spec = util.duplicate({
          // Clone config & encoding to unique objects
          encoding: encoding,
          config: opt.config
        });

      spec.mark = mark;
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
  if (spec.mark === 'text' && opt.alwaysGenerateTableAsHeatmap) {
    spec.encoding.color = spec.encoding.text;
  }

  // don't include zero if stdev/mean < 0.01
  // https://github.com/uwdata/visrec/issues/69
  var encoding = spec.encoding;
  ['x', 'y'].forEach(function(channel) {
    var fieldDef = encoding[channel];

    // TODO add a parameter for this case
    if (fieldDef && vlFieldDef.isMeasure(fieldDef) && !vlFieldDef.isCount(fieldDef)) {
      var stat = stats[fieldDef.field];
      if (stat && stat.stdev / stat.mean < 0.01) {
        fieldDef.scale = {zero: false};
      }
    }
  });
  return spec;
}

},{"../consts":9,"../rank/rank":17,"../util":19,"./encodings":12,"./marks":14,"vega-lite/src/fielddef":35,"vega-lite/src/schema/schemautil":50}],17:[function(require,module,exports){
module.exports = {
  encoding: require('./rankEncodings')
};



},{"./rankEncodings":18}],18:[function(require,module,exports){
// FIXME: rename to rankSpecs

'use strict';

var vlEncoding = require('vega-lite/src/encoding'),
  vlFieldDef = require('vega-lite/src/fielddef'),
  vlChannel = require('vega-lite/src/channel'),
  isDimension = vlFieldDef.isDimension,
  util = require('../util');

var vlShorthand = require('vega-lite/src/shorthand');

var consts = require('../consts');
var Type = consts.Type;

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
    channels = util.keys(spec.encoding),
    mark = spec.mark,
    encoding = spec.encoding;

  var encodingMappingByField = vlEncoding.reduce(spec.encoding, function(o, fieldDef, channel) {
    var key = vlShorthand.shortenFieldDef(fieldDef);
    var mappings = o[key] = o[key] || [];
    mappings.push({channel: channel, fieldDef: fieldDef});
    return o;
  }, {});

  // data - encoding mapping score
  util.forEach(encodingMappingByField, function(mappings) {
    var reasons = mappings.map(function(m) {
        return m.channel + vlShorthand.Assign + vlShorthand.shortenFieldDef(m.fieldDef) +
          ' ' + (selected && selected[m.fieldDef.field] ? '[x]' : '[ ]');
      }),
      scores = mappings.map(function(m) {
        var role = vlFieldDef.isDimension(m.fieldDef) ? 'dimension' : 'measure';

        var score = rankEncodings.score[role](m.fieldDef, m.channel, spec.mark, stats, opt);

        return !selected || selected[m.fieldDef.field] ? score : Math.pow(score, 0.125);
      });

    features.push({
      reason: reasons.join(" | "),
      score: Math.max.apply(null, scores)
    });
  });

  // plot type
  if (mark === 'text') {
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
  if (channels.length > 1 && mark !== 'text') {
    if ((!encoding.x || !encoding.y) && !encoding.geo && !encoding.text) {
      features.push({
        reason: 'unused position',
        score: UNUSED_POSITION
      });
    }
  }

  // mark type score
  features.push({
    reason: 'mark='+mark,
    score: MARK_SCORE[mark]
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

rankEncodings.dimensionScore = function (fieldDef, channel, mark, stats, opt){
  var cardinality = vlFieldDef.cardinality(fieldDef, stats);
  switch (channel) {
    case vlChannel.X:
      if (fieldDef.type === Type.Nominal || fieldDef.type === Type.Ordinal)  {
        return D.pos - D.minor;
      }
      return D.pos;

    case vlChannel.Y:
      if (fieldDef.type === Type.Nominal || fieldDef.type === Type.Ordinal) {
        return D.pos - D.minor; //prefer ordinal on y
      }
      if (fieldDef.type === Type.Temporal) {
        return D.Y_T; // time should not be on Y
      }
      return D.pos - D.minor;

    case vlChannel.COL:
      if (mark === 'text') return D.facet_text;
      //prefer column over row due to scrolling issues
      return cardinality <= opt.maxGoodCardinalityForFacets ? D.facet_good :
        cardinality <= opt.maxCardinalityForFacets ? D.facet_ok : D.facet_bad;

    case vlChannel.ROW:
      if (mark === 'text') return D.facet_text;
      return (cardinality <= opt.maxGoodCardinalityForFacets ? D.facet_good :
        cardinality <= opt.maxCardinalityForFacets ? D.facet_ok : D.facet_bad) - D.minor;

    case vlChannel.COLOR:
      var hasOrder = (fieldDef.bin && fieldDef.type=== Type.Quantitative) || (fieldDef.timeUnit && fieldDef.type=== Type.Temporal);

      //FIXME add stacking option once we have control ..
      var isStacked = mark === 'bar' || mark === 'area';

      // true ordinal on color is currently BAD (until we have good ordinal color scale support)
      if (hasOrder) return D.color_bad;

      //stacking gets lower score
      if (isStacked) return D.color_stack;

      return cardinality <= opt.maxGoodCardinalityForColor ? D.color_good: cardinality <= opt.maxCardinalityForColor ? D.color_ok : D.color_bad;
    case vlChannel.SHAPE:
      return cardinality <= opt.maxCardinalityForShape ? D.shape : TERRIBLE;
    case vlChannel.DETAIL:
      return D.detail;
  }
  return TERRIBLE;
};

rankEncodings.dimensionScore.consts = D;

rankEncodings.measureScore = function (fieldDef, channel, mark, stats, opt) {
  // jshint unused:false
  switch (channel){
    case vlChannel.X: return M.pos;
    case vlChannel.Y: return M.pos;
    case vlChannel.SIZE:
      if (mark === 'bar') return BAD; //size of bar is very bad
      if (mark === 'text') return BAD;
      if (mark === 'line') return BAD;
      return M.size;
    case vlChannel.COLOR: return M.color;
    case vlChannel.TEXT: return M.text;
  }
  return BAD;
};

rankEncodings.measureScore.consts = M;


rankEncodings.score = {
  dimension: rankEncodings.dimensionScore,
  measure: rankEncodings.measureScore,
};

},{"../consts":9,"../util":19,"vega-lite/src/channel":29,"vega-lite/src/encoding":34,"vega-lite/src/fielddef":35,"vega-lite/src/shorthand":52}],19:[function(require,module,exports){
"use strict";

var consts = require('./consts');

var util = module.exports = {
  gen: {}
};

// FIXME: remove redundant methods

util.isArray = Array.isArray || function (obj) {
  return {}.toString.call(obj) == '[object Array]';
};

util.isin = function (item, array) {
    return array.indexOf(item) !== -1;
};

util.json = function(s, sp) {
  return JSON.stringify(s, null, sp);
};

util.keys = function(obj) {
  var k = [], x;
  for (x in obj) k.push(x);
  return k;
};

util.duplicate = function(obj) {
  return JSON.parse(JSON.stringify(obj));
};

util.forEach = function(obj, f, thisArg) {
  if (obj.forEach) {
    obj.forEach.call(thisArg, f);
  }
  else {
    for (var k in obj) {
      f.call(thisArg, obj[k], k, obj);
    }
  }
};

util.any = function (arr, f) {
    var i = 0, k;
    for (k in arr) {
        if (f(arr[k], k, i++))
            return true;
    }
    return false;
};

util.nestedMap = function (collection, f, level, filter) {
  return level === 0 ?
    collection.map(f) :
    collection.map(function(v) {
      var r = util.nestedMap(v, f, level - 1);
      return filter ? r.filter(util.nonEmpty) : r;
    });
};

util.nestedReduce = function (collection, f, level, filter) {
  return level === 0 ?
    collection.reduce(f, []) :
    collection.map(function(v) {
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


},{"./consts":9}],20:[function(require,module,exports){
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define('d3-time', ['exports'], factory) :
  factory((global.d3_time = {}));
}(this, function (exports) { 'use strict';

  var t0 = new Date;
  var t1 = new Date;
  function newInterval(floori, offseti, count, field) {

    function interval(date) {
      return floori(date = new Date(+date)), date;
    }

    interval.floor = interval;

    interval.round = function(date) {
      var d0 = new Date(+date),
          d1 = new Date(date - 1);
      floori(d0), floori(d1), offseti(d1, 1);
      return date - d0 < d1 - date ? d0 : d1;
    };

    interval.ceil = function(date) {
      return floori(date = new Date(date - 1)), offseti(date, 1), date;
    };

    interval.offset = function(date, step) {
      return offseti(date = new Date(+date), step == null ? 1 : Math.floor(step)), date;
    };

    interval.range = function(start, stop, step) {
      var range = [];
      start = new Date(start - 1);
      stop = new Date(+stop);
      step = step == null ? 1 : Math.floor(step);
      if (!(start < stop) || !(step > 0)) return range; // also handles Invalid Date
      offseti(start, 1), floori(start);
      if (start < stop) range.push(new Date(+start));
      while (offseti(start, step), floori(start), start < stop) range.push(new Date(+start));
      return range;
    };

    interval.filter = function(test) {
      return newInterval(function(date) {
        while (floori(date), !test(date)) date.setTime(date - 1);
      }, function(date, step) {
        while (--step >= 0) while (offseti(date, 1), !test(date));
      });
    };

    if (count) {
      interval.count = function(start, end) {
        t0.setTime(+start), t1.setTime(+end);
        floori(t0), floori(t1);
        return Math.floor(count(t0, t1));
      };

      interval.every = function(step) {
        step = Math.floor(step);
        return !isFinite(step) || !(step > 0) ? null
            : !(step > 1) ? interval
            : interval.filter(field
                ? function(d) { return field(d) % step === 0; }
                : function(d) { return interval.count(0, d) % step === 0; });
      };
    }

    return interval;
  };

  var millisecond = newInterval(function() {
    // noop
  }, function(date, step) {
    date.setTime(+date + step);
  }, function(start, end) {
    return end - start;
  });

  // An optimized implementation for this simple case.
  millisecond.every = function(k) {
    k = Math.floor(k);
    if (!isFinite(k) || !(k > 0)) return null;
    if (!(k > 1)) return millisecond;
    return newInterval(function(date) {
      date.setTime(Math.floor(date / k) * k);
    }, function(date, step) {
      date.setTime(+date + step * k);
    }, function(start, end) {
      return (end - start) / k;
    });
  };

  var second = newInterval(function(date) {
    date.setMilliseconds(0);
  }, function(date, step) {
    date.setTime(+date + step * 1e3);
  }, function(start, end) {
    return (end - start) / 1e3;
  }, function(date) {
    return date.getSeconds();
  });

  var minute = newInterval(function(date) {
    date.setSeconds(0, 0);
  }, function(date, step) {
    date.setTime(+date + step * 6e4);
  }, function(start, end) {
    return (end - start) / 6e4;
  }, function(date) {
    return date.getMinutes();
  });

  var hour = newInterval(function(date) {
    date.setMinutes(0, 0, 0);
  }, function(date, step) {
    date.setTime(+date + step * 36e5);
  }, function(start, end) {
    return (end - start) / 36e5;
  }, function(date) {
    return date.getHours();
  });

  var day = newInterval(function(date) {
    date.setHours(0, 0, 0, 0);
  }, function(date, step) {
    date.setDate(date.getDate() + step);
  }, function(start, end) {
    return (end - start - (end.getTimezoneOffset() - start.getTimezoneOffset()) * 6e4) / 864e5;
  }, function(date) {
    return date.getDate() - 1;
  });

  function weekday(i) {
    return newInterval(function(date) {
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (date.getDay() + 7 - i) % 7);
    }, function(date, step) {
      date.setDate(date.getDate() + step * 7);
    }, function(start, end) {
      return (end - start - (end.getTimezoneOffset() - start.getTimezoneOffset()) * 6e4) / 6048e5;
    });
  }

  var sunday = weekday(0);
  var monday = weekday(1);
  var tuesday = weekday(2);
  var wednesday = weekday(3);
  var thursday = weekday(4);
  var friday = weekday(5);
  var saturday = weekday(6);

  var month = newInterval(function(date) {
    date.setHours(0, 0, 0, 0);
    date.setDate(1);
  }, function(date, step) {
    date.setMonth(date.getMonth() + step);
  }, function(start, end) {
    return end.getMonth() - start.getMonth() + (end.getFullYear() - start.getFullYear()) * 12;
  }, function(date) {
    return date.getMonth();
  });

  var year = newInterval(function(date) {
    date.setHours(0, 0, 0, 0);
    date.setMonth(0, 1);
  }, function(date, step) {
    date.setFullYear(date.getFullYear() + step);
  }, function(start, end) {
    return end.getFullYear() - start.getFullYear();
  }, function(date) {
    return date.getFullYear();
  });

  var utcSecond = newInterval(function(date) {
    date.setUTCMilliseconds(0);
  }, function(date, step) {
    date.setTime(+date + step * 1e3);
  }, function(start, end) {
    return (end - start) / 1e3;
  }, function(date) {
    return date.getUTCSeconds();
  });

  var utcMinute = newInterval(function(date) {
    date.setUTCSeconds(0, 0);
  }, function(date, step) {
    date.setTime(+date + step * 6e4);
  }, function(start, end) {
    return (end - start) / 6e4;
  }, function(date) {
    return date.getUTCMinutes();
  });

  var utcHour = newInterval(function(date) {
    date.setUTCMinutes(0, 0, 0);
  }, function(date, step) {
    date.setTime(+date + step * 36e5);
  }, function(start, end) {
    return (end - start) / 36e5;
  }, function(date) {
    return date.getUTCHours();
  });

  var utcDay = newInterval(function(date) {
    date.setUTCHours(0, 0, 0, 0);
  }, function(date, step) {
    date.setUTCDate(date.getUTCDate() + step);
  }, function(start, end) {
    return (end - start) / 864e5;
  }, function(date) {
    return date.getUTCDate() - 1;
  });

  function utcWeekday(i) {
    return newInterval(function(date) {
      date.setUTCHours(0, 0, 0, 0);
      date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 7 - i) % 7);
    }, function(date, step) {
      date.setUTCDate(date.getUTCDate() + step * 7);
    }, function(start, end) {
      return (end - start) / 6048e5;
    });
  }

  var utcSunday = utcWeekday(0);
  var utcMonday = utcWeekday(1);
  var utcTuesday = utcWeekday(2);
  var utcWednesday = utcWeekday(3);
  var utcThursday = utcWeekday(4);
  var utcFriday = utcWeekday(5);
  var utcSaturday = utcWeekday(6);

  var utcMonth = newInterval(function(date) {
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCDate(1);
  }, function(date, step) {
    date.setUTCMonth(date.getUTCMonth() + step);
  }, function(start, end) {
    return end.getUTCMonth() - start.getUTCMonth() + (end.getUTCFullYear() - start.getUTCFullYear()) * 12;
  }, function(date) {
    return date.getUTCMonth();
  });

  var utcYear = newInterval(function(date) {
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCMonth(0, 1);
  }, function(date, step) {
    date.setUTCFullYear(date.getUTCFullYear() + step);
  }, function(start, end) {
    return end.getUTCFullYear() - start.getUTCFullYear();
  }, function(date) {
    return date.getUTCFullYear();
  });

  var milliseconds = millisecond.range;
  var seconds = second.range;
  var minutes = minute.range;
  var hours = hour.range;
  var days = day.range;
  var sundays = sunday.range;
  var mondays = monday.range;
  var tuesdays = tuesday.range;
  var wednesdays = wednesday.range;
  var thursdays = thursday.range;
  var fridays = friday.range;
  var saturdays = saturday.range;
  var weeks = sunday.range;
  var months = month.range;
  var years = year.range;

  var utcMillisecond = millisecond;
  var utcMilliseconds = milliseconds;
  var utcSeconds = utcSecond.range;
  var utcMinutes = utcMinute.range;
  var utcHours = utcHour.range;
  var utcDays = utcDay.range;
  var utcSundays = utcSunday.range;
  var utcMondays = utcMonday.range;
  var utcTuesdays = utcTuesday.range;
  var utcWednesdays = utcWednesday.range;
  var utcThursdays = utcThursday.range;
  var utcFridays = utcFriday.range;
  var utcSaturdays = utcSaturday.range;
  var utcWeeks = utcSunday.range;
  var utcMonths = utcMonth.range;
  var utcYears = utcYear.range;

  var version = "0.1.0";

  exports.version = version;
  exports.milliseconds = milliseconds;
  exports.seconds = seconds;
  exports.minutes = minutes;
  exports.hours = hours;
  exports.days = days;
  exports.sundays = sundays;
  exports.mondays = mondays;
  exports.tuesdays = tuesdays;
  exports.wednesdays = wednesdays;
  exports.thursdays = thursdays;
  exports.fridays = fridays;
  exports.saturdays = saturdays;
  exports.weeks = weeks;
  exports.months = months;
  exports.years = years;
  exports.utcMillisecond = utcMillisecond;
  exports.utcMilliseconds = utcMilliseconds;
  exports.utcSeconds = utcSeconds;
  exports.utcMinutes = utcMinutes;
  exports.utcHours = utcHours;
  exports.utcDays = utcDays;
  exports.utcSundays = utcSundays;
  exports.utcMondays = utcMondays;
  exports.utcTuesdays = utcTuesdays;
  exports.utcWednesdays = utcWednesdays;
  exports.utcThursdays = utcThursdays;
  exports.utcFridays = utcFridays;
  exports.utcSaturdays = utcSaturdays;
  exports.utcWeeks = utcWeeks;
  exports.utcMonths = utcMonths;
  exports.utcYears = utcYears;
  exports.millisecond = millisecond;
  exports.second = second;
  exports.minute = minute;
  exports.hour = hour;
  exports.day = day;
  exports.sunday = sunday;
  exports.monday = monday;
  exports.tuesday = tuesday;
  exports.wednesday = wednesday;
  exports.thursday = thursday;
  exports.friday = friday;
  exports.saturday = saturday;
  exports.week = sunday;
  exports.month = month;
  exports.year = year;
  exports.utcSecond = utcSecond;
  exports.utcMinute = utcMinute;
  exports.utcHour = utcHour;
  exports.utcDay = utcDay;
  exports.utcSunday = utcSunday;
  exports.utcMonday = utcMonday;
  exports.utcTuesday = utcTuesday;
  exports.utcWednesday = utcWednesday;
  exports.utcThursday = utcThursday;
  exports.utcFriday = utcFriday;
  exports.utcSaturday = utcSaturday;
  exports.utcWeek = utcSunday;
  exports.utcMonth = utcMonth;
  exports.utcYear = utcYear;
  exports.interval = newInterval;

}));
},{}],21:[function(require,module,exports){
var util = require('../util'),
    time = require('../time'),
    EPSILON = 1e-15;

function bins(opt) {
  if (!opt) { throw Error("Missing binning options."); }

  // determine range
  var maxb = opt.maxbins || 15,
      base = opt.base || 10,
      logb = Math.log(base),
      div = opt.div || [5, 2],
      min = opt.min,
      max = opt.max,
      span = max - min,
      step, level, minstep, precision, v, i, eps;

  if (opt.step) {
    // if step size is explicitly given, use that
    step = opt.step;
  } else if (opt.steps) {
    // if provided, limit choice to acceptable step sizes
    step = opt.steps[Math.min(
      opt.steps.length - 1,
      bisect(opt.steps, span/maxb, 0, opt.steps.length)
    )];
  } else {
    // else use span to determine step size
    level = Math.ceil(Math.log(maxb) / logb);
    minstep = opt.minstep || 0;
    step = Math.max(
      minstep,
      Math.pow(base, Math.round(Math.log(span) / logb) - level)
    );

    // increase step size if too many bins
    do { step *= base; } while (Math.ceil(span/step) > maxb);

    // decrease step size if allowed
    for (i=0; i<div.length; ++i) {
      v = step / div[i];
      if (v >= minstep && span / v <= maxb) step = v;
    }
  }

  // update precision, min and max
  v = Math.log(step);
  precision = v >= 0 ? 0 : ~~(-v / logb) + 1;
  eps = Math.pow(base, -precision - 1);
  min = Math.min(min, Math.floor(min / step + eps) * step);
  max = Math.ceil(max / step) * step;

  return {
    start: min,
    stop:  max,
    step:  step,
    unit:  {precision: precision},
    value: value,
    index: index
  };
}

function bisect(a, x, lo, hi) {
  while (lo < hi) {
    var mid = lo + hi >>> 1;
    if (util.cmp(a[mid], x) < 0) { lo = mid + 1; }
    else { hi = mid; }
  }
  return lo;
}

function value(v) {
  return this.step * Math.floor(v / this.step + EPSILON);
}

function index(v) {
  return Math.floor((v - this.start) / this.step + EPSILON);
}

function date_value(v) {
  return this.unit.date(value.call(this, v));
}

function date_index(v) {
  return index.call(this, this.unit.unit(v));
}

bins.date = function(opt) {
  if (!opt) { throw Error("Missing date binning options."); }

  // find time step, then bin
  var units = opt.utc ? time.utc : time,
      dmin = opt.min,
      dmax = opt.max,
      maxb = opt.maxbins || 20,
      minb = opt.minbins || 4,
      span = (+dmax) - (+dmin),
      unit = opt.unit ? units[opt.unit] : units.find(span, minb, maxb),
      spec = bins({
        min:     unit.min != null ? unit.min : unit.unit(dmin),
        max:     unit.max != null ? unit.max : unit.unit(dmax),
        maxbins: maxb,
        minstep: unit.minstep,
        steps:   unit.step
      });

  spec.unit = unit;
  spec.index = date_index;
  if (!opt.raw) spec.value = date_value;
  return spec;
};

module.exports = bins;

},{"../time":25,"../util":26}],22:[function(require,module,exports){
var gen = module.exports = {};

gen.repeat = function(val, n) {
  var a = Array(n), i;
  for (i=0; i<n; ++i) a[i] = val;
  return a;
};

gen.zeros = function(n) {
  return gen.repeat(0, n);
};

gen.range = function(start, stop, step) {
  if (arguments.length < 3) {
    step = 1;
    if (arguments.length < 2) {
      stop = start;
      start = 0;
    }
  }
  if ((stop - start) / step == Infinity) throw new Error('Infinite range');
  var range = [], i = -1, j;
  if (step < 0) while ((j = start + step * ++i) > stop) range.push(j);
  else while ((j = start + step * ++i) < stop) range.push(j);
  return range;
};

gen.random = {};

gen.random.uniform = function(min, max) {
  if (max === undefined) {
    max = min === undefined ? 1 : min;
    min = 0;
  }
  var d = max - min;
  var f = function() {
    return min + d * Math.random();
  };
  f.samples = function(n) {
    return gen.zeros(n).map(f);
  };
  f.pdf = function(x) {
    return (x >= min && x <= max) ? 1/d : 0;
  };
  f.cdf = function(x) {
    return x < min ? 0 : x > max ? 1 : (x - min) / d;
  };
  f.icdf = function(p) {
    return (p >= 0 && p <= 1) ? min + p*d : NaN;
  };
  return f;
};

gen.random.integer = function(a, b) {
  if (b === undefined) {
    b = a;
    a = 0;
  }
  var d = b - a;
  var f = function() {
    return a + Math.floor(d * Math.random());
  };
  f.samples = function(n) {
    return gen.zeros(n).map(f);
  };
  f.pdf = function(x) {
    return (x === Math.floor(x) && x >= a && x < b) ? 1/d : 0;
  };
  f.cdf = function(x) {
    var v = Math.floor(x);
    return v < a ? 0 : v >= b ? 1 : (v - a + 1) / d;
  };
  f.icdf = function(p) {
    return (p >= 0 && p <= 1) ? a - 1 + Math.floor(p*d) : NaN;
  };
  return f;
};

gen.random.normal = function(mean, stdev) {
  mean = mean || 0;
  stdev = stdev || 1;
  var next;
  var f = function() {
    var x = 0, y = 0, rds, c;
    if (next !== undefined) {
      x = next;
      next = undefined;
      return x;
    }
    do {
      x = Math.random()*2-1;
      y = Math.random()*2-1;
      rds = x*x + y*y;
    } while (rds === 0 || rds > 1);
    c = Math.sqrt(-2*Math.log(rds)/rds); // Box-Muller transform
    next = mean + y*c*stdev;
    return mean + x*c*stdev;
  };
  f.samples = function(n) {
    return gen.zeros(n).map(f);
  };
  f.pdf = function(x) {
    var exp = Math.exp(Math.pow(x-mean, 2) / (-2 * Math.pow(stdev, 2)));
    return (1 / (stdev * Math.sqrt(2*Math.PI))) * exp;
  };
  f.cdf = function(x) {
    // Approximation from West (2009)
    // Better Approximations to Cumulative Normal Functions
    var cd,
        z = (x - mean) / stdev,
        Z = Math.abs(z);
    if (Z > 37) {
      cd = 0;
    } else {
      var sum, exp = Math.exp(-Z*Z/2);
      if (Z < 7.07106781186547) {
        sum = 3.52624965998911e-02 * Z + 0.700383064443688;
        sum = sum * Z + 6.37396220353165;
        sum = sum * Z + 33.912866078383;
        sum = sum * Z + 112.079291497871;
        sum = sum * Z + 221.213596169931;
        sum = sum * Z + 220.206867912376;
        cd = exp * sum;
        sum = 8.83883476483184e-02 * Z + 1.75566716318264;
        sum = sum * Z + 16.064177579207;
        sum = sum * Z + 86.7807322029461;
        sum = sum * Z + 296.564248779674;
        sum = sum * Z + 637.333633378831;
        sum = sum * Z + 793.826512519948;
        sum = sum * Z + 440.413735824752;
        cd = cd / sum;
      } else {
        sum = Z + 0.65;
        sum = Z + 4 / sum;
        sum = Z + 3 / sum;
        sum = Z + 2 / sum;
        sum = Z + 1 / sum;
        cd = exp / sum / 2.506628274631;
      }
    }
    return z > 0 ? 1 - cd : cd;
  };
  f.icdf = function(p) {
    // Approximation of Probit function using inverse error function.
    if (p <= 0 || p >= 1) return NaN;
    var x = 2*p - 1,
        v = (8 * (Math.PI - 3)) / (3 * Math.PI * (4-Math.PI)),
        a = (2 / (Math.PI*v)) + (Math.log(1 - Math.pow(x,2)) / 2),
        b = Math.log(1 - (x*x)) / v,
        s = (x > 0 ? 1 : -1) * Math.sqrt(Math.sqrt((a*a) - b) - a);
    return mean + stdev * Math.SQRT2 * s;
  };
  return f;
};
},{}],23:[function(require,module,exports){
var util = require('../util');

var TYPES = '__types__';

var PARSERS = {
  boolean: util.boolean,
  integer: util.number,
  number:  util.number,
  date:    util.date,
  string:  function(x) { return x==='' ? null : x; }
};

var TESTS = {
  boolean: function(x) { return x==='true' || x==='false' || util.isBoolean(x); },
  integer: function(x) { return TESTS.number(x) && (x=+x) === ~~x; },
  number: function(x) { return !isNaN(+x) && !util.isDate(x); },
  date: function(x) { return !isNaN(Date.parse(x)); }
};

function annotation(data, types) {
  if (!types) return data && data[TYPES] || null;
  data[TYPES] = types;
}

function type(values, f) {
  values = util.array(values);
  f = util.$(f);
  var v, i, n;

  // if data array has type annotations, use them
  if (values[TYPES]) {
    v = f(values[TYPES]);
    if (util.isString(v)) return v;
  }

  for (i=0, n=values.length; !util.isValid(v) && i<n; ++i) {
    v = f ? f(values[i]) : values[i];
  }

  return util.isDate(v) ? 'date' :
    util.isNumber(v)    ? 'number' :
    util.isBoolean(v)   ? 'boolean' :
    util.isString(v)    ? 'string' : null;
}

function typeAll(data, fields) {
  if (!data.length) return;
  fields = fields || util.keys(data[0]);
  return fields.reduce(function(types, f) {
    return (types[f] = type(data, f), types);
  }, {});
}

function infer(values, f) {
  values = util.array(values);
  f = util.$(f);
  var i, j, v;

  // types to test for, in precedence order
  var types = ['boolean', 'integer', 'number', 'date'];

  for (i=0; i<values.length; ++i) {
    // get next value to test
    v = f ? f(values[i]) : values[i];
    // test value against remaining types
    for (j=0; j<types.length; ++j) {
      if (util.isValid(v) && !TESTS[types[j]](v)) {
        types.splice(j, 1);
        j -= 1;
      }
    }
    // if no types left, return 'string'
    if (types.length === 0) return 'string';
  }

  return types[0];
}

function inferAll(data, fields) {
  fields = fields || util.keys(data[0]);
  return fields.reduce(function(types, f) {
    types[f] = infer(data, f);
    return types;
  }, {});
}

type.annotation = annotation;
type.all = typeAll;
type.infer = infer;
type.inferAll = inferAll;
type.parsers = PARSERS;
module.exports = type;

},{"../util":26}],24:[function(require,module,exports){
var util = require('./util');
var type = require('./import/type');
var gen = require('./generate');

var stats = {};

// Collect unique values.
// Output: an array of unique values, in first-observed order
stats.unique = function(values, f, results) {
  f = util.$(f);
  results = results || [];
  var u = {}, v, i, n;
  for (i=0, n=values.length; i<n; ++i) {
    v = f ? f(values[i]) : values[i];
    if (v in u) continue;
    u[v] = 1;
    results.push(v);
  }
  return results;
};

// Return the length of the input array.
stats.count = function(values) {
  return values && values.length || 0;
};

// Count the number of non-null, non-undefined, non-NaN values.
stats.count.valid = function(values, f) {
  f = util.$(f);
  var v, i, n, valid = 0;
  for (i=0, n=values.length; i<n; ++i) {
    v = f ? f(values[i]) : values[i];
    if (util.isValid(v)) valid += 1;
  }
  return valid;
};

// Count the number of null or undefined values.
stats.count.missing = function(values, f) {
  f = util.$(f);
  var v, i, n, count = 0;
  for (i=0, n=values.length; i<n; ++i) {
    v = f ? f(values[i]) : values[i];
    if (v == null) count += 1;
  }
  return count;
};

// Count the number of distinct values.
// Null, undefined and NaN are each considered distinct values.
stats.count.distinct = function(values, f) {
  f = util.$(f);
  var u = {}, v, i, n, count = 0;
  for (i=0, n=values.length; i<n; ++i) {
    v = f ? f(values[i]) : values[i];
    if (v in u) continue;
    u[v] = 1;
    count += 1;
  }
  return count;
};

// Construct a map from distinct values to occurrence counts.
stats.count.map = function(values, f) {
  f = util.$(f);
  var map = {}, v, i, n;
  for (i=0, n=values.length; i<n; ++i) {
    v = f ? f(values[i]) : values[i];
    map[v] = (v in map) ? map[v] + 1 : 1;
  }
  return map;
};

// Compute the median of an array of numbers.
stats.median = function(values, f) {
  if (f) values = values.map(util.$(f));
  values = values.filter(util.isValid).sort(util.cmp);
  return stats.quantile(values, 0.5);
};

// Computes the quartile boundaries of an array of numbers.
stats.quartile = function(values, f) {
  if (f) values = values.map(util.$(f));
  values = values.filter(util.isValid).sort(util.cmp);
  var q = stats.quantile;
  return [q(values, 0.25), q(values, 0.50), q(values, 0.75)];
};

// Compute the quantile of a sorted array of numbers.
// Adapted from the D3.js implementation.
stats.quantile = function(values, f, p) {
  if (p === undefined) { p = f; f = util.identity; }
  f = util.$(f);
  var H = (values.length - 1) * p + 1,
      h = Math.floor(H),
      v = +f(values[h - 1]),
      e = H - h;
  return e ? v + e * (f(values[h]) - v) : v;
};

// Compute the sum of an array of numbers.
stats.sum = function(values, f) {
  f = util.$(f);
  for (var sum=0, i=0, n=values.length, v; i<n; ++i) {
    v = f ? f(values[i]) : values[i];
    if (util.isValid(v)) sum += v;
  }
  return sum;
};

// Compute the mean (average) of an array of numbers.
stats.mean = function(values, f) {
  f = util.$(f);
  var mean = 0, delta, i, n, c, v;
  for (i=0, c=0, n=values.length; i<n; ++i) {
    v = f ? f(values[i]) : values[i];
    if (util.isValid(v)) {
      delta = v - mean;
      mean = mean + delta / (++c);
    }
  }
  return mean;
};

// Compute the sample variance of an array of numbers.
stats.variance = function(values, f) {
  f = util.$(f);
  if (!util.isArray(values) || values.length < 2) return 0;
  var mean = 0, M2 = 0, delta, i, c, v;
  for (i=0, c=0; i<values.length; ++i) {
    v = f ? f(values[i]) : values[i];
    if (util.isValid(v)) {
      delta = v - mean;
      mean = mean + delta / (++c);
      M2 = M2 + delta * (v - mean);
    }
  }
  M2 = M2 / (c - 1);
  return M2;
};

// Compute the sample standard deviation of an array of numbers.
stats.stdev = function(values, f) {
  return Math.sqrt(stats.variance(values, f));
};

// Compute the Pearson mode skewness ((median-mean)/stdev) of an array of numbers.
stats.modeskew = function(values, f) {
  var avg = stats.mean(values, f),
      med = stats.median(values, f),
      std = stats.stdev(values, f);
  return std === 0 ? 0 : (avg - med) / std;
};

// Find the minimum value in an array.
stats.min = function(values, f) {
  return stats.extent(values, f)[0];
};

// Find the maximum value in an array.
stats.max = function(values, f) {
  return stats.extent(values, f)[1];
};

// Find the minimum and maximum of an array of values.
stats.extent = function(values, f) {
  f = util.$(f);
  var a, b, v, i, n = values.length;
  for (i=0; i<n; ++i) {
    v = f ? f(values[i]) : values[i];
    if (util.isValid(v)) { a = b = v; break; }
  }
  for (; i<n; ++i) {
    v = f ? f(values[i]) : values[i];
    if (util.isValid(v)) {
      if (v < a) a = v;
      if (v > b) b = v;
    }
  }
  return [a, b];
};

// Find the integer indices of the minimum and maximum values.
stats.extent.index = function(values, f) {
  f = util.$(f);
  var x = -1, y = -1, a, b, v, i, n = values.length;
  for (i=0; i<n; ++i) {
    v = f ? f(values[i]) : values[i];
    if (util.isValid(v)) { a = b = v; x = y = i; break; }
  }
  for (; i<n; ++i) {
    v = f ? f(values[i]) : values[i];
    if (util.isValid(v)) {
      if (v < a) { a = v; x = i; }
      if (v > b) { b = v; y = i; }
    }
  }
  return [x, y];
};

// Compute the dot product of two arrays of numbers.
stats.dot = function(values, a, b) {
  var sum = 0, i, v;
  if (!b) {
    if (values.length !== a.length) {
      throw Error('Array lengths must match.');
    }
    for (i=0; i<values.length; ++i) {
      v = values[i] * a[i];
      if (v === v) sum += v;
    }
  } else {
    a = util.$(a);
    b = util.$(b);
    for (i=0; i<values.length; ++i) {
      v = a(values[i]) * b(values[i]);
      if (v === v) sum += v;
    }
  }
  return sum;
};

// Compute the vector distance between two arrays of numbers.
// Default is Euclidean (exp=2) distance, configurable via exp argument.
stats.dist = function(values, a, b, exp) {
  var f = util.isFunction(b) || util.isString(b),
      X = values,
      Y = f ? values : a,
      e = f ? exp : b,
      L2 = e === 2 || e == null,
      n = values.length, s = 0, d, i;
  if (f) {
    a = util.$(a);
    b = util.$(b);
  }
  for (i=0; i<n; ++i) {
    d = f ? (a(X[i])-b(Y[i])) : (X[i]-Y[i]);
    s += L2 ? d*d : Math.pow(Math.abs(d), e);
  }
  return L2 ? Math.sqrt(s) : Math.pow(s, 1/e);
};

// Compute the Cohen's d effect size between two arrays of numbers.
stats.cohensd = function(values, a, b) {
  var X = b ? values.map(util.$(a)) : values,
      Y = b ? values.map(util.$(b)) : a,
      x1 = stats.mean(X),
      x2 = stats.mean(Y),
      n1 = stats.count.valid(X),
      n2 = stats.count.valid(Y);

  if ((n1+n2-2) <= 0) {
    // if both arrays are size 1, or one is empty, there's no effect size
    return 0;
  }
  // pool standard deviation
  var s1 = stats.variance(X),
      s2 = stats.variance(Y),
      s = Math.sqrt((((n1-1)*s1) + ((n2-1)*s2)) / (n1+n2-2));
  // if there is no variance, there's no effect size
  return s===0 ? 0 : (x1 - x2) / s;
};

// Computes the covariance between two arrays of numbers
stats.covariance = function(values, a, b) {
  var X = b ? values.map(util.$(a)) : values,
      Y = b ? values.map(util.$(b)) : a,
      n = X.length,
      xm = stats.mean(X),
      ym = stats.mean(Y),
      sum = 0, c = 0, i, x, y, vx, vy;

  if (n !== Y.length) {
    throw Error('Input lengths must match.');
  }

  for (i=0; i<n; ++i) {
    x = X[i]; vx = util.isValid(x);
    y = Y[i]; vy = util.isValid(y);
    if (vx && vy) {
      sum += (x-xm) * (y-ym);
      ++c;
    } else if (vx || vy) {
      throw Error('Valid values must align.');
    }
  }
  return sum / (c-1);
};

// Compute ascending rank scores for an array of values.
// Ties are assigned their collective mean rank.
stats.rank = function(values, f) {
  f = util.$(f) || util.identity;
  var a = values.map(function(v, i) {
      return {idx: i, val: f(v)};
    })
    .sort(util.comparator('val'));

  var n = values.length,
      r = Array(n),
      tie = -1, p = {}, i, v, mu;

  for (i=0; i<n; ++i) {
    v = a[i].val;
    if (tie < 0 && p === v) {
      tie = i - 1;
    } else if (tie > -1 && p !== v) {
      mu = 1 + (i-1 + tie) / 2;
      for (; tie<i; ++tie) r[a[tie].idx] = mu;
      tie = -1;
    }
    r[a[i].idx] = i + 1;
    p = v;
  }

  if (tie > -1) {
    mu = 1 + (n-1 + tie) / 2;
    for (; tie<n; ++tie) r[a[tie].idx] = mu;
  }

  return r;
};

// Compute the sample Pearson product-moment correlation of two arrays of numbers.
stats.cor = function(values, a, b) {
  var fn = b;
  b = fn ? values.map(util.$(b)) : a;
  a = fn ? values.map(util.$(a)) : values;

  var dot = stats.dot(a, b),
      mua = stats.mean(a),
      mub = stats.mean(b),
      sda = stats.stdev(a),
      sdb = stats.stdev(b),
      n = values.length;

  return (dot - n*mua*mub) / ((n-1) * sda * sdb);
};

// Compute the Spearman rank correlation of two arrays of values.
stats.cor.rank = function(values, a, b) {
  var ra = b ? stats.rank(values, util.$(a)) : stats.rank(values),
      rb = b ? stats.rank(values, util.$(b)) : stats.rank(a),
      n = values.length, i, s, d;

  for (i=0, s=0; i<n; ++i) {
    d = ra[i] - rb[i];
    s += d * d;
  }

  return 1 - 6*s / (n * (n*n-1));
};

// Compute the distance correlation of two arrays of numbers.
// http://en.wikipedia.org/wiki/Distance_correlation
stats.cor.dist = function(values, a, b) {
  var X = b ? values.map(util.$(a)) : values,
      Y = b ? values.map(util.$(b)) : a;

  var A = stats.dist.mat(X),
      B = stats.dist.mat(Y),
      n = A.length,
      i, aa, bb, ab;

  for (i=0, aa=0, bb=0, ab=0; i<n; ++i) {
    aa += A[i]*A[i];
    bb += B[i]*B[i];
    ab += A[i]*B[i];
  }

  return Math.sqrt(ab / Math.sqrt(aa*bb));
};

// Simple linear regression.
// Returns a "fit" object with slope (m), intercept (b),
// r value (R), and sum-squared residual error (rss).
stats.linearRegression = function(values, a, b) {
  var X = b ? values.map(util.$(a)) : values,
      Y = b ? values.map(util.$(b)) : a,
      n = X.length,
      xy = stats.covariance(X, Y), // will throw err if valid vals don't align
      sx = stats.stdev(X),
      sy = stats.stdev(Y),
      slope = xy / (sx*sx),
      icept = stats.mean(Y) - slope * stats.mean(X),
      fit = {slope: slope, intercept: icept, R: xy / (sx*sy), rss: 0},
      res, i;

  for (i=0; i<n; ++i) {
    if (util.isValid(X[i]) && util.isValid(Y[i])) {
      res = (slope*X[i] + icept) - Y[i];
      fit.rss += res * res;
    }
  }

  return fit;
};

// Namespace for z-tests
stats.z = {};

// Construct a z-confidence interval at a given significance level
// Arguments are an array and an optional alpha (defaults to 0.05).
stats.z.ci = function(a, alpha) {
  var z = alpha ? gen.random.normal(0, 1).icdf(1-(alpha/2)) : 1.96,
      mu = stats.mean(a),
      SE = stats.stdev(a) / Math.sqrt(stats.count.valid(a));
  return [mu - (z*SE), mu + (z*SE)];
};

// Perform a z-test of means. Returns the p-value.
// Assuming we have a list of values, and a null hypothesis. If no null
// hypothesis, assume our null hypothesis is mu=0.
// http://en.wikipedia.org/wiki/Z-test
stats.z.test = function(a, b) {
  var nullH = b ? b : 0,
      gaussian = gen.random.normal(0, 1),
      mu = stats.mean(a),
      SE = stats.stdev(a) / Math.sqrt(stats.count.valid(a));

  if (SE===0) {
    // Test not well defined when standard error is 0.
    return (mu - nullH) === 0 ? 1 : 0;
  }
  // Two-sided, so twice the one-sided cdf.
  var z = (mu - nullH) / SE;
  return 2 * gaussian.cdf(-Math.abs(z));
};

// Perform a two sample paired z-test of means. Returns the p-value.
// http://en.wikipedia.org/wiki/Paired_difference_test
stats.z.pairedTest = function(values, a, b) {
  var X = b ? values.map(util.$(a)) : values,
      Y = b ? values.map(util.$(b)) : a,
      n1 = stats.count(X),
      n2 = stats.count(Y),
      diffs = Array(), i;

  if (n1 !== n2) {
    throw Error('Array lengths must match.');
  }
  for (i=0; i<n1; ++i) {
    // Only valid differences should contribute to the test statistic
    if (util.isValid(X[i]) && util.isValid(Y[i])) {
      diffs.push(X[i] - Y[i]);
    }
  }
  return stats.z.test(diffs);
};

// Perform a two sample z-test of means. Returns the p-value.
// http://en.wikipedia.org/wiki/Z-test
stats.z.twoSampleTest = function(values, a, b) {
  var X = b ? values.map(util.$(a)) : values,
      Y = b ? values.map(util.$(b)) : a,
      n1 = stats.count.valid(X),
      n2 = stats.count.valid(Y),
      gaussian = gen.random.normal(0, 1),
      meanDiff = stats.mean(X) - stats.mean(Y),
      SE = Math.sqrt(stats.variance(X)/n1 + stats.variance(Y)/n2);

  if (SE===0) {
    // Not well defined when pooled standard error is 0.
    return meanDiff===0 ? 1 : 0;
  }
  // Two-tailed, so twice the one-sided cdf.
  var z = meanDiff / SE;
  return 2 * gaussian.cdf(-Math.abs(z));
};

// Construct a mean-centered distance matrix for an array of numbers.
stats.dist.mat = function(X) {
  var n = X.length,
      m = n*n,
      A = Array(m),
      R = gen.zeros(n),
      M = 0, v, i, j;

  for (i=0; i<n; ++i) {
    A[i*n+i] = 0;
    for (j=i+1; j<n; ++j) {
      A[i*n+j] = (v = Math.abs(X[i] - X[j]));
      A[j*n+i] = v;
      R[i] += v;
      R[j] += v;
    }
  }

  for (i=0; i<n; ++i) {
    M += R[i];
    R[i] /= n;
  }
  M /= m;

  for (i=0; i<n; ++i) {
    for (j=i; j<n; ++j) {
      A[i*n+j] += M - R[i] - R[j];
      A[j*n+i] = A[i*n+j];
    }
  }

  return A;
};

// Compute the Shannon entropy (log base 2) of an array of counts.
stats.entropy = function(counts, f) {
  f = util.$(f);
  var i, p, s = 0, H = 0, n = counts.length;
  for (i=0; i<n; ++i) {
    s += (f ? f(counts[i]) : counts[i]);
  }
  if (s === 0) return 0;
  for (i=0; i<n; ++i) {
    p = (f ? f(counts[i]) : counts[i]) / s;
    if (p) H += p * Math.log(p);
  }
  return -H / Math.LN2;
};

// Compute the mutual information between two discrete variables.
// Returns an array of the form [MI, MI_distance]
// MI_distance is defined as 1 - I(a,b) / H(a,b).
// http://en.wikipedia.org/wiki/Mutual_information
stats.mutual = function(values, a, b, counts) {
  var x = counts ? values.map(util.$(a)) : values,
      y = counts ? values.map(util.$(b)) : a,
      z = counts ? values.map(util.$(counts)) : b;

  var px = {},
      py = {},
      n = z.length,
      s = 0, I = 0, H = 0, p, t, i;

  for (i=0; i<n; ++i) {
    px[x[i]] = 0;
    py[y[i]] = 0;
  }

  for (i=0; i<n; ++i) {
    px[x[i]] += z[i];
    py[y[i]] += z[i];
    s += z[i];
  }

  t = 1 / (s * Math.LN2);
  for (i=0; i<n; ++i) {
    if (z[i] === 0) continue;
    p = (s * z[i]) / (px[x[i]] * py[y[i]]);
    I += z[i] * t * Math.log(p);
    H += z[i] * t * Math.log(z[i]/s);
  }

  return [I, 1 + I/H];
};

// Compute the mutual information between two discrete variables.
stats.mutual.info = function(values, a, b, counts) {
  return stats.mutual(values, a, b, counts)[0];
};

// Compute the mutual information distance between two discrete variables.
// MI_distance is defined as 1 - I(a,b) / H(a,b).
stats.mutual.dist = function(values, a, b, counts) {
  return stats.mutual(values, a, b, counts)[1];
};

// Compute a profile of summary statistics for a variable.
stats.profile = function(values, f) {
  var mean = 0,
      valid = 0,
      missing = 0,
      distinct = 0,
      min = null,
      max = null,
      M2 = 0,
      vals = [],
      u = {}, delta, sd, i, v, x;

  // compute summary stats
  for (i=0; i<values.length; ++i) {
    v = f ? f(values[i]) : values[i];

    // update unique values
    u[v] = (v in u) ? u[v] + 1 : (distinct += 1, 1);

    if (v == null) {
      ++missing;
    } else if (util.isValid(v)) {
      // update stats
      x = (typeof v === 'string') ? v.length : v;
      if (min===null || x < min) min = x;
      if (max===null || x > max) max = x;
      delta = x - mean;
      mean = mean + delta / (++valid);
      M2 = M2 + delta * (x - mean);
      vals.push(x);
    }
  }
  M2 = M2 / (valid - 1);
  sd = Math.sqrt(M2);

  // sort values for median and iqr
  vals.sort(util.cmp);

  return {
    type:     type(values, f),
    unique:   u,
    count:    values.length,
    valid:    valid,
    missing:  missing,
    distinct: distinct,
    min:      min,
    max:      max,
    mean:     mean,
    stdev:    sd,
    median:   (v = stats.quantile(vals, 0.5)),
    q1:       stats.quantile(vals, 0.25),
    q3:       stats.quantile(vals, 0.75),
    modeskew: sd === 0 ? 0 : (mean - v) / sd
  };
};

// Compute profiles for all variables in a data set.
stats.summary = function(data, fields) {
  fields = fields || util.keys(data[0]);
  var s = fields.map(function(f) {
    var p = stats.profile(data, util.$(f));
    return (p.field = f, p);
  });
  return (s.__summary__ = true, s);
};

module.exports = stats;

},{"./generate":22,"./import/type":23,"./util":26}],25:[function(require,module,exports){
var d3_time = require('d3-time');

var tempDate = new Date(),
    baseDate = new Date(0, 0, 1).setFullYear(0), // Jan 1, 0 AD
    utcBaseDate = new Date(Date.UTC(0, 0, 1)).setUTCFullYear(0);

function date(d) {
  return (tempDate.setTime(+d), tempDate);
}

// create a time unit entry
function entry(type, date, unit, step, min, max) {
  var e = {
    type: type,
    date: date,
    unit: unit
  };
  if (step) {
    e.step = step;
  } else {
    e.minstep = 1;
  }
  if (min != null) e.min = min;
  if (max != null) e.max = max;
  return e;
}

function create(type, unit, base, step, min, max) {
  return entry(type,
    function(d) { return unit.offset(base, d); },
    function(d) { return unit.count(base, d); },
    step, min, max);
}

var locale = [
  create('second', d3_time.second, baseDate),
  create('minute', d3_time.minute, baseDate),
  create('hour',   d3_time.hour,   baseDate),
  create('day',    d3_time.day,    baseDate, [1, 7]),
  create('month',  d3_time.month,  baseDate, [1, 3, 6]),
  create('year',   d3_time.year,   baseDate),

  // periodic units
  entry('seconds',
    function(d) { return new Date(1970, 0, 1, 0, 0, d); },
    function(d) { return date(d).getSeconds(); },
    null, 0, 59
  ),
  entry('minutes',
    function(d) { return new Date(1970, 0, 1, 0, d); },
    function(d) { return date(d).getMinutes(); },
    null, 0, 59
  ),
  entry('hours',
    function(d) { return new Date(1970, 0, 1, d); },
    function(d) { return date(d).getHours(); },
    null, 0, 23
  ),
  entry('weekdays',
    function(d) { return new Date(1970, 0, 4+d); },
    function(d) { return date(d).getDay(); },
    [1], 0, 6
  ),
  entry('dates',
    function(d) { return new Date(1970, 0, d); },
    function(d) { return date(d).getDate(); },
    [1], 1, 31
  ),
  entry('months',
    function(d) { return new Date(1970, d % 12, 1); },
    function(d) { return date(d).getMonth(); },
    [1], 0, 11
  )
];

var utc = [
  create('second', d3_time.utcSecond, utcBaseDate),
  create('minute', d3_time.utcMinute, utcBaseDate),
  create('hour',   d3_time.utcHour,   utcBaseDate),
  create('day',    d3_time.utcDay,    utcBaseDate, [1, 7]),
  create('month',  d3_time.utcMonth,  utcBaseDate, [1, 3, 6]),
  create('year',   d3_time.utcYear,   utcBaseDate),

  // periodic units
  entry('seconds',
    function(d) { return new Date(Date.UTC(1970, 0, 1, 0, 0, d)); },
    function(d) { return date(d).getUTCSeconds(); },
    null, 0, 59
  ),
  entry('minutes',
    function(d) { return new Date(Date.UTC(1970, 0, 1, 0, d)); },
    function(d) { return date(d).getUTCMinutes(); },
    null, 0, 59
  ),
  entry('hours',
    function(d) { return new Date(Date.UTC(1970, 0, 1, d)); },
    function(d) { return date(d).getUTCHours(); },
    null, 0, 23
  ),
  entry('weekdays',
    function(d) { return new Date(Date.UTC(1970, 0, 4+d)); },
    function(d) { return date(d).getUTCDay(); },
    [1], 0, 6
  ),
  entry('dates',
    function(d) { return new Date(Date.UTC(1970, 0, d)); },
    function(d) { return date(d).getUTCDate(); },
    [1], 1, 31
  ),
  entry('months',
    function(d) { return new Date(Date.UTC(1970, d % 12, 1)); },
    function(d) { return date(d).getUTCMonth(); },
    [1], 0, 11
  )
];

var STEPS = [
  [31536e6, 5],  // 1-year
  [7776e6, 4],   // 3-month
  [2592e6, 4],   // 1-month
  [12096e5, 3],  // 2-week
  [6048e5, 3],   // 1-week
  [1728e5, 3],   // 2-day
  [864e5, 3],    // 1-day
  [432e5, 2],    // 12-hour
  [216e5, 2],    // 6-hour
  [108e5, 2],    // 3-hour
  [36e5, 2],     // 1-hour
  [18e5, 1],     // 30-minute
  [9e5, 1],      // 15-minute
  [3e5, 1],      // 5-minute
  [6e4, 1],      // 1-minute
  [3e4, 0],      // 30-second
  [15e3, 0],     // 15-second
  [5e3, 0],      // 5-second
  [1e3, 0]       // 1-second
];

function find(units, span, minb, maxb) {
  var step = STEPS[0], i, n, bins;

  for (i=1, n=STEPS.length; i<n; ++i) {
    step = STEPS[i];
    if (span > step[0]) {
      bins = span / step[0];
      if (bins > maxb) {
        return units[STEPS[i-1][1]];
      }
      if (bins >= minb) {
        return units[step[1]];
      }
    }
  }
  return units[STEPS[n-1][1]];
}

function toUnitMap(units) {
  var map = {}, i, n;
  for (i=0, n=units.length; i<n; ++i) {
    map[units[i].type] = units[i];
  }
  map.find = function(span, minb, maxb) {
    return find(units, span, minb, maxb);
  };
  return map;
}

module.exports = toUnitMap(locale);
module.exports.utc = toUnitMap(utc);

},{"d3-time":20}],26:[function(require,module,exports){
var buffer = require('buffer'),
    time = require('./time'),
    utc = time.utc;

var u = module.exports = {};

// utility functions

var FNAME = '__name__';

u.namedfunc = function(name, f) { return (f[FNAME] = name, f); };

u.name = function(f) { return f==null ? null : f[FNAME]; };

u.identity = function(x) { return x; };

u.true = u.namedfunc('true', function() { return true; });

u.false = u.namedfunc('false', function() { return false; });

u.duplicate = function(obj) {
  return JSON.parse(JSON.stringify(obj));
};

u.equal = function(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
};

u.extend = function(obj) {
  for (var x, name, i=1, len=arguments.length; i<len; ++i) {
    x = arguments[i];
    for (name in x) { obj[name] = x[name]; }
  }
  return obj;
};

u.length = function(x) {
  return x != null && x.length != null ? x.length : null;
};

u.keys = function(x) {
  var keys = [], k;
  for (k in x) keys.push(k);
  return keys;
};

u.vals = function(x) {
  var vals = [], k;
  for (k in x) vals.push(x[k]);
  return vals;
};

u.toMap = function(list, f) {
  return (f = u.$(f)) ?
    list.reduce(function(obj, x) { return (obj[f(x)] = 1, obj); }, {}) :
    list.reduce(function(obj, x) { return (obj[x] = 1, obj); }, {});
};

u.keystr = function(values) {
  // use to ensure consistent key generation across modules
  var n = values.length;
  if (!n) return '';
  for (var s=String(values[0]), i=1; i<n; ++i) {
    s += '|' + String(values[i]);
  }
  return s;
};

// type checking functions

var toString = Object.prototype.toString;

u.isObject = function(obj) {
  return obj === Object(obj);
};

u.isFunction = function(obj) {
  return toString.call(obj) === '[object Function]';
};

u.isString = function(obj) {
  return typeof value === 'string' || toString.call(obj) === '[object String]';
};

u.isArray = Array.isArray || function(obj) {
  return toString.call(obj) === '[object Array]';
};

u.isNumber = function(obj) {
  return typeof obj === 'number' || toString.call(obj) === '[object Number]';
};

u.isBoolean = function(obj) {
  return obj === true || obj === false || toString.call(obj) == '[object Boolean]';
};

u.isDate = function(obj) {
  return toString.call(obj) === '[object Date]';
};

u.isValid = function(obj) {
  return obj != null && obj === obj;
};

u.isBuffer = (buffer.Buffer && buffer.Buffer.isBuffer) || u.false;

// type coercion functions

u.number = function(s) {
  return s == null || s === '' ? null : +s;
};

u.boolean = function(s) {
  return s == null || s === '' ? null : s==='false' ? false : !!s;
};

// parse a date with optional d3.time-format format
u.date = function(s, format) {
  var d = format ? format : Date;
  return s == null || s === '' ? null : d.parse(s);
};

u.array = function(x) {
  return x != null ? (u.isArray(x) ? x : [x]) : [];
};

u.str = function(x) {
  return u.isArray(x) ? '[' + x.map(u.str) + ']'
    : u.isObject(x) ? JSON.stringify(x)
    : u.isString(x) ? ('\''+util_escape_str(x)+'\'') : x;
};

var escape_str_re = /(^|[^\\])'/g;

function util_escape_str(x) {
  return x.replace(escape_str_re, '$1\\\'');
}

// data access functions

var field_re = /\[(.*?)\]|[^.\[]+/g;

u.field = function(f) {
  return String(f).match(field_re).map(function(d) {
    return d[0] !== '[' ? d :
      d[1] !== "'" && d[1] !== '"' ? d.slice(1, -1) :
      d.slice(2, -2).replace(/\\(["'])/g, '$1');
  });
};

u.accessor = function(f) {
  var s;
  return f==null || u.isFunction(f) ? f :
    u.namedfunc(f, (s = u.field(f)).length > 1 ?
      function(x) { return s.reduce(function(x,f) { return x[f]; }, x); } :
      function(x) { return x[f]; }
    );
};

// short-cut for accessor
u.$ = u.accessor;

u.mutator = function(f) {
  var s;
  return u.isString(f) && (s=u.field(f)).length > 1 ?
    function(x, v) {
      for (var i=0; i<s.length-1; ++i) x = x[s[i]];
      x[s[i]] = v;
    } :
    function(x, v) { x[f] = v; };
};


u.$func = function(name, op) {
  return function(f) {
    f = u.$(f) || u.identity;
    var n = name + (u.name(f) ? '_'+u.name(f) : '');
    return u.namedfunc(n, function(d) { return op(f(d)); });
  };
};

u.$valid  = u.$func('valid', u.isValid);
u.$length = u.$func('length', u.length);

u.$in = function(f, values) {
  f = u.$(f);
  var map = u.isArray(values) ? u.toMap(values) : values;
  return function(d) { return !!map[f(d)]; };
};

u.$year   = u.$func('year', time.year.unit);
u.$month  = u.$func('month', time.months.unit);
u.$date   = u.$func('date', time.dates.unit);
u.$day    = u.$func('day', time.weekdays.unit);
u.$hour   = u.$func('hour', time.hours.unit);
u.$minute = u.$func('minute', time.minutes.unit);
u.$second = u.$func('second', time.seconds.unit);

u.$utcYear   = u.$func('utcYear', utc.year.unit);
u.$utcMonth  = u.$func('utcMonth', utc.months.unit);
u.$utcDate   = u.$func('utcDate', utc.dates.unit);
u.$utcDay    = u.$func('utcDay', utc.weekdays.unit);
u.$utcHour   = u.$func('utcHour', utc.hours.unit);
u.$utcMinute = u.$func('utcMinute', utc.minutes.unit);
u.$utcSecond = u.$func('utcSecond', utc.seconds.unit);

// comparison / sorting functions

u.comparator = function(sort) {
  var sign = [];
  if (sort === undefined) sort = [];
  sort = u.array(sort).map(function(f) {
    var s = 1;
    if      (f[0] === '-') { s = -1; f = f.slice(1); }
    else if (f[0] === '+') { s = +1; f = f.slice(1); }
    sign.push(s);
    return u.accessor(f);
  });
  return function(a,b) {
    var i, n, f, x, y;
    for (i=0, n=sort.length; i<n; ++i) {
      f = sort[i]; x = f(a); y = f(b);
      if (x < y) return -1 * sign[i];
      if (x > y) return sign[i];
    }
    return 0;
  };
};

u.cmp = function(a, b) {
  if (a < b) {
    return -1;
  } else if (a > b) {
    return 1;
  } else if (a >= b) {
    return 0;
  } else if (a === null) {
    return -1;
  } else if (b === null) {
    return 1;
  }
  return NaN;
};

u.numcmp = function(a, b) { return a - b; };

u.stablesort = function(array, sortBy, keyFn) {
  var indices = array.reduce(function(idx, v, i) {
    return (idx[keyFn(v)] = i, idx);
  }, {});

  array.sort(function(a, b) {
    var sa = sortBy(a),
        sb = sortBy(b);
    return sa < sb ? -1 : sa > sb ? 1
         : (indices[keyFn(a)] - indices[keyFn(b)]);
  });

  return array;
};


// string functions

u.pad = function(s, length, pos, padchar) {
  padchar = padchar || " ";
  var d = length - s.length;
  if (d <= 0) return s;
  switch (pos) {
    case 'left':
      return strrep(d, padchar) + s;
    case 'middle':
    case 'center':
      return strrep(Math.floor(d/2), padchar) +
         s + strrep(Math.ceil(d/2), padchar);
    default:
      return s + strrep(d, padchar);
  }
};

function strrep(n, str) {
  var s = "", i;
  for (i=0; i<n; ++i) s += str;
  return s;
}

u.truncate = function(s, length, pos, word, ellipsis) {
  var len = s.length;
  if (len <= length) return s;
  ellipsis = ellipsis !== undefined ? String(ellipsis) : '\u2026';
  var l = Math.max(0, length - ellipsis.length);

  switch (pos) {
    case 'left':
      return ellipsis + (word ? truncateOnWord(s,l,1) : s.slice(len-l));
    case 'middle':
    case 'center':
      var l1 = Math.ceil(l/2), l2 = Math.floor(l/2);
      return (word ? truncateOnWord(s,l1) : s.slice(0,l1)) +
        ellipsis + (word ? truncateOnWord(s,l2,1) : s.slice(len-l2));
    default:
      return (word ? truncateOnWord(s,l) : s.slice(0,l)) + ellipsis;
  }
};

function truncateOnWord(s, len, rev) {
  var cnt = 0, tok = s.split(truncate_word_re);
  if (rev) {
    s = (tok = tok.reverse())
      .filter(function(w) { cnt += w.length; return cnt <= len; })
      .reverse();
  } else {
    s = tok.filter(function(w) { cnt += w.length; return cnt <= len; });
  }
  return s.length ? s.join('').trim() : tok[0].slice(0, len);
}

var truncate_word_re = /([\u0009\u000A\u000B\u000C\u000D\u0020\u00A0\u1680\u180E\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u2028\u2029\u3000\uFEFF])/;

},{"./time":25,"buffer":1}],27:[function(require,module,exports){
exports.AGGREGATE_OPS = [
    'values', 'count', 'valid', 'missing', 'distinct',
    'sum', 'mean', 'average', 'variance', 'variancep', 'stdev',
    'stdevp', 'median', 'q1', 'q3', 'modeskew', 'min', 'max',
    'argmin', 'argmax'
];
exports.SHARED_DOMAIN_OPS = [
    'mean', 'average', 'stdev', 'stdevp', 'median', 'q1', 'q3', 'min', 'max'
];

},{}],28:[function(require,module,exports){
exports.MAXBINS_DEFAULT = 15;

},{}],29:[function(require,module,exports){
(function (Channel) {
    Channel[Channel["X"] = 'x'] = "X";
    Channel[Channel["Y"] = 'y'] = "Y";
    Channel[Channel["ROW"] = 'row'] = "ROW";
    Channel[Channel["COLUMN"] = 'column'] = "COLUMN";
    Channel[Channel["SHAPE"] = 'shape'] = "SHAPE";
    Channel[Channel["SIZE"] = 'size'] = "SIZE";
    Channel[Channel["COLOR"] = 'color'] = "COLOR";
    Channel[Channel["TEXT"] = 'text'] = "TEXT";
    Channel[Channel["DETAIL"] = 'detail'] = "DETAIL";
})(exports.Channel || (exports.Channel = {}));
var Channel = exports.Channel;
exports.X = Channel.X;
exports.Y = Channel.Y;
exports.ROW = Channel.ROW;
exports.COLUMN = Channel.COLUMN;
exports.SHAPE = Channel.SHAPE;
exports.SIZE = Channel.SIZE;
exports.COLOR = Channel.COLOR;
exports.TEXT = Channel.TEXT;
exports.DETAIL = Channel.DETAIL;
exports.CHANNELS = [exports.X, exports.Y, exports.ROW, exports.COLUMN, exports.SIZE, exports.SHAPE, exports.COLOR, exports.TEXT, exports.DETAIL];
;
function supportMark(channel, mark) {
    return !!getSupportedMark(channel)[mark];
}
exports.supportMark = supportMark;
function getSupportedMark(channel) {
    switch (channel) {
        case exports.X:
        case exports.Y:
            return {
                point: true, tick: true, circle: true, square: true,
                bar: true, line: true, area: true
            };
        case exports.ROW:
        case exports.COLUMN:
            return {
                point: true, tick: true, circle: true, square: true,
                bar: true, line: true, area: true, text: true
            };
        case exports.SIZE:
            return {
                point: true, tick: true, circle: true, square: true,
                bar: true, text: true
            };
        case exports.COLOR:
        case exports.DETAIL:
            return {
                point: true, tick: true, circle: true, square: true,
                bar: true, line: true, area: true, text: true
            };
        case exports.SHAPE:
            return { point: true };
        case exports.TEXT:
            return { text: true };
    }
    return {};
}
exports.getSupportedMark = getSupportedMark;
;
function getSupportedRole(channel) {
    switch (channel) {
        case exports.X:
        case exports.Y:
        case exports.COLOR:
            return {
                measure: true,
                dimension: true
            };
        case exports.ROW:
        case exports.COLUMN:
        case exports.SHAPE:
        case exports.DETAIL:
            return {
                measure: false,
                dimension: true
            };
        case exports.SIZE:
        case exports.TEXT:
            return {
                measure: true,
                dimension: false
            };
    }
    throw new Error('Invalid encoding channel' + channel);
}
exports.getSupportedRole = getSupportedRole;

},{}],30:[function(require,module,exports){
var bin_1 = require('../bin');
var channel_1 = require('../channel');
var data_1 = require('../data');
var vlFieldDef = require('../fielddef');
var vlEncoding = require('../encoding');
var layout_1 = require('./layout');
var mark_1 = require('../mark');
var schema = require('../schema/schema');
var schemaUtil = require('../schema/schemautil');
var type_1 = require('../type');
var util_1 = require('../util');
var time = require('./time');
var Model = (function () {
    function Model(spec, theme) {
        var defaults = schema.instantiate();
        this._spec = schemaUtil.merge(defaults, theme || {}, spec);
        vlEncoding.forEach(this._spec.encoding, function (fieldDef, channel) {
            if (fieldDef.type) {
                fieldDef.type = type_1.getFullName(fieldDef.type);
            }
        });
        this._stack = this.getStackProperties();
        this._layout = layout_1.compileLayout(this);
    }
    Model.prototype.getStackProperties = function () {
        var stackChannel = (this.has(channel_1.COLOR)) ? channel_1.COLOR : (this.has(channel_1.DETAIL)) ? channel_1.DETAIL : null;
        if (stackChannel &&
            (this.is(mark_1.BAR) || this.is(mark_1.AREA)) &&
            this.config('stack') !== false &&
            this.isAggregate()) {
            var isXMeasure = this.isMeasure(channel_1.X);
            var isYMeasure = this.isMeasure(channel_1.Y);
            if (isXMeasure && !isYMeasure) {
                return {
                    groupbyChannel: channel_1.Y,
                    fieldChannel: channel_1.X,
                    stackChannel: stackChannel,
                    config: this.config('stack')
                };
            }
            else if (isYMeasure && !isXMeasure) {
                return {
                    groupbyChannel: channel_1.X,
                    fieldChannel: channel_1.Y,
                    stackChannel: stackChannel,
                    config: this.config('stack')
                };
            }
        }
        return null;
    };
    Model.prototype.layout = function () {
        return this._layout;
    };
    Model.prototype.stack = function () {
        return this._stack;
    };
    Model.prototype.toSpec = function (excludeConfig, excludeData) {
        var encoding = util_1.duplicate(this._spec.encoding), spec;
        spec = {
            mark: this._spec.mark,
            encoding: encoding
        };
        if (!excludeConfig) {
            spec.config = util_1.duplicate(this._spec.config);
        }
        if (!excludeData) {
            spec.data = util_1.duplicate(this._spec.data);
        }
        var defaults = schema.instantiate();
        return schemaUtil.subtract(spec, defaults);
    };
    Model.prototype.mark = function () {
        return this._spec.mark;
    };
    Model.prototype.spec = function () {
        return this._spec;
    };
    Model.prototype.is = function (mark) {
        return this._spec.mark === mark;
    };
    Model.prototype.has = function (channel) {
        return this._spec.encoding[channel].field !== undefined;
    };
    Model.prototype.fieldDef = function (channel) {
        return this._spec.encoding[channel];
    };
    Model.prototype.field = function (channel, opt) {
        opt = opt || {};
        var fieldDef = this.fieldDef(channel);
        var f = (opt.datum ? 'datum.' : '') + (opt.prefn || ''), field = fieldDef.field;
        if (vlFieldDef.isCount(fieldDef)) {
            return f + 'count';
        }
        else if (opt.fn) {
            return f + opt.fn + '_' + field;
        }
        else if (!opt.nofn && fieldDef.bin) {
            var binSuffix = opt.binSuffix || '_start';
            return f + 'bin_' + field + binSuffix;
        }
        else if (!opt.nofn && !opt.noAggregate && fieldDef.aggregate) {
            return f + fieldDef.aggregate + '_' + field;
        }
        else if (!opt.nofn && fieldDef.timeUnit) {
            return f + fieldDef.timeUnit + '_' + field;
        }
        else {
            return f + field;
        }
    };
    Model.prototype.fieldTitle = function (channel) {
        if (vlFieldDef.isCount(this._spec.encoding[channel])) {
            return vlFieldDef.COUNT_DISPLAYNAME;
        }
        var fn = this._spec.encoding[channel].aggregate || this._spec.encoding[channel].timeUnit || (this._spec.encoding[channel].bin && 'bin');
        if (fn) {
            return fn.toUpperCase() + '(' + this._spec.encoding[channel].field + ')';
        }
        else {
            return this._spec.encoding[channel].field;
        }
    };
    Model.prototype.bin = function (channel) {
        var bin = this._spec.encoding[channel].bin;
        if (bin === {})
            return false;
        if (bin === true)
            return {
                maxbins: bin_1.MAXBINS_DEFAULT
            };
        return bin;
    };
    Model.prototype.numberFormat = function (channel) {
        return this.config('numberFormat');
    };
    ;
    Model.prototype.map = function (f) {
        return vlEncoding.map(this._spec.encoding, f);
    };
    Model.prototype.reduce = function (f, init) {
        return vlEncoding.reduce(this._spec.encoding, f, init);
    };
    Model.prototype.forEach = function (f) {
        return vlEncoding.forEach(this._spec.encoding, f);
    };
    Model.prototype.isOrdinalScale = function (channel) {
        var fieldDef = this.fieldDef(channel);
        return fieldDef && (util_1.contains([type_1.NOMINAL, type_1.ORDINAL], fieldDef.type) ||
            (fieldDef.type === type_1.TEMPORAL && fieldDef.timeUnit &&
                time.scale.type(fieldDef.timeUnit, channel) === 'ordinal'));
    };
    Model.prototype.isDimension = function (channel) {
        return this.has(channel) &&
            vlFieldDef.isDimension(this.fieldDef(channel));
    };
    Model.prototype.isMeasure = function (channel) {
        return this.has(channel) &&
            vlFieldDef.isMeasure(this.fieldDef(channel));
    };
    Model.prototype.isAggregate = function () {
        return vlEncoding.isAggregate(this._spec.encoding);
    };
    Model.prototype.isFacet = function () {
        return this.has(channel_1.ROW) || this.has(channel_1.COLUMN);
    };
    Model.prototype.dataTable = function () {
        return this.isAggregate() ? data_1.SUMMARY : data_1.SOURCE;
    };
    Model.prototype.data = function () {
        return this._spec.data;
    };
    Model.prototype.hasValues = function () {
        var vals = this.data().values;
        return vals && vals.length;
    };
    Model.prototype.config = function (name) {
        return this._spec.config[name];
    };
    Model.prototype.markOpacity = function () {
        var opacity = this.config('marks').opacity;
        if (opacity) {
            return opacity;
        }
        else {
            if (util_1.contains([mark_1.POINT, mark_1.TICK, mark_1.CIRCLE, mark_1.SQUARE], this.mark())) {
                if (!this.isAggregate() ||
                    (this.has(channel_1.DETAIL) || this.has(channel_1.COLOR) || this.has(channel_1.SHAPE))) {
                    return 0.7;
                }
            }
        }
        return undefined;
    };
    return Model;
})();
exports.Model = Model;

},{"../bin":28,"../channel":29,"../data":33,"../encoding":34,"../fielddef":35,"../mark":36,"../schema/schema":49,"../schema/schemautil":50,"../type":55,"../util":56,"./layout":31,"./time":32}],31:[function(require,module,exports){
var channel_1 = require('../channel');
var mark_1 = require('../mark');
var data_1 = require('../data');
function compileLayout(model) {
    var cellWidth = getCellWidth(model);
    var cellHeight = getCellHeight(model);
    return {
        cellWidth: cellWidth,
        cellHeight: cellHeight,
        width: getWidth(model, cellWidth),
        height: getHeight(model, cellHeight)
    };
}
exports.compileLayout = compileLayout;
function getCellWidth(model) {
    if (model.has(channel_1.X)) {
        if (model.isOrdinalScale(channel_1.X)) {
            return { data: data_1.LAYOUT, field: 'cellWidth' };
        }
        return model.config('cell').width;
    }
    if (model.mark() === mark_1.TEXT) {
        return model.config('textCellWidth');
    }
    return model.fieldDef(channel_1.X).scale.bandWidth;
}
function getWidth(model, cellWidth) {
    if (model.has(channel_1.COLUMN)) {
        return { data: data_1.LAYOUT, field: 'width' };
    }
    return cellWidth;
}
function getCellHeight(model) {
    if (model.has(channel_1.Y)) {
        if (model.isOrdinalScale(channel_1.Y)) {
            return { data: data_1.LAYOUT, field: 'cellHeight' };
        }
        else {
            return model.config('cell').height;
        }
    }
    return model.fieldDef(channel_1.Y).scale.bandWidth;
}
function getHeight(model, cellHeight) {
    if (model.has(channel_1.ROW)) {
        return { data: data_1.LAYOUT, field: 'height' };
    }
    return cellHeight;
}

},{"../channel":29,"../data":33,"../mark":36}],32:[function(require,module,exports){
var util = require('../util');
var channel_1 = require('../channel');
function cardinality(fieldDef, stats, filterNull, type) {
    var timeUnit = fieldDef.timeUnit;
    switch (timeUnit) {
        case 'seconds': return 60;
        case 'minutes': return 60;
        case 'hours': return 24;
        case 'day': return 7;
        case 'date': return 31;
        case 'month': return 12;
        case 'year':
            var stat = stats[fieldDef.field], yearstat = stats['year_' + fieldDef.field];
            if (!yearstat) {
                return null;
            }
            return yearstat.distinct -
                (stat.missing > 0 && filterNull[type] ? 1 : 0);
    }
    return null;
}
exports.cardinality = cardinality;
function formula(timeUnit, field) {
    var fn = 'utc' + timeUnit;
    return fn + '(' + field + ')';
}
exports.formula = formula;
var scale;
(function (scale) {
    function type(timeUnit, channel) {
        if (channel === channel_1.COLOR) {
            return 'linear';
        }
        if (channel === channel_1.COLUMN || channel === channel_1.ROW) {
            return 'ordinal';
        }
        switch (timeUnit) {
            case 'hours':
            case 'day':
            case 'date':
            case 'month':
                return 'ordinal';
            case 'year':
            case 'second':
            case 'minute':
                return 'linear';
        }
        return 'time';
    }
    scale.type = type;
    function domain(timeUnit, channel) {
        var isColor = channel === channel_1.COLOR;
        switch (timeUnit) {
            case 'seconds':
            case 'minutes': return isColor ? [0, 59] : util.range(0, 60);
            case 'hours': return isColor ? [0, 23] : util.range(0, 24);
            case 'day': return isColor ? [0, 6] : util.range(0, 7);
            case 'date': return isColor ? [1, 31] : util.range(1, 32);
            case 'month': return isColor ? [0, 11] : util.range(0, 12);
        }
        return null;
    }
    scale.domain = domain;
})(scale = exports.scale || (exports.scale = {}));
function labelTemplate(timeUnit, abbreviated) {
    if (abbreviated === void 0) { abbreviated = false; }
    var postfix = abbreviated ? '-abbrev' : '';
    switch (timeUnit) {
        case 'day':
            return 'day' + postfix;
        case 'month':
            return 'month' + postfix;
    }
    return null;
}
exports.labelTemplate = labelTemplate;

},{"../channel":29,"../util":56}],33:[function(require,module,exports){
var type_1 = require('./type');
exports.SUMMARY = 'summary';
exports.SOURCE = 'source';
exports.STACKED = 'stacked';
exports.LAYOUT = 'layout';
exports.types = {
    'boolean': type_1.NOMINAL,
    'number': type_1.QUANTITATIVE,
    'integer': type_1.QUANTITATIVE,
    'date': type_1.TEMPORAL,
    'string': type_1.NOMINAL
};

},{"./type":55}],34:[function(require,module,exports){
var channel_1 = require('./channel');
function countRetinal(encoding) {
    var count = 0;
    if (encoding.color)
        count++;
    if (encoding.size)
        count++;
    if (encoding.shape)
        count++;
    return count;
}
exports.countRetinal = countRetinal;
function has(encoding, channel) {
    var fieldDef = encoding && encoding[channel];
    return fieldDef && fieldDef.field;
}
exports.has = has;
function isAggregate(encoding) {
    for (var k in encoding) {
        if (has(encoding, k) && encoding[k].aggregate) {
            return true;
        }
    }
    return false;
}
exports.isAggregate = isAggregate;
function fieldDefs(encoding) {
    var arr = [];
    channel_1.CHANNELS.forEach(function (k) {
        if (has(encoding, k)) {
            arr.push(encoding[k]);
        }
    });
    return arr;
}
exports.fieldDefs = fieldDefs;
;
function forEach(encoding, f) {
    var i = 0;
    channel_1.CHANNELS.forEach(function (channel) {
        if (has(encoding, channel)) {
            f(encoding[channel], channel, i++);
        }
    });
}
exports.forEach = forEach;
function map(encoding, f) {
    var arr = [];
    channel_1.CHANNELS.forEach(function (k) {
        if (has(encoding, k)) {
            arr.push(f(encoding[k], k, encoding));
        }
    });
    return arr;
}
exports.map = map;
function reduce(encoding, f, init) {
    var r = init;
    channel_1.CHANNELS.forEach(function (k) {
        if (has(encoding, k)) {
            r = f(r, encoding[k], k, encoding);
        }
    });
    return r;
}
exports.reduce = reduce;

},{"./channel":29}],35:[function(require,module,exports){
var bin_1 = require('./bin');
var util_1 = require('./util');
var time = require('./compiler/time');
var type_1 = require('./type');
function _isFieldDimension(fieldDef) {
    return util_1.contains([type_1.NOMINAL, type_1.ORDINAL], fieldDef.type) || !!fieldDef.bin ||
        (fieldDef.type === type_1.TEMPORAL && !!fieldDef.timeUnit);
}
function isDimension(fieldDef) {
    return fieldDef && _isFieldDimension(fieldDef);
}
exports.isDimension = isDimension;
function isMeasure(fieldDef) {
    return fieldDef && !_isFieldDimension(fieldDef);
}
exports.isMeasure = isMeasure;
function count() {
    return { field: '*', aggregate: 'count', type: type_1.QUANTITATIVE, displayName: exports.COUNT_DISPLAYNAME };
}
exports.count = count;
exports.COUNT_DISPLAYNAME = 'Number of Records';
function isCount(fieldDef) {
    return fieldDef.aggregate === 'count';
}
exports.isCount = isCount;
function cardinality(fieldDef, stats, filterNull) {
    if (filterNull === void 0) { filterNull = {}; }
    var stat = stats[fieldDef.field];
    var type = fieldDef.type;
    if (fieldDef.bin) {
        var bin = fieldDef.bin;
        var maxbins = (typeof bin === 'boolean') ? bin_1.MAXBINS_DEFAULT : bin.maxbins;
        var bins = util_1.getbins(stat, maxbins);
        return (bins.stop - bins.start) / bins.step;
    }
    if (fieldDef.type === type_1.TEMPORAL) {
        var cardinality = time.cardinality(fieldDef, stats, filterNull, type);
        if (cardinality !== null)
            return cardinality;
    }
    if (fieldDef.aggregate) {
        return 1;
    }
    return stat.distinct -
        (stat.missing > 0 && filterNull[type] ? 1 : 0);
}
exports.cardinality = cardinality;

},{"./bin":28,"./compiler/time":32,"./type":55,"./util":56}],36:[function(require,module,exports){
(function (Mark) {
    Mark[Mark["AREA"] = 'area'] = "AREA";
    Mark[Mark["BAR"] = 'bar'] = "BAR";
    Mark[Mark["LINE"] = 'line'] = "LINE";
    Mark[Mark["POINT"] = 'point'] = "POINT";
    Mark[Mark["TEXT"] = 'text'] = "TEXT";
    Mark[Mark["TICK"] = 'tick'] = "TICK";
    Mark[Mark["CIRCLE"] = 'circle'] = "CIRCLE";
    Mark[Mark["SQUARE"] = 'square'] = "SQUARE";
})(exports.Mark || (exports.Mark = {}));
var Mark = exports.Mark;
exports.AREA = Mark.AREA;
exports.BAR = Mark.BAR;
exports.LINE = Mark.LINE;
exports.POINT = Mark.POINT;
exports.TEXT = Mark.TEXT;
exports.TICK = Mark.TICK;
exports.CIRCLE = Mark.CIRCLE;
exports.SQUARE = Mark.SQUARE;

},{}],37:[function(require,module,exports){
exports.axis = {
    type: 'object',
    properties: {
        format: {
            type: 'string',
            default: undefined,
            description: 'The formatting pattern for axis labels. ' +
                'If not undefined, this will be determined by ' +
                'the max value ' +
                'of the field.'
        },
        grid: {
            type: 'boolean',
            default: undefined,
            description: 'A flag indicate if gridlines should be created in addition to ticks. If `grid` is unspecified, the default value is `true` for ROW and COL. For X and Y, the default value is `true` for quantitative and time fields and `false` otherwise.'
        },
        layer: {
            type: 'string',
            default: undefined,
            description: 'A string indicating if the axis (and any gridlines) should be placed above or below the data marks.'
        },
        orient: {
            type: 'string',
            default: undefined,
            enum: ['top', 'right', 'left', 'bottom'],
            description: 'The orientation of the axis. One of top, bottom, left or right. The orientation can be used to further specialize the axis type (e.g., a y axis oriented for the right edge of the chart).'
        },
        ticks: {
            type: 'integer',
            default: undefined,
            minimum: 0,
            description: 'A desired number of ticks, for axes visualizing quantitative scales. The resulting number may be different so that values are "nice" (multiples of 2, 5, 10) and lie within the underlying scale\'s range.'
        },
        title: {
            type: 'string',
            default: undefined,
            description: 'A title for the axis. (Shows field name and its function by default.)'
        },
        labelMaxLength: {
            type: 'integer',
            default: 25,
            minimum: 0,
            description: 'Truncate labels that are too long.'
        },
        titleMaxLength: {
            type: 'integer',
            default: undefined,
            minimum: 0,
            description: 'Max length for axis title if the title is automatically generated from the field\'s description'
        },
        titleOffset: {
            type: 'integer',
            default: undefined,
            description: 'A title offset value for the axis.'
        },
        shortTimeNames: {
            type: 'boolean',
            default: false,
            description: 'Whether month names and weekday names should be abbreviated.'
        },
        properties: {
            type: 'object',
            default: undefined,
            description: 'Optional mark property definitions for custom axis styling.'
        }
    }
};

},{}],38:[function(require,module,exports){
var bin_1 = require('../bin');
var type_1 = require('../type');
var util_1 = require('../util');
exports.bin = {
    type: ['boolean', 'object'],
    default: false,
    properties: {
        maxbins: {
            type: 'integer',
            default: bin_1.MAXBINS_DEFAULT,
            minimum: 2,
            description: 'Maximum number of bins.'
        }
    },
    supportedTypes: util_1.toMap([type_1.QUANTITATIVE])
};

},{"../bin":28,"../type":55,"../util":56}],39:[function(require,module,exports){
exports.cellConfig = {
    type: 'object',
    properties: {
        width: {
            type: 'integer',
            default: 200
        },
        height: {
            type: 'integer',
            default: 200
        },
        padding: {
            type: 'integer',
            default: 16,
            description: 'default padding between facets.'
        },
        gridColor: {
            type: 'string',
            role: 'color',
            default: '#000000'
        },
        gridOpacity: {
            type: 'number',
            minimum: 0,
            maximum: 1,
            default: 0.25
        },
        gridOffset: {
            type: 'number',
            default: 6
        },
        fill: {
            type: 'string',
            role: 'color',
            default: 'rgba(0,0,0,0)'
        },
        fillOpacity: {
            type: 'number',
        },
        stroke: {
            type: 'string',
            role: 'color',
        },
        strokeWidth: {
            type: 'integer'
        },
        strokeOpacity: {
            type: 'number'
        },
        strokeDash: {
            type: 'array',
            default: undefined
        },
        strokeDashOffset: {
            type: 'integer',
            description: 'The offset (in pixels) into which to begin drawing with the stroke dash array.'
        }
    }
};

},{}],40:[function(require,module,exports){
exports.marksConfig = {
    type: 'object',
    properties: {
        filled: {
            type: 'boolean',
            default: false,
            description: 'Whether the shape\'s color should be used as fill color instead of stroke color.'
        },
        format: {
            type: 'string',
            default: '',
            description: 'The formatting pattern for text value.' +
                'If not defined, this will be determined automatically'
        },
        fill: {
            type: 'string',
            role: 'color',
            default: '#000000'
        },
        opacity: {
            type: 'number',
            default: undefined,
            minimum: 0,
            maximum: 1
        },
        strokeWidth: {
            type: 'integer',
            default: 2,
            minimum: 0
        },
        strokeDash: {
            type: 'array',
            default: undefined,
            description: 'An array of alternating stroke, space lengths for creating dashed or dotted lines.'
        },
        strokeDashOffset: {
            type: 'array',
            default: undefined,
            description: 'The offset (in pixels) into which to begin drawing with the stroke dash array.'
        },
        orient: {
            type: 'string',
            default: undefined,
            description: 'The orientation of this area mark. One of horizontal (the default) or vertical.'
        },
        interpolate: {
            type: 'string',
            default: undefined,
            description: 'The line interpolation method to use. One of linear, step-before, step-after, basis, basis-open, basis-closed, bundle, cardinal, cardinal-open, cardinal-closed, monotone.'
        },
        tension: {
            type: 'number',
            default: undefined,
            description: 'Depending on the interpolation type, sets the tension parameter.'
        },
        align: {
            type: 'string',
            default: 'right',
            enum: ['left', 'right', 'center'],
            description: 'The horizontal alignment of the text. One of left, right, center.'
        },
        angle: {
            type: 'number',
            default: undefined,
            description: 'The rotation angle of the text, in degrees.'
        },
        baseline: {
            type: 'string',
            default: 'middle',
            enum: ['top', 'middle', 'bottom'],
            description: 'The vertical alignment of the text. One of top, middle, bottom.'
        },
        dx: {
            type: 'number',
            default: undefined,
            description: 'The horizontal offset, in pixels, between the text label and its anchor point. The offset is applied after rotation by the angle property.'
        },
        dy: {
            type: 'number',
            default: undefined,
            description: 'The vertical offset, in pixels, between the text label and its anchor point. The offset is applied after rotation by the angle property.'
        },
        font: {
            type: 'string',
            default: undefined,
            role: 'font',
            description: 'The typeface to set the text in (e.g., Helvetica Neue).'
        },
        fontStyle: {
            type: 'string',
            default: undefined,
            enum: ['normal', 'italic'],
            description: 'The font style (e.g., italic).'
        },
        fontWeight: {
            type: 'string',
            enum: ['normal', 'bold'],
            default: undefined,
            description: 'The font weight (e.g., bold).'
        },
        radius: {
            type: 'number',
            default: undefined,
            description: 'Polar coordinate radial offset, in pixels, of the text label from the origin determined by the x and y properties.'
        },
        theta: {
            type: 'number',
            default: undefined,
            description: 'Polar coordinate angle, in radians, of the text label from the origin determined by the x and y properties. Values for theta follow the same convention of arc mark startAngle and endAngle properties: angles are measured in radians, with 0 indicating "north".'
        }
    }
};

},{}],41:[function(require,module,exports){
var config_stack_schema_1 = require('./config.stack.schema');
var config_cell_schema_1 = require('./config.cell.schema');
var config_marks_schema_1 = require('./config.marks.schema');
exports.config = {
    type: 'object',
    properties: {
        viewport: {
            type: 'array',
            items: {
                type: 'integer'
            },
            default: undefined,
            description: 'The width and height of the on-screen viewport, in pixels. If necessary, clipping and scrolling will be applied.'
        },
        background: {
            type: 'string',
            role: 'color',
            default: undefined,
            description: 'CSS color property to use as background of visualization. Default is `"transparent"`.'
        },
        scene: {
            type: 'object',
            default: undefined,
            description: 'An object to style the top-level scenegraph root. Available properties include `fill`, `fillOpacity`, `stroke`, `strokeOpacity`, `strokeWidth`, `strokeDash`, `strokeDashOffset`'
        },
        filterNull: {
            type: 'object',
            properties: {
                nominal: { type: 'boolean', default: false },
                ordinal: { type: 'boolean', default: false },
                quantitative: { type: 'boolean', default: true },
                temporal: { type: 'boolean', default: true }
            }
        },
        textCellWidth: {
            type: 'integer',
            default: 90,
            minimum: 0
        },
        sortLineBy: {
            type: 'string',
            default: undefined,
            description: 'Data field to sort line by. ' +
                '\'-\' prefix can be added to suggest descending order.'
        },
        stack: config_stack_schema_1.stackConfig,
        cell: config_cell_schema_1.cellConfig,
        marks: config_marks_schema_1.marksConfig,
        singleBarOffset: {
            type: 'integer',
            default: 5,
            minimum: 0
        },
        characterWidth: {
            type: 'integer',
            default: 6
        },
        numberFormat: {
            type: 'string',
            default: 's',
            description: 'D3 Number format for axis labels and text tables.'
        },
        timeFormat: {
            type: 'string',
            default: '%Y-%m-%d',
            description: 'Date format for axis labels.'
        }
    }
};

},{"./config.cell.schema":39,"./config.marks.schema":40,"./config.stack.schema":42}],42:[function(require,module,exports){
exports.stackConfig = {
    type: ['boolean', 'object'],
    default: {},
    description: 'Enable stacking (for bar and area marks only).',
    properties: {
        sort: {
            oneOf: [{
                    type: 'string',
                    enum: ['ascending', 'descending']
                }, {
                    type: 'array',
                    items: { type: 'string' },
                }],
            description: 'Order of the stack. ' +
                'This can be either a string (either "descending" or "ascending")' +
                'or a list of fields to determine the order of stack layers.' +
                'By default, stack uses descending order.'
        },
        offset: {
            type: 'string',
            enum: ['zero', 'center', 'normalize']
        }
    }
};

},{}],43:[function(require,module,exports){
exports.data = {
    type: 'object',
    properties: {
        formatType: {
            type: 'string',
            enum: ['json', 'csv', 'tsv'],
            default: 'json'
        },
        url: {
            type: 'string',
            default: undefined
        },
        values: {
            type: 'array',
            default: undefined,
            description: 'Pass array of objects instead of a url to a file.',
            items: {
                type: 'object',
                additionalProperties: true
            }
        },
        filter: {
            type: 'string',
            default: undefined,
            description: 'A string containing the filter Vega expression. Use `datum` to refer to the current data object.'
        },
        calculate: {
            type: 'array',
            default: undefined,
            description: 'Calculate new field(s) using the provided expresssion(s). Calculation are applied before filter.',
            items: {
                type: 'object',
                properties: {
                    field: {
                        type: 'string',
                        description: 'The field in which to store the computed formula value.'
                    },
                    expr: {
                        type: 'string',
                        description: 'A string containing an expression for the formula. Use the variable `datum` to to refer to the current data object.'
                    }
                }
            }
        }
    }
};

},{}],44:[function(require,module,exports){
var schemautil_1 = require('./schemautil');
var util_1 = require('../util');
var axis_schema_1 = require('./axis.schema');
var legend_schema_1 = require('./legend.schema');
var sort_schema_1 = require('./sort.schema');
var fielddef_schema_1 = require('./fielddef.schema');
var requiredNameType = {
    required: ['field', 'type']
};
var x = schemautil_1.merge(util_1.duplicate(fielddef_schema_1.typicalField), requiredNameType, {
    properties: {
        scale: {
            properties: {
                padding: { default: 1 },
                bandWidth: { default: 21 }
            }
        },
        axis: axis_schema_1.axis,
        sort: sort_schema_1.sort
    }
});
var y = util_1.duplicate(x);
var facet = schemautil_1.merge(util_1.duplicate(fielddef_schema_1.onlyOrdinalField), requiredNameType, {
    properties: {
        axis: axis_schema_1.axis,
        sort: sort_schema_1.sort
    }
});
var row = schemautil_1.merge(util_1.duplicate(facet));
var column = schemautil_1.merge(util_1.duplicate(facet));
var size = schemautil_1.merge(util_1.duplicate(fielddef_schema_1.typicalField), {
    properties: {
        legend: legend_schema_1.legend,
        sort: sort_schema_1.sort,
        value: {
            type: 'integer',
            default: 30,
            minimum: 0,
            description: 'Size of marks.'
        }
    }
});
var color = schemautil_1.merge(util_1.duplicate(fielddef_schema_1.typicalField), {
    properties: {
        legend: legend_schema_1.legend,
        sort: sort_schema_1.sort,
        value: {
            type: 'string',
            role: 'color',
            default: '#4682b4',
            description: 'Color to be used for marks.'
        },
        scale: {
            type: 'object',
            properties: {
                quantitativeRange: {
                    type: 'array',
                    default: ['#AFC6A3', '#09622A'],
                    description: 'Color range to encode quantitative variables.',
                    minItems: 2,
                    maxItems: 2,
                    items: {
                        type: 'string',
                        role: 'color'
                    }
                }
            }
        }
    }
});
var shape = schemautil_1.merge(util_1.duplicate(fielddef_schema_1.onlyOrdinalField), {
    properties: {
        legend: legend_schema_1.legend,
        sort: sort_schema_1.sort,
        value: {
            type: 'string',
            enum: ['circle', 'square', 'cross', 'diamond', 'triangle-up', 'triangle-down'],
            default: 'circle',
            description: 'Mark to be used.'
        }
    }
});
var detail = schemautil_1.merge(util_1.duplicate(fielddef_schema_1.onlyOrdinalField), {
    properties: {
        sort: sort_schema_1.sort
    }
});
var text = schemautil_1.merge(util_1.duplicate(fielddef_schema_1.typicalField), {
    properties: {
        sort: sort_schema_1.sort,
        value: {
            type: 'string',
            default: 'Abc'
        }
    }
});
exports.encoding = {
    type: 'object',
    properties: {
        x: x,
        y: y,
        row: row,
        column: column,
        size: size,
        color: color,
        shape: shape,
        text: text,
        detail: detail
    }
};

},{"../util":56,"./axis.schema":37,"./fielddef.schema":45,"./legend.schema":46,"./schemautil":50,"./sort.schema":51}],45:[function(require,module,exports){
var bin_schema_1 = require('./bin.schema');
var scale_schema_1 = require('./scale.schema');
var aggregate_1 = require('../aggregate');
var util_1 = require('../util');
var schemautil_1 = require('./schemautil');
var timeunit_1 = require('../timeunit');
var type_1 = require('../type');
exports.fieldDef = {
    type: 'object',
    properties: {
        field: {
            type: 'string'
        },
        type: {
            type: 'string',
            enum: [type_1.NOMINAL, type_1.ORDINAL, type_1.QUANTITATIVE, type_1.TEMPORAL]
        },
        timeUnit: {
            type: 'string',
            enum: timeunit_1.TIMEUNITS,
            supportedTypes: util_1.toMap([type_1.TEMPORAL])
        },
        bin: bin_schema_1.bin,
    }
};
exports.aggregate = {
    type: 'string',
    enum: aggregate_1.AGGREGATE_OPS,
    supportedEnums: {
        quantitative: aggregate_1.AGGREGATE_OPS,
        ordinal: ['median', 'min', 'max'],
        nominal: [],
        temporal: ['mean', 'median', 'min', 'max'],
        '': ['count']
    },
    supportedTypes: util_1.toMap([type_1.QUANTITATIVE, type_1.NOMINAL, type_1.ORDINAL, type_1.TEMPORAL, ''])
};
exports.typicalField = schemautil_1.merge(util_1.duplicate(exports.fieldDef), {
    properties: {
        aggregate: exports.aggregate,
        scale: scale_schema_1.typicalScale
    }
});
exports.onlyOrdinalField = schemautil_1.merge(util_1.duplicate(exports.fieldDef), {
    properties: {
        scale: scale_schema_1.ordinalOnlyScale
    }
});

},{"../aggregate":27,"../timeunit":54,"../type":55,"../util":56,"./bin.schema":38,"./scale.schema":48,"./schemautil":50}],46:[function(require,module,exports){
exports.legend = {
    default: true,
    description: 'Properties of a legend or boolean flag for determining whether to show it.',
    oneOf: [{
            type: 'object',
            properties: {
                orient: {
                    type: 'string',
                    default: undefined,
                    description: 'The orientation of the legend. One of "left" or "right". This determines how the legend is positioned within the scene. The default is "right".'
                },
                title: {
                    type: 'string',
                    default: undefined,
                    description: 'A title for the legend. (Shows field name and its function by default.)'
                },
                format: {
                    type: 'string',
                    default: undefined,
                    description: 'An optional formatting pattern for legend labels. Vega uses D3\'s format pattern.'
                },
                values: {
                    type: 'array',
                    default: undefined,
                    description: 'Explicitly set the visible legend values.'
                },
                properties: {
                    type: 'object',
                    default: undefined,
                    description: 'Optional mark property definitions for custom legend styling. '
                }
            }
        }, {
            type: 'boolean'
        }]
};

},{}],47:[function(require,module,exports){
exports.mark = {
    type: 'string',
    enum: ['point', 'tick', 'bar', 'line', 'area', 'circle', 'square', 'text']
};

},{}],48:[function(require,module,exports){
var util_1 = require('../util');
var schemautil_1 = require('./schemautil');
var type_1 = require('../type');
var scale = {
    type: 'object',
    properties: {
        type: {
            type: 'string',
            enum: ['linear', 'log', 'pow', 'sqrt', 'quantile'],
            default: 'linear',
            supportedTypes: util_1.toMap([type_1.QUANTITATIVE])
        },
        domain: {
            default: undefined,
            type: ['array', 'object'],
            description: 'The domain of the scale, representing the set of data values. For quantitative data, this can take the form of a two-element array with minimum and maximum values. For ordinal/categorical data, this may be an array of valid input values. The domain may also be specified by a reference to a data source.'
        },
        range: {
            default: undefined,
            type: ['array', 'object', 'string'],
            description: 'The range of the scale, representing the set of visual values. For numeric values, the range can take the form of a two-element array with minimum and maximum values. For ordinal or quantized data, the range may by an array of desired output values, which are mapped to elements in the specified domain. For ordinal scales only, the range can be defined using a DataRef: the range values are then drawn dynamically from a backing data set.'
        },
        round: {
            default: undefined,
            type: 'boolean',
            description: 'If true, rounds numeric output values to integers. This can be helpful for snapping to the pixel grid.'
        }
    }
};
var ordinalScaleMixin = {
    properties: {
        bandWidth: {
            type: 'integer',
            minimum: 0,
            default: undefined
        },
        outerPadding: {
            type: 'number',
            default: undefined
        },
        padding: {
            type: 'number',
            default: undefined,
            description: 'Applies spacing among ordinal elements in the scale range. The actual effect depends on how the scale is configured. If the __points__ parameter is `true`, the padding value is interpreted as a multiple of the spacing between points. A reasonable value is 1.0, such that the first and last point will be offset from the minimum and maximum value by half the distance between points. Otherwise, padding is typically in the range [0, 1] and corresponds to the fraction of space in the range interval to allocate to padding. A value of 0.5 means that the range band width will be equal to the padding width. For more, see the [D3 ordinal scale documentation](https://github.com/mbostock/d3/wiki/Ordinal-Scales).'
        },
        points: {
            type: 'boolean',
            default: undefined,
            description: 'If true, distributes the ordinal values over a quantitative range at uniformly spaced points. The spacing of the points can be adjusted using the padding property. If false, the ordinal scale will construct evenly-spaced bands, rather than points.'
        }
    }
};
var typicalScaleMixin = {
    properties: {
        clamp: {
            type: 'boolean',
            default: true,
            description: 'If true, values that exceed the data domain are clamped to either the minimum or maximum range value'
        },
        nice: {
            default: undefined,
            oneOf: [
                {
                    type: 'boolean',
                    description: 'If true, modifies the scale domain to use a more human-friendly number range (e.g., 7 instead of 6.96).'
                }, {
                    type: 'string',
                    enum: ['second', 'minute', 'hour', 'day', 'week', 'month', 'year'],
                    description: 'If specified, modifies the scale domain to use a more human-friendly value range. For time and utc scale types only, the nice value should be a string indicating the desired time interval; legal values are "second", "minute", "hour", "day", "week", "month", or "year".'
                }
            ],
            supportedTypes: util_1.toMap([type_1.QUANTITATIVE, type_1.TEMPORAL]),
            description: ''
        },
        exponent: {
            type: 'number',
            default: undefined,
            description: 'Sets the exponent of the scale transformation. For pow scale types only, otherwise ignored.'
        },
        zero: {
            type: 'boolean',
            description: 'If true, ensures that a zero baseline value is included in the scale domain. This option is ignored for non-quantitative scales.',
            default: undefined,
            supportedTypes: util_1.toMap([type_1.QUANTITATIVE, type_1.TEMPORAL])
        },
        useRawDomain: {
            type: 'boolean',
            default: false,
            description: 'Uses the source data range as scale domain instead of ' +
                'aggregated data for aggregate axis. ' +
                'This option does not work with sum or count aggregate' +
                'as they might have a substantially larger scale range.'
        }
    }
};
exports.ordinalOnlyScale = schemautil_1.merge(util_1.duplicate(scale), ordinalScaleMixin);
exports.typicalScale = schemautil_1.merge(util_1.duplicate(scale), ordinalScaleMixin, typicalScaleMixin);

},{"../type":55,"../util":56,"./schemautil":50}],49:[function(require,module,exports){
var schemaUtil = require('./schemautil');
var mark_schema_1 = require('./mark.schema');
var config_schema_1 = require('./config.schema');
var data_schema_1 = require('./data.schema');
var encoding_schema_1 = require('./encoding.schema');
var fielddef_schema_1 = require('./fielddef.schema');
exports.aggregate = fielddef_schema_1.aggregate;
exports.util = schemaUtil;
exports.schema = {
    $schema: 'http://json-schema.org/draft-04/schema#',
    description: 'Schema for Vega-lite specification',
    type: 'object',
    required: ['mark', 'encoding'],
    properties: {
        name: {
            type: 'string'
        },
        description: {
            type: 'string'
        },
        data: data_schema_1.data,
        mark: mark_schema_1.mark,
        encoding: encoding_schema_1.encoding,
        config: config_schema_1.config
    }
};
function instantiate() {
    return schemaUtil.instantiate(exports.schema);
}
exports.instantiate = instantiate;
;

},{"./config.schema":41,"./data.schema":43,"./encoding.schema":44,"./fielddef.schema":45,"./mark.schema":47,"./schemautil":50}],50:[function(require,module,exports){
var util = require('../util');
function isEmpty(obj) {
    return Object.keys(obj).length === 0;
}
;
function extend(instance, schema) {
    return merge(instantiate(schema), instance);
}
exports.extend = extend;
;
function instantiate(schema) {
    var val;
    if (schema === undefined) {
        return undefined;
    }
    else if ('default' in schema) {
        val = schema.default;
        return util.isObject(val) ? util.duplicate(val) : val;
    }
    else if (schema.type === 'object') {
        var instance = {};
        for (var name in schema.properties) {
            val = instantiate(schema.properties[name]);
            if (val !== undefined) {
                instance[name] = val;
            }
        }
        return instance;
    }
    else if (schema.type === 'array') {
        return undefined;
    }
    return undefined;
}
exports.instantiate = instantiate;
;
function subtract(instance, defaults) {
    var changes = {};
    for (var prop in instance) {
        var def = defaults[prop];
        var ins = instance[prop];
        if (!defaults || def !== ins) {
            if (typeof ins === 'object' && !util.isArray(ins) && def) {
                var c = subtract(ins, def);
                if (!isEmpty(c)) {
                    changes[prop] = c;
                }
            }
            else if (util.isArray(ins)) {
                if (util.isArray(def)) {
                    if (ins.length === def.length) {
                        var equal = true;
                        for (var i = 0; i < ins.length; i++) {
                            if (ins[i] !== def[i]) {
                                equal = false;
                                break;
                            }
                        }
                        if (equal) {
                            continue;
                        }
                    }
                }
                changes[prop] = ins;
            }
            else {
                changes[prop] = ins;
            }
        }
    }
    return changes;
}
exports.subtract = subtract;
;
function merge(dest) {
    var src = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        src[_i - 1] = arguments[_i];
    }
    for (var i = 0; i < src.length; i++) {
        dest = merge_(dest, src[i]);
    }
    return dest;
}
exports.merge = merge;
;
function merge_(dest, src) {
    if (typeof src !== 'object' || src === null) {
        return dest;
    }
    for (var p in src) {
        if (!src.hasOwnProperty(p)) {
            continue;
        }
        if (src[p] === undefined) {
            continue;
        }
        if (typeof src[p] !== 'object' || src[p] === null) {
            dest[p] = src[p];
        }
        else if (typeof dest[p] !== 'object' || dest[p] === null) {
            dest[p] = merge(src[p].constructor === Array ? [] : {}, src[p]);
        }
        else {
            merge(dest[p], src[p]);
        }
    }
    return dest;
}

},{"../util":56}],51:[function(require,module,exports){
var aggregate_1 = require('../aggregate');
var type_1 = require('../type');
var util_1 = require('../util');
exports.sort = {
    default: 'ascending',
    supportedTypes: util_1.toMap([type_1.QUANTITATIVE, type_1.ORDINAL]),
    oneOf: [
        {
            type: 'string',
            enum: ['ascending', 'descending', 'unsorted']
        },
        {
            type: 'object',
            required: ['field', 'op'],
            properties: {
                field: {
                    type: 'string',
                    description: 'The field name to aggregate over.'
                },
                op: {
                    type: 'string',
                    enum: aggregate_1.AGGREGATE_OPS,
                    description: 'The field name to aggregate over.'
                },
                order: {
                    type: 'string',
                    enum: ['ascending', 'descending']
                }
            }
        }
    ]
};

},{"../aggregate":27,"../type":55,"../util":56}],52:[function(require,module,exports){
var aggregate_1 = require('./aggregate');
var timeunit_1 = require('./timeunit');
var type_1 = require('./type');
var vlEncoding = require('./encoding');
var mark_1 = require('./mark');
exports.DELIM = '|';
exports.ASSIGN = '=';
exports.TYPE = ',';
exports.FUNC = '_';
function shorten(spec) {
    return 'mark' + exports.ASSIGN + spec.mark +
        exports.DELIM + shortenEncoding(spec.encoding);
}
exports.shorten = shorten;
function parse(shorthand, data, config) {
    var split = shorthand.split(exports.DELIM), mark = split.shift().split(exports.ASSIGN)[1].trim(), encoding = parseEncoding(split.join(exports.DELIM));
    var spec = {
        mark: mark_1.Mark[mark],
        encoding: encoding
    };
    if (data !== undefined) {
        spec.data = data;
    }
    if (config !== undefined) {
        spec.config = config;
    }
    return spec;
}
exports.parse = parse;
function shortenEncoding(encoding) {
    return vlEncoding.map(encoding, function (fieldDef, channel) {
        return channel + exports.ASSIGN + shortenFieldDef(fieldDef);
    }).join(exports.DELIM);
}
exports.shortenEncoding = shortenEncoding;
function parseEncoding(encodingShorthand) {
    return encodingShorthand.split(exports.DELIM).reduce(function (m, e) {
        var split = e.split(exports.ASSIGN), enctype = split[0].trim(), fieldDefShorthand = split[1];
        m[enctype] = parseFieldDef(fieldDefShorthand);
        return m;
    }, {});
}
exports.parseEncoding = parseEncoding;
function shortenFieldDef(fieldDef) {
    return (fieldDef.aggregate ? fieldDef.aggregate + exports.FUNC : '') +
        (fieldDef.timeUnit ? fieldDef.timeUnit + exports.FUNC : '') +
        (fieldDef.bin ? 'bin' + exports.FUNC : '') +
        (fieldDef.field || '') + exports.TYPE + type_1.SHORT_TYPE[fieldDef.type];
}
exports.shortenFieldDef = shortenFieldDef;
function shortenFieldDefs(fieldDefs, delim) {
    if (delim === void 0) { delim = exports.DELIM; }
    return fieldDefs.map(shortenFieldDef).join(delim);
}
exports.shortenFieldDefs = shortenFieldDefs;
function parseFieldDef(fieldDefShorthand) {
    var split = fieldDefShorthand.split(exports.TYPE), i;
    var fieldDef = {
        field: split[0].trim(),
        type: type_1.TYPE_FROM_SHORT_TYPE[split[1].trim()]
    };
    for (i in aggregate_1.AGGREGATE_OPS) {
        var a = aggregate_1.AGGREGATE_OPS[i];
        if (fieldDef.field.indexOf(a + '_') === 0) {
            fieldDef.field = fieldDef.field.substr(a.length + 1);
            if (a === 'count' && fieldDef.field.length === 0)
                fieldDef.field = '*';
            fieldDef.aggregate = a;
            break;
        }
    }
    for (i in timeunit_1.TIMEUNITS) {
        var tu = timeunit_1.TIMEUNITS[i];
        if (fieldDef.field && fieldDef.field.indexOf(tu + '_') === 0) {
            fieldDef.field = fieldDef.field.substr(fieldDef.field.length + 1);
            fieldDef.timeUnit = tu;
            break;
        }
    }
    if (fieldDef.field && fieldDef.field.indexOf('bin_') === 0) {
        fieldDef.field = fieldDef.field.substr(4);
        fieldDef.bin = true;
    }
    return fieldDef;
}
exports.parseFieldDef = parseFieldDef;

},{"./aggregate":27,"./encoding":34,"./mark":36,"./timeunit":54,"./type":55}],53:[function(require,module,exports){
var Model_1 = require('./compiler/Model');
var channel_1 = require('./channel');
var vlEncoding = require('./encoding');
var mark_1 = require('./mark');
var util_1 = require('./util');
function alwaysNoOcclusion(spec) {
    return vlEncoding.isAggregate(spec.encoding);
}
exports.alwaysNoOcclusion = alwaysNoOcclusion;
function fieldDefs(spec) {
    return vlEncoding.fieldDefs(spec.encoding);
}
exports.fieldDefs = fieldDefs;
;
function getCleanSpec(spec) {
    return new Model_1.Model(spec).toSpec(true);
}
exports.getCleanSpec = getCleanSpec;
function isStack(spec) {
    return (vlEncoding.has(spec.encoding, channel_1.COLOR) || vlEncoding.has(spec.encoding, channel_1.SHAPE)) &&
        (spec.mark === mark_1.BAR || spec.mark === mark_1.AREA) &&
        (!spec.config || !spec.config.stack !== false) &&
        vlEncoding.isAggregate(spec.encoding);
}
exports.isStack = isStack;
function transpose(spec) {
    var oldenc = spec.encoding, encoding = util_1.duplicate(spec.encoding);
    encoding.x = oldenc.y;
    encoding.y = oldenc.x;
    encoding.row = oldenc.column;
    encoding.column = oldenc.row;
    spec.encoding = encoding;
    return spec;
}
exports.transpose = transpose;

},{"./channel":29,"./compiler/Model":30,"./encoding":34,"./mark":36,"./util":56}],54:[function(require,module,exports){
exports.TIMEUNITS = [
    'year', 'month', 'day', 'date', 'hours', 'minutes', 'seconds'
];

},{}],55:[function(require,module,exports){
(function (Type) {
    Type[Type["QUANTITATIVE"] = 'quantitative'] = "QUANTITATIVE";
    Type[Type["ORDINAL"] = 'ordinal'] = "ORDINAL";
    Type[Type["TEMPORAL"] = 'temporal'] = "TEMPORAL";
    Type[Type["NOMINAL"] = 'nominal'] = "NOMINAL";
})(exports.Type || (exports.Type = {}));
var Type = exports.Type;
exports.QUANTITATIVE = Type.QUANTITATIVE;
exports.ORDINAL = Type.ORDINAL;
exports.TEMPORAL = Type.TEMPORAL;
exports.NOMINAL = Type.NOMINAL;
exports.SHORT_TYPE = {
    quantitative: 'Q',
    temporal: 'T',
    nominal: 'N',
    ordinal: 'O'
};
exports.TYPE_FROM_SHORT_TYPE = {
    Q: exports.QUANTITATIVE,
    T: exports.TEMPORAL,
    O: exports.ORDINAL,
    N: exports.NOMINAL
};
function getFullName(type) {
    var typeString = type;
    return exports.TYPE_FROM_SHORT_TYPE[typeString.toUpperCase()] ||
        typeString.toLowerCase();
}
exports.getFullName = getFullName;

},{}],56:[function(require,module,exports){
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
__export(require('datalib/src/util'));
__export(require('datalib/src/generate'));
__export(require('datalib/src/stats'));
function contains(array, item) {
    return array.indexOf(item) > -1;
}
exports.contains = contains;
function forEach(obj, f, thisArg) {
    if (obj.forEach) {
        obj.forEach.call(thisArg, f);
    }
    else {
        for (var k in obj) {
            f.call(thisArg, obj[k], k, obj);
        }
    }
}
exports.forEach = forEach;
function reduce(obj, f, init, thisArg) {
    if (obj.reduce) {
        return obj.reduce.call(thisArg, f, init);
    }
    else {
        for (var k in obj) {
            init = f.call(thisArg, init, obj[k], k, obj);
        }
        return init;
    }
}
exports.reduce = reduce;
function map(obj, f, thisArg) {
    if (obj.map) {
        return obj.map.call(thisArg, f);
    }
    else {
        var output = [];
        for (var k in obj) {
            output.push(f.call(thisArg, obj[k], k, obj));
        }
        return output;
    }
}
exports.map = map;
function any(arr, f) {
    var i = 0, k;
    for (k in arr) {
        if (f(arr[k], k, i++))
            return true;
    }
    return false;
}
exports.any = any;
function all(arr, f) {
    var i = 0, k;
    for (k in arr) {
        if (!f(arr[k], k, i++))
            return false;
    }
    return true;
}
exports.all = all;
var dlBin = require('datalib/src/bins/bins');
function getbins(stats, maxbins) {
    return dlBin({
        min: stats.min,
        max: stats.max,
        maxbins: maxbins
    });
}
exports.getbins = getbins;
function error(message) {
    console.error('[VL Error]', message);
}
exports.error = error;

},{"datalib/src/bins/bins":21,"datalib/src/generate":22,"datalib/src/stats":24,"datalib/src/util":26}],57:[function(require,module,exports){
var util_1 = require('./util');
var mark_1 = require('./mark');
exports.DEFAULT_REQUIRED_CHANNEL_MAP = {
    text: ['text'],
    line: ['x', 'y'],
    area: ['x', 'y']
};
exports.DEFAULT_SUPPORTED_CHANNEL_TYPE = {
    bar: util_1.toMap(['row', 'column', 'x', 'y', 'size', 'color', 'detail']),
    line: util_1.toMap(['row', 'column', 'x', 'y', 'color', 'detail']),
    area: util_1.toMap(['row', 'column', 'x', 'y', 'color', 'detail']),
    tick: util_1.toMap(['row', 'column', 'x', 'y', 'color', 'detail']),
    circle: util_1.toMap(['row', 'column', 'x', 'y', 'color', 'size', 'detail']),
    square: util_1.toMap(['row', 'column', 'x', 'y', 'color', 'size', 'detail']),
    point: util_1.toMap(['row', 'column', 'x', 'y', 'color', 'size', 'detail', 'shape']),
    text: util_1.toMap(['row', 'column', 'size', 'color', 'text'])
};
function getEncodingMappingError(spec, requiredChannelMap, supportedChannelMap) {
    if (requiredChannelMap === void 0) { requiredChannelMap = exports.DEFAULT_REQUIRED_CHANNEL_MAP; }
    if (supportedChannelMap === void 0) { supportedChannelMap = exports.DEFAULT_SUPPORTED_CHANNEL_TYPE; }
    var mark = spec.mark;
    var encoding = spec.encoding;
    var requiredChannels = requiredChannelMap[mark];
    var supportedChannels = supportedChannelMap[mark];
    for (var i in requiredChannels) {
        if (!(requiredChannels[i] in encoding)) {
            return 'Missing encoding channel \"' + requiredChannels[i] +
                '\" for mark \"' + mark + '\"';
        }
    }
    for (var channel in encoding) {
        if (!supportedChannels[channel]) {
            return 'Encoding channel \"' + channel +
                '\" is not supported by mark type \"' + mark + '\"';
        }
    }
    if (mark === mark_1.BAR && !encoding.x && !encoding.y) {
        return 'Missing both x and y for bar';
    }
    return null;
}
exports.getEncodingMappingError = getEncodingMappingError;

},{"./mark":36,"./util":56}]},{},[10])(10)
});
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYnJvd3Nlci1yZXNvbHZlL2VtcHR5LmpzIiwibm9kZV9tb2R1bGVzL2NsdXN0ZXJmY2svbGliL2NsdXN0ZXJmY2suanMiLCJub2RlX21vZHVsZXMvY2x1c3RlcmZjay9saWIvZGlzdGFuY2UuanMiLCJub2RlX21vZHVsZXMvY2x1c3RlcmZjay9saWIvaGNsdXN0ZXIuanMiLCJub2RlX21vZHVsZXMvY2x1c3RlcmZjay9saWIva21lYW5zLmpzIiwic3JjL2NsdXN0ZXIvY2x1c3Rlci5qcyIsInNyYy9jbHVzdGVyL2NsdXN0ZXJjb25zdHMuanMiLCJzcmMvY2x1c3Rlci9kaXN0YW5jZS5qcyIsInNyYy9jb25zdHMuanMiLCJzcmMvY3AiLCJzcmMvZ2VuL2FnZ3JlZ2F0ZXMuanMiLCJzcmMvZ2VuL2VuY29kaW5ncy5qcyIsInNyYy9nZW4vZ2VuLmpzIiwic3JjL2dlbi9tYXJrcy5qcyIsInNyYy9nZW4vcHJvamVjdGlvbnMuanMiLCJzcmMvZ2VuL3NwZWNzLmpzIiwic3JjL3JhbmsvcmFuay5qcyIsInNyYy9yYW5rL3JhbmtFbmNvZGluZ3MuanMiLCJzcmMvdXRpbC5qcyIsIi4uL3ZlZ2EtbGl0ZS9ub2RlX21vZHVsZXMvZGF0YWxpYi9ub2RlX21vZHVsZXMvZDMtdGltZS9idWlsZC9kMy10aW1lLmpzIiwiLi4vdmVnYS1saXRlL25vZGVfbW9kdWxlcy9kYXRhbGliL3NyYy9iaW5zL2JpbnMuanMiLCIuLi92ZWdhLWxpdGUvbm9kZV9tb2R1bGVzL2RhdGFsaWIvc3JjL2dlbmVyYXRlLmpzIiwiLi4vdmVnYS1saXRlL25vZGVfbW9kdWxlcy9kYXRhbGliL3NyYy9pbXBvcnQvdHlwZS5qcyIsIi4uL3ZlZ2EtbGl0ZS9ub2RlX21vZHVsZXMvZGF0YWxpYi9zcmMvc3RhdHMuanMiLCIuLi92ZWdhLWxpdGUvbm9kZV9tb2R1bGVzL2RhdGFsaWIvc3JjL3RpbWUuanMiLCIuLi92ZWdhLWxpdGUvbm9kZV9tb2R1bGVzL2RhdGFsaWIvc3JjL3V0aWwuanMiLCIuLi92ZWdhLWxpdGUvc3JjL2FnZ3JlZ2F0ZS5qcyIsIi4uL3ZlZ2EtbGl0ZS9zcmMvYmluLmpzIiwiLi4vdmVnYS1saXRlL3NyYy9jaGFubmVsLmpzIiwiLi4vdmVnYS1saXRlL3NyYy9jb21waWxlci9Nb2RlbC5qcyIsIi4uL3ZlZ2EtbGl0ZS9zcmMvY29tcGlsZXIvbGF5b3V0LmpzIiwiLi4vdmVnYS1saXRlL3NyYy9jb21waWxlci90aW1lLmpzIiwiLi4vdmVnYS1saXRlL3NyYy9kYXRhLmpzIiwiLi4vdmVnYS1saXRlL3NyYy9lbmNvZGluZy5qcyIsIi4uL3ZlZ2EtbGl0ZS9zcmMvZmllbGRkZWYuanMiLCIuLi92ZWdhLWxpdGUvc3JjL21hcmsuanMiLCIuLi92ZWdhLWxpdGUvc3JjL3NjaGVtYS9heGlzLnNjaGVtYS5qcyIsIi4uL3ZlZ2EtbGl0ZS9zcmMvc2NoZW1hL2Jpbi5zY2hlbWEuanMiLCIuLi92ZWdhLWxpdGUvc3JjL3NjaGVtYS9jb25maWcuY2VsbC5zY2hlbWEuanMiLCIuLi92ZWdhLWxpdGUvc3JjL3NjaGVtYS9jb25maWcubWFya3Muc2NoZW1hLmpzIiwiLi4vdmVnYS1saXRlL3NyYy9zY2hlbWEvY29uZmlnLnNjaGVtYS5qcyIsIi4uL3ZlZ2EtbGl0ZS9zcmMvc2NoZW1hL2NvbmZpZy5zdGFjay5zY2hlbWEuanMiLCIuLi92ZWdhLWxpdGUvc3JjL3NjaGVtYS9kYXRhLnNjaGVtYS5qcyIsIi4uL3ZlZ2EtbGl0ZS9zcmMvc2NoZW1hL2VuY29kaW5nLnNjaGVtYS5qcyIsIi4uL3ZlZ2EtbGl0ZS9zcmMvc2NoZW1hL2ZpZWxkZGVmLnNjaGVtYS5qcyIsIi4uL3ZlZ2EtbGl0ZS9zcmMvc2NoZW1hL2xlZ2VuZC5zY2hlbWEuanMiLCIuLi92ZWdhLWxpdGUvc3JjL3NjaGVtYS9tYXJrLnNjaGVtYS5qcyIsIi4uL3ZlZ2EtbGl0ZS9zcmMvc2NoZW1hL3NjYWxlLnNjaGVtYS5qcyIsIi4uL3ZlZ2EtbGl0ZS9zcmMvc2NoZW1hL3NjaGVtYS5qcyIsIi4uL3ZlZ2EtbGl0ZS9zcmMvc2NoZW1hL3NjaGVtYXV0aWwuanMiLCIuLi92ZWdhLWxpdGUvc3JjL3NjaGVtYS9zb3J0LnNjaGVtYS5qcyIsIi4uL3ZlZ2EtbGl0ZS9zcmMvc2hvcnRoYW5kLmpzIiwiLi4vdmVnYS1saXRlL3NyYy9zcGVjLmpzIiwiLi4vdmVnYS1saXRlL3NyYy90aW1ldW5pdC5qcyIsIi4uL3ZlZ2EtbGl0ZS9zcmMvdHlwZS5qcyIsIi4uL3ZlZ2EtbGl0ZS9zcmMvdXRpbC5qcyIsIi4uL3ZlZ2EtbGl0ZS9zcmMvdmFsaWRhdGUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4T0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzTUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaldBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDem5CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5VEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVEE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDck1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25DQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIixudWxsLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgIGhjbHVzdGVyOiByZXF1aXJlKFwiLi9oY2x1c3RlclwiKSxcbiAgIEttZWFuczogcmVxdWlyZShcIi4va21lYW5zXCIpLFxuICAga21lYW5zOiByZXF1aXJlKFwiLi9rbWVhbnNcIikua21lYW5zXG59OyIsIm1vZHVsZS5leHBvcnRzID0ge1xuICBldWNsaWRlYW46IGZ1bmN0aW9uKHYxLCB2Mikge1xuICAgICAgdmFyIHRvdGFsID0gMDtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdjEubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgIHRvdGFsICs9IE1hdGgucG93KHYyW2ldIC0gdjFbaV0sIDIpOyAgICAgIFxuICAgICAgfVxuICAgICAgcmV0dXJuIE1hdGguc3FydCh0b3RhbCk7XG4gICB9LFxuICAgbWFuaGF0dGFuOiBmdW5jdGlvbih2MSwgdjIpIHtcbiAgICAgdmFyIHRvdGFsID0gMDtcbiAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB2MS5sZW5ndGggOyBpKyspIHtcbiAgICAgICAgdG90YWwgKz0gTWF0aC5hYnModjJbaV0gLSB2MVtpXSk7ICAgICAgXG4gICAgIH1cbiAgICAgcmV0dXJuIHRvdGFsO1xuICAgfSxcbiAgIG1heDogZnVuY3Rpb24odjEsIHYyKSB7XG4gICAgIHZhciBtYXggPSAwO1xuICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHYxLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIG1heCA9IE1hdGgubWF4KG1heCAsIE1hdGguYWJzKHYyW2ldIC0gdjFbaV0pKTsgICAgICBcbiAgICAgfVxuICAgICByZXR1cm4gbWF4O1xuICAgfVxufTsiLCJ2YXIgZGlzdGFuY2VzID0gcmVxdWlyZShcIi4vZGlzdGFuY2VcIik7XG5cbnZhciBIaWVyYXJjaGljYWxDbHVzdGVyaW5nID0gZnVuY3Rpb24oZGlzdGFuY2UsIGxpbmthZ2UsIHRocmVzaG9sZCkge1xuICAgdGhpcy5kaXN0YW5jZSA9IGRpc3RhbmNlO1xuICAgdGhpcy5saW5rYWdlID0gbGlua2FnZTtcbiAgIHRoaXMudGhyZXNob2xkID0gdGhyZXNob2xkID09IHVuZGVmaW5lZCA/IEluZmluaXR5IDogdGhyZXNob2xkO1xufVxuXG5IaWVyYXJjaGljYWxDbHVzdGVyaW5nLnByb3RvdHlwZSA9IHtcbiAgIGNsdXN0ZXIgOiBmdW5jdGlvbihpdGVtcywgc25hcHNob3RQZXJpb2QsIHNuYXBzaG90Q2IpIHtcbiAgICAgIHRoaXMuY2x1c3RlcnMgPSBbXTtcbiAgICAgIHRoaXMuZGlzdHMgPSBbXTsgIC8vIGRpc3RhbmNlcyBiZXR3ZWVuIGVhY2ggcGFpciBvZiBjbHVzdGVyc1xuICAgICAgdGhpcy5taW5zID0gW107IC8vIGNsb3Nlc3QgY2x1c3RlciBmb3IgZWFjaCBjbHVzdGVyXG4gICAgICB0aGlzLmluZGV4ID0gW107IC8vIGtlZXAgYSBoYXNoIG9mIGFsbCBjbHVzdGVycyBieSBrZXlcbiAgICAgIFxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBpdGVtcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgdmFyIGNsdXN0ZXIgPSB7XG4gICAgICAgICAgICB2YWx1ZTogaXRlbXNbaV0sXG4gICAgICAgICAgICBrZXk6IGksXG4gICAgICAgICAgICBpbmRleDogaSxcbiAgICAgICAgICAgIHNpemU6IDFcbiAgICAgICAgIH07XG4gICAgICAgICB0aGlzLmNsdXN0ZXJzW2ldID0gY2x1c3RlcjtcbiAgICAgICAgIHRoaXMuaW5kZXhbaV0gPSBjbHVzdGVyO1xuICAgICAgICAgdGhpcy5kaXN0c1tpXSA9IFtdO1xuICAgICAgICAgdGhpcy5taW5zW2ldID0gMDtcbiAgICAgIH1cblxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmNsdXN0ZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8PSBpOyBqKyspIHtcbiAgICAgICAgICAgIHZhciBkaXN0ID0gKGkgPT0gaikgPyBJbmZpbml0eSA6IFxuICAgICAgICAgICAgICAgdGhpcy5kaXN0YW5jZSh0aGlzLmNsdXN0ZXJzW2ldLnZhbHVlLCB0aGlzLmNsdXN0ZXJzW2pdLnZhbHVlKTtcbiAgICAgICAgICAgIHRoaXMuZGlzdHNbaV1bal0gPSBkaXN0O1xuICAgICAgICAgICAgdGhpcy5kaXN0c1tqXVtpXSA9IGRpc3Q7XG5cbiAgICAgICAgICAgIGlmIChkaXN0IDwgdGhpcy5kaXN0c1tpXVt0aGlzLm1pbnNbaV1dKSB7XG4gICAgICAgICAgICAgICB0aGlzLm1pbnNbaV0gPSBqOyAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgfVxuICAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB2YXIgbWVyZ2VkID0gdGhpcy5tZXJnZUNsb3Nlc3QoKTtcbiAgICAgIHZhciBpID0gMDtcbiAgICAgIHdoaWxlIChtZXJnZWQpIHtcbiAgICAgICAgaWYgKHNuYXBzaG90Q2IgJiYgKGkrKyAlIHNuYXBzaG90UGVyaW9kKSA9PSAwKSB7XG4gICAgICAgICAgIHNuYXBzaG90Q2IodGhpcy5jbHVzdGVycyk7ICAgICAgICAgICBcbiAgICAgICAgfVxuICAgICAgICBtZXJnZWQgPSB0aGlzLm1lcmdlQ2xvc2VzdCgpO1xuICAgICAgfVxuICAgIFxuICAgICAgdGhpcy5jbHVzdGVycy5mb3JFYWNoKGZ1bmN0aW9uKGNsdXN0ZXIpIHtcbiAgICAgICAgLy8gY2xlYW4gdXAgbWV0YWRhdGEgdXNlZCBmb3IgY2x1c3RlcmluZ1xuICAgICAgICBkZWxldGUgY2x1c3Rlci5rZXk7XG4gICAgICAgIGRlbGV0ZSBjbHVzdGVyLmluZGV4O1xuICAgICAgfSk7XG5cbiAgICAgIHJldHVybiB0aGlzLmNsdXN0ZXJzO1xuICAgfSxcbiAgXG4gICBtZXJnZUNsb3Nlc3Q6IGZ1bmN0aW9uKCkge1xuICAgICAgLy8gZmluZCB0d28gY2xvc2VzdCBjbHVzdGVycyBmcm9tIGNhY2hlZCBtaW5zXG4gICAgICB2YXIgbWluS2V5ID0gMCwgbWluID0gSW5maW5pdHk7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuY2x1c3RlcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgIHZhciBrZXkgPSB0aGlzLmNsdXN0ZXJzW2ldLmtleSxcbiAgICAgICAgICAgICBkaXN0ID0gdGhpcy5kaXN0c1trZXldW3RoaXMubWluc1trZXldXTtcbiAgICAgICAgIGlmIChkaXN0IDwgbWluKSB7XG4gICAgICAgICAgICBtaW5LZXkgPSBrZXk7XG4gICAgICAgICAgICBtaW4gPSBkaXN0O1xuICAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKG1pbiA+PSB0aGlzLnRocmVzaG9sZCkge1xuICAgICAgICAgcmV0dXJuIGZhbHNlOyAgICAgICAgIFxuICAgICAgfVxuXG4gICAgICB2YXIgYzEgPSB0aGlzLmluZGV4W21pbktleV0sXG4gICAgICAgICAgYzIgPSB0aGlzLmluZGV4W3RoaXMubWluc1ttaW5LZXldXTtcblxuICAgICAgLy8gbWVyZ2UgdHdvIGNsb3Nlc3QgY2x1c3RlcnNcbiAgICAgIHZhciBtZXJnZWQgPSB7XG4gICAgICAgICBsZWZ0OiBjMSxcbiAgICAgICAgIHJpZ2h0OiBjMixcbiAgICAgICAgIGtleTogYzEua2V5LFxuICAgICAgICAgc2l6ZTogYzEuc2l6ZSArIGMyLnNpemVcbiAgICAgIH07XG5cbiAgICAgIHRoaXMuY2x1c3RlcnNbYzEuaW5kZXhdID0gbWVyZ2VkO1xuICAgICAgdGhpcy5jbHVzdGVycy5zcGxpY2UoYzIuaW5kZXgsIDEpO1xuICAgICAgdGhpcy5pbmRleFtjMS5rZXldID0gbWVyZ2VkO1xuXG4gICAgICAvLyB1cGRhdGUgZGlzdGFuY2VzIHdpdGggbmV3IG1lcmdlZCBjbHVzdGVyXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuY2x1c3RlcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgIHZhciBjaSA9IHRoaXMuY2x1c3RlcnNbaV07XG4gICAgICAgICB2YXIgZGlzdDtcbiAgICAgICAgIGlmIChjMS5rZXkgPT0gY2kua2V5KSB7XG4gICAgICAgICAgICBkaXN0ID0gSW5maW5pdHk7ICAgICAgICAgICAgXG4gICAgICAgICB9XG4gICAgICAgICBlbHNlIGlmICh0aGlzLmxpbmthZ2UgPT0gXCJzaW5nbGVcIikge1xuICAgICAgICAgICAgZGlzdCA9IHRoaXMuZGlzdHNbYzEua2V5XVtjaS5rZXldO1xuICAgICAgICAgICAgaWYgKHRoaXMuZGlzdHNbYzEua2V5XVtjaS5rZXldID4gdGhpcy5kaXN0c1tjMi5rZXldW2NpLmtleV0pIHtcbiAgICAgICAgICAgICAgIGRpc3QgPSB0aGlzLmRpc3RzW2MyLmtleV1bY2kua2V5XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgIH1cbiAgICAgICAgIGVsc2UgaWYgKHRoaXMubGlua2FnZSA9PSBcImNvbXBsZXRlXCIpIHtcbiAgICAgICAgICAgIGRpc3QgPSB0aGlzLmRpc3RzW2MxLmtleV1bY2kua2V5XTtcbiAgICAgICAgICAgIGlmICh0aGlzLmRpc3RzW2MxLmtleV1bY2kua2V5XSA8IHRoaXMuZGlzdHNbYzIua2V5XVtjaS5rZXldKSB7XG4gICAgICAgICAgICAgICBkaXN0ID0gdGhpcy5kaXN0c1tjMi5rZXldW2NpLmtleV07ICAgICAgICAgICAgICBcbiAgICAgICAgICAgIH1cbiAgICAgICAgIH1cbiAgICAgICAgIGVsc2UgaWYgKHRoaXMubGlua2FnZSA9PSBcImF2ZXJhZ2VcIikge1xuICAgICAgICAgICAgZGlzdCA9ICh0aGlzLmRpc3RzW2MxLmtleV1bY2kua2V5XSAqIGMxLnNpemVcbiAgICAgICAgICAgICAgICAgICArIHRoaXMuZGlzdHNbYzIua2V5XVtjaS5rZXldICogYzIuc2l6ZSkgLyAoYzEuc2l6ZSArIGMyLnNpemUpO1xuICAgICAgICAgfVxuICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBkaXN0ID0gdGhpcy5kaXN0YW5jZShjaS52YWx1ZSwgYzEudmFsdWUpOyAgICAgICAgICAgIFxuICAgICAgICAgfVxuXG4gICAgICAgICB0aGlzLmRpc3RzW2MxLmtleV1bY2kua2V5XSA9IHRoaXMuZGlzdHNbY2kua2V5XVtjMS5rZXldID0gZGlzdDtcbiAgICAgIH1cblxuICAgIFxuICAgICAgLy8gdXBkYXRlIGNhY2hlZCBtaW5zXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuY2x1c3RlcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgIHZhciBrZXkxID0gdGhpcy5jbHVzdGVyc1tpXS5rZXk7ICAgICAgICBcbiAgICAgICAgIGlmICh0aGlzLm1pbnNba2V5MV0gPT0gYzEua2V5IHx8IHRoaXMubWluc1trZXkxXSA9PSBjMi5rZXkpIHtcbiAgICAgICAgICAgIHZhciBtaW4gPSBrZXkxO1xuICAgICAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCB0aGlzLmNsdXN0ZXJzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICB2YXIga2V5MiA9IHRoaXMuY2x1c3RlcnNbal0ua2V5O1xuICAgICAgICAgICAgICAgaWYgKHRoaXMuZGlzdHNba2V5MV1ba2V5Ml0gPCB0aGlzLmRpc3RzW2tleTFdW21pbl0pIHtcbiAgICAgICAgICAgICAgICAgIG1pbiA9IGtleTI7ICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLm1pbnNba2V5MV0gPSBtaW47XG4gICAgICAgICB9XG4gICAgICAgICB0aGlzLmNsdXN0ZXJzW2ldLmluZGV4ID0gaTtcbiAgICAgIH1cbiAgICBcbiAgICAgIC8vIGNsZWFuIHVwIG1ldGFkYXRhIHVzZWQgZm9yIGNsdXN0ZXJpbmdcbiAgICAgIGRlbGV0ZSBjMS5rZXk7IGRlbGV0ZSBjMi5rZXk7XG4gICAgICBkZWxldGUgYzEuaW5kZXg7IGRlbGV0ZSBjMi5pbmRleDtcblxuICAgICAgcmV0dXJuIHRydWU7XG4gICB9XG59XG5cbnZhciBoY2x1c3RlciA9IGZ1bmN0aW9uKGl0ZW1zLCBkaXN0YW5jZSwgbGlua2FnZSwgdGhyZXNob2xkLCBzbmFwc2hvdCwgc25hcHNob3RDYWxsYmFjaykge1xuICAgZGlzdGFuY2UgPSBkaXN0YW5jZSB8fCBcImV1Y2xpZGVhblwiO1xuICAgbGlua2FnZSA9IGxpbmthZ2UgfHwgXCJhdmVyYWdlXCI7XG5cbiAgIGlmICh0eXBlb2YgZGlzdGFuY2UgPT0gXCJzdHJpbmdcIikge1xuICAgICBkaXN0YW5jZSA9IGRpc3RhbmNlc1tkaXN0YW5jZV07XG4gICB9XG4gICB2YXIgY2x1c3RlcnMgPSAobmV3IEhpZXJhcmNoaWNhbENsdXN0ZXJpbmcoZGlzdGFuY2UsIGxpbmthZ2UsIHRocmVzaG9sZCkpXG4gICAgICAgICAgICAgICAgICAuY2x1c3RlcihpdGVtcywgc25hcHNob3QsIHNuYXBzaG90Q2FsbGJhY2spO1xuICAgICAgXG4gICBpZiAodGhyZXNob2xkID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBjbHVzdGVyc1swXTsgLy8gYWxsIGNsdXN0ZXJlZCBpbnRvIG9uZVxuICAgfVxuICAgcmV0dXJuIGNsdXN0ZXJzO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGhjbHVzdGVyO1xuIiwidmFyIGRpc3RhbmNlcyA9IHJlcXVpcmUoXCIuL2Rpc3RhbmNlXCIpO1xuXG5mdW5jdGlvbiBLTWVhbnMoY2VudHJvaWRzKSB7XG4gICB0aGlzLmNlbnRyb2lkcyA9IGNlbnRyb2lkcyB8fCBbXTtcbn1cblxuS01lYW5zLnByb3RvdHlwZS5yYW5kb21DZW50cm9pZHMgPSBmdW5jdGlvbihwb2ludHMsIGspIHtcbiAgIHZhciBjZW50cm9pZHMgPSBwb2ludHMuc2xpY2UoMCk7IC8vIGNvcHlcbiAgIGNlbnRyb2lkcy5zb3J0KGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIChNYXRoLnJvdW5kKE1hdGgucmFuZG9tKCkpIC0gMC41KTtcbiAgIH0pO1xuICAgcmV0dXJuIGNlbnRyb2lkcy5zbGljZSgwLCBrKTtcbn1cblxuS01lYW5zLnByb3RvdHlwZS5jbGFzc2lmeSA9IGZ1bmN0aW9uKHBvaW50LCBkaXN0YW5jZSkge1xuICAgdmFyIG1pbiA9IEluZmluaXR5LFxuICAgICAgIGluZGV4ID0gMDtcblxuICAgZGlzdGFuY2UgPSBkaXN0YW5jZSB8fCBcImV1Y2xpZGVhblwiO1xuICAgaWYgKHR5cGVvZiBkaXN0YW5jZSA9PSBcInN0cmluZ1wiKSB7XG4gICAgICBkaXN0YW5jZSA9IGRpc3RhbmNlc1tkaXN0YW5jZV07XG4gICB9XG5cbiAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5jZW50cm9pZHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBkaXN0ID0gZGlzdGFuY2UocG9pbnQsIHRoaXMuY2VudHJvaWRzW2ldKTtcbiAgICAgIGlmIChkaXN0IDwgbWluKSB7XG4gICAgICAgICBtaW4gPSBkaXN0O1xuICAgICAgICAgaW5kZXggPSBpO1xuICAgICAgfVxuICAgfVxuXG4gICByZXR1cm4gaW5kZXg7XG59XG5cbktNZWFucy5wcm90b3R5cGUuY2x1c3RlciA9IGZ1bmN0aW9uKHBvaW50cywgaywgZGlzdGFuY2UsIHNuYXBzaG90UGVyaW9kLCBzbmFwc2hvdENiKSB7XG4gICBrID0gayB8fCBNYXRoLm1heCgyLCBNYXRoLmNlaWwoTWF0aC5zcXJ0KHBvaW50cy5sZW5ndGggLyAyKSkpO1xuXG4gICBkaXN0YW5jZSA9IGRpc3RhbmNlIHx8IFwiZXVjbGlkZWFuXCI7XG4gICBpZiAodHlwZW9mIGRpc3RhbmNlID09IFwic3RyaW5nXCIpIHtcbiAgICAgIGRpc3RhbmNlID0gZGlzdGFuY2VzW2Rpc3RhbmNlXTtcbiAgIH1cblxuICAgdGhpcy5jZW50cm9pZHMgPSB0aGlzLnJhbmRvbUNlbnRyb2lkcyhwb2ludHMsIGspO1xuXG4gICB2YXIgYXNzaWdubWVudCA9IG5ldyBBcnJheShwb2ludHMubGVuZ3RoKTtcbiAgIHZhciBjbHVzdGVycyA9IG5ldyBBcnJheShrKTtcblxuICAgdmFyIGl0ZXJhdGlvbnMgPSAwO1xuICAgdmFyIG1vdmVtZW50ID0gdHJ1ZTtcbiAgIHdoaWxlIChtb3ZlbWVudCkge1xuICAgICAgLy8gdXBkYXRlIHBvaW50LXRvLWNlbnRyb2lkIGFzc2lnbm1lbnRzXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBvaW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgYXNzaWdubWVudFtpXSA9IHRoaXMuY2xhc3NpZnkocG9pbnRzW2ldLCBkaXN0YW5jZSk7XG4gICAgICB9XG5cbiAgICAgIC8vIHVwZGF0ZSBsb2NhdGlvbiBvZiBlYWNoIGNlbnRyb2lkXG4gICAgICBtb3ZlbWVudCA9IGZhbHNlO1xuICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBrOyBqKyspIHtcbiAgICAgICAgIHZhciBhc3NpZ25lZCA9IFtdO1xuICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhc3NpZ25tZW50Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAoYXNzaWdubWVudFtpXSA9PSBqKSB7XG4gICAgICAgICAgICAgICBhc3NpZ25lZC5wdXNoKHBvaW50c1tpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICB9XG5cbiAgICAgICAgIGlmICghYXNzaWduZWQubGVuZ3RoKSB7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgIH1cblxuICAgICAgICAgdmFyIGNlbnRyb2lkID0gdGhpcy5jZW50cm9pZHNbal07XG4gICAgICAgICB2YXIgbmV3Q2VudHJvaWQgPSBuZXcgQXJyYXkoY2VudHJvaWQubGVuZ3RoKTtcblxuICAgICAgICAgZm9yICh2YXIgZyA9IDA7IGcgPCBjZW50cm9pZC5sZW5ndGg7IGcrKykge1xuICAgICAgICAgICAgdmFyIHN1bSA9IDA7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFzc2lnbmVkLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICBzdW0gKz0gYXNzaWduZWRbaV1bZ107XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBuZXdDZW50cm9pZFtnXSA9IHN1bSAvIGFzc2lnbmVkLmxlbmd0aDtcblxuICAgICAgICAgICAgaWYgKG5ld0NlbnRyb2lkW2ddICE9IGNlbnRyb2lkW2ddKSB7XG4gICAgICAgICAgICAgICBtb3ZlbWVudCA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICB9XG5cbiAgICAgICAgIHRoaXMuY2VudHJvaWRzW2pdID0gbmV3Q2VudHJvaWQ7XG4gICAgICAgICBjbHVzdGVyc1tqXSA9IGFzc2lnbmVkO1xuICAgICAgfVxuXG4gICAgICBpZiAoc25hcHNob3RDYiAmJiAoaXRlcmF0aW9ucysrICUgc25hcHNob3RQZXJpb2QgPT0gMCkpIHtcbiAgICAgICAgIHNuYXBzaG90Q2IoY2x1c3RlcnMpO1xuICAgICAgfVxuICAgfVxuXG4gICByZXR1cm4gY2x1c3RlcnM7XG59XG5cbktNZWFucy5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24oKSB7XG4gICByZXR1cm4gSlNPTi5zdHJpbmdpZnkodGhpcy5jZW50cm9pZHMpO1xufVxuXG5LTWVhbnMucHJvdG90eXBlLmZyb21KU09OID0gZnVuY3Rpb24oanNvbikge1xuICAgdGhpcy5jZW50cm9pZHMgPSBKU09OLnBhcnNlKGpzb24pO1xuICAgcmV0dXJuIHRoaXM7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gS01lYW5zO1xuXG5tb2R1bGUuZXhwb3J0cy5rbWVhbnMgPSBmdW5jdGlvbih2ZWN0b3JzLCBrKSB7XG4gICByZXR1cm4gKG5ldyBLTWVhbnMoKSkuY2x1c3Rlcih2ZWN0b3JzLCBrKTtcbn0iLCJcInVzZSBzdHJpY3RcIjtcblxubW9kdWxlLmV4cG9ydHMgPSBjbHVzdGVyO1xuXG52YXIgdmxTaG9ydGhhbmQgPSByZXF1aXJlKCd2ZWdhLWxpdGUvc3JjL3Nob3J0aGFuZCcpLFxuICBjbHVzdGVyZmNrID0gcmVxdWlyZSgnY2x1c3RlcmZjaycpLFxuICBjb25zdHMgPSByZXF1aXJlKCcuL2NsdXN0ZXJjb25zdHMnKSxcbiAgdXRpbCA9IHJlcXVpcmUoJy4uL3V0aWwnKTtcblxuY2x1c3Rlci5kaXN0YW5jZSA9IHJlcXVpcmUoJy4vZGlzdGFuY2UnKTtcblxuZnVuY3Rpb24gY2x1c3RlcihzcGVjcywgb3B0KSB7XG4gIC8vIGpzaGludCB1bnVzZWQ6ZmFsc2VcbiAgdmFyIGRpc3QgPSBjbHVzdGVyLmRpc3RhbmNlLnRhYmxlKHNwZWNzKTtcblxuICB2YXIgY2x1c3RlclRyZWVzID0gY2x1c3RlcmZjay5oY2x1c3RlcihzcGVjcywgZnVuY3Rpb24oZTEsIGUyKSB7XG4gICAgdmFyIHMxID0gdmxTaG9ydGhhbmQuc2hvcnRlbihlMSksXG4gICAgICBzMiA9IHZsU2hvcnRoYW5kLnNob3J0ZW4oZTIpO1xuICAgIHJldHVybiBkaXN0W3MxXVtzMl07XG4gIH0sICdhdmVyYWdlJywgY29uc3RzLkNMVVNURVJfVEhSRVNIT0xEKTtcblxuICB2YXIgY2x1c3RlcnMgPSBjbHVzdGVyVHJlZXMubWFwKGZ1bmN0aW9uKHRyZWUpIHtcbiAgICAgIHJldHVybiB1dGlsLnRyYXZlcnNlKHRyZWUsIFtdKTtcbiAgICB9KVxuICAgLm1hcChmdW5jdGlvbihjbHVzdGVyKSB7XG4gICAgcmV0dXJuIGNsdXN0ZXIuc29ydChmdW5jdGlvbihzcGVjMSwgc3BlYzIpIHtcbiAgICAgIC8vIHNvcnQgZWFjaCBjbHVzdGVyIC0tIGhhdmUgdGhlIGhpZ2hlc3Qgc2NvcmUgYXMgMXN0IGl0ZW1cbiAgICAgIHJldHVybiBzcGVjMi5faW5mby5zY29yZSAtIHNwZWMxLl9pbmZvLnNjb3JlO1xuICAgIH0pO1xuICB9KS5maWx0ZXIoZnVuY3Rpb24oY2x1c3RlcikgeyAgLy8gZmlsdGVyIGVtcHR5IGNsdXN0ZXJcbiAgICByZXR1cm4gY2x1c3Rlci5sZW5ndGggPjA7XG4gIH0pLnNvcnQoZnVuY3Rpb24oY2x1c3RlcjEsIGNsdXN0ZXIyKSB7XG4gICAgLy9zb3J0IGJ5IGhpZ2hlc3Qgc2NvcmluZyBpdGVtIGluIGVhY2ggY2x1c3RlclxuICAgIHJldHVybiBjbHVzdGVyMlswXS5faW5mby5zY29yZSAtIGNsdXN0ZXIxWzBdLl9pbmZvLnNjb3JlO1xuICB9KTtcblxuICBjbHVzdGVycy5kaXN0ID0gZGlzdDsgLy9hcHBlbmQgZGlzdCBpbiB0aGUgYXJyYXkgZm9yIGRlYnVnZ2luZ1xuXG4gIHJldHVybiBjbHVzdGVycztcbn0iLCIndXNlIHN0cmljdCc7XG5cbnZhciBjID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxuYy5TV0FQUEFCTEUgPSAwLjA1O1xuYy5ESVNUX01JU1NJTkcgPSAxO1xuYy5DTFVTVEVSX1RIUkVTSE9MRCA9IDE7XG5cbmZ1bmN0aW9uIHJlZHVjZVR1cGxlVG9UYWJsZShyLCB4KSB7XG4gIHZhciBhID0geFswXSwgYiA9IHhbMV0sIGQgPSB4WzJdO1xuICByW2FdID0gclthXSB8fCB7fTtcbiAgcltiXSA9IHJbYl0gfHwge307XG4gIHJbYV1bYl0gPSByW2JdW2FdID0gZDtcbiAgcmV0dXJuIHI7XG59XG5cbmMuRElTVF9CWV9DSEFOTkVMID0gW1xuICAvLyBwb3NpdGlvbmFsXG4gIFsneCcsICd5JywgYy5TV0FQUEFCTEVdLFxuICBbJ3JvdycsICdjb2x1bW4nLCBjLlNXQVBQQUJMRV0sXG5cbiAgLy8gb3JkaW5hbCBtYXJrIHByb3BlcnRpZXNcbiAgWydjb2xvcicsICdzaGFwZScsIGMuU1dBUFBBQkxFXSxcbiAgWydjb2xvcicsICdkZXRhaWwnLCBjLlNXQVBQQUJMRV0sXG4gIFsnZGV0YWlsJywgJ3NoYXBlJywgYy5TV0FQUEFCTEVdLFxuXG4gIC8vIHF1YW50aXRhdGl2ZSBtYXJrIHByb3BlcnRpZXNcbiAgWydzaXplJywgJ2NvbG9yJywgYy5TV0FQUEFCTEVdXG5dLnJlZHVjZShyZWR1Y2VUdXBsZVRvVGFibGUsIHt9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHZsU3BlYyA9IHJlcXVpcmUoJ3ZlZ2EtbGl0ZS9zcmMvc3BlYycpLFxuICB2bFNob3J0aGFuZCA9IHJlcXVpcmUoJ3ZlZ2EtbGl0ZS9zcmMvc2hvcnRoYW5kJyksXG4gIGNvbnN0cyA9IHJlcXVpcmUoJy4vY2x1c3RlcmNvbnN0cycpLFxuICB1dGlsID0gcmVxdWlyZSgnLi4vdXRpbCcpO1xuXG52YXIgZGlzdGFuY2UgPSB7fTtcbm1vZHVsZS5leHBvcnRzID0gZGlzdGFuY2U7XG5cbmRpc3RhbmNlLnRhYmxlID0gZnVuY3Rpb24gKHNwZWNzKSB7XG4gIHZhciBsZW4gPSBzcGVjcy5sZW5ndGgsXG4gICAgZXh0ZW5kZWRTcGVjcyA9IHNwZWNzLm1hcChmdW5jdGlvbihlKSB7IHJldHVybiBkaXN0YW5jZS5leHRlbmRTcGVjV2l0aENoYW5uZWxCeUNvbHVtbk5hbWUoZSk7IH0pLFxuICAgIHNob3J0aGFuZHMgPSBzcGVjcy5tYXAodmxTaG9ydGhhbmQuc2hvcnRlbiksXG4gICAgZGlmZiA9IHt9LCBpLCBqO1xuXG4gIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKykgZGlmZltzaG9ydGhhbmRzW2ldXSA9IHt9O1xuXG4gIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgIGZvciAoaiA9IGkgKyAxOyBqIDwgbGVuOyBqKyspIHtcbiAgICAgIHZhciBzaiA9IHNob3J0aGFuZHNbal0sIHNpID0gc2hvcnRoYW5kc1tpXTtcblxuICAgICAgZGlmZltzal1bc2ldID0gZGlmZltzaV1bc2pdID0gZGlzdGFuY2UuZ2V0KGV4dGVuZGVkU3BlY3NbaV0sIGV4dGVuZGVkU3BlY3Nbal0pO1xuICAgIH1cbiAgfVxuICByZXR1cm4gZGlmZjtcbn07XG5cbmRpc3RhbmNlLmdldCA9IGZ1bmN0aW9uIChleHRlbmRlZFNwZWMxLCBleHRlbmRlZFNwZWMyKSB7XG4gIHZhciBjb2xzID0gdXRpbC51bmlvbih1dGlsLmtleXMoZXh0ZW5kZWRTcGVjMS5jaGFubmVsQnlGaWVsZCksIHV0aWwua2V5cyhleHRlbmRlZFNwZWMyLmNoYW5uZWxCeUZpZWxkKSksXG4gICAgZGlzdCA9IDA7XG5cbiAgY29scy5mb3JFYWNoKGZ1bmN0aW9uKGNvbHVtbikge1xuICAgIHZhciBlMSA9IGV4dGVuZGVkU3BlYzEuY2hhbm5lbEJ5RmllbGRbY29sdW1uXSwgZTIgPSBleHRlbmRlZFNwZWMyLmNoYW5uZWxCeUZpZWxkW2NvbHVtbl07XG5cbiAgICBpZiAoZTEgJiYgZTIpIHtcbiAgICAgIGlmIChlMS5jaGFubmVsICE9IGUyLmNoYW5uZWwpIHtcbiAgICAgICAgZGlzdCArPSAoY29uc3RzLkRJU1RfQllfQ0hBTk5FTFtlMS5jaGFubmVsXSB8fCB7fSlbZTIuY2hhbm5lbF0gfHwgMTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgZGlzdCArPSBjb25zdHMuRElTVF9NSVNTSU5HO1xuICAgIH1cbiAgfSk7XG5cbiAgLy8gZG8gbm90IGdyb3VwIHN0YWNrZWQgY2hhcnQgd2l0aCBzaW1pbGFyIG5vbi1zdGFja2VkIGNoYXJ0IVxuICB2YXIgaXNTdGFjazEgPSB2bFNwZWMuaXNTdGFjayhleHRlbmRlZFNwZWMxKSxcbiAgICBpc1N0YWNrMiA9IHZsU3BlYy5pc1N0YWNrKGV4dGVuZGVkU3BlYzIpO1xuXG4gIGlmIChpc1N0YWNrMSB8fCBpc1N0YWNrMikge1xuICAgIGlmIChpc1N0YWNrMSAmJiBpc1N0YWNrMikge1xuICAgICAgaWYgKChleHRlbmRlZFNwZWMxLmVuY29kaW5nLmNvbG9yICYmIGV4dGVuZGVkU3BlYzIuZW5jb2RpbmcuY29sb3IgJiZcbiAgICAgICAgICBleHRlbmRlZFNwZWMxLmVuY29kaW5nLmNvbG9yLmZpZWxkICE9PSBleHRlbmRlZFNwZWMyLmVuY29kaW5nLmNvbG9yLmZpZWxkKSB8fFxuICAgICAgICAgIChleHRlbmRlZFNwZWMxLmVuY29kaW5nLmRldGFpbCAmJiBleHRlbmRlZFNwZWMyLmVuY29kaW5nLmRldGFpbCAmJlxuICAgICAgICAgIGV4dGVuZGVkU3BlYzEuZW5jb2RpbmcuZGV0YWlsLmZpZWxkICE9PSBleHRlbmRlZFNwZWMyLmVuY29kaW5nLmRldGFpbC5maWVsZClcbiAgICAgICAgICkge1xuICAgICAgICBkaXN0Kz0xO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBkaXN0Kz0xOyAvLyBzdXJlbHkgZGlmZmVyZW50XG4gICAgfVxuICB9XG4gIHJldHVybiBkaXN0O1xufTtcblxuLy8gZ2V0IGVuY29kaW5nIHR5cGUgYnkgZmllbGRuYW1lXG5kaXN0YW5jZS5leHRlbmRTcGVjV2l0aENoYW5uZWxCeUNvbHVtbk5hbWUgPSBmdW5jdGlvbihzcGVjKSB7XG4gIHZhciBfY2hhbm5lbEJ5RmllbGQgPSB7fSxcbiAgICBlbmNvZGluZyA9IHNwZWMuZW5jb2Rpbmc7XG5cbiAgdXRpbC5rZXlzKGVuY29kaW5nKS5mb3JFYWNoKGZ1bmN0aW9uKGNoYW5uZWwpIHtcbiAgICB2YXIgZSA9IHV0aWwuZHVwbGljYXRlKGVuY29kaW5nW2NoYW5uZWxdKTtcbiAgICBlLmNoYW5uZWwgPSBjaGFubmVsO1xuICAgIF9jaGFubmVsQnlGaWVsZFtlLmZpZWxkIHx8ICcnXSA9IGU7XG4gICAgZGVsZXRlIGUuZmllbGQ7XG4gIH0pO1xuXG4gIHJldHVybiB7XG4gICAgbWFyazogc3BlYy5tYXJrLFxuICAgIGNoYW5uZWxCeUZpZWxkOiBfY2hhbm5lbEJ5RmllbGQsXG4gICAgZW5jb2Rpbmc6IHNwZWMuZW5jb2RpbmdcbiAgfTtcbn07IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgY29uc3RzID0gbW9kdWxlLmV4cG9ydHMgPSB7XG4gIGdlbjoge30sXG4gIGNsdXN0ZXI6IHt9LFxuICByYW5rOiB7fVxufTtcblxuY29uc3RzLlggPSAneCc7XG5jb25zdHMuWSA9ICd5JztcbmNvbnN0cy5ST1cgPSAncm93JztcbmNvbnN0cy5DT0wgPSAnY29sdW1uJztcbmNvbnN0cy5TSVpFID0gJ3NpemUnO1xuY29uc3RzLlNIQVBFID0gJ3NoYXBlJztcbmNvbnN0cy5DT0xPUiA9ICdjb2xvcic7XG5jb25zdHMuVEVYVCA9ICd0ZXh0JztcbmNvbnN0cy5ERVRBSUwgPSAnZGV0YWlsJztcblxuXG4vLyByZW5hbWUgdGhlc2VcbmNvbnN0cy5UeXBlID0ge307XG5jb25zdHMuVHlwZS5Ob21pbmFsID0gJ25vbWluYWwnO1xuY29uc3RzLlR5cGUuT3JkaW5hbCA9ICdvcmRpbmFsJztcbmNvbnN0cy5UeXBlLlF1YW50aXRhdGl2ZSA9ICdxdWFudGl0YXRpdmUnO1xuY29uc3RzLlR5cGUuVGVtcG9yYWwgPSAndGVtcG9yYWwnO1xuXG5cbmNvbnN0cy5nZW4ucHJvamVjdGlvbnMgPSB7XG4gIHR5cGU6ICdvYmplY3QnLFxuICBwcm9wZXJ0aWVzOiB7XG4gICAgb21pdERvdFBsb3Q6IHsgLy9GSVhNRSByZW1vdmUgdGhpcyFcbiAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgICAgZGVzY3JpcHRpb246ICdyZW1vdmUgYWxsIGRvdCBwbG90cydcbiAgICB9LFxuICAgIG1heENhcmRpbmFsaXR5Rm9yQXV0b0FkZE9yZGluYWw6IHtcbiAgICAgIHR5cGU6ICdpbnRlZ2VyJyxcbiAgICAgIGRlZmF1bHQ6IDUwLFxuICAgICAgZGVzY3JpcHRpb246ICdtYXggY2FyZGluYWxpdHkgZm9yIGFuIG9yZGluYWwgdmFyaWFibGUgdG8gYmUgY29uc2lkZXJlZCBmb3IgYXV0byBhZGRpbmcnXG4gICAgfSxcbiAgICBhbHdheXNBZGRIaXN0b2dyYW06IHtcbiAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgIGRlZmF1bHQ6IHRydWVcbiAgICB9XG4gIH1cbn07XG5cbmNvbnN0cy5nZW4uYWdncmVnYXRlcyA9IHtcbiAgdHlwZTogJ29iamVjdCcsXG4gIHByb3BlcnRpZXM6IHtcbiAgICBjb25maWc6IHtcbiAgICAgIHR5cGU6ICdvYmplY3QnXG4gICAgfSxcbiAgICBkYXRhOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0J1xuICAgIH0sXG4gICAgdGFibGVUeXBlczoge1xuICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgZGVmYXVsdDogJ2JvdGgnLFxuICAgICAgZW51bTogWydib3RoJywgJ2FnZ3JlZ2F0ZWQnLCAnZGlzYWdncmVnYXRlZCddXG4gICAgfSxcbiAgICBnZW5EaW1ROiB7XG4gICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgIGRlZmF1bHQ6ICdhdXRvJyxcbiAgICAgIGVudW06IFsnYXV0bycsICdiaW4nLCAnY2FzdCcsICdub25lJ10sXG4gICAgICBkZXNjcmlwdGlvbjogJ1VzZSBRIGFzIERpbWVuc2lvbiBlaXRoZXIgYnkgYmlubmluZyBvciBjYXN0aW5nJ1xuICAgIH0sXG4gICAgbWluQ2FyZGluYWxpdHlGb3JCaW46IHtcbiAgICAgIHR5cGU6ICdpbnRlZ2VyJyxcbiAgICAgIGRlZmF1bHQ6IDIwLFxuICAgICAgZGVzY3JpcHRpb246ICdtaW5pbXVtIGNhcmRpbmFsaXR5IG9mIGFuIG9yZGluYWwgdmFyaWFibGUgaWYgd2Ugd2VyZSB0byBiaW4nXG4gICAgfSxcbiAgICBvbWl0RG90UGxvdDoge1xuICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgZGVmYXVsdDogZmFsc2UsXG4gICAgICBkZXNjcmlwdGlvbjogJ3JlbW92ZSBhbGwgZG90IHBsb3RzJ1xuICAgIH0sXG4gICAgb21pdE1lYXN1cmVPbmx5OiB7XG4gICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICBkZWZhdWx0OiBmYWxzZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnT21pdCBhZ2dyZWdhdGlvbiB3aXRoIG1lYXN1cmUocykgb25seSdcbiAgICB9LFxuICAgIG9taXREaW1lbnNpb25Pbmx5OiB7XG4gICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICBkZWZhdWx0OiB0cnVlLFxuICAgICAgZGVzY3JpcHRpb246ICdPbWl0IGFnZ3JlZ2F0aW9uIHdpdGggZGltZW5zaW9uKHMpIG9ubHknXG4gICAgfSxcbiAgICBhZGRDb3VudEZvckRpbWVuc2lvbk9ubHk6IHtcbiAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgIGRlZmF1bHQ6IHRydWUsXG4gICAgICBkZXNjcmlwdGlvbjogJ0FkZCBjb3VudCB3aGVuIHRoZXJlIGFyZSBkaW1lbnNpb24ocykgb25seSdcbiAgICB9LFxuICAgIGFnZ3JMaXN0OiB7XG4gICAgICB0eXBlOiAnYXJyYXknLFxuICAgICAgaXRlbXM6IHtcbiAgICAgICAgdHlwZTogWydzdHJpbmcnXVxuICAgICAgfSxcbiAgICAgIGRlZmF1bHQ6IFt1bmRlZmluZWQsICdtZWFuJ11cbiAgICB9LFxuICAgIHRpbWVVbml0TGlzdDoge1xuICAgICAgdHlwZTogJ2FycmF5JyxcbiAgICAgIGl0ZW1zOiB7XG4gICAgICAgIHR5cGU6IFsnc3RyaW5nJ11cbiAgICAgIH0sXG4gICAgICBkZWZhdWx0OiBbJ3llYXInXVxuICAgIH0sXG4gICAgY29uc2lzdGVudEF1dG9ROiB7XG4gICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICBkZWZhdWx0OiB0cnVlLFxuICAgICAgZGVzY3JpcHRpb246IFwiZ2VuZXJhdGUgc2ltaWxhciBhdXRvIHRyYW5zZm9ybSBmb3IgcXVhbnRcIlxuICAgIH1cbiAgfVxufTtcblxuY29uc3RzLmdlbi5lbmNvZGluZ3MgPSB7XG4gIHR5cGU6ICdvYmplY3QnLFxuICBwcm9wZXJ0aWVzOiB7XG4gICAgbWFya0xpc3Q6IHtcbiAgICAgIHR5cGU6ICdhcnJheScsXG4gICAgICBpdGVtczoge3R5cGU6ICdzdHJpbmcnfSxcbiAgICAgIGRlZmF1bHQ6IFsncG9pbnQnLCAnYmFyJywgJ2xpbmUnLCAnYXJlYScsICd0ZXh0JywgJ3RpY2snXSwgLy9maWxsZWRfbWFwXG4gICAgICBkZXNjcmlwdGlvbjogJ2FsbG93ZWQgbWFya3MnXG4gICAgfSxcbiAgICBlbmNvZGluZ1R5cGVMaXN0OiB7XG4gICAgICB0eXBlOiAnYXJyYXknLFxuICAgICAgaXRlbXM6IHt0eXBlOiAnc3RyaW5nJ30sXG4gICAgICBkZWZhdWx0OiBbJ3gnLCAneScsICdyb3cnLCAnY29sdW1uJywgJ3NpemUnLCAnY29sb3InLCAndGV4dCcsICdkZXRhaWwnXSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnYWxsb3dlZCBlbmNvZGluZyB0eXBlcydcbiAgICB9LFxuICAgIHJlcXVpcmVkRW5jb2RpbmdzOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgIGRlZmF1bHQ6IHVuZGVmaW5lZCxcbiAgICAgIGRlc2NyaXB0aW9uOiAncmVxdWlyZWQgZW5jb2RpbmdzIGZvciBlYWNoIG1hcmsgdHlwZSdcbiAgICB9LFxuICAgIHN1cHBvcnRlZEVuY29kaW5nczoge1xuICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICBkZWZhdWx0OiB1bmRlZmluZWQsXG4gICAgICBkZXNjcmlwdGlvbjogJ3N1cHBvcnRlZCBlbmNvZGluZyBmb3IgZWFjaCBtYXJrIHR5cGUnXG4gICAgfSxcbiAgICAvLyBUT0RPOiBpcyB0aGlzIHVzZWQgaW4gZ2VuZXJhdGlvbj9cbiAgICBtYXhHb29kQ2FyZGluYWxpdHlGb3JGYWNldHM6IHtcbiAgICAgIHR5cGU6ICdpbnRlZ2VyJyxcbiAgICAgIGRlZmF1bHQ6IDUsXG4gICAgICBkZXNjcmlwdGlvbjogJ21heGltdW0gY2FyZGluYWxpdHkgb2YgYW4gb3JkaW5hbCB2YXJpYWJsZSB0byBiZSBwdXQgb24gZmFjZXQgKHJvdy9jb2x1bW4pIGVmZmVjdGl2ZWx5J1xuICAgIH0sXG4gICAgbWF4Q2FyZGluYWxpdHlGb3JGYWNldHM6IHtcbiAgICAgIHR5cGU6ICdpbnRlZ2VyJyxcbiAgICAgIGRlZmF1bHQ6IDIwLFxuICAgICAgZGVzY3JpcHRpb246ICdtYXhpbXVtIGNhcmRpbmFsaXR5IG9mIGFuIG9yZGluYWwgdmFyaWFibGUgdG8gYmUgcHV0IG9uIGZhY2V0IChyb3cvY29sdW1uKSdcbiAgICB9LFxuICAgIG1heEdvb2RDYXJkaW5hbGl0eUZvckNvbG9yOiB7XG4gICAgICB0eXBlOiAnaW50ZWdlcicsXG4gICAgICBkZWZhdWx0OiA3LFxuICAgICAgZGVzY3JpcHRpb246ICdtYXhpbXVtIGNhcmRpbmFsaXR5IG9mIGFuIG9yZGluYWwgdmFyaWFibGUgdG8gYmUgcHV0IG9uIGNvbG9yIGVmZmVjdGl2ZWx5J1xuICAgIH0sXG4gICAgbWF4Q2FyZGluYWxpdHlGb3JDb2xvcjoge1xuICAgICAgdHlwZTogJ2ludGVnZXInLFxuICAgICAgZGVmYXVsdDogMjAsXG4gICAgICBkZXNjcmlwdGlvbjogJ21heGltdW0gY2FyZGluYWxpdHkgb2YgYW4gb3JkaW5hbCB2YXJpYWJsZSB0byBiZSBwdXQgb24gY29sb3InXG4gICAgfSxcbiAgICBtYXhDYXJkaW5hbGl0eUZvclNoYXBlOiB7XG4gICAgICB0eXBlOiAnaW50ZWdlcicsXG4gICAgICBkZWZhdWx0OiA2LFxuICAgICAgZGVzY3JpcHRpb246ICdtYXhpbXVtIGNhcmRpbmFsaXR5IG9mIGFuIG9yZGluYWwgdmFyaWFibGUgdG8gYmUgcHV0IG9uIHNoYXBlJ1xuICAgIH0sXG4gICAgb21pdFRyYW5wb3NlOiAge1xuICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgZGVmYXVsdDogdHJ1ZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnRWxpbWluYXRlIGFsbCB0cmFuc3Bvc2UgYnkgKDEpIGtlZXBpbmcgaG9yaXpvbnRhbCBkb3QgcGxvdCBvbmx5ICgyKSBmb3IgT3hRIGNoYXJ0cywgYWx3YXlzIHB1dCBPIG9uIFkgKDMpIHNob3cgb25seSBvbmUgRHhELCBNeE0gKGN1cnJlbnRseSBzb3J0ZWQgYnkgbmFtZSknXG4gICAgfSxcbiAgICAvLyBUT0RPOiBjcmVhdGUgY2hhcnQgdHlwZSBuYW1lXG4gICAgb21pdERvdFBsb3Q6IHtcbiAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgICAgZGVzY3JpcHRpb246ICdyZW1vdmUgYWxsIGRvdCBwbG90cydcbiAgICB9LFxuICAgIG9taXREb3RQbG90V2l0aEV4dHJhRW5jb2Rpbmc6IHtcbiAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgIGRlZmF1bHQ6IHRydWUsXG4gICAgICBkZXNjcmlwdGlvbjogJ3JlbW92ZSBhbGwgZG90IHBsb3RzIHdpdGggPjEgZW5jb2RpbmcnXG4gICAgfSxcbiAgICBvbWl0TXVsdGlwbGVSZXRpbmFsRW5jb2RpbmdzOiB7XG4gICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICBkZWZhdWx0OiB0cnVlLFxuICAgICAgZGVzY3JpcHRpb246ICdvbWl0IHVzaW5nIG11bHRpcGxlIHJldGluYWwgdmFyaWFibGVzIChzaXplLCBjb2xvciwgc2hhcGUpJ1xuICAgIH0sXG4gICAgLy8gVE9ETzogcmV2aXNlXG4gICAgb21pdE5vblRleHRBZ2dyV2l0aEFsbERpbXNPbkZhY2V0czoge1xuICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgZGVmYXVsdDogdHJ1ZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAncmVtb3ZlIGFsbCBhZ2dyZWdhdGVkIGNoYXJ0cyAoZXhjZXB0IHRleHQgdGFibGVzKSB3aXRoIGFsbCBkaW1zIG9uIGZhY2V0cyAocm93LCBjb2x1bW4pJ1xuICAgIH0sXG4gICAgLy8gVE9ETzogcmV2aXNlXG4gICAgb21pdE9uZURpbWVuc2lvbkNvdW50OiB7XG4gICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICBkZWZhdWx0OiBmYWxzZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnb21pdCBvbmUgZGltZW5zaW9uIGNvdW50J1xuICAgIH0sXG4gICAgLy8gVE9ETyByZW1vdmUgdGhpcyBhbmQgbWVyZ2Ugd2l0aCBzdXBwb3J0ZWRFbmNvZGluZ3NcbiAgICBvbWl0U2l6ZU9uQmFyOiB7XG4gICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICBkZWZhdWx0OiBmYWxzZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnZG8gbm90IHVzZSBiYXJcXCdzIHNpemUnXG4gICAgfSxcbiAgICAvLyBUT0RPOiBjaGFuZ2UgdG8gb21pdCBub24tc3VtbWF0aXZlIHN0YWNrXG4gICAgb21pdFN0YWNrZWRBdmVyYWdlOiB7XG4gICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICBkZWZhdWx0OiB0cnVlLFxuICAgICAgZGVzY3JpcHRpb246ICdkbyBub3Qgc3RhY2sgYmFyIGNoYXJ0IHdpdGggYXZlcmFnZSdcbiAgICB9LFxuICAgIGFsd2F5c0dlbmVyYXRlVGFibGVBc0hlYXRtYXA6IHtcbiAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgIGRlZmF1bHQ6IHRydWVcbiAgICB9XG4gIH1cbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgY29uc3RzOiByZXF1aXJlKCcuL2NvbnN0cycpLFxuICBjbHVzdGVyOiByZXF1aXJlKCcuL2NsdXN0ZXIvY2x1c3RlcicpLFxuICBnZW46IHJlcXVpcmUoJy4vZ2VuL2dlbicpLFxuICByYW5rOiByZXF1aXJlKCcuL3JhbmsvcmFuaycpLFxuICB1dGlsOiByZXF1aXJlKCcuL3V0aWwnKSxcbiAgYXV0bzogXCItLCBzdW1cIlxufTtcblxuXG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciB2bEZpZWxkRGVmID0gcmVxdWlyZSgndmVnYS1saXRlL3NyYy9maWVsZGRlZicpO1xudmFyIHZsU2NoZW1hVXRpbCA9IHJlcXVpcmUoJ3ZlZ2EtbGl0ZS9zcmMvc2NoZW1hL3NjaGVtYXV0aWwnKTtcbnZhciB2bFNob3J0aGFuZCA9IHJlcXVpcmUoJ3ZlZ2EtbGl0ZS9zcmMvc2hvcnRoYW5kJyk7XG5cbnZhciBjb25zdHMgPSByZXF1aXJlKCcuLi9jb25zdHMnKTtcbnZhciBUeXBlID0gY29uc3RzLlR5cGU7XG52YXIgdXRpbCA9IHJlcXVpcmUoJy4uL3V0aWwnKTtcblxudmFyIEFVVE8gPSAnKic7XG5cbm1vZHVsZS5leHBvcnRzID0gZ2VuQWdncmVnYXRlcztcblxuXG5mdW5jdGlvbiBnZW5BZ2dyZWdhdGVzKG91dHB1dCwgZmllbGREZWZzLCBzdGF0cywgb3B0KSB7XG4gIG9wdCA9IHZsU2NoZW1hVXRpbC5leHRlbmQob3B0fHx7fSwgY29uc3RzLmdlbi5hZ2dyZWdhdGVzKTtcbiAgdmFyIHRmID0gbmV3IEFycmF5KGZpZWxkRGVmcy5sZW5ndGgpO1xuICB2YXIgaGFzTm9yTyA9IHV0aWwuYW55KGZpZWxkRGVmcywgZnVuY3Rpb24oZikge1xuICAgIHJldHVybiBmLnR5cGUgPT09IFR5cGUuTm9taW5hbCB8fCBmLnR5cGUgPT0gVHlwZS5PcmRpbmFsO1xuICB9KTtcblxuICBmdW5jdGlvbiBlbWl0KGZpZWxkU2V0KSB7XG4gICAgZmllbGRTZXQgPSB1dGlsLmR1cGxpY2F0ZShmaWVsZFNldCk7XG4gICAgZmllbGRTZXQua2V5ID0gZmllbGRTZXQubWFwKGZ1bmN0aW9uKGZpZWxkRGVmKSB7XG4gICAgICByZXR1cm4gdmxTaG9ydGhhbmQuc2hvcnRlbkZpZWxkRGVmKGZpZWxkRGVmKTtcbiAgICB9KS5qb2luKHZsU2hvcnRoYW5kLkRFTElNKTtcbiAgICBvdXRwdXQucHVzaChmaWVsZFNldCk7XG4gIH1cblxuICBmdW5jdGlvbiBjaGVja0FuZFB1c2goKSB7XG4gICAgaWYgKG9wdC5vbWl0TWVhc3VyZU9ubHkgfHwgb3B0Lm9taXREaW1lbnNpb25Pbmx5KSB7XG4gICAgICB2YXIgaGFzTWVhc3VyZSA9IGZhbHNlLCBoYXNEaW1lbnNpb24gPSBmYWxzZSwgaGFzUmF3ID0gZmFsc2U7XG4gICAgICB0Zi5mb3JFYWNoKGZ1bmN0aW9uKGYpIHtcbiAgICAgICAgaWYgKHZsRmllbGREZWYuaXNEaW1lbnNpb24oZikpIHtcbiAgICAgICAgICBoYXNEaW1lbnNpb24gPSB0cnVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGhhc01lYXN1cmUgPSB0cnVlO1xuICAgICAgICAgIGlmICghZi5hZ2dyZWdhdGUpIGhhc1JhdyA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgaWYgKCFoYXNEaW1lbnNpb24gJiYgIWhhc1JhdyAmJiBvcHQub21pdE1lYXN1cmVPbmx5KSByZXR1cm47XG4gICAgICBpZiAoIWhhc01lYXN1cmUpIHtcbiAgICAgICAgaWYgKG9wdC5hZGRDb3VudEZvckRpbWVuc2lvbk9ubHkpIHtcbiAgICAgICAgICB0Zi5wdXNoKHZsRmllbGREZWYuY291bnQoKSk7XG4gICAgICAgICAgZW1pdCh0Zik7XG4gICAgICAgICAgdGYucG9wKCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG9wdC5vbWl0RGltZW5zaW9uT25seSkgcmV0dXJuO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAob3B0Lm9taXREb3RQbG90ICYmIHRmLmxlbmd0aCA9PT0gMSkgcmV0dXJuO1xuICAgIGVtaXQodGYpO1xuICB9XG5cbiAgZnVuY3Rpb24gYXNzaWduQWdnclEoaSwgaGFzQWdnciwgYXV0b01vZGUsIGEpIHtcbiAgICB2YXIgY2FuSGF2ZUFnZ3IgPSBoYXNBZ2dyID09PSB0cnVlIHx8IGhhc0FnZ3IgPT09IG51bGwsXG4gICAgICBjYW50SGF2ZUFnZ3IgPSBoYXNBZ2dyID09PSBmYWxzZSB8fCBoYXNBZ2dyID09PSBudWxsO1xuICAgIGlmIChhKSB7XG4gICAgICBpZiAoY2FuSGF2ZUFnZ3IpIHtcbiAgICAgICAgdGZbaV0uYWdncmVnYXRlID0gYTtcbiAgICAgICAgYXNzaWduRmllbGQoaSArIDEsIHRydWUsIGF1dG9Nb2RlKTtcbiAgICAgICAgZGVsZXRlIHRmW2ldLmFnZ3JlZ2F0ZTtcbiAgICAgIH1cbiAgICB9IGVsc2UgeyAvLyBpZihhID09PSB1bmRlZmluZWQpXG4gICAgICBpZiAoY2FudEhhdmVBZ2dyKSB7XG4gICAgICAgIGFzc2lnbkZpZWxkKGkgKyAxLCBmYWxzZSwgYXV0b01vZGUpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGFzc2lnbkJpblEoaSwgaGFzQWdnciwgYXV0b01vZGUpIHtcbiAgICB0ZltpXS5iaW4gPSB0cnVlO1xuICAgIGFzc2lnbkZpZWxkKGkgKyAxLCBoYXNBZ2dyLCBhdXRvTW9kZSk7XG4gICAgZGVsZXRlIHRmW2ldLmJpbjtcbiAgfVxuXG4gIGZ1bmN0aW9uIGFzc2lnblEoaSwgaGFzQWdnciwgYXV0b01vZGUpIHtcbiAgICB2YXIgZiA9IGZpZWxkRGVmc1tpXSxcbiAgICAgIGNhbkhhdmVBZ2dyID0gaGFzQWdnciA9PT0gdHJ1ZSB8fCBoYXNBZ2dyID09PSBudWxsO1xuXG4gICAgdGZbaV0gPSB7ZmllbGQ6IGYuZmllbGQsIHR5cGU6IGYudHlwZX07XG5cbiAgICBpZiAoZi5hZ2dyZWdhdGUgPT09ICdjb3VudCcpIHsgLy8gaWYgY291bnQgaXMgaW5jbHVkZWQgaW4gdGhlIHNlbGVjdGVkIGZpZWxkc1xuICAgICAgaWYgKGNhbkhhdmVBZ2dyKSB7XG4gICAgICAgIHRmW2ldLmFnZ3JlZ2F0ZSA9IGYuYWdncmVnYXRlO1xuICAgICAgICBhc3NpZ25GaWVsZChpICsgMSwgdHJ1ZSwgYXV0b01vZGUpO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoZi5fYWdncmVnYXRlKSB7XG4gICAgICAvLyBUT0RPIHN1cHBvcnQgYXJyYXkgb2YgZi5fYWdncnMgdG9vXG4gICAgICBhc3NpZ25BZ2dyUShpLCBoYXNBZ2dyLCBhdXRvTW9kZSwgZi5fYWdncmVnYXRlKTtcbiAgICB9IGVsc2UgaWYgKGYuX3Jhdykge1xuICAgICAgYXNzaWduQWdnclEoaSwgaGFzQWdnciwgYXV0b01vZGUsIHVuZGVmaW5lZCk7XG4gICAgfSBlbHNlIGlmIChmLl9iaW4pIHtcbiAgICAgIGFzc2lnbkJpblEoaSwgaGFzQWdnciwgYXV0b01vZGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBvcHQuYWdnckxpc3QuZm9yRWFjaChmdW5jdGlvbihhKSB7XG4gICAgICAgIGlmICghb3B0LmNvbnNpc3RlbnRBdXRvUSB8fCBhdXRvTW9kZSA9PT0gQVVUTyB8fCBhdXRvTW9kZSA9PT0gYSkge1xuICAgICAgICAgIGFzc2lnbkFnZ3JRKGksIGhhc0FnZ3IsIGEgLyphc3NpZ24gYXV0b01vZGUqLywgYSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICBpZiAoKCFvcHQuY29uc2lzdGVudEF1dG9RIHx8IHV0aWwuaXNpbihhdXRvTW9kZSwgW0FVVE8sICdiaW4nLCAnY2FzdCcsICdhdXRvY2FzdCddKSkgJiYgIWhhc05vck8pIHtcbiAgICAgICAgdmFyIGhpZ2hDYXJkaW5hbGl0eSA9IHZsRmllbGREZWYuY2FyZGluYWxpdHkoZiwgc3RhdHMpID4gb3B0Lm1pbkNhcmRpbmFsaXR5Rm9yQmluO1xuXG4gICAgICAgIHZhciBpc0F1dG8gPSBvcHQuZ2VuRGltUSA9PT0gJ2F1dG8nLFxuICAgICAgICAgIGdlbkJpbiA9IG9wdC5nZW5EaW1RICA9PT0gJ2JpbicgfHwgKGlzQXV0byAmJiBoaWdoQ2FyZGluYWxpdHkpLFxuICAgICAgICAgIGdlbkNhc3QgPSBvcHQuZ2VuRGltUSA9PT0gJ2Nhc3QnIHx8IChpc0F1dG8gJiYgIWhpZ2hDYXJkaW5hbGl0eSk7XG5cbiAgICAgICAgaWYgKGdlbkJpbiAmJiB1dGlsLmlzaW4oYXV0b01vZGUsIFtBVVRPLCAnYmluJywgJ2F1dG9jYXN0J10pKSB7XG4gICAgICAgICAgYXNzaWduQmluUShpLCBoYXNBZ2dyLCBpc0F1dG8gPyAnYXV0b2Nhc3QnIDogJ2JpbicpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChnZW5DYXN0ICYmIHV0aWwuaXNpbihhdXRvTW9kZSwgW0FVVE8sICdjYXN0JywgJ2F1dG9jYXN0J10pKSB7XG4gICAgICAgICAgdGZbaV0udHlwZSA9IFR5cGUuT3JkaW5hbDtcbiAgICAgICAgICBhc3NpZ25GaWVsZChpICsgMSwgaGFzQWdnciwgaXNBdXRvID8gJ2F1dG9jYXN0JyA6ICdjYXN0Jyk7XG4gICAgICAgICAgdGZbaV0udHlwZSA9IFR5cGUuUXVhbnRpdGF0aXZlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gYXNzaWduVGltZVVuaXRUKGksIGhhc0FnZ3IsIGF1dG9Nb2RlLCB0aW1lVW5pdCkge1xuICAgIHRmW2ldLnRpbWVVbml0ID0gdGltZVVuaXQ7XG4gICAgYXNzaWduRmllbGQoaSsxLCBoYXNBZ2dyLCBhdXRvTW9kZSk7XG4gICAgZGVsZXRlIHRmW2ldLnRpbWVVbml0O1xuICB9XG5cbiAgZnVuY3Rpb24gYXNzaWduVChpLCBoYXNBZ2dyLCBhdXRvTW9kZSkge1xuICAgIHZhciBmID0gZmllbGREZWZzW2ldO1xuICAgIHRmW2ldID0ge2ZpZWxkOiBmLmZpZWxkLCB0eXBlOiBmLnR5cGV9O1xuXG4gICAgLy8gVE9ETyBzdXBwb3J0IGFycmF5IG9mIGYuX3RpbWVVbml0c1xuICAgIGlmIChmLl90aW1lVW5pdCkge1xuICAgICAgYXNzaWduVGltZVVuaXRUKGksIGhhc0FnZ3IsIGF1dG9Nb2RlLCBmLl90aW1lVW5pdCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG9wdC50aW1lVW5pdExpc3QuZm9yRWFjaChmdW5jdGlvbih0aW1lVW5pdCkge1xuICAgICAgICBpZiAodGltZVVuaXQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGlmICghaGFzQWdncikgeyAvLyBjYW4ndCBhZ2dyZWdhdGUgb3ZlciByYXcgdGltZVxuICAgICAgICAgICAgYXNzaWduRmllbGQoaSsxLCBmYWxzZSwgYXV0b01vZGUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBhc3NpZ25UaW1lVW5pdFQoaSwgaGFzQWdnciwgYXV0b01vZGUsIHRpbWVVbml0KTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gRklYTUUgd2hhdCBpZiB5b3UgYWdncmVnYXRlIHRpbWU/XG4gIH1cblxuICBmdW5jdGlvbiBhc3NpZ25GaWVsZChpLCBoYXNBZ2dyLCBhdXRvTW9kZSkge1xuICAgIGlmIChpID09PSBmaWVsZERlZnMubGVuZ3RoKSB7IC8vIElmIGFsbCBmaWVsZHMgYXJlIGFzc2lnbmVkXG4gICAgICBjaGVja0FuZFB1c2goKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgZiA9IGZpZWxkRGVmc1tpXTtcbiAgICAvLyBPdGhlcndpc2UsIGFzc2lnbiBpLXRoIGZpZWxkXG4gICAgc3dpdGNoIChmLnR5cGUpIHtcbiAgICAgIC8vVE9ETyBcIkRcIiwgXCJHXCJcbiAgICAgIGNhc2UgVHlwZS5RdWFudGl0YXRpdmU6XG4gICAgICAgIGFzc2lnblEoaSwgaGFzQWdnciwgYXV0b01vZGUpO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSBUeXBlLlRlbXBvcmFsOlxuICAgICAgICBhc3NpZ25UKGksIGhhc0FnZ3IsIGF1dG9Nb2RlKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFR5cGUuT3JkaW5hbDpcbiAgICAgICAgLyogZmFsbHMgdGhyb3VnaCAqL1xuICAgICAgY2FzZSBUeXBlLk5vbWluYWw6XG4gICAgICAgIC8qIGZhbGxzIHRocm91Z2ggKi9cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHRmW2ldID0gZjtcbiAgICAgICAgYXNzaWduRmllbGQoaSArIDEsIGhhc0FnZ3IsIGF1dG9Nb2RlKTtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgdmFyIGhhc0FnZ3IgPSBvcHQudGFibGVUeXBlcyA9PT0gJ2FnZ3JlZ2F0ZWQnID8gdHJ1ZSA6IG9wdC50YWJsZVR5cGVzID09PSAnZGlzYWdncmVnYXRlZCcgPyBmYWxzZSA6IG51bGw7XG4gIGFzc2lnbkZpZWxkKDAsIGhhc0FnZ3IsIEFVVE8pO1xuXG4gIHJldHVybiBvdXRwdXQ7XG59XG4iLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIHZsRmllbGREZWYgPSByZXF1aXJlKCd2ZWdhLWxpdGUvc3JjL2ZpZWxkZGVmJyk7XG52YXIgdmxFbmNvZGluZyA9IHJlcXVpcmUoJ3ZlZ2EtbGl0ZS9zcmMvZW5jb2RpbmcnKTtcbnZhciB1dGlsID0gcmVxdWlyZSgnLi4vdXRpbCcpO1xuXG52YXIgZ2VuTWFya3MgPSByZXF1aXJlKCcuL21hcmtzJyksXG4gIGlzRGltZW5zaW9uID0gdmxGaWVsZERlZi5pc0RpbWVuc2lvbixcbiAgaXNNZWFzdXJlID0gdmxGaWVsZERlZi5pc01lYXN1cmU7XG5cbnZhciBjb25zdHMgPSByZXF1aXJlKCcuLi9jb25zdHMnKTtcbnZhciBUeXBlID0gY29uc3RzLlR5cGU7XG5cbm1vZHVsZS5leHBvcnRzID0gZ2VuRW5jb2RpbmdzO1xuXG4vLyBGSVhNRSByZW1vdmUgZGltZW5zaW9uLCBtZWFzdXJlIGFuZCB1c2UgaW5mb3JtYXRpb24gaW4gdmVnYS1saXRlIGluc3RlYWQhXG52YXIgcnVsZXMgPSB7XG4gIHg6IHtcbiAgICBkaW1lbnNpb246IHRydWUsXG4gICAgbWVhc3VyZTogdHJ1ZSxcbiAgICBtdWx0aXBsZTogdHJ1ZSAvL0ZJWE1FIHNob3VsZCBhbGxvdyBtdWx0aXBsZSBvbmx5IGZvciBRLCBUXG4gIH0sXG4gIHk6IHtcbiAgICBkaW1lbnNpb246IHRydWUsXG4gICAgbWVhc3VyZTogdHJ1ZSxcbiAgICBtdWx0aXBsZTogdHJ1ZSAvL0ZJWE1FIHNob3VsZCBhbGxvdyBtdWx0aXBsZSBvbmx5IGZvciBRLCBUXG4gIH0sXG4gIHJvdzoge1xuICAgIGRpbWVuc2lvbjogdHJ1ZSxcbiAgICBtdWx0aXBsZTogdHJ1ZVxuICB9LFxuICBjb2x1bW46IHtcbiAgICBkaW1lbnNpb246IHRydWUsXG4gICAgbXVsdGlwbGU6IHRydWVcbiAgfSxcbiAgc2hhcGU6IHtcbiAgICBkaW1lbnNpb246IHRydWUsXG4gICAgcnVsZXM6IHNoYXBlUnVsZXNcbiAgfSxcbiAgc2l6ZToge1xuICAgIG1lYXN1cmU6IHRydWUsXG4gICAgcnVsZXM6IHJldGluYWxFbmNSdWxlc1xuICB9LFxuICBjb2xvcjoge1xuICAgIGRpbWVuc2lvbjogdHJ1ZSxcbiAgICBtZWFzdXJlOiB0cnVlLFxuICAgIHJ1bGVzOiBjb2xvclJ1bGVzXG4gIH0sXG4gIHRleHQ6IHtcbiAgICBtZWFzdXJlOiB0cnVlXG4gIH0sXG4gIGRldGFpbDoge1xuICAgIGRpbWVuc2lvbjogdHJ1ZVxuICB9XG4gIC8vZ2VvOiB7XG4gIC8vICBnZW86IHRydWVcbiAgLy99LFxuICAvL2FyYzogeyAvLyBwaWVcbiAgLy9cbiAgLy99XG59O1xuXG5mdW5jdGlvbiByZXRpbmFsRW5jUnVsZXMoZW5jb2RpbmcsIGZpZWxkRGVmLCBzdGF0cywgb3B0KSB7XG4gIGlmIChvcHQub21pdE11bHRpcGxlUmV0aW5hbEVuY29kaW5ncykge1xuICAgIGlmIChlbmNvZGluZy5jb2xvciB8fCBlbmNvZGluZy5zaXplIHx8IGVuY29kaW5nLnNoYXBlKSByZXR1cm4gZmFsc2U7XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59XG5cbmZ1bmN0aW9uIGNvbG9yUnVsZXMoZW5jb2RpbmcsIGZpZWxkRGVmLCBzdGF0cywgb3B0KSB7XG4gIGlmKCFyZXRpbmFsRW5jUnVsZXMoZW5jb2RpbmcsIGZpZWxkRGVmLCBzdGF0cywgb3B0KSkgcmV0dXJuIGZhbHNlO1xuXG4gIHJldHVybiB2bEZpZWxkRGVmLmlzTWVhc3VyZShmaWVsZERlZikgfHxcbiAgICB2bEZpZWxkRGVmLmNhcmRpbmFsaXR5KGZpZWxkRGVmLCBzdGF0cykgPD0gb3B0Lm1heENhcmRpbmFsaXR5Rm9yQ29sb3I7XG59XG5cbmZ1bmN0aW9uIHNoYXBlUnVsZXMoZW5jb2RpbmcsIGZpZWxkRGVmLCBzdGF0cywgb3B0KSB7XG4gIGlmKCFyZXRpbmFsRW5jUnVsZXMoZW5jb2RpbmcsIGZpZWxkRGVmLCBzdGF0cywgb3B0KSkgcmV0dXJuIGZhbHNlO1xuXG4gIGlmIChmaWVsZERlZi5iaW4gJiYgZmllbGREZWYudHlwZSA9PT0gVHlwZS5RdWFudGl0YXRpdmUpIHJldHVybiBmYWxzZTtcbiAgaWYgKGZpZWxkRGVmLnRpbWVVbml0ICYmIGZpZWxkRGVmLnR5cGUgPT09IFR5cGUuVGVtcG9yYWwpIHJldHVybiBmYWxzZTtcbiAgcmV0dXJuIHZsRmllbGREZWYuY2FyZGluYWxpdHkoZmllbGREZWYsIHN0YXRzKSA8PSBvcHQubWF4Q2FyZGluYWxpdHlGb3JDb2xvcjtcbn1cblxuZnVuY3Rpb24gZGltTWVhVHJhbnNwb3NlUnVsZShlbmNvZGluZykge1xuICAvLyBjcmVhdGUgaG9yaXpvbnRhbCBoaXN0b2dyYW0gZm9yIG9yZGluYWxcbiAgaWYgKChlbmNvZGluZy55LnR5cGUgPT09IFR5cGUuTm9taW5hbCB8fCBlbmNvZGluZy55LnR5cGUgPT09IFR5cGUuT3JkaW5hbCkgJiYgaXNNZWFzdXJlKGVuY29kaW5nLngpKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICAvLyB2ZXJ0aWNhbCBoaXN0b2dyYW0gZm9yIFEgYW5kIFRcbiAgaWYgKGlzTWVhc3VyZShlbmNvZGluZy55KSAmJlxuICAgICAgIShlbmNvZGluZy54LnR5cGUgPT09IFR5cGUuTm9taW5hbCB8fCBlbmNvZGluZy54LnR5cGUgPT09IFR5cGUuT3JkaW5hbCkgJiZcbiAgICAgIGlzRGltZW5zaW9uKGVuY29kaW5nLngpXG4gICAgICApIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHJldHVybiBmYWxzZTtcbn1cblxuZnVuY3Rpb24gZ2VuZXJhbFJ1bGVzKGVuY29kaW5nLCBzdGF0cywgb3B0KSB7XG4gIC8vIGVuY29kaW5nLnRleHQgaXMgb25seSB1c2VkIGZvciBURVhUIFRBQkxFXG4gIGlmIChlbmNvZGluZy50ZXh0KSB7XG4gICAgcmV0dXJuIGdlbk1hcmtzLnNhdGlzZnlSdWxlcyhlbmNvZGluZywgJ3RleHQnLCBzdGF0cywgb3B0KTtcbiAgfVxuXG4gIC8vIENBUlRFU0lBTiBQTE9UIE9SIE1BUFxuICBpZiAoZW5jb2RpbmcueCB8fCBlbmNvZGluZy55IHx8IGVuY29kaW5nLmdlbyB8fCBlbmNvZGluZy5hcmMpIHtcblxuICAgIGlmIChlbmNvZGluZy5yb3cgfHwgZW5jb2RpbmcuY29sdW1uKSB7IC8vaGF2ZSBmYWNldChzKVxuXG4gICAgICAvLyBkb24ndCB1c2UgZmFjZXRzIGJlZm9yZSBmaWxsaW5nIHVwIHgseVxuICAgICAgaWYgKCFlbmNvZGluZy54IHx8ICFlbmNvZGluZy55KSByZXR1cm4gZmFsc2U7XG5cbiAgICAgIGlmIChvcHQub21pdE5vblRleHRBZ2dyV2l0aEFsbERpbXNPbkZhY2V0cykge1xuICAgICAgICAvLyByZW1vdmUgYWxsIGFnZ3JlZ2F0ZWQgY2hhcnRzIHdpdGggYWxsIGRpbXMgb24gZmFjZXRzIChyb3csIGNvbHVtbilcbiAgICAgICAgaWYgKGdlbkVuY29kaW5ncy5pc0FnZ3JXaXRoQWxsRGltT25GYWNldHMoZW5jb2RpbmcpKSByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGVuY29kaW5nLnggJiYgZW5jb2RpbmcueSkge1xuICAgICAgdmFyIGlzRGltWCA9ICEhaXNEaW1lbnNpb24oZW5jb2RpbmcueCksXG4gICAgICAgIGlzRGltWSA9ICEhaXNEaW1lbnNpb24oZW5jb2RpbmcueSk7XG5cbiAgICAgIGlmIChpc0RpbVggJiYgaXNEaW1ZICYmICF2bEVuY29kaW5nLmlzQWdncmVnYXRlKGVuY29kaW5nKSkge1xuICAgICAgICAvLyBGSVhNRSBhY3R1YWxseSBjaGVjayBpZiB0aGVyZSB3b3VsZCBiZSBvY2NsdXNpb24gIzkwXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgaWYgKG9wdC5vbWl0VHJhbnBvc2UpIHtcbiAgICAgICAgaWYgKGlzRGltWCBeIGlzRGltWSkgeyAvLyBkaW0geCBtZWFcbiAgICAgICAgICBpZiAoIWRpbU1lYVRyYW5zcG9zZVJ1bGUoZW5jb2RpbmcpKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGVuY29kaW5nLnkudHlwZT09PSBUeXBlLlRlbXBvcmFsfHwgZW5jb2RpbmcueC50eXBlID09PSBUeXBlLlRlbXBvcmFsKSB7XG4gICAgICAgICAgaWYgKGVuY29kaW5nLnkudHlwZT09PSBUeXBlLlRlbXBvcmFsICYmIGVuY29kaW5nLngudHlwZSAhPT0gVHlwZS5UZW1wb3JhbCkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHsgLy8gc2hvdyBvbmx5IG9uZSBPeE8sIFF4UVxuICAgICAgICAgIGlmIChlbmNvZGluZy54LmZpZWxkID4gZW5jb2RpbmcueS5maWVsZCkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLy8gRE9UIFBMT1RTXG4gICAgLy8gLy8gcGxvdCB3aXRoIG9uZSBheGlzID0gZG90IHBsb3RcbiAgICBpZiAob3B0Lm9taXREb3RQbG90KSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgLy8gRG90IHBsb3Qgc2hvdWxkIGFsd2F5cyBiZSBob3Jpem9udGFsXG4gICAgaWYgKG9wdC5vbWl0VHJhbnBvc2UgJiYgZW5jb2RpbmcueSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8vIGRvdCBwbG90IHNob3VsZG4ndCBoYXZlIG90aGVyIGVuY29kaW5nXG4gICAgaWYgKG9wdC5vbWl0RG90UGxvdFdpdGhFeHRyYUVuY29kaW5nICYmIHV0aWwua2V5cyhlbmNvZGluZykubGVuZ3RoID4gMSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGlmIChvcHQub21pdE9uZURpbWVuc2lvbkNvdW50KSB7XG4gICAgICAvLyBvbmUgZGltZW5zaW9uIFwiY291bnRcIlxuICAgICAgaWYgKGVuY29kaW5nLnggJiYgZW5jb2RpbmcueC5hZ2dyZWdhdGUgPT0gJ2NvdW50JyAmJiAhZW5jb2RpbmcueSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBpZiAoZW5jb2RpbmcueSAmJiBlbmNvZGluZy55LmFnZ3JlZ2F0ZSA9PSAnY291bnQnICYmICFlbmNvZGluZy54KSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG5cbmdlbkVuY29kaW5ncy5pc0FnZ3JXaXRoQWxsRGltT25GYWNldHMgPSBmdW5jdGlvbiAoZW5jb2RpbmcpIHtcbiAgdmFyIGhhc0FnZ3IgPSBmYWxzZSwgaGFzT3RoZXJPID0gZmFsc2U7XG4gIGZvciAodmFyIGNoYW5uZWwgaW4gZW5jb2RpbmcpIHtcbiAgICB2YXIgZmllbGREZWYgPSBlbmNvZGluZ1tjaGFubmVsXTtcbiAgICBpZiAoZmllbGREZWYuYWdncmVnYXRlKSB7XG4gICAgICBoYXNBZ2dyID0gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKHZsRmllbGREZWYuaXNEaW1lbnNpb24oZmllbGREZWYpICYmIChjaGFubmVsICE9PSBjb25zdHMuUk9XICYmIGNoYW5uZWwgIT09IGNvbnN0cy5DT0wpKSB7XG4gICAgICBoYXNPdGhlck8gPSB0cnVlO1xuICAgIH1cbiAgICBpZiAoaGFzQWdnciAmJiBoYXNPdGhlck8pIGJyZWFrO1xuICB9XG5cbiAgcmV0dXJuIGhhc0FnZ3IgJiYgIWhhc090aGVyTztcbn07XG5cblxuZnVuY3Rpb24gZ2VuRW5jb2RpbmdzKGVuY29kaW5ncywgZmllbGREZWZzLCBzdGF0cywgb3B0KSB7XG4gIC8vIGdlbmVyYXRlIGEgY29sbGVjdGlvbiB2ZWdhLWxpdGUncyBlbmNvZGluZ1xuICB2YXIgdG1wRW5jb2RpbmcgPSB7fTtcblxuICBmdW5jdGlvbiBhc3NpZ25GaWVsZChpKSB7XG4gICAgLy8gSWYgYWxsIGZpZWxkcyBhcmUgYXNzaWduZWQsIHNhdmVcbiAgICBpZiAoaSA9PT0gZmllbGREZWZzLmxlbmd0aCkge1xuICAgICAgLy8gYXQgdGhlIG1pbmltYWwgYWxsIGNoYXJ0IHNob3VsZCBoYXZlIHgsIHksIGdlbywgdGV4dCBvciBhcmNcbiAgICAgIGlmIChnZW5lcmFsUnVsZXModG1wRW5jb2RpbmcsIHN0YXRzLCBvcHQpKSB7XG4gICAgICAgIGVuY29kaW5ncy5wdXNoKHV0aWwuZHVwbGljYXRlKHRtcEVuY29kaW5nKSk7XG4gICAgICB9XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gT3RoZXJ3aXNlLCBhc3NpZ24gaS10aCBmaWVsZFxuICAgIHZhciBmaWVsZERlZiA9IGZpZWxkRGVmc1tpXTtcbiAgICBmb3IgKHZhciBqIGluIG9wdC5lbmNvZGluZ1R5cGVMaXN0KSB7XG4gICAgICB2YXIgY2hhbm5lbCA9IG9wdC5lbmNvZGluZ1R5cGVMaXN0W2pdLFxuICAgICAgICBpc0RpbSA9IGlzRGltZW5zaW9uKGZpZWxkRGVmKTtcblxuICAgICAgLy9UT0RPOiBzdXBwb3J0IFwibXVsdGlwbGVcIiBhc3NpZ25tZW50XG4gICAgICBpZiAoIShjaGFubmVsIGluIHRtcEVuY29kaW5nKSAmJiAvLyBlbmNvZGluZyBub3QgdXNlZFxuICAgICAgICAoKGlzRGltICYmIHJ1bGVzW2NoYW5uZWxdLmRpbWVuc2lvbikgfHwgKCFpc0RpbSAmJiBydWxlc1tjaGFubmVsXS5tZWFzdXJlKSkgJiZcbiAgICAgICAgKCFydWxlc1tjaGFubmVsXS5ydWxlcyB8fCBydWxlc1tjaGFubmVsXS5ydWxlcyh0bXBFbmNvZGluZywgZmllbGREZWYsIHN0YXRzLCBvcHQpKVxuICAgICAgKSB7XG4gICAgICAgIHRtcEVuY29kaW5nW2NoYW5uZWxdID0gZmllbGREZWY7XG4gICAgICAgIGFzc2lnbkZpZWxkKGkgKyAxKTtcbiAgICAgICAgZGVsZXRlIHRtcEVuY29kaW5nW2NoYW5uZWxdO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGFzc2lnbkZpZWxkKDApO1xuXG4gIHJldHVybiBlbmNvZGluZ3M7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciB1dGlsID0gcmVxdWlyZSgnLi4vdXRpbCcpO1xuXG4vKipcbiAqIE1vZHVsZSBmb3IgZ2VuZXJhdGluZyB2aXN1YWxpemF0aW9uc1xuICovXG5cbnZhciBnZW4gPSBtb2R1bGUuZXhwb3J0cyA9IHtcbiAgLy8gZGF0YSB2YXJpYXRpb25zXG4gIGFnZ3JlZ2F0ZXM6IHJlcXVpcmUoJy4vYWdncmVnYXRlcycpLFxuICBwcm9qZWN0aW9uczogcmVxdWlyZSgnLi9wcm9qZWN0aW9ucycpLFxuICAvLyBlbmNvZGluZ3MgLyB2aXN1YWwgdmFyaWF0aW9uc1xuICBzcGVjczogcmVxdWlyZSgnLi9zcGVjcycpLFxuICBlbmNvZGluZ3M6IHJlcXVpcmUoJy4vZW5jb2RpbmdzJyksXG4gIG1hcmtzOiByZXF1aXJlKCcuL21hcmtzJylcbn07XG5cblxuLy8gVE9ETyhrYW5pdHcpOiByZXZpc2UgaWYgdGhpcyBpcyBzdGlsbCB3b3JraW5nXG5nZW4uY2hhcnRzID0gZnVuY3Rpb24oZmllbGREZWZzLCBvcHQsIGNvbmZpZywgZmxhdCkge1xuICBvcHQgPSB1dGlsLmdlbi5nZXRPcHQob3B0KTtcbiAgZmxhdCA9IGZsYXQgPT09IHVuZGVmaW5lZCA/IHtlbmNvZGluZ3M6IDF9IDogZmxhdDtcblxuICAvLyBUT0RPIGdlbmVyYXRlXG5cbiAgLy8gZ2VuZXJhdGUgcGVybXV0YXRpb24gb2YgZW5jb2RpbmcgbWFwcGluZ3NcbiAgdmFyIGZpZWxkU2V0cyA9IG9wdC5nZW5BZ2dyID8gZ2VuLmFnZ3JlZ2F0ZXMoW10sIGZpZWxkRGVmcywgb3B0KSA6IFtmaWVsZERlZnNdLFxuICAgIGVuY29kaW5ncywgY2hhcnRzLCBsZXZlbCA9IDA7XG5cbiAgaWYgKGZsYXQgPT09IHRydWUgfHwgKGZsYXQgJiYgZmxhdC5hZ2dyZWdhdGUpKSB7XG4gICAgZW5jb2RpbmdzID0gZmllbGRTZXRzLnJlZHVjZShmdW5jdGlvbihvdXRwdXQsIGZpZWxkRGVmcykge1xuICAgICAgcmV0dXJuIGdlbi5lbmNzKG91dHB1dCwgZmllbGREZWZzLCBvcHQpO1xuICAgIH0sIFtdKTtcbiAgfSBlbHNlIHtcbiAgICBlbmNvZGluZ3MgPSBmaWVsZFNldHMubWFwKGZ1bmN0aW9uKGZpZWxkRGVmcykge1xuICAgICAgcmV0dXJuIGdlbi5lbmNzKFtdLCBmaWVsZERlZnMsIG9wdCk7XG4gICAgfSwgdHJ1ZSk7XG4gICAgbGV2ZWwgKz0gMTtcbiAgfVxuXG4gIGlmIChmbGF0ID09PSB0cnVlIHx8IChmbGF0ICYmIGZsYXQuZW5jb2RpbmdzKSkge1xuICAgIGNoYXJ0cyA9IHV0aWwubmVzdGVkUmVkdWNlKGVuY29kaW5ncywgZnVuY3Rpb24ob3V0cHV0LCBlbmNvZGluZykge1xuICAgICAgcmV0dXJuIGdlbi5tYXJrcyhvdXRwdXQsIGVuY29kaW5nLCBvcHQsIGNvbmZpZyk7XG4gICAgfSwgbGV2ZWwsIHRydWUpO1xuICB9IGVsc2Uge1xuICAgIGNoYXJ0cyA9IHV0aWwubmVzdGVkTWFwKGVuY29kaW5ncywgZnVuY3Rpb24oZW5jb2RpbmcpIHtcbiAgICAgIHJldHVybiBnZW4ubWFya3MoW10sIGVuY29kaW5nLCBvcHQsIGNvbmZpZyk7XG4gICAgfSwgbGV2ZWwsIHRydWUpO1xuICAgIGxldmVsICs9IDE7XG4gIH1cbiAgcmV0dXJuIGNoYXJ0cztcbn07IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciB2bEVuY29kaW5nID0gcmVxdWlyZSgndmVnYS1saXRlL3NyYy9lbmNvZGluZycpO1xudmFyIHZsRmllbGREZWYgPSByZXF1aXJlKCd2ZWdhLWxpdGUvc3JjL2ZpZWxkZGVmJyk7XG52YXIgdmxWYWxpZGF0ZSA9IHJlcXVpcmUoJ3ZlZ2EtbGl0ZS9zcmMvdmFsaWRhdGUnKTtcblxudmFyIGlzRGltZW5zaW9uID0gdmxGaWVsZERlZi5pc0RpbWVuc2lvbjtcbnZhciB1dGlsID0gcmVxdWlyZSgnLi4vdXRpbCcpO1xuXG52YXIgY29uc3RzID0gcmVxdWlyZSgnLi4vY29uc3RzJyk7XG52YXIgVHlwZSA9IGNvbnN0cy5UeXBlO1xuXG52YXIgZ2VuTWFya3MgPSBtb2R1bGUuZXhwb3J0cyA9IGdldE1hcmtzO1xuXG52YXIgbWFya3NSdWxlID0gZ2VuTWFya3MucnVsZSA9IHtcbiAgcG9pbnQ6ICBwb2ludFJ1bGUsXG4gIGJhcjogICAgYmFyUnVsZSxcbiAgbGluZTogICBsaW5lUnVsZSxcbiAgYXJlYTogICBhcmVhUnVsZSwgLy8gYXJlYSBpcyBzaW1pbGFyIHRvIGxpbmVcbiAgdGV4dDogICB0ZXh0UnVsZSxcbiAgdGljazogICB0aWNrUnVsZVxufTtcblxuZnVuY3Rpb24gZ2V0TWFya3MoZW5jb2RpbmcsIHN0YXRzLCBvcHQpIHtcbiAgcmV0dXJuIG9wdC5tYXJrTGlzdC5maWx0ZXIoZnVuY3Rpb24obWFyayl7XG4gICAgcmV0dXJuIGdlbk1hcmtzLnNhdGlzZnlSdWxlcyhlbmNvZGluZywgbWFyaywgc3RhdHMsIG9wdCk7XG4gIH0pO1xufVxuXG5nZW5NYXJrcy5zYXRpc2Z5UnVsZXMgPSBmdW5jdGlvbiAoZW5jb2RpbmcsIG1hcmssIHN0YXRzLCBvcHQpIHtcbiAgcmV0dXJuIHZsVmFsaWRhdGUuZ2V0RW5jb2RpbmdNYXBwaW5nRXJyb3Ioe1xuICAgICAgbWFyazogbWFyayxcbiAgICAgIGVuY29kaW5nOiBlbmNvZGluZ1xuICAgIH0pID09PSBudWxsICYmXG4gICAgKCFtYXJrc1J1bGVbbWFya10gfHwgbWFya3NSdWxlW21hcmtdKGVuY29kaW5nLCBzdGF0cywgb3B0KSk7XG59O1xuXG5mdW5jdGlvbiBmYWNldFJ1bGUoZmllbGREZWYsIHN0YXRzLCBvcHQpIHtcbiAgcmV0dXJuIHZsRmllbGREZWYuY2FyZGluYWxpdHkoZmllbGREZWYsIHN0YXRzKSA8PSBvcHQubWF4Q2FyZGluYWxpdHlGb3JGYWNldHM7XG59XG5cbmZ1bmN0aW9uIGZhY2V0c1J1bGUoZW5jb2RpbmcsIHN0YXRzLCBvcHQpIHtcbiAgaWYoZW5jb2Rpbmcucm93ICYmICFmYWNldFJ1bGUoZW5jb2Rpbmcucm93LCBzdGF0cywgb3B0KSkgcmV0dXJuIGZhbHNlO1xuICBpZihlbmNvZGluZy5jb2x1bW4gJiYgIWZhY2V0UnVsZShlbmNvZGluZy5jb2x1bW4sIHN0YXRzLCBvcHQpKSByZXR1cm4gZmFsc2U7XG4gIHJldHVybiB0cnVlO1xufVxuXG5mdW5jdGlvbiBwb2ludFJ1bGUoZW5jb2RpbmcsIHN0YXRzLCBvcHQpIHtcbiAgaWYoIWZhY2V0c1J1bGUoZW5jb2RpbmcsIHN0YXRzLCBvcHQpKSByZXR1cm4gZmFsc2U7XG4gIGlmIChlbmNvZGluZy54ICYmIGVuY29kaW5nLnkpIHtcbiAgICAvLyBoYXZlIGJvdGggeCAmIHkgPT0+IHNjYXR0ZXIgcGxvdCAvIGJ1YmJsZSBwbG90XG5cbiAgICB2YXIgeElzRGltID0gaXNEaW1lbnNpb24oZW5jb2RpbmcueCksXG4gICAgICB5SXNEaW0gPSBpc0RpbWVuc2lvbihlbmNvZGluZy55KTtcblxuICAgIC8vIEZvciBPeE9cbiAgICBpZiAoeElzRGltICYmIHlJc0RpbSkge1xuICAgICAgLy8gc2hhcGUgZG9lc24ndCB3b3JrIHdpdGggYm90aCB4LCB5IGFzIG9yZGluYWxcbiAgICAgIGlmIChlbmNvZGluZy5zaGFwZSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG5cbiAgICAgIC8vIFRPRE8oa2FuaXR3KTogY2hlY2sgdGhhdCB0aGVyZSBpcyBxdWFudCBhdCBsZWFzdCAuLi5cbiAgICAgIGlmIChlbmNvZGluZy5jb2xvciAmJiBpc0RpbWVuc2lvbihlbmNvZGluZy5jb2xvcikpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cblxuICB9IGVsc2UgeyAvLyBwbG90IHdpdGggb25lIGF4aXMgPSBkb3QgcGxvdFxuICAgIGlmIChvcHQub21pdERvdFBsb3QpIHJldHVybiBmYWxzZTtcblxuICAgIC8vIERvdCBwbG90IHNob3VsZCBhbHdheXMgYmUgaG9yaXpvbnRhbFxuICAgIGlmIChvcHQub21pdFRyYW5wb3NlICYmIGVuY29kaW5nLnkpIHJldHVybiBmYWxzZTtcblxuICAgIC8vIGRvdCBwbG90IHNob3VsZG4ndCBoYXZlIG90aGVyIGVuY29kaW5nXG4gICAgaWYgKG9wdC5vbWl0RG90UGxvdFdpdGhFeHRyYUVuY29kaW5nICYmIHV0aWwua2V5cyhlbmNvZGluZykubGVuZ3RoID4gMSkgcmV0dXJuIGZhbHNlO1xuXG4gICAgLy8gZG90IHBsb3Qgd2l0aCBzaGFwZSBpcyBub24tc2Vuc2VcbiAgICBpZiAoZW5jb2Rpbmcuc2hhcGUpIHJldHVybiBmYWxzZTtcbiAgfVxuICByZXR1cm4gdHJ1ZTtcbn1cblxuZnVuY3Rpb24gdGlja1J1bGUoZW5jb2RpbmcsIHN0YXRzLCBvcHQpIHtcbiAgLy8ganNoaW50IHVudXNlZDpmYWxzZVxuICBpZiAoZW5jb2RpbmcueCB8fCBlbmNvZGluZy55KSB7XG4gICAgaWYodmxFbmNvZGluZy5pc0FnZ3JlZ2F0ZShlbmNvZGluZykpIHJldHVybiBmYWxzZTtcblxuICAgIHZhciB4SXNEaW0gPSBpc0RpbWVuc2lvbihlbmNvZGluZy54KSxcbiAgICAgIHlJc0RpbSA9IGlzRGltZW5zaW9uKGVuY29kaW5nLnkpO1xuXG4gICAgcmV0dXJuICgheElzRGltICYmICghZW5jb2RpbmcueSB8fCB5SXNEaW0pKSB8fFxuICAgICAgKCF5SXNEaW0gJiYgKCFlbmNvZGluZy54IHx8IHhJc0RpbSkpO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuZnVuY3Rpb24gYmFyUnVsZShlbmNvZGluZywgc3RhdHMsIG9wdCkge1xuICBpZighZmFjZXRzUnVsZShlbmNvZGluZywgc3RhdHMsIG9wdCkpIHJldHVybiBmYWxzZTtcblxuICAvLyBiYXIgcmVxdWlyZXMgYXQgbGVhc3QgeCBvciB5XG4gIGlmICghZW5jb2RpbmcueCAmJiAhZW5jb2RpbmcueSkgcmV0dXJuIGZhbHNlO1xuXG4gIGlmIChvcHQub21pdFNpemVPbkJhciAmJiBlbmNvZGluZy5zaXplICE9PSB1bmRlZmluZWQpIHJldHVybiBmYWxzZTtcblxuICAvLyBGSVhNRSBhY3R1YWxseSBjaGVjayBpZiB0aGVyZSB3b3VsZCBiZSBvY2NsdXNpb24gIzkwXG4gIC8vIG5lZWQgdG8gYWdncmVnYXRlIG9uIGVpdGhlciB4IG9yIHlcbiAgdmFyIGFnZ0VpdGhlclhvclkgPVxuICAgICghZW5jb2RpbmcueCB8fCBlbmNvZGluZy54LmFnZ3JlZ2F0ZSA9PT0gdW5kZWZpbmVkKSBeXG4gICAgKCFlbmNvZGluZy55IHx8IGVuY29kaW5nLnkuYWdncmVnYXRlID09PSB1bmRlZmluZWQpO1xuXG5cbiAgaWYgKGFnZ0VpdGhlclhvclkpIHtcbiAgICB2YXIgZWl0aGVyWG9yWWlzRGltT3JOdWxsID1cbiAgICAgICghZW5jb2RpbmcueCB8fCBpc0RpbWVuc2lvbihlbmNvZGluZy54KSkgXlxuICAgICAgKCFlbmNvZGluZy55IHx8IGlzRGltZW5zaW9uKGVuY29kaW5nLnkpKTtcblxuICAgIGlmIChlaXRoZXJYb3JZaXNEaW1Pck51bGwpIHtcbiAgICAgIHZhciBhZ2dyZWdhdGUgPSBlbmNvZGluZy54LmFnZ3JlZ2F0ZSB8fCBlbmNvZGluZy55LmFnZ3JlZ2F0ZTtcbiAgICAgIHJldHVybiAhKG9wdC5vbWl0U3RhY2tlZEF2ZXJhZ2UgJiYgYWdncmVnYXRlID09PSdtZWFuJyAmJiBlbmNvZGluZy5jb2xvcik7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG5mdW5jdGlvbiBsaW5lUnVsZShlbmNvZGluZywgc3RhdHMsIG9wdCkge1xuICBpZighZmFjZXRzUnVsZShlbmNvZGluZywgc3RhdHMsIG9wdCkpIHJldHVybiBmYWxzZTtcblxuICAvLyBUT0RPKGthbml0dyk6IGFkZCBvbWl0VmVydGljYWxMaW5lIGFzIGNvbmZpZ1xuXG4gIC8vIEZJWE1FIHRydWx5IG9yZGluYWwgZGF0YSBpcyBmaW5lIGhlcmUgdG9vLlxuICAvLyBMaW5lIGNoYXJ0IHNob3VsZCBiZSBvbmx5IGhvcml6b250YWxcbiAgLy8gYW5kIHVzZSBvbmx5IHRlbXBvcmFsIGRhdGFcbiAgcmV0dXJuIGVuY29kaW5nLngudHlwZSA9PSBUeXBlLlRlbXBvcmFsICYmIGVuY29kaW5nLngudGltZVVuaXQgJiYgZW5jb2RpbmcueS50eXBlID09IFR5cGUuUXVhbnRpdGF0aXZlICYmIGVuY29kaW5nLnkuYWdncmVnYXRlO1xufVxuXG5mdW5jdGlvbiBhcmVhUnVsZShlbmNvZGluZywgc3RhdHMsIG9wdCkge1xuICBpZighZmFjZXRzUnVsZShlbmNvZGluZywgc3RhdHMsIG9wdCkpIHJldHVybiBmYWxzZTtcblxuICBpZighbGluZVJ1bGUoZW5jb2RpbmcsIHN0YXRzLCBvcHQpKSByZXR1cm4gZmFsc2U7XG5cbiAgcmV0dXJuICEob3B0Lm9taXRTdGFja2VkQXZlcmFnZSAmJiBlbmNvZGluZy55LmFnZ3JlZ2F0ZSA9PT0nbWVhbicgJiYgZW5jb2RpbmcuY29sb3IpO1xufVxuXG5mdW5jdGlvbiB0ZXh0UnVsZShlbmNvZGluZywgc3RhdHMsIG9wdCkge1xuICAvLyBhdCBsZWFzdCBtdXN0IGhhdmUgcm93IG9yIGNvbHVtbiBhbmQgYWdncmVnYXRlZCB0ZXh0IHZhbHVlc1xuICByZXR1cm4gKGVuY29kaW5nLnJvdyB8fCBlbmNvZGluZy5jb2x1bW4pICYmIGVuY29kaW5nLnRleHQgJiYgZW5jb2RpbmcudGV4dC5hZ2dyZWdhdGUgJiYgIWVuY29kaW5nLnggJiYgIWVuY29kaW5nLnkgJiYgIWVuY29kaW5nLnNpemUgJiZcbiAgICAoIW9wdC5hbHdheXNHZW5lcmF0ZVRhYmxlQXNIZWF0bWFwIHx8ICFlbmNvZGluZy5jb2xvcik7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciB2bEZpZWxkRGVmID0gcmVxdWlyZSgndmVnYS1saXRlL3NyYy9maWVsZGRlZicpO1xudmFyIHZsU2NoZW1hVXRpbCA9IHJlcXVpcmUoJ3ZlZ2EtbGl0ZS9zcmMvc2NoZW1hL3NjaGVtYXV0aWwnKTtcblxudmFyIHV0aWwgPSByZXF1aXJlKCcuLi91dGlsJyksXG4gIGNvbnN0cyA9IHJlcXVpcmUoJy4uL2NvbnN0cycpLFxuICBpc0RpbWVuc2lvbiA9IHZsRmllbGREZWYuaXNEaW1lbnNpb247XG5cbm1vZHVsZS5leHBvcnRzID0gcHJvamVjdGlvbnM7XG5cbi8vIFRPRE8gc3VwcG9ydCBvdGhlciBtb2RlIG9mIHByb2plY3Rpb25zIGdlbmVyYXRpb25cbi8vIHBvd2Vyc2V0LCBjaG9vc2VLLCBjaG9vc2VLb3JMZXNzIGFyZSBhbHJlYWR5IGluY2x1ZGVkIGluIHRoZSB1dGlsXG5cbi8qKlxuICogZmllbGRzXG4gKiBAcGFyYW0gIHtbdHlwZV19IGZpZWxkRGVmcyBhcnJheSBvZiBmaWVsZHMgYW5kIHF1ZXJ5IGluZm9ybWF0aW9uXG4gKiBAcmV0dXJuIHtbdHlwZV19ICAgICAgICBbZGVzY3JpcHRpb25dXG4gKi9cbmZ1bmN0aW9uIHByb2plY3Rpb25zKGZpZWxkRGVmcywgc3RhdHMsIG9wdCkge1xuICBvcHQgPSB2bFNjaGVtYVV0aWwuZXh0ZW5kKG9wdHx8e30sIGNvbnN0cy5nZW4ucHJvamVjdGlvbnMpO1xuXG4gIC8vIEZpcnN0IGNhdGVnb3JpemUgZmllbGQsIHNlbGVjdGVkLCBmaWVsZHNUb0FkZCwgYW5kIHNhdmUgaW5kaWNlc1xuICB2YXIgc2VsZWN0ZWQgPSBbXSwgZmllbGRzVG9BZGQgPSBbXSwgZmllbGRTZXRzID0gW10sXG4gICAgaGFzU2VsZWN0ZWREaW1lbnNpb24gPSBmYWxzZSxcbiAgICBoYXNTZWxlY3RlZE1lYXN1cmUgPSBmYWxzZSxcbiAgICBpbmRpY2VzID0ge307XG5cbiAgZmllbGREZWZzLmZvckVhY2goZnVuY3Rpb24oZmllbGREZWYsIGluZGV4KXtcbiAgICAvL3NhdmUgaW5kaWNlcyBmb3Igc3RhYmxlIHNvcnQgbGF0ZXJcbiAgICBpbmRpY2VzW2ZpZWxkRGVmLmZpZWxkXSA9IGluZGV4O1xuXG4gICAgaWYgKGZpZWxkRGVmLnNlbGVjdGVkKSB7XG4gICAgICBzZWxlY3RlZC5wdXNoKGZpZWxkRGVmKTtcbiAgICAgIGlmIChpc0RpbWVuc2lvbihmaWVsZERlZikgfHwgZmllbGREZWYudHlwZSA9PT0ndGVtcG9yYWwnKSB7IC8vIEZJWE1FIC8gSEFDS1xuICAgICAgICBoYXNTZWxlY3RlZERpbWVuc2lvbiA9IHRydWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBoYXNTZWxlY3RlZE1lYXN1cmUgPSB0cnVlO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoZmllbGREZWYuc2VsZWN0ZWQgIT09IGZhbHNlICYmICF2bEZpZWxkRGVmLmlzQ291bnQoZmllbGREZWYpKSB7XG4gICAgICBpZiAodmxGaWVsZERlZi5pc0RpbWVuc2lvbihmaWVsZERlZikgJiZcbiAgICAgICAgICAhb3B0Lm1heENhcmRpbmFsaXR5Rm9yQXV0b0FkZE9yZGluYWwgJiZcbiAgICAgICAgICB2bEZpZWxkRGVmLmNhcmRpbmFsaXR5KGZpZWxkRGVmLCBzdGF0cywgMTUpID4gb3B0Lm1heENhcmRpbmFsaXR5Rm9yQXV0b0FkZE9yZGluYWxcbiAgICAgICAgKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGZpZWxkc1RvQWRkLnB1c2goZmllbGREZWYpO1xuICAgIH1cbiAgfSk7XG5cbiAgZmllbGRzVG9BZGQuc29ydChjb21wYXJlRmllbGRzVG9BZGQoaGFzU2VsZWN0ZWREaW1lbnNpb24sIGhhc1NlbGVjdGVkTWVhc3VyZSwgaW5kaWNlcykpO1xuXG4gIHZhciBzZXRzVG9BZGQgPSB1dGlsLmNob29zZUtvckxlc3MoZmllbGRzVG9BZGQsIDEpO1xuXG4gIHNldHNUb0FkZC5mb3JFYWNoKGZ1bmN0aW9uKHNldFRvQWRkKSB7XG4gICAgdmFyIGZpZWxkU2V0ID0gc2VsZWN0ZWQuY29uY2F0KHNldFRvQWRkKTtcbiAgICBpZiAoZmllbGRTZXQubGVuZ3RoID4gMCkge1xuICAgICAgaWYgKG9wdC5vbWl0RG90UGxvdCAmJiBmaWVsZFNldC5sZW5ndGggPT09IDEpIHJldHVybjtcbiAgICAgIGZpZWxkU2V0cy5wdXNoKGZpZWxkU2V0KTtcbiAgICB9XG4gIH0pO1xuXG4gIGZpZWxkU2V0cy5mb3JFYWNoKGZ1bmN0aW9uKGZpZWxkU2V0KSB7XG4gICAgICAvLyBhbHdheXMgYXBwZW5kIHByb2plY3Rpb24ncyBrZXkgdG8gZWFjaCBwcm9qZWN0aW9uIHJldHVybmVkLCBkMyBzdHlsZS5cbiAgICBmaWVsZFNldC5rZXkgPSBwcm9qZWN0aW9ucy5rZXkoZmllbGRTZXQpO1xuICB9KTtcblxuICByZXR1cm4gZmllbGRTZXRzO1xufVxuXG52YXIgdHlwZUlzTWVhc3VyZVNjb3JlID0ge1xuICBub21pbmFsOiAwLFxuICBvcmRpbmFsOiAwLFxuICB0ZW1wb3JhbDogMixcbiAgcXVhbnRpdGF0aXZlOiAzXG59O1xuXG5mdW5jdGlvbiBjb21wYXJlRmllbGRzVG9BZGQoaGFzU2VsZWN0ZWREaW1lbnNpb24sIGhhc1NlbGVjdGVkTWVhc3VyZSwgaW5kaWNlcykge1xuICByZXR1cm4gZnVuY3Rpb24oYSwgYil7XG4gICAgLy8gc29ydCBieSB0eXBlIG9mIHRoZSBkYXRhXG4gICAgaWYgKGEudHlwZSAhPT0gYi50eXBlKSB7XG4gICAgICBpZiAoIWhhc1NlbGVjdGVkRGltZW5zaW9uKSB7XG4gICAgICAgIHJldHVybiB0eXBlSXNNZWFzdXJlU2NvcmVbYS50eXBlXSAtIHR5cGVJc01lYXN1cmVTY29yZVtiLnR5cGVdO1xuICAgICAgfSBlbHNlIHsgLy9pZiAoIWhhc1NlbGVjdGVkTWVhc3VyZSkge1xuICAgICAgICByZXR1cm4gdHlwZUlzTWVhc3VyZVNjb3JlW2IudHlwZV0gLSB0eXBlSXNNZWFzdXJlU2NvcmVbYS50eXBlXTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy9tYWtlIHRoZSBzb3J0IHN0YWJsZVxuICAgIHJldHVybiBpbmRpY2VzW2EuZmllbGRdIC0gaW5kaWNlc1tiLmZpZWxkXTtcbiAgfTtcbn1cblxucHJvamVjdGlvbnMua2V5ID0gZnVuY3Rpb24ocHJvamVjdGlvbikge1xuICByZXR1cm4gcHJvamVjdGlvbi5tYXAoZnVuY3Rpb24oZmllbGREZWYpIHtcbiAgICByZXR1cm4gdmxGaWVsZERlZi5pc0NvdW50KGZpZWxkRGVmKSA/ICdjb3VudCcgOiBmaWVsZERlZi5maWVsZDtcbiAgfSkuam9pbignLCcpO1xufTtcblxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgdmxGaWVsZERlZiA9IHJlcXVpcmUoJ3ZlZ2EtbGl0ZS9zcmMvZmllbGRkZWYnKTtcbnZhciB2bFNjaGVtYVV0aWwgPSByZXF1aXJlKCd2ZWdhLWxpdGUvc3JjL3NjaGVtYS9zY2hlbWF1dGlsJyk7XG52YXIgdXRpbCA9IHJlcXVpcmUoJy4uL3V0aWwnKTtcblxudmFyIGdlbkVuY29kaW5ncyA9IHJlcXVpcmUoJy4vZW5jb2RpbmdzJyksXG4gIGdldE1hcmtzID0gcmVxdWlyZSgnLi9tYXJrcycpLFxuICByYW5rID0gcmVxdWlyZSgnLi4vcmFuay9yYW5rJyksXG4gIGNvbnN0cyA9IHJlcXVpcmUoJy4uL2NvbnN0cycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGdlblNwZWNzRnJvbUZpZWxkRGVmcztcblxuLyoqIERlc2lnbiBFbmNvZGluZ3MgZm9yIGEgc2V0IG9mIGZpZWxkIGRlZmluaXRpb24gKi9cblxuZnVuY3Rpb24gZ2VuU3BlY3NGcm9tRmllbGREZWZzKG91dHB1dCwgZmllbGREZWZzLCBzdGF0cywgb3B0LCBuZXN0ZWQpIHtcbiAgLy8gb3B0IG11c3QgYmUgYXVnbWVudGVkIGJlZm9yZSBiZWluZyBwYXNzZWQgdG8gZ2VuRW5jb2RpbmdzIG9yIGdldE1hcmtzXG4gIG9wdCA9IHZsU2NoZW1hVXRpbC5leHRlbmQob3B0fHx7fSwgY29uc3RzLmdlbi5lbmNvZGluZ3MpO1xuICB2YXIgZW5jb2RpbmdzID0gZ2VuRW5jb2RpbmdzKFtdLCBmaWVsZERlZnMsIHN0YXRzLCBvcHQpO1xuXG4gIGlmIChuZXN0ZWQpIHtcbiAgICByZXR1cm4gZW5jb2RpbmdzLnJlZHVjZShmdW5jdGlvbihkaWN0LCBlbmNvZGluZykge1xuICAgICAgZGljdFtlbmNvZGluZ10gPSBnZW5TcGVjc0Zyb21FbmNvZGluZ3MoW10sIGVuY29kaW5nLCBzdGF0cywgb3B0KTtcbiAgICAgIHJldHVybiBkaWN0O1xuICAgIH0sIHt9KTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZW5jb2RpbmdzLnJlZHVjZShmdW5jdGlvbihsaXN0LCBlbmNvZGluZykge1xuICAgICAgcmV0dXJuIGdlblNwZWNzRnJvbUVuY29kaW5ncyhsaXN0LCBlbmNvZGluZywgc3RhdHMsIG9wdCk7XG4gICAgfSwgW10pO1xuICB9XG59XG5cbmZ1bmN0aW9uIGdlblNwZWNzRnJvbUVuY29kaW5ncyhvdXRwdXQsIGVuY29kaW5nLCBzdGF0cywgb3B0KSB7XG4gIGdldE1hcmtzKGVuY29kaW5nLCBzdGF0cywgb3B0KVxuICAgIC5mb3JFYWNoKGZ1bmN0aW9uKG1hcmspIHtcbiAgICAgIHZhciBzcGVjID0gdXRpbC5kdXBsaWNhdGUoe1xuICAgICAgICAgIC8vIENsb25lIGNvbmZpZyAmIGVuY29kaW5nIHRvIHVuaXF1ZSBvYmplY3RzXG4gICAgICAgICAgZW5jb2Rpbmc6IGVuY29kaW5nLFxuICAgICAgICAgIGNvbmZpZzogb3B0LmNvbmZpZ1xuICAgICAgICB9KTtcblxuICAgICAgc3BlYy5tYXJrID0gbWFyaztcbiAgICAgIC8vIERhdGEgb2JqZWN0IGlzIHRoZSBzYW1lIGFjcm9zcyBjaGFydHM6IHBhc3MgYnkgcmVmZXJlbmNlXG4gICAgICBzcGVjLmRhdGEgPSBvcHQuZGF0YTtcblxuICAgICAgc3BlYyA9IGZpbmFsVG91Y2goc3BlYywgc3RhdHMsIG9wdCk7XG4gICAgICB2YXIgc2NvcmUgPSByYW5rLmVuY29kaW5nKHNwZWMsIHN0YXRzLCBvcHQpO1xuXG4gICAgICBzcGVjLl9pbmZvID0gc2NvcmU7XG4gICAgICBvdXRwdXQucHVzaChzcGVjKTtcbiAgICB9KTtcbiAgcmV0dXJuIG91dHB1dDtcbn1cblxuLy9GSVhNRSB0aGlzIHNob3VsZCBiZSByZWZhY3RvcnNcbmZ1bmN0aW9uIGZpbmFsVG91Y2goc3BlYywgc3RhdHMsIG9wdCkge1xuICBpZiAoc3BlYy5tYXJrID09PSAndGV4dCcgJiYgb3B0LmFsd2F5c0dlbmVyYXRlVGFibGVBc0hlYXRtYXApIHtcbiAgICBzcGVjLmVuY29kaW5nLmNvbG9yID0gc3BlYy5lbmNvZGluZy50ZXh0O1xuICB9XG5cbiAgLy8gZG9uJ3QgaW5jbHVkZSB6ZXJvIGlmIHN0ZGV2L21lYW4gPCAwLjAxXG4gIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS91d2RhdGEvdmlzcmVjL2lzc3Vlcy82OVxuICB2YXIgZW5jb2RpbmcgPSBzcGVjLmVuY29kaW5nO1xuICBbJ3gnLCAneSddLmZvckVhY2goZnVuY3Rpb24oY2hhbm5lbCkge1xuICAgIHZhciBmaWVsZERlZiA9IGVuY29kaW5nW2NoYW5uZWxdO1xuXG4gICAgLy8gVE9ETyBhZGQgYSBwYXJhbWV0ZXIgZm9yIHRoaXMgY2FzZVxuICAgIGlmIChmaWVsZERlZiAmJiB2bEZpZWxkRGVmLmlzTWVhc3VyZShmaWVsZERlZikgJiYgIXZsRmllbGREZWYuaXNDb3VudChmaWVsZERlZikpIHtcbiAgICAgIHZhciBzdGF0ID0gc3RhdHNbZmllbGREZWYuZmllbGRdO1xuICAgICAgaWYgKHN0YXQgJiYgc3RhdC5zdGRldiAvIHN0YXQubWVhbiA8IDAuMDEpIHtcbiAgICAgICAgZmllbGREZWYuc2NhbGUgPSB7emVybzogZmFsc2V9O1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG4gIHJldHVybiBzcGVjO1xufVxuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gIGVuY29kaW5nOiByZXF1aXJlKCcuL3JhbmtFbmNvZGluZ3MnKVxufTtcblxuXG4iLCIvLyBGSVhNRTogcmVuYW1lIHRvIHJhbmtTcGVjc1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciB2bEVuY29kaW5nID0gcmVxdWlyZSgndmVnYS1saXRlL3NyYy9lbmNvZGluZycpLFxuICB2bEZpZWxkRGVmID0gcmVxdWlyZSgndmVnYS1saXRlL3NyYy9maWVsZGRlZicpLFxuICB2bENoYW5uZWwgPSByZXF1aXJlKCd2ZWdhLWxpdGUvc3JjL2NoYW5uZWwnKSxcbiAgaXNEaW1lbnNpb24gPSB2bEZpZWxkRGVmLmlzRGltZW5zaW9uLFxuICB1dGlsID0gcmVxdWlyZSgnLi4vdXRpbCcpO1xuXG52YXIgdmxTaG9ydGhhbmQgPSByZXF1aXJlKCd2ZWdhLWxpdGUvc3JjL3Nob3J0aGFuZCcpO1xuXG52YXIgY29uc3RzID0gcmVxdWlyZSgnLi4vY29uc3RzJyk7XG52YXIgVHlwZSA9IGNvbnN0cy5UeXBlO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHJhbmtFbmNvZGluZ3M7XG5cbi8vIGJhZCBzY29yZSBub3Qgc3BlY2lmaWVkIGluIHRoZSB0YWJsZSBhYm92ZVxudmFyIFVOVVNFRF9QT1NJVElPTiA9IDAuNTtcblxudmFyIE1BUktfU0NPUkUgPSB7XG4gIGxpbmU6IDAuOTksXG4gIGFyZWE6IDAuOTgsXG4gIGJhcjogMC45NyxcbiAgdGljazogMC45NixcbiAgcG9pbnQ6IDAuOTUsXG4gIGNpcmNsZTogMC45NCxcbiAgc3F1YXJlOiAwLjk0LFxuICB0ZXh0OiAwLjhcbn07XG5cbmZ1bmN0aW9uIHJhbmtFbmNvZGluZ3Moc3BlYywgc3RhdHMsIG9wdCwgc2VsZWN0ZWQpIHtcbiAgdmFyIGZlYXR1cmVzID0gW10sXG4gICAgY2hhbm5lbHMgPSB1dGlsLmtleXMoc3BlYy5lbmNvZGluZyksXG4gICAgbWFyayA9IHNwZWMubWFyayxcbiAgICBlbmNvZGluZyA9IHNwZWMuZW5jb2Rpbmc7XG5cbiAgdmFyIGVuY29kaW5nTWFwcGluZ0J5RmllbGQgPSB2bEVuY29kaW5nLnJlZHVjZShzcGVjLmVuY29kaW5nLCBmdW5jdGlvbihvLCBmaWVsZERlZiwgY2hhbm5lbCkge1xuICAgIHZhciBrZXkgPSB2bFNob3J0aGFuZC5zaG9ydGVuRmllbGREZWYoZmllbGREZWYpO1xuICAgIHZhciBtYXBwaW5ncyA9IG9ba2V5XSA9IG9ba2V5XSB8fCBbXTtcbiAgICBtYXBwaW5ncy5wdXNoKHtjaGFubmVsOiBjaGFubmVsLCBmaWVsZERlZjogZmllbGREZWZ9KTtcbiAgICByZXR1cm4gbztcbiAgfSwge30pO1xuXG4gIC8vIGRhdGEgLSBlbmNvZGluZyBtYXBwaW5nIHNjb3JlXG4gIHV0aWwuZm9yRWFjaChlbmNvZGluZ01hcHBpbmdCeUZpZWxkLCBmdW5jdGlvbihtYXBwaW5ncykge1xuICAgIHZhciByZWFzb25zID0gbWFwcGluZ3MubWFwKGZ1bmN0aW9uKG0pIHtcbiAgICAgICAgcmV0dXJuIG0uY2hhbm5lbCArIHZsU2hvcnRoYW5kLkFzc2lnbiArIHZsU2hvcnRoYW5kLnNob3J0ZW5GaWVsZERlZihtLmZpZWxkRGVmKSArXG4gICAgICAgICAgJyAnICsgKHNlbGVjdGVkICYmIHNlbGVjdGVkW20uZmllbGREZWYuZmllbGRdID8gJ1t4XScgOiAnWyBdJyk7XG4gICAgICB9KSxcbiAgICAgIHNjb3JlcyA9IG1hcHBpbmdzLm1hcChmdW5jdGlvbihtKSB7XG4gICAgICAgIHZhciByb2xlID0gdmxGaWVsZERlZi5pc0RpbWVuc2lvbihtLmZpZWxkRGVmKSA/ICdkaW1lbnNpb24nIDogJ21lYXN1cmUnO1xuXG4gICAgICAgIHZhciBzY29yZSA9IHJhbmtFbmNvZGluZ3Muc2NvcmVbcm9sZV0obS5maWVsZERlZiwgbS5jaGFubmVsLCBzcGVjLm1hcmssIHN0YXRzLCBvcHQpO1xuXG4gICAgICAgIHJldHVybiAhc2VsZWN0ZWQgfHwgc2VsZWN0ZWRbbS5maWVsZERlZi5maWVsZF0gPyBzY29yZSA6IE1hdGgucG93KHNjb3JlLCAwLjEyNSk7XG4gICAgICB9KTtcblxuICAgIGZlYXR1cmVzLnB1c2goe1xuICAgICAgcmVhc29uOiByZWFzb25zLmpvaW4oXCIgfCBcIiksXG4gICAgICBzY29yZTogTWF0aC5tYXguYXBwbHkobnVsbCwgc2NvcmVzKVxuICAgIH0pO1xuICB9KTtcblxuICAvLyBwbG90IHR5cGVcbiAgaWYgKG1hcmsgPT09ICd0ZXh0Jykge1xuICAgIC8vIFRPRE9cbiAgfSBlbHNlIHtcbiAgICBpZiAoZW5jb2RpbmcueCAmJiBlbmNvZGluZy55KSB7XG4gICAgICBpZiAoaXNEaW1lbnNpb24oZW5jb2RpbmcueCkgXiBpc0RpbWVuc2lvbihlbmNvZGluZy55KSkge1xuICAgICAgICBmZWF0dXJlcy5wdXNoKHtcbiAgICAgICAgICByZWFzb246ICdPeFEgcGxvdCcsXG4gICAgICAgICAgc2NvcmU6IDAuOFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBwZW5hbGl6ZSBub3QgdXNpbmcgcG9zaXRpb25hbCBvbmx5IHBlbmFsaXplIGZvciBub24tdGV4dFxuICBpZiAoY2hhbm5lbHMubGVuZ3RoID4gMSAmJiBtYXJrICE9PSAndGV4dCcpIHtcbiAgICBpZiAoKCFlbmNvZGluZy54IHx8ICFlbmNvZGluZy55KSAmJiAhZW5jb2RpbmcuZ2VvICYmICFlbmNvZGluZy50ZXh0KSB7XG4gICAgICBmZWF0dXJlcy5wdXNoKHtcbiAgICAgICAgcmVhc29uOiAndW51c2VkIHBvc2l0aW9uJyxcbiAgICAgICAgc2NvcmU6IFVOVVNFRF9QT1NJVElPTlxuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgLy8gbWFyayB0eXBlIHNjb3JlXG4gIGZlYXR1cmVzLnB1c2goe1xuICAgIHJlYXNvbjogJ21hcms9JyttYXJrLFxuICAgIHNjb3JlOiBNQVJLX1NDT1JFW21hcmtdXG4gIH0pO1xuXG4gIHJldHVybiB7XG4gICAgc2NvcmU6IGZlYXR1cmVzLnJlZHVjZShmdW5jdGlvbihwLCBmKSB7XG4gICAgICByZXR1cm4gcCAqIGYuc2NvcmU7XG4gICAgfSwgMSksXG4gICAgZmVhdHVyZXM6IGZlYXR1cmVzXG4gIH07XG59XG5cblxudmFyIEQgPSB7fSwgTSA9IHt9LCBCQUQgPSAwLjEsIFRFUlJJQkxFID0gMC4wMTtcblxuRC5taW5vciA9IDAuMDE7XG5ELnBvcyA9IDE7XG5ELllfVCA9IDAuODtcbkQuZmFjZXRfdGV4dCA9IDE7XG5ELmZhY2V0X2dvb2QgPSAwLjY3NTsgLy8gPCBjb2xvcl9vaywgPiBjb2xvcl9iYWRcbkQuZmFjZXRfb2sgPSAwLjU1O1xuRC5mYWNldF9iYWQgPSAwLjQ7XG5ELmNvbG9yX2dvb2QgPSAwLjc7XG5ELmNvbG9yX29rID0gMC42NTsgLy8gPiBNLlNpemVcbkQuY29sb3JfYmFkID0gMC4zO1xuRC5jb2xvcl9zdGFjayA9IDAuNjtcbkQuc2hhcGUgPSAwLjY7XG5ELmRldGFpbCA9IDAuNTtcbkQuYmFkID0gQkFEO1xuRC50ZXJyaWJsZSA9IFRFUlJJQkxFO1xuXG5NLnBvcyA9IDE7XG5NLnNpemUgPSAwLjY7XG5NLmNvbG9yID0gMC41O1xuTS50ZXh0ID0gMC40O1xuTS5iYWQgPSBCQUQ7XG5NLnRlcnJpYmxlID0gVEVSUklCTEU7XG5cbnJhbmtFbmNvZGluZ3MuZGltZW5zaW9uU2NvcmUgPSBmdW5jdGlvbiAoZmllbGREZWYsIGNoYW5uZWwsIG1hcmssIHN0YXRzLCBvcHQpe1xuICB2YXIgY2FyZGluYWxpdHkgPSB2bEZpZWxkRGVmLmNhcmRpbmFsaXR5KGZpZWxkRGVmLCBzdGF0cyk7XG4gIHN3aXRjaCAoY2hhbm5lbCkge1xuICAgIGNhc2UgdmxDaGFubmVsLlg6XG4gICAgICBpZiAoZmllbGREZWYudHlwZSA9PT0gVHlwZS5Ob21pbmFsIHx8IGZpZWxkRGVmLnR5cGUgPT09IFR5cGUuT3JkaW5hbCkgIHtcbiAgICAgICAgcmV0dXJuIEQucG9zIC0gRC5taW5vcjtcbiAgICAgIH1cbiAgICAgIHJldHVybiBELnBvcztcblxuICAgIGNhc2UgdmxDaGFubmVsLlk6XG4gICAgICBpZiAoZmllbGREZWYudHlwZSA9PT0gVHlwZS5Ob21pbmFsIHx8IGZpZWxkRGVmLnR5cGUgPT09IFR5cGUuT3JkaW5hbCkge1xuICAgICAgICByZXR1cm4gRC5wb3MgLSBELm1pbm9yOyAvL3ByZWZlciBvcmRpbmFsIG9uIHlcbiAgICAgIH1cbiAgICAgIGlmIChmaWVsZERlZi50eXBlID09PSBUeXBlLlRlbXBvcmFsKSB7XG4gICAgICAgIHJldHVybiBELllfVDsgLy8gdGltZSBzaG91bGQgbm90IGJlIG9uIFlcbiAgICAgIH1cbiAgICAgIHJldHVybiBELnBvcyAtIEQubWlub3I7XG5cbiAgICBjYXNlIHZsQ2hhbm5lbC5DT0w6XG4gICAgICBpZiAobWFyayA9PT0gJ3RleHQnKSByZXR1cm4gRC5mYWNldF90ZXh0O1xuICAgICAgLy9wcmVmZXIgY29sdW1uIG92ZXIgcm93IGR1ZSB0byBzY3JvbGxpbmcgaXNzdWVzXG4gICAgICByZXR1cm4gY2FyZGluYWxpdHkgPD0gb3B0Lm1heEdvb2RDYXJkaW5hbGl0eUZvckZhY2V0cyA/IEQuZmFjZXRfZ29vZCA6XG4gICAgICAgIGNhcmRpbmFsaXR5IDw9IG9wdC5tYXhDYXJkaW5hbGl0eUZvckZhY2V0cyA/IEQuZmFjZXRfb2sgOiBELmZhY2V0X2JhZDtcblxuICAgIGNhc2UgdmxDaGFubmVsLlJPVzpcbiAgICAgIGlmIChtYXJrID09PSAndGV4dCcpIHJldHVybiBELmZhY2V0X3RleHQ7XG4gICAgICByZXR1cm4gKGNhcmRpbmFsaXR5IDw9IG9wdC5tYXhHb29kQ2FyZGluYWxpdHlGb3JGYWNldHMgPyBELmZhY2V0X2dvb2QgOlxuICAgICAgICBjYXJkaW5hbGl0eSA8PSBvcHQubWF4Q2FyZGluYWxpdHlGb3JGYWNldHMgPyBELmZhY2V0X29rIDogRC5mYWNldF9iYWQpIC0gRC5taW5vcjtcblxuICAgIGNhc2UgdmxDaGFubmVsLkNPTE9SOlxuICAgICAgdmFyIGhhc09yZGVyID0gKGZpZWxkRGVmLmJpbiAmJiBmaWVsZERlZi50eXBlPT09IFR5cGUuUXVhbnRpdGF0aXZlKSB8fCAoZmllbGREZWYudGltZVVuaXQgJiYgZmllbGREZWYudHlwZT09PSBUeXBlLlRlbXBvcmFsKTtcblxuICAgICAgLy9GSVhNRSBhZGQgc3RhY2tpbmcgb3B0aW9uIG9uY2Ugd2UgaGF2ZSBjb250cm9sIC4uXG4gICAgICB2YXIgaXNTdGFja2VkID0gbWFyayA9PT0gJ2JhcicgfHwgbWFyayA9PT0gJ2FyZWEnO1xuXG4gICAgICAvLyB0cnVlIG9yZGluYWwgb24gY29sb3IgaXMgY3VycmVudGx5IEJBRCAodW50aWwgd2UgaGF2ZSBnb29kIG9yZGluYWwgY29sb3Igc2NhbGUgc3VwcG9ydClcbiAgICAgIGlmIChoYXNPcmRlcikgcmV0dXJuIEQuY29sb3JfYmFkO1xuXG4gICAgICAvL3N0YWNraW5nIGdldHMgbG93ZXIgc2NvcmVcbiAgICAgIGlmIChpc1N0YWNrZWQpIHJldHVybiBELmNvbG9yX3N0YWNrO1xuXG4gICAgICByZXR1cm4gY2FyZGluYWxpdHkgPD0gb3B0Lm1heEdvb2RDYXJkaW5hbGl0eUZvckNvbG9yID8gRC5jb2xvcl9nb29kOiBjYXJkaW5hbGl0eSA8PSBvcHQubWF4Q2FyZGluYWxpdHlGb3JDb2xvciA/IEQuY29sb3Jfb2sgOiBELmNvbG9yX2JhZDtcbiAgICBjYXNlIHZsQ2hhbm5lbC5TSEFQRTpcbiAgICAgIHJldHVybiBjYXJkaW5hbGl0eSA8PSBvcHQubWF4Q2FyZGluYWxpdHlGb3JTaGFwZSA/IEQuc2hhcGUgOiBURVJSSUJMRTtcbiAgICBjYXNlIHZsQ2hhbm5lbC5ERVRBSUw6XG4gICAgICByZXR1cm4gRC5kZXRhaWw7XG4gIH1cbiAgcmV0dXJuIFRFUlJJQkxFO1xufTtcblxucmFua0VuY29kaW5ncy5kaW1lbnNpb25TY29yZS5jb25zdHMgPSBEO1xuXG5yYW5rRW5jb2RpbmdzLm1lYXN1cmVTY29yZSA9IGZ1bmN0aW9uIChmaWVsZERlZiwgY2hhbm5lbCwgbWFyaywgc3RhdHMsIG9wdCkge1xuICAvLyBqc2hpbnQgdW51c2VkOmZhbHNlXG4gIHN3aXRjaCAoY2hhbm5lbCl7XG4gICAgY2FzZSB2bENoYW5uZWwuWDogcmV0dXJuIE0ucG9zO1xuICAgIGNhc2UgdmxDaGFubmVsLlk6IHJldHVybiBNLnBvcztcbiAgICBjYXNlIHZsQ2hhbm5lbC5TSVpFOlxuICAgICAgaWYgKG1hcmsgPT09ICdiYXInKSByZXR1cm4gQkFEOyAvL3NpemUgb2YgYmFyIGlzIHZlcnkgYmFkXG4gICAgICBpZiAobWFyayA9PT0gJ3RleHQnKSByZXR1cm4gQkFEO1xuICAgICAgaWYgKG1hcmsgPT09ICdsaW5lJykgcmV0dXJuIEJBRDtcbiAgICAgIHJldHVybiBNLnNpemU7XG4gICAgY2FzZSB2bENoYW5uZWwuQ09MT1I6IHJldHVybiBNLmNvbG9yO1xuICAgIGNhc2UgdmxDaGFubmVsLlRFWFQ6IHJldHVybiBNLnRleHQ7XG4gIH1cbiAgcmV0dXJuIEJBRDtcbn07XG5cbnJhbmtFbmNvZGluZ3MubWVhc3VyZVNjb3JlLmNvbnN0cyA9IE07XG5cblxucmFua0VuY29kaW5ncy5zY29yZSA9IHtcbiAgZGltZW5zaW9uOiByYW5rRW5jb2RpbmdzLmRpbWVuc2lvblNjb3JlLFxuICBtZWFzdXJlOiByYW5rRW5jb2RpbmdzLm1lYXN1cmVTY29yZSxcbn07XG4iLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIGNvbnN0cyA9IHJlcXVpcmUoJy4vY29uc3RzJyk7XG5cbnZhciB1dGlsID0gbW9kdWxlLmV4cG9ydHMgPSB7XG4gIGdlbjoge31cbn07XG5cbi8vIEZJWE1FOiByZW1vdmUgcmVkdW5kYW50IG1ldGhvZHNcblxudXRpbC5pc0FycmF5ID0gQXJyYXkuaXNBcnJheSB8fCBmdW5jdGlvbiAob2JqKSB7XG4gIHJldHVybiB7fS50b1N0cmluZy5jYWxsKG9iaikgPT0gJ1tvYmplY3QgQXJyYXldJztcbn07XG5cbnV0aWwuaXNpbiA9IGZ1bmN0aW9uIChpdGVtLCBhcnJheSkge1xuICAgIHJldHVybiBhcnJheS5pbmRleE9mKGl0ZW0pICE9PSAtMTtcbn07XG5cbnV0aWwuanNvbiA9IGZ1bmN0aW9uKHMsIHNwKSB7XG4gIHJldHVybiBKU09OLnN0cmluZ2lmeShzLCBudWxsLCBzcCk7XG59O1xuXG51dGlsLmtleXMgPSBmdW5jdGlvbihvYmopIHtcbiAgdmFyIGsgPSBbXSwgeDtcbiAgZm9yICh4IGluIG9iaikgay5wdXNoKHgpO1xuICByZXR1cm4gaztcbn07XG5cbnV0aWwuZHVwbGljYXRlID0gZnVuY3Rpb24ob2JqKSB7XG4gIHJldHVybiBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KG9iaikpO1xufTtcblxudXRpbC5mb3JFYWNoID0gZnVuY3Rpb24ob2JqLCBmLCB0aGlzQXJnKSB7XG4gIGlmIChvYmouZm9yRWFjaCkge1xuICAgIG9iai5mb3JFYWNoLmNhbGwodGhpc0FyZywgZik7XG4gIH1cbiAgZWxzZSB7XG4gICAgZm9yICh2YXIgayBpbiBvYmopIHtcbiAgICAgIGYuY2FsbCh0aGlzQXJnLCBvYmpba10sIGssIG9iaik7XG4gICAgfVxuICB9XG59O1xuXG51dGlsLmFueSA9IGZ1bmN0aW9uIChhcnIsIGYpIHtcbiAgICB2YXIgaSA9IDAsIGs7XG4gICAgZm9yIChrIGluIGFycikge1xuICAgICAgICBpZiAoZihhcnJba10sIGssIGkrKykpXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xufTtcblxudXRpbC5uZXN0ZWRNYXAgPSBmdW5jdGlvbiAoY29sbGVjdGlvbiwgZiwgbGV2ZWwsIGZpbHRlcikge1xuICByZXR1cm4gbGV2ZWwgPT09IDAgP1xuICAgIGNvbGxlY3Rpb24ubWFwKGYpIDpcbiAgICBjb2xsZWN0aW9uLm1hcChmdW5jdGlvbih2KSB7XG4gICAgICB2YXIgciA9IHV0aWwubmVzdGVkTWFwKHYsIGYsIGxldmVsIC0gMSk7XG4gICAgICByZXR1cm4gZmlsdGVyID8gci5maWx0ZXIodXRpbC5ub25FbXB0eSkgOiByO1xuICAgIH0pO1xufTtcblxudXRpbC5uZXN0ZWRSZWR1Y2UgPSBmdW5jdGlvbiAoY29sbGVjdGlvbiwgZiwgbGV2ZWwsIGZpbHRlcikge1xuICByZXR1cm4gbGV2ZWwgPT09IDAgP1xuICAgIGNvbGxlY3Rpb24ucmVkdWNlKGYsIFtdKSA6XG4gICAgY29sbGVjdGlvbi5tYXAoZnVuY3Rpb24odikge1xuICAgICAgdmFyIHIgPSB1dGlsLm5lc3RlZFJlZHVjZSh2LCBmLCBsZXZlbCAtIDEpO1xuICAgICAgcmV0dXJuIGZpbHRlciA/IHIuZmlsdGVyKHV0aWwubm9uRW1wdHkpIDogcjtcbiAgICB9KTtcbn07XG5cbnV0aWwubm9uRW1wdHkgPSBmdW5jdGlvbihncnApIHtcbiAgcmV0dXJuICF1dGlsLmlzQXJyYXkoZ3JwKSB8fCBncnAubGVuZ3RoID4gMDtcbn07XG5cblxudXRpbC50cmF2ZXJzZSA9IGZ1bmN0aW9uIChub2RlLCBhcnIpIHtcbiAgaWYgKG5vZGUudmFsdWUgIT09IHVuZGVmaW5lZCkge1xuICAgIGFyci5wdXNoKG5vZGUudmFsdWUpO1xuICB9IGVsc2Uge1xuICAgIGlmIChub2RlLmxlZnQpIHV0aWwudHJhdmVyc2Uobm9kZS5sZWZ0LCBhcnIpO1xuICAgIGlmIChub2RlLnJpZ2h0KSB1dGlsLnRyYXZlcnNlKG5vZGUucmlnaHQsIGFycik7XG4gIH1cbiAgcmV0dXJuIGFycjtcbn07XG5cbnV0aWwudW5pb24gPSBmdW5jdGlvbiAoYSwgYikge1xuICB2YXIgbyA9IHt9O1xuICBhLmZvckVhY2goZnVuY3Rpb24oeCkgeyBvW3hdID0gdHJ1ZTt9KTtcbiAgYi5mb3JFYWNoKGZ1bmN0aW9uKHgpIHsgb1t4XSA9IHRydWU7fSk7XG4gIHJldHVybiB1dGlsLmtleXMobyk7XG59O1xuXG5cbnV0aWwuZ2VuLmdldE9wdCA9IGZ1bmN0aW9uIChvcHQpIHtcbiAgLy9tZXJnZSB3aXRoIGRlZmF1bHRcbiAgcmV0dXJuIChvcHQgPyB1dGlsLmtleXMob3B0KSA6IFtdKS5yZWR1Y2UoZnVuY3Rpb24oYywgaykge1xuICAgIGNba10gPSBvcHRba107XG4gICAgcmV0dXJuIGM7XG4gIH0sIE9iamVjdC5jcmVhdGUoY29uc3RzLmdlbi5ERUZBVUxUX09QVCkpO1xufTtcblxuLyoqXG4gKiBwb3dlcnNldCBjb2RlIGZyb20gaHR0cDovL3Jvc2V0dGFjb2RlLm9yZy93aWtpL1Bvd2VyX1NldCNKYXZhU2NyaXB0XG4gKlxuICogICB2YXIgcmVzID0gcG93ZXJzZXQoWzEsMiwzLDRdKTtcbiAqXG4gKiByZXR1cm5zXG4gKlxuICogW1tdLFsxXSxbMl0sWzEsMl0sWzNdLFsxLDNdLFsyLDNdLFsxLDIsM10sWzRdLFsxLDRdLFxuICogWzIsNF0sWzEsMiw0XSxbMyw0XSxbMSwzLDRdLFsyLDMsNF0sWzEsMiwzLDRdXVxuW2VkaXRdXG4qL1xuXG51dGlsLnBvd2Vyc2V0ID0gZnVuY3Rpb24obGlzdCkge1xuICB2YXIgcHMgPSBbXG4gICAgW11cbiAgXTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgZm9yICh2YXIgaiA9IDAsIGxlbiA9IHBzLmxlbmd0aDsgaiA8IGxlbjsgaisrKSB7XG4gICAgICBwcy5wdXNoKHBzW2pdLmNvbmNhdChsaXN0W2ldKSk7XG4gICAgfVxuICB9XG4gIHJldHVybiBwcztcbn07XG5cbnV0aWwuY2hvb3NlS29yTGVzcyA9IGZ1bmN0aW9uKGxpc3QsIGspIHtcbiAgdmFyIHN1YnNldCA9IFtbXV07XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7IGkrKykge1xuICAgIGZvciAodmFyIGogPSAwLCBsZW4gPSBzdWJzZXQubGVuZ3RoOyBqIDwgbGVuOyBqKyspIHtcbiAgICAgIHZhciBzdWIgPSBzdWJzZXRbal0uY29uY2F0KGxpc3RbaV0pO1xuICAgICAgaWYoc3ViLmxlbmd0aCA8PSBrKXtcbiAgICAgICAgc3Vic2V0LnB1c2goc3ViKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIHN1YnNldDtcbn07XG5cbnV0aWwuY2hvb3NlSyA9IGZ1bmN0aW9uKGxpc3QsIGspIHtcbiAgdmFyIHN1YnNldCA9IFtbXV07XG4gIHZhciBrQXJyYXkgPVtdO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGxpc3QubGVuZ3RoOyBpKyspIHtcbiAgICBmb3IgKHZhciBqID0gMCwgbGVuID0gc3Vic2V0Lmxlbmd0aDsgaiA8IGxlbjsgaisrKSB7XG4gICAgICB2YXIgc3ViID0gc3Vic2V0W2pdLmNvbmNhdChsaXN0W2ldKTtcbiAgICAgIGlmKHN1Yi5sZW5ndGggPCBrKXtcbiAgICAgICAgc3Vic2V0LnB1c2goc3ViKTtcbiAgICAgIH1lbHNlIGlmIChzdWIubGVuZ3RoID09PSBrKXtcbiAgICAgICAga0FycmF5LnB1c2goc3ViKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIGtBcnJheTtcbn07XG5cbnV0aWwuY3Jvc3MgPSBmdW5jdGlvbihhLGIpe1xuICB2YXIgeCA9IFtdO1xuICBmb3IodmFyIGk9MDsgaTwgYS5sZW5ndGg7IGkrKyl7XG4gICAgZm9yKHZhciBqPTA7ajwgYi5sZW5ndGg7IGorKyl7XG4gICAgICB4LnB1c2goYVtpXS5jb25jYXQoYltqXSkpO1xuICAgIH1cbiAgfVxuICByZXR1cm4geDtcbn07XG5cbiIsIihmdW5jdGlvbiAoZ2xvYmFsLCBmYWN0b3J5KSB7XG4gIHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyA/IGZhY3RvcnkoZXhwb3J0cykgOlxuICB0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQgPyBkZWZpbmUoJ2QzLXRpbWUnLCBbJ2V4cG9ydHMnXSwgZmFjdG9yeSkgOlxuICBmYWN0b3J5KChnbG9iYWwuZDNfdGltZSA9IHt9KSk7XG59KHRoaXMsIGZ1bmN0aW9uIChleHBvcnRzKSB7ICd1c2Ugc3RyaWN0JztcblxuICB2YXIgdDAgPSBuZXcgRGF0ZTtcbiAgdmFyIHQxID0gbmV3IERhdGU7XG4gIGZ1bmN0aW9uIG5ld0ludGVydmFsKGZsb29yaSwgb2Zmc2V0aSwgY291bnQsIGZpZWxkKSB7XG5cbiAgICBmdW5jdGlvbiBpbnRlcnZhbChkYXRlKSB7XG4gICAgICByZXR1cm4gZmxvb3JpKGRhdGUgPSBuZXcgRGF0ZSgrZGF0ZSkpLCBkYXRlO1xuICAgIH1cblxuICAgIGludGVydmFsLmZsb29yID0gaW50ZXJ2YWw7XG5cbiAgICBpbnRlcnZhbC5yb3VuZCA9IGZ1bmN0aW9uKGRhdGUpIHtcbiAgICAgIHZhciBkMCA9IG5ldyBEYXRlKCtkYXRlKSxcbiAgICAgICAgICBkMSA9IG5ldyBEYXRlKGRhdGUgLSAxKTtcbiAgICAgIGZsb29yaShkMCksIGZsb29yaShkMSksIG9mZnNldGkoZDEsIDEpO1xuICAgICAgcmV0dXJuIGRhdGUgLSBkMCA8IGQxIC0gZGF0ZSA/IGQwIDogZDE7XG4gICAgfTtcblxuICAgIGludGVydmFsLmNlaWwgPSBmdW5jdGlvbihkYXRlKSB7XG4gICAgICByZXR1cm4gZmxvb3JpKGRhdGUgPSBuZXcgRGF0ZShkYXRlIC0gMSkpLCBvZmZzZXRpKGRhdGUsIDEpLCBkYXRlO1xuICAgIH07XG5cbiAgICBpbnRlcnZhbC5vZmZzZXQgPSBmdW5jdGlvbihkYXRlLCBzdGVwKSB7XG4gICAgICByZXR1cm4gb2Zmc2V0aShkYXRlID0gbmV3IERhdGUoK2RhdGUpLCBzdGVwID09IG51bGwgPyAxIDogTWF0aC5mbG9vcihzdGVwKSksIGRhdGU7XG4gICAgfTtcblxuICAgIGludGVydmFsLnJhbmdlID0gZnVuY3Rpb24oc3RhcnQsIHN0b3AsIHN0ZXApIHtcbiAgICAgIHZhciByYW5nZSA9IFtdO1xuICAgICAgc3RhcnQgPSBuZXcgRGF0ZShzdGFydCAtIDEpO1xuICAgICAgc3RvcCA9IG5ldyBEYXRlKCtzdG9wKTtcbiAgICAgIHN0ZXAgPSBzdGVwID09IG51bGwgPyAxIDogTWF0aC5mbG9vcihzdGVwKTtcbiAgICAgIGlmICghKHN0YXJ0IDwgc3RvcCkgfHwgIShzdGVwID4gMCkpIHJldHVybiByYW5nZTsgLy8gYWxzbyBoYW5kbGVzIEludmFsaWQgRGF0ZVxuICAgICAgb2Zmc2V0aShzdGFydCwgMSksIGZsb29yaShzdGFydCk7XG4gICAgICBpZiAoc3RhcnQgPCBzdG9wKSByYW5nZS5wdXNoKG5ldyBEYXRlKCtzdGFydCkpO1xuICAgICAgd2hpbGUgKG9mZnNldGkoc3RhcnQsIHN0ZXApLCBmbG9vcmkoc3RhcnQpLCBzdGFydCA8IHN0b3ApIHJhbmdlLnB1c2gobmV3IERhdGUoK3N0YXJ0KSk7XG4gICAgICByZXR1cm4gcmFuZ2U7XG4gICAgfTtcblxuICAgIGludGVydmFsLmZpbHRlciA9IGZ1bmN0aW9uKHRlc3QpIHtcbiAgICAgIHJldHVybiBuZXdJbnRlcnZhbChmdW5jdGlvbihkYXRlKSB7XG4gICAgICAgIHdoaWxlIChmbG9vcmkoZGF0ZSksICF0ZXN0KGRhdGUpKSBkYXRlLnNldFRpbWUoZGF0ZSAtIDEpO1xuICAgICAgfSwgZnVuY3Rpb24oZGF0ZSwgc3RlcCkge1xuICAgICAgICB3aGlsZSAoLS1zdGVwID49IDApIHdoaWxlIChvZmZzZXRpKGRhdGUsIDEpLCAhdGVzdChkYXRlKSk7XG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgaWYgKGNvdW50KSB7XG4gICAgICBpbnRlcnZhbC5jb3VudCA9IGZ1bmN0aW9uKHN0YXJ0LCBlbmQpIHtcbiAgICAgICAgdDAuc2V0VGltZSgrc3RhcnQpLCB0MS5zZXRUaW1lKCtlbmQpO1xuICAgICAgICBmbG9vcmkodDApLCBmbG9vcmkodDEpO1xuICAgICAgICByZXR1cm4gTWF0aC5mbG9vcihjb3VudCh0MCwgdDEpKTtcbiAgICAgIH07XG5cbiAgICAgIGludGVydmFsLmV2ZXJ5ID0gZnVuY3Rpb24oc3RlcCkge1xuICAgICAgICBzdGVwID0gTWF0aC5mbG9vcihzdGVwKTtcbiAgICAgICAgcmV0dXJuICFpc0Zpbml0ZShzdGVwKSB8fCAhKHN0ZXAgPiAwKSA/IG51bGxcbiAgICAgICAgICAgIDogIShzdGVwID4gMSkgPyBpbnRlcnZhbFxuICAgICAgICAgICAgOiBpbnRlcnZhbC5maWx0ZXIoZmllbGRcbiAgICAgICAgICAgICAgICA/IGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGZpZWxkKGQpICUgc3RlcCA9PT0gMDsgfVxuICAgICAgICAgICAgICAgIDogZnVuY3Rpb24oZCkgeyByZXR1cm4gaW50ZXJ2YWwuY291bnQoMCwgZCkgJSBzdGVwID09PSAwOyB9KTtcbiAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIGludGVydmFsO1xuICB9O1xuXG4gIHZhciBtaWxsaXNlY29uZCA9IG5ld0ludGVydmFsKGZ1bmN0aW9uKCkge1xuICAgIC8vIG5vb3BcbiAgfSwgZnVuY3Rpb24oZGF0ZSwgc3RlcCkge1xuICAgIGRhdGUuc2V0VGltZSgrZGF0ZSArIHN0ZXApO1xuICB9LCBmdW5jdGlvbihzdGFydCwgZW5kKSB7XG4gICAgcmV0dXJuIGVuZCAtIHN0YXJ0O1xuICB9KTtcblxuICAvLyBBbiBvcHRpbWl6ZWQgaW1wbGVtZW50YXRpb24gZm9yIHRoaXMgc2ltcGxlIGNhc2UuXG4gIG1pbGxpc2Vjb25kLmV2ZXJ5ID0gZnVuY3Rpb24oaykge1xuICAgIGsgPSBNYXRoLmZsb29yKGspO1xuICAgIGlmICghaXNGaW5pdGUoaykgfHwgIShrID4gMCkpIHJldHVybiBudWxsO1xuICAgIGlmICghKGsgPiAxKSkgcmV0dXJuIG1pbGxpc2Vjb25kO1xuICAgIHJldHVybiBuZXdJbnRlcnZhbChmdW5jdGlvbihkYXRlKSB7XG4gICAgICBkYXRlLnNldFRpbWUoTWF0aC5mbG9vcihkYXRlIC8gaykgKiBrKTtcbiAgICB9LCBmdW5jdGlvbihkYXRlLCBzdGVwKSB7XG4gICAgICBkYXRlLnNldFRpbWUoK2RhdGUgKyBzdGVwICogayk7XG4gICAgfSwgZnVuY3Rpb24oc3RhcnQsIGVuZCkge1xuICAgICAgcmV0dXJuIChlbmQgLSBzdGFydCkgLyBrO1xuICAgIH0pO1xuICB9O1xuXG4gIHZhciBzZWNvbmQgPSBuZXdJbnRlcnZhbChmdW5jdGlvbihkYXRlKSB7XG4gICAgZGF0ZS5zZXRNaWxsaXNlY29uZHMoMCk7XG4gIH0sIGZ1bmN0aW9uKGRhdGUsIHN0ZXApIHtcbiAgICBkYXRlLnNldFRpbWUoK2RhdGUgKyBzdGVwICogMWUzKTtcbiAgfSwgZnVuY3Rpb24oc3RhcnQsIGVuZCkge1xuICAgIHJldHVybiAoZW5kIC0gc3RhcnQpIC8gMWUzO1xuICB9LCBmdW5jdGlvbihkYXRlKSB7XG4gICAgcmV0dXJuIGRhdGUuZ2V0U2Vjb25kcygpO1xuICB9KTtcblxuICB2YXIgbWludXRlID0gbmV3SW50ZXJ2YWwoZnVuY3Rpb24oZGF0ZSkge1xuICAgIGRhdGUuc2V0U2Vjb25kcygwLCAwKTtcbiAgfSwgZnVuY3Rpb24oZGF0ZSwgc3RlcCkge1xuICAgIGRhdGUuc2V0VGltZSgrZGF0ZSArIHN0ZXAgKiA2ZTQpO1xuICB9LCBmdW5jdGlvbihzdGFydCwgZW5kKSB7XG4gICAgcmV0dXJuIChlbmQgLSBzdGFydCkgLyA2ZTQ7XG4gIH0sIGZ1bmN0aW9uKGRhdGUpIHtcbiAgICByZXR1cm4gZGF0ZS5nZXRNaW51dGVzKCk7XG4gIH0pO1xuXG4gIHZhciBob3VyID0gbmV3SW50ZXJ2YWwoZnVuY3Rpb24oZGF0ZSkge1xuICAgIGRhdGUuc2V0TWludXRlcygwLCAwLCAwKTtcbiAgfSwgZnVuY3Rpb24oZGF0ZSwgc3RlcCkge1xuICAgIGRhdGUuc2V0VGltZSgrZGF0ZSArIHN0ZXAgKiAzNmU1KTtcbiAgfSwgZnVuY3Rpb24oc3RhcnQsIGVuZCkge1xuICAgIHJldHVybiAoZW5kIC0gc3RhcnQpIC8gMzZlNTtcbiAgfSwgZnVuY3Rpb24oZGF0ZSkge1xuICAgIHJldHVybiBkYXRlLmdldEhvdXJzKCk7XG4gIH0pO1xuXG4gIHZhciBkYXkgPSBuZXdJbnRlcnZhbChmdW5jdGlvbihkYXRlKSB7XG4gICAgZGF0ZS5zZXRIb3VycygwLCAwLCAwLCAwKTtcbiAgfSwgZnVuY3Rpb24oZGF0ZSwgc3RlcCkge1xuICAgIGRhdGUuc2V0RGF0ZShkYXRlLmdldERhdGUoKSArIHN0ZXApO1xuICB9LCBmdW5jdGlvbihzdGFydCwgZW5kKSB7XG4gICAgcmV0dXJuIChlbmQgLSBzdGFydCAtIChlbmQuZ2V0VGltZXpvbmVPZmZzZXQoKSAtIHN0YXJ0LmdldFRpbWV6b25lT2Zmc2V0KCkpICogNmU0KSAvIDg2NGU1O1xuICB9LCBmdW5jdGlvbihkYXRlKSB7XG4gICAgcmV0dXJuIGRhdGUuZ2V0RGF0ZSgpIC0gMTtcbiAgfSk7XG5cbiAgZnVuY3Rpb24gd2Vla2RheShpKSB7XG4gICAgcmV0dXJuIG5ld0ludGVydmFsKGZ1bmN0aW9uKGRhdGUpIHtcbiAgICAgIGRhdGUuc2V0SG91cnMoMCwgMCwgMCwgMCk7XG4gICAgICBkYXRlLnNldERhdGUoZGF0ZS5nZXREYXRlKCkgLSAoZGF0ZS5nZXREYXkoKSArIDcgLSBpKSAlIDcpO1xuICAgIH0sIGZ1bmN0aW9uKGRhdGUsIHN0ZXApIHtcbiAgICAgIGRhdGUuc2V0RGF0ZShkYXRlLmdldERhdGUoKSArIHN0ZXAgKiA3KTtcbiAgICB9LCBmdW5jdGlvbihzdGFydCwgZW5kKSB7XG4gICAgICByZXR1cm4gKGVuZCAtIHN0YXJ0IC0gKGVuZC5nZXRUaW1lem9uZU9mZnNldCgpIC0gc3RhcnQuZ2V0VGltZXpvbmVPZmZzZXQoKSkgKiA2ZTQpIC8gNjA0OGU1O1xuICAgIH0pO1xuICB9XG5cbiAgdmFyIHN1bmRheSA9IHdlZWtkYXkoMCk7XG4gIHZhciBtb25kYXkgPSB3ZWVrZGF5KDEpO1xuICB2YXIgdHVlc2RheSA9IHdlZWtkYXkoMik7XG4gIHZhciB3ZWRuZXNkYXkgPSB3ZWVrZGF5KDMpO1xuICB2YXIgdGh1cnNkYXkgPSB3ZWVrZGF5KDQpO1xuICB2YXIgZnJpZGF5ID0gd2Vla2RheSg1KTtcbiAgdmFyIHNhdHVyZGF5ID0gd2Vla2RheSg2KTtcblxuICB2YXIgbW9udGggPSBuZXdJbnRlcnZhbChmdW5jdGlvbihkYXRlKSB7XG4gICAgZGF0ZS5zZXRIb3VycygwLCAwLCAwLCAwKTtcbiAgICBkYXRlLnNldERhdGUoMSk7XG4gIH0sIGZ1bmN0aW9uKGRhdGUsIHN0ZXApIHtcbiAgICBkYXRlLnNldE1vbnRoKGRhdGUuZ2V0TW9udGgoKSArIHN0ZXApO1xuICB9LCBmdW5jdGlvbihzdGFydCwgZW5kKSB7XG4gICAgcmV0dXJuIGVuZC5nZXRNb250aCgpIC0gc3RhcnQuZ2V0TW9udGgoKSArIChlbmQuZ2V0RnVsbFllYXIoKSAtIHN0YXJ0LmdldEZ1bGxZZWFyKCkpICogMTI7XG4gIH0sIGZ1bmN0aW9uKGRhdGUpIHtcbiAgICByZXR1cm4gZGF0ZS5nZXRNb250aCgpO1xuICB9KTtcblxuICB2YXIgeWVhciA9IG5ld0ludGVydmFsKGZ1bmN0aW9uKGRhdGUpIHtcbiAgICBkYXRlLnNldEhvdXJzKDAsIDAsIDAsIDApO1xuICAgIGRhdGUuc2V0TW9udGgoMCwgMSk7XG4gIH0sIGZ1bmN0aW9uKGRhdGUsIHN0ZXApIHtcbiAgICBkYXRlLnNldEZ1bGxZZWFyKGRhdGUuZ2V0RnVsbFllYXIoKSArIHN0ZXApO1xuICB9LCBmdW5jdGlvbihzdGFydCwgZW5kKSB7XG4gICAgcmV0dXJuIGVuZC5nZXRGdWxsWWVhcigpIC0gc3RhcnQuZ2V0RnVsbFllYXIoKTtcbiAgfSwgZnVuY3Rpb24oZGF0ZSkge1xuICAgIHJldHVybiBkYXRlLmdldEZ1bGxZZWFyKCk7XG4gIH0pO1xuXG4gIHZhciB1dGNTZWNvbmQgPSBuZXdJbnRlcnZhbChmdW5jdGlvbihkYXRlKSB7XG4gICAgZGF0ZS5zZXRVVENNaWxsaXNlY29uZHMoMCk7XG4gIH0sIGZ1bmN0aW9uKGRhdGUsIHN0ZXApIHtcbiAgICBkYXRlLnNldFRpbWUoK2RhdGUgKyBzdGVwICogMWUzKTtcbiAgfSwgZnVuY3Rpb24oc3RhcnQsIGVuZCkge1xuICAgIHJldHVybiAoZW5kIC0gc3RhcnQpIC8gMWUzO1xuICB9LCBmdW5jdGlvbihkYXRlKSB7XG4gICAgcmV0dXJuIGRhdGUuZ2V0VVRDU2Vjb25kcygpO1xuICB9KTtcblxuICB2YXIgdXRjTWludXRlID0gbmV3SW50ZXJ2YWwoZnVuY3Rpb24oZGF0ZSkge1xuICAgIGRhdGUuc2V0VVRDU2Vjb25kcygwLCAwKTtcbiAgfSwgZnVuY3Rpb24oZGF0ZSwgc3RlcCkge1xuICAgIGRhdGUuc2V0VGltZSgrZGF0ZSArIHN0ZXAgKiA2ZTQpO1xuICB9LCBmdW5jdGlvbihzdGFydCwgZW5kKSB7XG4gICAgcmV0dXJuIChlbmQgLSBzdGFydCkgLyA2ZTQ7XG4gIH0sIGZ1bmN0aW9uKGRhdGUpIHtcbiAgICByZXR1cm4gZGF0ZS5nZXRVVENNaW51dGVzKCk7XG4gIH0pO1xuXG4gIHZhciB1dGNIb3VyID0gbmV3SW50ZXJ2YWwoZnVuY3Rpb24oZGF0ZSkge1xuICAgIGRhdGUuc2V0VVRDTWludXRlcygwLCAwLCAwKTtcbiAgfSwgZnVuY3Rpb24oZGF0ZSwgc3RlcCkge1xuICAgIGRhdGUuc2V0VGltZSgrZGF0ZSArIHN0ZXAgKiAzNmU1KTtcbiAgfSwgZnVuY3Rpb24oc3RhcnQsIGVuZCkge1xuICAgIHJldHVybiAoZW5kIC0gc3RhcnQpIC8gMzZlNTtcbiAgfSwgZnVuY3Rpb24oZGF0ZSkge1xuICAgIHJldHVybiBkYXRlLmdldFVUQ0hvdXJzKCk7XG4gIH0pO1xuXG4gIHZhciB1dGNEYXkgPSBuZXdJbnRlcnZhbChmdW5jdGlvbihkYXRlKSB7XG4gICAgZGF0ZS5zZXRVVENIb3VycygwLCAwLCAwLCAwKTtcbiAgfSwgZnVuY3Rpb24oZGF0ZSwgc3RlcCkge1xuICAgIGRhdGUuc2V0VVRDRGF0ZShkYXRlLmdldFVUQ0RhdGUoKSArIHN0ZXApO1xuICB9LCBmdW5jdGlvbihzdGFydCwgZW5kKSB7XG4gICAgcmV0dXJuIChlbmQgLSBzdGFydCkgLyA4NjRlNTtcbiAgfSwgZnVuY3Rpb24oZGF0ZSkge1xuICAgIHJldHVybiBkYXRlLmdldFVUQ0RhdGUoKSAtIDE7XG4gIH0pO1xuXG4gIGZ1bmN0aW9uIHV0Y1dlZWtkYXkoaSkge1xuICAgIHJldHVybiBuZXdJbnRlcnZhbChmdW5jdGlvbihkYXRlKSB7XG4gICAgICBkYXRlLnNldFVUQ0hvdXJzKDAsIDAsIDAsIDApO1xuICAgICAgZGF0ZS5zZXRVVENEYXRlKGRhdGUuZ2V0VVRDRGF0ZSgpIC0gKGRhdGUuZ2V0VVRDRGF5KCkgKyA3IC0gaSkgJSA3KTtcbiAgICB9LCBmdW5jdGlvbihkYXRlLCBzdGVwKSB7XG4gICAgICBkYXRlLnNldFVUQ0RhdGUoZGF0ZS5nZXRVVENEYXRlKCkgKyBzdGVwICogNyk7XG4gICAgfSwgZnVuY3Rpb24oc3RhcnQsIGVuZCkge1xuICAgICAgcmV0dXJuIChlbmQgLSBzdGFydCkgLyA2MDQ4ZTU7XG4gICAgfSk7XG4gIH1cblxuICB2YXIgdXRjU3VuZGF5ID0gdXRjV2Vla2RheSgwKTtcbiAgdmFyIHV0Y01vbmRheSA9IHV0Y1dlZWtkYXkoMSk7XG4gIHZhciB1dGNUdWVzZGF5ID0gdXRjV2Vla2RheSgyKTtcbiAgdmFyIHV0Y1dlZG5lc2RheSA9IHV0Y1dlZWtkYXkoMyk7XG4gIHZhciB1dGNUaHVyc2RheSA9IHV0Y1dlZWtkYXkoNCk7XG4gIHZhciB1dGNGcmlkYXkgPSB1dGNXZWVrZGF5KDUpO1xuICB2YXIgdXRjU2F0dXJkYXkgPSB1dGNXZWVrZGF5KDYpO1xuXG4gIHZhciB1dGNNb250aCA9IG5ld0ludGVydmFsKGZ1bmN0aW9uKGRhdGUpIHtcbiAgICBkYXRlLnNldFVUQ0hvdXJzKDAsIDAsIDAsIDApO1xuICAgIGRhdGUuc2V0VVRDRGF0ZSgxKTtcbiAgfSwgZnVuY3Rpb24oZGF0ZSwgc3RlcCkge1xuICAgIGRhdGUuc2V0VVRDTW9udGgoZGF0ZS5nZXRVVENNb250aCgpICsgc3RlcCk7XG4gIH0sIGZ1bmN0aW9uKHN0YXJ0LCBlbmQpIHtcbiAgICByZXR1cm4gZW5kLmdldFVUQ01vbnRoKCkgLSBzdGFydC5nZXRVVENNb250aCgpICsgKGVuZC5nZXRVVENGdWxsWWVhcigpIC0gc3RhcnQuZ2V0VVRDRnVsbFllYXIoKSkgKiAxMjtcbiAgfSwgZnVuY3Rpb24oZGF0ZSkge1xuICAgIHJldHVybiBkYXRlLmdldFVUQ01vbnRoKCk7XG4gIH0pO1xuXG4gIHZhciB1dGNZZWFyID0gbmV3SW50ZXJ2YWwoZnVuY3Rpb24oZGF0ZSkge1xuICAgIGRhdGUuc2V0VVRDSG91cnMoMCwgMCwgMCwgMCk7XG4gICAgZGF0ZS5zZXRVVENNb250aCgwLCAxKTtcbiAgfSwgZnVuY3Rpb24oZGF0ZSwgc3RlcCkge1xuICAgIGRhdGUuc2V0VVRDRnVsbFllYXIoZGF0ZS5nZXRVVENGdWxsWWVhcigpICsgc3RlcCk7XG4gIH0sIGZ1bmN0aW9uKHN0YXJ0LCBlbmQpIHtcbiAgICByZXR1cm4gZW5kLmdldFVUQ0Z1bGxZZWFyKCkgLSBzdGFydC5nZXRVVENGdWxsWWVhcigpO1xuICB9LCBmdW5jdGlvbihkYXRlKSB7XG4gICAgcmV0dXJuIGRhdGUuZ2V0VVRDRnVsbFllYXIoKTtcbiAgfSk7XG5cbiAgdmFyIG1pbGxpc2Vjb25kcyA9IG1pbGxpc2Vjb25kLnJhbmdlO1xuICB2YXIgc2Vjb25kcyA9IHNlY29uZC5yYW5nZTtcbiAgdmFyIG1pbnV0ZXMgPSBtaW51dGUucmFuZ2U7XG4gIHZhciBob3VycyA9IGhvdXIucmFuZ2U7XG4gIHZhciBkYXlzID0gZGF5LnJhbmdlO1xuICB2YXIgc3VuZGF5cyA9IHN1bmRheS5yYW5nZTtcbiAgdmFyIG1vbmRheXMgPSBtb25kYXkucmFuZ2U7XG4gIHZhciB0dWVzZGF5cyA9IHR1ZXNkYXkucmFuZ2U7XG4gIHZhciB3ZWRuZXNkYXlzID0gd2VkbmVzZGF5LnJhbmdlO1xuICB2YXIgdGh1cnNkYXlzID0gdGh1cnNkYXkucmFuZ2U7XG4gIHZhciBmcmlkYXlzID0gZnJpZGF5LnJhbmdlO1xuICB2YXIgc2F0dXJkYXlzID0gc2F0dXJkYXkucmFuZ2U7XG4gIHZhciB3ZWVrcyA9IHN1bmRheS5yYW5nZTtcbiAgdmFyIG1vbnRocyA9IG1vbnRoLnJhbmdlO1xuICB2YXIgeWVhcnMgPSB5ZWFyLnJhbmdlO1xuXG4gIHZhciB1dGNNaWxsaXNlY29uZCA9IG1pbGxpc2Vjb25kO1xuICB2YXIgdXRjTWlsbGlzZWNvbmRzID0gbWlsbGlzZWNvbmRzO1xuICB2YXIgdXRjU2Vjb25kcyA9IHV0Y1NlY29uZC5yYW5nZTtcbiAgdmFyIHV0Y01pbnV0ZXMgPSB1dGNNaW51dGUucmFuZ2U7XG4gIHZhciB1dGNIb3VycyA9IHV0Y0hvdXIucmFuZ2U7XG4gIHZhciB1dGNEYXlzID0gdXRjRGF5LnJhbmdlO1xuICB2YXIgdXRjU3VuZGF5cyA9IHV0Y1N1bmRheS5yYW5nZTtcbiAgdmFyIHV0Y01vbmRheXMgPSB1dGNNb25kYXkucmFuZ2U7XG4gIHZhciB1dGNUdWVzZGF5cyA9IHV0Y1R1ZXNkYXkucmFuZ2U7XG4gIHZhciB1dGNXZWRuZXNkYXlzID0gdXRjV2VkbmVzZGF5LnJhbmdlO1xuICB2YXIgdXRjVGh1cnNkYXlzID0gdXRjVGh1cnNkYXkucmFuZ2U7XG4gIHZhciB1dGNGcmlkYXlzID0gdXRjRnJpZGF5LnJhbmdlO1xuICB2YXIgdXRjU2F0dXJkYXlzID0gdXRjU2F0dXJkYXkucmFuZ2U7XG4gIHZhciB1dGNXZWVrcyA9IHV0Y1N1bmRheS5yYW5nZTtcbiAgdmFyIHV0Y01vbnRocyA9IHV0Y01vbnRoLnJhbmdlO1xuICB2YXIgdXRjWWVhcnMgPSB1dGNZZWFyLnJhbmdlO1xuXG4gIHZhciB2ZXJzaW9uID0gXCIwLjEuMFwiO1xuXG4gIGV4cG9ydHMudmVyc2lvbiA9IHZlcnNpb247XG4gIGV4cG9ydHMubWlsbGlzZWNvbmRzID0gbWlsbGlzZWNvbmRzO1xuICBleHBvcnRzLnNlY29uZHMgPSBzZWNvbmRzO1xuICBleHBvcnRzLm1pbnV0ZXMgPSBtaW51dGVzO1xuICBleHBvcnRzLmhvdXJzID0gaG91cnM7XG4gIGV4cG9ydHMuZGF5cyA9IGRheXM7XG4gIGV4cG9ydHMuc3VuZGF5cyA9IHN1bmRheXM7XG4gIGV4cG9ydHMubW9uZGF5cyA9IG1vbmRheXM7XG4gIGV4cG9ydHMudHVlc2RheXMgPSB0dWVzZGF5cztcbiAgZXhwb3J0cy53ZWRuZXNkYXlzID0gd2VkbmVzZGF5cztcbiAgZXhwb3J0cy50aHVyc2RheXMgPSB0aHVyc2RheXM7XG4gIGV4cG9ydHMuZnJpZGF5cyA9IGZyaWRheXM7XG4gIGV4cG9ydHMuc2F0dXJkYXlzID0gc2F0dXJkYXlzO1xuICBleHBvcnRzLndlZWtzID0gd2Vla3M7XG4gIGV4cG9ydHMubW9udGhzID0gbW9udGhzO1xuICBleHBvcnRzLnllYXJzID0geWVhcnM7XG4gIGV4cG9ydHMudXRjTWlsbGlzZWNvbmQgPSB1dGNNaWxsaXNlY29uZDtcbiAgZXhwb3J0cy51dGNNaWxsaXNlY29uZHMgPSB1dGNNaWxsaXNlY29uZHM7XG4gIGV4cG9ydHMudXRjU2Vjb25kcyA9IHV0Y1NlY29uZHM7XG4gIGV4cG9ydHMudXRjTWludXRlcyA9IHV0Y01pbnV0ZXM7XG4gIGV4cG9ydHMudXRjSG91cnMgPSB1dGNIb3VycztcbiAgZXhwb3J0cy51dGNEYXlzID0gdXRjRGF5cztcbiAgZXhwb3J0cy51dGNTdW5kYXlzID0gdXRjU3VuZGF5cztcbiAgZXhwb3J0cy51dGNNb25kYXlzID0gdXRjTW9uZGF5cztcbiAgZXhwb3J0cy51dGNUdWVzZGF5cyA9IHV0Y1R1ZXNkYXlzO1xuICBleHBvcnRzLnV0Y1dlZG5lc2RheXMgPSB1dGNXZWRuZXNkYXlzO1xuICBleHBvcnRzLnV0Y1RodXJzZGF5cyA9IHV0Y1RodXJzZGF5cztcbiAgZXhwb3J0cy51dGNGcmlkYXlzID0gdXRjRnJpZGF5cztcbiAgZXhwb3J0cy51dGNTYXR1cmRheXMgPSB1dGNTYXR1cmRheXM7XG4gIGV4cG9ydHMudXRjV2Vla3MgPSB1dGNXZWVrcztcbiAgZXhwb3J0cy51dGNNb250aHMgPSB1dGNNb250aHM7XG4gIGV4cG9ydHMudXRjWWVhcnMgPSB1dGNZZWFycztcbiAgZXhwb3J0cy5taWxsaXNlY29uZCA9IG1pbGxpc2Vjb25kO1xuICBleHBvcnRzLnNlY29uZCA9IHNlY29uZDtcbiAgZXhwb3J0cy5taW51dGUgPSBtaW51dGU7XG4gIGV4cG9ydHMuaG91ciA9IGhvdXI7XG4gIGV4cG9ydHMuZGF5ID0gZGF5O1xuICBleHBvcnRzLnN1bmRheSA9IHN1bmRheTtcbiAgZXhwb3J0cy5tb25kYXkgPSBtb25kYXk7XG4gIGV4cG9ydHMudHVlc2RheSA9IHR1ZXNkYXk7XG4gIGV4cG9ydHMud2VkbmVzZGF5ID0gd2VkbmVzZGF5O1xuICBleHBvcnRzLnRodXJzZGF5ID0gdGh1cnNkYXk7XG4gIGV4cG9ydHMuZnJpZGF5ID0gZnJpZGF5O1xuICBleHBvcnRzLnNhdHVyZGF5ID0gc2F0dXJkYXk7XG4gIGV4cG9ydHMud2VlayA9IHN1bmRheTtcbiAgZXhwb3J0cy5tb250aCA9IG1vbnRoO1xuICBleHBvcnRzLnllYXIgPSB5ZWFyO1xuICBleHBvcnRzLnV0Y1NlY29uZCA9IHV0Y1NlY29uZDtcbiAgZXhwb3J0cy51dGNNaW51dGUgPSB1dGNNaW51dGU7XG4gIGV4cG9ydHMudXRjSG91ciA9IHV0Y0hvdXI7XG4gIGV4cG9ydHMudXRjRGF5ID0gdXRjRGF5O1xuICBleHBvcnRzLnV0Y1N1bmRheSA9IHV0Y1N1bmRheTtcbiAgZXhwb3J0cy51dGNNb25kYXkgPSB1dGNNb25kYXk7XG4gIGV4cG9ydHMudXRjVHVlc2RheSA9IHV0Y1R1ZXNkYXk7XG4gIGV4cG9ydHMudXRjV2VkbmVzZGF5ID0gdXRjV2VkbmVzZGF5O1xuICBleHBvcnRzLnV0Y1RodXJzZGF5ID0gdXRjVGh1cnNkYXk7XG4gIGV4cG9ydHMudXRjRnJpZGF5ID0gdXRjRnJpZGF5O1xuICBleHBvcnRzLnV0Y1NhdHVyZGF5ID0gdXRjU2F0dXJkYXk7XG4gIGV4cG9ydHMudXRjV2VlayA9IHV0Y1N1bmRheTtcbiAgZXhwb3J0cy51dGNNb250aCA9IHV0Y01vbnRoO1xuICBleHBvcnRzLnV0Y1llYXIgPSB1dGNZZWFyO1xuICBleHBvcnRzLmludGVydmFsID0gbmV3SW50ZXJ2YWw7XG5cbn0pKTsiLCJ2YXIgdXRpbCA9IHJlcXVpcmUoJy4uL3V0aWwnKSxcbiAgICB0aW1lID0gcmVxdWlyZSgnLi4vdGltZScpLFxuICAgIEVQU0lMT04gPSAxZS0xNTtcblxuZnVuY3Rpb24gYmlucyhvcHQpIHtcbiAgaWYgKCFvcHQpIHsgdGhyb3cgRXJyb3IoXCJNaXNzaW5nIGJpbm5pbmcgb3B0aW9ucy5cIik7IH1cblxuICAvLyBkZXRlcm1pbmUgcmFuZ2VcbiAgdmFyIG1heGIgPSBvcHQubWF4YmlucyB8fCAxNSxcbiAgICAgIGJhc2UgPSBvcHQuYmFzZSB8fCAxMCxcbiAgICAgIGxvZ2IgPSBNYXRoLmxvZyhiYXNlKSxcbiAgICAgIGRpdiA9IG9wdC5kaXYgfHwgWzUsIDJdLFxuICAgICAgbWluID0gb3B0Lm1pbixcbiAgICAgIG1heCA9IG9wdC5tYXgsXG4gICAgICBzcGFuID0gbWF4IC0gbWluLFxuICAgICAgc3RlcCwgbGV2ZWwsIG1pbnN0ZXAsIHByZWNpc2lvbiwgdiwgaSwgZXBzO1xuXG4gIGlmIChvcHQuc3RlcCkge1xuICAgIC8vIGlmIHN0ZXAgc2l6ZSBpcyBleHBsaWNpdGx5IGdpdmVuLCB1c2UgdGhhdFxuICAgIHN0ZXAgPSBvcHQuc3RlcDtcbiAgfSBlbHNlIGlmIChvcHQuc3RlcHMpIHtcbiAgICAvLyBpZiBwcm92aWRlZCwgbGltaXQgY2hvaWNlIHRvIGFjY2VwdGFibGUgc3RlcCBzaXplc1xuICAgIHN0ZXAgPSBvcHQuc3RlcHNbTWF0aC5taW4oXG4gICAgICBvcHQuc3RlcHMubGVuZ3RoIC0gMSxcbiAgICAgIGJpc2VjdChvcHQuc3RlcHMsIHNwYW4vbWF4YiwgMCwgb3B0LnN0ZXBzLmxlbmd0aClcbiAgICApXTtcbiAgfSBlbHNlIHtcbiAgICAvLyBlbHNlIHVzZSBzcGFuIHRvIGRldGVybWluZSBzdGVwIHNpemVcbiAgICBsZXZlbCA9IE1hdGguY2VpbChNYXRoLmxvZyhtYXhiKSAvIGxvZ2IpO1xuICAgIG1pbnN0ZXAgPSBvcHQubWluc3RlcCB8fCAwO1xuICAgIHN0ZXAgPSBNYXRoLm1heChcbiAgICAgIG1pbnN0ZXAsXG4gICAgICBNYXRoLnBvdyhiYXNlLCBNYXRoLnJvdW5kKE1hdGgubG9nKHNwYW4pIC8gbG9nYikgLSBsZXZlbClcbiAgICApO1xuXG4gICAgLy8gaW5jcmVhc2Ugc3RlcCBzaXplIGlmIHRvbyBtYW55IGJpbnNcbiAgICBkbyB7IHN0ZXAgKj0gYmFzZTsgfSB3aGlsZSAoTWF0aC5jZWlsKHNwYW4vc3RlcCkgPiBtYXhiKTtcblxuICAgIC8vIGRlY3JlYXNlIHN0ZXAgc2l6ZSBpZiBhbGxvd2VkXG4gICAgZm9yIChpPTA7IGk8ZGl2Lmxlbmd0aDsgKytpKSB7XG4gICAgICB2ID0gc3RlcCAvIGRpdltpXTtcbiAgICAgIGlmICh2ID49IG1pbnN0ZXAgJiYgc3BhbiAvIHYgPD0gbWF4Yikgc3RlcCA9IHY7XG4gICAgfVxuICB9XG5cbiAgLy8gdXBkYXRlIHByZWNpc2lvbiwgbWluIGFuZCBtYXhcbiAgdiA9IE1hdGgubG9nKHN0ZXApO1xuICBwcmVjaXNpb24gPSB2ID49IDAgPyAwIDogfn4oLXYgLyBsb2diKSArIDE7XG4gIGVwcyA9IE1hdGgucG93KGJhc2UsIC1wcmVjaXNpb24gLSAxKTtcbiAgbWluID0gTWF0aC5taW4obWluLCBNYXRoLmZsb29yKG1pbiAvIHN0ZXAgKyBlcHMpICogc3RlcCk7XG4gIG1heCA9IE1hdGguY2VpbChtYXggLyBzdGVwKSAqIHN0ZXA7XG5cbiAgcmV0dXJuIHtcbiAgICBzdGFydDogbWluLFxuICAgIHN0b3A6ICBtYXgsXG4gICAgc3RlcDogIHN0ZXAsXG4gICAgdW5pdDogIHtwcmVjaXNpb246IHByZWNpc2lvbn0sXG4gICAgdmFsdWU6IHZhbHVlLFxuICAgIGluZGV4OiBpbmRleFxuICB9O1xufVxuXG5mdW5jdGlvbiBiaXNlY3QoYSwgeCwgbG8sIGhpKSB7XG4gIHdoaWxlIChsbyA8IGhpKSB7XG4gICAgdmFyIG1pZCA9IGxvICsgaGkgPj4+IDE7XG4gICAgaWYgKHV0aWwuY21wKGFbbWlkXSwgeCkgPCAwKSB7IGxvID0gbWlkICsgMTsgfVxuICAgIGVsc2UgeyBoaSA9IG1pZDsgfVxuICB9XG4gIHJldHVybiBsbztcbn1cblxuZnVuY3Rpb24gdmFsdWUodikge1xuICByZXR1cm4gdGhpcy5zdGVwICogTWF0aC5mbG9vcih2IC8gdGhpcy5zdGVwICsgRVBTSUxPTik7XG59XG5cbmZ1bmN0aW9uIGluZGV4KHYpIHtcbiAgcmV0dXJuIE1hdGguZmxvb3IoKHYgLSB0aGlzLnN0YXJ0KSAvIHRoaXMuc3RlcCArIEVQU0lMT04pO1xufVxuXG5mdW5jdGlvbiBkYXRlX3ZhbHVlKHYpIHtcbiAgcmV0dXJuIHRoaXMudW5pdC5kYXRlKHZhbHVlLmNhbGwodGhpcywgdikpO1xufVxuXG5mdW5jdGlvbiBkYXRlX2luZGV4KHYpIHtcbiAgcmV0dXJuIGluZGV4LmNhbGwodGhpcywgdGhpcy51bml0LnVuaXQodikpO1xufVxuXG5iaW5zLmRhdGUgPSBmdW5jdGlvbihvcHQpIHtcbiAgaWYgKCFvcHQpIHsgdGhyb3cgRXJyb3IoXCJNaXNzaW5nIGRhdGUgYmlubmluZyBvcHRpb25zLlwiKTsgfVxuXG4gIC8vIGZpbmQgdGltZSBzdGVwLCB0aGVuIGJpblxuICB2YXIgdW5pdHMgPSBvcHQudXRjID8gdGltZS51dGMgOiB0aW1lLFxuICAgICAgZG1pbiA9IG9wdC5taW4sXG4gICAgICBkbWF4ID0gb3B0Lm1heCxcbiAgICAgIG1heGIgPSBvcHQubWF4YmlucyB8fCAyMCxcbiAgICAgIG1pbmIgPSBvcHQubWluYmlucyB8fCA0LFxuICAgICAgc3BhbiA9ICgrZG1heCkgLSAoK2RtaW4pLFxuICAgICAgdW5pdCA9IG9wdC51bml0ID8gdW5pdHNbb3B0LnVuaXRdIDogdW5pdHMuZmluZChzcGFuLCBtaW5iLCBtYXhiKSxcbiAgICAgIHNwZWMgPSBiaW5zKHtcbiAgICAgICAgbWluOiAgICAgdW5pdC5taW4gIT0gbnVsbCA/IHVuaXQubWluIDogdW5pdC51bml0KGRtaW4pLFxuICAgICAgICBtYXg6ICAgICB1bml0Lm1heCAhPSBudWxsID8gdW5pdC5tYXggOiB1bml0LnVuaXQoZG1heCksXG4gICAgICAgIG1heGJpbnM6IG1heGIsXG4gICAgICAgIG1pbnN0ZXA6IHVuaXQubWluc3RlcCxcbiAgICAgICAgc3RlcHM6ICAgdW5pdC5zdGVwXG4gICAgICB9KTtcblxuICBzcGVjLnVuaXQgPSB1bml0O1xuICBzcGVjLmluZGV4ID0gZGF0ZV9pbmRleDtcbiAgaWYgKCFvcHQucmF3KSBzcGVjLnZhbHVlID0gZGF0ZV92YWx1ZTtcbiAgcmV0dXJuIHNwZWM7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGJpbnM7XG4iLCJ2YXIgZ2VuID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxuZ2VuLnJlcGVhdCA9IGZ1bmN0aW9uKHZhbCwgbikge1xuICB2YXIgYSA9IEFycmF5KG4pLCBpO1xuICBmb3IgKGk9MDsgaTxuOyArK2kpIGFbaV0gPSB2YWw7XG4gIHJldHVybiBhO1xufTtcblxuZ2VuLnplcm9zID0gZnVuY3Rpb24obikge1xuICByZXR1cm4gZ2VuLnJlcGVhdCgwLCBuKTtcbn07XG5cbmdlbi5yYW5nZSA9IGZ1bmN0aW9uKHN0YXJ0LCBzdG9wLCBzdGVwKSB7XG4gIGlmIChhcmd1bWVudHMubGVuZ3RoIDwgMykge1xuICAgIHN0ZXAgPSAxO1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoIDwgMikge1xuICAgICAgc3RvcCA9IHN0YXJ0O1xuICAgICAgc3RhcnQgPSAwO1xuICAgIH1cbiAgfVxuICBpZiAoKHN0b3AgLSBzdGFydCkgLyBzdGVwID09IEluZmluaXR5KSB0aHJvdyBuZXcgRXJyb3IoJ0luZmluaXRlIHJhbmdlJyk7XG4gIHZhciByYW5nZSA9IFtdLCBpID0gLTEsIGo7XG4gIGlmIChzdGVwIDwgMCkgd2hpbGUgKChqID0gc3RhcnQgKyBzdGVwICogKytpKSA+IHN0b3ApIHJhbmdlLnB1c2goaik7XG4gIGVsc2Ugd2hpbGUgKChqID0gc3RhcnQgKyBzdGVwICogKytpKSA8IHN0b3ApIHJhbmdlLnB1c2goaik7XG4gIHJldHVybiByYW5nZTtcbn07XG5cbmdlbi5yYW5kb20gPSB7fTtcblxuZ2VuLnJhbmRvbS51bmlmb3JtID0gZnVuY3Rpb24obWluLCBtYXgpIHtcbiAgaWYgKG1heCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgbWF4ID0gbWluID09PSB1bmRlZmluZWQgPyAxIDogbWluO1xuICAgIG1pbiA9IDA7XG4gIH1cbiAgdmFyIGQgPSBtYXggLSBtaW47XG4gIHZhciBmID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG1pbiArIGQgKiBNYXRoLnJhbmRvbSgpO1xuICB9O1xuICBmLnNhbXBsZXMgPSBmdW5jdGlvbihuKSB7XG4gICAgcmV0dXJuIGdlbi56ZXJvcyhuKS5tYXAoZik7XG4gIH07XG4gIGYucGRmID0gZnVuY3Rpb24oeCkge1xuICAgIHJldHVybiAoeCA+PSBtaW4gJiYgeCA8PSBtYXgpID8gMS9kIDogMDtcbiAgfTtcbiAgZi5jZGYgPSBmdW5jdGlvbih4KSB7XG4gICAgcmV0dXJuIHggPCBtaW4gPyAwIDogeCA+IG1heCA/IDEgOiAoeCAtIG1pbikgLyBkO1xuICB9O1xuICBmLmljZGYgPSBmdW5jdGlvbihwKSB7XG4gICAgcmV0dXJuIChwID49IDAgJiYgcCA8PSAxKSA/IG1pbiArIHAqZCA6IE5hTjtcbiAgfTtcbiAgcmV0dXJuIGY7XG59O1xuXG5nZW4ucmFuZG9tLmludGVnZXIgPSBmdW5jdGlvbihhLCBiKSB7XG4gIGlmIChiID09PSB1bmRlZmluZWQpIHtcbiAgICBiID0gYTtcbiAgICBhID0gMDtcbiAgfVxuICB2YXIgZCA9IGIgLSBhO1xuICB2YXIgZiA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBhICsgTWF0aC5mbG9vcihkICogTWF0aC5yYW5kb20oKSk7XG4gIH07XG4gIGYuc2FtcGxlcyA9IGZ1bmN0aW9uKG4pIHtcbiAgICByZXR1cm4gZ2VuLnplcm9zKG4pLm1hcChmKTtcbiAgfTtcbiAgZi5wZGYgPSBmdW5jdGlvbih4KSB7XG4gICAgcmV0dXJuICh4ID09PSBNYXRoLmZsb29yKHgpICYmIHggPj0gYSAmJiB4IDwgYikgPyAxL2QgOiAwO1xuICB9O1xuICBmLmNkZiA9IGZ1bmN0aW9uKHgpIHtcbiAgICB2YXIgdiA9IE1hdGguZmxvb3IoeCk7XG4gICAgcmV0dXJuIHYgPCBhID8gMCA6IHYgPj0gYiA/IDEgOiAodiAtIGEgKyAxKSAvIGQ7XG4gIH07XG4gIGYuaWNkZiA9IGZ1bmN0aW9uKHApIHtcbiAgICByZXR1cm4gKHAgPj0gMCAmJiBwIDw9IDEpID8gYSAtIDEgKyBNYXRoLmZsb29yKHAqZCkgOiBOYU47XG4gIH07XG4gIHJldHVybiBmO1xufTtcblxuZ2VuLnJhbmRvbS5ub3JtYWwgPSBmdW5jdGlvbihtZWFuLCBzdGRldikge1xuICBtZWFuID0gbWVhbiB8fCAwO1xuICBzdGRldiA9IHN0ZGV2IHx8IDE7XG4gIHZhciBuZXh0O1xuICB2YXIgZiA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB4ID0gMCwgeSA9IDAsIHJkcywgYztcbiAgICBpZiAobmV4dCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB4ID0gbmV4dDtcbiAgICAgIG5leHQgPSB1bmRlZmluZWQ7XG4gICAgICByZXR1cm4geDtcbiAgICB9XG4gICAgZG8ge1xuICAgICAgeCA9IE1hdGgucmFuZG9tKCkqMi0xO1xuICAgICAgeSA9IE1hdGgucmFuZG9tKCkqMi0xO1xuICAgICAgcmRzID0geCp4ICsgeSp5O1xuICAgIH0gd2hpbGUgKHJkcyA9PT0gMCB8fCByZHMgPiAxKTtcbiAgICBjID0gTWF0aC5zcXJ0KC0yKk1hdGgubG9nKHJkcykvcmRzKTsgLy8gQm94LU11bGxlciB0cmFuc2Zvcm1cbiAgICBuZXh0ID0gbWVhbiArIHkqYypzdGRldjtcbiAgICByZXR1cm4gbWVhbiArIHgqYypzdGRldjtcbiAgfTtcbiAgZi5zYW1wbGVzID0gZnVuY3Rpb24obikge1xuICAgIHJldHVybiBnZW4uemVyb3MobikubWFwKGYpO1xuICB9O1xuICBmLnBkZiA9IGZ1bmN0aW9uKHgpIHtcbiAgICB2YXIgZXhwID0gTWF0aC5leHAoTWF0aC5wb3coeC1tZWFuLCAyKSAvICgtMiAqIE1hdGgucG93KHN0ZGV2LCAyKSkpO1xuICAgIHJldHVybiAoMSAvIChzdGRldiAqIE1hdGguc3FydCgyKk1hdGguUEkpKSkgKiBleHA7XG4gIH07XG4gIGYuY2RmID0gZnVuY3Rpb24oeCkge1xuICAgIC8vIEFwcHJveGltYXRpb24gZnJvbSBXZXN0ICgyMDA5KVxuICAgIC8vIEJldHRlciBBcHByb3hpbWF0aW9ucyB0byBDdW11bGF0aXZlIE5vcm1hbCBGdW5jdGlvbnNcbiAgICB2YXIgY2QsXG4gICAgICAgIHogPSAoeCAtIG1lYW4pIC8gc3RkZXYsXG4gICAgICAgIFogPSBNYXRoLmFicyh6KTtcbiAgICBpZiAoWiA+IDM3KSB7XG4gICAgICBjZCA9IDA7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBzdW0sIGV4cCA9IE1hdGguZXhwKC1aKlovMik7XG4gICAgICBpZiAoWiA8IDcuMDcxMDY3ODExODY1NDcpIHtcbiAgICAgICAgc3VtID0gMy41MjYyNDk2NTk5ODkxMWUtMDIgKiBaICsgMC43MDAzODMwNjQ0NDM2ODg7XG4gICAgICAgIHN1bSA9IHN1bSAqIFogKyA2LjM3Mzk2MjIwMzUzMTY1O1xuICAgICAgICBzdW0gPSBzdW0gKiBaICsgMzMuOTEyODY2MDc4MzgzO1xuICAgICAgICBzdW0gPSBzdW0gKiBaICsgMTEyLjA3OTI5MTQ5Nzg3MTtcbiAgICAgICAgc3VtID0gc3VtICogWiArIDIyMS4yMTM1OTYxNjk5MzE7XG4gICAgICAgIHN1bSA9IHN1bSAqIFogKyAyMjAuMjA2ODY3OTEyMzc2O1xuICAgICAgICBjZCA9IGV4cCAqIHN1bTtcbiAgICAgICAgc3VtID0gOC44Mzg4MzQ3NjQ4MzE4NGUtMDIgKiBaICsgMS43NTU2NjcxNjMxODI2NDtcbiAgICAgICAgc3VtID0gc3VtICogWiArIDE2LjA2NDE3NzU3OTIwNztcbiAgICAgICAgc3VtID0gc3VtICogWiArIDg2Ljc4MDczMjIwMjk0NjE7XG4gICAgICAgIHN1bSA9IHN1bSAqIFogKyAyOTYuNTY0MjQ4Nzc5Njc0O1xuICAgICAgICBzdW0gPSBzdW0gKiBaICsgNjM3LjMzMzYzMzM3ODgzMTtcbiAgICAgICAgc3VtID0gc3VtICogWiArIDc5My44MjY1MTI1MTk5NDg7XG4gICAgICAgIHN1bSA9IHN1bSAqIFogKyA0NDAuNDEzNzM1ODI0NzUyO1xuICAgICAgICBjZCA9IGNkIC8gc3VtO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3VtID0gWiArIDAuNjU7XG4gICAgICAgIHN1bSA9IFogKyA0IC8gc3VtO1xuICAgICAgICBzdW0gPSBaICsgMyAvIHN1bTtcbiAgICAgICAgc3VtID0gWiArIDIgLyBzdW07XG4gICAgICAgIHN1bSA9IFogKyAxIC8gc3VtO1xuICAgICAgICBjZCA9IGV4cCAvIHN1bSAvIDIuNTA2NjI4Mjc0NjMxO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4geiA+IDAgPyAxIC0gY2QgOiBjZDtcbiAgfTtcbiAgZi5pY2RmID0gZnVuY3Rpb24ocCkge1xuICAgIC8vIEFwcHJveGltYXRpb24gb2YgUHJvYml0IGZ1bmN0aW9uIHVzaW5nIGludmVyc2UgZXJyb3IgZnVuY3Rpb24uXG4gICAgaWYgKHAgPD0gMCB8fCBwID49IDEpIHJldHVybiBOYU47XG4gICAgdmFyIHggPSAyKnAgLSAxLFxuICAgICAgICB2ID0gKDggKiAoTWF0aC5QSSAtIDMpKSAvICgzICogTWF0aC5QSSAqICg0LU1hdGguUEkpKSxcbiAgICAgICAgYSA9ICgyIC8gKE1hdGguUEkqdikpICsgKE1hdGgubG9nKDEgLSBNYXRoLnBvdyh4LDIpKSAvIDIpLFxuICAgICAgICBiID0gTWF0aC5sb2coMSAtICh4KngpKSAvIHYsXG4gICAgICAgIHMgPSAoeCA+IDAgPyAxIDogLTEpICogTWF0aC5zcXJ0KE1hdGguc3FydCgoYSphKSAtIGIpIC0gYSk7XG4gICAgcmV0dXJuIG1lYW4gKyBzdGRldiAqIE1hdGguU1FSVDIgKiBzO1xuICB9O1xuICByZXR1cm4gZjtcbn07IiwidmFyIHV0aWwgPSByZXF1aXJlKCcuLi91dGlsJyk7XG5cbnZhciBUWVBFUyA9ICdfX3R5cGVzX18nO1xuXG52YXIgUEFSU0VSUyA9IHtcbiAgYm9vbGVhbjogdXRpbC5ib29sZWFuLFxuICBpbnRlZ2VyOiB1dGlsLm51bWJlcixcbiAgbnVtYmVyOiAgdXRpbC5udW1iZXIsXG4gIGRhdGU6ICAgIHV0aWwuZGF0ZSxcbiAgc3RyaW5nOiAgZnVuY3Rpb24oeCkgeyByZXR1cm4geD09PScnID8gbnVsbCA6IHg7IH1cbn07XG5cbnZhciBURVNUUyA9IHtcbiAgYm9vbGVhbjogZnVuY3Rpb24oeCkgeyByZXR1cm4geD09PSd0cnVlJyB8fCB4PT09J2ZhbHNlJyB8fCB1dGlsLmlzQm9vbGVhbih4KTsgfSxcbiAgaW50ZWdlcjogZnVuY3Rpb24oeCkgeyByZXR1cm4gVEVTVFMubnVtYmVyKHgpICYmICh4PSt4KSA9PT0gfn54OyB9LFxuICBudW1iZXI6IGZ1bmN0aW9uKHgpIHsgcmV0dXJuICFpc05hTigreCkgJiYgIXV0aWwuaXNEYXRlKHgpOyB9LFxuICBkYXRlOiBmdW5jdGlvbih4KSB7IHJldHVybiAhaXNOYU4oRGF0ZS5wYXJzZSh4KSk7IH1cbn07XG5cbmZ1bmN0aW9uIGFubm90YXRpb24oZGF0YSwgdHlwZXMpIHtcbiAgaWYgKCF0eXBlcykgcmV0dXJuIGRhdGEgJiYgZGF0YVtUWVBFU10gfHwgbnVsbDtcbiAgZGF0YVtUWVBFU10gPSB0eXBlcztcbn1cblxuZnVuY3Rpb24gdHlwZSh2YWx1ZXMsIGYpIHtcbiAgdmFsdWVzID0gdXRpbC5hcnJheSh2YWx1ZXMpO1xuICBmID0gdXRpbC4kKGYpO1xuICB2YXIgdiwgaSwgbjtcblxuICAvLyBpZiBkYXRhIGFycmF5IGhhcyB0eXBlIGFubm90YXRpb25zLCB1c2UgdGhlbVxuICBpZiAodmFsdWVzW1RZUEVTXSkge1xuICAgIHYgPSBmKHZhbHVlc1tUWVBFU10pO1xuICAgIGlmICh1dGlsLmlzU3RyaW5nKHYpKSByZXR1cm4gdjtcbiAgfVxuXG4gIGZvciAoaT0wLCBuPXZhbHVlcy5sZW5ndGg7ICF1dGlsLmlzVmFsaWQodikgJiYgaTxuOyArK2kpIHtcbiAgICB2ID0gZiA/IGYodmFsdWVzW2ldKSA6IHZhbHVlc1tpXTtcbiAgfVxuXG4gIHJldHVybiB1dGlsLmlzRGF0ZSh2KSA/ICdkYXRlJyA6XG4gICAgdXRpbC5pc051bWJlcih2KSAgICA/ICdudW1iZXInIDpcbiAgICB1dGlsLmlzQm9vbGVhbih2KSAgID8gJ2Jvb2xlYW4nIDpcbiAgICB1dGlsLmlzU3RyaW5nKHYpICAgID8gJ3N0cmluZycgOiBudWxsO1xufVxuXG5mdW5jdGlvbiB0eXBlQWxsKGRhdGEsIGZpZWxkcykge1xuICBpZiAoIWRhdGEubGVuZ3RoKSByZXR1cm47XG4gIGZpZWxkcyA9IGZpZWxkcyB8fCB1dGlsLmtleXMoZGF0YVswXSk7XG4gIHJldHVybiBmaWVsZHMucmVkdWNlKGZ1bmN0aW9uKHR5cGVzLCBmKSB7XG4gICAgcmV0dXJuICh0eXBlc1tmXSA9IHR5cGUoZGF0YSwgZiksIHR5cGVzKTtcbiAgfSwge30pO1xufVxuXG5mdW5jdGlvbiBpbmZlcih2YWx1ZXMsIGYpIHtcbiAgdmFsdWVzID0gdXRpbC5hcnJheSh2YWx1ZXMpO1xuICBmID0gdXRpbC4kKGYpO1xuICB2YXIgaSwgaiwgdjtcblxuICAvLyB0eXBlcyB0byB0ZXN0IGZvciwgaW4gcHJlY2VkZW5jZSBvcmRlclxuICB2YXIgdHlwZXMgPSBbJ2Jvb2xlYW4nLCAnaW50ZWdlcicsICdudW1iZXInLCAnZGF0ZSddO1xuXG4gIGZvciAoaT0wOyBpPHZhbHVlcy5sZW5ndGg7ICsraSkge1xuICAgIC8vIGdldCBuZXh0IHZhbHVlIHRvIHRlc3RcbiAgICB2ID0gZiA/IGYodmFsdWVzW2ldKSA6IHZhbHVlc1tpXTtcbiAgICAvLyB0ZXN0IHZhbHVlIGFnYWluc3QgcmVtYWluaW5nIHR5cGVzXG4gICAgZm9yIChqPTA7IGo8dHlwZXMubGVuZ3RoOyArK2opIHtcbiAgICAgIGlmICh1dGlsLmlzVmFsaWQodikgJiYgIVRFU1RTW3R5cGVzW2pdXSh2KSkge1xuICAgICAgICB0eXBlcy5zcGxpY2UoaiwgMSk7XG4gICAgICAgIGogLT0gMTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gaWYgbm8gdHlwZXMgbGVmdCwgcmV0dXJuICdzdHJpbmcnXG4gICAgaWYgKHR5cGVzLmxlbmd0aCA9PT0gMCkgcmV0dXJuICdzdHJpbmcnO1xuICB9XG5cbiAgcmV0dXJuIHR5cGVzWzBdO1xufVxuXG5mdW5jdGlvbiBpbmZlckFsbChkYXRhLCBmaWVsZHMpIHtcbiAgZmllbGRzID0gZmllbGRzIHx8IHV0aWwua2V5cyhkYXRhWzBdKTtcbiAgcmV0dXJuIGZpZWxkcy5yZWR1Y2UoZnVuY3Rpb24odHlwZXMsIGYpIHtcbiAgICB0eXBlc1tmXSA9IGluZmVyKGRhdGEsIGYpO1xuICAgIHJldHVybiB0eXBlcztcbiAgfSwge30pO1xufVxuXG50eXBlLmFubm90YXRpb24gPSBhbm5vdGF0aW9uO1xudHlwZS5hbGwgPSB0eXBlQWxsO1xudHlwZS5pbmZlciA9IGluZmVyO1xudHlwZS5pbmZlckFsbCA9IGluZmVyQWxsO1xudHlwZS5wYXJzZXJzID0gUEFSU0VSUztcbm1vZHVsZS5leHBvcnRzID0gdHlwZTtcbiIsInZhciB1dGlsID0gcmVxdWlyZSgnLi91dGlsJyk7XG52YXIgdHlwZSA9IHJlcXVpcmUoJy4vaW1wb3J0L3R5cGUnKTtcbnZhciBnZW4gPSByZXF1aXJlKCcuL2dlbmVyYXRlJyk7XG5cbnZhciBzdGF0cyA9IHt9O1xuXG4vLyBDb2xsZWN0IHVuaXF1ZSB2YWx1ZXMuXG4vLyBPdXRwdXQ6IGFuIGFycmF5IG9mIHVuaXF1ZSB2YWx1ZXMsIGluIGZpcnN0LW9ic2VydmVkIG9yZGVyXG5zdGF0cy51bmlxdWUgPSBmdW5jdGlvbih2YWx1ZXMsIGYsIHJlc3VsdHMpIHtcbiAgZiA9IHV0aWwuJChmKTtcbiAgcmVzdWx0cyA9IHJlc3VsdHMgfHwgW107XG4gIHZhciB1ID0ge30sIHYsIGksIG47XG4gIGZvciAoaT0wLCBuPXZhbHVlcy5sZW5ndGg7IGk8bjsgKytpKSB7XG4gICAgdiA9IGYgPyBmKHZhbHVlc1tpXSkgOiB2YWx1ZXNbaV07XG4gICAgaWYgKHYgaW4gdSkgY29udGludWU7XG4gICAgdVt2XSA9IDE7XG4gICAgcmVzdWx0cy5wdXNoKHYpO1xuICB9XG4gIHJldHVybiByZXN1bHRzO1xufTtcblxuLy8gUmV0dXJuIHRoZSBsZW5ndGggb2YgdGhlIGlucHV0IGFycmF5Llxuc3RhdHMuY291bnQgPSBmdW5jdGlvbih2YWx1ZXMpIHtcbiAgcmV0dXJuIHZhbHVlcyAmJiB2YWx1ZXMubGVuZ3RoIHx8IDA7XG59O1xuXG4vLyBDb3VudCB0aGUgbnVtYmVyIG9mIG5vbi1udWxsLCBub24tdW5kZWZpbmVkLCBub24tTmFOIHZhbHVlcy5cbnN0YXRzLmNvdW50LnZhbGlkID0gZnVuY3Rpb24odmFsdWVzLCBmKSB7XG4gIGYgPSB1dGlsLiQoZik7XG4gIHZhciB2LCBpLCBuLCB2YWxpZCA9IDA7XG4gIGZvciAoaT0wLCBuPXZhbHVlcy5sZW5ndGg7IGk8bjsgKytpKSB7XG4gICAgdiA9IGYgPyBmKHZhbHVlc1tpXSkgOiB2YWx1ZXNbaV07XG4gICAgaWYgKHV0aWwuaXNWYWxpZCh2KSkgdmFsaWQgKz0gMTtcbiAgfVxuICByZXR1cm4gdmFsaWQ7XG59O1xuXG4vLyBDb3VudCB0aGUgbnVtYmVyIG9mIG51bGwgb3IgdW5kZWZpbmVkIHZhbHVlcy5cbnN0YXRzLmNvdW50Lm1pc3NpbmcgPSBmdW5jdGlvbih2YWx1ZXMsIGYpIHtcbiAgZiA9IHV0aWwuJChmKTtcbiAgdmFyIHYsIGksIG4sIGNvdW50ID0gMDtcbiAgZm9yIChpPTAsIG49dmFsdWVzLmxlbmd0aDsgaTxuOyArK2kpIHtcbiAgICB2ID0gZiA/IGYodmFsdWVzW2ldKSA6IHZhbHVlc1tpXTtcbiAgICBpZiAodiA9PSBudWxsKSBjb3VudCArPSAxO1xuICB9XG4gIHJldHVybiBjb3VudDtcbn07XG5cbi8vIENvdW50IHRoZSBudW1iZXIgb2YgZGlzdGluY3QgdmFsdWVzLlxuLy8gTnVsbCwgdW5kZWZpbmVkIGFuZCBOYU4gYXJlIGVhY2ggY29uc2lkZXJlZCBkaXN0aW5jdCB2YWx1ZXMuXG5zdGF0cy5jb3VudC5kaXN0aW5jdCA9IGZ1bmN0aW9uKHZhbHVlcywgZikge1xuICBmID0gdXRpbC4kKGYpO1xuICB2YXIgdSA9IHt9LCB2LCBpLCBuLCBjb3VudCA9IDA7XG4gIGZvciAoaT0wLCBuPXZhbHVlcy5sZW5ndGg7IGk8bjsgKytpKSB7XG4gICAgdiA9IGYgPyBmKHZhbHVlc1tpXSkgOiB2YWx1ZXNbaV07XG4gICAgaWYgKHYgaW4gdSkgY29udGludWU7XG4gICAgdVt2XSA9IDE7XG4gICAgY291bnQgKz0gMTtcbiAgfVxuICByZXR1cm4gY291bnQ7XG59O1xuXG4vLyBDb25zdHJ1Y3QgYSBtYXAgZnJvbSBkaXN0aW5jdCB2YWx1ZXMgdG8gb2NjdXJyZW5jZSBjb3VudHMuXG5zdGF0cy5jb3VudC5tYXAgPSBmdW5jdGlvbih2YWx1ZXMsIGYpIHtcbiAgZiA9IHV0aWwuJChmKTtcbiAgdmFyIG1hcCA9IHt9LCB2LCBpLCBuO1xuICBmb3IgKGk9MCwgbj12YWx1ZXMubGVuZ3RoOyBpPG47ICsraSkge1xuICAgIHYgPSBmID8gZih2YWx1ZXNbaV0pIDogdmFsdWVzW2ldO1xuICAgIG1hcFt2XSA9ICh2IGluIG1hcCkgPyBtYXBbdl0gKyAxIDogMTtcbiAgfVxuICByZXR1cm4gbWFwO1xufTtcblxuLy8gQ29tcHV0ZSB0aGUgbWVkaWFuIG9mIGFuIGFycmF5IG9mIG51bWJlcnMuXG5zdGF0cy5tZWRpYW4gPSBmdW5jdGlvbih2YWx1ZXMsIGYpIHtcbiAgaWYgKGYpIHZhbHVlcyA9IHZhbHVlcy5tYXAodXRpbC4kKGYpKTtcbiAgdmFsdWVzID0gdmFsdWVzLmZpbHRlcih1dGlsLmlzVmFsaWQpLnNvcnQodXRpbC5jbXApO1xuICByZXR1cm4gc3RhdHMucXVhbnRpbGUodmFsdWVzLCAwLjUpO1xufTtcblxuLy8gQ29tcHV0ZXMgdGhlIHF1YXJ0aWxlIGJvdW5kYXJpZXMgb2YgYW4gYXJyYXkgb2YgbnVtYmVycy5cbnN0YXRzLnF1YXJ0aWxlID0gZnVuY3Rpb24odmFsdWVzLCBmKSB7XG4gIGlmIChmKSB2YWx1ZXMgPSB2YWx1ZXMubWFwKHV0aWwuJChmKSk7XG4gIHZhbHVlcyA9IHZhbHVlcy5maWx0ZXIodXRpbC5pc1ZhbGlkKS5zb3J0KHV0aWwuY21wKTtcbiAgdmFyIHEgPSBzdGF0cy5xdWFudGlsZTtcbiAgcmV0dXJuIFtxKHZhbHVlcywgMC4yNSksIHEodmFsdWVzLCAwLjUwKSwgcSh2YWx1ZXMsIDAuNzUpXTtcbn07XG5cbi8vIENvbXB1dGUgdGhlIHF1YW50aWxlIG9mIGEgc29ydGVkIGFycmF5IG9mIG51bWJlcnMuXG4vLyBBZGFwdGVkIGZyb20gdGhlIEQzLmpzIGltcGxlbWVudGF0aW9uLlxuc3RhdHMucXVhbnRpbGUgPSBmdW5jdGlvbih2YWx1ZXMsIGYsIHApIHtcbiAgaWYgKHAgPT09IHVuZGVmaW5lZCkgeyBwID0gZjsgZiA9IHV0aWwuaWRlbnRpdHk7IH1cbiAgZiA9IHV0aWwuJChmKTtcbiAgdmFyIEggPSAodmFsdWVzLmxlbmd0aCAtIDEpICogcCArIDEsXG4gICAgICBoID0gTWF0aC5mbG9vcihIKSxcbiAgICAgIHYgPSArZih2YWx1ZXNbaCAtIDFdKSxcbiAgICAgIGUgPSBIIC0gaDtcbiAgcmV0dXJuIGUgPyB2ICsgZSAqIChmKHZhbHVlc1toXSkgLSB2KSA6IHY7XG59O1xuXG4vLyBDb21wdXRlIHRoZSBzdW0gb2YgYW4gYXJyYXkgb2YgbnVtYmVycy5cbnN0YXRzLnN1bSA9IGZ1bmN0aW9uKHZhbHVlcywgZikge1xuICBmID0gdXRpbC4kKGYpO1xuICBmb3IgKHZhciBzdW09MCwgaT0wLCBuPXZhbHVlcy5sZW5ndGgsIHY7IGk8bjsgKytpKSB7XG4gICAgdiA9IGYgPyBmKHZhbHVlc1tpXSkgOiB2YWx1ZXNbaV07XG4gICAgaWYgKHV0aWwuaXNWYWxpZCh2KSkgc3VtICs9IHY7XG4gIH1cbiAgcmV0dXJuIHN1bTtcbn07XG5cbi8vIENvbXB1dGUgdGhlIG1lYW4gKGF2ZXJhZ2UpIG9mIGFuIGFycmF5IG9mIG51bWJlcnMuXG5zdGF0cy5tZWFuID0gZnVuY3Rpb24odmFsdWVzLCBmKSB7XG4gIGYgPSB1dGlsLiQoZik7XG4gIHZhciBtZWFuID0gMCwgZGVsdGEsIGksIG4sIGMsIHY7XG4gIGZvciAoaT0wLCBjPTAsIG49dmFsdWVzLmxlbmd0aDsgaTxuOyArK2kpIHtcbiAgICB2ID0gZiA/IGYodmFsdWVzW2ldKSA6IHZhbHVlc1tpXTtcbiAgICBpZiAodXRpbC5pc1ZhbGlkKHYpKSB7XG4gICAgICBkZWx0YSA9IHYgLSBtZWFuO1xuICAgICAgbWVhbiA9IG1lYW4gKyBkZWx0YSAvICgrK2MpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gbWVhbjtcbn07XG5cbi8vIENvbXB1dGUgdGhlIHNhbXBsZSB2YXJpYW5jZSBvZiBhbiBhcnJheSBvZiBudW1iZXJzLlxuc3RhdHMudmFyaWFuY2UgPSBmdW5jdGlvbih2YWx1ZXMsIGYpIHtcbiAgZiA9IHV0aWwuJChmKTtcbiAgaWYgKCF1dGlsLmlzQXJyYXkodmFsdWVzKSB8fCB2YWx1ZXMubGVuZ3RoIDwgMikgcmV0dXJuIDA7XG4gIHZhciBtZWFuID0gMCwgTTIgPSAwLCBkZWx0YSwgaSwgYywgdjtcbiAgZm9yIChpPTAsIGM9MDsgaTx2YWx1ZXMubGVuZ3RoOyArK2kpIHtcbiAgICB2ID0gZiA/IGYodmFsdWVzW2ldKSA6IHZhbHVlc1tpXTtcbiAgICBpZiAodXRpbC5pc1ZhbGlkKHYpKSB7XG4gICAgICBkZWx0YSA9IHYgLSBtZWFuO1xuICAgICAgbWVhbiA9IG1lYW4gKyBkZWx0YSAvICgrK2MpO1xuICAgICAgTTIgPSBNMiArIGRlbHRhICogKHYgLSBtZWFuKTtcbiAgICB9XG4gIH1cbiAgTTIgPSBNMiAvIChjIC0gMSk7XG4gIHJldHVybiBNMjtcbn07XG5cbi8vIENvbXB1dGUgdGhlIHNhbXBsZSBzdGFuZGFyZCBkZXZpYXRpb24gb2YgYW4gYXJyYXkgb2YgbnVtYmVycy5cbnN0YXRzLnN0ZGV2ID0gZnVuY3Rpb24odmFsdWVzLCBmKSB7XG4gIHJldHVybiBNYXRoLnNxcnQoc3RhdHMudmFyaWFuY2UodmFsdWVzLCBmKSk7XG59O1xuXG4vLyBDb21wdXRlIHRoZSBQZWFyc29uIG1vZGUgc2tld25lc3MgKChtZWRpYW4tbWVhbikvc3RkZXYpIG9mIGFuIGFycmF5IG9mIG51bWJlcnMuXG5zdGF0cy5tb2Rlc2tldyA9IGZ1bmN0aW9uKHZhbHVlcywgZikge1xuICB2YXIgYXZnID0gc3RhdHMubWVhbih2YWx1ZXMsIGYpLFxuICAgICAgbWVkID0gc3RhdHMubWVkaWFuKHZhbHVlcywgZiksXG4gICAgICBzdGQgPSBzdGF0cy5zdGRldih2YWx1ZXMsIGYpO1xuICByZXR1cm4gc3RkID09PSAwID8gMCA6IChhdmcgLSBtZWQpIC8gc3RkO1xufTtcblxuLy8gRmluZCB0aGUgbWluaW11bSB2YWx1ZSBpbiBhbiBhcnJheS5cbnN0YXRzLm1pbiA9IGZ1bmN0aW9uKHZhbHVlcywgZikge1xuICByZXR1cm4gc3RhdHMuZXh0ZW50KHZhbHVlcywgZilbMF07XG59O1xuXG4vLyBGaW5kIHRoZSBtYXhpbXVtIHZhbHVlIGluIGFuIGFycmF5Llxuc3RhdHMubWF4ID0gZnVuY3Rpb24odmFsdWVzLCBmKSB7XG4gIHJldHVybiBzdGF0cy5leHRlbnQodmFsdWVzLCBmKVsxXTtcbn07XG5cbi8vIEZpbmQgdGhlIG1pbmltdW0gYW5kIG1heGltdW0gb2YgYW4gYXJyYXkgb2YgdmFsdWVzLlxuc3RhdHMuZXh0ZW50ID0gZnVuY3Rpb24odmFsdWVzLCBmKSB7XG4gIGYgPSB1dGlsLiQoZik7XG4gIHZhciBhLCBiLCB2LCBpLCBuID0gdmFsdWVzLmxlbmd0aDtcbiAgZm9yIChpPTA7IGk8bjsgKytpKSB7XG4gICAgdiA9IGYgPyBmKHZhbHVlc1tpXSkgOiB2YWx1ZXNbaV07XG4gICAgaWYgKHV0aWwuaXNWYWxpZCh2KSkgeyBhID0gYiA9IHY7IGJyZWFrOyB9XG4gIH1cbiAgZm9yICg7IGk8bjsgKytpKSB7XG4gICAgdiA9IGYgPyBmKHZhbHVlc1tpXSkgOiB2YWx1ZXNbaV07XG4gICAgaWYgKHV0aWwuaXNWYWxpZCh2KSkge1xuICAgICAgaWYgKHYgPCBhKSBhID0gdjtcbiAgICAgIGlmICh2ID4gYikgYiA9IHY7XG4gICAgfVxuICB9XG4gIHJldHVybiBbYSwgYl07XG59O1xuXG4vLyBGaW5kIHRoZSBpbnRlZ2VyIGluZGljZXMgb2YgdGhlIG1pbmltdW0gYW5kIG1heGltdW0gdmFsdWVzLlxuc3RhdHMuZXh0ZW50LmluZGV4ID0gZnVuY3Rpb24odmFsdWVzLCBmKSB7XG4gIGYgPSB1dGlsLiQoZik7XG4gIHZhciB4ID0gLTEsIHkgPSAtMSwgYSwgYiwgdiwgaSwgbiA9IHZhbHVlcy5sZW5ndGg7XG4gIGZvciAoaT0wOyBpPG47ICsraSkge1xuICAgIHYgPSBmID8gZih2YWx1ZXNbaV0pIDogdmFsdWVzW2ldO1xuICAgIGlmICh1dGlsLmlzVmFsaWQodikpIHsgYSA9IGIgPSB2OyB4ID0geSA9IGk7IGJyZWFrOyB9XG4gIH1cbiAgZm9yICg7IGk8bjsgKytpKSB7XG4gICAgdiA9IGYgPyBmKHZhbHVlc1tpXSkgOiB2YWx1ZXNbaV07XG4gICAgaWYgKHV0aWwuaXNWYWxpZCh2KSkge1xuICAgICAgaWYgKHYgPCBhKSB7IGEgPSB2OyB4ID0gaTsgfVxuICAgICAgaWYgKHYgPiBiKSB7IGIgPSB2OyB5ID0gaTsgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gW3gsIHldO1xufTtcblxuLy8gQ29tcHV0ZSB0aGUgZG90IHByb2R1Y3Qgb2YgdHdvIGFycmF5cyBvZiBudW1iZXJzLlxuc3RhdHMuZG90ID0gZnVuY3Rpb24odmFsdWVzLCBhLCBiKSB7XG4gIHZhciBzdW0gPSAwLCBpLCB2O1xuICBpZiAoIWIpIHtcbiAgICBpZiAodmFsdWVzLmxlbmd0aCAhPT0gYS5sZW5ndGgpIHtcbiAgICAgIHRocm93IEVycm9yKCdBcnJheSBsZW5ndGhzIG11c3QgbWF0Y2guJyk7XG4gICAgfVxuICAgIGZvciAoaT0wOyBpPHZhbHVlcy5sZW5ndGg7ICsraSkge1xuICAgICAgdiA9IHZhbHVlc1tpXSAqIGFbaV07XG4gICAgICBpZiAodiA9PT0gdikgc3VtICs9IHY7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGEgPSB1dGlsLiQoYSk7XG4gICAgYiA9IHV0aWwuJChiKTtcbiAgICBmb3IgKGk9MDsgaTx2YWx1ZXMubGVuZ3RoOyArK2kpIHtcbiAgICAgIHYgPSBhKHZhbHVlc1tpXSkgKiBiKHZhbHVlc1tpXSk7XG4gICAgICBpZiAodiA9PT0gdikgc3VtICs9IHY7XG4gICAgfVxuICB9XG4gIHJldHVybiBzdW07XG59O1xuXG4vLyBDb21wdXRlIHRoZSB2ZWN0b3IgZGlzdGFuY2UgYmV0d2VlbiB0d28gYXJyYXlzIG9mIG51bWJlcnMuXG4vLyBEZWZhdWx0IGlzIEV1Y2xpZGVhbiAoZXhwPTIpIGRpc3RhbmNlLCBjb25maWd1cmFibGUgdmlhIGV4cCBhcmd1bWVudC5cbnN0YXRzLmRpc3QgPSBmdW5jdGlvbih2YWx1ZXMsIGEsIGIsIGV4cCkge1xuICB2YXIgZiA9IHV0aWwuaXNGdW5jdGlvbihiKSB8fCB1dGlsLmlzU3RyaW5nKGIpLFxuICAgICAgWCA9IHZhbHVlcyxcbiAgICAgIFkgPSBmID8gdmFsdWVzIDogYSxcbiAgICAgIGUgPSBmID8gZXhwIDogYixcbiAgICAgIEwyID0gZSA9PT0gMiB8fCBlID09IG51bGwsXG4gICAgICBuID0gdmFsdWVzLmxlbmd0aCwgcyA9IDAsIGQsIGk7XG4gIGlmIChmKSB7XG4gICAgYSA9IHV0aWwuJChhKTtcbiAgICBiID0gdXRpbC4kKGIpO1xuICB9XG4gIGZvciAoaT0wOyBpPG47ICsraSkge1xuICAgIGQgPSBmID8gKGEoWFtpXSktYihZW2ldKSkgOiAoWFtpXS1ZW2ldKTtcbiAgICBzICs9IEwyID8gZCpkIDogTWF0aC5wb3coTWF0aC5hYnMoZCksIGUpO1xuICB9XG4gIHJldHVybiBMMiA/IE1hdGguc3FydChzKSA6IE1hdGgucG93KHMsIDEvZSk7XG59O1xuXG4vLyBDb21wdXRlIHRoZSBDb2hlbidzIGQgZWZmZWN0IHNpemUgYmV0d2VlbiB0d28gYXJyYXlzIG9mIG51bWJlcnMuXG5zdGF0cy5jb2hlbnNkID0gZnVuY3Rpb24odmFsdWVzLCBhLCBiKSB7XG4gIHZhciBYID0gYiA/IHZhbHVlcy5tYXAodXRpbC4kKGEpKSA6IHZhbHVlcyxcbiAgICAgIFkgPSBiID8gdmFsdWVzLm1hcCh1dGlsLiQoYikpIDogYSxcbiAgICAgIHgxID0gc3RhdHMubWVhbihYKSxcbiAgICAgIHgyID0gc3RhdHMubWVhbihZKSxcbiAgICAgIG4xID0gc3RhdHMuY291bnQudmFsaWQoWCksXG4gICAgICBuMiA9IHN0YXRzLmNvdW50LnZhbGlkKFkpO1xuXG4gIGlmICgobjErbjItMikgPD0gMCkge1xuICAgIC8vIGlmIGJvdGggYXJyYXlzIGFyZSBzaXplIDEsIG9yIG9uZSBpcyBlbXB0eSwgdGhlcmUncyBubyBlZmZlY3Qgc2l6ZVxuICAgIHJldHVybiAwO1xuICB9XG4gIC8vIHBvb2wgc3RhbmRhcmQgZGV2aWF0aW9uXG4gIHZhciBzMSA9IHN0YXRzLnZhcmlhbmNlKFgpLFxuICAgICAgczIgPSBzdGF0cy52YXJpYW5jZShZKSxcbiAgICAgIHMgPSBNYXRoLnNxcnQoKCgobjEtMSkqczEpICsgKChuMi0xKSpzMikpIC8gKG4xK24yLTIpKTtcbiAgLy8gaWYgdGhlcmUgaXMgbm8gdmFyaWFuY2UsIHRoZXJlJ3Mgbm8gZWZmZWN0IHNpemVcbiAgcmV0dXJuIHM9PT0wID8gMCA6ICh4MSAtIHgyKSAvIHM7XG59O1xuXG4vLyBDb21wdXRlcyB0aGUgY292YXJpYW5jZSBiZXR3ZWVuIHR3byBhcnJheXMgb2YgbnVtYmVyc1xuc3RhdHMuY292YXJpYW5jZSA9IGZ1bmN0aW9uKHZhbHVlcywgYSwgYikge1xuICB2YXIgWCA9IGIgPyB2YWx1ZXMubWFwKHV0aWwuJChhKSkgOiB2YWx1ZXMsXG4gICAgICBZID0gYiA/IHZhbHVlcy5tYXAodXRpbC4kKGIpKSA6IGEsXG4gICAgICBuID0gWC5sZW5ndGgsXG4gICAgICB4bSA9IHN0YXRzLm1lYW4oWCksXG4gICAgICB5bSA9IHN0YXRzLm1lYW4oWSksXG4gICAgICBzdW0gPSAwLCBjID0gMCwgaSwgeCwgeSwgdngsIHZ5O1xuXG4gIGlmIChuICE9PSBZLmxlbmd0aCkge1xuICAgIHRocm93IEVycm9yKCdJbnB1dCBsZW5ndGhzIG11c3QgbWF0Y2guJyk7XG4gIH1cblxuICBmb3IgKGk9MDsgaTxuOyArK2kpIHtcbiAgICB4ID0gWFtpXTsgdnggPSB1dGlsLmlzVmFsaWQoeCk7XG4gICAgeSA9IFlbaV07IHZ5ID0gdXRpbC5pc1ZhbGlkKHkpO1xuICAgIGlmICh2eCAmJiB2eSkge1xuICAgICAgc3VtICs9ICh4LXhtKSAqICh5LXltKTtcbiAgICAgICsrYztcbiAgICB9IGVsc2UgaWYgKHZ4IHx8IHZ5KSB7XG4gICAgICB0aHJvdyBFcnJvcignVmFsaWQgdmFsdWVzIG11c3QgYWxpZ24uJyk7XG4gICAgfVxuICB9XG4gIHJldHVybiBzdW0gLyAoYy0xKTtcbn07XG5cbi8vIENvbXB1dGUgYXNjZW5kaW5nIHJhbmsgc2NvcmVzIGZvciBhbiBhcnJheSBvZiB2YWx1ZXMuXG4vLyBUaWVzIGFyZSBhc3NpZ25lZCB0aGVpciBjb2xsZWN0aXZlIG1lYW4gcmFuay5cbnN0YXRzLnJhbmsgPSBmdW5jdGlvbih2YWx1ZXMsIGYpIHtcbiAgZiA9IHV0aWwuJChmKSB8fCB1dGlsLmlkZW50aXR5O1xuICB2YXIgYSA9IHZhbHVlcy5tYXAoZnVuY3Rpb24odiwgaSkge1xuICAgICAgcmV0dXJuIHtpZHg6IGksIHZhbDogZih2KX07XG4gICAgfSlcbiAgICAuc29ydCh1dGlsLmNvbXBhcmF0b3IoJ3ZhbCcpKTtcblxuICB2YXIgbiA9IHZhbHVlcy5sZW5ndGgsXG4gICAgICByID0gQXJyYXkobiksXG4gICAgICB0aWUgPSAtMSwgcCA9IHt9LCBpLCB2LCBtdTtcblxuICBmb3IgKGk9MDsgaTxuOyArK2kpIHtcbiAgICB2ID0gYVtpXS52YWw7XG4gICAgaWYgKHRpZSA8IDAgJiYgcCA9PT0gdikge1xuICAgICAgdGllID0gaSAtIDE7XG4gICAgfSBlbHNlIGlmICh0aWUgPiAtMSAmJiBwICE9PSB2KSB7XG4gICAgICBtdSA9IDEgKyAoaS0xICsgdGllKSAvIDI7XG4gICAgICBmb3IgKDsgdGllPGk7ICsrdGllKSByW2FbdGllXS5pZHhdID0gbXU7XG4gICAgICB0aWUgPSAtMTtcbiAgICB9XG4gICAgclthW2ldLmlkeF0gPSBpICsgMTtcbiAgICBwID0gdjtcbiAgfVxuXG4gIGlmICh0aWUgPiAtMSkge1xuICAgIG11ID0gMSArIChuLTEgKyB0aWUpIC8gMjtcbiAgICBmb3IgKDsgdGllPG47ICsrdGllKSByW2FbdGllXS5pZHhdID0gbXU7XG4gIH1cblxuICByZXR1cm4gcjtcbn07XG5cbi8vIENvbXB1dGUgdGhlIHNhbXBsZSBQZWFyc29uIHByb2R1Y3QtbW9tZW50IGNvcnJlbGF0aW9uIG9mIHR3byBhcnJheXMgb2YgbnVtYmVycy5cbnN0YXRzLmNvciA9IGZ1bmN0aW9uKHZhbHVlcywgYSwgYikge1xuICB2YXIgZm4gPSBiO1xuICBiID0gZm4gPyB2YWx1ZXMubWFwKHV0aWwuJChiKSkgOiBhO1xuICBhID0gZm4gPyB2YWx1ZXMubWFwKHV0aWwuJChhKSkgOiB2YWx1ZXM7XG5cbiAgdmFyIGRvdCA9IHN0YXRzLmRvdChhLCBiKSxcbiAgICAgIG11YSA9IHN0YXRzLm1lYW4oYSksXG4gICAgICBtdWIgPSBzdGF0cy5tZWFuKGIpLFxuICAgICAgc2RhID0gc3RhdHMuc3RkZXYoYSksXG4gICAgICBzZGIgPSBzdGF0cy5zdGRldihiKSxcbiAgICAgIG4gPSB2YWx1ZXMubGVuZ3RoO1xuXG4gIHJldHVybiAoZG90IC0gbiptdWEqbXViKSAvICgobi0xKSAqIHNkYSAqIHNkYik7XG59O1xuXG4vLyBDb21wdXRlIHRoZSBTcGVhcm1hbiByYW5rIGNvcnJlbGF0aW9uIG9mIHR3byBhcnJheXMgb2YgdmFsdWVzLlxuc3RhdHMuY29yLnJhbmsgPSBmdW5jdGlvbih2YWx1ZXMsIGEsIGIpIHtcbiAgdmFyIHJhID0gYiA/IHN0YXRzLnJhbmsodmFsdWVzLCB1dGlsLiQoYSkpIDogc3RhdHMucmFuayh2YWx1ZXMpLFxuICAgICAgcmIgPSBiID8gc3RhdHMucmFuayh2YWx1ZXMsIHV0aWwuJChiKSkgOiBzdGF0cy5yYW5rKGEpLFxuICAgICAgbiA9IHZhbHVlcy5sZW5ndGgsIGksIHMsIGQ7XG5cbiAgZm9yIChpPTAsIHM9MDsgaTxuOyArK2kpIHtcbiAgICBkID0gcmFbaV0gLSByYltpXTtcbiAgICBzICs9IGQgKiBkO1xuICB9XG5cbiAgcmV0dXJuIDEgLSA2KnMgLyAobiAqIChuKm4tMSkpO1xufTtcblxuLy8gQ29tcHV0ZSB0aGUgZGlzdGFuY2UgY29ycmVsYXRpb24gb2YgdHdvIGFycmF5cyBvZiBudW1iZXJzLlxuLy8gaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9EaXN0YW5jZV9jb3JyZWxhdGlvblxuc3RhdHMuY29yLmRpc3QgPSBmdW5jdGlvbih2YWx1ZXMsIGEsIGIpIHtcbiAgdmFyIFggPSBiID8gdmFsdWVzLm1hcCh1dGlsLiQoYSkpIDogdmFsdWVzLFxuICAgICAgWSA9IGIgPyB2YWx1ZXMubWFwKHV0aWwuJChiKSkgOiBhO1xuXG4gIHZhciBBID0gc3RhdHMuZGlzdC5tYXQoWCksXG4gICAgICBCID0gc3RhdHMuZGlzdC5tYXQoWSksXG4gICAgICBuID0gQS5sZW5ndGgsXG4gICAgICBpLCBhYSwgYmIsIGFiO1xuXG4gIGZvciAoaT0wLCBhYT0wLCBiYj0wLCBhYj0wOyBpPG47ICsraSkge1xuICAgIGFhICs9IEFbaV0qQVtpXTtcbiAgICBiYiArPSBCW2ldKkJbaV07XG4gICAgYWIgKz0gQVtpXSpCW2ldO1xuICB9XG5cbiAgcmV0dXJuIE1hdGguc3FydChhYiAvIE1hdGguc3FydChhYSpiYikpO1xufTtcblxuLy8gU2ltcGxlIGxpbmVhciByZWdyZXNzaW9uLlxuLy8gUmV0dXJucyBhIFwiZml0XCIgb2JqZWN0IHdpdGggc2xvcGUgKG0pLCBpbnRlcmNlcHQgKGIpLFxuLy8gciB2YWx1ZSAoUiksIGFuZCBzdW0tc3F1YXJlZCByZXNpZHVhbCBlcnJvciAocnNzKS5cbnN0YXRzLmxpbmVhclJlZ3Jlc3Npb24gPSBmdW5jdGlvbih2YWx1ZXMsIGEsIGIpIHtcbiAgdmFyIFggPSBiID8gdmFsdWVzLm1hcCh1dGlsLiQoYSkpIDogdmFsdWVzLFxuICAgICAgWSA9IGIgPyB2YWx1ZXMubWFwKHV0aWwuJChiKSkgOiBhLFxuICAgICAgbiA9IFgubGVuZ3RoLFxuICAgICAgeHkgPSBzdGF0cy5jb3ZhcmlhbmNlKFgsIFkpLCAvLyB3aWxsIHRocm93IGVyciBpZiB2YWxpZCB2YWxzIGRvbid0IGFsaWduXG4gICAgICBzeCA9IHN0YXRzLnN0ZGV2KFgpLFxuICAgICAgc3kgPSBzdGF0cy5zdGRldihZKSxcbiAgICAgIHNsb3BlID0geHkgLyAoc3gqc3gpLFxuICAgICAgaWNlcHQgPSBzdGF0cy5tZWFuKFkpIC0gc2xvcGUgKiBzdGF0cy5tZWFuKFgpLFxuICAgICAgZml0ID0ge3Nsb3BlOiBzbG9wZSwgaW50ZXJjZXB0OiBpY2VwdCwgUjogeHkgLyAoc3gqc3kpLCByc3M6IDB9LFxuICAgICAgcmVzLCBpO1xuXG4gIGZvciAoaT0wOyBpPG47ICsraSkge1xuICAgIGlmICh1dGlsLmlzVmFsaWQoWFtpXSkgJiYgdXRpbC5pc1ZhbGlkKFlbaV0pKSB7XG4gICAgICByZXMgPSAoc2xvcGUqWFtpXSArIGljZXB0KSAtIFlbaV07XG4gICAgICBmaXQucnNzICs9IHJlcyAqIHJlcztcbiAgICB9XG4gIH1cblxuICByZXR1cm4gZml0O1xufTtcblxuLy8gTmFtZXNwYWNlIGZvciB6LXRlc3RzXG5zdGF0cy56ID0ge307XG5cbi8vIENvbnN0cnVjdCBhIHotY29uZmlkZW5jZSBpbnRlcnZhbCBhdCBhIGdpdmVuIHNpZ25pZmljYW5jZSBsZXZlbFxuLy8gQXJndW1lbnRzIGFyZSBhbiBhcnJheSBhbmQgYW4gb3B0aW9uYWwgYWxwaGEgKGRlZmF1bHRzIHRvIDAuMDUpLlxuc3RhdHMuei5jaSA9IGZ1bmN0aW9uKGEsIGFscGhhKSB7XG4gIHZhciB6ID0gYWxwaGEgPyBnZW4ucmFuZG9tLm5vcm1hbCgwLCAxKS5pY2RmKDEtKGFscGhhLzIpKSA6IDEuOTYsXG4gICAgICBtdSA9IHN0YXRzLm1lYW4oYSksXG4gICAgICBTRSA9IHN0YXRzLnN0ZGV2KGEpIC8gTWF0aC5zcXJ0KHN0YXRzLmNvdW50LnZhbGlkKGEpKTtcbiAgcmV0dXJuIFttdSAtICh6KlNFKSwgbXUgKyAoeipTRSldO1xufTtcblxuLy8gUGVyZm9ybSBhIHotdGVzdCBvZiBtZWFucy4gUmV0dXJucyB0aGUgcC12YWx1ZS5cbi8vIEFzc3VtaW5nIHdlIGhhdmUgYSBsaXN0IG9mIHZhbHVlcywgYW5kIGEgbnVsbCBoeXBvdGhlc2lzLiBJZiBubyBudWxsXG4vLyBoeXBvdGhlc2lzLCBhc3N1bWUgb3VyIG51bGwgaHlwb3RoZXNpcyBpcyBtdT0wLlxuLy8gaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9aLXRlc3RcbnN0YXRzLnoudGVzdCA9IGZ1bmN0aW9uKGEsIGIpIHtcbiAgdmFyIG51bGxIID0gYiA/IGIgOiAwLFxuICAgICAgZ2F1c3NpYW4gPSBnZW4ucmFuZG9tLm5vcm1hbCgwLCAxKSxcbiAgICAgIG11ID0gc3RhdHMubWVhbihhKSxcbiAgICAgIFNFID0gc3RhdHMuc3RkZXYoYSkgLyBNYXRoLnNxcnQoc3RhdHMuY291bnQudmFsaWQoYSkpO1xuXG4gIGlmIChTRT09PTApIHtcbiAgICAvLyBUZXN0IG5vdCB3ZWxsIGRlZmluZWQgd2hlbiBzdGFuZGFyZCBlcnJvciBpcyAwLlxuICAgIHJldHVybiAobXUgLSBudWxsSCkgPT09IDAgPyAxIDogMDtcbiAgfVxuICAvLyBUd28tc2lkZWQsIHNvIHR3aWNlIHRoZSBvbmUtc2lkZWQgY2RmLlxuICB2YXIgeiA9IChtdSAtIG51bGxIKSAvIFNFO1xuICByZXR1cm4gMiAqIGdhdXNzaWFuLmNkZigtTWF0aC5hYnMoeikpO1xufTtcblxuLy8gUGVyZm9ybSBhIHR3byBzYW1wbGUgcGFpcmVkIHotdGVzdCBvZiBtZWFucy4gUmV0dXJucyB0aGUgcC12YWx1ZS5cbi8vIGh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvUGFpcmVkX2RpZmZlcmVuY2VfdGVzdFxuc3RhdHMuei5wYWlyZWRUZXN0ID0gZnVuY3Rpb24odmFsdWVzLCBhLCBiKSB7XG4gIHZhciBYID0gYiA/IHZhbHVlcy5tYXAodXRpbC4kKGEpKSA6IHZhbHVlcyxcbiAgICAgIFkgPSBiID8gdmFsdWVzLm1hcCh1dGlsLiQoYikpIDogYSxcbiAgICAgIG4xID0gc3RhdHMuY291bnQoWCksXG4gICAgICBuMiA9IHN0YXRzLmNvdW50KFkpLFxuICAgICAgZGlmZnMgPSBBcnJheSgpLCBpO1xuXG4gIGlmIChuMSAhPT0gbjIpIHtcbiAgICB0aHJvdyBFcnJvcignQXJyYXkgbGVuZ3RocyBtdXN0IG1hdGNoLicpO1xuICB9XG4gIGZvciAoaT0wOyBpPG4xOyArK2kpIHtcbiAgICAvLyBPbmx5IHZhbGlkIGRpZmZlcmVuY2VzIHNob3VsZCBjb250cmlidXRlIHRvIHRoZSB0ZXN0IHN0YXRpc3RpY1xuICAgIGlmICh1dGlsLmlzVmFsaWQoWFtpXSkgJiYgdXRpbC5pc1ZhbGlkKFlbaV0pKSB7XG4gICAgICBkaWZmcy5wdXNoKFhbaV0gLSBZW2ldKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHN0YXRzLnoudGVzdChkaWZmcyk7XG59O1xuXG4vLyBQZXJmb3JtIGEgdHdvIHNhbXBsZSB6LXRlc3Qgb2YgbWVhbnMuIFJldHVybnMgdGhlIHAtdmFsdWUuXG4vLyBodHRwOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL1otdGVzdFxuc3RhdHMuei50d29TYW1wbGVUZXN0ID0gZnVuY3Rpb24odmFsdWVzLCBhLCBiKSB7XG4gIHZhciBYID0gYiA/IHZhbHVlcy5tYXAodXRpbC4kKGEpKSA6IHZhbHVlcyxcbiAgICAgIFkgPSBiID8gdmFsdWVzLm1hcCh1dGlsLiQoYikpIDogYSxcbiAgICAgIG4xID0gc3RhdHMuY291bnQudmFsaWQoWCksXG4gICAgICBuMiA9IHN0YXRzLmNvdW50LnZhbGlkKFkpLFxuICAgICAgZ2F1c3NpYW4gPSBnZW4ucmFuZG9tLm5vcm1hbCgwLCAxKSxcbiAgICAgIG1lYW5EaWZmID0gc3RhdHMubWVhbihYKSAtIHN0YXRzLm1lYW4oWSksXG4gICAgICBTRSA9IE1hdGguc3FydChzdGF0cy52YXJpYW5jZShYKS9uMSArIHN0YXRzLnZhcmlhbmNlKFkpL24yKTtcblxuICBpZiAoU0U9PT0wKSB7XG4gICAgLy8gTm90IHdlbGwgZGVmaW5lZCB3aGVuIHBvb2xlZCBzdGFuZGFyZCBlcnJvciBpcyAwLlxuICAgIHJldHVybiBtZWFuRGlmZj09PTAgPyAxIDogMDtcbiAgfVxuICAvLyBUd28tdGFpbGVkLCBzbyB0d2ljZSB0aGUgb25lLXNpZGVkIGNkZi5cbiAgdmFyIHogPSBtZWFuRGlmZiAvIFNFO1xuICByZXR1cm4gMiAqIGdhdXNzaWFuLmNkZigtTWF0aC5hYnMoeikpO1xufTtcblxuLy8gQ29uc3RydWN0IGEgbWVhbi1jZW50ZXJlZCBkaXN0YW5jZSBtYXRyaXggZm9yIGFuIGFycmF5IG9mIG51bWJlcnMuXG5zdGF0cy5kaXN0Lm1hdCA9IGZ1bmN0aW9uKFgpIHtcbiAgdmFyIG4gPSBYLmxlbmd0aCxcbiAgICAgIG0gPSBuKm4sXG4gICAgICBBID0gQXJyYXkobSksXG4gICAgICBSID0gZ2VuLnplcm9zKG4pLFxuICAgICAgTSA9IDAsIHYsIGksIGo7XG5cbiAgZm9yIChpPTA7IGk8bjsgKytpKSB7XG4gICAgQVtpKm4raV0gPSAwO1xuICAgIGZvciAoaj1pKzE7IGo8bjsgKytqKSB7XG4gICAgICBBW2kqbitqXSA9ICh2ID0gTWF0aC5hYnMoWFtpXSAtIFhbal0pKTtcbiAgICAgIEFbaipuK2ldID0gdjtcbiAgICAgIFJbaV0gKz0gdjtcbiAgICAgIFJbal0gKz0gdjtcbiAgICB9XG4gIH1cblxuICBmb3IgKGk9MDsgaTxuOyArK2kpIHtcbiAgICBNICs9IFJbaV07XG4gICAgUltpXSAvPSBuO1xuICB9XG4gIE0gLz0gbTtcblxuICBmb3IgKGk9MDsgaTxuOyArK2kpIHtcbiAgICBmb3IgKGo9aTsgajxuOyArK2opIHtcbiAgICAgIEFbaSpuK2pdICs9IE0gLSBSW2ldIC0gUltqXTtcbiAgICAgIEFbaipuK2ldID0gQVtpKm4ral07XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIEE7XG59O1xuXG4vLyBDb21wdXRlIHRoZSBTaGFubm9uIGVudHJvcHkgKGxvZyBiYXNlIDIpIG9mIGFuIGFycmF5IG9mIGNvdW50cy5cbnN0YXRzLmVudHJvcHkgPSBmdW5jdGlvbihjb3VudHMsIGYpIHtcbiAgZiA9IHV0aWwuJChmKTtcbiAgdmFyIGksIHAsIHMgPSAwLCBIID0gMCwgbiA9IGNvdW50cy5sZW5ndGg7XG4gIGZvciAoaT0wOyBpPG47ICsraSkge1xuICAgIHMgKz0gKGYgPyBmKGNvdW50c1tpXSkgOiBjb3VudHNbaV0pO1xuICB9XG4gIGlmIChzID09PSAwKSByZXR1cm4gMDtcbiAgZm9yIChpPTA7IGk8bjsgKytpKSB7XG4gICAgcCA9IChmID8gZihjb3VudHNbaV0pIDogY291bnRzW2ldKSAvIHM7XG4gICAgaWYgKHApIEggKz0gcCAqIE1hdGgubG9nKHApO1xuICB9XG4gIHJldHVybiAtSCAvIE1hdGguTE4yO1xufTtcblxuLy8gQ29tcHV0ZSB0aGUgbXV0dWFsIGluZm9ybWF0aW9uIGJldHdlZW4gdHdvIGRpc2NyZXRlIHZhcmlhYmxlcy5cbi8vIFJldHVybnMgYW4gYXJyYXkgb2YgdGhlIGZvcm0gW01JLCBNSV9kaXN0YW5jZV1cbi8vIE1JX2Rpc3RhbmNlIGlzIGRlZmluZWQgYXMgMSAtIEkoYSxiKSAvIEgoYSxiKS5cbi8vIGh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvTXV0dWFsX2luZm9ybWF0aW9uXG5zdGF0cy5tdXR1YWwgPSBmdW5jdGlvbih2YWx1ZXMsIGEsIGIsIGNvdW50cykge1xuICB2YXIgeCA9IGNvdW50cyA/IHZhbHVlcy5tYXAodXRpbC4kKGEpKSA6IHZhbHVlcyxcbiAgICAgIHkgPSBjb3VudHMgPyB2YWx1ZXMubWFwKHV0aWwuJChiKSkgOiBhLFxuICAgICAgeiA9IGNvdW50cyA/IHZhbHVlcy5tYXAodXRpbC4kKGNvdW50cykpIDogYjtcblxuICB2YXIgcHggPSB7fSxcbiAgICAgIHB5ID0ge30sXG4gICAgICBuID0gei5sZW5ndGgsXG4gICAgICBzID0gMCwgSSA9IDAsIEggPSAwLCBwLCB0LCBpO1xuXG4gIGZvciAoaT0wOyBpPG47ICsraSkge1xuICAgIHB4W3hbaV1dID0gMDtcbiAgICBweVt5W2ldXSA9IDA7XG4gIH1cblxuICBmb3IgKGk9MDsgaTxuOyArK2kpIHtcbiAgICBweFt4W2ldXSArPSB6W2ldO1xuICAgIHB5W3lbaV1dICs9IHpbaV07XG4gICAgcyArPSB6W2ldO1xuICB9XG5cbiAgdCA9IDEgLyAocyAqIE1hdGguTE4yKTtcbiAgZm9yIChpPTA7IGk8bjsgKytpKSB7XG4gICAgaWYgKHpbaV0gPT09IDApIGNvbnRpbnVlO1xuICAgIHAgPSAocyAqIHpbaV0pIC8gKHB4W3hbaV1dICogcHlbeVtpXV0pO1xuICAgIEkgKz0geltpXSAqIHQgKiBNYXRoLmxvZyhwKTtcbiAgICBIICs9IHpbaV0gKiB0ICogTWF0aC5sb2coeltpXS9zKTtcbiAgfVxuXG4gIHJldHVybiBbSSwgMSArIEkvSF07XG59O1xuXG4vLyBDb21wdXRlIHRoZSBtdXR1YWwgaW5mb3JtYXRpb24gYmV0d2VlbiB0d28gZGlzY3JldGUgdmFyaWFibGVzLlxuc3RhdHMubXV0dWFsLmluZm8gPSBmdW5jdGlvbih2YWx1ZXMsIGEsIGIsIGNvdW50cykge1xuICByZXR1cm4gc3RhdHMubXV0dWFsKHZhbHVlcywgYSwgYiwgY291bnRzKVswXTtcbn07XG5cbi8vIENvbXB1dGUgdGhlIG11dHVhbCBpbmZvcm1hdGlvbiBkaXN0YW5jZSBiZXR3ZWVuIHR3byBkaXNjcmV0ZSB2YXJpYWJsZXMuXG4vLyBNSV9kaXN0YW5jZSBpcyBkZWZpbmVkIGFzIDEgLSBJKGEsYikgLyBIKGEsYikuXG5zdGF0cy5tdXR1YWwuZGlzdCA9IGZ1bmN0aW9uKHZhbHVlcywgYSwgYiwgY291bnRzKSB7XG4gIHJldHVybiBzdGF0cy5tdXR1YWwodmFsdWVzLCBhLCBiLCBjb3VudHMpWzFdO1xufTtcblxuLy8gQ29tcHV0ZSBhIHByb2ZpbGUgb2Ygc3VtbWFyeSBzdGF0aXN0aWNzIGZvciBhIHZhcmlhYmxlLlxuc3RhdHMucHJvZmlsZSA9IGZ1bmN0aW9uKHZhbHVlcywgZikge1xuICB2YXIgbWVhbiA9IDAsXG4gICAgICB2YWxpZCA9IDAsXG4gICAgICBtaXNzaW5nID0gMCxcbiAgICAgIGRpc3RpbmN0ID0gMCxcbiAgICAgIG1pbiA9IG51bGwsXG4gICAgICBtYXggPSBudWxsLFxuICAgICAgTTIgPSAwLFxuICAgICAgdmFscyA9IFtdLFxuICAgICAgdSA9IHt9LCBkZWx0YSwgc2QsIGksIHYsIHg7XG5cbiAgLy8gY29tcHV0ZSBzdW1tYXJ5IHN0YXRzXG4gIGZvciAoaT0wOyBpPHZhbHVlcy5sZW5ndGg7ICsraSkge1xuICAgIHYgPSBmID8gZih2YWx1ZXNbaV0pIDogdmFsdWVzW2ldO1xuXG4gICAgLy8gdXBkYXRlIHVuaXF1ZSB2YWx1ZXNcbiAgICB1W3ZdID0gKHYgaW4gdSkgPyB1W3ZdICsgMSA6IChkaXN0aW5jdCArPSAxLCAxKTtcblxuICAgIGlmICh2ID09IG51bGwpIHtcbiAgICAgICsrbWlzc2luZztcbiAgICB9IGVsc2UgaWYgKHV0aWwuaXNWYWxpZCh2KSkge1xuICAgICAgLy8gdXBkYXRlIHN0YXRzXG4gICAgICB4ID0gKHR5cGVvZiB2ID09PSAnc3RyaW5nJykgPyB2Lmxlbmd0aCA6IHY7XG4gICAgICBpZiAobWluPT09bnVsbCB8fCB4IDwgbWluKSBtaW4gPSB4O1xuICAgICAgaWYgKG1heD09PW51bGwgfHwgeCA+IG1heCkgbWF4ID0geDtcbiAgICAgIGRlbHRhID0geCAtIG1lYW47XG4gICAgICBtZWFuID0gbWVhbiArIGRlbHRhIC8gKCsrdmFsaWQpO1xuICAgICAgTTIgPSBNMiArIGRlbHRhICogKHggLSBtZWFuKTtcbiAgICAgIHZhbHMucHVzaCh4KTtcbiAgICB9XG4gIH1cbiAgTTIgPSBNMiAvICh2YWxpZCAtIDEpO1xuICBzZCA9IE1hdGguc3FydChNMik7XG5cbiAgLy8gc29ydCB2YWx1ZXMgZm9yIG1lZGlhbiBhbmQgaXFyXG4gIHZhbHMuc29ydCh1dGlsLmNtcCk7XG5cbiAgcmV0dXJuIHtcbiAgICB0eXBlOiAgICAgdHlwZSh2YWx1ZXMsIGYpLFxuICAgIHVuaXF1ZTogICB1LFxuICAgIGNvdW50OiAgICB2YWx1ZXMubGVuZ3RoLFxuICAgIHZhbGlkOiAgICB2YWxpZCxcbiAgICBtaXNzaW5nOiAgbWlzc2luZyxcbiAgICBkaXN0aW5jdDogZGlzdGluY3QsXG4gICAgbWluOiAgICAgIG1pbixcbiAgICBtYXg6ICAgICAgbWF4LFxuICAgIG1lYW46ICAgICBtZWFuLFxuICAgIHN0ZGV2OiAgICBzZCxcbiAgICBtZWRpYW46ICAgKHYgPSBzdGF0cy5xdWFudGlsZSh2YWxzLCAwLjUpKSxcbiAgICBxMTogICAgICAgc3RhdHMucXVhbnRpbGUodmFscywgMC4yNSksXG4gICAgcTM6ICAgICAgIHN0YXRzLnF1YW50aWxlKHZhbHMsIDAuNzUpLFxuICAgIG1vZGVza2V3OiBzZCA9PT0gMCA/IDAgOiAobWVhbiAtIHYpIC8gc2RcbiAgfTtcbn07XG5cbi8vIENvbXB1dGUgcHJvZmlsZXMgZm9yIGFsbCB2YXJpYWJsZXMgaW4gYSBkYXRhIHNldC5cbnN0YXRzLnN1bW1hcnkgPSBmdW5jdGlvbihkYXRhLCBmaWVsZHMpIHtcbiAgZmllbGRzID0gZmllbGRzIHx8IHV0aWwua2V5cyhkYXRhWzBdKTtcbiAgdmFyIHMgPSBmaWVsZHMubWFwKGZ1bmN0aW9uKGYpIHtcbiAgICB2YXIgcCA9IHN0YXRzLnByb2ZpbGUoZGF0YSwgdXRpbC4kKGYpKTtcbiAgICByZXR1cm4gKHAuZmllbGQgPSBmLCBwKTtcbiAgfSk7XG4gIHJldHVybiAocy5fX3N1bW1hcnlfXyA9IHRydWUsIHMpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBzdGF0cztcbiIsInZhciBkM190aW1lID0gcmVxdWlyZSgnZDMtdGltZScpO1xuXG52YXIgdGVtcERhdGUgPSBuZXcgRGF0ZSgpLFxuICAgIGJhc2VEYXRlID0gbmV3IERhdGUoMCwgMCwgMSkuc2V0RnVsbFllYXIoMCksIC8vIEphbiAxLCAwIEFEXG4gICAgdXRjQmFzZURhdGUgPSBuZXcgRGF0ZShEYXRlLlVUQygwLCAwLCAxKSkuc2V0VVRDRnVsbFllYXIoMCk7XG5cbmZ1bmN0aW9uIGRhdGUoZCkge1xuICByZXR1cm4gKHRlbXBEYXRlLnNldFRpbWUoK2QpLCB0ZW1wRGF0ZSk7XG59XG5cbi8vIGNyZWF0ZSBhIHRpbWUgdW5pdCBlbnRyeVxuZnVuY3Rpb24gZW50cnkodHlwZSwgZGF0ZSwgdW5pdCwgc3RlcCwgbWluLCBtYXgpIHtcbiAgdmFyIGUgPSB7XG4gICAgdHlwZTogdHlwZSxcbiAgICBkYXRlOiBkYXRlLFxuICAgIHVuaXQ6IHVuaXRcbiAgfTtcbiAgaWYgKHN0ZXApIHtcbiAgICBlLnN0ZXAgPSBzdGVwO1xuICB9IGVsc2Uge1xuICAgIGUubWluc3RlcCA9IDE7XG4gIH1cbiAgaWYgKG1pbiAhPSBudWxsKSBlLm1pbiA9IG1pbjtcbiAgaWYgKG1heCAhPSBudWxsKSBlLm1heCA9IG1heDtcbiAgcmV0dXJuIGU7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZSh0eXBlLCB1bml0LCBiYXNlLCBzdGVwLCBtaW4sIG1heCkge1xuICByZXR1cm4gZW50cnkodHlwZSxcbiAgICBmdW5jdGlvbihkKSB7IHJldHVybiB1bml0Lm9mZnNldChiYXNlLCBkKTsgfSxcbiAgICBmdW5jdGlvbihkKSB7IHJldHVybiB1bml0LmNvdW50KGJhc2UsIGQpOyB9LFxuICAgIHN0ZXAsIG1pbiwgbWF4KTtcbn1cblxudmFyIGxvY2FsZSA9IFtcbiAgY3JlYXRlKCdzZWNvbmQnLCBkM190aW1lLnNlY29uZCwgYmFzZURhdGUpLFxuICBjcmVhdGUoJ21pbnV0ZScsIGQzX3RpbWUubWludXRlLCBiYXNlRGF0ZSksXG4gIGNyZWF0ZSgnaG91cicsICAgZDNfdGltZS5ob3VyLCAgIGJhc2VEYXRlKSxcbiAgY3JlYXRlKCdkYXknLCAgICBkM190aW1lLmRheSwgICAgYmFzZURhdGUsIFsxLCA3XSksXG4gIGNyZWF0ZSgnbW9udGgnLCAgZDNfdGltZS5tb250aCwgIGJhc2VEYXRlLCBbMSwgMywgNl0pLFxuICBjcmVhdGUoJ3llYXInLCAgIGQzX3RpbWUueWVhciwgICBiYXNlRGF0ZSksXG5cbiAgLy8gcGVyaW9kaWMgdW5pdHNcbiAgZW50cnkoJ3NlY29uZHMnLFxuICAgIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIG5ldyBEYXRlKDE5NzAsIDAsIDEsIDAsIDAsIGQpOyB9LFxuICAgIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGRhdGUoZCkuZ2V0U2Vjb25kcygpOyB9LFxuICAgIG51bGwsIDAsIDU5XG4gICksXG4gIGVudHJ5KCdtaW51dGVzJyxcbiAgICBmdW5jdGlvbihkKSB7IHJldHVybiBuZXcgRGF0ZSgxOTcwLCAwLCAxLCAwLCBkKTsgfSxcbiAgICBmdW5jdGlvbihkKSB7IHJldHVybiBkYXRlKGQpLmdldE1pbnV0ZXMoKTsgfSxcbiAgICBudWxsLCAwLCA1OVxuICApLFxuICBlbnRyeSgnaG91cnMnLFxuICAgIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIG5ldyBEYXRlKDE5NzAsIDAsIDEsIGQpOyB9LFxuICAgIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGRhdGUoZCkuZ2V0SG91cnMoKTsgfSxcbiAgICBudWxsLCAwLCAyM1xuICApLFxuICBlbnRyeSgnd2Vla2RheXMnLFxuICAgIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIG5ldyBEYXRlKDE5NzAsIDAsIDQrZCk7IH0sXG4gICAgZnVuY3Rpb24oZCkgeyByZXR1cm4gZGF0ZShkKS5nZXREYXkoKTsgfSxcbiAgICBbMV0sIDAsIDZcbiAgKSxcbiAgZW50cnkoJ2RhdGVzJyxcbiAgICBmdW5jdGlvbihkKSB7IHJldHVybiBuZXcgRGF0ZSgxOTcwLCAwLCBkKTsgfSxcbiAgICBmdW5jdGlvbihkKSB7IHJldHVybiBkYXRlKGQpLmdldERhdGUoKTsgfSxcbiAgICBbMV0sIDEsIDMxXG4gICksXG4gIGVudHJ5KCdtb250aHMnLFxuICAgIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIG5ldyBEYXRlKDE5NzAsIGQgJSAxMiwgMSk7IH0sXG4gICAgZnVuY3Rpb24oZCkgeyByZXR1cm4gZGF0ZShkKS5nZXRNb250aCgpOyB9LFxuICAgIFsxXSwgMCwgMTFcbiAgKVxuXTtcblxudmFyIHV0YyA9IFtcbiAgY3JlYXRlKCdzZWNvbmQnLCBkM190aW1lLnV0Y1NlY29uZCwgdXRjQmFzZURhdGUpLFxuICBjcmVhdGUoJ21pbnV0ZScsIGQzX3RpbWUudXRjTWludXRlLCB1dGNCYXNlRGF0ZSksXG4gIGNyZWF0ZSgnaG91cicsICAgZDNfdGltZS51dGNIb3VyLCAgIHV0Y0Jhc2VEYXRlKSxcbiAgY3JlYXRlKCdkYXknLCAgICBkM190aW1lLnV0Y0RheSwgICAgdXRjQmFzZURhdGUsIFsxLCA3XSksXG4gIGNyZWF0ZSgnbW9udGgnLCAgZDNfdGltZS51dGNNb250aCwgIHV0Y0Jhc2VEYXRlLCBbMSwgMywgNl0pLFxuICBjcmVhdGUoJ3llYXInLCAgIGQzX3RpbWUudXRjWWVhciwgICB1dGNCYXNlRGF0ZSksXG5cbiAgLy8gcGVyaW9kaWMgdW5pdHNcbiAgZW50cnkoJ3NlY29uZHMnLFxuICAgIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIG5ldyBEYXRlKERhdGUuVVRDKDE5NzAsIDAsIDEsIDAsIDAsIGQpKTsgfSxcbiAgICBmdW5jdGlvbihkKSB7IHJldHVybiBkYXRlKGQpLmdldFVUQ1NlY29uZHMoKTsgfSxcbiAgICBudWxsLCAwLCA1OVxuICApLFxuICBlbnRyeSgnbWludXRlcycsXG4gICAgZnVuY3Rpb24oZCkgeyByZXR1cm4gbmV3IERhdGUoRGF0ZS5VVEMoMTk3MCwgMCwgMSwgMCwgZCkpOyB9LFxuICAgIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGRhdGUoZCkuZ2V0VVRDTWludXRlcygpOyB9LFxuICAgIG51bGwsIDAsIDU5XG4gICksXG4gIGVudHJ5KCdob3VycycsXG4gICAgZnVuY3Rpb24oZCkgeyByZXR1cm4gbmV3IERhdGUoRGF0ZS5VVEMoMTk3MCwgMCwgMSwgZCkpOyB9LFxuICAgIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGRhdGUoZCkuZ2V0VVRDSG91cnMoKTsgfSxcbiAgICBudWxsLCAwLCAyM1xuICApLFxuICBlbnRyeSgnd2Vla2RheXMnLFxuICAgIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIG5ldyBEYXRlKERhdGUuVVRDKDE5NzAsIDAsIDQrZCkpOyB9LFxuICAgIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGRhdGUoZCkuZ2V0VVRDRGF5KCk7IH0sXG4gICAgWzFdLCAwLCA2XG4gICksXG4gIGVudHJ5KCdkYXRlcycsXG4gICAgZnVuY3Rpb24oZCkgeyByZXR1cm4gbmV3IERhdGUoRGF0ZS5VVEMoMTk3MCwgMCwgZCkpOyB9LFxuICAgIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGRhdGUoZCkuZ2V0VVRDRGF0ZSgpOyB9LFxuICAgIFsxXSwgMSwgMzFcbiAgKSxcbiAgZW50cnkoJ21vbnRocycsXG4gICAgZnVuY3Rpb24oZCkgeyByZXR1cm4gbmV3IERhdGUoRGF0ZS5VVEMoMTk3MCwgZCAlIDEyLCAxKSk7IH0sXG4gICAgZnVuY3Rpb24oZCkgeyByZXR1cm4gZGF0ZShkKS5nZXRVVENNb250aCgpOyB9LFxuICAgIFsxXSwgMCwgMTFcbiAgKVxuXTtcblxudmFyIFNURVBTID0gW1xuICBbMzE1MzZlNiwgNV0sICAvLyAxLXllYXJcbiAgWzc3NzZlNiwgNF0sICAgLy8gMy1tb250aFxuICBbMjU5MmU2LCA0XSwgICAvLyAxLW1vbnRoXG4gIFsxMjA5NmU1LCAzXSwgIC8vIDItd2Vla1xuICBbNjA0OGU1LCAzXSwgICAvLyAxLXdlZWtcbiAgWzE3MjhlNSwgM10sICAgLy8gMi1kYXlcbiAgWzg2NGU1LCAzXSwgICAgLy8gMS1kYXlcbiAgWzQzMmU1LCAyXSwgICAgLy8gMTItaG91clxuICBbMjE2ZTUsIDJdLCAgICAvLyA2LWhvdXJcbiAgWzEwOGU1LCAyXSwgICAgLy8gMy1ob3VyXG4gIFszNmU1LCAyXSwgICAgIC8vIDEtaG91clxuICBbMThlNSwgMV0sICAgICAvLyAzMC1taW51dGVcbiAgWzllNSwgMV0sICAgICAgLy8gMTUtbWludXRlXG4gIFszZTUsIDFdLCAgICAgIC8vIDUtbWludXRlXG4gIFs2ZTQsIDFdLCAgICAgIC8vIDEtbWludXRlXG4gIFszZTQsIDBdLCAgICAgIC8vIDMwLXNlY29uZFxuICBbMTVlMywgMF0sICAgICAvLyAxNS1zZWNvbmRcbiAgWzVlMywgMF0sICAgICAgLy8gNS1zZWNvbmRcbiAgWzFlMywgMF0gICAgICAgLy8gMS1zZWNvbmRcbl07XG5cbmZ1bmN0aW9uIGZpbmQodW5pdHMsIHNwYW4sIG1pbmIsIG1heGIpIHtcbiAgdmFyIHN0ZXAgPSBTVEVQU1swXSwgaSwgbiwgYmlucztcblxuICBmb3IgKGk9MSwgbj1TVEVQUy5sZW5ndGg7IGk8bjsgKytpKSB7XG4gICAgc3RlcCA9IFNURVBTW2ldO1xuICAgIGlmIChzcGFuID4gc3RlcFswXSkge1xuICAgICAgYmlucyA9IHNwYW4gLyBzdGVwWzBdO1xuICAgICAgaWYgKGJpbnMgPiBtYXhiKSB7XG4gICAgICAgIHJldHVybiB1bml0c1tTVEVQU1tpLTFdWzFdXTtcbiAgICAgIH1cbiAgICAgIGlmIChiaW5zID49IG1pbmIpIHtcbiAgICAgICAgcmV0dXJuIHVuaXRzW3N0ZXBbMV1dO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gdW5pdHNbU1RFUFNbbi0xXVsxXV07XG59XG5cbmZ1bmN0aW9uIHRvVW5pdE1hcCh1bml0cykge1xuICB2YXIgbWFwID0ge30sIGksIG47XG4gIGZvciAoaT0wLCBuPXVuaXRzLmxlbmd0aDsgaTxuOyArK2kpIHtcbiAgICBtYXBbdW5pdHNbaV0udHlwZV0gPSB1bml0c1tpXTtcbiAgfVxuICBtYXAuZmluZCA9IGZ1bmN0aW9uKHNwYW4sIG1pbmIsIG1heGIpIHtcbiAgICByZXR1cm4gZmluZCh1bml0cywgc3BhbiwgbWluYiwgbWF4Yik7XG4gIH07XG4gIHJldHVybiBtYXA7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gdG9Vbml0TWFwKGxvY2FsZSk7XG5tb2R1bGUuZXhwb3J0cy51dGMgPSB0b1VuaXRNYXAodXRjKTtcbiIsInZhciBidWZmZXIgPSByZXF1aXJlKCdidWZmZXInKSxcbiAgICB0aW1lID0gcmVxdWlyZSgnLi90aW1lJyksXG4gICAgdXRjID0gdGltZS51dGM7XG5cbnZhciB1ID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxuLy8gdXRpbGl0eSBmdW5jdGlvbnNcblxudmFyIEZOQU1FID0gJ19fbmFtZV9fJztcblxudS5uYW1lZGZ1bmMgPSBmdW5jdGlvbihuYW1lLCBmKSB7IHJldHVybiAoZltGTkFNRV0gPSBuYW1lLCBmKTsgfTtcblxudS5uYW1lID0gZnVuY3Rpb24oZikgeyByZXR1cm4gZj09bnVsbCA/IG51bGwgOiBmW0ZOQU1FXTsgfTtcblxudS5pZGVudGl0eSA9IGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHg7IH07XG5cbnUudHJ1ZSA9IHUubmFtZWRmdW5jKCd0cnVlJywgZnVuY3Rpb24oKSB7IHJldHVybiB0cnVlOyB9KTtcblxudS5mYWxzZSA9IHUubmFtZWRmdW5jKCdmYWxzZScsIGZ1bmN0aW9uKCkgeyByZXR1cm4gZmFsc2U7IH0pO1xuXG51LmR1cGxpY2F0ZSA9IGZ1bmN0aW9uKG9iaikge1xuICByZXR1cm4gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShvYmopKTtcbn07XG5cbnUuZXF1YWwgPSBmdW5jdGlvbihhLCBiKSB7XG4gIHJldHVybiBKU09OLnN0cmluZ2lmeShhKSA9PT0gSlNPTi5zdHJpbmdpZnkoYik7XG59O1xuXG51LmV4dGVuZCA9IGZ1bmN0aW9uKG9iaikge1xuICBmb3IgKHZhciB4LCBuYW1lLCBpPTEsIGxlbj1hcmd1bWVudHMubGVuZ3RoOyBpPGxlbjsgKytpKSB7XG4gICAgeCA9IGFyZ3VtZW50c1tpXTtcbiAgICBmb3IgKG5hbWUgaW4geCkgeyBvYmpbbmFtZV0gPSB4W25hbWVdOyB9XG4gIH1cbiAgcmV0dXJuIG9iajtcbn07XG5cbnUubGVuZ3RoID0gZnVuY3Rpb24oeCkge1xuICByZXR1cm4geCAhPSBudWxsICYmIHgubGVuZ3RoICE9IG51bGwgPyB4Lmxlbmd0aCA6IG51bGw7XG59O1xuXG51LmtleXMgPSBmdW5jdGlvbih4KSB7XG4gIHZhciBrZXlzID0gW10sIGs7XG4gIGZvciAoayBpbiB4KSBrZXlzLnB1c2goayk7XG4gIHJldHVybiBrZXlzO1xufTtcblxudS52YWxzID0gZnVuY3Rpb24oeCkge1xuICB2YXIgdmFscyA9IFtdLCBrO1xuICBmb3IgKGsgaW4geCkgdmFscy5wdXNoKHhba10pO1xuICByZXR1cm4gdmFscztcbn07XG5cbnUudG9NYXAgPSBmdW5jdGlvbihsaXN0LCBmKSB7XG4gIHJldHVybiAoZiA9IHUuJChmKSkgP1xuICAgIGxpc3QucmVkdWNlKGZ1bmN0aW9uKG9iaiwgeCkgeyByZXR1cm4gKG9ialtmKHgpXSA9IDEsIG9iaik7IH0sIHt9KSA6XG4gICAgbGlzdC5yZWR1Y2UoZnVuY3Rpb24ob2JqLCB4KSB7IHJldHVybiAob2JqW3hdID0gMSwgb2JqKTsgfSwge30pO1xufTtcblxudS5rZXlzdHIgPSBmdW5jdGlvbih2YWx1ZXMpIHtcbiAgLy8gdXNlIHRvIGVuc3VyZSBjb25zaXN0ZW50IGtleSBnZW5lcmF0aW9uIGFjcm9zcyBtb2R1bGVzXG4gIHZhciBuID0gdmFsdWVzLmxlbmd0aDtcbiAgaWYgKCFuKSByZXR1cm4gJyc7XG4gIGZvciAodmFyIHM9U3RyaW5nKHZhbHVlc1swXSksIGk9MTsgaTxuOyArK2kpIHtcbiAgICBzICs9ICd8JyArIFN0cmluZyh2YWx1ZXNbaV0pO1xuICB9XG4gIHJldHVybiBzO1xufTtcblxuLy8gdHlwZSBjaGVja2luZyBmdW5jdGlvbnNcblxudmFyIHRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcblxudS5pc09iamVjdCA9IGZ1bmN0aW9uKG9iaikge1xuICByZXR1cm4gb2JqID09PSBPYmplY3Qob2JqKTtcbn07XG5cbnUuaXNGdW5jdGlvbiA9IGZ1bmN0aW9uKG9iaikge1xuICByZXR1cm4gdG9TdHJpbmcuY2FsbChvYmopID09PSAnW29iamVjdCBGdW5jdGlvbl0nO1xufTtcblxudS5pc1N0cmluZyA9IGZ1bmN0aW9uKG9iaikge1xuICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJyB8fCB0b1N0cmluZy5jYWxsKG9iaikgPT09ICdbb2JqZWN0IFN0cmluZ10nO1xufTtcblxudS5pc0FycmF5ID0gQXJyYXkuaXNBcnJheSB8fCBmdW5jdGlvbihvYmopIHtcbiAgcmV0dXJuIHRvU3RyaW5nLmNhbGwob2JqKSA9PT0gJ1tvYmplY3QgQXJyYXldJztcbn07XG5cbnUuaXNOdW1iZXIgPSBmdW5jdGlvbihvYmopIHtcbiAgcmV0dXJuIHR5cGVvZiBvYmogPT09ICdudW1iZXInIHx8IHRvU3RyaW5nLmNhbGwob2JqKSA9PT0gJ1tvYmplY3QgTnVtYmVyXSc7XG59O1xuXG51LmlzQm9vbGVhbiA9IGZ1bmN0aW9uKG9iaikge1xuICByZXR1cm4gb2JqID09PSB0cnVlIHx8IG9iaiA9PT0gZmFsc2UgfHwgdG9TdHJpbmcuY2FsbChvYmopID09ICdbb2JqZWN0IEJvb2xlYW5dJztcbn07XG5cbnUuaXNEYXRlID0gZnVuY3Rpb24ob2JqKSB7XG4gIHJldHVybiB0b1N0cmluZy5jYWxsKG9iaikgPT09ICdbb2JqZWN0IERhdGVdJztcbn07XG5cbnUuaXNWYWxpZCA9IGZ1bmN0aW9uKG9iaikge1xuICByZXR1cm4gb2JqICE9IG51bGwgJiYgb2JqID09PSBvYmo7XG59O1xuXG51LmlzQnVmZmVyID0gKGJ1ZmZlci5CdWZmZXIgJiYgYnVmZmVyLkJ1ZmZlci5pc0J1ZmZlcikgfHwgdS5mYWxzZTtcblxuLy8gdHlwZSBjb2VyY2lvbiBmdW5jdGlvbnNcblxudS5udW1iZXIgPSBmdW5jdGlvbihzKSB7XG4gIHJldHVybiBzID09IG51bGwgfHwgcyA9PT0gJycgPyBudWxsIDogK3M7XG59O1xuXG51LmJvb2xlYW4gPSBmdW5jdGlvbihzKSB7XG4gIHJldHVybiBzID09IG51bGwgfHwgcyA9PT0gJycgPyBudWxsIDogcz09PSdmYWxzZScgPyBmYWxzZSA6ICEhcztcbn07XG5cbi8vIHBhcnNlIGEgZGF0ZSB3aXRoIG9wdGlvbmFsIGQzLnRpbWUtZm9ybWF0IGZvcm1hdFxudS5kYXRlID0gZnVuY3Rpb24ocywgZm9ybWF0KSB7XG4gIHZhciBkID0gZm9ybWF0ID8gZm9ybWF0IDogRGF0ZTtcbiAgcmV0dXJuIHMgPT0gbnVsbCB8fCBzID09PSAnJyA/IG51bGwgOiBkLnBhcnNlKHMpO1xufTtcblxudS5hcnJheSA9IGZ1bmN0aW9uKHgpIHtcbiAgcmV0dXJuIHggIT0gbnVsbCA/ICh1LmlzQXJyYXkoeCkgPyB4IDogW3hdKSA6IFtdO1xufTtcblxudS5zdHIgPSBmdW5jdGlvbih4KSB7XG4gIHJldHVybiB1LmlzQXJyYXkoeCkgPyAnWycgKyB4Lm1hcCh1LnN0cikgKyAnXSdcbiAgICA6IHUuaXNPYmplY3QoeCkgPyBKU09OLnN0cmluZ2lmeSh4KVxuICAgIDogdS5pc1N0cmluZyh4KSA/ICgnXFwnJyt1dGlsX2VzY2FwZV9zdHIoeCkrJ1xcJycpIDogeDtcbn07XG5cbnZhciBlc2NhcGVfc3RyX3JlID0gLyhefFteXFxcXF0pJy9nO1xuXG5mdW5jdGlvbiB1dGlsX2VzY2FwZV9zdHIoeCkge1xuICByZXR1cm4geC5yZXBsYWNlKGVzY2FwZV9zdHJfcmUsICckMVxcXFxcXCcnKTtcbn1cblxuLy8gZGF0YSBhY2Nlc3MgZnVuY3Rpb25zXG5cbnZhciBmaWVsZF9yZSA9IC9cXFsoLio/KVxcXXxbXi5cXFtdKy9nO1xuXG51LmZpZWxkID0gZnVuY3Rpb24oZikge1xuICByZXR1cm4gU3RyaW5nKGYpLm1hdGNoKGZpZWxkX3JlKS5tYXAoZnVuY3Rpb24oZCkge1xuICAgIHJldHVybiBkWzBdICE9PSAnWycgPyBkIDpcbiAgICAgIGRbMV0gIT09IFwiJ1wiICYmIGRbMV0gIT09ICdcIicgPyBkLnNsaWNlKDEsIC0xKSA6XG4gICAgICBkLnNsaWNlKDIsIC0yKS5yZXBsYWNlKC9cXFxcKFtcIiddKS9nLCAnJDEnKTtcbiAgfSk7XG59O1xuXG51LmFjY2Vzc29yID0gZnVuY3Rpb24oZikge1xuICB2YXIgcztcbiAgcmV0dXJuIGY9PW51bGwgfHwgdS5pc0Z1bmN0aW9uKGYpID8gZiA6XG4gICAgdS5uYW1lZGZ1bmMoZiwgKHMgPSB1LmZpZWxkKGYpKS5sZW5ndGggPiAxID9cbiAgICAgIGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHMucmVkdWNlKGZ1bmN0aW9uKHgsZikgeyByZXR1cm4geFtmXTsgfSwgeCk7IH0gOlxuICAgICAgZnVuY3Rpb24oeCkgeyByZXR1cm4geFtmXTsgfVxuICAgICk7XG59O1xuXG4vLyBzaG9ydC1jdXQgZm9yIGFjY2Vzc29yXG51LiQgPSB1LmFjY2Vzc29yO1xuXG51Lm11dGF0b3IgPSBmdW5jdGlvbihmKSB7XG4gIHZhciBzO1xuICByZXR1cm4gdS5pc1N0cmluZyhmKSAmJiAocz11LmZpZWxkKGYpKS5sZW5ndGggPiAxID9cbiAgICBmdW5jdGlvbih4LCB2KSB7XG4gICAgICBmb3IgKHZhciBpPTA7IGk8cy5sZW5ndGgtMTsgKytpKSB4ID0geFtzW2ldXTtcbiAgICAgIHhbc1tpXV0gPSB2O1xuICAgIH0gOlxuICAgIGZ1bmN0aW9uKHgsIHYpIHsgeFtmXSA9IHY7IH07XG59O1xuXG5cbnUuJGZ1bmMgPSBmdW5jdGlvbihuYW1lLCBvcCkge1xuICByZXR1cm4gZnVuY3Rpb24oZikge1xuICAgIGYgPSB1LiQoZikgfHwgdS5pZGVudGl0eTtcbiAgICB2YXIgbiA9IG5hbWUgKyAodS5uYW1lKGYpID8gJ18nK3UubmFtZShmKSA6ICcnKTtcbiAgICByZXR1cm4gdS5uYW1lZGZ1bmMobiwgZnVuY3Rpb24oZCkgeyByZXR1cm4gb3AoZihkKSk7IH0pO1xuICB9O1xufTtcblxudS4kdmFsaWQgID0gdS4kZnVuYygndmFsaWQnLCB1LmlzVmFsaWQpO1xudS4kbGVuZ3RoID0gdS4kZnVuYygnbGVuZ3RoJywgdS5sZW5ndGgpO1xuXG51LiRpbiA9IGZ1bmN0aW9uKGYsIHZhbHVlcykge1xuICBmID0gdS4kKGYpO1xuICB2YXIgbWFwID0gdS5pc0FycmF5KHZhbHVlcykgPyB1LnRvTWFwKHZhbHVlcykgOiB2YWx1ZXM7XG4gIHJldHVybiBmdW5jdGlvbihkKSB7IHJldHVybiAhIW1hcFtmKGQpXTsgfTtcbn07XG5cbnUuJHllYXIgICA9IHUuJGZ1bmMoJ3llYXInLCB0aW1lLnllYXIudW5pdCk7XG51LiRtb250aCAgPSB1LiRmdW5jKCdtb250aCcsIHRpbWUubW9udGhzLnVuaXQpO1xudS4kZGF0ZSAgID0gdS4kZnVuYygnZGF0ZScsIHRpbWUuZGF0ZXMudW5pdCk7XG51LiRkYXkgICAgPSB1LiRmdW5jKCdkYXknLCB0aW1lLndlZWtkYXlzLnVuaXQpO1xudS4kaG91ciAgID0gdS4kZnVuYygnaG91cicsIHRpbWUuaG91cnMudW5pdCk7XG51LiRtaW51dGUgPSB1LiRmdW5jKCdtaW51dGUnLCB0aW1lLm1pbnV0ZXMudW5pdCk7XG51LiRzZWNvbmQgPSB1LiRmdW5jKCdzZWNvbmQnLCB0aW1lLnNlY29uZHMudW5pdCk7XG5cbnUuJHV0Y1llYXIgICA9IHUuJGZ1bmMoJ3V0Y1llYXInLCB1dGMueWVhci51bml0KTtcbnUuJHV0Y01vbnRoICA9IHUuJGZ1bmMoJ3V0Y01vbnRoJywgdXRjLm1vbnRocy51bml0KTtcbnUuJHV0Y0RhdGUgICA9IHUuJGZ1bmMoJ3V0Y0RhdGUnLCB1dGMuZGF0ZXMudW5pdCk7XG51LiR1dGNEYXkgICAgPSB1LiRmdW5jKCd1dGNEYXknLCB1dGMud2Vla2RheXMudW5pdCk7XG51LiR1dGNIb3VyICAgPSB1LiRmdW5jKCd1dGNIb3VyJywgdXRjLmhvdXJzLnVuaXQpO1xudS4kdXRjTWludXRlID0gdS4kZnVuYygndXRjTWludXRlJywgdXRjLm1pbnV0ZXMudW5pdCk7XG51LiR1dGNTZWNvbmQgPSB1LiRmdW5jKCd1dGNTZWNvbmQnLCB1dGMuc2Vjb25kcy51bml0KTtcblxuLy8gY29tcGFyaXNvbiAvIHNvcnRpbmcgZnVuY3Rpb25zXG5cbnUuY29tcGFyYXRvciA9IGZ1bmN0aW9uKHNvcnQpIHtcbiAgdmFyIHNpZ24gPSBbXTtcbiAgaWYgKHNvcnQgPT09IHVuZGVmaW5lZCkgc29ydCA9IFtdO1xuICBzb3J0ID0gdS5hcnJheShzb3J0KS5tYXAoZnVuY3Rpb24oZikge1xuICAgIHZhciBzID0gMTtcbiAgICBpZiAgICAgIChmWzBdID09PSAnLScpIHsgcyA9IC0xOyBmID0gZi5zbGljZSgxKTsgfVxuICAgIGVsc2UgaWYgKGZbMF0gPT09ICcrJykgeyBzID0gKzE7IGYgPSBmLnNsaWNlKDEpOyB9XG4gICAgc2lnbi5wdXNoKHMpO1xuICAgIHJldHVybiB1LmFjY2Vzc29yKGYpO1xuICB9KTtcbiAgcmV0dXJuIGZ1bmN0aW9uKGEsYikge1xuICAgIHZhciBpLCBuLCBmLCB4LCB5O1xuICAgIGZvciAoaT0wLCBuPXNvcnQubGVuZ3RoOyBpPG47ICsraSkge1xuICAgICAgZiA9IHNvcnRbaV07IHggPSBmKGEpOyB5ID0gZihiKTtcbiAgICAgIGlmICh4IDwgeSkgcmV0dXJuIC0xICogc2lnbltpXTtcbiAgICAgIGlmICh4ID4geSkgcmV0dXJuIHNpZ25baV07XG4gICAgfVxuICAgIHJldHVybiAwO1xuICB9O1xufTtcblxudS5jbXAgPSBmdW5jdGlvbihhLCBiKSB7XG4gIGlmIChhIDwgYikge1xuICAgIHJldHVybiAtMTtcbiAgfSBlbHNlIGlmIChhID4gYikge1xuICAgIHJldHVybiAxO1xuICB9IGVsc2UgaWYgKGEgPj0gYikge1xuICAgIHJldHVybiAwO1xuICB9IGVsc2UgaWYgKGEgPT09IG51bGwpIHtcbiAgICByZXR1cm4gLTE7XG4gIH0gZWxzZSBpZiAoYiA9PT0gbnVsbCkge1xuICAgIHJldHVybiAxO1xuICB9XG4gIHJldHVybiBOYU47XG59O1xuXG51Lm51bWNtcCA9IGZ1bmN0aW9uKGEsIGIpIHsgcmV0dXJuIGEgLSBiOyB9O1xuXG51LnN0YWJsZXNvcnQgPSBmdW5jdGlvbihhcnJheSwgc29ydEJ5LCBrZXlGbikge1xuICB2YXIgaW5kaWNlcyA9IGFycmF5LnJlZHVjZShmdW5jdGlvbihpZHgsIHYsIGkpIHtcbiAgICByZXR1cm4gKGlkeFtrZXlGbih2KV0gPSBpLCBpZHgpO1xuICB9LCB7fSk7XG5cbiAgYXJyYXkuc29ydChmdW5jdGlvbihhLCBiKSB7XG4gICAgdmFyIHNhID0gc29ydEJ5KGEpLFxuICAgICAgICBzYiA9IHNvcnRCeShiKTtcbiAgICByZXR1cm4gc2EgPCBzYiA/IC0xIDogc2EgPiBzYiA/IDFcbiAgICAgICAgIDogKGluZGljZXNba2V5Rm4oYSldIC0gaW5kaWNlc1trZXlGbihiKV0pO1xuICB9KTtcblxuICByZXR1cm4gYXJyYXk7XG59O1xuXG5cbi8vIHN0cmluZyBmdW5jdGlvbnNcblxudS5wYWQgPSBmdW5jdGlvbihzLCBsZW5ndGgsIHBvcywgcGFkY2hhcikge1xuICBwYWRjaGFyID0gcGFkY2hhciB8fCBcIiBcIjtcbiAgdmFyIGQgPSBsZW5ndGggLSBzLmxlbmd0aDtcbiAgaWYgKGQgPD0gMCkgcmV0dXJuIHM7XG4gIHN3aXRjaCAocG9zKSB7XG4gICAgY2FzZSAnbGVmdCc6XG4gICAgICByZXR1cm4gc3RycmVwKGQsIHBhZGNoYXIpICsgcztcbiAgICBjYXNlICdtaWRkbGUnOlxuICAgIGNhc2UgJ2NlbnRlcic6XG4gICAgICByZXR1cm4gc3RycmVwKE1hdGguZmxvb3IoZC8yKSwgcGFkY2hhcikgK1xuICAgICAgICAgcyArIHN0cnJlcChNYXRoLmNlaWwoZC8yKSwgcGFkY2hhcik7XG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiBzICsgc3RycmVwKGQsIHBhZGNoYXIpO1xuICB9XG59O1xuXG5mdW5jdGlvbiBzdHJyZXAobiwgc3RyKSB7XG4gIHZhciBzID0gXCJcIiwgaTtcbiAgZm9yIChpPTA7IGk8bjsgKytpKSBzICs9IHN0cjtcbiAgcmV0dXJuIHM7XG59XG5cbnUudHJ1bmNhdGUgPSBmdW5jdGlvbihzLCBsZW5ndGgsIHBvcywgd29yZCwgZWxsaXBzaXMpIHtcbiAgdmFyIGxlbiA9IHMubGVuZ3RoO1xuICBpZiAobGVuIDw9IGxlbmd0aCkgcmV0dXJuIHM7XG4gIGVsbGlwc2lzID0gZWxsaXBzaXMgIT09IHVuZGVmaW5lZCA/IFN0cmluZyhlbGxpcHNpcykgOiAnXFx1MjAyNic7XG4gIHZhciBsID0gTWF0aC5tYXgoMCwgbGVuZ3RoIC0gZWxsaXBzaXMubGVuZ3RoKTtcblxuICBzd2l0Y2ggKHBvcykge1xuICAgIGNhc2UgJ2xlZnQnOlxuICAgICAgcmV0dXJuIGVsbGlwc2lzICsgKHdvcmQgPyB0cnVuY2F0ZU9uV29yZChzLGwsMSkgOiBzLnNsaWNlKGxlbi1sKSk7XG4gICAgY2FzZSAnbWlkZGxlJzpcbiAgICBjYXNlICdjZW50ZXInOlxuICAgICAgdmFyIGwxID0gTWF0aC5jZWlsKGwvMiksIGwyID0gTWF0aC5mbG9vcihsLzIpO1xuICAgICAgcmV0dXJuICh3b3JkID8gdHJ1bmNhdGVPbldvcmQocyxsMSkgOiBzLnNsaWNlKDAsbDEpKSArXG4gICAgICAgIGVsbGlwc2lzICsgKHdvcmQgPyB0cnVuY2F0ZU9uV29yZChzLGwyLDEpIDogcy5zbGljZShsZW4tbDIpKTtcbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuICh3b3JkID8gdHJ1bmNhdGVPbldvcmQocyxsKSA6IHMuc2xpY2UoMCxsKSkgKyBlbGxpcHNpcztcbiAgfVxufTtcblxuZnVuY3Rpb24gdHJ1bmNhdGVPbldvcmQocywgbGVuLCByZXYpIHtcbiAgdmFyIGNudCA9IDAsIHRvayA9IHMuc3BsaXQodHJ1bmNhdGVfd29yZF9yZSk7XG4gIGlmIChyZXYpIHtcbiAgICBzID0gKHRvayA9IHRvay5yZXZlcnNlKCkpXG4gICAgICAuZmlsdGVyKGZ1bmN0aW9uKHcpIHsgY250ICs9IHcubGVuZ3RoOyByZXR1cm4gY250IDw9IGxlbjsgfSlcbiAgICAgIC5yZXZlcnNlKCk7XG4gIH0gZWxzZSB7XG4gICAgcyA9IHRvay5maWx0ZXIoZnVuY3Rpb24odykgeyBjbnQgKz0gdy5sZW5ndGg7IHJldHVybiBjbnQgPD0gbGVuOyB9KTtcbiAgfVxuICByZXR1cm4gcy5sZW5ndGggPyBzLmpvaW4oJycpLnRyaW0oKSA6IHRva1swXS5zbGljZSgwLCBsZW4pO1xufVxuXG52YXIgdHJ1bmNhdGVfd29yZF9yZSA9IC8oW1xcdTAwMDlcXHUwMDBBXFx1MDAwQlxcdTAwMENcXHUwMDBEXFx1MDAyMFxcdTAwQTBcXHUxNjgwXFx1MTgwRVxcdTIwMDBcXHUyMDAxXFx1MjAwMlxcdTIwMDNcXHUyMDA0XFx1MjAwNVxcdTIwMDZcXHUyMDA3XFx1MjAwOFxcdTIwMDlcXHUyMDBBXFx1MjAyRlxcdTIwNUZcXHUyMDI4XFx1MjAyOVxcdTMwMDBcXHVGRUZGXSkvO1xuIiwiZXhwb3J0cy5BR0dSRUdBVEVfT1BTID0gW1xyXG4gICAgJ3ZhbHVlcycsICdjb3VudCcsICd2YWxpZCcsICdtaXNzaW5nJywgJ2Rpc3RpbmN0JyxcclxuICAgICdzdW0nLCAnbWVhbicsICdhdmVyYWdlJywgJ3ZhcmlhbmNlJywgJ3ZhcmlhbmNlcCcsICdzdGRldicsXHJcbiAgICAnc3RkZXZwJywgJ21lZGlhbicsICdxMScsICdxMycsICdtb2Rlc2tldycsICdtaW4nLCAnbWF4JyxcclxuICAgICdhcmdtaW4nLCAnYXJnbWF4J1xyXG5dO1xyXG5leHBvcnRzLlNIQVJFRF9ET01BSU5fT1BTID0gW1xyXG4gICAgJ21lYW4nLCAnYXZlcmFnZScsICdzdGRldicsICdzdGRldnAnLCAnbWVkaWFuJywgJ3ExJywgJ3EzJywgJ21pbicsICdtYXgnXHJcbl07XHJcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWFnZ3JlZ2F0ZS5qcy5tYXAiLCJleHBvcnRzLk1BWEJJTlNfREVGQVVMVCA9IDE1O1xyXG4vLyMgc291cmNlTWFwcGluZ1VSTD1iaW4uanMubWFwIiwiKGZ1bmN0aW9uIChDaGFubmVsKSB7XHJcbiAgICBDaGFubmVsW0NoYW5uZWxbXCJYXCJdID0gJ3gnXSA9IFwiWFwiO1xyXG4gICAgQ2hhbm5lbFtDaGFubmVsW1wiWVwiXSA9ICd5J10gPSBcIllcIjtcclxuICAgIENoYW5uZWxbQ2hhbm5lbFtcIlJPV1wiXSA9ICdyb3cnXSA9IFwiUk9XXCI7XHJcbiAgICBDaGFubmVsW0NoYW5uZWxbXCJDT0xVTU5cIl0gPSAnY29sdW1uJ10gPSBcIkNPTFVNTlwiO1xyXG4gICAgQ2hhbm5lbFtDaGFubmVsW1wiU0hBUEVcIl0gPSAnc2hhcGUnXSA9IFwiU0hBUEVcIjtcclxuICAgIENoYW5uZWxbQ2hhbm5lbFtcIlNJWkVcIl0gPSAnc2l6ZSddID0gXCJTSVpFXCI7XHJcbiAgICBDaGFubmVsW0NoYW5uZWxbXCJDT0xPUlwiXSA9ICdjb2xvciddID0gXCJDT0xPUlwiO1xyXG4gICAgQ2hhbm5lbFtDaGFubmVsW1wiVEVYVFwiXSA9ICd0ZXh0J10gPSBcIlRFWFRcIjtcclxuICAgIENoYW5uZWxbQ2hhbm5lbFtcIkRFVEFJTFwiXSA9ICdkZXRhaWwnXSA9IFwiREVUQUlMXCI7XHJcbn0pKGV4cG9ydHMuQ2hhbm5lbCB8fCAoZXhwb3J0cy5DaGFubmVsID0ge30pKTtcclxudmFyIENoYW5uZWwgPSBleHBvcnRzLkNoYW5uZWw7XHJcbmV4cG9ydHMuWCA9IENoYW5uZWwuWDtcclxuZXhwb3J0cy5ZID0gQ2hhbm5lbC5ZO1xyXG5leHBvcnRzLlJPVyA9IENoYW5uZWwuUk9XO1xyXG5leHBvcnRzLkNPTFVNTiA9IENoYW5uZWwuQ09MVU1OO1xyXG5leHBvcnRzLlNIQVBFID0gQ2hhbm5lbC5TSEFQRTtcclxuZXhwb3J0cy5TSVpFID0gQ2hhbm5lbC5TSVpFO1xyXG5leHBvcnRzLkNPTE9SID0gQ2hhbm5lbC5DT0xPUjtcclxuZXhwb3J0cy5URVhUID0gQ2hhbm5lbC5URVhUO1xyXG5leHBvcnRzLkRFVEFJTCA9IENoYW5uZWwuREVUQUlMO1xyXG5leHBvcnRzLkNIQU5ORUxTID0gW2V4cG9ydHMuWCwgZXhwb3J0cy5ZLCBleHBvcnRzLlJPVywgZXhwb3J0cy5DT0xVTU4sIGV4cG9ydHMuU0laRSwgZXhwb3J0cy5TSEFQRSwgZXhwb3J0cy5DT0xPUiwgZXhwb3J0cy5URVhULCBleHBvcnRzLkRFVEFJTF07XHJcbjtcclxuZnVuY3Rpb24gc3VwcG9ydE1hcmsoY2hhbm5lbCwgbWFyaykge1xyXG4gICAgcmV0dXJuICEhZ2V0U3VwcG9ydGVkTWFyayhjaGFubmVsKVttYXJrXTtcclxufVxyXG5leHBvcnRzLnN1cHBvcnRNYXJrID0gc3VwcG9ydE1hcms7XHJcbmZ1bmN0aW9uIGdldFN1cHBvcnRlZE1hcmsoY2hhbm5lbCkge1xyXG4gICAgc3dpdGNoIChjaGFubmVsKSB7XHJcbiAgICAgICAgY2FzZSBleHBvcnRzLlg6XHJcbiAgICAgICAgY2FzZSBleHBvcnRzLlk6XHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICBwb2ludDogdHJ1ZSwgdGljazogdHJ1ZSwgY2lyY2xlOiB0cnVlLCBzcXVhcmU6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBiYXI6IHRydWUsIGxpbmU6IHRydWUsIGFyZWE6IHRydWVcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICBjYXNlIGV4cG9ydHMuUk9XOlxyXG4gICAgICAgIGNhc2UgZXhwb3J0cy5DT0xVTU46XHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICBwb2ludDogdHJ1ZSwgdGljazogdHJ1ZSwgY2lyY2xlOiB0cnVlLCBzcXVhcmU6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBiYXI6IHRydWUsIGxpbmU6IHRydWUsIGFyZWE6IHRydWUsIHRleHQ6IHRydWVcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICBjYXNlIGV4cG9ydHMuU0laRTpcclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIHBvaW50OiB0cnVlLCB0aWNrOiB0cnVlLCBjaXJjbGU6IHRydWUsIHNxdWFyZTogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIGJhcjogdHJ1ZSwgdGV4dDogdHJ1ZVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIGNhc2UgZXhwb3J0cy5DT0xPUjpcclxuICAgICAgICBjYXNlIGV4cG9ydHMuREVUQUlMOlxyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgcG9pbnQ6IHRydWUsIHRpY2s6IHRydWUsIGNpcmNsZTogdHJ1ZSwgc3F1YXJlOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgYmFyOiB0cnVlLCBsaW5lOiB0cnVlLCBhcmVhOiB0cnVlLCB0ZXh0OiB0cnVlXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgY2FzZSBleHBvcnRzLlNIQVBFOlxyXG4gICAgICAgICAgICByZXR1cm4geyBwb2ludDogdHJ1ZSB9O1xyXG4gICAgICAgIGNhc2UgZXhwb3J0cy5URVhUOlxyXG4gICAgICAgICAgICByZXR1cm4geyB0ZXh0OiB0cnVlIH07XHJcbiAgICB9XHJcbiAgICByZXR1cm4ge307XHJcbn1cclxuZXhwb3J0cy5nZXRTdXBwb3J0ZWRNYXJrID0gZ2V0U3VwcG9ydGVkTWFyaztcclxuO1xyXG5mdW5jdGlvbiBnZXRTdXBwb3J0ZWRSb2xlKGNoYW5uZWwpIHtcclxuICAgIHN3aXRjaCAoY2hhbm5lbCkge1xyXG4gICAgICAgIGNhc2UgZXhwb3J0cy5YOlxyXG4gICAgICAgIGNhc2UgZXhwb3J0cy5ZOlxyXG4gICAgICAgIGNhc2UgZXhwb3J0cy5DT0xPUjpcclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIG1lYXN1cmU6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBkaW1lbnNpb246IHRydWVcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICBjYXNlIGV4cG9ydHMuUk9XOlxyXG4gICAgICAgIGNhc2UgZXhwb3J0cy5DT0xVTU46XHJcbiAgICAgICAgY2FzZSBleHBvcnRzLlNIQVBFOlxyXG4gICAgICAgIGNhc2UgZXhwb3J0cy5ERVRBSUw6XHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICBtZWFzdXJlOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIGRpbWVuc2lvbjogdHJ1ZVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIGNhc2UgZXhwb3J0cy5TSVpFOlxyXG4gICAgICAgIGNhc2UgZXhwb3J0cy5URVhUOlxyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgbWVhc3VyZTogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIGRpbWVuc2lvbjogZmFsc2VcclxuICAgICAgICAgICAgfTtcclxuICAgIH1cclxuICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBlbmNvZGluZyBjaGFubmVsJyArIGNoYW5uZWwpO1xyXG59XHJcbmV4cG9ydHMuZ2V0U3VwcG9ydGVkUm9sZSA9IGdldFN1cHBvcnRlZFJvbGU7XHJcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWNoYW5uZWwuanMubWFwIiwidmFyIGJpbl8xID0gcmVxdWlyZSgnLi4vYmluJyk7XHJcbnZhciBjaGFubmVsXzEgPSByZXF1aXJlKCcuLi9jaGFubmVsJyk7XHJcbnZhciBkYXRhXzEgPSByZXF1aXJlKCcuLi9kYXRhJyk7XHJcbnZhciB2bEZpZWxkRGVmID0gcmVxdWlyZSgnLi4vZmllbGRkZWYnKTtcclxudmFyIHZsRW5jb2RpbmcgPSByZXF1aXJlKCcuLi9lbmNvZGluZycpO1xyXG52YXIgbGF5b3V0XzEgPSByZXF1aXJlKCcuL2xheW91dCcpO1xyXG52YXIgbWFya18xID0gcmVxdWlyZSgnLi4vbWFyaycpO1xyXG52YXIgc2NoZW1hID0gcmVxdWlyZSgnLi4vc2NoZW1hL3NjaGVtYScpO1xyXG52YXIgc2NoZW1hVXRpbCA9IHJlcXVpcmUoJy4uL3NjaGVtYS9zY2hlbWF1dGlsJyk7XHJcbnZhciB0eXBlXzEgPSByZXF1aXJlKCcuLi90eXBlJyk7XHJcbnZhciB1dGlsXzEgPSByZXF1aXJlKCcuLi91dGlsJyk7XHJcbnZhciB0aW1lID0gcmVxdWlyZSgnLi90aW1lJyk7XHJcbnZhciBNb2RlbCA9IChmdW5jdGlvbiAoKSB7XHJcbiAgICBmdW5jdGlvbiBNb2RlbChzcGVjLCB0aGVtZSkge1xyXG4gICAgICAgIHZhciBkZWZhdWx0cyA9IHNjaGVtYS5pbnN0YW50aWF0ZSgpO1xyXG4gICAgICAgIHRoaXMuX3NwZWMgPSBzY2hlbWFVdGlsLm1lcmdlKGRlZmF1bHRzLCB0aGVtZSB8fCB7fSwgc3BlYyk7XHJcbiAgICAgICAgdmxFbmNvZGluZy5mb3JFYWNoKHRoaXMuX3NwZWMuZW5jb2RpbmcsIGZ1bmN0aW9uIChmaWVsZERlZiwgY2hhbm5lbCkge1xyXG4gICAgICAgICAgICBpZiAoZmllbGREZWYudHlwZSkge1xyXG4gICAgICAgICAgICAgICAgZmllbGREZWYudHlwZSA9IHR5cGVfMS5nZXRGdWxsTmFtZShmaWVsZERlZi50eXBlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHRoaXMuX3N0YWNrID0gdGhpcy5nZXRTdGFja1Byb3BlcnRpZXMoKTtcclxuICAgICAgICB0aGlzLl9sYXlvdXQgPSBsYXlvdXRfMS5jb21waWxlTGF5b3V0KHRoaXMpO1xyXG4gICAgfVxyXG4gICAgTW9kZWwucHJvdG90eXBlLmdldFN0YWNrUHJvcGVydGllcyA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB2YXIgc3RhY2tDaGFubmVsID0gKHRoaXMuaGFzKGNoYW5uZWxfMS5DT0xPUikpID8gY2hhbm5lbF8xLkNPTE9SIDogKHRoaXMuaGFzKGNoYW5uZWxfMS5ERVRBSUwpKSA/IGNoYW5uZWxfMS5ERVRBSUwgOiBudWxsO1xyXG4gICAgICAgIGlmIChzdGFja0NoYW5uZWwgJiZcclxuICAgICAgICAgICAgKHRoaXMuaXMobWFya18xLkJBUikgfHwgdGhpcy5pcyhtYXJrXzEuQVJFQSkpICYmXHJcbiAgICAgICAgICAgIHRoaXMuY29uZmlnKCdzdGFjaycpICE9PSBmYWxzZSAmJlxyXG4gICAgICAgICAgICB0aGlzLmlzQWdncmVnYXRlKCkpIHtcclxuICAgICAgICAgICAgdmFyIGlzWE1lYXN1cmUgPSB0aGlzLmlzTWVhc3VyZShjaGFubmVsXzEuWCk7XHJcbiAgICAgICAgICAgIHZhciBpc1lNZWFzdXJlID0gdGhpcy5pc01lYXN1cmUoY2hhbm5lbF8xLlkpO1xyXG4gICAgICAgICAgICBpZiAoaXNYTWVhc3VyZSAmJiAhaXNZTWVhc3VyZSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICBncm91cGJ5Q2hhbm5lbDogY2hhbm5lbF8xLlksXHJcbiAgICAgICAgICAgICAgICAgICAgZmllbGRDaGFubmVsOiBjaGFubmVsXzEuWCxcclxuICAgICAgICAgICAgICAgICAgICBzdGFja0NoYW5uZWw6IHN0YWNrQ2hhbm5lbCxcclxuICAgICAgICAgICAgICAgICAgICBjb25maWc6IHRoaXMuY29uZmlnKCdzdGFjaycpXHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2UgaWYgKGlzWU1lYXN1cmUgJiYgIWlzWE1lYXN1cmUpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICAgICAgZ3JvdXBieUNoYW5uZWw6IGNoYW5uZWxfMS5YLFxyXG4gICAgICAgICAgICAgICAgICAgIGZpZWxkQ2hhbm5lbDogY2hhbm5lbF8xLlksXHJcbiAgICAgICAgICAgICAgICAgICAgc3RhY2tDaGFubmVsOiBzdGFja0NoYW5uZWwsXHJcbiAgICAgICAgICAgICAgICAgICAgY29uZmlnOiB0aGlzLmNvbmZpZygnc3RhY2snKVxyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgIH07XHJcbiAgICBNb2RlbC5wcm90b3R5cGUubGF5b3V0ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9sYXlvdXQ7XHJcbiAgICB9O1xyXG4gICAgTW9kZWwucHJvdG90eXBlLnN0YWNrID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjaztcclxuICAgIH07XHJcbiAgICBNb2RlbC5wcm90b3R5cGUudG9TcGVjID0gZnVuY3Rpb24gKGV4Y2x1ZGVDb25maWcsIGV4Y2x1ZGVEYXRhKSB7XHJcbiAgICAgICAgdmFyIGVuY29kaW5nID0gdXRpbF8xLmR1cGxpY2F0ZSh0aGlzLl9zcGVjLmVuY29kaW5nKSwgc3BlYztcclxuICAgICAgICBzcGVjID0ge1xyXG4gICAgICAgICAgICBtYXJrOiB0aGlzLl9zcGVjLm1hcmssXHJcbiAgICAgICAgICAgIGVuY29kaW5nOiBlbmNvZGluZ1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgaWYgKCFleGNsdWRlQ29uZmlnKSB7XHJcbiAgICAgICAgICAgIHNwZWMuY29uZmlnID0gdXRpbF8xLmR1cGxpY2F0ZSh0aGlzLl9zcGVjLmNvbmZpZyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICghZXhjbHVkZURhdGEpIHtcclxuICAgICAgICAgICAgc3BlYy5kYXRhID0gdXRpbF8xLmR1cGxpY2F0ZSh0aGlzLl9zcGVjLmRhdGEpO1xyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgZGVmYXVsdHMgPSBzY2hlbWEuaW5zdGFudGlhdGUoKTtcclxuICAgICAgICByZXR1cm4gc2NoZW1hVXRpbC5zdWJ0cmFjdChzcGVjLCBkZWZhdWx0cyk7XHJcbiAgICB9O1xyXG4gICAgTW9kZWwucHJvdG90eXBlLm1hcmsgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX3NwZWMubWFyaztcclxuICAgIH07XHJcbiAgICBNb2RlbC5wcm90b3R5cGUuc3BlYyA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5fc3BlYztcclxuICAgIH07XHJcbiAgICBNb2RlbC5wcm90b3R5cGUuaXMgPSBmdW5jdGlvbiAobWFyaykge1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9zcGVjLm1hcmsgPT09IG1hcms7XHJcbiAgICB9O1xyXG4gICAgTW9kZWwucHJvdG90eXBlLmhhcyA9IGZ1bmN0aW9uIChjaGFubmVsKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX3NwZWMuZW5jb2RpbmdbY2hhbm5lbF0uZmllbGQgIT09IHVuZGVmaW5lZDtcclxuICAgIH07XHJcbiAgICBNb2RlbC5wcm90b3R5cGUuZmllbGREZWYgPSBmdW5jdGlvbiAoY2hhbm5lbCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9zcGVjLmVuY29kaW5nW2NoYW5uZWxdO1xyXG4gICAgfTtcclxuICAgIE1vZGVsLnByb3RvdHlwZS5maWVsZCA9IGZ1bmN0aW9uIChjaGFubmVsLCBvcHQpIHtcclxuICAgICAgICBvcHQgPSBvcHQgfHwge307XHJcbiAgICAgICAgdmFyIGZpZWxkRGVmID0gdGhpcy5maWVsZERlZihjaGFubmVsKTtcclxuICAgICAgICB2YXIgZiA9IChvcHQuZGF0dW0gPyAnZGF0dW0uJyA6ICcnKSArIChvcHQucHJlZm4gfHwgJycpLCBmaWVsZCA9IGZpZWxkRGVmLmZpZWxkO1xyXG4gICAgICAgIGlmICh2bEZpZWxkRGVmLmlzQ291bnQoZmllbGREZWYpKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBmICsgJ2NvdW50JztcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSBpZiAob3B0LmZuKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBmICsgb3B0LmZuICsgJ18nICsgZmllbGQ7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2UgaWYgKCFvcHQubm9mbiAmJiBmaWVsZERlZi5iaW4pIHtcclxuICAgICAgICAgICAgdmFyIGJpblN1ZmZpeCA9IG9wdC5iaW5TdWZmaXggfHwgJ19zdGFydCc7XHJcbiAgICAgICAgICAgIHJldHVybiBmICsgJ2Jpbl8nICsgZmllbGQgKyBiaW5TdWZmaXg7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2UgaWYgKCFvcHQubm9mbiAmJiAhb3B0Lm5vQWdncmVnYXRlICYmIGZpZWxkRGVmLmFnZ3JlZ2F0ZSkge1xyXG4gICAgICAgICAgICByZXR1cm4gZiArIGZpZWxkRGVmLmFnZ3JlZ2F0ZSArICdfJyArIGZpZWxkO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIGlmICghb3B0Lm5vZm4gJiYgZmllbGREZWYudGltZVVuaXQpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGYgKyBmaWVsZERlZi50aW1lVW5pdCArICdfJyArIGZpZWxkO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgcmV0dXJuIGYgKyBmaWVsZDtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG4gICAgTW9kZWwucHJvdG90eXBlLmZpZWxkVGl0bGUgPSBmdW5jdGlvbiAoY2hhbm5lbCkge1xyXG4gICAgICAgIGlmICh2bEZpZWxkRGVmLmlzQ291bnQodGhpcy5fc3BlYy5lbmNvZGluZ1tjaGFubmVsXSkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHZsRmllbGREZWYuQ09VTlRfRElTUExBWU5BTUU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBmbiA9IHRoaXMuX3NwZWMuZW5jb2RpbmdbY2hhbm5lbF0uYWdncmVnYXRlIHx8IHRoaXMuX3NwZWMuZW5jb2RpbmdbY2hhbm5lbF0udGltZVVuaXQgfHwgKHRoaXMuX3NwZWMuZW5jb2RpbmdbY2hhbm5lbF0uYmluICYmICdiaW4nKTtcclxuICAgICAgICBpZiAoZm4pIHtcclxuICAgICAgICAgICAgcmV0dXJuIGZuLnRvVXBwZXJDYXNlKCkgKyAnKCcgKyB0aGlzLl9zcGVjLmVuY29kaW5nW2NoYW5uZWxdLmZpZWxkICsgJyknO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3NwZWMuZW5jb2RpbmdbY2hhbm5lbF0uZmllbGQ7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuICAgIE1vZGVsLnByb3RvdHlwZS5iaW4gPSBmdW5jdGlvbiAoY2hhbm5lbCkge1xyXG4gICAgICAgIHZhciBiaW4gPSB0aGlzLl9zcGVjLmVuY29kaW5nW2NoYW5uZWxdLmJpbjtcclxuICAgICAgICBpZiAoYmluID09PSB7fSlcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIGlmIChiaW4gPT09IHRydWUpXHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICBtYXhiaW5zOiBiaW5fMS5NQVhCSU5TX0RFRkFVTFRcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICByZXR1cm4gYmluO1xyXG4gICAgfTtcclxuICAgIE1vZGVsLnByb3RvdHlwZS5udW1iZXJGb3JtYXQgPSBmdW5jdGlvbiAoY2hhbm5lbCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmNvbmZpZygnbnVtYmVyRm9ybWF0Jyk7XHJcbiAgICB9O1xyXG4gICAgO1xyXG4gICAgTW9kZWwucHJvdG90eXBlLm1hcCA9IGZ1bmN0aW9uIChmKSB7XHJcbiAgICAgICAgcmV0dXJuIHZsRW5jb2RpbmcubWFwKHRoaXMuX3NwZWMuZW5jb2RpbmcsIGYpO1xyXG4gICAgfTtcclxuICAgIE1vZGVsLnByb3RvdHlwZS5yZWR1Y2UgPSBmdW5jdGlvbiAoZiwgaW5pdCkge1xyXG4gICAgICAgIHJldHVybiB2bEVuY29kaW5nLnJlZHVjZSh0aGlzLl9zcGVjLmVuY29kaW5nLCBmLCBpbml0KTtcclxuICAgIH07XHJcbiAgICBNb2RlbC5wcm90b3R5cGUuZm9yRWFjaCA9IGZ1bmN0aW9uIChmKSB7XHJcbiAgICAgICAgcmV0dXJuIHZsRW5jb2RpbmcuZm9yRWFjaCh0aGlzLl9zcGVjLmVuY29kaW5nLCBmKTtcclxuICAgIH07XHJcbiAgICBNb2RlbC5wcm90b3R5cGUuaXNPcmRpbmFsU2NhbGUgPSBmdW5jdGlvbiAoY2hhbm5lbCkge1xyXG4gICAgICAgIHZhciBmaWVsZERlZiA9IHRoaXMuZmllbGREZWYoY2hhbm5lbCk7XHJcbiAgICAgICAgcmV0dXJuIGZpZWxkRGVmICYmICh1dGlsXzEuY29udGFpbnMoW3R5cGVfMS5OT01JTkFMLCB0eXBlXzEuT1JESU5BTF0sIGZpZWxkRGVmLnR5cGUpIHx8XHJcbiAgICAgICAgICAgIChmaWVsZERlZi50eXBlID09PSB0eXBlXzEuVEVNUE9SQUwgJiYgZmllbGREZWYudGltZVVuaXQgJiZcclxuICAgICAgICAgICAgICAgIHRpbWUuc2NhbGUudHlwZShmaWVsZERlZi50aW1lVW5pdCwgY2hhbm5lbCkgPT09ICdvcmRpbmFsJykpO1xyXG4gICAgfTtcclxuICAgIE1vZGVsLnByb3RvdHlwZS5pc0RpbWVuc2lvbiA9IGZ1bmN0aW9uIChjaGFubmVsKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuaGFzKGNoYW5uZWwpICYmXHJcbiAgICAgICAgICAgIHZsRmllbGREZWYuaXNEaW1lbnNpb24odGhpcy5maWVsZERlZihjaGFubmVsKSk7XHJcbiAgICB9O1xyXG4gICAgTW9kZWwucHJvdG90eXBlLmlzTWVhc3VyZSA9IGZ1bmN0aW9uIChjaGFubmVsKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuaGFzKGNoYW5uZWwpICYmXHJcbiAgICAgICAgICAgIHZsRmllbGREZWYuaXNNZWFzdXJlKHRoaXMuZmllbGREZWYoY2hhbm5lbCkpO1xyXG4gICAgfTtcclxuICAgIE1vZGVsLnByb3RvdHlwZS5pc0FnZ3JlZ2F0ZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4gdmxFbmNvZGluZy5pc0FnZ3JlZ2F0ZSh0aGlzLl9zcGVjLmVuY29kaW5nKTtcclxuICAgIH07XHJcbiAgICBNb2RlbC5wcm90b3R5cGUuaXNGYWNldCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5oYXMoY2hhbm5lbF8xLlJPVykgfHwgdGhpcy5oYXMoY2hhbm5lbF8xLkNPTFVNTik7XHJcbiAgICB9O1xyXG4gICAgTW9kZWwucHJvdG90eXBlLmRhdGFUYWJsZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5pc0FnZ3JlZ2F0ZSgpID8gZGF0YV8xLlNVTU1BUlkgOiBkYXRhXzEuU09VUkNFO1xyXG4gICAgfTtcclxuICAgIE1vZGVsLnByb3RvdHlwZS5kYXRhID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9zcGVjLmRhdGE7XHJcbiAgICB9O1xyXG4gICAgTW9kZWwucHJvdG90eXBlLmhhc1ZhbHVlcyA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB2YXIgdmFscyA9IHRoaXMuZGF0YSgpLnZhbHVlcztcclxuICAgICAgICByZXR1cm4gdmFscyAmJiB2YWxzLmxlbmd0aDtcclxuICAgIH07XHJcbiAgICBNb2RlbC5wcm90b3R5cGUuY29uZmlnID0gZnVuY3Rpb24gKG5hbWUpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5fc3BlYy5jb25maWdbbmFtZV07XHJcbiAgICB9O1xyXG4gICAgTW9kZWwucHJvdG90eXBlLm1hcmtPcGFjaXR5ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHZhciBvcGFjaXR5ID0gdGhpcy5jb25maWcoJ21hcmtzJykub3BhY2l0eTtcclxuICAgICAgICBpZiAob3BhY2l0eSkge1xyXG4gICAgICAgICAgICByZXR1cm4gb3BhY2l0eTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIGlmICh1dGlsXzEuY29udGFpbnMoW21hcmtfMS5QT0lOVCwgbWFya18xLlRJQ0ssIG1hcmtfMS5DSVJDTEUsIG1hcmtfMS5TUVVBUkVdLCB0aGlzLm1hcmsoKSkpIHtcclxuICAgICAgICAgICAgICAgIGlmICghdGhpcy5pc0FnZ3JlZ2F0ZSgpIHx8XHJcbiAgICAgICAgICAgICAgICAgICAgKHRoaXMuaGFzKGNoYW5uZWxfMS5ERVRBSUwpIHx8IHRoaXMuaGFzKGNoYW5uZWxfMS5DT0xPUikgfHwgdGhpcy5oYXMoY2hhbm5lbF8xLlNIQVBFKSkpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gMC43O1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XHJcbiAgICB9O1xyXG4gICAgcmV0dXJuIE1vZGVsO1xyXG59KSgpO1xyXG5leHBvcnRzLk1vZGVsID0gTW9kZWw7XHJcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPU1vZGVsLmpzLm1hcCIsInZhciBjaGFubmVsXzEgPSByZXF1aXJlKCcuLi9jaGFubmVsJyk7XHJcbnZhciBtYXJrXzEgPSByZXF1aXJlKCcuLi9tYXJrJyk7XHJcbnZhciBkYXRhXzEgPSByZXF1aXJlKCcuLi9kYXRhJyk7XHJcbmZ1bmN0aW9uIGNvbXBpbGVMYXlvdXQobW9kZWwpIHtcclxuICAgIHZhciBjZWxsV2lkdGggPSBnZXRDZWxsV2lkdGgobW9kZWwpO1xyXG4gICAgdmFyIGNlbGxIZWlnaHQgPSBnZXRDZWxsSGVpZ2h0KG1vZGVsKTtcclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgY2VsbFdpZHRoOiBjZWxsV2lkdGgsXHJcbiAgICAgICAgY2VsbEhlaWdodDogY2VsbEhlaWdodCxcclxuICAgICAgICB3aWR0aDogZ2V0V2lkdGgobW9kZWwsIGNlbGxXaWR0aCksXHJcbiAgICAgICAgaGVpZ2h0OiBnZXRIZWlnaHQobW9kZWwsIGNlbGxIZWlnaHQpXHJcbiAgICB9O1xyXG59XHJcbmV4cG9ydHMuY29tcGlsZUxheW91dCA9IGNvbXBpbGVMYXlvdXQ7XHJcbmZ1bmN0aW9uIGdldENlbGxXaWR0aChtb2RlbCkge1xyXG4gICAgaWYgKG1vZGVsLmhhcyhjaGFubmVsXzEuWCkpIHtcclxuICAgICAgICBpZiAobW9kZWwuaXNPcmRpbmFsU2NhbGUoY2hhbm5lbF8xLlgpKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IGRhdGE6IGRhdGFfMS5MQVlPVVQsIGZpZWxkOiAnY2VsbFdpZHRoJyB9O1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gbW9kZWwuY29uZmlnKCdjZWxsJykud2lkdGg7XHJcbiAgICB9XHJcbiAgICBpZiAobW9kZWwubWFyaygpID09PSBtYXJrXzEuVEVYVCkge1xyXG4gICAgICAgIHJldHVybiBtb2RlbC5jb25maWcoJ3RleHRDZWxsV2lkdGgnKTtcclxuICAgIH1cclxuICAgIHJldHVybiBtb2RlbC5maWVsZERlZihjaGFubmVsXzEuWCkuc2NhbGUuYmFuZFdpZHRoO1xyXG59XHJcbmZ1bmN0aW9uIGdldFdpZHRoKG1vZGVsLCBjZWxsV2lkdGgpIHtcclxuICAgIGlmIChtb2RlbC5oYXMoY2hhbm5lbF8xLkNPTFVNTikpIHtcclxuICAgICAgICByZXR1cm4geyBkYXRhOiBkYXRhXzEuTEFZT1VULCBmaWVsZDogJ3dpZHRoJyB9O1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIGNlbGxXaWR0aDtcclxufVxyXG5mdW5jdGlvbiBnZXRDZWxsSGVpZ2h0KG1vZGVsKSB7XHJcbiAgICBpZiAobW9kZWwuaGFzKGNoYW5uZWxfMS5ZKSkge1xyXG4gICAgICAgIGlmIChtb2RlbC5pc09yZGluYWxTY2FsZShjaGFubmVsXzEuWSkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgZGF0YTogZGF0YV8xLkxBWU9VVCwgZmllbGQ6ICdjZWxsSGVpZ2h0JyB9O1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgcmV0dXJuIG1vZGVsLmNvbmZpZygnY2VsbCcpLmhlaWdodDtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gbW9kZWwuZmllbGREZWYoY2hhbm5lbF8xLlkpLnNjYWxlLmJhbmRXaWR0aDtcclxufVxyXG5mdW5jdGlvbiBnZXRIZWlnaHQobW9kZWwsIGNlbGxIZWlnaHQpIHtcclxuICAgIGlmIChtb2RlbC5oYXMoY2hhbm5lbF8xLlJPVykpIHtcclxuICAgICAgICByZXR1cm4geyBkYXRhOiBkYXRhXzEuTEFZT1VULCBmaWVsZDogJ2hlaWdodCcgfTtcclxuICAgIH1cclxuICAgIHJldHVybiBjZWxsSGVpZ2h0O1xyXG59XHJcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWxheW91dC5qcy5tYXAiLCJ2YXIgdXRpbCA9IHJlcXVpcmUoJy4uL3V0aWwnKTtcclxudmFyIGNoYW5uZWxfMSA9IHJlcXVpcmUoJy4uL2NoYW5uZWwnKTtcclxuZnVuY3Rpb24gY2FyZGluYWxpdHkoZmllbGREZWYsIHN0YXRzLCBmaWx0ZXJOdWxsLCB0eXBlKSB7XHJcbiAgICB2YXIgdGltZVVuaXQgPSBmaWVsZERlZi50aW1lVW5pdDtcclxuICAgIHN3aXRjaCAodGltZVVuaXQpIHtcclxuICAgICAgICBjYXNlICdzZWNvbmRzJzogcmV0dXJuIDYwO1xyXG4gICAgICAgIGNhc2UgJ21pbnV0ZXMnOiByZXR1cm4gNjA7XHJcbiAgICAgICAgY2FzZSAnaG91cnMnOiByZXR1cm4gMjQ7XHJcbiAgICAgICAgY2FzZSAnZGF5JzogcmV0dXJuIDc7XHJcbiAgICAgICAgY2FzZSAnZGF0ZSc6IHJldHVybiAzMTtcclxuICAgICAgICBjYXNlICdtb250aCc6IHJldHVybiAxMjtcclxuICAgICAgICBjYXNlICd5ZWFyJzpcclxuICAgICAgICAgICAgdmFyIHN0YXQgPSBzdGF0c1tmaWVsZERlZi5maWVsZF0sIHllYXJzdGF0ID0gc3RhdHNbJ3llYXJfJyArIGZpZWxkRGVmLmZpZWxkXTtcclxuICAgICAgICAgICAgaWYgKCF5ZWFyc3RhdCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHllYXJzdGF0LmRpc3RpbmN0IC1cclxuICAgICAgICAgICAgICAgIChzdGF0Lm1pc3NpbmcgPiAwICYmIGZpbHRlck51bGxbdHlwZV0gPyAxIDogMCk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gbnVsbDtcclxufVxyXG5leHBvcnRzLmNhcmRpbmFsaXR5ID0gY2FyZGluYWxpdHk7XHJcbmZ1bmN0aW9uIGZvcm11bGEodGltZVVuaXQsIGZpZWxkKSB7XHJcbiAgICB2YXIgZm4gPSAndXRjJyArIHRpbWVVbml0O1xyXG4gICAgcmV0dXJuIGZuICsgJygnICsgZmllbGQgKyAnKSc7XHJcbn1cclxuZXhwb3J0cy5mb3JtdWxhID0gZm9ybXVsYTtcclxudmFyIHNjYWxlO1xyXG4oZnVuY3Rpb24gKHNjYWxlKSB7XHJcbiAgICBmdW5jdGlvbiB0eXBlKHRpbWVVbml0LCBjaGFubmVsKSB7XHJcbiAgICAgICAgaWYgKGNoYW5uZWwgPT09IGNoYW5uZWxfMS5DT0xPUikge1xyXG4gICAgICAgICAgICByZXR1cm4gJ2xpbmVhcic7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChjaGFubmVsID09PSBjaGFubmVsXzEuQ09MVU1OIHx8IGNoYW5uZWwgPT09IGNoYW5uZWxfMS5ST1cpIHtcclxuICAgICAgICAgICAgcmV0dXJuICdvcmRpbmFsJztcclxuICAgICAgICB9XHJcbiAgICAgICAgc3dpdGNoICh0aW1lVW5pdCkge1xyXG4gICAgICAgICAgICBjYXNlICdob3Vycyc6XHJcbiAgICAgICAgICAgIGNhc2UgJ2RheSc6XHJcbiAgICAgICAgICAgIGNhc2UgJ2RhdGUnOlxyXG4gICAgICAgICAgICBjYXNlICdtb250aCc6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gJ29yZGluYWwnO1xyXG4gICAgICAgICAgICBjYXNlICd5ZWFyJzpcclxuICAgICAgICAgICAgY2FzZSAnc2Vjb25kJzpcclxuICAgICAgICAgICAgY2FzZSAnbWludXRlJzpcclxuICAgICAgICAgICAgICAgIHJldHVybiAnbGluZWFyJztcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuICd0aW1lJztcclxuICAgIH1cclxuICAgIHNjYWxlLnR5cGUgPSB0eXBlO1xyXG4gICAgZnVuY3Rpb24gZG9tYWluKHRpbWVVbml0LCBjaGFubmVsKSB7XHJcbiAgICAgICAgdmFyIGlzQ29sb3IgPSBjaGFubmVsID09PSBjaGFubmVsXzEuQ09MT1I7XHJcbiAgICAgICAgc3dpdGNoICh0aW1lVW5pdCkge1xyXG4gICAgICAgICAgICBjYXNlICdzZWNvbmRzJzpcclxuICAgICAgICAgICAgY2FzZSAnbWludXRlcyc6IHJldHVybiBpc0NvbG9yID8gWzAsIDU5XSA6IHV0aWwucmFuZ2UoMCwgNjApO1xyXG4gICAgICAgICAgICBjYXNlICdob3Vycyc6IHJldHVybiBpc0NvbG9yID8gWzAsIDIzXSA6IHV0aWwucmFuZ2UoMCwgMjQpO1xyXG4gICAgICAgICAgICBjYXNlICdkYXknOiByZXR1cm4gaXNDb2xvciA/IFswLCA2XSA6IHV0aWwucmFuZ2UoMCwgNyk7XHJcbiAgICAgICAgICAgIGNhc2UgJ2RhdGUnOiByZXR1cm4gaXNDb2xvciA/IFsxLCAzMV0gOiB1dGlsLnJhbmdlKDEsIDMyKTtcclxuICAgICAgICAgICAgY2FzZSAnbW9udGgnOiByZXR1cm4gaXNDb2xvciA/IFswLCAxMV0gOiB1dGlsLnJhbmdlKDAsIDEyKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9XHJcbiAgICBzY2FsZS5kb21haW4gPSBkb21haW47XHJcbn0pKHNjYWxlID0gZXhwb3J0cy5zY2FsZSB8fCAoZXhwb3J0cy5zY2FsZSA9IHt9KSk7XHJcbmZ1bmN0aW9uIGxhYmVsVGVtcGxhdGUodGltZVVuaXQsIGFiYnJldmlhdGVkKSB7XHJcbiAgICBpZiAoYWJicmV2aWF0ZWQgPT09IHZvaWQgMCkgeyBhYmJyZXZpYXRlZCA9IGZhbHNlOyB9XHJcbiAgICB2YXIgcG9zdGZpeCA9IGFiYnJldmlhdGVkID8gJy1hYmJyZXYnIDogJyc7XHJcbiAgICBzd2l0Y2ggKHRpbWVVbml0KSB7XHJcbiAgICAgICAgY2FzZSAnZGF5JzpcclxuICAgICAgICAgICAgcmV0dXJuICdkYXknICsgcG9zdGZpeDtcclxuICAgICAgICBjYXNlICdtb250aCc6XHJcbiAgICAgICAgICAgIHJldHVybiAnbW9udGgnICsgcG9zdGZpeDtcclxuICAgIH1cclxuICAgIHJldHVybiBudWxsO1xyXG59XHJcbmV4cG9ydHMubGFiZWxUZW1wbGF0ZSA9IGxhYmVsVGVtcGxhdGU7XHJcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXRpbWUuanMubWFwIiwidmFyIHR5cGVfMSA9IHJlcXVpcmUoJy4vdHlwZScpO1xyXG5leHBvcnRzLlNVTU1BUlkgPSAnc3VtbWFyeSc7XHJcbmV4cG9ydHMuU09VUkNFID0gJ3NvdXJjZSc7XHJcbmV4cG9ydHMuU1RBQ0tFRCA9ICdzdGFja2VkJztcclxuZXhwb3J0cy5MQVlPVVQgPSAnbGF5b3V0JztcclxuZXhwb3J0cy50eXBlcyA9IHtcclxuICAgICdib29sZWFuJzogdHlwZV8xLk5PTUlOQUwsXHJcbiAgICAnbnVtYmVyJzogdHlwZV8xLlFVQU5USVRBVElWRSxcclxuICAgICdpbnRlZ2VyJzogdHlwZV8xLlFVQU5USVRBVElWRSxcclxuICAgICdkYXRlJzogdHlwZV8xLlRFTVBPUkFMLFxyXG4gICAgJ3N0cmluZyc6IHR5cGVfMS5OT01JTkFMXHJcbn07XHJcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWRhdGEuanMubWFwIiwidmFyIGNoYW5uZWxfMSA9IHJlcXVpcmUoJy4vY2hhbm5lbCcpO1xyXG5mdW5jdGlvbiBjb3VudFJldGluYWwoZW5jb2RpbmcpIHtcclxuICAgIHZhciBjb3VudCA9IDA7XHJcbiAgICBpZiAoZW5jb2RpbmcuY29sb3IpXHJcbiAgICAgICAgY291bnQrKztcclxuICAgIGlmIChlbmNvZGluZy5zaXplKVxyXG4gICAgICAgIGNvdW50Kys7XHJcbiAgICBpZiAoZW5jb2Rpbmcuc2hhcGUpXHJcbiAgICAgICAgY291bnQrKztcclxuICAgIHJldHVybiBjb3VudDtcclxufVxyXG5leHBvcnRzLmNvdW50UmV0aW5hbCA9IGNvdW50UmV0aW5hbDtcclxuZnVuY3Rpb24gaGFzKGVuY29kaW5nLCBjaGFubmVsKSB7XHJcbiAgICB2YXIgZmllbGREZWYgPSBlbmNvZGluZyAmJiBlbmNvZGluZ1tjaGFubmVsXTtcclxuICAgIHJldHVybiBmaWVsZERlZiAmJiBmaWVsZERlZi5maWVsZDtcclxufVxyXG5leHBvcnRzLmhhcyA9IGhhcztcclxuZnVuY3Rpb24gaXNBZ2dyZWdhdGUoZW5jb2RpbmcpIHtcclxuICAgIGZvciAodmFyIGsgaW4gZW5jb2RpbmcpIHtcclxuICAgICAgICBpZiAoaGFzKGVuY29kaW5nLCBrKSAmJiBlbmNvZGluZ1trXS5hZ2dyZWdhdGUpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIGZhbHNlO1xyXG59XHJcbmV4cG9ydHMuaXNBZ2dyZWdhdGUgPSBpc0FnZ3JlZ2F0ZTtcclxuZnVuY3Rpb24gZmllbGREZWZzKGVuY29kaW5nKSB7XHJcbiAgICB2YXIgYXJyID0gW107XHJcbiAgICBjaGFubmVsXzEuQ0hBTk5FTFMuZm9yRWFjaChmdW5jdGlvbiAoaykge1xyXG4gICAgICAgIGlmIChoYXMoZW5jb2RpbmcsIGspKSB7XHJcbiAgICAgICAgICAgIGFyci5wdXNoKGVuY29kaW5nW2tdKTtcclxuICAgICAgICB9XHJcbiAgICB9KTtcclxuICAgIHJldHVybiBhcnI7XHJcbn1cclxuZXhwb3J0cy5maWVsZERlZnMgPSBmaWVsZERlZnM7XHJcbjtcclxuZnVuY3Rpb24gZm9yRWFjaChlbmNvZGluZywgZikge1xyXG4gICAgdmFyIGkgPSAwO1xyXG4gICAgY2hhbm5lbF8xLkNIQU5ORUxTLmZvckVhY2goZnVuY3Rpb24gKGNoYW5uZWwpIHtcclxuICAgICAgICBpZiAoaGFzKGVuY29kaW5nLCBjaGFubmVsKSkge1xyXG4gICAgICAgICAgICBmKGVuY29kaW5nW2NoYW5uZWxdLCBjaGFubmVsLCBpKyspO1xyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG59XHJcbmV4cG9ydHMuZm9yRWFjaCA9IGZvckVhY2g7XHJcbmZ1bmN0aW9uIG1hcChlbmNvZGluZywgZikge1xyXG4gICAgdmFyIGFyciA9IFtdO1xyXG4gICAgY2hhbm5lbF8xLkNIQU5ORUxTLmZvckVhY2goZnVuY3Rpb24gKGspIHtcclxuICAgICAgICBpZiAoaGFzKGVuY29kaW5nLCBrKSkge1xyXG4gICAgICAgICAgICBhcnIucHVzaChmKGVuY29kaW5nW2tdLCBrLCBlbmNvZGluZykpO1xyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG4gICAgcmV0dXJuIGFycjtcclxufVxyXG5leHBvcnRzLm1hcCA9IG1hcDtcclxuZnVuY3Rpb24gcmVkdWNlKGVuY29kaW5nLCBmLCBpbml0KSB7XHJcbiAgICB2YXIgciA9IGluaXQ7XHJcbiAgICBjaGFubmVsXzEuQ0hBTk5FTFMuZm9yRWFjaChmdW5jdGlvbiAoaykge1xyXG4gICAgICAgIGlmIChoYXMoZW5jb2RpbmcsIGspKSB7XHJcbiAgICAgICAgICAgIHIgPSBmKHIsIGVuY29kaW5nW2tdLCBrLCBlbmNvZGluZyk7XHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcbiAgICByZXR1cm4gcjtcclxufVxyXG5leHBvcnRzLnJlZHVjZSA9IHJlZHVjZTtcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZW5jb2RpbmcuanMubWFwIiwidmFyIGJpbl8xID0gcmVxdWlyZSgnLi9iaW4nKTtcclxudmFyIHV0aWxfMSA9IHJlcXVpcmUoJy4vdXRpbCcpO1xyXG52YXIgdGltZSA9IHJlcXVpcmUoJy4vY29tcGlsZXIvdGltZScpO1xyXG52YXIgdHlwZV8xID0gcmVxdWlyZSgnLi90eXBlJyk7XHJcbmZ1bmN0aW9uIF9pc0ZpZWxkRGltZW5zaW9uKGZpZWxkRGVmKSB7XHJcbiAgICByZXR1cm4gdXRpbF8xLmNvbnRhaW5zKFt0eXBlXzEuTk9NSU5BTCwgdHlwZV8xLk9SRElOQUxdLCBmaWVsZERlZi50eXBlKSB8fCAhIWZpZWxkRGVmLmJpbiB8fFxyXG4gICAgICAgIChmaWVsZERlZi50eXBlID09PSB0eXBlXzEuVEVNUE9SQUwgJiYgISFmaWVsZERlZi50aW1lVW5pdCk7XHJcbn1cclxuZnVuY3Rpb24gaXNEaW1lbnNpb24oZmllbGREZWYpIHtcclxuICAgIHJldHVybiBmaWVsZERlZiAmJiBfaXNGaWVsZERpbWVuc2lvbihmaWVsZERlZik7XHJcbn1cclxuZXhwb3J0cy5pc0RpbWVuc2lvbiA9IGlzRGltZW5zaW9uO1xyXG5mdW5jdGlvbiBpc01lYXN1cmUoZmllbGREZWYpIHtcclxuICAgIHJldHVybiBmaWVsZERlZiAmJiAhX2lzRmllbGREaW1lbnNpb24oZmllbGREZWYpO1xyXG59XHJcbmV4cG9ydHMuaXNNZWFzdXJlID0gaXNNZWFzdXJlO1xyXG5mdW5jdGlvbiBjb3VudCgpIHtcclxuICAgIHJldHVybiB7IGZpZWxkOiAnKicsIGFnZ3JlZ2F0ZTogJ2NvdW50JywgdHlwZTogdHlwZV8xLlFVQU5USVRBVElWRSwgZGlzcGxheU5hbWU6IGV4cG9ydHMuQ09VTlRfRElTUExBWU5BTUUgfTtcclxufVxyXG5leHBvcnRzLmNvdW50ID0gY291bnQ7XHJcbmV4cG9ydHMuQ09VTlRfRElTUExBWU5BTUUgPSAnTnVtYmVyIG9mIFJlY29yZHMnO1xyXG5mdW5jdGlvbiBpc0NvdW50KGZpZWxkRGVmKSB7XHJcbiAgICByZXR1cm4gZmllbGREZWYuYWdncmVnYXRlID09PSAnY291bnQnO1xyXG59XHJcbmV4cG9ydHMuaXNDb3VudCA9IGlzQ291bnQ7XHJcbmZ1bmN0aW9uIGNhcmRpbmFsaXR5KGZpZWxkRGVmLCBzdGF0cywgZmlsdGVyTnVsbCkge1xyXG4gICAgaWYgKGZpbHRlck51bGwgPT09IHZvaWQgMCkgeyBmaWx0ZXJOdWxsID0ge307IH1cclxuICAgIHZhciBzdGF0ID0gc3RhdHNbZmllbGREZWYuZmllbGRdO1xyXG4gICAgdmFyIHR5cGUgPSBmaWVsZERlZi50eXBlO1xyXG4gICAgaWYgKGZpZWxkRGVmLmJpbikge1xyXG4gICAgICAgIHZhciBiaW4gPSBmaWVsZERlZi5iaW47XHJcbiAgICAgICAgdmFyIG1heGJpbnMgPSAodHlwZW9mIGJpbiA9PT0gJ2Jvb2xlYW4nKSA/IGJpbl8xLk1BWEJJTlNfREVGQVVMVCA6IGJpbi5tYXhiaW5zO1xyXG4gICAgICAgIHZhciBiaW5zID0gdXRpbF8xLmdldGJpbnMoc3RhdCwgbWF4Ymlucyk7XHJcbiAgICAgICAgcmV0dXJuIChiaW5zLnN0b3AgLSBiaW5zLnN0YXJ0KSAvIGJpbnMuc3RlcDtcclxuICAgIH1cclxuICAgIGlmIChmaWVsZERlZi50eXBlID09PSB0eXBlXzEuVEVNUE9SQUwpIHtcclxuICAgICAgICB2YXIgY2FyZGluYWxpdHkgPSB0aW1lLmNhcmRpbmFsaXR5KGZpZWxkRGVmLCBzdGF0cywgZmlsdGVyTnVsbCwgdHlwZSk7XHJcbiAgICAgICAgaWYgKGNhcmRpbmFsaXR5ICE9PSBudWxsKVxyXG4gICAgICAgICAgICByZXR1cm4gY2FyZGluYWxpdHk7XHJcbiAgICB9XHJcbiAgICBpZiAoZmllbGREZWYuYWdncmVnYXRlKSB7XHJcbiAgICAgICAgcmV0dXJuIDE7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gc3RhdC5kaXN0aW5jdCAtXHJcbiAgICAgICAgKHN0YXQubWlzc2luZyA+IDAgJiYgZmlsdGVyTnVsbFt0eXBlXSA/IDEgOiAwKTtcclxufVxyXG5leHBvcnRzLmNhcmRpbmFsaXR5ID0gY2FyZGluYWxpdHk7XHJcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWZpZWxkZGVmLmpzLm1hcCIsIihmdW5jdGlvbiAoTWFyaykge1xyXG4gICAgTWFya1tNYXJrW1wiQVJFQVwiXSA9ICdhcmVhJ10gPSBcIkFSRUFcIjtcclxuICAgIE1hcmtbTWFya1tcIkJBUlwiXSA9ICdiYXInXSA9IFwiQkFSXCI7XHJcbiAgICBNYXJrW01hcmtbXCJMSU5FXCJdID0gJ2xpbmUnXSA9IFwiTElORVwiO1xyXG4gICAgTWFya1tNYXJrW1wiUE9JTlRcIl0gPSAncG9pbnQnXSA9IFwiUE9JTlRcIjtcclxuICAgIE1hcmtbTWFya1tcIlRFWFRcIl0gPSAndGV4dCddID0gXCJURVhUXCI7XHJcbiAgICBNYXJrW01hcmtbXCJUSUNLXCJdID0gJ3RpY2snXSA9IFwiVElDS1wiO1xyXG4gICAgTWFya1tNYXJrW1wiQ0lSQ0xFXCJdID0gJ2NpcmNsZSddID0gXCJDSVJDTEVcIjtcclxuICAgIE1hcmtbTWFya1tcIlNRVUFSRVwiXSA9ICdzcXVhcmUnXSA9IFwiU1FVQVJFXCI7XHJcbn0pKGV4cG9ydHMuTWFyayB8fCAoZXhwb3J0cy5NYXJrID0ge30pKTtcclxudmFyIE1hcmsgPSBleHBvcnRzLk1hcms7XHJcbmV4cG9ydHMuQVJFQSA9IE1hcmsuQVJFQTtcclxuZXhwb3J0cy5CQVIgPSBNYXJrLkJBUjtcclxuZXhwb3J0cy5MSU5FID0gTWFyay5MSU5FO1xyXG5leHBvcnRzLlBPSU5UID0gTWFyay5QT0lOVDtcclxuZXhwb3J0cy5URVhUID0gTWFyay5URVhUO1xyXG5leHBvcnRzLlRJQ0sgPSBNYXJrLlRJQ0s7XHJcbmV4cG9ydHMuQ0lSQ0xFID0gTWFyay5DSVJDTEU7XHJcbmV4cG9ydHMuU1FVQVJFID0gTWFyay5TUVVBUkU7XHJcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPW1hcmsuanMubWFwIiwiZXhwb3J0cy5heGlzID0ge1xyXG4gICAgdHlwZTogJ29iamVjdCcsXHJcbiAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgZm9ybWF0OiB7XHJcbiAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxyXG4gICAgICAgICAgICBkZWZhdWx0OiB1bmRlZmluZWQsXHJcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnVGhlIGZvcm1hdHRpbmcgcGF0dGVybiBmb3IgYXhpcyBsYWJlbHMuICcgK1xyXG4gICAgICAgICAgICAgICAgJ0lmIG5vdCB1bmRlZmluZWQsIHRoaXMgd2lsbCBiZSBkZXRlcm1pbmVkIGJ5ICcgK1xyXG4gICAgICAgICAgICAgICAgJ3RoZSBtYXggdmFsdWUgJyArXHJcbiAgICAgICAgICAgICAgICAnb2YgdGhlIGZpZWxkLidcclxuICAgICAgICB9LFxyXG4gICAgICAgIGdyaWQ6IHtcclxuICAgICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxyXG4gICAgICAgICAgICBkZWZhdWx0OiB1bmRlZmluZWQsXHJcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQSBmbGFnIGluZGljYXRlIGlmIGdyaWRsaW5lcyBzaG91bGQgYmUgY3JlYXRlZCBpbiBhZGRpdGlvbiB0byB0aWNrcy4gSWYgYGdyaWRgIGlzIHVuc3BlY2lmaWVkLCB0aGUgZGVmYXVsdCB2YWx1ZSBpcyBgdHJ1ZWAgZm9yIFJPVyBhbmQgQ09MLiBGb3IgWCBhbmQgWSwgdGhlIGRlZmF1bHQgdmFsdWUgaXMgYHRydWVgIGZvciBxdWFudGl0YXRpdmUgYW5kIHRpbWUgZmllbGRzIGFuZCBgZmFsc2VgIG90aGVyd2lzZS4nXHJcbiAgICAgICAgfSxcclxuICAgICAgICBsYXllcjoge1xyXG4gICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcclxuICAgICAgICAgICAgZGVmYXVsdDogdW5kZWZpbmVkLFxyXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0Egc3RyaW5nIGluZGljYXRpbmcgaWYgdGhlIGF4aXMgKGFuZCBhbnkgZ3JpZGxpbmVzKSBzaG91bGQgYmUgcGxhY2VkIGFib3ZlIG9yIGJlbG93IHRoZSBkYXRhIG1hcmtzLidcclxuICAgICAgICB9LFxyXG4gICAgICAgIG9yaWVudDoge1xyXG4gICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcclxuICAgICAgICAgICAgZGVmYXVsdDogdW5kZWZpbmVkLFxyXG4gICAgICAgICAgICBlbnVtOiBbJ3RvcCcsICdyaWdodCcsICdsZWZ0JywgJ2JvdHRvbSddLFxyXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1RoZSBvcmllbnRhdGlvbiBvZiB0aGUgYXhpcy4gT25lIG9mIHRvcCwgYm90dG9tLCBsZWZ0IG9yIHJpZ2h0LiBUaGUgb3JpZW50YXRpb24gY2FuIGJlIHVzZWQgdG8gZnVydGhlciBzcGVjaWFsaXplIHRoZSBheGlzIHR5cGUgKGUuZy4sIGEgeSBheGlzIG9yaWVudGVkIGZvciB0aGUgcmlnaHQgZWRnZSBvZiB0aGUgY2hhcnQpLidcclxuICAgICAgICB9LFxyXG4gICAgICAgIHRpY2tzOiB7XHJcbiAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyJyxcclxuICAgICAgICAgICAgZGVmYXVsdDogdW5kZWZpbmVkLFxyXG4gICAgICAgICAgICBtaW5pbXVtOiAwLFxyXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0EgZGVzaXJlZCBudW1iZXIgb2YgdGlja3MsIGZvciBheGVzIHZpc3VhbGl6aW5nIHF1YW50aXRhdGl2ZSBzY2FsZXMuIFRoZSByZXN1bHRpbmcgbnVtYmVyIG1heSBiZSBkaWZmZXJlbnQgc28gdGhhdCB2YWx1ZXMgYXJlIFwibmljZVwiIChtdWx0aXBsZXMgb2YgMiwgNSwgMTApIGFuZCBsaWUgd2l0aGluIHRoZSB1bmRlcmx5aW5nIHNjYWxlXFwncyByYW5nZS4nXHJcbiAgICAgICAgfSxcclxuICAgICAgICB0aXRsZToge1xyXG4gICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcclxuICAgICAgICAgICAgZGVmYXVsdDogdW5kZWZpbmVkLFxyXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0EgdGl0bGUgZm9yIHRoZSBheGlzLiAoU2hvd3MgZmllbGQgbmFtZSBhbmQgaXRzIGZ1bmN0aW9uIGJ5IGRlZmF1bHQuKSdcclxuICAgICAgICB9LFxyXG4gICAgICAgIGxhYmVsTWF4TGVuZ3RoOiB7XHJcbiAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyJyxcclxuICAgICAgICAgICAgZGVmYXVsdDogMjUsXHJcbiAgICAgICAgICAgIG1pbmltdW06IDAsXHJcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnVHJ1bmNhdGUgbGFiZWxzIHRoYXQgYXJlIHRvbyBsb25nLidcclxuICAgICAgICB9LFxyXG4gICAgICAgIHRpdGxlTWF4TGVuZ3RoOiB7XHJcbiAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyJyxcclxuICAgICAgICAgICAgZGVmYXVsdDogdW5kZWZpbmVkLFxyXG4gICAgICAgICAgICBtaW5pbXVtOiAwLFxyXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogJ01heCBsZW5ndGggZm9yIGF4aXMgdGl0bGUgaWYgdGhlIHRpdGxlIGlzIGF1dG9tYXRpY2FsbHkgZ2VuZXJhdGVkIGZyb20gdGhlIGZpZWxkXFwncyBkZXNjcmlwdGlvbidcclxuICAgICAgICB9LFxyXG4gICAgICAgIHRpdGxlT2Zmc2V0OiB7XHJcbiAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyJyxcclxuICAgICAgICAgICAgZGVmYXVsdDogdW5kZWZpbmVkLFxyXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0EgdGl0bGUgb2Zmc2V0IHZhbHVlIGZvciB0aGUgYXhpcy4nXHJcbiAgICAgICAgfSxcclxuICAgICAgICBzaG9ydFRpbWVOYW1lczoge1xyXG4gICAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXHJcbiAgICAgICAgICAgIGRlZmF1bHQ6IGZhbHNlLFxyXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1doZXRoZXIgbW9udGggbmFtZXMgYW5kIHdlZWtkYXkgbmFtZXMgc2hvdWxkIGJlIGFiYnJldmlhdGVkLidcclxuICAgICAgICB9LFxyXG4gICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXHJcbiAgICAgICAgICAgIGRlZmF1bHQ6IHVuZGVmaW5lZCxcclxuICAgICAgICAgICAgZGVzY3JpcHRpb246ICdPcHRpb25hbCBtYXJrIHByb3BlcnR5IGRlZmluaXRpb25zIGZvciBjdXN0b20gYXhpcyBzdHlsaW5nLidcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn07XHJcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWF4aXMuc2NoZW1hLmpzLm1hcCIsInZhciBiaW5fMSA9IHJlcXVpcmUoJy4uL2JpbicpO1xyXG52YXIgdHlwZV8xID0gcmVxdWlyZSgnLi4vdHlwZScpO1xyXG52YXIgdXRpbF8xID0gcmVxdWlyZSgnLi4vdXRpbCcpO1xyXG5leHBvcnRzLmJpbiA9IHtcclxuICAgIHR5cGU6IFsnYm9vbGVhbicsICdvYmplY3QnXSxcclxuICAgIGRlZmF1bHQ6IGZhbHNlLFxyXG4gICAgcHJvcGVydGllczoge1xyXG4gICAgICAgIG1heGJpbnM6IHtcclxuICAgICAgICAgICAgdHlwZTogJ2ludGVnZXInLFxyXG4gICAgICAgICAgICBkZWZhdWx0OiBiaW5fMS5NQVhCSU5TX0RFRkFVTFQsXHJcbiAgICAgICAgICAgIG1pbmltdW06IDIsXHJcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnTWF4aW11bSBudW1iZXIgb2YgYmlucy4nXHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuICAgIHN1cHBvcnRlZFR5cGVzOiB1dGlsXzEudG9NYXAoW3R5cGVfMS5RVUFOVElUQVRJVkVdKVxyXG59O1xyXG4vLyMgc291cmNlTWFwcGluZ1VSTD1iaW4uc2NoZW1hLmpzLm1hcCIsImV4cG9ydHMuY2VsbENvbmZpZyA9IHtcclxuICAgIHR5cGU6ICdvYmplY3QnLFxyXG4gICAgcHJvcGVydGllczoge1xyXG4gICAgICAgIHdpZHRoOiB7XHJcbiAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyJyxcclxuICAgICAgICAgICAgZGVmYXVsdDogMjAwXHJcbiAgICAgICAgfSxcclxuICAgICAgICBoZWlnaHQ6IHtcclxuICAgICAgICAgICAgdHlwZTogJ2ludGVnZXInLFxyXG4gICAgICAgICAgICBkZWZhdWx0OiAyMDBcclxuICAgICAgICB9LFxyXG4gICAgICAgIHBhZGRpbmc6IHtcclxuICAgICAgICAgICAgdHlwZTogJ2ludGVnZXInLFxyXG4gICAgICAgICAgICBkZWZhdWx0OiAxNixcclxuICAgICAgICAgICAgZGVzY3JpcHRpb246ICdkZWZhdWx0IHBhZGRpbmcgYmV0d2VlbiBmYWNldHMuJ1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZ3JpZENvbG9yOiB7XHJcbiAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxyXG4gICAgICAgICAgICByb2xlOiAnY29sb3InLFxyXG4gICAgICAgICAgICBkZWZhdWx0OiAnIzAwMDAwMCdcclxuICAgICAgICB9LFxyXG4gICAgICAgIGdyaWRPcGFjaXR5OiB7XHJcbiAgICAgICAgICAgIHR5cGU6ICdudW1iZXInLFxyXG4gICAgICAgICAgICBtaW5pbXVtOiAwLFxyXG4gICAgICAgICAgICBtYXhpbXVtOiAxLFxyXG4gICAgICAgICAgICBkZWZhdWx0OiAwLjI1XHJcbiAgICAgICAgfSxcclxuICAgICAgICBncmlkT2Zmc2V0OiB7XHJcbiAgICAgICAgICAgIHR5cGU6ICdudW1iZXInLFxyXG4gICAgICAgICAgICBkZWZhdWx0OiA2XHJcbiAgICAgICAgfSxcclxuICAgICAgICBmaWxsOiB7XHJcbiAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxyXG4gICAgICAgICAgICByb2xlOiAnY29sb3InLFxyXG4gICAgICAgICAgICBkZWZhdWx0OiAncmdiYSgwLDAsMCwwKSdcclxuICAgICAgICB9LFxyXG4gICAgICAgIGZpbGxPcGFjaXR5OiB7XHJcbiAgICAgICAgICAgIHR5cGU6ICdudW1iZXInLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgc3Ryb2tlOiB7XHJcbiAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxyXG4gICAgICAgICAgICByb2xlOiAnY29sb3InLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgc3Ryb2tlV2lkdGg6IHtcclxuICAgICAgICAgICAgdHlwZTogJ2ludGVnZXInXHJcbiAgICAgICAgfSxcclxuICAgICAgICBzdHJva2VPcGFjaXR5OiB7XHJcbiAgICAgICAgICAgIHR5cGU6ICdudW1iZXInXHJcbiAgICAgICAgfSxcclxuICAgICAgICBzdHJva2VEYXNoOiB7XHJcbiAgICAgICAgICAgIHR5cGU6ICdhcnJheScsXHJcbiAgICAgICAgICAgIGRlZmF1bHQ6IHVuZGVmaW5lZFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgc3Ryb2tlRGFzaE9mZnNldDoge1xyXG4gICAgICAgICAgICB0eXBlOiAnaW50ZWdlcicsXHJcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnVGhlIG9mZnNldCAoaW4gcGl4ZWxzKSBpbnRvIHdoaWNoIHRvIGJlZ2luIGRyYXdpbmcgd2l0aCB0aGUgc3Ryb2tlIGRhc2ggYXJyYXkuJ1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufTtcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9Y29uZmlnLmNlbGwuc2NoZW1hLmpzLm1hcCIsImV4cG9ydHMubWFya3NDb25maWcgPSB7XHJcbiAgICB0eXBlOiAnb2JqZWN0JyxcclxuICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICBmaWxsZWQ6IHtcclxuICAgICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxyXG4gICAgICAgICAgICBkZWZhdWx0OiBmYWxzZSxcclxuICAgICAgICAgICAgZGVzY3JpcHRpb246ICdXaGV0aGVyIHRoZSBzaGFwZVxcJ3MgY29sb3Igc2hvdWxkIGJlIHVzZWQgYXMgZmlsbCBjb2xvciBpbnN0ZWFkIG9mIHN0cm9rZSBjb2xvci4nXHJcbiAgICAgICAgfSxcclxuICAgICAgICBmb3JtYXQ6IHtcclxuICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXHJcbiAgICAgICAgICAgIGRlZmF1bHQ6ICcnLFxyXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1RoZSBmb3JtYXR0aW5nIHBhdHRlcm4gZm9yIHRleHQgdmFsdWUuJyArXHJcbiAgICAgICAgICAgICAgICAnSWYgbm90IGRlZmluZWQsIHRoaXMgd2lsbCBiZSBkZXRlcm1pbmVkIGF1dG9tYXRpY2FsbHknXHJcbiAgICAgICAgfSxcclxuICAgICAgICBmaWxsOiB7XHJcbiAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxyXG4gICAgICAgICAgICByb2xlOiAnY29sb3InLFxyXG4gICAgICAgICAgICBkZWZhdWx0OiAnIzAwMDAwMCdcclxuICAgICAgICB9LFxyXG4gICAgICAgIG9wYWNpdHk6IHtcclxuICAgICAgICAgICAgdHlwZTogJ251bWJlcicsXHJcbiAgICAgICAgICAgIGRlZmF1bHQ6IHVuZGVmaW5lZCxcclxuICAgICAgICAgICAgbWluaW11bTogMCxcclxuICAgICAgICAgICAgbWF4aW11bTogMVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgc3Ryb2tlV2lkdGg6IHtcclxuICAgICAgICAgICAgdHlwZTogJ2ludGVnZXInLFxyXG4gICAgICAgICAgICBkZWZhdWx0OiAyLFxyXG4gICAgICAgICAgICBtaW5pbXVtOiAwXHJcbiAgICAgICAgfSxcclxuICAgICAgICBzdHJva2VEYXNoOiB7XHJcbiAgICAgICAgICAgIHR5cGU6ICdhcnJheScsXHJcbiAgICAgICAgICAgIGRlZmF1bHQ6IHVuZGVmaW5lZCxcclxuICAgICAgICAgICAgZGVzY3JpcHRpb246ICdBbiBhcnJheSBvZiBhbHRlcm5hdGluZyBzdHJva2UsIHNwYWNlIGxlbmd0aHMgZm9yIGNyZWF0aW5nIGRhc2hlZCBvciBkb3R0ZWQgbGluZXMuJ1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgc3Ryb2tlRGFzaE9mZnNldDoge1xyXG4gICAgICAgICAgICB0eXBlOiAnYXJyYXknLFxyXG4gICAgICAgICAgICBkZWZhdWx0OiB1bmRlZmluZWQsXHJcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnVGhlIG9mZnNldCAoaW4gcGl4ZWxzKSBpbnRvIHdoaWNoIHRvIGJlZ2luIGRyYXdpbmcgd2l0aCB0aGUgc3Ryb2tlIGRhc2ggYXJyYXkuJ1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgb3JpZW50OiB7XHJcbiAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxyXG4gICAgICAgICAgICBkZWZhdWx0OiB1bmRlZmluZWQsXHJcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnVGhlIG9yaWVudGF0aW9uIG9mIHRoaXMgYXJlYSBtYXJrLiBPbmUgb2YgaG9yaXpvbnRhbCAodGhlIGRlZmF1bHQpIG9yIHZlcnRpY2FsLidcclxuICAgICAgICB9LFxyXG4gICAgICAgIGludGVycG9sYXRlOiB7XHJcbiAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxyXG4gICAgICAgICAgICBkZWZhdWx0OiB1bmRlZmluZWQsXHJcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnVGhlIGxpbmUgaW50ZXJwb2xhdGlvbiBtZXRob2QgdG8gdXNlLiBPbmUgb2YgbGluZWFyLCBzdGVwLWJlZm9yZSwgc3RlcC1hZnRlciwgYmFzaXMsIGJhc2lzLW9wZW4sIGJhc2lzLWNsb3NlZCwgYnVuZGxlLCBjYXJkaW5hbCwgY2FyZGluYWwtb3BlbiwgY2FyZGluYWwtY2xvc2VkLCBtb25vdG9uZS4nXHJcbiAgICAgICAgfSxcclxuICAgICAgICB0ZW5zaW9uOiB7XHJcbiAgICAgICAgICAgIHR5cGU6ICdudW1iZXInLFxyXG4gICAgICAgICAgICBkZWZhdWx0OiB1bmRlZmluZWQsXHJcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnRGVwZW5kaW5nIG9uIHRoZSBpbnRlcnBvbGF0aW9uIHR5cGUsIHNldHMgdGhlIHRlbnNpb24gcGFyYW1ldGVyLidcclxuICAgICAgICB9LFxyXG4gICAgICAgIGFsaWduOiB7XHJcbiAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxyXG4gICAgICAgICAgICBkZWZhdWx0OiAncmlnaHQnLFxyXG4gICAgICAgICAgICBlbnVtOiBbJ2xlZnQnLCAncmlnaHQnLCAnY2VudGVyJ10sXHJcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnVGhlIGhvcml6b250YWwgYWxpZ25tZW50IG9mIHRoZSB0ZXh0LiBPbmUgb2YgbGVmdCwgcmlnaHQsIGNlbnRlci4nXHJcbiAgICAgICAgfSxcclxuICAgICAgICBhbmdsZToge1xyXG4gICAgICAgICAgICB0eXBlOiAnbnVtYmVyJyxcclxuICAgICAgICAgICAgZGVmYXVsdDogdW5kZWZpbmVkLFxyXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1RoZSByb3RhdGlvbiBhbmdsZSBvZiB0aGUgdGV4dCwgaW4gZGVncmVlcy4nXHJcbiAgICAgICAgfSxcclxuICAgICAgICBiYXNlbGluZToge1xyXG4gICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcclxuICAgICAgICAgICAgZGVmYXVsdDogJ21pZGRsZScsXHJcbiAgICAgICAgICAgIGVudW06IFsndG9wJywgJ21pZGRsZScsICdib3R0b20nXSxcclxuICAgICAgICAgICAgZGVzY3JpcHRpb246ICdUaGUgdmVydGljYWwgYWxpZ25tZW50IG9mIHRoZSB0ZXh0LiBPbmUgb2YgdG9wLCBtaWRkbGUsIGJvdHRvbS4nXHJcbiAgICAgICAgfSxcclxuICAgICAgICBkeDoge1xyXG4gICAgICAgICAgICB0eXBlOiAnbnVtYmVyJyxcclxuICAgICAgICAgICAgZGVmYXVsdDogdW5kZWZpbmVkLFxyXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1RoZSBob3Jpem9udGFsIG9mZnNldCwgaW4gcGl4ZWxzLCBiZXR3ZWVuIHRoZSB0ZXh0IGxhYmVsIGFuZCBpdHMgYW5jaG9yIHBvaW50LiBUaGUgb2Zmc2V0IGlzIGFwcGxpZWQgYWZ0ZXIgcm90YXRpb24gYnkgdGhlIGFuZ2xlIHByb3BlcnR5LidcclxuICAgICAgICB9LFxyXG4gICAgICAgIGR5OiB7XHJcbiAgICAgICAgICAgIHR5cGU6ICdudW1iZXInLFxyXG4gICAgICAgICAgICBkZWZhdWx0OiB1bmRlZmluZWQsXHJcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnVGhlIHZlcnRpY2FsIG9mZnNldCwgaW4gcGl4ZWxzLCBiZXR3ZWVuIHRoZSB0ZXh0IGxhYmVsIGFuZCBpdHMgYW5jaG9yIHBvaW50LiBUaGUgb2Zmc2V0IGlzIGFwcGxpZWQgYWZ0ZXIgcm90YXRpb24gYnkgdGhlIGFuZ2xlIHByb3BlcnR5LidcclxuICAgICAgICB9LFxyXG4gICAgICAgIGZvbnQ6IHtcclxuICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXHJcbiAgICAgICAgICAgIGRlZmF1bHQ6IHVuZGVmaW5lZCxcclxuICAgICAgICAgICAgcm9sZTogJ2ZvbnQnLFxyXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1RoZSB0eXBlZmFjZSB0byBzZXQgdGhlIHRleHQgaW4gKGUuZy4sIEhlbHZldGljYSBOZXVlKS4nXHJcbiAgICAgICAgfSxcclxuICAgICAgICBmb250U3R5bGU6IHtcclxuICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXHJcbiAgICAgICAgICAgIGRlZmF1bHQ6IHVuZGVmaW5lZCxcclxuICAgICAgICAgICAgZW51bTogWydub3JtYWwnLCAnaXRhbGljJ10sXHJcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnVGhlIGZvbnQgc3R5bGUgKGUuZy4sIGl0YWxpYykuJ1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZm9udFdlaWdodDoge1xyXG4gICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcclxuICAgICAgICAgICAgZW51bTogWydub3JtYWwnLCAnYm9sZCddLFxyXG4gICAgICAgICAgICBkZWZhdWx0OiB1bmRlZmluZWQsXHJcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnVGhlIGZvbnQgd2VpZ2h0IChlLmcuLCBib2xkKS4nXHJcbiAgICAgICAgfSxcclxuICAgICAgICByYWRpdXM6IHtcclxuICAgICAgICAgICAgdHlwZTogJ251bWJlcicsXHJcbiAgICAgICAgICAgIGRlZmF1bHQ6IHVuZGVmaW5lZCxcclxuICAgICAgICAgICAgZGVzY3JpcHRpb246ICdQb2xhciBjb29yZGluYXRlIHJhZGlhbCBvZmZzZXQsIGluIHBpeGVscywgb2YgdGhlIHRleHQgbGFiZWwgZnJvbSB0aGUgb3JpZ2luIGRldGVybWluZWQgYnkgdGhlIHggYW5kIHkgcHJvcGVydGllcy4nXHJcbiAgICAgICAgfSxcclxuICAgICAgICB0aGV0YToge1xyXG4gICAgICAgICAgICB0eXBlOiAnbnVtYmVyJyxcclxuICAgICAgICAgICAgZGVmYXVsdDogdW5kZWZpbmVkLFxyXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1BvbGFyIGNvb3JkaW5hdGUgYW5nbGUsIGluIHJhZGlhbnMsIG9mIHRoZSB0ZXh0IGxhYmVsIGZyb20gdGhlIG9yaWdpbiBkZXRlcm1pbmVkIGJ5IHRoZSB4IGFuZCB5IHByb3BlcnRpZXMuIFZhbHVlcyBmb3IgdGhldGEgZm9sbG93IHRoZSBzYW1lIGNvbnZlbnRpb24gb2YgYXJjIG1hcmsgc3RhcnRBbmdsZSBhbmQgZW5kQW5nbGUgcHJvcGVydGllczogYW5nbGVzIGFyZSBtZWFzdXJlZCBpbiByYWRpYW5zLCB3aXRoIDAgaW5kaWNhdGluZyBcIm5vcnRoXCIuJ1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufTtcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9Y29uZmlnLm1hcmtzLnNjaGVtYS5qcy5tYXAiLCJ2YXIgY29uZmlnX3N0YWNrX3NjaGVtYV8xID0gcmVxdWlyZSgnLi9jb25maWcuc3RhY2suc2NoZW1hJyk7XHJcbnZhciBjb25maWdfY2VsbF9zY2hlbWFfMSA9IHJlcXVpcmUoJy4vY29uZmlnLmNlbGwuc2NoZW1hJyk7XHJcbnZhciBjb25maWdfbWFya3Nfc2NoZW1hXzEgPSByZXF1aXJlKCcuL2NvbmZpZy5tYXJrcy5zY2hlbWEnKTtcclxuZXhwb3J0cy5jb25maWcgPSB7XHJcbiAgICB0eXBlOiAnb2JqZWN0JyxcclxuICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICB2aWV3cG9ydDoge1xyXG4gICAgICAgICAgICB0eXBlOiAnYXJyYXknLFxyXG4gICAgICAgICAgICBpdGVtczoge1xyXG4gICAgICAgICAgICAgICAgdHlwZTogJ2ludGVnZXInXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGRlZmF1bHQ6IHVuZGVmaW5lZCxcclxuICAgICAgICAgICAgZGVzY3JpcHRpb246ICdUaGUgd2lkdGggYW5kIGhlaWdodCBvZiB0aGUgb24tc2NyZWVuIHZpZXdwb3J0LCBpbiBwaXhlbHMuIElmIG5lY2Vzc2FyeSwgY2xpcHBpbmcgYW5kIHNjcm9sbGluZyB3aWxsIGJlIGFwcGxpZWQuJ1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgYmFja2dyb3VuZDoge1xyXG4gICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcclxuICAgICAgICAgICAgcm9sZTogJ2NvbG9yJyxcclxuICAgICAgICAgICAgZGVmYXVsdDogdW5kZWZpbmVkLFxyXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0NTUyBjb2xvciBwcm9wZXJ0eSB0byB1c2UgYXMgYmFja2dyb3VuZCBvZiB2aXN1YWxpemF0aW9uLiBEZWZhdWx0IGlzIGBcInRyYW5zcGFyZW50XCJgLidcclxuICAgICAgICB9LFxyXG4gICAgICAgIHNjZW5lOiB7XHJcbiAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxyXG4gICAgICAgICAgICBkZWZhdWx0OiB1bmRlZmluZWQsXHJcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQW4gb2JqZWN0IHRvIHN0eWxlIHRoZSB0b3AtbGV2ZWwgc2NlbmVncmFwaCByb290LiBBdmFpbGFibGUgcHJvcGVydGllcyBpbmNsdWRlIGBmaWxsYCwgYGZpbGxPcGFjaXR5YCwgYHN0cm9rZWAsIGBzdHJva2VPcGFjaXR5YCwgYHN0cm9rZVdpZHRoYCwgYHN0cm9rZURhc2hgLCBgc3Ryb2tlRGFzaE9mZnNldGAnXHJcbiAgICAgICAgfSxcclxuICAgICAgICBmaWx0ZXJOdWxsOiB7XHJcbiAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxyXG4gICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICBub21pbmFsOiB7IHR5cGU6ICdib29sZWFuJywgZGVmYXVsdDogZmFsc2UgfSxcclxuICAgICAgICAgICAgICAgIG9yZGluYWw6IHsgdHlwZTogJ2Jvb2xlYW4nLCBkZWZhdWx0OiBmYWxzZSB9LFxyXG4gICAgICAgICAgICAgICAgcXVhbnRpdGF0aXZlOiB7IHR5cGU6ICdib29sZWFuJywgZGVmYXVsdDogdHJ1ZSB9LFxyXG4gICAgICAgICAgICAgICAgdGVtcG9yYWw6IHsgdHlwZTogJ2Jvb2xlYW4nLCBkZWZhdWx0OiB0cnVlIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgdGV4dENlbGxXaWR0aDoge1xyXG4gICAgICAgICAgICB0eXBlOiAnaW50ZWdlcicsXHJcbiAgICAgICAgICAgIGRlZmF1bHQ6IDkwLFxyXG4gICAgICAgICAgICBtaW5pbXVtOiAwXHJcbiAgICAgICAgfSxcclxuICAgICAgICBzb3J0TGluZUJ5OiB7XHJcbiAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxyXG4gICAgICAgICAgICBkZWZhdWx0OiB1bmRlZmluZWQsXHJcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnRGF0YSBmaWVsZCB0byBzb3J0IGxpbmUgYnkuICcgK1xyXG4gICAgICAgICAgICAgICAgJ1xcJy1cXCcgcHJlZml4IGNhbiBiZSBhZGRlZCB0byBzdWdnZXN0IGRlc2NlbmRpbmcgb3JkZXIuJ1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgc3RhY2s6IGNvbmZpZ19zdGFja19zY2hlbWFfMS5zdGFja0NvbmZpZyxcclxuICAgICAgICBjZWxsOiBjb25maWdfY2VsbF9zY2hlbWFfMS5jZWxsQ29uZmlnLFxyXG4gICAgICAgIG1hcmtzOiBjb25maWdfbWFya3Nfc2NoZW1hXzEubWFya3NDb25maWcsXHJcbiAgICAgICAgc2luZ2xlQmFyT2Zmc2V0OiB7XHJcbiAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyJyxcclxuICAgICAgICAgICAgZGVmYXVsdDogNSxcclxuICAgICAgICAgICAgbWluaW11bTogMFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgY2hhcmFjdGVyV2lkdGg6IHtcclxuICAgICAgICAgICAgdHlwZTogJ2ludGVnZXInLFxyXG4gICAgICAgICAgICBkZWZhdWx0OiA2XHJcbiAgICAgICAgfSxcclxuICAgICAgICBudW1iZXJGb3JtYXQ6IHtcclxuICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXHJcbiAgICAgICAgICAgIGRlZmF1bHQ6ICdzJyxcclxuICAgICAgICAgICAgZGVzY3JpcHRpb246ICdEMyBOdW1iZXIgZm9ybWF0IGZvciBheGlzIGxhYmVscyBhbmQgdGV4dCB0YWJsZXMuJ1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgdGltZUZvcm1hdDoge1xyXG4gICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcclxuICAgICAgICAgICAgZGVmYXVsdDogJyVZLSVtLSVkJyxcclxuICAgICAgICAgICAgZGVzY3JpcHRpb246ICdEYXRlIGZvcm1hdCBmb3IgYXhpcyBsYWJlbHMuJ1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufTtcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9Y29uZmlnLnNjaGVtYS5qcy5tYXAiLCJleHBvcnRzLnN0YWNrQ29uZmlnID0ge1xyXG4gICAgdHlwZTogWydib29sZWFuJywgJ29iamVjdCddLFxyXG4gICAgZGVmYXVsdDoge30sXHJcbiAgICBkZXNjcmlwdGlvbjogJ0VuYWJsZSBzdGFja2luZyAoZm9yIGJhciBhbmQgYXJlYSBtYXJrcyBvbmx5KS4nLFxyXG4gICAgcHJvcGVydGllczoge1xyXG4gICAgICAgIHNvcnQ6IHtcclxuICAgICAgICAgICAgb25lT2Y6IFt7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXHJcbiAgICAgICAgICAgICAgICAgICAgZW51bTogWydhc2NlbmRpbmcnLCAnZGVzY2VuZGluZyddXHJcbiAgICAgICAgICAgICAgICB9LCB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2FycmF5JyxcclxuICAgICAgICAgICAgICAgICAgICBpdGVtczogeyB0eXBlOiAnc3RyaW5nJyB9LFxyXG4gICAgICAgICAgICAgICAgfV0sXHJcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnT3JkZXIgb2YgdGhlIHN0YWNrLiAnICtcclxuICAgICAgICAgICAgICAgICdUaGlzIGNhbiBiZSBlaXRoZXIgYSBzdHJpbmcgKGVpdGhlciBcImRlc2NlbmRpbmdcIiBvciBcImFzY2VuZGluZ1wiKScgK1xyXG4gICAgICAgICAgICAgICAgJ29yIGEgbGlzdCBvZiBmaWVsZHMgdG8gZGV0ZXJtaW5lIHRoZSBvcmRlciBvZiBzdGFjayBsYXllcnMuJyArXHJcbiAgICAgICAgICAgICAgICAnQnkgZGVmYXVsdCwgc3RhY2sgdXNlcyBkZXNjZW5kaW5nIG9yZGVyLidcclxuICAgICAgICB9LFxyXG4gICAgICAgIG9mZnNldDoge1xyXG4gICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcclxuICAgICAgICAgICAgZW51bTogWyd6ZXJvJywgJ2NlbnRlcicsICdub3JtYWxpemUnXVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufTtcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9Y29uZmlnLnN0YWNrLnNjaGVtYS5qcy5tYXAiLCJleHBvcnRzLmRhdGEgPSB7XHJcbiAgICB0eXBlOiAnb2JqZWN0JyxcclxuICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICBmb3JtYXRUeXBlOiB7XHJcbiAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxyXG4gICAgICAgICAgICBlbnVtOiBbJ2pzb24nLCAnY3N2JywgJ3RzdiddLFxyXG4gICAgICAgICAgICBkZWZhdWx0OiAnanNvbidcclxuICAgICAgICB9LFxyXG4gICAgICAgIHVybDoge1xyXG4gICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcclxuICAgICAgICAgICAgZGVmYXVsdDogdW5kZWZpbmVkXHJcbiAgICAgICAgfSxcclxuICAgICAgICB2YWx1ZXM6IHtcclxuICAgICAgICAgICAgdHlwZTogJ2FycmF5JyxcclxuICAgICAgICAgICAgZGVmYXVsdDogdW5kZWZpbmVkLFxyXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1Bhc3MgYXJyYXkgb2Ygb2JqZWN0cyBpbnN0ZWFkIG9mIGEgdXJsIHRvIGEgZmlsZS4nLFxyXG4gICAgICAgICAgICBpdGVtczoge1xyXG4gICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXHJcbiAgICAgICAgICAgICAgICBhZGRpdGlvbmFsUHJvcGVydGllczogdHJ1ZVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuICAgICAgICBmaWx0ZXI6IHtcclxuICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXHJcbiAgICAgICAgICAgIGRlZmF1bHQ6IHVuZGVmaW5lZCxcclxuICAgICAgICAgICAgZGVzY3JpcHRpb246ICdBIHN0cmluZyBjb250YWluaW5nIHRoZSBmaWx0ZXIgVmVnYSBleHByZXNzaW9uLiBVc2UgYGRhdHVtYCB0byByZWZlciB0byB0aGUgY3VycmVudCBkYXRhIG9iamVjdC4nXHJcbiAgICAgICAgfSxcclxuICAgICAgICBjYWxjdWxhdGU6IHtcclxuICAgICAgICAgICAgdHlwZTogJ2FycmF5JyxcclxuICAgICAgICAgICAgZGVmYXVsdDogdW5kZWZpbmVkLFxyXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0NhbGN1bGF0ZSBuZXcgZmllbGQocykgdXNpbmcgdGhlIHByb3ZpZGVkIGV4cHJlc3NzaW9uKHMpLiBDYWxjdWxhdGlvbiBhcmUgYXBwbGllZCBiZWZvcmUgZmlsdGVyLicsXHJcbiAgICAgICAgICAgIGl0ZW1zOiB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcclxuICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICBmaWVsZDoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdUaGUgZmllbGQgaW4gd2hpY2ggdG8gc3RvcmUgdGhlIGNvbXB1dGVkIGZvcm11bGEgdmFsdWUuJ1xyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgZXhwcjoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdBIHN0cmluZyBjb250YWluaW5nIGFuIGV4cHJlc3Npb24gZm9yIHRoZSBmb3JtdWxhLiBVc2UgdGhlIHZhcmlhYmxlIGBkYXR1bWAgdG8gdG8gcmVmZXIgdG8gdGhlIGN1cnJlbnQgZGF0YSBvYmplY3QuJ1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufTtcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZGF0YS5zY2hlbWEuanMubWFwIiwidmFyIHNjaGVtYXV0aWxfMSA9IHJlcXVpcmUoJy4vc2NoZW1hdXRpbCcpO1xyXG52YXIgdXRpbF8xID0gcmVxdWlyZSgnLi4vdXRpbCcpO1xyXG52YXIgYXhpc19zY2hlbWFfMSA9IHJlcXVpcmUoJy4vYXhpcy5zY2hlbWEnKTtcclxudmFyIGxlZ2VuZF9zY2hlbWFfMSA9IHJlcXVpcmUoJy4vbGVnZW5kLnNjaGVtYScpO1xyXG52YXIgc29ydF9zY2hlbWFfMSA9IHJlcXVpcmUoJy4vc29ydC5zY2hlbWEnKTtcclxudmFyIGZpZWxkZGVmX3NjaGVtYV8xID0gcmVxdWlyZSgnLi9maWVsZGRlZi5zY2hlbWEnKTtcclxudmFyIHJlcXVpcmVkTmFtZVR5cGUgPSB7XHJcbiAgICByZXF1aXJlZDogWydmaWVsZCcsICd0eXBlJ11cclxufTtcclxudmFyIHggPSBzY2hlbWF1dGlsXzEubWVyZ2UodXRpbF8xLmR1cGxpY2F0ZShmaWVsZGRlZl9zY2hlbWFfMS50eXBpY2FsRmllbGQpLCByZXF1aXJlZE5hbWVUeXBlLCB7XHJcbiAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgc2NhbGU6IHtcclxuICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgcGFkZGluZzogeyBkZWZhdWx0OiAxIH0sXHJcbiAgICAgICAgICAgICAgICBiYW5kV2lkdGg6IHsgZGVmYXVsdDogMjEgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuICAgICAgICBheGlzOiBheGlzX3NjaGVtYV8xLmF4aXMsXHJcbiAgICAgICAgc29ydDogc29ydF9zY2hlbWFfMS5zb3J0XHJcbiAgICB9XHJcbn0pO1xyXG52YXIgeSA9IHV0aWxfMS5kdXBsaWNhdGUoeCk7XHJcbnZhciBmYWNldCA9IHNjaGVtYXV0aWxfMS5tZXJnZSh1dGlsXzEuZHVwbGljYXRlKGZpZWxkZGVmX3NjaGVtYV8xLm9ubHlPcmRpbmFsRmllbGQpLCByZXF1aXJlZE5hbWVUeXBlLCB7XHJcbiAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgYXhpczogYXhpc19zY2hlbWFfMS5heGlzLFxyXG4gICAgICAgIHNvcnQ6IHNvcnRfc2NoZW1hXzEuc29ydFxyXG4gICAgfVxyXG59KTtcclxudmFyIHJvdyA9IHNjaGVtYXV0aWxfMS5tZXJnZSh1dGlsXzEuZHVwbGljYXRlKGZhY2V0KSk7XHJcbnZhciBjb2x1bW4gPSBzY2hlbWF1dGlsXzEubWVyZ2UodXRpbF8xLmR1cGxpY2F0ZShmYWNldCkpO1xyXG52YXIgc2l6ZSA9IHNjaGVtYXV0aWxfMS5tZXJnZSh1dGlsXzEuZHVwbGljYXRlKGZpZWxkZGVmX3NjaGVtYV8xLnR5cGljYWxGaWVsZCksIHtcclxuICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICBsZWdlbmQ6IGxlZ2VuZF9zY2hlbWFfMS5sZWdlbmQsXHJcbiAgICAgICAgc29ydDogc29ydF9zY2hlbWFfMS5zb3J0LFxyXG4gICAgICAgIHZhbHVlOiB7XHJcbiAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyJyxcclxuICAgICAgICAgICAgZGVmYXVsdDogMzAsXHJcbiAgICAgICAgICAgIG1pbmltdW06IDAsXHJcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnU2l6ZSBvZiBtYXJrcy4nXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59KTtcclxudmFyIGNvbG9yID0gc2NoZW1hdXRpbF8xLm1lcmdlKHV0aWxfMS5kdXBsaWNhdGUoZmllbGRkZWZfc2NoZW1hXzEudHlwaWNhbEZpZWxkKSwge1xyXG4gICAgcHJvcGVydGllczoge1xyXG4gICAgICAgIGxlZ2VuZDogbGVnZW5kX3NjaGVtYV8xLmxlZ2VuZCxcclxuICAgICAgICBzb3J0OiBzb3J0X3NjaGVtYV8xLnNvcnQsXHJcbiAgICAgICAgdmFsdWU6IHtcclxuICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXHJcbiAgICAgICAgICAgIHJvbGU6ICdjb2xvcicsXHJcbiAgICAgICAgICAgIGRlZmF1bHQ6ICcjNDY4MmI0JyxcclxuICAgICAgICAgICAgZGVzY3JpcHRpb246ICdDb2xvciB0byBiZSB1c2VkIGZvciBtYXJrcy4nXHJcbiAgICAgICAgfSxcclxuICAgICAgICBzY2FsZToge1xyXG4gICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcclxuICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgcXVhbnRpdGF0aXZlUmFuZ2U6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnYXJyYXknLFxyXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IFsnI0FGQzZBMycsICcjMDk2MjJBJ10sXHJcbiAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdDb2xvciByYW5nZSB0byBlbmNvZGUgcXVhbnRpdGF0aXZlIHZhcmlhYmxlcy4nLFxyXG4gICAgICAgICAgICAgICAgICAgIG1pbkl0ZW1zOiAyLFxyXG4gICAgICAgICAgICAgICAgICAgIG1heEl0ZW1zOiAyLFxyXG4gICAgICAgICAgICAgICAgICAgIGl0ZW1zOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICByb2xlOiAnY29sb3InXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59KTtcclxudmFyIHNoYXBlID0gc2NoZW1hdXRpbF8xLm1lcmdlKHV0aWxfMS5kdXBsaWNhdGUoZmllbGRkZWZfc2NoZW1hXzEub25seU9yZGluYWxGaWVsZCksIHtcclxuICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICBsZWdlbmQ6IGxlZ2VuZF9zY2hlbWFfMS5sZWdlbmQsXHJcbiAgICAgICAgc29ydDogc29ydF9zY2hlbWFfMS5zb3J0LFxyXG4gICAgICAgIHZhbHVlOiB7XHJcbiAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxyXG4gICAgICAgICAgICBlbnVtOiBbJ2NpcmNsZScsICdzcXVhcmUnLCAnY3Jvc3MnLCAnZGlhbW9uZCcsICd0cmlhbmdsZS11cCcsICd0cmlhbmdsZS1kb3duJ10sXHJcbiAgICAgICAgICAgIGRlZmF1bHQ6ICdjaXJjbGUnLFxyXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogJ01hcmsgdG8gYmUgdXNlZC4nXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59KTtcclxudmFyIGRldGFpbCA9IHNjaGVtYXV0aWxfMS5tZXJnZSh1dGlsXzEuZHVwbGljYXRlKGZpZWxkZGVmX3NjaGVtYV8xLm9ubHlPcmRpbmFsRmllbGQpLCB7XHJcbiAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgc29ydDogc29ydF9zY2hlbWFfMS5zb3J0XHJcbiAgICB9XHJcbn0pO1xyXG52YXIgdGV4dCA9IHNjaGVtYXV0aWxfMS5tZXJnZSh1dGlsXzEuZHVwbGljYXRlKGZpZWxkZGVmX3NjaGVtYV8xLnR5cGljYWxGaWVsZCksIHtcclxuICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICBzb3J0OiBzb3J0X3NjaGVtYV8xLnNvcnQsXHJcbiAgICAgICAgdmFsdWU6IHtcclxuICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXHJcbiAgICAgICAgICAgIGRlZmF1bHQ6ICdBYmMnXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59KTtcclxuZXhwb3J0cy5lbmNvZGluZyA9IHtcclxuICAgIHR5cGU6ICdvYmplY3QnLFxyXG4gICAgcHJvcGVydGllczoge1xyXG4gICAgICAgIHg6IHgsXHJcbiAgICAgICAgeTogeSxcclxuICAgICAgICByb3c6IHJvdyxcclxuICAgICAgICBjb2x1bW46IGNvbHVtbixcclxuICAgICAgICBzaXplOiBzaXplLFxyXG4gICAgICAgIGNvbG9yOiBjb2xvcixcclxuICAgICAgICBzaGFwZTogc2hhcGUsXHJcbiAgICAgICAgdGV4dDogdGV4dCxcclxuICAgICAgICBkZXRhaWw6IGRldGFpbFxyXG4gICAgfVxyXG59O1xyXG4vLyMgc291cmNlTWFwcGluZ1VSTD1lbmNvZGluZy5zY2hlbWEuanMubWFwIiwidmFyIGJpbl9zY2hlbWFfMSA9IHJlcXVpcmUoJy4vYmluLnNjaGVtYScpO1xyXG52YXIgc2NhbGVfc2NoZW1hXzEgPSByZXF1aXJlKCcuL3NjYWxlLnNjaGVtYScpO1xyXG52YXIgYWdncmVnYXRlXzEgPSByZXF1aXJlKCcuLi9hZ2dyZWdhdGUnKTtcclxudmFyIHV0aWxfMSA9IHJlcXVpcmUoJy4uL3V0aWwnKTtcclxudmFyIHNjaGVtYXV0aWxfMSA9IHJlcXVpcmUoJy4vc2NoZW1hdXRpbCcpO1xyXG52YXIgdGltZXVuaXRfMSA9IHJlcXVpcmUoJy4uL3RpbWV1bml0Jyk7XHJcbnZhciB0eXBlXzEgPSByZXF1aXJlKCcuLi90eXBlJyk7XHJcbmV4cG9ydHMuZmllbGREZWYgPSB7XHJcbiAgICB0eXBlOiAnb2JqZWN0JyxcclxuICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICBmaWVsZDoge1xyXG4gICAgICAgICAgICB0eXBlOiAnc3RyaW5nJ1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgdHlwZToge1xyXG4gICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcclxuICAgICAgICAgICAgZW51bTogW3R5cGVfMS5OT01JTkFMLCB0eXBlXzEuT1JESU5BTCwgdHlwZV8xLlFVQU5USVRBVElWRSwgdHlwZV8xLlRFTVBPUkFMXVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgdGltZVVuaXQ6IHtcclxuICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXHJcbiAgICAgICAgICAgIGVudW06IHRpbWV1bml0XzEuVElNRVVOSVRTLFxyXG4gICAgICAgICAgICBzdXBwb3J0ZWRUeXBlczogdXRpbF8xLnRvTWFwKFt0eXBlXzEuVEVNUE9SQUxdKVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgYmluOiBiaW5fc2NoZW1hXzEuYmluLFxyXG4gICAgfVxyXG59O1xyXG5leHBvcnRzLmFnZ3JlZ2F0ZSA9IHtcclxuICAgIHR5cGU6ICdzdHJpbmcnLFxyXG4gICAgZW51bTogYWdncmVnYXRlXzEuQUdHUkVHQVRFX09QUyxcclxuICAgIHN1cHBvcnRlZEVudW1zOiB7XHJcbiAgICAgICAgcXVhbnRpdGF0aXZlOiBhZ2dyZWdhdGVfMS5BR0dSRUdBVEVfT1BTLFxyXG4gICAgICAgIG9yZGluYWw6IFsnbWVkaWFuJywgJ21pbicsICdtYXgnXSxcclxuICAgICAgICBub21pbmFsOiBbXSxcclxuICAgICAgICB0ZW1wb3JhbDogWydtZWFuJywgJ21lZGlhbicsICdtaW4nLCAnbWF4J10sXHJcbiAgICAgICAgJyc6IFsnY291bnQnXVxyXG4gICAgfSxcclxuICAgIHN1cHBvcnRlZFR5cGVzOiB1dGlsXzEudG9NYXAoW3R5cGVfMS5RVUFOVElUQVRJVkUsIHR5cGVfMS5OT01JTkFMLCB0eXBlXzEuT1JESU5BTCwgdHlwZV8xLlRFTVBPUkFMLCAnJ10pXHJcbn07XHJcbmV4cG9ydHMudHlwaWNhbEZpZWxkID0gc2NoZW1hdXRpbF8xLm1lcmdlKHV0aWxfMS5kdXBsaWNhdGUoZXhwb3J0cy5maWVsZERlZiksIHtcclxuICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICBhZ2dyZWdhdGU6IGV4cG9ydHMuYWdncmVnYXRlLFxyXG4gICAgICAgIHNjYWxlOiBzY2FsZV9zY2hlbWFfMS50eXBpY2FsU2NhbGVcclxuICAgIH1cclxufSk7XHJcbmV4cG9ydHMub25seU9yZGluYWxGaWVsZCA9IHNjaGVtYXV0aWxfMS5tZXJnZSh1dGlsXzEuZHVwbGljYXRlKGV4cG9ydHMuZmllbGREZWYpLCB7XHJcbiAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgc2NhbGU6IHNjYWxlX3NjaGVtYV8xLm9yZGluYWxPbmx5U2NhbGVcclxuICAgIH1cclxufSk7XHJcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWZpZWxkZGVmLnNjaGVtYS5qcy5tYXAiLCJleHBvcnRzLmxlZ2VuZCA9IHtcclxuICAgIGRlZmF1bHQ6IHRydWUsXHJcbiAgICBkZXNjcmlwdGlvbjogJ1Byb3BlcnRpZXMgb2YgYSBsZWdlbmQgb3IgYm9vbGVhbiBmbGFnIGZvciBkZXRlcm1pbmluZyB3aGV0aGVyIHRvIHNob3cgaXQuJyxcclxuICAgIG9uZU9mOiBbe1xyXG4gICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcclxuICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgb3JpZW50OiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXHJcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogdW5kZWZpbmVkLFxyXG4gICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnVGhlIG9yaWVudGF0aW9uIG9mIHRoZSBsZWdlbmQuIE9uZSBvZiBcImxlZnRcIiBvciBcInJpZ2h0XCIuIFRoaXMgZGV0ZXJtaW5lcyBob3cgdGhlIGxlZ2VuZCBpcyBwb3NpdGlvbmVkIHdpdGhpbiB0aGUgc2NlbmUuIFRoZSBkZWZhdWx0IGlzIFwicmlnaHRcIi4nXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgdGl0bGU6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcclxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiB1bmRlZmluZWQsXHJcbiAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdBIHRpdGxlIGZvciB0aGUgbGVnZW5kLiAoU2hvd3MgZmllbGQgbmFtZSBhbmQgaXRzIGZ1bmN0aW9uIGJ5IGRlZmF1bHQuKSdcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICBmb3JtYXQ6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcclxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiB1bmRlZmluZWQsXHJcbiAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdBbiBvcHRpb25hbCBmb3JtYXR0aW5nIHBhdHRlcm4gZm9yIGxlZ2VuZCBsYWJlbHMuIFZlZ2EgdXNlcyBEM1xcJ3MgZm9ybWF0IHBhdHRlcm4uJ1xyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHZhbHVlczoge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdhcnJheScsXHJcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogdW5kZWZpbmVkLFxyXG4gICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnRXhwbGljaXRseSBzZXQgdGhlIHZpc2libGUgbGVnZW5kIHZhbHVlcy4nXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxyXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IHVuZGVmaW5lZCxcclxuICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ09wdGlvbmFsIG1hcmsgcHJvcGVydHkgZGVmaW5pdGlvbnMgZm9yIGN1c3RvbSBsZWdlbmQgc3R5bGluZy4gJ1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSwge1xyXG4gICAgICAgICAgICB0eXBlOiAnYm9vbGVhbidcclxuICAgICAgICB9XVxyXG59O1xyXG4vLyMgc291cmNlTWFwcGluZ1VSTD1sZWdlbmQuc2NoZW1hLmpzLm1hcCIsImV4cG9ydHMubWFyayA9IHtcclxuICAgIHR5cGU6ICdzdHJpbmcnLFxyXG4gICAgZW51bTogWydwb2ludCcsICd0aWNrJywgJ2JhcicsICdsaW5lJywgJ2FyZWEnLCAnY2lyY2xlJywgJ3NxdWFyZScsICd0ZXh0J11cclxufTtcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9bWFyay5zY2hlbWEuanMubWFwIiwidmFyIHV0aWxfMSA9IHJlcXVpcmUoJy4uL3V0aWwnKTtcclxudmFyIHNjaGVtYXV0aWxfMSA9IHJlcXVpcmUoJy4vc2NoZW1hdXRpbCcpO1xyXG52YXIgdHlwZV8xID0gcmVxdWlyZSgnLi4vdHlwZScpO1xyXG52YXIgc2NhbGUgPSB7XHJcbiAgICB0eXBlOiAnb2JqZWN0JyxcclxuICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICB0eXBlOiB7XHJcbiAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxyXG4gICAgICAgICAgICBlbnVtOiBbJ2xpbmVhcicsICdsb2cnLCAncG93JywgJ3NxcnQnLCAncXVhbnRpbGUnXSxcclxuICAgICAgICAgICAgZGVmYXVsdDogJ2xpbmVhcicsXHJcbiAgICAgICAgICAgIHN1cHBvcnRlZFR5cGVzOiB1dGlsXzEudG9NYXAoW3R5cGVfMS5RVUFOVElUQVRJVkVdKVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZG9tYWluOiB7XHJcbiAgICAgICAgICAgIGRlZmF1bHQ6IHVuZGVmaW5lZCxcclxuICAgICAgICAgICAgdHlwZTogWydhcnJheScsICdvYmplY3QnXSxcclxuICAgICAgICAgICAgZGVzY3JpcHRpb246ICdUaGUgZG9tYWluIG9mIHRoZSBzY2FsZSwgcmVwcmVzZW50aW5nIHRoZSBzZXQgb2YgZGF0YSB2YWx1ZXMuIEZvciBxdWFudGl0YXRpdmUgZGF0YSwgdGhpcyBjYW4gdGFrZSB0aGUgZm9ybSBvZiBhIHR3by1lbGVtZW50IGFycmF5IHdpdGggbWluaW11bSBhbmQgbWF4aW11bSB2YWx1ZXMuIEZvciBvcmRpbmFsL2NhdGVnb3JpY2FsIGRhdGEsIHRoaXMgbWF5IGJlIGFuIGFycmF5IG9mIHZhbGlkIGlucHV0IHZhbHVlcy4gVGhlIGRvbWFpbiBtYXkgYWxzbyBiZSBzcGVjaWZpZWQgYnkgYSByZWZlcmVuY2UgdG8gYSBkYXRhIHNvdXJjZS4nXHJcbiAgICAgICAgfSxcclxuICAgICAgICByYW5nZToge1xyXG4gICAgICAgICAgICBkZWZhdWx0OiB1bmRlZmluZWQsXHJcbiAgICAgICAgICAgIHR5cGU6IFsnYXJyYXknLCAnb2JqZWN0JywgJ3N0cmluZyddLFxyXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1RoZSByYW5nZSBvZiB0aGUgc2NhbGUsIHJlcHJlc2VudGluZyB0aGUgc2V0IG9mIHZpc3VhbCB2YWx1ZXMuIEZvciBudW1lcmljIHZhbHVlcywgdGhlIHJhbmdlIGNhbiB0YWtlIHRoZSBmb3JtIG9mIGEgdHdvLWVsZW1lbnQgYXJyYXkgd2l0aCBtaW5pbXVtIGFuZCBtYXhpbXVtIHZhbHVlcy4gRm9yIG9yZGluYWwgb3IgcXVhbnRpemVkIGRhdGEsIHRoZSByYW5nZSBtYXkgYnkgYW4gYXJyYXkgb2YgZGVzaXJlZCBvdXRwdXQgdmFsdWVzLCB3aGljaCBhcmUgbWFwcGVkIHRvIGVsZW1lbnRzIGluIHRoZSBzcGVjaWZpZWQgZG9tYWluLiBGb3Igb3JkaW5hbCBzY2FsZXMgb25seSwgdGhlIHJhbmdlIGNhbiBiZSBkZWZpbmVkIHVzaW5nIGEgRGF0YVJlZjogdGhlIHJhbmdlIHZhbHVlcyBhcmUgdGhlbiBkcmF3biBkeW5hbWljYWxseSBmcm9tIGEgYmFja2luZyBkYXRhIHNldC4nXHJcbiAgICAgICAgfSxcclxuICAgICAgICByb3VuZDoge1xyXG4gICAgICAgICAgICBkZWZhdWx0OiB1bmRlZmluZWQsXHJcbiAgICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcclxuICAgICAgICAgICAgZGVzY3JpcHRpb246ICdJZiB0cnVlLCByb3VuZHMgbnVtZXJpYyBvdXRwdXQgdmFsdWVzIHRvIGludGVnZXJzLiBUaGlzIGNhbiBiZSBoZWxwZnVsIGZvciBzbmFwcGluZyB0byB0aGUgcGl4ZWwgZ3JpZC4nXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59O1xyXG52YXIgb3JkaW5hbFNjYWxlTWl4aW4gPSB7XHJcbiAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgYmFuZFdpZHRoOiB7XHJcbiAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyJyxcclxuICAgICAgICAgICAgbWluaW11bTogMCxcclxuICAgICAgICAgICAgZGVmYXVsdDogdW5kZWZpbmVkXHJcbiAgICAgICAgfSxcclxuICAgICAgICBvdXRlclBhZGRpbmc6IHtcclxuICAgICAgICAgICAgdHlwZTogJ251bWJlcicsXHJcbiAgICAgICAgICAgIGRlZmF1bHQ6IHVuZGVmaW5lZFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgcGFkZGluZzoge1xyXG4gICAgICAgICAgICB0eXBlOiAnbnVtYmVyJyxcclxuICAgICAgICAgICAgZGVmYXVsdDogdW5kZWZpbmVkLFxyXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0FwcGxpZXMgc3BhY2luZyBhbW9uZyBvcmRpbmFsIGVsZW1lbnRzIGluIHRoZSBzY2FsZSByYW5nZS4gVGhlIGFjdHVhbCBlZmZlY3QgZGVwZW5kcyBvbiBob3cgdGhlIHNjYWxlIGlzIGNvbmZpZ3VyZWQuIElmIHRoZSBfX3BvaW50c19fIHBhcmFtZXRlciBpcyBgdHJ1ZWAsIHRoZSBwYWRkaW5nIHZhbHVlIGlzIGludGVycHJldGVkIGFzIGEgbXVsdGlwbGUgb2YgdGhlIHNwYWNpbmcgYmV0d2VlbiBwb2ludHMuIEEgcmVhc29uYWJsZSB2YWx1ZSBpcyAxLjAsIHN1Y2ggdGhhdCB0aGUgZmlyc3QgYW5kIGxhc3QgcG9pbnQgd2lsbCBiZSBvZmZzZXQgZnJvbSB0aGUgbWluaW11bSBhbmQgbWF4aW11bSB2YWx1ZSBieSBoYWxmIHRoZSBkaXN0YW5jZSBiZXR3ZWVuIHBvaW50cy4gT3RoZXJ3aXNlLCBwYWRkaW5nIGlzIHR5cGljYWxseSBpbiB0aGUgcmFuZ2UgWzAsIDFdIGFuZCBjb3JyZXNwb25kcyB0byB0aGUgZnJhY3Rpb24gb2Ygc3BhY2UgaW4gdGhlIHJhbmdlIGludGVydmFsIHRvIGFsbG9jYXRlIHRvIHBhZGRpbmcuIEEgdmFsdWUgb2YgMC41IG1lYW5zIHRoYXQgdGhlIHJhbmdlIGJhbmQgd2lkdGggd2lsbCBiZSBlcXVhbCB0byB0aGUgcGFkZGluZyB3aWR0aC4gRm9yIG1vcmUsIHNlZSB0aGUgW0QzIG9yZGluYWwgc2NhbGUgZG9jdW1lbnRhdGlvbl0oaHR0cHM6Ly9naXRodWIuY29tL21ib3N0b2NrL2QzL3dpa2kvT3JkaW5hbC1TY2FsZXMpLidcclxuICAgICAgICB9LFxyXG4gICAgICAgIHBvaW50czoge1xyXG4gICAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXHJcbiAgICAgICAgICAgIGRlZmF1bHQ6IHVuZGVmaW5lZCxcclxuICAgICAgICAgICAgZGVzY3JpcHRpb246ICdJZiB0cnVlLCBkaXN0cmlidXRlcyB0aGUgb3JkaW5hbCB2YWx1ZXMgb3ZlciBhIHF1YW50aXRhdGl2ZSByYW5nZSBhdCB1bmlmb3JtbHkgc3BhY2VkIHBvaW50cy4gVGhlIHNwYWNpbmcgb2YgdGhlIHBvaW50cyBjYW4gYmUgYWRqdXN0ZWQgdXNpbmcgdGhlIHBhZGRpbmcgcHJvcGVydHkuIElmIGZhbHNlLCB0aGUgb3JkaW5hbCBzY2FsZSB3aWxsIGNvbnN0cnVjdCBldmVubHktc3BhY2VkIGJhbmRzLCByYXRoZXIgdGhhbiBwb2ludHMuJ1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufTtcclxudmFyIHR5cGljYWxTY2FsZU1peGluID0ge1xyXG4gICAgcHJvcGVydGllczoge1xyXG4gICAgICAgIGNsYW1wOiB7XHJcbiAgICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcclxuICAgICAgICAgICAgZGVmYXVsdDogdHJ1ZSxcclxuICAgICAgICAgICAgZGVzY3JpcHRpb246ICdJZiB0cnVlLCB2YWx1ZXMgdGhhdCBleGNlZWQgdGhlIGRhdGEgZG9tYWluIGFyZSBjbGFtcGVkIHRvIGVpdGhlciB0aGUgbWluaW11bSBvciBtYXhpbXVtIHJhbmdlIHZhbHVlJ1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgbmljZToge1xyXG4gICAgICAgICAgICBkZWZhdWx0OiB1bmRlZmluZWQsXHJcbiAgICAgICAgICAgIG9uZU9mOiBbXHJcbiAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxyXG4gICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnSWYgdHJ1ZSwgbW9kaWZpZXMgdGhlIHNjYWxlIGRvbWFpbiB0byB1c2UgYSBtb3JlIGh1bWFuLWZyaWVuZGx5IG51bWJlciByYW5nZSAoZS5nLiwgNyBpbnN0ZWFkIG9mIDYuOTYpLidcclxuICAgICAgICAgICAgICAgIH0sIHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcclxuICAgICAgICAgICAgICAgICAgICBlbnVtOiBbJ3NlY29uZCcsICdtaW51dGUnLCAnaG91cicsICdkYXknLCAnd2VlaycsICdtb250aCcsICd5ZWFyJ10sXHJcbiAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdJZiBzcGVjaWZpZWQsIG1vZGlmaWVzIHRoZSBzY2FsZSBkb21haW4gdG8gdXNlIGEgbW9yZSBodW1hbi1mcmllbmRseSB2YWx1ZSByYW5nZS4gRm9yIHRpbWUgYW5kIHV0YyBzY2FsZSB0eXBlcyBvbmx5LCB0aGUgbmljZSB2YWx1ZSBzaG91bGQgYmUgYSBzdHJpbmcgaW5kaWNhdGluZyB0aGUgZGVzaXJlZCB0aW1lIGludGVydmFsOyBsZWdhbCB2YWx1ZXMgYXJlIFwic2Vjb25kXCIsIFwibWludXRlXCIsIFwiaG91clwiLCBcImRheVwiLCBcIndlZWtcIiwgXCJtb250aFwiLCBvciBcInllYXJcIi4nXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgIHN1cHBvcnRlZFR5cGVzOiB1dGlsXzEudG9NYXAoW3R5cGVfMS5RVUFOVElUQVRJVkUsIHR5cGVfMS5URU1QT1JBTF0pLFxyXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogJydcclxuICAgICAgICB9LFxyXG4gICAgICAgIGV4cG9uZW50OiB7XHJcbiAgICAgICAgICAgIHR5cGU6ICdudW1iZXInLFxyXG4gICAgICAgICAgICBkZWZhdWx0OiB1bmRlZmluZWQsXHJcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnU2V0cyB0aGUgZXhwb25lbnQgb2YgdGhlIHNjYWxlIHRyYW5zZm9ybWF0aW9uLiBGb3IgcG93IHNjYWxlIHR5cGVzIG9ubHksIG90aGVyd2lzZSBpZ25vcmVkLidcclxuICAgICAgICB9LFxyXG4gICAgICAgIHplcm86IHtcclxuICAgICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxyXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0lmIHRydWUsIGVuc3VyZXMgdGhhdCBhIHplcm8gYmFzZWxpbmUgdmFsdWUgaXMgaW5jbHVkZWQgaW4gdGhlIHNjYWxlIGRvbWFpbi4gVGhpcyBvcHRpb24gaXMgaWdub3JlZCBmb3Igbm9uLXF1YW50aXRhdGl2ZSBzY2FsZXMuJyxcclxuICAgICAgICAgICAgZGVmYXVsdDogdW5kZWZpbmVkLFxyXG4gICAgICAgICAgICBzdXBwb3J0ZWRUeXBlczogdXRpbF8xLnRvTWFwKFt0eXBlXzEuUVVBTlRJVEFUSVZFLCB0eXBlXzEuVEVNUE9SQUxdKVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgdXNlUmF3RG9tYWluOiB7XHJcbiAgICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcclxuICAgICAgICAgICAgZGVmYXVsdDogZmFsc2UsXHJcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnVXNlcyB0aGUgc291cmNlIGRhdGEgcmFuZ2UgYXMgc2NhbGUgZG9tYWluIGluc3RlYWQgb2YgJyArXHJcbiAgICAgICAgICAgICAgICAnYWdncmVnYXRlZCBkYXRhIGZvciBhZ2dyZWdhdGUgYXhpcy4gJyArXHJcbiAgICAgICAgICAgICAgICAnVGhpcyBvcHRpb24gZG9lcyBub3Qgd29yayB3aXRoIHN1bSBvciBjb3VudCBhZ2dyZWdhdGUnICtcclxuICAgICAgICAgICAgICAgICdhcyB0aGV5IG1pZ2h0IGhhdmUgYSBzdWJzdGFudGlhbGx5IGxhcmdlciBzY2FsZSByYW5nZS4nXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59O1xyXG5leHBvcnRzLm9yZGluYWxPbmx5U2NhbGUgPSBzY2hlbWF1dGlsXzEubWVyZ2UodXRpbF8xLmR1cGxpY2F0ZShzY2FsZSksIG9yZGluYWxTY2FsZU1peGluKTtcclxuZXhwb3J0cy50eXBpY2FsU2NhbGUgPSBzY2hlbWF1dGlsXzEubWVyZ2UodXRpbF8xLmR1cGxpY2F0ZShzY2FsZSksIG9yZGluYWxTY2FsZU1peGluLCB0eXBpY2FsU2NhbGVNaXhpbik7XHJcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXNjYWxlLnNjaGVtYS5qcy5tYXAiLCJ2YXIgc2NoZW1hVXRpbCA9IHJlcXVpcmUoJy4vc2NoZW1hdXRpbCcpO1xyXG52YXIgbWFya19zY2hlbWFfMSA9IHJlcXVpcmUoJy4vbWFyay5zY2hlbWEnKTtcclxudmFyIGNvbmZpZ19zY2hlbWFfMSA9IHJlcXVpcmUoJy4vY29uZmlnLnNjaGVtYScpO1xyXG52YXIgZGF0YV9zY2hlbWFfMSA9IHJlcXVpcmUoJy4vZGF0YS5zY2hlbWEnKTtcclxudmFyIGVuY29kaW5nX3NjaGVtYV8xID0gcmVxdWlyZSgnLi9lbmNvZGluZy5zY2hlbWEnKTtcclxudmFyIGZpZWxkZGVmX3NjaGVtYV8xID0gcmVxdWlyZSgnLi9maWVsZGRlZi5zY2hlbWEnKTtcclxuZXhwb3J0cy5hZ2dyZWdhdGUgPSBmaWVsZGRlZl9zY2hlbWFfMS5hZ2dyZWdhdGU7XHJcbmV4cG9ydHMudXRpbCA9IHNjaGVtYVV0aWw7XHJcbmV4cG9ydHMuc2NoZW1hID0ge1xyXG4gICAgJHNjaGVtYTogJ2h0dHA6Ly9qc29uLXNjaGVtYS5vcmcvZHJhZnQtMDQvc2NoZW1hIycsXHJcbiAgICBkZXNjcmlwdGlvbjogJ1NjaGVtYSBmb3IgVmVnYS1saXRlIHNwZWNpZmljYXRpb24nLFxyXG4gICAgdHlwZTogJ29iamVjdCcsXHJcbiAgICByZXF1aXJlZDogWydtYXJrJywgJ2VuY29kaW5nJ10sXHJcbiAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgbmFtZToge1xyXG4gICAgICAgICAgICB0eXBlOiAnc3RyaW5nJ1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZGVzY3JpcHRpb246IHtcclxuICAgICAgICAgICAgdHlwZTogJ3N0cmluZydcclxuICAgICAgICB9LFxyXG4gICAgICAgIGRhdGE6IGRhdGFfc2NoZW1hXzEuZGF0YSxcclxuICAgICAgICBtYXJrOiBtYXJrX3NjaGVtYV8xLm1hcmssXHJcbiAgICAgICAgZW5jb2Rpbmc6IGVuY29kaW5nX3NjaGVtYV8xLmVuY29kaW5nLFxyXG4gICAgICAgIGNvbmZpZzogY29uZmlnX3NjaGVtYV8xLmNvbmZpZ1xyXG4gICAgfVxyXG59O1xyXG5mdW5jdGlvbiBpbnN0YW50aWF0ZSgpIHtcclxuICAgIHJldHVybiBzY2hlbWFVdGlsLmluc3RhbnRpYXRlKGV4cG9ydHMuc2NoZW1hKTtcclxufVxyXG5leHBvcnRzLmluc3RhbnRpYXRlID0gaW5zdGFudGlhdGU7XHJcbjtcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9c2NoZW1hLmpzLm1hcCIsInZhciB1dGlsID0gcmVxdWlyZSgnLi4vdXRpbCcpO1xyXG5mdW5jdGlvbiBpc0VtcHR5KG9iaikge1xyXG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKG9iaikubGVuZ3RoID09PSAwO1xyXG59XHJcbjtcclxuZnVuY3Rpb24gZXh0ZW5kKGluc3RhbmNlLCBzY2hlbWEpIHtcclxuICAgIHJldHVybiBtZXJnZShpbnN0YW50aWF0ZShzY2hlbWEpLCBpbnN0YW5jZSk7XHJcbn1cclxuZXhwb3J0cy5leHRlbmQgPSBleHRlbmQ7XHJcbjtcclxuZnVuY3Rpb24gaW5zdGFudGlhdGUoc2NoZW1hKSB7XHJcbiAgICB2YXIgdmFsO1xyXG4gICAgaWYgKHNjaGVtYSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcclxuICAgIH1cclxuICAgIGVsc2UgaWYgKCdkZWZhdWx0JyBpbiBzY2hlbWEpIHtcclxuICAgICAgICB2YWwgPSBzY2hlbWEuZGVmYXVsdDtcclxuICAgICAgICByZXR1cm4gdXRpbC5pc09iamVjdCh2YWwpID8gdXRpbC5kdXBsaWNhdGUodmFsKSA6IHZhbDtcclxuICAgIH1cclxuICAgIGVsc2UgaWYgKHNjaGVtYS50eXBlID09PSAnb2JqZWN0Jykge1xyXG4gICAgICAgIHZhciBpbnN0YW5jZSA9IHt9O1xyXG4gICAgICAgIGZvciAodmFyIG5hbWUgaW4gc2NoZW1hLnByb3BlcnRpZXMpIHtcclxuICAgICAgICAgICAgdmFsID0gaW5zdGFudGlhdGUoc2NoZW1hLnByb3BlcnRpZXNbbmFtZV0pO1xyXG4gICAgICAgICAgICBpZiAodmFsICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgIGluc3RhbmNlW25hbWVdID0gdmFsO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBpbnN0YW5jZTtcclxuICAgIH1cclxuICAgIGVsc2UgaWYgKHNjaGVtYS50eXBlID09PSAnYXJyYXknKSB7XHJcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcclxuICAgIH1cclxuICAgIHJldHVybiB1bmRlZmluZWQ7XHJcbn1cclxuZXhwb3J0cy5pbnN0YW50aWF0ZSA9IGluc3RhbnRpYXRlO1xyXG47XHJcbmZ1bmN0aW9uIHN1YnRyYWN0KGluc3RhbmNlLCBkZWZhdWx0cykge1xyXG4gICAgdmFyIGNoYW5nZXMgPSB7fTtcclxuICAgIGZvciAodmFyIHByb3AgaW4gaW5zdGFuY2UpIHtcclxuICAgICAgICB2YXIgZGVmID0gZGVmYXVsdHNbcHJvcF07XHJcbiAgICAgICAgdmFyIGlucyA9IGluc3RhbmNlW3Byb3BdO1xyXG4gICAgICAgIGlmICghZGVmYXVsdHMgfHwgZGVmICE9PSBpbnMpIHtcclxuICAgICAgICAgICAgaWYgKHR5cGVvZiBpbnMgPT09ICdvYmplY3QnICYmICF1dGlsLmlzQXJyYXkoaW5zKSAmJiBkZWYpIHtcclxuICAgICAgICAgICAgICAgIHZhciBjID0gc3VidHJhY3QoaW5zLCBkZWYpO1xyXG4gICAgICAgICAgICAgICAgaWYgKCFpc0VtcHR5KGMpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY2hhbmdlc1twcm9wXSA9IGM7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSBpZiAodXRpbC5pc0FycmF5KGlucykpIHtcclxuICAgICAgICAgICAgICAgIGlmICh1dGlsLmlzQXJyYXkoZGVmKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChpbnMubGVuZ3RoID09PSBkZWYubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBlcXVhbCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgaW5zLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaW5zW2ldICE9PSBkZWZbaV0pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlcXVhbCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlcXVhbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBjaGFuZ2VzW3Byb3BdID0gaW5zO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgY2hhbmdlc1twcm9wXSA9IGlucztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiBjaGFuZ2VzO1xyXG59XHJcbmV4cG9ydHMuc3VidHJhY3QgPSBzdWJ0cmFjdDtcclxuO1xyXG5mdW5jdGlvbiBtZXJnZShkZXN0KSB7XHJcbiAgICB2YXIgc3JjID0gW107XHJcbiAgICBmb3IgKHZhciBfaSA9IDE7IF9pIDwgYXJndW1lbnRzLmxlbmd0aDsgX2krKykge1xyXG4gICAgICAgIHNyY1tfaSAtIDFdID0gYXJndW1lbnRzW19pXTtcclxuICAgIH1cclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc3JjLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgZGVzdCA9IG1lcmdlXyhkZXN0LCBzcmNbaV0pO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIGRlc3Q7XHJcbn1cclxuZXhwb3J0cy5tZXJnZSA9IG1lcmdlO1xyXG47XHJcbmZ1bmN0aW9uIG1lcmdlXyhkZXN0LCBzcmMpIHtcclxuICAgIGlmICh0eXBlb2Ygc3JjICE9PSAnb2JqZWN0JyB8fCBzcmMgPT09IG51bGwpIHtcclxuICAgICAgICByZXR1cm4gZGVzdDtcclxuICAgIH1cclxuICAgIGZvciAodmFyIHAgaW4gc3JjKSB7XHJcbiAgICAgICAgaWYgKCFzcmMuaGFzT3duUHJvcGVydHkocCkpIHtcclxuICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChzcmNbcF0gPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKHR5cGVvZiBzcmNbcF0gIT09ICdvYmplY3QnIHx8IHNyY1twXSA9PT0gbnVsbCkge1xyXG4gICAgICAgICAgICBkZXN0W3BdID0gc3JjW3BdO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIGlmICh0eXBlb2YgZGVzdFtwXSAhPT0gJ29iamVjdCcgfHwgZGVzdFtwXSA9PT0gbnVsbCkge1xyXG4gICAgICAgICAgICBkZXN0W3BdID0gbWVyZ2Uoc3JjW3BdLmNvbnN0cnVjdG9yID09PSBBcnJheSA/IFtdIDoge30sIHNyY1twXSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICBtZXJnZShkZXN0W3BdLCBzcmNbcF0pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiBkZXN0O1xyXG59XHJcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXNjaGVtYXV0aWwuanMubWFwIiwidmFyIGFnZ3JlZ2F0ZV8xID0gcmVxdWlyZSgnLi4vYWdncmVnYXRlJyk7XHJcbnZhciB0eXBlXzEgPSByZXF1aXJlKCcuLi90eXBlJyk7XHJcbnZhciB1dGlsXzEgPSByZXF1aXJlKCcuLi91dGlsJyk7XHJcbmV4cG9ydHMuc29ydCA9IHtcclxuICAgIGRlZmF1bHQ6ICdhc2NlbmRpbmcnLFxyXG4gICAgc3VwcG9ydGVkVHlwZXM6IHV0aWxfMS50b01hcChbdHlwZV8xLlFVQU5USVRBVElWRSwgdHlwZV8xLk9SRElOQUxdKSxcclxuICAgIG9uZU9mOiBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcclxuICAgICAgICAgICAgZW51bTogWydhc2NlbmRpbmcnLCAnZGVzY2VuZGluZycsICd1bnNvcnRlZCddXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxyXG4gICAgICAgICAgICByZXF1aXJlZDogWydmaWVsZCcsICdvcCddLFxyXG4gICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICBmaWVsZDoge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxyXG4gICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnVGhlIGZpZWxkIG5hbWUgdG8gYWdncmVnYXRlIG92ZXIuJ1xyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIG9wOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXHJcbiAgICAgICAgICAgICAgICAgICAgZW51bTogYWdncmVnYXRlXzEuQUdHUkVHQVRFX09QUyxcclxuICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1RoZSBmaWVsZCBuYW1lIHRvIGFnZ3JlZ2F0ZSBvdmVyLidcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICBvcmRlcjoge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxyXG4gICAgICAgICAgICAgICAgICAgIGVudW06IFsnYXNjZW5kaW5nJywgJ2Rlc2NlbmRpbmcnXVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgXVxyXG59O1xyXG4vLyMgc291cmNlTWFwcGluZ1VSTD1zb3J0LnNjaGVtYS5qcy5tYXAiLCJ2YXIgYWdncmVnYXRlXzEgPSByZXF1aXJlKCcuL2FnZ3JlZ2F0ZScpO1xyXG52YXIgdGltZXVuaXRfMSA9IHJlcXVpcmUoJy4vdGltZXVuaXQnKTtcclxudmFyIHR5cGVfMSA9IHJlcXVpcmUoJy4vdHlwZScpO1xyXG52YXIgdmxFbmNvZGluZyA9IHJlcXVpcmUoJy4vZW5jb2RpbmcnKTtcclxudmFyIG1hcmtfMSA9IHJlcXVpcmUoJy4vbWFyaycpO1xyXG5leHBvcnRzLkRFTElNID0gJ3wnO1xyXG5leHBvcnRzLkFTU0lHTiA9ICc9JztcclxuZXhwb3J0cy5UWVBFID0gJywnO1xyXG5leHBvcnRzLkZVTkMgPSAnXyc7XHJcbmZ1bmN0aW9uIHNob3J0ZW4oc3BlYykge1xyXG4gICAgcmV0dXJuICdtYXJrJyArIGV4cG9ydHMuQVNTSUdOICsgc3BlYy5tYXJrICtcclxuICAgICAgICBleHBvcnRzLkRFTElNICsgc2hvcnRlbkVuY29kaW5nKHNwZWMuZW5jb2RpbmcpO1xyXG59XHJcbmV4cG9ydHMuc2hvcnRlbiA9IHNob3J0ZW47XHJcbmZ1bmN0aW9uIHBhcnNlKHNob3J0aGFuZCwgZGF0YSwgY29uZmlnKSB7XHJcbiAgICB2YXIgc3BsaXQgPSBzaG9ydGhhbmQuc3BsaXQoZXhwb3J0cy5ERUxJTSksIG1hcmsgPSBzcGxpdC5zaGlmdCgpLnNwbGl0KGV4cG9ydHMuQVNTSUdOKVsxXS50cmltKCksIGVuY29kaW5nID0gcGFyc2VFbmNvZGluZyhzcGxpdC5qb2luKGV4cG9ydHMuREVMSU0pKTtcclxuICAgIHZhciBzcGVjID0ge1xyXG4gICAgICAgIG1hcms6IG1hcmtfMS5NYXJrW21hcmtdLFxyXG4gICAgICAgIGVuY29kaW5nOiBlbmNvZGluZ1xyXG4gICAgfTtcclxuICAgIGlmIChkYXRhICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICBzcGVjLmRhdGEgPSBkYXRhO1xyXG4gICAgfVxyXG4gICAgaWYgKGNvbmZpZyAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgc3BlYy5jb25maWcgPSBjb25maWc7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gc3BlYztcclxufVxyXG5leHBvcnRzLnBhcnNlID0gcGFyc2U7XHJcbmZ1bmN0aW9uIHNob3J0ZW5FbmNvZGluZyhlbmNvZGluZykge1xyXG4gICAgcmV0dXJuIHZsRW5jb2RpbmcubWFwKGVuY29kaW5nLCBmdW5jdGlvbiAoZmllbGREZWYsIGNoYW5uZWwpIHtcclxuICAgICAgICByZXR1cm4gY2hhbm5lbCArIGV4cG9ydHMuQVNTSUdOICsgc2hvcnRlbkZpZWxkRGVmKGZpZWxkRGVmKTtcclxuICAgIH0pLmpvaW4oZXhwb3J0cy5ERUxJTSk7XHJcbn1cclxuZXhwb3J0cy5zaG9ydGVuRW5jb2RpbmcgPSBzaG9ydGVuRW5jb2Rpbmc7XHJcbmZ1bmN0aW9uIHBhcnNlRW5jb2RpbmcoZW5jb2RpbmdTaG9ydGhhbmQpIHtcclxuICAgIHJldHVybiBlbmNvZGluZ1Nob3J0aGFuZC5zcGxpdChleHBvcnRzLkRFTElNKS5yZWR1Y2UoZnVuY3Rpb24gKG0sIGUpIHtcclxuICAgICAgICB2YXIgc3BsaXQgPSBlLnNwbGl0KGV4cG9ydHMuQVNTSUdOKSwgZW5jdHlwZSA9IHNwbGl0WzBdLnRyaW0oKSwgZmllbGREZWZTaG9ydGhhbmQgPSBzcGxpdFsxXTtcclxuICAgICAgICBtW2VuY3R5cGVdID0gcGFyc2VGaWVsZERlZihmaWVsZERlZlNob3J0aGFuZCk7XHJcbiAgICAgICAgcmV0dXJuIG07XHJcbiAgICB9LCB7fSk7XHJcbn1cclxuZXhwb3J0cy5wYXJzZUVuY29kaW5nID0gcGFyc2VFbmNvZGluZztcclxuZnVuY3Rpb24gc2hvcnRlbkZpZWxkRGVmKGZpZWxkRGVmKSB7XHJcbiAgICByZXR1cm4gKGZpZWxkRGVmLmFnZ3JlZ2F0ZSA/IGZpZWxkRGVmLmFnZ3JlZ2F0ZSArIGV4cG9ydHMuRlVOQyA6ICcnKSArXHJcbiAgICAgICAgKGZpZWxkRGVmLnRpbWVVbml0ID8gZmllbGREZWYudGltZVVuaXQgKyBleHBvcnRzLkZVTkMgOiAnJykgK1xyXG4gICAgICAgIChmaWVsZERlZi5iaW4gPyAnYmluJyArIGV4cG9ydHMuRlVOQyA6ICcnKSArXHJcbiAgICAgICAgKGZpZWxkRGVmLmZpZWxkIHx8ICcnKSArIGV4cG9ydHMuVFlQRSArIHR5cGVfMS5TSE9SVF9UWVBFW2ZpZWxkRGVmLnR5cGVdO1xyXG59XHJcbmV4cG9ydHMuc2hvcnRlbkZpZWxkRGVmID0gc2hvcnRlbkZpZWxkRGVmO1xyXG5mdW5jdGlvbiBzaG9ydGVuRmllbGREZWZzKGZpZWxkRGVmcywgZGVsaW0pIHtcclxuICAgIGlmIChkZWxpbSA9PT0gdm9pZCAwKSB7IGRlbGltID0gZXhwb3J0cy5ERUxJTTsgfVxyXG4gICAgcmV0dXJuIGZpZWxkRGVmcy5tYXAoc2hvcnRlbkZpZWxkRGVmKS5qb2luKGRlbGltKTtcclxufVxyXG5leHBvcnRzLnNob3J0ZW5GaWVsZERlZnMgPSBzaG9ydGVuRmllbGREZWZzO1xyXG5mdW5jdGlvbiBwYXJzZUZpZWxkRGVmKGZpZWxkRGVmU2hvcnRoYW5kKSB7XHJcbiAgICB2YXIgc3BsaXQgPSBmaWVsZERlZlNob3J0aGFuZC5zcGxpdChleHBvcnRzLlRZUEUpLCBpO1xyXG4gICAgdmFyIGZpZWxkRGVmID0ge1xyXG4gICAgICAgIGZpZWxkOiBzcGxpdFswXS50cmltKCksXHJcbiAgICAgICAgdHlwZTogdHlwZV8xLlRZUEVfRlJPTV9TSE9SVF9UWVBFW3NwbGl0WzFdLnRyaW0oKV1cclxuICAgIH07XHJcbiAgICBmb3IgKGkgaW4gYWdncmVnYXRlXzEuQUdHUkVHQVRFX09QUykge1xyXG4gICAgICAgIHZhciBhID0gYWdncmVnYXRlXzEuQUdHUkVHQVRFX09QU1tpXTtcclxuICAgICAgICBpZiAoZmllbGREZWYuZmllbGQuaW5kZXhPZihhICsgJ18nKSA9PT0gMCkge1xyXG4gICAgICAgICAgICBmaWVsZERlZi5maWVsZCA9IGZpZWxkRGVmLmZpZWxkLnN1YnN0cihhLmxlbmd0aCArIDEpO1xyXG4gICAgICAgICAgICBpZiAoYSA9PT0gJ2NvdW50JyAmJiBmaWVsZERlZi5maWVsZC5sZW5ndGggPT09IDApXHJcbiAgICAgICAgICAgICAgICBmaWVsZERlZi5maWVsZCA9ICcqJztcclxuICAgICAgICAgICAgZmllbGREZWYuYWdncmVnYXRlID0gYTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZm9yIChpIGluIHRpbWV1bml0XzEuVElNRVVOSVRTKSB7XHJcbiAgICAgICAgdmFyIHR1ID0gdGltZXVuaXRfMS5USU1FVU5JVFNbaV07XHJcbiAgICAgICAgaWYgKGZpZWxkRGVmLmZpZWxkICYmIGZpZWxkRGVmLmZpZWxkLmluZGV4T2YodHUgKyAnXycpID09PSAwKSB7XHJcbiAgICAgICAgICAgIGZpZWxkRGVmLmZpZWxkID0gZmllbGREZWYuZmllbGQuc3Vic3RyKGZpZWxkRGVmLmZpZWxkLmxlbmd0aCArIDEpO1xyXG4gICAgICAgICAgICBmaWVsZERlZi50aW1lVW5pdCA9IHR1O1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBpZiAoZmllbGREZWYuZmllbGQgJiYgZmllbGREZWYuZmllbGQuaW5kZXhPZignYmluXycpID09PSAwKSB7XHJcbiAgICAgICAgZmllbGREZWYuZmllbGQgPSBmaWVsZERlZi5maWVsZC5zdWJzdHIoNCk7XHJcbiAgICAgICAgZmllbGREZWYuYmluID0gdHJ1ZTtcclxuICAgIH1cclxuICAgIHJldHVybiBmaWVsZERlZjtcclxufVxyXG5leHBvcnRzLnBhcnNlRmllbGREZWYgPSBwYXJzZUZpZWxkRGVmO1xyXG4vLyMgc291cmNlTWFwcGluZ1VSTD1zaG9ydGhhbmQuanMubWFwIiwidmFyIE1vZGVsXzEgPSByZXF1aXJlKCcuL2NvbXBpbGVyL01vZGVsJyk7XHJcbnZhciBjaGFubmVsXzEgPSByZXF1aXJlKCcuL2NoYW5uZWwnKTtcclxudmFyIHZsRW5jb2RpbmcgPSByZXF1aXJlKCcuL2VuY29kaW5nJyk7XHJcbnZhciBtYXJrXzEgPSByZXF1aXJlKCcuL21hcmsnKTtcclxudmFyIHV0aWxfMSA9IHJlcXVpcmUoJy4vdXRpbCcpO1xyXG5mdW5jdGlvbiBhbHdheXNOb09jY2x1c2lvbihzcGVjKSB7XHJcbiAgICByZXR1cm4gdmxFbmNvZGluZy5pc0FnZ3JlZ2F0ZShzcGVjLmVuY29kaW5nKTtcclxufVxyXG5leHBvcnRzLmFsd2F5c05vT2NjbHVzaW9uID0gYWx3YXlzTm9PY2NsdXNpb247XHJcbmZ1bmN0aW9uIGZpZWxkRGVmcyhzcGVjKSB7XHJcbiAgICByZXR1cm4gdmxFbmNvZGluZy5maWVsZERlZnMoc3BlYy5lbmNvZGluZyk7XHJcbn1cclxuZXhwb3J0cy5maWVsZERlZnMgPSBmaWVsZERlZnM7XHJcbjtcclxuZnVuY3Rpb24gZ2V0Q2xlYW5TcGVjKHNwZWMpIHtcclxuICAgIHJldHVybiBuZXcgTW9kZWxfMS5Nb2RlbChzcGVjKS50b1NwZWModHJ1ZSk7XHJcbn1cclxuZXhwb3J0cy5nZXRDbGVhblNwZWMgPSBnZXRDbGVhblNwZWM7XHJcbmZ1bmN0aW9uIGlzU3RhY2soc3BlYykge1xyXG4gICAgcmV0dXJuICh2bEVuY29kaW5nLmhhcyhzcGVjLmVuY29kaW5nLCBjaGFubmVsXzEuQ09MT1IpIHx8IHZsRW5jb2RpbmcuaGFzKHNwZWMuZW5jb2RpbmcsIGNoYW5uZWxfMS5TSEFQRSkpICYmXHJcbiAgICAgICAgKHNwZWMubWFyayA9PT0gbWFya18xLkJBUiB8fCBzcGVjLm1hcmsgPT09IG1hcmtfMS5BUkVBKSAmJlxyXG4gICAgICAgICghc3BlYy5jb25maWcgfHwgIXNwZWMuY29uZmlnLnN0YWNrICE9PSBmYWxzZSkgJiZcclxuICAgICAgICB2bEVuY29kaW5nLmlzQWdncmVnYXRlKHNwZWMuZW5jb2RpbmcpO1xyXG59XHJcbmV4cG9ydHMuaXNTdGFjayA9IGlzU3RhY2s7XHJcbmZ1bmN0aW9uIHRyYW5zcG9zZShzcGVjKSB7XHJcbiAgICB2YXIgb2xkZW5jID0gc3BlYy5lbmNvZGluZywgZW5jb2RpbmcgPSB1dGlsXzEuZHVwbGljYXRlKHNwZWMuZW5jb2RpbmcpO1xyXG4gICAgZW5jb2RpbmcueCA9IG9sZGVuYy55O1xyXG4gICAgZW5jb2RpbmcueSA9IG9sZGVuYy54O1xyXG4gICAgZW5jb2Rpbmcucm93ID0gb2xkZW5jLmNvbHVtbjtcclxuICAgIGVuY29kaW5nLmNvbHVtbiA9IG9sZGVuYy5yb3c7XHJcbiAgICBzcGVjLmVuY29kaW5nID0gZW5jb2Rpbmc7XHJcbiAgICByZXR1cm4gc3BlYztcclxufVxyXG5leHBvcnRzLnRyYW5zcG9zZSA9IHRyYW5zcG9zZTtcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9c3BlYy5qcy5tYXAiLCJleHBvcnRzLlRJTUVVTklUUyA9IFtcclxuICAgICd5ZWFyJywgJ21vbnRoJywgJ2RheScsICdkYXRlJywgJ2hvdXJzJywgJ21pbnV0ZXMnLCAnc2Vjb25kcydcclxuXTtcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9dGltZXVuaXQuanMubWFwIiwiKGZ1bmN0aW9uIChUeXBlKSB7XHJcbiAgICBUeXBlW1R5cGVbXCJRVUFOVElUQVRJVkVcIl0gPSAncXVhbnRpdGF0aXZlJ10gPSBcIlFVQU5USVRBVElWRVwiO1xyXG4gICAgVHlwZVtUeXBlW1wiT1JESU5BTFwiXSA9ICdvcmRpbmFsJ10gPSBcIk9SRElOQUxcIjtcclxuICAgIFR5cGVbVHlwZVtcIlRFTVBPUkFMXCJdID0gJ3RlbXBvcmFsJ10gPSBcIlRFTVBPUkFMXCI7XHJcbiAgICBUeXBlW1R5cGVbXCJOT01JTkFMXCJdID0gJ25vbWluYWwnXSA9IFwiTk9NSU5BTFwiO1xyXG59KShleHBvcnRzLlR5cGUgfHwgKGV4cG9ydHMuVHlwZSA9IHt9KSk7XHJcbnZhciBUeXBlID0gZXhwb3J0cy5UeXBlO1xyXG5leHBvcnRzLlFVQU5USVRBVElWRSA9IFR5cGUuUVVBTlRJVEFUSVZFO1xyXG5leHBvcnRzLk9SRElOQUwgPSBUeXBlLk9SRElOQUw7XHJcbmV4cG9ydHMuVEVNUE9SQUwgPSBUeXBlLlRFTVBPUkFMO1xyXG5leHBvcnRzLk5PTUlOQUwgPSBUeXBlLk5PTUlOQUw7XHJcbmV4cG9ydHMuU0hPUlRfVFlQRSA9IHtcclxuICAgIHF1YW50aXRhdGl2ZTogJ1EnLFxyXG4gICAgdGVtcG9yYWw6ICdUJyxcclxuICAgIG5vbWluYWw6ICdOJyxcclxuICAgIG9yZGluYWw6ICdPJ1xyXG59O1xyXG5leHBvcnRzLlRZUEVfRlJPTV9TSE9SVF9UWVBFID0ge1xyXG4gICAgUTogZXhwb3J0cy5RVUFOVElUQVRJVkUsXHJcbiAgICBUOiBleHBvcnRzLlRFTVBPUkFMLFxyXG4gICAgTzogZXhwb3J0cy5PUkRJTkFMLFxyXG4gICAgTjogZXhwb3J0cy5OT01JTkFMXHJcbn07XHJcbmZ1bmN0aW9uIGdldEZ1bGxOYW1lKHR5cGUpIHtcclxuICAgIHZhciB0eXBlU3RyaW5nID0gdHlwZTtcclxuICAgIHJldHVybiBleHBvcnRzLlRZUEVfRlJPTV9TSE9SVF9UWVBFW3R5cGVTdHJpbmcudG9VcHBlckNhc2UoKV0gfHxcclxuICAgICAgICB0eXBlU3RyaW5nLnRvTG93ZXJDYXNlKCk7XHJcbn1cclxuZXhwb3J0cy5nZXRGdWxsTmFtZSA9IGdldEZ1bGxOYW1lO1xyXG4vLyMgc291cmNlTWFwcGluZ1VSTD10eXBlLmpzLm1hcCIsImZ1bmN0aW9uIF9fZXhwb3J0KG0pIHtcclxuICAgIGZvciAodmFyIHAgaW4gbSkgaWYgKCFleHBvcnRzLmhhc093blByb3BlcnR5KHApKSBleHBvcnRzW3BdID0gbVtwXTtcclxufVxyXG5fX2V4cG9ydChyZXF1aXJlKCdkYXRhbGliL3NyYy91dGlsJykpO1xyXG5fX2V4cG9ydChyZXF1aXJlKCdkYXRhbGliL3NyYy9nZW5lcmF0ZScpKTtcclxuX19leHBvcnQocmVxdWlyZSgnZGF0YWxpYi9zcmMvc3RhdHMnKSk7XHJcbmZ1bmN0aW9uIGNvbnRhaW5zKGFycmF5LCBpdGVtKSB7XHJcbiAgICByZXR1cm4gYXJyYXkuaW5kZXhPZihpdGVtKSA+IC0xO1xyXG59XHJcbmV4cG9ydHMuY29udGFpbnMgPSBjb250YWlucztcclxuZnVuY3Rpb24gZm9yRWFjaChvYmosIGYsIHRoaXNBcmcpIHtcclxuICAgIGlmIChvYmouZm9yRWFjaCkge1xyXG4gICAgICAgIG9iai5mb3JFYWNoLmNhbGwodGhpc0FyZywgZik7XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgICBmb3IgKHZhciBrIGluIG9iaikge1xyXG4gICAgICAgICAgICBmLmNhbGwodGhpc0FyZywgb2JqW2tdLCBrLCBvYmopO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5leHBvcnRzLmZvckVhY2ggPSBmb3JFYWNoO1xyXG5mdW5jdGlvbiByZWR1Y2Uob2JqLCBmLCBpbml0LCB0aGlzQXJnKSB7XHJcbiAgICBpZiAob2JqLnJlZHVjZSkge1xyXG4gICAgICAgIHJldHVybiBvYmoucmVkdWNlLmNhbGwodGhpc0FyZywgZiwgaW5pdCk7XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgICBmb3IgKHZhciBrIGluIG9iaikge1xyXG4gICAgICAgICAgICBpbml0ID0gZi5jYWxsKHRoaXNBcmcsIGluaXQsIG9ialtrXSwgaywgb2JqKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGluaXQ7XHJcbiAgICB9XHJcbn1cclxuZXhwb3J0cy5yZWR1Y2UgPSByZWR1Y2U7XHJcbmZ1bmN0aW9uIG1hcChvYmosIGYsIHRoaXNBcmcpIHtcclxuICAgIGlmIChvYmoubWFwKSB7XHJcbiAgICAgICAgcmV0dXJuIG9iai5tYXAuY2FsbCh0aGlzQXJnLCBmKTtcclxuICAgIH1cclxuICAgIGVsc2Uge1xyXG4gICAgICAgIHZhciBvdXRwdXQgPSBbXTtcclxuICAgICAgICBmb3IgKHZhciBrIGluIG9iaikge1xyXG4gICAgICAgICAgICBvdXRwdXQucHVzaChmLmNhbGwodGhpc0FyZywgb2JqW2tdLCBrLCBvYmopKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIG91dHB1dDtcclxuICAgIH1cclxufVxyXG5leHBvcnRzLm1hcCA9IG1hcDtcclxuZnVuY3Rpb24gYW55KGFyciwgZikge1xyXG4gICAgdmFyIGkgPSAwLCBrO1xyXG4gICAgZm9yIChrIGluIGFycikge1xyXG4gICAgICAgIGlmIChmKGFycltrXSwgaywgaSsrKSlcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbn1cclxuZXhwb3J0cy5hbnkgPSBhbnk7XHJcbmZ1bmN0aW9uIGFsbChhcnIsIGYpIHtcclxuICAgIHZhciBpID0gMCwgaztcclxuICAgIGZvciAoayBpbiBhcnIpIHtcclxuICAgICAgICBpZiAoIWYoYXJyW2tdLCBrLCBpKyspKVxyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdHJ1ZTtcclxufVxyXG5leHBvcnRzLmFsbCA9IGFsbDtcclxudmFyIGRsQmluID0gcmVxdWlyZSgnZGF0YWxpYi9zcmMvYmlucy9iaW5zJyk7XHJcbmZ1bmN0aW9uIGdldGJpbnMoc3RhdHMsIG1heGJpbnMpIHtcclxuICAgIHJldHVybiBkbEJpbih7XHJcbiAgICAgICAgbWluOiBzdGF0cy5taW4sXHJcbiAgICAgICAgbWF4OiBzdGF0cy5tYXgsXHJcbiAgICAgICAgbWF4YmluczogbWF4Ymluc1xyXG4gICAgfSk7XHJcbn1cclxuZXhwb3J0cy5nZXRiaW5zID0gZ2V0YmlucztcclxuZnVuY3Rpb24gZXJyb3IobWVzc2FnZSkge1xyXG4gICAgY29uc29sZS5lcnJvcignW1ZMIEVycm9yXScsIG1lc3NhZ2UpO1xyXG59XHJcbmV4cG9ydHMuZXJyb3IgPSBlcnJvcjtcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9dXRpbC5qcy5tYXAiLCJ2YXIgdXRpbF8xID0gcmVxdWlyZSgnLi91dGlsJyk7XHJcbnZhciBtYXJrXzEgPSByZXF1aXJlKCcuL21hcmsnKTtcclxuZXhwb3J0cy5ERUZBVUxUX1JFUVVJUkVEX0NIQU5ORUxfTUFQID0ge1xyXG4gICAgdGV4dDogWyd0ZXh0J10sXHJcbiAgICBsaW5lOiBbJ3gnLCAneSddLFxyXG4gICAgYXJlYTogWyd4JywgJ3knXVxyXG59O1xyXG5leHBvcnRzLkRFRkFVTFRfU1VQUE9SVEVEX0NIQU5ORUxfVFlQRSA9IHtcclxuICAgIGJhcjogdXRpbF8xLnRvTWFwKFsncm93JywgJ2NvbHVtbicsICd4JywgJ3knLCAnc2l6ZScsICdjb2xvcicsICdkZXRhaWwnXSksXHJcbiAgICBsaW5lOiB1dGlsXzEudG9NYXAoWydyb3cnLCAnY29sdW1uJywgJ3gnLCAneScsICdjb2xvcicsICdkZXRhaWwnXSksXHJcbiAgICBhcmVhOiB1dGlsXzEudG9NYXAoWydyb3cnLCAnY29sdW1uJywgJ3gnLCAneScsICdjb2xvcicsICdkZXRhaWwnXSksXHJcbiAgICB0aWNrOiB1dGlsXzEudG9NYXAoWydyb3cnLCAnY29sdW1uJywgJ3gnLCAneScsICdjb2xvcicsICdkZXRhaWwnXSksXHJcbiAgICBjaXJjbGU6IHV0aWxfMS50b01hcChbJ3JvdycsICdjb2x1bW4nLCAneCcsICd5JywgJ2NvbG9yJywgJ3NpemUnLCAnZGV0YWlsJ10pLFxyXG4gICAgc3F1YXJlOiB1dGlsXzEudG9NYXAoWydyb3cnLCAnY29sdW1uJywgJ3gnLCAneScsICdjb2xvcicsICdzaXplJywgJ2RldGFpbCddKSxcclxuICAgIHBvaW50OiB1dGlsXzEudG9NYXAoWydyb3cnLCAnY29sdW1uJywgJ3gnLCAneScsICdjb2xvcicsICdzaXplJywgJ2RldGFpbCcsICdzaGFwZSddKSxcclxuICAgIHRleHQ6IHV0aWxfMS50b01hcChbJ3JvdycsICdjb2x1bW4nLCAnc2l6ZScsICdjb2xvcicsICd0ZXh0J10pXHJcbn07XHJcbmZ1bmN0aW9uIGdldEVuY29kaW5nTWFwcGluZ0Vycm9yKHNwZWMsIHJlcXVpcmVkQ2hhbm5lbE1hcCwgc3VwcG9ydGVkQ2hhbm5lbE1hcCkge1xyXG4gICAgaWYgKHJlcXVpcmVkQ2hhbm5lbE1hcCA9PT0gdm9pZCAwKSB7IHJlcXVpcmVkQ2hhbm5lbE1hcCA9IGV4cG9ydHMuREVGQVVMVF9SRVFVSVJFRF9DSEFOTkVMX01BUDsgfVxyXG4gICAgaWYgKHN1cHBvcnRlZENoYW5uZWxNYXAgPT09IHZvaWQgMCkgeyBzdXBwb3J0ZWRDaGFubmVsTWFwID0gZXhwb3J0cy5ERUZBVUxUX1NVUFBPUlRFRF9DSEFOTkVMX1RZUEU7IH1cclxuICAgIHZhciBtYXJrID0gc3BlYy5tYXJrO1xyXG4gICAgdmFyIGVuY29kaW5nID0gc3BlYy5lbmNvZGluZztcclxuICAgIHZhciByZXF1aXJlZENoYW5uZWxzID0gcmVxdWlyZWRDaGFubmVsTWFwW21hcmtdO1xyXG4gICAgdmFyIHN1cHBvcnRlZENoYW5uZWxzID0gc3VwcG9ydGVkQ2hhbm5lbE1hcFttYXJrXTtcclxuICAgIGZvciAodmFyIGkgaW4gcmVxdWlyZWRDaGFubmVscykge1xyXG4gICAgICAgIGlmICghKHJlcXVpcmVkQ2hhbm5lbHNbaV0gaW4gZW5jb2RpbmcpKSB7XHJcbiAgICAgICAgICAgIHJldHVybiAnTWlzc2luZyBlbmNvZGluZyBjaGFubmVsIFxcXCInICsgcmVxdWlyZWRDaGFubmVsc1tpXSArXHJcbiAgICAgICAgICAgICAgICAnXFxcIiBmb3IgbWFyayBcXFwiJyArIG1hcmsgKyAnXFxcIic7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZm9yICh2YXIgY2hhbm5lbCBpbiBlbmNvZGluZykge1xyXG4gICAgICAgIGlmICghc3VwcG9ydGVkQ2hhbm5lbHNbY2hhbm5lbF0pIHtcclxuICAgICAgICAgICAgcmV0dXJuICdFbmNvZGluZyBjaGFubmVsIFxcXCInICsgY2hhbm5lbCArXHJcbiAgICAgICAgICAgICAgICAnXFxcIiBpcyBub3Qgc3VwcG9ydGVkIGJ5IG1hcmsgdHlwZSBcXFwiJyArIG1hcmsgKyAnXFxcIic7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgaWYgKG1hcmsgPT09IG1hcmtfMS5CQVIgJiYgIWVuY29kaW5nLnggJiYgIWVuY29kaW5nLnkpIHtcclxuICAgICAgICByZXR1cm4gJ01pc3NpbmcgYm90aCB4IGFuZCB5IGZvciBiYXInO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIG51bGw7XHJcbn1cclxuZXhwb3J0cy5nZXRFbmNvZGluZ01hcHBpbmdFcnJvciA9IGdldEVuY29kaW5nTWFwcGluZ0Vycm9yO1xyXG4vLyMgc291cmNlTWFwcGluZ1VSTD12YWxpZGF0ZS5qcy5tYXAiXX0=
