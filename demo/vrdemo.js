// Define module using Universal Module Definition pattern
// https://github.com/umdjs/umd/blob/master/returnExports.js

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['d3', 'vega', 'vega-lite', 'lodash', 'visrec'],factory);
  } else if (typeof exports === 'object') {
    // Node. Does not work with strict CommonJS, but
    // only CommonJS-like environments that support module.exports,
    // like Node.
    module.exports = factory(
      require('d3'),
      require('vega'),
      require('vega-lite'),
      require('lodash'),
      require('visrec')
    );
  } else {
    // Browser globals (root is window)
    factory(root.d3, root.vg, root.vl, root._, root.vr);
  }
}(this, function(d3, vg, vl, _, vr){
  var schema, col_indices;

  var HEIGHT_OFFSET = 60, MAX_HEIGHT = 500, MAX_WIDTH = 500;

  var CONFIG = {
    showTable: false,

    genAggr: true,
    genBin: true,
    genTypeCasting: false,

    omitTranpose: true,
    omitDotPlotWithExtraEncoding: true,
    omitAggrWithAllDimsOnFacets: true
  }

  var keys = vg.keys;


  function getVLType(data_type){
    // return vega-lite's data type
    var typeMap = {
      "categorical": "O",
      "geographic": "G",
      "quantitative": "Q",
      "datetime": "T",
      "count": "Q"
    };
    return typeMap[data_type];
  }

  function init(){
    // d3.select("#toggle-presets").on("click", function(){
    //   var hide = d3.select("#presets").classed("hide")
    //   d3.select("#presets").classed("hide", !hide);
    // });

    d3.select("#toggle-config").on("click", function(){
      var hide = d3.select("#config").classed("hide")
      d3.select("#config").classed("hide", !hide);
    });

    var configs = d3.select("#config").selectAll("div.cfg")
      .data(vl.keys(CONFIG))
      .enter().append("div").attr("class", "cfg")
        .append("label");

    configs.append("input").attr("type","checkbox").attr("class","cfg-check")
      .attr("checked", function(d){ return CONFIG[d] || undefined;})
      .on("change", updateSelectedFields);


    configs.append("span").attr("class","label config").text(function(d){return d;});

    loadSchema();
  }

  function getConfig(){
    var config = {};
    d3.select("#config").selectAll("div.cfg input.cfg-check")
      .each(function(d){
        config[d] = d3.select(this).node().checked;
      });

    console.log("config", config);
    return config;
  }

  // ----- load schema -----
  function loadSchema(){
    //TODO: use amd-plugin to load json, csv
    d3.json("data/birdstrikes/birdstrikes-schema.json", function(_schema) {
      //TODO: remove this line after updating csv.
      schema = _(_schema).filter(function(d){ return !d.disabled;})
        .sortBy('field_name')
        .sortBy(function(col){
          return getVLType(col.data_type) !== "Q" ? 0 :
            col.data_type === "count" ? 2 : 1 ;
        })
        .map(function(col, i){
          col.key = col['field_name'].replace(/(: )/g, "__").replace(/[\/ ]/g,"_").replace(/[()]/g, "");
          col.index = i; //add index
          return col;
        })
        .value();

      col_indices = _.reduce(schema, function(result, col, i){ result[col] = i; return result;}, {});

      console.log('schema keys', _.pluck(schema,'key').sort());
      console.log('data_types', _(schema).pluck('data_type').uniq().value());
      loadData();
    });
  }

  function updateSelectedFields(){
    var selectedColIndices = [];

    d3.selectAll("#datacols input.datacol").each(function(d, i){
      var selected = d3.select(this).node().checked;
      if(selected){
        selectedColIndices.push(d.index);
      }
    });

    renderMain(selectedColIndices);
  }

  function loadData(){
    // TODO: use other lib to load csv as columns?
    // TODO: regenerate csv with all columns
    d3.json("data/birdstrikes.json", function(data) {
      self.data = data;
      console.log("keys", vg.keys(data[0]));
      renderColumns();
    });
  }

  function renderColumns(){
    var datacols = d3.select("#datacols").selectAll("div")
      .data(schema).enter().append("div").append("label");

    datacols.append("input").attr("type","checkbox").attr("class","datacol")
      .on("change", updateSelectedFields);

    datacols.append("span").attr("class","type").text(function(d){
      return "["+getVLType(d.data_type)+"] ";
    });

    datacols.append("span").attr("class","name").html(function(d){
      return d.field_name;
    });

    // -----  Assume User Selection here -----

    // 0:O "Aircraft: Airline/Operator"
    // 1:O "Aircraft: Make/Model"
    // 2:O "Airport: Name"
    // 3:Q "Cost: Other"
    // 4:Q "Cost: Repair"
    // 5:Q "Cost: Total $"
    // 6:O "Effect: Amount of damage"
    // 7:T "Flight Date"
    // 8:# "Number of Strikes"
    // 9:G "Origin State"
    // 10:Q "Speed (IAS) in knots"
    // 11:O "When: Phase of flight"
    // 12:O "When: Time of day"
    // 13:O "Wildlife: Size"
    // 14:O "Wildlife: Species"

    // var colIndicesSet = [
    //   [6,5,4], //CxQxQ -- good except some bar + size
    //   [6,11,5], //CxCxQ
    //   [6,8], //Cx#
    //   [2,3], //C(Big)xQ
    //   [6, 10], //CxQ
    //   [6,8,5], //Cx#xG
    //   [10], //Q
    //   // [4,5], //QxQ
    //   // [7,8], //Dx#
    //   // [11,12,13], //OxOxO //FIXME
    //   //// [6,5,10] //CxQxQ //TODO: speed might be problematic
    // ];

    // var control = d3.select("#control");

    // var dsel = control.append("select")
    //   .attr("class", "data")
    //   .style("width", "300px")
    //   .on("change", function(){
    //     var index = this.options[this.selectedIndex].value;
    //     render(colIndicesSet[index])
    //   })
    //   .selectAll("option").data(colIndicesSet)
    //   .enter().append("option")
    //     .attr("value", function(d, i){ return i;})
    //     .attr("selected", function(d,i){ return i==0? true : undefined;})
    //     .text(function(d, i){ return getTitle(d);});

    // render(colIndicesSet[0])
  }

  function fieldDetailHtml(v){
    return "<b>" +
      "<span class='fn'>" +
      (v.aggr ? v.aggr : "") +
      (v.bin ? " bin " : "") +
      "</span>" +
      "<span class='name'>" +
      (v.name || "") +
      "</span>" +
      "</b> ("+ v.type + ")";
  }

  function encodingDetails(enc, div){
    div.append("div").html("marktype: <b>"+enc.marktype()+"</b>");
    enc.forEach(function(k, v){
      div.append("div").html(k+": "+fieldDetailHtml(v, vl.dataTypeNames[v.type]))
    });
  }

  function getTitle(colIndices){
    var cols = colIndices.map(function(i){ return schema[i];});

    return cols.map(function(col){
      return col['field_name'] + " [" + col['data_type'][0] +"]";
    }).join(",");
  }

  function getChartsByFieldSet(fields) {
    var config = getConfig();
    var aggr = vr.gen.aggregates([], fields, config);
    var chartsByFieldset = aggr.map(function (fields) {
      var encodings = vr.gen.charts(fields,
        vl.merge(Object.create(config), {genAggr: false}),
        {
          dataUrl: "data/birdstrikes.json",
          viewport: [460, 460],
          genAggr: false
        },
        true
      ).map(function (e) { //add score
          var score = vr.rank.encodingScore(e);
          e.score = score.score;
          e.scoreFeatures = score.features;
          return e;
        });

      var diff = vr.cluster.distanceTable(encodings),
        clusters = vr.cluster(encodings, 2.5)
          .map(function (cluster) {
            return cluster.sort(function (i, j) {
              return encodings[j].score - encodings[i].score;
            });
          })
          .sort(function (c1, c2) {
            return encodings[c2[0]].score - encodings[c1[0]].score;
          });

      //console.log("clusters", clusters);

      return {
        fields: fields,
        encodings: encodings,
        diff: diff,
        clusters: clusters
      };

    })
    return chartsByFieldset;
  }

  function renderMain(selectedColIndices){
    if(selectedColIndices.length === 0) return;

    var selectedCols = selectedColIndices.map(function(i){ return schema[i];}),
      selectedColNames = _.pluck(selectedCols, 'field_name'),
      selectedColTypes = _.pluck(selectedCols, 'data_type');

    // ----- Generate Charts -----
    //TODO(kanitw): change schema format to match
    var fields = selectedCols.map(function(col){
      if(col.data_type == "count"){
        return {aggr: "count", name:"*"};
      }
      var type = getVLType(col.data_type), f;
      switch(type){

        case "Q":
          f = {name: col.key, type: "Q", _aggr:"*", _bin:"*"}
          return f;
        case "O":
        default:
          return {name: col.key, type:"O"};
      }
    });

    console.log('fields', JSON.stringify(fields));

    var chartsByFieldSet = getChartsByFieldSet(fields);

    d3.select("#aggr").selectAll("*").remove();
    d3.select("#vis").selectAll("*").remove();
    d3.select("#selected-fields").selectAll("*").remove();

    var aggrTable = d3.select("#aggr").selectAll("div.fieldset");

    var enter = aggrTable.data(chartsByFieldSet).enter()
      .append("div").attr("class", "fieldset");

    // data fields
    enter.append("div").attr("class", "datafields")
      .selectAll("div.datafield").data(function(d){return d.fields;})
      .enter().append("div").attr("class", "datafield")
      .html(fieldDetailHtml);

    // top vis
    enter.append("div").attr("class","topvis")
      .each(renderTopVis);

    enter.append("div").attr("class", "select")
      .append("a").attr("href","#")
        .text(function(d){
          return d.encodings.length > 1 ? "Expand ("+d.encodings.length+")" : "";
        })
        .on('click', function(d){
          renderEncodingVariations(d)
        });

    // console.log("chartsByFieldset", chartsByFieldset);
    // chartsByFieldset.forEach(renderCharts);
  }

  var topVisId = 0; //HACK

  function renderTopVis(charts){
    var container = d3.select(this),
      clusters = charts.clusters,
      encodings = charts.encodings;

    if(clusters.length == 0 || clusters[0].length===0) return;

    var id = "topvis-" + (topVisId++);

    var topIdx = clusters[0][0],
      encoding = vl.Encoding.fromSpec(encodings[topIdx]),
      stats = vl.data.getStats(data),
      spec = vl.compile(encoding, stats);

    //console.log(JSON.stringify(spec, null, "  "));

    appendVis(container, encoding, spec, id);
  }

  function appendVis(container, encoding, spec, id){
    container.append("div").attr("id", id)
      .style({
        "height": Math.min(+spec.height + HEIGHT_OFFSET, MAX_HEIGHT) + "px",
        "max-width": MAX_WIDTH+"px",
        "overflow": "scroll"
      });

    if (spec){
      vg.parse.spec(spec, function (vgChart) {
        var vis = vgChart({el: '#' + id});
        vis.update();
        vis.on("mouseover", function(event, item) {
          console.log(item);
        });
      });
    }

    container.append("input").attr({"readonly":1, value: encoding.toShorthand(), class:"shorthand"})
      .style("font-size", "12px");
  }

  function renderEncodingVariations(charts, groupId) {
    var encodings = charts.encodings,
      diff = charts.diff,
      clusters = charts.clusters;

    var dataFields = d3.select("#selected-fields"),
      content = d3.select("#vis");

    content.selectAll("*").remove();
    dataFields.selectAll("*").remove();

    dataFields.selectAll("div.datafield").data(charts.fields)
      .enter().append("div").attr("class", "datafield")
      .html(fieldDetailHtml);

    var visIdCounter=0;

    if(CONFIG.showTable){
      renderDistanceTable(content, diff);
    }

    clusters.forEach(function (clusterIndices) {
      var cluster = clusterIndices.map(function (i) {
        var e = encodings[i],
          encoding = vl.Encoding.parseJSON(e),
          stats = vl.getStats(data),
          spec = vl.toVegaSpec(encoding, stats);
        return {
          encodingJson: e,
          encoding: encoding,
          spec: spec,
          i: i
        };
      });

      var clusterHeight = cluster.reduce(function (h, c) {
        var nh = Math.min(+c.spec.height + HEIGHT_OFFSET, MAX_HEIGHT)+120;
        return nh > h ? nh : h;
      }, 0)

      var chartGroupDiv = content.append("div")
        .attr("id", "group")
        .attr("class", "row")
        .style({
          "background-color": "#fcfcfc",
          "overflow-x": "scroll",
          "overflow-y": "hidden",
          "margin-bottom": "20px",
          "white-space": "nowrap",
          "height": clusterHeight + "px"
        });

      cluster.forEach(function (o, i) {
        if(CONFIG.showOnlyClusterTop && i>0) return;
        // console.log('chart', chart, chart.toShorthand());
        var encodingJson = o.encodingJson,
          i = o.i,
          id = 'vis-' + groupId + "-" + (visIdCounter++),
          encoding = o.encoding,
          spec = o.spec;

        var chartDiv = chartGroupDiv.append("div")
          .style({
            "display": "inline-block",
            "margin-right": "10px",
            "vertical-align": "top"
          })
        var detail = chartDiv.append("div").text("id:"+i+", score:"+encodingJson.score).append("div");
        encodingDetails(encoding, detail);

        appendVis(chartDiv, encoding, spec, id);
      });
    })
  }

  function renderDistanceTable(content, diff) {
    var table = content.append("table");
    var headerRow = table.append("tr").attr("class", "header-row");
    headerRow.append("th");
    headerRow.selectAll("th.item-col").data(diff)
      .enter().append("th").attr("class", "item-col")
      .append("b").text(function (d, i) {
        return "" + i;
      });

    var rows = table.selectAll("tr.item-row")
      .data(diff)
      .enter().append("tr").attr("class", "item-row");

    rows.append("td").append("b").text(function (d, i) {
      return i;
    });
    rows.selectAll("td.item-cell")
      .data(_.identity)
      .enter().append("td").attr("class", "item-cell")
      .style("text-align", "center")
      .style("border", "1px solid #ddd")
      .text(function (d) {
        return d ? d3.format('.2')(d) : "-";
      });
  }

  init();
}));