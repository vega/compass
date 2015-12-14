'use strict';

import * as vlFieldDef from 'vega-lite/src/fielddef';
import * as util from '../util';
import {EncodingOption, DEFAULT_ENCODING_OPTION} from '../consts';
import genEncodings from './encodings';
import getMarks from './marks';
import * as rank from '../rank/rank';
import {shortenEncoding} from 'vega-lite/src/shorthand';

/** Design Encodings for a set of field definition */

export default function genSpecsFromFieldDefs(output, fieldDefs, stats, opt: EncodingOption = {}, nested?): any {
  // opt must be augmented before being passed to genEncodings or getMarks
  opt = util.extend({}, DEFAULT_ENCODING_OPTION, opt);
  var encodings = genEncodings([], fieldDefs, stats, opt);

  if (nested) {
    return encodings.reduce(function(dict, encoding) {
      var encodingShorthand = shortenEncoding(encoding);
      dict[encodingShorthand] = genSpecsFromEncodings([], encoding, stats, opt);
      return dict;
    }, {});
  } else {
    return encodings.reduce(function(list, encoding) {
      return genSpecsFromEncodings(list, encoding, stats, opt);
    }, []);
  }
}

function genSpecsFromEncodings(output, encoding, stats, opt) {
  getMarks(encoding, stats, opt)
    .forEach(function(mark) {
      var spec = util.duplicate({
          // Clone config & encoding to unique objects
          encoding: encoding,
          config: opt.config
        });

      spec.mark = mark;
      // Data object is the same across charts: pass by reference
      spec.data = opt.data;

      spec = finalTouch(spec, stats, opt);
      var score = rank.encoding(spec, stats, opt);

      spec._info = score;
      output.push(spec);
    });
  return output;
}

// FIXME this should be refactors
function finalTouch(spec, stats, opt) {
  if (spec.mark === 'text' && opt.alwaysGenerateTableAsHeatmap) {
    spec.encoding.color = spec.encoding.text;
  }

  // don't include zero if stdev/mean < 0.01
  // https://github.com/uwdata/visrec/issues/69
  var encoding = spec.encoding;
  ['x', 'y'].forEach(function(channel) {
    var fieldDef = encoding[channel];

    // TODO add a parameter for this case
    if (fieldDef && vlFieldDef.isMeasure(fieldDef) && !vlFieldDef.isCount(fieldDef)) {
      var stat = stats[fieldDef.field];
      if (stat && stat.stdev / stat.mean < 0.01) {
        fieldDef.scale = {zero: false};
      }
    }
  });
  return spec;
}
