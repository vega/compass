'use strict';

var vl = require('vegalite');

var util = require('../util');

module.exports = genAggregates;

function genAggregates(output, fields, opt) {
  var tf = new Array(fields.length);
  opt = util.gen.getOpt(opt);
  // console.log('vr.gen.aggregates', fields, opt);

  function assignField(i, hasAggr) {
    // If all fields are assigned, save
    if (i === fields.length) {
      if (opt.omitAggregateWithMeasureOnly || opt.omitDimensionOnly) {
        var hasMeasure = false, hasDimension = false, hasRaw = false;
        tf.forEach(function(f) {
          if (util.isDim(f)) {
            hasDimension = true;
          } else {
            hasMeasure = true;
            if (!f.aggr) hasRaw = true;
          }
        });
        if (!hasMeasure && opt.omitDimensionOnly) return;
        if (!hasDimension && !hasRaw && opt.omitAggregateWithMeasureOnly) return;
      }

      var fieldSet = vl.duplicate(tf);
      fieldSet.key = vl.field.shorthands(fieldSet);

      output.push(fieldSet);
      return;
    }

    var f = fields[i];

    // Otherwise, assign i-th field
    switch (f.type) {
      //TODO "D", "G"
      case 'Q':
        tf[i] = {name: f.name, type: f.type};
        if (f.aggr) {
          tf[i].aggr = f.aggr;
          assignField(i + 1, true);
        } else {
          var aggregates = (!f._aggr || f._aggr === '*') ? opt.aggrList : f._aggr;

          for (var j in aggregates) {
            var a = aggregates[j];
            if (a !== undefined) {
              if (hasAggr === true || hasAggr === null) {
                // must be aggregated, or no constraint
                //set aggregate to that one
                tf[i].aggr = a;
                assignField(i + 1, true);
              }
            } else { // if(a === undefined)
              if (hasAggr === false || hasAggr === null) {
                // must be raw plot, or no constraint
                delete tf[i].aggr;
                assignField(i + 1, false);
              }
            }
          }

          if (opt.genBin) {
            // bin the field instead!
            delete tf[i].aggr;
            tf[i].bin = true;
            tf[i].type = 'Q';
            assignField(i + 1, hasAggr);
          }

          if (opt.genTypeCasting) {
            // we can also change it to dimension (cast type="O")
            delete tf[i].aggr;
            delete tf[i].bin;
            tf[i].type = 'O';
            assignField(i + 1, hasAggr);
          }
        }
        break;

      case 'O':
      default:
        tf[i] = f;
        assignField(i + 1, hasAggr);
        break;
    }

  }

  assignField(0, null);

  return output;
}
