var expect = require('chai').expect,
  vl = require('vegalite');

// var dataB = require("../data/birdstrikes.json");
var getMarkTypes = require('../../src/gen/marktypes');

describe('vr.gen.marktypes()', function(){
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
    // TODO
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


