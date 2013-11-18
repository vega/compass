'use strict';

angular.module('vizRecSrcApp')
  .directive('chart2d', function (dataManager, chartHelper) {
    var helper= chartHelper;
    function drawHeatMap(pair, attrs, chart, scope){
      var xField = pair[1], yField = pair[0];

      if(xField.type == dv.type.numeric){

        xField = xField.bin20;
      }else if(xField.type != dv.type.nominal && xField.type != dv.type.ordinal){
        console.log("xField", xField.type, "doesn't qualify");
        return;
      }

      if(yField.type== dv.type.numeric){
        yField = yField.bin20;
      }else if(yField.type != dv.type.nominal && yField.type!= dv.type.ordinal){
        console.log("yField", yField.type, "doesn't qualify");
        return;
      }

//      if(xField.type != "nominal" || xField.type != "nominal")
//        return;

//      console.log(xField.countTable.length, yField.countTable.length);
//      console.log("type of x,y =", xField.type, yField.type);

      var results = dataManager.currentData.query({dims: [yField.index, xField.index], vals:[dv.count()]});
      var yArray = results[0], xArray=results[1], counts = results[2];
//      console.log("counts=",counts);

      var margin = { top: 75 || attrs.marginTop , right: 5 || attrs.marginLeft , bottom: 5 ||  attrs.marginBottom, left: 75 || attrs.marginLeft },
        width = (attrs.width || 120) - margin.left - margin.right,
        height = (attrs.height || 120) - margin.top - margin.bottom;

      var svg = d3.select(chart).select("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);

      var main = svg.select("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      var x, y, yMax, rect, c;

      //TODO pluck, last is not efficient here, cutting top stuff is not that great
      var xDomain = _(xField.countTable).sortBy("count").last(width/2).reverse()
        .pluck("val").value();
      var makeIndicesMap = function(array){
        return array.reduce(function(map, cur, index){
//          console.log(array, map, cur, index);
          map[cur] = index;
          return map;
        },{});
      };

      //TODO pluck, last is not efficient here, cutting top stuff is not that great
      var yDomain = _(yField.countTable).sortBy("count").last(height/2).reverse()
        .pluck("val").value();
      var xDomainMap = makeIndicesMap(xDomain), yDomainMap = makeIndicesMap(yDomain);

//      console.log("domains: ", xDomain, yDomain);

      x = d3.scale.ordinal().domain(xDomain).rangeRoundBands([0, width]);
      y = d3.scale.ordinal().domain(yDomain).rangeRoundBands([0,height]);
      c = d3.scale//. linear()
        .pow()
        .exponent(0.5)
        .domain([d3.min(counts),d3.max(counts)])
        .range(["#efefef", "steelblue"]);



      var xAxisGroup=svg.select("g.x.axis")
        .attr("transform","translate("+margin.left+","+(margin.top-3)+")")
        .selectAll("text");
      if(x.rangeBand() < 8){
        xAxisGroup.remove();
      }else{
        var getX = function(d, i){return  (i+0.5)* x.rangeBand(); }
        xAxisGroup = xAxisGroup.data(xDomain);
        xAxisGroup.enter().append("text");
        xAxisGroup.attr("x", getX)
          .style("text-anchor","start")
          .text(helper.ellipsis())
          .on("mouseover", helper.onMouseOver(chart, helper.I))
          .on("mouseout", helper.onMouseOut(chart));
        //rotate only if needed!
        if(!_.all(xDomain, function(d){ return d.toString().length < 3;})){
          xAxisGroup.attr("transform",function(d,i){ return "rotate(270,"+getX(d, i)+",0)";})
        }

      }

      var yAxisGroup=svg.select("g.y.axis")
        .attr("transform","translate("+margin.left+","+margin.top+")")
        .selectAll("text");
      if(y.rangeBand() < 8){
        yAxisGroup.remove();
      }else{
        yAxisGroup = yAxisGroup.data(yDomain);
        yAxisGroup.enter().append("text");
        yAxisGroup.attr("y", function(d, i){return  (i+0.7)* y.rangeBand(); })
          .style("text-anchor","end")
          .text(helper.ellipsis())
          .on("mouseover", helper.onMouseOver(chart, helper.I))
          .on("mouseout", helper.onMouseOut(chart));

      }



      rect = main.selectAll(".rect")
        .data(d3.range(0,yArray.length));

      rect.enter().append("g").append("rect");

      rect.attr("class", "rect")
        .attr("transform", function (i) {
          return "translate(" + x(xArray[i]) +
            "," + y(yArray[i]) + ")";
        });

      rect.select("rect")
        .attr("x", 1)
        .attr("width", x.rangeBand()-1)
        .attr("height", y.rangeBand()-1)
        .style("fill", function(i){ return c(counts[i]);})
        .on('mouseover', helper.onMouseOver(chart, function(i){ return "("+xArray[i] +","+ yArray[i] +")="+ counts[i]; }))
        .on('mouseout', helper.onMouseOut(chart));

//      svg.append("g")
//        .attr("class", "x axis")
//        .attr("transform", "translate(0," + height + ")")
//        .call(xAxis);


    }

    function updateChart(chart, pair, attrs, scope){
      drawHeatMap(chart, pair, attrs, scope)
    }

    return {
      templateUrl: 'views/chart2d.html',
      restrict: 'E',
      link: function postLink(scope, element, attrs) {
        function _updateChart(){
          updateChart(element.find(".chart")[0], scope.pair, attrs, scope);
        }
        scope.$watch("pair", function(pair){
          if(pair){
            drawHeatMap(pair, attrs, element[0], scope);
          }
        })
      },
      scope:{
        pair:"="
      }
    };
  });
