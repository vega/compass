"use strict";

var vl = require('vega-lite'),
  isDimension = vl.encDef.isDimension,
  isOrdinalScale = vl.encDef.isOrdinalScale;

var vlmarktypes = module.exports = getMarktypes;

var marksRule = vlmarktypes.rule = {
  point:  pointRule,
  bar:    barRule,
  line:   lineRule,
  area:   areaRule, // area is similar to line
  text:   textRule,
  tick:   tickRule
};

function getMarktypes(encoding, stats, opt) {
  return opt.marktypeList.filter(function(markType){
    return vlmarktypes.satisfyRules(encoding, markType, stats, opt);
  });
}

vlmarktypes.satisfyRules = function (encoding, markType, stats, opt) {
  var mark = vl.compiler.marks[markType],
    reqs = mark.requiredEncoding,
    support = mark.supportedEncoding;

  for (var i in reqs) { // all required encodings in enc
    if (!(reqs[i] in encoding)) return false;
  }

  for (var encType in encoding) { // all encodings in enc are supported
    if (!support[encType]) return false;
  }

  return !marksRule[markType] || marksRule[markType](encoding, stats, opt);
};

function facetRule(fieldDef, stats, opt) {
  return vl.encDef.cardinality(fieldDef, stats) <= opt.maxCardinalityForFacets;
}

function facetsRule(encoding, stats, opt) {
  if(encoding.row && !facetRule(encoding.row, stats, opt)) return false;
  if(encoding.col && !facetRule(encoding.col, stats, opt)) return false;
  return true;
}

function pointRule(encoding, stats, opt) {
  if(!facetsRule(encoding, stats, opt)) return false;
  if (encoding.x && encoding.y) {
    // have both x & y ==> scatter plot / bubble plot

    var xIsDim = isDimension(encoding.x),
      yIsDim = isDimension(encoding.y);

    // For OxO
    if (xIsDim && yIsDim) {
      // shape doesn't work with both x, y as ordinal
      if (encoding.shape) {
        return false;
      }

      // TODO(kanitw): check that there is quant at least ...
      if (encoding.color && isDimension(encoding.color)) {
        return false;
      }
    }

  } else { // plot with one axis = dot plot
    if (opt.omitDotPlot) return false;

    // Dot plot should always be horizontal
    if (opt.omitTranpose && encoding.y) return false;

    // dot plot shouldn't have other encoding
    if (opt.omitDotPlotWithExtraEncoding && vl.keys(encoding).length > 1) return false;

    // dot plot with shape is non-sense
    if (encoding.shape) return false;
  }
  return true;
}

function tickRule(encoding, stats, opt) {
  // jshint unused:false
  if (encoding.x || encoding.y) {
    if(vl.enc.isAggregate(encoding)) return false;

    var xIsDim = isDimension(encoding.x),
      yIsDim = isDimension(encoding.y);

    return (!xIsDim && (!encoding.y || isOrdinalScale(encoding.y))) ||
      (!yIsDim && (!encoding.x || isOrdinalScale(encoding.x)));
  }
  return false;
}

function barRule(encoding, stats, opt) {
  if(!facetsRule(encoding, stats, opt)) return false;

  // bar requires at least x or y
  if (!encoding.x && !encoding.y) return false;

  if (opt.omitSizeOnBar && encoding.size !== undefined) return false;

  // FIXME actually check if there would be occlusion #90
  // need to aggregate on either x or y
  var aggEitherXorY =
    (!encoding.x || encoding.x.aggregate === undefined) ^
    (!encoding.y || encoding.y.aggregate === undefined);


  if (aggEitherXorY) {
    var eitherXorYisDimOrNull =
      (!encoding.x || isDimension(encoding.x)) ^
      (!encoding.y || isDimension(encoding.y));

    if (eitherXorYisDimOrNull) {
      var aggregate = encoding.x.aggregate || encoding.y.aggregate;
      return !(opt.omitStackedAverage && aggregate ==='mean' && encoding.color);
    }
  }

  return false;
}

function lineRule(encoding, stats, opt) {
  if(!facetsRule(encoding, stats, opt)) return false;

  // TODO(kanitw): add omitVerticalLine as config

  // FIXME truly ordinal data is fine here too.
  // Line chart should be only horizontal
  // and use only temporal data
  return encoding.x.type == 'T' && encoding.x.timeUnit && encoding.y.type == 'Q' && encoding.y.aggregate;
}

function areaRule(encoding, stats, opt) {
  if(!facetsRule(encoding, stats, opt)) return false;

  if(!lineRule(encoding, stats, opt)) return false;

  return !(opt.omitStackedAverage && encoding.y.aggregate ==='mean' && encoding.color);
}

function textRule(encoding, stats, opt) {
  // at least must have row or col and aggregated text values
  return (encoding.row || encoding.col) && encoding.text && encoding.text.aggregate && !encoding.x && !encoding.y && !encoding.size &&
    (!opt.alwaysGenerateTableAsHeatmap || !encoding.color);
}
