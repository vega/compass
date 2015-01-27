"use strict";

module.exports = cluster;

var vl = require('vegalite'),
  clusterfck = require('clusterfck'),
  consts = require('./clusterconsts'),
  util = require('../util');

var distanceTable = cluster.distanceTable = require('./distancetable');


function cluster(encodings, maxDistance) {
  var dist = distanceTable(encodings),
    n = encodings.length;

  var clusterTrees = clusterfck.hcluster(vl.range(n), function(i, j) {
    return dist[i][j];
  }, 'average', consts.CLUSTER_THRESHOLD);

  var clusters = clusterTrees.map(function(tree) {
    return util.traverse(tree, []);
  });

  //console.log("clusters", clusters.map(function(c){ return c.join("+"); }));
  return clusters;
};