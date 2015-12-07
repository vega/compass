'use strict';

/*jshint -W069 */

var expect = require('chai').expect;

var //genProjections = require('../../src/gen/projections'),
  genAggregates = require('../../src/gen/aggregates'),
  fixture = require('../fixture');


describe('cp.gen.aggregates()', function () {

  describe('Ox#', function () {
    var f = fixture['Ox#'];
    var tables = genAggregates([], f.fields, f.stats);
    it('should output 1 data table', function () {
      expect(tables.length).to.equal(1); // O
    });
  });

  describe('Q', function () {
    var f = fixture['Q'];

    var tables = genAggregates([], f.fields, f.stats);

    it('should output 1 data table that has length 2', function () {
      expect(tables.filter(function(t) {
        return t.length === 1;
      }).length).to.equal(2);
    });

    it('should output 3 data tables: Q, A(Q), BIN(Q)x#', function () {
      expect(tables.length).to.equal(3);
    });

    it('should append key to each fieldSet', function() {
      expect(tables[0].key).to.be.ok;
    });

    it('should output Q, mean(Q), bin(Q)x# if omitMeasureOnly', function () {
      var tables = genAggregates([], f.fields, f.stats, {
        omitMeasureOnly: false
      });

      // each field can be Q, mean(Q)
      expect(tables.length).to.equal(3);

      // Q
      expect(tables.filter(function(table){
        var t = table[0];
        return !t.aggregate && !t.bin && t.type==='quantitative';
      }).length).to.equal(1);

      // mean(Q)
      expect(tables.filter(function(table){
        var t = table[0];
        return t.aggregate && !t.bin && t.type==='quantitative';
      }).length).to.equal(1);

      // bin(Q) x #
      expect(tables.filter(function(table){
        return table.length === 2;
      }).length).to.equal(1);
    });
  });

  describe('Q_10', function() {
    it('should not be binned', function() {
      //FIXME write test
    });
  });


  describe('Qx#', function () {
    var f = fixture['Qx#'];
    var tables = genAggregates([], f.fields, f.stats);
    it('should output 2 data table', function () {
      expect(tables.length).to.equal(2); // bin
      expect(tables[1][0].bin).to.be.true; // bin
    });
  });


  describe('QxQ', function () {
    var f = fixture['QxQ'];

    var tables = genAggregates([], f.fields, f.stats, {});

    it('should output 3 data table', function () {
      expect(tables.length).to.equal(3);
    });

    it('should append key to each fieldSet', function() {
      expect(tables[0].key).to.be.ok;
    });

    it('not generate mean with bin', function () {
      var filtered = tables.filter(function(table) {
        return table[0].aggregate && table[1].bin;
      });
      expect(filtered.length).to.equal(0);
    });

    it('not generate raw with bin', function () {
      var filtered = tables.filter(function(t) {
        return !t[0].aggregate && !t[0].bin && t[1].bin;
      });
      expect(filtered.length).to.equal(0);
    });


    it('should output 3 data table if not omit', function () {
      var tables = genAggregates([], f.fields, f.stats, {
        omitMeasureOnly: false
      });
      expect(tables.length).to.equal(3);
    });
  });


  describe('1 count', function () {
    var f = fixture['#'];
    var tables = genAggregates([], f.fields, f.stats);
    it('should output one data table', function () {
      expect(tables.length).to.equal(1); // O, bin
    });
  });
});

