import {expect} from 'chai';
import {fixture} from '../fixture';
import {Type} from 'vega-lite/src/type';
import * as consts from '../../src/consts';

import * as def from '../../src/transition/def'
import * as neighbor from '../../src/transition/neighbor';
import * as path from '../../src/transition/path';
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

describe('cp.transition.path', function () {
  var markTransitions = def.DEFAULT_MARKTYPE_TRANSITIONS;

  describe('marktype transition', function () {
    it('should return a marktype transition correctly.', function () {
      expect(path.marktypeTransitionSet(startVL, destinationVL)[0].cost).to.eq(markTransitions["AREA_POINT"].cost); //AREA_POINT
    });
  });

  describe('transform transition', function () {
    it('should return SCALE,AGGREGATE, and SORT transitions correctly.', function () {
      expect(path.transformBasic(startVL, destinationVL, "y", "scale").cost).to.eq(def.DEFAULT_TRANSFORM_TRANSITIONS["SCALE"].cost);
      expect(path.transformBasic(startVL, destinationVL, "y", "aggregate").cost).to.eq(def.DEFAULT_TRANSFORM_TRANSITIONS["AGGREGATE"].cost);
      expect(path.transformBasic(startVL, destinationVL, "y", "sort")).to.eq(undefined);
    });
    it('should return FILTER transition correctly.', function () {
      expect(path.transformFilter(startVL, destinationVL).name).to.eq("FILTER");
    });
    it('should return SETTYPE transition correctly.', function () {
      expect(path.transformSettype(startVL, destinationVL, "color"  ).name).to.eq("SETTYPE");
    });

    it('should return all transitions without order.', function(){
      expect(path.transformTransitionSet(startVL, destinationVL).length).to.eq(4);
    });
  });

  describe.only('encoding transition', function(){
    it('should return all encoding transitions', function () {
      var source = {
        "data": {"url": "data/cars.json"},
        "mark": "point",
        "encoding": {
          "x": {"field": "Horsepower", "type": "quantitative"}
        }
      };
      var target1 = util.duplicate(source);
      target1.encoding.y = {"field": "Origin", "type": "ordinal"};
      var target2 = util.duplicate(target1);
      delete target2.encoding.x;
      target2.encoding.color = {"field": "Horsepower", "type": "quantitative"};

      var result1 = path.encodingTransitionSet(source, target1);
      var result2 = path.encodingTransitionSet(source, target2);
      var result3 = path.encodingTransitionSet(startVL, destinationVL);

      expect(result1.distance).to.eq(1);
      expect(result2.distance).to.eq(2);
      expect(result3.distance).to.eq(2);

      console.log(result3.prev.map(function(s){ return s.spec.encoding; }));
    });
  })
});

describe('cp.transition.neighbor', function () {
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

    expect(result.length).to.eq(8);
  });
});
