'use strict';

angular.module('vizRecSrcApp')
  .controller('MainCtrl', function ($scope, dataManager) {
    dataManager.load("data/movies.json", "movies", function callback(dataTable){
      console.log("data loaded!");
      $scope.dataTable = dataTable;
      //TODO(kanitw): remove this
      $scope.fix = {type:'nominal', values:['1','1','2']};
      $scope.select = function(col){
        $scope.selectedField = col;
        $scope.colPairs = _(dataTable).filter(function(c){return c!=col;})
          .map(function(c){ return [col,c]; }).value();
      }

      $scope.select(dataTable[0]);
    });



  });
