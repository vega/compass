// Universal Module Pattern -- modified from https://github.com/umdjs/umd/blob/master/returnExports.js
// Uses Node, AMD or browser globals to create a module.

(function (root, deps, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(deps, factory);
    } else if (typeof exports === 'object') {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.

        module.exports = factory.apply(this, deps.map(function(dep){ return require(dep);}));
    } else {
        // Browser globals (root is window)
        root.returnExports = factory.apply(this, deps.map(function(dep){ return root[dep];}));
    }
}(this, ['lodash', './dataTypes'], function(_, dt){
  // var _ = require('lodash');
  // var dt = require('./dataTypes');

  // TODO: rename field -> Field
  var field = function(key, fieldName, dataType, cardinality, domain, enabled){
    this.key = key;
    this.fieldName = fieldName;
    this.dataType = dataType;
    this.cardinality = cardinality;
    if(domain) this.domain = domain;
    this.enabled = enabled || true;
  };

  var prototype = field.prototype;

  prototype.toString = function(){
    return this.key + ":" + dt[this.dataType].short;
  };

  //TODO(kanitw): fields?
  field.fromFieldSet = function(fieldSets){
    var typeMap = {}; // for generating ID
    return _.flatten(
      fieldSets.map(function(fs){
        return _.range(fs.count || 1).map(function(x, i){
          var type = fs.type,
            key = fs.key || dt[type].short + (typeMap[type] = (typeMap[type] || 0) + 1);
          return new field(key,
            fs.fieldName || key,
            type,
            fs.cardinality || 5,
            fs.domain,
            fs.enabled);
        });
      })
    );
  };

  field.fromColumnsSchema = function(columns){
    return columns.map(function(col){
      return new field(col.key, col.field_name, col.data_type, col.cardinality, col.domain);
    });
  };

  /**
   *  Transform
   *  { ordinal: 1, datetime: 1 }  ==>
   *  [ { type: 'ordinal', count: 1 },
   *    { type: 'datetime', count: 1 } ]
   * @param  {[type]} fields [description]
   * @return {[type]}        [description]
   */
  field.typeCountMapToTypeCountList = function(typeCountMap){
    return _.map(typeCountMap, function(count, type){
      return {type:type, count:count};
    });
  };

  field.typeCountMapToKey = function(typeCountMap){
    return _.map(typeCountMap, function(count, type){
      return dt[type].short + count;
    }).sort().join("-");
  };

  field.fromTypeCountMap = function(typeCountMap){
    var fieldSet = field.typeCountMapToTypeCountList
  (typeCountMap);
    return field.fromFieldSet(fieldSet);
  };

  field.toTypeCount = function(fields){
    return _.reduce(fieldTypes, function(m,f){
        m[f.type] = (f.count || 0) + 1; return m;
      },{});
  };

  return field;
}));