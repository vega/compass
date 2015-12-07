// FIXME: rename to rankSpecs

'use strict';

import * as vlEncoding from 'vega-lite/src/encoding';
import * as vlFieldDef from 'vega-lite/src/fielddef';
import * as vlChannel from 'vega-lite/src/channel';
var isDimension = vlFieldDef.isDimension;
import * as util from '../util';

import * as vlShorthand from 'vega-lite/src/shorthand';

import * as consts from '../consts';
import {Type} from '../consts';

// bad score not specified in the table above
var UNUSED_POSITION = 0.5;

var MARK_SCORE = {
  line: 0.99,
  area: 0.98,
  bar: 0.97,
  tick: 0.96,
  point: 0.95,
  circle: 0.94,
  square: 0.94,
  text: 0.8
};

var D:any = {}, M:any = {}, BAD = 0.1, TERRIBLE = 0.01;

D.minor = 0.01;
D.pos = 1;
D.Y_T = 0.8;
D.facet_text = 1;
D.facet_good = 0.675; // < color_ok, > color_bad
D.facet_ok = 0.55;
D.facet_bad = 0.4;
D.color_good = 0.7;
D.color_ok = 0.65; // > M.Size
D.color_bad = 0.3;
D.color_stack = 0.6;
D.shape = 0.6;
D.detail = 0.5;
D.bad = BAD;
D.terrible = TERRIBLE;

M.pos = 1;
M.size = 0.6;
M.color = 0.5;
M.text = 0.4;
M.bad = BAD;
M.terrible = TERRIBLE;

// FIXME
export let dimensionScore:any = function(fieldDef, channel, mark, stats, opt){
  var cardinality = vlFieldDef.cardinality(fieldDef, stats);
  switch (channel) {
    case vlChannel.X:
      if (fieldDef.type === Type.Nominal || fieldDef.type === Type.Ordinal)  {
        return D.pos - D.minor;
      }
      return D.pos;

    case vlChannel.Y:
      if (fieldDef.type === Type.Nominal || fieldDef.type === Type.Ordinal) {
        return D.pos - D.minor; // prefer ordinal on y
      }
      if (fieldDef.type === Type.Temporal) {
        return D.Y_T; // time should not be on Y
      }
      return D.pos - D.minor;

    case vlChannel.COLUMN:
      if (mark === 'text') return D.facet_text;
      // prefer column over row due to scrolling issues
      return cardinality <= opt.maxGoodCardinalityForFacets ? D.facet_good :
        cardinality <= opt.maxCardinalityForFacets ? D.facet_ok : D.facet_bad;

    case vlChannel.ROW:
      if (mark === 'text') return D.facet_text;
      return (cardinality <= opt.maxGoodCardinalityForFacets ? D.facet_good :
        cardinality <= opt.maxCardinalityForFacets ? D.facet_ok : D.facet_bad) - D.minor;

    case vlChannel.COLOR:
      var hasOrder = (fieldDef.bin && fieldDef.type=== Type.Quantitative) || (fieldDef.timeUnit && fieldDef.type=== Type.Temporal);

      // FIXME add stacking option once we have control ..
      var isStacked = mark === 'bar' || mark === 'area';

      // true ordinal on color is currently BAD (until we have good ordinal color scale support)
      if (hasOrder) return D.color_bad;

      // stacking gets lower score
      if (isStacked) return D.color_stack;

      return cardinality <= opt.maxGoodCardinalityForColor ? D.color_good: cardinality <= opt.maxCardinalityForColor ? D.color_ok : D.color_bad;
    case vlChannel.SHAPE:
      return cardinality <= opt.maxCardinalityForShape ? D.shape : TERRIBLE;
    case vlChannel.DETAIL:
      return D.detail;
  }
  return TERRIBLE;
};

dimensionScore.consts = D;

// FIXME
export let measureScore:any = function(fieldDef, channel, mark, stats, opt) {
  // jshint unused:false
  switch (channel) {
    case vlChannel.X: return M.pos;
    case vlChannel.Y: return M.pos;
    case vlChannel.SIZE:
      if (mark === 'bar' || mark === 'text' || mark === 'line') {
        return BAD; // size of bar is very bad
      }
      return M.size;
    case vlChannel.COLOR: return M.color;
    case vlChannel.TEXT: return M.text;
  }
  return BAD;
};

measureScore.consts = M;

export default function rankEncodings(spec, stats, opt?, selected?) {
  var features = [],
    channels = util.keys(spec.encoding),
    mark = spec.mark,
    encoding = spec.encoding;

  var encodingMappingByField = vlEncoding.reduce(spec.encoding, function(o, fieldDef, channel) {
    var key = vlShorthand.shortenFieldDef(fieldDef);
    var mappings = o[key] = o[key] || [];
    mappings.push({channel: channel, fieldDef: fieldDef});
    return o;
  }, {});

  // data - encoding mapping score
  util.forEach(encodingMappingByField, function(mappings) {
    var reasons = mappings.map(function(m) {
        return m.channel + vlShorthand.ASSIGN + vlShorthand.shortenFieldDef(m.fieldDef) +
          ' ' + (selected && selected[m.fieldDef.field] ? '[x]' : '[ ]');
      }),
      scores = mappings.map(function(m) {
        var roleScore = vlFieldDef.isDimension(m.fieldDef) ?
                          dimensionScore : measureScore;

        var score = roleScore(m.fieldDef, m.channel, spec.mark, stats, opt);

        return !selected || selected[m.fieldDef.field] ? score : Math.pow(score, 0.125);
      });

    features.push({
      reason: reasons.join(' | '),
      score: Math.max.apply(null, scores)
    });
  });

  // plot type
  if (mark === 'text') {
    // TODO
  } else {
    if (encoding.x && encoding.y) {
      if (isDimension(encoding.x) !== isDimension(encoding.y)) {
        features.push({
          reason: 'OxQ plot',
          score: 0.8
        });
      }
    }
  }

  // penalize not using positional only penalize for non-text
  if (channels.length > 1 && mark !== 'text') {
    if ((!encoding.x || !encoding.y) && !encoding.geo && !encoding.text) {
      features.push({
        reason: 'unused position',
        score: UNUSED_POSITION
      });
    }
  }

  // mark type score
  features.push({
    reason: 'mark='+mark,
    score: MARK_SCORE[mark]
  });

  return {
    score: features.reduce(function(p, f) {
      return p * f.score;
    }, 1),
    features: features
  };
}
