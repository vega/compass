'use strict';

describe('Service: Datamanager', function () {

  // load the service's module
  beforeEach(module('VizrecsrcApp'));

  // instantiate service
  var Datamanager;
  beforeEach(inject(function (_Datamanager_) {
    Datamanager = _Datamanager_;
  }));

  it('should do something', function () {
    expect(!!Datamanager).toBe(true);
  });

});
