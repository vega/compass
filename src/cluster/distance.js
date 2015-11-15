'use strict';

var Encoding = require('vega-lite/src/Encoding').default,
  consts = require('./clusterconsts'),
  util = require('../util');

var distance = {};
module.exports = distance;

distance.table = function (specs) {
  var len = specs.length,
    extendedSpecs = specs.map(function(e) { return distance.extendSpecWithEncTypeByColumnName(e); }),
    shorthands = specs.map(Encoding.shorthand),
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
  var cols = util.union(util.keys(extendedSpec1.encTypeByField), util.keys(extendedSpec2.encTypeByField)),
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
  var isStack1 = Encoding.isStack(extendedSpec1),
    isStack2 = Encoding.isStack(extendedSpec2);

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

  util.keys(encoding).forEach(function(encType) {
    var e = util.duplicate(encoding[encType]);
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