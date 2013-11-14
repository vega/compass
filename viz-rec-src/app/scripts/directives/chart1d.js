'use strict';

angular.module('vizRecSrcApp')
  .directive('chart1d', function () {
    var chartType = {
      histogram: "histogram",
      stack1d: "stack1d"
    }

    function updateChart(chart, col, attrs, scope) {
      if(col.type == dv.type.numeric || scope.chartType == chartType.histogram)
        drawHistogram(chart, col, attrs);
      else
        drawStack1d(chart, col, attrs);
    }

    function drawHistogram(chart, col, attrs) {
      //Code modified from http://bl.ocks.org/mbostock/3048450

      var formatCount = d3.format(",.0f");
      var isNumeric = col.type == "numeric";

      var margin = {top: 5, right: 5, bottom: isNumeric ? 15 : 8, left: 5},
        width = (attrs.width || 120) - margin.left - margin.right,
        height = (attrs.height || 50) - margin.top - margin.bottom;

      var isXNull = function (d) {
        return d.x === null || d.x == "";
      };
      var titleText = function (xField, yField) {
        return function (d) {
          return d[xField || "x"] + "(" + formatCount(d[yField || "y"]) + ")";
        }
      };

      var x, y, data, yMax, xAxis, yAxis, bar;

      //TODO(kanitw): take care of enter/exit here.
      var svg =  d3.select(chart).select("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .select("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      if (isNumeric) {
        x = d3.scale.linear().domain([d3.min(col), d3.max(col)]).nice().range([0, width]);

        // Generate a histogram using twenty uniformly-spaced bins.
        data = d3.layout.histogram().bins(x.ticks(20))(col);

        yMax = d3.max(data, function (d) {
          return d.y;
        });

        y = attrs.yScale == "log" ?
          d3.scale.log().domain([1, yMax]).range([height, 0])
          : d3.scale.linear().domain([0, yMax]).range([height, 0])
        ;

        xAxis = d3.svg.axis()
          .scale(x)
          .orient("bottom")
          .ticks(2)
          .tickFormat(function (d) {
            return _.isNumber(d) && d > 10000 ? d.toPrecision(2) : d;
          });

        bar = svg.selectAll(".bar").data(data);

        bar.exit().remove();

        bar.enter().append("g")
          .attr("class", "bar")
          .attr("transform", function (d) {
            return "translate(" + x(d.x) + "," + y(d.y) + ")";
          })
          .append("rect")
          .attr("x", 1)
          .attr("width", x(data[0].dx) - 1)
          .attr("height", function (d) {
            return height - y(d.y);
          })
          .append("svg:title")
//            .attr("dy", ".75em")
//            .attr("y", 6)
//            .attr("x", x(data[0].dx) / 2)
//            .attr("text-anchor", "middle")
          .text(titleText());

        svg.append("g")
          .attr("class", "x axis")
          .attr("transform", "translate(0," + height + ")")
          .call(xAxis);
      } else {
        //TODO(kanitw): please please use datavore to query these
        data = _(col.countTable).sortBy("count")
          .last(width / 2) //reduce problem for categorical value that has more than width/2
          .reverse()
          .value();

//        //TODO(kanitw) pluck here is not good for performance
        x = d3.scale.ordinal().domain(_.pluck(data, 'val')).rangeBands([0, width]);

        yMax = d3.max(data, function (d) {
          return d.count;
        });
//        console.log(_.map(data,function (d) {
//          return "(" + d.val + "," + d.count + ")";
//        }).join(","), yMax);

        y = attrs.yScale == "log" ?
          d3.scale.log().domain([1, yMax]).range([height, 0])
          : d3.scale.linear().domain([0, yMax]).range([height, 0])
        ;

        xAxis = d3.svg.axis()
          .scale(x).orient("bottom")
          .innerTickSize(1)
          .tickFormat(function (x) {
            return "";
          }); // no label for categorical


        bar = svg.selectAll(".bar").data(data);
        bar.exit().remove();
        bar.enter().append("g")
          .attr("class", "bar")
          .attr("transform", function (d) {
            return "translate(" + x(d.val) + "," + y(d.count) + ")";
          })
          .append("rect")
          .attr("x", 1)
          .attr("width", x.rangeBand() - 1)
          .attr("height", function (d) {
            return height - y(d.count);
          })
          .classed("null", isXNull)
          .append("svg:title")
//            .attr("dy", ".75em")
//            .attr("y", 6)
//            .attr("x", x(data[0].dx) / 2)
//            .attr("text-anchor", "middle")
          .text(titleText);

        svg.append("g")
          .attr("class", "x axis")
          .attr("transform", "translate(0," + height + ")")
          .call(xAxis);

      }

    }

    function drawStack1d(chart, col, attrs) {
      //Code modified from http://bl.ocks.org/mbostock/3048450

      var formatCount = d3.format(",.0f");
      var isNumeric = col.type == "numeric";

      var margin = {top: 5, right: 5, bottom: isNumeric ? 15 : 8, left: 5},
        width = (attrs.width || 120) - margin.left - margin.right,
        height = (attrs.height || 30) - margin.top - margin.bottom;

      var isXNull = function (d) {
        return d.x === null || d.x == "";
      };
      var titleText = function (xField, yField) {
        return function (d) {
          return d[xField || "x"] + "(" + formatCount(d[yField || "y"]) + ")";
        }
      };

      var x, y, data, yMax, xAxis, yAxis, bar;

      //TODO(kanitw): take care of enter/exit here.

      var svg = d3.select(chart).select("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .select("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


      var countCum = 0, maxCount = 0;
      data = _(col.countTable).sortBy("count").map(function (d) {
        d.countCum = countCum;
        countCum += d.count;
        if (maxCount < d.count) maxCount = d.count;
        return d;
      }).value();

//        for(var i = 0, countCum = 0 ; i<field.countTable.length ; i++){
//          field.countTable[i].countCum = countCum = countCum + field.countTable[i].count;
//        }


      x = d3.scale.linear().domain([0, col.length]).range([0, width]);
      var c = d3.scale.pow().exponent(0.5).domain([0, maxCount]).range(["#efefef", "steelblue"]);
      bar = svg.selectAll(".bar").data(data);

      bar.exit().remove()

      bar.enter().append("g")
        .attr("class", "bar")
        .attr("transform", function (d) {
          return "translate(" + x(d.countCum) + "," + 0 + ")";
        })
        .append("rect")
        .attr("x", 0)
        .attr("width", function (d) {
          return x(d.count);
        })
        .attr("height", 10)
        .style("fill", function (d) {
          return c(d.count);
        })
        .classed("null", isXNull)
        .append("svg:title")
//            .attr("dy", ".75em")
//            .attr("y", 6)
//            .attr("x", x(data[0].dx) / 2)
//            .attr("text-anchor", "middle")
        .text(titleText("val", "count"));
    }

    return {
      templateUrl: 'views/chart1d.html',
      restrict: 'E',
      link: function postLink(scope, element, attrs) {
        scope.chartType = "null";

        scope.$watch("col", function (newCol, oldCol) {
          if (newCol != oldCol) {
            updateChart(element.find(".chart")[0], newCol, attrs, scope);
          }
        });

        if (scope.col) {
          updateChart(element.find(".chart")[0], scope.col, attrs, scope);
        }

        scope.toggleChartType = function(){
          if(scope.chartType == chartType.histogram){
            scope.chartType = chartType.stack1d;
          }else{
            scope.chartType = chartType.histogram;
          }
          updateChart(element.find(".chart")[0], scope.col, attrs, scope);
        }
      },
      scope: {
        col: "=",
        select:"&"
      }
    };
  });
