

var chai = require('chai'),
  expect=chai.expect,
  assert=chai.assert;
var path = "../";
var dt = require(path+'dataTypes');

chai.should();

describe('DataType', function(){
  describe('#isType()', function () {
    it("know if types are similar", function(done){
      dt.categorical.isType("categorical").should.be.true;
      [dt.categorical, dt.ordinal, dt.interval].forEach(function(t){
        assert.isTrue(t.isType("categorical"));
      });

      [dt.ordinal, dt.interval].forEach(function(t){
        assert.isFalse(dt.categorical.isType(t.name));
      });

      done();
    });
  });

  describe('#allSubtypes', function(){
    it("should return correct allSubTypes", function(done){
      assert.sameMembers(dt.categorical.allSubtypes(), [dt.categorical, dt.ordinal, dt.interval, dt.datetime, dt.geographic]);

      assert.sameMembers(dt.aggregate.allSubtypes(), [dt.aggregate, dt.quantitative, dt.count]);
      done();
    });
  });
});