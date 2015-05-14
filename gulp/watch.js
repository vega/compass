'use strict';

var gulp = require('gulp');

gulp.task('watch', function() {
  gulp.watch(['src/**', 'test/**'], ['build', 'test']);
});

// copy vega-lite to lib
var vlPath = 'node_modules/vega-lite/';
gulp.task('watchvl', function() {
  gulp.watch([vlPath + 'vega-lite.js'], ['copyvl', 'build']);
});

gulp.task('copyvl', function() {
  gulp.src(vlPath+'vega-lite.js')
    .pipe(gulp.dest('lib/'));
});
