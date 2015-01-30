var util = require('../util');

module.exports = projections;

/**
 * fields
 * @param  {[type]} fields array of fields and query information
 * @return {[type]}        [description]
 */
function projections(fields) {
  // TODO support other mode of projections generation
  // powerset, chooseK, chooseKorLess are already included in the util
  // Right now just add one more field

  var selected = [], unselected = [], fieldSets = [];

  fields.forEach(function(field){
    if (field.selected) {
      selected.push(field);
    } else {
      unselected.push(field);
    }
  });

  var setsToAdd = util.chooseKorLess(unselected, 1);

  setsToAdd.forEach(function(setToAdd){
    var fieldSet = selected.concat(setToAdd);
    if(fieldSet.length > 0){
      // always append projection's key to each projection returned, d3 style.
      fieldSet.key = projections.key(fieldSet);
      fieldSets.push(fieldSet);
    }
  });

  return fieldSets;
}

projections.key = function(projection) {
  return projection.map(function(field) {
    return field.name;
  }).join(',');
};
