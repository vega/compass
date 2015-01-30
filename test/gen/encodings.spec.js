var expect = require('chai').expect;

var genEncodings = require('../../src/gen/encodings');

describe('vr.gen.encodings()', function () {
  it('should generate encodings', function () {
    var fields = [{name:1, type:'Q'}];
    var encodings = genEncodings([], fields);

    // x, y ,text
    expect(encodings.length).to.equal(3);
  });
});