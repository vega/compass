"use strict";

/* global _, console, queue, d3, dv, alert, $ */

if (typeof String.prototype.startsWith != 'function') {
  String.prototype.startsWith = function (str){
    return this.slice(0, str.length) == str;
  };
}

var datafile = "data/movies.json", table;

var self = {};

function range(start, end) {
    var foo = [];
    for (var i = start; i < end; i++) {
        foo.push(i);
    }
    return foo;
}

var concat = function(a,b){return a.concat(b);};
// var getRColNames = function(formulae){
//   var keys = _(formulae).map(function(f){
//     var split = f.split("~");
//     var all = split[1].split("+");
//     all.push(split[0]);
//     return all;
//   }).reduce(concat).map(function(a){return a.trim();});
//   return _.uniq(keys);
// };

/**
 * Convert column names into R format's column names.
 * @param  {String} column name
 * @return {String} formatted name
 */
var convertName = function(name){
  return name.replace(/\ /g,".").replace(/\(/g,".").replace(/\)/g,".");
};

var getValue = function(summary, prop, extra_prop, isCat){
  var out = summary;
  for(var i=0; i<prop.length && out ; ++i) out = out[prop[i]];
  if(out && extra_prop){
    if(isCat){
      var outKeys = _.keys(out).filter(function(s){return s.startsWith(extra_prop)});
      var oldOut = out;
      out = {}
      for(var j=0;j<outKeys.length ; j++){
        out[outKeys[j]] = oldOut[outKeys[j]];
      }
    }else
      out = out[extra_prop];
  }
  return out;
};
/**
 * [getValueTable description]
 * @param  {String(Json)} json
 * @param  {dv.table()} table
 * @param  {String} prop properties name e.g. ['coefs','Estimate'], ['df.df']
 * @param  {enum} type
 * @return Table Values
 */
var getValueTable = function(summariesMap, data, prop, type){
  var type = type || "sl"; //assign default values
  self.data= data;

  var formulae = _.keys(summariesMap);
  var formulaeByDepVar = _.groupBy(formulae, function(f){ return f.split("~")[0].trim();});

  //kanitw: This part can be improve in terms of performance.
  if(type[0]=="s"){
    // for simple output table
    _(formulaeByDepVar).each(function(formulae,ind_var, map){
      var obj = {};
      _.each(formulae, function(f){ obj[f.split("~")[1].trim()] = f;});
      map[ind_var] = obj;
    });
  }
  var i, j, N=data.length, valueTable = [];
  var cols = range(0,N-1);
  var rows = range(0,N-1);
  rows = _.filter(rows, function(i){ return data[i].type==="numeric"; });
  if(type==="sl"||type==="ll"){
    cols = _.filter(cols, function(i){ return data[i].type==="numeric"; });
  }

  if(prop[0] === "coefs"){
    for(var ii=0; ii< rows.length ; ++ii){
      i = rows[ii];
      for(var jj=0; jj<cols.length; ++jj){
        j = cols[jj];
        if(i==j) continue;
        var iName = data[i].rName, jName=data[j].rName;
        var formula = (formulaeByDepVar[iName]||{});
        if(type[0]=="s") formula = formula[jName];
        else formula = formula[0];
        if(formula){
          var extra_prop  = (prop[0] === "coefs" && type[0]=="l") ? jName : null;
          var isCat = data[j].type!="numeric";
          var value = getValue(summariesMap[formula],prop, extra_prop,isCat);
          if(!value && i!=j && formula && extra_prop != "Title"){
            console.log("value null!",type, formula, prop, extra_prop, isCat);
          }

          valueTable.push({
            idx1: j,
            idx2: i,
            name1: data[j].name,
            type1: data[j].type,
            name2: data[i].name,
            type2: data[i].type,
            value: value
          });
        }else if (i!=j) console.log("formula null!", type, iName, jName);
      }
    }
  }
  return valueTable;
};

