import * as util from '../../src/util';
export interface Transition {
    name?: string,
    cost?: number
}

//should be updated thru LP result.
export const DEFAULT_MARKTYPE_TRANSITIONS = {
  AREA_BAR: { name: 'AREA_BAR', cost: 1},
  AREA_LINE: { name: 'AREA_LINE', cost: 1},
  AREA_POINT: { name: 'AREA_POINT', cost: 1},
  AREA_TEXT: { name: 'AREA_TEXT', cost: 1},
  AREA_TICK: { name: 'AREA_TICK', cost: 1},
  BAR_LINE: { name: 'BAR_LINE', cost: 1},
  BAR_POINT: { name: 'BAR_POINT', cost: 1},
  BAR_TEXT: { name: 'BAR_TEXT', cost: 1},
  BAR_TICK: { name: 'BAR_TICK', cost: 1},
  LINE_POINT: { name: 'LINE_POINT', cost: 1},
  LINE_TEXT: { name: 'LINE_TEXT', cost: 1},
  LINE_TICK: { name: 'LINE_TICK', cost: 1},
  POINT_TEXT: { name: 'POINT_TEXT', cost: 1},
  POINT_TICK: { name: 'POINT_TICK', cost: 1},
  TEXT_TICK: { name: 'TEXT_TICK', cost: 1}
};

export const DEFAULT_MARKTYPE_TRANSITION_LIST = [
  "AREA_BAR",
  "AREA_LINE",
  "AREA_POINT",
  "AREA_TEXT",
  "AREA_TICK",
  "BAR_LINE",
  "BAR_POINT",
  "BAR_TEXT",
  "BAR_TICK",
  "LINE_POINT",
  "LINE_TEXT",
  "LINE_TICK",
  "POINT_TEXT",
  "POINT_TICK",
  "TEXT_TICK" ];

export const DEFAULT_TRANSFORM_TRANSITIONS ={
  SCALE: { name: 'SCALE', cost: 1},
  SORT: { name: 'SORT', cost: 1},
  BIN: { name: 'BIN', cost: 1},
  AGGREGATE: { name: 'AGGREGATE', cost: 1},
  SETTYPE: { name: 'SETTYPE', cost: 1}
};

export const DEFAULT_TRANSFORM_TRANSITION_LIST = [
  "SCALE",
  "SORT",
  "BIN",
  "AGGREGATE",
  "SETTYPE"
];

export const DEFAULT_FILTER_TRANSITIONS ={
  ADD_FILTER: { name: 'ADD_FILTER', cost: 1},
  REMOVE_FILTER: { name: 'REMOVE_FILTER', cost: 1},
  MODIFY_FILTER: { name: 'MODIFY_FILTER', cost: 1}
};

export const DEFAULT_FILTER_TRANSITION_LIST = [
  "ADD_FILTER",
  "REMOVE_FILTER",
  "MODIFY_FILTER"
];


