// Universal Module Pattern from https://github.com/umdjs/umd/blob/master/returnExports.js
// Uses Node, AMD or browser globals to create a module.

(function (root, factory) {
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
        root.encodings = factory();
  }
}(this, function () {
  var encodings = {
      summary: 'summary',
      hist: 'hist',
      x: 'x',
      y: 'y',
      row: 'row',
      col: 'col',
      text: 'text',
      size: 'size',
      shape: 'shape',
      color: 'color',
      geo: 'geo'
  };

  encodings.nonPositional = ['summary', 'hist', 'text', 'size', 'shape', 'color', 'geo'];

  return encodings;
}));

