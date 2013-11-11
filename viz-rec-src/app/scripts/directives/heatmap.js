'use strict';

angular.module('vizRecSrcApp')
  .directive('heatmap', function () {

    function redrawHeatMap(pair, attrs, svgParent, scope){
      var xField = pair[1], yField = pair[0];

      if(xField.type != "nominal" || xField.type != "nominal")
        return;

      console.log(xField.count.length, yField.count.length);
      console.log("type of x,y =", xField.type, yField.type);

      var counts = scope.dataTable.query({dims: [yField.index, xField.index], vals:[dv.count()]});

//      console.log("counts=",counts);

      var margin = { top: 5, right: 5, bottom: 5, left: 5 },
        width = (attrs.width || 120) - margin.left - margin.right,
        height = (attrs.height || 120) - margin.top - margin.bottom;

      var svg = d3.select(svgParent).append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      var x, y,data,yMax, xAxis, yAxis, rect, c;


      //TODO pluck, last is not efficient here, cutting top stuff is not that great
      var xDomain = _(xField.count).sortBy(1).last(width/2).reverse()
        .pluck(0).value();
      var makeIndicesMap = function(array){
        return array.reduce(function(map, cur, index){
//          console.log(array, map, cur, index);
          map[cur] = index;
          return map;
        },{});
      };

      //TODO pluck, last is not efficient here, cutting top stuff is not that great
      var yDomain = _(yField.count).sortBy(1).last(height/2).reverse()
        .pluck(0).value();
      var xDomainMap = makeIndicesMap(xDomain), yDomainMap = makeIndicesMap(yDomain);

//      console.log("domains: ", xDomain, yDomain);

      x = d3.scale.ordinal().domain(xDomain).rangeRoundBands([0, width]);
      y = d3.scale.ordinal().domain(yDomain).rangeRoundBands([0,height]);
      c = d3.scale//. linear()
        .pow()
        .exponent(0.5)
        .domain([d3.min(counts[2]),d3.max(counts[2])])
        .range(["#efefef", "steelblue"]);

//      console.log("rangeBand", x.rangeBand(), y.rangeBand());

      xAxis = d3.svg.axis()
        .scale(x).orient("bottom")
        .innerTickSize(1)
        .tickFormat(function(x){return "";}); // no label for categorical

      rect = svg.selectAll(".rect")
        .data(d3.range(0,counts[0].length))
        .enter().append("g")
        .attr("class", "rect")
        .attr("transform", function (i) {
          return "translate(" + x(counts[1][i]) +
            "," + y(counts[0][i]) + ")";
        });

      rect.append("rect")
        .attr("x", 1)
        .attr("width", x.rangeBand()-1)
        .attr("height", y.rangeBand()-1)
        .style("fill", function(i){ return c(counts[2][i]);})
        .append("svg:title")
//            .attr("dy", ".75em")
//            .attr("y", 6)
//            .attr("x", x(data[0].dx) / 2)
//            .attr("text-anchor", "middle")
        .text(function(i){ return counts[0][i] +","+ counts[1][i] +","+ counts[2][i]; });

      svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

    }

    return {
      template: '<div>{{ pair[0].name}}, {{pair[1].name }}</div>',
      restrict: 'E',
      link: function postLink(scope, element, attrs) {
        scope.$watch("pair", function(pair){
          if(pair){
            redrawHeatMap(pair, attrs, element[0], scope);
          }
        })
      }
    };
  });
