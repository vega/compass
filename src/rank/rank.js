var vl = require('vegalite');

var rank = module.exports = {};

function dimensionScore(field, encType, marktype, stats){
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
      return 0.7; //prefer column over row due to scrolling issues
    case 'row':
      if (marktype === 'text') return 0.99;
      return 0.69;
    case 'color':
      //stacking gets lower score
      //FIXME add stacking option once we have control ..
      if (marktype ==='bar' || marktype ==='area') return 0.3;

      // true ordinal on color is currently bad (until we have good ordinal color scale support)
      if ((field.bin && field.type==='Q') || (field.fn && field.type==='T')) return 0.3;

      return 0.8;
    case 'shape':
      return 0.6;
  }
  return BAD_ENCODING_SCORE;
}

function measureScore(field, encType, marktype, stats) {
  switch (encType){
    case 'x': return 1;
    case 'y': return 1;
    case 'size': return 0.6;
    case 'color': return 0.4;
    case 'alpha': return 0.39;
    case 'text': return 1;
  }
  return BAD_ENCODING_SCORE;
}

// bad score not specified in the table above
var BAD_ENCODING_SCORE = 0.01,
  UNUSED_POSITION = 0.5;

var MARK_SCORE = {
  line: 0.99,
  area: 0.98,
  bar: 0.97,
  point: 0.96,
  circle: 0.95,
  square: 0.95,
  text: 0.8
};

rank.encoding = function(encoding, stats) {
  var features = [],
    encTypes = vl.keys(encoding.enc);

  vl.enc.forEach(encoding.enc, function(encType, field) {
    var role = vl.field.role(field);
    features.push({
      reason: encType+vl.shorthand.assign+vl.field.shorthand(field),
      score: rank.encoding.score[role](field, encType, encoding.marktype, stats)
    });
  });

  // penalize not using positional
  // only penalize for non-text
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
};

rank.encoding.score = {
  dimension: dimensionScore,
  measure: measureScore
};

