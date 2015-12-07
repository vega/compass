import * as cpConsts from './consts';
import cpCluster from './cluster/cluster'; // FIXME
import * as cpGen from './gen/gen';
import * as cpRank from './rank/rank';
import * as cpUtil from './util';

export const consts = cpConsts;
export const cluster = cpCluster;
export const gen = cpGen;
export const rank = cpRank;
export const util = cpUtil;

// FIXME move
export const auto = '-, sum';

export const version = '__VERSION__';
