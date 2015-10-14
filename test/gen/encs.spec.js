'use strict';

/*jshint -W069 */

var expect = require('chai').expect,
  vl = require('vega-lite'),
  fixture = require('../fixture');

var genEncs = require('../../src/gen/encs');
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

    it('should generate one encs', function() {
      var encs = genEncs([], f.fields, f.stats, opt);
      expect(encs.length).to.eql(1);
      expect(encs[0].x).to.be.ok;
    });
  });

  describe('1Q,', function() {
    //FIXME write tests
  });

  describe('#xB(Q)', function() {
    var f, encs, encShorthands;
    beforeEach(function() {
      f = fixture['#xB(Q)'];
      encs = genEncs([], f.fields, f.stats, opt);
      encShorthands = encs.map(vl.enc.shorthand);
    });

    it('should show only vertical bar/plots', function() {
      expect(encShorthands.indexOf('x=count_*,Q|y=bin_2,Q')).to.equal(-1);
      expect(encShorthands.indexOf('x=bin_2,Q|y=count_*,Q')).to.gt(-1);
    });

  });

  describe('#xT', function() {
    var f, encs, encShorthands;
    beforeEach(function() {
      f = fixture['#xT'];
      encs = genEncs([], f.fields, f.stats, opt);
      encShorthands = encs.map(vl.enc.shorthand);
    });

    // console.log('#xT', encs.map(vl.enc.shorthand));

    it('should show only vertical bar/plots', function() {
      expect(encShorthands.indexOf('x=count_*,Q|y=2,T')).to.equal(-1);
      expect(encShorthands.indexOf('x=2,T|y=count_*,Q')).to.gt(-1);
    });
  });

  describe('#xYR(T)', function() {
    var f, encs, encShorthands;
    beforeEach(function() {
      f = fixture['#xYR(T)'];
      encs = genEncs([], f.fields, f.stats, opt);
      encShorthands = encs.map(vl.enc.shorthand);
    });

    // console.log('#xYR(T)', encs.map(vl.enc.shorthand));

    it('should show only vertical bar/plots', function() {
      expect(encShorthands.indexOf('x=count_*,Q|y=year_2,T')).to.equal(-1);
      expect(encShorthands.indexOf('x=year_2,T|y=count_*,Q')).to.gt(-1);
    });
  });

  describe('QxT', function () {
    var f, encs, encShorthands;
    beforeEach(function() {
      f = fixture['QxT'];
      encs = genEncs([], f.fields, f.stats, opt);
      encShorthands = encs.map(vl.enc.shorthand);
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

  //   var encs = genEncs([], fields, stats, opt);
  //   console.log('QxC', encs);
  // });

  // describe('QxA(Q),', function() {
  //   var f = fixture['OxA(Q)'];
  //   var encs = genEncs([], f.fields, f.stats, opt);
  //   console.log('QxA(Q)', encs.map(vl.enc.shorthand));
  // });

  describe('OxOxQ', function () {
    var f;
    beforeEach(function() {
      f = fixture.OxOxQ;
    });

    it('without stats about occlusion, it should not include charts with both O\'s on axes', function() {
      var encs = genEncs([], f.fields, f.stats, opt);

      var filtered = encs.filter(function(enc){
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
      var encs = genEncs([], f.fields, f.stats, opt);

      // console.log('OxOxA(Q)', encs);

      var filtered = encs.filter(function(enc){
        return enc.x && enc.x.type === 'O' && enc.y && enc.y.type === 'O';
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
      var encs = genEncs([], fields, stats, opt);

      expect(encs.filter(function(enc) {
        var rowIsO = enc.row && enc.row.type==='O',
          colIsO = enc.col && enc.col.type==='O';
        return !enc.text && (rowIsO || colIsO);
      }).length).to.equal(0);
    });

    it('should include charts with O on row/col when omit flag is disabled', function() {
      opt.omitNonTextAggrWithAllDimsOnFacets = false;
      var encs = genEncs([], fields, stats, opt);
      expect(encs.filter(function(enc) {
        return (enc.row && enc.row.type==='O') ||
          (enc.col && enc.col.type==='O');
      }).length).to.gt(0);
    });
  });
});
