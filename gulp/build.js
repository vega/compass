'use strict';

var gulp = require('gulp');
var $ = require('gulp-load-plugins')();

var buffer = require('vinyl-buffer');
var browserify = require('browserify');
var source = require('vinyl-source-stream');
var watchify = require('watchify');

var bundleDef = {
  entries: ['./src/cp'],
  standalone: 'cp',
  debug: true,
  transform: ['browserify-shim']
};

var browserBundler = browserify(bundleDef);
var watchBundler = watchify(browserify(bundleDef));

// builds Vega-lite with watcher
function bundle() {
  return build(watchBundler.bundle());
}

function build(bundle) {
  return bundle
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

gulp.task('build', function() {
  build(browserBundler.bundle());
});

watchBundler.on('update', bundle);
gulp.task('bundle', bundle);
