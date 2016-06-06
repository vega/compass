"use strict";

import {Mark} from 'vega-lite/src/mark';
import {Type} from 'vega-lite/src/type';
import {CHANNELS} from 'vega-lite/src/channel';
var expr = require('vega-expression'); // TODO : (YH) make typescript definition

import * as util from '../util';
import * as def from './def'
import * as nb from './neighbor';

export function transitionCost (s, d, importedTransitionCosts?) {
  var transitions = transitionSet(s, d, importedTransitionCosts);
  var cost = 0;
  cost = transitions.marktype.reduce(function(prev, transition){
    prev += transition.cost;
    return prev;
  }, cost);
  cost = transitions.transform.reduce(function(prev, transition){
    prev += transition.cost;
    return prev;
  }, cost);
  cost = transitions.encoding.reduce(function(prev, transition){
    prev += transition.cost;
    return prev;
  }, cost);

  return cost;
}

export function transitionSet (s, d, importedTransitionCosts?, transOptions?) {
  var importedMarktypeTransitions = importedTransitionCosts ? importedTransitionCosts.marktypeTransitions : def.DEFAULT_MARKTYPE_TRANSITIONS;
  var importedTransformTransitions = importedTransitionCosts ? importedTransitionCosts.transformTransitions : def.DEFAULT_TRANSFORM_TRANSITIONS;
  var importedEncodingTransitions = importedTransitionCosts ? importedTransitionCosts.encodingTransitions : def.DEFAULT_ENCODING_TRANSITIONS;
  

  var transitions = {
    marktype: marktypeTransitionSet(s, d, importedMarktypeTransitions),
    transform: transformTransitionSet(s, d, importedTransformTransitions, transOptions),
    encoding: encodingTransitionSet(s, d, importedEncodingTransitions)

  };

  var cost = 0;
  cost = transitions.marktype.reduce(function(prev, transition){
    prev += transition.cost;
    return prev;
  }, cost);
  cost = transitions.transform.reduce(function(prev, transition){
    prev += transition.cost;
    return prev;
  }, cost);
  cost = transitions.encoding.reduce(function(prev, transition){
    prev += transition.cost;
    return prev;
  }, cost);
  

  transitions["cost"] = cost;
  return transitions;
}

export function marktypeTransitionSet (s, d, importedMarktypeTransitions? ) {
  var transSet = [];
  var marktypeTransitions = importedMarktypeTransitions || def.DEFAULT_MARKTYPE_TRANSITIONS;
  if(s.mark === d.mark) {
    return transSet;
  }
  else {
    var trName = [s.mark.toUpperCase(), d.mark.toUpperCase()].sort().join("_");
    transSet.push(util.duplicate(marktypeTransitions[trName]));
  }
  return transSet;
}

