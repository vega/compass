import {isAggregate} from 'vega-lite/src/encoding';
import {isDimension, cardinality} from 'vega-lite/src/fielddef';
import {getEncodingMappingError} from 'vega-lite/src/validate';
import {SpecOption} from '../consts';

import {Type} from 'vega-lite/src/type';
import {Encoding} from 'vega-lite/src/schema/encoding.schema';

import * as util from '../util';

export default function genMarks(encoding: Encoding, stats, opt: SpecOption) {
  return opt.markList.filter(function(mark){
    const noVlError = getEncodingMappingError({
                        mark: mark,
                        encoding: encoding
                      }) === null;
    return noVlError && rule[mark](encoding, stats, opt);
  });
}

export namespace rule {
  function facetRule(fieldDef, stats, opt: SpecOption) {
    return cardinality(fieldDef, stats) <= opt.maxCardinalityForFacets;
  }

  function facetsRule(encoding: Encoding, stats, opt: SpecOption) {
    if(encoding.row && !facetRule(encoding.row, stats, opt)) return false;
    if(encoding.column && !facetRule(encoding.column, stats, opt)) return false;
    return true;
  }

  export function point(encoding: Encoding, stats, opt: SpecOption) {
    if(!facetsRule(encoding, stats, opt)) return false;
    if (encoding.x && encoding.y) {
      // have both x & y ==> scatter plot / bubble plot

      var xIsDim = isDimension(encoding.x),
        yIsDim = isDimension(encoding.y);

      // For OxO
      if (xIsDim && yIsDim) {
        // TODO: revise if we need his
        // shape doesn't work with both x, y as ordinal
        if (encoding.shape) {
          return false;
        }

        // TODO(kanitw): check that there is quant at least ...
        if (encoding.color && isDimension(encoding.color)) {
          return false;
        }
      }

    } else { // plot with one axis = dot plot
      if (opt.omitDotPlot) return false;

      // Dot plot should always be horizontal
      if (opt.omitTranspose && encoding.y) return false;

      // dot plot shouldn't have other encoding
      if (opt.omitDotPlotWithExtraEncoding && util.keys(encoding).length > 1) return false;

      // dot plot with shape is non-sense
      if (encoding.shape) return false;
    }
    return true;
  }

  export function tick(encoding: Encoding, stats, opt: SpecOption) {
    // jshint unused:false
    if (encoding.x || encoding.y) {
      if(isAggregate(encoding)) return false;

      var xIsDim = isDimension(encoding.x),
        yIsDim = isDimension(encoding.y);

      return (!xIsDim && (!encoding.y || yIsDim)) ||
        (!yIsDim && (!encoding.x || xIsDim));
    }
    return false;
  }

  export function bar(encoding: Encoding, stats, opt: SpecOption) {
    if(!facetsRule(encoding, stats, opt)) return false;

    // bar requires at least x or y
    if (!encoding.x && !encoding.y) return false;

    if (opt.omitSizeOnBar && encoding.size !== undefined) return false;


    if (opt.omitLogScaleOnBar) {
      if (encoding.x && encoding.x.scale && encoding.x.scale.type === "log" ) return false;
      if (encoding.y && encoding.y.scale && encoding.y.scale.type === "log" ) return false;
    }



    // FIXME actually check if there would be occlusion #90
    // need to aggregate on either x or y

    var aggEitherXorY =
      (!encoding.x || encoding.x.aggregate === undefined) !== // xor
      (!encoding.y || encoding.y.aggregate === undefined);


    if (aggEitherXorY) {
      var eitherXorYisDimOrNull =
        (!encoding.x || isDimension(encoding.x)) !== // xor
        (!encoding.y || isDimension(encoding.y));

      if (eitherXorYisDimOrNull) {
        var aggregate = encoding.x.aggregate || encoding.y.aggregate;

        // TODO: revise
        return !(opt.omitStackedAverage && aggregate ==='mean' && encoding.color);
      }
    }

    return false;
  }

  export function line(encoding: Encoding, stats, opt: SpecOption) {
    if (!facetsRule(encoding, stats, opt)) return false;

    // TODO(kanitw): add omitVerticalLine as config

    // FIXME truly ordinal data is fine here too.
    // Line chart should be only horizontal
    // and use only temporal data
    return encoding.x.type === Type.TEMPORAL && !!encoding.x.timeUnit &&
           encoding.y.type === Type.QUANTITATIVE && !!encoding.y.aggregate;
  }

  export function area(encoding: Encoding, stats, opt: SpecOption) {
    if (!facetsRule(encoding, stats, opt)) return false;

    if (!line(encoding, stats, opt)) return false;

    return !(opt.omitStackedAverage && encoding.y.aggregate ==='mean' && encoding.color);
  }

  export function text(encoding: Encoding, stats, opt: SpecOption) {
    // at least must have row or column and aggregated text values
    return (encoding.row || encoding.column) && encoding.text && encoding.text.aggregate && !encoding.x && !encoding.y && !encoding.size &&
      (!opt.alwaysGenerateTableAsHeatmap || !encoding.color);
  }
}
