var vl = require('vegalite');

module.exports = rankEncodings;

// bad score not specified in the table above
var BAD_ENCODING_SCORE = 0.01,
  UNUSED_POSITION = 0.5;

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

function rankEncodings(encoding, stats, opt) {
  var features = [],
    encTypes = vl.keys(encoding.enc);

  // var encodingMappingByField = vl.enc.reduce(encoding.enc, function(m, encType, field) {
  //   m[vl.field.shorthand(field)] = {encType: encType, field: field};
  //   return m;
  // }, {});

  vl.enc.forEach(encoding.enc, function(encType, field) {
    var role = vl.field.role(field);
    features.push({
      reason: encType+vl.shorthand.assign+vl.field.shorthand(field),
      score: rankEncodings.score[role](field, encType, encoding.marktype, stats, opt)
    });
  });

  // penalize not using positional only penalize for non-text
  if (encTypes.length > 1 && encoding.marktype !== 'text') {
    if ((!encoding.enc.x || !encoding.enc.y) && !encoding.enc.geo && !encoding.enc.text) {
      features.push({
        reason: 'unused position',
        score: UNUSED_POSITION
      });
    }
  }

  features.push({
    reason: 'marktype='+encoding.marktype,
    score: MARK_SCORE[encoding.marktype]
  });

  return {
    score: features.reduce(function(p, f) {
      return p * f.score;
    }, 1),
    features: features
  };
}

rankEncodings.score = {
  dimension: dimensionScore,
  measure: measureScore
};

function dimensionScore(field, encType, marktype, stats, opt){
  var cardinality = vl.field.cardinality(field, stats);
  switch (encType) {
    case 'x':
      if(field.type === 'O') return 0.99;
      return 1;

    case 'y':
      if(field.type === 'O') return 1; //prefer ordinal on y
      if(field.type === 'T') return 0.8; // time should not be on Y
      return 0.99;

    case 'col':
      if (marktype === 'text') return 1;
      //prefer column over row due to scrolling issues
      return cardinality <= opt.maxGoodCardinalityForFacets ? 0.7 :
        cardinality <= opt.maxCardinalityForFacets ? 0.6 : 0.5;

    case 'row':
      if (marktype === 'text') return 0.99;
      return cardinality <= opt.maxGoodCardinalityForFacets ? 0.69 :
        cardinality <= opt.maxCardinalityForFacets ? 0.59 : 0.49;

    case 'color':
      //stacking gets lower score
      //FIXME add stacking option once we have control ..
      if (marktype ==='bar' || marktype ==='area') return 0.3;

      // true ordinal on color is currently bad (until we have good ordinal color scale support)
      if ((field.bin && field.type==='Q') || (field.fn && field.type==='T')) return 0.3;

      return cardinality <= opt.maxGoodCardinalityForColor ? 0.7: cardinality <= opt.maxCardinalityForColor ? 0.51 : 0.1;
    case 'shape':
      return cardinality <= opt.maxCardinalityForShape ? 0.6 : 0.1;
    case 'detail':
      return 0.5;
  }
  return BAD_ENCODING_SCORE;
}

function measureScore(field, encType, marktype, stats, opt) {
  switch (encType){
    case 'x': return 1;
    case 'y': return 1;
    case 'size':
      if (marktype === 'bar') return 0.1; //size of bar is very bad
      if (marktype === 'text') return 0.1;
      if (marktype === 'line') return 0.1;
      return 0.8;
    case 'color': return 0.6;
    case 'alpha': return 0.59;
    case 'text': return 0.4;
  }
  return BAD_ENCODING_SCORE;
}
