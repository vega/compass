/*jshint -W069 */

// commonly used data set

var fixture = module.exports = {};

var stats = fixture.stats = {};

var count = {name:'*', type:'Q', aggr:'count'},
  count_stat = 50;

var O_15 = {name: 'O_15', type: 'O'},
  O_15_stat = {cardinality: 15},
  O_30 = {name:'O_30', type:'O'},
  O_30_stat = {cardinality: 30};

var q10 = {name: 'Q_10', type: 'Q'},
  q10_stat = {cardinality: 10, min:0, max:150};

var o_stat = {cardinality: 5},
  q_stat = {cardinality: 100, min:0, max:150},
  t_stat = o_stat;

fixture.stat = {
  o_stat: o_stat,
  q_stat: q_stat,
  t_stat: t_stat,
  count_stat: count_stat
};

stats['OxQ'] = {
  1: o_stat,
  2: q_stat,
  count: count_stat
};

stats['Ox#'] = {
  1: o_stat,
  count: count_stat
};

stats['O_30x#'] = {
  count: count_stat,
  O_30: O_30_stat
};

stats.OxQxQ = {
  1: o_stat,
  2: q_stat,
  3: q_stat,
  count: count_stat
};

stats['QxQ'] = {
  1: q_stat,
  2: q_stat,
  count: count_stat
};

stats['QxT'] = {
  1: q_stat,
  2: t_stat,
  count: count_stat
};

stats['Q'] = {
  1: q_stat,
  count: count_stat
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


fixture['O'] = {
  fields: [{name:1, type:'O'}],
  stats: {1: o_stat}
};

fixture['O_15'] = {
  fields: [O_15],
  stats: {O_15: O_15_stat}
};

fixture['O_30'] = {
  fields: [O_30],
  stats: {O_30: O_30_stat}
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


fixture['Ox#'] = {
  fields: [{name:1, type:'O'}, count],
  stats: stats['Ox#']
};

fixture['O_30x#'] = {
  fields: [O_30, count],
  stats: stats['O_30x#']
};

fixture.OxQxQ = {
  fields: [
    {name:1, type:'O'},
    {name:2, type:'Q'},
    {name:3, type:'Q'}
  ],
  stats: stats.OxQxQ
};

fixture['OxA(Q)xA(Q)'] = {
  fields: [
    {name:1, type:'O'},
    {aggr:'avg', name:2, type:'Q'},
    {aggr:'avg', name:3, type:'Q'}
  ],
  stats: stats.OxQxQ
};

fixture['OxQxQxQ'] = {
  fields: [
    {name:1, type: 'O'},
    {name:2, type: 'Q'},
    {name:3, type: 'Q'},
    {name:4, type: 'Q'}
  ],
  stats: {
    1: o_stat,
    2: q_stat,
    3: q_stat,
    4: q_stat
  }
};

fixture['OxOxQxQx#'] = {
  fields: [
    {name:1, type:'Q', selected: false},
    {name:2, type:'Q', selected: false},
    {name:3, type:'O', selected: false},
    {name:4, type:'O', selected: false},
    {name:'*', aggr:'count', selected: false}
  ],
  stats: {
    1: q_stat,
    2: q_stat,
    3: o_stat,
    4: o_stat,
    5: count_stat
  }
};


fixture['Q'] = {
  fields: [{name:1, type:'Q'}],
  stats: {1: q_stat}
};

fixture['Q_10'] = {
  fields: [q10],
  stats: {Q_10: q10_stat}
};

fixture['BIN(Q)'] = {
  fields: [{name:1, type:'Q', bin: {maxbins: 15}}],
  stats: {1: q_stat}
};

fixture['QxQ'] = {
  fields: [{name:1, type:'Q'}, {name:2, type:'Q'}],
  stats: stats['QxQ']
};

fixture['Qx#'] = {
  fields: [{name:1, type:'Q'}, count],
  stats: stats.Q
};

fixture['QxT'] = {
  fields: [
    {name:1, type:'Q'},
    {name:2, type:'T'}
  ],
  stats: stats['QxT']
};

fixture['QxYEAR(T)'] = {
  fields: [
    {name:1, type:'Q'},
    {name:2, type:'T', fn: 'year'}
  ],
  stats: stats['QxT']
};

fixture['A(Q)xYEAR(T)'] = {
  fields: [
    {name:1, type:'Q', aggr: 'avg'},
    {name:2, type:'T', fn: 'year'}
  ],
  stats: stats['QxT']
};


fixture['B(Q)xB(Q)x#'] = {
  fields: [
    {name:1, type:'Q', bin: {maxbins: 15}},
    {name:2, type:'Q', bin: {maxbins: 15}},
    count
  ],
  stats: stats.QxQ
};


fixture['#'] = {
  fields: [count],
  stats: {count: count_stat}
};

// FIXME: swap order for these

fixture['#xB(Q)'] = {
  fields: [
      count,
      {name:2, type:'Q', bin: {maxbins: 15}}
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

