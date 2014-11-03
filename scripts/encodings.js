var _ = require('lodash');

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

module.exports = encodings;
