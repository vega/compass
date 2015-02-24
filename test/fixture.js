/*jshint -W069 */

// commonly used data set

var fixture = module.exports = {};

var o_stat = {cardinality: 5},
  q_stat = {cardinality: 10},
  t_stat = o_stat;

fixture['Q'] = {
  fields: [{name:1, type:'Q'}],
  stats: {1: q_stat}
};

fixture['OxQ'] = {
  fields: [
      {name:1, type:'O'},
      {name:2, type:'Q'}
  ],
  stats: {
    1: o_stat,
    2: q_stat
  }
};

fixture['OxA(Q)'] = {
  fields: [
      {name:1, type:'O'},
      {name:2, type:'Q', aggr: "avg"}
  ],
  stats: {
    1: o_stat,
    2: q_stat
  }
};

fixture['OxA(Q)xA(Q)'] = {
  fields: [
    {aggr:'avg', name:1, type:'Q'},
    {aggr:'avg', name:2, type:'Q'},
    {name:3, type:'O'}
  ],
  stats: {
    1: q_stat,
    2: q_stat,
    3: o_stat
  }
};

fixture['TxQ'] = {
  fields: [
    {name:1, type:'T'},
    {name:2, type:'Q'}
  ],
  stats: {
    1: t_stat,
    2: q_stat
  }
};

