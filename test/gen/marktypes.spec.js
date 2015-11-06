'use strict';

var expect = require('chai').expect,
  vl = require('vega-lite'),
  fixture = require('../fixture');

// var dataB = require("../data/birdstrikes.json");
var consts = require('../../src/consts');
var getMarkTypes = require('../../src/gen/marktypes');

describe('cp.gen.marktypes()', function(){
  var opt;

  beforeEach(function() {
    opt = vl.schema.util.extend({}, consts.gen.encodings);
  });

  describe('#', function () {
    var f;

    beforeEach(function() {
      f = fixture['#'];
    });

    it('should generate point and bar', function() {
      var encoding = {x: f.fields[0]},
        markTypes = getMarkTypes(encoding, f.stats, opt);

      expect(markTypes.length).to.eql(2);
      expect(markTypes).to.eql(['point', 'bar']);
    });
  });

  describe('1Q', function () {
    var encoding, marktypes;
    beforeEach(function() {
      encoding = {"x": {"name": "Cost__Total_$","type": "Q"}};
      marktypes = getMarkTypes(encoding, {}, opt);
    });
    it('should contain tick', function () {
      expect(marktypes.indexOf('tick')).to.gt(-1);
    });
    it('should contain point', function () {
      expect(marktypes.indexOf('point')).to.gt(-1);
    });
  });

  it('should require at least one basic encoding', function (){
    // var basicEncodings = ['x','y','geo','text','arc'];
    // FIXME(kanitw): Jul 19, 2015 - write test

  });

  describe('point', function(){
    describe('scatter and bubble plots', function(){
      //TODO
    });

    describe('dot plot', function(){
      //TODO
    });
  });

  describe('bar', function () {
    describe('with stacked average', function () {
      it('should not be generated', function () {
        var encoding = {
          "color": {"selected": true,"name": "When__Phase_of_flight","type": "O"},
          "x": {"name": "Cost__Total_$","type": "Q","aggregate": "mean"},
          "y": {"selected": undefined,"name": "Aircraft__Airline_Operator","type": "O"}
        };

        var marktypes = getMarkTypes(encoding, {}, opt);
        expect(marktypes.indexOf('bar')).to.equal(-1);
      });
    });

    describe('with stacked sum', function () {
      it('should not be generated', function () {
        var encoding = {
          "color": {"selected": true,"name": "When__Phase_of_flight","type": "O"},
          "x": {"name": "Cost__Total_$","type": "Q","aggregate": "sum"},
          "y": {"selected": undefined,"name": "Aircraft__Airline_Operator","type": "O"}
        };
        var marktypes = getMarkTypes(encoding, {}, opt);
        expect(marktypes.indexOf('bar')).to.gt(-1);
      });
    });
  });

  describe('line/area', function () {
    // TODO
  });

  describe('text', function() {
    it('should be generated', function () {
      var shorthand = 'row=1,O|text=mean_2,Q',
        encoding = vl.enc.fromShorthand(shorthand),
        marktypes = getMarkTypes(encoding, {}, opt);
      expect(marktypes.indexOf('text')).to.gt(-1);
    });

    it('should not contain size', function() {
      var encoding = {
        "col": {
          "name": "Effect__Amount_of_damage",
          "type": "O",
        },
        "size": {
          "name": "Cost__Repair","type": "Q","aggregate": "mean"
        },
        "text": {
          "name": "Cost__Total_$","type": "Q","aggregate": "mean"
        }
      };

      var marktypes = getMarkTypes(encoding, {}, opt);

      expect(marktypes.indexOf('text')).to.equal(-1);
    });
  });
});


