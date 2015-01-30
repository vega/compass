'use strict';

var genEncs = require('./encs'),
  genMarktypes = require('./marktypes');

module.exports = genEncodings;

function genEncodings(output, fields, opt, cfg, nested) {
  var encs = genEncs([], fields, opt);

  if (nested) {
    return encs.reduce(function(dict, enc) {
      dict[enc] = genMarktypes([], enc, opt, cfg);
      return dict;
    }, {});
  } else {
    return encs.reduce(function(list, enc) {
      return genMarktypes(list, enc, opt, cfg);
    }, []);
  }
}