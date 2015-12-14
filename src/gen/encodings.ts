import * as vlFieldDef from 'vega-lite/src/fielddef';
import * as vlEncoding from 'vega-lite/src/encoding';
import * as util from '../util';
import * as genMarks from './marks';
import {EncodingOption, DEFAULT_ENCODING_OPTION} from '../consts';
import {ROW, COLUMN, getSupportedRole} from 'vega-lite/src/channel';
import {Type} from 'vega-lite/src/type';

var isDimension = vlFieldDef.isDimension,
  isMeasure = vlFieldDef.isMeasure;

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

function retinalEncRules(encoding, fieldDef, stats, opt: EncodingOption) {
  if (opt.omitMultipleRetinalEncodings) {
    if (encoding.color || encoding.size || encoding.shape) {
      return false;
    }
  }
  return true;
}

function colorRules(encoding, fieldDef, stats, opt: EncodingOption) {
  // Don't use color if omitMultipleRetinalEncodings is true and we already have other retinal encoding
  if (!retinalEncRules(encoding, fieldDef, stats, opt)) {
    return false;
  }

  // Color must be either measure or dimension with cardinality lower than the max cardinality
  return vlFieldDef.isMeasure(fieldDef) ||
    vlFieldDef.cardinality(fieldDef, stats) <= opt.maxCardinalityForColor;
}

function shapeRules(encoding, fieldDef, stats, opt: EncodingOption) {
  if (!retinalEncRules(encoding, fieldDef, stats, opt)) {
    return false;
  }

  // TODO: revise if this should mainly be on ranking
  if (opt.omitShapeWithBin && fieldDef.bin && fieldDef.type === Type.QUANTITATIVE) {
    return false;
  }
  if (opt.omitShapeWithTimeDimension && fieldDef.timeUnit && fieldDef.type === Type.TEMPORAL) {
    return false;
  }

  return vlFieldDef.cardinality(fieldDef, stats) <= opt.maxCardinalityForShape;
}

function dotPlotRules(encoding, stats, opt: EncodingOption) {
  if (opt.omitDotPlot) { return false;}

  // Dot plot should always be horizontal
  if (opt.omitTranspose && encoding.y) { return false;}

  // Omit Dot plot with facet
  if (opt.omitDotPlotWithFacet && (encoding.row || encoding.column)) {
    return false;
  }

  // dot plot shouldn't have other encoding
  if (opt.omitDotPlotWithExtraEncoding && util.keys(encoding).length > 1) {
    return false;
  }

  if (opt.omitDotPlotWithOnlyCount) {
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

function xyPlotRules(encoding, stats, opt: EncodingOption) {
  if (encoding.row || encoding.column) { // have facet(s)
    if (opt.omitNonTextAggrWithAllDimsOnFacets) {
      // remove all aggregated charts with all dims on facets (row, column)
      if (isAggrWithAllDimOnFacets(encoding)) { return false; }
    }
  }

  var isDimX = isDimension(encoding.x),
    isDimY = isDimension(encoding.y);

  // If both x and y are dimension, and the plot is not aggregated,
  // there might be occlusion.
  if (opt.omitRawWithXYBothDimension && isDimX && isDimY && !vlEncoding.isAggregate(encoding)) {
    // FIXME actually check if there would be occlusion #90
    return false;
  }

  if (opt.omitTranspose) {
    if (isDimX !== isDimY) { // dim x mea
      // create horizontal histogram for ordinal
      if ((encoding.y.type === Type.NOMINAL || encoding.y.type === Type.ORDINAL) && isMeasure(encoding.x)) {
        return true;
      }

      // vertical histogram for binned Q and T
      if (!isDimY && isDimX && !(encoding.x.type === Type.NOMINAL || encoding.x.type === Type.ORDINAL)) {
        return true;
      }

      return false;
    } else if (encoding.y.type=== Type.TEMPORAL || encoding.x.type === Type.TEMPORAL) {
      // FIXME revise this
      if (encoding.y.type=== Type.TEMPORAL && encoding.x.type !== Type.TEMPORAL) {
        return false;
      }
    } else {
      // FIXME: test if we can remove this rule
      // show only one OxO, QxQ
      if (encoding.x.field > encoding.y.field) {
        return false;
      }
    }
  }
  return true;
}

/** List of rules that are only considered at the end of the generation process */
function generalRules(encoding, stats, opt: EncodingOption) {
  // TODO call Vega-Lite validate instead once it is implemented
  // encoding.text is only used for TEXT TABLE
  if (encoding.text) {
    return genMarks.satisfyRules(encoding, 'text', stats, opt);
  }

  const hasX = !!encoding.x, hasY = !!encoding.y;

  if (hasX !== hasY) { // DOT PLOT  (plot with one axis)
    return dotPlotRules(encoding, stats, opt);
  } else if (hasX && hasY){ // CARTESIAN PLOT with X and Y
    return xyPlotRules(encoding, stats, opt);
  }
  // TODO: consider other type of visualization (e.g., geo, arc) when we have them.
  return false;
}

export function isAggrWithAllDimOnFacets(encoding) {
  var hasAggr = false, hasOtherO = false;
  for (var channel in encoding) {
    var fieldDef = encoding[channel];
    if (fieldDef.aggregate) {
      hasAggr = true;
    }
    if (vlFieldDef.isDimension(fieldDef) && (channel !== ROW && channel !== COLUMN)) {
      hasOtherO = true;
    }
    if (hasAggr && hasOtherO) { break; }
  }

  return hasAggr && !hasOtherO;
};

export default function genEncodings(encodings, fieldDefs, stats, opt: EncodingOption = DEFAULT_ENCODING_OPTION) {
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
