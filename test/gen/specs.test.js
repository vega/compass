'use strict';

/*jshint -W069 */

var expect = require('chai').expect,
  fixture = require('../fixture');

var genSpecs = require('../../src/gen/specs');

describe('cp.gen.encodings()', function () {
  describe('#', function () {
    var f = fixture['#'];

    it('should generate two encodings', function() {
      var specs = genSpecs([], f.fields, f.stats);
      expect(specs.length).to.eql(2);
      expect(specs[0].encoding.x).to.be.ok;
    });
  });

  describe('1Q', function() {
    var fields = fixture['Q'].fields,
      stats = fixture['Q'].stats;

    it('should generate no encoding if dot plots are omittted', function () {
      var specs = genSpecs([], fields, stats, {
        omitDotPlot: true
      });
      expect(specs.length).to.equal(0);
    });

    it('should generate encodings if dot plots are not omitted', function () {
      var specs = genSpecs([], fields, stats, {
        omitDotPlot: false
      });
      expect(specs.length).to.equal(2); //point and tick
    });

    it('should generate more encodings without pruning', function () {
      var specs = genSpecs([], fields, stats, {
        omitTranpose: false,
        omitDotPlot: false
      });

      // x, y ,text
      expect(specs.length).to.equal(4);
    });
  });

  describe('OxQ', function() {
    var f = fixture['OxQ'];
    var specs = genSpecs([], f.fields, f.stats);

    it('should not contain text table', function() {
      var hasTextTable = specs.filter(function(spec) {
        return spec.marktype === 'text';
      }).length > 0;
      expect(hasTextTable).to.be.false;
    });

    it('should not contain bar', function() {
      var filtered = specs.filter(function(spec) {
        return spec.marktype === 'bar';
      });
      expect(filtered.length).to.equal(0);
    });
  });

  describe('OxA(Q)', function() {
    var f = fixture['OxA(Q)'];
    var specs = genSpecs([], f.fields, f.stats);

    it('should contain text table', function() {
      var hasTextTable = specs.filter(function(spec) {
        return spec.marktype === 'text';
      }).length > 0;
      expect(hasTextTable).to.be.true;
    });
  });

  describe('O_30x#', function(){
    var f = fixture['O_30x#'];
    var specs = genSpecs([], f.fields, f.stats);

    it('should contain text table', function() {
      var hasTextTable = specs.filter(function(spec) {
        return spec.marktype === 'text';
      }).length > 0;
      expect(hasTextTable).to.be.true;
    });

    it('should contain bar', function() {
      var hasBar = specs.filter(function(spec) {
        return spec.marktype === 'bar';
      }).length > 0;
      expect(hasBar).to.be.true;
    });

    // console.log('encodings O_30x#', encodings.map(function(spec){
    //   return vl.Encoding.shorthandFromSpec(spec) + ":" + spec.score;
    // }));
  });

  describe('OxQxQ', function() {
    // var f = fixture['OxQxQ'];
    // var encodings = genEncodings([], f.fields, f.stats);

    it('should contain colored scatter plot', function() {
      // var filtered = encodings.filter(function(encoding) {
      //   var enc = encoding.encoding;
      //   return encoding.marktype==='point' && enc.x && enc.y && enc.color;
      // });
      // FIXME(kanitw): Jul 19, 2015 - write test!
    });
  });

  describe('QxT', function(){
    var f = fixture['QxT'];
    var specs = genSpecs([], f.fields, f.stats);

    it('should not contain line', function() {
      var hasLine = specs.filter(function(spec) {
        return spec.marktype === 'line';
      }).length > 0;
      expect(hasLine).to.be.false;
    });
  });

  describe('QxYEAR(T)', function(){
    var f = fixture['QxYEAR(T)'];

    var specs = genSpecs([], f.fields, f.stats);

    it('should not contain line', function() {
      var hasLine = specs.filter(function(spec) {
        return spec.marktype === 'line';
      }).length > 0;
      expect(hasLine).to.be.false;
    });
  });

  describe('A(Q)xYEAR(T)', function(){
    var f = fixture['A(Q)xYEAR(T)'];
    var specs = genSpecs([], f.fields, f.stats);

    it('should contain line', function() {
      var hasLine = specs.filter(function(spec) {
        return spec.marktype === 'line';
      }).length > 0;
      expect(hasLine).to.be.true;
    });
  });

  describe('#xB(Q)', function() {
    var f = fixture['#xB(Q)'];
    var specs = genSpecs([], f.fields, f.stats);

    it('should contain text table', function() {
      var hasTextTable = specs.filter(function(spec) {
        return spec.marktype === 'text';
      }).length > 0;
      expect(hasTextTable).to.be.true;
    });
  });
});