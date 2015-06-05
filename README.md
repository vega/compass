# (Vis)Compass: Visualization Recommender.

[![Build Status](https://travis-ci.org/uwdata/compass.svg)](https://travis-ci.org/uwdata/compass)
[![npm dependencies](https://david-dm.org/uwdata/compass.svg)](https://www.npmjs.com/package/viscompass)
[![npm version](https://img.shields.io/npm/v/viscompass.svg)](https://www.npmjs.com/package/viscompass)
[![Coverage Status](https://coveralls.io/repos/uwdata/compass/badge.svg)](https://coveralls.io/r/uwdata/compass)

(Vis)Compass is a module for generating and ranking visualizations. Given user
query, Compass produces ranked group of visualization described using
[vega-lite](http://github.com/uwdata/vega-lite).

Compass is in active development.  More information will be included soon.

## Development Guide

### Dependencies

This project depends on [Vega-lite](https://github.com/uwdata/vega-lite) as a formal model for visualization.

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
