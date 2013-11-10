'use strict';

angular.module('vizRecSrcApp')
  .controller('MainCtrl', function ($scope, dataManager) {
    dataManager.load("data/movies.json", "movies", function callback(data){
      console.log("data loaded!");
      $scope.data = data;
      //TODO(kanitw): remove this
      $scope.fix = {type:'nominal', values:['1','1','2']};
      $scope.select = function(col){
        $scope.selectedField = col;
        $scope.colPairs = _(data).filter(function(c){return c!=col;})
          .map(function(c){ return [col,c]; }).value();
      }
    });



  });
