/* chart template class */

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
}(this, ['lodash', './dataTypes', './encodings', './chart'], function(_, dt, encodings, Chart){

  // var _ = require('lodash');
  // var dt = require('./dataTypes');
  // var encodings = require('./encodings');
  // var Chart = require("./chart"); //TODO refactor

  var requiredProps = ["type", "name"];
  var defaults = { //propName => defaultValue
    note: null,
    transposable: false,
    smallMultiple: true,
    minField: 1
  };



  var ChartTemplate = function(spec, id, isAggregated){
    var self =this, requirements, req;

    _.extend(this, _.defaults(spec, defaults));
    this.encodings = _.cloneDeep(spec.encodings);

    this.id = id || this.id;
    this.isAggregated = isAggregated || _.any(spec.encodings, function(encodingInfo, encodingVar){
      return encodingInfo.dataType === dt.aggregate;
    });

    //just check if have all the required props
    _.each(requiredProps,function(p){
      if(! (p in self)) console.warn("missing requiredProps");
    });

    /** requirements by DataType
     {dataTypeName: {required:[encoding,...], optional: [encoding,...], multiple: {row/col: true|false*} } */
    requirements = this.requirements = {};

    // this.encodings = {encoding: spec}, spec = {dataType:..., multiple:(false), "same-unit": false}
    _.each(this.encodings, function(spec, encoding, encodings){
      var dataType, req;

      // expand shorthand format
      // e.g., y: vt.categorical => y: {dataType: vt.categorical}
      if(! ("dataType" in spec )){
        encodings[encoding] = spec = {dataType: spec};
      }
      dataType = spec.dataType;

      req = requirements[dataType.name] = requirements[dataType.name] || {};

      var reqType = spec.optional ?  "optional" : "required";
      (req[reqType] = req[reqType]|| []).push(encoding);

      if(spec.multiple){
        (req.multiple = req.multiple || {})[encoding] = true;
      }
    });

    //small multiples allow extra categorical fields
    if(this.smallMultiple){
      req = requirements.categorical = requirements.categorical || {};
      req.multiple = {col:true, row:true};
    }

    /** list of dataType.name ordered by the most specific type first*/
    this.requiredDataTypes = _(requirements)
      .keys()
      .filter(function(dataType){ return requirements[dataType].required; })
      .sortBy(function(typeName){
        return -dt[typeName].specificity;
      })
      .value();
    //console.log(id, this.dataTypes);
  };

  var prototype = ChartTemplate.prototype;

  /*
    Generate all possible assignments of fields to each encoding.
    This doesn't generate permutations within encoding.
    It also excludes transposes of the same chart.
   */
  prototype.generateCharts = function(fields, dataTypeKey, checkSatisfy){
    if(checkSatisfy && !this.satisfyFields(fields)) return [];
    dataTypeKey = dataTypeKey || "dataType";

    var self=this,
      reqs = this.requirements,
      requiredDataTypes=this.requiredDataTypes,
      len = requiredDataTypes.length,
      fieldsByType = _.groupBy(fields, dataTypeKey),
      hasNonAggregated = _.any(fieldsByType, function(list, type){
        return !dt[type].isType(dt.aggregate);
      }),
      charts = [],
      chartFields = {},
      chart;

    function push(encoding, fieldKey){
      this[encoding] = this[encoding] || [];
      this[encoding].push(fieldKey);
    }
    function pop(encoding){
      this[encoding].pop();
      if(this[encoding].length === 0)
        delete this[encoding];
    }


    function populateOptionalDataTypes(unusedFields, i, optionalUsed){
      unusedFields = unusedFields || _.filter(fields, function(f){return !f.used;});
      optionalUsed = optionalUsed || {};
      i = i || 0;

      function populateOptionalEncodings(field, encodings, used){
        field.used = true;
        encodings.forEach(function(encoding){
          if(used && used[encoding]) return;

          if(used) used[encoding] = true;
          // console.log("FIELD:", field.key, "=>", encoding);
          push.call(chartFields, encoding, field);
          populateOptionalDataTypes(unusedFields,i+1, optionalUsed);
          pop.call(chartFields, encoding);
          if(used) delete used[encoding];
        });
        field.used = false;
      }

      if(i===unusedFields.length){
        if(self.isAggregated && !hasNonAggregated) return;

        chart = new Chart(self, chartFields);
        if(!_.any(charts, chart.isTranspose, chart)){

          charts.push(chart);
        } //TODO replace the first one with one with the best score?
        return;
      }

      var field = unusedFields[i],
        type=dt[field[dataTypeKey]],
        req;

      while(type!==null){
        req = reqs[type.name];

        if(req && req.optional){
          var used = optionalUsed[type.name] = optionalUsed[type.name] || {};
          populateOptionalEncodings(field, req.optional, used);
        }
        if(req && req.multiple){
          populateOptionalEncodings(field, _.keys(req.multiple).reverse(), null);
        }
        type = type.parent;
      }
    }

    function populateRequiredDataTypes(i, j){
      var dataType, supportedTypes, encoding, requiredEncodings;

      if(i===len){
        populateOptionalDataTypes();
        return;
      }

      requiredEncodings = reqs[requiredDataTypes[i]].required;

      if(!requiredEncodings || j=== requiredEncodings.length){
        populateRequiredDataTypes(i+1,0);
        return;
      }

      dataType = dt[requiredDataTypes[i]];
      supportedTypes = dataType.allSubtypes();
      encoding = requiredEncodings[j];

      dataType.allSubtypes().forEach(function(sType){
        (fieldsByType[sType] || []).forEach(function(field){
          if(field.used) return;
          //console.log("FIELD:", field);
          field.used = true;
          push.call(chartFields, encoding, field);
          populateRequiredDataTypes(i,j+1);
          pop.call(chartFields, encoding);
          field.used = false;
        });
      });
    }

    populateRequiredDataTypes(0,0);

    return charts;
    // .map(function(chart){
    //   chart.fields = _.reduce(chart.fields, function(fields, fieldKey, encoding){
    //     fields.push({
    //       encoding: encoding,
    //       key: fieldKey
    //     });
    //     return fields;
    //   }, []);
    //   return chart;
    // });
  };

  /**
   * @param fieldTypeCount {typeName: count}
   * @returns {boolean}
   */
  //FIXME missing info about units
  prototype.satisfyFieldTypeCount = function(fieldTypeCount){
    var count = _.reduce(fieldTypeCount, function(sum,x){ return sum+x;},0),
      self=this,
      requirements = self.requirements,
      satisfyRequirement,
      assignment = {};

    fieldTypeCount =  _.clone(fieldTypeCount); // clone for safety

    // Have enough field
    if(count < this.minField) return false;

    // Check if the requirements for each data type are satisfied (from the most specific one first)
    // (dt.TYPES is ordered by specificity already.)
    satisfyRequirement = _.all(requirements,function(req, typeName){

      var i,s,
        type = dt[typeName],
        subtypes = type.allSubtypes(),
        count = (req.required || []).length;

      for(i=0, s=subtypes[0]; i<subtypes.length; s=subtypes[++i]){
        if(fieldTypeCount[s.name] >= count){
          fieldTypeCount[s.name] -= count;
          count = 0;
          if(fieldTypeCount[s.name] === 0) delete fieldTypeCount[s.name];
          break;
        }else if(fieldTypeCount[s.name] > 0){
          count -= fieldTypeCount[s.name];
          delete fieldTypeCount[s.name];
        }
      }

      return count === 0;
    });

    if(!satisfyRequirement) return false;

    // check all the unused dataTypes (used ones would be deleted by now)
    return _.all(fieldTypeCount, function(typeCount, typeName){
      var type = dt[typeName], req;
      while(type!==null){
        req = requirements[type.name];
        if(req && req.optional){
          if(typeCount <= req.optional.length) return true; //enough!
          typeCount -= req.optional.length;
        }
        if(req && req.multiple) return true;
        type = type.parent;
      }
      return false;
    });
  };
  return ChartTemplate;
}));
