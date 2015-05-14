'use strict';

var gulp = require('gulp');
var $ = require('gulp-load-plugins')();

var buffer = require('vinyl-buffer');
var browserify = require('browserify');
var source = require('vinyl-source-stream');
var watchify = require('watchify');

var bundler = watchify(browserify({
  entries: ['./src/cp'],
  standalone: 'cp',
  debug: true,
  transform: ['browserify-shim']
  // ,
  // //deal with require() in /clusterfck
  // ignoreMissing: true
}));

function bundle() {
  return bundler
    .bundle()
    .on('error', $.util.log.bind($.util, 'Browserify Error'))
    .pipe(source('compass.js'))
    .pipe(buffer())
    .pipe(gulp.dest('.'))
    .pipe($.sourcemaps.init({loadMaps: true}))
    // This will minify and rename to vega-lite.min.js
    .pipe($.uglify())
    .pipe($.rename({ extname: '.min.js' }))
    .pipe($.sourcemaps.write('./'))
    .pipe(gulp.dest('.'));
}

gulp.task('build', bundle);
