'use strict';

describe('Service: Charthelper', function () {

  // load the service's module
  beforeEach(module('VizrecsrcApp'));

  // instantiate service
  var Charthelper;
  beforeEach(inject(function (_Charthelper_) {
    Charthelper = _Charthelper_;
  }));

  it('should do something', function () {
    expect(!!Charthelper).toBe(true);
  });

});
