import * as vlFieldDef from 'vega-lite/src/fielddef';
import * as util from '../util';
import {SchemaField} from '../schema';
import {ProjectionOption, DEFAULT_PROJECTION_OPT} from '../consts';
import {TEMPORAL} from 'vega-lite/src/type';
const isDimension = vlFieldDef.isDimension;


// TODO support other mode of projections generation
// powerset, chooseK, chooseKorLess are already included in the util

/**
 * fields
 * @param  fieldDefs array of fields and query information
 * @return [description]
 */
// FIXME stats shouldn't be optional
export default function projections(fieldDefs: SchemaField[], stats?, opt: ProjectionOption = {}) {
  opt = util.extend({}, DEFAULT_PROJECTION_OPT, opt);

  // First categorize field, selected, fieldsToAdd, and save indices
  var selected = [], fieldsToAdd = [], fieldSets = [];

  // Whether the given fieldDefs contains selected dimension(s) / measure(s)
  // This will affect how we order suggested variables
  var hasSelectedDimension = false,
    hasSelectedMeasure = false;
  var indices = {};

  fieldDefs.forEach(function(fieldDef, index){
    // save indices for stable sort later
    indices[fieldDef.field] = index;

    if (fieldDef.selected) { // selected fields are included in selected
      selected.push(fieldDef);

      if (isDimension(fieldDef) ||
         (fieldDef.type === TEMPORAL /* TODO: add && current constraint make it a dimension */)) {
        // If the field can serve as dimension

        // FIXME vega-lite's isDimension is designed to work with FieldDef, not SchemaField
        // Therefore, we should augment vega-lite's isDimension
        hasSelectedDimension = true;
      } else {
        hasSelectedMeasure = true;
      }
    } else if (fieldDef.selected !== false && !vlFieldDef.isCount(fieldDef)) {
      if (vlFieldDef.isDimension(fieldDef) &&
          !opt.maxCardinalityForAutoAddOrdinal &&
          vlFieldDef.cardinality(fieldDef, stats, 15) > opt.maxCardinalityForAutoAddOrdinal
        ) {
        return;
      }
      fieldsToAdd.push(fieldDef);
    }
  });

  fieldsToAdd.sort(compareFieldsToAdd(hasSelectedDimension, hasSelectedMeasure, indices));

  console.log(opt.additionalVariables);
  var setsToAdd = util.chooseKorLess(fieldsToAdd, opt.additionalVariables);

  setsToAdd.forEach(function(setToAdd) {
    var fieldSet = selected.concat(setToAdd);
    if (fieldSet.length > 0) {
      if (opt.omitDotPlot && fieldSet.length === 1) {
        return;
      }
      fieldSets.push(fieldSet);
    }
  });

  // FIXME - this d3 style should be refactored
  fieldSets.forEach(function(fieldSet) {
      // always append projection's key to each projection returned, d3 style.
    fieldSet.key = key(fieldSet);
  });

  return fieldSets;
}

var typeIsMeasureScore = {
  nominal: 0,
  ordinal: 0,
  temporal: 2,
  quantitative: 3
};

function compareFieldsToAdd(hasSelectedDimension, hasSelectedMeasure, indices) {
  return function(a, b){
    // sort by type of the data
    if (a.type !== b.type) {
      if (!hasSelectedDimension) {
        return typeIsMeasureScore[a.type] - typeIsMeasureScore[b.type];
      } else { // if (!hasSelectedMeasure) {
        return typeIsMeasureScore[b.type] - typeIsMeasureScore[a.type];
      }
    }
    // make the sort stable
    return indices[a.field] - indices[b.field];
  };
}

export function key(projection) {
  return projection.map(function(fieldDef) {
    return vlFieldDef.isCount(fieldDef) ? 'count' : fieldDef.field;
  }).join(',');
};
