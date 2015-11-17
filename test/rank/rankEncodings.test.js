'use strict';
/*jshint -W069 */

var expect = require('chai').expect,
  vl = require('vega-lite'),
  fixture = require('../fixture'),
  setter = vl.setter;


var consts = require('../../src/consts'),
  rankEncodings = require('../../src/rank/rank').encoding,
  dimensionScore = rankEncodings.dimensionScore,
  measureScore = rankEncodings.measureScore,
  D = dimensionScore.consts,
  M = measureScore.consts,
  opt = vl.schema.util.extend(opt||{}, consts.gen.encodings);

describe('cp.rank.encoding', function () {
  var marktypes = consts.gen.encodings.properties.marktypeList.default;
  var encTypes = ['x', 'y', 'row', 'col', 'size', 'color', 'shape', 'text', 'detail'];
  var dFixtures = ['O', 'O_15', 'O_30', 'BIN(Q)'],
    mFixtures = ['Q'];


  var score = {};
  marktypes.forEach(function(marktype) {
    encTypes.forEach(function(encType) {
      mFixtures.forEach(function(q) {
        var Qf = fixture[q];
        setter(score, [q, marktype, encType], measureScore(Qf.fields[0], encType, marktype, Qf.stats, opt));
      });

      dFixtures.forEach(function(o) {
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
        expect(score.Q.point.x).to.gt(score.Q.point.text);
        expect(score.Q.point.x).to.gt(score.Q.point.detail);
      });
    });

    describe('size', function () {
      it('>= color, text', function () {
        expect(score.Q.point.size).to.gt(score.Q.point.color);
        expect(score.Q.point.size).to.gt(score.Q.point.text);
        expect(score.Q.point.size).to.gt(score.Q.point.detail);
      });
    });

    describe('color', function () {
      it('>= text', function () {
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
        expect(score.O.point.x).to.gt(score.O.point.text);
        expect(score.O.point.x).to.gt(score.O.point.detail);
      });
    });

    describe('color', function () {
      it('>= shape, detail', function () {
        expect(score.O.point.color).to.gt(score.O.point.shape);
        expect(score.O.point.color).to.gt(score.O.point.detail);
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
        expect(score['BIN(Q)'].point.color).to.lt(score.O.point.color);
      });

      it('BIN(Q) is bad', function (){
        expect(score['BIN(Q)'].point.color).to.equal(D.color_bad);
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
    it('color(O) > size(Q)', function (){
      expect(score.O.point.color).to.gt(score.Q.point.size);
    });

    it('D.facet_ok < M.size', function() {
      expect(D.facet_ok).to.lt(M.size);
    });
  });

  describe('rankEncodings()', function() {

    describe('B(Q)xB(Q)x#', function () {
      var f = fixture['B(Q)xB(Q)x#'];
      var bp = {
        marktype: 'point',
        encoding: {
          x: f.fields[0],
          y: f.fields[1],
          color: f.fields[2] //count
        }
      };

      var sb = {
        marktype: 'bar',
        encoding: {
          x: f.fields[0],
          y: f.fields[2], // count
          color: f.fields[1]
        }
      };

      var bpScore = rankEncodings(bp, f.stats),
        sbScore = rankEncodings(sb, f.stats);

      it('bubble plot > stacked bar', function () {
        expect(bpScore.score).to.gt(sbScore.score);
      });
    });

    describe('text tables', function() {
      it('\'s text and color score should be merged', function () {
        var encoding = {
          "marktype": "text",
          "encoding": {
            "col": {"name": "Aircraft__Airline_Operator","type": "ordinal"},
            "text": {"name": "*","aggregate": "count","type": "quantitative"},
            "color": {"name": "*","aggregate": "count","type": "quantitative"}
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