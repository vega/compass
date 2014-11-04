require(['jquery','d3', 'dv', 'lodash',
    'chartTemplates', 'dataTypes', 'field', 'chart', 'vl'
  ],function($, d3, dv, _,
    chartTemplates, dt, field, Chart, vl){

  console.log('vl', vl);


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
    schema = _(_schema).filter(function(col){ return col.enabled; })
      .sortBy('field_name')
      .map(function(col, i){
        col.key = col.key.replace(/[^\w]/g, "");
        col.index = i; //add index
        return col;
      })
      .value();

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
          values: col.data_type == 'quantitative' ?
            data.map(function(row){ return +row[col.field_name];}) :
            _.pluck(data, col.field_name)
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

    // TODO(kanitw): extend this to support query transformation

    var selectedColIndicesSet = [[6,10], [2,3], [6,8,5], [4,5]],
      visIdCounter = 0;

    _.each(selectedColIndicesSet, function(selectedColIndices, groupId){
      var selectedCols = selectedColIndices.map(function(i){ return schema[i];}),
        selectedColNames = _.pluck(selectedCols, 'field_name'),
        selectedColTypes = _.pluck(selectedCols, 'data_type');

      // ----- Generate Charts -----
      //TODO(kanitw): change schema format to match
      var fields = field.fromColumnsSchema(selectedCols);
      //TODO(kanitw): generate a list of charts and rank
      var charts = chartTemplates.generateCharts(fields, true);

      // console.log('charts', charts);

      // ----- calculate query -----
      var dimensions = _.filter(selectedCols, function(col){
          return col.data_type !== 'quantitative' && col.data_type !== 'count';
        }),
        measures = _.filter(selectedCols, function(col){
          return col.data_type === 'quantitative'|| col.data_type === 'count';
        }),
        vals = measures.map(function(col){
          if(col.data_type === 'quantitative'){
            return dv.sum(col.index);
          } //else: col.data_type === "count"
          return dv.count();
        }),
        where = function(){return true}; //TODO(kanitw): support filter

      var filteredTable = table.where(where);
      var rowCount = filteredTable[0].length,
        rawData = _.range(rowCount).map(function(i){
          return _.reduce(selectedCols, function(row, col){
            row[col.key] = filteredTable.get(col.field_name, i);
            return row;
          }, {});
        });

      var colAggData = filteredTable.query({
          dims: _.pluck(dimensions, 'index'),
          vals: vals
        }),
        aggRowCount = colAggData[0].length,
        aggregatedData = _.range(aggRowCount).map(function(i){
          var colKeys = _.pluck(dimensions, 'key').concat(
              _.pluck(measures, 'key'));
          return _.reduce(colKeys, function(row, key, j){
            row[key] = colAggData[j][i];
            return row;
          }, {});
        });

      // console.log('rawData', JSON.stringify(rawData));
      // console.log('aggregatedData', JSON.stringify(aggregatedData));

      // ----- render results -----

      $('#content').append('<h2>' + selectedColNames.join(",") + '</h2>');
      $('#content').append('<div class="row" id="group-'+groupId+'"></div>');
      var group = $('#group-'+groupId);

      var block =

      _.each(charts, function(chart){
        // console.log('chart', chart, chart.toShorthand());
        var id = 'vis-' + (visIdCounter++) ;

        group.append('<div class="span4" style="min-height:275px" id="' + id +'"">' + chart.toShorthand() + '</p>');

        vl.parse(chart, schema, chart.isAggregated ? aggregatedData : rawData, '#'+id);
      })
    });

  });
})