var chai = require('chai'),
  assert = chai.assert,
  vgn = require('../src/visgen.js');

var dataB = require("../data/birdstrikes.json");

console.log(dataB[0]);

describe('marksRule', function(){
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

});


