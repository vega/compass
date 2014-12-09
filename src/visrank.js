(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['vegalite'], factory);
  } else if (typeof exports === 'object') {
    // Node. Does not work with strict CommonJS, but
    // only CommonJS-like environments that support module.exports,
    // like Node.
    module.exports = factory(
      require('vegalite')
    );
  } else {
    // Browser globals (root is window)
    root.visrank = factory(root.vl);
  }
}(this, function (vl) {
  var vrank = {};

  var ENCODING_SCORE = {
    Q: {
      x: 1,
      y: 1,
      size: 0.6,
      color: 0.4,
      alpha: 0.4,
      shape: 0 // shouldn't be generated anyway
    },
    O: {
      x: 1,
      y: 1,
      row: 0.7,
      col: 0.7,
      color: 0.8,
      shape: 0.6
    }
  };

  var MARK_SCORE = {

  };

  vrank.getScore = function(encoding){
    var score = 1,
      encTypes = vl.keys(encoding.enc);
    encTypes.forEach(function(encType){
      var e = encoding.enc[encType];
      score *= ENCODING_SCORE[e.type][encType] || 0.1;
    });

    // penalize not using positional
    if(encTypes.length > 1 && (!encoding.enc.x || !encoding.enc.y)){
      score *= 0.5;
    }

    return score;
  };


  return vrank;
}));