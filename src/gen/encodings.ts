import * as vlFieldDef from 'vega-lite/src/fielddef';
import * as vlEncoding from 'vega-lite/src/encoding';
import * as util from '../util';
import * as genMarks from './marks';
import * as consts from '../consts';

var isDimension = vlFieldDef.isDimension,
  isMeasure = vlFieldDef.isMeasure;

var Type = consts.Type;

// FIXME remove dimension, measure and use information in vega-lite instead!
const rules = {
  x: {
    dimension: true,
    measure: true,
    multiple: true // FIXME should allow multiple only for Q, T
  },
  y: {
    dimension: true,
    measure: true,
    multiple: true // FIXME should allow multiple only for Q, T
  },
  row: {
    dimension: true,
    multiple: true
  },
  column: {
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
  // encoding.text is only used for TEXT TABLE
  if (encoding.text) {
    return genMarks.satisfyRules(encoding, 'text', stats, opt);
  }

  // CARTESIAN PLOT OR MAP
  if (encoding.x || encoding.y || encoding.geo || encoding.arc) {

    if (encoding.row || encoding.column) { // have facet(s)

      // don't use facets before filling up x,y
      if (!encoding.x || !encoding.y) { return false; }

      if (opt.omitNonTextAggrWithAllDimsOnFacets) {
        // remove all aggregated charts with all dims on facets (row, column)
        if (isAggrWithAllDimOnFacets(encoding)) { return false; }
      }
    }

    if (encoding.x && encoding.y) {
      var isDimX = !!isDimension(encoding.x),
        isDimY = !!isDimension(encoding.y);

      if (isDimX && isDimY && !vlEncoding.isAggregate(encoding)) {
        // FIXME actually check if there would be occlusion #90
        return false;
      }

      if (opt.omitTranpose) {
        if ((isDimX && !isDimY) || (!isDimX && isDimY)) { // dim x mea
          if (!dimMeaTransposeRule(encoding)) {
            return false;
          }
        } else if (encoding.y.type=== Type.Temporal|| encoding.x.type === Type.Temporal) {
          if (encoding.y.type=== Type.Temporal && encoding.x.type !== Type.Temporal) {
            return false;
          }
        } else { // show only one OxO, QxQ
          if (encoding.x.field > encoding.y.field) {
            return false;
          }
        }
      }
      return true;
    }

    // DOT PLOTS
    // // plot with one axis = dot plot
    if (opt.omitDotPlot) {
      return false;
    }

    // Dot plot should always be horizontal
    if (opt.omitTranpose && encoding.y) {
      return false;
    }

    // dot plot shouldn't have other encoding
    if (opt.omitDotPlotWithExtraEncoding && util.keys(encoding).length > 1) {
      return false;
    }

    if (opt.omitOneDimensionCount) {
      // one dimension "count"
      if (encoding.x && encoding.x.aggregate === 'count' && !encoding.y) {
        return false;
      }
      if (encoding.y && encoding.y.aggregate === 'count' && !encoding.x) {
        return false;
      }
    }

    return true;
  }
  return false;
}

export function isAggrWithAllDimOnFacets(encoding) {
  var hasAggr = false, hasOtherO = false;
  for (var channel in encoding) {
    var fieldDef = encoding[channel];
    if (fieldDef.aggregate) {
      hasAggr = true;
    }
    if (vlFieldDef.isDimension(fieldDef) && (channel !== consts.ROW && channel !== consts.COL)) {
      hasOtherO = true;
    }
    if (hasAggr && hasOtherO) { break; }
  }

  return hasAggr && !hasOtherO;
};


export default function genEncodings(encodings, fieldDefs, stats, opt) {
  // generate a collection vega-lite's encoding
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
      var channel = opt.encodingTypeList[j],
        isDim = isDimension(fieldDef);

      // TODO: support "multiple" assignment
      if (!(channel in tmpEncoding) && // encoding not used
        ((isDim && rules[channel].dimension) || (!isDim && rules[channel].measure)) &&
        (!rules[channel].rules || rules[channel].rules(tmpEncoding, fieldDef, stats, opt))
      ) {
        tmpEncoding[channel] = fieldDef;
        assignField(i + 1);
        delete tmpEncoding[channel];
      }
    }
  }

  assignField(0);

  return encodings;
}
