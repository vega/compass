import {expect} from 'chai';
import {fixture} from '../fixture';
import getMarks from '../../src/gen/marks';
import * as consts from '../../src/consts';
import * as vlSchema from 'vega-lite/src/schema/schema';
import * as vlShorthand from 'vega-lite/src/shorthand';

describe('cp.gen.marks()', function(){
  var opt;

  beforeEach(function() {
    opt = vlSchema.util.extend({}, consts.gen.encodings);
  });

  describe('#', function () {
    var f;

    beforeEach(function() {
      f = fixture['#'];
    });

    it('should generate point and bar', function() {
      var encoding = {x: f.fields[0]},
        marks = getMarks(encoding, f.stats, opt);

      expect(marks.length).to.eql(2);
      expect(marks).to.eql(['point', 'bar']);
    });
  });

  describe('1Q', function () {
    var encoding, marks;
    beforeEach(function() {
      encoding = {'x': {'field': 'Cost__Total_$','type': 'quantitative'}};
      marks = getMarks(encoding, {}, opt);
    });
    it('should contain tick', function () {
      expect(marks.indexOf('tick')).to.gt(-1);
    });
    it('should contain point', function () {
      expect(marks.indexOf('point')).to.gt(-1);
    });
  });

  it('should require at least one basic encoding', function (){
    // var basicEncodings = ['x','y','geo','text','arc'];
    // FIXME(kanitw): Jul 19, 2015 - write test

  });

  describe('point', function(){
    describe('scatter and bubble plots', function(){
      // TODO
    });

    describe('dot plot', function(){
      // TODO
    });
  });

  describe('bar', function () {
    describe('with stacked average', function () {
      it('should not be generated', function () {
        var encoding = {
          'color': {'field': 'When__Phase_of_flight','type': 'ordinal'},
          'x': {'field': 'Cost__Total_$','type': 'quantitative','aggregate': 'mean'},
          'y': {'selected': undefined,'field': 'Aircraft__Airline_Operator','type': 'ordinal'}
        };

        var marks = getMarks(encoding, {}, opt);
        expect(marks.indexOf('bar')).to.equal(-1);
      });
    });

    describe('with stacked sum', function () {
      it('should be generated', function () {
        var encoding = {
          'color': {'field': 'When__Phase_of_flight','type': 'ordinal'},
          'x': {'field': 'Cost__Total_$','type': 'quantitative','aggregate': 'sum'},
          'y': {'field': 'Aircraft__Airline_Operator','type': 'ordinal'}
        };
        var marks = getMarks(encoding, {}, opt);
        expect(marks.indexOf('bar')).to.gt(-1);
      });
    });
  });

  describe('line/area', function () {
    // TODO
  });

  describe('text', function() {
    it('should be generated', function () {
      var shorthand = 'row=1,O|text=mean_2,Q',
        encoding = vlShorthand.parseEncoding(shorthand),
        marks = getMarks(encoding, {}, opt);
      expect(marks.indexOf('text')).to.gt(-1);
    });

    it('should not contain size', function() {
      var encoding = {
        'column': {
          'field': 'Effect__Amount_of_damage',
          'type': 'ordinal',
        },
        'size': {
          'field': 'Cost__Repair','type': 'quantitative','aggregate': 'mean'
        },
        'text': {
          'field': 'Cost__Total_$','type': 'quantitative','aggregate': 'mean'
        }
      };

      var marks = getMarks(encoding, {}, opt);

      expect(marks.indexOf('text')).to.equal(-1);
    });
  });
});
