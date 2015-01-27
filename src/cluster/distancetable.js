var vl = require('vegalite'),
  consts = require('./clusterconsts'),
  util = require('../util');

module.exports = distanceTable;

function distanceTable(encodings) {
  var len = encodings.length,
    colencs = encodings.map(function(e) { return colenc(e);}),
    diff = new Array(len), i, j;

  for (i = 0; i < len; i++) diff[i] = new Array(len);

  for (i = 0; i < len; i++) {
    for (j = i + 1; j < len; j++) {
      diff[j][i] = diff[i][j] = getDistance(colencs[i], colencs[j]);
    }
  }
  return diff;
}

function getDistance(colenc1, colenc2) {
  var cols = util.union(vl.keys(colenc1.col), vl.keys(colenc2.col)),
    dist = 0;

  cols.forEach(function(col) {
    var e1 = colenc1.col[col], e2 = colenc2.col[col];

    if (e1 && e2) {
      if (e1.type != e2.type) {
        dist += (consts.DIST_BY_ENCTYPE[e1.type] || {})[e2.type] || 1;
      }
      //FIXME add aggregation
    } else {
      dist += consts.DIST_MISSING;
    }
  });
  return dist;
}

function colenc(encoding) {
  var _colenc = {},
    enc = encoding.enc;

  vl.keys(enc).forEach(function(encType) {
    var e = vl.duplicate(enc[encType]);
    e.type = encType;
    _colenc[e.name || ''] = e;
    delete e.name;
  });

  return {
    marktype: encoding.marktype,
    col: _colenc
  };
}