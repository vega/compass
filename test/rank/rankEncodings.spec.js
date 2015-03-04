/*jshint -W069 */

var expect = require('chai').expect,
  vl = require('vegalite'),
  fixture = require('../fixture'),
  setter = vl.setter;

var consts = require('../../src/consts'),
  rankEncodings = require('../../src/rank/rank').encoding,
  dimensionScore = rankEncodings.dimensionScore,
  measureScore = rankEncodings.measureScore,
  opt = vl.schema.util.extend(opt||{}, consts.gen.encodings);

describe('vr.rank.encoding', function () {
  var marktypes = consts.gen.encodings.properties.marktypeList.default;
  var encTypes = ['x', 'y', 'row', 'col', 'size', 'color', 'shape', 'alpha', 'text', 'detail'];
  var oFixtures = ['O', 'O_15', 'O_30'],
    qFixtures = ['Q', 'BIN(Q)'];


  var score = {};
  marktypes.forEach(function(marktype) {
    encTypes.forEach(function(encType) {
      qFixtures.forEach(function(q) {
        var Qf = fixture[q];
        setter(score, [q, marktype, encType], measureScore(Qf.fields[0], encType, marktype, Qf.stats, opt));
      });

      oFixtures.forEach(function(o) {
        var Of = fixture[o];
        setter(score, [o, marktype, encType], dimensionScore(Of.fields[0], encType, marktype, Of.stats, opt));
      });
    });
  });

  describe('measureScore()', function () {
    describe('position', function () {
      it('>= *', function () {
        expect(score.Q.point.x).to.gt(score.Q.point.row);
        expect(score.Q.point.x).to.gt(score.Q.point.size);
        expect(score.Q.point.x).to.gt(score.Q.point.color);
        expect(score.Q.point.x).to.gt(score.Q.point.alpha);
        expect(score.Q.point.x).to.gt(score.Q.point.text);
        expect(score.Q.point.x).to.gt(score.Q.point.detail);
      });
    });

    describe('size', function () {
      it('>= color, alpha, text', function () {
        expect(score.Q.point.size).to.gt(score.Q.point.color);
        expect(score.Q.point.size).to.gt(score.Q.point.alpha);
        expect(score.Q.point.size).to.gt(score.Q.point.text);
        expect(score.Q.point.size).to.gt(score.Q.point.detail);
      });
    });

    describe('color', function () {
      it('>= alpha, text', function () {
        expect(score.Q.point.color).to.gt(score.Q.point.alpha);
        expect(score.Q.point.color).to.gt(score.Q.point.text);
        expect(score.Q.point.color).to.gt(score.Q.point.detail);
      });
    });

    // FIXME write test for bar cases
  });

  describe('dimensionScore()', function () {
    describe('x', function () {
      it('>= *', function () {
        expect(score.O.point.x).to.gt(score.O.point.row);
        expect(score.O.point.x).to.gt(score.O.point.size);
        expect(score.O.point.x).to.gt(score.O.point.color);
        expect(score.O.point.x).to.gt(score.O.point.alpha);
        expect(score.O.point.x).to.gt(score.O.point.text);
        expect(score.O.point.x).to.gt(score.O.point.detail);
      });
    });

    describe('color', function () {
      it('>= shape, detail, alpha', function () {
        expect(score.O.point.color).to.gt(score.O.point.shape);
        expect(score.O.point.color).to.gt(score.O.point.detail);
        expect(score.O.point.color).to.gt(score.O.point.alpha);
      });

      it('< detail if cardinality above 20', function () {
        expect(score.O_30.point.color).to.lt(score.O_30.point.detail);
      });

      it('for bar/area < for point', function() {
        expect(score.O.bar.color).to.lt(score.O.point.color);
        expect(score.O.area.color).to.lt(score.O.point.color);
      });

      it('for BIN(Q) < for O', function() {
        expect(score['BIN(Q)'].area.color).to.lt(score.O.point.color);
      });
    });

    describe('shape', function () {
      it('>= detail, text', function () {
        expect(score.O.point.shape).to.gt(score.O.point.detail);
        expect(score.O.point.shape).to.gt(score.O.point.text);
      });

      it('< detail if cardinality above 15', function () {
        expect(score.O_15.point.shape).to.lt(score.O_15.point.detail);
      });
    });

  });

  describe('score()', function () {
    it('color(O) > size(Q)', function () {
      expect(score.O.point.color).to.gt(score.Q.point.size);
    });
  });

  describe('rankEncodings()', function() {
    describe('text tables', function() {
      it('\'s text and color score should be merged', function () {
        var encoding = {
          "marktype": "text",
          "enc": {
            "col": {"name": "Aircraft__Airline_Operator","type": "O"},
            "text": {"name": "*","aggr": "count","type": "Q"},
            "color": {"name": "*","aggr": "count","type": "Q"}
          }
        };
        var score = rankEncodings(encoding, {
          Aircraft__Airline_Operator: {cardinality: 10},
          count: 15
        });


        expect(score.features.length).to.equal(3);
      });
    });
  });
});