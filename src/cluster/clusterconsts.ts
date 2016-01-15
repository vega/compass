'use strict';

export const SWAPPABLE = 0.05;
export const DIST_MISSING = 1;
export const CLUSTER_THRESHOLD = 1;

function reduceTupleToTable(r, x) {
  var a = x[0], b = x[1], d = x[2];
  r[a] = r[a] || {};
  r[b] = r[b] || {};
  r[a][b] = r[b][a] = d;
  return r;
}

export const DIST_BY_CHANNEL = [
  // positional
  ['x', 'y', SWAPPABLE],
  ['row', 'column', SWAPPABLE],

  // ordinal mark properties
  ['color', 'shape', SWAPPABLE],
  ['color', 'detail', SWAPPABLE],
  ['detail', 'shape', SWAPPABLE],

  // quantitative mark properties
  ['size', 'color', SWAPPABLE]
].reduce(reduceTupleToTable, {});
