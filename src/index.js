require(['d3', 'vega', 'vegalite', 'lodash', 'visgen'],function(d3, vg, vl, _, vgn){
  var schema, col_indices;

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
  });

  // TODO: use other lib to load csv as columns?
  // TODO: regenerate csv with all columns
  d3.csv("data/birdstrikes/birdstrikes-header-reformatted.csv", function(data) {
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

    var selectedColIndicesSet = [
      // [10], //Q
      [6,5], //CxQ
      //[6,10], //CxQ
      //[6,8], //Cx#
      //[2,3], //C(Big)xQ
      //[4,5], //QxQ
      //// [7,8], //Dx#
      //[6,11,5], //CxCxQ
      //[6,5,4], //CxQxQ
      //// [6,5,10] //CxQxQ //TODO: speed might be problematic
      //// [6,8,5] //Cx#xG
    ];
    var visIdCounter = 0;

    selectedColIndicesSet.forEach(function(selectedColIndices, groupId){
      var selectedCols = selectedColIndices.map(function(i){ return schema[i];}),
        selectedColNames = _.pluck(selectedCols, 'field_name'),
        selectedColTypes = _.pluck(selectedCols, 'data_type');

      // ----- Generate Charts -----
      //TODO(kanitw): change schema format to match
      var fields = selectedCols.map(function(col){
        return {
          name: col.key,
          type: getDVType(col.data_type)
        }
      });

      console.log('fields', JSON.stringify(fields));

      //TODO(kanitw): generate a list of charts and rank
      var chartGroups = vgn.generateCharts(fields, null, {
        width: 300, height: 300
      });
      //console.log('charts', charts);

      // ----- render results -----

      var content = d3.select("#content");
      content.append("h2").text(selectedColNames.join(","));

      chartGroups.forEach(function (chartGroup) {
        var chartGroupDiv = content.append("div")
          .attr("id", "group-"-groupId)
          .style({
            "background-color":"#eee",
            "class": "row"
          }, "#eee");

        chartGroup.forEach(function(chart){
          // console.log('chart', chart, chart.toShorthand());
          var id = 'vis-' + (visIdCounter++),
            encoding = vl.Encoding.parseJSON(chart);

          //console.log('id', id);

          var spec = vl.toVegaSpec(encoding, data);

          var chartDiv = chartGroupDiv.append("div")
            .style({"min-height": "325px", "class": "span4"})
            .attr("id", id)
            .text(encoding.toJSON());

          chartDiv.append("div")
            .text(JSON.stringify(spec, null, 2))
            .classed("hide spec", true);

          if(spec){
            vg.parse.spec(spec, function(vgChart){
              vgChart({el: '#'+id, renderer: "svg"}).data({
                table: data
              }).update();
            });
          }
        });
      });




    });

  });
})