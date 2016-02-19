import {Mark} from 'vega-lite/src/mark';
import {Type} from 'vega-lite/src/type';
import {Encoding} from 'vega-lite/src/schema/encoding.schema';
import {CHANNELS} from 'vega-lite/src/channel';
import {getEncodingMappingError} from 'vega-lite/src/validate';
import {SchemaField} from '../schema';

import * as util from '../util';
import * as def from './def'

export function neighbors(spec, additionalFields, additionalChannels){
  //check add
  var neighbors = [];

  var inChannels = util.keys(spec.encoding);
  var exChannels = additionalChannels;



  inChannels.forEach(function(channel){
      //remove
      var newNeighbor = util.duplicate(spec);
      var transition = def.DEFAULT_ENCODING_TRANSITIONS["REMOVE"+"_"+channel.toUpperCase()];
      var newAdditionalFields = util.duplicate(additionalFields);
      newAdditionalFields.push(newNeighbor.encoding[channel]);
      var newAdditionalChannels = util.duplicate(additionalChannels);
      newAdditionalChannels.push(channel);

      delete newNeighbor.encoding[channel];
      if( validate(newNeighbor) ){
        newNeighbor.transition = transition;
        newNeighbor.additionalFields = newAdditionalFields;
        newNeighbor.additionalChannels = newAdditionalChannels;

        neighbors.push(newNeighbor);
      };


      //modify
      additionalFields.forEach(function(field, index){
        newNeighbor = util.duplicate(spec);
        transition = def.DEFAULT_ENCODING_TRANSITIONS["MODIFY"+"_"+channel.toUpperCase()];

        newAdditionalFields = util.duplicate(additionalFields);
        newAdditionalFields.splice(index,1);
        newAdditionalFields.push(newNeighbor.encoding[channel]);

        newAdditionalChannels = util.duplicate(additionalChannels);

        newNeighbor.encoding[channel] = field;
        if( validate(newNeighbor) ){
          newNeighbor.transition = transition;
          newNeighbor.additionalFields = newAdditionalFields;
          newNeighbor.additionalChannels = newAdditionalChannels;

          neighbors.push(newNeighbor);
        };
      });

      //swap
      inChannels.forEach(function(anotherChannel){
        if(anotherChannel===channel){
          return;
        }

        newNeighbor = util.duplicate(spec);
        var newNeighborChannels = [channel, anotherChannel].sort( function(a,b){
          return def.CHANNELS_WITH_TRANSITION_ORDER.indexOf(a) -  def.CHANNELS_WITH_TRANSITION_ORDER.indexOf(b);
        }).join("_").toUpperCase();
        transition = def.DEFAULT_ENCODING_TRANSITIONS["SWAP"+"_"+ newNeighborChannels];
        newAdditionalFields = util.duplicate(additionalFields);
        newAdditionalChannels = util.duplicate(additionalChannels);


        var tempChannel = util.duplicate(newNeighbor.encoding[channel]);
        newNeighbor.encoding[channel] = newNeighbor.encoding[anotherChannel];
        newNeighbor.encoding[anotherChannel] = tempChannel;

        if( validate(newNeighbor) ){
          newNeighbor.transition = transition;
          newNeighbor.additionalFields = newAdditionalFields;
          newNeighbor.additionalChannels = newAdditionalChannels;

          neighbors.push(newNeighbor);
        };

      })

      //move
      exChannels.forEach(function(exChannel, index){
        newNeighbor = util.duplicate(spec);
        var newNeighborChannels = (channel + "_" + exChannel).toUpperCase();
        transition = def.DEFAULT_ENCODING_TRANSITIONS["MOVE_" + newNeighborChannels];
        newAdditionalFields = util.duplicate(additionalFields);

        newAdditionalChannels = util.duplicate(additionalChannels);
        newAdditionalChannels.splice(index,1);
        newAdditionalChannels.push(channel);

        newNeighbor.encoding[exChannel] = util.duplicate(newNeighbor.encoding[channel]);
        delete newNeighbor.encoding[channel];



        if( validate(newNeighbor) ){
          newNeighbor.transition = transition;
          newNeighbor.additionalFields = newAdditionalFields;
          newNeighbor.additionalChannels = newAdditionalChannels;

          neighbors.push(newNeighbor);
        };
      })
  });
  exChannels.forEach(function(channel, chIndex){
    //add

    additionalFields.forEach(function(field, index){
      var newNeighbor = util.duplicate(spec);
      var transition = def.DEFAULT_ENCODING_TRANSITIONS["ADD"+"_"+channel.toUpperCase()];
      var newAdditionalFields = util.duplicate(additionalFields);
      var newAdditionalChannels = util.duplicate(additionalChannels);

      newAdditionalFields.splice(index,1);
      newNeighbor.encoding[channel] = field;

      newAdditionalChannels.splice(chIndex,1);

      if( validate(newNeighbor) ){
        newNeighbor.transition = transition;
        newNeighbor.additionalFields = newAdditionalFields;
        newNeighbor.additionalChannels = newAdditionalChannels;

        neighbors.push(newNeighbor);
      };
    });
  });



  for( var i = 0; i < neighbors.length; i+=1 ) {
    for( var j = i+1; j < neighbors.length; j+=1 ) {
      if(neighbors[i].transition === neighbors[j].transition){
        neighbors.splice(j,1);
        j -= 1;
      }
    }
  }

  return neighbors;
}

function validate(spec){
  //TODO? : should I validate the spec? -> Nope
  return true;
}

export function sameEncoding(a, b){
  var aKeys = util.keys(a);
  var bKeys = util.keys(b);
  if(aKeys.length !== bKeys.length){
    return false;
  }

  var allKeys = util.union(aKeys, bKeys);
  for(var i=0; i < allKeys.length; i+=1){
    let key = allKeys[i];
    if(!(a[key] && b[key])){
      return false;
    }
    //TODO : now it only check "field".
    //Transition should support type difference.
    if(a[key].field !== b[key].field){
      return false;
    }
  }
  return true;
}