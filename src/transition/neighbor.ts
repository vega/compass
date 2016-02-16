import {Mark} from 'vega-lite/src/mark';
import {Type} from 'vega-lite/src/type';
import {Encoding} from 'vega-lite/src/schema/encoding.schema';
import {CHANNELS} from 'vega-lite/src/channel';
import {getEncodingMappingError} from 'vega-lite/src/validate';
import {SchemaField} from '../schema';

import * as util from '../util';
import * as def from './def'

export function neighbors(u, remainedFields, remainedChannels){
  //check add
  var neighbors = [];

  var inChannels = util.keys(u.encoding);
  var exChannels = remainedChannels;



  inChannels.forEach(function(channel){
      //remove
      var newNeighbor = util.duplicate(u);
      var transition = def.DEFAULT_ENCODING_TRANSITIONS["REMOVE"+"_"+channel.toUpperCase()];
      var newRemainedFields = util.duplicate(remainedFields);
      newRemainedFields.push(newNeighbor.encoding[channel]);
      var newRemainedChannels = util.duplicate(remainedChannels);
      newRemainedChannels.push(channel);

      delete newNeighbor.encoding[channel];
      if( validate(newNeighbor) ){
        neighbors.push({
          spec: newNeighbor,
          transition: transition,
          remainedFields: newRemainedFields,
          remainedChannels: newRemainedChannels
         });
      };


      //modify
      remainedFields.forEach(function(field, index){
        newNeighbor = util.duplicate(u);
        transition = def.DEFAULT_ENCODING_TRANSITIONS["MODIFY"+"_"+channel.toUpperCase()];

        newRemainedFields = util.duplicate(remainedFields);
        newRemainedFields.splice(index,1);
        newRemainedFields.push(newNeighbor.encoding[channel]);

        newRemainedChannels = util.duplicate(remainedChannels);

        newNeighbor.encoding[channel] = field;
        if( validate(newNeighbor) ){
          neighbors.push({
            spec: newNeighbor,
            transition: transition,
            remainedFields: newRemainedFields,
            remainedChannels: newRemainedChannels
           });
        };
      });

      //swap
      inChannels.forEach(function(anotherChannel){
        if(anotherChannel===channel){
          return;
        }

        newNeighbor = util.duplicate(u);
        var newNeighborChannels = [channel, anotherChannel].sort( function(a,b){
          return def.CHANNELS_WITH_TRANSITION_ORDER.indexOf(a) -  def.CHANNELS_WITH_TRANSITION_ORDER.indexOf(b);
        }).join("_").toUpperCase();
        transition = def.DEFAULT_ENCODING_TRANSITIONS["SWAP"+"_"+ newNeighborChannels];
        newRemainedFields = util.duplicate(remainedFields);
        newRemainedChannels = util.duplicate(remainedChannels);


        var tempChannel = util.duplicate(newNeighbor.encoding[channel]);
        newNeighbor.encoding[channel] = newNeighbor.encoding[anotherChannel];
        newNeighbor.encoding[anotherChannel] = tempChannel;

        if( validate(newNeighbor) ){
          neighbors.push({
            spec: newNeighbor,
            transition: transition,
            remainedFields: newRemainedFields,
            remainedChannels: newRemainedChannels
           });
        };

      })

      //move
      exChannels.forEach(function(exChannel, index){
        newNeighbor = util.duplicate(u);
        var newNeighborChannels = (channel + "_" + exChannel).toUpperCase();
        transition = def.DEFAULT_ENCODING_TRANSITIONS["MOVE_" + newNeighborChannels];
        newRemainedFields = util.duplicate(remainedFields);

        newRemainedChannels = util.duplicate(remainedChannels);
        newRemainedChannels.splice(index,1);
        newRemainedChannels.push(channel);

        newNeighbor.encoding[exChannel] = util.duplicate(newNeighbor.encoding[channel]);
        delete newNeighbor.encoding[channel];



        if( validate(newNeighbor) ){
          neighbors.push({
            spec: newNeighbor,
            transition: transition,
            remainedFields: newRemainedFields,
            remainedChannels: newRemainedChannels
           });
        };
      })
  });
  exChannels.forEach(function(channel, chIndex){
    //add
    remainedFields.forEach(function(field, index){
      var newNeighbor = util.duplicate(u);
      var transition = def.DEFAULT_ENCODING_TRANSITIONS["ADD"+"_"+channel.toUpperCase()];
      var newRemainedFields = util.duplicate(remainedFields);
      var newRemainedChannels = util.duplicate(remainedChannels);

      newRemainedFields.splice(index,1);
      newNeighbor.encoding[channel] = field;

      newRemainedChannels.splice(chIndex,1);

      if( validate(newNeighbor) ){
        neighbors.push({
          spec: newNeighbor,
          transition: transition,
          remainedFields: newRemainedFields,
          remainedChannels: newRemainedChannels
         });
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
  //getEncodingMappingError(newNeighbor)
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
    if(a[key].field !== b[key].field){
      return false;
    }
  }
  return true;
}
