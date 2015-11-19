'use strict';

var vlEncDef = require('vega-lite/src/encdef');
var vlSchemaUtil = require('vega-lite/src/schema/schemautil');

var util = require('../util'),
  consts = require('../consts'),
  isDimension = vlEncDef.isDimension;

module.exports = projections;

// TODO support other mode of projections generation
// powerset, chooseK, chooseKorLess are already included in the util

/**
 * fields
 * @param  {[type]} fieldDefs array of fields and query information
 * @return {[type]}        [description]
 */
function projections(fieldDefs, stats, opt) {
  opt = vlSchemaUtil.extend(opt||{}, consts.gen.projections);

  // First categorize field, selected, fieldsToAdd, and save indices
  var selected = [], fieldsToAdd = [], fieldSets = [],
    hasSelectedDimension = false,
    hasSelectedMeasure = false,
    indices = {};

  fieldDefs.forEach(function(fieldDef, index){
    //save indices for stable sort later
    indices[fieldDef.name] = index;

    if (fieldDef.selected) {
      selected.push(fieldDef);
      if (isDimension(fieldDef) || fieldDef.type ==='T') { // FIXME / HACK
        hasSelectedDimension = true;
      } else {
        hasSelectedMeasure = true;
      }
    } else if (fieldDef.selected !== false && !vlEncDef.isCount(fieldDef)) {
      if (vlEncDef.isDimension(fieldDef) &&
          !opt.maxCardinalityForAutoAddOrdinal &&
          vlEncDef.cardinality(fieldDef, stats, 15) > opt.maxCardinalityForAutoAddOrdinal
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
    fieldSet.key = projections.key(fieldSet);
  });

  return fieldSets;
}

var typeIsMeasureScore = {
  N: 0,
  O: 0,
  T: 2,
  Q: 3
};

function compareFieldsToAdd(hasSelectedDimension, hasSelectedMeasure, indices) {
  return function(a, b){
    // sort by type of the data
    if (a.type !== b.type) {
      if (!hasSelectedDimension) {
        return typeIsMeasureScore[a.type] - typeIsMeasureScore[b.type];
      } else { //if (!hasSelectedMeasure) {
        return typeIsMeasureScore[b.type] - typeIsMeasureScore[a.type];
      }
    }
    //make the sort stable
    return indices[a.name] - indices[b.name];
  };
}

projections.key = function(projection) {
  return projection.map(function(field) {
    return vlEncDef.isCount(field) ? 'count' : field.name;
  }).join(',');
};

