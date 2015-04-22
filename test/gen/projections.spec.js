var expect = require('chai').expect,
  fixture = require('../fixture');

var genProjections = require('../../src/gen/projections');

describe('cp.gen.projections()', function () {
  describe('with empty set of fields', function () {
    var fields = [];
    var projections = genProjections(fields);

    it('should return nothing', function () {
      expect(projections.length).to.equal(0);
    });
  });

  describe('with a set of fields without any field selected', function () {
    var f = fixture.birdstrikes;

    var projections = genProjections(f.fields, f.stats);

    it('should preserve name order', function() {
      for (var i=0; i<projections.length-1 ; i++) {
        var a = projections[i][0], b=projections[i+1][0];
        if (a.type === b.type) {
          expect(a.name).to.lt(b.name);
        }
      }
    })
  });

  describe('with a set of fields', function () {
    var fields = [
      {name:1, selected: true},
      {name:2, selected: true},
      {name:3, selected: undefined},
      {name:4, selected: undefined}
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
    var f = fixture['OxOxQxQx#'];

    it('should generate correct # of projections', function () {
      var projections = genProjections(f.fields, f.stats);

      expect(projections.length).to.equal(4);
      expect(projections.filter(function(p){ return p.length === 2;}).length).to.equal(0);
    });

    it('should generate more # of projections if not omitting dot plots', function () {
      var projections = genProjections(f.fields, f.stats, {
        omitDotPlot: false
      });

      expect(projections.length).to.equal(4);
      expect(projections.filter(function(p){ return p.length === 2;}).length).to.equal(0);
    });
  });
});