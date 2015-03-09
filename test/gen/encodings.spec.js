/*jshint -W069 */

var expect = require('chai').expect,
  vl = require('vegalite'),
  fixture = require('../fixture');

var genEncs = require('../../src/gen/encs'),
  genEncodings = require('../../src/gen/encodings');

describe('vr.gen.encodings()', function () {
  describe('1Q', function() {
    var fields = fixture['Q'].fields,
      stats = fixture['Q'].stats;

    it('should generate no encoding if dot plots are omittted', function () {
      var encodings = genEncodings([], fields, stats, {
        omitDotPlot: true
      });
      expect(encodings.length).to.equal(0);
    });

    it('should generate encodings if dot plots are not omitted', function () {
      var encodings = genEncodings([], fields, stats, {
        omitDotPlot: false
      });
      expect(encodings.length).to.equal(2); //point and tick
    });

    it('should generate more encodings wihtout pruning', function () {
      var encodings = genEncodings([], fields, stats, {
        omitTranpose: false,
        omitDotPlot: false
      });

      // x, y ,text
      expect(encodings.length).to.equal(4);
    });
  });

  describe('OxQ', function() {
    var f = fixture['OxQ'];
    var encodings = genEncodings([], f.fields, f.stats);

    it('should not contain text table', function() {
      var hasTextTable = encodings.filter(function(encoding) {
        return encoding.marktype === 'text';
      }).length > 0;
      expect(hasTextTable).to.be.false();
    });

    it('should not contain bar', function() {
      var filtered = encodings.filter(function(encoding) {
        return encoding.marktype === 'bar';
      });
      expect(filtered.length).to.equal(0);
    });
  });

  describe('OxA(Q)', function() {
    var f = fixture['OxA(Q)'];
    var encodings = genEncodings([], f.fields, f.stats);

    it('should contain text table', function() {
      var hasTextTable = encodings.filter(function(encoding) {
        return encoding.marktype === 'text';
      }).length > 0;
      expect(hasTextTable).to.be.true();
    });
  });

  describe('O_30x#', function(){
    var f = fixture['O_30x#'];
    var encodings = genEncodings([], f.fields, f.stats);

    it('should contain text table', function() {
      var hasTextTable = encodings.filter(function(encoding) {
        return encoding.marktype === 'text';
      }).length > 0;
      expect(hasTextTable).to.be.true();
    });

    it('should contain bar', function() {
      var hasBar = encodings.filter(function(encoding) {
        return encoding.marktype === 'bar';
      }).length > 0;
      expect(hasBar).to.be.true();
    });

    // console.log('encodings O_30x#', encodings.map(function(spec){
    //   return vl.Encoding.shorthandFromSpec(spec) + ":" + spec.score;
    // }));
  });

  describe('OxQxQ', function() {
    var f = fixture['OxQxQ'];
    var encodings = genEncodings([], f.fields, f.stats);

    it('should contain colored scatter plot', function() {
      var filtered = encodings.filter(function(encoding) {
        var enc = encoding.enc;
        return encoding.marktype==='point' && enc.x && enc.y && enc.color;
      });
    });
  });

  describe('QxT', function(){
    var f = fixture['QxT'];
    var encodings = genEncodings([], f.fields, f.stats);

    it('should not contain line', function() {
      var hasLine = encodings.filter(function(encoding) {
        return encoding.marktype === 'line';
      }).length > 0;
      expect(hasLine).to.be.false();
    });
  });

  describe('QxYEAR(T)', function(){
    var f = fixture['QxYEAR(T)'];

    var encodings = genEncodings([], f.fields, f.stats);

    it('should not contain line', function() {
      var hasLine = encodings.filter(function(encoding) {
        return encoding.marktype === 'line';
      }).length > 0;
      expect(hasLine).to.be.false();
    });
  });

  describe('A(Q)xYEAR(T)', function(){
    var f = fixture['A(Q)xYEAR(T)'];
    var encodings = genEncodings([], f.fields, f.stats);

    it('should contain line', function() {
      var hasLine = encodings.filter(function(encoding) {
        return encoding.marktype === 'line';
      }).length > 0;
      expect(hasLine).to.be.true();
    });
  });

  describe('#xB(Q)', function() {
    var f = fixture['#xB(Q)'];
    var encodings = genEncodings([], f.fields, f.stats);

    it('should contain text table', function() {
      var hasTextTable = encodings.filter(function(encoding) {
        return encoding.marktype === 'text';
      }).length > 0;
      expect(hasTextTable).to.be.true();
    });
  });
});