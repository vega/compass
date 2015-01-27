var consts = module.exports = {
  gen: {},
  cluster: {},
  rank: {}
};

consts.gen.DEFAULT_OPT = {
  genAggr: true,
  genBin: true,
  genTypeCasting: false,

  aggrList: [undefined, 'avg'], //undefined = no aggregation
  marktypeList: ['point', 'bar', 'line', 'area', 'text'], //filled_map

  // PRUNING RULES FOR ENCODING VARIATIONS

  /**
   * Eliminate all transpose
   * - keeping horizontal dot plot only.
   * - for OxQ charts, always put O on Y
   * - show only one OxO, QxQ (currently sorted by name)
   */
  omitTranpose: true,
  /** remove all dot plot with >1 encoding */
  omitDotPlotWithExtraEncoding: true,

  /** remove all aggregate charts with all dims on facets (row, col) */
  //FIXME this is good for text though!
  omitAggrWithAllDimsOnFacets: true,

  // PRUNING RULES FOR TRANFORMATION VARIATIONS

  /** omit field sets with only dimensions */
  omitDimensionOnly: true,
  /** omit aggregate field sets with only measures */
  omitAggregateWithMeasureOnly: true
};