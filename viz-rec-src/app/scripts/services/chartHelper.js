'use strict';

angular.module('vizRecSrcApp')
  .service('chartHelper', function chartHelper() {
    var self = this;

    this.formatCount = d3.format(",.0f"); 
    this.isNull = function(x){ return x===null || x === "";};
    this.isNotNull = function(x){ return !self.isNull(x);};
    this.isFieldNull = function(field){
      return function (d) {
        return self.isNull(d[field]);
      };
    };
    this.isFieldNotNull = function(field){
      return function(d){
        return !self.isNull(d[field]);
      };
    };

    this.getKey = function(xField){
      return function(d){ return d[xField];};
    };

    this.titleTextFromXY = function (xField, yField) {
      return function (d) {
        return d[xField || "x"] + "(" + self.formatCount(d[yField || "y"]) + ")";
      };
    };

    this.ellipsis = function(maxLength){
      maxLength = maxLength || 15; //set default
      return function(d){ return d.length > maxLength ?  d.substr(0,maxLength) +"..." : d; };
    };


    this.pos = function(x){ return x>=0 ? x: 0;};

    this.onMouseOver = function(chart, titleText){
      return function(d){
        d3.select(chart).select(".tooltip")
          .style({
            "opacity": 0.8,
            "left": (d3.event.pageX + 8) + "px",
            "top": (d3.event.pageY + 8) +"px"
          })
          .text(titleText(d));
      };
    };

    this.onMouseOut = function(chart){
      return function(){
        d3.select(chart).select(".tooltip")
          .style("opacity",0)
      };
    };
  });
