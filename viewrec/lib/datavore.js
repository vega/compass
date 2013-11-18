// cache pre-existing global values
var globals = ["dv"],
    globalValues = {};

globals.forEach(function(g) {
  if (g in global) globalValues[g] = global[g];
});

// load and export datavore
require("./dv");
module.exports = dv;

// restore pre-existing global values
globals.forEach(function(g) {
  if (g in globalValues) global[g] = globalValues[g];
  else delete global[g];
});