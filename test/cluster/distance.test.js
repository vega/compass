'use strict';

var expect = require('chai').expect,
  distance = require('../../src/cluster/distance');

describe('cp.cluster.distance.get()', function () {
  it('should return correct distance', function() {
    var table1 = {
      "marktype": "text",
      "encoding": {
        "row": {"name": "Effect__Amount_of_damage","type": "ordinal"},
        "col": {"name": "Aircraft__Airline_Operator","type": "ordinal"},
        "text": {"name": "*","aggregate": "count","type": "quantitative","displayName": "Number of Records"}
      }
    };

    var table2 = {
      "marktype": "text",
      "encoding": {
        "col": {"name": "Effect__Amount_of_damage","type": "ordinal"},
        "row": {"name": "Aircraft__Airline_Operator","type": "ordinal"},
        "text": {"name": "*","aggregate": "count","type": "quantitative","displayName": "Number of Records"}
      }
    };

    var colenc1 = distance.extendSpecWithChannelByColumnName(table1),
      colenc2 = distance.extendSpecWithChannelByColumnName(table2);

    expect(distance.get(colenc1, colenc2)).to.lt(1);
  });
});