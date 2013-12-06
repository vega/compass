'use strict';

angular.module('vizRecSrcApp')
  .controller('MainCtrl', function ($scope, dataManager, chartHelper) {
    var helper = chartHelper;

    $scope.sorter1d = {
      /** map of type of sorter */
      types:{
        name:{
          metric: null,
          reverse: false
        },
        cardinality: {
          metric: function(col){
            return col.type == dv.type.numeric ? 20 : (col.countTable || []).length;
          },
          reverse: false
        },
        "Normalized Entropy":{
          metric: function(col){
            return col.normalizedEntropy;
          },
          reverse: true
        }
      },
    };
    $scope.sorter1d.current = $scope.sorter1d.types["name"];

    //TODO(kanitw): refactor this method's code maybe we need to move them to a separate controller or directives



    $scope.sorter2d = {
      /** map of type of sorter
       * if reverse=false, the result will be sorted ascending (and vice versa)
       * */
      types:{
        cardinality: {
          metric: function(pair){
            return (pair[1].type == dv.type.numeric ? 20 : (pair[1].countTable || []).length);
          },
          reverse: false
        },
        mutualInformationDistance: {
          metric: function(pair){
            return dataManager.currentData.mi_distance[pair[0].index][pair[1].index];
          },
          reverse: true
        },
        linearRSquare:{
          metric: function(pair){
            var rel = (dataManager.currentData.rel2d[pair[0].name] || {})[pair[1].name];
            //Ham: I know, r.squared.rsquared is weird but it's due to a weird R export bug.
            return rel ? rel["simple_linear_all"]["r.squared.r.squared"] : Infinity;
          },
          reverse: false
        },
        linearWeights:{
          metric: function(pair){
            var rel = (dataManager.currentData.rel2d[pair[0].name] || {})[pair[1].name];
            var est = rel ? rel["simple_linear_all"]["coefs"]["Estimate"] : null;
            return est ?  est[_.keys(est)[1]] : null;
          },
          reverse: true
        },
        outliers:{
          metric: function(pair){
            var rel = (dataManager.currentData.rel2d[pair[0].name] || {})[pair[1].name];
            return (rel && "outliers" in rel ) ? rel["outliers"].length : 0;
          },
          reverse: true
        }

      }
    };

    //append these ranking to sorter2d types
    var sorter2dBuilder = {
      "R-Squared": {},
      "Mahalanobis Outliers": {},
      "Number of Clusters": {},
      "Clustering Error": {},
      "Pseudo R-Squared": {},
//      "Logistic Reg. AIC": {}
    };
//    _.each(sorter2dBuilder, function(prop, name){
//      $scope.sorter2d.types[name] = {
//        metric: function(pair){
//          var rel = (dataManager.currentData.rel2d[pair[0].name] || {})[pair[1].name];
//          return (rel && name in rel) ? rel[name] : prop.default || 0;
//        },
//        reverse: prop.reverse || false
//      }
//    });

    $scope.sorter2d.current = $scope.sorter2d.types["mutualInformationDistance"];

    function updatePairs(){
      var col = $scope.selectedField, dataTable = $scope.dataTable, currentSorter = $scope.sorter2d.current;
      var maxMetric = -Infinity, minMetric= Infinity;
      var _colPairs = _(dataTable).filter(function(c,i){return c!=col && i < dataTable.originalLength;})
        .map(function(c){
          var pair = [col,c];
          pair.metric = currentSorter.metric(pair);
          if(pair.metric && pair.metric != Infinity && pair.metric > maxMetric) maxMetric = pair.metric;
          if(pair.metric && pair.metric < minMetric) minMetric = pair.metric;
          return pair;
        })
        .sortBy("metric");

      $scope.colPairs = currentSorter.reverse ? _colPairs.reverse().value(): _colPairs.value();

      //TODO(kanitw) this should better support negative color
      console.log("min=",minMetric," max=",maxMetric);
      $scope.metricColor = d3.scale.linear().domain([minMetric,maxMetric]).range(["#efefef","#0099ff"]);
    }


    $scope.$watch("sorter1d.current", updateSingles);
    $scope.$watch("sorter2d.current", updatePairs);

    $scope.filterAllNull = function(){
      var i, dataTable = $scope.dataTable;
      for(i=0 ; i<dataTable.originalLength; i++){
        if(dataTable[i].hasNull){
          dataTable[i].setFilter(helper.isNotNull);
          dataTable[i].filterNull = true;
          if(dataTable[i].hasZero)
            console.error("We do not support both null and zero filter yet");
        }else if(dataTable[i].hasZero){
          dataTable[i].setFilter(helper.isNonZero);
          dataTable[i].filterZero = true;
        }
      }
      return dataTable[i];
    };




    function updateSingles(){
      var dataTable = $scope.dataTable, currentSorter = $scope.sorter1d.current;
      var _cols = _(dataTable).filter(function(c){return !c.isBinCol;});
      if(currentSorter.metric)
        _cols = _cols .sortBy(function(c){
          return c.metric = currentSorter.metric(c);
        });
      $scope.cols = currentSorter.reverse ? _cols.reverse().value(): _cols.value();
      $scope.numericCols = _.filter($scope.cols, function(c){ return c.type==dv.type.numeric;});
      $scope.nonnumericCols = _.filter($scope.cols, function(c){ return c.type!=dv.type.numeric;});
    }


    dataManager.load("data/movies.json", "movies", true, function callback(dataTable){
      console.log("data loaded!");
      dataManager.loadRData();
      $scope.dataTable = dataTable;
      $scope.fix = {type:'nominal', values:['1','1','2']};
      $scope.select = function(col){
        if($scope.selectedField==col)return; //Do nothing
        $scope.selectedField = col;
        updatePairs();
      };

      updateSingles();
      $scope.select(dataTable[0]);
    });

    $scope.metricColor = function(){
      return "white";
    }


  });
