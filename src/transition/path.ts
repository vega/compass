import {isAggregate} from 'vega-lite/src/encoding';
import {getEncodingMappingError} from 'vega-lite/src/validate';

import * as vlEncoding from 'vega-lite/src/encoding';
import * as vlFieldDef from 'vega-lite/src/fielddef';
import * as vlChannel from 'vega-lite/src/channel';
var isDimension = vlFieldDef.isDimension;
import * as vlShorthand from 'vega-lite/src/shorthand';

import {Mark} from 'vega-lite/src/mark';
import {Type} from 'vega-lite/src/type';
import {Encoding} from 'vega-lite/src/schema/encoding.schema';
import {CHANNELS} from 'vega-lite/src/channel';

import * as util from '../util';
import * as def from './def'

export function path (s, d) {


}

export function marktypePath (s, d) {
  var path = [];
  if(s.mark === d.mark) {
    return path;
  }
  else {
    var trName = [s.mark.toUpperCase(), d.mark.toUpperCase()].sort().join("_");
    path.push(def.DEFAULT_MARKTYPE_TRANSITIONS[trName]);
  }
  return path;
}

export function transformPath (s, d) {
  var path = [];
  var trans;
  if( trans = transformFilter(s, d) ){
    path.push(trans);
  }

  CHANNELS.forEach(function(channel){
    if( trans = transformBasic(s, d, channel,"scale") ){
      path.push(trans);
    }
    if( trans = transformBasic(s, d, channel,"sort") ){
      path.push(trans);
    }
    if( trans = transformBasic(s, d, channel,"aggregate") ){
      path.push(trans);
    }

    if( trans = transformSettype(s, d, channel) ){
      path.push(trans);
    }

  })
  return path;
}

export function transformBasic(s, d, channel, transform){
  var sHas = false
  var dHas = false;
  var transistion;
  if( s.encoding[channel] && s.encoding[channel][transform] ){
    sHas = true;
  }
  if( d.encoding[channel] && d.encoding[channel][transform] ){
    dHas = true;
  }

  if( sHas && dHas && ( util.rawEqual(s.encoding[channel][transform], d.encoding[channel][transform]))){
    transistion = util.duplicate(def.DEFAULT_TRANSFORM_TRANSITIONS[transform.toUpperCase()]);
    transistion.type = "modified"
    transistion.channel = channel;
    return transistion;
  }
  else if( sHas && !dHas ) {
    transistion = util.duplicate(def.DEFAULT_TRANSFORM_TRANSITIONS[transform.toUpperCase()]);
    transistion.type = "removed"
    transistion.channel = channel;
    return transistion
  }
  else if( !sHas && dHas ) {
    transistion = util.duplicate(def.DEFAULT_TRANSFORM_TRANSITIONS[transform.toUpperCase()]);
    transistion.type = "added"
    transistion.channel = channel;
    return transistion
  }
}

export function transformFilter(s, d){
  var uHasFilter = false;
  var vHasFilter = false;
  var transistion;
  if( s.transform && s.transform.filter ){
    uHasFilter = true;
  }
  if( d.transform && d.transform.filter ){
    vHasFilter = true;
  }

  if( uHasFilter && vHasFilter && ( util.rawEqual(s.transform.filter, d.transform.filter))){
    transistion = util.duplicate(def.DEFAULT_TRANSFORM_TRANSITIONS["FILTER"]);
    transistion.type = "modified"
    return transistion;
  }
  else if( uHasFilter && !vHasFilter ){
    transistion = util.duplicate(def.DEFAULT_TRANSFORM_TRANSITIONS["FILTER"]);
    transistion.type = "removed"
    return transistion;
  }
  else if( !uHasFilter && vHasFilter ){
    transistion = util.duplicate(def.DEFAULT_TRANSFORM_TRANSITIONS["FILTER"]);
    transistion.type = "added"
    return transistion;
  }

}

export function transformSettype(s, d, channel){
  var sHas = false
  var dHas = false;
  var transistion;
  if( s.encoding[channel] && d.encoding[channel]
      && ( d.encoding[channel]["field"] === s.encoding[channel]["field"] )
      && ( d.encoding[channel]["type"] !== s.encoding[channel]["type"] ) ){
    transistion = util.duplicate(def.DEFAULT_TRANSFORM_TRANSITIONS["SETTYPE"]);
    transistion.type = s.encoding[channel]["type"] + "_" + d.encoding[channel]["type"]
    transistion.channel = channel;
    return transistion;
  }
}
