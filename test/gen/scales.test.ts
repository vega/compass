import {Type} from 'vega-lite/src/type';
import genScales from '../../src/gen/scales';
import {expect} from 'chai';

describe('cp.gen.scales()', function () {
  it('should correctly generate fieldSets with scale variation', function() {
    const fields = [1,2,3,4].map(function(i) {
      return {
        field: 'f' + i,
        type: i <= 2 ? Type.QUANTITATIVE : Type.ORDINAL // 2xQ, 2xO
      };
    });
    const output = genScales([], fields, {rescaleQuantitative: [undefined, 'log']});
    expect(output.length).to.equal(4); // only 1 and 2 get rescaled 2x2 = 4
    expect(output[1][1].scale.type).to.equal('log');
    expect(output[2][0].scale.type).to.equal('log');
    expect(output[3][0].scale.type).to.equal('log');
    expect(output[3][1].scale.type).to.equal('log');
  });
});
