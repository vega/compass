'use strict';

angular.module('vizRecSrcApp')
  .service('chartHelper', function chartHelper() {
    var self = this;

    /** identity function **/
    this.I = function(d){return d;};

    this.NULL_VALUES = [null, "", "NaN"];

    this.formatCount = d3.format(",.0f"); 
    this.isNull = function(x){
      return _.contains(self.NULL_VALUES,x);
    };
    this.isNonZero = function(x){return x !== 0;};

    this.isNotNull = function(x){ return !_.contains(self.NULL_VALUES,x);};
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

    this.checkField = function(field, fn){
      return function(d){
        return fn(d[field]);
      }
    };

    this.getKey = function(xField){
      return function(d){ return d[xField];};
    };

    this.chartTypes = {
      histogram: "histogram",
      stack1d: "stack1d",
      scatter: "scatter",
      heatmap: "heatmap"
    };

    this.fieldTypeShort = {
      "numeric": "n",
      "ordinal": "o",
      "nominal": "c"
    };

    var month=new Array();
    month[0]="January";
    month[1]="February";
    month[2]="March";
    month[3]="April";
    month[4]="May";
    month[5]="June";
    month[6]="July";
    month[7]="August";
    month[8]="September";
    month[9]="October";
    month[10]="November";
    month[11]="December";

    //TODO(kanitw): add variation of
    this.getMonth = function(i){
      return month[i];
    };


    var weekday=new Array(7);
    weekday[0]="Sunday";
    weekday[1]="Monday";
    weekday[2]="Tuesday";
    weekday[3]="Wednesday";
    weekday[4]="Thursday";
    weekday[5]="Friday";
    weekday[6]="Saturday";

    this.defaultNumberFormatter = function (d) {
      return _.isNumber(d) && d > 10000 ? d.toPrecision(2) : d;
    }

    this.getWeekday = function(i){
      return weekday[i];
    };

    this.titleTextFromXY = function (xField, yField) {
      return function (d) {
        return d[xField || "x"] + "(" + self.formatCount(d[yField || "y"]) + ")";
      };
    };

    this.ellipsis = function(maxLength, textFormatter){
      maxLength = maxLength || 15; //set default
      return function(data){
        var d = textFormatter ? textFormatter(data) : data;
        return d && d.length > maxLength ?  d.substr(0,maxLength) +"..." : d;
      };
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
          .html(titleText(d));
      };
    };

    this.onMouseOut = function(chart){
      return function(){
        d3.select(chart).select(".tooltip")
          .style("opacity",0)
      };
    };

    this.getRandomSubArray = function (arr, size) {
      var shuffled = arr.slice(0), i = arr.length, min = i - size, temp, index;
      while (i-- > min) {
        index = Math.floor(i * Math.random());
        temp = shuffled[index];
        shuffled[index] = shuffled[i];
        shuffled[i] = temp;
      }
      return shuffled.slice(min);
    }
  });
