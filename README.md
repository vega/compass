# (Vis)Compass: Visualization Recommender.

[![Build Status](https://travis-ci.org/vega/compass.svg)](https://travis-ci.org/vega/compass)
[![npm dependencies](https://david-dm.org/vega/compass.svg)](https://www.npmjs.com/package/viscompass)
[![npm version](https://img.shields.io/npm/v/viscompass.svg)](https://www.npmjs.com/package/viscompass)

(Vis)Compass is a module for generating and ranking visualizations. Given user
query, Compass produces ranked group of visualization described using
[Vega-Lite](http://github.com/vega/vega-lite).

Compass is NO LONGER in an active development.  Details about replacement project: CompassQL are coming soon.

## Development Guide

### Dependencies

This project depends on [Vega-Lite](https://github.com/vega/vega-lite) as a formal model for visualization.

If you plan to make changes to these dependencies and observe the changes without publishing / copying compiled libraries all the time, use [`bower link`](https://oncletom.io/2013/live-development-bower-component/) and 'npm link'.

```
cd path/to/vega-lite
bower link
npm link
```

In the directory for compass, run

```
# optional: npm link datalib
npm link vega-lite
bower link vega-lite
```

### Compiling

You can run `npm run build` to compile Vega-Lite.

You can `npm run watch` to start a watcher task that automatically re-compiles and tests Compass when any `.js` file in `test/` or `src/` changes.

Note: These commands use [Gulp](http://gulpjs.com) internally; Therefore, you need to install gulp globally with
```sh
npm install -g gulp
```
to make them work.  
