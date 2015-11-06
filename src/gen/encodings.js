'use strict';

// TODO: rename this file to specs.js

var vl = require('vega-lite'),
  genEncodings = require('./encs'),
  getMarktypes = require('./marktypes'),
  rank = require('../rank/rank'),
  consts = require('../consts');

module.exports = genSpecsFromFieldDefs;

/** Design Encodings for a set of field definition */

function genSpecsFromFieldDefs(output, fieldDefs, stats, opt, nested) {
  // opt must be augmented before being passed to genEncodings or getMarktypes
  opt = vl.schema.util.extend(opt||{}, consts.gen.encodings);
  var encodings = genEncodings([], fieldDefs, stats, opt);

  if (nested) {
    return encodings.reduce(function(dict, encoding) {
      dict[encoding] = genSpecsFromEncodings([], encoding, stats, opt);
      return dict;
    }, {});
  } else {
    return encodings.reduce(function(list, encoding) {
      return genSpecsFromEncodings(list, encoding, stats, opt);
    }, []);
  }
}

function genSpecsFromEncodings(output, encoding, stats, opt) {
  getMarktypes(encoding, stats, opt)
    .forEach(function(markType) {
      var spec = vl.duplicate({
          // Clone config & encoding to unique objects
          encoding: encoding,
          config: opt.config
        });

      spec.marktype = markType;
      // Data object is the same across charts: pass by reference
      spec.data = opt.data;

      spec = finalTouch(spec, stats, opt);
      var score = rank.encoding(spec, stats, opt);

      spec._info = score;
      output.push(spec);
    });
  return output;
}

//FIXME this should be refactors
function finalTouch(spec, stats, opt) {
  if (spec.marktype === 'text' && opt.alwaysGenerateTableAsHeatmap) {
    spec.encoding.color = spec.encoding.text;
  }

  // don't include zero if stdev/mean < 0.01
  // https://github.com/uwdata/visrec/issues/69
  var encoding = spec.encoding;
  ['x', 'y'].forEach(function(encType) {
    var field = encoding[encType];
    if (field && vl.encDef.isMeasure(field) && !vl.encDef.isCount(field)) {
      var stat = stats[field.name];
      if (stat && stat.stdev / stat.mean < 0.01) {
        field.scale = {zero: false};
      }
    }
  });
  return spec;
}
