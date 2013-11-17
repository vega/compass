'use strict';

angular.module('vizRecSrcApp')
  .directive('chart1d', function () {
    var chartType = {
      histogram: "histogram",
      stack1d: "stack1d"
    }

    //TODO(kanitw): move these to helper class
    var formatCount = d3.format(",.0f");
    var isNull = function(x){ return x===null || x === "";};
    var isNotNull = function(x){ return !isNull(x);};
    var isFieldNull = function(field){
      return function (d) {
        return isNull(d[field]);
      };
    };
    var isFieldNotNull = function(field){
      return function(d){
        return !isNull(d[field]);
      };
    };

    var titleText = function (xField, yField) {
      return function (d) {
        return d[xField || "x"] + "(" + formatCount(d[yField || "y"]) + ")";
      }
    };

    var pos = function(x){ return x>=0 ? x: 0;};

    function drawHorizontalHistogram(chart, col, attrs, scope){

    }

    function drawVerticalHistogram(chart, col, attrs, scope) {
      //Code modified from http://bl.ocks.org/mbostock/3048450
      var isNumeric = col.type == "numeric";

      var margin = {top: 5, right: 5, bottom: isNumeric ? 15 : 8, left: 5},
        width = (attrs.width || 120) - margin.left - margin.right,
        height = (attrs.height || 50) - margin.top - margin.bottom;

      var x, y, data, yMax, xAxis, yAxis, bar;
      var yField, xField, xAxisTickFormat, barWidth, innerTickSize=6;

      var svg =  d3.select(chart).select("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .select("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      if (isNumeric){
        var colData = scope.filterNull ? _.filter(col, isNotNull) : col;
        xField = "x"; yField="y";
        x = d3.scale.linear().domain([Math.min(0,d3.min(colData)), d3.max(colData)]).nice().range([0, width]);
        data = d3.layout.histogram().bins(x.ticks(20))(colData);
        xAxisTickFormat = function (d) {
          return _.isNumber(d) && d > 10000 ? d.toPrecision(2) : d;
        }
        barWidth = x(data[0].dx) - 1;
      }else{
        xField = "val"; yField="count";

        //TODO(kanitw): please please use datavore to query these
        data = (scope.filterNull ? _(col.countTable).filter(isFieldNotNull(xField)) :  _(col.countTable))
          .sortBy("count")
          .last(width / 2) //reduce problem for categorical value that has more than width/2
          .reverse()
          .value();
        x = d3.scale.ordinal().domain(_.pluck(data, 'val')).rangeBands([0, width]);
        xAxisTickFormat = function(x){return "";};
        barWidth = x.rangeBand() -1;
        innerTickSize = 1
      }

//      yMax = _.max(data, yField);
      yMax = d3.max(data, function(d){ return d[yField]; });
      y = scope.yScaleLog ?
        d3.scale.log().domain([1, yMax]).range([height, 0])
        : d3.scale.linear().domain([0, yMax]).range([height, 0])
      ;


      xAxis = d3.svg.axis().scale(x).orient("bottom").ticks(2).innerTickSize(innerTickSize)
        .tickFormat(xAxisTickFormat);

      bar = svg.selectAll(".bar").data(data);

//      console.log("Exit:", bar.exit());
//      console.log("Enter:", bar.enter());
//      console.log("Bar:", bar);

      bar.enter().append("g").attr("class","bar").append("rect").append("title");

      d3.timer(function(){
        bar.select("rect").classed("null", isFieldNull(xField));
      },500);

      bar.transition().duration(500)
        .attr("transform", function (d) {
          return "translate(" + x(d[xField]) + "," + pos(y(d[yField])) + ")";
        })
        .select("rect")
        .attr("x", 1)
        .attr("width", barWidth)
        .attr("height", function (d) {
          return Math.max(0,height - y(d[yField]));
        })
        .style("fill", null)
        .select("title")
//            .attr("dy", ".75em")
//            .attr("y", 6)
//            .attr("x", x(data[0].dx) / 2)
//            .attr("text-anchor", "middle")
        .text(titleText(xField, yField));


      bar.exit().remove();

      svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);
    }

    function drawStack1d(chart, col, attrs, scope) {
      //Code modified from http://bl.ocks.org/mbostock/3048450

      var isNumeric = col.type == "numeric";

      var margin = {top: 5, right: 5, bottom: isNumeric ? 15 : 8, left: 5},
        width = (attrs.width || 120) - margin.left - margin.right,
        height = (attrs.height || 20) - margin.top - margin.bottom;

      var x, y, data, yMax, xAxis, yAxis, bar;

      var svg = d3.select(chart).select("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .select("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      var countCum = 0, maxCount = 0;
      data = (scope.filterNull ? _(col.countTable).filter(isFieldNotNull("val")) :  _(col.countTable))
        .sortBy("count").map(function (d) {
          d.countCum = countCum;
          countCum += d.count;
          if (maxCount < d.count) maxCount = d.count;
          return d;
        })
        .value();

      var maxX = scope.filterNull ? countCum : col.length;

      x = d3.scale.linear().domain([0, maxX]).range([0, width]);
      var c = d3.scale.pow().exponent(0.5).domain([0, maxCount]).range(["#efefef", "steelblue"]);
      bar = svg.selectAll(".bar").data(data);

      bar.enter().append("g").attr("class","bar").append("rect").append("title");
      d3.timer(function(){
        bar.select("rect").classed("null", isFieldNull("val"));
      },500);
      bar.transition().duration(500)
        .attr("class", "bar")
        .attr("transform", function (d) {
          return "translate(" + x(d.countCum) + "," + 0 + ")";
        })
        .select("rect")
        .attr("x", 0)
        .attr("width", function (d) {
          return x(d.count);
        })
        .attr("height", 10)
        .style("fill", function (d) {
          return c(d.count);
        })
        .select("title")
//            .attr("dy", ".75em")
//            .attr("y", 6)
//            .attr("x", x(data[0].dx) / 2)
//            .attr("text-anchor", "middle")
        .text(titleText("val", "count"));

      bar.exit().remove();
      svg.selectAll(".x.axis").remove();
    }


    function updateChart(chart, col, attrs, scope) {
      if(col.type == dv.type.numeric || scope.chartType == chartType.histogram)
        drawVerticalHistogram(chart, col, attrs, scope);
      else
        drawStack1d(chart, col, attrs, scope);
    }

    return {
      templateUrl: 'views/chart1d.html',
      restrict: 'E',
      link: function postLink(scope, element, attrs) {
        scope.chartType = "null";

        function _updateChart(){
          updateChart(element.find(".chart")[0], scope.col, attrs, scope);
        }

        scope.$watch("col", function (newCol, oldCol) {
          if (newCol != oldCol) {
            _updateChart();
          }
        });

        if (scope.col) _updateChart();

        scope.toggleChartType = function(){
          if(scope.chartType == chartType.histogram){
            scope.chartType = chartType.stack1d;
          }else{
            scope.chartType = chartType.histogram;
          }
          _updateChart();
        }

        scope.toggleLogTransform = function(){
          scope.yScaleLog = !scope.yScaleLog;
          _updateChart();
        }

        scope.toggleFilterNull = function(){
          scope.filterNull = !scope.filterNull;
          _updateChart();
        }

      },
      scope: {
        col: "=",
        select:"&"
      }
    };
  });
