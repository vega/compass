// Universal Module Pattern from https://github.com/umdjs/umd/blob/master/returnExports.js
// Uses Node, AMD or browser globals to create a module.

(function (root, moduleName, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([], factory);
    } else if (typeof exports === 'object') {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = factory();
    } else {
        // Browser globals (root is window)
        root[moduleName] = factory();
  }

}(this, 'chartTypes', function () {
  return {
    TABLE: 'TABLE',
    BAR: 'BAR',
    PLOT: 'PLOT',
    LINE: 'LINE',
    AREA: 'AREA',
    MAP: 'MAP',
    HISTOGRAM: 'HISTOGRAM'
  };
}));



