import {Channel, X, Y, ROW, COLUMN, SIZE, COLOR, TEXT, DETAIL} from 'vega-lite/src/channel';
import {Mark} from 'vega-lite/src/mark';

export interface ProjectionOption {
  /** If true, excluce all dot plots. */
  omitDotPlot?: boolean;
  /** Max cardinality for an ordinal variable to be considered for auto adding */
  maxCardinalityForAutoAddOrdinal?: number;
  // TODO: explain
  alwaysAddHistogram?: boolean;
}

export const DEFAULT_PROJECTION_OPT:ProjectionOption = {
  omitDotPlot: false,
  maxCardinalityForAutoAddOrdinal: 50,
  alwaysAddHistogram: true
};

export enum TableType {
  BOTH = 'both' as any,
  AGGREGATED = 'aggregated' as any,
  // TODO rename to raw?
  DISAGGREGATED = 'disaggregated' as any
}

export enum QuantitativeDimensionType {
  AUTO = 'auto' as any,
  BIN = 'bin' as any,
  CAST = 'cast' as any,
  NONE = 'none' as any
}


export interface AggregationOption {
  tableTypes?: TableType;
  /** Use Q as Dimension either by binning or casting */
  genDimQ?: QuantitativeDimensionType;
  /** Minimum cardinality of an ordinal variable if we were to bin. */
  minCardinalityForBin?: number;
  /** Remove all dot plots. */
  omitDotPlot?: boolean;
  /** Omit aggregation with measure(s) only. */
  omitMeasureOnly?: boolean;
  /** Omit aggregation with dimension(s) only. */
  omitDimensionOnly?: boolean;
  /** Add count when there are dimension(s) only. */
  addCountForDimensionOnly?: boolean;
  aggrList?: string[]; // FIXME
  timeUnitList?: string[]; // FIXME
  /** generate similar auto transform for quant */
  consistentAutoQ?: boolean;
}

export const DEFAULT_AGGREGATION_OPTIONS: AggregationOption = {
  tableTypes: TableType.BOTH,
  genDimQ: QuantitativeDimensionType.AUTO,
  minCardinalityForBin: 20,
  omitDotPlot: false,
  omitMeasureOnly: false,
  omitDimensionOnly: true,
  addCountForDimensionOnly: true,
  aggrList: [undefined, 'mean'], // FIXME
  timeUnitList: ['year'], // FIXME
  consistentAutoQ: true
};



export interface EncodingOption {
  /** Allowed marks. */
  markList?: Mark[];

  /** Allowed encoding types. */
  encodingTypeList?: Channel[];

  /** Required encodings for each mark type. */
  requiredEncodings?: any;
  /** Supported encoding for each mark type. */
  supportedEncodings?: any;

  alwaysGenerateTableAsHeatmap?: boolean;
  maxGoodCardinalityForFacets?: number;
  /** Maximum cardinality of an ordinal variable to be put on facet (row/column). */
  maxCardinalityForFacets?: number;
  /** Maximum cardinality of an ordinal variable to be put on color effectively */
  maxGoodCardinalityForColor?: number;
  /** Maximum cardinality of an ordinal variable to be put on color */
  maxCardinalityForColor?: number;
  /** Maximum cardinality of an ordinal variable to be put on shape */
  maxCardinalityForShape?: number;
  /** Remove all dot plots */
  omitDotPlot?: boolean;
  /** Remove all dot plots with >1 encoding */
  omitDotPlotWithExtraEncoding?: boolean;
  /** Omit using multiple retinal variables (size, color, shape) */
  omitMultipleRetinalEncodings?: boolean;  // FIXME NonPositional
  /** Remove all aggregated charts (except text tables) with all dims on facets (row, column) */
  omitNonTextAggrWithAllDimsOnFacets?: boolean; // FIXME revise
  /** Omit one dimension count */
  omitOneDimensionCount?: boolean; // FIXME remove
  /**
   * Eliminate all transpose by
   * (1) keeping horizontal dot plot only
   * (2) for OxQ charts, always put O on Y
   * (3) show only one DxD, MxM (currently sorted by name)
   */
  omitTranspose?: boolean;
  /** Do not use bar\'s size. */
  omitSizeOnBar?: boolean; // FIXME: remove
  /** Do not stack bar chart with average. */
  omitStackedAverage?: boolean; // FIXME: remove
};

export const DEFAULT_ENCODING_OPTION: EncodingOption = {
  markList: [Mark.POINT, Mark.BAR, Mark.LINE, Mark.AREA, Mark.TEXT, Mark.TICK],
  encodingTypeList: [X, Y, ROW, COLUMN, SIZE, COLOR, TEXT, DETAIL],
  requiredEncodings: undefined, // FIXME
  supportedEncodings: undefined, // FIXME

  alwaysGenerateTableAsHeatmap: true,
  maxGoodCardinalityForFacets: 5,
  maxCardinalityForFacets: 20,
  maxGoodCardinalityForColor: 7,
  maxCardinalityForColor: 20,
  maxCardinalityForShape: 6,
  omitDotPlot: false,
  omitDotPlotWithExtraEncoding: true,
  omitMultipleRetinalEncodings: true,
  omitNonTextAggrWithAllDimsOnFacets: true,
  omitOneDimensionCount: false,
  omitTranspose: true,
  omitSizeOnBar: true,
  omitStackedAverage: true,
};
