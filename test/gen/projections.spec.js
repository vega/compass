var expect = require('chai').expect;

var genProjections = require('../../src/gen/projections');

describe('vr.gen.projections()', function () {
  describe('with empty set of fields', function () {
    var fields = [];
    var projections = genProjections(fields);

    it('should return nothing', function () {
      expect(projections.length).to.equal(0);
    });
  });

  describe('with a set of fields', function () {
    var fields = [
      {name:1, selected: true},
      {name:2, selected: true},
      {name:3, selected: false},
      {name:4, selected: false}
    ];

    var projections = genProjections(fields);

    it('should generate correct # of projections', function () {
      expect(projections.length).to.equal(3);
    });

    it('should keep selected field as first items', function () {
      expect(projections[2][0].name).to.equal(1);
      expect(projections[2][1].name).to.equal(2);
    });

    it('should add projection key', function () {
      expect(projections[0].key).to.equal('1,2');
    });
  });


  describe('with a set of fields with count', function () {
    var fields = [
      {name:1, type:'Q', selected: false},
      {name:2, type:'Q', selected: false},
      {name:3, type:'O', selected: false},
      {name:4, type:'O', selected: false},
      {name:'*', aggr:'count', selected: false}
    ];

    it('should generate correct # of projections', function () {
      var projections = genProjections(fields);

      expect(projections.length).to.equal(4);
      expect(projections.filter(function(p){ return p.length === 2;}).length).to.equal(0);
    });

    it('should generate more # of projections if not omitting dot plots', function () {
      var projections = genProjections(fields, {}, {
        omitDotPlot: false
      });

      expect(projections.length).to.equal(4);
      expect(projections.filter(function(p){ return p.length === 2;}).length).to.equal(0);
    });
  });
});