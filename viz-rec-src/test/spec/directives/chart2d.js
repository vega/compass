'use strict';

describe('Directive: chart2d', function () {

  // load the directive's module
  beforeEach(module('vizRecSrcApp'));

  var element,
    scope;

  beforeEach(inject(function ($rootScope) {
    scope = $rootScope.$new();
  }));

  it('should make hidden element visible', inject(function ($compile) {
    element = angular.element('<chart2d></chart2d>');
    element = $compile(element)(scope);
    expect(element.text()).toBe('this is the chart2d directive');
  }));
});
