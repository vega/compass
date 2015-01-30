var expect = require('chai').expect,
  vl = require('vegalite');

var genAggregates = require('../../src/gen/aggregates');

describe('vr.gen.aggregates()', function () {
  describe('1Q', function () {
    var fields = [{name:1, type:'Q'}];
    var tables = genAggregates([], fields);

    it('should output 4 data table', function () {
      // each field can be Q, avg(Q), bin(Q), O
      expect(tables.length).to.equal(4);
    });
  });

  describe('2Q with genTypeCasting', function () {
    var fields = [{name:1, type:'Q'}, {name:2, type:'Q'}];
    var tables = genAggregates([], fields, {
      genAggr: true,
      genTypeCasting: true
    });

    // except that two pairs of (avg(Q),Q) doesn't work
    it('should output 14 data table', function () {
      expect(tables.length).to.equal(14);
    });
  });

  describe('omitDimensionOnly', function () {
    it('include aggregate with dimension only', function () {

    });
  });

  describe('omitAggregateWithMeasureOnly', function () {


  });

});