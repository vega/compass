var expect = require('chai').expect,
  vl = require('vegalite');

var genEncs = require('../../src/gen/encs');

describe('vr.gen.encodings()', function () {
  describe('with 1Q,', function() {
    //FIXME write tests
  });

  describe('with A(Q)xA(Q)xO', function () {
    var fields = [
        {aggr:'avg', name:1, type:'Q'},
        {aggr:'avg', name:2, type:'Q'},
        {name:3, type:'O'}
      ],
      stats = {
        1: {cardinality: 10},
        2: {cardinality: 10},
        3: {cardinality: 10}
      };

    it('should not include charts with O on row/col', function() {
      var encs = genEncs([], fields, stats);
      expect(encs.filter(function(enc) {
        return (enc.row && enc.row.type==='O') ||
          (enc.col && enc.col.type==='O');
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