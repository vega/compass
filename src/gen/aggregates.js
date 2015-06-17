'use strict';

var vl = require('vega-lite');

var consts = require('../consts');

var AUTO='*';

module.exports = genAggregates;

function genAggregates(output, fields, stats, opt) {
  opt = vl.schema.util.extend(opt||{}, consts.gen.aggregates);
  var tf = new Array(fields.length);
  var hasNorO = vl.any(fields, function(f) {
    return vl.field.isTypes(f, [N, O]);
  });

  function emit(fieldSet) {
    fieldSet = vl.duplicate(fieldSet);
    fieldSet.key = vl.field.shorthands(fieldSet);
    output.push(fieldSet);
  }

  function checkAndPush() {
    if (opt.omitMeasureOnly || opt.omitDimensionOnly) {
      var hasMeasure = false, hasDimension = false, hasRaw = false;
      tf.forEach(function(f) {
        if (vl.field.isDimension(f)) {
          hasDimension = true;
        } else {
          hasMeasure = true;
          if (!f.aggregate) hasRaw = true;
        }
      });
      if (!hasDimension && !hasRaw && opt.omitMeasureOnly) return;
      if (!hasMeasure) {
        if (opt.addCountForDimensionOnly) {
          tf.push(vl.field.count());
          emit(tf);
          tf.pop();
        }
        if (opt.omitDimensionOnly) return;
      }
    }
    if (opt.omitDotPlot && tf.length === 1) return;
    emit(tf);
  }

  function assignAggrQ(i, hasAggr, autoMode, a) {
    var canHaveAggr = hasAggr === true || hasAggr === null,
      cantHaveAggr = hasAggr === false || hasAggr === null;
    if (a) {
      if (canHaveAggr) {
        tf[i].aggregate = a;
        assignField(i + 1, true, autoMode);
        delete tf[i].aggregate;
      }
    } else { // if(a === undefined)
      if (cantHaveAggr) {
        assignField(i + 1, false, autoMode);
      }
    }
  }

  function assignBinQ(i, hasAggr, autoMode) {
    tf[i].bin = true;
    assignField(i + 1, hasAggr, autoMode);
    delete tf[i].bin;
  }

  function assignQ(i, hasAggr, autoMode) {
    var f = fields[i],
      canHaveAggr = hasAggr === true || hasAggr === null;

    tf[i] = {name: f.name, type: f.type};

    if (f.aggregate === 'count') { // if count is included in the selected fields
      if (canHaveAggr) {
        tf[i].aggregate = f.aggregate;
        assignField(i + 1, true, autoMode);
      }
    } else if (f._aggregate) {
      // TODO support array of f._aggrs too
      assignAggrQ(i, hasAggr, autoMode, f._aggregate);
    } else if (f._raw) {
      assignAggrQ(i, hasAggr, autoMode, undefined);
    } else if (f._bin) {
      assignBinQ(i, hasAggr, autoMode);
    } else {
      opt.aggrList.forEach(function(a) {
        if (!opt.consistentAutoQ || autoMode === AUTO || autoMode === a) {
          assignAggrQ(i, hasAggr, a /*assign autoMode*/, a);
        }
      });

      if ((!opt.consistentAutoQ || vl.isin(autoMode, [AUTO, 'bin', 'cast', 'autocast'])) && !hasNorO) {
        var highCardinality = vl.field.cardinality(f, stats) > opt.minCardinalityForBin;

        var isAuto = opt.genDimQ === 'auto',
          genBin = opt.genDimQ  === 'bin' || (isAuto && highCardinality),
          genCast = opt.genDimQ === 'cast' || (isAuto && !highCardinality);

        if (genBin && vl.isin(autoMode, [AUTO, 'bin', 'autocast'])) {
          assignBinQ(i, hasAggr, isAuto ? 'autocast' : 'bin');
        }
        if (genCast && vl.isin(autoMode, [AUTO, 'cast', 'autocast'])) {
          tf[i].type = 'O';
          assignField(i + 1, hasAggr, isAuto ? 'autocast' : 'cast');
          tf[i].type = 'Q';
        }
      }
    }
  }

  function assignTimeUnitT(i, hasAggr, autoMode, timeUnit) {
    tf[i].timeUnit = timeUnit;
    assignField(i+1, hasAggr, autoMode);
    delete tf[i].timeUnit;
  }

  function assignT(i, hasAggr, autoMode) {
    var f = fields[i];
    tf[i] = {name: f.name, type: f.type};

    // TODO support array of f._timeUnits
    if (f._timeUnit) {
      assignTimeUnitT(i, hasAggr, autoMode, f._timeUnit);
    } else {
      opt.timeUnitList.forEach(function(timeUnit) {
        if (timeUnit === undefined) {
          if (!hasAggr) { // can't aggregate over raw time
            assignField(i+1, false, autoMode);
          }
        } else {
          assignTimeUnitT(i, hasAggr, autoMode, timeUnit);
        }
      });
    }

    // FIXME what if you aggregate time?
  }

  function assignField(i, hasAggr, autoMode) {
    if (i === fields.length) { // If all fields are assigned
      checkAndPush();
      return;
    }

    var f = fields[i];
    // Otherwise, assign i-th field
    switch (f.type) {
      //TODO "D", "G"
      case Q:
        assignQ(i, hasAggr, autoMode);
        break;

      case T:
        assignT(i, hasAggr, autoMode);
        break;
      case O:
        /* falls through */
      case N:
        /* falls through */
      default:
        tf[i] = f;
        assignField(i + 1, hasAggr, autoMode);
        break;
    }
  }

  var hasAggr = opt.tableTypes === 'aggregated' ? true : opt.tableTypes === 'disaggregated' ? false : null;
  assignField(0, hasAggr, AUTO);

  return output;
}
