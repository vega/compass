import {expect} from 'chai';
import {fixture} from '../fixture';
import {Type} from 'vega-lite/src/type';
import * as consts from '../../src/consts';

import * as def from '../../src/trans/def'
import * as neighbor from '../../src/trans/neighbor';
import * as path from '../../src/trans/trans';
import * as util from '../../src/util';
import {SchemaField} from '../../src/schema';

var startVL = {
  "data": { "url": "/data/cars.json" },
  "mark": "area",
  "transform": {"filter": "datum.Year > 1970 "},
  "encoding": {
    "x": { "type": "temporal", "field": "Year", "timeUnit": "year" },
    "y": { "type": "quantitative",
           "field": "*",
            "aggregate": "count",
            "scale": false
      },
    "color": { "type": "nominal", "field": "Origin" }
  }
};

var destinationVL = {
  "data": { "url": "/data/cars.json" },
  "mark": "point",
  "encoding": {
    "x": { "type": "quantitative", "field": "Horsepower" },
    "y": {
      "type": "quantitative",
      "field": "Acceleration",
      "scale": {"type": "log"}
    },
    "color": {"type": "ordinal", "field":"Origin"}
  }
};

describe('cp.trans.neighbor', function () {
  it('should return all neighbors linked by encdoeTransition.', function () {
    var testVL = {
      "data": {"url": "data/cars.json"},
      "mark": "tick",
      "encoding": {
        "x": {"field": "Horsepower", "type": "quantitative"}
      }
    };
    var remainedFields: SchemaField[] = [ {"field": "Origin", "type": Type.ORDINAL} ];
    var remainedChannels = ["y"];
    var result = neighbor.neighbors(testVL, remainedFields, remainedChannels );

    expect(result.length).to.eq(4);
  });
});
