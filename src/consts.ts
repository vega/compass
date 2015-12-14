import {Channel, X, Y, ROW, COLUMN, SIZE, COLOR, TEXT, DETAIL} from 'vega-lite/src/channel';
import {Mark} from 'vega-lite/src/mark';

export interface ProjectionOption {
  /** If true, exclude all dot plots. */
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



export interface SpecOption {
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
  /** Omit trellis plots that do not use X or Y */
  omitDotPlotWithFacet?: boolean;
  /** Omit one dimension count */
  omitDotPlotWithOnlyCount?: boolean; // FIXME remove
  /** Omit using multiple retinal variables (size, color, shape) */
  omitMultipleRetinalEncodings?: boolean;  // FIXME NonPositional
  /**
   * Remove all aggregated charts (except text tables) with all dims on facets (row, column)
   * because this would lead to only one mark per facet.
   */
  omitNonTextAggrWithAllDimsOnFacets?: boolean; // FIXME revise
  /** Omit plot with both x and y as dimension, which most of the time have occlusion. */
  omitRawWithXYBothDimension?: boolean;
  /** Omit binned fields on shape */
  omitShapeWithBin?: boolean;
  /** Omit temporal dimension (time with time unit) on shape */
  omitShapeWithTimeDimension?: boolean;
  /** Do not use bar\'s size. */
  omitSizeOnBar?: boolean; // FIXME: remove
  /** Do not stack bar chart with average. */
  omitStackedAverage?: boolean; // FIXME: remove
  /**
   * Eliminate all transpose by
   * (1) keeping horizontal dot plot only
   * (2) for OxQ charts, always put O on Y
   * (3) show only one DxD, MxM (currently sorted by name)
   */
  omitTranspose?: boolean; // FIXME revise
};

export const DEFAULT_SPEC_OPTION: SpecOption = {
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
  omitDotPlotWithFacet: true,
  omitDotPlotWithOnlyCount: false, // TODO: revise if this should be true
  omitMultipleRetinalEncodings: true,
  omitNonTextAggrWithAllDimsOnFacets: true,
  omitRawWithXYBothDimension: true,
  omitShapeWithBin: true,
  omitShapeWithTimeDimension: true,
  omitSizeOnBar: true,
  omitStackedAverage: true,
  omitTranspose: true,
};
