var expect = require('chai').expect;

var genEncodings = require('../../src/gen/encodings');

describe('vr.gen.encodings()', function () {
  describe(',with 1Q ,', function() {
    var fields = [{name:1, type:'Q'}],
      stats = {};

    it('should generate encodings', function () {
      var encodings = genEncodings([], fields);
      expect(encodings.length).to.equal(1);
    });

    it('should generate more encodings wihtout pruning', function () {
      var encodings = genEncodings([], fields, stats, {
        omitTranpose: false
      });

      // x, y ,text
      expect(encodings.length).to.equal(2);
    });
  });
});