queue()
  .defer(d3.json, datafile)
  .defer(d3.json, "movies-out/simple_linear.json")
  .defer(d3.json, "movies-out/simple_linear_all.json")
  .defer(d3.json, "movies-out/long_linear.json")
  .defer(d3.json, "movies-out/long_linear_all.json")
  .await(function(err, data, sl, sla, ll,lla) {
    if (err) {
      console.log(err);
      alert(err);
      return;
    }
    // var rColNames = getRColNames(Object.keys(sla));

    var models = {sl:sl, sla:sla, ll:ll, lla:lla};

    //create data table
    table = dv.table();
    var idx = 0;
    data.forEach(function(c, i, data){
      console.log(c);
      data[i].rName = convertName(c.name);
      // self.rNameMap[c.name] = convertName(c.name); // Add R format column name
      makeColumns(c).forEach(function(c) {
        console.log((idx++) + ": " + c.name + " | " + c.vals.lut.length);
        table.addColumn(c.name, c.vals, null, true);
      });
    });

    console.log("TABLE", table.rows());

    var i, j, N = table.cols(), dist = [];
    for (i=0; i<N; ++i) {
      for (j=i+1; j<N; ++j) {
        dist.push({
          idx1:  i,
          idx2:  j,
          name1: table[i].name,
          name2: table[j].name,
          dist:  distance(table, i, j)
        });
      }
    }

    var matrix = dist.reduce(function(a, d) {
      // make symmetric
      a.push(d);
      a.push({idx1:d.idx2, idx2:d.idx1, name1:d.name2, name2:d.name1, dist:d.dist});
      return a;
    }, []);
    self.matrix = matrix;
    show(matrix);

    self.valueTables = {};
    _.each(models, function(model_data, model){
      self.valueTables[model] = {};
      _.each(["coefs->Estimate", "fstatistic", "r.squared", "df"], function(propName){
        var prop = propName.split("->");

        self.valueTables[model][propName] = getValueTable(model_data, data, prop, model);
      });
    });



  });

function makeColumns(col) {
  var name = col.name,
      type = col.type || dv.type.unknown,
      data = col.values;

  var cols;
  if (type === "numeric") {
    cols = [
      {
        name: name+":bin20",
        vals: bin(data, 20)
      }
    ];
  } else if (type === "date") {
    var dates = data.map(function(v) { return new Date(v); });
    cols = [
      {
        name: name+":year", // year
        vals: dates.map(function(d) { return d.getFullYear(); })
      },
      {
        name: name+":month", // months
        vals: dates.map(function(d) { return d.getMonth(); })
      },
      {
        name: name+":day", // day of week
        vals: dates.map(function(d) { return d.getDay(); })
      }
    ];
  } else {
    cols = [
      {
        name: name,
        vals: data
      }
    ];
  }

  cols.forEach(function(c) { c.vals = column(c.vals); });
  return cols;
}

// -- MAP VALUES TO INTEGER CODES
// Datavore can do this for us, but we take care of it manually here

function column(values) {
  var vals = [];
  vals.lut = code(values);
  for (var i=0, map=dict(vals.lut); i < values.length; ++i) {
    vals.push(map[values[i]]);
  }
  vals.get = function(idx) { return this.lut[this[idx]]; };
  return vals;
}

/** @private */
function code(a) {
  var c = [], d = {}, v;
  for (var i=0, len=a.length; i<len; ++i) {
    if (d[v=a[i]] === undefined) {
      d[v] = 1;
      c.push(v);
    }
  }
  return typeof(c[0]) !== "number"
    ? c.sort()
    : c.sort(function(a,b) { return a - b; });
};

/** @private */
function dict(lut) {
  return lut.reduce(function(a,b,i) { a[b] = i; return a; }, {});
};

// -- BINNING
// Given a numeric variable, discretize it into bins

function bin(values, bins, min, max, step) {
  var bmin = min !== undefined,
      bmax = max !== undefined;
  min = bmin ? min : minval(values);
  max = bmax ? max : maxval(values);
  var span = max - min, s, def;

  /* Special case: empty, invalid or infinite span. */
  if (!span || !isFinite(span)) {
    def = [min, min, 1];
  } else {
    s = Math.pow(10, Math.round(Math.log(span) / Math.log(10)) - 1),
    def = [Math.floor(min/s) * s, Math.ceil(max/s) * s];
    if (bmin) def[0] = min;
    if (bmax) def[1] = max;
    span = def[1] - def[0];

    if (step === undefined) {
      step = logFloor(span / bins, 10);
      var err = bins / (span / step);
      if (err <= .15) step *= 10;
      else if (err <= .35) step *= 5;
      else if (err <= .75) step *= 2;
    }
    def.push(step);
  }

  var range = def[1] - def[0],
      step  = def[2],
      uniq  = Math.ceil(range / step),
      i, v, a = [], N = values.length, idx;
  for (i=0; i<N; ++i) {
    v = values[i];
    if (v == null) {
      idx = unique;
    } else if (v < def[0] || v > def[1])
      idx = -1;
    else if (v == def[1]) {
      idx = uniq - 1;
    } else {
      idx = ~~((v-def[0]) / step);
    }
    a.push(idx);
  }

  return a;
}

