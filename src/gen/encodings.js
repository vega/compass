"use strict";

var vlFieldDef = require('vega-lite/src/fielddef');
var vlEnc = require('vega-lite/src/enc');
var util = require('../util');

var genMarkTypes = require('./marktypes'),
  isDimension = vlFieldDef.isDimension,
  isMeasure = vlFieldDef.isMeasure;

var consts = require('../consts');
var Type = consts.Type;

module.exports = genEncodings;

// FIXME remove dimension, measure and use information in vega-lite instead!
var rules = {
  x: {
    dimension: true,
    measure: true,
    multiple: true //FIXME should allow multiple only for Q, T
  },
  y: {
    dimension: true,
    measure: true,
    multiple: true //FIXME should allow multiple only for Q, T
  },
  row: {
    dimension: true,
    multiple: true
  },
  col: {
    dimension: true,
    multiple: true
  },
  shape: {
    dimension: true,
    rules: shapeRules
  },
  size: {
    measure: true,
    rules: retinalEncRules
  },
  color: {
    dimension: true,
    measure: true,
    rules: colorRules
  },
  text: {
    measure: true
  },
  detail: {
    dimension: true
  }
  //geo: {
  //  geo: true
  //},
  //arc: { // pie
  //
  //}
};

function retinalEncRules(encoding, fieldDef, stats, opt) {
  if (opt.omitMultipleRetinalEncodings) {
    if (encoding.color || encoding.size || encoding.shape) return false;
  }
  return true;
}

function colorRules(encoding, fieldDef, stats, opt) {
  if(!retinalEncRules(encoding, fieldDef, stats, opt)) return false;

  return vlFieldDef.isMeasure(fieldDef) ||
    vlFieldDef.cardinality(fieldDef, stats) <= opt.maxCardinalityForColor;
}

function shapeRules(encoding, fieldDef, stats, opt) {
  if(!retinalEncRules(encoding, fieldDef, stats, opt)) return false;

  if (fieldDef.bin && fieldDef.type === Type.Quantitative) return false;
  if (fieldDef.timeUnit && fieldDef.type === Type.Temporal) return false;
  return vlFieldDef.cardinality(fieldDef, stats) <= opt.maxCardinalityForColor;
}

function dimMeaTransposeRule(encoding) {
  // create horizontal histogram for ordinal
  if ((encoding.y.type === Type.Nominal || encoding.y.type === Type.Ordinal) && isMeasure(encoding.x)) {
    return true;
  }

  // vertical histogram for Q and T
  if (isMeasure(encoding.y) &&
      !(encoding.x.type === Type.Nominal || encoding.x.type === Type.Ordinal) &&
      isDimension(encoding.x)
      ) {
    return true;
  }

  return false;
}

function generalRules(encoding, stats, opt) {
  // enc.text is only used for TEXT TABLE
  if (encoding.text) {
    return genMarkTypes.satisfyRules(encoding, 'text', stats, opt);
  }

  // CARTESIAN PLOT OR MAP
  if (encoding.x || encoding.y || encoding.geo || encoding.arc) {

    if (encoding.row || encoding.col) { //have facet(s)

      // don't use facets before filling up x,y
      if (!encoding.x || !encoding.y) return false;

      if (opt.omitNonTextAggrWithAllDimsOnFacets) {
        // remove all aggregated charts with all dims on facets (row, col)
        if (genEncodings.isAggrWithAllDimOnFacets(encoding)) return false;
      }
    }

    if (encoding.x && encoding.y) {
      var isDimX = !!isDimension(encoding.x),
        isDimY = !!isDimension(encoding.y);

      if (isDimX && isDimY && !vlEnc.isAggregate(encoding)) {
        // FIXME actually check if there would be occlusion #90
        return false;
      }

      if (opt.omitTranpose) {
        if (isDimX ^ isDimY) { // dim x mea
          if (!dimMeaTransposeRule(encoding)) {
            return false;
          }
        } else if (encoding.y.type=== Type.Temporal|| encoding.x.type === Type.Temporal) {
          if (encoding.y.type=== Type.Temporal && encoding.x.type !== Type.Temporal) return false;
        } else { // show only one OxO, QxQ
          if (encoding.x.name > encoding.y.name) return false;
        }
      }
      return true;
    }

    // DOT PLOTS
    // // plot with one axis = dot plot
    if (opt.omitDotPlot) return false;

    // Dot plot should always be horizontal
    if (opt.omitTranpose && encoding.y) return false;

    // dot plot shouldn't have other encoding
    if (opt.omitDotPlotWithExtraEncoding && util.keys(encoding).length > 1) return false;

    if (opt.omitOneDimensionCount) {
      // one dimension "count"
      if (encoding.x && encoding.x.aggregate == 'count' && !encoding.y) return false;
      if (encoding.y && encoding.y.aggregate == 'count' && !encoding.x) return false;
    }

    return true;
  }
  return false;
}

genEncodings.isAggrWithAllDimOnFacets = function (encoding) {
  var hasAggr = false, hasOtherO = false;
  for (var encType in encoding) {
    var fieldDef = encoding[encType];
    if (fieldDef.aggregate) {
      hasAggr = true;
    }
    if (vlFieldDef.isDimension(fieldDef) && (encType !== consts.ROW && encType !== consts.COL)) {
      hasOtherO = true;
    }
    if (hasAggr && hasOtherO) break;
  }

  return hasAggr && !hasOtherO;
};


function genEncodings(encodings, fieldDefs, stats, opt) {
  // generate a collection vega-lite's enc
  var tmpEncoding = {};

  function assignField(i) {
    // If all fields are assigned, save
    if (i === fieldDefs.length) {
      // at the minimal all chart should have x, y, geo, text or arc
      if (generalRules(tmpEncoding, stats, opt)) {
        encodings.push(util.duplicate(tmpEncoding));
      }
      return;
    }

    // Otherwise, assign i-th field
    var fieldDef = fieldDefs[i];
    for (var j in opt.encodingTypeList) {
      var encType = opt.encodingTypeList[j],
        isDim = isDimension(fieldDef);

      //TODO: support "multiple" assignment
      if (!(encType in tmpEncoding) && // encoding not used
        ((isDim && rules[encType].dimension) || (!isDim && rules[encType].measure)) &&
        (!rules[encType].rules || rules[encType].rules(tmpEncoding, fieldDef, stats, opt))
      ) {
        tmpEncoding[encType] = fieldDef;
        assignField(i + 1);
        delete tmpEncoding[encType];
      }
    }
  }

  assignField(0);

  return encodings;
}
