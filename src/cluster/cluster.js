"use strict";

module.exports = cluster;

var Encoding = require('vega-lite/src/Encoding').default,
  clusterfck = require('clusterfck'),
  consts = require('./clusterconsts'),
  util = require('../util');

cluster.distance = require('./distance');

function cluster(specs, opt) {
  // jshint unused:false
  var dist = cluster.distance.table(specs);

  var clusterTrees = clusterfck.hcluster(specs, function(e1, e2) {
    var s1 = Encoding.shorthand(e1),
      s2 = Encoding.shorthand(e2);
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