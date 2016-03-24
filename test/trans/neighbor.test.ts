import {expect} from 'chai';
import {fixture} from '../fixture';
import {Type} from 'vega-lite/src/type';
import * as consts from '../../src/consts';

import * as def from '../../src/trans/def'
import * as neighbor from '../../src/trans/neighbor';
import * as path from '../../src/trans/trans';
import * as util from '../../src/util';
import {FieldDef} from 'vega-lite/src/fielddef';
import {AggregateOp} from 'vega-lite/src/aggregate';

describe('cp.trans.neighbor', function () {
  it('should return all neighbors linked by encdoeTransition.', function () {
    var testVL = {
      "data": {"url": "data/cars.json"},
      "mark": "tick",
      "encoding": {
        "x": {"field": "Horsepower", "type": "quantitative"}
      }
    };
    var additionalFields: FieldDef[] = [ {"field": "Origin", "type": Type.ORDINAL} ];
    var additionalChannels = ["y"];
    var result = neighbor.neighbors(testVL, additionalFields, additionalChannels, def.DEFAULT_ENCODING_TRANSITIONS );

    expect(result.length).to.eq(4);
  });

  it('should return neighbors with _COUNT transitions correctly', function () {
    var testVL = {
      "data": {"url": "data/cars.json"},
      "mark": "tick",
      "encoding": {
        "x": {"field": "*", "type": "quantitative", "aggregate":"count" }
      }
    };
    var additionalFields: FieldDef[] = [ {"field": "*", "type": Type.QUANTITATIVE, "aggregate":AggregateOp.COUNT } ];
    var additionalChannels = ["y"];
    var result = neighbor.neighbors(testVL, additionalFields, additionalChannels, def.DEFAULT_ENCODING_TRANSITIONS );

    expect(result[0].transition).to.eq(def.DEFAULT_ENCODING_TRANSITIONS["REMOVE_X_COUNT"]);
    expect(result[1].transition).to.eq(def.DEFAULT_ENCODING_TRANSITIONS["MODIFY_X"]);
    expect(result[3].transition).to.eq(def.DEFAULT_ENCODING_TRANSITIONS["ADD_Y_COUNT"]);
  });
  it('should return only a neighbor with SWAP_X_Y transitions', function () {
    var testVL = {
      "encoding": {
      "column": {"field": "Cylinders","type": "ordinal"},
      "x": {
        "field": "Origin", "type": "nominal",
        "axis": {"labels": false, "title": "", "tickSize": 0}
      },
      "y": {"scale": 'hey', "aggregate": "mean", "field": "Acceleration", "type": "quantitative"},
    }
  };
    var additionalFields: FieldDef[] = [ ];
    var additionalChannels = [];
    var result = neighbor.neighbors(testVL, additionalFields, additionalChannels, def.DEFAULT_ENCODING_TRANSITIONS );

    expect(result[2].transition).to.eq(def.DEFAULT_ENCODING_TRANSITIONS["SWAP_X_Y"]);
    expect(result.length).to.eq(4);

  });
  it('should return neighbors regardless redundant additionalFields', function () {
    var testVL = {
      "encoding": {
        "x": {
          "type": "quantitative",
          "field": "Acceleration",
          "bin": true
        },
        "y": {
          "type": "quantitative",
          "field": "*",
          "scale": {"type": "log"},
          "aggregate": "count"
        }
      }
    };
    var additionalFields: FieldDef[] = [
      {"field": "Acceleration", "type": Type.QUANTITATIVE},
      {"field": "Horsepower", "type": Type.QUANTITATIVE} ];
    var additionalChannels = [];
    var result = neighbor.neighbors(testVL, additionalFields, additionalChannels, def.DEFAULT_ENCODING_TRANSITIONS );


    expect(result.length).to.eq(7);

  });
});
