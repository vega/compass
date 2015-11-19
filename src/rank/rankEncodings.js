'use strict';

var vlEnc = require('vega-lite/src/enc'),
  vlEncDef = require('vega-lite/src/encdef'),
  vlConsts = require('vega-lite/src/consts'),
  isDimension = vlEncDef.isDimension,
  util = require('../util');

var consts = require('../consts');
var Type = consts.Type;

module.exports = rankEncodings;

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

function rankEncodings(spec, stats, opt, selected) {
  var features = [],
    encTypes = util.keys(spec.encoding),
    marktype = spec.marktype,
    encoding = spec.encoding;

  var encodingMappingByField = vlEnc.reduce(spec.encoding, function(o, fieldDef, encType) {
    var key = vlEncDef.shorthand(fieldDef);
    var mappings = o[key] = o[key] || [];
    mappings.push({encType: encType, field: fieldDef});
    return o;
  }, {});

  // data - encoding mapping score
  util.forEach(encodingMappingByField, function(mappings) {
    var reasons = mappings.map(function(m) {
        return m.encType + vlConsts.Shorthand.Assign + vlEncDef.shorthand(m.field) +
          ' ' + (selected && selected[m.field.name] ? '[x]' : '[ ]');
      }),
      scores = mappings.map(function(m) {
        var role = vlEncDef.isDimension(m.field) ? 'dimension' : 'measure';

        var score = rankEncodings.score[role](m.field, m.encType, spec.marktype, stats, opt);

        return !selected || selected[m.field.name] ? score : Math.pow(score, 0.125);
      });

    features.push({
      reason: reasons.join(" | "),
      score: Math.max.apply(null, scores)
    });
  });

  // plot type
  if (marktype === 'text') {
    // TODO
  } else {
    if (encoding.x && encoding.y) {
      if (isDimension(encoding.x) ^ isDimension(encoding.y)) {
        features.push({
          reason: 'OxQ plot',
          score: 0.8
        });
      }
    }
  }

  // penalize not using positional only penalize for non-text
  if (encTypes.length > 1 && marktype !== 'text') {
    if ((!encoding.x || !encoding.y) && !encoding.geo && !encoding.text) {
      features.push({
        reason: 'unused position',
        score: UNUSED_POSITION
      });
    }
  }

  // mark type score
  features.push({
    reason: 'marktype='+marktype,
    score: MARK_SCORE[marktype]
  });

  return {
    score: features.reduce(function(p, f) {
      return p * f.score;
    }, 1),
    features: features
  };
}


var D = {}, M = {}, BAD = 0.1, TERRIBLE = 0.01;

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

rankEncodings.dimensionScore = function (fieldDef, encType, marktype, stats, opt){
  var cardinality = vlEncDef.cardinality(fieldDef, stats);
  switch (encType) {
    case vlConsts.Enctype.X:
      if (fieldDef.type === Type.Nominal || fieldDef.type === Type.Ordinal)  {
        return D.pos - D.minor;
      }
      return D.pos;

    case vlConsts.Enctype.Y:
      if (fieldDef.type === Type.Nominal || fieldDef.type === Type.Ordinal) {
        return D.pos - D.minor; //prefer ordinal on y
      }
      if (fieldDef.type === Type.Temporal) {
        return D.Y_T; // time should not be on Y
      }
      return D.pos - D.minor;

    case vlConsts.Enctype.COL:
      if (marktype === 'text') return D.facet_text;
      //prefer column over row due to scrolling issues
      return cardinality <= opt.maxGoodCardinalityForFacets ? D.facet_good :
        cardinality <= opt.maxCardinalityForFacets ? D.facet_ok : D.facet_bad;

    case vlConsts.Enctype.ROW:
      if (marktype === 'text') return D.facet_text;
      return (cardinality <= opt.maxGoodCardinalityForFacets ? D.facet_good :
        cardinality <= opt.maxCardinalityForFacets ? D.facet_ok : D.facet_bad) - D.minor;

    case vlConsts.Enctype.COLOR:
      var hasOrder = (fieldDef.bin && fieldDef.type=== Type.Quantitative) || (fieldDef.timeUnit && fieldDef.type=== Type.Temporal);

      //FIXME add stacking option once we have control ..
      var isStacked = marktype === 'bar' || marktype === 'area';

      // true ordinal on color is currently BAD (until we have good ordinal color scale support)
      if (hasOrder) return D.color_bad;

      //stacking gets lower score
      if (isStacked) return D.color_stack;

      return cardinality <= opt.maxGoodCardinalityForColor ? D.color_good: cardinality <= opt.maxCardinalityForColor ? D.color_ok : D.color_bad;
    case vlConsts.Enctype.SHAPE:
      return cardinality <= opt.maxCardinalityForShape ? D.shape : TERRIBLE;
    case vlConsts.Enctype.DETAIL:
      return D.detail;
  }
  return TERRIBLE;
};

rankEncodings.dimensionScore.consts = D;

rankEncodings.measureScore = function (fieldDef, encType, marktype, stats, opt) {
  // jshint unused:false
  switch (encType){
    case vlConsts.Enctype.X: return M.pos;
    case vlConsts.Enctype.Y: return M.pos;
    case vlConsts.Enctype.SIZE:
      if (marktype === 'bar') return BAD; //size of bar is very bad
      if (marktype === 'text') return BAD;
      if (marktype === 'line') return BAD;
      return M.size;
    case vlConsts.Enctype.COLOR: return M.color;
    case vlConsts.Enctype.TEXT: return M.text;
  }
  return BAD;
};

rankEncodings.measureScore.consts = M;


rankEncodings.score = {
  dimension: rankEncodings.dimensionScore,
  measure: rankEncodings.measureScore,
};
