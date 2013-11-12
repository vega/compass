'use strict';

angular.module('vizRecSrcApp')
  .factory('dataManager', function ($http) {
    // Service logic
    // ...

    function countTable(values){
      var counter = {}
      for(var i=0;i<values.length;i++){
        var val = values.get(i);
        counter[val] = (counter[val] || 0)+1;
      }
      return _.map(counter, function(c,v){ return {val:v, count:c}; });  //{keys:_.keys(counter), count: _.values(counter)};
    }

    var dataManager = {
      /** data arrays */
      _: [],
      load: function(path,key, callback){
        var self=this;

        key = key || _.last(path.split("/")).split(".")[0];
        $http.get(path).success(function loadData(data){
          data = self._[key] = dv.table(data);
          for(var i=0; i<data.length; i++){
            data[i].countTable = countTable(data[i]);
//            data[i].bin20 = dv.bin()
          }
          if(callback) callback(data);
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
