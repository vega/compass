require(['jquery','d3', 'dv', 'lodash',
    'chartTemplates', 'dataTypes', 'field', 'chart', 'vl'
  ],function($, d3, dv, _,
    chartTemplates, dt, field, Chart, vl){


  var table, schema, col_indices;

  //TODO: unify type system
  function getDVType(data_type){
    //return datavore's data type
    var typeMap = {
      "categorical": dv.type.nominal,
      "date": dv.type.nominal, //TODO extend datavore to support date
      "geographic": dv.type.nominal, //TODO: extend datavore to support geographic
      "quantitative": dv.type.numeric,
      "count": dv.type.unknown //TODO how to best deal with this.
    }
    return typeMap[data_type];
  }

  // ----- load schema -----
  //TODO: use something else to load json, csv
  //amd-plugin
  d3.json("/data/birdstrikes/birdstrikes-schema.json", function(_schema) {
    //TODO: remove this line after updating csv.
    schema = _(_schema).filter(function(r){ return r.enabled; })
      .sortBy('field_name').value();

    col_indices = _.reduce(schema, function(result, col, i){ result[col] = i; return result;}, {});

    console.log('keys', _.pluck(schema,'field_name').sort());
    console.log('data_types', _(schema).pluck('data_type').uniq().value());
  });

  // TODO: use other lib to load csv as columns?
  // TODO: regenerate csv with all columns
  d3.csv("/data/birdstrikes/birdstrikes.csv", function(data) {
    var schema_names = _.pluck(schema,'field_name'),
      col_names = _.keys(data[0]).sort(),
      data_cols = schema.map(function(col){
        return {
          name: col.field_name,
          type: getDVType(col.data_type),
          values: _.pluck(data, col.field_name)
        }
      });

    // check if column names match
    _.each(schema_names, function(n,i){
      if(n != col_names[i]) console.log(n, '!=', col_names[i]);
    });

    // ----- create datavore table -----
    table = dv.table(data_cols);

    // -----  Assume User Selection here -----

    // 0: "Aircraft: Airline/Operator"
    // 1: "Aircraft: Make/Model"
    // 2: "Airport: Name"
    // 3: "Cost: Other"
    // 4: "Cost: Repair"
    // 5: "Cost: Total $"
    // 6: "Effect: Amount of damage"
    // 7: "Flight Date"
    // 8: "Number of Strikes"
    // 9: "Origin State"
    // 10: "Speed (IAS) in knots"
    // 11: "When: Phase of flight"
    // 12: "When: Time of day"
    // 13: "Wildlife: Size"
    // 14: "Wildlife: Species"

    var selectedColIndicesSet = [[6,8,10], [6,10], [2,10]];

    _.each(selectedColIndicesSet, function(selectedColIndices){
      var selectedCols = selectedColIndices.map(function(i){ return schema[i];}),
        selectedColNames = _.pluck(selectedCols, 'field_name'),
        selectedColTypes = _.pluck(selectedCols, 'data_type');

      // ----- Generate Charts -----
      // TODO: change schema format to match
      var fields = field.fromColumnsSchema(selectedCols);
      // TODO: generate a list of charts and rank
      var charts = chartTemplates.generateCharts(fields, true);

      console.log('charts', charts);

      // ----- calculate query -----

      // TODO: append placeholder and run generate vega spec for these files
      // $('#content').append('<p>' + chart.toShorthand() + '</p>');
      //
      $('#content').append('<h2>' + selectedColNames.join(",") + '</h2>');

      _.each(charts, function(chart){
        console.log('chart', chart, chart.toShorthand());
        $('#content').append('<p>' + chart.toShorthand() + '</p>');
      })
    });

  });
})