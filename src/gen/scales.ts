import {SchemaField} from '../schema';
import {ScaleOption, DEFAULT_SCALE_OPTION} from '../consts';
import {duplicate, extend} from '../util';
import {Type} from 'vega-lite/src/type';

export default function genScales(output, fieldDefs: SchemaField[], opt: ScaleOption = {}) {
  opt = extend({}, DEFAULT_SCALE_OPTION, opt);

  function genScaleField(i: number, tmpFieldDefs: SchemaField[]) {
    if (i === fieldDefs.length) {
      // Done, emit result
      output.push(duplicate(tmpFieldDefs));
      return;
    }

    if (fieldDefs[i].type === Type.QUANTITATIVE && opt.rescaleQuantitative) {
      // if quantitative and we have rescaleQuantitative, generate different scales
      opt.rescaleQuantitative.forEach(function(scaleType) {
        // clone to prevent side effect on the original data
        if (scaleType) {
          let fieldDef = duplicate(fieldDefs[i]);
          fieldDef.scale = fieldDef.scale || {};
          fieldDef.scale.type = scaleType;
          tmpFieldDefs.push(fieldDef);
          genScaleField(i + 1, tmpFieldDefs);
        } else {
          tmpFieldDefs.push(fieldDefs[i]);
          genScaleField(i + 1, tmpFieldDefs);
        }
        tmpFieldDefs.pop();
      });

    } else {
      // Otherwise, just deal with next field
      tmpFieldDefs.push(fieldDefs[i]);
      genScaleField(i + 1, tmpFieldDefs);
      tmpFieldDefs.pop();
    }
  }

  genScaleField(0, []);

  return output;
}
