'use strict';

angular.module('vizRecSrcApp')
  .factory('dataManager', function ($http, it) {
    // Service logic
    // ...

    function addStats(values){
      var countMap = {} , max= -Infinity, min=Infinity;
      for(var i=0;i<values.length;i++){
        var val = values.get(i);
        if(val > max) max = val;
        if(val < min) min = val;
        countMap[val] = (countMap[val] || 0)+1;
      }
      values.max = max;
      values.min = min;
      values.countTable = mapToTable(countMap);
      values.hasZero = countMap[0] > 0;
      values.hasNull = countMap[""] > 0 || countMap["NaN"] > 0 || countMap["null"] > 0;

      return {countMap: countMap};
    }

    function countMap(values){
      var counter = {};
      for(var i=0;i<values.length;i++){
        var val = values.get(i);
        counter[val] = (counter[val] || 0)+1;
      }
      return counter;
    }

    //TODO(kanitw): revise if we still need this!  It seems redundant in the future
    function mapToTable(cm){
      return _.map(cm,function(c,v){ return {val:v, count:c}; });
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

          var originalDataLength = data.originalLength = data.length;
          var i, j, stats;
          for (i = 0; i < originalDataLength; i++) {
            addStats(data[i]);

            if (data[i].type == dv.type.numeric) {
              var binned = dv.bin(20).array(data[i]);
              data[i].bin20 = data.addColumn(data[i].name + ":bin20", binned, dv.type.ordinal, null, true);
              stats = addStats(data[i].bin20);
              data[i].bin20.binLevel = 20;
              data[i].bin20.isBinCol = true;

              //TODO(kanitw): _.values is not the most efficient method for sure
              data[i].normalizedEntropy = it.normalizedEntropy(_.values(stats.countMap));
            }else if(data[i].type == dv.type.date){
              var dateData = data[i].map(function(v){ return new Date(v); });
              var dateBinner = {
                year: function(d){ return d.getFullYear();},
                month: function(d){ return d.getMonth();},
                day: function(d){ return d.getDay();}
              };
              _.each(dateBinner, function(binner, level){
                data[i][level] = data.addColumn(data[i].name+":"+level, dateData.map(binner), dv.type.ordinal, null, true);
                stats = addStats(data[i][level])
                data[i][level].binLevel = level;
                data[i][level].isBinCol = true;
                //TODO(kanitw): _.values is not the most efficient method for sure
                data[i][level].normalizedEntropy = it.normalizedEntropy(_.values(stats.countMap));
              });
              //TODO(kanitw): change this to be flexble, just use month for now.
              data[i].entropy = data[i]["month"].normalizedEntropy;
            }else{
              data[i].normalizedEntropy = it.normalizedEntropy(_.values(data[i].countMap));
            }
          }
          data.mi_distance = [];
          for (i =0; i < originalDataLength; i++) data.mi_distance[i] = [];
          for (i =0; i < originalDataLength; i++){
            data.mi_distance[i][i] = 0;
            for(j=i+1 ; j< originalDataLength; j++){
              var _i = i, _j = j;

              // for numeric and date use binned version instead
              // for text and unknown, return null!

              switch(data[i].type){
                case dv.type.numeric: _i = data[i].bin20.index; break;
                case dv.type.date: _i = data[i].month.index; break;
                case dv.type.text:case dv.type.unknown:
                  data.mi_distance[i][j] = data.mi_distance[j][i] = null;
                  continue;
              }

              switch(data[j].type){
                case dv.type.numeric: _j = data[j].bin20.index; break;
                case dv.type.date: _j = data[j].month.index; break;
                case dv.type.text:case dv.type.unknown:
                  data.mi_distance[j][i] = data.mi_distance[i][j] = null;
                  continue;
              }


//              console.log(data[i].name, data[i].type, data[j].name, data[j].type);
              data.mi_distance[j][i] = data.mi_distance[i][j] = it.getDistance(data, _i, _j);
//              console.log("dist["+i+"]["+j+"]=", data.mi_distance[i][j]);
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
