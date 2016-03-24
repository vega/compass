import {Mark} from 'vega-lite/src/mark';
import {Type} from 'vega-lite/src/type';
import {CHANNELS} from 'vega-lite/src/channel';
import {getEncodingMappingError} from 'vega-lite/src/validate';
import * as util from '../util';
import * as def from './def'
import {Encoding} from 'vega-lite/src/encoding';
import {FieldDef} from 'vega-lite/src/fielddef';

export function neighbors(spec, additionalFields : FieldDef[], additionalChannels, importedEncodingTransitions){
  //check add
  var neighbors = [];
  var encodingTransitions = importedEncodingTransitions || def.DEFAULT_ENCODING_TRANSITIONS;
  var inChannels = util.keys(spec.encoding);
  var exChannels = additionalChannels;



  inChannels.forEach(function(channel){
      //remove
      var newNeighbor = util.duplicate(spec);
      var transitionType = "REMOVE_"+channel.toUpperCase();
      transitionType += (spec.encoding[channel].field === "*") ? "_COUNT" : "";

      var transition = encodingTransitions[transitionType];
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
        transitionType = "MODIFY_"+channel.toUpperCase();

        if (spec.encoding[channel].field === "*" && field.field !== "*" ) {
          transitionType += "_REMOVE_COUNT";
        }
        else if ( spec.encoding[channel].field !== "*" && field.field === "*" ){
          transitionType += "_ADD_COUNT";
        }
        transition = encodingTransitions[transitionType];

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
        if( anotherChannel===channel
          || ( ["x","y"].indexOf(channel) < 0 || ["x","y"].indexOf(anotherChannel) < 0 )){
          return;
        }

        newNeighbor = util.duplicate(spec);
        // var newNeighborChannels = [channel, anotherChannel].sort( function(a,b){
        //   return def.CHANNELS_WITH_TRANSITION_ORDER.indexOf(a) -  def.CHANNELS_WITH_TRANSITION_ORDER.indexOf(b);
        // }).join("_").toUpperCase();
        // transition = encodingTransitions["SWAP"+"_"+ newNeighborChannels];
        transition = encodingTransitions["SWAP_X_Y"];
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
        transition = encodingTransitions["MOVE_" + newNeighborChannels];
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
      var transitionType = "ADD_"+channel.toUpperCase();
      transitionType += (field.field === "*") ? "_COUNT" : "";
      var transition = encodingTransitions[transitionType];
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
      if(sameEncoding(neighbors[i].encoding, neighbors[j].encoding)){
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
