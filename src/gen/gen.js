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