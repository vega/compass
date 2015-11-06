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
  encodings: require('./encodings'),
  encs: require('./encs'),
  marktypes: require('./marktypes')
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
      return gen.marktypes(output, encoding, opt, config);
    }, level, true);
  } else {
    charts = util.nestedMap(encodings, function(encoding) {
      return gen.marktypes([], encoding, opt, config);
    }, level, true);
    level += 1;
  }
  return charts;
};