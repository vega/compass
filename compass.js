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
var vlShorthand = require('vega-lite/src/shorthand');
var clusterfck = require('clusterfck');
var consts = require('./clusterconsts');
var util = require('../util');
var clDistance = require('./distance');
exports.distance = clDistance;
function cluster(specs, opt) {
    var dist = exports.distance.table(specs);
    var clusterTrees = clusterfck.hcluster(specs, function (e1, e2) {
        var s1 = vlShorthand.shorten(e1), s2 = vlShorthand.shorten(e2);
        return dist[s1][s2];
    }, 'average', consts.CLUSTER_THRESHOLD);
    var clusters = clusterTrees.map(function (tree) {
        return util.traverse(tree, []);
    })
        .map(function (cluster) {
        return cluster.sort(function (spec1, spec2) {
            return spec2._info.score - spec1._info.score;
        });
    }).filter(function (cluster) {
        return cluster.length > 0;
    }).sort(function (cluster1, cluster2) {
        return cluster2[0]._info.score - cluster1[0]._info.score;
    });
    clusters.dist = dist;
    return clusters;
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = cluster;

},{"../util":19,"./clusterconsts":7,"./distance":8,"clusterfck":2,"vega-lite/src/shorthand":38}],7:[function(require,module,exports){
'use strict';
exports.SWAPPABLE = 0.05;
exports.DIST_MISSING = 1;
exports.CLUSTER_THRESHOLD = 1;
function reduceTupleToTable(r, x) {
    var a = x[0], b = x[1], d = x[2];
    r[a] = r[a] || {};
    r[b] = r[b] || {};
    r[a][b] = r[b][a] = d;
    return r;
}
exports.DIST_BY_CHANNEL = [
    ['x', 'y', exports.SWAPPABLE],
    ['row', 'column', exports.SWAPPABLE],
    ['color', 'shape', exports.SWAPPABLE],
    ['color', 'detail', exports.SWAPPABLE],
    ['detail', 'shape', exports.SWAPPABLE],
    ['size', 'color', exports.SWAPPABLE]
].reduce(reduceTupleToTable, {});

},{}],8:[function(require,module,exports){
"use strict";
var vlSpec = require('vega-lite/src/spec');
var vlShorthand = require('vega-lite/src/shorthand');
var consts = require('./clusterconsts');
var util = require('../util');
function table(specs) {
    var len = specs.length, extendedSpecs = specs.map(function (e) { return extendSpecWithChannelByColumnName(e); }), shorthands = specs.map(vlShorthand.shorten), diff = {}, i, j;
    for (i = 0; i < len; i++) {
        diff[shorthands[i]] = {};
    }
    for (i = 0; i < len; i++) {
        for (j = i + 1; j < len; j++) {
            var sj = shorthands[j], si = shorthands[i];
            diff[sj][si] = diff[si][sj] = get(extendedSpecs[i], extendedSpecs[j]);
        }
    }
    return diff;
}
exports.table = table;
function get(extendedSpec1, extendedSpec2) {
    var cols = util.union(util.keys(extendedSpec1.channelByField), util.keys(extendedSpec2.channelByField)), dist = 0;
    cols.forEach(function (column) {
        var e1 = extendedSpec1.channelByField[column], e2 = extendedSpec2.channelByField[column];
        if (e1 && e2) {
            if (e1.channel !== e2.channel) {
                dist += (consts.DIST_BY_CHANNEL[e1.channel] || {})[e2.channel] || 1;
            }
        }
        else {
            dist += consts.DIST_MISSING;
        }
    });
    var isStack1 = vlSpec.isStacked(extendedSpec1), isStack2 = vlSpec.isStacked(extendedSpec2);
    if (isStack1 || isStack2) {
        if (isStack1 && isStack2) {
            if ((extendedSpec1.encoding.color && extendedSpec2.encoding.color &&
                extendedSpec1.encoding.color.field !== extendedSpec2.encoding.color.field) ||
                (extendedSpec1.encoding.detail && extendedSpec2.encoding.detail &&
                    extendedSpec1.encoding.detail.field !== extendedSpec2.encoding.detail.field)) {
                dist += 1;
            }
        }
        else {
            dist += 1;
        }
    }
    return dist;
}
exports.get = get;
function extendSpecWithChannelByColumnName(spec) {
    var _channelByField = {}, encoding = spec.encoding;
    util.keys(encoding).forEach(function (channel) {
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
}
exports.extendSpecWithChannelByColumnName = extendSpecWithChannelByColumnName;

},{"../util":19,"./clusterconsts":7,"vega-lite/src/shorthand":38,"vega-lite/src/spec":39}],9:[function(require,module,exports){
"use strict";
var channel_1 = require('vega-lite/src/channel');
var mark_1 = require('vega-lite/src/mark');
exports.DEFAULT_PROJECTION_OPT = {
    omitDotPlot: false,
    maxCardinalityForAutoAddOrdinal: 50,
    alwaysAddHistogram: true,
    maxAdditionalVariables: 1
};
(function (TableType) {
    TableType[TableType["BOTH"] = 'both'] = "BOTH";
    TableType[TableType["AGGREGATED"] = 'aggregated'] = "AGGREGATED";
    TableType[TableType["DISAGGREGATED"] = 'disaggregated'] = "DISAGGREGATED";
})(exports.TableType || (exports.TableType = {}));
var TableType = exports.TableType;
(function (QuantitativeDimensionType) {
    QuantitativeDimensionType[QuantitativeDimensionType["AUTO"] = 'auto'] = "AUTO";
    QuantitativeDimensionType[QuantitativeDimensionType["BIN"] = 'bin'] = "BIN";
    QuantitativeDimensionType[QuantitativeDimensionType["CAST"] = 'cast'] = "CAST";
    QuantitativeDimensionType[QuantitativeDimensionType["NONE"] = 'none'] = "NONE";
})(exports.QuantitativeDimensionType || (exports.QuantitativeDimensionType = {}));
var QuantitativeDimensionType = exports.QuantitativeDimensionType;
exports.DEFAULT_AGGREGATION_OPTIONS = {
    tableTypes: TableType.BOTH,
    genDimQ: QuantitativeDimensionType.AUTO,
    minCardinalityForBin: 20,
    omitDotPlot: false,
    omitMeasureOnly: false,
    omitDimensionOnly: true,
    addCountForDimensionOnly: true,
    aggrList: [undefined, 'mean'],
    timeUnitList: ['year'],
    consistentAutoQ: true
};
exports.DEFAULT_SCALE_OPTION = {
    rescaleQuantitative: [undefined]
};
;
exports.DEFAULT_SPEC_OPTION = {
    markList: [mark_1.Mark.POINT, mark_1.Mark.BAR, mark_1.Mark.LINE, mark_1.Mark.AREA, mark_1.Mark.TEXT, mark_1.Mark.TICK],
    channelList: [channel_1.X, channel_1.Y, channel_1.ROW, channel_1.COLUMN, channel_1.SIZE, channel_1.COLOR, channel_1.TEXT, channel_1.DETAIL],
    alwaysGenerateTableAsHeatmap: true,
    maxGoodCardinalityForFacets: 5,
    maxCardinalityForFacets: 20,
    maxGoodCardinalityForColor: 7,
    maxCardinalityForColor: 20,
    maxCardinalityForShape: 6,
    omitDotPlot: false,
    omitDotPlotWithExtraEncoding: true,
    omitDotPlotWithFacet: true,
    omitDotPlotWithOnlyCount: false,
    omitMultipleNonPositionalChannels: true,
    omitNonTextAggrWithAllDimsOnFacets: true,
    omitRawWithXYBothDimension: true,
    omitShapeWithBin: true,
    omitShapeWithTimeDimension: true,
    omitSizeOnBar: true,
    omitLengthForLogScale: true,
    omitStackedAverage: true,
    omitTranspose: true,
};

},{"vega-lite/src/channel":31,"vega-lite/src/mark":36}],10:[function(require,module,exports){
"use strict";
var cpConsts = require('./consts');
var cluster_1 = require('./cluster/cluster');
var cpGen = require('./gen/gen');
var cpRank = require('./rank/rank');
var cpUtil = require('./util');
exports.consts = cpConsts;
exports.cluster = cluster_1.default;
exports.gen = cpGen;
exports.rank = cpRank;
exports.util = cpUtil;
exports.auto = '-, sum';
exports.version = '0.7.1';

},{"./cluster/cluster":6,"./consts":9,"./gen/gen":13,"./rank/rank":17,"./util":19}],11:[function(require,module,exports){
'use strict';
var vlFieldDef = require('vega-lite/src/fielddef');
var vlShorthand = require('vega-lite/src/shorthand');
var type_1 = require('vega-lite/src/type');
var aggregate_1 = require('vega-lite/src/aggregate');
var util = require('../util');
var consts_1 = require('../consts');
var AUTO = '*';
function genAggregates(output, fieldDefs, stats, opt) {
    if (opt === void 0) { opt = {}; }
    opt = util.extend({}, consts_1.DEFAULT_AGGREGATION_OPTIONS, opt);
    var tf = new Array(fieldDefs.length);
    var hasNorO = util.any(fieldDefs, function (f) {
        return f.type === type_1.Type.NOMINAL || f.type === type_1.Type.ORDINAL;
    });
    function emit(fieldSet) {
        fieldSet = util.duplicate(fieldSet);
        fieldSet.key = fieldSet.map(function (fieldDef) {
            return vlShorthand.shortenFieldDef(fieldDef);
        }).join(vlShorthand.DELIM);
        output.push(fieldSet);
    }
    function checkAndPush() {
        if (opt.omitMeasureOnly || opt.omitDimensionOnly) {
            var hasMeasure = false, hasDimension = false, hasRaw = false;
            tf.forEach(function (f) {
                if (vlFieldDef.isDimension(f)) {
                    hasDimension = true;
                }
                else {
                    hasMeasure = true;
                    if (!f.aggregate) {
                        hasRaw = true;
                    }
                }
            });
            if (!hasDimension && !hasRaw && opt.omitMeasureOnly) {
                return;
            }
            if (!hasMeasure) {
                if (opt.addCountForDimensionOnly) {
                    tf.push(vlFieldDef.count());
                    emit(tf);
                    tf.pop();
                }
                if (opt.omitDimensionOnly) {
                    return;
                }
            }
        }
        if (opt.omitDotPlot && tf.length === 1) {
            return;
        }
        emit(tf);
    }
    function assignAggrQ(i, hasAggr, autoMode, a) {
        var canHaveAggr = hasAggr === true || hasAggr === null, cantHaveAggr = hasAggr === false || hasAggr === null;
        if (a) {
            if (canHaveAggr) {
                tf[i].aggregate = a;
                assignField(i + 1, true, autoMode);
                delete tf[i].aggregate;
            }
        }
        else {
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
        var f = fieldDefs[i], canHaveAggr = hasAggr === true || hasAggr === null;
        tf[i] = { field: f.field, type: f.type };
        if (f.aggregate === aggregate_1.AggregateOp.COUNT) {
            if (canHaveAggr) {
                tf[i].aggregate = f.aggregate;
                assignField(i + 1, true, autoMode);
            }
        }
        else if (f._aggregate) {
            assignAggrQ(i, hasAggr, autoMode, f._aggregate);
        }
        else if (f._raw) {
            assignAggrQ(i, hasAggr, autoMode, undefined);
        }
        else if (f._bin) {
            assignBinQ(i, hasAggr, autoMode);
        }
        else {
            opt.aggrList.forEach(function (a) {
                if (!opt.consistentAutoQ || autoMode === AUTO || autoMode === a) {
                    assignAggrQ(i, hasAggr, a, a);
                }
            });
            if ((!opt.consistentAutoQ || util.isin(autoMode, [AUTO, 'bin', 'cast', 'autocast'])) && !hasNorO) {
                var highCardinality = vlFieldDef.cardinality(f, stats) > opt.minCardinalityForBin;
                var isAuto = opt.genDimQ === consts_1.QuantitativeDimensionType.AUTO, genBin = opt.genDimQ === consts_1.QuantitativeDimensionType.BIN || (isAuto && highCardinality), genCast = opt.genDimQ === consts_1.QuantitativeDimensionType.CAST || (isAuto && !highCardinality);
                if (genBin && util.isin(autoMode, [AUTO, 'bin', 'autocast'])) {
                    assignBinQ(i, hasAggr, isAuto ? 'autocast' : 'bin');
                }
                if (genCast && util.isin(autoMode, [AUTO, 'cast', 'autocast'])) {
                    tf[i].type = type_1.Type.ORDINAL;
                    assignField(i + 1, hasAggr, isAuto ? 'autocast' : 'cast');
                    tf[i].type = type_1.Type.QUANTITATIVE;
                }
            }
        }
    }
    function assignTimeUnitT(i, hasAggr, autoMode, timeUnit) {
        tf[i].timeUnit = timeUnit;
        assignField(i + 1, hasAggr, autoMode);
        delete tf[i].timeUnit;
    }
    function assignT(i, hasAggr, autoMode) {
        var f = fieldDefs[i];
        tf[i] = { field: f.field, type: f.type };
        if (f._timeUnit) {
            assignTimeUnitT(i, hasAggr, autoMode, f._timeUnit);
        }
        else {
            opt.timeUnitList.forEach(function (timeUnit) {
                if (timeUnit === undefined) {
                    if (!hasAggr) {
                        assignField(i + 1, false, autoMode);
                    }
                }
                else {
                    assignTimeUnitT(i, hasAggr, autoMode, timeUnit);
                }
            });
        }
    }
    function assignField(i, hasAggr, autoMode) {
        if (i === fieldDefs.length) {
            checkAndPush();
            return;
        }
        var f = fieldDefs[i];
        switch (f.type) {
            case type_1.Type.QUANTITATIVE:
                assignQ(i, hasAggr, autoMode);
                break;
            case type_1.Type.TEMPORAL:
                assignT(i, hasAggr, autoMode);
                break;
            case type_1.Type.ORDINAL:
            case type_1.Type.NOMINAL:
            default:
                tf[i] = f;
                assignField(i + 1, hasAggr, autoMode);
                break;
        }
    }
    var hasAggr = opt.tableTypes === consts_1.TableType.AGGREGATED ? true :
        opt.tableTypes === consts_1.TableType.DISAGGREGATED ? false : null;
    assignField(0, hasAggr, AUTO);
    return output;
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = genAggregates;

},{"../consts":9,"../util":19,"vega-lite/src/aggregate":29,"vega-lite/src/fielddef":34,"vega-lite/src/shorthand":38,"vega-lite/src/type":42}],12:[function(require,module,exports){
"use strict";
var fielddef_1 = require('vega-lite/src/fielddef');
var encoding_1 = require('vega-lite/src/encoding');
var util_1 = require('../util');
var marks_1 = require('./marks');
var consts_1 = require('../consts');
var aggregate_1 = require('vega-lite/src/aggregate');
var channel_1 = require('vega-lite/src/channel');
var type_1 = require('vega-lite/src/type');
function genEncodings(encodings, fieldDefs, stats, opt) {
    if (opt === void 0) { opt = consts_1.DEFAULT_SPEC_OPTION; }
    var tmpEncoding = {};
    function assignField(i) {
        if (i === fieldDefs.length) {
            if (rule.encoding(tmpEncoding, stats, opt)) {
                encodings.push(util_1.duplicate(tmpEncoding));
            }
            return;
        }
        var fieldDef = fieldDefs[i];
        for (var j in opt.channelList) {
            var channel = opt.channelList[j], isDim = fielddef_1.isDimension(fieldDef);
            var supportedRole = channel_1.getSupportedRole(channel);
            if (!(channel in tmpEncoding) &&
                ((isDim && supportedRole.dimension) || (!isDim && supportedRole.measure)) &&
                rule.channel[channel](tmpEncoding, fieldDef, stats, opt)) {
                tmpEncoding[channel] = fieldDef;
                assignField(i + 1);
                delete tmpEncoding[channel];
            }
        }
    }
    assignField(0);
    return encodings;
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = genEncodings;
var rule;
(function (rule) {
    var channel;
    (function (channel) {
        channel.x = noRule;
        channel.y = noRule;
        channel.text = noRule;
        channel.detail = noRule;
        channel.size = retinalEncRules;
        channel.row = noRule;
        channel.column = noRule;
        function color(encoding, fieldDef, stats, opt) {
            if (!retinalEncRules(encoding, fieldDef, stats, opt)) {
                return false;
            }
            return fielddef_1.isMeasure(fieldDef) ||
                fielddef_1.cardinality(fieldDef, stats) <= opt.maxCardinalityForColor;
        }
        channel.color = color;
        function shape(encoding, fieldDef, stats, opt) {
            if (!retinalEncRules(encoding, fieldDef, stats, opt)) {
                return false;
            }
            if (opt.omitShapeWithBin && fieldDef.bin && fieldDef.type === type_1.Type.QUANTITATIVE) {
                return false;
            }
            if (opt.omitShapeWithTimeDimension && fieldDef.timeUnit && fieldDef.type === type_1.Type.TEMPORAL) {
                return false;
            }
            return fielddef_1.cardinality(fieldDef, stats) <= opt.maxCardinalityForShape;
        }
        channel.shape = shape;
        function noRule() { return true; }
        function retinalEncRules(encoding, fieldDef, stats, opt) {
            if (opt.omitMultipleNonPositionalChannels) {
                if (encoding.color || encoding.size || encoding.shape) {
                    return false;
                }
            }
            return true;
        }
    })(channel = rule.channel || (rule.channel = {}));
    function dotPlotRules(encoding, stats, opt) {
        if (opt.omitDotPlot) {
            return false;
        }
        if (opt.omitTranspose && encoding.y) {
            return false;
        }
        if (opt.omitDotPlotWithFacet && (encoding.row || encoding.column)) {
            return false;
        }
        if (opt.omitDotPlotWithExtraEncoding && util_1.keys(encoding).length > 1) {
            return false;
        }
        if (opt.omitDotPlotWithOnlyCount) {
            if (encoding.x && encoding.x.aggregate === aggregate_1.AggregateOp.COUNT && !encoding.y) {
                return false;
            }
            if (encoding.y && encoding.y.aggregate === aggregate_1.AggregateOp.COUNT && !encoding.x) {
                return false;
            }
        }
        return true;
    }
    function isAggrWithAllDimOnFacets(encoding) {
        var hasAggr = false, hasOtherO = false;
        for (var c in encoding) {
            var channel_2 = c;
            var fieldDef = encoding[channel_2];
            if (fieldDef.aggregate) {
                hasAggr = true;
            }
            if (fielddef_1.isDimension(fieldDef) && (channel_2 !== channel_1.ROW && channel_2 !== channel_1.COLUMN)) {
                hasOtherO = true;
            }
            if (hasAggr && hasOtherO) {
                break;
            }
        }
        return hasAggr && !hasOtherO;
    }
    ;
    function xyPlotRules(encoding, stats, opt) {
        if (encoding.row || encoding.column) {
            if (opt.omitNonTextAggrWithAllDimsOnFacets) {
                if (isAggrWithAllDimOnFacets(encoding)) {
                    return false;
                }
            }
        }
        var isDimX = fielddef_1.isDimension(encoding.x), isDimY = fielddef_1.isDimension(encoding.y);
        if (opt.omitRawWithXYBothDimension && isDimX && isDimY && !encoding_1.isAggregate(encoding)) {
            return false;
        }
        if (opt.omitTranspose) {
            if (isDimX !== isDimY) {
                if ((encoding.y.type === type_1.Type.NOMINAL || encoding.y.type === type_1.Type.ORDINAL) && fielddef_1.isMeasure(encoding.x)) {
                    return true;
                }
                if (!isDimY && isDimX && !(encoding.x.type === type_1.Type.NOMINAL || encoding.x.type === type_1.Type.ORDINAL)) {
                    return true;
                }
                return false;
            }
            else if (encoding.y.type === type_1.Type.TEMPORAL || encoding.x.type === type_1.Type.TEMPORAL) {
                if (encoding.y.type === type_1.Type.TEMPORAL && encoding.x.type !== type_1.Type.TEMPORAL) {
                    return false;
                }
            }
            else {
                if (encoding.x.field > encoding.y.field) {
                    return false;
                }
            }
        }
        return true;
    }
    function encoding(encoding, stats, opt) {
        if (encoding.text) {
            return marks_1.rule.text(encoding, stats, opt);
        }
        var hasX = !!encoding.x, hasY = !!encoding.y;
        if (hasX !== hasY) {
            return dotPlotRules(encoding, stats, opt);
        }
        else if (hasX && hasY) {
            return xyPlotRules(encoding, stats, opt);
        }
        return false;
    }
    rule.encoding = encoding;
})(rule || (rule = {}));

},{"../consts":9,"../util":19,"./marks":14,"vega-lite/src/aggregate":29,"vega-lite/src/channel":31,"vega-lite/src/encoding":33,"vega-lite/src/fielddef":34,"vega-lite/src/type":42}],13:[function(require,module,exports){
'use strict';
var aggregates_1 = require('./aggregates');
var projections_1 = require('./projections');
var projections_2 = require('./projections');
var specs_1 = require('./specs');
var encodings_1 = require('./encodings');
var marks_1 = require('./marks');
exports.aggregates = aggregates_1.default;
exports.projections = projections_1.default;
exports.projections.key = projections_2.key;
exports.specs = specs_1.default;
exports.encodings = encodings_1.default;
exports.marks = marks_1.default;

},{"./aggregates":11,"./encodings":12,"./marks":14,"./projections":15,"./specs":16}],14:[function(require,module,exports){
"use strict";
var encoding_1 = require('vega-lite/src/encoding');
var fielddef_1 = require('vega-lite/src/fielddef');
var validate_1 = require('vega-lite/src/validate');
var type_1 = require('vega-lite/src/type');
var scale_1 = require('vega-lite/src/scale');
var aggregate_1 = require('vega-lite/src/aggregate');
var util = require('../util');
function genMarks(encoding, stats, opt) {
    return opt.markList.filter(function (mark) {
        var noVlError = validate_1.getEncodingMappingError({
            mark: mark,
            encoding: encoding
        }) === null;
        return noVlError && rule[mark](encoding, stats, opt);
    });
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = genMarks;
var rule;
(function (rule) {
    function facetRule(fieldDef, stats, opt) {
        return fielddef_1.cardinality(fieldDef, stats) <= opt.maxCardinalityForFacets;
    }
    function facetsRule(encoding, stats, opt) {
        if (encoding.row && !facetRule(encoding.row, stats, opt))
            return false;
        if (encoding.column && !facetRule(encoding.column, stats, opt))
            return false;
        return true;
    }
    function point(encoding, stats, opt) {
        if (!facetsRule(encoding, stats, opt))
            return false;
        if (encoding.x && encoding.y) {
            var xIsDim = fielddef_1.isDimension(encoding.x), yIsDim = fielddef_1.isDimension(encoding.y);
            if (xIsDim && yIsDim) {
                if (encoding.shape) {
                    return false;
                }
                if (encoding.color && fielddef_1.isDimension(encoding.color)) {
                    return false;
                }
            }
        }
        else {
            if (opt.omitDotPlot)
                return false;
            if (opt.omitTranspose && encoding.y)
                return false;
            if (opt.omitDotPlotWithExtraEncoding && util.keys(encoding).length > 1)
                return false;
        }
        return true;
    }
    rule.point = point;
    function tick(encoding, stats, opt) {
        if (encoding.x || encoding.y) {
            if (encoding_1.isAggregate(encoding))
                return false;
            var xIsDim = fielddef_1.isDimension(encoding.x), yIsDim = fielddef_1.isDimension(encoding.y);
            return (!xIsDim && (!encoding.y || yIsDim)) ||
                (!yIsDim && (!encoding.x || xIsDim));
        }
        return false;
    }
    rule.tick = tick;
    function bar(encoding, stats, opt) {
        if (!facetsRule(encoding, stats, opt))
            return false;
        if (!encoding.x && !encoding.y)
            return false;
        if (opt.omitSizeOnBar && encoding.size !== undefined)
            return false;
        if (opt.omitLengthForLogScale) {
            if (encoding.x && encoding.x.scale && encoding.x.scale.type === scale_1.ScaleType.LOG)
                return false;
            if (encoding.y && encoding.y.scale && encoding.y.scale.type === scale_1.ScaleType.LOG)
                return false;
        }
        var aggEitherXorY = (!encoding.x || encoding.x.aggregate === undefined) !==
            (!encoding.y || encoding.y.aggregate === undefined);
        if (aggEitherXorY) {
            var eitherXorYisDimOrNull = (!encoding.x || fielddef_1.isDimension(encoding.x)) !==
                (!encoding.y || fielddef_1.isDimension(encoding.y));
            if (eitherXorYisDimOrNull) {
                var aggregate = encoding.x.aggregate || encoding.y.aggregate;
                return !(opt.omitStackedAverage && aggregate === aggregate_1.AggregateOp.MEAN && encoding.color);
            }
        }
        return false;
    }
    rule.bar = bar;
    function line(encoding, stats, opt) {
        if (!facetsRule(encoding, stats, opt))
            return false;
        return encoding.x.type === type_1.Type.TEMPORAL && !!encoding.x.timeUnit &&
            encoding.y.type === type_1.Type.QUANTITATIVE && !!encoding.y.aggregate;
    }
    rule.line = line;
    function area(encoding, stats, opt) {
        if (!facetsRule(encoding, stats, opt))
            return false;
        if (!line(encoding, stats, opt))
            return false;
        if (opt.omitLengthForLogScale) {
            if (encoding.x && encoding.x.scale && encoding.x.scale.type === scale_1.ScaleType.LOG)
                return false;
            if (encoding.y && encoding.y.scale && encoding.y.scale.type === scale_1.ScaleType.LOG)
                return false;
        }
        return !(opt.omitStackedAverage && encoding.y.aggregate === aggregate_1.AggregateOp.MEAN && encoding.color);
    }
    rule.area = area;
    function text(encoding, stats, opt) {
        return (encoding.row || encoding.column) && encoding.text && encoding.text.aggregate && !encoding.x && !encoding.y && !encoding.size &&
            (!opt.alwaysGenerateTableAsHeatmap || !encoding.color);
    }
    rule.text = text;
})(rule = exports.rule || (exports.rule = {}));

},{"../util":19,"vega-lite/src/aggregate":29,"vega-lite/src/encoding":33,"vega-lite/src/fielddef":34,"vega-lite/src/scale":37,"vega-lite/src/type":42,"vega-lite/src/validate":44}],15:[function(require,module,exports){
"use strict";
var vlFieldDef = require('vega-lite/src/fielddef');
var util = require('../util');
var consts_1 = require('../consts');
var type_1 = require('vega-lite/src/type');
var isDimension = vlFieldDef.isDimension;
function projections(fieldDefs, stats, opt) {
    if (opt === void 0) { opt = {}; }
    opt = util.extend({}, consts_1.DEFAULT_PROJECTION_OPT, opt);
    var selected = [], fieldsToAdd = [], fieldSets = [];
    var hasSelectedDimension = false, hasSelectedMeasure = false;
    var indices = {};
    fieldDefs.forEach(function (fieldDef, index) {
        indices[fieldDef.field] = index;
        if (fieldDef.selected) {
            selected.push(fieldDef);
            if (isDimension(fieldDef) ||
                (fieldDef.type === type_1.TEMPORAL)) {
                hasSelectedDimension = true;
            }
            else {
                hasSelectedMeasure = true;
            }
        }
        else if (fieldDef.selected !== false && !vlFieldDef.isCount(fieldDef)) {
            if (vlFieldDef.isDimension(fieldDef) &&
                !opt.maxCardinalityForAutoAddOrdinal &&
                vlFieldDef.cardinality(fieldDef, stats, 15) > opt.maxCardinalityForAutoAddOrdinal) {
                return;
            }
            fieldsToAdd.push(fieldDef);
        }
    });
    fieldsToAdd.sort(compareFieldsToAdd(hasSelectedDimension, hasSelectedMeasure, indices));
    var setsToAdd = util.chooseKorLess(fieldsToAdd, opt.maxAdditionalVariables);
    setsToAdd.forEach(function (setToAdd) {
        var fieldSet = selected.concat(setToAdd);
        if (fieldSet.length > 0) {
            if (opt.omitDotPlot && fieldSet.length === 1) {
                return;
            }
            fieldSets.push(fieldSet);
        }
    });
    fieldSets.forEach(function (fieldSet) {
        fieldSet.key = key(fieldSet);
    });
    return fieldSets;
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = projections;
var typeIsMeasureScore = {
    nominal: 0,
    ordinal: 0,
    temporal: 2,
    quantitative: 3
};
function compareFieldsToAdd(hasSelectedDimension, hasSelectedMeasure, indices) {
    return function (a, b) {
        if (a.type !== b.type) {
            if (!hasSelectedDimension) {
                return typeIsMeasureScore[a.type] - typeIsMeasureScore[b.type];
            }
            else {
                return typeIsMeasureScore[b.type] - typeIsMeasureScore[a.type];
            }
        }
        return indices[a.field] - indices[b.field];
    };
}
function key(projection) {
    return projection.map(function (fieldDef) {
        return vlFieldDef.isCount(fieldDef) ? 'count' : fieldDef.field;
    }).join(',');
}
exports.key = key;
;

},{"../consts":9,"../util":19,"vega-lite/src/fielddef":34,"vega-lite/src/type":42}],16:[function(require,module,exports){
'use strict';
var vlFieldDef = require('vega-lite/src/fielddef');
var util = require('../util');
var consts_1 = require('../consts');
var encodings_1 = require('./encodings');
var marks_1 = require('./marks');
var rank = require('../rank/rank');
var shorthand_1 = require('vega-lite/src/shorthand');
function genSpecsFromFieldDefs(output, fieldDefs, stats, opt, nested) {
    if (opt === void 0) { opt = {}; }
    opt = util.extend({}, consts_1.DEFAULT_SPEC_OPTION, opt);
    var encodings = encodings_1.default([], fieldDefs, stats, opt);
    if (nested) {
        return encodings.reduce(function (dict, encoding) {
            var encodingShorthand = shorthand_1.shortenEncoding(encoding);
            dict[encodingShorthand] = genSpecsFromEncodings([], encoding, stats, opt);
            return dict;
        }, {});
    }
    else {
        return encodings.reduce(function (list, encoding) {
            return genSpecsFromEncodings(list, encoding, stats, opt);
        }, output);
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = genSpecsFromFieldDefs;
function genSpecsFromEncodings(output, encoding, stats, opt) {
    marks_1.default(encoding, stats, opt)
        .forEach(function (mark) {
        var spec = util.duplicate({
            encoding: encoding,
            config: opt.config
        });
        spec.mark = mark;
        spec.data = opt.data;
        spec = finalTouch(spec, stats, opt);
        var score = rank.encoding(spec, stats, opt);
        spec._info = score;
        output.push(spec);
    });
    return output;
}
function finalTouch(spec, stats, opt) {
    if (spec.mark === 'text' && opt.alwaysGenerateTableAsHeatmap) {
        spec.encoding.color = spec.encoding.text;
    }
    var encoding = spec.encoding;
    ['x', 'y'].forEach(function (channel) {
        var fieldDef = encoding[channel];
        if (fieldDef && vlFieldDef.isMeasure(fieldDef) && !vlFieldDef.isCount(fieldDef)) {
            var stat = stats[fieldDef.field];
            if (stat && stat.stdev / stat.mean < 0.01) {
                fieldDef.scale = { zero: false };
            }
        }
    });
    return spec;
}

},{"../consts":9,"../rank/rank":17,"../util":19,"./encodings":12,"./marks":14,"vega-lite/src/fielddef":34,"vega-lite/src/shorthand":38}],17:[function(require,module,exports){
"use strict";
var rankEncodings_1 = require('./rankEncodings');
exports.encoding = rankEncodings_1.default;

},{"./rankEncodings":18}],18:[function(require,module,exports){
'use strict';
var vlEncoding = require('vega-lite/src/encoding');
var vlFieldDef = require('vega-lite/src/fielddef');
var vlChannel = require('vega-lite/src/channel');
var isDimension = vlFieldDef.isDimension;
var util = require('../util');
var vlShorthand = require('vega-lite/src/shorthand');
var type_1 = require('vega-lite/src/type');
var mark_1 = require('vega-lite/src/mark');
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
var D = {}, M = {}, BAD = 0.1, TERRIBLE = 0.01;
D.minor = 0.01;
D.pos = 1;
D.Y_T = 0.8;
D.facet_text = 1;
D.facet_good = 0.675;
D.facet_ok = 0.55;
D.facet_bad = 0.4;
D.color_good = 0.7;
D.color_ok = 0.65;
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
exports.dimensionScore = function (fieldDef, channel, mark, stats, opt) {
    var cardinality = vlFieldDef.cardinality(fieldDef, stats);
    switch (channel) {
        case vlChannel.X:
            if (fieldDef.type === type_1.Type.NOMINAL || fieldDef.type === type_1.Type.ORDINAL) {
                return D.pos - D.minor;
            }
            return D.pos;
        case vlChannel.Y:
            if (fieldDef.type === type_1.Type.NOMINAL || fieldDef.type === type_1.Type.ORDINAL) {
                return D.pos - D.minor;
            }
            if (fieldDef.type === type_1.Type.TEMPORAL) {
                return D.Y_T;
            }
            return D.pos - D.minor;
        case vlChannel.COLUMN:
            if (mark === 'text')
                return D.facet_text;
            return cardinality <= opt.maxGoodCardinalityForFacets ? D.facet_good :
                cardinality <= opt.maxCardinalityForFacets ? D.facet_ok : D.facet_bad;
        case vlChannel.ROW:
            if (mark === 'text')
                return D.facet_text;
            return (cardinality <= opt.maxGoodCardinalityForFacets ? D.facet_good :
                cardinality <= opt.maxCardinalityForFacets ? D.facet_ok : D.facet_bad) - D.minor;
        case vlChannel.COLOR:
            var hasOrder = (fieldDef.bin && fieldDef.type === type_1.Type.QUANTITATIVE) || (fieldDef.timeUnit && fieldDef.type === type_1.Type.TEMPORAL);
            var isStacked = mark === mark_1.Mark.BAR || mark === mark_1.Mark.AREA;
            if (hasOrder)
                return D.color_bad;
            if (isStacked)
                return D.color_stack;
            return cardinality <= opt.maxGoodCardinalityForColor ? D.color_good : cardinality <= opt.maxCardinalityForColor ? D.color_ok : D.color_bad;
        case vlChannel.SHAPE:
            return cardinality <= opt.maxCardinalityForShape ? D.shape : TERRIBLE;
        case vlChannel.DETAIL:
            return D.detail;
    }
    return TERRIBLE;
};
exports.dimensionScore.consts = D;
exports.measureScore = function (fieldDef, channel, mark, stats, opt) {
    switch (channel) {
        case vlChannel.X: return M.pos;
        case vlChannel.Y: return M.pos;
        case vlChannel.SIZE:
            if (mark === mark_1.Mark.BAR || mark === mark_1.Mark.TEXT || mark === mark_1.Mark.LINE) {
                return BAD;
            }
            return M.size;
        case vlChannel.COLOR: return M.color;
        case vlChannel.TEXT: return M.text;
    }
    return BAD;
};
exports.measureScore.consts = M;
function rankEncodings(spec, stats, opt, selected) {
    var features = [], channels = util.keys(spec.encoding), mark = spec.mark, encoding = spec.encoding;
    var encodingMappingByField = vlEncoding.reduce(spec.encoding, function (o, fieldDef, channel) {
        var key = vlShorthand.shortenFieldDef(fieldDef);
        var mappings = o[key] = o[key] || [];
        mappings.push({ channel: channel, fieldDef: fieldDef });
        return o;
    }, {});
    util.forEach(encodingMappingByField, function (mappings) {
        var reasons = mappings.map(function (m) {
            return m.channel + vlShorthand.ASSIGN + vlShorthand.shortenFieldDef(m.fieldDef) +
                ' ' + (selected && selected[m.fieldDef.field] ? '[x]' : '[ ]');
        }), scores = mappings.map(function (m) {
            var roleScore = vlFieldDef.isDimension(m.fieldDef) ?
                exports.dimensionScore : exports.measureScore;
            var score = roleScore(m.fieldDef, m.channel, spec.mark, stats, opt);
            return !selected || selected[m.fieldDef.field] ? score : Math.pow(score, 0.125);
        });
        features.push({
            reason: reasons.join(' | '),
            score: Math.max.apply(null, scores)
        });
    });
    if (mark === 'text') {
    }
    else {
        if (encoding.x && encoding.y) {
            if (isDimension(encoding.x) !== isDimension(encoding.y)) {
                features.push({
                    reason: 'OxQ plot',
                    score: 0.8
                });
            }
        }
    }
    if (channels.length > 1 && mark !== mark_1.Mark.TEXT) {
        if ((!encoding.x || !encoding.y) && !encoding.geo && !encoding.text) {
            features.push({
                reason: 'unused position',
                score: UNUSED_POSITION
            });
        }
    }
    features.push({
        reason: 'mark=' + mark,
        score: MARK_SCORE[mark]
    });
    return {
        score: features.reduce(function (p, f) {
            return p * f.score;
        }, 1),
        features: features
    };
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = rankEncodings;

},{"../util":19,"vega-lite/src/channel":31,"vega-lite/src/encoding":33,"vega-lite/src/fielddef":34,"vega-lite/src/mark":36,"vega-lite/src/shorthand":38,"vega-lite/src/type":42}],19:[function(require,module,exports){
"use strict";
exports.isArray = Array.isArray || function (obj) {
    return {}.toString.call(obj) === '[object Array]';
};
function isin(item, array) {
    return array.indexOf(item) !== -1;
}
exports.isin = isin;
;
function json(s, sp) {
    return JSON.stringify(s, null, sp);
}
exports.json = json;
;
function keys(obj) {
    var k = [], x;
    for (x in obj) {
        k.push(x);
    }
    return k;
}
exports.keys = keys;
;
function duplicate(obj) {
    return JSON.parse(JSON.stringify(obj));
}
exports.duplicate = duplicate;
;
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
;
function any(arr, f) {
    var i = 0, k;
    for (k in arr) {
        if (f(arr[k], k, i++)) {
            return true;
        }
    }
    return false;
}
exports.any = any;
;
function nestedMap(collection, f, level, filter) {
    return level === 0 ?
        collection.map(f) :
        collection.map(function (v) {
            var r = nestedMap(v, f, level - 1);
            return filter ? r.filter(nonEmpty) : r;
        });
}
exports.nestedMap = nestedMap;
;
function nestedReduce(collection, f, level, filter) {
    return level === 0 ?
        collection.reduce(f, []) :
        collection.map(function (v) {
            var r = nestedReduce(v, f, level - 1);
            return filter ? r.filter(nonEmpty) : r;
        });
}
exports.nestedReduce = nestedReduce;
;
function nonEmpty(grp) {
    return !exports.isArray(grp) || grp.length > 0;
}
exports.nonEmpty = nonEmpty;
;
function traverse(node, arr) {
    if (node.value !== undefined) {
        arr.push(node.value);
    }
    else {
        if (node.left) {
            traverse(node.left, arr);
        }
        if (node.right) {
            traverse(node.right, arr);
        }
    }
    return arr;
}
exports.traverse = traverse;
;
function extend(obj, b) {
    var rest = [];
    for (var _i = 2; _i < arguments.length; _i++) {
        rest[_i - 2] = arguments[_i];
    }
    for (var x, name, i = 1, len = arguments.length; i < len; ++i) {
        x = arguments[i];
        for (name in x) {
            obj[name] = x[name];
        }
    }
    return obj;
}
exports.extend = extend;
;
function union(a, b) {
    var o = {};
    a.forEach(function (x) { o[x] = true; });
    b.forEach(function (x) { o[x] = true; });
    return keys(o);
}
exports.union = union;
;
var gen;
(function (gen) {
    function getOpt(opt) {
        return (opt ? keys(opt) : []).reduce(function (c, k) {
            c[k] = opt[k];
            return c;
        }, Object.create({}));
    }
    gen.getOpt = getOpt;
    ;
})(gen = exports.gen || (exports.gen = {}));
function powerset(list) {
    var ps = [
        []
    ];
    for (var i = 0; i < list.length; i++) {
        for (var j = 0, len = ps.length; j < len; j++) {
            ps.push(ps[j].concat(list[i]));
        }
    }
    return ps;
}
exports.powerset = powerset;
;
function chooseKorLess(list, k) {
    var subset = [[]];
    for (var i = 0; i < list.length; i++) {
        for (var j = 0, len = subset.length; j < len; j++) {
            var sub = subset[j].concat(list[i]);
            if (sub.length <= k) {
                subset.push(sub);
            }
        }
    }
    return subset;
}
exports.chooseKorLess = chooseKorLess;
;
function chooseK(list, k) {
    var subset = [[]];
    var kArray = [];
    for (var i = 0; i < list.length; i++) {
        for (var j = 0, len = subset.length; j < len; j++) {
            var sub = subset[j].concat(list[i]);
            if (sub.length < k) {
                subset.push(sub);
            }
            else if (sub.length === k) {
                kArray.push(sub);
            }
        }
    }
    return kArray;
}
exports.chooseK = chooseK;
;
function cross(a, b) {
    var x = [];
    for (var i = 0; i < a.length; i++) {
        for (var j = 0; j < b.length; j++) {
            x.push(a[i].concat(b[j]));
        }
    }
    return x;
}
exports.cross = cross;
;

},{}],20:[function(require,module,exports){
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

  var version = "0.1.1";

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
    while (Math.ceil(span/step) > maxb) { step *= base; }

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

},{"../time":23,"../util":24}],22:[function(require,module,exports){
var util = require('./util'),
    gen = module.exports;

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

gen.random.bootstrap = function(domain, smooth) {
  // Generates a bootstrap sample from a set of observations.
  // Smooth bootstrapping adds random zero-centered noise to the samples.
  var val = domain.filter(util.isValid),
      len = val.length,
      err = smooth ? gen.random.normal(0, smooth) : null;
  var f = function() {
    return val[~~(Math.random()*len)] + (err ? err() : 0);
  };
  f.samples = function(n) {
    return gen.zeros(n).map(f);
  };
  return f;
};
},{"./util":24}],23:[function(require,module,exports){
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
},{"d3-time":20}],24:[function(require,module,exports){
(function (Buffer){
var u = module.exports;

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

u.isBuffer = (typeof Buffer === 'function' && Buffer.isBuffer) || u.false;

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
    : u.isObject(x) || u.isString(x) ?
      // Output valid JSON and JS source strings.
      // See http://timelessrepo.com/json-isnt-a-javascript-subset
      JSON.stringify(x).replace('\u2028','\\u2028').replace('\u2029', '\\u2029')
    : x;
};

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
  /* jshint evil: true */
  return f==null || u.isFunction(f) ? f :
    u.namedfunc(f, Function('x', 'return x[' + u.field(f).map(u.str).join('][') + '];'));
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

}).call(this,require("buffer").Buffer)

},{"buffer":1}],25:[function(require,module,exports){
var json = typeof JSON !== 'undefined' ? JSON : require('jsonify');

module.exports = function (obj, opts) {
    if (!opts) opts = {};
    if (typeof opts === 'function') opts = { cmp: opts };
    var space = opts.space || '';
    if (typeof space === 'number') space = Array(space+1).join(' ');
    var cycles = (typeof opts.cycles === 'boolean') ? opts.cycles : false;
    var replacer = opts.replacer || function(key, value) { return value; };

    var cmp = opts.cmp && (function (f) {
        return function (node) {
            return function (a, b) {
                var aobj = { key: a, value: node[a] };
                var bobj = { key: b, value: node[b] };
                return f(aobj, bobj);
            };
        };
    })(opts.cmp);

    var seen = [];
    return (function stringify (parent, key, node, level) {
        var indent = space ? ('\n' + new Array(level + 1).join(space)) : '';
        var colonSeparator = space ? ': ' : ':';

        if (node && node.toJSON && typeof node.toJSON === 'function') {
            node = node.toJSON();
        }

        node = replacer.call(parent, key, node);

        if (node === undefined) {
            return;
        }
        if (typeof node !== 'object' || node === null) {
            return json.stringify(node);
        }
        if (isArray(node)) {
            var out = [];
            for (var i = 0; i < node.length; i++) {
                var item = stringify(node, i, node[i], level+1) || json.stringify(null);
                out.push(indent + space + item);
            }
            return '[' + out.join(',') + indent + ']';
        }
        else {
            if (seen.indexOf(node) !== -1) {
                if (cycles) return json.stringify('__cycle__');
                throw new TypeError('Converting circular structure to JSON');
            }
            else seen.push(node);

            var keys = objectKeys(node).sort(cmp && cmp(node));
            var out = [];
            for (var i = 0; i < keys.length; i++) {
                var key = keys[i];
                var value = stringify(node, key, node[key], level+1);

                if(!value) continue;

                var keyValue = json.stringify(key)
                    + colonSeparator
                    + value;
                ;
                out.push(indent + space + keyValue);
            }
            seen.splice(seen.indexOf(node), 1);
            return '{' + out.join(',') + indent + '}';
        }
    })({ '': obj }, '', obj, 0);
};

var isArray = Array.isArray || function (x) {
    return {}.toString.call(x) === '[object Array]';
};

var objectKeys = Object.keys || function (obj) {
    var has = Object.prototype.hasOwnProperty || function () { return true };
    var keys = [];
    for (var key in obj) {
        if (has.call(obj, key)) keys.push(key);
    }
    return keys;
};

},{"jsonify":26}],26:[function(require,module,exports){
exports.parse = require('./lib/parse');
exports.stringify = require('./lib/stringify');

},{"./lib/parse":27,"./lib/stringify":28}],27:[function(require,module,exports){
var at, // The index of the current character
    ch, // The current character
    escapee = {
        '"':  '"',
        '\\': '\\',
        '/':  '/',
        b:    '\b',
        f:    '\f',
        n:    '\n',
        r:    '\r',
        t:    '\t'
    },
    text,

    error = function (m) {
        // Call error when something is wrong.
        throw {
            name:    'SyntaxError',
            message: m,
            at:      at,
            text:    text
        };
    },
    
    next = function (c) {
        // If a c parameter is provided, verify that it matches the current character.
        if (c && c !== ch) {
            error("Expected '" + c + "' instead of '" + ch + "'");
        }
        
        // Get the next character. When there are no more characters,
        // return the empty string.
        
        ch = text.charAt(at);
        at += 1;
        return ch;
    },
    
    number = function () {
        // Parse a number value.
        var number,
            string = '';
        
        if (ch === '-') {
            string = '-';
            next('-');
        }
        while (ch >= '0' && ch <= '9') {
            string += ch;
            next();
        }
        if (ch === '.') {
            string += '.';
            while (next() && ch >= '0' && ch <= '9') {
                string += ch;
            }
        }
        if (ch === 'e' || ch === 'E') {
            string += ch;
            next();
            if (ch === '-' || ch === '+') {
                string += ch;
                next();
            }
            while (ch >= '0' && ch <= '9') {
                string += ch;
                next();
            }
        }
        number = +string;
        if (!isFinite(number)) {
            error("Bad number");
        } else {
            return number;
        }
    },
    
    string = function () {
        // Parse a string value.
        var hex,
            i,
            string = '',
            uffff;
        
        // When parsing for string values, we must look for " and \ characters.
        if (ch === '"') {
            while (next()) {
                if (ch === '"') {
                    next();
                    return string;
                } else if (ch === '\\') {
                    next();
                    if (ch === 'u') {
                        uffff = 0;
                        for (i = 0; i < 4; i += 1) {
                            hex = parseInt(next(), 16);
                            if (!isFinite(hex)) {
                                break;
                            }
                            uffff = uffff * 16 + hex;
                        }
                        string += String.fromCharCode(uffff);
                    } else if (typeof escapee[ch] === 'string') {
                        string += escapee[ch];
                    } else {
                        break;
                    }
                } else {
                    string += ch;
                }
            }
        }
        error("Bad string");
    },

    white = function () {

// Skip whitespace.

        while (ch && ch <= ' ') {
            next();
        }
    },

    word = function () {

// true, false, or null.

        switch (ch) {
        case 't':
            next('t');
            next('r');
            next('u');
            next('e');
            return true;
        case 'f':
            next('f');
            next('a');
            next('l');
            next('s');
            next('e');
            return false;
        case 'n':
            next('n');
            next('u');
            next('l');
            next('l');
            return null;
        }
        error("Unexpected '" + ch + "'");
    },

    value,  // Place holder for the value function.

    array = function () {

// Parse an array value.

        var array = [];

        if (ch === '[') {
            next('[');
            white();
            if (ch === ']') {
                next(']');
                return array;   // empty array
            }
            while (ch) {
                array.push(value());
                white();
                if (ch === ']') {
                    next(']');
                    return array;
                }
                next(',');
                white();
            }
        }
        error("Bad array");
    },

    object = function () {

// Parse an object value.

        var key,
            object = {};

        if (ch === '{') {
            next('{');
            white();
            if (ch === '}') {
                next('}');
                return object;   // empty object
            }
            while (ch) {
                key = string();
                white();
                next(':');
                if (Object.hasOwnProperty.call(object, key)) {
                    error('Duplicate key "' + key + '"');
                }
                object[key] = value();
                white();
                if (ch === '}') {
                    next('}');
                    return object;
                }
                next(',');
                white();
            }
        }
        error("Bad object");
    };

value = function () {

// Parse a JSON value. It could be an object, an array, a string, a number,
// or a word.

    white();
    switch (ch) {
    case '{':
        return object();
    case '[':
        return array();
    case '"':
        return string();
    case '-':
        return number();
    default:
        return ch >= '0' && ch <= '9' ? number() : word();
    }
};

// Return the json_parse function. It will have access to all of the above
// functions and variables.

module.exports = function (source, reviver) {
    var result;
    
    text = source;
    at = 0;
    ch = ' ';
    result = value();
    white();
    if (ch) {
        error("Syntax error");
    }

    // If there is a reviver function, we recursively walk the new structure,
    // passing each name/value pair to the reviver function for possible
    // transformation, starting with a temporary root object that holds the result
    // in an empty key. If there is not a reviver function, we simply return the
    // result.

    return typeof reviver === 'function' ? (function walk(holder, key) {
        var k, v, value = holder[key];
        if (value && typeof value === 'object') {
            for (k in value) {
                if (Object.prototype.hasOwnProperty.call(value, k)) {
                    v = walk(value, k);
                    if (v !== undefined) {
                        value[k] = v;
                    } else {
                        delete value[k];
                    }
                }
            }
        }
        return reviver.call(holder, key, value);
    }({'': result}, '')) : result;
};

},{}],28:[function(require,module,exports){
var cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
    escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
    gap,
    indent,
    meta = {    // table of character substitutions
        '\b': '\\b',
        '\t': '\\t',
        '\n': '\\n',
        '\f': '\\f',
        '\r': '\\r',
        '"' : '\\"',
        '\\': '\\\\'
    },
    rep;

function quote(string) {
    // If the string contains no control characters, no quote characters, and no
    // backslash characters, then we can safely slap some quotes around it.
    // Otherwise we must also replace the offending characters with safe escape
    // sequences.
    
    escapable.lastIndex = 0;
    return escapable.test(string) ? '"' + string.replace(escapable, function (a) {
        var c = meta[a];
        return typeof c === 'string' ? c :
            '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
    }) + '"' : '"' + string + '"';
}

function str(key, holder) {
    // Produce a string from holder[key].
    var i,          // The loop counter.
        k,          // The member key.
        v,          // The member value.
        length,
        mind = gap,
        partial,
        value = holder[key];
    
    // If the value has a toJSON method, call it to obtain a replacement value.
    if (value && typeof value === 'object' &&
            typeof value.toJSON === 'function') {
        value = value.toJSON(key);
    }
    
    // If we were called with a replacer function, then call the replacer to
    // obtain a replacement value.
    if (typeof rep === 'function') {
        value = rep.call(holder, key, value);
    }
    
    // What happens next depends on the value's type.
    switch (typeof value) {
        case 'string':
            return quote(value);
        
        case 'number':
            // JSON numbers must be finite. Encode non-finite numbers as null.
            return isFinite(value) ? String(value) : 'null';
        
        case 'boolean':
        case 'null':
            // If the value is a boolean or null, convert it to a string. Note:
            // typeof null does not produce 'null'. The case is included here in
            // the remote chance that this gets fixed someday.
            return String(value);
            
        case 'object':
            if (!value) return 'null';
            gap += indent;
            partial = [];
            
            // Array.isArray
            if (Object.prototype.toString.apply(value) === '[object Array]') {
                length = value.length;
                for (i = 0; i < length; i += 1) {
                    partial[i] = str(i, value) || 'null';
                }
                
                // Join all of the elements together, separated with commas, and
                // wrap them in brackets.
                v = partial.length === 0 ? '[]' : gap ?
                    '[\n' + gap + partial.join(',\n' + gap) + '\n' + mind + ']' :
                    '[' + partial.join(',') + ']';
                gap = mind;
                return v;
            }
            
            // If the replacer is an array, use it to select the members to be
            // stringified.
            if (rep && typeof rep === 'object') {
                length = rep.length;
                for (i = 0; i < length; i += 1) {
                    k = rep[i];
                    if (typeof k === 'string') {
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                }
            }
            else {
                // Otherwise, iterate through all of the keys in the object.
                for (k in value) {
                    if (Object.prototype.hasOwnProperty.call(value, k)) {
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                }
            }
            
        // Join all of the member texts together, separated with commas,
        // and wrap them in braces.

        v = partial.length === 0 ? '{}' : gap ?
            '{\n' + gap + partial.join(',\n' + gap) + '\n' + mind + '}' :
            '{' + partial.join(',') + '}';
        gap = mind;
        return v;
    }
}

module.exports = function (value, replacer, space) {
    var i;
    gap = '';
    indent = '';
    
    // If the space parameter is a number, make an indent string containing that
    // many spaces.
    if (typeof space === 'number') {
        for (i = 0; i < space; i += 1) {
            indent += ' ';
        }
    }
    // If the space parameter is a string, it will be used as the indent string.
    else if (typeof space === 'string') {
        indent = space;
    }

    // If there is a replacer, it must be a function or an array.
    // Otherwise, throw an error.
    rep = replacer;
    if (replacer && typeof replacer !== 'function'
    && (typeof replacer !== 'object' || typeof replacer.length !== 'number')) {
        throw new Error('JSON.stringify');
    }
    
    // Make a fake root object containing our value under the key of ''.
    // Return the result of stringifying the value.
    return str('', {'': value});
};

},{}],29:[function(require,module,exports){
"use strict";
(function (AggregateOp) {
    AggregateOp[AggregateOp["VALUES"] = 'values'] = "VALUES";
    AggregateOp[AggregateOp["COUNT"] = 'count'] = "COUNT";
    AggregateOp[AggregateOp["VALID"] = 'valid'] = "VALID";
    AggregateOp[AggregateOp["MISSING"] = 'missing'] = "MISSING";
    AggregateOp[AggregateOp["DISTINCT"] = 'distinct'] = "DISTINCT";
    AggregateOp[AggregateOp["SUM"] = 'sum'] = "SUM";
    AggregateOp[AggregateOp["MEAN"] = 'mean'] = "MEAN";
    AggregateOp[AggregateOp["AVERAGE"] = 'average'] = "AVERAGE";
    AggregateOp[AggregateOp["VARIANCE"] = 'variance'] = "VARIANCE";
    AggregateOp[AggregateOp["VARIANCEP"] = 'variancep'] = "VARIANCEP";
    AggregateOp[AggregateOp["STDEV"] = 'stdev'] = "STDEV";
    AggregateOp[AggregateOp["STDEVP"] = 'stdevp'] = "STDEVP";
    AggregateOp[AggregateOp["MEDIAN"] = 'median'] = "MEDIAN";
    AggregateOp[AggregateOp["Q1"] = 'q1'] = "Q1";
    AggregateOp[AggregateOp["Q3"] = 'q3'] = "Q3";
    AggregateOp[AggregateOp["MODESKEW"] = 'modeskew'] = "MODESKEW";
    AggregateOp[AggregateOp["MIN"] = 'min'] = "MIN";
    AggregateOp[AggregateOp["MAX"] = 'max'] = "MAX";
    AggregateOp[AggregateOp["ARGMIN"] = 'argmin'] = "ARGMIN";
    AggregateOp[AggregateOp["ARGMAX"] = 'argmax'] = "ARGMAX";
})(exports.AggregateOp || (exports.AggregateOp = {}));
var AggregateOp = exports.AggregateOp;
exports.AGGREGATE_OPS = [
    AggregateOp.VALUES,
    AggregateOp.COUNT,
    AggregateOp.VALID,
    AggregateOp.MISSING,
    AggregateOp.DISTINCT,
    AggregateOp.SUM,
    AggregateOp.MEAN,
    AggregateOp.AVERAGE,
    AggregateOp.VARIANCE,
    AggregateOp.VARIANCEP,
    AggregateOp.STDEV,
    AggregateOp.STDEVP,
    AggregateOp.MEDIAN,
    AggregateOp.Q1,
    AggregateOp.Q3,
    AggregateOp.MODESKEW,
    AggregateOp.MIN,
    AggregateOp.MAX,
    AggregateOp.ARGMIN,
    AggregateOp.ARGMAX,
];
exports.SUM_OPS = [
    AggregateOp.COUNT,
    AggregateOp.SUM,
    AggregateOp.DISTINCT
];
exports.SHARED_DOMAIN_OPS = [
    AggregateOp.MEAN,
    AggregateOp.AVERAGE,
    AggregateOp.STDEV,
    AggregateOp.STDEVP,
    AggregateOp.MEDIAN,
    AggregateOp.Q1,
    AggregateOp.Q3,
    AggregateOp.MIN,
    AggregateOp.MAX,
];

},{}],30:[function(require,module,exports){
"use strict";
(function (AxisOrient) {
    AxisOrient[AxisOrient["TOP"] = 'top'] = "TOP";
    AxisOrient[AxisOrient["RIGHT"] = 'right'] = "RIGHT";
    AxisOrient[AxisOrient["LEFT"] = 'left'] = "LEFT";
    AxisOrient[AxisOrient["BOTTOM"] = 'bottom'] = "BOTTOM";
})(exports.AxisOrient || (exports.AxisOrient = {}));
var AxisOrient = exports.AxisOrient;
exports.defaultAxisConfig = {
    offset: undefined,
    grid: undefined,
    labels: true,
    labelMaxLength: 25,
    tickSize: undefined,
    characterWidth: 6
};
exports.defaultFacetAxisConfig = {
    axisWidth: 0,
    labels: true,
    grid: false,
    tickSize: 0
};

},{}],31:[function(require,module,exports){
"use strict";
var util_1 = require('./util');
(function (Channel) {
    Channel[Channel["X"] = 'x'] = "X";
    Channel[Channel["Y"] = 'y'] = "Y";
    Channel[Channel["X2"] = 'x2'] = "X2";
    Channel[Channel["Y2"] = 'y2'] = "Y2";
    Channel[Channel["ROW"] = 'row'] = "ROW";
    Channel[Channel["COLUMN"] = 'column'] = "COLUMN";
    Channel[Channel["SHAPE"] = 'shape'] = "SHAPE";
    Channel[Channel["SIZE"] = 'size'] = "SIZE";
    Channel[Channel["COLOR"] = 'color'] = "COLOR";
    Channel[Channel["TEXT"] = 'text'] = "TEXT";
    Channel[Channel["DETAIL"] = 'detail'] = "DETAIL";
    Channel[Channel["LABEL"] = 'label'] = "LABEL";
    Channel[Channel["PATH"] = 'path'] = "PATH";
    Channel[Channel["ORDER"] = 'order'] = "ORDER";
    Channel[Channel["OPACITY"] = 'opacity'] = "OPACITY";
    Channel[Channel["GEOPATH"] = 'geopath'] = "GEOPATH";
})(exports.Channel || (exports.Channel = {}));
var Channel = exports.Channel;
exports.X = Channel.X;
exports.Y = Channel.Y;
exports.X2 = Channel.X2;
exports.Y2 = Channel.Y2;
exports.ROW = Channel.ROW;
exports.COLUMN = Channel.COLUMN;
exports.SHAPE = Channel.SHAPE;
exports.SIZE = Channel.SIZE;
exports.COLOR = Channel.COLOR;
exports.TEXT = Channel.TEXT;
exports.DETAIL = Channel.DETAIL;
exports.LABEL = Channel.LABEL;
exports.PATH = Channel.PATH;
exports.ORDER = Channel.ORDER;
exports.OPACITY = Channel.OPACITY;
exports.GEOPATH = Channel.GEOPATH;
exports.CHANNELS = [exports.X, exports.Y, exports.X2, exports.Y2, exports.ROW, exports.COLUMN,
    exports.SIZE, exports.SHAPE, exports.COLOR, exports.OPACITY,
    exports.PATH, exports.ORDER, exports.TEXT, exports.DETAIL, exports.LABEL,
    exports.GEOPATH];
exports.UNIT_CHANNELS = util_1.without(exports.CHANNELS, [exports.ROW, exports.COLUMN]);
exports.UNIT_SCALE_CHANNELS = util_1.without(exports.UNIT_CHANNELS, [exports.PATH, exports.ORDER, exports.DETAIL, exports.TEXT, exports.LABEL, exports.X2, exports.Y2]);
exports.NONSPATIAL_CHANNELS = util_1.without(exports.UNIT_CHANNELS, [exports.X, exports.Y, exports.X2, exports.Y2]);
exports.NONSPATIAL_SCALE_CHANNELS = util_1.without(exports.UNIT_SCALE_CHANNELS, [exports.X, exports.Y, exports.X2, exports.Y2]);
exports.STACK_GROUP_CHANNELS = [exports.COLOR, exports.DETAIL, exports.ORDER, exports.OPACITY, exports.SIZE];
;
function supportMark(channel, mark) {
    return !!getSupportedMark(channel)[mark];
}
exports.supportMark = supportMark;
function getSupportedMark(channel) {
    switch (channel) {
        case exports.X:
        case exports.Y:
        case exports.COLOR:
        case exports.DETAIL:
        case exports.ORDER:
        case exports.OPACITY:
        case exports.ROW:
        case exports.COLUMN:
            return {
                point: true, tick: true, rule: true, circle: true, square: true,
                bar: true, line: true, area: true, text: true
            };
        case exports.X2:
        case exports.Y2:
            return {
                rule: true, bar: true, area: true
            };
        case exports.SIZE:
            return {
                point: true, tick: true, rule: true, circle: true, square: true,
                bar: true, text: true
            };
        case exports.SHAPE:
            return { point: true };
        case exports.TEXT:
            return { text: true };
        case exports.PATH:
            return { line: true };
        case exports.GEOPATH:
            return { path: true };
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
        case exports.OPACITY:
        case exports.LABEL:
        case exports.DETAIL:
            return {
                measure: true,
                dimension: true
            };
        case exports.ROW:
        case exports.COLUMN:
        case exports.SHAPE:
            return {
                measure: false,
                dimension: true
            };
        case exports.X2:
        case exports.Y2:
        case exports.SIZE:
        case exports.TEXT:
            return {
                measure: true,
                dimension: false
            };
        case exports.PATH:
            return {
                measure: false,
                dimension: true
            };
        case exports.GEOPATH:
            return {
                measure: false,
                dimension: true
            };
    }
    throw new Error('Invalid encoding channel' + channel);
}
exports.getSupportedRole = getSupportedRole;
function hasScale(channel) {
    return !util_1.contains([exports.DETAIL, exports.PATH, exports.TEXT, exports.LABEL, exports.ORDER], channel);
}
exports.hasScale = hasScale;

},{"./util":43}],32:[function(require,module,exports){
"use strict";
var scale_1 = require('./scale');
var axis_1 = require('./axis');
var legend_1 = require('./legend');
exports.defaultCellConfig = {
    width: 200,
    height: 200
};
exports.defaultFacetCellConfig = {
    stroke: '#ccc',
    strokeWidth: 1
};
var defaultFacetGridConfig = {
    color: '#000000',
    opacity: 0.4,
    offset: 0
};
var defaultProjectionConfig = {
    type: 'mercator'
};
exports.defaultFacetConfig = {
    scale: scale_1.defaultFacetScaleConfig,
    axis: axis_1.defaultFacetAxisConfig,
    grid: defaultFacetGridConfig,
    cell: exports.defaultFacetCellConfig
};
(function (FontWeight) {
    FontWeight[FontWeight["NORMAL"] = 'normal'] = "NORMAL";
    FontWeight[FontWeight["BOLD"] = 'bold'] = "BOLD";
})(exports.FontWeight || (exports.FontWeight = {}));
var FontWeight = exports.FontWeight;
(function (Shape) {
    Shape[Shape["CIRCLE"] = 'circle'] = "CIRCLE";
    Shape[Shape["SQUARE"] = 'square'] = "SQUARE";
    Shape[Shape["CROSS"] = 'cross'] = "CROSS";
    Shape[Shape["DIAMOND"] = 'diamond'] = "DIAMOND";
    Shape[Shape["TRIANGLEUP"] = 'triangle-up'] = "TRIANGLEUP";
    Shape[Shape["TRIANGLEDOWN"] = 'triangle-down'] = "TRIANGLEDOWN";
})(exports.Shape || (exports.Shape = {}));
var Shape = exports.Shape;
(function (HorizontalAlign) {
    HorizontalAlign[HorizontalAlign["LEFT"] = 'left'] = "LEFT";
    HorizontalAlign[HorizontalAlign["RIGHT"] = 'right'] = "RIGHT";
    HorizontalAlign[HorizontalAlign["CENTER"] = 'center'] = "CENTER";
})(exports.HorizontalAlign || (exports.HorizontalAlign = {}));
var HorizontalAlign = exports.HorizontalAlign;
(function (VerticalAlign) {
    VerticalAlign[VerticalAlign["TOP"] = 'top'] = "TOP";
    VerticalAlign[VerticalAlign["MIDDLE"] = 'middle'] = "MIDDLE";
    VerticalAlign[VerticalAlign["BOTTOM"] = 'bottom'] = "BOTTOM";
})(exports.VerticalAlign || (exports.VerticalAlign = {}));
var VerticalAlign = exports.VerticalAlign;
(function (FontStyle) {
    FontStyle[FontStyle["NORMAL"] = 'normal'] = "NORMAL";
    FontStyle[FontStyle["ITALIC"] = 'italic'] = "ITALIC";
})(exports.FontStyle || (exports.FontStyle = {}));
var FontStyle = exports.FontStyle;
(function (Interpolate) {
    Interpolate[Interpolate["LINEAR"] = 'linear'] = "LINEAR";
    Interpolate[Interpolate["LINEAR_CLOSED"] = 'linear-closed'] = "LINEAR_CLOSED";
    Interpolate[Interpolate["STEP"] = 'step'] = "STEP";
    Interpolate[Interpolate["STEP_BEFORE"] = 'step-before'] = "STEP_BEFORE";
    Interpolate[Interpolate["STEP_AFTER"] = 'step-after'] = "STEP_AFTER";
    Interpolate[Interpolate["BASIS"] = 'basis'] = "BASIS";
    Interpolate[Interpolate["BASIS_OPEN"] = 'basis-open'] = "BASIS_OPEN";
    Interpolate[Interpolate["BASIS_CLOSED"] = 'basis-closed'] = "BASIS_CLOSED";
    Interpolate[Interpolate["CARDINAL"] = 'cardinal'] = "CARDINAL";
    Interpolate[Interpolate["CARDINAL_OPEN"] = 'cardinal-open'] = "CARDINAL_OPEN";
    Interpolate[Interpolate["CARDINAL_CLOSED"] = 'cardinal-closed'] = "CARDINAL_CLOSED";
    Interpolate[Interpolate["BUNDLE"] = 'bundle'] = "BUNDLE";
    Interpolate[Interpolate["MONOTONE"] = 'monotone'] = "MONOTONE";
})(exports.Interpolate || (exports.Interpolate = {}));
var Interpolate = exports.Interpolate;
(function (AreaOverlay) {
    AreaOverlay[AreaOverlay["LINE"] = 'line'] = "LINE";
    AreaOverlay[AreaOverlay["LINEPOINT"] = 'linepoint'] = "LINEPOINT";
    AreaOverlay[AreaOverlay["NONE"] = 'none'] = "NONE";
})(exports.AreaOverlay || (exports.AreaOverlay = {}));
var AreaOverlay = exports.AreaOverlay;
exports.defaultOverlayConfig = {
    line: false,
    pointStyle: { filled: true },
    lineStyle: {}
};
exports.defaultMarkConfig = {
    color: '#4682b4',
    shape: Shape.CIRCLE,
    strokeWidth: 2,
    size: 30,
    barThinSize: 2,
    ruleSize: 1,
    tickThickness: 1,
    fontSize: 10,
    baseline: VerticalAlign.MIDDLE,
    text: 'Abc',
    shortTimeLabels: false,
    applyColorToBackground: false
};
exports.defaultConfig = {
    numberFormat: 's',
    timeFormat: '%Y-%m-%d',
    cell: exports.defaultCellConfig,
    mark: exports.defaultMarkConfig,
    overlay: exports.defaultOverlayConfig,
    scale: scale_1.defaultScaleConfig,
    axis: axis_1.defaultAxisConfig,
    legend: legend_1.defaultLegendConfig,
    projection: defaultProjectionConfig,
    facet: exports.defaultFacetConfig,
};

},{"./axis":30,"./legend":35,"./scale":37}],33:[function(require,module,exports){
"use strict";
var channel_1 = require('./channel');
var type_1 = require('./type');
var util_1 = require('./util');
function countRetinal(encoding) {
    var count = 0;
    if (encoding.color) {
        count++;
    }
    if (encoding.opacity) {
        count++;
    }
    if (encoding.size) {
        count++;
    }
    if (encoding.shape) {
        count++;
    }
    return count;
}
exports.countRetinal = countRetinal;
function channels(encoding) {
    return channel_1.CHANNELS.filter(function (channel) {
        return has(encoding, channel);
    });
}
exports.channels = channels;
function hasChannelField(encoding, channel) {
    var channelEncoding = encoding && encoding[channel];
    return channelEncoding && (channelEncoding.field !== undefined ||
        (util_1.isArray(channelEncoding) && channelEncoding.length > 0));
}
exports.hasChannelField = hasChannelField;
function has(encoding, channel) {
    var channelEncoding = encoding && encoding[channel];
    return channelEncoding && (channelEncoding.field !== undefined ||
        (util_1.isArray(channelEncoding) && channelEncoding.length > 0));
}
exports.has = has;
function isAggregate(encoding) {
    return util_1.some(channel_1.CHANNELS, function (channel) {
        if (has(encoding, channel) && encoding[channel].aggregate) {
            return true;
        }
        return false;
    });
}
exports.isAggregate = isAggregate;
function isRanged(encoding) {
    return encoding && ((!!encoding.x && !!encoding.x2) || (!!encoding.y && !!encoding.y2));
}
exports.isRanged = isRanged;
function fieldDefs(encoding) {
    var arr = [];
    channel_1.CHANNELS.forEach(function (channel) {
        if (has(encoding, channel)) {
            if (util_1.isArray(encoding[channel])) {
                encoding[channel].forEach(function (fieldDef) {
                    arr.push(fieldDef);
                });
            }
            else {
                arr.push(encoding[channel]);
            }
        }
    });
    return arr;
}
exports.fieldDefs = fieldDefs;
;
function forEach(encoding, f, thisArg) {
    channelMappingForEach(channel_1.CHANNELS, encoding, f, thisArg);
}
exports.forEach = forEach;
function channelMappingForEach(channels, mapping, f, thisArg) {
    var i = 0;
    channels.forEach(function (channel) {
        if (has(mapping, channel)) {
            if (util_1.isArray(mapping[channel])) {
                mapping[channel].forEach(function (fieldDef) {
                    f.call(thisArg, fieldDef, channel, i++);
                });
            }
            else {
                f.call(thisArg, mapping[channel], channel, i++);
            }
        }
    });
}
exports.channelMappingForEach = channelMappingForEach;
function map(encoding, f, thisArg) {
    return channelMappingMap(channel_1.CHANNELS, encoding, f, thisArg);
}
exports.map = map;
function channelMappingMap(channels, mapping, f, thisArg) {
    var arr = [];
    channels.forEach(function (channel) {
        if (has(mapping, channel)) {
            if (util_1.isArray(mapping[channel])) {
                mapping[channel].forEach(function (fieldDef) {
                    arr.push(f.call(thisArg, fieldDef, channel));
                });
            }
            else {
                arr.push(f.call(thisArg, mapping[channel], channel));
            }
        }
    });
    return arr;
}
exports.channelMappingMap = channelMappingMap;
function reduce(encoding, f, init, thisArg) {
    return channelMappingReduce(channel_1.CHANNELS, encoding, f, init, thisArg);
}
exports.reduce = reduce;
function channelMappingReduce(channels, mapping, f, init, thisArg) {
    var r = init;
    channel_1.CHANNELS.forEach(function (channel) {
        if (has(mapping, channel)) {
            if (util_1.isArray(mapping[channel])) {
                mapping[channel].forEach(function (fieldDef) {
                    r = f.call(thisArg, r, fieldDef, channel);
                });
            }
            else {
                r = f.call(thisArg, r, mapping[channel], channel);
            }
        }
    });
    return r;
}
exports.channelMappingReduce = channelMappingReduce;
function containsLatLong(encoding) {
    if (encoding.x) {
        var xType = encoding.x.type;
        if (xType === type_1.LATITUDE || xType === type_1.LONGITUDE) {
            return true;
        }
    }
    else if (encoding.y) {
        var yType = encoding.y.type;
        if (yType === type_1.LATITUDE || yType === type_1.LONGITUDE) {
            return true;
        }
    }
    return false;
}
exports.containsLatLong = containsLatLong;

},{"./channel":31,"./type":42,"./util":43}],34:[function(require,module,exports){
"use strict";
var aggregate_1 = require('./aggregate');
var scale_1 = require('./scale');
var timeunit_1 = require('./timeunit');
var type_1 = require('./type');
var util_1 = require('./util');
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
function field(fieldDef, opt) {
    if (opt === void 0) { opt = {}; }
    var prefix = (opt.datum ? 'datum.' : '') + (opt.prefn || '');
    var suffix = opt.suffix || '';
    var field = fieldDef.field;
    if (isCount(fieldDef)) {
        return prefix + 'count' + suffix;
    }
    else if (opt.fn) {
        return prefix + opt.fn + '_' + field + suffix;
    }
    else if (!opt.nofn && fieldDef.bin) {
        var binSuffix = opt.binSuffix || (opt.scaleType === scale_1.ScaleType.ORDINAL ?
            '_range' :
            '_start');
        return prefix + 'bin_' + field + binSuffix;
    }
    else if (!opt.nofn && !opt.noAggregate && fieldDef.aggregate) {
        return prefix + fieldDef.aggregate + '_' + field + suffix;
    }
    else if (!opt.nofn && fieldDef.timeUnit) {
        return prefix + fieldDef.timeUnit + '_' + field + suffix;
    }
    else if (fieldDef.type === type_1.LATITUDE) {
        return prefix + 'layout_y';
    }
    else if (fieldDef.type === type_1.LONGITUDE) {
        return prefix + 'layout_x';
    }
    else if (fieldDef.type === type_1.GEOJSON) {
        return prefix + 'layout_path';
    }
    else {
        return prefix + field;
    }
}
exports.field = field;
function _isFieldDimension(fieldDef) {
    return util_1.contains([type_1.NOMINAL, type_1.ORDINAL], fieldDef.type) || !!fieldDef.bin ||
        (fieldDef.type === type_1.TEMPORAL && !!fieldDef.timeUnit);
}
function isDimension(fieldDef) {
    return fieldDef && fieldDef.field && _isFieldDimension(fieldDef);
}
exports.isDimension = isDimension;
function isMeasure(fieldDef) {
    return fieldDef && fieldDef.field && !_isFieldDimension(fieldDef);
}
exports.isMeasure = isMeasure;
exports.COUNT_TITLE = 'Number of Records';
function count() {
    return { field: '*', aggregate: aggregate_1.AggregateOp.COUNT, type: type_1.QUANTITATIVE, title: exports.COUNT_TITLE };
}
exports.count = count;
function isCount(fieldDef) {
    return fieldDef.aggregate === aggregate_1.AggregateOp.COUNT;
}
exports.isCount = isCount;
function cardinality(fieldDef, stats, filterNull) {
    if (filterNull === void 0) { filterNull = {}; }
    var stat = stats[fieldDef.field], type = fieldDef.type;
    if (fieldDef.bin) {
        var bin_1 = fieldDef.bin;
        var maxbins = (typeof bin_1 === 'boolean') ? undefined : bin_1.maxbins;
        if (maxbins === undefined) {
            maxbins = 10;
        }
        var bins = util_1.getbins(stat, maxbins);
        return (bins.stop - bins.start) / bins.step;
    }
    if (type === type_1.TEMPORAL) {
        var timeUnit = fieldDef.timeUnit;
        switch (timeUnit) {
            case timeunit_1.TimeUnit.SECONDS: return 60;
            case timeunit_1.TimeUnit.MINUTES: return 60;
            case timeunit_1.TimeUnit.HOURS: return 24;
            case timeunit_1.TimeUnit.DAY: return 7;
            case timeunit_1.TimeUnit.DATE: return 31;
            case timeunit_1.TimeUnit.MONTH: return 12;
            case timeunit_1.TimeUnit.QUARTER: return 4;
            case timeunit_1.TimeUnit.YEAR:
                var yearstat = stats['year_' + fieldDef.field];
                if (!yearstat) {
                    return null;
                }
                return yearstat.distinct -
                    (stat.missing > 0 && filterNull[type] ? 1 : 0);
        }
    }
    if (fieldDef.aggregate) {
        return 1;
    }
    return stat.distinct -
        (stat.missing > 0 && filterNull[type] ? 1 : 0);
}
exports.cardinality = cardinality;
function title(fieldDef) {
    if (fieldDef.title != null) {
        return fieldDef.title;
    }
    if (isCount(fieldDef)) {
        return exports.COUNT_TITLE;
    }
    var fn = fieldDef.aggregate || fieldDef.timeUnit || (fieldDef.bin && 'bin');
    if (fn) {
        return fn.toString().toUpperCase() + '(' + fieldDef.field + ')';
    }
    else {
        return fieldDef.field;
    }
}
exports.title = title;

},{"./aggregate":29,"./scale":37,"./timeunit":41,"./type":42,"./util":43}],35:[function(require,module,exports){
"use strict";
exports.defaultLegendConfig = {
    orient: undefined,
    shortTimeLabels: false
};

},{}],36:[function(require,module,exports){
"use strict";
(function (Mark) {
    Mark[Mark["AREA"] = 'area'] = "AREA";
    Mark[Mark["BAR"] = 'bar'] = "BAR";
    Mark[Mark["LINE"] = 'line'] = "LINE";
    Mark[Mark["POINT"] = 'point'] = "POINT";
    Mark[Mark["TEXT"] = 'text'] = "TEXT";
    Mark[Mark["TICK"] = 'tick'] = "TICK";
    Mark[Mark["RULE"] = 'rule'] = "RULE";
    Mark[Mark["CIRCLE"] = 'circle'] = "CIRCLE";
    Mark[Mark["SQUARE"] = 'square'] = "SQUARE";
    Mark[Mark["PATH"] = 'path'] = "PATH";
    Mark[Mark["ERRORBAR"] = 'errorBar'] = "ERRORBAR";
})(exports.Mark || (exports.Mark = {}));
var Mark = exports.Mark;
exports.AREA = Mark.AREA;
exports.BAR = Mark.BAR;
exports.LINE = Mark.LINE;
exports.POINT = Mark.POINT;
exports.TEXT = Mark.TEXT;
exports.TICK = Mark.TICK;
exports.RULE = Mark.RULE;
exports.PATH = Mark.PATH;
exports.CIRCLE = Mark.CIRCLE;
exports.SQUARE = Mark.SQUARE;
exports.ERRORBAR = Mark.ERRORBAR;
exports.PRIMITIVE_MARKS = [exports.AREA, exports.BAR, exports.LINE, exports.POINT, exports.TEXT, exports.TICK, exports.RULE, exports.CIRCLE, exports.SQUARE];

},{}],37:[function(require,module,exports){
"use strict";
(function (ScaleType) {
    ScaleType[ScaleType["LINEAR"] = 'linear'] = "LINEAR";
    ScaleType[ScaleType["LOG"] = 'log'] = "LOG";
    ScaleType[ScaleType["POW"] = 'pow'] = "POW";
    ScaleType[ScaleType["SQRT"] = 'sqrt'] = "SQRT";
    ScaleType[ScaleType["QUANTILE"] = 'quantile'] = "QUANTILE";
    ScaleType[ScaleType["QUANTIZE"] = 'quantize'] = "QUANTIZE";
    ScaleType[ScaleType["ORDINAL"] = 'ordinal'] = "ORDINAL";
    ScaleType[ScaleType["TIME"] = 'time'] = "TIME";
    ScaleType[ScaleType["UTC"] = 'utc'] = "UTC";
})(exports.ScaleType || (exports.ScaleType = {}));
var ScaleType = exports.ScaleType;
(function (NiceTime) {
    NiceTime[NiceTime["SECOND"] = 'second'] = "SECOND";
    NiceTime[NiceTime["MINUTE"] = 'minute'] = "MINUTE";
    NiceTime[NiceTime["HOUR"] = 'hour'] = "HOUR";
    NiceTime[NiceTime["DAY"] = 'day'] = "DAY";
    NiceTime[NiceTime["WEEK"] = 'week'] = "WEEK";
    NiceTime[NiceTime["MONTH"] = 'month'] = "MONTH";
    NiceTime[NiceTime["YEAR"] = 'year'] = "YEAR";
})(exports.NiceTime || (exports.NiceTime = {}));
var NiceTime = exports.NiceTime;
exports.defaultScaleConfig = {
    round: true,
    textBandWidth: 90,
    bandSize: 21,
    padding: 1,
    useRawDomain: false,
    opacity: [0.3, 0.8],
    nominalColorRange: 'category10',
    sequentialColorRange: ['#AFC6A3', '#09622A'],
    shapeRange: 'shapes',
    fontSizeRange: [8, 40],
    ruleSizeRange: [1, 5],
    tickSizeRange: [1, 20]
};
exports.defaultFacetScaleConfig = {
    round: true,
    padding: 16
};

},{}],38:[function(require,module,exports){
"use strict";
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
    var split = fieldDefShorthand.split(exports.TYPE);
    var fieldDef = {
        field: split[0].trim(),
        type: type_1.TYPE_FROM_SHORT_TYPE[split[1].trim()]
    };
    for (var i = 0; i < aggregate_1.AGGREGATE_OPS.length; i++) {
        var a = aggregate_1.AGGREGATE_OPS[i];
        if (fieldDef.field.indexOf(a + '_') === 0) {
            fieldDef.field = fieldDef.field.substr(a.toString().length + 1);
            if (a === aggregate_1.AggregateOp.COUNT && fieldDef.field.length === 0) {
                fieldDef.field = '*';
            }
            fieldDef.aggregate = a;
            break;
        }
    }
    for (var i = 0; i < timeunit_1.TIMEUNITS.length; i++) {
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

},{"./aggregate":29,"./encoding":33,"./mark":36,"./timeunit":41,"./type":42}],39:[function(require,module,exports){
"use strict";
var config_1 = require('./config');
var encoding_1 = require('./encoding');
var mark_1 = require('./mark');
var stack_1 = require('./stack');
var channel_1 = require('./channel');
var vlEncoding = require('./encoding');
var util_1 = require('./util');
function isFacetSpec(spec) {
    return spec['facet'] !== undefined;
}
exports.isFacetSpec = isFacetSpec;
function isExtendedUnitSpec(spec) {
    if (isSomeUnitSpec(spec)) {
        var hasRow = encoding_1.has(spec.encoding, channel_1.ROW);
        var hasColumn = encoding_1.has(spec.encoding, channel_1.COLUMN);
        return hasRow || hasColumn;
    }
    return false;
}
exports.isExtendedUnitSpec = isExtendedUnitSpec;
function isUnitSpec(spec) {
    if (isSomeUnitSpec(spec)) {
        return !isExtendedUnitSpec(spec);
    }
    return false;
}
exports.isUnitSpec = isUnitSpec;
function isSomeUnitSpec(spec) {
    return spec['mark'] !== undefined;
}
exports.isSomeUnitSpec = isSomeUnitSpec;
function isLayerSpec(spec) {
    return spec['layers'] !== undefined;
}
exports.isLayerSpec = isLayerSpec;
function normalize(spec) {
    if (isExtendedUnitSpec(spec)) {
        return normalizeExtendedUnitSpec(spec);
    }
    if (isUnitSpec(spec)) {
        return normalizeUnitSpec(spec);
    }
    return spec;
}
exports.normalize = normalize;
function normalizeExtendedUnitSpec(spec) {
    var hasRow = encoding_1.has(spec.encoding, channel_1.ROW);
    var hasColumn = encoding_1.has(spec.encoding, channel_1.COLUMN);
    var encoding = util_1.duplicate(spec.encoding);
    delete encoding.column;
    delete encoding.row;
    return util_1.extend(spec.name ? { name: spec.name } : {}, spec.description ? { description: spec.description } : {}, { data: spec.data }, spec.transform ? { transform: spec.transform } : {}, {
        facet: util_1.extend(hasRow ? { row: spec.encoding.row } : {}, hasColumn ? { column: spec.encoding.column } : {}),
        spec: normalizeUnitSpec({
            mark: spec.mark,
            encoding: encoding
        })
    }, spec.config ? { config: spec.config } : {});
}
exports.normalizeExtendedUnitSpec = normalizeExtendedUnitSpec;
function normalizeUnitSpec(spec) {
    var config = spec.config;
    var overlayConfig = config && config.overlay;
    var overlayWithLine = overlayConfig && spec.mark === mark_1.AREA &&
        util_1.contains([config_1.AreaOverlay.LINEPOINT, config_1.AreaOverlay.LINE], overlayConfig.area);
    var overlayWithPoint = overlayConfig && ((overlayConfig.line && spec.mark === mark_1.LINE) ||
        (overlayConfig.area === config_1.AreaOverlay.LINEPOINT && spec.mark === mark_1.AREA));
    if (spec.mark === mark_1.ERRORBAR) {
        return normalizeErrorBarUnitSpec(spec);
    }
    if (encoding_1.isRanged(spec.encoding)) {
        return normalizeRangedUnitSpec(spec);
    }
    if (isStacked(spec)) {
        return spec;
    }
    if (overlayWithPoint || overlayWithLine) {
        return normalizeOverlay(spec, overlayWithPoint, overlayWithLine);
    }
    return spec;
}
exports.normalizeUnitSpec = normalizeUnitSpec;
function normalizeRangedUnitSpec(spec) {
    if (spec.encoding) {
        var hasX = encoding_1.has(spec.encoding, channel_1.X);
        var hasY = encoding_1.has(spec.encoding, channel_1.Y);
        var hasX2 = encoding_1.has(spec.encoding, channel_1.X2);
        var hasY2 = encoding_1.has(spec.encoding, channel_1.Y2);
        if ((hasX2 && !hasX) || (hasY2 && !hasY)) {
            var normalizedSpec = util_1.duplicate(spec);
            if (hasX2 && !hasX) {
                normalizedSpec.encoding.x = normalizedSpec.encoding.x2;
                delete normalizedSpec.encoding.x2;
            }
            if (hasY2 && !hasY) {
                normalizedSpec.encoding.y = normalizedSpec.encoding.y2;
                delete normalizedSpec.encoding.y2;
            }
            return normalizedSpec;
        }
    }
    return spec;
}
exports.normalizeRangedUnitSpec = normalizeRangedUnitSpec;
function normalizeErrorBarUnitSpec(spec) {
    var layerSpec = util_1.extend(spec.name ? { name: spec.name } : {}, spec.description ? { description: spec.description } : {}, spec.data ? { data: spec.data } : {}, spec.transform ? { transform: spec.transform } : {}, spec.config ? { config: spec.config } : {}, { layers: [] });
    if (!spec.encoding) {
        return layerSpec;
    }
    if (spec.mark === mark_1.ERRORBAR) {
        var ruleSpec = {
            mark: mark_1.RULE,
            encoding: util_1.extend(spec.encoding.x ? { x: util_1.duplicate(spec.encoding.x) } : {}, spec.encoding.y ? { y: util_1.duplicate(spec.encoding.y) } : {}, spec.encoding.x2 ? { x2: util_1.duplicate(spec.encoding.x2) } : {}, spec.encoding.y2 ? { y2: util_1.duplicate(spec.encoding.y2) } : {}, {})
        };
        var lowerTickSpec = {
            mark: mark_1.TICK,
            encoding: util_1.extend(spec.encoding.x ? { x: util_1.duplicate(spec.encoding.x) } : {}, spec.encoding.y ? { y: util_1.duplicate(spec.encoding.y) } : {}, spec.encoding.size ? { size: util_1.duplicate(spec.encoding.size) } : {}, {})
        };
        var upperTickSpec = {
            mark: mark_1.TICK,
            encoding: util_1.extend({
                x: spec.encoding.x2 ? util_1.duplicate(spec.encoding.x2) : util_1.duplicate(spec.encoding.x),
                y: spec.encoding.y2 ? util_1.duplicate(spec.encoding.y2) : util_1.duplicate(spec.encoding.y)
            }, spec.encoding.size ? { size: util_1.duplicate(spec.encoding.size) } : {})
        };
        layerSpec.layers.push(normalizeUnitSpec(ruleSpec));
        layerSpec.layers.push(normalizeUnitSpec(lowerTickSpec));
        layerSpec.layers.push(normalizeUnitSpec(upperTickSpec));
    }
    return layerSpec;
}
exports.normalizeErrorBarUnitSpec = normalizeErrorBarUnitSpec;
function normalizeOverlay(spec, overlayWithPoint, overlayWithLine) {
    var outerProps = ['name', 'description', 'data', 'transform'];
    var baseSpec = util_1.omit(spec, outerProps.concat('config'));
    var baseConfig = util_1.duplicate(spec.config);
    delete baseConfig.overlay;
    var layerSpec = util_1.extend(util_1.pick(spec, outerProps), { layers: [baseSpec] }, util_1.keys(baseConfig).length > 0 ? { config: baseConfig } : {});
    if (overlayWithLine) {
        var lineSpec = util_1.duplicate(baseSpec);
        lineSpec.mark = mark_1.LINE;
        var markConfig = util_1.extend({}, config_1.defaultOverlayConfig.lineStyle, spec.config.overlay.lineStyle);
        if (util_1.keys(markConfig).length > 0) {
            lineSpec.config = { mark: markConfig };
        }
        layerSpec.layers.push(lineSpec);
    }
    if (overlayWithPoint) {
        var pointSpec = util_1.duplicate(baseSpec);
        pointSpec.mark = mark_1.POINT;
        var markConfig = util_1.extend({}, config_1.defaultOverlayConfig.pointStyle, spec.config.overlay.pointStyle);
        ;
        if (util_1.keys(markConfig).length > 0) {
            pointSpec.config = { mark: markConfig };
        }
        layerSpec.layers.push(pointSpec);
    }
    return layerSpec;
}
exports.normalizeOverlay = normalizeOverlay;
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
    return spec;
}
exports.getCleanSpec = getCleanSpec;
function isStacked(spec) {
    return stack_1.stack(spec.mark, spec.encoding, spec.config) !== null;
}
exports.isStacked = isStacked;
function transpose(spec) {
    var oldenc = spec.encoding;
    var encoding = util_1.duplicate(spec.encoding);
    encoding.x = oldenc.y;
    encoding.y = oldenc.x;
    encoding.row = oldenc.column;
    encoding.column = oldenc.row;
    spec.encoding = encoding;
    return spec;
}
exports.transpose = transpose;

},{"./channel":31,"./config":32,"./encoding":33,"./mark":36,"./stack":40,"./util":43}],40:[function(require,module,exports){
"use strict";
var channel_1 = require('./channel');
var encoding_1 = require('./encoding');
var mark_1 = require('./mark');
var util_1 = require('./util');
(function (StackOffset) {
    StackOffset[StackOffset["ZERO"] = 'zero'] = "ZERO";
    StackOffset[StackOffset["CENTER"] = 'center'] = "CENTER";
    StackOffset[StackOffset["NORMALIZE"] = 'normalize'] = "NORMALIZE";
    StackOffset[StackOffset["NONE"] = 'none'] = "NONE";
})(exports.StackOffset || (exports.StackOffset = {}));
var StackOffset = exports.StackOffset;
function stack(mark, encoding, config) {
    var stacked = (config && config.mark) ? config.mark.stacked : undefined;
    if (util_1.contains([StackOffset.NONE, null, false], stacked)) {
        return null;
    }
    if (!util_1.contains([mark_1.BAR, mark_1.AREA], mark)) {
        return null;
    }
    if (!encoding_1.isAggregate(encoding)) {
        return null;
    }
    var stackByChannels = channel_1.STACK_GROUP_CHANNELS.reduce(function (sc, channel) {
        if (encoding_1.has(encoding, channel) && !encoding[channel].aggregate) {
            sc.push(channel);
        }
        return sc;
    }, []);
    if (stackByChannels.length === 0) {
        return null;
    }
    var hasXField = encoding_1.has(encoding, channel_1.X);
    var hasYField = encoding_1.has(encoding, channel_1.Y);
    var xIsAggregate = hasXField && !!encoding.x.aggregate;
    var yIsAggregate = hasYField && !!encoding.y.aggregate;
    if (xIsAggregate !== yIsAggregate) {
        return {
            groupbyChannel: xIsAggregate ? (hasYField ? channel_1.Y : null) : (hasXField ? channel_1.X : null),
            fieldChannel: xIsAggregate ? channel_1.X : channel_1.Y,
            stackByChannels: stackByChannels,
            offset: stacked || StackOffset.ZERO
        };
    }
    return null;
}
exports.stack = stack;

},{"./channel":31,"./encoding":33,"./mark":36,"./util":43}],41:[function(require,module,exports){
"use strict";
(function (TimeUnit) {
    TimeUnit[TimeUnit["YEAR"] = 'year'] = "YEAR";
    TimeUnit[TimeUnit["MONTH"] = 'month'] = "MONTH";
    TimeUnit[TimeUnit["DAY"] = 'day'] = "DAY";
    TimeUnit[TimeUnit["DATE"] = 'date'] = "DATE";
    TimeUnit[TimeUnit["HOURS"] = 'hours'] = "HOURS";
    TimeUnit[TimeUnit["MINUTES"] = 'minutes'] = "MINUTES";
    TimeUnit[TimeUnit["SECONDS"] = 'seconds'] = "SECONDS";
    TimeUnit[TimeUnit["MILLISECONDS"] = 'milliseconds'] = "MILLISECONDS";
    TimeUnit[TimeUnit["YEARMONTH"] = 'yearmonth'] = "YEARMONTH";
    TimeUnit[TimeUnit["YEARMONTHDAY"] = 'yearmonthday'] = "YEARMONTHDAY";
    TimeUnit[TimeUnit["YEARMONTHDATE"] = 'yearmonthdate'] = "YEARMONTHDATE";
    TimeUnit[TimeUnit["YEARDAY"] = 'yearday'] = "YEARDAY";
    TimeUnit[TimeUnit["YEARDATE"] = 'yeardate'] = "YEARDATE";
    TimeUnit[TimeUnit["YEARMONTHDAYHOURS"] = 'yearmonthdayhours'] = "YEARMONTHDAYHOURS";
    TimeUnit[TimeUnit["YEARMONTHDAYHOURSMINUTES"] = 'yearmonthdayhoursminutes'] = "YEARMONTHDAYHOURSMINUTES";
    TimeUnit[TimeUnit["YEARMONTHDAYHOURSMINUTESSECONDS"] = 'yearmonthdayhoursminutesseconds'] = "YEARMONTHDAYHOURSMINUTESSECONDS";
    TimeUnit[TimeUnit["HOURSMINUTES"] = 'hoursminutes'] = "HOURSMINUTES";
    TimeUnit[TimeUnit["HOURSMINUTESSECONDS"] = 'hoursminutesseconds'] = "HOURSMINUTESSECONDS";
    TimeUnit[TimeUnit["MINUTESSECONDS"] = 'minutesseconds'] = "MINUTESSECONDS";
    TimeUnit[TimeUnit["SECONDSMILLISECONDS"] = 'secondsmilliseconds'] = "SECONDSMILLISECONDS";
    TimeUnit[TimeUnit["QUARTER"] = 'quarter'] = "QUARTER";
    TimeUnit[TimeUnit["YEARQUARTER"] = 'yearquarter'] = "YEARQUARTER";
    TimeUnit[TimeUnit["QUARTERMONTH"] = 'quartermonth'] = "QUARTERMONTH";
    TimeUnit[TimeUnit["YEARQUARTERMONTH"] = 'yearquartermonth'] = "YEARQUARTERMONTH";
})(exports.TimeUnit || (exports.TimeUnit = {}));
var TimeUnit = exports.TimeUnit;
exports.TIMEUNITS = [
    TimeUnit.YEAR,
    TimeUnit.MONTH,
    TimeUnit.DAY,
    TimeUnit.DATE,
    TimeUnit.HOURS,
    TimeUnit.MINUTES,
    TimeUnit.SECONDS,
    TimeUnit.MILLISECONDS,
    TimeUnit.YEARMONTH,
    TimeUnit.YEARMONTHDAY,
    TimeUnit.YEARMONTHDATE,
    TimeUnit.YEARDAY,
    TimeUnit.YEARDATE,
    TimeUnit.YEARMONTHDAYHOURS,
    TimeUnit.YEARMONTHDAYHOURSMINUTES,
    TimeUnit.YEARMONTHDAYHOURSMINUTESSECONDS,
    TimeUnit.HOURSMINUTES,
    TimeUnit.HOURSMINUTESSECONDS,
    TimeUnit.MINUTESSECONDS,
    TimeUnit.SECONDSMILLISECONDS,
    TimeUnit.QUARTER,
    TimeUnit.YEARQUARTER,
    TimeUnit.QUARTERMONTH,
    TimeUnit.YEARQUARTERMONTH,
];
function template(timeUnit, field, shortTimeLabels) {
    if (!timeUnit) {
        return undefined;
    }
    var dateComponents = [];
    if (containsTimeUnit(timeUnit, TimeUnit.YEAR)) {
        dateComponents.push(shortTimeLabels ? '%y' : '%Y');
    }
    if (containsTimeUnit(timeUnit, TimeUnit.QUARTER)) {
        dateComponents.push('\'}}Q{{' + field + ' | quarter}}{{' + field + ' | time:\'');
    }
    if (containsTimeUnit(timeUnit, TimeUnit.MONTH)) {
        dateComponents.push(shortTimeLabels ? '%b' : '%B');
    }
    if (containsTimeUnit(timeUnit, TimeUnit.DAY)) {
        dateComponents.push(shortTimeLabels ? '%a' : '%A');
    }
    else if (containsTimeUnit(timeUnit, TimeUnit.DATE)) {
        dateComponents.push('%d');
    }
    var timeComponents = [];
    if (containsTimeUnit(timeUnit, TimeUnit.HOURS)) {
        timeComponents.push('%H');
    }
    if (containsTimeUnit(timeUnit, TimeUnit.MINUTES)) {
        timeComponents.push('%M');
    }
    if (containsTimeUnit(timeUnit, TimeUnit.SECONDS)) {
        timeComponents.push('%S');
    }
    if (containsTimeUnit(timeUnit, TimeUnit.MILLISECONDS)) {
        timeComponents.push('%L');
    }
    var out = [];
    if (dateComponents.length > 0) {
        out.push(dateComponents.join('-'));
    }
    if (timeComponents.length > 0) {
        out.push(timeComponents.join(':'));
    }
    if (out.length > 0) {
        var template_1 = '{{' + field + ' | time:\'' + out.join(' ') + '\'}}';
        return template_1.replace(new RegExp('{{' + field + ' \\| time:\'\'}}', 'g'), '');
    }
    else {
        return undefined;
    }
}
exports.template = template;
function containsTimeUnit(fullTimeUnit, timeUnit) {
    var fullTimeUnitStr = fullTimeUnit.toString();
    var timeUnitStr = timeUnit.toString();
    return fullTimeUnitStr.indexOf(timeUnitStr) > -1;
}
exports.containsTimeUnit = containsTimeUnit;

},{}],42:[function(require,module,exports){
"use strict";
(function (Type) {
    Type[Type["QUANTITATIVE"] = 'quantitative'] = "QUANTITATIVE";
    Type[Type["ORDINAL"] = 'ordinal'] = "ORDINAL";
    Type[Type["TEMPORAL"] = 'temporal'] = "TEMPORAL";
    Type[Type["NOMINAL"] = 'nominal'] = "NOMINAL";
    Type[Type["GEOJSON"] = 'geojson'] = "GEOJSON";
    Type[Type["LONGITUDE"] = 'longitude'] = "LONGITUDE";
    Type[Type["LATITUDE"] = 'latitude'] = "LATITUDE";
})(exports.Type || (exports.Type = {}));
var Type = exports.Type;
exports.QUANTITATIVE = Type.QUANTITATIVE;
exports.ORDINAL = Type.ORDINAL;
exports.TEMPORAL = Type.TEMPORAL;
exports.NOMINAL = Type.NOMINAL;
exports.GEOJSON = Type.GEOJSON;
exports.LONGITUDE = Type.LONGITUDE;
exports.LATITUDE = Type.LATITUDE;
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

},{}],43:[function(require,module,exports){
"use strict";
var stringify = require('json-stable-stringify');
var util_1 = require('datalib/src/util');
exports.keys = util_1.keys;
exports.extend = util_1.extend;
exports.duplicate = util_1.duplicate;
exports.isArray = util_1.isArray;
exports.vals = util_1.vals;
exports.truncate = util_1.truncate;
exports.toMap = util_1.toMap;
exports.isObject = util_1.isObject;
exports.isString = util_1.isString;
exports.isNumber = util_1.isNumber;
exports.isBoolean = util_1.isBoolean;
var util_2 = require('datalib/src/util');
var generate_1 = require('datalib/src/generate');
exports.range = generate_1.range;
var encoding_1 = require('./encoding');
exports.has = encoding_1.has;
var channel_1 = require('./channel');
exports.Channel = channel_1.Channel;
var util_3 = require('datalib/src/util');
function pick(obj, props) {
    var copy = {};
    props.forEach(function (prop) {
        if (obj.hasOwnProperty(prop)) {
            copy[prop] = obj[prop];
        }
    });
    return copy;
}
exports.pick = pick;
function omit(obj, props) {
    var copy = util_2.duplicate(obj);
    props.forEach(function (prop) {
        delete copy[prop];
    });
    return copy;
}
exports.omit = omit;
function hash(a) {
    if (util_3.isString(a) || util_3.isNumber(a) || util_3.isBoolean(a)) {
        return String(a);
    }
    return stringify(a);
}
exports.hash = hash;
function contains(array, item) {
    return array.indexOf(item) > -1;
}
exports.contains = contains;
function without(array, excludedItems) {
    return array.filter(function (item) {
        return !contains(excludedItems, item);
    });
}
exports.without = without;
function union(array, other) {
    return array.concat(without(other, array));
}
exports.union = union;
function forEach(obj, f, thisArg) {
    if (obj.forEach) {
        obj.forEach.call(thisArg, f);
    }
    else {
        for (var k in obj) {
            if (obj.hasOwnProperty(k)) {
                f.call(thisArg, obj[k], k, obj);
            }
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
            if (obj.hasOwnProperty(k)) {
                init = f.call(thisArg, init, obj[k], k, obj);
            }
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
            if (obj.hasOwnProperty(k)) {
                output.push(f.call(thisArg, obj[k], k, obj));
            }
        }
        return output;
    }
}
exports.map = map;
function some(arr, f) {
    var i = 0;
    for (var k = 0; k < arr.length; k++) {
        if (f(arr[k], k, i++)) {
            return true;
        }
    }
    return false;
}
exports.some = some;
function every(arr, f) {
    var i = 0;
    for (var k = 0; k < arr.length; k++) {
        if (!f(arr[k], k, i++)) {
            return false;
        }
    }
    return true;
}
exports.every = every;
function flatten(arrays) {
    return [].concat.apply([], arrays);
}
exports.flatten = flatten;
function mergeDeep(dest) {
    var src = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        src[_i - 1] = arguments[_i];
    }
    for (var i = 0; i < src.length; i++) {
        dest = deepMerge_(dest, src[i]);
    }
    return dest;
}
exports.mergeDeep = mergeDeep;
;
function deepMerge_(dest, src) {
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
            dest[p] = mergeDeep(src[p].constructor === Array ? [] : {}, src[p]);
        }
        else {
            mergeDeep(dest[p], src[p]);
        }
    }
    return dest;
}
var dlBin = require('datalib/src/bins/bins');
function getbins(stats, maxbins) {
    return dlBin({
        min: stats.min,
        max: stats.max,
        maxbins: maxbins
    });
}
exports.getbins = getbins;
function unique(values, f) {
    var results = [];
    var u = {}, v, i, n;
    for (i = 0, n = values.length; i < n; ++i) {
        v = f ? f(values[i]) : values[i];
        if (v in u) {
            continue;
        }
        u[v] = 1;
        results.push(values[i]);
    }
    return results;
}
exports.unique = unique;
;
function warning(message) {
    console.warn('[VL Warning]', message);
}
exports.warning = warning;
function error(message) {
    console.error('[VL Error]', message);
}
exports.error = error;
function differ(dict, other) {
    for (var key in dict) {
        if (dict.hasOwnProperty(key)) {
            if (other[key] && dict[key] && other[key] !== dict[key]) {
                return true;
            }
        }
    }
    return false;
}
exports.differ = differ;

},{"./channel":31,"./encoding":33,"datalib/src/bins/bins":21,"datalib/src/generate":22,"datalib/src/util":24,"json-stable-stringify":25}],44:[function(require,module,exports){
"use strict";
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

},{"./mark":36,"./util":43}]},{},[10])(10)
});
//# sourceMappingURL=compass.js.map
