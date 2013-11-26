'use strict';
/**
 * Factory Class for Information Theoretic Methods
 */
angular.module('vizRecSrcApp')
  .factory('it', function () {
    // Service logic
    // ...

    function normalizedEntropy(x){
      return entropy(x) / ( Math.log(x.length) / Math.LN2);
    }

    function entropy(x) {
      var i, p, s = 0, H = 0, N = x.length;
      for (i=0; i<N; ++i) {
        s += x[i];
      }
      if (s === 0) return 0;
      for (i=0; i<N; ++i) {
        p = x[i] / s;
        if (p > 0) H += p * Math.log(p) / Math.LN2;
      }
      return -H;
    }

    function getDistance(dvTable, i, j){
      var data = dvTable.query({
        dims: [i, j],
        vals: [dv.count("*")],
        code: true
      });
      return mi_dist(data);
    }

    function mi_dist(data) {
      var x = data[0],
        y = data[1],
        z = data[2],
        px = dv.array(x.unique),
        py = dv.array(y.unique),
        i, s = 0, t, N = z.length, p, I = 0;

      for (i=0; i<N; ++i) {
        px[x[i]] += z[i];
        py[y[i]] += z[i];
        s += z[i];
      }
      t = 1 / (s * Math.LN2);
      for (i = 0; i < N; ++i) {
        if (z[i] == 0) continue;
        p = (s * z[i]) / (px[x[i]] * py[y[i]]);
        I += z[i] * t * Math.log(p);
      }
      px = entropy(px);
      py = entropy(py);
      return 1.0 - I / (px > py ? px : py);
    }

    // Public API here
    return {
      entropy: entropy,
      normalizedEntropy: normalizedEntropy,
      getDistance: getDistance
    };
  });
