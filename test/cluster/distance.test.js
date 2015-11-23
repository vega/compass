'use strict';

var expect = require('chai').expect,
  distance = require('../../src/cluster/distance');

describe('cp.cluster.distance.get()', function () {
  it('should return correct distance', function() {
    var table1 = {
      "marktype": "text",
      "encoding": {
        "row": {"field": "Effect__Amount_of_damage","type": "ordinal"},
        "column": {"field": "Aircraft__Airline_Operator","type": "ordinal"},
        "text": {"field": "*","aggregate": "count","type": "quantitative","displayName": "Number of Records"}
      }
    };

    var table2 = {
      "marktype": "text",
      "encoding": {
        "column": {"field": "Effect__Amount_of_damage","type": "ordinal"},
        "row": {"field": "Aircraft__Airline_Operator","type": "ordinal"},
        "text": {"field": "*","aggregate": "count","type": "quantitative","displayName": "Number of Records"}
      }
    };

    var colenc1 = distance.extendSpecWithChannelByColumnName(table1),
      colenc2 = distance.extendSpecWithChannelByColumnName(table2);

    expect(distance.get(colenc1, colenc2)).to.lt(1);
  });
});