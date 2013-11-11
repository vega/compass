'use strict';




angular.module('vizRecSrcApp')
  .directive('histogram', function () {
//    //Kanitw: Vega seems too difficult to use for now.
    function template(width, height){
      return {
        "width": width,
        "height": height,
        "padding": {"top": 5, "left": 5, "bottom": 5, "right": 5},
        "data": [
          {
            "name": "table"
          }
        ],
        "scales": [
          {
            "name": "x",
            "type": "ordinal",
            "range": "width",
            "domain": {"data": "table", "field": "data.0"}
          },
          {
            "name": "y",
            "range": "height",
            "nice": true,
            "domain": {"data": "table", "field": "data.1"}
          }
        ],
        "axes": [
          {"type": "x", "scale": "x", "ticks":2}

        ],
        "marks": [
          {
            "type": "rect",
            "from": {"data": "table"},
            "properties": {
              "enter": {
                "x": {"scale": "x", "field": "data.0"},
                "width": {"scale": "x", "band": true, "offset": -1},
                "y": {"scale": "y", "field": "data.1"},
                "y2": {"scale": "y", "value": 0}
              },
              "update": {
                "fill": {"value": "steelblue"}
              },
              "hover": {
                "fill": {"value": "red"}
              }
            }
          }
        ]
      };
    }

    function redrawHistogram(field, attrs, svgParent) {
      //Code modified from http://bl.ocks.org/mbostock/3048450

      var formatCount = d3.format(",.0f");
      var values = field;
      var isNumeric = field.type=="numeric";

      var margin = {top: 5, right: 5, bottom: isNumeric ? 15 : 8, left: 5},
        width = (attrs.width || 100) - margin.left - margin.right,
        height = (attrs.height || 50) - margin.top - margin.bottom;

      var isXNull = function(d){ return d.x ===null || d.x =="";};
      var titleText = function (d) {
        return d.x + "(" + formatCount(d.y) + ")";
      };

      var x, y,data,yMax, xAxis, yAxis, bar;

      //TODO(kanitw): take care of enter/exit here.
      var svg = d3.select(svgParent).append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


      //TODO here scale should be flexible between linear and ordinal

      if(isNumeric){
        x = d3.scale.linear().domain([d3.min(values), d3.max(values)]).nice().range([0, width]);

        // Generate a histogram using twenty uniformly-spaced bins.
        data = d3.layout.histogram().bins(x.ticks(20))(values);

        yMax = d3.max(data, function (d) { return d.y; });

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

        bar = svg.selectAll(".bar")
          .data(data)
          .enter().append("g")
          .attr("class", "bar")
          .attr("transform", function (d) {
            return "translate(" + x(d.x) + "," + y(d.y) + ")";
          });

        bar.append("rect")
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
          .text(titleText);

        svg.append("g")
          .attr("class", "x axis")
          .attr("transform", "translate(0," + height + ")")
          .call(xAxis);
      }else{
        data = _(field.count).sortBy(1)
          //TODO(kanitw): deal with the next line better
          .last(width/2) //reduce problem for categorical value that has more than width/2
          .reverse()
          .map(function(d){return{x: d[0], y:d[1]};}).value();

        //TODO(kanitw) pluck here is not good for performance
        x = d3.scale.ordinal().domain(_.pluck(data,'x')).rangeBands([0, width]);

        yMax = d3.max(data, function (d) {
          return d.y;
        });
        //console.log(_.map(data,function(d){return "("+ d.x+","+ d.y+")"; }).join(","), yMax);

        y = attrs.yScale == "log" ?
          d3.scale.log().domain([1, yMax]).range([height, 0])
          : d3.scale.linear().domain([0, yMax]).range([height, 0])
        ;

        xAxis = d3.svg.axis()
          .scale(x).orient("bottom")
          .innerTickSize(1)
          .tickFormat(function(x){return "";}); // no label for categorical



        bar = svg.selectAll(".bar")
          .data(data)
          .enter().append("g")
          .attr("class", "bar")
          .attr("transform", function (d) {
            return "translate(" + x(d.x) + "," + y(d.y) + ")";
          });

        bar.append("rect")
          .attr("x", 1)
          .attr("width", x.rangeBand()-1)
          .attr("height", function (d) {
            return height - y(d.y);
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

    return {
      template: '<div class="block-histogram"></div>',
      restrict: 'E',
      replace: true,
      link: function postLink(scope, element, attrs) {
        scope.$watch("field",function(field){
          if(field){
//            console.log("field:", field);
//            vg.parse.spec(template(100, 30), function(chart) {
//              var v = chart({
//                el: element[0],
//                data: {"table": field.count}
//              }).update();
//              console.log(v);
//            });
            // A formatter for counts.

            redrawHistogram(field, attrs, element[0]);

          }
        });
        //TODO(kanitw): take care of redraw
//        if(scope.field){
//          redrawHistogram(scope.field, attrs, element);
//        }


      },
      scope: {
        field: "=",
        width: "&",
        height: "&",
        yScale: "&"
      }
    };
  });
