/*jshint -W069 */

// commonly used data set

var fixture = module.exports = {};

var stats = {};

var o_stat = {cardinality: 5},
  q_stat = {cardinality: 10},
  t_stat = o_stat,
  count_stat = 50;

stats['OxQ'] = {
  1: o_stat,
  2: q_stat
};

stats['#xQ'] = {
  count: count_stat,
  2: q_stat
};
stats['#xT'] = {
  count: count_stat,
  2: t_stat
};

// fixtures

fixture['Q'] = {
  fields: [{name:1, type:'Q'}],
  stats: {1: q_stat}
};

fixture['OxQ'] = {
  fields: [
      {name:1, type:'O'},
      {name:2, type:'Q'}
  ],
  stats: stats['OxQ']
};

fixture['OxA(Q)'] = {
  fields: [
      {name:1, type:'O'},
      {name:2, type:'Q', aggr: "avg"}
  ],
  stats: stats['OxQ']
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

fixture['QxT'] = {
  fields: [
    {name:1, type:'Q'},
    {name:2, type:'T'}
  ],
  stats: {
    1: q_stat,
    2: t_stat
  }
};


fixture['#xB(Q)'] = {
  fields: [
      {name:'*', type:'Q', aggr:'count'},
      {name:2, type:'Q', bin: true}
  ],
  stats: stats['#xQ']
};


fixture['#xYR(T)'] = {
  fields: [
      {name:'*', type:'Q', aggr:'count'},
      {name:2, type:'T', fn:'year'}
  ],
  stats: stats['#xT']
};

fixture['#xT'] = {
  fields: [
      {name:'*', type:'Q', aggr:'count'},
      {name:2, type:'T'}
  ],
  stats: stats['#xT']
};

