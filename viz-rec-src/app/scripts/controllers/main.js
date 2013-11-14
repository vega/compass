'use strict';

angular.module('vizRecSrcApp')
  .controller('MainCtrl', function ($scope, dataManager) {
    dataManager.load("data/movies.json", "movies", true, function callback(dataTable){
      console.log("data loaded!");
      $scope.dataTable = dataTable;
      $scope.fix = {type:'nominal', values:['1','1','2']};
      $scope.select = function(col){
        if($scope.selectedField==col)return; //Do nothing
        $scope.selectedField = col;
        $scope.colPairs = _(dataTable).filter(function(c){return c!=col;})
          .map(function(c){ return [col,c]; }).value();
      }

      $scope.select(dataTable[0]);
    });



  });
