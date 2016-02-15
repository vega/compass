import {expect} from 'chai';
import {fixture} from '../fixture';
import * as consts from '../../src/consts';

import * as def from '../../src/transition/def'
import * as path from '../../src/transition/path';

var startVL =
{
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
describe.only('cp.transition.path', function () {
  var markTransitions = def.DEFAULT_MARKTYPE_TRANSITIONS;

  describe('marktype transition', function () {
    it('should return a marktype transition correctly.', function () {
      expect(path.marktypePath(startVL, destinationVL)[0].cost).to.eq(markTransitions["AREA_POINT"].cost); //AREA_POINT
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
      console.log(path.transformPath(startVL, destinationVL));
      expect(path.transformPath(startVL, destinationVL).length).to.eq(4);
    });
  });

  // describe('overall transitions', function(){
  //   it('should return all transitions without order.', function(){
  //
  //   })
  // })

});
