import {Type} from 'vega-lite/src/type';
import genScales from '../../src/gen/scales';
import {expect} from 'chai';

describe('cp.gen.scales()', function () {
  it('should correctly generate fieldSets with scale variation', function() {
    const fields = [0,1,2,3].map(function(i) {
      return {
        field: 'f' + i,
        type: i <= 2 ? Type.QUANTITATIVE : Type.ORDINAL // 2xQ, 2xO
      };
    });
    const output = genScales([], fields, {rescaleQuantitative: [undefined, 'log']});
    expect(output.length).to.equal(4); // only 1 and 2 get rescaled 2x2 = 4
    
    // output[0]'s scale: default, default
    // output[1]'s scale: default, log
    expect(output[1][1].scale.type).to.equal('log');
    // output[2]'s scale: log, default
    expect(output[2][0].scale.type).to.equal('log');
    // output[3]'s scale: log, log
    expect(output[3][0].scale.type).to.equal('log');
    expect(output[3][1].scale.type).to.equal('log');
  });
});
