'use strict';

var gulp = require('gulp');
var gutil = require('gulp-util');
var mocha = require('gulp-spawn-mocha');

// runs the tests
gulp.task('test', ['jshint'], function() {
  return gulp.src(['test/**/*.spec.js'], { read: false })
    .pipe(mocha({
      reporter: 'spec',
      istanbul: true
    }))
    .on('error', gutil.log);
});

gulp.task('t', function() {
  return gulp.src(['test/**/*.spec.js'], { read: false })
    .pipe(mocha({
      reporter: 'spec',
      istanbul: false
    }))
    .on('error', gutil.log);
});