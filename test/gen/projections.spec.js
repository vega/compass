var expect = require('chai').expect;

var genProjections = require('../../src/gen/projections');

console.log("test");
describe('vr.gen.projections()', function () {
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
});