'use strict';

angular.module('vizRecSrcApp')
  .controller('MainCtrl', function ($scope, dataManager) {
    $scope.sorter = {
      cardinality: function(pair){
        return (pair[1].type == dv.type.numeric ? 20 : pair[1].countTable.length);
      },
      mutualInformationDistance: function(pair){
        return dataManager.currentData.mi_distance[pair[0].index][pair[1].index];
      }
    }

    $scope.currentSorter = $scope.sorter.mutualInformationDistance;
    $scope.setSorter = function(sorterType){
      $scope.currentSorter = $scope.sorter[sorterType];
    };

    dataManager.load("data/movies.json", "movies", true, function callback(dataTable){
      console.log("data loaded!");
      $scope.dataTable = dataTable;
      $scope.fix = {type:'nominal', values:['1','1','2']};
      $scope.select = function(col){
        if($scope.selectedField==col)return; //Do nothing
        $scope.selectedField = col;
        $scope.colPairs = _(dataTable).filter(function(c,i){return c!=col && i < dataTable.originalLength;})
          .map(function(c){
            var pair = [col,c];
            pair.metric = $scope.currentSorter(pair);
            return pair;
          })
          .sortBy("metric")
          .reverse()
          .value();
      };

      $scope.select(dataTable[0]);
    });



  });
