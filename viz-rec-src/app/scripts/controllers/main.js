'use strict';

angular.module('vizRecSrcApp')
  .controller('MainCtrl', function ($scope, dataManager) {
    function setSorter(sorterType){
      $scope.currentSorter = $scope.sorter2d[sorterType];
      updatePairs();

    }
    function updatePairs(){
      var col = $scope.selectedField, dataTable = $scope.dataTable, currentSorter = $scope.currentSorter;
      var _colPairs = _(dataTable).filter(function(c,i){return c!=col && i < dataTable.originalLength;})
        .map(function(c){
          var pair = [col,c];
          pair.metric = currentSorter.metric(pair);
          return pair;
        })
        .sortBy("metric");

      $scope.colPairs = currentSorter.reverse ? _colPairs.reverse().value(): _colPairs.value();
    }

    /** map of type of sorter */
    $scope.sorter2d = {
      cardinality: {
        metric: function(pair){
          return (pair[1].type == dv.type.numeric ? 20 : pair[1].countTable.length);
        },
        reverse: false
      },
      mutualInformationDistance: {
        metric: function(pair){
          return dataManager.currentData.mi_distance[pair[0].index][pair[1].index];
        },
        reverse: true
      }
    };


    $scope.sorter2dTypes = _.keys($scope.sorter2d);
    $scope.currentSorterType = "mutualInformationDistance";

    $scope.$watch("currentSorterType", setSorter);


    dataManager.load("data/movies.json", "movies", true, function callback(dataTable){
      console.log("data loaded!");
      $scope.dataTable = dataTable;
      $scope.fix = {type:'nominal', values:['1','1','2']};
      $scope.select = function(col){
        if($scope.selectedField==col)return; //Do nothing
        $scope.selectedField = col;
        updatePairs();
      };

      $scope.select(dataTable[0]);
    });



  });
