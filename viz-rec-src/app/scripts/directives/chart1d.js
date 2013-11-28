'use strict';

angular.module('vizRecSrcApp')
  .directive('chart1d', function (chartHelper, dataManager) {
    var helper = chartHelper;
    var chartType = {
      histogram: "histogram",
      stack1d: "stack1d"
    };

    //TODO(kanitw): move these to helper class
    
    function drawHorizontalHistogram(chart, col, attrs, scope){

    }

    function drawVerticalHistogram(chart, col, attrs, scope) {
      //Code modified from http://bl.ocks.org/mbostock/3048450
      var isNumeric = col.type == "numeric";

      var margin = {top: 5, right: 5, bottom: isNumeric ? 20 : 10, left: 5},
        width = (attrs.width || 120),
        height = (attrs.height || 30);

      var x, y, data, yMax, xAxis, yAxis, marks;
      var yField, xField, xAxisTickFormat, barWidth, tickSize=6;

      var svg =  d3.select(chart).select("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)

      var main = svg.select("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      if (isNumeric){
        var colData = col.filterFn ? col.filtered: col;

        xField = "x"; yField="y";
        x = d3.scale.linear().domain([Math.min(0,d3.min(colData)), d3.max(colData)]).nice().range([0, width]);
        data = d3.layout.histogram().bins(x.ticks(20))(colData);
        xAxisTickFormat = helper.defaultNumberFormatter;
        barWidth = x(data[0].dx) - 1;
      }else{
        xField = "val"; yField="count";

        //TODO(kanitw): please please use datavore to query these/make datavore supports this
        data = (col.filterFn ? _(col.countTable).filter(helper.checkField(xField,col.filterFn)) : _(col.countTable))
          .sortBy("count")
          .last(width / 2) //reduce problem for categorical value that has more than width/2
          .sortBy(scope.sortBy)
          .value();
        x = d3.scale.ordinal().domain(_.pluck(data, 'val')).rangeBands([0, width]);
        xAxisTickFormat = function(x){return "";};
        barWidth = x.rangeBand() -1;
        tickSize = 1
      }

//      yMax = _.max(data, yField);
      yMax = d3.max(data, function(d){ return d[yField]; });
      y = col.useLogScale ?
        d3.scale.log().domain([1, yMax]).range([height, 0])
        : d3.scale.linear().domain([0, yMax]).range([height, 0])
      ;


      xAxis = d3.svg.axis().scale(x).orient("bottom")
        .ticks(2).tickSize(tickSize)
        .tickFormat(xAxisTickFormat);

      marks = main.selectAll(".marks").data(data, helper.getKey(xField));

//      console.log("Exit:", bar.exit());
//      console.log("Enter:", bar.enter());
//      console.log("Bar:", bar);

      marks.enter().append("g").attr("class","marks").append("rect").append("title");

      d3.timer(function(){
        marks.select("rect").classed("null", helper.isFieldNull(xField));
      },500);

      marks.transition().duration(500)
        .attr("transform", function (d) {
          return "translate(" + x(d[xField]) + "," + helper.pos(y(d[yField])) + ")";
        })
        .select("rect")
        .attr("x", -barWidth/2)
        .attr("width", barWidth)
        .attr("height", function (d) {
          return Math.max(0,height - y(d[yField]));
        })
        .style("fill", null);


      marks.select("rect")
        .on('mouseover', helper.onMouseOver(chart,helper.titleTextFromXY(xField,yField)))
        .on('mouseout', helper.onMouseOut(chart));

      marks.exit().remove();

      svg.select("g.x.axis")
        .attr("transform", "translate("+margin.left+"," + (margin.top + height) + ")")
        .call(xAxis);
    }

    function drawStack1d(chart, col, attrs, scope) {
      //Code modified from http://bl.ocks.org/mbostock/3048450

      var isNumeric = col.type == "numeric";

      var margin = {top: 5, right: 5, bottom: isNumeric ? 10 : 5, left: 5},
        width = (attrs.width || 120) - margin.left - margin.right,
        height = (attrs.height || 20) - margin.top - margin.bottom;

      var x, data, marks;

      var svg = d3.select(chart).select("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .select("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      var countCum = 0, maxCount = 0;
      var xField = "val";
      data = (col.filterFn ? _(col.countTable).filter(helper.checkField(xField, col.filterFn)) :  _(col.countTable))
        .sortBy(scope.sortBy).map(function (d) {
          d.countCum = countCum;
          countCum += d.count;
          if (maxCount < d.count) maxCount = d.count;
          return d;
        })
        .value();

      var maxX = countCum;

      x = d3.scale.linear().domain([0, maxX]).range([0, width]);
      var c = d3.scale.pow().exponent(0.5).domain([0, maxCount]).range(["#efefef", "steelblue"]);
      marks = svg.selectAll(".marks").data(data, helper.getKey(xField));

      marks.enter().append("g").attr("class","marks").append("rect").append("title");
      d3.timer(function(){
        marks.select("rect").classed("null", helper.isFieldNull("val"));
      },500);
      marks.transition().duration(500)
        .attr("class", "marks")
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
        });

      marks.select("rect")
        .on('mouseover', helper.onMouseOver(chart,helper.titleTextFromXY(xField,"count")))
        .on('mouseout', helper.onMouseOut(chart));

      marks.exit().remove();
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
        scope.fieldTypeShort = chartHelper.fieldTypeShort;
        scope.chartType = chartType.histogram;
        scope.sortBy = "count";

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
          scope.col.useLogScale = !scope.col.useLogScale;
          _updateChart();
        }

        scope.toggleFilterNull = function(){
          scope.col.filterNull = !scope.col.filterNull;
          scope.col.setFilter(scope.col.filterNull ? helper.isNotNull : null);
//          _updateChart();
        };

        scope.toggleFilterZero = function(){
          scope.col.filterZero = !scope.col.filterZero;
          scope.col.setFilter(scope.col.filterZero ? helper.isNonZero : null);
        };

        scope.toggleSortBy = function(){
          if(scope.sortBy == 'count') scope.sortBy = 'val';
          else scope.sortBy = 'count';
        }

        scope.$watch("col.filterNull", _updateChart);
        scope.$watch("col.filterZero", _updateChart);
        scope.$watch("sortBy", _updateChart);

      },
      scope: {
        col: "=",
        select:"&",
        isSelectedField: "="
      }
    };
  });
