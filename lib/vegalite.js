!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.vl=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var globals = require('./globals'),
    util = require('./util'),
    consts = require('./consts');

var vl = util.merge(consts, util);

vl.Encoding = require('./Encoding');
vl.compile = require('./compile/compile');
vl.enc = require('./enc');
vl.data = require('./data');
vl.field = require('./field');
vl.schema = require('./schema/schema');


module.exports = vl;

},{"./Encoding":2,"./compile/compile":6,"./consts":19,"./data":20,"./enc":21,"./field":22,"./globals":23,"./schema/schema":24,"./util":26}],2:[function(require,module,exports){
'use strict';

var global = require('./globals'),
  consts = require('./consts'),
  util = require('./util'),
  vlfield = require('./field'),
  schema = require('./schema/schema'),
  time = require('./compile/time');

var Encoding = module.exports = (function() {

  function Encoding(marktype, enc, config, filter, theme) {
    var defaults = schema.instantiate();

    var spec = {
      marktype: marktype,
      enc: enc,
      cfg: config,
      filter: filter || []
    };

    // type to bitcode
    for (var e in defaults.enc) {
      defaults.enc[e].type = consts.dataTypes[defaults.enc[e].type];
    }

    var specExtended = schema.util.merge(defaults, theme || {}, spec) ;

    this._marktype = specExtended.marktype;
    this._enc = specExtended.enc;
    this._cfg = specExtended.cfg;
    this._filter = specExtended.filter;
  }

  var proto = Encoding.prototype;

  proto.marktype = function() {
    return this._marktype;
  };

  proto.is = function(m) {
    return this._marktype === m;
  };

  proto.has = function(x) {
    return this._enc[x].name !== undefined;
  };

  proto.enc = function(x) {
    return this._enc[x];
  };

  proto.filter = function() {
    return this._filter;
  };

  // get "field" property for vega
  proto.field = function(x, nodata, nofn) {
    if (!this.has(x)) return null;

    var f = (nodata ? '' : 'data.');

    if (this._enc[x].aggr === 'count') {
      return f + 'count';
    } else if (!nofn && this._enc[x].bin) {
      return f + 'bin_' + this._enc[x].name;
    } else if (!nofn && this._enc[x].aggr) {
      return f + this._enc[x].aggr + '_' + this._enc[x].name;
    } else if (!nofn && this._enc[x].fn) {
      return f + this._enc[x].fn + '_' + this._enc[x].name;
    } else {
      return f + this._enc[x].name;
    }
  };

  proto.fieldName = function(x) {
    return this._enc[x].name;
  };

  proto.fieldTitle = function(x) {
    if (vlfield.isCount(this._enc[x])) {
      return vlfield.count.displayName;
    }
    var fn = this._enc[x].aggr || this._enc[x].fn || (this._enc[x].bin && "bin");
    if (fn) {
      return fn.toUpperCase() + '(' + this._enc[x].name + ')';
    } else {
      return this._enc[x].name;
    }
  };

  proto.scale = function(x) {
    return this._enc[x].scale || {};
  };

  proto.axis = function(x) {
    return this._enc[x].axis || {};
  };

  proto.band = function(x) {
    return this._enc[x].band || {};
  };

  proto.bandSize = function(encType, useSmallBand) {
    useSmallBand = useSmallBand ||
      //isBandInSmallMultiples
      (encType === Y && this.has(ROW) && this.has(Y)) ||
      (encType === X && this.has(COL) && this.has(X));

    // if band.size is explicitly specified, follow the specification, otherwise draw value from config.
    return this.band(encType).size ||
      this.config(useSmallBand ? 'smallBandSize' : 'largeBandSize');
  };

  proto.aggr = function(x) {
    return this._enc[x].aggr;
  };

  proto.bin = function(x) {
    return this._enc[x].bin;
  };

  proto.legend = function(x) {
    return this._enc[x].legend;
  };

  proto.value = function(x) {
    return this._enc[x].value;
  };

  proto.fn = function(x) {
    return this._enc[x].fn;
  };

  proto.any = function(f) {
    return util.any(this._enc, f);
  };

  proto.all = function(f) {
    return util.all(this._enc, f);
  };

  proto.length = function() {
    return util.keys(this._enc).length;
  };

  proto.map = function(f) {
    var arr = [], k;
    for (k in this._enc) {
      if(this.has(k)){
        arr.push(f(this._enc[k], k, this._enc));
      }
    }
    return arr;
  };

  proto.reduce = function(f, init) {
    var r = init, i = 0, k;
    for (k in this._enc) {
      if (this.has(k)) {
        r = f(r, this._enc[k], k, this._enc);
      }
    }
    return r;
  };

  proto.forEach = function(f) {
    var i = 0, k;
    for (k in this._enc) {
      if (this.has(k)) {
        f(k, this._enc[k], i++);
      }
    }
  };

  proto.type = function(x) {
    return this.has(x) ? this._enc[x].type : null;
  };

  proto.text = function(prop) {
    var text = this._enc[TEXT].text;
    return prop ? text[prop] : text;
  };

  proto.font = function(prop) {
    var font = this._enc[TEXT].text;
    return prop ? font[prop] : font;
  };

  proto.isType = function(x, type) {
    var field = this.enc(x);
    return field && isType(field, type);
  };

  var isType = Encoding.isType = function (fieldDef, type) {
    return (fieldDef.type & type) > 0;
  };

  var isOrdinalScale = Encoding.isOrdinalScale = function (encoding, encType){
    return vlfield.isOrdinalScale(encoding.enc(encType), isType);
  }

  proto.isOrdinalScale = function(encType) {
    return this.has(encType) && isOrdinalScale(this, encType);
  };

  proto.isQuantScale = function(encType) {
    return this.has(encType) && !isOrdinalScale(this, encType);
  };

  proto.isAggregate = function() {
    var i = 0, k;
    for (k in this._enc) {
      if (this.has(k) && this.aggr(k)) {
        return true;
      }
    }
    return false;
  };

  Encoding.isAggregate = function(spec) {
    var i = 0, k, enc= spec.enc;
    for (k in enc) {
      if (enc[k] && enc[k].aggr) {
        return true;
      }
    }
    return false;
  };

  proto.cardinality = function(encType, stats) {
    return vlfield.cardinality(this._enc[encType], stats, this.config('maxbins'), isType);
  };

  proto.isRaw = function() {
    return !this.isAggregate();
  };

  proto.isDimension = function(encType) {
    return this.has(encType) && this.isAggregate() &&
      isOrdinalScale(this, encType);
  };

  proto.isMeasure = function(encType) {
    return this.has(encType) && this.isAggregate() &&
      !isOrdinalScale(this, encType);
  };

  proto.config = function(name) {
    return this._cfg[name];
  };

  proto.toSpec = function(excludeConfig) {
    var enc = util.duplicate(this._enc),
      spec;

    // convert type's bitcode to type name
    for (var e in enc) {
      enc[e].type = consts.dataTypeNames[enc[e].type];
    }

    spec = {
      marktype: this._marktype,
      enc: enc,
      filter: this._filter
    };

    if (!excludeConfig) {
      spec.cfg = util.duplicate(this._cfg);
    }

    // remove defaults
    var defaults = schema.instantiate();
    return schema.util.subtract(spec, defaults);
  };

  proto.toShorthand = function() {
    var enc = this._enc;
    var c = consts.shorthand;
    return 'mark' + c.assign + this._marktype + c.delim +
      this.map(function(v, e) {
        return e + c.assign + vlfield.shorthand(v);
      }).join(c.delim);
  };

  Encoding.shorthandFromSpec = function (){
    return Encoding.fromSpec.apply(null, arguments).toShorthand();
  };

  Encoding.parseShorthand = function(shorthand, cfg) {
    var c = consts.shorthand,
        enc = shorthand.split(c.delim),
        marktype = enc.shift().split(c.assign)[1].trim();

    enc = enc.reduce(function(m, e) {
      var split = e.split(c.assign),
          enctype = split[0].trim(), o;

      split = split[1].split(c.type);
      o = {
        name: split[0].trim(),
        type: consts.dataTypes[split[1].trim()]
      };

      // check aggregate type
      for (var i in schema.aggr.enum) {
        var a = schema.aggr.enum[i];
        if (o.name.indexOf(a + '_') === 0) {
          o.name = o.name.substr(a.length + 1);
          if (a == 'count' && o.name.length === 0) o.name = '*';
          o.aggr = a;
          break;
        }
      }

      // check time fn
      for (var i in schema.timefns) {
        var f = schema.timefns[i];
        if (o.name && o.name.indexOf(f + '_') === 0) {
          o.name = o.name.substr(o.length + 1);
          o.fn = f;
          break;
        }
      }

      // check bin
      if (o.name && o.name.indexOf('bin_') === 0) {
        o.name = o.name.substr(4);
        o.bin = true;
      }

      m[enctype] = o;
      return m;
    }, {});

    return new Encoding(marktype, enc, cfg);
  };

  Encoding.fromSpec = function(spec, theme, extraCfg) {
    var enc = util.duplicate(spec.enc);

    //convert type from string to bitcode (e.g, O=1)
    for (var e in enc) {
      enc[e].type = consts.dataTypes[enc[e].type];
    }

    return new Encoding(spec.marktype, enc, util.merge(spec.cfg || {}, extraCfg || {}), spec.filter, theme);
  };

  return Encoding;

})();

},{"./compile/time":18,"./consts":19,"./field":22,"./globals":23,"./schema/schema":24,"./util":26}],3:[function(require,module,exports){
var globals = require('../globals'),
  util = require('../util');

module.exports = aggregates;

function aggregates(spec, encoding, opt) {
  opt = opt || {};
  var dims = {}, meas = {}, detail = {}, facets = {};
  encoding.forEach(function(encType, field) {
    if (field.aggr) {
      if (field.aggr === 'count') {
        meas['count'] = {op: 'count', field: '*'};
      }else {
        meas[field.aggr + '|'+ field.name] = {
          op: field.aggr,
          field: 'data.'+ field.name
        };
      }
    } else {
      dims[field.name] = encoding.field(encType);
      if (encType == ROW || encType == COL) {
        facets[field.name] = dims[field.name];
      }else if (encType !== X && encType !== Y) {
        detail[field.name] = dims[field.name];
      }
    }
  });
  dims = util.vals(dims);
  meas = util.vals(meas);

  if (meas.length > 0 && !opt.preaggregatedData) {
    if (!spec.transform) spec.transform = [];
    spec.transform.push({
      type: 'aggregate',
      groupby: dims,
      fields: meas
    });

    if (encoding.marktype() === TEXT) {
      meas.forEach(function(m) {
        var fieldName = m.field.substr(5), //remove "data."
          field = 'data.' + (m.op ? m.op + '_' : '') + fieldName;
        spec.transform.push({
          type: 'formula',
          field: field,
          expr: "d3.format('.2f')(d." + field + ')'
        });
      });
    }
  }
  return {
    details: util.vals(detail),
    dims: dims,
    facets: util.vals(facets),
    aggregated: meas.length > 0
  };
}

},{"../globals":23,"../util":26}],4:[function(require,module,exports){
var globals = require('../globals'),
  util = require('../util'),
  setter = util.setter,
  getter = util.getter,
  time = require('./time');

var axis = module.exports = {};

axis.names = function(props) {
  return util.keys(util.keys(props).reduce(function(a, x) {
    var s = props[x].scale;
    if (s === X || s === Y) a[props[x].scale] = 1;
    return a;
  }, {}));
};

axis.defs = function(names, encoding, layout, opt) {
  return names.reduce(function(a, name) {
    a.push(axis.def(name, encoding, layout, opt));
    return a;
  }, []);
};

axis.def = function(name, encoding, layout, opt) {
  var type = name;
  var isCol = name == COL, isRow = name == ROW;
  if (isCol) type = 'x';
  if (isRow) type = 'y';

  var def = {
    type: type,
    scale: name
  };

  if (encoding.axis(name).grid) {
    def.grid = true;
    def.layer = 'back';
  }

  if (encoding.axis(name).title) {
    def = axis_title(def, name, encoding, layout, opt);
  }

  if (isRow || isCol) {
    setter(def, ['properties', 'ticks'], {
      opacity: {value: 0}
    });
    setter(def, ['properties', 'majorTicks'], {
      opacity: {value: 0}
    });
    setter(def, ['properties', 'axis'], {
      opacity: {value: 0}
    });
  }

  if (isCol) {
    def.orient = 'top';
  }

  if (isRow) {
    def.offset = axisTitleOffset(encoding, layout, Y) + 20;
  }

  if (name == X) {
    if (encoding.isOrdinalScale(X) || encoding.isType(X, T)) {
      setter(def, ['properties','labels'], {
        angle: {value: 270},
        align: {value: 'right'},
        baseline: {value: 'middle'}
      });
    } else { // Q
      def.ticks = 5;
    }
  }

  if (encoding.axis(name).format) {
    def.format = encoding.axis(name).format;
  } else if (encoding.isType(name, Q)) {
    def.format = "s";
  } else if (encoding.isType(name, T)) {
    if (!encoding.fn(name)) {
      def.format = "%Y-%m-%d";
    } else {
      def.format = "d";
    }
  }

  var fn;
  // add custom label for time type
  if (encoding.isType(name, T) && (fn = encoding.fn(name)) && (time.hasScale(fn))) {
    setter(def, ['properties','labels','text','scale'], 'time-'+ fn);
  }

  return def;
};

function axis_title(def, name, encoding, layout, opt) {
  var maxlength = null,
    fieldTitle = encoding.fieldTitle(name);
  if (name===X) {
    maxlength = layout.cellWidth / encoding.config('characterWidth');
  } else if (name === Y) {
    maxlength = layout.cellHeight / encoding.config('characterWidth');
  }

  def.title = maxlength ? util.truncate(fieldTitle, maxlength) : fieldTitle;

  if (name === ROW) {
    setter(def, ['properties','title'], {
      angle: {value: 0},
      align: {value: 'right'},
      baseline: {value: 'middle'},
      dy: {value: (-layout.height/2) -20}
    });
  }
  def.titleOffset = axisTitleOffset(encoding, layout, name);
  return def;
}

function axisTitleOffset(encoding, layout, name) {
  var value = encoding.axis(name).titleOffset;
  if (value) {
    return value;
  }
  switch (name) {
    case ROW: return 0;
    case COL: return 35;
  }
  return getter(layout, [name, 'axisTitleOffset']);
}

},{"../globals":23,"../util":26,"./time":18}],5:[function(require,module,exports){
var globals = require('../globals'),
  util = require('../util');

module.exports = binning;

function binning(spec, encoding, opt) {
  opt = opt || {};
  var bins = {};
  encoding.forEach(function(vv, d) {
    if (d.bin) bins[d.name] = d.name;
  });
  bins = util.keys(bins);

  if (bins.length === 0 || opt.preaggregatedData) return false;

  if (!spec.transform) spec.transform = [];
  bins.forEach(function(d) {
    spec.transform.push({
      type: 'bin',
      field: 'data.' + d,
      output: 'data.bin_' + d,
      maxbins: encoding.config('maxbins')
    });
  });
  return bins;
}

},{"../globals":23,"../util":26}],6:[function(require,module,exports){
var globals = require('../globals'),
  util = require('../util');

module.exports = compile;

var template = compile.template = require('./template'),
  axis = compile.axis = require('./axis'),
  filter = compile.filter = require('./filter'),
  legend = compile.legend = require('./legend'),
  marks = compile.marks = require('./marks'),
  scale = compile.scale = require('./scale'),
  vlstyle = compile.style = require('./style'),
  time = compile.time = require('./time'),
  aggregates = compile.aggregates = require('./aggregates'),
  binning = compile.binning = require('./binning'),
  faceting = compile.faceting = require('./faceting'),
  stacking = compile.stacking = require('./stacking');
  subfaceting = compile.subfaceting = require('./subfaceting');

compile.layout = require('./layout');
compile.group = require('./group');

function compile(encoding, stats) {
  var layout = compile.layout(encoding, stats),
    style = vlstyle(encoding, stats),
    spec = template(encoding, layout, stats),
    group = spec.marks[0],
    mark = marks[encoding.marktype()],
    mdef = marks.def(mark, encoding, layout, style);

  filter(spec, encoding);

  var hasRow = encoding.has(ROW), hasCol = encoding.has(COL);

  var preaggregatedData = encoding.config('useVegaServer');

  group.marks.push(mdef);
  // TODO: return value not used
  binning(spec.data[0], encoding, {preaggregatedData: preaggregatedData});

  var lineType = marks[encoding.marktype()].line;

  if (!preaggregatedData) {
    spec = time(spec, encoding);
  }

  // handle subfacets
  var aggResult = aggregates(spec.data[0], encoding, {preaggregatedData: preaggregatedData}),
    details = aggResult.details,
    hasDetails = details && details.length > 0,
    stack = hasDetails && stacking(spec, encoding, mdef, aggResult.facets);

  if (hasDetails && (stack || lineType)) {
    //subfacet to group stack / line together in one group
    subfaceting(group, mdef, details, stack, encoding);
  }

  // auto-sort line/area values
  //TODO(kanitw): have some config to turn off auto-sort for line (for line chart that encodes temporal information)
  if (lineType) {
    var f = (encoding.isQuantScale(X) && encoding.isOrdinalScale(Y)) ? Y : X;
    if (!mdef.from) mdef.from = {};
    mdef.from.transform = [{type: 'sort', by: encoding.field(f)}];
  }

  // Small Multiples
  if (hasRow || hasCol) {
    spec = faceting(group, encoding, layout, style, spec, mdef, stack, stats);
    spec.legends = legend.defs(encoding);
  } else {
    group.scales = scale.defs(scale.names(mdef.properties.update), encoding, layout, style,
      {stack: stack, stats: stats});
    group.axes = axis.defs(axis.names(mdef.properties.update), encoding, layout);
    group.legends = legend.defs(encoding);
  }
  return spec;
}


},{"../globals":23,"../util":26,"./aggregates":3,"./axis":4,"./binning":5,"./faceting":7,"./filter":8,"./group":9,"./layout":10,"./legend":11,"./marks":12,"./scale":13,"./stacking":14,"./style":15,"./subfaceting":16,"./template":17,"./time":18}],7:[function(require,module,exports){
var globals = require('../globals'),
  util = require('../util');

var axis = require('./axis'),
  groupdef = require('./group').def,
  scale = require('./scale');

module.exports = faceting;

function faceting(group, encoding, layout, style, spec, mdef, stack, stats) {
  var enter = group.properties.enter;
  var facetKeys = [], cellAxes = [], from, axesGrp;

  var hasRow = encoding.has(ROW), hasCol = encoding.has(COL);

  enter.fill = {value: encoding.config('cellBackgroundColor')};

  //move "from" to cell level and add facet transform
  group.from = {data: group.marks[0].from.data};

  if (group.marks[0].from.transform) {
    delete group.marks[0].from.data; //need to keep transform for subfacetting case
  } else {
    delete group.marks[0].from;
  }
  if (hasRow) {
    if (!encoding.isOrdinalScale(ROW)) {
      util.error('Row encoding should be ordinal.');
    }
    enter.y = {scale: ROW, field: 'keys.' + facetKeys.length};
    enter.height = {'value': layout.cellHeight}; // HACK

    facetKeys.push(encoding.field(ROW));

    if (hasCol) {
      from = util.duplicate(group.from);
      from.transform = from.transform || [];
      from.transform.unshift({type: 'facet', keys: [encoding.field(COL)]});
    }

    axesGrp = groupdef('x-axes', {
        axes: encoding.has(X) ? axis.defs(['x'], encoding, layout) : undefined,
        x: hasCol ? {scale: COL, field: 'keys.0'} : {value: 0},
        width: hasCol && {'value': layout.cellWidth}, //HACK?
        from: from
      });

    spec.marks.push(axesGrp);
    (spec.axes = spec.axes || []);
    spec.axes.push.apply(spec.axes, axis.defs(['row'], encoding, layout));
  } else { // doesn't have row
    if (encoding.has(X)) {
      //keep x axis in the cell
      cellAxes.push.apply(cellAxes, axis.defs(['x'], encoding, layout));
    }
  }

  if (hasCol) {
    if (!encoding.isOrdinalScale(COL)) {
      util.error('Col encoding should be ordinal.');
    }
    enter.x = {scale: COL, field: 'keys.' + facetKeys.length};
    enter.width = {'value': layout.cellWidth}; // HACK

    facetKeys.push(encoding.field(COL));

    if (hasRow) {
      from = util.duplicate(group.from);
      from.transform = from.transform || [];
      from.transform.unshift({type: 'facet', keys: [encoding.field(ROW)]});
    }

    axesGrp = groupdef('y-axes', {
      axes: encoding.has(Y) ? axis.defs(['y'], encoding, layout) : undefined,
      y: hasRow && {scale: ROW, field: 'keys.0'},
      x: hasRow && {value: 0},
      height: hasRow && {'value': layout.cellHeight}, //HACK?
      from: from
    });

    spec.marks.push(axesGrp);
    (spec.axes = spec.axes || []);
    spec.axes.push.apply(spec.axes, axis.defs(['col'], encoding, layout));
  } else { // doesn't have col
    if (encoding.has(Y)) {
      cellAxes.push.apply(cellAxes, axis.defs(['y'], encoding, layout));
    }
  }

  // assuming equal cellWidth here
  // TODO: support heterogenous cellWidth (maybe by using multiple scales?)
  spec.scales = (spec.scales || []).concat(scale.defs(
    scale.names(enter).concat(scale.names(mdef.properties.update)),
    encoding,
    layout,
    style,
    {stack: stack, facet: true, stats: stats}
  )); // row/col scales + cell scales

  if (cellAxes.length > 0) {
    group.axes = cellAxes;
  }

  // add facet transform
  var trans = (group.from.transform || (group.from.transform = []));
  trans.unshift({type: 'facet', keys: facetKeys});

  return spec;
}

},{"../globals":23,"../util":26,"./axis":4,"./group":9,"./scale":13}],8:[function(require,module,exports){
var globals = require('../globals');

var BINARY = {
  '>':  true,
  '>=': true,
  '=':  true,
  '!=': true,
  '<':  true,
  '<=': true
};

module.exports = function(spec, encoding) {
  var filters = encoding.filter();

  if (!spec.data[0].transform)
    spec.data[0].transform = [];

  // add custom filters
  for (i in filters) {
    var filter = filters[i];

    var condition = '';
    var operator = filter.operator;
    var operands = filter.operands;

    if (BINARY[operator]) {
      // expects a field and a value
      if (operator === '=') {
        operator = '==';
      }

      var op1 = operands[0];
      var op2 = operands[1];
      condition = 'd.data.' + op1 + operator + op2;
    } else if (operator === 'notNull') {
      // expects a number of fields
      for (j in operands) {
        condition += 'd.data.' + operands[j] + '!=null'
        if (j < operands.length - 1) {
          condition += ' && '
        }
      }
    } else {
      console.warn('Unsupported operator: ', operator);
    }

    spec.data[0].transform.push({
      type: 'filter',
      test: condition
    });
  };

  // remove 0 values if we use log function
  encoding.forEach(function(encType, field) {
    if (encoding.scale(encType).type === 'log') {
      spec.data[0].transform.push({
        type: 'filter',
        test: 'd.data.' + field.name + '>0'
      });
    }
  });
};


},{"../globals":23}],9:[function(require,module,exports){
module.exports = {
  def: groupdef
};

function groupdef(name, opt) {
  opt = opt || {};
  return {
    _name: name || undefined,
    type: 'group',
    from: opt.from,
    properties: {
      enter: {
        x: opt.x || undefined,
        y: opt.y || undefined,
        width: opt.width || {group: 'width'},
        height: opt.height || {group: 'height'}
      }
    },
    scales: opt.scales || undefined,
    axes: opt.axes || undefined,
    marks: opt.marks || []
  };
}

},{}],10:[function(require,module,exports){
var globals = require('../globals'),
  util = require('../util'),
  setter = util.setter,
  schema = require('../schema/schema'),
  time = require('./time'),
  vlfield = require('../field');

module.exports = vllayout;

function vllayout(encoding, stats) {
  var layout = box(encoding, stats);
  layout = offset(encoding, stats, layout);
  return layout;
}

/*
  HACK to set chart size
  NOTE: this fails for plots driven by derived values (e.g., aggregates)
  One solution is to update Vega to support auto-sizing
  In the meantime, auto-padding (mostly) does the trick
 */
function box(encoding, stats) {
  var hasRow = encoding.has(ROW),
      hasCol = encoding.has(COL),
      hasX = encoding.has(X),
      hasY = encoding.has(Y),
      marktype = encoding.marktype();

  var xCardinality = hasX && encoding.isOrdinalScale(X) ? encoding.cardinality(X, stats) : 1,
    yCardinality = hasY && encoding.isOrdinalScale(Y) ? encoding.cardinality(Y, stats) : 1;

  var useSmallBand = xCardinality > encoding.config('largeBandMaxCardinality') ||
    yCardinality > encoding.config('largeBandMaxCardinality');

  var cellWidth, cellHeight, cellPadding = encoding.config('cellPadding');

  // set cellWidth
  if (hasX) {
    if (encoding.isOrdinalScale(X)) {
      // for ordinal, hasCol or not doesn't matter -- we scale based on cardinality
      cellWidth = (xCardinality + encoding.band(X).padding) * encoding.bandSize(X, useSmallBand);
    } else {
      cellWidth = hasCol || hasRow ? encoding.enc(COL).width :  encoding.config("singleWidth");
    }
  } else {
    if (marktype === TEXT) {
      cellWidth = encoding.config('textCellWidth');
    } else {
      cellWidth = encoding.bandSize(X);
    }
  }

  // set cellHeight
  if (hasY) {
    if (encoding.isOrdinalScale(Y)) {
      // for ordinal, hasCol or not doesn't matter -- we scale based on cardinality
      cellHeight = (yCardinality + encoding.band(Y).padding) * encoding.bandSize(Y, useSmallBand);
    } else {
      cellHeight = hasCol || hasRow ? encoding.enc(ROW).height :  encoding.config("singleHeight");
    }
  } else {
    cellHeight = encoding.bandSize(Y);
  }

  // Cell bands use rangeBands(). There are n-1 padding.  Outerpadding = 0 for cells

  var width = cellWidth, height = cellHeight;
  if (hasCol) {
    var colCardinality = encoding.cardinality(COL, stats);
    width = cellWidth * ((1 + cellPadding) * (colCardinality - 1) + 1);
  }
  if (hasRow) {
    var rowCardinality =  encoding.cardinality(ROW, stats);
    height = cellHeight * ((1 + cellPadding) * (rowCardinality - 1) + 1);
  }

  return {
    cellWidth: cellWidth,
    cellHeight: cellHeight,
    width: width,
    height: height,
    x: {useSmallBand: useSmallBand},
    y: {useSmallBand: useSmallBand}
  };
}

function offset(encoding, stats, layout) {
  [X, Y].forEach(function (x) {
    var maxLength;
    if (encoding.isOrdinalScale(x) || encoding.isType(x, T)) {
      maxLength = stats[encoding.fieldName(x)].maxlength;
    } else if (encoding.aggr(x) === 'count') {
      //assign default value for count as it won't have stats
      maxLength =  3;
    } else if (encoding.isType(x, Q)) {
      if (x===X) {
        maxLength = 3;
      } else { // Y
        //assume that default formating is always shorter than 7
        maxLength = Math.min(stats[encoding.fieldName(x)].maxlength, 7);
      }
    }
    setter(layout,[x, 'axisTitleOffset'], encoding.config('characterWidth') *  maxLength + 20);
  });
  return layout;
}

},{"../field":22,"../globals":23,"../schema/schema":24,"../util":26,"./time":18}],11:[function(require,module,exports){
var global = require('../globals'),
  time = require('./time');

var legend = module.exports = {};

legend.defs = function(encoding) {
  var defs = [];

  // TODO: support alpha

  if (encoding.has(COLOR) && encoding.legend(COLOR)) {
    defs.push(legend.def(COLOR, encoding, {
      fill: COLOR,
      orient: 'right'
    }));
  }

  if (encoding.has(SIZE) && encoding.legend(SIZE)) {
    defs.push(legend.def(SIZE, encoding, {
      size: SIZE,
      orient: defs.length === 1 ? 'left' : 'right'
    }));
  }

  if (encoding.has(SHAPE) && encoding.legend(SHAPE)) {
    if (defs.length === 2) {
      // TODO: fix this
      console.error('Vegalite currently only supports two legends');
      return defs;
    }
    defs.push(legend.def(SHAPE, encoding, {
      shape: SHAPE,
      orient: defs.length === 1 ? 'left' : 'right'
    }));
  }

  return defs;
};

legend.def = function(name, encoding, props) {
  var def = props, fn;

  def.title = encoding.fieldTitle(name);

  if (encoding.isType(name, T) && (fn = encoding.fn(name)) &&
    time.hasScale(fn)) {
    var properties = def.properties = def.properties || {},
      labels = properties.labels = properties.labels || {},
      text = labels.text = labels.text || {};

    text.scale = 'time-'+ fn;
  }

  return def;
};

},{"../globals":23,"./time":18}],12:[function(require,module,exports){
var globals = require('../globals'),
  util = require('../util');

var marks = module.exports = {};

marks.def = function(mark, encoding, layout, style) {
  var p = mark.prop(encoding, layout, style);
  return {
    type: mark.type,
    from: {data: TABLE},
    properties: {enter: p, update: p}
  };
};

marks.bar = {
  type: 'rect',
  stack: true,
  prop: bar_props,
  requiredEncoding: ['x', 'y'],
  supportedEncoding: {row: 1, col: 1, x: 1, y: 1, size: 1, color: 1, alpha: 1}
};

marks.line = {
  type: 'line',
  line: true,
  prop: line_props,
  requiredEncoding: ['x', 'y'],
  supportedEncoding: {row: 1, col: 1, x: 1, y: 1, color: 1, alpha: 1}
};

marks.area = {
  type: 'area',
  stack: true,
  line: true,
  requiredEncoding: ['x', 'y'],
  prop: area_props,
  supportedEncoding: marks.line.supportedEncoding
};

marks.circle = {
  type: 'symbol',
  prop: filled_point_props('circle'),
  supportedEncoding: {row: 1, col: 1, x: 1, y: 1, size: 1, color: 1, alpha: 1}
};

marks.square = {
  type: 'symbol',
  prop: filled_point_props('square'),
  supportedEncoding: marks.circle.supportedEncoding
};

marks.point = {
  type: 'symbol',
  prop: point_props,
  supportedEncoding: {row: 1, col: 1, x: 1, y: 1, size: 1, color: 1, alpha: 1, shape: 1}
};

marks.text = {
  type: 'text',
  prop: text_props,
  requiredEncoding: ['text'],
  supportedEncoding: {row: 1, col: 1, size: 1, color: 1, alpha: 1, text: 1}
};

function bar_props(e, layout) {
  var p = {};

  // x
  if (e.isQuantScale(X)) {
    p.x = {scale: X, field: e.field(X)};
    if (e.isOrdinalScale(Y)) {
      p.x2 = {scale: X, value: 0};
    }
  } else if (e.has(X)) { // is ordinal
    p.xc = {scale: X, field: e.field(X)};
  } else {
    // TODO add single bar offset
    p.xc = {value: 0};
  }

  // y
  if (e.isQuantScale(Y)) {
    p.y = {scale: Y, field: e.field(Y)};
    p.y2 = {scale: Y, value: 0};
  } else if (e.has(Y)) { // is ordinal
    p.yc = {scale: Y, field: e.field(Y)};
  } else {
    // TODO add single bar offset
    p.yc = {group: 'height'};
  }

  // width
  if (!e.isQuantScale(X)) { // no X or X is ordinal
    if (e.has(SIZE)) {
      p.width = {scale: SIZE, field: e.field(SIZE)};
    } else {
      // p.width = {scale: X, band: true, offset: -1};
      p.width = {value: e.bandSize(X, layout.x.useSmallBand), offset: -1};
    }
  } else { // X is Quant
    p.width = {value: e.bandSize(X, layout.x.useSmallBand), offset: -1};
  }

  // height
  if (!e.isQuantScale(Y)) { // no Y or Y is ordinal
    if (e.has(SIZE)) {
      p.height = {scale: SIZE, field: e.field(SIZE)};
    } else {
      // p.height = {scale: Y, band: true, offset: -1};
      p.height = {value: e.bandSize(Y, layout.y.useSmallBand), offset: -1};
    }
  } else { // Y is Quant
    p.height = {value: e.bandSize(Y, layout.y.useSmallBand), offset: -1};
  }

  // fill
  if (e.has(COLOR)) {
    p.fill = {scale: COLOR, field: e.field(COLOR)};
  } else {
    p.fill = {value: e.value(COLOR)};
  }

  // alpha
  if (e.has(ALPHA)) {
    p.opacity = {scale: ALPHA, field: e.field(ALPHA)};
  } else if (e.value(ALPHA) !== undefined) {
    p.opacity = {value: e.value(ALPHA)};
  }

  return p;
}

function point_props(e, layout, style) {
  var p = {};

  // x
  if (e.has(X)) {
    p.x = {scale: X, field: e.field(X)};
  } else if (!e.has(X)) {
    p.x = {value: e.bandSize(X, layout.x.useSmallBand) / 2};
  }

  // y
  if (e.has(Y)) {
    p.y = {scale: Y, field: e.field(Y)};
  } else if (!e.has(Y)) {
    p.y = {value: e.bandSize(Y, layout.y.useSmallBand) / 2};
  }

  // size
  if (e.has(SIZE)) {
    p.size = {scale: SIZE, field: e.field(SIZE)};
  } else if (!e.has(SIZE)) {
    p.size = {value: e.value(SIZE)};
  }

  // shape
  if (e.has(SHAPE)) {
    p.shape = {scale: SHAPE, field: e.field(SHAPE)};
  } else if (!e.has(SHAPE)) {
    p.shape = {value: e.value(SHAPE)};
  }

  // stroke
  if (e.has(COLOR)) {
    p.stroke = {scale: COLOR, field: e.field(COLOR)};
  } else if (!e.has(COLOR)) {
    p.stroke = {value: e.value(COLOR)};
  }

  // alpha
  if (e.has(ALPHA)) {
    p.opacity = {scale: ALPHA, field: e.field(ALPHA)};
  } else if (e.value(ALPHA) !== undefined) {
    p.opacity = {value: e.value(ALPHA)};
  } else {
    p.opacity = {value: style.opacity};
  }

  p.strokeWidth = {value: e.config('strokeWidth')};

  return p;
}

function line_props(e, layout, style) {
  var p = {};

  // x
  if (e.has(X)) {
    p.x = {scale: X, field: e.field(X)};
  } else if (!e.has(X)) {
    p.x = {value: 0};
  }

  // y
  if (e.has(Y)) {
    p.y = {scale: Y, field: e.field(Y)};
  } else if (!e.has(Y)) {
    p.y = {group: 'height'};
  }

  // stroke
  if (e.has(COLOR)) {
    p.stroke = {scale: COLOR, field: e.field(COLOR)};
  } else if (!e.has(COLOR)) {
    p.stroke = {value: e.value(COLOR)};
  }

  // alpha
  if (e.has(ALPHA)) {
    p.opacity = {scale: ALPHA, field: e.field(ALPHA)};
  } else if (e.value(ALPHA) !== undefined) {
    p.opacity = {value: e.value(ALPHA)};
  }

  p.strokeWidth = {value: e.config('strokeWidth')};

  return p;
}

function area_props(e, layout, style) {
  var p = {};

  // x
  if (e.isQuantScale(X)) {
    p.x = {scale: X, field: e.field(X)};
    if (e.isOrdinalScale(Y)) {
      p.x2 = {scale: X, value: 0};
      p.orient = {value: 'horizontal'};
    }
  } else if (e.has(X)) {
    p.x = {scale: X, field: e.field(X)};
  } else {
    p.x = {value: 0};
  }

  // y
  if (e.isQuantScale(Y)) {
    p.y = {scale: Y, field: e.field(Y)};
    p.y2 = {scale: Y, value: 0};
  } else if (e.has(Y)) {
    p.y = {scale: Y, field: e.field(Y)};
  } else {
    p.y = {group: 'height'};
  }

  // stroke
  if (e.has(COLOR)) {
    p.fill = {scale: COLOR, field: e.field(COLOR)};
  } else if (!e.has(COLOR)) {
    p.fill = {value: e.value(COLOR)};
  }

  // alpha
  if (e.has(ALPHA)) {
    p.opacity = {scale: ALPHA, field: e.field(ALPHA)};
  } else if (e.value(ALPHA) !== undefined) {
    p.opacity = {value: e.value(ALPHA)};
  }

  return p;
}

function filled_point_props(shape) {
  return function(e, style) {
    var p = {};

    // x
    if (e.has(X)) {
      p.x = {scale: X, field: e.field(X)};
    } else if (!e.has(X)) {
      p.x = {value: e.bandSize(X, layout.x.useSmallBand) / 2};
    }

    // y
    if (e.has(Y)) {
      p.y = {scale: Y, field: e.field(Y)};
    } else if (!e.has(Y)) {
      p.y = {value: e.bandSize(Y, layout.y.useSmallBand) / 2};
    }

    // size
    if (e.has(SIZE)) {
      p.size = {scale: SIZE, field: e.field(SIZE)};
    } else if (!e.has(X)) {
      p.size = {value: e.value(SIZE)};
    }

    // shape
    p.shape = {value: shape};

    // fill
    if (e.has(COLOR)) {
      p.fill = {scale: COLOR, field: e.field(COLOR)};
    } else if (!e.has(COLOR)) {
      p.fill = {value: e.value(COLOR)};
    }

    // alpha
    if (e.has(ALPHA)) {
      p.opacity = {scale: ALPHA, field: e.field(ALPHA)};
    } else if (e.value(ALPHA) !== undefined) {
      p.opacity = {value: e.value(ALPHA)};
    } else {
      p.opacity = {value: style.opacity};
    }

    return p;
  };
}

function text_props(e, layout, style) {
  var p = {};

  // x
  if (e.has(X)) {
    p.x = {scale: X, field: e.field(X)};
  } else if (!e.has(X)) {
    p.x = {value: e.bandSize(X, layout.x.useSmallBand) / 2};
  }

  // y
  if (e.has(Y)) {
    p.y = {scale: Y, field: e.field(Y)};
  } else if (!e.has(Y)) {
    p.y = {value: e.bandSize(Y, layout.y.useSmallBand) / 2};
  }

  // size
  if (e.has(SIZE)) {
    p.fontSize = {scale: SIZE, field: e.field(SIZE)};
  } else if (!e.has(X)) {
    p.fontSize = {value: e.font('size')};
  }

  // fill
  if (e.has(COLOR)) {
    p.fill = {scale: COLOR, field: e.field(COLOR)};
  } else if (!e.has(COLOR)) {
    p.fill = {value: e.value(COLOR)};
  }

  // alpha
  if (e.has(ALPHA)) {
    p.opacity = {scale: ALPHA, field: e.field(ALPHA)};
  } else if (e.value(ALPHA) !== undefined) {
    p.opacity = {value: e.value(ALPHA)};
  } else {
    p.opacity = {value: style.opacity};
  }

  // text
  if (e.has(TEXT)) {
    p.text = {field: e.field(TEXT)};
  } else {
    p.text = {value: 'Abc'};
  }

  p.font = {value: e.font('family')};
  p.fontWeight = {value: e.font('weight')};
  p.fontStyle = {value: e.font('style')};
  p.baseline = {value: e.text('baseline')};

  // align
  if (e.has(X)) {
    if (e.isOrdinalScale(X)) {
      p.align = {value: 'left'};
      p.dx = {value: e.text('margin')};
    } else {
      p.align = {value: 'center'};
    }
  } else if (e.has(Y)) {
    p.align = {value: 'left'};
    p.dx = {value: e.text('margin')};
  } else {
    p.align = {value: e.text('align')};
  }

  return p;
}

},{"../globals":23,"../util":26}],13:[function(require,module,exports){
var globals = require('../globals'),
  util = require('../util'),
  time = require('./time');

var scale = module.exports = {};

scale.names = function(props) {
  return util.keys(util.keys(props).reduce(function(a, x) {
    if (props[x] && props[x].scale) a[props[x].scale] = 1;
    return a;
  }, {}));
};

scale.defs = function(names, encoding, layout, style, opt) {
  opt = opt || {};

  return names.reduce(function(a, name) {
    var s = {
      name: name,
      type: scale.type(name, encoding),
      domain: scale_domain(name, encoding, opt)
    };
    if (s.type === 'ordinal' && !encoding.bin(name)) {
      s.sort = true;
    }

    scale_range(s, encoding, layout, style, opt);

    return (a.push(s), a);
  }, []);
};

scale.type = function(name, encoding) {

  switch (encoding.type(name)) {
    case O: return 'ordinal';
    case T:
      var fn = encoding.fn(name);
      return (fn && time.scale.type(fn)) || 'time';
    case Q:
      if (encoding.bin(name)) {
        return 'ordinal';
      }
      return encoding.scale(name).type;
  }
};

function scale_domain(name, encoding, opt) {
  if (encoding.isType(name, T)) {
    var range = time.scale.domain(encoding.fn(name));
    if(range) return range;
  }

  if (encoding.bin(name)) {
    // TODO: add includeEmptyConfig here
    if (opt.stats) {
      var bins = util.getbins(opt.stats[encoding.fieldName(name)], encoding.config('maxbins'));
      var domain = util.range(bins.start, bins.stop, bins.step);
      return name === Y ? domain.reverse() : domain;
    }
  }

  return name == opt.stack ?
    {
      data: STACKED,
      field: 'data.' + (opt.facet ? 'max_' : '') + 'sum_' + encoding.field(name, true)
    } :
    {data: TABLE, field: encoding.field(name)};
}

function scale_range(s, encoding, layout, style, opt) {
  var spec = encoding.scale(s.name);
  switch (s.name) {
    case X:
      if (s.type === 'ordinal') {
        s.bandWidth = encoding.bandSize(X, layout.x.useSmallBand);
      } else {
        s.range = layout.cellWidth ? [0, layout.cellWidth] : 'width';
        s.zero = spec.zero ||
          ( encoding.isType(s.name,T) && encoding.fn(s.name) === 'year' ? false : true );
        s.reverse = spec.reverse;
      }
      s.round = true;
      if (s.type === 'time') {
        s.nice = encoding.fn(s.name);
      }else {
        s.nice = true;
      }
      break;
    case Y:
      if (s.type === 'ordinal') {
        s.bandWidth = encoding.bandSize(Y, layout.y.useSmallBand);
      } else {
        s.range = layout.cellHeight ? [layout.cellHeight, 0] : 'height';
        s.zero = spec.zero ||
          ( encoding.isType(s.name, T) && encoding.fn(s.name) === 'year' ? false : true );
        s.reverse = spec.reverse;
      }

      s.round = true;

      if (s.type === 'time') {
        s.nice = encoding.fn(s.name) || encoding.config('timeScaleNice');
      }else {
        s.nice = true;
      }
      break;
    case ROW: // support only ordinal
      s.bandWidth = layout.cellHeight;
      s.round = true;
      s.nice = true;
      break;
    case COL: // support only ordinal
      s.bandWidth = layout.cellWidth;
      s.round = true;
      s.nice = true;
      break;
    case SIZE:
      if (encoding.is('bar')) {
        // FIXME this is definitely incorrect
        // but let's fix it later since bar size is a bad encoding anyway
        s.range = [3, Math.max(encoding.bandSize(X), encoding.bandSize(Y))];
      } else if (encoding.is(TEXT)) {
        s.range = [8, 40];
      } else {
        s.range = [10, 400];
      }
      s.round = true;
      s.zero = false;
      break;
    case SHAPE:
      s.range = 'shapes';
      break;
    case COLOR:
      var range = encoding.scale(COLOR).range;
      if (range === undefined) {
        if (s.type === 'ordinal') {
          range = style.colorRange;
        } else {
          range = ['#ddf', 'steelblue'];
          s.zero = false;
        }
      }
      s.range = range;
      break;
    case ALPHA:
      s.range = [0.2, 1.0];
      break;
    default:
      throw new Error('Unknown encoding name: '+ s.name);
  }

  switch (s.name) {
    case ROW:
    case COL:
      s.padding = encoding.config('cellPadding');
      s.outerPadding = 0;
      break;
    case X:
    case Y:
      if (s.type === 'ordinal') { //&& !s.bandWidth
        s.points = true;
        s.padding = encoding.band(s.name).padding;
      }
  }
}

},{"../globals":23,"../util":26,"./time":18}],14:[function(require,module,exports){
"use strict";

var globals = require('../globals'),
  util = require('../util'),
  marks = require('./marks');

module.exports = stacking;

function stacking(spec, encoding, mdef, facets) {
  if (!marks[encoding.marktype()].stack) return false;

  // TODO: add || encoding.has(LOD) here once LOD is implemented
  if (!encoding.has(COLOR)) return false;

  var dim=null, val=null, idx =null,
    isXMeasure = encoding.isMeasure(X),
    isYMeasure = encoding.isMeasure(Y);

  if (isXMeasure && !isYMeasure) {
    dim = Y;
    val = X;
    idx = 0;
  } else if (isYMeasure && !isXMeasure) {
    dim = X;
    val = Y;
    idx = 1;
  } else {
    return null; // no stack encoding
  }

  // add transform to compute sums for scale
  var stacked = {
    name: STACKED,
    source: TABLE,
    transform: [{
      type: 'aggregate',
      groupby: [encoding.field(dim)].concat(facets), // dim and other facets
      fields: [{op: 'sum', field: encoding.field(val)}] // TODO check if field with aggr is correct?
    }]
  };

  if (facets && facets.length > 0) {
    stacked.transform.push({ //calculate max for each facet
      type: 'aggregate',
      groupby: facets,
      fields: [{op: 'max', field: 'data.sum_' + encoding.field(val, true)}]
    });
  }

  spec.data.push(stacked);

  // add stack transform to mark
  mdef.from.transform = [{
    type: 'stack',
    point: encoding.field(dim),
    height: encoding.field(val),
    output: {y1: val, y0: val + '2'}
  }];

  // TODO: This is super hack-ish -- consolidate into modular mark properties?
  mdef.properties.update[val] = mdef.properties.enter[val] = {scale: val, field: val};
  mdef.properties.update[val + '2'] = mdef.properties.enter[val + '2'] = {scale: val, field: val + '2'};

  return val; //return stack encoding
}

},{"../globals":23,"../util":26,"./marks":12}],15:[function(require,module,exports){
var globals = require('../globals'),
  util = require('../util'),
  vlfield = require('../field'),
  Encoding = require('../Encoding');

module.exports = function(encoding, stats) {
  return {
    opacity: estimateOpacity(encoding, stats),
    colorRange: colorRange(encoding, stats)
  };
};

function colorRange(encoding, stats){
  if (encoding.has(COLOR) && encoding.isOrdinalScale(COLOR)) {
    var cardinality = encoding.cardinality(COLOR, stats);
    if (cardinality <= 10) {
      return "category10";
    } else {
      return "category20";
    }
    // TODO can vega interpolate range for ordinal scale?
  }
  return null;
}

function estimateOpacity(encoding,stats) {
  if (!stats) {
    return 1;
  }

  var numPoints = 0;
  var maxbins = encoding.config('maxbins');

  if (encoding.isAggregate()) { // aggregate plot
    numPoints = 1;

    //  get number of points in each "cell"
    //  by calculating product of cardinality
    //  for each non faceting and non-ordinal X / Y fields
    //  note that ordinal x,y are not include since we can
    //  consider that ordinal x are subdividing the cell into subcells anyway
    encoding.forEach(function(encType, field) {

      if (encType !== ROW && encType !== COL &&
          !((encType === X || encType === Y) &&
          vlfield.isOrdinalScale(field, Encoding.isType))
        ) {
        numPoints *= encoding.cardinality(encType, stats);
      }
    });

  } else { // raw plot
    numPoints = stats.count;

    // small multiples divide number of points
    var numMultiples = 1;
    if (encoding.has(ROW)) {
      numMultiples *= encoding.cardinality(ROW, stats);
    }
    if (encoding.has(COL)) {
      numMultiples *= encoding.cardinality(COL, stats);
    }
    numPoints /= numMultiples;
  }

  var opacity = 0;
  if (numPoints < 20) {
    opacity = 1;
  } else if (numPoints < 200) {
    opacity = 0.7;
  } else if (numPoints < 1000) {
    opacity = 0.6;
  } else {
    opacity = 0.3;
  }

  return opacity;
}


},{"../Encoding":2,"../field":22,"../globals":23,"../util":26}],16:[function(require,module,exports){
var global = require('../globals');

var groupdef = require('./group').def;

module.exports = subfaceting;

function subfaceting(group, mdef, details, stack, encoding) {
  var m = group.marks,
    g = groupdef('subfacet', {marks: m});

  group.marks = [g];
  g.from = mdef.from;
  delete mdef.from;

  //TODO test LOD -- we should support stack / line without color (LOD) field
  var trans = (g.from.transform || (g.from.transform = []));
  trans.unshift({type: 'facet', keys: details});

  if (stack && encoding.has(COLOR)) {
    trans.unshift({type: 'sort', by: encoding.field(COLOR)});
  }
}

},{"../globals":23,"./group":9}],17:[function(require,module,exports){
var globals = require('../globals');

var groupdef = require('./group').def,
  vldata = require('../data');

module.exports = template;

function template(encoding, layout, stats) { //hack use stats

  var data = {name: TABLE, format: {type: encoding.config('dataFormatType')}},
    dataUrl = vldata.getUrl(encoding, stats);
  if (dataUrl) data.url = dataUrl;

  var preaggregatedData = encoding.config('useVegaServer');

  encoding.forEach(function(encType, field) {
    var name;
    if (field.type == T) {
      data.format.parse = data.format.parse || {};
      data.format.parse[field.name] = 'date';
    } else if (field.type == Q) {
      data.format.parse = data.format.parse || {};
      if (field.aggr === 'count') {
        name = 'count';
      } else if (preaggregatedData && field.bin) {
        name = 'bin_' + field.name;
      } else if (preaggregatedData && field.aggr) {
        name = field.aggr + '_' + field.name;
      } else {
        name = field.name;
      }
      data.format.parse[name] = 'number';
    }
  });

  return {
    width: layout.width,
    height: layout.height,
    padding: 'auto',
    data: [data],
    marks: [groupdef('cell', {
      width: layout.cellWidth ? {value: layout.cellWidth} : undefined,
      height: layout.cellHeight ? {value: layout.cellHeight} : undefined
    })]
  };
}

},{"../data":20,"../globals":23,"./group":9}],18:[function(require,module,exports){
var globals = require('../globals'),
  util = require('../util');

module.exports = time;

function time(spec, encoding, opt) {
  var timeFields = {}, timeFn = {};

  // find unique formula transformation and bin function
  encoding.forEach(function(encType, field) {
    if (field.type === T && field.fn) {
      timeFields[encoding.field(encType)] = {
        field: field,
        encType: encType
      };
      timeFn[field.fn] = true;
    }
  });

  // add formula transform
  var data = spec.data[0],
    transform = data.transform = data.transform || [];

  for (var f in timeFields) {
    var tf = timeFields[f];
    time.transform(transform, encoding, tf.encType, tf.field);
  }

  // add scales
  var scales = spec.scales = spec.scales || [];
  for (var fn in timeFn) {
    time.scale(scales, fn, encoding);
  }
  return spec;
}

time.cardinality = function(field, stats) {
  var fn = field.fn;
  switch (fn) {
    case 'second': return 60;
    case 'minute': return 60;
    case 'hour': return 24;
    case 'dayofweek': return 7;
    case 'date': return 31;
    case 'month': return 12;
    // case 'year':  -- need real cardinality
  }

  return stats[field.name].cardinality;
};

/**
 * @return {String} date binning formula of the given field
 */
time.formula = function(field) {
  var date = 'new Date(d.data.'+ field.name + ')';
  switch (field.fn) {
    case 'second': return date + '.getUTCSeconds()';
    case 'minute': return date + '.getUTCMinutes()';
    case 'hour': return date + '.getUTCHours()';
    case 'dayofweek': return date + '.getUTCDay()';
    case 'date': return date + '.getUTCDate()';
    case 'month': return date + '.getUTCMonth()';
    case 'year': return date + '.getUTCFullYear()';
  }
  // TODO add continuous binning
  console.error('no function specified for date');
};

/** add formula transforms to data */
time.transform = function(transform, encoding, encType, field) {
  transform.push({
    type: 'formula',
    field: encoding.field(encType),
    expr: time.formula(field)
  });
};

/** append custom time scales for axis label */
time.scale = function(scales, fn, encoding) {
  var labelLength = encoding.config('timeScaleLabelLength');
  // TODO add option for shorter scale / custom range
  switch (fn) {
    case 'dayofweek':
      scales.push({
        name: 'time-'+fn,
        type: 'ordinal',
        domain: util.range(0, 7),
        range: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(
          function(s) { return s.substr(0, labelLength);}
        )
      });
      break;
    case 'month':
      scales.push({
        name: 'time-'+fn,
        type: 'ordinal',
        domain: util.range(0, 12),
        range: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(
            function(s) { return s.substr(0, labelLength);}
          )
      });
      break;
  }
};

time.isOrdinalFn = function(fn) {
  switch (fn) {
    case 'second':
    case 'minute':
    case 'hour':
    case 'dayofweek':
    case 'date':
    case 'month':
      return true;
  }
  return false;
};

time.scale.type = function(fn) {
  return time.isOrdinalFn(fn) ? 'ordinal' : 'linear';
};

time.scale.domain = function(fn) {
  switch (fn) {
    case 'second':
    case 'minute': return util.range(0, 60);
    case 'hour': return util.range(0, 24);
    case 'dayofweek': return util.range(0, 7);
    case 'date': return util.range(0, 32);
    case 'month': return util.range(0, 12);
  }
  return null;
};

/** whether a particular time function has custom scale for labels implemented in time.scale */
time.hasScale = function(fn) {
  switch (fn) {
    case 'dayofweek':
    case 'month':
      return true;
  }
  return false;
};



},{"../globals":23,"../util":26}],19:[function(require,module,exports){
var globals = require('./globals');

var consts = module.exports = {};

consts.encodingTypes = [X, Y, ROW, COL, SIZE, SHAPE, COLOR, ALPHA, TEXT, DETAIL];

consts.dataTypes = {'O': O, 'Q': Q, 'T': T};

consts.dataTypeNames = ['O', 'Q', 'T'].reduce(function(r, x) {
  r[consts.dataTypes[x]] = x;
  return r;
},{});

consts.shorthand = {
  delim:  '|',
  assign: '=',
  type:   ',',
  func:   '_'
};

},{"./globals":23}],20:[function(require,module,exports){
// TODO rename getDataUrl to vl.data.getUrl() ?

var util = require('./util');

var vldata = module.exports = {};

vldata.getUrl = function getDataUrl(encoding, stats) {
  if (!encoding.config('useVegaServer')) {
    // don't use vega server
    return encoding.config('dataUrl');
  }

  if (encoding.length() === 0) {
    // no fields
    return;
  }

  var fields = [];
  encoding.forEach(function(encType, field) {
    var obj = {
      name: encoding.field(encType, true),
      field: field.name
    };
    if (field.aggr) {
      obj.aggr = field.aggr;
    }
    if (field.bin) {
      obj.binSize = util.getbins(stats[field.name], encoding.config('maxbins')).step;
    }
    fields.push(obj);
  });

  var query = {
    table: encoding.config('vegaServerTable'),
    fields: fields
  };

  return encoding.config('vegaServerUrl') + '/query/?q=' + JSON.stringify(query);
};

/**
 * @param  {Object} data data in JSON/javascript object format
 * @return Array of {name: __name__, type: "number|text|time|location"}
 */
vldata.getSchema = function(data) {
  var schema = [],
    fields = util.keys(data[0]);

  fields.forEach(function(k) {
    // find non-null data
    var i = 0, datum = data[i][k];
    while (datum === '' || datum === null || datum === undefined) {
      datum = data[++i][k];
    }

    try {
      var number = JSON.parse(datum);
      datum = number;
    } catch(e) {
      // do nothing
    }

    //TODO(kanitw): better type inference here
    var type = (typeof datum === 'number') ? 'Q':
      isNaN(Date.parse(datum)) ? 'O' : 'T';

    schema.push({name: k, type: type});
  });

  return schema;
};

vldata.getStats = function(data) { // hack
  var stats = {},
    fields = util.keys(data[0]);

  fields.forEach(function(k) {
    var stat = util.minmax(data, k);
    stat.cardinality = util.uniq(data, k);
    stat.maxlength = data.reduce(function(max,row) {
      var len = row[k].toString().length;
      return len > max ? len : max;
    }, 0);
    stat.count = data.length;
    stats[k] = stat;
    var sample = {};
    for (; Object.keys(sample).length < Math.min(stat.cardinality, 10); i++) {
      var value = data[Math.floor(Math.random() * data.length)][k];
      sample[value] = true;
    };
    stats[k].sample = Object.keys(sample);
  });
  stats.count = data.length;
  return stats;
};

},{"./util":26}],21:[function(require,module,exports){
// utility for enc

var consts = require('./consts'),
  c = consts.shorthand,
  time = require('./compile/time'),
  vlfield = require('./field'),
  util = require('./util');

var vlenc = module.exports = {};

vlenc.shorthand = function(enc) {
  return util.keys(enc).map(function(e) {
    var v = enc[e];
    return e + c.assign + vlfield.shorthand(v);
  }).join(c.delim);
};
},{"./compile/time":18,"./consts":19,"./field":22,"./util":26}],22:[function(require,module,exports){
// utility for field

var consts = require('./consts'),
  time = require('./compile/time'),
  util = require('./util');

var vlfield = module.exports = {};

vlfield.shorthand = function(f) {
  var c = consts.shorthand;
  return (f.aggr ? f.aggr + c.func : '') +
    (f.fn ? f.fn + c.func : '') +
    (f.bin ? 'bin' + c.func : '') +
    (f.name || '') + c.type +
    (consts.dataTypeNames[f.type] || f.type);
};

vlfield.shorthands = function(fields, delim) {
  delim = delim || ',';
  return fields.map(vlfield.shorthand).join(delim);
};

var typeOrder = {
  O: 0,
  G: 1,
  T: 2,
  Q: 3
};

vlfield.order = {};

vlfield.order.type = function(field) {
  if (field.aggr==='count') return 4;
  return typeOrder[field.type];
};

vlfield.order.typeThenName = function(field) {
  return vlfield.order.type(field) + '_' + field.name;
};

vlfield.order.original = function() {
  return 0; // no swap will occur
};

vlfield.order.name = function(field) {
  return field.name;
};

vlfield.order.typeThenCardinality = function(field, stats){
  return stats[field.name].cardinality;
};

function isTypeName(field, type) {
  return field.type === consts.dataTypeNames[type];
}

/**
 * For encoding, use encoding.isOrdinalScale() to avoid confusion.
 * Or use Encoding.isType if your field is from Encoding (and thus have numeric data type).
 * otherwise, do not specific isType so we can use the default isTypeName here.
 */
vlfield.isOrdinalScale = function(field, isType /*optional*/) {
  isType = isType || isTypeName;

  var fn;
  return  isType(field, O) || field.bin ||
    ( isType(field, T) && field.fn && time.isOrdinalFn(field.fn) );
};

vlfield.count = function() {
  return {name:'*', aggr: 'count', type:'Q', displayName: vlfield.count.displayName};
};

vlfield.count.displayName = 'Number of Records';

vlfield.isCount = function(field) {
  return field.aggr === 'count';
};

/**
 * For encoding, use encoding.cardinality() to avoid confusion.  Or use Encoding.isType if your field is from Encoding (and thus have numeric data type).
 * otherwise, do not specific isType so we can use the default isTypeName here.
 */
vlfield.cardinality = function(field, stats, maxbins, isType) {
  isType = isType || isTypeName;

  if (field.bin) {
    if(!maxbins) console.error('vlfield.cardinality not included maxbins');
    var bins = util.getbins(stats[field.name], maxbins);
    return (bins.stop - bins.start) / bins.step;
  }
  if (isType(field, T)) {
    return time.cardinality(field, stats);
  }
  if (field.aggr) {
    return 1;
  }
  return stats[field.name].cardinality;
};

},{"./compile/time":18,"./consts":19,"./util":26}],23:[function(require,module,exports){
(function (global){
// declare global constant
var g = global || window;

g.TABLE = 'table';
g.STACKED = 'stacked';
g.INDEX = 'index';

g.X = 'x';
g.Y = 'y';
g.ROW = 'row';
g.COL = 'col';
g.SIZE = 'size';
g.SHAPE = 'shape';
g.COLOR = 'color';
g.ALPHA = 'alpha';
g.TEXT = 'text';
g.DETAIL = 'detail';

g.O = 1;
g.Q = 2;
g.T = 4;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],24:[function(require,module,exports){
// Package of defining Vegalite Specification's json schema

var schema = module.exports = {},
  util = require('../util');

schema.util = require('./schemautil');

schema.marktype = {
  type: 'string',
  enum: ['point', 'bar', 'line', 'area', 'circle', 'square', 'text']
};

schema.aggr = {
  type: 'string',
  enum: ['avg', 'sum', 'min', 'max', 'count'],
  supportedEnums: {
    Q: ['avg', 'sum', 'min', 'max', 'count'],
    O: [],
    T: ['avg', 'min', 'max'],
    '': ['count']
  },
  supportedTypes: {'Q': true, 'O': true, 'T': true, '': true}
};

schema.band = {
  type: 'object',
  properties: {
    size: {
      type: 'integer',
      minimum: 0
    },
    padding: {
      type: 'integer',
      minimum: 0,
      default: 1
    }
  }
};

schema.timefns = ['month', 'year', 'dayofweek', 'date', 'hour', 'minute', 'second'];

schema.fn = {
  type: 'string',
  enum: schema.timefns,
  supportedTypes: {'T': true}
};

//TODO(kanitw): add other type of function here

schema.scale_type = {
  type: 'string',
  enum: ['linear', 'log', 'pow', 'sqrt', 'quantile'],
  default: 'linear',
  supportedTypes: {'Q': true}
};

schema.field = {
  type: 'object',
  properties: {
    name: {
      type: 'string'
    }
  }
};

var clone = util.duplicate;
var merge = schema.util.merge;

var typicalField = merge(clone(schema.field), {
  type: 'object',
  properties: {
    type: {
      type: 'string',
      enum: ['O', 'Q', 'T']
    },
    bin: {
      type: 'boolean',
      default: false,
      supportedTypes: {'Q': true} // TODO: add 'O' after finishing #81
    },
    aggr: schema.aggr,
    fn: schema.fn,
    scale: {
      type: 'object',
      properties: {
        type: schema.scale_type,
        reverse: {
          type: 'boolean',
          default: false,
          supportedTypes: {'Q': true, 'O': true, 'T': true}
        },
        zero: {
          type: 'boolean',
          description: 'Include zero',
          supportedTypes: {'Q': true}
        },
        nice: {
          type: 'string',
          enum: ['second', 'minute', 'hour', 'day', 'week', 'month', 'year'],
          supportedTypes: {'T': true}
        }
      }
    }
  }
});

var onlyOrdinalField = merge(clone(schema.field), {
  type: 'object',
  properties: {
    type: {
      type: 'string',
      enum: ['O','Q', 'T'] // ordinal-only field supports Q when bin is applied and T when fn is applied.
    },
    fn: schema.fn,
    bin: {
      type: 'boolean',
      default: false,
      supportedTypes: {'Q': true} // TODO: add 'O' after finishing #81
    },
    aggr: {
      type: 'string',
      enum: ['count'],
      supportedTypes: {'O': true}
    }
  }
});

var axisMixin = {
  type: 'object',
  supportedMarktypes: {'point': true, 'bar': true, 'line': true, 'area': true, 'circle': true, 'square': true, 'text': true},
  properties: {
    axis: {
      type: 'object',
      properties: {
        grid: {
          type: 'boolean',
          default: false,
          description: 'A flag indicate if gridlines should be created in addition to ticks.'
        },
        title: {
          type: 'boolean',
          default: true,
          description: 'A title for the axis.'
        },
        titleOffset: {
          type: 'integer',
          default: undefined,  // auto
          description: 'A title offset value for the axis.'
        },
        format: {
          type: 'string',
          default: undefined,  // auto
          description: 'The formatting pattern for axis labels.'
        }
      }
    }
  }
};

var bandMixin = {
  type: 'object',
  properties: {
    band: schema.band
  }
};

var legendMixin = {
  type: 'object',
  properties: {
    legend: {
      type: 'boolean',
      default: true
    }
  }
};

var textMixin = {
  type: 'object',
  supportedMarktypes: {'text': true},
  properties: {
    text: {
      type: 'object',
      properties: {
        text: {
          type: 'object',
          properties: {
            align: {
              type: 'string',
              default: 'left'
            },
            baseline: {
              type: 'string',
              default: 'middle'
            },
            margin: {
              type: 'integer',
              default: 4,
              minimum: 0
            }
          }
        },
        font: {
          type: 'object',
          properties: {
            weight: {
              type: 'string',
              enum: ['normal', 'bold'],
              default: 'normal'
            },
            size: {
              type: 'integer',
              default: 10,
              minimum: 0
            },
            family: {
              type: 'string',
              default: 'Helvetica Neue'
            },
            style: {
              type: 'string',
              default: 'normal',
              enum: ['normal', 'italic']
            }
          }
        }
      }
    }
  }
};

var sizeMixin = {
  type: 'object',
  supportedMarktypes: {'point': true, 'bar': true, 'circle': true, 'square': true, 'text': true},
  properties: {
    value: {
      type: 'integer',
      default: 30,
      minimum: 0
    }
  }
};

var colorMixin = {
  type: 'object',
  supportedMarktypes: {'point': true, 'bar': true, 'line': true, 'area': true, 'circle': true, 'square': true, 'text': true},
  properties: {
    value: {
      type: 'string',
      role: 'color',
      default: 'steelblue'
    },
    scale: {
      type: 'object',
      properties: {
        range: {
          type: ['string', 'array']
        }
      }
    }
  }
};

var alphaMixin = {
  type: 'object',
  supportedMarktypes: {'point': true, 'bar': true, 'line': true, 'area': true, 'circle': true, 'square': true, 'text': true},
  properties: {
    value: {
      type: 'number',
      default: undefined,  // auto
      minimum: 0,
      maximum: 1
    }
  }
};

var shapeMixin = {
  type: 'object',
  supportedMarktypes: {'point': true, 'circle': true, 'square': true},
  properties: {
    value: {
      type: 'string',
      enum: ['circle', 'square', 'cross', 'diamond', 'triangle-up', 'triangle-down'],
      default: 'circle'
    }
  }
};

var detailMixin = {
  type: 'object',
  supportedMarktypes: {'point': true, 'line': true, 'circle': true, 'square': true, 'text': true}
};

var rowMixin = {
  properties: {
    height: {
      type: 'number',
      minimum: 0,
      default: 150
    }
  }
};

var colMixin = {
  properties: {
    width: {
      type: 'number',
      minimum: 0,
      default: 150
    }
  }
};

var facetMixin = {
  type: 'object',
  supportedMarktypes: {'point': true, 'bar': true, 'line': true, 'area': true, 'circle': true, 'square': true, 'text': true},
  properties: {
    padding: {
      type: 'number',
      minimum: 0,
      maximum: 1,
      default: 0.1
    }
  }
};

var requiredNameType = {
  required: ['name', 'type']
};

var x = merge(clone(typicalField), axisMixin, bandMixin, requiredNameType);
var y = clone(x);

var facet = merge(clone(onlyOrdinalField), requiredNameType, facetMixin);
var row = merge(clone(facet), axisMixin, rowMixin);
var col = merge(clone(facet), axisMixin, colMixin);

var size = merge(clone(typicalField), legendMixin, sizeMixin);
var color = merge(clone(typicalField), legendMixin, colorMixin);
var alpha = merge(clone(typicalField), alphaMixin);
var shape = merge(clone(onlyOrdinalField), legendMixin, shapeMixin);
var detail = merge(clone(onlyOrdinalField), detailMixin);

var text = merge(clone(typicalField), textMixin);

var filter = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      operands: {
        type: 'array',
        items: {
          type: ['string', 'boolean', 'integer', 'number']
        }
      },
      operator: {
        type: 'string',
        enum: ['>', '>=', '=', '!=', '<', '<=', 'notNull']
      }
    }
  }
};

var cfg = {
  type: 'object',
  properties: {
    // template
    width: {
      type: 'integer',
      default: undefined
    },
    height: {
      type: 'integer',
      default: undefined
    },
    viewport: {
      type: 'array',
      items: {
        type: ['integer']
      },
      default: undefined
    },
    //binning
    maxbins: {
      type: 'integer',
      default: 15,
      minimum: 2
    },

    // single plot
    singleHeight: {
      // will be overwritten by bandWidth * (cardinality + padding)
      type: 'integer',
      default: 200,
      minimum: 0
    },
    singleWidth: {
      // will be overwritten by bandWidth * (cardinality + padding)
      type: 'integer',
      default: 200,
      minimum: 0
    },
    // band size
    largeBandSize: {
      type: 'integer',
      default: 19,
      minimum: 0
    },
    smallBandSize: {
      //small multiples or single plot with high cardinality
      type: 'integer',
      default: 12,
      minimum: 0
    },
    largeBandMaxCardinality: {
      type: 'integer',
      default: 10
    },
    // small multiples
    cellPadding: {
      type: 'number',
      default: 0.1
    },
    cellBackgroundColor: {
      type: 'string',
      role: 'color',
      default: '#fdfdfd'
    },
    textCellWidth: {
      type: 'integer',
      default: 90,
      minimum: 0
    },

    // marks
    strokeWidth: {
      type: 'integer',
      default: 2,
      minimum: 0
    },

    // scales
    timeScaleLabelLength: {
      type: 'integer',
      default: 3,
      minimum: 0
    },
    // other
    characterWidth: {
      type: 'integer',
      default: 6
    },

    // data source
    dataFormatType: {
      type: 'string',
      enum: ['json', 'csv'],
      default: 'json'
    },
    useVegaServer: {
      type: 'boolean',
      default: false
    },
    dataUrl: {
      type: 'string',
      default: undefined
    },
    vegaServerTable: {
      type: 'string',
      default: undefined
    },
    vegaServerUrl: {
      type: 'string',
      default: 'http://localhost:3001'
    }
  }
};

/** @type Object Schema of a vegalite specification */
schema.schema = {
  $schema: 'http://json-schema.org/draft-04/schema#',
  Description: 'Schema for vegalite specification',
  type: 'object',
  required: ['marktype', 'enc', 'cfg'],
  properties: {
    marktype: schema.marktype,
    enc: {
      type: 'object',
      properties: {
        x: x,
        y: y,
        row: row,
        col: col,
        size: size,
        color: color,
        alpha: alpha,
        shape: shape,
        text: text,
        detail: detail
      }
    },
    filter: filter,
    cfg: cfg
  }
};

/** Instantiate a verbose vl spec from the schema */
schema.instantiate = function() {
  return schema.util.instantiate(schema.schema);
};

},{"../util":26,"./schemautil":25}],25:[function(require,module,exports){
var util = module.exports = {};

var isEmpty = function(obj) {
  return Object.keys(obj).length === 0;
};

util.extend = function(instance, schema) {
  return util.merge(util.instantiate(schema), instance);
};

// instantiate a schema
util.instantiate = function(schema) {
  if (schema.type === 'object') {
    var instance = {};
    for (var name in schema.properties) {
      var val = util.instantiate(schema.properties[name]);
      if (val !== undefined) {
        instance[name] = val;
      }
    }
    return instance;
  } else if ('default' in schema) {
    return schema.default;
  } else if (schema.type === 'array') {
    return [];
  }
  return undefined;
};

// remove all defaults from an instance
util.subtract = function(instance, defaults) {
  var changes = {};
  for (var prop in instance) {
    var def = defaults[prop];
    var ins = instance[prop];
    // Note: does not properly subtract arrays
    if (!defaults || def !== ins) {
      if (typeof ins === 'object' && !Array.isArray(ins)) {
        var c = util.subtract(ins, def);
        if (!isEmpty(c))
          changes[prop] = c;
      } else if (!Array.isArray(ins) || ins.length > 0) {
        changes[prop] = ins;
      }
    }
  }
  return changes;
};

util.merge = function(/*dest*, src0, src1, ...*/){
  var dest = arguments[0];
  for (var i=1 ; i<arguments.length; i++) {
    dest = merge(dest, arguments[i]);
  }
  return dest;
};

// recursively merges src into dest
merge = function(dest, src) {
  if (typeof src !== 'object' || src === null) {
    return dest;
  }

  for (var p in src) {
    if (!src.hasOwnProperty(p)) {
      continue;
    }
    if (src[p] === undefined) {
      continue;
    }
    if (typeof src[p] !== 'object' || src[p] === null) {
      dest[p] = src[p];
    } else if (typeof dest[p] !== 'object' || dest[p] === null) {
      dest[p] = merge(src[p].constructor === Array ? [] : {}, src[p]);
    } else {
      merge(dest[p], src[p]);
    }
  }
  return dest;
};
},{}],26:[function(require,module,exports){
var util = module.exports = {};

util.keys = function(obj) {
  var k = [], x;
  for (x in obj) k.push(x);
  return k;
};

util.vals = function(obj) {
  var v = [], x;
  for (x in obj) v.push(obj[x]);
  return v;
};

util.range = function(start, stop, step) {
  if (arguments.length < 3) {
    step = 1;
    if (arguments.length < 2) {
      stop = start;
      start = 0;
    }
  }
  if ((stop - start) / step == Infinity) throw new Error('infinite range');
  var range = [], i = -1, j;
  if (step < 0) while ((j = start + step * ++i) > stop) range.push(j);
  else while ((j = start + step * ++i) < stop) range.push(j);
  return range;
};

util.find = function(list, pattern) {
  var l = list.filter(function(x) {
    return x[pattern.name] === pattern.value;
  });
  return l.length && l[0] || null;
};

util.uniq = function(data, field) {
  var map = {}, count = 0, i, k;
  for (i = 0; i < data.length; ++i) {
    k = data[i][field];
    if (!map[k]) {
      map[k] = 1;
      count += 1;
    }
  }
  return count;
};

util.minmax = function(data, field) {
  var stats = {min: +Infinity, max: -Infinity};
  for (i = 0; i < data.length; ++i) {
    var v = data[i][field];
    if (v > stats.max) stats.max = v;
    if (v < stats.min) stats.min = v;
  }
  return stats;
};

util.duplicate = function(obj) {
  return JSON.parse(JSON.stringify(obj));
};

util.any = function(arr, f) {
  var i = 0, k;
  for (k in arr) {
    if (f(arr[k], k, i++)) return true;
  }
  return false;
};

util.all = function(arr, f) {
  var i = 0, k;
  for (k in arr) {
    if (!f(arr[k], k, i++)) return false;
  }
  return true;
};

util.merge = function(dest, src) {
  return util.keys(src).reduce(function(c, k) {
    c[k] = src[k];
    return c;
  }, dest);
};

util.getbins = function(stats, maxbins) {
  return vg.bins({
    min: stats.min,
    max: stats.max,
    maxbins: maxbins
  });
};

/**
 * x[p[0]]...[p[n]] = val
 * @param noaugment determine whether new object should be added f
 * or non-existing properties along the path
 */
util.setter = function(x, p, val, noaugment) {
  for (var i=0; i<p.length-1; ++i) {
    if (!noaugment && !(p[i] in x)){
      x = x[p[i]] = {};
    } else {
      x = x[p[i]];
    }
  }
  x[p[i]] = val;
};


/**
 * returns x[p[0]]...[p[n]]
 * @param augment determine whether new object should be added f
 * or non-existing properties along the path
 */
util.getter = function(x, p, noaugment) {
  for (var i=0; i<p.length; ++i) {
    if (!noaugment && !(p[i] in x)){
      x = x[p[i]] = {};
    } else {
      x = x[p[i]];
    }
  }
  return x;
};

// copied from vega
util.truncate = function(s, length, pos, word, ellipsis) {
  var len = s.length;
  if (len <= length) return s;
  ellipsis = ellipsis || "...";
  var l = Math.max(0, length - ellipsis.length);

  switch (pos) {
    case "left":
      return ellipsis + (word ? vg_truncateOnWord(s,l,1) : s.slice(len-l));
    case "middle":
    case "center":
      var l1 = Math.ceil(l/2), l2 = Math.floor(l/2);
      return (word ? vg_truncateOnWord(s,l1) : s.slice(0,l1)) + ellipsis +
        (word ? vg_truncateOnWord(s,l2,1) : s.slice(len-l2));
    default:
      return (word ? vg_truncateOnWord(s,l) : s.slice(0,l)) + ellipsis;
  }
};

util.error = function(msg) {
  console.error('[VL Error]', msg);
};


},{}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvdmwiLCJzcmMvRW5jb2RpbmcuanMiLCJzcmMvY29tcGlsZS9hZ2dyZWdhdGVzLmpzIiwic3JjL2NvbXBpbGUvYXhpcy5qcyIsInNyYy9jb21waWxlL2Jpbm5pbmcuanMiLCJzcmMvY29tcGlsZS9jb21waWxlLmpzIiwic3JjL2NvbXBpbGUvZmFjZXRpbmcuanMiLCJzcmMvY29tcGlsZS9maWx0ZXIuanMiLCJzcmMvY29tcGlsZS9ncm91cC5qcyIsInNyYy9jb21waWxlL2xheW91dC5qcyIsInNyYy9jb21waWxlL2xlZ2VuZC5qcyIsInNyYy9jb21waWxlL21hcmtzLmpzIiwic3JjL2NvbXBpbGUvc2NhbGUuanMiLCJzcmMvY29tcGlsZS9zdGFja2luZy5qcyIsInNyYy9jb21waWxlL3N0eWxlLmpzIiwic3JjL2NvbXBpbGUvc3ViZmFjZXRpbmcuanMiLCJzcmMvY29tcGlsZS90ZW1wbGF0ZS5qcyIsInNyYy9jb21waWxlL3RpbWUuanMiLCJzcmMvY29uc3RzLmpzIiwic3JjL2RhdGEuanMiLCJzcmMvZW5jLmpzIiwic3JjL2ZpZWxkLmpzIiwic3JjL2dsb2JhbHMuanMiLCJzcmMvc2NoZW1hL3NjaGVtYS5qcyIsInNyYy9zY2hlbWEvc2NoZW1hdXRpbC5qcyIsInNyYy91dGlsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoV0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0dBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1WEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9FQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ25HQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3JCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5ZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIGdsb2JhbHMgPSByZXF1aXJlKCcuL2dsb2JhbHMnKSxcbiAgICB1dGlsID0gcmVxdWlyZSgnLi91dGlsJyksXG4gICAgY29uc3RzID0gcmVxdWlyZSgnLi9jb25zdHMnKTtcblxudmFyIHZsID0gdXRpbC5tZXJnZShjb25zdHMsIHV0aWwpO1xuXG52bC5FbmNvZGluZyA9IHJlcXVpcmUoJy4vRW5jb2RpbmcnKTtcbnZsLmNvbXBpbGUgPSByZXF1aXJlKCcuL2NvbXBpbGUvY29tcGlsZScpO1xudmwuZW5jID0gcmVxdWlyZSgnLi9lbmMnKTtcbnZsLmRhdGEgPSByZXF1aXJlKCcuL2RhdGEnKTtcbnZsLmZpZWxkID0gcmVxdWlyZSgnLi9maWVsZCcpO1xudmwuc2NoZW1hID0gcmVxdWlyZSgnLi9zY2hlbWEvc2NoZW1hJyk7XG5cblxubW9kdWxlLmV4cG9ydHMgPSB2bDtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGdsb2JhbCA9IHJlcXVpcmUoJy4vZ2xvYmFscycpLFxuICBjb25zdHMgPSByZXF1aXJlKCcuL2NvbnN0cycpLFxuICB1dGlsID0gcmVxdWlyZSgnLi91dGlsJyksXG4gIHZsZmllbGQgPSByZXF1aXJlKCcuL2ZpZWxkJyksXG4gIHNjaGVtYSA9IHJlcXVpcmUoJy4vc2NoZW1hL3NjaGVtYScpLFxuICB0aW1lID0gcmVxdWlyZSgnLi9jb21waWxlL3RpbWUnKTtcblxudmFyIEVuY29kaW5nID0gbW9kdWxlLmV4cG9ydHMgPSAoZnVuY3Rpb24oKSB7XG5cbiAgZnVuY3Rpb24gRW5jb2RpbmcobWFya3R5cGUsIGVuYywgY29uZmlnLCBmaWx0ZXIsIHRoZW1lKSB7XG4gICAgdmFyIGRlZmF1bHRzID0gc2NoZW1hLmluc3RhbnRpYXRlKCk7XG5cbiAgICB2YXIgc3BlYyA9IHtcbiAgICAgIG1hcmt0eXBlOiBtYXJrdHlwZSxcbiAgICAgIGVuYzogZW5jLFxuICAgICAgY2ZnOiBjb25maWcsXG4gICAgICBmaWx0ZXI6IGZpbHRlciB8fCBbXVxuICAgIH07XG5cbiAgICAvLyB0eXBlIHRvIGJpdGNvZGVcbiAgICBmb3IgKHZhciBlIGluIGRlZmF1bHRzLmVuYykge1xuICAgICAgZGVmYXVsdHMuZW5jW2VdLnR5cGUgPSBjb25zdHMuZGF0YVR5cGVzW2RlZmF1bHRzLmVuY1tlXS50eXBlXTtcbiAgICB9XG5cbiAgICB2YXIgc3BlY0V4dGVuZGVkID0gc2NoZW1hLnV0aWwubWVyZ2UoZGVmYXVsdHMsIHRoZW1lIHx8IHt9LCBzcGVjKSA7XG5cbiAgICB0aGlzLl9tYXJrdHlwZSA9IHNwZWNFeHRlbmRlZC5tYXJrdHlwZTtcbiAgICB0aGlzLl9lbmMgPSBzcGVjRXh0ZW5kZWQuZW5jO1xuICAgIHRoaXMuX2NmZyA9IHNwZWNFeHRlbmRlZC5jZmc7XG4gICAgdGhpcy5fZmlsdGVyID0gc3BlY0V4dGVuZGVkLmZpbHRlcjtcbiAgfVxuXG4gIHZhciBwcm90byA9IEVuY29kaW5nLnByb3RvdHlwZTtcblxuICBwcm90by5tYXJrdHlwZSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl9tYXJrdHlwZTtcbiAgfTtcblxuICBwcm90by5pcyA9IGZ1bmN0aW9uKG0pIHtcbiAgICByZXR1cm4gdGhpcy5fbWFya3R5cGUgPT09IG07XG4gIH07XG5cbiAgcHJvdG8uaGFzID0gZnVuY3Rpb24oeCkge1xuICAgIHJldHVybiB0aGlzLl9lbmNbeF0ubmFtZSAhPT0gdW5kZWZpbmVkO1xuICB9O1xuXG4gIHByb3RvLmVuYyA9IGZ1bmN0aW9uKHgpIHtcbiAgICByZXR1cm4gdGhpcy5fZW5jW3hdO1xuICB9O1xuXG4gIHByb3RvLmZpbHRlciA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl9maWx0ZXI7XG4gIH07XG5cbiAgLy8gZ2V0IFwiZmllbGRcIiBwcm9wZXJ0eSBmb3IgdmVnYVxuICBwcm90by5maWVsZCA9IGZ1bmN0aW9uKHgsIG5vZGF0YSwgbm9mbikge1xuICAgIGlmICghdGhpcy5oYXMoeCkpIHJldHVybiBudWxsO1xuXG4gICAgdmFyIGYgPSAobm9kYXRhID8gJycgOiAnZGF0YS4nKTtcblxuICAgIGlmICh0aGlzLl9lbmNbeF0uYWdnciA9PT0gJ2NvdW50Jykge1xuICAgICAgcmV0dXJuIGYgKyAnY291bnQnO1xuICAgIH0gZWxzZSBpZiAoIW5vZm4gJiYgdGhpcy5fZW5jW3hdLmJpbikge1xuICAgICAgcmV0dXJuIGYgKyAnYmluXycgKyB0aGlzLl9lbmNbeF0ubmFtZTtcbiAgICB9IGVsc2UgaWYgKCFub2ZuICYmIHRoaXMuX2VuY1t4XS5hZ2dyKSB7XG4gICAgICByZXR1cm4gZiArIHRoaXMuX2VuY1t4XS5hZ2dyICsgJ18nICsgdGhpcy5fZW5jW3hdLm5hbWU7XG4gICAgfSBlbHNlIGlmICghbm9mbiAmJiB0aGlzLl9lbmNbeF0uZm4pIHtcbiAgICAgIHJldHVybiBmICsgdGhpcy5fZW5jW3hdLmZuICsgJ18nICsgdGhpcy5fZW5jW3hdLm5hbWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBmICsgdGhpcy5fZW5jW3hdLm5hbWU7XG4gICAgfVxuICB9O1xuXG4gIHByb3RvLmZpZWxkTmFtZSA9IGZ1bmN0aW9uKHgpIHtcbiAgICByZXR1cm4gdGhpcy5fZW5jW3hdLm5hbWU7XG4gIH07XG5cbiAgcHJvdG8uZmllbGRUaXRsZSA9IGZ1bmN0aW9uKHgpIHtcbiAgICBpZiAodmxmaWVsZC5pc0NvdW50KHRoaXMuX2VuY1t4XSkpIHtcbiAgICAgIHJldHVybiB2bGZpZWxkLmNvdW50LmRpc3BsYXlOYW1lO1xuICAgIH1cbiAgICB2YXIgZm4gPSB0aGlzLl9lbmNbeF0uYWdnciB8fCB0aGlzLl9lbmNbeF0uZm4gfHwgKHRoaXMuX2VuY1t4XS5iaW4gJiYgXCJiaW5cIik7XG4gICAgaWYgKGZuKSB7XG4gICAgICByZXR1cm4gZm4udG9VcHBlckNhc2UoKSArICcoJyArIHRoaXMuX2VuY1t4XS5uYW1lICsgJyknO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcy5fZW5jW3hdLm5hbWU7XG4gICAgfVxuICB9O1xuXG4gIHByb3RvLnNjYWxlID0gZnVuY3Rpb24oeCkge1xuICAgIHJldHVybiB0aGlzLl9lbmNbeF0uc2NhbGUgfHwge307XG4gIH07XG5cbiAgcHJvdG8uYXhpcyA9IGZ1bmN0aW9uKHgpIHtcbiAgICByZXR1cm4gdGhpcy5fZW5jW3hdLmF4aXMgfHwge307XG4gIH07XG5cbiAgcHJvdG8uYmFuZCA9IGZ1bmN0aW9uKHgpIHtcbiAgICByZXR1cm4gdGhpcy5fZW5jW3hdLmJhbmQgfHwge307XG4gIH07XG5cbiAgcHJvdG8uYmFuZFNpemUgPSBmdW5jdGlvbihlbmNUeXBlLCB1c2VTbWFsbEJhbmQpIHtcbiAgICB1c2VTbWFsbEJhbmQgPSB1c2VTbWFsbEJhbmQgfHxcbiAgICAgIC8vaXNCYW5kSW5TbWFsbE11bHRpcGxlc1xuICAgICAgKGVuY1R5cGUgPT09IFkgJiYgdGhpcy5oYXMoUk9XKSAmJiB0aGlzLmhhcyhZKSkgfHxcbiAgICAgIChlbmNUeXBlID09PSBYICYmIHRoaXMuaGFzKENPTCkgJiYgdGhpcy5oYXMoWCkpO1xuXG4gICAgLy8gaWYgYmFuZC5zaXplIGlzIGV4cGxpY2l0bHkgc3BlY2lmaWVkLCBmb2xsb3cgdGhlIHNwZWNpZmljYXRpb24sIG90aGVyd2lzZSBkcmF3IHZhbHVlIGZyb20gY29uZmlnLlxuICAgIHJldHVybiB0aGlzLmJhbmQoZW5jVHlwZSkuc2l6ZSB8fFxuICAgICAgdGhpcy5jb25maWcodXNlU21hbGxCYW5kID8gJ3NtYWxsQmFuZFNpemUnIDogJ2xhcmdlQmFuZFNpemUnKTtcbiAgfTtcblxuICBwcm90by5hZ2dyID0gZnVuY3Rpb24oeCkge1xuICAgIHJldHVybiB0aGlzLl9lbmNbeF0uYWdncjtcbiAgfTtcblxuICBwcm90by5iaW4gPSBmdW5jdGlvbih4KSB7XG4gICAgcmV0dXJuIHRoaXMuX2VuY1t4XS5iaW47XG4gIH07XG5cbiAgcHJvdG8ubGVnZW5kID0gZnVuY3Rpb24oeCkge1xuICAgIHJldHVybiB0aGlzLl9lbmNbeF0ubGVnZW5kO1xuICB9O1xuXG4gIHByb3RvLnZhbHVlID0gZnVuY3Rpb24oeCkge1xuICAgIHJldHVybiB0aGlzLl9lbmNbeF0udmFsdWU7XG4gIH07XG5cbiAgcHJvdG8uZm4gPSBmdW5jdGlvbih4KSB7XG4gICAgcmV0dXJuIHRoaXMuX2VuY1t4XS5mbjtcbiAgfTtcblxuICBwcm90by5hbnkgPSBmdW5jdGlvbihmKSB7XG4gICAgcmV0dXJuIHV0aWwuYW55KHRoaXMuX2VuYywgZik7XG4gIH07XG5cbiAgcHJvdG8uYWxsID0gZnVuY3Rpb24oZikge1xuICAgIHJldHVybiB1dGlsLmFsbCh0aGlzLl9lbmMsIGYpO1xuICB9O1xuXG4gIHByb3RvLmxlbmd0aCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB1dGlsLmtleXModGhpcy5fZW5jKS5sZW5ndGg7XG4gIH07XG5cbiAgcHJvdG8ubWFwID0gZnVuY3Rpb24oZikge1xuICAgIHZhciBhcnIgPSBbXSwgaztcbiAgICBmb3IgKGsgaW4gdGhpcy5fZW5jKSB7XG4gICAgICBpZih0aGlzLmhhcyhrKSl7XG4gICAgICAgIGFyci5wdXNoKGYodGhpcy5fZW5jW2tdLCBrLCB0aGlzLl9lbmMpKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGFycjtcbiAgfTtcblxuICBwcm90by5yZWR1Y2UgPSBmdW5jdGlvbihmLCBpbml0KSB7XG4gICAgdmFyIHIgPSBpbml0LCBpID0gMCwgaztcbiAgICBmb3IgKGsgaW4gdGhpcy5fZW5jKSB7XG4gICAgICBpZiAodGhpcy5oYXMoaykpIHtcbiAgICAgICAgciA9IGYociwgdGhpcy5fZW5jW2tdLCBrLCB0aGlzLl9lbmMpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcjtcbiAgfTtcblxuICBwcm90by5mb3JFYWNoID0gZnVuY3Rpb24oZikge1xuICAgIHZhciBpID0gMCwgaztcbiAgICBmb3IgKGsgaW4gdGhpcy5fZW5jKSB7XG4gICAgICBpZiAodGhpcy5oYXMoaykpIHtcbiAgICAgICAgZihrLCB0aGlzLl9lbmNba10sIGkrKyk7XG4gICAgICB9XG4gICAgfVxuICB9O1xuXG4gIHByb3RvLnR5cGUgPSBmdW5jdGlvbih4KSB7XG4gICAgcmV0dXJuIHRoaXMuaGFzKHgpID8gdGhpcy5fZW5jW3hdLnR5cGUgOiBudWxsO1xuICB9O1xuXG4gIHByb3RvLnRleHQgPSBmdW5jdGlvbihwcm9wKSB7XG4gICAgdmFyIHRleHQgPSB0aGlzLl9lbmNbVEVYVF0udGV4dDtcbiAgICByZXR1cm4gcHJvcCA/IHRleHRbcHJvcF0gOiB0ZXh0O1xuICB9O1xuXG4gIHByb3RvLmZvbnQgPSBmdW5jdGlvbihwcm9wKSB7XG4gICAgdmFyIGZvbnQgPSB0aGlzLl9lbmNbVEVYVF0udGV4dDtcbiAgICByZXR1cm4gcHJvcCA/IGZvbnRbcHJvcF0gOiBmb250O1xuICB9O1xuXG4gIHByb3RvLmlzVHlwZSA9IGZ1bmN0aW9uKHgsIHR5cGUpIHtcbiAgICB2YXIgZmllbGQgPSB0aGlzLmVuYyh4KTtcbiAgICByZXR1cm4gZmllbGQgJiYgaXNUeXBlKGZpZWxkLCB0eXBlKTtcbiAgfTtcblxuICB2YXIgaXNUeXBlID0gRW5jb2RpbmcuaXNUeXBlID0gZnVuY3Rpb24gKGZpZWxkRGVmLCB0eXBlKSB7XG4gICAgcmV0dXJuIChmaWVsZERlZi50eXBlICYgdHlwZSkgPiAwO1xuICB9O1xuXG4gIHZhciBpc09yZGluYWxTY2FsZSA9IEVuY29kaW5nLmlzT3JkaW5hbFNjYWxlID0gZnVuY3Rpb24gKGVuY29kaW5nLCBlbmNUeXBlKXtcbiAgICByZXR1cm4gdmxmaWVsZC5pc09yZGluYWxTY2FsZShlbmNvZGluZy5lbmMoZW5jVHlwZSksIGlzVHlwZSk7XG4gIH1cblxuICBwcm90by5pc09yZGluYWxTY2FsZSA9IGZ1bmN0aW9uKGVuY1R5cGUpIHtcbiAgICByZXR1cm4gdGhpcy5oYXMoZW5jVHlwZSkgJiYgaXNPcmRpbmFsU2NhbGUodGhpcywgZW5jVHlwZSk7XG4gIH07XG5cbiAgcHJvdG8uaXNRdWFudFNjYWxlID0gZnVuY3Rpb24oZW5jVHlwZSkge1xuICAgIHJldHVybiB0aGlzLmhhcyhlbmNUeXBlKSAmJiAhaXNPcmRpbmFsU2NhbGUodGhpcywgZW5jVHlwZSk7XG4gIH07XG5cbiAgcHJvdG8uaXNBZ2dyZWdhdGUgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgaSA9IDAsIGs7XG4gICAgZm9yIChrIGluIHRoaXMuX2VuYykge1xuICAgICAgaWYgKHRoaXMuaGFzKGspICYmIHRoaXMuYWdncihrKSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9O1xuXG4gIEVuY29kaW5nLmlzQWdncmVnYXRlID0gZnVuY3Rpb24oc3BlYykge1xuICAgIHZhciBpID0gMCwgaywgZW5jPSBzcGVjLmVuYztcbiAgICBmb3IgKGsgaW4gZW5jKSB7XG4gICAgICBpZiAoZW5jW2tdICYmIGVuY1trXS5hZ2dyKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH07XG5cbiAgcHJvdG8uY2FyZGluYWxpdHkgPSBmdW5jdGlvbihlbmNUeXBlLCBzdGF0cykge1xuICAgIHJldHVybiB2bGZpZWxkLmNhcmRpbmFsaXR5KHRoaXMuX2VuY1tlbmNUeXBlXSwgc3RhdHMsIHRoaXMuY29uZmlnKCdtYXhiaW5zJyksIGlzVHlwZSk7XG4gIH07XG5cbiAgcHJvdG8uaXNSYXcgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gIXRoaXMuaXNBZ2dyZWdhdGUoKTtcbiAgfTtcblxuICBwcm90by5pc0RpbWVuc2lvbiA9IGZ1bmN0aW9uKGVuY1R5cGUpIHtcbiAgICByZXR1cm4gdGhpcy5oYXMoZW5jVHlwZSkgJiYgdGhpcy5pc0FnZ3JlZ2F0ZSgpICYmXG4gICAgICBpc09yZGluYWxTY2FsZSh0aGlzLCBlbmNUeXBlKTtcbiAgfTtcblxuICBwcm90by5pc01lYXN1cmUgPSBmdW5jdGlvbihlbmNUeXBlKSB7XG4gICAgcmV0dXJuIHRoaXMuaGFzKGVuY1R5cGUpICYmIHRoaXMuaXNBZ2dyZWdhdGUoKSAmJlxuICAgICAgIWlzT3JkaW5hbFNjYWxlKHRoaXMsIGVuY1R5cGUpO1xuICB9O1xuXG4gIHByb3RvLmNvbmZpZyA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICByZXR1cm4gdGhpcy5fY2ZnW25hbWVdO1xuICB9O1xuXG4gIHByb3RvLnRvU3BlYyA9IGZ1bmN0aW9uKGV4Y2x1ZGVDb25maWcpIHtcbiAgICB2YXIgZW5jID0gdXRpbC5kdXBsaWNhdGUodGhpcy5fZW5jKSxcbiAgICAgIHNwZWM7XG5cbiAgICAvLyBjb252ZXJ0IHR5cGUncyBiaXRjb2RlIHRvIHR5cGUgbmFtZVxuICAgIGZvciAodmFyIGUgaW4gZW5jKSB7XG4gICAgICBlbmNbZV0udHlwZSA9IGNvbnN0cy5kYXRhVHlwZU5hbWVzW2VuY1tlXS50eXBlXTtcbiAgICB9XG5cbiAgICBzcGVjID0ge1xuICAgICAgbWFya3R5cGU6IHRoaXMuX21hcmt0eXBlLFxuICAgICAgZW5jOiBlbmMsXG4gICAgICBmaWx0ZXI6IHRoaXMuX2ZpbHRlclxuICAgIH07XG5cbiAgICBpZiAoIWV4Y2x1ZGVDb25maWcpIHtcbiAgICAgIHNwZWMuY2ZnID0gdXRpbC5kdXBsaWNhdGUodGhpcy5fY2ZnKTtcbiAgICB9XG5cbiAgICAvLyByZW1vdmUgZGVmYXVsdHNcbiAgICB2YXIgZGVmYXVsdHMgPSBzY2hlbWEuaW5zdGFudGlhdGUoKTtcbiAgICByZXR1cm4gc2NoZW1hLnV0aWwuc3VidHJhY3Qoc3BlYywgZGVmYXVsdHMpO1xuICB9O1xuXG4gIHByb3RvLnRvU2hvcnRoYW5kID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGVuYyA9IHRoaXMuX2VuYztcbiAgICB2YXIgYyA9IGNvbnN0cy5zaG9ydGhhbmQ7XG4gICAgcmV0dXJuICdtYXJrJyArIGMuYXNzaWduICsgdGhpcy5fbWFya3R5cGUgKyBjLmRlbGltICtcbiAgICAgIHRoaXMubWFwKGZ1bmN0aW9uKHYsIGUpIHtcbiAgICAgICAgcmV0dXJuIGUgKyBjLmFzc2lnbiArIHZsZmllbGQuc2hvcnRoYW5kKHYpO1xuICAgICAgfSkuam9pbihjLmRlbGltKTtcbiAgfTtcblxuICBFbmNvZGluZy5zaG9ydGhhbmRGcm9tU3BlYyA9IGZ1bmN0aW9uICgpe1xuICAgIHJldHVybiBFbmNvZGluZy5mcm9tU3BlYy5hcHBseShudWxsLCBhcmd1bWVudHMpLnRvU2hvcnRoYW5kKCk7XG4gIH07XG5cbiAgRW5jb2RpbmcucGFyc2VTaG9ydGhhbmQgPSBmdW5jdGlvbihzaG9ydGhhbmQsIGNmZykge1xuICAgIHZhciBjID0gY29uc3RzLnNob3J0aGFuZCxcbiAgICAgICAgZW5jID0gc2hvcnRoYW5kLnNwbGl0KGMuZGVsaW0pLFxuICAgICAgICBtYXJrdHlwZSA9IGVuYy5zaGlmdCgpLnNwbGl0KGMuYXNzaWduKVsxXS50cmltKCk7XG5cbiAgICBlbmMgPSBlbmMucmVkdWNlKGZ1bmN0aW9uKG0sIGUpIHtcbiAgICAgIHZhciBzcGxpdCA9IGUuc3BsaXQoYy5hc3NpZ24pLFxuICAgICAgICAgIGVuY3R5cGUgPSBzcGxpdFswXS50cmltKCksIG87XG5cbiAgICAgIHNwbGl0ID0gc3BsaXRbMV0uc3BsaXQoYy50eXBlKTtcbiAgICAgIG8gPSB7XG4gICAgICAgIG5hbWU6IHNwbGl0WzBdLnRyaW0oKSxcbiAgICAgICAgdHlwZTogY29uc3RzLmRhdGFUeXBlc1tzcGxpdFsxXS50cmltKCldXG4gICAgICB9O1xuXG4gICAgICAvLyBjaGVjayBhZ2dyZWdhdGUgdHlwZVxuICAgICAgZm9yICh2YXIgaSBpbiBzY2hlbWEuYWdnci5lbnVtKSB7XG4gICAgICAgIHZhciBhID0gc2NoZW1hLmFnZ3IuZW51bVtpXTtcbiAgICAgICAgaWYgKG8ubmFtZS5pbmRleE9mKGEgKyAnXycpID09PSAwKSB7XG4gICAgICAgICAgby5uYW1lID0gby5uYW1lLnN1YnN0cihhLmxlbmd0aCArIDEpO1xuICAgICAgICAgIGlmIChhID09ICdjb3VudCcgJiYgby5uYW1lLmxlbmd0aCA9PT0gMCkgby5uYW1lID0gJyonO1xuICAgICAgICAgIG8uYWdnciA9IGE7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gY2hlY2sgdGltZSBmblxuICAgICAgZm9yICh2YXIgaSBpbiBzY2hlbWEudGltZWZucykge1xuICAgICAgICB2YXIgZiA9IHNjaGVtYS50aW1lZm5zW2ldO1xuICAgICAgICBpZiAoby5uYW1lICYmIG8ubmFtZS5pbmRleE9mKGYgKyAnXycpID09PSAwKSB7XG4gICAgICAgICAgby5uYW1lID0gby5uYW1lLnN1YnN0cihvLmxlbmd0aCArIDEpO1xuICAgICAgICAgIG8uZm4gPSBmO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIGNoZWNrIGJpblxuICAgICAgaWYgKG8ubmFtZSAmJiBvLm5hbWUuaW5kZXhPZignYmluXycpID09PSAwKSB7XG4gICAgICAgIG8ubmFtZSA9IG8ubmFtZS5zdWJzdHIoNCk7XG4gICAgICAgIG8uYmluID0gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgbVtlbmN0eXBlXSA9IG87XG4gICAgICByZXR1cm4gbTtcbiAgICB9LCB7fSk7XG5cbiAgICByZXR1cm4gbmV3IEVuY29kaW5nKG1hcmt0eXBlLCBlbmMsIGNmZyk7XG4gIH07XG5cbiAgRW5jb2RpbmcuZnJvbVNwZWMgPSBmdW5jdGlvbihzcGVjLCB0aGVtZSwgZXh0cmFDZmcpIHtcbiAgICB2YXIgZW5jID0gdXRpbC5kdXBsaWNhdGUoc3BlYy5lbmMpO1xuXG4gICAgLy9jb252ZXJ0IHR5cGUgZnJvbSBzdHJpbmcgdG8gYml0Y29kZSAoZS5nLCBPPTEpXG4gICAgZm9yICh2YXIgZSBpbiBlbmMpIHtcbiAgICAgIGVuY1tlXS50eXBlID0gY29uc3RzLmRhdGFUeXBlc1tlbmNbZV0udHlwZV07XG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBFbmNvZGluZyhzcGVjLm1hcmt0eXBlLCBlbmMsIHV0aWwubWVyZ2Uoc3BlYy5jZmcgfHwge30sIGV4dHJhQ2ZnIHx8IHt9KSwgc3BlYy5maWx0ZXIsIHRoZW1lKTtcbiAgfTtcblxuICByZXR1cm4gRW5jb2Rpbmc7XG5cbn0pKCk7XG4iLCJ2YXIgZ2xvYmFscyA9IHJlcXVpcmUoJy4uL2dsb2JhbHMnKSxcbiAgdXRpbCA9IHJlcXVpcmUoJy4uL3V0aWwnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBhZ2dyZWdhdGVzO1xuXG5mdW5jdGlvbiBhZ2dyZWdhdGVzKHNwZWMsIGVuY29kaW5nLCBvcHQpIHtcbiAgb3B0ID0gb3B0IHx8IHt9O1xuICB2YXIgZGltcyA9IHt9LCBtZWFzID0ge30sIGRldGFpbCA9IHt9LCBmYWNldHMgPSB7fTtcbiAgZW5jb2RpbmcuZm9yRWFjaChmdW5jdGlvbihlbmNUeXBlLCBmaWVsZCkge1xuICAgIGlmIChmaWVsZC5hZ2dyKSB7XG4gICAgICBpZiAoZmllbGQuYWdnciA9PT0gJ2NvdW50Jykge1xuICAgICAgICBtZWFzWydjb3VudCddID0ge29wOiAnY291bnQnLCBmaWVsZDogJyonfTtcbiAgICAgIH1lbHNlIHtcbiAgICAgICAgbWVhc1tmaWVsZC5hZ2dyICsgJ3wnKyBmaWVsZC5uYW1lXSA9IHtcbiAgICAgICAgICBvcDogZmllbGQuYWdncixcbiAgICAgICAgICBmaWVsZDogJ2RhdGEuJysgZmllbGQubmFtZVxuICAgICAgICB9O1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBkaW1zW2ZpZWxkLm5hbWVdID0gZW5jb2RpbmcuZmllbGQoZW5jVHlwZSk7XG4gICAgICBpZiAoZW5jVHlwZSA9PSBST1cgfHwgZW5jVHlwZSA9PSBDT0wpIHtcbiAgICAgICAgZmFjZXRzW2ZpZWxkLm5hbWVdID0gZGltc1tmaWVsZC5uYW1lXTtcbiAgICAgIH1lbHNlIGlmIChlbmNUeXBlICE9PSBYICYmIGVuY1R5cGUgIT09IFkpIHtcbiAgICAgICAgZGV0YWlsW2ZpZWxkLm5hbWVdID0gZGltc1tmaWVsZC5uYW1lXTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuICBkaW1zID0gdXRpbC52YWxzKGRpbXMpO1xuICBtZWFzID0gdXRpbC52YWxzKG1lYXMpO1xuXG4gIGlmIChtZWFzLmxlbmd0aCA+IDAgJiYgIW9wdC5wcmVhZ2dyZWdhdGVkRGF0YSkge1xuICAgIGlmICghc3BlYy50cmFuc2Zvcm0pIHNwZWMudHJhbnNmb3JtID0gW107XG4gICAgc3BlYy50cmFuc2Zvcm0ucHVzaCh7XG4gICAgICB0eXBlOiAnYWdncmVnYXRlJyxcbiAgICAgIGdyb3VwYnk6IGRpbXMsXG4gICAgICBmaWVsZHM6IG1lYXNcbiAgICB9KTtcblxuICAgIGlmIChlbmNvZGluZy5tYXJrdHlwZSgpID09PSBURVhUKSB7XG4gICAgICBtZWFzLmZvckVhY2goZnVuY3Rpb24obSkge1xuICAgICAgICB2YXIgZmllbGROYW1lID0gbS5maWVsZC5zdWJzdHIoNSksIC8vcmVtb3ZlIFwiZGF0YS5cIlxuICAgICAgICAgIGZpZWxkID0gJ2RhdGEuJyArIChtLm9wID8gbS5vcCArICdfJyA6ICcnKSArIGZpZWxkTmFtZTtcbiAgICAgICAgc3BlYy50cmFuc2Zvcm0ucHVzaCh7XG4gICAgICAgICAgdHlwZTogJ2Zvcm11bGEnLFxuICAgICAgICAgIGZpZWxkOiBmaWVsZCxcbiAgICAgICAgICBleHByOiBcImQzLmZvcm1hdCgnLjJmJykoZC5cIiArIGZpZWxkICsgJyknXG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfVxuICB9XG4gIHJldHVybiB7XG4gICAgZGV0YWlsczogdXRpbC52YWxzKGRldGFpbCksXG4gICAgZGltczogZGltcyxcbiAgICBmYWNldHM6IHV0aWwudmFscyhmYWNldHMpLFxuICAgIGFnZ3JlZ2F0ZWQ6IG1lYXMubGVuZ3RoID4gMFxuICB9O1xufVxuIiwidmFyIGdsb2JhbHMgPSByZXF1aXJlKCcuLi9nbG9iYWxzJyksXG4gIHV0aWwgPSByZXF1aXJlKCcuLi91dGlsJyksXG4gIHNldHRlciA9IHV0aWwuc2V0dGVyLFxuICBnZXR0ZXIgPSB1dGlsLmdldHRlcixcbiAgdGltZSA9IHJlcXVpcmUoJy4vdGltZScpO1xuXG52YXIgYXhpcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbmF4aXMubmFtZXMgPSBmdW5jdGlvbihwcm9wcykge1xuICByZXR1cm4gdXRpbC5rZXlzKHV0aWwua2V5cyhwcm9wcykucmVkdWNlKGZ1bmN0aW9uKGEsIHgpIHtcbiAgICB2YXIgcyA9IHByb3BzW3hdLnNjYWxlO1xuICAgIGlmIChzID09PSBYIHx8IHMgPT09IFkpIGFbcHJvcHNbeF0uc2NhbGVdID0gMTtcbiAgICByZXR1cm4gYTtcbiAgfSwge30pKTtcbn07XG5cbmF4aXMuZGVmcyA9IGZ1bmN0aW9uKG5hbWVzLCBlbmNvZGluZywgbGF5b3V0LCBvcHQpIHtcbiAgcmV0dXJuIG5hbWVzLnJlZHVjZShmdW5jdGlvbihhLCBuYW1lKSB7XG4gICAgYS5wdXNoKGF4aXMuZGVmKG5hbWUsIGVuY29kaW5nLCBsYXlvdXQsIG9wdCkpO1xuICAgIHJldHVybiBhO1xuICB9LCBbXSk7XG59O1xuXG5heGlzLmRlZiA9IGZ1bmN0aW9uKG5hbWUsIGVuY29kaW5nLCBsYXlvdXQsIG9wdCkge1xuICB2YXIgdHlwZSA9IG5hbWU7XG4gIHZhciBpc0NvbCA9IG5hbWUgPT0gQ09MLCBpc1JvdyA9IG5hbWUgPT0gUk9XO1xuICBpZiAoaXNDb2wpIHR5cGUgPSAneCc7XG4gIGlmIChpc1JvdykgdHlwZSA9ICd5JztcblxuICB2YXIgZGVmID0ge1xuICAgIHR5cGU6IHR5cGUsXG4gICAgc2NhbGU6IG5hbWVcbiAgfTtcblxuICBpZiAoZW5jb2RpbmcuYXhpcyhuYW1lKS5ncmlkKSB7XG4gICAgZGVmLmdyaWQgPSB0cnVlO1xuICAgIGRlZi5sYXllciA9ICdiYWNrJztcbiAgfVxuXG4gIGlmIChlbmNvZGluZy5heGlzKG5hbWUpLnRpdGxlKSB7XG4gICAgZGVmID0gYXhpc190aXRsZShkZWYsIG5hbWUsIGVuY29kaW5nLCBsYXlvdXQsIG9wdCk7XG4gIH1cblxuICBpZiAoaXNSb3cgfHwgaXNDb2wpIHtcbiAgICBzZXR0ZXIoZGVmLCBbJ3Byb3BlcnRpZXMnLCAndGlja3MnXSwge1xuICAgICAgb3BhY2l0eToge3ZhbHVlOiAwfVxuICAgIH0pO1xuICAgIHNldHRlcihkZWYsIFsncHJvcGVydGllcycsICdtYWpvclRpY2tzJ10sIHtcbiAgICAgIG9wYWNpdHk6IHt2YWx1ZTogMH1cbiAgICB9KTtcbiAgICBzZXR0ZXIoZGVmLCBbJ3Byb3BlcnRpZXMnLCAnYXhpcyddLCB7XG4gICAgICBvcGFjaXR5OiB7dmFsdWU6IDB9XG4gICAgfSk7XG4gIH1cblxuICBpZiAoaXNDb2wpIHtcbiAgICBkZWYub3JpZW50ID0gJ3RvcCc7XG4gIH1cblxuICBpZiAoaXNSb3cpIHtcbiAgICBkZWYub2Zmc2V0ID0gYXhpc1RpdGxlT2Zmc2V0KGVuY29kaW5nLCBsYXlvdXQsIFkpICsgMjA7XG4gIH1cblxuICBpZiAobmFtZSA9PSBYKSB7XG4gICAgaWYgKGVuY29kaW5nLmlzT3JkaW5hbFNjYWxlKFgpIHx8IGVuY29kaW5nLmlzVHlwZShYLCBUKSkge1xuICAgICAgc2V0dGVyKGRlZiwgWydwcm9wZXJ0aWVzJywnbGFiZWxzJ10sIHtcbiAgICAgICAgYW5nbGU6IHt2YWx1ZTogMjcwfSxcbiAgICAgICAgYWxpZ246IHt2YWx1ZTogJ3JpZ2h0J30sXG4gICAgICAgIGJhc2VsaW5lOiB7dmFsdWU6ICdtaWRkbGUnfVxuICAgICAgfSk7XG4gICAgfSBlbHNlIHsgLy8gUVxuICAgICAgZGVmLnRpY2tzID0gNTtcbiAgICB9XG4gIH1cblxuICBpZiAoZW5jb2RpbmcuYXhpcyhuYW1lKS5mb3JtYXQpIHtcbiAgICBkZWYuZm9ybWF0ID0gZW5jb2RpbmcuYXhpcyhuYW1lKS5mb3JtYXQ7XG4gIH0gZWxzZSBpZiAoZW5jb2RpbmcuaXNUeXBlKG5hbWUsIFEpKSB7XG4gICAgZGVmLmZvcm1hdCA9IFwic1wiO1xuICB9IGVsc2UgaWYgKGVuY29kaW5nLmlzVHlwZShuYW1lLCBUKSkge1xuICAgIGlmICghZW5jb2RpbmcuZm4obmFtZSkpIHtcbiAgICAgIGRlZi5mb3JtYXQgPSBcIiVZLSVtLSVkXCI7XG4gICAgfSBlbHNlIHtcbiAgICAgIGRlZi5mb3JtYXQgPSBcImRcIjtcbiAgICB9XG4gIH1cblxuICB2YXIgZm47XG4gIC8vIGFkZCBjdXN0b20gbGFiZWwgZm9yIHRpbWUgdHlwZVxuICBpZiAoZW5jb2RpbmcuaXNUeXBlKG5hbWUsIFQpICYmIChmbiA9IGVuY29kaW5nLmZuKG5hbWUpKSAmJiAodGltZS5oYXNTY2FsZShmbikpKSB7XG4gICAgc2V0dGVyKGRlZiwgWydwcm9wZXJ0aWVzJywnbGFiZWxzJywndGV4dCcsJ3NjYWxlJ10sICd0aW1lLScrIGZuKTtcbiAgfVxuXG4gIHJldHVybiBkZWY7XG59O1xuXG5mdW5jdGlvbiBheGlzX3RpdGxlKGRlZiwgbmFtZSwgZW5jb2RpbmcsIGxheW91dCwgb3B0KSB7XG4gIHZhciBtYXhsZW5ndGggPSBudWxsLFxuICAgIGZpZWxkVGl0bGUgPSBlbmNvZGluZy5maWVsZFRpdGxlKG5hbWUpO1xuICBpZiAobmFtZT09PVgpIHtcbiAgICBtYXhsZW5ndGggPSBsYXlvdXQuY2VsbFdpZHRoIC8gZW5jb2RpbmcuY29uZmlnKCdjaGFyYWN0ZXJXaWR0aCcpO1xuICB9IGVsc2UgaWYgKG5hbWUgPT09IFkpIHtcbiAgICBtYXhsZW5ndGggPSBsYXlvdXQuY2VsbEhlaWdodCAvIGVuY29kaW5nLmNvbmZpZygnY2hhcmFjdGVyV2lkdGgnKTtcbiAgfVxuXG4gIGRlZi50aXRsZSA9IG1heGxlbmd0aCA/IHV0aWwudHJ1bmNhdGUoZmllbGRUaXRsZSwgbWF4bGVuZ3RoKSA6IGZpZWxkVGl0bGU7XG5cbiAgaWYgKG5hbWUgPT09IFJPVykge1xuICAgIHNldHRlcihkZWYsIFsncHJvcGVydGllcycsJ3RpdGxlJ10sIHtcbiAgICAgIGFuZ2xlOiB7dmFsdWU6IDB9LFxuICAgICAgYWxpZ246IHt2YWx1ZTogJ3JpZ2h0J30sXG4gICAgICBiYXNlbGluZToge3ZhbHVlOiAnbWlkZGxlJ30sXG4gICAgICBkeToge3ZhbHVlOiAoLWxheW91dC5oZWlnaHQvMikgLTIwfVxuICAgIH0pO1xuICB9XG4gIGRlZi50aXRsZU9mZnNldCA9IGF4aXNUaXRsZU9mZnNldChlbmNvZGluZywgbGF5b3V0LCBuYW1lKTtcbiAgcmV0dXJuIGRlZjtcbn1cblxuZnVuY3Rpb24gYXhpc1RpdGxlT2Zmc2V0KGVuY29kaW5nLCBsYXlvdXQsIG5hbWUpIHtcbiAgdmFyIHZhbHVlID0gZW5jb2RpbmcuYXhpcyhuYW1lKS50aXRsZU9mZnNldDtcbiAgaWYgKHZhbHVlKSB7XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9XG4gIHN3aXRjaCAobmFtZSkge1xuICAgIGNhc2UgUk9XOiByZXR1cm4gMDtcbiAgICBjYXNlIENPTDogcmV0dXJuIDM1O1xuICB9XG4gIHJldHVybiBnZXR0ZXIobGF5b3V0LCBbbmFtZSwgJ2F4aXNUaXRsZU9mZnNldCddKTtcbn1cbiIsInZhciBnbG9iYWxzID0gcmVxdWlyZSgnLi4vZ2xvYmFscycpLFxuICB1dGlsID0gcmVxdWlyZSgnLi4vdXRpbCcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGJpbm5pbmc7XG5cbmZ1bmN0aW9uIGJpbm5pbmcoc3BlYywgZW5jb2RpbmcsIG9wdCkge1xuICBvcHQgPSBvcHQgfHwge307XG4gIHZhciBiaW5zID0ge307XG4gIGVuY29kaW5nLmZvckVhY2goZnVuY3Rpb24odnYsIGQpIHtcbiAgICBpZiAoZC5iaW4pIGJpbnNbZC5uYW1lXSA9IGQubmFtZTtcbiAgfSk7XG4gIGJpbnMgPSB1dGlsLmtleXMoYmlucyk7XG5cbiAgaWYgKGJpbnMubGVuZ3RoID09PSAwIHx8IG9wdC5wcmVhZ2dyZWdhdGVkRGF0YSkgcmV0dXJuIGZhbHNlO1xuXG4gIGlmICghc3BlYy50cmFuc2Zvcm0pIHNwZWMudHJhbnNmb3JtID0gW107XG4gIGJpbnMuZm9yRWFjaChmdW5jdGlvbihkKSB7XG4gICAgc3BlYy50cmFuc2Zvcm0ucHVzaCh7XG4gICAgICB0eXBlOiAnYmluJyxcbiAgICAgIGZpZWxkOiAnZGF0YS4nICsgZCxcbiAgICAgIG91dHB1dDogJ2RhdGEuYmluXycgKyBkLFxuICAgICAgbWF4YmluczogZW5jb2RpbmcuY29uZmlnKCdtYXhiaW5zJylcbiAgICB9KTtcbiAgfSk7XG4gIHJldHVybiBiaW5zO1xufVxuIiwidmFyIGdsb2JhbHMgPSByZXF1aXJlKCcuLi9nbG9iYWxzJyksXG4gIHV0aWwgPSByZXF1aXJlKCcuLi91dGlsJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gY29tcGlsZTtcblxudmFyIHRlbXBsYXRlID0gY29tcGlsZS50ZW1wbGF0ZSA9IHJlcXVpcmUoJy4vdGVtcGxhdGUnKSxcbiAgYXhpcyA9IGNvbXBpbGUuYXhpcyA9IHJlcXVpcmUoJy4vYXhpcycpLFxuICBmaWx0ZXIgPSBjb21waWxlLmZpbHRlciA9IHJlcXVpcmUoJy4vZmlsdGVyJyksXG4gIGxlZ2VuZCA9IGNvbXBpbGUubGVnZW5kID0gcmVxdWlyZSgnLi9sZWdlbmQnKSxcbiAgbWFya3MgPSBjb21waWxlLm1hcmtzID0gcmVxdWlyZSgnLi9tYXJrcycpLFxuICBzY2FsZSA9IGNvbXBpbGUuc2NhbGUgPSByZXF1aXJlKCcuL3NjYWxlJyksXG4gIHZsc3R5bGUgPSBjb21waWxlLnN0eWxlID0gcmVxdWlyZSgnLi9zdHlsZScpLFxuICB0aW1lID0gY29tcGlsZS50aW1lID0gcmVxdWlyZSgnLi90aW1lJyksXG4gIGFnZ3JlZ2F0ZXMgPSBjb21waWxlLmFnZ3JlZ2F0ZXMgPSByZXF1aXJlKCcuL2FnZ3JlZ2F0ZXMnKSxcbiAgYmlubmluZyA9IGNvbXBpbGUuYmlubmluZyA9IHJlcXVpcmUoJy4vYmlubmluZycpLFxuICBmYWNldGluZyA9IGNvbXBpbGUuZmFjZXRpbmcgPSByZXF1aXJlKCcuL2ZhY2V0aW5nJyksXG4gIHN0YWNraW5nID0gY29tcGlsZS5zdGFja2luZyA9IHJlcXVpcmUoJy4vc3RhY2tpbmcnKTtcbiAgc3ViZmFjZXRpbmcgPSBjb21waWxlLnN1YmZhY2V0aW5nID0gcmVxdWlyZSgnLi9zdWJmYWNldGluZycpO1xuXG5jb21waWxlLmxheW91dCA9IHJlcXVpcmUoJy4vbGF5b3V0Jyk7XG5jb21waWxlLmdyb3VwID0gcmVxdWlyZSgnLi9ncm91cCcpO1xuXG5mdW5jdGlvbiBjb21waWxlKGVuY29kaW5nLCBzdGF0cykge1xuICB2YXIgbGF5b3V0ID0gY29tcGlsZS5sYXlvdXQoZW5jb2RpbmcsIHN0YXRzKSxcbiAgICBzdHlsZSA9IHZsc3R5bGUoZW5jb2RpbmcsIHN0YXRzKSxcbiAgICBzcGVjID0gdGVtcGxhdGUoZW5jb2RpbmcsIGxheW91dCwgc3RhdHMpLFxuICAgIGdyb3VwID0gc3BlYy5tYXJrc1swXSxcbiAgICBtYXJrID0gbWFya3NbZW5jb2RpbmcubWFya3R5cGUoKV0sXG4gICAgbWRlZiA9IG1hcmtzLmRlZihtYXJrLCBlbmNvZGluZywgbGF5b3V0LCBzdHlsZSk7XG5cbiAgZmlsdGVyKHNwZWMsIGVuY29kaW5nKTtcblxuICB2YXIgaGFzUm93ID0gZW5jb2RpbmcuaGFzKFJPVyksIGhhc0NvbCA9IGVuY29kaW5nLmhhcyhDT0wpO1xuXG4gIHZhciBwcmVhZ2dyZWdhdGVkRGF0YSA9IGVuY29kaW5nLmNvbmZpZygndXNlVmVnYVNlcnZlcicpO1xuXG4gIGdyb3VwLm1hcmtzLnB1c2gobWRlZik7XG4gIC8vIFRPRE86IHJldHVybiB2YWx1ZSBub3QgdXNlZFxuICBiaW5uaW5nKHNwZWMuZGF0YVswXSwgZW5jb2RpbmcsIHtwcmVhZ2dyZWdhdGVkRGF0YTogcHJlYWdncmVnYXRlZERhdGF9KTtcblxuICB2YXIgbGluZVR5cGUgPSBtYXJrc1tlbmNvZGluZy5tYXJrdHlwZSgpXS5saW5lO1xuXG4gIGlmICghcHJlYWdncmVnYXRlZERhdGEpIHtcbiAgICBzcGVjID0gdGltZShzcGVjLCBlbmNvZGluZyk7XG4gIH1cblxuICAvLyBoYW5kbGUgc3ViZmFjZXRzXG4gIHZhciBhZ2dSZXN1bHQgPSBhZ2dyZWdhdGVzKHNwZWMuZGF0YVswXSwgZW5jb2RpbmcsIHtwcmVhZ2dyZWdhdGVkRGF0YTogcHJlYWdncmVnYXRlZERhdGF9KSxcbiAgICBkZXRhaWxzID0gYWdnUmVzdWx0LmRldGFpbHMsXG4gICAgaGFzRGV0YWlscyA9IGRldGFpbHMgJiYgZGV0YWlscy5sZW5ndGggPiAwLFxuICAgIHN0YWNrID0gaGFzRGV0YWlscyAmJiBzdGFja2luZyhzcGVjLCBlbmNvZGluZywgbWRlZiwgYWdnUmVzdWx0LmZhY2V0cyk7XG5cbiAgaWYgKGhhc0RldGFpbHMgJiYgKHN0YWNrIHx8IGxpbmVUeXBlKSkge1xuICAgIC8vc3ViZmFjZXQgdG8gZ3JvdXAgc3RhY2sgLyBsaW5lIHRvZ2V0aGVyIGluIG9uZSBncm91cFxuICAgIHN1YmZhY2V0aW5nKGdyb3VwLCBtZGVmLCBkZXRhaWxzLCBzdGFjaywgZW5jb2RpbmcpO1xuICB9XG5cbiAgLy8gYXV0by1zb3J0IGxpbmUvYXJlYSB2YWx1ZXNcbiAgLy9UT0RPKGthbml0dyk6IGhhdmUgc29tZSBjb25maWcgdG8gdHVybiBvZmYgYXV0by1zb3J0IGZvciBsaW5lIChmb3IgbGluZSBjaGFydCB0aGF0IGVuY29kZXMgdGVtcG9yYWwgaW5mb3JtYXRpb24pXG4gIGlmIChsaW5lVHlwZSkge1xuICAgIHZhciBmID0gKGVuY29kaW5nLmlzUXVhbnRTY2FsZShYKSAmJiBlbmNvZGluZy5pc09yZGluYWxTY2FsZShZKSkgPyBZIDogWDtcbiAgICBpZiAoIW1kZWYuZnJvbSkgbWRlZi5mcm9tID0ge307XG4gICAgbWRlZi5mcm9tLnRyYW5zZm9ybSA9IFt7dHlwZTogJ3NvcnQnLCBieTogZW5jb2RpbmcuZmllbGQoZil9XTtcbiAgfVxuXG4gIC8vIFNtYWxsIE11bHRpcGxlc1xuICBpZiAoaGFzUm93IHx8IGhhc0NvbCkge1xuICAgIHNwZWMgPSBmYWNldGluZyhncm91cCwgZW5jb2RpbmcsIGxheW91dCwgc3R5bGUsIHNwZWMsIG1kZWYsIHN0YWNrLCBzdGF0cyk7XG4gICAgc3BlYy5sZWdlbmRzID0gbGVnZW5kLmRlZnMoZW5jb2RpbmcpO1xuICB9IGVsc2Uge1xuICAgIGdyb3VwLnNjYWxlcyA9IHNjYWxlLmRlZnMoc2NhbGUubmFtZXMobWRlZi5wcm9wZXJ0aWVzLnVwZGF0ZSksIGVuY29kaW5nLCBsYXlvdXQsIHN0eWxlLFxuICAgICAge3N0YWNrOiBzdGFjaywgc3RhdHM6IHN0YXRzfSk7XG4gICAgZ3JvdXAuYXhlcyA9IGF4aXMuZGVmcyhheGlzLm5hbWVzKG1kZWYucHJvcGVydGllcy51cGRhdGUpLCBlbmNvZGluZywgbGF5b3V0KTtcbiAgICBncm91cC5sZWdlbmRzID0gbGVnZW5kLmRlZnMoZW5jb2RpbmcpO1xuICB9XG4gIHJldHVybiBzcGVjO1xufVxuXG4iLCJ2YXIgZ2xvYmFscyA9IHJlcXVpcmUoJy4uL2dsb2JhbHMnKSxcbiAgdXRpbCA9IHJlcXVpcmUoJy4uL3V0aWwnKTtcblxudmFyIGF4aXMgPSByZXF1aXJlKCcuL2F4aXMnKSxcbiAgZ3JvdXBkZWYgPSByZXF1aXJlKCcuL2dyb3VwJykuZGVmLFxuICBzY2FsZSA9IHJlcXVpcmUoJy4vc2NhbGUnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmYWNldGluZztcblxuZnVuY3Rpb24gZmFjZXRpbmcoZ3JvdXAsIGVuY29kaW5nLCBsYXlvdXQsIHN0eWxlLCBzcGVjLCBtZGVmLCBzdGFjaywgc3RhdHMpIHtcbiAgdmFyIGVudGVyID0gZ3JvdXAucHJvcGVydGllcy5lbnRlcjtcbiAgdmFyIGZhY2V0S2V5cyA9IFtdLCBjZWxsQXhlcyA9IFtdLCBmcm9tLCBheGVzR3JwO1xuXG4gIHZhciBoYXNSb3cgPSBlbmNvZGluZy5oYXMoUk9XKSwgaGFzQ29sID0gZW5jb2RpbmcuaGFzKENPTCk7XG5cbiAgZW50ZXIuZmlsbCA9IHt2YWx1ZTogZW5jb2RpbmcuY29uZmlnKCdjZWxsQmFja2dyb3VuZENvbG9yJyl9O1xuXG4gIC8vbW92ZSBcImZyb21cIiB0byBjZWxsIGxldmVsIGFuZCBhZGQgZmFjZXQgdHJhbnNmb3JtXG4gIGdyb3VwLmZyb20gPSB7ZGF0YTogZ3JvdXAubWFya3NbMF0uZnJvbS5kYXRhfTtcblxuICBpZiAoZ3JvdXAubWFya3NbMF0uZnJvbS50cmFuc2Zvcm0pIHtcbiAgICBkZWxldGUgZ3JvdXAubWFya3NbMF0uZnJvbS5kYXRhOyAvL25lZWQgdG8ga2VlcCB0cmFuc2Zvcm0gZm9yIHN1YmZhY2V0dGluZyBjYXNlXG4gIH0gZWxzZSB7XG4gICAgZGVsZXRlIGdyb3VwLm1hcmtzWzBdLmZyb207XG4gIH1cbiAgaWYgKGhhc1Jvdykge1xuICAgIGlmICghZW5jb2RpbmcuaXNPcmRpbmFsU2NhbGUoUk9XKSkge1xuICAgICAgdXRpbC5lcnJvcignUm93IGVuY29kaW5nIHNob3VsZCBiZSBvcmRpbmFsLicpO1xuICAgIH1cbiAgICBlbnRlci55ID0ge3NjYWxlOiBST1csIGZpZWxkOiAna2V5cy4nICsgZmFjZXRLZXlzLmxlbmd0aH07XG4gICAgZW50ZXIuaGVpZ2h0ID0geyd2YWx1ZSc6IGxheW91dC5jZWxsSGVpZ2h0fTsgLy8gSEFDS1xuXG4gICAgZmFjZXRLZXlzLnB1c2goZW5jb2RpbmcuZmllbGQoUk9XKSk7XG5cbiAgICBpZiAoaGFzQ29sKSB7XG4gICAgICBmcm9tID0gdXRpbC5kdXBsaWNhdGUoZ3JvdXAuZnJvbSk7XG4gICAgICBmcm9tLnRyYW5zZm9ybSA9IGZyb20udHJhbnNmb3JtIHx8IFtdO1xuICAgICAgZnJvbS50cmFuc2Zvcm0udW5zaGlmdCh7dHlwZTogJ2ZhY2V0Jywga2V5czogW2VuY29kaW5nLmZpZWxkKENPTCldfSk7XG4gICAgfVxuXG4gICAgYXhlc0dycCA9IGdyb3VwZGVmKCd4LWF4ZXMnLCB7XG4gICAgICAgIGF4ZXM6IGVuY29kaW5nLmhhcyhYKSA/IGF4aXMuZGVmcyhbJ3gnXSwgZW5jb2RpbmcsIGxheW91dCkgOiB1bmRlZmluZWQsXG4gICAgICAgIHg6IGhhc0NvbCA/IHtzY2FsZTogQ09MLCBmaWVsZDogJ2tleXMuMCd9IDoge3ZhbHVlOiAwfSxcbiAgICAgICAgd2lkdGg6IGhhc0NvbCAmJiB7J3ZhbHVlJzogbGF5b3V0LmNlbGxXaWR0aH0sIC8vSEFDSz9cbiAgICAgICAgZnJvbTogZnJvbVxuICAgICAgfSk7XG5cbiAgICBzcGVjLm1hcmtzLnB1c2goYXhlc0dycCk7XG4gICAgKHNwZWMuYXhlcyA9IHNwZWMuYXhlcyB8fCBbXSk7XG4gICAgc3BlYy5heGVzLnB1c2guYXBwbHkoc3BlYy5heGVzLCBheGlzLmRlZnMoWydyb3cnXSwgZW5jb2RpbmcsIGxheW91dCkpO1xuICB9IGVsc2UgeyAvLyBkb2Vzbid0IGhhdmUgcm93XG4gICAgaWYgKGVuY29kaW5nLmhhcyhYKSkge1xuICAgICAgLy9rZWVwIHggYXhpcyBpbiB0aGUgY2VsbFxuICAgICAgY2VsbEF4ZXMucHVzaC5hcHBseShjZWxsQXhlcywgYXhpcy5kZWZzKFsneCddLCBlbmNvZGluZywgbGF5b3V0KSk7XG4gICAgfVxuICB9XG5cbiAgaWYgKGhhc0NvbCkge1xuICAgIGlmICghZW5jb2RpbmcuaXNPcmRpbmFsU2NhbGUoQ09MKSkge1xuICAgICAgdXRpbC5lcnJvcignQ29sIGVuY29kaW5nIHNob3VsZCBiZSBvcmRpbmFsLicpO1xuICAgIH1cbiAgICBlbnRlci54ID0ge3NjYWxlOiBDT0wsIGZpZWxkOiAna2V5cy4nICsgZmFjZXRLZXlzLmxlbmd0aH07XG4gICAgZW50ZXIud2lkdGggPSB7J3ZhbHVlJzogbGF5b3V0LmNlbGxXaWR0aH07IC8vIEhBQ0tcblxuICAgIGZhY2V0S2V5cy5wdXNoKGVuY29kaW5nLmZpZWxkKENPTCkpO1xuXG4gICAgaWYgKGhhc1Jvdykge1xuICAgICAgZnJvbSA9IHV0aWwuZHVwbGljYXRlKGdyb3VwLmZyb20pO1xuICAgICAgZnJvbS50cmFuc2Zvcm0gPSBmcm9tLnRyYW5zZm9ybSB8fCBbXTtcbiAgICAgIGZyb20udHJhbnNmb3JtLnVuc2hpZnQoe3R5cGU6ICdmYWNldCcsIGtleXM6IFtlbmNvZGluZy5maWVsZChST1cpXX0pO1xuICAgIH1cblxuICAgIGF4ZXNHcnAgPSBncm91cGRlZigneS1heGVzJywge1xuICAgICAgYXhlczogZW5jb2RpbmcuaGFzKFkpID8gYXhpcy5kZWZzKFsneSddLCBlbmNvZGluZywgbGF5b3V0KSA6IHVuZGVmaW5lZCxcbiAgICAgIHk6IGhhc1JvdyAmJiB7c2NhbGU6IFJPVywgZmllbGQ6ICdrZXlzLjAnfSxcbiAgICAgIHg6IGhhc1JvdyAmJiB7dmFsdWU6IDB9LFxuICAgICAgaGVpZ2h0OiBoYXNSb3cgJiYgeyd2YWx1ZSc6IGxheW91dC5jZWxsSGVpZ2h0fSwgLy9IQUNLP1xuICAgICAgZnJvbTogZnJvbVxuICAgIH0pO1xuXG4gICAgc3BlYy5tYXJrcy5wdXNoKGF4ZXNHcnApO1xuICAgIChzcGVjLmF4ZXMgPSBzcGVjLmF4ZXMgfHwgW10pO1xuICAgIHNwZWMuYXhlcy5wdXNoLmFwcGx5KHNwZWMuYXhlcywgYXhpcy5kZWZzKFsnY29sJ10sIGVuY29kaW5nLCBsYXlvdXQpKTtcbiAgfSBlbHNlIHsgLy8gZG9lc24ndCBoYXZlIGNvbFxuICAgIGlmIChlbmNvZGluZy5oYXMoWSkpIHtcbiAgICAgIGNlbGxBeGVzLnB1c2guYXBwbHkoY2VsbEF4ZXMsIGF4aXMuZGVmcyhbJ3knXSwgZW5jb2RpbmcsIGxheW91dCkpO1xuICAgIH1cbiAgfVxuXG4gIC8vIGFzc3VtaW5nIGVxdWFsIGNlbGxXaWR0aCBoZXJlXG4gIC8vIFRPRE86IHN1cHBvcnQgaGV0ZXJvZ2Vub3VzIGNlbGxXaWR0aCAobWF5YmUgYnkgdXNpbmcgbXVsdGlwbGUgc2NhbGVzPylcbiAgc3BlYy5zY2FsZXMgPSAoc3BlYy5zY2FsZXMgfHwgW10pLmNvbmNhdChzY2FsZS5kZWZzKFxuICAgIHNjYWxlLm5hbWVzKGVudGVyKS5jb25jYXQoc2NhbGUubmFtZXMobWRlZi5wcm9wZXJ0aWVzLnVwZGF0ZSkpLFxuICAgIGVuY29kaW5nLFxuICAgIGxheW91dCxcbiAgICBzdHlsZSxcbiAgICB7c3RhY2s6IHN0YWNrLCBmYWNldDogdHJ1ZSwgc3RhdHM6IHN0YXRzfVxuICApKTsgLy8gcm93L2NvbCBzY2FsZXMgKyBjZWxsIHNjYWxlc1xuXG4gIGlmIChjZWxsQXhlcy5sZW5ndGggPiAwKSB7XG4gICAgZ3JvdXAuYXhlcyA9IGNlbGxBeGVzO1xuICB9XG5cbiAgLy8gYWRkIGZhY2V0IHRyYW5zZm9ybVxuICB2YXIgdHJhbnMgPSAoZ3JvdXAuZnJvbS50cmFuc2Zvcm0gfHwgKGdyb3VwLmZyb20udHJhbnNmb3JtID0gW10pKTtcbiAgdHJhbnMudW5zaGlmdCh7dHlwZTogJ2ZhY2V0Jywga2V5czogZmFjZXRLZXlzfSk7XG5cbiAgcmV0dXJuIHNwZWM7XG59XG4iLCJ2YXIgZ2xvYmFscyA9IHJlcXVpcmUoJy4uL2dsb2JhbHMnKTtcblxudmFyIEJJTkFSWSA9IHtcbiAgJz4nOiAgdHJ1ZSxcbiAgJz49JzogdHJ1ZSxcbiAgJz0nOiAgdHJ1ZSxcbiAgJyE9JzogdHJ1ZSxcbiAgJzwnOiAgdHJ1ZSxcbiAgJzw9JzogdHJ1ZVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihzcGVjLCBlbmNvZGluZykge1xuICB2YXIgZmlsdGVycyA9IGVuY29kaW5nLmZpbHRlcigpO1xuXG4gIGlmICghc3BlYy5kYXRhWzBdLnRyYW5zZm9ybSlcbiAgICBzcGVjLmRhdGFbMF0udHJhbnNmb3JtID0gW107XG5cbiAgLy8gYWRkIGN1c3RvbSBmaWx0ZXJzXG4gIGZvciAoaSBpbiBmaWx0ZXJzKSB7XG4gICAgdmFyIGZpbHRlciA9IGZpbHRlcnNbaV07XG5cbiAgICB2YXIgY29uZGl0aW9uID0gJyc7XG4gICAgdmFyIG9wZXJhdG9yID0gZmlsdGVyLm9wZXJhdG9yO1xuICAgIHZhciBvcGVyYW5kcyA9IGZpbHRlci5vcGVyYW5kcztcblxuICAgIGlmIChCSU5BUllbb3BlcmF0b3JdKSB7XG4gICAgICAvLyBleHBlY3RzIGEgZmllbGQgYW5kIGEgdmFsdWVcbiAgICAgIGlmIChvcGVyYXRvciA9PT0gJz0nKSB7XG4gICAgICAgIG9wZXJhdG9yID0gJz09JztcbiAgICAgIH1cblxuICAgICAgdmFyIG9wMSA9IG9wZXJhbmRzWzBdO1xuICAgICAgdmFyIG9wMiA9IG9wZXJhbmRzWzFdO1xuICAgICAgY29uZGl0aW9uID0gJ2QuZGF0YS4nICsgb3AxICsgb3BlcmF0b3IgKyBvcDI7XG4gICAgfSBlbHNlIGlmIChvcGVyYXRvciA9PT0gJ25vdE51bGwnKSB7XG4gICAgICAvLyBleHBlY3RzIGEgbnVtYmVyIG9mIGZpZWxkc1xuICAgICAgZm9yIChqIGluIG9wZXJhbmRzKSB7XG4gICAgICAgIGNvbmRpdGlvbiArPSAnZC5kYXRhLicgKyBvcGVyYW5kc1tqXSArICchPW51bGwnXG4gICAgICAgIGlmIChqIDwgb3BlcmFuZHMubGVuZ3RoIC0gMSkge1xuICAgICAgICAgIGNvbmRpdGlvbiArPSAnICYmICdcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBjb25zb2xlLndhcm4oJ1Vuc3VwcG9ydGVkIG9wZXJhdG9yOiAnLCBvcGVyYXRvcik7XG4gICAgfVxuXG4gICAgc3BlYy5kYXRhWzBdLnRyYW5zZm9ybS5wdXNoKHtcbiAgICAgIHR5cGU6ICdmaWx0ZXInLFxuICAgICAgdGVzdDogY29uZGl0aW9uXG4gICAgfSk7XG4gIH07XG5cbiAgLy8gcmVtb3ZlIDAgdmFsdWVzIGlmIHdlIHVzZSBsb2cgZnVuY3Rpb25cbiAgZW5jb2RpbmcuZm9yRWFjaChmdW5jdGlvbihlbmNUeXBlLCBmaWVsZCkge1xuICAgIGlmIChlbmNvZGluZy5zY2FsZShlbmNUeXBlKS50eXBlID09PSAnbG9nJykge1xuICAgICAgc3BlYy5kYXRhWzBdLnRyYW5zZm9ybS5wdXNoKHtcbiAgICAgICAgdHlwZTogJ2ZpbHRlcicsXG4gICAgICAgIHRlc3Q6ICdkLmRhdGEuJyArIGZpZWxkLm5hbWUgKyAnPjAnXG4gICAgICB9KTtcbiAgICB9XG4gIH0pO1xufTtcblxuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gIGRlZjogZ3JvdXBkZWZcbn07XG5cbmZ1bmN0aW9uIGdyb3VwZGVmKG5hbWUsIG9wdCkge1xuICBvcHQgPSBvcHQgfHwge307XG4gIHJldHVybiB7XG4gICAgX25hbWU6IG5hbWUgfHwgdW5kZWZpbmVkLFxuICAgIHR5cGU6ICdncm91cCcsXG4gICAgZnJvbTogb3B0LmZyb20sXG4gICAgcHJvcGVydGllczoge1xuICAgICAgZW50ZXI6IHtcbiAgICAgICAgeDogb3B0LnggfHwgdW5kZWZpbmVkLFxuICAgICAgICB5OiBvcHQueSB8fCB1bmRlZmluZWQsXG4gICAgICAgIHdpZHRoOiBvcHQud2lkdGggfHwge2dyb3VwOiAnd2lkdGgnfSxcbiAgICAgICAgaGVpZ2h0OiBvcHQuaGVpZ2h0IHx8IHtncm91cDogJ2hlaWdodCd9XG4gICAgICB9XG4gICAgfSxcbiAgICBzY2FsZXM6IG9wdC5zY2FsZXMgfHwgdW5kZWZpbmVkLFxuICAgIGF4ZXM6IG9wdC5heGVzIHx8IHVuZGVmaW5lZCxcbiAgICBtYXJrczogb3B0Lm1hcmtzIHx8IFtdXG4gIH07XG59XG4iLCJ2YXIgZ2xvYmFscyA9IHJlcXVpcmUoJy4uL2dsb2JhbHMnKSxcbiAgdXRpbCA9IHJlcXVpcmUoJy4uL3V0aWwnKSxcbiAgc2V0dGVyID0gdXRpbC5zZXR0ZXIsXG4gIHNjaGVtYSA9IHJlcXVpcmUoJy4uL3NjaGVtYS9zY2hlbWEnKSxcbiAgdGltZSA9IHJlcXVpcmUoJy4vdGltZScpLFxuICB2bGZpZWxkID0gcmVxdWlyZSgnLi4vZmllbGQnKTtcblxubW9kdWxlLmV4cG9ydHMgPSB2bGxheW91dDtcblxuZnVuY3Rpb24gdmxsYXlvdXQoZW5jb2RpbmcsIHN0YXRzKSB7XG4gIHZhciBsYXlvdXQgPSBib3goZW5jb2RpbmcsIHN0YXRzKTtcbiAgbGF5b3V0ID0gb2Zmc2V0KGVuY29kaW5nLCBzdGF0cywgbGF5b3V0KTtcbiAgcmV0dXJuIGxheW91dDtcbn1cblxuLypcbiAgSEFDSyB0byBzZXQgY2hhcnQgc2l6ZVxuICBOT1RFOiB0aGlzIGZhaWxzIGZvciBwbG90cyBkcml2ZW4gYnkgZGVyaXZlZCB2YWx1ZXMgKGUuZy4sIGFnZ3JlZ2F0ZXMpXG4gIE9uZSBzb2x1dGlvbiBpcyB0byB1cGRhdGUgVmVnYSB0byBzdXBwb3J0IGF1dG8tc2l6aW5nXG4gIEluIHRoZSBtZWFudGltZSwgYXV0by1wYWRkaW5nIChtb3N0bHkpIGRvZXMgdGhlIHRyaWNrXG4gKi9cbmZ1bmN0aW9uIGJveChlbmNvZGluZywgc3RhdHMpIHtcbiAgdmFyIGhhc1JvdyA9IGVuY29kaW5nLmhhcyhST1cpLFxuICAgICAgaGFzQ29sID0gZW5jb2RpbmcuaGFzKENPTCksXG4gICAgICBoYXNYID0gZW5jb2RpbmcuaGFzKFgpLFxuICAgICAgaGFzWSA9IGVuY29kaW5nLmhhcyhZKSxcbiAgICAgIG1hcmt0eXBlID0gZW5jb2RpbmcubWFya3R5cGUoKTtcblxuICB2YXIgeENhcmRpbmFsaXR5ID0gaGFzWCAmJiBlbmNvZGluZy5pc09yZGluYWxTY2FsZShYKSA/IGVuY29kaW5nLmNhcmRpbmFsaXR5KFgsIHN0YXRzKSA6IDEsXG4gICAgeUNhcmRpbmFsaXR5ID0gaGFzWSAmJiBlbmNvZGluZy5pc09yZGluYWxTY2FsZShZKSA/IGVuY29kaW5nLmNhcmRpbmFsaXR5KFksIHN0YXRzKSA6IDE7XG5cbiAgdmFyIHVzZVNtYWxsQmFuZCA9IHhDYXJkaW5hbGl0eSA+IGVuY29kaW5nLmNvbmZpZygnbGFyZ2VCYW5kTWF4Q2FyZGluYWxpdHknKSB8fFxuICAgIHlDYXJkaW5hbGl0eSA+IGVuY29kaW5nLmNvbmZpZygnbGFyZ2VCYW5kTWF4Q2FyZGluYWxpdHknKTtcblxuICB2YXIgY2VsbFdpZHRoLCBjZWxsSGVpZ2h0LCBjZWxsUGFkZGluZyA9IGVuY29kaW5nLmNvbmZpZygnY2VsbFBhZGRpbmcnKTtcblxuICAvLyBzZXQgY2VsbFdpZHRoXG4gIGlmIChoYXNYKSB7XG4gICAgaWYgKGVuY29kaW5nLmlzT3JkaW5hbFNjYWxlKFgpKSB7XG4gICAgICAvLyBmb3Igb3JkaW5hbCwgaGFzQ29sIG9yIG5vdCBkb2Vzbid0IG1hdHRlciAtLSB3ZSBzY2FsZSBiYXNlZCBvbiBjYXJkaW5hbGl0eVxuICAgICAgY2VsbFdpZHRoID0gKHhDYXJkaW5hbGl0eSArIGVuY29kaW5nLmJhbmQoWCkucGFkZGluZykgKiBlbmNvZGluZy5iYW5kU2l6ZShYLCB1c2VTbWFsbEJhbmQpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjZWxsV2lkdGggPSBoYXNDb2wgfHwgaGFzUm93ID8gZW5jb2RpbmcuZW5jKENPTCkud2lkdGggOiAgZW5jb2RpbmcuY29uZmlnKFwic2luZ2xlV2lkdGhcIik7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGlmIChtYXJrdHlwZSA9PT0gVEVYVCkge1xuICAgICAgY2VsbFdpZHRoID0gZW5jb2RpbmcuY29uZmlnKCd0ZXh0Q2VsbFdpZHRoJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNlbGxXaWR0aCA9IGVuY29kaW5nLmJhbmRTaXplKFgpO1xuICAgIH1cbiAgfVxuXG4gIC8vIHNldCBjZWxsSGVpZ2h0XG4gIGlmIChoYXNZKSB7XG4gICAgaWYgKGVuY29kaW5nLmlzT3JkaW5hbFNjYWxlKFkpKSB7XG4gICAgICAvLyBmb3Igb3JkaW5hbCwgaGFzQ29sIG9yIG5vdCBkb2Vzbid0IG1hdHRlciAtLSB3ZSBzY2FsZSBiYXNlZCBvbiBjYXJkaW5hbGl0eVxuICAgICAgY2VsbEhlaWdodCA9ICh5Q2FyZGluYWxpdHkgKyBlbmNvZGluZy5iYW5kKFkpLnBhZGRpbmcpICogZW5jb2RpbmcuYmFuZFNpemUoWSwgdXNlU21hbGxCYW5kKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY2VsbEhlaWdodCA9IGhhc0NvbCB8fCBoYXNSb3cgPyBlbmNvZGluZy5lbmMoUk9XKS5oZWlnaHQgOiAgZW5jb2RpbmcuY29uZmlnKFwic2luZ2xlSGVpZ2h0XCIpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBjZWxsSGVpZ2h0ID0gZW5jb2RpbmcuYmFuZFNpemUoWSk7XG4gIH1cblxuICAvLyBDZWxsIGJhbmRzIHVzZSByYW5nZUJhbmRzKCkuIFRoZXJlIGFyZSBuLTEgcGFkZGluZy4gIE91dGVycGFkZGluZyA9IDAgZm9yIGNlbGxzXG5cbiAgdmFyIHdpZHRoID0gY2VsbFdpZHRoLCBoZWlnaHQgPSBjZWxsSGVpZ2h0O1xuICBpZiAoaGFzQ29sKSB7XG4gICAgdmFyIGNvbENhcmRpbmFsaXR5ID0gZW5jb2RpbmcuY2FyZGluYWxpdHkoQ09MLCBzdGF0cyk7XG4gICAgd2lkdGggPSBjZWxsV2lkdGggKiAoKDEgKyBjZWxsUGFkZGluZykgKiAoY29sQ2FyZGluYWxpdHkgLSAxKSArIDEpO1xuICB9XG4gIGlmIChoYXNSb3cpIHtcbiAgICB2YXIgcm93Q2FyZGluYWxpdHkgPSAgZW5jb2RpbmcuY2FyZGluYWxpdHkoUk9XLCBzdGF0cyk7XG4gICAgaGVpZ2h0ID0gY2VsbEhlaWdodCAqICgoMSArIGNlbGxQYWRkaW5nKSAqIChyb3dDYXJkaW5hbGl0eSAtIDEpICsgMSk7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGNlbGxXaWR0aDogY2VsbFdpZHRoLFxuICAgIGNlbGxIZWlnaHQ6IGNlbGxIZWlnaHQsXG4gICAgd2lkdGg6IHdpZHRoLFxuICAgIGhlaWdodDogaGVpZ2h0LFxuICAgIHg6IHt1c2VTbWFsbEJhbmQ6IHVzZVNtYWxsQmFuZH0sXG4gICAgeToge3VzZVNtYWxsQmFuZDogdXNlU21hbGxCYW5kfVxuICB9O1xufVxuXG5mdW5jdGlvbiBvZmZzZXQoZW5jb2RpbmcsIHN0YXRzLCBsYXlvdXQpIHtcbiAgW1gsIFldLmZvckVhY2goZnVuY3Rpb24gKHgpIHtcbiAgICB2YXIgbWF4TGVuZ3RoO1xuICAgIGlmIChlbmNvZGluZy5pc09yZGluYWxTY2FsZSh4KSB8fCBlbmNvZGluZy5pc1R5cGUoeCwgVCkpIHtcbiAgICAgIG1heExlbmd0aCA9IHN0YXRzW2VuY29kaW5nLmZpZWxkTmFtZSh4KV0ubWF4bGVuZ3RoO1xuICAgIH0gZWxzZSBpZiAoZW5jb2RpbmcuYWdncih4KSA9PT0gJ2NvdW50Jykge1xuICAgICAgLy9hc3NpZ24gZGVmYXVsdCB2YWx1ZSBmb3IgY291bnQgYXMgaXQgd29uJ3QgaGF2ZSBzdGF0c1xuICAgICAgbWF4TGVuZ3RoID0gIDM7XG4gICAgfSBlbHNlIGlmIChlbmNvZGluZy5pc1R5cGUoeCwgUSkpIHtcbiAgICAgIGlmICh4PT09WCkge1xuICAgICAgICBtYXhMZW5ndGggPSAzO1xuICAgICAgfSBlbHNlIHsgLy8gWVxuICAgICAgICAvL2Fzc3VtZSB0aGF0IGRlZmF1bHQgZm9ybWF0aW5nIGlzIGFsd2F5cyBzaG9ydGVyIHRoYW4gN1xuICAgICAgICBtYXhMZW5ndGggPSBNYXRoLm1pbihzdGF0c1tlbmNvZGluZy5maWVsZE5hbWUoeCldLm1heGxlbmd0aCwgNyk7XG4gICAgICB9XG4gICAgfVxuICAgIHNldHRlcihsYXlvdXQsW3gsICdheGlzVGl0bGVPZmZzZXQnXSwgZW5jb2RpbmcuY29uZmlnKCdjaGFyYWN0ZXJXaWR0aCcpICogIG1heExlbmd0aCArIDIwKTtcbiAgfSk7XG4gIHJldHVybiBsYXlvdXQ7XG59XG4iLCJ2YXIgZ2xvYmFsID0gcmVxdWlyZSgnLi4vZ2xvYmFscycpLFxuICB0aW1lID0gcmVxdWlyZSgnLi90aW1lJyk7XG5cbnZhciBsZWdlbmQgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG5sZWdlbmQuZGVmcyA9IGZ1bmN0aW9uKGVuY29kaW5nKSB7XG4gIHZhciBkZWZzID0gW107XG5cbiAgLy8gVE9ETzogc3VwcG9ydCBhbHBoYVxuXG4gIGlmIChlbmNvZGluZy5oYXMoQ09MT1IpICYmIGVuY29kaW5nLmxlZ2VuZChDT0xPUikpIHtcbiAgICBkZWZzLnB1c2gobGVnZW5kLmRlZihDT0xPUiwgZW5jb2RpbmcsIHtcbiAgICAgIGZpbGw6IENPTE9SLFxuICAgICAgb3JpZW50OiAncmlnaHQnXG4gICAgfSkpO1xuICB9XG5cbiAgaWYgKGVuY29kaW5nLmhhcyhTSVpFKSAmJiBlbmNvZGluZy5sZWdlbmQoU0laRSkpIHtcbiAgICBkZWZzLnB1c2gobGVnZW5kLmRlZihTSVpFLCBlbmNvZGluZywge1xuICAgICAgc2l6ZTogU0laRSxcbiAgICAgIG9yaWVudDogZGVmcy5sZW5ndGggPT09IDEgPyAnbGVmdCcgOiAncmlnaHQnXG4gICAgfSkpO1xuICB9XG5cbiAgaWYgKGVuY29kaW5nLmhhcyhTSEFQRSkgJiYgZW5jb2RpbmcubGVnZW5kKFNIQVBFKSkge1xuICAgIGlmIChkZWZzLmxlbmd0aCA9PT0gMikge1xuICAgICAgLy8gVE9ETzogZml4IHRoaXNcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1ZlZ2FsaXRlIGN1cnJlbnRseSBvbmx5IHN1cHBvcnRzIHR3byBsZWdlbmRzJyk7XG4gICAgICByZXR1cm4gZGVmcztcbiAgICB9XG4gICAgZGVmcy5wdXNoKGxlZ2VuZC5kZWYoU0hBUEUsIGVuY29kaW5nLCB7XG4gICAgICBzaGFwZTogU0hBUEUsXG4gICAgICBvcmllbnQ6IGRlZnMubGVuZ3RoID09PSAxID8gJ2xlZnQnIDogJ3JpZ2h0J1xuICAgIH0pKTtcbiAgfVxuXG4gIHJldHVybiBkZWZzO1xufTtcblxubGVnZW5kLmRlZiA9IGZ1bmN0aW9uKG5hbWUsIGVuY29kaW5nLCBwcm9wcykge1xuICB2YXIgZGVmID0gcHJvcHMsIGZuO1xuXG4gIGRlZi50aXRsZSA9IGVuY29kaW5nLmZpZWxkVGl0bGUobmFtZSk7XG5cbiAgaWYgKGVuY29kaW5nLmlzVHlwZShuYW1lLCBUKSAmJiAoZm4gPSBlbmNvZGluZy5mbihuYW1lKSkgJiZcbiAgICB0aW1lLmhhc1NjYWxlKGZuKSkge1xuICAgIHZhciBwcm9wZXJ0aWVzID0gZGVmLnByb3BlcnRpZXMgPSBkZWYucHJvcGVydGllcyB8fCB7fSxcbiAgICAgIGxhYmVscyA9IHByb3BlcnRpZXMubGFiZWxzID0gcHJvcGVydGllcy5sYWJlbHMgfHwge30sXG4gICAgICB0ZXh0ID0gbGFiZWxzLnRleHQgPSBsYWJlbHMudGV4dCB8fCB7fTtcblxuICAgIHRleHQuc2NhbGUgPSAndGltZS0nKyBmbjtcbiAgfVxuXG4gIHJldHVybiBkZWY7XG59O1xuIiwidmFyIGdsb2JhbHMgPSByZXF1aXJlKCcuLi9nbG9iYWxzJyksXG4gIHV0aWwgPSByZXF1aXJlKCcuLi91dGlsJyk7XG5cbnZhciBtYXJrcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbm1hcmtzLmRlZiA9IGZ1bmN0aW9uKG1hcmssIGVuY29kaW5nLCBsYXlvdXQsIHN0eWxlKSB7XG4gIHZhciBwID0gbWFyay5wcm9wKGVuY29kaW5nLCBsYXlvdXQsIHN0eWxlKTtcbiAgcmV0dXJuIHtcbiAgICB0eXBlOiBtYXJrLnR5cGUsXG4gICAgZnJvbToge2RhdGE6IFRBQkxFfSxcbiAgICBwcm9wZXJ0aWVzOiB7ZW50ZXI6IHAsIHVwZGF0ZTogcH1cbiAgfTtcbn07XG5cbm1hcmtzLmJhciA9IHtcbiAgdHlwZTogJ3JlY3QnLFxuICBzdGFjazogdHJ1ZSxcbiAgcHJvcDogYmFyX3Byb3BzLFxuICByZXF1aXJlZEVuY29kaW5nOiBbJ3gnLCAneSddLFxuICBzdXBwb3J0ZWRFbmNvZGluZzoge3JvdzogMSwgY29sOiAxLCB4OiAxLCB5OiAxLCBzaXplOiAxLCBjb2xvcjogMSwgYWxwaGE6IDF9XG59O1xuXG5tYXJrcy5saW5lID0ge1xuICB0eXBlOiAnbGluZScsXG4gIGxpbmU6IHRydWUsXG4gIHByb3A6IGxpbmVfcHJvcHMsXG4gIHJlcXVpcmVkRW5jb2Rpbmc6IFsneCcsICd5J10sXG4gIHN1cHBvcnRlZEVuY29kaW5nOiB7cm93OiAxLCBjb2w6IDEsIHg6IDEsIHk6IDEsIGNvbG9yOiAxLCBhbHBoYTogMX1cbn07XG5cbm1hcmtzLmFyZWEgPSB7XG4gIHR5cGU6ICdhcmVhJyxcbiAgc3RhY2s6IHRydWUsXG4gIGxpbmU6IHRydWUsXG4gIHJlcXVpcmVkRW5jb2Rpbmc6IFsneCcsICd5J10sXG4gIHByb3A6IGFyZWFfcHJvcHMsXG4gIHN1cHBvcnRlZEVuY29kaW5nOiBtYXJrcy5saW5lLnN1cHBvcnRlZEVuY29kaW5nXG59O1xuXG5tYXJrcy5jaXJjbGUgPSB7XG4gIHR5cGU6ICdzeW1ib2wnLFxuICBwcm9wOiBmaWxsZWRfcG9pbnRfcHJvcHMoJ2NpcmNsZScpLFxuICBzdXBwb3J0ZWRFbmNvZGluZzoge3JvdzogMSwgY29sOiAxLCB4OiAxLCB5OiAxLCBzaXplOiAxLCBjb2xvcjogMSwgYWxwaGE6IDF9XG59O1xuXG5tYXJrcy5zcXVhcmUgPSB7XG4gIHR5cGU6ICdzeW1ib2wnLFxuICBwcm9wOiBmaWxsZWRfcG9pbnRfcHJvcHMoJ3NxdWFyZScpLFxuICBzdXBwb3J0ZWRFbmNvZGluZzogbWFya3MuY2lyY2xlLnN1cHBvcnRlZEVuY29kaW5nXG59O1xuXG5tYXJrcy5wb2ludCA9IHtcbiAgdHlwZTogJ3N5bWJvbCcsXG4gIHByb3A6IHBvaW50X3Byb3BzLFxuICBzdXBwb3J0ZWRFbmNvZGluZzoge3JvdzogMSwgY29sOiAxLCB4OiAxLCB5OiAxLCBzaXplOiAxLCBjb2xvcjogMSwgYWxwaGE6IDEsIHNoYXBlOiAxfVxufTtcblxubWFya3MudGV4dCA9IHtcbiAgdHlwZTogJ3RleHQnLFxuICBwcm9wOiB0ZXh0X3Byb3BzLFxuICByZXF1aXJlZEVuY29kaW5nOiBbJ3RleHQnXSxcbiAgc3VwcG9ydGVkRW5jb2Rpbmc6IHtyb3c6IDEsIGNvbDogMSwgc2l6ZTogMSwgY29sb3I6IDEsIGFscGhhOiAxLCB0ZXh0OiAxfVxufTtcblxuZnVuY3Rpb24gYmFyX3Byb3BzKGUsIGxheW91dCkge1xuICB2YXIgcCA9IHt9O1xuXG4gIC8vIHhcbiAgaWYgKGUuaXNRdWFudFNjYWxlKFgpKSB7XG4gICAgcC54ID0ge3NjYWxlOiBYLCBmaWVsZDogZS5maWVsZChYKX07XG4gICAgaWYgKGUuaXNPcmRpbmFsU2NhbGUoWSkpIHtcbiAgICAgIHAueDIgPSB7c2NhbGU6IFgsIHZhbHVlOiAwfTtcbiAgICB9XG4gIH0gZWxzZSBpZiAoZS5oYXMoWCkpIHsgLy8gaXMgb3JkaW5hbFxuICAgIHAueGMgPSB7c2NhbGU6IFgsIGZpZWxkOiBlLmZpZWxkKFgpfTtcbiAgfSBlbHNlIHtcbiAgICAvLyBUT0RPIGFkZCBzaW5nbGUgYmFyIG9mZnNldFxuICAgIHAueGMgPSB7dmFsdWU6IDB9O1xuICB9XG5cbiAgLy8geVxuICBpZiAoZS5pc1F1YW50U2NhbGUoWSkpIHtcbiAgICBwLnkgPSB7c2NhbGU6IFksIGZpZWxkOiBlLmZpZWxkKFkpfTtcbiAgICBwLnkyID0ge3NjYWxlOiBZLCB2YWx1ZTogMH07XG4gIH0gZWxzZSBpZiAoZS5oYXMoWSkpIHsgLy8gaXMgb3JkaW5hbFxuICAgIHAueWMgPSB7c2NhbGU6IFksIGZpZWxkOiBlLmZpZWxkKFkpfTtcbiAgfSBlbHNlIHtcbiAgICAvLyBUT0RPIGFkZCBzaW5nbGUgYmFyIG9mZnNldFxuICAgIHAueWMgPSB7Z3JvdXA6ICdoZWlnaHQnfTtcbiAgfVxuXG4gIC8vIHdpZHRoXG4gIGlmICghZS5pc1F1YW50U2NhbGUoWCkpIHsgLy8gbm8gWCBvciBYIGlzIG9yZGluYWxcbiAgICBpZiAoZS5oYXMoU0laRSkpIHtcbiAgICAgIHAud2lkdGggPSB7c2NhbGU6IFNJWkUsIGZpZWxkOiBlLmZpZWxkKFNJWkUpfTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gcC53aWR0aCA9IHtzY2FsZTogWCwgYmFuZDogdHJ1ZSwgb2Zmc2V0OiAtMX07XG4gICAgICBwLndpZHRoID0ge3ZhbHVlOiBlLmJhbmRTaXplKFgsIGxheW91dC54LnVzZVNtYWxsQmFuZCksIG9mZnNldDogLTF9O1xuICAgIH1cbiAgfSBlbHNlIHsgLy8gWCBpcyBRdWFudFxuICAgIHAud2lkdGggPSB7dmFsdWU6IGUuYmFuZFNpemUoWCwgbGF5b3V0LngudXNlU21hbGxCYW5kKSwgb2Zmc2V0OiAtMX07XG4gIH1cblxuICAvLyBoZWlnaHRcbiAgaWYgKCFlLmlzUXVhbnRTY2FsZShZKSkgeyAvLyBubyBZIG9yIFkgaXMgb3JkaW5hbFxuICAgIGlmIChlLmhhcyhTSVpFKSkge1xuICAgICAgcC5oZWlnaHQgPSB7c2NhbGU6IFNJWkUsIGZpZWxkOiBlLmZpZWxkKFNJWkUpfTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gcC5oZWlnaHQgPSB7c2NhbGU6IFksIGJhbmQ6IHRydWUsIG9mZnNldDogLTF9O1xuICAgICAgcC5oZWlnaHQgPSB7dmFsdWU6IGUuYmFuZFNpemUoWSwgbGF5b3V0LnkudXNlU21hbGxCYW5kKSwgb2Zmc2V0OiAtMX07XG4gICAgfVxuICB9IGVsc2UgeyAvLyBZIGlzIFF1YW50XG4gICAgcC5oZWlnaHQgPSB7dmFsdWU6IGUuYmFuZFNpemUoWSwgbGF5b3V0LnkudXNlU21hbGxCYW5kKSwgb2Zmc2V0OiAtMX07XG4gIH1cblxuICAvLyBmaWxsXG4gIGlmIChlLmhhcyhDT0xPUikpIHtcbiAgICBwLmZpbGwgPSB7c2NhbGU6IENPTE9SLCBmaWVsZDogZS5maWVsZChDT0xPUil9O1xuICB9IGVsc2Uge1xuICAgIHAuZmlsbCA9IHt2YWx1ZTogZS52YWx1ZShDT0xPUil9O1xuICB9XG5cbiAgLy8gYWxwaGFcbiAgaWYgKGUuaGFzKEFMUEhBKSkge1xuICAgIHAub3BhY2l0eSA9IHtzY2FsZTogQUxQSEEsIGZpZWxkOiBlLmZpZWxkKEFMUEhBKX07XG4gIH0gZWxzZSBpZiAoZS52YWx1ZShBTFBIQSkgIT09IHVuZGVmaW5lZCkge1xuICAgIHAub3BhY2l0eSA9IHt2YWx1ZTogZS52YWx1ZShBTFBIQSl9O1xuICB9XG5cbiAgcmV0dXJuIHA7XG59XG5cbmZ1bmN0aW9uIHBvaW50X3Byb3BzKGUsIGxheW91dCwgc3R5bGUpIHtcbiAgdmFyIHAgPSB7fTtcblxuICAvLyB4XG4gIGlmIChlLmhhcyhYKSkge1xuICAgIHAueCA9IHtzY2FsZTogWCwgZmllbGQ6IGUuZmllbGQoWCl9O1xuICB9IGVsc2UgaWYgKCFlLmhhcyhYKSkge1xuICAgIHAueCA9IHt2YWx1ZTogZS5iYW5kU2l6ZShYLCBsYXlvdXQueC51c2VTbWFsbEJhbmQpIC8gMn07XG4gIH1cblxuICAvLyB5XG4gIGlmIChlLmhhcyhZKSkge1xuICAgIHAueSA9IHtzY2FsZTogWSwgZmllbGQ6IGUuZmllbGQoWSl9O1xuICB9IGVsc2UgaWYgKCFlLmhhcyhZKSkge1xuICAgIHAueSA9IHt2YWx1ZTogZS5iYW5kU2l6ZShZLCBsYXlvdXQueS51c2VTbWFsbEJhbmQpIC8gMn07XG4gIH1cblxuICAvLyBzaXplXG4gIGlmIChlLmhhcyhTSVpFKSkge1xuICAgIHAuc2l6ZSA9IHtzY2FsZTogU0laRSwgZmllbGQ6IGUuZmllbGQoU0laRSl9O1xuICB9IGVsc2UgaWYgKCFlLmhhcyhTSVpFKSkge1xuICAgIHAuc2l6ZSA9IHt2YWx1ZTogZS52YWx1ZShTSVpFKX07XG4gIH1cblxuICAvLyBzaGFwZVxuICBpZiAoZS5oYXMoU0hBUEUpKSB7XG4gICAgcC5zaGFwZSA9IHtzY2FsZTogU0hBUEUsIGZpZWxkOiBlLmZpZWxkKFNIQVBFKX07XG4gIH0gZWxzZSBpZiAoIWUuaGFzKFNIQVBFKSkge1xuICAgIHAuc2hhcGUgPSB7dmFsdWU6IGUudmFsdWUoU0hBUEUpfTtcbiAgfVxuXG4gIC8vIHN0cm9rZVxuICBpZiAoZS5oYXMoQ09MT1IpKSB7XG4gICAgcC5zdHJva2UgPSB7c2NhbGU6IENPTE9SLCBmaWVsZDogZS5maWVsZChDT0xPUil9O1xuICB9IGVsc2UgaWYgKCFlLmhhcyhDT0xPUikpIHtcbiAgICBwLnN0cm9rZSA9IHt2YWx1ZTogZS52YWx1ZShDT0xPUil9O1xuICB9XG5cbiAgLy8gYWxwaGFcbiAgaWYgKGUuaGFzKEFMUEhBKSkge1xuICAgIHAub3BhY2l0eSA9IHtzY2FsZTogQUxQSEEsIGZpZWxkOiBlLmZpZWxkKEFMUEhBKX07XG4gIH0gZWxzZSBpZiAoZS52YWx1ZShBTFBIQSkgIT09IHVuZGVmaW5lZCkge1xuICAgIHAub3BhY2l0eSA9IHt2YWx1ZTogZS52YWx1ZShBTFBIQSl9O1xuICB9IGVsc2Uge1xuICAgIHAub3BhY2l0eSA9IHt2YWx1ZTogc3R5bGUub3BhY2l0eX07XG4gIH1cblxuICBwLnN0cm9rZVdpZHRoID0ge3ZhbHVlOiBlLmNvbmZpZygnc3Ryb2tlV2lkdGgnKX07XG5cbiAgcmV0dXJuIHA7XG59XG5cbmZ1bmN0aW9uIGxpbmVfcHJvcHMoZSwgbGF5b3V0LCBzdHlsZSkge1xuICB2YXIgcCA9IHt9O1xuXG4gIC8vIHhcbiAgaWYgKGUuaGFzKFgpKSB7XG4gICAgcC54ID0ge3NjYWxlOiBYLCBmaWVsZDogZS5maWVsZChYKX07XG4gIH0gZWxzZSBpZiAoIWUuaGFzKFgpKSB7XG4gICAgcC54ID0ge3ZhbHVlOiAwfTtcbiAgfVxuXG4gIC8vIHlcbiAgaWYgKGUuaGFzKFkpKSB7XG4gICAgcC55ID0ge3NjYWxlOiBZLCBmaWVsZDogZS5maWVsZChZKX07XG4gIH0gZWxzZSBpZiAoIWUuaGFzKFkpKSB7XG4gICAgcC55ID0ge2dyb3VwOiAnaGVpZ2h0J307XG4gIH1cblxuICAvLyBzdHJva2VcbiAgaWYgKGUuaGFzKENPTE9SKSkge1xuICAgIHAuc3Ryb2tlID0ge3NjYWxlOiBDT0xPUiwgZmllbGQ6IGUuZmllbGQoQ09MT1IpfTtcbiAgfSBlbHNlIGlmICghZS5oYXMoQ09MT1IpKSB7XG4gICAgcC5zdHJva2UgPSB7dmFsdWU6IGUudmFsdWUoQ09MT1IpfTtcbiAgfVxuXG4gIC8vIGFscGhhXG4gIGlmIChlLmhhcyhBTFBIQSkpIHtcbiAgICBwLm9wYWNpdHkgPSB7c2NhbGU6IEFMUEhBLCBmaWVsZDogZS5maWVsZChBTFBIQSl9O1xuICB9IGVsc2UgaWYgKGUudmFsdWUoQUxQSEEpICE9PSB1bmRlZmluZWQpIHtcbiAgICBwLm9wYWNpdHkgPSB7dmFsdWU6IGUudmFsdWUoQUxQSEEpfTtcbiAgfVxuXG4gIHAuc3Ryb2tlV2lkdGggPSB7dmFsdWU6IGUuY29uZmlnKCdzdHJva2VXaWR0aCcpfTtcblxuICByZXR1cm4gcDtcbn1cblxuZnVuY3Rpb24gYXJlYV9wcm9wcyhlLCBsYXlvdXQsIHN0eWxlKSB7XG4gIHZhciBwID0ge307XG5cbiAgLy8geFxuICBpZiAoZS5pc1F1YW50U2NhbGUoWCkpIHtcbiAgICBwLnggPSB7c2NhbGU6IFgsIGZpZWxkOiBlLmZpZWxkKFgpfTtcbiAgICBpZiAoZS5pc09yZGluYWxTY2FsZShZKSkge1xuICAgICAgcC54MiA9IHtzY2FsZTogWCwgdmFsdWU6IDB9O1xuICAgICAgcC5vcmllbnQgPSB7dmFsdWU6ICdob3Jpem9udGFsJ307XG4gICAgfVxuICB9IGVsc2UgaWYgKGUuaGFzKFgpKSB7XG4gICAgcC54ID0ge3NjYWxlOiBYLCBmaWVsZDogZS5maWVsZChYKX07XG4gIH0gZWxzZSB7XG4gICAgcC54ID0ge3ZhbHVlOiAwfTtcbiAgfVxuXG4gIC8vIHlcbiAgaWYgKGUuaXNRdWFudFNjYWxlKFkpKSB7XG4gICAgcC55ID0ge3NjYWxlOiBZLCBmaWVsZDogZS5maWVsZChZKX07XG4gICAgcC55MiA9IHtzY2FsZTogWSwgdmFsdWU6IDB9O1xuICB9IGVsc2UgaWYgKGUuaGFzKFkpKSB7XG4gICAgcC55ID0ge3NjYWxlOiBZLCBmaWVsZDogZS5maWVsZChZKX07XG4gIH0gZWxzZSB7XG4gICAgcC55ID0ge2dyb3VwOiAnaGVpZ2h0J307XG4gIH1cblxuICAvLyBzdHJva2VcbiAgaWYgKGUuaGFzKENPTE9SKSkge1xuICAgIHAuZmlsbCA9IHtzY2FsZTogQ09MT1IsIGZpZWxkOiBlLmZpZWxkKENPTE9SKX07XG4gIH0gZWxzZSBpZiAoIWUuaGFzKENPTE9SKSkge1xuICAgIHAuZmlsbCA9IHt2YWx1ZTogZS52YWx1ZShDT0xPUil9O1xuICB9XG5cbiAgLy8gYWxwaGFcbiAgaWYgKGUuaGFzKEFMUEhBKSkge1xuICAgIHAub3BhY2l0eSA9IHtzY2FsZTogQUxQSEEsIGZpZWxkOiBlLmZpZWxkKEFMUEhBKX07XG4gIH0gZWxzZSBpZiAoZS52YWx1ZShBTFBIQSkgIT09IHVuZGVmaW5lZCkge1xuICAgIHAub3BhY2l0eSA9IHt2YWx1ZTogZS52YWx1ZShBTFBIQSl9O1xuICB9XG5cbiAgcmV0dXJuIHA7XG59XG5cbmZ1bmN0aW9uIGZpbGxlZF9wb2ludF9wcm9wcyhzaGFwZSkge1xuICByZXR1cm4gZnVuY3Rpb24oZSwgc3R5bGUpIHtcbiAgICB2YXIgcCA9IHt9O1xuXG4gICAgLy8geFxuICAgIGlmIChlLmhhcyhYKSkge1xuICAgICAgcC54ID0ge3NjYWxlOiBYLCBmaWVsZDogZS5maWVsZChYKX07XG4gICAgfSBlbHNlIGlmICghZS5oYXMoWCkpIHtcbiAgICAgIHAueCA9IHt2YWx1ZTogZS5iYW5kU2l6ZShYLCBsYXlvdXQueC51c2VTbWFsbEJhbmQpIC8gMn07XG4gICAgfVxuXG4gICAgLy8geVxuICAgIGlmIChlLmhhcyhZKSkge1xuICAgICAgcC55ID0ge3NjYWxlOiBZLCBmaWVsZDogZS5maWVsZChZKX07XG4gICAgfSBlbHNlIGlmICghZS5oYXMoWSkpIHtcbiAgICAgIHAueSA9IHt2YWx1ZTogZS5iYW5kU2l6ZShZLCBsYXlvdXQueS51c2VTbWFsbEJhbmQpIC8gMn07XG4gICAgfVxuXG4gICAgLy8gc2l6ZVxuICAgIGlmIChlLmhhcyhTSVpFKSkge1xuICAgICAgcC5zaXplID0ge3NjYWxlOiBTSVpFLCBmaWVsZDogZS5maWVsZChTSVpFKX07XG4gICAgfSBlbHNlIGlmICghZS5oYXMoWCkpIHtcbiAgICAgIHAuc2l6ZSA9IHt2YWx1ZTogZS52YWx1ZShTSVpFKX07XG4gICAgfVxuXG4gICAgLy8gc2hhcGVcbiAgICBwLnNoYXBlID0ge3ZhbHVlOiBzaGFwZX07XG5cbiAgICAvLyBmaWxsXG4gICAgaWYgKGUuaGFzKENPTE9SKSkge1xuICAgICAgcC5maWxsID0ge3NjYWxlOiBDT0xPUiwgZmllbGQ6IGUuZmllbGQoQ09MT1IpfTtcbiAgICB9IGVsc2UgaWYgKCFlLmhhcyhDT0xPUikpIHtcbiAgICAgIHAuZmlsbCA9IHt2YWx1ZTogZS52YWx1ZShDT0xPUil9O1xuICAgIH1cblxuICAgIC8vIGFscGhhXG4gICAgaWYgKGUuaGFzKEFMUEhBKSkge1xuICAgICAgcC5vcGFjaXR5ID0ge3NjYWxlOiBBTFBIQSwgZmllbGQ6IGUuZmllbGQoQUxQSEEpfTtcbiAgICB9IGVsc2UgaWYgKGUudmFsdWUoQUxQSEEpICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHAub3BhY2l0eSA9IHt2YWx1ZTogZS52YWx1ZShBTFBIQSl9O1xuICAgIH0gZWxzZSB7XG4gICAgICBwLm9wYWNpdHkgPSB7dmFsdWU6IHN0eWxlLm9wYWNpdHl9O1xuICAgIH1cblxuICAgIHJldHVybiBwO1xuICB9O1xufVxuXG5mdW5jdGlvbiB0ZXh0X3Byb3BzKGUsIGxheW91dCwgc3R5bGUpIHtcbiAgdmFyIHAgPSB7fTtcblxuICAvLyB4XG4gIGlmIChlLmhhcyhYKSkge1xuICAgIHAueCA9IHtzY2FsZTogWCwgZmllbGQ6IGUuZmllbGQoWCl9O1xuICB9IGVsc2UgaWYgKCFlLmhhcyhYKSkge1xuICAgIHAueCA9IHt2YWx1ZTogZS5iYW5kU2l6ZShYLCBsYXlvdXQueC51c2VTbWFsbEJhbmQpIC8gMn07XG4gIH1cblxuICAvLyB5XG4gIGlmIChlLmhhcyhZKSkge1xuICAgIHAueSA9IHtzY2FsZTogWSwgZmllbGQ6IGUuZmllbGQoWSl9O1xuICB9IGVsc2UgaWYgKCFlLmhhcyhZKSkge1xuICAgIHAueSA9IHt2YWx1ZTogZS5iYW5kU2l6ZShZLCBsYXlvdXQueS51c2VTbWFsbEJhbmQpIC8gMn07XG4gIH1cblxuICAvLyBzaXplXG4gIGlmIChlLmhhcyhTSVpFKSkge1xuICAgIHAuZm9udFNpemUgPSB7c2NhbGU6IFNJWkUsIGZpZWxkOiBlLmZpZWxkKFNJWkUpfTtcbiAgfSBlbHNlIGlmICghZS5oYXMoWCkpIHtcbiAgICBwLmZvbnRTaXplID0ge3ZhbHVlOiBlLmZvbnQoJ3NpemUnKX07XG4gIH1cblxuICAvLyBmaWxsXG4gIGlmIChlLmhhcyhDT0xPUikpIHtcbiAgICBwLmZpbGwgPSB7c2NhbGU6IENPTE9SLCBmaWVsZDogZS5maWVsZChDT0xPUil9O1xuICB9IGVsc2UgaWYgKCFlLmhhcyhDT0xPUikpIHtcbiAgICBwLmZpbGwgPSB7dmFsdWU6IGUudmFsdWUoQ09MT1IpfTtcbiAgfVxuXG4gIC8vIGFscGhhXG4gIGlmIChlLmhhcyhBTFBIQSkpIHtcbiAgICBwLm9wYWNpdHkgPSB7c2NhbGU6IEFMUEhBLCBmaWVsZDogZS5maWVsZChBTFBIQSl9O1xuICB9IGVsc2UgaWYgKGUudmFsdWUoQUxQSEEpICE9PSB1bmRlZmluZWQpIHtcbiAgICBwLm9wYWNpdHkgPSB7dmFsdWU6IGUudmFsdWUoQUxQSEEpfTtcbiAgfSBlbHNlIHtcbiAgICBwLm9wYWNpdHkgPSB7dmFsdWU6IHN0eWxlLm9wYWNpdHl9O1xuICB9XG5cbiAgLy8gdGV4dFxuICBpZiAoZS5oYXMoVEVYVCkpIHtcbiAgICBwLnRleHQgPSB7ZmllbGQ6IGUuZmllbGQoVEVYVCl9O1xuICB9IGVsc2Uge1xuICAgIHAudGV4dCA9IHt2YWx1ZTogJ0FiYyd9O1xuICB9XG5cbiAgcC5mb250ID0ge3ZhbHVlOiBlLmZvbnQoJ2ZhbWlseScpfTtcbiAgcC5mb250V2VpZ2h0ID0ge3ZhbHVlOiBlLmZvbnQoJ3dlaWdodCcpfTtcbiAgcC5mb250U3R5bGUgPSB7dmFsdWU6IGUuZm9udCgnc3R5bGUnKX07XG4gIHAuYmFzZWxpbmUgPSB7dmFsdWU6IGUudGV4dCgnYmFzZWxpbmUnKX07XG5cbiAgLy8gYWxpZ25cbiAgaWYgKGUuaGFzKFgpKSB7XG4gICAgaWYgKGUuaXNPcmRpbmFsU2NhbGUoWCkpIHtcbiAgICAgIHAuYWxpZ24gPSB7dmFsdWU6ICdsZWZ0J307XG4gICAgICBwLmR4ID0ge3ZhbHVlOiBlLnRleHQoJ21hcmdpbicpfTtcbiAgICB9IGVsc2Uge1xuICAgICAgcC5hbGlnbiA9IHt2YWx1ZTogJ2NlbnRlcid9O1xuICAgIH1cbiAgfSBlbHNlIGlmIChlLmhhcyhZKSkge1xuICAgIHAuYWxpZ24gPSB7dmFsdWU6ICdsZWZ0J307XG4gICAgcC5keCA9IHt2YWx1ZTogZS50ZXh0KCdtYXJnaW4nKX07XG4gIH0gZWxzZSB7XG4gICAgcC5hbGlnbiA9IHt2YWx1ZTogZS50ZXh0KCdhbGlnbicpfTtcbiAgfVxuXG4gIHJldHVybiBwO1xufVxuIiwidmFyIGdsb2JhbHMgPSByZXF1aXJlKCcuLi9nbG9iYWxzJyksXG4gIHV0aWwgPSByZXF1aXJlKCcuLi91dGlsJyksXG4gIHRpbWUgPSByZXF1aXJlKCcuL3RpbWUnKTtcblxudmFyIHNjYWxlID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxuc2NhbGUubmFtZXMgPSBmdW5jdGlvbihwcm9wcykge1xuICByZXR1cm4gdXRpbC5rZXlzKHV0aWwua2V5cyhwcm9wcykucmVkdWNlKGZ1bmN0aW9uKGEsIHgpIHtcbiAgICBpZiAocHJvcHNbeF0gJiYgcHJvcHNbeF0uc2NhbGUpIGFbcHJvcHNbeF0uc2NhbGVdID0gMTtcbiAgICByZXR1cm4gYTtcbiAgfSwge30pKTtcbn07XG5cbnNjYWxlLmRlZnMgPSBmdW5jdGlvbihuYW1lcywgZW5jb2RpbmcsIGxheW91dCwgc3R5bGUsIG9wdCkge1xuICBvcHQgPSBvcHQgfHwge307XG5cbiAgcmV0dXJuIG5hbWVzLnJlZHVjZShmdW5jdGlvbihhLCBuYW1lKSB7XG4gICAgdmFyIHMgPSB7XG4gICAgICBuYW1lOiBuYW1lLFxuICAgICAgdHlwZTogc2NhbGUudHlwZShuYW1lLCBlbmNvZGluZyksXG4gICAgICBkb21haW46IHNjYWxlX2RvbWFpbihuYW1lLCBlbmNvZGluZywgb3B0KVxuICAgIH07XG4gICAgaWYgKHMudHlwZSA9PT0gJ29yZGluYWwnICYmICFlbmNvZGluZy5iaW4obmFtZSkpIHtcbiAgICAgIHMuc29ydCA9IHRydWU7XG4gICAgfVxuXG4gICAgc2NhbGVfcmFuZ2UocywgZW5jb2RpbmcsIGxheW91dCwgc3R5bGUsIG9wdCk7XG5cbiAgICByZXR1cm4gKGEucHVzaChzKSwgYSk7XG4gIH0sIFtdKTtcbn07XG5cbnNjYWxlLnR5cGUgPSBmdW5jdGlvbihuYW1lLCBlbmNvZGluZykge1xuXG4gIHN3aXRjaCAoZW5jb2RpbmcudHlwZShuYW1lKSkge1xuICAgIGNhc2UgTzogcmV0dXJuICdvcmRpbmFsJztcbiAgICBjYXNlIFQ6XG4gICAgICB2YXIgZm4gPSBlbmNvZGluZy5mbihuYW1lKTtcbiAgICAgIHJldHVybiAoZm4gJiYgdGltZS5zY2FsZS50eXBlKGZuKSkgfHwgJ3RpbWUnO1xuICAgIGNhc2UgUTpcbiAgICAgIGlmIChlbmNvZGluZy5iaW4obmFtZSkpIHtcbiAgICAgICAgcmV0dXJuICdvcmRpbmFsJztcbiAgICAgIH1cbiAgICAgIHJldHVybiBlbmNvZGluZy5zY2FsZShuYW1lKS50eXBlO1xuICB9XG59O1xuXG5mdW5jdGlvbiBzY2FsZV9kb21haW4obmFtZSwgZW5jb2RpbmcsIG9wdCkge1xuICBpZiAoZW5jb2RpbmcuaXNUeXBlKG5hbWUsIFQpKSB7XG4gICAgdmFyIHJhbmdlID0gdGltZS5zY2FsZS5kb21haW4oZW5jb2RpbmcuZm4obmFtZSkpO1xuICAgIGlmKHJhbmdlKSByZXR1cm4gcmFuZ2U7XG4gIH1cblxuICBpZiAoZW5jb2RpbmcuYmluKG5hbWUpKSB7XG4gICAgLy8gVE9ETzogYWRkIGluY2x1ZGVFbXB0eUNvbmZpZyBoZXJlXG4gICAgaWYgKG9wdC5zdGF0cykge1xuICAgICAgdmFyIGJpbnMgPSB1dGlsLmdldGJpbnMob3B0LnN0YXRzW2VuY29kaW5nLmZpZWxkTmFtZShuYW1lKV0sIGVuY29kaW5nLmNvbmZpZygnbWF4YmlucycpKTtcbiAgICAgIHZhciBkb21haW4gPSB1dGlsLnJhbmdlKGJpbnMuc3RhcnQsIGJpbnMuc3RvcCwgYmlucy5zdGVwKTtcbiAgICAgIHJldHVybiBuYW1lID09PSBZID8gZG9tYWluLnJldmVyc2UoKSA6IGRvbWFpbjtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gbmFtZSA9PSBvcHQuc3RhY2sgP1xuICAgIHtcbiAgICAgIGRhdGE6IFNUQUNLRUQsXG4gICAgICBmaWVsZDogJ2RhdGEuJyArIChvcHQuZmFjZXQgPyAnbWF4XycgOiAnJykgKyAnc3VtXycgKyBlbmNvZGluZy5maWVsZChuYW1lLCB0cnVlKVxuICAgIH0gOlxuICAgIHtkYXRhOiBUQUJMRSwgZmllbGQ6IGVuY29kaW5nLmZpZWxkKG5hbWUpfTtcbn1cblxuZnVuY3Rpb24gc2NhbGVfcmFuZ2UocywgZW5jb2RpbmcsIGxheW91dCwgc3R5bGUsIG9wdCkge1xuICB2YXIgc3BlYyA9IGVuY29kaW5nLnNjYWxlKHMubmFtZSk7XG4gIHN3aXRjaCAocy5uYW1lKSB7XG4gICAgY2FzZSBYOlxuICAgICAgaWYgKHMudHlwZSA9PT0gJ29yZGluYWwnKSB7XG4gICAgICAgIHMuYmFuZFdpZHRoID0gZW5jb2RpbmcuYmFuZFNpemUoWCwgbGF5b3V0LngudXNlU21hbGxCYW5kKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHMucmFuZ2UgPSBsYXlvdXQuY2VsbFdpZHRoID8gWzAsIGxheW91dC5jZWxsV2lkdGhdIDogJ3dpZHRoJztcbiAgICAgICAgcy56ZXJvID0gc3BlYy56ZXJvIHx8XG4gICAgICAgICAgKCBlbmNvZGluZy5pc1R5cGUocy5uYW1lLFQpICYmIGVuY29kaW5nLmZuKHMubmFtZSkgPT09ICd5ZWFyJyA/IGZhbHNlIDogdHJ1ZSApO1xuICAgICAgICBzLnJldmVyc2UgPSBzcGVjLnJldmVyc2U7XG4gICAgICB9XG4gICAgICBzLnJvdW5kID0gdHJ1ZTtcbiAgICAgIGlmIChzLnR5cGUgPT09ICd0aW1lJykge1xuICAgICAgICBzLm5pY2UgPSBlbmNvZGluZy5mbihzLm5hbWUpO1xuICAgICAgfWVsc2Uge1xuICAgICAgICBzLm5pY2UgPSB0cnVlO1xuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgY2FzZSBZOlxuICAgICAgaWYgKHMudHlwZSA9PT0gJ29yZGluYWwnKSB7XG4gICAgICAgIHMuYmFuZFdpZHRoID0gZW5jb2RpbmcuYmFuZFNpemUoWSwgbGF5b3V0LnkudXNlU21hbGxCYW5kKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHMucmFuZ2UgPSBsYXlvdXQuY2VsbEhlaWdodCA/IFtsYXlvdXQuY2VsbEhlaWdodCwgMF0gOiAnaGVpZ2h0JztcbiAgICAgICAgcy56ZXJvID0gc3BlYy56ZXJvIHx8XG4gICAgICAgICAgKCBlbmNvZGluZy5pc1R5cGUocy5uYW1lLCBUKSAmJiBlbmNvZGluZy5mbihzLm5hbWUpID09PSAneWVhcicgPyBmYWxzZSA6IHRydWUgKTtcbiAgICAgICAgcy5yZXZlcnNlID0gc3BlYy5yZXZlcnNlO1xuICAgICAgfVxuXG4gICAgICBzLnJvdW5kID0gdHJ1ZTtcblxuICAgICAgaWYgKHMudHlwZSA9PT0gJ3RpbWUnKSB7XG4gICAgICAgIHMubmljZSA9IGVuY29kaW5nLmZuKHMubmFtZSkgfHwgZW5jb2RpbmcuY29uZmlnKCd0aW1lU2NhbGVOaWNlJyk7XG4gICAgICB9ZWxzZSB7XG4gICAgICAgIHMubmljZSA9IHRydWU7XG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICBjYXNlIFJPVzogLy8gc3VwcG9ydCBvbmx5IG9yZGluYWxcbiAgICAgIHMuYmFuZFdpZHRoID0gbGF5b3V0LmNlbGxIZWlnaHQ7XG4gICAgICBzLnJvdW5kID0gdHJ1ZTtcbiAgICAgIHMubmljZSA9IHRydWU7XG4gICAgICBicmVhaztcbiAgICBjYXNlIENPTDogLy8gc3VwcG9ydCBvbmx5IG9yZGluYWxcbiAgICAgIHMuYmFuZFdpZHRoID0gbGF5b3V0LmNlbGxXaWR0aDtcbiAgICAgIHMucm91bmQgPSB0cnVlO1xuICAgICAgcy5uaWNlID0gdHJ1ZTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgU0laRTpcbiAgICAgIGlmIChlbmNvZGluZy5pcygnYmFyJykpIHtcbiAgICAgICAgLy8gRklYTUUgdGhpcyBpcyBkZWZpbml0ZWx5IGluY29ycmVjdFxuICAgICAgICAvLyBidXQgbGV0J3MgZml4IGl0IGxhdGVyIHNpbmNlIGJhciBzaXplIGlzIGEgYmFkIGVuY29kaW5nIGFueXdheVxuICAgICAgICBzLnJhbmdlID0gWzMsIE1hdGgubWF4KGVuY29kaW5nLmJhbmRTaXplKFgpLCBlbmNvZGluZy5iYW5kU2l6ZShZKSldO1xuICAgICAgfSBlbHNlIGlmIChlbmNvZGluZy5pcyhURVhUKSkge1xuICAgICAgICBzLnJhbmdlID0gWzgsIDQwXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHMucmFuZ2UgPSBbMTAsIDQwMF07XG4gICAgICB9XG4gICAgICBzLnJvdW5kID0gdHJ1ZTtcbiAgICAgIHMuemVybyA9IGZhbHNlO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSBTSEFQRTpcbiAgICAgIHMucmFuZ2UgPSAnc2hhcGVzJztcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgQ09MT1I6XG4gICAgICB2YXIgcmFuZ2UgPSBlbmNvZGluZy5zY2FsZShDT0xPUikucmFuZ2U7XG4gICAgICBpZiAocmFuZ2UgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAocy50eXBlID09PSAnb3JkaW5hbCcpIHtcbiAgICAgICAgICByYW5nZSA9IHN0eWxlLmNvbG9yUmFuZ2U7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmFuZ2UgPSBbJyNkZGYnLCAnc3RlZWxibHVlJ107XG4gICAgICAgICAgcy56ZXJvID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHMucmFuZ2UgPSByYW5nZTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgQUxQSEE6XG4gICAgICBzLnJhbmdlID0gWzAuMiwgMS4wXTtcbiAgICAgIGJyZWFrO1xuICAgIGRlZmF1bHQ6XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Vua25vd24gZW5jb2RpbmcgbmFtZTogJysgcy5uYW1lKTtcbiAgfVxuXG4gIHN3aXRjaCAocy5uYW1lKSB7XG4gICAgY2FzZSBST1c6XG4gICAgY2FzZSBDT0w6XG4gICAgICBzLnBhZGRpbmcgPSBlbmNvZGluZy5jb25maWcoJ2NlbGxQYWRkaW5nJyk7XG4gICAgICBzLm91dGVyUGFkZGluZyA9IDA7XG4gICAgICBicmVhaztcbiAgICBjYXNlIFg6XG4gICAgY2FzZSBZOlxuICAgICAgaWYgKHMudHlwZSA9PT0gJ29yZGluYWwnKSB7IC8vJiYgIXMuYmFuZFdpZHRoXG4gICAgICAgIHMucG9pbnRzID0gdHJ1ZTtcbiAgICAgICAgcy5wYWRkaW5nID0gZW5jb2RpbmcuYmFuZChzLm5hbWUpLnBhZGRpbmc7XG4gICAgICB9XG4gIH1cbn1cbiIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgZ2xvYmFscyA9IHJlcXVpcmUoJy4uL2dsb2JhbHMnKSxcbiAgdXRpbCA9IHJlcXVpcmUoJy4uL3V0aWwnKSxcbiAgbWFya3MgPSByZXF1aXJlKCcuL21hcmtzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gc3RhY2tpbmc7XG5cbmZ1bmN0aW9uIHN0YWNraW5nKHNwZWMsIGVuY29kaW5nLCBtZGVmLCBmYWNldHMpIHtcbiAgaWYgKCFtYXJrc1tlbmNvZGluZy5tYXJrdHlwZSgpXS5zdGFjaykgcmV0dXJuIGZhbHNlO1xuXG4gIC8vIFRPRE86IGFkZCB8fCBlbmNvZGluZy5oYXMoTE9EKSBoZXJlIG9uY2UgTE9EIGlzIGltcGxlbWVudGVkXG4gIGlmICghZW5jb2RpbmcuaGFzKENPTE9SKSkgcmV0dXJuIGZhbHNlO1xuXG4gIHZhciBkaW09bnVsbCwgdmFsPW51bGwsIGlkeCA9bnVsbCxcbiAgICBpc1hNZWFzdXJlID0gZW5jb2RpbmcuaXNNZWFzdXJlKFgpLFxuICAgIGlzWU1lYXN1cmUgPSBlbmNvZGluZy5pc01lYXN1cmUoWSk7XG5cbiAgaWYgKGlzWE1lYXN1cmUgJiYgIWlzWU1lYXN1cmUpIHtcbiAgICBkaW0gPSBZO1xuICAgIHZhbCA9IFg7XG4gICAgaWR4ID0gMDtcbiAgfSBlbHNlIGlmIChpc1lNZWFzdXJlICYmICFpc1hNZWFzdXJlKSB7XG4gICAgZGltID0gWDtcbiAgICB2YWwgPSBZO1xuICAgIGlkeCA9IDE7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIG51bGw7IC8vIG5vIHN0YWNrIGVuY29kaW5nXG4gIH1cblxuICAvLyBhZGQgdHJhbnNmb3JtIHRvIGNvbXB1dGUgc3VtcyBmb3Igc2NhbGVcbiAgdmFyIHN0YWNrZWQgPSB7XG4gICAgbmFtZTogU1RBQ0tFRCxcbiAgICBzb3VyY2U6IFRBQkxFLFxuICAgIHRyYW5zZm9ybTogW3tcbiAgICAgIHR5cGU6ICdhZ2dyZWdhdGUnLFxuICAgICAgZ3JvdXBieTogW2VuY29kaW5nLmZpZWxkKGRpbSldLmNvbmNhdChmYWNldHMpLCAvLyBkaW0gYW5kIG90aGVyIGZhY2V0c1xuICAgICAgZmllbGRzOiBbe29wOiAnc3VtJywgZmllbGQ6IGVuY29kaW5nLmZpZWxkKHZhbCl9XSAvLyBUT0RPIGNoZWNrIGlmIGZpZWxkIHdpdGggYWdnciBpcyBjb3JyZWN0P1xuICAgIH1dXG4gIH07XG5cbiAgaWYgKGZhY2V0cyAmJiBmYWNldHMubGVuZ3RoID4gMCkge1xuICAgIHN0YWNrZWQudHJhbnNmb3JtLnB1c2goeyAvL2NhbGN1bGF0ZSBtYXggZm9yIGVhY2ggZmFjZXRcbiAgICAgIHR5cGU6ICdhZ2dyZWdhdGUnLFxuICAgICAgZ3JvdXBieTogZmFjZXRzLFxuICAgICAgZmllbGRzOiBbe29wOiAnbWF4JywgZmllbGQ6ICdkYXRhLnN1bV8nICsgZW5jb2RpbmcuZmllbGQodmFsLCB0cnVlKX1dXG4gICAgfSk7XG4gIH1cblxuICBzcGVjLmRhdGEucHVzaChzdGFja2VkKTtcblxuICAvLyBhZGQgc3RhY2sgdHJhbnNmb3JtIHRvIG1hcmtcbiAgbWRlZi5mcm9tLnRyYW5zZm9ybSA9IFt7XG4gICAgdHlwZTogJ3N0YWNrJyxcbiAgICBwb2ludDogZW5jb2RpbmcuZmllbGQoZGltKSxcbiAgICBoZWlnaHQ6IGVuY29kaW5nLmZpZWxkKHZhbCksXG4gICAgb3V0cHV0OiB7eTE6IHZhbCwgeTA6IHZhbCArICcyJ31cbiAgfV07XG5cbiAgLy8gVE9ETzogVGhpcyBpcyBzdXBlciBoYWNrLWlzaCAtLSBjb25zb2xpZGF0ZSBpbnRvIG1vZHVsYXIgbWFyayBwcm9wZXJ0aWVzP1xuICBtZGVmLnByb3BlcnRpZXMudXBkYXRlW3ZhbF0gPSBtZGVmLnByb3BlcnRpZXMuZW50ZXJbdmFsXSA9IHtzY2FsZTogdmFsLCBmaWVsZDogdmFsfTtcbiAgbWRlZi5wcm9wZXJ0aWVzLnVwZGF0ZVt2YWwgKyAnMiddID0gbWRlZi5wcm9wZXJ0aWVzLmVudGVyW3ZhbCArICcyJ10gPSB7c2NhbGU6IHZhbCwgZmllbGQ6IHZhbCArICcyJ307XG5cbiAgcmV0dXJuIHZhbDsgLy9yZXR1cm4gc3RhY2sgZW5jb2Rpbmdcbn1cbiIsInZhciBnbG9iYWxzID0gcmVxdWlyZSgnLi4vZ2xvYmFscycpLFxuICB1dGlsID0gcmVxdWlyZSgnLi4vdXRpbCcpLFxuICB2bGZpZWxkID0gcmVxdWlyZSgnLi4vZmllbGQnKSxcbiAgRW5jb2RpbmcgPSByZXF1aXJlKCcuLi9FbmNvZGluZycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGVuY29kaW5nLCBzdGF0cykge1xuICByZXR1cm4ge1xuICAgIG9wYWNpdHk6IGVzdGltYXRlT3BhY2l0eShlbmNvZGluZywgc3RhdHMpLFxuICAgIGNvbG9yUmFuZ2U6IGNvbG9yUmFuZ2UoZW5jb2RpbmcsIHN0YXRzKVxuICB9O1xufTtcblxuZnVuY3Rpb24gY29sb3JSYW5nZShlbmNvZGluZywgc3RhdHMpe1xuICBpZiAoZW5jb2RpbmcuaGFzKENPTE9SKSAmJiBlbmNvZGluZy5pc09yZGluYWxTY2FsZShDT0xPUikpIHtcbiAgICB2YXIgY2FyZGluYWxpdHkgPSBlbmNvZGluZy5jYXJkaW5hbGl0eShDT0xPUiwgc3RhdHMpO1xuICAgIGlmIChjYXJkaW5hbGl0eSA8PSAxMCkge1xuICAgICAgcmV0dXJuIFwiY2F0ZWdvcnkxMFwiO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gXCJjYXRlZ29yeTIwXCI7XG4gICAgfVxuICAgIC8vIFRPRE8gY2FuIHZlZ2EgaW50ZXJwb2xhdGUgcmFuZ2UgZm9yIG9yZGluYWwgc2NhbGU/XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG5cbmZ1bmN0aW9uIGVzdGltYXRlT3BhY2l0eShlbmNvZGluZyxzdGF0cykge1xuICBpZiAoIXN0YXRzKSB7XG4gICAgcmV0dXJuIDE7XG4gIH1cblxuICB2YXIgbnVtUG9pbnRzID0gMDtcbiAgdmFyIG1heGJpbnMgPSBlbmNvZGluZy5jb25maWcoJ21heGJpbnMnKTtcblxuICBpZiAoZW5jb2RpbmcuaXNBZ2dyZWdhdGUoKSkgeyAvLyBhZ2dyZWdhdGUgcGxvdFxuICAgIG51bVBvaW50cyA9IDE7XG5cbiAgICAvLyAgZ2V0IG51bWJlciBvZiBwb2ludHMgaW4gZWFjaCBcImNlbGxcIlxuICAgIC8vICBieSBjYWxjdWxhdGluZyBwcm9kdWN0IG9mIGNhcmRpbmFsaXR5XG4gICAgLy8gIGZvciBlYWNoIG5vbiBmYWNldGluZyBhbmQgbm9uLW9yZGluYWwgWCAvIFkgZmllbGRzXG4gICAgLy8gIG5vdGUgdGhhdCBvcmRpbmFsIHgseSBhcmUgbm90IGluY2x1ZGUgc2luY2Ugd2UgY2FuXG4gICAgLy8gIGNvbnNpZGVyIHRoYXQgb3JkaW5hbCB4IGFyZSBzdWJkaXZpZGluZyB0aGUgY2VsbCBpbnRvIHN1YmNlbGxzIGFueXdheVxuICAgIGVuY29kaW5nLmZvckVhY2goZnVuY3Rpb24oZW5jVHlwZSwgZmllbGQpIHtcblxuICAgICAgaWYgKGVuY1R5cGUgIT09IFJPVyAmJiBlbmNUeXBlICE9PSBDT0wgJiZcbiAgICAgICAgICAhKChlbmNUeXBlID09PSBYIHx8IGVuY1R5cGUgPT09IFkpICYmXG4gICAgICAgICAgdmxmaWVsZC5pc09yZGluYWxTY2FsZShmaWVsZCwgRW5jb2RpbmcuaXNUeXBlKSlcbiAgICAgICAgKSB7XG4gICAgICAgIG51bVBvaW50cyAqPSBlbmNvZGluZy5jYXJkaW5hbGl0eShlbmNUeXBlLCBzdGF0cyk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgfSBlbHNlIHsgLy8gcmF3IHBsb3RcbiAgICBudW1Qb2ludHMgPSBzdGF0cy5jb3VudDtcblxuICAgIC8vIHNtYWxsIG11bHRpcGxlcyBkaXZpZGUgbnVtYmVyIG9mIHBvaW50c1xuICAgIHZhciBudW1NdWx0aXBsZXMgPSAxO1xuICAgIGlmIChlbmNvZGluZy5oYXMoUk9XKSkge1xuICAgICAgbnVtTXVsdGlwbGVzICo9IGVuY29kaW5nLmNhcmRpbmFsaXR5KFJPVywgc3RhdHMpO1xuICAgIH1cbiAgICBpZiAoZW5jb2RpbmcuaGFzKENPTCkpIHtcbiAgICAgIG51bU11bHRpcGxlcyAqPSBlbmNvZGluZy5jYXJkaW5hbGl0eShDT0wsIHN0YXRzKTtcbiAgICB9XG4gICAgbnVtUG9pbnRzIC89IG51bU11bHRpcGxlcztcbiAgfVxuXG4gIHZhciBvcGFjaXR5ID0gMDtcbiAgaWYgKG51bVBvaW50cyA8IDIwKSB7XG4gICAgb3BhY2l0eSA9IDE7XG4gIH0gZWxzZSBpZiAobnVtUG9pbnRzIDwgMjAwKSB7XG4gICAgb3BhY2l0eSA9IDAuNztcbiAgfSBlbHNlIGlmIChudW1Qb2ludHMgPCAxMDAwKSB7XG4gICAgb3BhY2l0eSA9IDAuNjtcbiAgfSBlbHNlIHtcbiAgICBvcGFjaXR5ID0gMC4zO1xuICB9XG5cbiAgcmV0dXJuIG9wYWNpdHk7XG59XG5cbiIsInZhciBnbG9iYWwgPSByZXF1aXJlKCcuLi9nbG9iYWxzJyk7XG5cbnZhciBncm91cGRlZiA9IHJlcXVpcmUoJy4vZ3JvdXAnKS5kZWY7XG5cbm1vZHVsZS5leHBvcnRzID0gc3ViZmFjZXRpbmc7XG5cbmZ1bmN0aW9uIHN1YmZhY2V0aW5nKGdyb3VwLCBtZGVmLCBkZXRhaWxzLCBzdGFjaywgZW5jb2RpbmcpIHtcbiAgdmFyIG0gPSBncm91cC5tYXJrcyxcbiAgICBnID0gZ3JvdXBkZWYoJ3N1YmZhY2V0Jywge21hcmtzOiBtfSk7XG5cbiAgZ3JvdXAubWFya3MgPSBbZ107XG4gIGcuZnJvbSA9IG1kZWYuZnJvbTtcbiAgZGVsZXRlIG1kZWYuZnJvbTtcblxuICAvL1RPRE8gdGVzdCBMT0QgLS0gd2Ugc2hvdWxkIHN1cHBvcnQgc3RhY2sgLyBsaW5lIHdpdGhvdXQgY29sb3IgKExPRCkgZmllbGRcbiAgdmFyIHRyYW5zID0gKGcuZnJvbS50cmFuc2Zvcm0gfHwgKGcuZnJvbS50cmFuc2Zvcm0gPSBbXSkpO1xuICB0cmFucy51bnNoaWZ0KHt0eXBlOiAnZmFjZXQnLCBrZXlzOiBkZXRhaWxzfSk7XG5cbiAgaWYgKHN0YWNrICYmIGVuY29kaW5nLmhhcyhDT0xPUikpIHtcbiAgICB0cmFucy51bnNoaWZ0KHt0eXBlOiAnc29ydCcsIGJ5OiBlbmNvZGluZy5maWVsZChDT0xPUil9KTtcbiAgfVxufVxuIiwidmFyIGdsb2JhbHMgPSByZXF1aXJlKCcuLi9nbG9iYWxzJyk7XG5cbnZhciBncm91cGRlZiA9IHJlcXVpcmUoJy4vZ3JvdXAnKS5kZWYsXG4gIHZsZGF0YSA9IHJlcXVpcmUoJy4uL2RhdGEnKTtcblxubW9kdWxlLmV4cG9ydHMgPSB0ZW1wbGF0ZTtcblxuZnVuY3Rpb24gdGVtcGxhdGUoZW5jb2RpbmcsIGxheW91dCwgc3RhdHMpIHsgLy9oYWNrIHVzZSBzdGF0c1xuXG4gIHZhciBkYXRhID0ge25hbWU6IFRBQkxFLCBmb3JtYXQ6IHt0eXBlOiBlbmNvZGluZy5jb25maWcoJ2RhdGFGb3JtYXRUeXBlJyl9fSxcbiAgICBkYXRhVXJsID0gdmxkYXRhLmdldFVybChlbmNvZGluZywgc3RhdHMpO1xuICBpZiAoZGF0YVVybCkgZGF0YS51cmwgPSBkYXRhVXJsO1xuXG4gIHZhciBwcmVhZ2dyZWdhdGVkRGF0YSA9IGVuY29kaW5nLmNvbmZpZygndXNlVmVnYVNlcnZlcicpO1xuXG4gIGVuY29kaW5nLmZvckVhY2goZnVuY3Rpb24oZW5jVHlwZSwgZmllbGQpIHtcbiAgICB2YXIgbmFtZTtcbiAgICBpZiAoZmllbGQudHlwZSA9PSBUKSB7XG4gICAgICBkYXRhLmZvcm1hdC5wYXJzZSA9IGRhdGEuZm9ybWF0LnBhcnNlIHx8IHt9O1xuICAgICAgZGF0YS5mb3JtYXQucGFyc2VbZmllbGQubmFtZV0gPSAnZGF0ZSc7XG4gICAgfSBlbHNlIGlmIChmaWVsZC50eXBlID09IFEpIHtcbiAgICAgIGRhdGEuZm9ybWF0LnBhcnNlID0gZGF0YS5mb3JtYXQucGFyc2UgfHwge307XG4gICAgICBpZiAoZmllbGQuYWdnciA9PT0gJ2NvdW50Jykge1xuICAgICAgICBuYW1lID0gJ2NvdW50JztcbiAgICAgIH0gZWxzZSBpZiAocHJlYWdncmVnYXRlZERhdGEgJiYgZmllbGQuYmluKSB7XG4gICAgICAgIG5hbWUgPSAnYmluXycgKyBmaWVsZC5uYW1lO1xuICAgICAgfSBlbHNlIGlmIChwcmVhZ2dyZWdhdGVkRGF0YSAmJiBmaWVsZC5hZ2dyKSB7XG4gICAgICAgIG5hbWUgPSBmaWVsZC5hZ2dyICsgJ18nICsgZmllbGQubmFtZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG5hbWUgPSBmaWVsZC5uYW1lO1xuICAgICAgfVxuICAgICAgZGF0YS5mb3JtYXQucGFyc2VbbmFtZV0gPSAnbnVtYmVyJztcbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiB7XG4gICAgd2lkdGg6IGxheW91dC53aWR0aCxcbiAgICBoZWlnaHQ6IGxheW91dC5oZWlnaHQsXG4gICAgcGFkZGluZzogJ2F1dG8nLFxuICAgIGRhdGE6IFtkYXRhXSxcbiAgICBtYXJrczogW2dyb3VwZGVmKCdjZWxsJywge1xuICAgICAgd2lkdGg6IGxheW91dC5jZWxsV2lkdGggPyB7dmFsdWU6IGxheW91dC5jZWxsV2lkdGh9IDogdW5kZWZpbmVkLFxuICAgICAgaGVpZ2h0OiBsYXlvdXQuY2VsbEhlaWdodCA/IHt2YWx1ZTogbGF5b3V0LmNlbGxIZWlnaHR9IDogdW5kZWZpbmVkXG4gICAgfSldXG4gIH07XG59XG4iLCJ2YXIgZ2xvYmFscyA9IHJlcXVpcmUoJy4uL2dsb2JhbHMnKSxcbiAgdXRpbCA9IHJlcXVpcmUoJy4uL3V0aWwnKTtcblxubW9kdWxlLmV4cG9ydHMgPSB0aW1lO1xuXG5mdW5jdGlvbiB0aW1lKHNwZWMsIGVuY29kaW5nLCBvcHQpIHtcbiAgdmFyIHRpbWVGaWVsZHMgPSB7fSwgdGltZUZuID0ge307XG5cbiAgLy8gZmluZCB1bmlxdWUgZm9ybXVsYSB0cmFuc2Zvcm1hdGlvbiBhbmQgYmluIGZ1bmN0aW9uXG4gIGVuY29kaW5nLmZvckVhY2goZnVuY3Rpb24oZW5jVHlwZSwgZmllbGQpIHtcbiAgICBpZiAoZmllbGQudHlwZSA9PT0gVCAmJiBmaWVsZC5mbikge1xuICAgICAgdGltZUZpZWxkc1tlbmNvZGluZy5maWVsZChlbmNUeXBlKV0gPSB7XG4gICAgICAgIGZpZWxkOiBmaWVsZCxcbiAgICAgICAgZW5jVHlwZTogZW5jVHlwZVxuICAgICAgfTtcbiAgICAgIHRpbWVGbltmaWVsZC5mbl0gPSB0cnVlO1xuICAgIH1cbiAgfSk7XG5cbiAgLy8gYWRkIGZvcm11bGEgdHJhbnNmb3JtXG4gIHZhciBkYXRhID0gc3BlYy5kYXRhWzBdLFxuICAgIHRyYW5zZm9ybSA9IGRhdGEudHJhbnNmb3JtID0gZGF0YS50cmFuc2Zvcm0gfHwgW107XG5cbiAgZm9yICh2YXIgZiBpbiB0aW1lRmllbGRzKSB7XG4gICAgdmFyIHRmID0gdGltZUZpZWxkc1tmXTtcbiAgICB0aW1lLnRyYW5zZm9ybSh0cmFuc2Zvcm0sIGVuY29kaW5nLCB0Zi5lbmNUeXBlLCB0Zi5maWVsZCk7XG4gIH1cblxuICAvLyBhZGQgc2NhbGVzXG4gIHZhciBzY2FsZXMgPSBzcGVjLnNjYWxlcyA9IHNwZWMuc2NhbGVzIHx8IFtdO1xuICBmb3IgKHZhciBmbiBpbiB0aW1lRm4pIHtcbiAgICB0aW1lLnNjYWxlKHNjYWxlcywgZm4sIGVuY29kaW5nKTtcbiAgfVxuICByZXR1cm4gc3BlYztcbn1cblxudGltZS5jYXJkaW5hbGl0eSA9IGZ1bmN0aW9uKGZpZWxkLCBzdGF0cykge1xuICB2YXIgZm4gPSBmaWVsZC5mbjtcbiAgc3dpdGNoIChmbikge1xuICAgIGNhc2UgJ3NlY29uZCc6IHJldHVybiA2MDtcbiAgICBjYXNlICdtaW51dGUnOiByZXR1cm4gNjA7XG4gICAgY2FzZSAnaG91cic6IHJldHVybiAyNDtcbiAgICBjYXNlICdkYXlvZndlZWsnOiByZXR1cm4gNztcbiAgICBjYXNlICdkYXRlJzogcmV0dXJuIDMxO1xuICAgIGNhc2UgJ21vbnRoJzogcmV0dXJuIDEyO1xuICAgIC8vIGNhc2UgJ3llYXInOiAgLS0gbmVlZCByZWFsIGNhcmRpbmFsaXR5XG4gIH1cblxuICByZXR1cm4gc3RhdHNbZmllbGQubmFtZV0uY2FyZGluYWxpdHk7XG59O1xuXG4vKipcbiAqIEByZXR1cm4ge1N0cmluZ30gZGF0ZSBiaW5uaW5nIGZvcm11bGEgb2YgdGhlIGdpdmVuIGZpZWxkXG4gKi9cbnRpbWUuZm9ybXVsYSA9IGZ1bmN0aW9uKGZpZWxkKSB7XG4gIHZhciBkYXRlID0gJ25ldyBEYXRlKGQuZGF0YS4nKyBmaWVsZC5uYW1lICsgJyknO1xuICBzd2l0Y2ggKGZpZWxkLmZuKSB7XG4gICAgY2FzZSAnc2Vjb25kJzogcmV0dXJuIGRhdGUgKyAnLmdldFVUQ1NlY29uZHMoKSc7XG4gICAgY2FzZSAnbWludXRlJzogcmV0dXJuIGRhdGUgKyAnLmdldFVUQ01pbnV0ZXMoKSc7XG4gICAgY2FzZSAnaG91cic6IHJldHVybiBkYXRlICsgJy5nZXRVVENIb3VycygpJztcbiAgICBjYXNlICdkYXlvZndlZWsnOiByZXR1cm4gZGF0ZSArICcuZ2V0VVRDRGF5KCknO1xuICAgIGNhc2UgJ2RhdGUnOiByZXR1cm4gZGF0ZSArICcuZ2V0VVRDRGF0ZSgpJztcbiAgICBjYXNlICdtb250aCc6IHJldHVybiBkYXRlICsgJy5nZXRVVENNb250aCgpJztcbiAgICBjYXNlICd5ZWFyJzogcmV0dXJuIGRhdGUgKyAnLmdldFVUQ0Z1bGxZZWFyKCknO1xuICB9XG4gIC8vIFRPRE8gYWRkIGNvbnRpbnVvdXMgYmlubmluZ1xuICBjb25zb2xlLmVycm9yKCdubyBmdW5jdGlvbiBzcGVjaWZpZWQgZm9yIGRhdGUnKTtcbn07XG5cbi8qKiBhZGQgZm9ybXVsYSB0cmFuc2Zvcm1zIHRvIGRhdGEgKi9cbnRpbWUudHJhbnNmb3JtID0gZnVuY3Rpb24odHJhbnNmb3JtLCBlbmNvZGluZywgZW5jVHlwZSwgZmllbGQpIHtcbiAgdHJhbnNmb3JtLnB1c2goe1xuICAgIHR5cGU6ICdmb3JtdWxhJyxcbiAgICBmaWVsZDogZW5jb2RpbmcuZmllbGQoZW5jVHlwZSksXG4gICAgZXhwcjogdGltZS5mb3JtdWxhKGZpZWxkKVxuICB9KTtcbn07XG5cbi8qKiBhcHBlbmQgY3VzdG9tIHRpbWUgc2NhbGVzIGZvciBheGlzIGxhYmVsICovXG50aW1lLnNjYWxlID0gZnVuY3Rpb24oc2NhbGVzLCBmbiwgZW5jb2RpbmcpIHtcbiAgdmFyIGxhYmVsTGVuZ3RoID0gZW5jb2RpbmcuY29uZmlnKCd0aW1lU2NhbGVMYWJlbExlbmd0aCcpO1xuICAvLyBUT0RPIGFkZCBvcHRpb24gZm9yIHNob3J0ZXIgc2NhbGUgLyBjdXN0b20gcmFuZ2VcbiAgc3dpdGNoIChmbikge1xuICAgIGNhc2UgJ2RheW9md2Vlayc6XG4gICAgICBzY2FsZXMucHVzaCh7XG4gICAgICAgIG5hbWU6ICd0aW1lLScrZm4sXG4gICAgICAgIHR5cGU6ICdvcmRpbmFsJyxcbiAgICAgICAgZG9tYWluOiB1dGlsLnJhbmdlKDAsIDcpLFxuICAgICAgICByYW5nZTogWydNb25kYXknLCAnVHVlc2RheScsICdXZWRuZXNkYXknLCAnVGh1cnNkYXknLCAnRnJpZGF5JywgJ1NhdHVyZGF5JywgJ1N1bmRheSddLm1hcChcbiAgICAgICAgICBmdW5jdGlvbihzKSB7IHJldHVybiBzLnN1YnN0cigwLCBsYWJlbExlbmd0aCk7fVxuICAgICAgICApXG4gICAgICB9KTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ21vbnRoJzpcbiAgICAgIHNjYWxlcy5wdXNoKHtcbiAgICAgICAgbmFtZTogJ3RpbWUtJytmbixcbiAgICAgICAgdHlwZTogJ29yZGluYWwnLFxuICAgICAgICBkb21haW46IHV0aWwucmFuZ2UoMCwgMTIpLFxuICAgICAgICByYW5nZTogWydKYW51YXJ5JywgJ0ZlYnJ1YXJ5JywgJ01hcmNoJywgJ0FwcmlsJywgJ01heScsICdKdW5lJywgJ0p1bHknLCAnQXVndXN0JywgJ1NlcHRlbWJlcicsICdPY3RvYmVyJywgJ05vdmVtYmVyJywgJ0RlY2VtYmVyJ10ubWFwKFxuICAgICAgICAgICAgZnVuY3Rpb24ocykgeyByZXR1cm4gcy5zdWJzdHIoMCwgbGFiZWxMZW5ndGgpO31cbiAgICAgICAgICApXG4gICAgICB9KTtcbiAgICAgIGJyZWFrO1xuICB9XG59O1xuXG50aW1lLmlzT3JkaW5hbEZuID0gZnVuY3Rpb24oZm4pIHtcbiAgc3dpdGNoIChmbikge1xuICAgIGNhc2UgJ3NlY29uZCc6XG4gICAgY2FzZSAnbWludXRlJzpcbiAgICBjYXNlICdob3VyJzpcbiAgICBjYXNlICdkYXlvZndlZWsnOlxuICAgIGNhc2UgJ2RhdGUnOlxuICAgIGNhc2UgJ21vbnRoJzpcbiAgICAgIHJldHVybiB0cnVlO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn07XG5cbnRpbWUuc2NhbGUudHlwZSA9IGZ1bmN0aW9uKGZuKSB7XG4gIHJldHVybiB0aW1lLmlzT3JkaW5hbEZuKGZuKSA/ICdvcmRpbmFsJyA6ICdsaW5lYXInO1xufTtcblxudGltZS5zY2FsZS5kb21haW4gPSBmdW5jdGlvbihmbikge1xuICBzd2l0Y2ggKGZuKSB7XG4gICAgY2FzZSAnc2Vjb25kJzpcbiAgICBjYXNlICdtaW51dGUnOiByZXR1cm4gdXRpbC5yYW5nZSgwLCA2MCk7XG4gICAgY2FzZSAnaG91cic6IHJldHVybiB1dGlsLnJhbmdlKDAsIDI0KTtcbiAgICBjYXNlICdkYXlvZndlZWsnOiByZXR1cm4gdXRpbC5yYW5nZSgwLCA3KTtcbiAgICBjYXNlICdkYXRlJzogcmV0dXJuIHV0aWwucmFuZ2UoMCwgMzIpO1xuICAgIGNhc2UgJ21vbnRoJzogcmV0dXJuIHV0aWwucmFuZ2UoMCwgMTIpO1xuICB9XG4gIHJldHVybiBudWxsO1xufTtcblxuLyoqIHdoZXRoZXIgYSBwYXJ0aWN1bGFyIHRpbWUgZnVuY3Rpb24gaGFzIGN1c3RvbSBzY2FsZSBmb3IgbGFiZWxzIGltcGxlbWVudGVkIGluIHRpbWUuc2NhbGUgKi9cbnRpbWUuaGFzU2NhbGUgPSBmdW5jdGlvbihmbikge1xuICBzd2l0Y2ggKGZuKSB7XG4gICAgY2FzZSAnZGF5b2Z3ZWVrJzpcbiAgICBjYXNlICdtb250aCc6XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICByZXR1cm4gZmFsc2U7XG59O1xuXG5cbiIsInZhciBnbG9iYWxzID0gcmVxdWlyZSgnLi9nbG9iYWxzJyk7XG5cbnZhciBjb25zdHMgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG5jb25zdHMuZW5jb2RpbmdUeXBlcyA9IFtYLCBZLCBST1csIENPTCwgU0laRSwgU0hBUEUsIENPTE9SLCBBTFBIQSwgVEVYVCwgREVUQUlMXTtcblxuY29uc3RzLmRhdGFUeXBlcyA9IHsnTyc6IE8sICdRJzogUSwgJ1QnOiBUfTtcblxuY29uc3RzLmRhdGFUeXBlTmFtZXMgPSBbJ08nLCAnUScsICdUJ10ucmVkdWNlKGZ1bmN0aW9uKHIsIHgpIHtcbiAgcltjb25zdHMuZGF0YVR5cGVzW3hdXSA9IHg7XG4gIHJldHVybiByO1xufSx7fSk7XG5cbmNvbnN0cy5zaG9ydGhhbmQgPSB7XG4gIGRlbGltOiAgJ3wnLFxuICBhc3NpZ246ICc9JyxcbiAgdHlwZTogICAnLCcsXG4gIGZ1bmM6ICAgJ18nXG59O1xuIiwiLy8gVE9ETyByZW5hbWUgZ2V0RGF0YVVybCB0byB2bC5kYXRhLmdldFVybCgpID9cblxudmFyIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKTtcblxudmFyIHZsZGF0YSA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbnZsZGF0YS5nZXRVcmwgPSBmdW5jdGlvbiBnZXREYXRhVXJsKGVuY29kaW5nLCBzdGF0cykge1xuICBpZiAoIWVuY29kaW5nLmNvbmZpZygndXNlVmVnYVNlcnZlcicpKSB7XG4gICAgLy8gZG9uJ3QgdXNlIHZlZ2Egc2VydmVyXG4gICAgcmV0dXJuIGVuY29kaW5nLmNvbmZpZygnZGF0YVVybCcpO1xuICB9XG5cbiAgaWYgKGVuY29kaW5nLmxlbmd0aCgpID09PSAwKSB7XG4gICAgLy8gbm8gZmllbGRzXG4gICAgcmV0dXJuO1xuICB9XG5cbiAgdmFyIGZpZWxkcyA9IFtdO1xuICBlbmNvZGluZy5mb3JFYWNoKGZ1bmN0aW9uKGVuY1R5cGUsIGZpZWxkKSB7XG4gICAgdmFyIG9iaiA9IHtcbiAgICAgIG5hbWU6IGVuY29kaW5nLmZpZWxkKGVuY1R5cGUsIHRydWUpLFxuICAgICAgZmllbGQ6IGZpZWxkLm5hbWVcbiAgICB9O1xuICAgIGlmIChmaWVsZC5hZ2dyKSB7XG4gICAgICBvYmouYWdnciA9IGZpZWxkLmFnZ3I7XG4gICAgfVxuICAgIGlmIChmaWVsZC5iaW4pIHtcbiAgICAgIG9iai5iaW5TaXplID0gdXRpbC5nZXRiaW5zKHN0YXRzW2ZpZWxkLm5hbWVdLCBlbmNvZGluZy5jb25maWcoJ21heGJpbnMnKSkuc3RlcDtcbiAgICB9XG4gICAgZmllbGRzLnB1c2gob2JqKTtcbiAgfSk7XG5cbiAgdmFyIHF1ZXJ5ID0ge1xuICAgIHRhYmxlOiBlbmNvZGluZy5jb25maWcoJ3ZlZ2FTZXJ2ZXJUYWJsZScpLFxuICAgIGZpZWxkczogZmllbGRzXG4gIH07XG5cbiAgcmV0dXJuIGVuY29kaW5nLmNvbmZpZygndmVnYVNlcnZlclVybCcpICsgJy9xdWVyeS8/cT0nICsgSlNPTi5zdHJpbmdpZnkocXVlcnkpO1xufTtcblxuLyoqXG4gKiBAcGFyYW0gIHtPYmplY3R9IGRhdGEgZGF0YSBpbiBKU09OL2phdmFzY3JpcHQgb2JqZWN0IGZvcm1hdFxuICogQHJldHVybiBBcnJheSBvZiB7bmFtZTogX19uYW1lX18sIHR5cGU6IFwibnVtYmVyfHRleHR8dGltZXxsb2NhdGlvblwifVxuICovXG52bGRhdGEuZ2V0U2NoZW1hID0gZnVuY3Rpb24oZGF0YSkge1xuICB2YXIgc2NoZW1hID0gW10sXG4gICAgZmllbGRzID0gdXRpbC5rZXlzKGRhdGFbMF0pO1xuXG4gIGZpZWxkcy5mb3JFYWNoKGZ1bmN0aW9uKGspIHtcbiAgICAvLyBmaW5kIG5vbi1udWxsIGRhdGFcbiAgICB2YXIgaSA9IDAsIGRhdHVtID0gZGF0YVtpXVtrXTtcbiAgICB3aGlsZSAoZGF0dW0gPT09ICcnIHx8IGRhdHVtID09PSBudWxsIHx8IGRhdHVtID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGRhdHVtID0gZGF0YVsrK2ldW2tdO1xuICAgIH1cblxuICAgIHRyeSB7XG4gICAgICB2YXIgbnVtYmVyID0gSlNPTi5wYXJzZShkYXR1bSk7XG4gICAgICBkYXR1bSA9IG51bWJlcjtcbiAgICB9IGNhdGNoKGUpIHtcbiAgICAgIC8vIGRvIG5vdGhpbmdcbiAgICB9XG5cbiAgICAvL1RPRE8oa2FuaXR3KTogYmV0dGVyIHR5cGUgaW5mZXJlbmNlIGhlcmVcbiAgICB2YXIgdHlwZSA9ICh0eXBlb2YgZGF0dW0gPT09ICdudW1iZXInKSA/ICdRJzpcbiAgICAgIGlzTmFOKERhdGUucGFyc2UoZGF0dW0pKSA/ICdPJyA6ICdUJztcblxuICAgIHNjaGVtYS5wdXNoKHtuYW1lOiBrLCB0eXBlOiB0eXBlfSk7XG4gIH0pO1xuXG4gIHJldHVybiBzY2hlbWE7XG59O1xuXG52bGRhdGEuZ2V0U3RhdHMgPSBmdW5jdGlvbihkYXRhKSB7IC8vIGhhY2tcbiAgdmFyIHN0YXRzID0ge30sXG4gICAgZmllbGRzID0gdXRpbC5rZXlzKGRhdGFbMF0pO1xuXG4gIGZpZWxkcy5mb3JFYWNoKGZ1bmN0aW9uKGspIHtcbiAgICB2YXIgc3RhdCA9IHV0aWwubWlubWF4KGRhdGEsIGspO1xuICAgIHN0YXQuY2FyZGluYWxpdHkgPSB1dGlsLnVuaXEoZGF0YSwgayk7XG4gICAgc3RhdC5tYXhsZW5ndGggPSBkYXRhLnJlZHVjZShmdW5jdGlvbihtYXgscm93KSB7XG4gICAgICB2YXIgbGVuID0gcm93W2tdLnRvU3RyaW5nKCkubGVuZ3RoO1xuICAgICAgcmV0dXJuIGxlbiA+IG1heCA/IGxlbiA6IG1heDtcbiAgICB9LCAwKTtcbiAgICBzdGF0LmNvdW50ID0gZGF0YS5sZW5ndGg7XG4gICAgc3RhdHNba10gPSBzdGF0O1xuICAgIHZhciBzYW1wbGUgPSB7fTtcbiAgICBmb3IgKDsgT2JqZWN0LmtleXMoc2FtcGxlKS5sZW5ndGggPCBNYXRoLm1pbihzdGF0LmNhcmRpbmFsaXR5LCAxMCk7IGkrKykge1xuICAgICAgdmFyIHZhbHVlID0gZGF0YVtNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBkYXRhLmxlbmd0aCldW2tdO1xuICAgICAgc2FtcGxlW3ZhbHVlXSA9IHRydWU7XG4gICAgfTtcbiAgICBzdGF0c1trXS5zYW1wbGUgPSBPYmplY3Qua2V5cyhzYW1wbGUpO1xuICB9KTtcbiAgc3RhdHMuY291bnQgPSBkYXRhLmxlbmd0aDtcbiAgcmV0dXJuIHN0YXRzO1xufTtcbiIsIi8vIHV0aWxpdHkgZm9yIGVuY1xuXG52YXIgY29uc3RzID0gcmVxdWlyZSgnLi9jb25zdHMnKSxcbiAgYyA9IGNvbnN0cy5zaG9ydGhhbmQsXG4gIHRpbWUgPSByZXF1aXJlKCcuL2NvbXBpbGUvdGltZScpLFxuICB2bGZpZWxkID0gcmVxdWlyZSgnLi9maWVsZCcpLFxuICB1dGlsID0gcmVxdWlyZSgnLi91dGlsJyk7XG5cbnZhciB2bGVuYyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbnZsZW5jLnNob3J0aGFuZCA9IGZ1bmN0aW9uKGVuYykge1xuICByZXR1cm4gdXRpbC5rZXlzKGVuYykubWFwKGZ1bmN0aW9uKGUpIHtcbiAgICB2YXIgdiA9IGVuY1tlXTtcbiAgICByZXR1cm4gZSArIGMuYXNzaWduICsgdmxmaWVsZC5zaG9ydGhhbmQodik7XG4gIH0pLmpvaW4oYy5kZWxpbSk7XG59OyIsIi8vIHV0aWxpdHkgZm9yIGZpZWxkXG5cbnZhciBjb25zdHMgPSByZXF1aXJlKCcuL2NvbnN0cycpLFxuICB0aW1lID0gcmVxdWlyZSgnLi9jb21waWxlL3RpbWUnKSxcbiAgdXRpbCA9IHJlcXVpcmUoJy4vdXRpbCcpO1xuXG52YXIgdmxmaWVsZCA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbnZsZmllbGQuc2hvcnRoYW5kID0gZnVuY3Rpb24oZikge1xuICB2YXIgYyA9IGNvbnN0cy5zaG9ydGhhbmQ7XG4gIHJldHVybiAoZi5hZ2dyID8gZi5hZ2dyICsgYy5mdW5jIDogJycpICtcbiAgICAoZi5mbiA/IGYuZm4gKyBjLmZ1bmMgOiAnJykgK1xuICAgIChmLmJpbiA/ICdiaW4nICsgYy5mdW5jIDogJycpICtcbiAgICAoZi5uYW1lIHx8ICcnKSArIGMudHlwZSArXG4gICAgKGNvbnN0cy5kYXRhVHlwZU5hbWVzW2YudHlwZV0gfHwgZi50eXBlKTtcbn07XG5cbnZsZmllbGQuc2hvcnRoYW5kcyA9IGZ1bmN0aW9uKGZpZWxkcywgZGVsaW0pIHtcbiAgZGVsaW0gPSBkZWxpbSB8fCAnLCc7XG4gIHJldHVybiBmaWVsZHMubWFwKHZsZmllbGQuc2hvcnRoYW5kKS5qb2luKGRlbGltKTtcbn07XG5cbnZhciB0eXBlT3JkZXIgPSB7XG4gIE86IDAsXG4gIEc6IDEsXG4gIFQ6IDIsXG4gIFE6IDNcbn07XG5cbnZsZmllbGQub3JkZXIgPSB7fTtcblxudmxmaWVsZC5vcmRlci50eXBlID0gZnVuY3Rpb24oZmllbGQpIHtcbiAgaWYgKGZpZWxkLmFnZ3I9PT0nY291bnQnKSByZXR1cm4gNDtcbiAgcmV0dXJuIHR5cGVPcmRlcltmaWVsZC50eXBlXTtcbn07XG5cbnZsZmllbGQub3JkZXIudHlwZVRoZW5OYW1lID0gZnVuY3Rpb24oZmllbGQpIHtcbiAgcmV0dXJuIHZsZmllbGQub3JkZXIudHlwZShmaWVsZCkgKyAnXycgKyBmaWVsZC5uYW1lO1xufTtcblxudmxmaWVsZC5vcmRlci5vcmlnaW5hbCA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gMDsgLy8gbm8gc3dhcCB3aWxsIG9jY3VyXG59O1xuXG52bGZpZWxkLm9yZGVyLm5hbWUgPSBmdW5jdGlvbihmaWVsZCkge1xuICByZXR1cm4gZmllbGQubmFtZTtcbn07XG5cbnZsZmllbGQub3JkZXIudHlwZVRoZW5DYXJkaW5hbGl0eSA9IGZ1bmN0aW9uKGZpZWxkLCBzdGF0cyl7XG4gIHJldHVybiBzdGF0c1tmaWVsZC5uYW1lXS5jYXJkaW5hbGl0eTtcbn07XG5cbmZ1bmN0aW9uIGlzVHlwZU5hbWUoZmllbGQsIHR5cGUpIHtcbiAgcmV0dXJuIGZpZWxkLnR5cGUgPT09IGNvbnN0cy5kYXRhVHlwZU5hbWVzW3R5cGVdO1xufVxuXG4vKipcbiAqIEZvciBlbmNvZGluZywgdXNlIGVuY29kaW5nLmlzT3JkaW5hbFNjYWxlKCkgdG8gYXZvaWQgY29uZnVzaW9uLlxuICogT3IgdXNlIEVuY29kaW5nLmlzVHlwZSBpZiB5b3VyIGZpZWxkIGlzIGZyb20gRW5jb2RpbmcgKGFuZCB0aHVzIGhhdmUgbnVtZXJpYyBkYXRhIHR5cGUpLlxuICogb3RoZXJ3aXNlLCBkbyBub3Qgc3BlY2lmaWMgaXNUeXBlIHNvIHdlIGNhbiB1c2UgdGhlIGRlZmF1bHQgaXNUeXBlTmFtZSBoZXJlLlxuICovXG52bGZpZWxkLmlzT3JkaW5hbFNjYWxlID0gZnVuY3Rpb24oZmllbGQsIGlzVHlwZSAvKm9wdGlvbmFsKi8pIHtcbiAgaXNUeXBlID0gaXNUeXBlIHx8IGlzVHlwZU5hbWU7XG5cbiAgdmFyIGZuO1xuICByZXR1cm4gIGlzVHlwZShmaWVsZCwgTykgfHwgZmllbGQuYmluIHx8XG4gICAgKCBpc1R5cGUoZmllbGQsIFQpICYmIGZpZWxkLmZuICYmIHRpbWUuaXNPcmRpbmFsRm4oZmllbGQuZm4pICk7XG59O1xuXG52bGZpZWxkLmNvdW50ID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB7bmFtZTonKicsIGFnZ3I6ICdjb3VudCcsIHR5cGU6J1EnLCBkaXNwbGF5TmFtZTogdmxmaWVsZC5jb3VudC5kaXNwbGF5TmFtZX07XG59O1xuXG52bGZpZWxkLmNvdW50LmRpc3BsYXlOYW1lID0gJ051bWJlciBvZiBSZWNvcmRzJztcblxudmxmaWVsZC5pc0NvdW50ID0gZnVuY3Rpb24oZmllbGQpIHtcbiAgcmV0dXJuIGZpZWxkLmFnZ3IgPT09ICdjb3VudCc7XG59O1xuXG4vKipcbiAqIEZvciBlbmNvZGluZywgdXNlIGVuY29kaW5nLmNhcmRpbmFsaXR5KCkgdG8gYXZvaWQgY29uZnVzaW9uLiAgT3IgdXNlIEVuY29kaW5nLmlzVHlwZSBpZiB5b3VyIGZpZWxkIGlzIGZyb20gRW5jb2RpbmcgKGFuZCB0aHVzIGhhdmUgbnVtZXJpYyBkYXRhIHR5cGUpLlxuICogb3RoZXJ3aXNlLCBkbyBub3Qgc3BlY2lmaWMgaXNUeXBlIHNvIHdlIGNhbiB1c2UgdGhlIGRlZmF1bHQgaXNUeXBlTmFtZSBoZXJlLlxuICovXG52bGZpZWxkLmNhcmRpbmFsaXR5ID0gZnVuY3Rpb24oZmllbGQsIHN0YXRzLCBtYXhiaW5zLCBpc1R5cGUpIHtcbiAgaXNUeXBlID0gaXNUeXBlIHx8IGlzVHlwZU5hbWU7XG5cbiAgaWYgKGZpZWxkLmJpbikge1xuICAgIGlmKCFtYXhiaW5zKSBjb25zb2xlLmVycm9yKCd2bGZpZWxkLmNhcmRpbmFsaXR5IG5vdCBpbmNsdWRlZCBtYXhiaW5zJyk7XG4gICAgdmFyIGJpbnMgPSB1dGlsLmdldGJpbnMoc3RhdHNbZmllbGQubmFtZV0sIG1heGJpbnMpO1xuICAgIHJldHVybiAoYmlucy5zdG9wIC0gYmlucy5zdGFydCkgLyBiaW5zLnN0ZXA7XG4gIH1cbiAgaWYgKGlzVHlwZShmaWVsZCwgVCkpIHtcbiAgICByZXR1cm4gdGltZS5jYXJkaW5hbGl0eShmaWVsZCwgc3RhdHMpO1xuICB9XG4gIGlmIChmaWVsZC5hZ2dyKSB7XG4gICAgcmV0dXJuIDE7XG4gIH1cbiAgcmV0dXJuIHN0YXRzW2ZpZWxkLm5hbWVdLmNhcmRpbmFsaXR5O1xufTtcbiIsIi8vIGRlY2xhcmUgZ2xvYmFsIGNvbnN0YW50XG52YXIgZyA9IGdsb2JhbCB8fCB3aW5kb3c7XG5cbmcuVEFCTEUgPSAndGFibGUnO1xuZy5TVEFDS0VEID0gJ3N0YWNrZWQnO1xuZy5JTkRFWCA9ICdpbmRleCc7XG5cbmcuWCA9ICd4JztcbmcuWSA9ICd5JztcbmcuUk9XID0gJ3Jvdyc7XG5nLkNPTCA9ICdjb2wnO1xuZy5TSVpFID0gJ3NpemUnO1xuZy5TSEFQRSA9ICdzaGFwZSc7XG5nLkNPTE9SID0gJ2NvbG9yJztcbmcuQUxQSEEgPSAnYWxwaGEnO1xuZy5URVhUID0gJ3RleHQnO1xuZy5ERVRBSUwgPSAnZGV0YWlsJztcblxuZy5PID0gMTtcbmcuUSA9IDI7XG5nLlQgPSA0O1xuIiwiLy8gUGFja2FnZSBvZiBkZWZpbmluZyBWZWdhbGl0ZSBTcGVjaWZpY2F0aW9uJ3MganNvbiBzY2hlbWFcblxudmFyIHNjaGVtYSA9IG1vZHVsZS5leHBvcnRzID0ge30sXG4gIHV0aWwgPSByZXF1aXJlKCcuLi91dGlsJyk7XG5cbnNjaGVtYS51dGlsID0gcmVxdWlyZSgnLi9zY2hlbWF1dGlsJyk7XG5cbnNjaGVtYS5tYXJrdHlwZSA9IHtcbiAgdHlwZTogJ3N0cmluZycsXG4gIGVudW06IFsncG9pbnQnLCAnYmFyJywgJ2xpbmUnLCAnYXJlYScsICdjaXJjbGUnLCAnc3F1YXJlJywgJ3RleHQnXVxufTtcblxuc2NoZW1hLmFnZ3IgPSB7XG4gIHR5cGU6ICdzdHJpbmcnLFxuICBlbnVtOiBbJ2F2ZycsICdzdW0nLCAnbWluJywgJ21heCcsICdjb3VudCddLFxuICBzdXBwb3J0ZWRFbnVtczoge1xuICAgIFE6IFsnYXZnJywgJ3N1bScsICdtaW4nLCAnbWF4JywgJ2NvdW50J10sXG4gICAgTzogW10sXG4gICAgVDogWydhdmcnLCAnbWluJywgJ21heCddLFxuICAgICcnOiBbJ2NvdW50J11cbiAgfSxcbiAgc3VwcG9ydGVkVHlwZXM6IHsnUSc6IHRydWUsICdPJzogdHJ1ZSwgJ1QnOiB0cnVlLCAnJzogdHJ1ZX1cbn07XG5cbnNjaGVtYS5iYW5kID0ge1xuICB0eXBlOiAnb2JqZWN0JyxcbiAgcHJvcGVydGllczoge1xuICAgIHNpemU6IHtcbiAgICAgIHR5cGU6ICdpbnRlZ2VyJyxcbiAgICAgIG1pbmltdW06IDBcbiAgICB9LFxuICAgIHBhZGRpbmc6IHtcbiAgICAgIHR5cGU6ICdpbnRlZ2VyJyxcbiAgICAgIG1pbmltdW06IDAsXG4gICAgICBkZWZhdWx0OiAxXG4gICAgfVxuICB9XG59O1xuXG5zY2hlbWEudGltZWZucyA9IFsnbW9udGgnLCAneWVhcicsICdkYXlvZndlZWsnLCAnZGF0ZScsICdob3VyJywgJ21pbnV0ZScsICdzZWNvbmQnXTtcblxuc2NoZW1hLmZuID0ge1xuICB0eXBlOiAnc3RyaW5nJyxcbiAgZW51bTogc2NoZW1hLnRpbWVmbnMsXG4gIHN1cHBvcnRlZFR5cGVzOiB7J1QnOiB0cnVlfVxufTtcblxuLy9UT0RPKGthbml0dyk6IGFkZCBvdGhlciB0eXBlIG9mIGZ1bmN0aW9uIGhlcmVcblxuc2NoZW1hLnNjYWxlX3R5cGUgPSB7XG4gIHR5cGU6ICdzdHJpbmcnLFxuICBlbnVtOiBbJ2xpbmVhcicsICdsb2cnLCAncG93JywgJ3NxcnQnLCAncXVhbnRpbGUnXSxcbiAgZGVmYXVsdDogJ2xpbmVhcicsXG4gIHN1cHBvcnRlZFR5cGVzOiB7J1EnOiB0cnVlfVxufTtcblxuc2NoZW1hLmZpZWxkID0ge1xuICB0eXBlOiAnb2JqZWN0JyxcbiAgcHJvcGVydGllczoge1xuICAgIG5hbWU6IHtcbiAgICAgIHR5cGU6ICdzdHJpbmcnXG4gICAgfVxuICB9XG59O1xuXG52YXIgY2xvbmUgPSB1dGlsLmR1cGxpY2F0ZTtcbnZhciBtZXJnZSA9IHNjaGVtYS51dGlsLm1lcmdlO1xuXG52YXIgdHlwaWNhbEZpZWxkID0gbWVyZ2UoY2xvbmUoc2NoZW1hLmZpZWxkKSwge1xuICB0eXBlOiAnb2JqZWN0JyxcbiAgcHJvcGVydGllczoge1xuICAgIHR5cGU6IHtcbiAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgZW51bTogWydPJywgJ1EnLCAnVCddXG4gICAgfSxcbiAgICBiaW46IHtcbiAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgICAgc3VwcG9ydGVkVHlwZXM6IHsnUSc6IHRydWV9IC8vIFRPRE86IGFkZCAnTycgYWZ0ZXIgZmluaXNoaW5nICM4MVxuICAgIH0sXG4gICAgYWdncjogc2NoZW1hLmFnZ3IsXG4gICAgZm46IHNjaGVtYS5mbixcbiAgICBzY2FsZToge1xuICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIHR5cGU6IHNjaGVtYS5zY2FsZV90eXBlLFxuICAgICAgICByZXZlcnNlOiB7XG4gICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgICAgICAgIHN1cHBvcnRlZFR5cGVzOiB7J1EnOiB0cnVlLCAnTyc6IHRydWUsICdUJzogdHJ1ZX1cbiAgICAgICAgfSxcbiAgICAgICAgemVybzoge1xuICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgICBkZXNjcmlwdGlvbjogJ0luY2x1ZGUgemVybycsXG4gICAgICAgICAgc3VwcG9ydGVkVHlwZXM6IHsnUSc6IHRydWV9XG4gICAgICAgIH0sXG4gICAgICAgIG5pY2U6IHtcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICBlbnVtOiBbJ3NlY29uZCcsICdtaW51dGUnLCAnaG91cicsICdkYXknLCAnd2VlaycsICdtb250aCcsICd5ZWFyJ10sXG4gICAgICAgICAgc3VwcG9ydGVkVHlwZXM6IHsnVCc6IHRydWV9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbn0pO1xuXG52YXIgb25seU9yZGluYWxGaWVsZCA9IG1lcmdlKGNsb25lKHNjaGVtYS5maWVsZCksIHtcbiAgdHlwZTogJ29iamVjdCcsXG4gIHByb3BlcnRpZXM6IHtcbiAgICB0eXBlOiB7XG4gICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgIGVudW06IFsnTycsJ1EnLCAnVCddIC8vIG9yZGluYWwtb25seSBmaWVsZCBzdXBwb3J0cyBRIHdoZW4gYmluIGlzIGFwcGxpZWQgYW5kIFQgd2hlbiBmbiBpcyBhcHBsaWVkLlxuICAgIH0sXG4gICAgZm46IHNjaGVtYS5mbixcbiAgICBiaW46IHtcbiAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgICAgc3VwcG9ydGVkVHlwZXM6IHsnUSc6IHRydWV9IC8vIFRPRE86IGFkZCAnTycgYWZ0ZXIgZmluaXNoaW5nICM4MVxuICAgIH0sXG4gICAgYWdncjoge1xuICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICBlbnVtOiBbJ2NvdW50J10sXG4gICAgICBzdXBwb3J0ZWRUeXBlczogeydPJzogdHJ1ZX1cbiAgICB9XG4gIH1cbn0pO1xuXG52YXIgYXhpc01peGluID0ge1xuICB0eXBlOiAnb2JqZWN0JyxcbiAgc3VwcG9ydGVkTWFya3R5cGVzOiB7J3BvaW50JzogdHJ1ZSwgJ2Jhcic6IHRydWUsICdsaW5lJzogdHJ1ZSwgJ2FyZWEnOiB0cnVlLCAnY2lyY2xlJzogdHJ1ZSwgJ3NxdWFyZSc6IHRydWUsICd0ZXh0JzogdHJ1ZX0sXG4gIHByb3BlcnRpZXM6IHtcbiAgICBheGlzOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgZ3JpZDoge1xuICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgICBkZWZhdWx0OiBmYWxzZSxcbiAgICAgICAgICBkZXNjcmlwdGlvbjogJ0EgZmxhZyBpbmRpY2F0ZSBpZiBncmlkbGluZXMgc2hvdWxkIGJlIGNyZWF0ZWQgaW4gYWRkaXRpb24gdG8gdGlja3MuJ1xuICAgICAgICB9LFxuICAgICAgICB0aXRsZToge1xuICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgICBkZWZhdWx0OiB0cnVlLFxuICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQSB0aXRsZSBmb3IgdGhlIGF4aXMuJ1xuICAgICAgICB9LFxuICAgICAgICB0aXRsZU9mZnNldDoge1xuICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyJyxcbiAgICAgICAgICBkZWZhdWx0OiB1bmRlZmluZWQsICAvLyBhdXRvXG4gICAgICAgICAgZGVzY3JpcHRpb246ICdBIHRpdGxlIG9mZnNldCB2YWx1ZSBmb3IgdGhlIGF4aXMuJ1xuICAgICAgICB9LFxuICAgICAgICBmb3JtYXQ6IHtcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICBkZWZhdWx0OiB1bmRlZmluZWQsICAvLyBhdXRvXG4gICAgICAgICAgZGVzY3JpcHRpb246ICdUaGUgZm9ybWF0dGluZyBwYXR0ZXJuIGZvciBheGlzIGxhYmVscy4nXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbn07XG5cbnZhciBiYW5kTWl4aW4gPSB7XG4gIHR5cGU6ICdvYmplY3QnLFxuICBwcm9wZXJ0aWVzOiB7XG4gICAgYmFuZDogc2NoZW1hLmJhbmRcbiAgfVxufTtcblxudmFyIGxlZ2VuZE1peGluID0ge1xuICB0eXBlOiAnb2JqZWN0JyxcbiAgcHJvcGVydGllczoge1xuICAgIGxlZ2VuZDoge1xuICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgZGVmYXVsdDogdHJ1ZVxuICAgIH1cbiAgfVxufTtcblxudmFyIHRleHRNaXhpbiA9IHtcbiAgdHlwZTogJ29iamVjdCcsXG4gIHN1cHBvcnRlZE1hcmt0eXBlczogeyd0ZXh0JzogdHJ1ZX0sXG4gIHByb3BlcnRpZXM6IHtcbiAgICB0ZXh0OiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgdGV4dDoge1xuICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgIGFsaWduOiB7XG4gICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICBkZWZhdWx0OiAnbGVmdCdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBiYXNlbGluZToge1xuICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgZGVmYXVsdDogJ21pZGRsZSdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBtYXJnaW46IHtcbiAgICAgICAgICAgICAgdHlwZTogJ2ludGVnZXInLFxuICAgICAgICAgICAgICBkZWZhdWx0OiA0LFxuICAgICAgICAgICAgICBtaW5pbXVtOiAwXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBmb250OiB7XG4gICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgd2VpZ2h0OiB7XG4gICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICBlbnVtOiBbJ25vcm1hbCcsICdib2xkJ10sXG4gICAgICAgICAgICAgIGRlZmF1bHQ6ICdub3JtYWwnXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2l6ZToge1xuICAgICAgICAgICAgICB0eXBlOiAnaW50ZWdlcicsXG4gICAgICAgICAgICAgIGRlZmF1bHQ6IDEwLFxuICAgICAgICAgICAgICBtaW5pbXVtOiAwXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZmFtaWx5OiB7XG4gICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICBkZWZhdWx0OiAnSGVsdmV0aWNhIE5ldWUnXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc3R5bGU6IHtcbiAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgIGRlZmF1bHQ6ICdub3JtYWwnLFxuICAgICAgICAgICAgICBlbnVtOiBbJ25vcm1hbCcsICdpdGFsaWMnXVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxufTtcblxudmFyIHNpemVNaXhpbiA9IHtcbiAgdHlwZTogJ29iamVjdCcsXG4gIHN1cHBvcnRlZE1hcmt0eXBlczogeydwb2ludCc6IHRydWUsICdiYXInOiB0cnVlLCAnY2lyY2xlJzogdHJ1ZSwgJ3NxdWFyZSc6IHRydWUsICd0ZXh0JzogdHJ1ZX0sXG4gIHByb3BlcnRpZXM6IHtcbiAgICB2YWx1ZToge1xuICAgICAgdHlwZTogJ2ludGVnZXInLFxuICAgICAgZGVmYXVsdDogMzAsXG4gICAgICBtaW5pbXVtOiAwXG4gICAgfVxuICB9XG59O1xuXG52YXIgY29sb3JNaXhpbiA9IHtcbiAgdHlwZTogJ29iamVjdCcsXG4gIHN1cHBvcnRlZE1hcmt0eXBlczogeydwb2ludCc6IHRydWUsICdiYXInOiB0cnVlLCAnbGluZSc6IHRydWUsICdhcmVhJzogdHJ1ZSwgJ2NpcmNsZSc6IHRydWUsICdzcXVhcmUnOiB0cnVlLCAndGV4dCc6IHRydWV9LFxuICBwcm9wZXJ0aWVzOiB7XG4gICAgdmFsdWU6IHtcbiAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgcm9sZTogJ2NvbG9yJyxcbiAgICAgIGRlZmF1bHQ6ICdzdGVlbGJsdWUnXG4gICAgfSxcbiAgICBzY2FsZToge1xuICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIHJhbmdlOiB7XG4gICAgICAgICAgdHlwZTogWydzdHJpbmcnLCAnYXJyYXknXVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG59O1xuXG52YXIgYWxwaGFNaXhpbiA9IHtcbiAgdHlwZTogJ29iamVjdCcsXG4gIHN1cHBvcnRlZE1hcmt0eXBlczogeydwb2ludCc6IHRydWUsICdiYXInOiB0cnVlLCAnbGluZSc6IHRydWUsICdhcmVhJzogdHJ1ZSwgJ2NpcmNsZSc6IHRydWUsICdzcXVhcmUnOiB0cnVlLCAndGV4dCc6IHRydWV9LFxuICBwcm9wZXJ0aWVzOiB7XG4gICAgdmFsdWU6IHtcbiAgICAgIHR5cGU6ICdudW1iZXInLFxuICAgICAgZGVmYXVsdDogdW5kZWZpbmVkLCAgLy8gYXV0b1xuICAgICAgbWluaW11bTogMCxcbiAgICAgIG1heGltdW06IDFcbiAgICB9XG4gIH1cbn07XG5cbnZhciBzaGFwZU1peGluID0ge1xuICB0eXBlOiAnb2JqZWN0JyxcbiAgc3VwcG9ydGVkTWFya3R5cGVzOiB7J3BvaW50JzogdHJ1ZSwgJ2NpcmNsZSc6IHRydWUsICdzcXVhcmUnOiB0cnVlfSxcbiAgcHJvcGVydGllczoge1xuICAgIHZhbHVlOiB7XG4gICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgIGVudW06IFsnY2lyY2xlJywgJ3NxdWFyZScsICdjcm9zcycsICdkaWFtb25kJywgJ3RyaWFuZ2xlLXVwJywgJ3RyaWFuZ2xlLWRvd24nXSxcbiAgICAgIGRlZmF1bHQ6ICdjaXJjbGUnXG4gICAgfVxuICB9XG59O1xuXG52YXIgZGV0YWlsTWl4aW4gPSB7XG4gIHR5cGU6ICdvYmplY3QnLFxuICBzdXBwb3J0ZWRNYXJrdHlwZXM6IHsncG9pbnQnOiB0cnVlLCAnbGluZSc6IHRydWUsICdjaXJjbGUnOiB0cnVlLCAnc3F1YXJlJzogdHJ1ZSwgJ3RleHQnOiB0cnVlfVxufTtcblxudmFyIHJvd01peGluID0ge1xuICBwcm9wZXJ0aWVzOiB7XG4gICAgaGVpZ2h0OiB7XG4gICAgICB0eXBlOiAnbnVtYmVyJyxcbiAgICAgIG1pbmltdW06IDAsXG4gICAgICBkZWZhdWx0OiAxNTBcbiAgICB9XG4gIH1cbn07XG5cbnZhciBjb2xNaXhpbiA9IHtcbiAgcHJvcGVydGllczoge1xuICAgIHdpZHRoOiB7XG4gICAgICB0eXBlOiAnbnVtYmVyJyxcbiAgICAgIG1pbmltdW06IDAsXG4gICAgICBkZWZhdWx0OiAxNTBcbiAgICB9XG4gIH1cbn07XG5cbnZhciBmYWNldE1peGluID0ge1xuICB0eXBlOiAnb2JqZWN0JyxcbiAgc3VwcG9ydGVkTWFya3R5cGVzOiB7J3BvaW50JzogdHJ1ZSwgJ2Jhcic6IHRydWUsICdsaW5lJzogdHJ1ZSwgJ2FyZWEnOiB0cnVlLCAnY2lyY2xlJzogdHJ1ZSwgJ3NxdWFyZSc6IHRydWUsICd0ZXh0JzogdHJ1ZX0sXG4gIHByb3BlcnRpZXM6IHtcbiAgICBwYWRkaW5nOiB7XG4gICAgICB0eXBlOiAnbnVtYmVyJyxcbiAgICAgIG1pbmltdW06IDAsXG4gICAgICBtYXhpbXVtOiAxLFxuICAgICAgZGVmYXVsdDogMC4xXG4gICAgfVxuICB9XG59O1xuXG52YXIgcmVxdWlyZWROYW1lVHlwZSA9IHtcbiAgcmVxdWlyZWQ6IFsnbmFtZScsICd0eXBlJ11cbn07XG5cbnZhciB4ID0gbWVyZ2UoY2xvbmUodHlwaWNhbEZpZWxkKSwgYXhpc01peGluLCBiYW5kTWl4aW4sIHJlcXVpcmVkTmFtZVR5cGUpO1xudmFyIHkgPSBjbG9uZSh4KTtcblxudmFyIGZhY2V0ID0gbWVyZ2UoY2xvbmUob25seU9yZGluYWxGaWVsZCksIHJlcXVpcmVkTmFtZVR5cGUsIGZhY2V0TWl4aW4pO1xudmFyIHJvdyA9IG1lcmdlKGNsb25lKGZhY2V0KSwgYXhpc01peGluLCByb3dNaXhpbik7XG52YXIgY29sID0gbWVyZ2UoY2xvbmUoZmFjZXQpLCBheGlzTWl4aW4sIGNvbE1peGluKTtcblxudmFyIHNpemUgPSBtZXJnZShjbG9uZSh0eXBpY2FsRmllbGQpLCBsZWdlbmRNaXhpbiwgc2l6ZU1peGluKTtcbnZhciBjb2xvciA9IG1lcmdlKGNsb25lKHR5cGljYWxGaWVsZCksIGxlZ2VuZE1peGluLCBjb2xvck1peGluKTtcbnZhciBhbHBoYSA9IG1lcmdlKGNsb25lKHR5cGljYWxGaWVsZCksIGFscGhhTWl4aW4pO1xudmFyIHNoYXBlID0gbWVyZ2UoY2xvbmUob25seU9yZGluYWxGaWVsZCksIGxlZ2VuZE1peGluLCBzaGFwZU1peGluKTtcbnZhciBkZXRhaWwgPSBtZXJnZShjbG9uZShvbmx5T3JkaW5hbEZpZWxkKSwgZGV0YWlsTWl4aW4pO1xuXG52YXIgdGV4dCA9IG1lcmdlKGNsb25lKHR5cGljYWxGaWVsZCksIHRleHRNaXhpbik7XG5cbnZhciBmaWx0ZXIgPSB7XG4gIHR5cGU6ICdhcnJheScsXG4gIGl0ZW1zOiB7XG4gICAgdHlwZTogJ29iamVjdCcsXG4gICAgcHJvcGVydGllczoge1xuICAgICAgb3BlcmFuZHM6IHtcbiAgICAgICAgdHlwZTogJ2FycmF5JyxcbiAgICAgICAgaXRlbXM6IHtcbiAgICAgICAgICB0eXBlOiBbJ3N0cmluZycsICdib29sZWFuJywgJ2ludGVnZXInLCAnbnVtYmVyJ11cbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIG9wZXJhdG9yOiB7XG4gICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICBlbnVtOiBbJz4nLCAnPj0nLCAnPScsICchPScsICc8JywgJzw9JywgJ25vdE51bGwnXVxuICAgICAgfVxuICAgIH1cbiAgfVxufTtcblxudmFyIGNmZyA9IHtcbiAgdHlwZTogJ29iamVjdCcsXG4gIHByb3BlcnRpZXM6IHtcbiAgICAvLyB0ZW1wbGF0ZVxuICAgIHdpZHRoOiB7XG4gICAgICB0eXBlOiAnaW50ZWdlcicsXG4gICAgICBkZWZhdWx0OiB1bmRlZmluZWRcbiAgICB9LFxuICAgIGhlaWdodDoge1xuICAgICAgdHlwZTogJ2ludGVnZXInLFxuICAgICAgZGVmYXVsdDogdW5kZWZpbmVkXG4gICAgfSxcbiAgICB2aWV3cG9ydDoge1xuICAgICAgdHlwZTogJ2FycmF5JyxcbiAgICAgIGl0ZW1zOiB7XG4gICAgICAgIHR5cGU6IFsnaW50ZWdlciddXG4gICAgICB9LFxuICAgICAgZGVmYXVsdDogdW5kZWZpbmVkXG4gICAgfSxcbiAgICAvL2Jpbm5pbmdcbiAgICBtYXhiaW5zOiB7XG4gICAgICB0eXBlOiAnaW50ZWdlcicsXG4gICAgICBkZWZhdWx0OiAxNSxcbiAgICAgIG1pbmltdW06IDJcbiAgICB9LFxuXG4gICAgLy8gc2luZ2xlIHBsb3RcbiAgICBzaW5nbGVIZWlnaHQ6IHtcbiAgICAgIC8vIHdpbGwgYmUgb3ZlcndyaXR0ZW4gYnkgYmFuZFdpZHRoICogKGNhcmRpbmFsaXR5ICsgcGFkZGluZylcbiAgICAgIHR5cGU6ICdpbnRlZ2VyJyxcbiAgICAgIGRlZmF1bHQ6IDIwMCxcbiAgICAgIG1pbmltdW06IDBcbiAgICB9LFxuICAgIHNpbmdsZVdpZHRoOiB7XG4gICAgICAvLyB3aWxsIGJlIG92ZXJ3cml0dGVuIGJ5IGJhbmRXaWR0aCAqIChjYXJkaW5hbGl0eSArIHBhZGRpbmcpXG4gICAgICB0eXBlOiAnaW50ZWdlcicsXG4gICAgICBkZWZhdWx0OiAyMDAsXG4gICAgICBtaW5pbXVtOiAwXG4gICAgfSxcbiAgICAvLyBiYW5kIHNpemVcbiAgICBsYXJnZUJhbmRTaXplOiB7XG4gICAgICB0eXBlOiAnaW50ZWdlcicsXG4gICAgICBkZWZhdWx0OiAxOSxcbiAgICAgIG1pbmltdW06IDBcbiAgICB9LFxuICAgIHNtYWxsQmFuZFNpemU6IHtcbiAgICAgIC8vc21hbGwgbXVsdGlwbGVzIG9yIHNpbmdsZSBwbG90IHdpdGggaGlnaCBjYXJkaW5hbGl0eVxuICAgICAgdHlwZTogJ2ludGVnZXInLFxuICAgICAgZGVmYXVsdDogMTIsXG4gICAgICBtaW5pbXVtOiAwXG4gICAgfSxcbiAgICBsYXJnZUJhbmRNYXhDYXJkaW5hbGl0eToge1xuICAgICAgdHlwZTogJ2ludGVnZXInLFxuICAgICAgZGVmYXVsdDogMTBcbiAgICB9LFxuICAgIC8vIHNtYWxsIG11bHRpcGxlc1xuICAgIGNlbGxQYWRkaW5nOiB7XG4gICAgICB0eXBlOiAnbnVtYmVyJyxcbiAgICAgIGRlZmF1bHQ6IDAuMVxuICAgIH0sXG4gICAgY2VsbEJhY2tncm91bmRDb2xvcjoge1xuICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICByb2xlOiAnY29sb3InLFxuICAgICAgZGVmYXVsdDogJyNmZGZkZmQnXG4gICAgfSxcbiAgICB0ZXh0Q2VsbFdpZHRoOiB7XG4gICAgICB0eXBlOiAnaW50ZWdlcicsXG4gICAgICBkZWZhdWx0OiA5MCxcbiAgICAgIG1pbmltdW06IDBcbiAgICB9LFxuXG4gICAgLy8gbWFya3NcbiAgICBzdHJva2VXaWR0aDoge1xuICAgICAgdHlwZTogJ2ludGVnZXInLFxuICAgICAgZGVmYXVsdDogMixcbiAgICAgIG1pbmltdW06IDBcbiAgICB9LFxuXG4gICAgLy8gc2NhbGVzXG4gICAgdGltZVNjYWxlTGFiZWxMZW5ndGg6IHtcbiAgICAgIHR5cGU6ICdpbnRlZ2VyJyxcbiAgICAgIGRlZmF1bHQ6IDMsXG4gICAgICBtaW5pbXVtOiAwXG4gICAgfSxcbiAgICAvLyBvdGhlclxuICAgIGNoYXJhY3RlcldpZHRoOiB7XG4gICAgICB0eXBlOiAnaW50ZWdlcicsXG4gICAgICBkZWZhdWx0OiA2XG4gICAgfSxcblxuICAgIC8vIGRhdGEgc291cmNlXG4gICAgZGF0YUZvcm1hdFR5cGU6IHtcbiAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgZW51bTogWydqc29uJywgJ2NzdiddLFxuICAgICAgZGVmYXVsdDogJ2pzb24nXG4gICAgfSxcbiAgICB1c2VWZWdhU2VydmVyOiB7XG4gICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICBkZWZhdWx0OiBmYWxzZVxuICAgIH0sXG4gICAgZGF0YVVybDoge1xuICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICBkZWZhdWx0OiB1bmRlZmluZWRcbiAgICB9LFxuICAgIHZlZ2FTZXJ2ZXJUYWJsZToge1xuICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICBkZWZhdWx0OiB1bmRlZmluZWRcbiAgICB9LFxuICAgIHZlZ2FTZXJ2ZXJVcmw6IHtcbiAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgZGVmYXVsdDogJ2h0dHA6Ly9sb2NhbGhvc3Q6MzAwMSdcbiAgICB9XG4gIH1cbn07XG5cbi8qKiBAdHlwZSBPYmplY3QgU2NoZW1hIG9mIGEgdmVnYWxpdGUgc3BlY2lmaWNhdGlvbiAqL1xuc2NoZW1hLnNjaGVtYSA9IHtcbiAgJHNjaGVtYTogJ2h0dHA6Ly9qc29uLXNjaGVtYS5vcmcvZHJhZnQtMDQvc2NoZW1hIycsXG4gIERlc2NyaXB0aW9uOiAnU2NoZW1hIGZvciB2ZWdhbGl0ZSBzcGVjaWZpY2F0aW9uJyxcbiAgdHlwZTogJ29iamVjdCcsXG4gIHJlcXVpcmVkOiBbJ21hcmt0eXBlJywgJ2VuYycsICdjZmcnXSxcbiAgcHJvcGVydGllczoge1xuICAgIG1hcmt0eXBlOiBzY2hlbWEubWFya3R5cGUsXG4gICAgZW5jOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgeDogeCxcbiAgICAgICAgeTogeSxcbiAgICAgICAgcm93OiByb3csXG4gICAgICAgIGNvbDogY29sLFxuICAgICAgICBzaXplOiBzaXplLFxuICAgICAgICBjb2xvcjogY29sb3IsXG4gICAgICAgIGFscGhhOiBhbHBoYSxcbiAgICAgICAgc2hhcGU6IHNoYXBlLFxuICAgICAgICB0ZXh0OiB0ZXh0LFxuICAgICAgICBkZXRhaWw6IGRldGFpbFxuICAgICAgfVxuICAgIH0sXG4gICAgZmlsdGVyOiBmaWx0ZXIsXG4gICAgY2ZnOiBjZmdcbiAgfVxufTtcblxuLyoqIEluc3RhbnRpYXRlIGEgdmVyYm9zZSB2bCBzcGVjIGZyb20gdGhlIHNjaGVtYSAqL1xuc2NoZW1hLmluc3RhbnRpYXRlID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiBzY2hlbWEudXRpbC5pbnN0YW50aWF0ZShzY2hlbWEuc2NoZW1hKTtcbn07XG4iLCJ2YXIgdXRpbCA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbnZhciBpc0VtcHR5ID0gZnVuY3Rpb24ob2JqKSB7XG4gIHJldHVybiBPYmplY3Qua2V5cyhvYmopLmxlbmd0aCA9PT0gMDtcbn07XG5cbnV0aWwuZXh0ZW5kID0gZnVuY3Rpb24oaW5zdGFuY2UsIHNjaGVtYSkge1xuICByZXR1cm4gdXRpbC5tZXJnZSh1dGlsLmluc3RhbnRpYXRlKHNjaGVtYSksIGluc3RhbmNlKTtcbn07XG5cbi8vIGluc3RhbnRpYXRlIGEgc2NoZW1hXG51dGlsLmluc3RhbnRpYXRlID0gZnVuY3Rpb24oc2NoZW1hKSB7XG4gIGlmIChzY2hlbWEudHlwZSA9PT0gJ29iamVjdCcpIHtcbiAgICB2YXIgaW5zdGFuY2UgPSB7fTtcbiAgICBmb3IgKHZhciBuYW1lIGluIHNjaGVtYS5wcm9wZXJ0aWVzKSB7XG4gICAgICB2YXIgdmFsID0gdXRpbC5pbnN0YW50aWF0ZShzY2hlbWEucHJvcGVydGllc1tuYW1lXSk7XG4gICAgICBpZiAodmFsICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaW5zdGFuY2VbbmFtZV0gPSB2YWw7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBpbnN0YW5jZTtcbiAgfSBlbHNlIGlmICgnZGVmYXVsdCcgaW4gc2NoZW1hKSB7XG4gICAgcmV0dXJuIHNjaGVtYS5kZWZhdWx0O1xuICB9IGVsc2UgaWYgKHNjaGVtYS50eXBlID09PSAnYXJyYXknKSB7XG4gICAgcmV0dXJuIFtdO1xuICB9XG4gIHJldHVybiB1bmRlZmluZWQ7XG59O1xuXG4vLyByZW1vdmUgYWxsIGRlZmF1bHRzIGZyb20gYW4gaW5zdGFuY2VcbnV0aWwuc3VidHJhY3QgPSBmdW5jdGlvbihpbnN0YW5jZSwgZGVmYXVsdHMpIHtcbiAgdmFyIGNoYW5nZXMgPSB7fTtcbiAgZm9yICh2YXIgcHJvcCBpbiBpbnN0YW5jZSkge1xuICAgIHZhciBkZWYgPSBkZWZhdWx0c1twcm9wXTtcbiAgICB2YXIgaW5zID0gaW5zdGFuY2VbcHJvcF07XG4gICAgLy8gTm90ZTogZG9lcyBub3QgcHJvcGVybHkgc3VidHJhY3QgYXJyYXlzXG4gICAgaWYgKCFkZWZhdWx0cyB8fCBkZWYgIT09IGlucykge1xuICAgICAgaWYgKHR5cGVvZiBpbnMgPT09ICdvYmplY3QnICYmICFBcnJheS5pc0FycmF5KGlucykpIHtcbiAgICAgICAgdmFyIGMgPSB1dGlsLnN1YnRyYWN0KGlucywgZGVmKTtcbiAgICAgICAgaWYgKCFpc0VtcHR5KGMpKVxuICAgICAgICAgIGNoYW5nZXNbcHJvcF0gPSBjO1xuICAgICAgfSBlbHNlIGlmICghQXJyYXkuaXNBcnJheShpbnMpIHx8IGlucy5sZW5ndGggPiAwKSB7XG4gICAgICAgIGNoYW5nZXNbcHJvcF0gPSBpbnM7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiBjaGFuZ2VzO1xufTtcblxudXRpbC5tZXJnZSA9IGZ1bmN0aW9uKC8qZGVzdCosIHNyYzAsIHNyYzEsIC4uLiovKXtcbiAgdmFyIGRlc3QgPSBhcmd1bWVudHNbMF07XG4gIGZvciAodmFyIGk9MSA7IGk8YXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgZGVzdCA9IG1lcmdlKGRlc3QsIGFyZ3VtZW50c1tpXSk7XG4gIH1cbiAgcmV0dXJuIGRlc3Q7XG59O1xuXG4vLyByZWN1cnNpdmVseSBtZXJnZXMgc3JjIGludG8gZGVzdFxubWVyZ2UgPSBmdW5jdGlvbihkZXN0LCBzcmMpIHtcbiAgaWYgKHR5cGVvZiBzcmMgIT09ICdvYmplY3QnIHx8IHNyYyA9PT0gbnVsbCkge1xuICAgIHJldHVybiBkZXN0O1xuICB9XG5cbiAgZm9yICh2YXIgcCBpbiBzcmMpIHtcbiAgICBpZiAoIXNyYy5oYXNPd25Qcm9wZXJ0eShwKSkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGlmIChzcmNbcF0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGlmICh0eXBlb2Ygc3JjW3BdICE9PSAnb2JqZWN0JyB8fCBzcmNbcF0gPT09IG51bGwpIHtcbiAgICAgIGRlc3RbcF0gPSBzcmNbcF07XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgZGVzdFtwXSAhPT0gJ29iamVjdCcgfHwgZGVzdFtwXSA9PT0gbnVsbCkge1xuICAgICAgZGVzdFtwXSA9IG1lcmdlKHNyY1twXS5jb25zdHJ1Y3RvciA9PT0gQXJyYXkgPyBbXSA6IHt9LCBzcmNbcF0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBtZXJnZShkZXN0W3BdLCBzcmNbcF0pO1xuICAgIH1cbiAgfVxuICByZXR1cm4gZGVzdDtcbn07IiwidmFyIHV0aWwgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG51dGlsLmtleXMgPSBmdW5jdGlvbihvYmopIHtcbiAgdmFyIGsgPSBbXSwgeDtcbiAgZm9yICh4IGluIG9iaikgay5wdXNoKHgpO1xuICByZXR1cm4gaztcbn07XG5cbnV0aWwudmFscyA9IGZ1bmN0aW9uKG9iaikge1xuICB2YXIgdiA9IFtdLCB4O1xuICBmb3IgKHggaW4gb2JqKSB2LnB1c2gob2JqW3hdKTtcbiAgcmV0dXJuIHY7XG59O1xuXG51dGlsLnJhbmdlID0gZnVuY3Rpb24oc3RhcnQsIHN0b3AsIHN0ZXApIHtcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPCAzKSB7XG4gICAgc3RlcCA9IDE7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPCAyKSB7XG4gICAgICBzdG9wID0gc3RhcnQ7XG4gICAgICBzdGFydCA9IDA7XG4gICAgfVxuICB9XG4gIGlmICgoc3RvcCAtIHN0YXJ0KSAvIHN0ZXAgPT0gSW5maW5pdHkpIHRocm93IG5ldyBFcnJvcignaW5maW5pdGUgcmFuZ2UnKTtcbiAgdmFyIHJhbmdlID0gW10sIGkgPSAtMSwgajtcbiAgaWYgKHN0ZXAgPCAwKSB3aGlsZSAoKGogPSBzdGFydCArIHN0ZXAgKiArK2kpID4gc3RvcCkgcmFuZ2UucHVzaChqKTtcbiAgZWxzZSB3aGlsZSAoKGogPSBzdGFydCArIHN0ZXAgKiArK2kpIDwgc3RvcCkgcmFuZ2UucHVzaChqKTtcbiAgcmV0dXJuIHJhbmdlO1xufTtcblxudXRpbC5maW5kID0gZnVuY3Rpb24obGlzdCwgcGF0dGVybikge1xuICB2YXIgbCA9IGxpc3QuZmlsdGVyKGZ1bmN0aW9uKHgpIHtcbiAgICByZXR1cm4geFtwYXR0ZXJuLm5hbWVdID09PSBwYXR0ZXJuLnZhbHVlO1xuICB9KTtcbiAgcmV0dXJuIGwubGVuZ3RoICYmIGxbMF0gfHwgbnVsbDtcbn07XG5cbnV0aWwudW5pcSA9IGZ1bmN0aW9uKGRhdGEsIGZpZWxkKSB7XG4gIHZhciBtYXAgPSB7fSwgY291bnQgPSAwLCBpLCBrO1xuICBmb3IgKGkgPSAwOyBpIDwgZGF0YS5sZW5ndGg7ICsraSkge1xuICAgIGsgPSBkYXRhW2ldW2ZpZWxkXTtcbiAgICBpZiAoIW1hcFtrXSkge1xuICAgICAgbWFwW2tdID0gMTtcbiAgICAgIGNvdW50ICs9IDE7XG4gICAgfVxuICB9XG4gIHJldHVybiBjb3VudDtcbn07XG5cbnV0aWwubWlubWF4ID0gZnVuY3Rpb24oZGF0YSwgZmllbGQpIHtcbiAgdmFyIHN0YXRzID0ge21pbjogK0luZmluaXR5LCBtYXg6IC1JbmZpbml0eX07XG4gIGZvciAoaSA9IDA7IGkgPCBkYXRhLmxlbmd0aDsgKytpKSB7XG4gICAgdmFyIHYgPSBkYXRhW2ldW2ZpZWxkXTtcbiAgICBpZiAodiA+IHN0YXRzLm1heCkgc3RhdHMubWF4ID0gdjtcbiAgICBpZiAodiA8IHN0YXRzLm1pbikgc3RhdHMubWluID0gdjtcbiAgfVxuICByZXR1cm4gc3RhdHM7XG59O1xuXG51dGlsLmR1cGxpY2F0ZSA9IGZ1bmN0aW9uKG9iaikge1xuICByZXR1cm4gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShvYmopKTtcbn07XG5cbnV0aWwuYW55ID0gZnVuY3Rpb24oYXJyLCBmKSB7XG4gIHZhciBpID0gMCwgaztcbiAgZm9yIChrIGluIGFycikge1xuICAgIGlmIChmKGFycltrXSwgaywgaSsrKSkgcmV0dXJuIHRydWU7XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufTtcblxudXRpbC5hbGwgPSBmdW5jdGlvbihhcnIsIGYpIHtcbiAgdmFyIGkgPSAwLCBrO1xuICBmb3IgKGsgaW4gYXJyKSB7XG4gICAgaWYgKCFmKGFycltrXSwgaywgaSsrKSkgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHJldHVybiB0cnVlO1xufTtcblxudXRpbC5tZXJnZSA9IGZ1bmN0aW9uKGRlc3QsIHNyYykge1xuICByZXR1cm4gdXRpbC5rZXlzKHNyYykucmVkdWNlKGZ1bmN0aW9uKGMsIGspIHtcbiAgICBjW2tdID0gc3JjW2tdO1xuICAgIHJldHVybiBjO1xuICB9LCBkZXN0KTtcbn07XG5cbnV0aWwuZ2V0YmlucyA9IGZ1bmN0aW9uKHN0YXRzLCBtYXhiaW5zKSB7XG4gIHJldHVybiB2Zy5iaW5zKHtcbiAgICBtaW46IHN0YXRzLm1pbixcbiAgICBtYXg6IHN0YXRzLm1heCxcbiAgICBtYXhiaW5zOiBtYXhiaW5zXG4gIH0pO1xufTtcblxuLyoqXG4gKiB4W3BbMF1dLi4uW3Bbbl1dID0gdmFsXG4gKiBAcGFyYW0gbm9hdWdtZW50IGRldGVybWluZSB3aGV0aGVyIG5ldyBvYmplY3Qgc2hvdWxkIGJlIGFkZGVkIGZcbiAqIG9yIG5vbi1leGlzdGluZyBwcm9wZXJ0aWVzIGFsb25nIHRoZSBwYXRoXG4gKi9cbnV0aWwuc2V0dGVyID0gZnVuY3Rpb24oeCwgcCwgdmFsLCBub2F1Z21lbnQpIHtcbiAgZm9yICh2YXIgaT0wOyBpPHAubGVuZ3RoLTE7ICsraSkge1xuICAgIGlmICghbm9hdWdtZW50ICYmICEocFtpXSBpbiB4KSl7XG4gICAgICB4ID0geFtwW2ldXSA9IHt9O1xuICAgIH0gZWxzZSB7XG4gICAgICB4ID0geFtwW2ldXTtcbiAgICB9XG4gIH1cbiAgeFtwW2ldXSA9IHZhbDtcbn07XG5cblxuLyoqXG4gKiByZXR1cm5zIHhbcFswXV0uLi5bcFtuXV1cbiAqIEBwYXJhbSBhdWdtZW50IGRldGVybWluZSB3aGV0aGVyIG5ldyBvYmplY3Qgc2hvdWxkIGJlIGFkZGVkIGZcbiAqIG9yIG5vbi1leGlzdGluZyBwcm9wZXJ0aWVzIGFsb25nIHRoZSBwYXRoXG4gKi9cbnV0aWwuZ2V0dGVyID0gZnVuY3Rpb24oeCwgcCwgbm9hdWdtZW50KSB7XG4gIGZvciAodmFyIGk9MDsgaTxwLmxlbmd0aDsgKytpKSB7XG4gICAgaWYgKCFub2F1Z21lbnQgJiYgIShwW2ldIGluIHgpKXtcbiAgICAgIHggPSB4W3BbaV1dID0ge307XG4gICAgfSBlbHNlIHtcbiAgICAgIHggPSB4W3BbaV1dO1xuICAgIH1cbiAgfVxuICByZXR1cm4geDtcbn07XG5cbi8vIGNvcGllZCBmcm9tIHZlZ2FcbnV0aWwudHJ1bmNhdGUgPSBmdW5jdGlvbihzLCBsZW5ndGgsIHBvcywgd29yZCwgZWxsaXBzaXMpIHtcbiAgdmFyIGxlbiA9IHMubGVuZ3RoO1xuICBpZiAobGVuIDw9IGxlbmd0aCkgcmV0dXJuIHM7XG4gIGVsbGlwc2lzID0gZWxsaXBzaXMgfHwgXCIuLi5cIjtcbiAgdmFyIGwgPSBNYXRoLm1heCgwLCBsZW5ndGggLSBlbGxpcHNpcy5sZW5ndGgpO1xuXG4gIHN3aXRjaCAocG9zKSB7XG4gICAgY2FzZSBcImxlZnRcIjpcbiAgICAgIHJldHVybiBlbGxpcHNpcyArICh3b3JkID8gdmdfdHJ1bmNhdGVPbldvcmQocyxsLDEpIDogcy5zbGljZShsZW4tbCkpO1xuICAgIGNhc2UgXCJtaWRkbGVcIjpcbiAgICBjYXNlIFwiY2VudGVyXCI6XG4gICAgICB2YXIgbDEgPSBNYXRoLmNlaWwobC8yKSwgbDIgPSBNYXRoLmZsb29yKGwvMik7XG4gICAgICByZXR1cm4gKHdvcmQgPyB2Z190cnVuY2F0ZU9uV29yZChzLGwxKSA6IHMuc2xpY2UoMCxsMSkpICsgZWxsaXBzaXMgK1xuICAgICAgICAod29yZCA/IHZnX3RydW5jYXRlT25Xb3JkKHMsbDIsMSkgOiBzLnNsaWNlKGxlbi1sMikpO1xuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4gKHdvcmQgPyB2Z190cnVuY2F0ZU9uV29yZChzLGwpIDogcy5zbGljZSgwLGwpKSArIGVsbGlwc2lzO1xuICB9XG59O1xuXG51dGlsLmVycm9yID0gZnVuY3Rpb24obXNnKSB7XG4gIGNvbnNvbGUuZXJyb3IoJ1tWTCBFcnJvcl0nLCBtc2cpO1xufTtcblxuIl19
