'use strict';

var expect = require('chai').expect,
  vl = require('vega-lite');

// var dataB = require("../data/birdstrikes.json");
var getMarkTypes = require('../../src/gen/marktypes');

describe('cp.gen.marktypes()', function(){
  describe('1Q', function () {
    var enc = {"x": {"name": "Cost__Total_$","type": "Q"}};
    var marktypes = getMarkTypes(enc);
    it('should contain tick', function () {
      expect(marktypes.indexOf('tick')).to.gt(-1);
    });
    it('should contain point', function () {
      expect(marktypes.indexOf('point')).to.gt(-1);
    });
  });

  it('should require at least one basic encoding', function (){
    var basicEncodings = ['x','y','geo','text','arc'];
    // TODO

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
        var enc = {
          "color": {"selected": true,"name": "When__Phase_of_flight","type": "O"},
          "x": {"name": "Cost__Total_$","type": "Q","aggregate": "avg"},
          "y": {"selected": undefined,"name": "Aircraft__Airline_Operator","type": "O"}
        };
        var marktypes = getMarkTypes(enc);
        expect(marktypes.indexOf('bar')).to.equal(-1);
      });
    });

    describe('with stacked sum', function () {
      it('should not be generated', function () {
        var enc = {
          "color": {"selected": true,"name": "When__Phase_of_flight","type": "O"},
          "x": {"name": "Cost__Total_$","type": "Q","aggregate": "sum"},
          "y": {"selected": undefined,"name": "Aircraft__Airline_Operator","type": "O"}
        };
        var marktypes = getMarkTypes(enc);
        expect(marktypes.indexOf('bar')).to.gt(-1);
      });
    });
  });

  describe('line/area', function () {
    // TODO
  });

  describe('text', function() {
    it('should be generated', function () {
      var shorthand = 'row=1,O|text=avg_2,Q',
        enc = vl.enc.fromShorthand(shorthand),
        marktypes = getMarkTypes(enc);
      expect(marktypes.indexOf('text')).to.gt(-1);
    });

    it('should not contain size', function() {
      var enc = {
        "col": {
          "name": "Effect__Amount_of_damage",
          "type": "O",
        },
        "size": {
          "name": "Cost__Repair","type": "Q","aggregate": "avg"
        },
        "text": {
          "name": "Cost__Total_$","type": "Q","aggregate": "avg"
        }
      };

      var marktypes = getMarkTypes(enc);

      expect(marktypes.indexOf('text')).to.equal(-1);
    });
  });
});


