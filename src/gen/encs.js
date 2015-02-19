"use strict";

var vl = require('vegalite'),
  globals = require('../globals'),
  util = require('../util'),
  consts = require('../consts');

module.exports = genEncs;

var rules = {
  x: {
    dataTypes: vl.dataTypes.O + vl.dataTypes.Q + vl.dataTypes.T,
    multiple: true //FIXME should allow multiple only for Q, T
  },
  y: {
    dataTypes: vl.dataTypes.O + vl.dataTypes.Q + vl.dataTypes.T,
    multiple: true //FIXME should allow multiple only for Q, T
  },
  row: {
    dataTypes: vl.dataTypes.O,
    multiple: true,
  },
  col: {
    dataTypes: vl.dataTypes.O,
    multiple: true
  },
  shape: {
    dataTypes: vl.dataTypes.O
  },
  size: {
    dataTypes: vl.dataTypes.Q
  },
  color: {
    dataTypes: vl.dataTypes.O + vl.dataTypes.Q
  },
  alpha: {
    dataTypes: vl.dataTypes.Q
  },
  text: {
    dataTypes: ANY_DATA_TYPES
  },
  detail: {
    dataTypes: ANY_DATA_TYPES
  }
  //geo: {
  //  dataTypes: [vl.dataTypes.G]
  //},
  //arc: { // pie
  //
  //}
};

function maxCardinality(field, stats) {
  return stats[field].cardinality <= 20;
}

function generalRules(enc, opt) {
  // need at least one basic encoding
  if (enc.x || enc.y || enc.geo || enc.text || enc.arc) {

    if (enc.x && enc.y) {
      // show only one OxO, QxQ
      if (opt.omitTranpose && enc.x.type == enc.y.type) {
        //TODO better criteria than name
        if (enc.x.name > enc.y.name) return false;
      }
    }

    if (enc.row || enc.col) { //have facet(s)
      // don't use facets before filling up x,y
      if ((!enc.x || !enc.y)) return false;

      if (opt.omitNonTextAggrWithAllDimsOnFacets) {

        // remove all aggregated charts (except text tables) with all dims on facets (row, col)

        var hasAggr = false, hasOtherO = false;
        for (var encType in enc) {
          var field = enc[encType];
          if (field.aggr) {
            hasAggr = true;
          }
          if (util.isDim(field) && (encType !== 'row' && encType !== 'col')) {
            hasOtherO = true;
          }
          if (hasAggr && hasOtherO) break;
        }

        if (hasAggr && !hasOtherO) return false;
      }
    }

    // one dimension "count" is useless
    if (enc.x && enc.x.aggr == 'count' && !enc.y) return false;
    if (enc.y && enc.y.aggr == 'count' && !enc.x) return false;

    return true;
  }
  return false;
}

function genEncs(encs, fields, stats, opt) {
  opt = vl.schema.util.extend(opt||{}, consts.gen.encodings);
  // generate a collection vegalite's enc
  var tmpEnc = {};

  function assignField(i) {
    // If all fields are assigned, save
    if (i === fields.length) {
      // at the minimal all chart should have x, y, geo, text or arc
      if (generalRules(tmpEnc, opt)) {
        encs.push(vl.duplicate(tmpEnc));
      }
      return;
    }

    // Otherwise, assign i-th field
    var field = fields[i];
    for (var j in vl.encodingTypes) {
      var et = vl.encodingTypes[j];

      //TODO: support "multiple" assignment
      if (!(et in tmpEnc) && // encoding not used
        (rules[et].dataTypes & vl.dataTypes[field.type]) > 0 &&
        (!rules[et].rules || !rules[et].rules(field, stats))
        ) {
        tmpEnc[et] = field;
        assignField(i + 1);
        delete tmpEnc[et];
      }
    }
  }

  assignField(0);

  return encs;
}
