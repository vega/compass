'use strict';

angular.module('vizRecSrcApp')
  .directive('chart2d', function (dataManager, chartHelper) {
    //noinspection UnnecessaryLocalVariableJS
    var helper= chartHelper;


    function getFormattedData(field, maxLength) {
      var domain = _(field.countTable);
      //TODO(kanitw): options for sortBy methods here.
      //TODO(kanitw): pluck, last is not efficient here, cutting top stuff is not that great
      if (field.countTable.length > maxLength) {
        //noinspection JSCheckFunctionSignatures
        domain = domain.sortBy("count")
          .last(maxLength).reverse();
      }

      if(field.type === dv.type.ordinal || field.type === dv.type.numeric){
        domain = domain.sortBy(function(d){ return +d.val || d;});
      }else{
        domain = domain.sortBy("val");
      }

      return domain.pluck("val").value();
    }

    function drawScatterPlot(chart, pair, attrs, scope){
      var xField = pair[1], yField = pair[0];

      var margin = { top: 15 || attrs.marginTop ,
          right: 5 || attrs.marginLeft ,
          bottom: 35 ||  attrs.marginBottom,
          left: 35 || attrs.marginLeft },
        width = (attrs.width || 120) - margin.left - margin.right,
        height = (attrs.height || 120) - margin.top - margin.bottom;

      var svg = d3.select(chart).select("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);

      var main = svg.select("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      var x, y, marks, innerTickSize=6;

      x = (xField.useLogScale ? d3.scale.log().domain([1, d3.max(xField)])
        : d3.scale.linear().domain([0, d3.max(xField)]))
        .range([0, width]);
      y = (yField.useLogScale ? d3.scale.log().domain([1, d3.max(yField)])
        : d3.scale.linear().domain([0, d3.max(yField)]))
        .range([height, 0]);

      var xAxis = d3.svg.axis().scale(x).orient("bottom").ticks(2).innerTickSize(innerTickSize)
        .tickFormat(helper.defaultNumberFormatter);
      var yAxis = d3.svg.axis().scale(y).orient("left").ticks(2).innerTickSize(innerTickSize)
        .tickFormat(helper.defaultNumberFormatter);

      var indicesShown = d3.range(0, xField.length);

      marks = main.selectAll(".marks").data(indicesShown);

      marks.enter().append("g").attr("class","marks").append("circle");

      marks.select("circle").transition().duration(500)
        .attr("cx", function(i){
          return x(xField[i]);
        })
        .attr("cy", function(i){
          return y(yField[i]);
        })
        .attr("r", 3)
        .style({
          "fill": "steelblue",
          "fill-opacity": "0.1"
        });


      marks.attr("class","circle-plot")
        .select("circle")
        .on("mouseover", helper.onMouseOver(chart,function(i){
          return "("+ xField[i] +","+ yField[i] +")";
        }))
        .on("mouseout", helper.onMouseOut(chart));

      svg.select("g.x.axis")
        .attr("transform", "translate("+margin.left+"," + (margin.top + height) + ")")
        .call(xAxis);

      svg.select("g.y.axis")
        .attr("transform", "translate("+margin.left+"," + (margin.top) + ")")
        .call(yAxis);
    }

    function drawHeatMap(chart, pair, attrs, scope){
      var xField = pair[1], yField = pair[0];

      /** textformatter (default = Identify function aka do nothing) */
      var xFormatter = helper.I, yFormatter = helper.I;

      var xIsNumeric = xField.type == dv.type.numeric,
        yIsNumeric = yField.type == dv.type.numeric;

      if(xIsNumeric){
        xField = xField.bin20;
      }else if (xField.type == dv.type.date){
        xField = xField.month;
        xFormatter = chartHelper.getMonth;
      }else if(xField.type != dv.type.nominal && xField.type != dv.type.ordinal){
        console.log("xField", xField.type, "doesn't qualify");
        return;
      }

      if(yIsNumeric){
        yField = yField.bin20;
      }else if(yField.type == dv.type.date){
        yField = yField.month;
        yFormatter = chartHelper.getMonth;
      }else if(yField.type != dv.type.nominal && yField.type!= dv.type.ordinal){
        console.log("yField", yField.type, "doesn't qualify");
        return;
      }

//      if(xField.type != "nominal" || xField.type != "nominal")
//        return;

//      console.log(xField.countTable.length, yField.countTable.length);
//      console.log("type of x,y =", xField.type, yField.type);

      var results = dataManager.currentData.query({
        dims: [yField.index, xField.index],
        vals:[dv.count()],
        where: function(table, row){
          return (!xField.filterFn || xField.filterFn(table.get(xField.name,row))) &&
            (!yField.filterFn || yField.filterFn(table.get(yField.name,row)));
        }
      });
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

      var x, y, yMax, marks, c;

      var xDomain = getFormattedData(xField, width/2);
      var yDomain = getFormattedData(yField, height/2);

      var reduceToMap = function(map, cur, index){
        map[cur] = index;
        return map;
      };

      var xDomainMap = xDomain.reduce(reduceToMap,{}), yDomainMap = yDomain.reduce(reduceToMap,{});

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
          .text(helper.ellipsis(15, xFormatter))
          .on("mouseover", helper.onMouseOver(chart, helper.I))
          .on("mouseout", helper.onMouseOut(chart));
        //rotate only if needed!
        if(!_.all(xDomain, function(d){ return d.toString().length * 5 < x.rangeBand();})){
          xAxisGroup.attr("transform",function(d,i){ return "rotate(270,"+getX(d, i)+",0)";})
            .attr("dy",5);
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
        yAxisGroup.attr("y", function(d, i){return  (i+0.5)* y.rangeBand(); })
          .attr("dy",2.5)
          .style("text-anchor","end")
          .text(helper.ellipsis(15, yFormatter))
          .on("mouseover", helper.onMouseOver(chart, helper.I))
          .on("mouseout", helper.onMouseOut(chart));

      }

      //TODO improve way to filter indices shown
      //use only indices that are selected (top k)
      var indicesShown = _.filter(_.range(0, yArray.length), function(i){
        return xDomainMap[xArray[i]] !== undefined && yDomainMap[yArray[i]] !== undefined;
      });

      marks = main.selectAll(".marks")
        .data(indicesShown);

      marks.enter().append("g").append("rect");

      marks.attr("class", "marks")
        .attr("transform", function (i) {
          return "translate(" + x(xArray[i]) +
            "," + y(yArray[i]) + ")";
        });

      marks.select("rect")
        .attr("x", 1)
        .attr("width", x.rangeBand()-1)
        .attr("height", y.rangeBand()-1)
        .style("fill", function(i){ return c(counts[i]);})
        .on('mouseover', helper.onMouseOver(chart, function(i){
          return "("+ xFormatter(xArray[i]) +","+ yFormatter(yArray[i]) +")="+ counts[i];
        }))
        .on('mouseout', helper.onMouseOut(chart));
    }

    function updateChart(chart, pair, attrs, scope){
      if(pair[0].type == dv.type.numeric && pair[1].type == dv.type.numeric){
        drawScatterPlot(chart, pair, attrs, scope);
      }else{
        drawHeatMap(chart, pair, attrs, scope);
      }
    }

    return {
      templateUrl: 'views/chart2d.html',
      restrict: 'E',
      link: function postLink(scope, element, attrs) {
        function _updateChart(){
          updateChart(element.find(".chart")[0], scope.pair, attrs, scope);
        }
        scope.$watch("pair", function(pair){
          scope.pairY = pair[0];
          scope.pairX = pair[1];
          if(pair){
            _updateChart();
          }
        });

        scope.$watch("pairX.filtered", _updateChart);
        scope.$watch("pairY.useLogScale", _updateChart);
        scope.$watch("pairX.filtered", _updateChart);
        scope.$watch("pairY.useLogScale", _updateChart);
      },
      scope:{
        pair:"="
      }
    };
  });
