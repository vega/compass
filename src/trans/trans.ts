"use strict";

import {Mark} from 'vega-lite/src/mark';
import {Type} from 'vega-lite/src/type';
import {Encoding} from 'vega-lite/src/schema/encoding.schema';
import {CHANNELS} from 'vega-lite/src/channel';

import * as util from '../util';
import * as def from './def'
import * as nb from './neighbor';

export function transitionSet (s, d) {
  var transitions = {
    marktype: marktypeTransitionSet(s, d),
    transform: transformTransitionSet(s, d),
    encoding: encodingTransitionSet(s, d)
  };

  return transitions;
}

export function marktypeTransitionSet (s, d) {
  var transSet = [];
  if(s.mark === d.mark) {
    return transSet;
  }
  else {
    var trName = [s.mark.toUpperCase(), d.mark.toUpperCase()].sort().join("_");
    transSet.push(util.duplicate(def.MARKTYPE_TRANSITIONS[trName]));
  }
  return transSet;
}

export function transformTransitionSet (s, d) {
  var transSet = [];
  var trans;
  var already;
  if( trans = transformFilter(s, d) ){
    transSet.push(trans);
  }

  CHANNELS.forEach(function(channel){
    ["scale", "sort", "aggregate", "bin", "settype"].map(function(transformType){

      if( transformType === "settype"){
        trans = transformSettype(s, d, channel);
      }
      else {
        trans = transformBasic(s, d, channel, transformType);
      }

      if( trans ){
        already = util.find(transSet,function(item){ return item.name; },trans)
        if( already >= 0 ){
          transSet[already].details.push(trans.detail);
        }
        else{
          transSet.push(trans);
          transSet[transSet.length - 1].details = [];
          transSet[transSet.length - 1].details.push(trans.detail);
          delete transSet[transSet.length - 1].detail;
        }
      }
    });
  });
  return transSet;
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

  if( sHas && dHas && ( !util.rawEqual(s.encoding[channel][transform], d.encoding[channel][transform]))){

    transistion = util.duplicate(def.TRANSFORM_TRANSITIONS[transform.toUpperCase()]);
    transistion.detail = {"type": "modified", "channel": channel};
    return transistion;
  }
  else if( sHas && !dHas ) {
    transistion = util.duplicate(def.TRANSFORM_TRANSITIONS[transform.toUpperCase()]);
    transistion.detail = {"type": "removed", "channel": channel};

    return transistion
  }
  else if( !sHas && dHas ) {
    transistion = util.duplicate(def.TRANSFORM_TRANSITIONS[transform.toUpperCase()]);
    transistion.detail = {"type": "added", "channel": channel};

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

  if( uHasFilter && vHasFilter && ( !util.rawEqual(s.transform.filter, d.transform.filter))){
    transistion = util.duplicate(def.TRANSFORM_TRANSITIONS["FILTER"]);
    transistion.detail = {"type": "modified"};
    return transistion;
  }
  else if( uHasFilter && !vHasFilter ){
    transistion = util.duplicate(def.TRANSFORM_TRANSITIONS["FILTER"]);
    transistion.detail = {"type": "removed"};
    return transistion;
  }
  else if( !uHasFilter && vHasFilter ){
    transistion = util.duplicate(def.TRANSFORM_TRANSITIONS["FILTER"]);
    transistion.detail = {"type": "added"};
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
    transistion = util.duplicate(def.TRANSFORM_TRANSITIONS["SETTYPE"]);
    transistion.detail = {
      "type": s.encoding[channel]["type"] + "_" + d.encoding[channel]["type"],
      "channel": channel
    };

    return transistion;
  }
}

export function encodingTransitionSet(s, d){
  var sChannels = util.keys(s.encoding);
  var sFields = sChannels.map(function(key){
    return s.encoding[key];
  });
  var dChannels = util.keys(d.encoding);
  var dFields = dChannels.map(function(key){
    return d.encoding[key];
  });

  var additionalFields = util.arrayDiff(dFields, sFields);
  var additionalChannels = util.arrayDiff(dChannels, sChannels);

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

  var nodes = nb.neighbors(s, additionalFields, additionalChannels)
                .map(function(neighbor){
    neighbor.distance = neighbor.transition.cost,
    neighbor.prev = [ s ]
    return neighbor;
  });

  s.distance = 0;
  s.prev = [];
  var doneNodes = [ s ];

  while(nodes.length > 0){

    // console.log(nodes.length + ", " + doneNodes.length);
    u = nearestNode(nodes);
    if( nb.sameEncoding(u.encoding, d.encoding) ){
      break;
    }

    var alreadyDone = false;
    var newNodes = nb.neighbors(u, u.additionalFields, u.additionalChannels);
    newNodes.forEach(function(newNode){
      var node;
      for(let i = 0; i < doneNodes.length; i+=1){
        if(nb.sameEncoding(doneNodes[i].encoding, newNode.encoding)){
          return;
        }
      }

      for(let i = 0; i < nodes.length; i+=1){
        if(nb.sameEncoding(nodes[i].encoding, newNode.encoding)){
          node = nodes[i];
          break;
        }
      }

      if( node ){
        if(node.distance > u.distance + newNode.transition.cost){
          node.distance = u.distance + newNode.transition.cost;
          node.prev = u.prev.concat([u]);
        }
      }
      else {
        newNode.distance = u.distance + newNode.transition.cost;
        newNode.prev = u.prev.concat([u]);
        nodes.push(newNode);
      }
    });
    doneNodes.push(u);
  }

  var result = u.prev.map(function(node){
    return node.transition;
  }).filter(function(transition){ return transition; });

  result.push(u.transition);
  return result;

}
