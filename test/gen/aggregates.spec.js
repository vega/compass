/*jshint -W069 */

var expect = require('chai').expect,
  vl = require('vegalite');

var genProjections = require('../../src/gen/projections'),genAggregates = require('../../src/gen/aggregates'),
  fixture = require('../fixture'),
  constsAggregates = require('../../src/consts').gen.aggregates;


describe('vr.gen.aggregates()', function () {
  describe('1Q', function () {
    var f = fixture['Q'];

    var tables = genAggregates([], f.fields, f.stats);

    it('should output 1 data table that has length 1', function () {
      expect(tables.filter(function(t) {
        return t.length === 1;
      }).length).to.equal(1);
    });

    it('should output 3 data tables', function () {
      expect(tables.length).to.equal(3);
    });

    it('should append key to each fieldSet', function() {
      expect(tables[0].key).to.be.ok();
    });

    it('should output 4 data table if not omit', function () {
      var tables = genAggregates([], f.fields, f.stats, {
        omitMeasureOnly: false,
        omitDimensionOnly: false
      });
      // each field can be Q, avg(Q), bin(Q), O
      expect(tables.length).to.equal(4);
    });
  });

  describe('Q_10', function() {
    it('should not be binned', function() {
      //FIXME write test
    });
  });

  describe('2Q with genTypeCasting', function () {
    var f = fixture['QxQ'];

    // TODO add one more test here

    var tables = genAggregates([], f.fields, f.stats, {
        omitMeasureOnly: false,
        omitDimensionOnly: false
      });

    // except that two pairs of (avg(Q),Q) doesn't work
    it('should output 14 data table if not omit', function () {
      expect(tables.length).to.equal(14);
    });

    it('should append key to each fieldSet', function() {
      expect(tables[12].key).to.be.ok();
    });
  });

  describe('1Q & 1 count', function () {
    var f = fixture['Qx#'];
    var tables = genAggregates([], f.fields, f.stats);
    it('should output 2 data table', function () {
      expect(tables.length).to.equal(2); // O, bin
    });
  });

  describe('1O & 1 count', function () {
    var f = fixture['Ox#'];
    var tables = genAggregates([], f.fields, f.stats);
    it('should output 1 data table', function () {
      expect(tables.length).to.equal(1); // O
    });
  });

  describe('1 count', function () {
    var f = fixture['#'];
    var tables = genAggregates([], f.fields, f.stats);
    it('should output no data table', function () {
      expect(tables.length).to.equal(0); // O, bin
    });
  });

  describe('omitDimensionOnly', function () {
    it('include aggregate with dimension only', function () {

    });
  });

  describe('omitAggregateWithMeasureOnly', function () {


  });

  describe('after vr.gen.projections()', function() {
    var fields = [
      {name:1, type:'Q', selected: true},
      {name:2, type:'Q', selected: false},
      {name:3, type:'O', selected: false},
      {name:'*', aggr:'count', selected: false}
    ];

    var stats = {
      1: {cardinality: 10},
      2: {cardinality: 10},
      3: {cardinality: 10}
    };

    var projections = genProjections(fields, stats);
    console.log(projections, 'unfinished');
    //FIXME fix this
  });
});