function minval(x) {
  var m = Infinity, i=0, l=x.length, v;
  for (; i<l; ++i){
    v = x[i];
    if (v < m) m = v;
  }
  return m;
}

function maxval(x) {
  var m = -Infinity, i=0, l=x.length, v;
  for (; i<l; ++i){
    v = x[i];
    if (v > m) m = v;
  }
  return m;
}

function logFloor(x, b) {
  return (x > 0)
    ? Math.pow(b, Math.floor(Math.log(x) / Math.log(b)))
    : -Math.pow(b, -Math.floor(-Math.log(-x) / Math.log(b)));
}

// -- MUTUAL INFORMATION
// Given two discrete distributions, compare them

function distance(t, i, j) {
  var data = t.query({
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
    if (z[i] === 0) continue;
    p = (s * z[i]) / (px[x[i]] * py[y[i]]);
    I += z[i] * t * Math.log(p);
  }
  px = entropy(px);
  py = entropy(py);
  return 1.0 - I / (px > py ? px : py);
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

// -- VISUALIZE
// Show a distance matrix


function getTableValue(d, tableType, selectedVar){
  if(tableType=="D"){
    return d.dist;
  }else if(tableType=="sl" || tableType=="sla"){
    return _.values(d.value)[1];
  }else{
    if(d.type1=="numeric"){
      return d.value;
    }
    return _.max(_.values(d.value),0);
  }
}

function show(mat, tableType, selectedVar) {
  self.mat = mat;//FIXME remove this after debugging!
  tableType = tableType || "D";

  console.log("mat=",mat ,'tableType=', tableType, "selectedVar=", selectedVar);

  var N = d3.max(mat, function(d) { return d.idx1; }) + 1,
      s = 10,
      w = N*s,
      h = N*s,
      m = 160;



  var cmin = tableType ==="D" ? d3.min(mat, function(d) { return getTableValue(d, tableType, selectedVar); }) :0;
  var cmax = d3.max(mat, function(d) { return getTableValue(d, tableType, selectedVar); });

  console.log("cmin=",cmin, " cmax=", cmax);

  var c;
  if(tableType=="D"){
    c = d3.scale.pow()
    .exponent(6)
    .domain([cmin, cmax])
    .range(["steelblue", "#efefef"]);
  }else{
    c = d3.scale.linear().domain([cmin, cmax]).range(["#efefef","steelblue"]);
  }

  d3.select("#left svg").remove();
  var svg = d3.select("#left").append("svg")
    .attr("width", w+m)
    .attr("height", h+m);

  var g = svg.append("g")
    .attr("transform", "translate("+(m-1)+","+(m-1)+")");

  g.selectAll("rect")
    .data(mat)
   .enter().append("rect")
    .attr("x", function(d) { return d.idx1 * s; })
    .attr("y", function(d) { return d.idx2 * s; })
    .attr("width", s)
    .attr("height", s)
    .style("fill", function(d) { return c(getTableValue(d, tableType, selectedVar)); })
   .append("title")
    .text(function(d) {
      var tableValue = getTableValue(d, tableType, selectedVar);
      if(!tableValue) console.log("-",d.value, d.type2);
      return (tableValue || "-")+ " " + d.name2 + " ~ " + d.name1;
    });

  var cols;
  // if(tableType=="D"){
  //   cols = mat.filter(function(d) { return d.idx1 === 0 || d.idx1 == 1 && d.idx2 === 0; });
  // }else{
    cols = _.map(_.groupBy(mat, "idx1"), 0); //select on per each col
  // }

  g.selectAll("text.left")
    .data(cols)
   .enter().append("text")
    .attr("x", 0)
    .attr("y", function(d) { return d.idx1 * s; })
    .attr("dx", -2)
    .attr("dy", "0.78em")
    .attr("text-anchor", "end")
    .text(function(d) { return d.name1; })
    .style("font", "9px Helvetica Neue");

  g.selectAll("text.top")
    .data(cols)
   .enter().append("g")
    .attr("transform", function(d) { return "translate("+(d.idx1*s)+",0)"; })
   .append("text")
    .attr("dx", 2)
    .attr("dy", "0.78em")
    .attr("text-anchor", "start")
    .attr("transform", "rotate(-90)")
    .text(function(d) { return d.name1; })
    .style("font", "9px Helvetica Neue");
}
$(function(){
  var onChange = function(){
    var type = $("#vartype").val();
    var propName = $("#proptype").val();
    if(type=="D"){
      show(self.matrix)
    }else{
      console.log("onChange", type, propName);

      show(self.valueTables[type][propName], type, propName);
    }
  };
  $("#vartype").on("change", onChange);
  $("#proptype").on("change", onChange);
});