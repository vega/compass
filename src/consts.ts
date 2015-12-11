/* tslint:disable:variable-name */

export namespace gen {

export const encodings = {
  type: 'object',
  properties: {
    markList: {
      type: 'array',
      items: {type: 'string'},
      default: ['point', 'bar', 'line', 'area', 'text', 'tick'], // filled_map
      description: 'allowed marks'
    },
    encodingTypeList: {
      type: 'array',
      items: {type: 'string'},
      default: ['x', 'y', 'row', 'column', 'size', 'color', 'text', 'detail'],
      description: 'allowed encoding types'
    },
    requiredEncodings: {
      type: 'object',
      default: undefined,
      description: 'required encodings for each mark type'
    },
    supportedEncodings: {
      type: 'object',
      default: undefined,
      description: 'supported encoding for each mark type'
    },
    // TODO: is this used in generation?
    maxGoodCardinalityForFacets: {
      type: 'integer',
      default: 5,
      description: 'maximum cardinality of an ordinal variable to be put on facet (row/column) effectively'
    },
    maxCardinalityForFacets: {
      type: 'integer',
      default: 20,
      description: 'maximum cardinality of an ordinal variable to be put on facet (row/column)'
    },
    maxGoodCardinalityForColor: {
      type: 'integer',
      default: 7,
      description: 'maximum cardinality of an ordinal variable to be put on color effectively'
    },
    maxCardinalityForColor: {
      type: 'integer',
      default: 20,
      description: 'maximum cardinality of an ordinal variable to be put on color'
    },
    maxCardinalityForShape: {
      type: 'integer',
      default: 6,
      description: 'maximum cardinality of an ordinal variable to be put on shape'
    },
    omitTranpose:  {
      type: 'boolean',
      default: true,
      description: 'Eliminate all transpose by (1) keeping horizontal dot plot only (2) for OxQ charts, always put O on Y (3) show only one DxD, MxM (currently sorted by name)'
    },
    // TODO: create chart type name
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
      description: 'omit using multiple retinal variables (size, color, shape)'
    },
    // TODO: revise
    omitNonTextAggrWithAllDimsOnFacets: {
      type: 'boolean',
      default: true,
      description: 'remove all aggregated charts (except text tables) with all dims on facets (row, column)'
    },
    // TODO: revise
    omitOneDimensionCount: {
      type: 'boolean',
      default: false,
      description: 'omit one dimension count'
    },
    // TODO remove this and merge with supportedEncodings
    omitSizeOnBar: {
      type: 'boolean',
      default: false,
      description: 'do not use bar\'s size'
    },
    // TODO: change to omit non-summative stack
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
}
