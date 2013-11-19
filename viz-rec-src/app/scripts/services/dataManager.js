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

    return {
      /** data arrays */
      _: [],
      currentData: null,
      load: function (path, key, saveData, callback) {
        var self = this;
        var BIN_LEVEL = 20;
        var bin20 = dv.bin(BIN_LEVEL);

        key = key || _.last(path.split("/")).split(".")[0];
        $http.get(path).success(function loadData(data) {
          data = self._[key] = dv.table(data);
          if (saveData) self.currentData = data;

          var originalDataLength = data.length;
          var i,j;
          for (i = 0; i < originalDataLength; i++) {
            data[i].countTable = countTable(data[i]);

            if (data[i].type == dv.type.numeric) {
              var binned = dv.bin(20).array(data[i]);
              data[i].bin20 = data.addColumn(data[i].name + ":bin20", binned, dv.type.ordinal, null, true);
              data[i].bin20.countTable = countTable(data[i].bin20);
              data[i].bin20.binLevel = 20;
            }else if(data[i].type == dv.type.date){
              var dateData = data[i].map(function(v){ return new Date(v); });
              var dateBinner = {
                year: function(d){ return d.getFullYear();},
                month: function(d){ return d.getMonth();},
                day: function(d){ return d.getDay();}
              };
              _.each(dateBinner, function(binner, level){
                data[i][level] = data.addColumn(data[i].name+":"+level, dateData.map(binner), dv.type.ordinal);
                data[i][level].countTable = countTable(data[i][level]);
                data[i][level].binLevel = level;
              });
            }
          }
          if (callback) callback(data);
        });
      },
      get: function (key) {
        return key ? _[key] : this.currentData;
      },
      remove: function (key) {
        delete _[key];
      }
    };
  });
