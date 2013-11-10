'use strict';

angular.module('vizRecSrcApp')
  .factory('dataManager', function ($http) {
    // Service logic
    // ...

    function count(values){
      var counter = {}
      for(var i=0;i<values.length;i++){
        counter[values[i]] = (counter[values[i]] || 0)+1;
      }
      return _.pairs(counter);
    }

    var dataManager = {
      /** data arrays */
      _: [],
      load: function(path,key, callback){
        var self=this;

        key = key || _.last(path.split("/")).split(".")[0];
        $http.get(path).success(function loadData(data){
          for(var i=0; i<data.length; i++){
            data[i].count = count(data[i].values);
          }

          self._[key] = {
            raw_data: data,
            table: dv.table(data),
          };
          if(callback) callback(self._[key]);
        });
      },
      get: function(key){
        return _[key];
      },
      remove: function(key){
        delete _[key];
      }
    }

    return dataManager;
  });
