var expect = require('chai').expect,
  vl = require('vegalite');

// var dataB = require("../data/birdstrikes.json");
var getMarkTypes = require('../../src/gen/marktypes');

describe('vr.gen.marktypes()', function(){
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
          "x": {"name": "Cost__Total_$","type": "Q","aggr": "avg"},
          "y": {"selected": false,"name": "Aircraft__Airline_Operator","type": "O"}
        };
        var marktypes = getMarkTypes(enc);
        expect(marktypes.indexOf('bar')).to.equal(-1);
      });
    });

    describe('with stacked sum', function () {
      it('should not be generated', function () {
        var enc = {
          "color": {"selected": true,"name": "When__Phase_of_flight","type": "O"},
          "x": {"name": "Cost__Total_$","type": "Q","aggr": "sum"},
          "y": {"selected": false,"name": "Aircraft__Airline_Operator","type": "O"}
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
    var shorthand = 'row=1,O|text=avg_2,Q',
      enc = vl.enc.parseShorthand(shorthand),
      marktypes = getMarkTypes(enc);

    it('should be generated', function () {
      expect(marktypes.indexOf('text')).to.gt(-1);
    });
  });
});


