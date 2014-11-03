// TODO(kanitw): refactor

var _ = require('lodash');
var encodings = require('./encodings');
var dt = require('./dataTypes');

var CHART_TYPE_SPLIT = "--",
  ENCODINGS_SPLIT = ";",
  ENCODING_SPLIT = ":",
  ENCODING_AND = "&",
  ENCODING_OR = "/",
  FIELDS_SPLIT = ",";

var Chart = function(template, fields, count){
  this.chart_type = template.type;
  this.templateID = template.id;
  this.isAggregated = template.isAggregated;
  this.fields = _.cloneDeep(fields);
  this.count = count || Chart.countFields(fields);
};

var prototype = Chart.prototype;

prototype.isCycle = function(c){
  var s = this;
  if(!_.all(encodings.nonPositional, function(e){
    return _.isEqual(c.fields[e],s.fields[e]);
  }))
    return false;

  var c_xycr = _.union(c.fields.x, c.fields.y, c.fields.row, c.fields.col);
  var s_xycr = _.union(s.fields.x, s.fields.y, s.fields.row, s.fields.col);

  if (c_xycr.length !== s_xycr.length) return false;
  s_xycr.sort();
  c_xycr.sort();
  return _.all(s_xycr, function(sf, i){ return _.isEqual(sf,c_xycr[i]); });
};

prototype.isRedundant = function(c){
  var self = this;
  var sNonPosCount = c.fields.keys
}

/**
 * @param  {Chart}  c
 * @return {Boolean}   If the chart C is transpose of this.
 */
prototype.isTranspose = function (c, checkOnlyXY){
  var self = this;
  if(!checkOnlyXY && !_.all(encodings.nonPositional, function(e){
    return _.isEqual(c.fields[e],self.fields[e]);
  }))
    return false;

  var sameXY, swapXY, sameRC, swapRC;

  var cx = c.fields.x,
    cy = c.fields.y,
    chx = self.fields.x,
    chy = self.fields.y;
  if(!(sameXY = _.isEqual(cx, chx) && _.isEqual(cy, chy)) &&
    !(swapXY = _.isEqual(cx, chy) && _.isEqual(cy, chx))
  ){
    // if(!sameXY) console.log('!sameXY', cx, chx, ",", cy, chy);
    // if(!swapXY) console.log('!swapXY', cy, chy, ",", cx, chx);
    return false;
  }

  // if(sameXY) console.log('sameXY', cx, chx, cy, chy);
  // else if(swapXY) console.log('swapXY', cy, chy, cx, chx);

  var cr = c.fields.row,
    cc = c.fields.col,
    chc = self.fields.col,
    chr = self.fields.row;

  if(!(sameRC = _.isEqual(cr, chr) && _.isEqual(cc, chc)) &&
    !(swapRC = _.isEqual(cc, chr) && _.isEqual(cr, chc))
  ){
    // if(!sameRC) console.log('!sameRC', cc, chc,",", cr, chr);
    // if(!swapRC) console.log('!swapRC', cr, chc,",", cc, chr);
    return false;
  }

  // if(sameRC) console.log('sameRC', cc, chc, cr, chr);
  // else if(swapRC) console.log('swapRC', cr, chc, cc, chr);
  return true; // return (sameXY || swapXY) && (sameRC || swapRC)
};

Chart.countFields = function(fields){
  return _.reduce(fields, function(sum,l){
    return sum+l.length;
  },0);
};

function fieldShort(field){
  return this.isAggregated && dt.isType(field.dataType, dt.aggregate)  ? "@"+field.key : field.key;
}

prototype.toShorthand = function(){
  var self = this;
  return this.chart_type + CHART_TYPE_SPLIT +
    _.map(this.fields, function(fields, encoding){
      return encoding + ENCODING_SPLIT + fields.map(fieldShort,self).join(FIELDS_SPLIT);
    }).join(ENCODINGS_SPLIT);
};

Chart.toShorthand = function(chart){
  return prototype.toShorthand.apply(chart);
};

Chart.fromShorthand = function(shorthand){
  var s = shorthand.split("--"),
    chart_type = s[0],
    count = 0,
    fields = _.reduce(s[1].split(ENCODINGS_SPLIT),function(m, encoding){
      var es = encoding.split(ENCODING_SPLIT);
      m[es[0]] = es[1].split(FIELDS_SPLIT); //TODO allow specifying other properties
      count += m[es[0]].length;
      return m;
    },{});

  //TODO support Q*, /, &
  return [new Chart(chart_type, fields, count)];
};

var c = Chart.fromShorthand("MAP--geo:G1;color:Q1");
console.log(c);

module.exports = Chart;