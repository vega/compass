'use strict';

import * as vlFieldDef from 'vega-lite/src/fielddef';
import * as vlSchemaUtil from 'vega-lite/src/schema/schemautil';
import * as vlShorthand from 'vega-lite/src/shorthand';

import * as consts from '../consts';

var TYPE = consts.Type;

import * as util from '../util';

var AUTO = '*';

export default function genAggregates(output, fieldDefs, stats, opt?) {
  opt = vlSchemaUtil.extend(opt||{}, consts.gen.aggregates);
  var tf = new Array(fieldDefs.length);
  var hasNorO = util.any(fieldDefs, function(f) {
    return f.type === TYPE.Nominal || f.type === TYPE.Ordinal;
  });

  function emit(fieldSet) {
    fieldSet = util.duplicate(fieldSet);
    fieldSet.key = fieldSet.map(function(fieldDef) {
      return vlShorthand.shortenFieldDef(fieldDef);
    }).join(vlShorthand.DELIM);
    output.push(fieldSet);
  }

  function checkAndPush() {
    if (opt.omitMeasureOnly || opt.omitDimensionOnly) {
      var hasMeasure = false, hasDimension = false, hasRaw = false;
      tf.forEach(function(f) {
        if (vlFieldDef.isDimension(f)) {
          hasDimension = true;
        } else {
          hasMeasure = true;
          if (!f.aggregate) { hasRaw = true; }
        }
      });
      if (!hasDimension && !hasRaw && opt.omitMeasureOnly) { return; }
      if (!hasMeasure) {
        if (opt.addCountForDimensionOnly) {
          tf.push(vlFieldDef.count());
          emit(tf);
          tf.pop();
        }
        if (opt.omitDimensionOnly) { return; }
      }
    }
    if (opt.omitDotPlot && tf.length === 1) { return; }
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
    var f = fieldDefs[i],
      canHaveAggr = hasAggr === true || hasAggr === null;

    tf[i] = {field: f.field, type: f.type};

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

      if ((!opt.consistentAutoQ || util.isin(autoMode, [AUTO, 'bin', 'cast', 'autocast'])) && !hasNorO) {
        var highCardinality = vlFieldDef.cardinality(f, stats) > opt.minCardinalityForBin;

        var isAuto = opt.genDimQ === 'auto',
          genBin = opt.genDimQ  === 'bin' || (isAuto && highCardinality),
          genCast = opt.genDimQ === 'cast' || (isAuto && !highCardinality);

        if (genBin && util.isin(autoMode, [AUTO, 'bin', 'autocast'])) {
          assignBinQ(i, hasAggr, isAuto ? 'autocast' : 'bin');
        }
        if (genCast && util.isin(autoMode, [AUTO, 'cast', 'autocast'])) {
          tf[i].type = TYPE.Ordinal;
          assignField(i + 1, hasAggr, isAuto ? 'autocast' : 'cast');
          tf[i].type = TYPE.Quantitative;
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
    var f = fieldDefs[i];
    tf[i] = {field: f.field, type: f.type};

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
    if (i === fieldDefs.length) { // If all fields are assigned
      checkAndPush();
      return;
    }

    var f = fieldDefs[i];
    // Otherwise, assign i-th field
    switch (f.type) {
      // TODO: "D", "G"
      case TYPE.Quantitative:
        assignQ(i, hasAggr, autoMode);
        break;

      case TYPE.Temporal:
        assignT(i, hasAggr, autoMode);
        break;
      case TYPE.Ordinal:
        /* falls through */
      case TYPE.Nominal:
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
