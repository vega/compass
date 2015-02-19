var expect = require('chai').expect,
  vl = require('vegalite');

var genEncodings = require('../../src/gen/encodings');

describe('vr.gen.encodings()', function () {
  describe('with 1Q', function() {
    var fields = [{name:1, type:'Q'}],
      stats = {};

    it('should generate no encoding if dot plots are omittted', function () {
      var encodings = genEncodings([], fields, stats, {
        omitDotPlot: true
      });
      expect(encodings.length).to.equal(0);
    });

    it('should generate encodings if dot plots are not omitted', function () {
      var encodings = genEncodings([], fields, stats, {
        omitDotPlot: false
      });
      expect(encodings.length).to.equal(1);
    });

    it('should generate more encodings wihtout pruning', function () {
      var encodings = genEncodings([], fields, stats, {
        omitTranpose: false,
        omitDotPlot: false
      });

      // x, y ,text
      expect(encodings.length).to.equal(2);
    });
  });
});