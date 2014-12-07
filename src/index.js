require(['d3', 'vega', 'vegalite', 'lodash', 'visgen'],function(d3, vg, vl, _, vgn){
  var schema, col_indices;

  var keys = vg.keys;

  //TODO: unify type system
  function getDVType(data_type){
    //return datavore's data type
    //var typeMap = {
    //  "categorical": dv.type.nominal,
    //  "date": dv.type.nominal, //TODO extend datavore to support date
    //  "geographic": dv.type.nominal, //TODO: extend datavore to support geographic
    //  "quantitative": dv.type.numeric,
    //  "count": dv.type.unknown //TODO how to best deal with this.
    //};

    // return vegalite's data type
    var typeMap = {
      "categorical": "O",
      "geographic": "G",
      "quantitative": "Q",
      "date": "T" //TODO: refactor this to datetime
    };
    return typeMap[data_type];
  }

  // ----- load schema -----
  function loadSchema(){
    //TODO: use amd-plugin to load json, csv
    d3.json("data/birdstrikes/birdstrikes-schema.json", function(_schema) {
      //TODO: remove this line after updating csv.
      schema = _(_schema).filter(function(col){ return col.enabled; })
        .sortBy('field_name')
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

  function encodingDetails(enc, div){
    div.append("div").html("marktype: <b>"+enc.marktype()+"</b>");
    enc.forEach(function(k, v){
      div.append("div").html(
        k+": <b>"+
        (v.aggr || "") +
        (v.bin ? " bin " : "") +
        v.name +
        "</b> ("+ vl.dataTypeNames[v.type] + ")")
    });
  }

  function loadData(){
    // TODO: use other lib to load csv as columns?
    // TODO: regenerate csv with all columns
    d3.csv("data/birdstrikes/birdstrikes-header-reformatted.csv", function(data) {
      self.data = data;
      console.log("keys", vg.keys(data[0]));
      //console.log("data#0", data[0]);
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

      // TODO(kanitw): extend this to support query transformation

      var colIndicesSet = [
        [6,11,5], //CxCxQ
        [6, 10], //CxQ
        [10], //Q
        [6,8], //Cx#
        // [2,3], //C(Big)xQ
        //[4,5], //QxQ
        //// [7,8], //Dx#
        [6,5,4], //CxQxQ
        // [11,12,13], //OxOxO //FIXME
        //// [6,5,10] //CxQxQ //TODO: speed might be problematic
        //// [6,8,5] //Cx#xG
      ];

      var control = d3.select("#control");

      var dsel = control.append("select").attr("class", "data")
        .on("change", function(){
          var index = this.options[this.selectedIndex].value;
          render(colIndicesSet[index])
        })
        .selectAll("option").data(colIndicesSet)
        .enter().append("option")
          .attr("value", function(d, i){ return i;})
          .attr("selected", function(d,i){ return i==0? true : undefined;})
          .text(function(d, i){ return getTitle(d);});

      render(colIndicesSet[0])
    });
  }

  function getTitle(colIndices){
    var cols = colIndices.map(function(i){ return schema[i];});

    return cols.map(function(col){
      return col['field_name'] + " [" + col['data_type'][0] +"]";
    }).join(",");
  }

  function render(selectedColIndices){
    var visIdCounter = 0;
    var selectedCols = selectedColIndices.map(function(i){ return schema[i];}),
      selectedColNames = _.pluck(selectedCols, 'field_name'),
      selectedColTypes = _.pluck(selectedCols, 'data_type');

    // ----- Generate Charts -----
    //TODO(kanitw): change schema format to match
    var fields = selectedCols.map(function(col){
      if(col.data_type == "count"){
        return {aggr: "count"};
      }
      return {
        name: col.key,
        type: getDVType(col.data_type)
      }
    });

    console.log('fields', JSON.stringify(fields));

    //TODO(kanitw): generate a list of charts and rank
    var charts = vgn.generateCharts(fields, null, {
      dataUrl: "data/birdstrikes.json",
      viewport: [460, 460]
    }, true);
    //console.log('charts', charts);

    // ----- render results -----

    var content = d3.select("#display");
    content.selectAll("*").remove();
    content.append("h2").text(getTitle(selectedColIndices));

    var diff = vgn.getDistanceTable(charts),
      clusters = vgn.cluster(charts, 2.5);

    var table = content.append("table");
    var headerRow = table.append("tr").attr("class","header-row");
    headerRow.append("th");
    headerRow.selectAll("th.item-col").data(diff)
      .enter().append("th").attr("class","item-col")
        .append("b").text(function(d, i){ return ""+i;});

    var rows = table.selectAll("tr.item-row")
      .data(diff)
      .enter().append("tr").attr("class", "item-row");

    rows.append("td").append("b").text(function(d,i){ return i;});
    rows.selectAll("td.item-cell")
      .data(_.identity)
      .enter().append("td").attr("class","item-cell")
      .style("text-align", "center")
      .style("border", "1px solid #ddd")
      .text(function(d){
        return d ? d3.format('.2')(d) : "-";
      });


    clusters.forEach(function(c){
      var cluster = c.map(function(i){
        return { chart: charts[i],i: i};
      });

      var chartGroupDiv = content.append("div")
          .attr("id", "group")
          .attr("class", "row")
          .style({
            "background-color": "#fcfcfc",
            "overflow-x":"scroll",
            "margin-bottom": "20px"
          });

      cluster.forEach(function(o, i){
        // console.log('chart', chart, chart.toShorthand());
        var chart=o.chart,
          i=o.i,
          id = 'vis-' + (visIdCounter++),
          encoding = vl.Encoding.parseJSON(chart);

        var spec = vl.toVegaSpec(encoding, data);

        var chartDiv = chartGroupDiv.append("div")
          .style("display", "inline-block")
        var detail = chartDiv.append("div").text(i).append("div");
        encodingDetails(encoding, detail);

        chartDiv.append("div")
          .attr("id", id)
          .style({"height": (+spec.height+40) +"px", "overflow":"hidden"})

        chartDiv.append("div")
          .text(JSON.stringify(spec, null, "  "))
          .classed("hide spec", true);

        if(spec){
          //console.log("rendering spec", spec);
          //console.log("rendering spec", id ,":", JSON.stringify(spec));
          vg.parse.spec(spec, function(vgChart){
            var vis = vgChart({el: '#'+id, renderer: "svg"});
            vis.update();
          });
        }
      });
    })

  }

  loadSchema();

})