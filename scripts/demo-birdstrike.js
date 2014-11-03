require(['jquery','d3', 'dv', 'lodash'],function($, d3, dv, _){
  var table, schema;

  function getType(data_type){
    var typeMap = {
      "categorical": dv.type.nominal,
      "date": dv.type.nominal, //TODO extend datavore to support date
      "geographic": dv.type.nominal, //TODO: extend datavore to support geographic
      "quantitative": dv.type.numeric,
      "count": dv.type.unknown //TODO how to best deal with this.
    }
    return typeMap[data_type];
  }

  // load schema
  d3.json("/data/birdstrikes/birdstrikes-schema.json", function(_schema) {
    //TODO: remove this line after updating csv.
    schema = _.filter(_schema, function(r){ return r.enabled; });
    console.log('keys', _.pluck(schema,'field_name').sort());
    console.log('data_types', _(schema).pluck('data_type').uniq().value());
  });

  // TODO: use other lib to load csv as columns?
  // TODO: regenerate csv with all columns
  d3.csv("/data/birdstrikes/birdstrikes.csv", function(data) {
    var schema_names = _.pluck(schema,'field_name').sort(),
      col_names = _.keys(data[0]).sort(),
      data_cols = schema.map(function(col){
        return {
          name: col.field_name,
          type: getType(col.data_type),
          values: _.pluck(data, col.field_name)
        }
      });

    // _.each(schema_names, function(n,i){
    //   if(n != col_names[i]) console.log(n, '!=', col_names[i]);
    // });
    //
    console.log('data_cols', data_cols);

    table = dv.table(data_cols);
    // Assume User Selection here

    // TODO: generate a list of charts and rank



    // calculate query

    // TODO: append placeholder and run generate vega spec for these files

    // $('#content').append('<h2>' + message + '</h2>')
  });
})