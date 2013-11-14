'use strict';

angular.module('vizRecSrcApp')
  .directive('chart2d', function () {
    return {
      templateUrl: 'views/chart2d.html',
      restrict: 'E',
      link: function postLink(scope, element, attrs) {
      },
      scope:{
        pair:"="
      }
    };
  });
