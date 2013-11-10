'use strict';

describe('Directive: histogram', function () {

  // load the directive's module
  beforeEach(module('vizRecSrcApp'));

  var element,
    scope;

  beforeEach(inject(function ($rootScope) {
    scope = $rootScope.$new();
  }));

  it('should make hidden element visible', inject(function ($compile) {
    element = angular.element('<histogram></histogram>');
    element = $compile(element)(scope);
    expect(element.text()).toBe('this is the histogram directive');
  }));
});
