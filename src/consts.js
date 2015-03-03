var consts = module.exports = {
  gen: {},
  cluster: {},
  rank: {}
};

consts.gen.projections = {
  type: 'object',
  properties: {
    omitDotPlot: { //FIXME remove this!
      type: 'boolean',
      default: false,
      description: 'remove all dot plots'
    },
    maxCardinalityForAutoAddOrdinal: {
      type: 'integer',
      default: 50,
      description: 'max cardinality for ordinal field to be considered for auto adding'
    },
    alwaysAddHistogram: {
      type: 'boolean',
      default: true
    }
  }
};

consts.gen.aggregates = {
  type: 'object',
  properties: {
    tableTypes: {
      type: 'boolean',
      default: 'both',
      enum: ['both', 'aggregated', 'disaggregated']
    },
    genBin: {
      type: 'boolean',
      default: true,
      description: 'Generate Binning'
    },
    genTypeCasting: {
      type: 'boolean',
      default: true,
      description: 'Include type casting e.g., from Q to O'
    },
    omitDotPlot: {
      type: 'boolean',
      default: false,
      description: 'remove all dot plots'
    },
    omitMeasureOnly: {
      type: 'boolean',
      default: true,
      description: 'Omit aggregation with measure(s) only'
    },
    omitDimensionOnly: {
      type: 'boolean',
      default: true,
      description: 'Omit aggregation with dimension(s) only'
    },
    addCountForDimensionOnly: {
      type: 'boolean',
      default: true,
      description: 'Add count when there are dimension(s) only'
    },
    aggrList: {
      type: 'array',
      items: {
        type: ['string']
      },
      default: [undefined, 'avg']
    },
    timeFnList: {
      type: 'array',
      items: {
        type: ['string']
      },
      default: ['year']
    }
  }
};

consts.gen.encodings = {
  type: 'object',
  properties: {
    marktypeList: {
      type: 'array',
      items: {type: 'string'},
      default: ['point', 'bar', 'line', 'area', 'text'], //filled_map
      description: 'allowed marktypes'
    },
    encodingTypeList: {
      type: 'array',
      items: {type: 'string'},
      default: ['x', 'y', 'row', 'col', 'size', 'color', 'alpha', 'text', 'detail'],
      description: 'allowed encoding types'
    },
    maxGoodCardinalityForFacets: {
      type: 'integer',
      default: 6,
      description: 'maximum cardinality of a field to be put on facet (row/col) effectively'
    },
    maxCardinalityForFacets: {
      type: 'integer',
      default: 20,
      description: 'maximum cardinality of a field to be put on facet (row/col)'
    },
    maxGoodCardinalityForColor: {
      type: 'integer',
      default: 7,
      description: 'maximum cardinality of an ordinal field to be put on color effectively'
    },
    maxCardinalityForColor: {
      type: 'integer',
      default: 20,
      description: 'maximum cardinality of an ordinal field to be put on color'
    },
    maxCardinalityForShape: {
      type: 'integer',
      default: 6,
      description: 'maximum cardinality of an ordinal field to be put on shape'
    },
    omitTranpose:  {
      type: 'boolean',
      default: true,
      description: 'Eliminate all transpose by (1) keeping horizontal dot plot only (2) for OxQ charts, always put O on Y (3) show only one DxD, MxM (currently sorted by name)'
    },
    omitDotPlot: {
      type: 'boolean',
      default: false,
      description: 'remove all dot plots'
    },
    omitDotPlotWithExtraEncoding: {
      type: 'boolean',
      default: true,
      description: 'remove all dot plots with >1 encoding'
    },
    omitMultipleRetinalEncodings: {
      type: 'boolean',
      default: true,
      description: 'omit using multiple retinal variables (size, color, alpha, shape)'
    },
    omitNonTextAggrWithAllDimsOnFacets: {
      type: 'boolean',
      default: true,
      description: 'remove all aggregated charts (except text tables) with all dims on facets (row, col)'
    },
    omitSizeOnBar: {
      type: 'boolean',
      default: false,
      description: 'do not use bar\'s size'
    },
    omitStackedAverage: {
      type: 'boolean',
      default: true,
      description: 'do not stack bar chart with average'
    },
    alwaysGenerateTableAsHeatmap: {
      type: 'boolean',
      default: true
    }
  }
};



