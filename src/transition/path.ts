"use strict";

import {Mark} from 'vega-lite/src/mark';
import {Type} from 'vega-lite/src/type';
import {Encoding} from 'vega-lite/src/schema/encoding.schema';
import {CHANNELS} from 'vega-lite/src/channel';

import * as util from '../util';
import * as def from './def'
import * as nb from './neighbor';

export function TransitionSet (s, d) {


}

export function marktypeTransitionSet (s, d) {
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

export function transformTransitionSet (s, d) {
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

export function encodingTransitionSet(s, d){
  var sChannels = util.keys(s.encoding);
  var sFields = sChannels.map(function(key){
    return s.encoding[key].field;
  });
  var dChannels = util.keys(d.encoding);
  var dFields = dChannels.map(function(key){
    return d.encoding[key].field;
  });
  var remainedFields = util.arrayDiff(dFields, sFields).map(function(field){
    return { "field" : field };
  });
  var remainedChannels = util.arrayDiff(dChannels, sChannels);
  
  //Dijkstra's algorithm
  var u;
  function nearestNode(nodes){
    var minD = Infinity;
    var argMinD = -1;
    nodes.forEach(function(node, index){
      if(node.distance < minD ){
        minD = node.distance;
        argMinD = index;
      }
    });
    return nodes.splice(argMinD, 1)[0];
  }
  //create node array NextCandidates
  var nodes = nb.neighbors(s, remainedFields, remainedChannels)
                .map(function(neighbor){
    return { spec: neighbor.spec,
      distance: neighbor.transition.cost,
      remainedFields: neighbor.remainedFields,
      remainedChannels: neighbor.remainedChannels,
      prev: [{spec:s, transition: neighbor.transition }]
     };
  });

  var doneNodes = [ { spec: s,
    distance: 0,
    prev: []
   }];

  while(nodes.length > 0){

    u = nearestNode(nodes);

    if( nb.sameEncoding(u.spec.encoding, d.encoding) ){
      break;
    }

    var alreadyDone = false;
    var newNodes = nb.neighbors(u.spec, u.remainedFields, u.remainedChannels);
    newNodes.forEach(function(newNode){
      var node;
      for(let i = 0; i < doneNodes.length; i+=1){

        if(nb.sameEncoding(doneNodes[i].spec.encoding, newNode.spec.encoding)){

          return;
        }
      }

      for(let i = 0; i < nodes.length; i+=1){
        if(nb.sameEncoding(nodes[i].spec.encoding, newNode.spec.encoding)){

          node = nodes[i];
          break;
        }
      }

      if( node ){

        if(node.distance > u.distance + newNode.transition.cost){
          node.distance = u.distance + newNode.transition.cost;
          node.prev = u.prev.concat([{ spec: u.spec, transition: newNode.transition }]);
        }
      }
      else {
        nodes.push({ spec: newNode.spec,
          distance: u.distance + newNode.transition.cost,
          remainedFields: newNode.remainedFields,
          remainedChannels: newNode.remainedChannels,
          prev: u.prev.concat([{ spec: u.spec, transition: newNode.transition }])
        });
      }
    });

  }

  return u;

}
