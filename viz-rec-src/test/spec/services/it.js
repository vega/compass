'use strict';

describe('Service: It', function () {

  // load the service's module
  beforeEach(module('VizrecsrcApp'));

  // instantiate service
  var It;
  beforeEach(inject(function (_It_) {
    It = _It_;
  }));

  it('should do something', function () {
    expect(!!It).toBe(true);
  });

});
