'use strict';

angular.module('vizRecSrcApp')
  .directive('chart2d', function (dataManager, chartHelper) {
    //noinspection UnnecessaryLocalVariableJS
    var helper= chartHelper;
    var chartTypes = helper.chartTypes;

    function notHaveElement(elementType){
      return function(){ return d3.select(this).select(elementType).empty();}
    }

    /** create where clause for datavore from given fields's filterFn
     * to optimize for performance, fields should be sorted by likelihood to be filtered
     */
    function whereFiltered(fields){
      return function(table, row){
        for(var i=0 ; i<fields.length ; i++){
          if(fields[i].filterFn && !fields[i].filterFn(table.get(fields[i].name,row))){
            return false;
          }
        }
        return true;
      };
    }


    function getFormattedData(field, maxLength, reverse) {
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

      if(reverse) domain = domain.reverse();

      return domain.pluck("val").value();
    }

    function drawScatterPlot(chart, pair, attrs, scope){
      var xField = pair[1], yField = pair[0];

      //TODO(kanitw): refactor -- decouple this rel!
      var rel = ((dataManager.currentData.rel2d[yField.name]||{})[xField.name]||{})

      var margin = { top: 15 || attrs.marginTop ,
          right: 5 || attrs.marginLeft ,
          bottom: 35 ||  attrs.marginBottom,
          left: 35 || attrs.marginLeft },
        width = (attrs.width || 120) - margin.left - margin.right,
        height = (attrs.height || 120) - margin.top - margin.bottom;

      var svg = d3.select(chart).select("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);

      var main = svg.select("g.main")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

//      var results = dataManager.currentData.query({
//        dims: [yField.index, xField.index],
//        vals:[dv.count()],
//        where: whereFiltered([xField, yField])
//      });
//
//      var rY =results[0], rX = results[1], rCount=results[2];

      //TODO(kanitw): refactor -- decouple this rel!
      var filteredTable = dataManager.currentData.where(whereFiltered([xField,yField]));
      var filteredIndices = filteredTable[dataManager.currentData.indexCol.index];

      var indicesShown = filteredIndices;
      if(scope.sampling){
        indicesShown = helper.getRandomSubArray( filteredIndices, 500);
      }

      if(scope.includeOutliers){
        var outliers = rel["outliers"];
        if(outliers){
          indicesShown = _.union(indicesShown, outliers);
          //TODO(kanitw): write more optimal code for this
          var isOutlier = dv.array(xField.length);
          for(var i=0 ; i<outliers.length ; i++) isOutlier[outliers[i]] = 1;
        }
      }

      var x, y,  marks, innerTickSize=6;

      x = (xField.useLogScale ? d3.scale.log().domain([1, d3.max(xField)])
        : d3.scale.linear().domain([0, d3.max(xField)]))
        .range([0, width]);
      y = (yField.useLogScale ? d3.scale.log().domain([1, d3.max(yField)])
        : d3.scale.linear().domain([0, d3.max(yField)]))
        .range([height, 0]);
//      var opacity = d3.scale.pow(0.5).domain([0,d3.max(rCount)]).range([0.1,1]);

      var xAxis = d3.svg.axis().scale(x).orient("bottom").ticks(2).innerTickSize(innerTickSize)
        .tickFormat(helper.defaultNumberFormatter);
      var yAxis = d3.svg.axis().scale(y).orient("left").ticks(2).innerTickSize(innerTickSize)
        .tickFormat(helper.defaultNumberFormatter);



      marks = main.selectAll(".marks").data(indicesShown);

      marks.enter().append("g").append("circle");
      marks.filter(notHaveElement("circle")).append("circle"); //for ones previous has rect

      marks.attr("class","marks").attr("transform",null); //clear transform from other

      marks.select("rect").remove(); //TODO animate this

      marks.select("circle").transition().duration(500)
        .attr("cx", function(i){
          return x(xField[i]);
        })
        .attr("cy", function(i){
          return y(yField[i]);
        })
        .attr("r", 3)
        .style("fill", scope.includeOutliers ? function(i){ return isOutlier[i]? "#d62728" : "#1f77b4"; } : "#1f77b4")
        .style("fill-opacity", scope.includeOutliers ? function(i){ return isOutlier[i]? "0.08" : "0.24"; } : "0.24");

      marks.select("circle")
        .on("mouseover", helper.onMouseOver(chart,function(i){
          return "#"+ dataManager.currentData.indexCol[i] +" " +
            "("+ xField[i] +","+ yField[i] +")" +
            (scope.includeOutliers && isOutlier[i] ? " *" : "") +
            //show text fields
            //TODO(kanitw): this should be customizable
            "<br/>" +
            _(dataManager.currentData.textIndices).map(function(j){
              return dataManager.currentData[j].get(i);
            }).join(",")
            ;
        }))
        .on("mouseout", helper.onMouseOut(chart));

      marks.exit().remove();

      svg.select("g.x.axis")
        .attr("transform", "translate("+margin.left+"," + (margin.top + height) + ")")
        .call(xAxis);

      svg.select("g.y.axis")
        .attr("transform", "translate("+margin.left+"," + (margin.top) + ")")
        .call(yAxis);

      //remove div labels
      d3.select(chart).select(".x-labels").selectAll(".x-label").remove();
      d3.select(chart).select(".y-labels").selectAll(".y-label").remove();

      //draw trendline
      //TODO(kanitw): decouple this from this class

      //only show trendline for numeric for now
      var trends = svg.select("g.trends")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      trends.selectAll(".trend").remove();
      if(yField.type==dv.type.numeric && xField.type==dv.type.numeric){

        if(rel && "simple_linear_all" in rel){
          var estimate = rel['simple_linear_all']['coefs']['Estimate'];
          var keys = _.keys(estimate);
          //m,c we get from the original model are from centered y and x
          var centered_c = estimate[keys[0]];
          var centered_m = estimate[keys[1]];
          // uncentered values
          var m = centered_m * yField.sd / xField.sd;
          var c = yField.sd * (centered_c - centered_m * xField.avg / xField.sd) + yField.avg;

          //pick _x2, _y2 at the boundary of the drawing frame
          var _x1 = 0, _y1 = c;
          var _x2= x.domain()[1], _y2 = c + m * x.domain()[1];
          if(y.domain()[0] > _y2 || _y2 > y.domain()[1]){
            if(m>0){
              _y2 = y.domain()[1];
            }else{
              _y2 = y.domain()[0];
            }
            _x2 = (_y2 - c) / m;
          }

          trends.append("line")
            .attr("class","trend")
            .attr({x1:x(_x1), y1: y(_y1), x2:x(_x2), y2:y(_y2)})
            .style({
              stroke:'red',
              'stroke-width':1
            });
          //thicker line to make hovering easier!
          trends.append("line")
            .attr("class","trend")
            .attr({x1:x(_x1), y1: y(_y1), x2:x(_x2), y2:y(_y2)})
            .style({
              'stroke-width':4,
              'stroke':'white',
              'opacity': 0.01
            })
            .on("mouseover", helper.onMouseOver(chart, function(){
              return "slope="+ m.toPrecision(2)+", intercept="+ c.toPrecision(2);
            }))
            .on("mouseout", helper.onMouseOut(chart));
        }
      }
      //TODO(kanitw): show trendline for numeric ~ nominal
      //TODO(kanitw): show trendline for nominal ~ nominal
      //TODO(kanitw): show trendline for nominal ~ numeric (can we?)

      var xAxisPos = {x: width/2,y: height + 30};
      var yAxisPos = {x: -20, y: height/2};

      moveNamePos(svg, margin, xAxisPos, yAxisPos, width, height);

    }

    function drawHeatMap(chart, pair, attrs, scope){
      var xField = pair[1], yField = pair[0];
      var _xField = xField, _yField = yField;

      /** text formatter (default = Identify function aka do nothing) */
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
//      console.log(xField.countTable.length, yField.countTable.length);
//      console.log("type of x,y =", xField.type, yField.type);

      var where = whereFiltered([xField, yField]);

      var results = dataManager.currentData.query({
        dims: [yField.index, xField.index],
        vals:[dv.count()],
        where: where
      });

      var rowCount = dataManager.currentData.query({
        dims: [yField.index],
        vals: [dv.count()],
        where: where
      });

      var colCount = dataManager.currentData.query({
        dims: [xField.index],
        vals: [dv.count()],
        where: where
      });

      var rowCountIndex = helper.indexDict(rowCount[0]), colCountIndex = helper.indexDict(colCount[0]);

      var yArray = results[0], xArray=results[1], counts = results[2];

      var normIndex, nSums, i, normField, normArray, normCount;
      if(scope.normalize){
        if(scope.normalize == 'row'){
          normCount = rowCount;
          normArray = yArray;
          normIndex = rowCountIndex;
        }else if(scope.normalize =='col'){
          normCount = colCount;
          normArray = xArray;
          normIndex = colCountIndex;
        }

        for(i=0; i<counts.length; i++){
          var nsum = normCount[1][normIndex[normArray[i]]];
          if (nsum>0) counts[i]/=nsum;
        }
      }

      var margin = { top: 75 || attrs.marginTop , right: 15 || attrs.marginLeft , bottom: 10 ||  attrs.marginBottom, left: 75 || attrs.marginLeft },
        width = (attrs.width || 120) - margin.left - margin.right,
        height = (attrs.height || 120) - margin.top - margin.bottom;

      var svg = d3.select(chart).select("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);

      var main = svg.select("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      var x, y, yMax, marks, c;

      var xDomain = getFormattedData(xField, width/2);
      //for y, we need to reverse for numeric data so 0 are on the bottom
      var yDomain = getFormattedData(yField, height/2, _yField.type== dv.type.numeric);

      var reduceToMap = function(map, cur, index){
        map[cur] = index;
        return map;
      };

      var xDomainMap = xDomain.reduce(reduceToMap,{}), yDomainMap = yDomain.reduce(reduceToMap,{});

      x = d3.scale.ordinal().domain(xDomain).rangeRoundBands([0, width]);
      y = d3.scale.ordinal().domain(yDomain).rangeRoundBands([0,height]);
      c = d3.scale//. linear()
        .pow()
        .exponent(0.5)
        .domain([d3.min(counts),d3.max(counts)])
        .range(["#efefef", "#1f77b4"]);

      var svgRect = d3.select(chart).select("svg")[0][0].getBoundingClientRect();
      var chartRect = d3.select(chart)[0][0].getBoundingClientRect();

      var xAxisLabels = d3.select(chart).select(".x-labels").selectAll(".x-label").data(xDomain);
      if(x.rangeBand() < 8){
        xAxisLabels.remove();
      }else{
        var getX = function(d, i){return  i* x.rangeBand() + svgRect.left - chartRect.left + margin.left + "px"; };
        xAxisLabels.enter().append("div").attr("class","x-label");
        xAxisLabels
          .style("left", getX)
          .style("width", margin.top +"px") //TODO replace
          .style("height", x.rangeBand()+"px")
          .style("top", (svgRect.top - chartRect.top + margin.top - 3)+ "px")
          .text(helper.ellipsis(15, xFormatter))
          .on("mouseover", helper.onMouseOver(chart, function(d){
            return xFormatter(d) +
              "(" + colCount[1][colCountIndex[d]]  +  ")";
          }))
          .on("mouseout", helper.onMouseOut(chart));
        xAxisLabels.exit().remove();
        //rotate only if needed!
        if(!_.all(xDomain, function(d){ return d.toString().length * 5 < x.rangeBand();})){
          xAxisLabels.classed("rotate", true);
        }
      }

      var yAxisLabels = d3.select(chart).select(".y-labels").selectAll(".y-label").data(yDomain);
      if(y.rangeBand()<8){
        yAxisLabels.remove();
      }else{
        yAxisLabels.enter().append("div").attr("class","y-label");
        yAxisLabels //.transition().duration(500)
          .style("left", (svgRect.left - chartRect.left - 3) + "px")
          .style("width", margin.left + "px") //TODO replace with label width instead
          .style("height", y.rangeBand()+"px")
          .style("top", function(d,i){
            return margin.top + svgRect.top - chartRect.top + (i)* y.rangeBand() + "px";
          })
          .text(helper.ellipsis(15, yFormatter));
        yAxisLabels.on("mouseover", helper.onMouseOver(chart, function(d){
            return yFormatter(d) +
              "(" + rowCount[1][rowCountIndex[d]]  +  ")";
          }))
          .on("mouseout", helper.onMouseOut(chart));
        yAxisLabels.exit().remove();
      }

      //remove axis from other chart types
      svg.select("g.x.axis").selectAll("*").remove();
      svg.select("g.y.axis").selectAll("*").remove();

      //TODO improve way to filter indices shown
      //use only indices that are selected (top k)
      var indicesShown = _.filter(_.range(0, yArray.length), function(i){
        return xDomainMap[xArray[i]] !== undefined && yDomainMap[yArray[i]] !== undefined;
      });

      marks = main.selectAll(".marks")
        .data(indicesShown);

      marks.enter().append("g");

      marks.attr("class", "marks")
        .attr("transform", function (i) {
          return "translate(" + x(xArray[i]) +
            "," + y(yArray[i]) + ")";
        });

      marks.select("circle").remove(); //TODO animate this

      marks.filter(notHaveElement("rect")).append("rect");

      marks.select("rect")
        .on('mouseover', helper.onMouseOver(chart, function(i){
          var count = counts[i];
          if(scope.normalize){
            count = (counts[i]*100).toFixed(2)+"%" + " of "+normCount[1][normIndex[normArray[i]]];
          }

          return "("+ xFormatter(xArray[i]) +","+ yFormatter(yArray[i]) +")=" + count;
        }))
        .on('mouseout', helper.onMouseOut(chart))
        .transition().duration(500)
        .attr("x", 1)
        .attr("width", x.rangeBand()-1)
        .attr("height", y.rangeBand()-1)
        .style("fill", function(i){ return c(counts[i]);});

      marks.exit().remove();

      //remove trendlines
      var trends = svg.select("g.trends");
      trends.selectAll(".trend").remove();

      var xAxisPos = {x: width/2,y: height + 10};
      var yAxisPos = {x: width+10, y: height/2};

      moveNamePos(svg, margin, xAxisPos, yAxisPos, width, height);
    }


    function moveNamePos(svg, margin, xAxisPos, yAxisPos, width, height) {
      var names = svg.select("g.names")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
      names.select(".axis.x")
        .transition().duration(500)
        .attr(xAxisPos)
        .style({
          "text-anchor": 'middle'
        });
      names.select(".axis.y")
        .transition().duration(500)
        .attr(yAxisPos)
        .attr("transform", "rotate(270," + yAxisPos.x + "," + yAxisPos.y + ")")
        .style({
          "text-anchor": 'middle'
        });
    }

    function updateChart(chart, pair, attrs, scope){
      if(scope.chartType=="heatmap"  ||
        scope.pair[0].type != dv.type.numeric ||
        scope.pair[1].type != dv.type.numeric){
        drawHeatMap(chart, pair, attrs, scope);
      }else if(scope.chartType=="scatter"){
        drawScatterPlot(chart, pair, attrs, scope);
      }
    }

    return {
      templateUrl: 'views/chart2d.html',
      restrict: 'E',
      link: function postLink(scope, element, attrs) {
        scope.chartType= "scatter";
        scope.sampling = true;
        scope.includeOutliers = true;
        scope.normalize = null;

        function _updateChart(){
          updateChart(element.find(".chart")[0], scope.pair, attrs, scope);
        }

        scope.toggleChartType = function(){
          if(scope.chartType == chartTypes.heatmap){
            scope.chartType = chartTypes.scatter;
          }else{
            scope.chartType = chartTypes.heatmap;
          }
        };

        scope.$watch("pair", function(pair){
          scope.pairY = pair[0];
          scope.pairX = pair[1];
          scope.isQonQ = pair[0].type == dv.type.numeric && pair[1].type == dv.type.numeric;
          scope.chartType= scope.isQonQ ? "scatter" : "heatmap";
          if(pair){
            _updateChart();
          }
        });

        scope.$watch("pairX.filtered", _updateChart);
        scope.$watch("pairX.useLogScale", _updateChart);
        scope.$watch("pairY.filtered", _updateChart);
        scope.$watch("pairY.useLogScale", _updateChart);
        scope.$watch("chartType", _updateChart);
        scope.$watch("normalize", _updateChart);
      },
      scope:{
        pair:"="
      }
    };
  });