export const CHANNELS_WITH_TRANSITION_ORDER = [
  "x", "y", "color", "shape", "size", "row", "column", "text"
  // , "detail"
];
export const DEFAULT_ENCODING_TRANSITIONS = {
  ADD_X: { name: 'ADD_X', cost: 1},
  ADD_Y: { name: 'ADD_Y', cost: 1},
  ADD_COLOR: { name: 'ADD_COLOR', cost: 1},
  ADD_SHAPE: { name: 'ADD_SHAPE', cost: 1},
  ADD_SIZE: { name: 'ADD_SIZE', cost: 1},
  ADD_ROW: { name: 'ADD_ROW', cost: 1},
  ADD_COLUMN: { name: 'ADD_COLUMN', cost: 1},
  ADD_X_COUNT: { name: 'ADD_X_COUNT', cost: 1},
  ADD_Y_COUNT: { name: 'ADD_Y_COUNT', cost: 1},
  ADD_COLOR_COUNT: { name: 'ADD_COLOR_COUNT', cost: 1},
  ADD_SHAPE_COUNT: { name: 'ADD_SHAPE_COUNT', cost: 1},
  ADD_SIZE_COUNT: { name: 'ADD_SIZE_COUNT', cost: 1},
  ADD_ROW_COUNT: { name: 'ADD_ROW_COUNT', cost: 1},
  ADD_COLUMN_COUNT: { name: 'ADD_COLUMN_COUNT', cost: 1},
  REMOVE_X_COUNT: { name: 'REMOVE_X_COUNT', cost: 1},
  REMOVE_Y_COUNT: { name: 'REMOVE_Y_COUNT', cost: 1},
  REMOVE_COLOR_COUNT: { name: 'REMOVE_COLOR_COUNT', cost: 1},
  REMOVE_SHAPE_COUNT: { name: 'REMOVE_SHAPE_COUNT', cost: 1},
  REMOVE_SIZE_COUNT: { name: 'REMOVE_SIZE_COUNT', cost: 1},
  REMOVE_ROW_COUNT: { name: 'REMOVE_ROW_COUNT', cost: 1},
  REMOVE_COLUMN_COUNT: { name: 'REMOVE_COLUMN_COUNT', cost: 1},
  REMOVE_X: { name: 'REMOVE_X', cost: 1},
  REMOVE_Y: { name: 'REMOVE_Y', cost: 1},
  REMOVE_COLOR: { name: 'REMOVE_COLOR', cost: 1},
  REMOVE_SHAPE: { name: 'REMOVE_SHAPE', cost: 1},
  REMOVE_SIZE: { name: 'REMOVE_SIZE', cost: 1},
  REMOVE_ROW: { name: 'REMOVE_ROW', cost: 1},
  REMOVE_COLUMN: { name: 'REMOVE_COLUMN', cost: 1},
  MODIFY_X: { name: 'MODIFY_X', cost: 1},
  MODIFY_Y: { name: 'MODIFY_Y', cost: 1},
  MODIFY_COLOR: { name: 'MODIFY_COLOR', cost: 1},
  MODIFY_SHAPE: { name: 'MODIFY_SHAPE', cost: 1},
  MODIFY_SIZE: { name: 'MODIFY_SIZE', cost: 1},
  MODIFY_ROW: { name: 'MODIFY_ROW', cost: 1},
  MODIFY_COLUMN: { name: 'MODIFY_COLUMN', cost: 1},
  MODIFY_X_ADD_COUNT: { name: 'MODIFY_X_ADD_COUNT', cost: 1},
  MODIFY_Y_ADD_COUNT: { name: 'MODIFY_Y_ADD_COUNT', cost: 1},
  MODIFY_COLOR_ADD_COUNT: { name: 'MODIFY_COLOR_ADD_COUNT', cost: 1},
  MODIFY_SHAPE_ADD_COUNT: { name: 'MODIFY_SHAPE_ADD_COUNT', cost: 1},
  MODIFY_SIZE_ADD_COUNT: { name: 'MODIFY_SIZE_ADD_COUNT', cost: 1},
  MODIFY_ROW_ADD_COUNT: { name: 'MODIFY_ROW_ADD_COUNT', cost: 1},
  MODIFY_COLUMN_ADD_COUNT: { name: 'MODIFY_COLUMN_ADD_COUNT', cost: 1},
  MODIFY_X_REMOVE_COUNT: { name: 'MODIFY_X_REMOVE_COUNT', cost: 1},
  MODIFY_Y_REMOVE_COUNT: { name: 'MODIFY_Y_REMOVE_COUNT', cost: 1},
  MODIFY_COLOR_REMOVE_COUNT: { name: 'MODIFY_COLOR_REMOVE_COUNT', cost: 1},
  MODIFY_SHAPE_REMOVE_COUNT: { name: 'MODIFY_SHAPE_REMOVE_COUNT', cost: 1},
  MODIFY_SIZE_REMOVE_COUNT: { name: 'MODIFY_SIZE_REMOVE_COUNT', cost: 1},
  MODIFY_ROW_REMOVE_COUNT: { name: 'MODIFY_ROW_REMOVE_COUNT', cost: 1},
  MODIFY_COLUMN_REMOVE_COUNT: { name: 'MODIFY_COLUMN_REMOVE_COUNT', cost: 1},
  MOVE_X_COLUMN: { name: 'MOVE_X_COLUMN', cost: 1},
  MOVE_X_ROW: { name: 'MOVE_X_ROW', cost: 1},
  MOVE_X_SIZE: { name: 'MOVE_X_SIZE', cost: 1},
  MOVE_X_SHAPE: { name: 'MOVE_X_SHAPE', cost: 1},
  MOVE_X_COLOR: { name: 'MOVE_X_COLOR', cost: 1},
  MOVE_X_Y: { name: 'MOVE_X_Y', cost: 1},
  MOVE_Y_COLUMN: { name: 'MOVE_Y_COLUMN', cost: 1},
  MOVE_Y_ROW: { name: 'MOVE_Y_ROW', cost: 1},
  MOVE_Y_SIZE: { name: 'MOVE_Y_SIZE', cost: 1},
  MOVE_Y_SHAPE: { name: 'MOVE_Y_SHAPE', cost: 1},
  MOVE_Y_COLOR: { name: 'MOVE_Y_COLOR', cost: 1},
  MOVE_Y_X: { name: 'MOVE_Y_X', cost: 1},
  MOVE_COLOR_COLUMN: { name: 'MOVE_COLOR_COLUMN', cost: 1},
  MOVE_COLOR_ROW: { name: 'MOVE_COLOR_ROW', cost: 1},
  MOVE_COLOR_SIZE: { name: 'MOVE_COLOR_SIZE', cost: 1},
  MOVE_COLOR_SHAPE: { name: 'MOVE_COLOR_SHAPE', cost: 1},
  MOVE_COLOR_Y: { name: 'MOVE_COLOR_Y', cost: 1},
  MOVE_COLOR_X: { name: 'MOVE_COLOR_X', cost: 1},
  MOVE_SHAPE_COLUMN: { name: 'MOVE_SHAPE_COLUMN', cost: 1},
  MOVE_SHAPE_ROW: { name: 'MOVE_SHAPE_ROW', cost: 1},
  MOVE_SHAPE_SIZE: { name: 'MOVE_SHAPE_SIZE', cost: 1},
  MOVE_SHAPE_COLOR: { name: 'MOVE_SHAPE_COLOR', cost: 1},
  MOVE_SHAPE_Y: { name: 'MOVE_SHAPE_Y', cost: 1},
  MOVE_SHAPE_X: { name: 'MOVE_SHAPE_X', cost: 1},
  MOVE_SIZE_COLUMN: { name: 'MOVE_SIZE_COLUMN', cost: 1},
  MOVE_SIZE_ROW: { name: 'MOVE_SIZE_ROW', cost: 1},
  MOVE_SIZE_SHAPE: { name: 'MOVE_SIZE_SHAPE', cost: 1},
  MOVE_SIZE_COLOR: { name: 'MOVE_SIZE_COLOR', cost: 1},
  MOVE_SIZE_Y: { name: 'MOVE_SIZE_Y', cost: 1},
  MOVE_SIZE_X: { name: 'MOVE_SIZE_X', cost: 1},
  MOVE_ROW_COLUMN: { name: 'MOVE_ROW_COLUMN', cost: 1},
  MOVE_ROW_SIZE: { name: 'MOVE_ROW_SIZE', cost: 1},
  MOVE_ROW_SHAPE: { name: 'MOVE_ROW_SHAPE', cost: 1},
  MOVE_ROW_COLOR: { name: 'MOVE_ROW_COLOR', cost: 1},
  MOVE_ROW_Y: { name: 'MOVE_ROW_Y', cost: 1},
  MOVE_ROW_X: { name: 'MOVE_ROW_X', cost: 1},
  MOVE_COLUMN_ROW: { name: 'MOVE_COLUMN_ROW', cost: 1},
  MOVE_COLUMN_SIZE: { name: 'MOVE_COLUMN_SIZE', cost: 1},
  MOVE_COLUMN_SHAPE: { name: 'MOVE_COLUMN_SHAPE', cost: 1},
  MOVE_COLUMN_COLOR: { name: 'MOVE_COLUMN_COLOR', cost: 1},
  MOVE_COLUMN_Y: { name: 'MOVE_COLUMN_Y', cost: 1},
  MOVE_COLUMN_X: { name: 'MOVE_COLUMN_X', cost: 1},
  SWAP_X_Y: { name: 'SWAP_X_Y', cost: 1},
  SWAP_ROW_COLUMN: { name: 'SWAP_ROW_COLUMN', cost: 1},
  ceiling: { cost: 3, alternatingCost: 3 }
};


export const TRANSITIONS = { marktypeTransitions : DEFAULT_MARKTYPE_TRANSITIONS, transformTransitions: DEFAULT_TRANSFORM_TRANSITIONS, encodingTransitions: DEFAULT_ENCODING_TRANSITIONS };
