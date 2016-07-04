import * as vlSpec from 'vega-lite/src/spec';
import * as vlShorthand from 'vega-lite/src/shorthand';
import * as consts from './clusterconsts';
import * as util from '../util';


export function table(specs) {
  var len = specs.length,
    extendedSpecs = specs.map(function(e) { return extendSpecWithChannelByColumnName(e); }),
    shorthands = specs.map(vlShorthand.shorten),
    diff = {}, i, j;

  for (i = 0; i < len; i++) {
    diff[shorthands[i]] = {};
  }

  for (i = 0; i < len; i++) {
    for (j = i + 1; j < len; j++) {
      var sj = shorthands[j], si = shorthands[i];

      diff[sj][si] = diff[si][sj] = get(extendedSpecs[i], extendedSpecs[j]);
    }
  }
  return diff;
}

export function get(extendedSpec1, extendedSpec2) {
  var cols = util.union(util.keys(extendedSpec1.channelByField), util.keys(extendedSpec2.channelByField)),
    dist = 0;

  cols.forEach(function(column) {
    var e1 = extendedSpec1.channelByField[column], e2 = extendedSpec2.channelByField[column];

    if (e1 && e2) {
      if (e1.channel !== e2.channel) {
        dist += (consts.DIST_BY_CHANNEL[e1.channel] || {})[e2.channel] || 1;
      }
    } else {
      dist += consts.DIST_MISSING;
    }
  });

  // do not group stacked chart with similar non-stacked chart!
  var isStack1 = vlSpec.isStacked(extendedSpec1),
    isStack2 = vlSpec.isStacked(extendedSpec2);

  if (isStack1 || isStack2) {
    if (isStack1 && isStack2) {
      if ((extendedSpec1.encoding.color && extendedSpec2.encoding.color &&
          extendedSpec1.encoding.color.field !== extendedSpec2.encoding.color.field) ||
          (extendedSpec1.encoding.detail && extendedSpec2.encoding.detail &&
          extendedSpec1.encoding.detail.field !== extendedSpec2.encoding.detail.field)
         ) {
        dist+=1;
      }
    } else {
      dist+=1; // surely different
    }
  }
  return dist;
}

// get encoding type by fieldname
export function extendSpecWithChannelByColumnName(spec) {
  var _channelByField = {},
    encoding = spec.encoding;

  util.keys(encoding).forEach(function(channel) {
    var e = util.duplicate(encoding[channel]);
    e.channel = channel;
    _channelByField[e.field || ''] = e;
    delete e.field;
  });

  return {
    mark: spec.mark,
    channelByField: _channelByField,
    encoding: spec.encoding
  };
}
