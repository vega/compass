var expect = require('chai').expect;

var projections = require('../../src/gen/projections');

console.log("test");
describe('vr.gen.projections()', function () {
  it('should generate projections', function () {
    var fields = [
      {name:1, selected: true},
      {name:2, selected: true},
      {name:3, selected: false},
      {name:4, selected: false}
    ];

    var fieldSets = projections(fields);
    expect(fieldSets.length).to.equal(3);
  });

});