/*jshint -W069 */

var expect = require('chai').expect,
  vl = require('vegalite'),
  fixture = require('../fixture');

var genEncs = require('../../src/gen/encs');

describe('vr.gen.encs()', function () {
  describe('1Q,', function() {
    //FIXME write tests
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

  //   var encs = genEncs([], fields, stats);
  //   console.log('QxC', encs);
  // });

  // describe('QxA(Q),', function() {
  //   var f = fixture['OxA(Q)'];
  //   var encs = genEncs([], f.fields, f.stats);
  //   console.log('QxA(Q)', encs.map(vl.enc.shorthand));
  // });

  describe('TxQ', function () {
    var f = fixture['TxQ'];
    var encs = genEncs([], f.fields, f.stats);
    console.log('TxQ' , encs.map(vl.enc.shorthand));
    //FIXME complete this test
  });

  describe('OxA(Q)xA(Q)', function () {
    var f = fixture['OxA(Q)xA(Q)'],
      fields = f.fields,
      stats = f.stats;

    it('should not include charts with O on row/col except with text', function() {
      var encs = genEncs([], fields, stats);

      expect(encs.filter(function(enc) {
        var rowIsO = enc.row && enc.row.type==='O',
          colIsO = enc.col && enc.col.type==='O';
        return !enc.text && (rowIsO || colIsO);
      }).length).to.equal(0);
    });

    it('should include charts with O on row/col when omit flag is disabled', function() {
      var encs = genEncs([], fields, stats, {
        omitNonTextAggrWithAllDimsOnFacets: false
      });
      expect(encs.filter(function(enc) {
        return (enc.row && enc.row.type==='O') ||
          (enc.col && enc.col.type==='O');
      }).length).to.gt(0);
    });
  });
});