import * as vlFieldDef from 'vega-lite/src/fielddef';
import * as vlSchemaUtil from 'vega-lite/src/schema/schemautil';

import * as util from '../util';
import * as consts from '../consts';
const isDimension = vlFieldDef.isDimension;

// TODO support other mode of projections generation
// powerset, chooseK, chooseKorLess are already included in the util

/**
 * fields
 * @param  {[type]} fieldDefs array of fields and query information
 * @return {[type]}        [description]
 */
export default function projections(fieldDefs, stats, opt) {
  opt = vlSchemaUtil.extend(opt||{}, consts.gen.projections);

  // First categorize field, selected, fieldsToAdd, and save indices
  var selected = [], fieldsToAdd = [], fieldSets = [],
    hasSelectedDimension = false,
    hasSelectedMeasure = false,
    indices = {};

  fieldDefs.forEach(function(fieldDef, index){
    // save indices for stable sort later
    indices[fieldDef.field] = index;

    if (fieldDef.selected) {
      selected.push(fieldDef);
      if (isDimension(fieldDef) || fieldDef.type ==='temporal') { // FIXME / HACK
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

  var setsToAdd = util.chooseKorLess(fieldsToAdd, 1);

  setsToAdd.forEach(function(setToAdd) {
    var fieldSet = selected.concat(setToAdd);
    if (fieldSet.length > 0) {
      if (opt.omitDotPlot && fieldSet.length === 1) return;
      fieldSets.push(fieldSet);
    }
  });

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
