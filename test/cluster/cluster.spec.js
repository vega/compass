var expect = require('chai').expect,
  vl = require('vega-lite');

var fixture = require('../fixture'),
  getClusters = require('../../src/cluster/cluster'),
  genEncodings = require('../../src/gen/encodings');

// describe('cp.cluster.getClustersIndices()', function () {
//   describe('OxQxQ', function() {
    var f = fixture.OxQxQ;

    var encodings = genEncodings([], f.fields, f.stats);
    var clusters = getClusters(encodings),
      clusterShorts = clusters.map(function(cluster) {
        return cluster.map(vl.Encoding.shorthand);
      });

    console.log('clusters', clusterShorts[0]);

    var cs = clusterShorts[0];
    console.log(clusters.dist[cs[0]][cs[1]]);
    console.log(clusters.dist[cs[0]][cs[2]]);

console.log(Math.sqrt(1+0.05*0.05));


//   });

// });