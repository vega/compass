/* jshint expr:true */

var chai = require('chai'),
  assert = chai.assert,
  util = require('util');

chai.should();
chai.config.includeStack = true;

var path = "../";

var _ = require('lodash');
var dt = require(path+'dataTypes');
var templates = require(path+'/chartTemplates');
var template = require(path+'/chartTemplate');
var field = require(path+"/field");


var C_Q = {categorical:1, quantitative:1};
var CGQ = {"categorical":1,"geographic":1,"quantitative":1};
var Count3 = {"count":3};

describe('ChartTemplates', function(){
  it('findByDataTypes', function () {
    _.pluck(templates.findByDataTypes(C_Q), "id").should.have.same.members(
      ['histogram', 'bar-chart', 'text-table', 'plot-raw--y:C-color:_'],
    "test");
  });

});

describe('ChartTemplate', function(){
  describe('satisfyFieldTypeCount', function(){
    it("summary-table  should satisfy correct dataTypes", function(){
      var summaryTable = templates["summary-table"];

      summaryTable.satisfyFieldTypeCount({quantitative:1}).should.be.true;
      summaryTable.satisfyFieldTypeCount({count:1}).should.be.false;

      //testing disabled small multiples
      summaryTable.satisfyFieldTypeCount({quantitative:2}).should.be.false;
      summaryTable.satisfyFieldTypeCount({quantitative:1,categorical:1}).should.be.false;

    });

    it("bar-chart should satisfy correct dataTypes", function(){
      var barChart = templates["bar-chart"];

      barChart.satisfyFieldTypeCount({
        quantitative: 1,
        categorical: 1
      }).should.be.true;
      barChart.satisfyFieldTypeCount({
        quantitative: 2
      }).should.be.false;
      barChart.satisfyFieldTypeCount({
        quantitative: 1,
        categorical: 3
      }).should.be.true;
      barChart.satisfyFieldTypeCount({
        quantitative: 3, //multiple quants
        categorical: 1
      }).should.be.true;

      barChart.satisfyFieldTypeCount({
        quantitative: 1,
        datetime: 1
      }).should.be.true;
    });

    it('text-table should satisfy correct dataTypes', function () {
      var textTable = templates['text-table'];
      textTable.satisfyFieldTypeCount({quantitative:1}).should.be.false;
      textTable.satisfyFieldTypeCount({quantitative:2}).should.be.false;
      textTable.satisfyFieldTypeCount({quantitative:1,categorical:1}).should.be.true;
      textTable.satisfyFieldTypeCount({count:1,categorical:1}).should.be.true;
    });

    it("histogram should satisfy correct dataTypes", function(){
      var histogram = templates['histogram'];
      histogram.satisfyFieldTypeCount({quantitative:1}).should.be.true;
      histogram.satisfyFieldTypeCount({quantitative:2}).should.be.false;
      histogram.satisfyFieldTypeCount({count:1}).should.be.false;
      histogram.satisfyFieldTypeCount({aggregate:1}).should.be.false;
    });

    it("plot-raw should satisfy correct dataTypes", function(){
      var plotRaw = templates.GROUPS['plot-raw'];
      plotRaw.satisfyFieldTypeCount({
        quantitative: 1
      }).should.be.false;
      plotRaw.satisfyFieldTypeCount({
        quantitative: 2
      }).should.be.true;
      plotRaw.satisfyFieldTypeCount({
        quantitative: 3
      }).should.be.true;
      plotRaw.satisfyFieldTypeCount({
        quantitative: 4
      }).should.be.true;


      plotRaw.satisfyFieldTypeCount({
        quantitative: 2,
        categorical: 1
      }).should.be.true;

    });

    it("plot-agg should satisfy correct dataTypes", function(){
      var plotAgg = templates.GROUPS['plot-agg'];
      plotAgg.satisfyFieldTypeCount({
        quantitative: 1
      }).should.be.false;
      plotAgg.satisfyFieldTypeCount({
        quantitative: 2
      }).should.be.false;
      plotAgg.satisfyFieldTypeCount({
        quantitative: 3
      }).should.be.true;
      plotAgg.satisfyFieldTypeCount({
        quantitative: 4
      }).should.be.true;


      plotAgg.satisfyFieldTypeCount({
        quantitative: 2,
        categorical: 1
      }).should.be.true;
    });

    it("line should satisfy correct dataTypes", function(){
      var lineChart = templates['line-chart'];
      lineChart.satisfyFieldTypeCount({
        quantitative: 1,
        datetime: 1
      }).should.be.true;

      lineChart.satisfyFieldTypeCount({
        quantitative: 5,
        datetime: 1
      }).should.be.true;

      lineChart.satisfyFieldTypeCount({
        quantitative: 1,
        categorical: 1
      }).should.be.false;
    });

    //TODO(kanitw) test two type of colored line/area
    //TODO(kanitw): test "sameUnit" once implemented
  });

  describe('generateCharts', function () {
    var c_q = field.fromTypeCountMap(C_Q);
    var cgq = field.fromTypeCountMap(CGQ);

    function rf(fieldTypes){
      return _.reduce(fieldTypes, function(arr, count, type){
        var i=0;
        for(i=0; i<count; i++){
          arr.push({
            "data_type": type,
            "key": dt[type].short+"-"+i
          });
        }
        return arr;
      },[]);
    }


    it('histogram', function () {
      var histogram = templates['histogram'];

      histogram.generateCharts(c_q).length.should.equal(1);


      var cgq_hists = histogram.generateCharts(cgq),
        cgq_hist = cgq_hists[0];
      //console.log("hist", util.inspect(histogram.generateCharts(cgq)));
      cgq_hists.length.should.equal(2);
    });


    it('barChart', function () {
      var barChart = templates['bar-chart'];
      assert.deepEqual(barChart.generateCharts(c_q)[0].fields, {
         "x": ["Q1"],
         "y": ["C1"]
      });

      // [{
      //     "count": 3,
      //     "fields": {
      //         "x": ["Q-0"],
      //         "y": ["C-0"],
      //         "row": ["G-0"]
      //     },
      //     "chart_type": "BAR"
      // }, {
      //     "count": 3,
      //     "fields": {
      //         "x": ["Q-0"],
      //         "y": ["G-0"],
      //         "row": ["C-0"]
      //     },
      //     "chart_type": "BAR"
      // }]
//      console.log("hist", util.inspect(barChart.generateCharts(cgq)));
      barChart.generateCharts(cgq).length.should.equal(2);
    });
  });
});