export function transformTransitionSet (s, d, importedTransformTransitions?, transOptions? ) {

  var transformTransitions = importedTransformTransitions || def.DEFAULT_TRANSFORM_TRANSITIONS ;
  var transSet = [];
  var trans;
  var already;



  CHANNELS.forEach(function(channel){
    ["SCALE", "SORT", "AGGREGATE", "BIN", "SETTYPE"].map(function(transformType){

      if( transformType === "SETTYPE" && transformTransitions[transformType] ){
        trans = transformSettype(s, d, channel, transformTransitions);
      }
      else {
        if( transformTransitions[transformType] ){
          trans = transformBasic(s, d, channel, transformType, transformTransitions, transOptions);
        }
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
  
  var filterTransitions = { 
                            "MODIFY_FILTER": transformTransitions["MODIFY_FILTER"],
                            "ADD_FILTER" : transformTransitions["ADD_FILTER"], 
                            "REMOVE_FILTER" : transformTransitions["REMOVE_FILTER"]
                          };
  transSet = transSet.concat(filterTransitionSet(s,d, filterTransitions));
  
  return transSet;
}

export function transformBasic(s, d, channel, transform, transformTransitions, transOptions?){
  var sHas = false
  var dHas = false;
  var transistion;
  var sTransform, dTransform;

  if( s.encoding[channel] && s.encoding[channel][transform.toLowerCase()] ){
    sHas = true;
    sTransform = s.encoding[channel][transform.toLowerCase()];
  }
  if( d.encoding[channel] && d.encoding[channel][transform.toLowerCase()] ){
    dHas = true;
    dTransform = d.encoding[channel][transform.toLowerCase()];
  }

  if(transOptions && transOptions.omitIncludeRawDomain && transform === "SCALE"){

    if (sTransform && sTransform.includeRawDomain) {
      delete sTransform.includeRawDomain
      if (Object.keys(sTransform).length === 0 && JSON.stringify(sTransform) === JSON.stringify({})) {
        sHas = false;
      }
    }
    if (dTransform && dTransform.includeRawDomain) {
      delete dTransform.includeRawDomain
      if (Object.keys(dTransform).length === 0 && JSON.stringify(dTransform) === JSON.stringify({})) {
        dHas = false;
      }
    }

  }


  if( sHas && dHas && ( !util.rawEqual(sTransform, dTransform))){

    transistion = util.duplicate(transformTransitions[transform]);
    transistion.detail = {"type": "modified", "channel": channel};
    return transistion;
  }
  else if( sHas && !dHas ) {
    transistion = util.duplicate(transformTransitions[transform]);
    transistion.detail = {"type": "removed", "channel": channel};

    return transistion
  }
  else if( !sHas && dHas ) {
    transistion = util.duplicate(transformTransitions[transform]);
    transistion.detail = {"type": "added", "channel": channel};

    return transistion
  }
}

export function filterTransitionSet(s, d, filterTransitions){
  var sFilters = [], dFilters = [];
  var transitions = [];

  if( s.transform && s.transform.filter ){
    sFilters = filters(s.transform.filter);
  }
  if( d.transform && d.transform.filter ){
    dFilters = filters(d.transform.filter);
  }
  var dOnly = util.arrayDiff(dFilters, sFilters);
  var sOnly = util.arrayDiff(sFilters, dFilters);


  if( sFilters.length === 0 && dFilters.length === 0 ){
    return transitions;
  }

  var isFind = false;
  for (let i = 0; i < dOnly.length; i++) {
    for (let j = 0; j < sOnly.length; j++) {
      if (util.rawEqual(dOnly[i].field, sOnly[j].field)) {
        transitions.push(util.duplicate(filterTransitions["MODIFY_FILTER"]));
        dOnly.splice(i,1);
        sOnly.splice(j,1);
        isFind = true;
        break;
      }
    }
    if (isFind) {
      isFind = false;
      i--;
      continue;
    }
  }

  for (let i = 0; i < dOnly.length; i++) {
    transitions.push(util.duplicate(filterTransitions["ADD_FILTER"]));
  }
  for (let i = 0; i < sOnly.length; i++) {
    transitions.push(util.duplicate(filterTransitions["REMOVE_FILTER"]));
  }
  return transitions
}

export function filters(expression){
  var parser = expr["parse"];
  var expressionTree = parser(expression);


  return binaryExprsFromExprTree(expressionTree.body[0].expression, [], 0).map(function(bExpr){
            return { "field": bExpr.left, "op": bExpr.operator, "value": bExpr.right }
          });

  function binaryExprsFromExprTree(tree, arr, depth) {
    if (tree.operator === '||' || tree.operator === '&&') {
      arr = binaryExprsFromExprTree(tree.left, arr, depth + 1);
      arr = binaryExprsFromExprTree(tree.right, arr, depth + 1);
    }
    else if(['==','===','!==','!=','<','<=','>','>='].indexOf(tree.operator) >= 0){
      tree.depth = depth;
      arr.push(tree);
    }

    return arr;
  }
}


export function transformSettype(s, d, channel, transformTransitions){
  var sHas = false
  var dHas = false;
  var transistion;
  if( s.encoding[channel] && d.encoding[channel]
      && ( d.encoding[channel]["field"] === s.encoding[channel]["field"] )
      && ( d.encoding[channel]["type"] !== s.encoding[channel]["type"] ) ){
    transistion = util.duplicate(transformTransitions["SETTYPE"]);
    transistion.detail = {
      "type": s.encoding[channel]["type"] + "_" + d.encoding[channel]["type"],
      "channel": channel
    };

    return transistion;
  }
}

export function encodingTransitionSet(s, d, importedEncodingTransitions){
  if (nb.sameEncoding(s.encoding,d.encoding)) {
    return [];
  }

  var sChannels = util.keys(s.encoding);
  var sFields = sChannels.map(function(key){
    return s.encoding[key];
  });
  var dChannels = util.keys(d.encoding);
  var dFields = dChannels.map(function(key){
    return d.encoding[key];
  });

  // var additionalFields = util.arrayDiff(dFields, sFields, function(field){ return field.field + "_" + field.type; });
  var additionalFields = util.unionObjectArray(dFields, sFields, function(field){ return field.field + "_" + field.type; });
  var additionalChannels = util.arrayDiff(dChannels, sChannels);
  // console.log(additionalFields);
  // console.log(additionalChannels);
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

  var nodes = nb.neighbors(s, additionalFields, additionalChannels, importedEncodingTransitions)
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

    if(u.distance >= importedEncodingTransitions.ceiling.cost){
      return [ {name: 'OVER_THE_CEILING', cost: importedEncodingTransitions.ceiling.alternatingCost} ];
    }

    var alreadyDone = false;
    var newNodes = nb.neighbors(u, u.additionalFields, u.additionalChannels, importedEncodingTransitions);
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

  if (!nb.sameEncoding(u.encoding, d.encoding) && nodes.length === 0) {
    return [ { name: "UNREACHABLE", cost: 999 } ];
  }

  var result = u.prev.map(function(node){
    return node.transition;
  }).filter(function(transition){ return transition; });

  result.push(u.transition);
  return result;

}
