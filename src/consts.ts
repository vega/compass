import {Channel, X, Y, ROW, COLUMN, SIZE, COLOR, TEXT, DETAIL} from 'vega-lite/src/channel';
import {Mark} from 'vega-lite/src/mark';

export interface ProjectionOption {
  /** If true, exclude all dot plots. */
  omitDotPlot?: boolean;
  /** Max cardinality for an ordinal variable to be considered for auto adding */
  maxCardinalityForAutoAddOrdinal?: number;
  // TODO: explain
  alwaysAddHistogram?: boolean;
  maxAdditionalVariables?: number;
}

export const DEFAULT_PROJECTION_OPT:ProjectionOption = {
  omitDotPlot: false,
  maxCardinalityForAutoAddOrdinal: 50,
  alwaysAddHistogram: true,
  maxAdditionalVariables: 1
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
  aggrList: [undefined, 'mean'], // TODO: update this when we have box plots
  timeUnitList: ['year'], //
  consistentAutoQ: true
};

export interface ScaleOption {
  /** List of scale types for rescaling quantitative field */
  rescaleQuantitative?: string[];
}

export const DEFAULT_SCALE_OPTION = {
  rescaleQuantitative: [undefined]
};

export interface SpecOption {
  /** Allowed marks. */
  markList?: Mark[];

  /** Allowed channels. */
  channelList?: Channel[];

  // FIXME(kanitw): revise this when we revise text's encoding in Vega-Lite
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
  /** Remove all dot plots with shape or color or size since it's better to use both x and y first! */
  omitDotPlotWithExtraEncoding?: boolean;
  /** Omit trellis plots that do not use X or Y since it's better to use both x and y first! */
  omitDotPlotWithFacet?: boolean;
  /** Omit one dimension count */
  omitDotPlotWithOnlyCount?: boolean; // FIXME remove
  /** Omit using multiple non-positional channels (size, color, shape) */
  omitMultipleNonPositionalChannels?: boolean;  // FIXME NonPositional
  /**
   * Remove all aggregated charts (except text tables) with all dims on facets (row, column)
   * because this would lead to only one mark per facet.
   */
  omitNonTextAggrWithAllDimsOnFacets?: boolean; // FIXME revise this should become omitNonTextAggrWithAllDimsOnFacets
  /** Omit plot with both x and y as dimension, which most of the time have occlusion. */
  omitRawWithXYBothDimension?: boolean;
  /** Omit binned fields on shape */
  omitShapeWithBin?: boolean;
  /** Omit temporal dimension (time with time unit) on shape */
  omitShapeWithTimeDimension?: boolean;
  /** Do not use bar\'s size. */
  omitSizeOnBar?: boolean; // FIXME: remove
  /** Do not use bar with log scale. */
  omitLogScaleOnBar?: boolean;
  /** Do not stack bar chart with average. */
  omitStackedAverage?: boolean; // FIXME: change to omit non-sum stacked
  /**
   * Eliminate all transpose by
   * (1) keeping horizontal dot plot only
   * (2) for OxQ charts, always put O on Y but put time and binned Q on X.
   * (3) show only one DxD, MxM (currently sorted by name)
   */
  omitTranspose?: boolean; // FIXME revise
};

export const DEFAULT_SPEC_OPTION: SpecOption = {
  markList: [Mark.POINT, Mark.BAR, Mark.LINE, Mark.AREA, Mark.TEXT, Mark.TICK],
  channelList: [X, Y, ROW, COLUMN, SIZE, COLOR, TEXT, DETAIL],

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
  omitMultipleNonPositionalChannels: true, // TODO: revise if we penalize this in ranking
  omitNonTextAggrWithAllDimsOnFacets: true,
  omitRawWithXYBothDimension: true,
  omitShapeWithBin: true,
  omitShapeWithTimeDimension: true,
  omitSizeOnBar: true,
  omitLogScaleOnBar: true,
  omitStackedAverage: true,
  omitTranspose: true,
};
