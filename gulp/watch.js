'use strict';

var gulp = require('gulp');

gulp.task('watch', ['watchvl'], function() {
  // only test since watch will take care of build already
  gulp.watch(['src/**', 'test/**'], ['test']);
});

// copy vega-lite to lib
var vlPath = 'node_modules/vega-lite/';
gulp.task('watchvl', function() {
  gulp.watch([vlPath + 'vega-lite.js'], ['copyvl']);
});

gulp.task('copyvl', function() {
  gulp.src(vlPath+'vega-lite.js')
    .pipe(gulp.dest('lib/'));
});
