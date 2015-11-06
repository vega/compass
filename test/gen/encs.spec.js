'use strict';

/*jshint -W069 */

var expect = require('chai').expect,
  vl = require('vega-lite'),
  fixture = require('../fixture');

var genEncodings = require('../../src/gen/encs');
var consts = require('../../src/consts');

describe('cp.gen.encs()', function () {
  var opt;

  beforeEach(function() {
    opt = vl.schema.util.extend({}, consts.gen.encodings);
  });

  describe('#', function () {
    var f;

    beforeEach(function() {
      f = fixture['#'];
    });

    it('should generate one encodings', function() {
      var encodings = genEncodings([], f.fields, f.stats, opt);
      expect(encodings.length).to.eql(1);
      expect(encodings[0].x).to.be.ok;
    });
  });

  describe('1Q,', function() {
    //FIXME write tests
  });

  describe('#xB(Q)', function() {
    var f, encodings, encShorthands;
    beforeEach(function() {
      f = fixture['#xB(Q)'];
      encodings = genEncodings([], f.fields, f.stats, opt);
      encShorthands = encodings.map(vl.enc.shorthand);
    });

    it('should show only vertical bar/plots', function() {
      expect(encShorthands.indexOf('x=count_*,Q|y=bin_2,Q')).to.equal(-1);
      expect(encShorthands.indexOf('x=bin_2,Q|y=count_*,Q')).to.gt(-1);
    });

  });

  describe('#xT', function() {
    var f, encodings, encShorthands;
    beforeEach(function() {
      f = fixture['#xT'];
      encodings = genEncodings([], f.fields, f.stats, opt);
      encShorthands = encodings.map(vl.enc.shorthand);
    });

    it('should show only vertical bar/plots', function() {
      expect(encShorthands.indexOf('x=count_*,Q|y=2,T')).to.equal(-1);
      expect(encShorthands.indexOf('x=2,T|y=count_*,Q')).to.gt(-1);
    });
  });

  describe('#xYR(T)', function() {
    var f, encodings, encShorthands;
    beforeEach(function() {
      f = fixture['#xYR(T)'];
      encodings = genEncodings([], f.fields, f.stats, opt);
      encShorthands = encodings.map(vl.enc.shorthand);
    });

    it('should show only vertical bar/plots', function() {
      expect(encShorthands.indexOf('x=count_*,Q|y=year_2,T')).to.equal(-1);
      expect(encShorthands.indexOf('x=year_2,T|y=count_*,Q')).to.gt(-1);
    });
  });

  describe('QxT', function () {
    var f, encodings, encShorthands;
    beforeEach(function() {
      f = fixture['QxT'];
      encodings = genEncodings([], f.fields, f.stats, opt);
      encShorthands = encodings.map(vl.enc.shorthand);
    });
    it('should show only vertical bar/plots', function() {
      expect(encShorthands.indexOf('x=1,Q|y=2,T')).to.equal(-1);
      expect(encShorthands.indexOf('x=2,T|y=1,Q')).to.gt(-1);
    });
  });

  // describe('QxO,', function() {
  //   var fields = [
  //     {name:1, type:'O'},
  //     {name:2, type:'Q'}
  //   ];

  //   var stats = {
  //     1: {cardinality: 10},
  //     2: {cardinality: 10}
  //   };

  //   var encs = genEncodings([], fields, stats, opt);
  //   console.log('QxC', encs);
  // });

  // describe('QxA(Q),', function() {
  //   var f = fixture['OxA(Q)'];
  //   var encs = genEncodings([], f.fields, f.stats, opt);
  //   console.log('QxA(Q)', encs.map(vl.enc.shorthand));
  // });

  describe('OxOxQ', function () {
    var f;
    beforeEach(function() {
      f = fixture.OxOxQ;
    });

    it('without stats about occlusion, it should not include charts with both O\'s on axes', function() {
      var encodings = genEncodings([], f.fields, f.stats, opt);

      var filtered = encodings.filter(function(enc){
        return enc.x.type === 'O' && enc.y.type === 'O';
      });

      expect(filtered.length).to.equal(0);
    });
  });

  describe('OxOxA(Q)', function () {
    var f;
    beforeEach(function() {
      f = fixture['OxOxA(Q)'];
    });

    it('without stats about occlusion, it should include charts with both O\'s on axes', function() {
      var encodings = genEncodings([], f.fields, f.stats, opt);

      var filtered = encodings.filter(function(encoding){
        return encoding.x && encoding.x.type === 'O' && encoding.y && encoding.y.type === 'O';
      });

      expect(filtered.length).to.gt(0);
    });
  });

  describe('OxA(Q)xA(Q)', function () {
    var f, fields, stats;
    beforeEach(function() {
      f = fixture['OxA(Q)xA(Q)'];
      fields = f.fields;
      stats = f.stats;
    });

    it('should not include charts with O on row/col except with text', function() {
      var encodings = genEncodings([], fields, stats, opt);

      expect(encodings.filter(function(encoding) {
        var rowIsO = encoding.row && encoding.row.type==='O',
          colIsO = encoding.col && encoding.col.type==='O';
        return !encoding.text && (rowIsO || colIsO);
      }).length).to.equal(0);
    });

    it('should include charts with O on row/col when omit flag is disabled', function() {
      opt.omitNonTextAggrWithAllDimsOnFacets = false;
      var encodings = genEncodings([], fields, stats, opt);
      expect(encodings.filter(function(encoding) {
        return (encoding.row && encoding.row.type==='O') ||
          (encoding.col && encoding.col.type==='O');
      }).length).to.gt(0);
    });
  });
});
