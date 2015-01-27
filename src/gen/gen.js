var vl = require('vegalite'),
  util = require('../util');

var gen = module.exports = {
  // data variations
  aggregates: require('./aggregates'),
  projections: require('./projections'),
  // encodings / visual variatons
  fields: require('./fields'),
  marktypes: require('./marktypes')
};

//FIXME move these to vl
var AGGREGATION_FN = { //all possible aggregate function listed by each data type
  Q: vl.schema.aggr.supportedEnums.Q
};

var TRANSFORM_FN = { //all possible transform function listed by each data type
  // Q: ['log', 'sqrt', 'abs'], // "logit?"
  T: vl.schema.timefns
};

gen.charts = function(fields, opt, cfg, flat) {
  opt = util.gen.getOpt(opt);
  flat = flat === undefined ? {encodings: 1} : flat;

  // TODO generate

  // generate permutation of encoding mappings
  var fieldSets = opt.genAggr ? gen.genAggregate([], fields, opt) : [fields],
    encodings, charts, level = 0;

  if (flat === true || (flat && flat.aggr)) {
    encodings = fieldSets.reduce(function(output, fields) {
      return gen.fields(output, fields, opt);
    }, []);
  } else {
    encodings = fieldSets.map(function(fields) {
      return gen.fields([], fields, opt);
    }, true);
    level += 1;
  }

  if (flat === true || (flat && flat.encodings)) {
    charts = util.nestedReduce(encodings, function(output, encodings) {
      return gen.marktypes(output, encodings, opt, cfg);
    }, level, true);
  } else {
    charts = util.nestedMap(encodings, function(encodings) {
      return gen.marktypes([], encodings, opt, cfg);
    }, level, true);
    level += 1;
  }
  return charts;
};