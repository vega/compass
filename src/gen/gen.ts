'use strict';

import genAggregates from './aggregates';
import genProjections from './projections';
import {key} from './projections';
import genSpecs from './specs';
import genEncodings from './encodings';
import genMarks from './marks';

/**
 * Module for generating visualizations
 */

// data variations
export const aggregates = genAggregates;
export let projections: any = genProjections;
// FIXME
projections.key = key;

// encodings / visual variations
export const specs = genSpecs;
export const encodings = genEncodings;
export const marks = genMarks;

// // TODO(kanitw): revise if this is still working
// export function charts(fieldDefs, opt, config, flat) {
//   opt = util.gen.getOpt(opt);
//   flat = flat === undefined ? {encodings: 1} : flat;
//
//   // TODO generate
//
//   // generate permutation of encoding mappings
//   var fieldSets = opt.genAggr ? genAggregates([], fieldDefs, opt) : [fieldDefs],
//     encodings, charts, level = 0;
//
//   if (flat === true || (flat && flat.aggregate)) {
//     encodings = fieldSets.reduce(function(output, fieldDefs) {
//       return genEncodings(output, fieldDefs, opt);
//     }, []);
//   } else {
//     encodings = fieldSets.map(function(fieldDefs) {
//       return genEncodings([], fieldDefs, opt);
//     }, true);
//     level += 1;
//   }
//
//   if (flat === true || (flat && flat.encodings)) {
//     charts = util.nestedReduce(encodings, function(output, encoding) {
//       return gen.marks(output, encoding, opt, config);
//     }, level, true);
//   } else {
//     charts = util.nestedMap(encodings, function(encoding) {
//       return gen.marks([], encoding, opt, config);
//     }, level, true);
//     level += 1;
//   }
//   return charts;
// };
