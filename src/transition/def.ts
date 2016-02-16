export interface Transition {
    name?: string,
    cost?: number
}

//should be updated thru LP result.
export const DEFAULT_MARKTYPE_TRANSITIONS = {
    "AREA_BAR": {"name": "AREA_BAR", "cost": 0.4},
    "AREA_LINE": {"name": "AREA_LINE", "cost": 0.2},
    "AREA_POINT": {"name": "AREA_POINT", "cost": 0.5},
    "AREA_TEXT": {"name": "AREA_TEXT", "cost": 1},
    "BAR_LINE": {"name": "BAR_LINE", "cost": 0.5},
    "BAR_POINT": {"name": "BAR_POINT", "cost": 0.3},
    "BAR_TEXT": {"name": "BAR_TEXT", "cost": 0.7},
    "LINE_POINT": {"name": "LINE_POINT", "cost": 0.4},
    "LINE_TEXT": {"name": "LINE_TEXT", "cost": 0.7},
    "POINT_TEXT": {"name": "POINT_TEXT", "cost": 0.3}
};
export const DEFAULT_MARKTYPE_TRANSITION_LIST = [
  "AREA_BAR",
  "AREA_LINE",
  "AREA_POINT",
  "AREA_TEXT",
  "BAR_LINE",
  "BAR_POINT",
  "BAR_TEXT",
  "LINE_POINT",
  "LINE_TEXT",
  "POINT_TEXT",
];

export const DEFAULT_TRANSFORM_TRANSITIONS = {
    "SCALE": {"name": "SCALE", "cost": 0.1 },
    "SORT": {"name": "SORT", "cost": 0.2 },
    "BIN_COUNT": {"name": "BIN_COUNT", "cost": 0.3 },
    "AGGREGATE": {"name": "AGGREGATE", "cost": 0.4 },
    "FILTER": {"name": "FILTER", "cost": 0.5 },
    "SETTYPE": {"name": "SETTYPE", "cost": 0.6 }
};

export const DEFAULT_TRANSFORM_TRANSITION_LIST = [
  "SCALE",
  "SORT",
  "BIN_COUNT",
  "AGGREGATE",
  "FILTER",
  "SETTYPE"
];
export const CHANNELS_WITH_TRANSITION_ORDER = [
  "x", "y", "color", "shape", "size", "row", "column", "text", "detail"
];
export const DEFAULT_ENCODING_TRANSITIONS = {
    "ADD_X": {"name": "ADD_X", "cost": 1 },
    "ADD_Y": {"name": "ADD_Y", "cost": 1 },
    "ADD_COLOR": {"name": "ADD_COLOR", "cost": 1 },
    "ADD_SHAPE": {"name": "ADD_SHAPE", "cost": 1 },
    "ADD_SIZE": {"name": "ADD_SIZE", "cost": 1 },
    "ADD_ROW": {"name": "ADD_ROW", "cost": 1 },
    "ADD_COLUMN": {"name": "ADD_COLUMN", "cost": 1 },
    "ADD_TEXT": {"name": "ADD_TEXT", "cost": 1 },
    "ADD_DETAIL": {"name": "ADD_DETAIL", "cost": 1 },

    "REMOVE_X": {"name": "REMOVE_X", "cost": 1 },
    "REMOVE_Y": {"name": "REMOVE_Y", "cost": 1 },
    "REMOVE_COLOR": {"name": "REMOVE_COLOR", "cost": 1 },
    "REMOVE_SHAPE": {"name": "REMOVE_SHAPE", "cost": 1 },
    "REMOVE_SIZE": {"name": "REMOVE_SIZE", "cost": 1 },
    "REMOVE_ROW": {"name": "REMOVE_ROW", "cost": 1 },
    "REMOVE_COLUMN": {"name": "REMOVE_COLUMN", "cost": 1 },
    "REMOVE_TEXT": {"name": "REMOVE_TEXT", "cost": 1 },
    "REMOVE_DETAIL": {"name": "REMOVE_DETAIL", "cost": 1 },

    "MODIFY_X": {"name": "MODIFY_X", "cost": 1 },
    "MODIFY_Y": {"name": "MODIFY_Y", "cost": 1 },
    "MODIFY_COLOR": {"name": "MODIFY_COLOR", "cost": 1 },
    "MODIFY_SHAPE": {"name": "MODIFY_SHAPE", "cost": 1 },
    "MODIFY_SIZE": {"name": "MODIFY_SIZE", "cost": 1 },
    "MODIFY_ROW": {"name": "MODIFY_ROW", "cost": 1 },
    "MODIFY_COLUMN": {"name": "MODIFY_COLUMN", "cost": 1 },
    "MODIFY_TEXT": {"name": "MODIFY_TEXT", "cost": 1 },
    "MODIFY_DETAIL": {"name": "MODIFY_DETAIL", "cost": 1 },

    "MOVE_X_DETAIL": {"name": "MOVE_X_DETAIL", "cost": 1 },
    "MOVE_X_TEXT": {"name": "MOVE_X_TEXT", "cost": 1 },
    "MOVE_X_COLUMN": {"name": "MOVE_X_COLUMN", "cost": 1 },
    "MOVE_X_ROW": {"name": "MOVE_X_ROW", "cost": 1 },
    "MOVE_X_SIZE": {"name": "MOVE_X_SIZE", "cost": 1 },
    "MOVE_X_SHAPE": {"name": "MOVE_X_SHAPE", "cost": 1 },
    "MOVE_X_COLOR": {"name": "MOVE_X_COLOR", "cost": 1 },
    "MOVE_X_Y": {"name": "MOVE_X_Y", "cost": 1 },

    "MOVE_Y_DETAIL": {"name": "MOVE_Y_DETAIL", "cost": 1 },
    "MOVE_Y_TEXT": {"name": "MOVE_Y_TEXT", "cost": 1 },
    "MOVE_Y_COLUMN": {"name": "MOVE_Y_COLUMN", "cost": 1 },
    "MOVE_Y_ROW": {"name": "MOVE_Y_ROW", "cost": 1 },
    "MOVE_Y_SIZE": {"name": "MOVE_Y_SIZE", "cost": 1 },
    "MOVE_Y_SHAPE": {"name": "MOVE_Y_SHAPE", "cost": 1 },
    "MOVE_Y_COLOR": {"name": "MOVE_Y_COLOR", "cost": 1 },
    "MOVE_Y_X": {"name": "MOVE_Y_X", "cost": 1 },

    "MOVE_COLOR_DETAIL": {"name": "MOVE_COLOR_DETAIL", "cost": 1 },
    "MOVE_COLOR_TEXT": {"name": "MOVE_COLOR_TEXT", "cost": 1 },
    "MOVE_COLOR_COLUMN": {"name": "MOVE_COLOR_COLUMN", "cost": 1 },
    "MOVE_COLOR_ROW": {"name": "MOVE_COLOR_ROW", "cost": 1 },
    "MOVE_COLOR_SIZE": {"name": "MOVE_COLOR_SIZE", "cost": 1 },
    "MOVE_COLOR_SHAPE": {"name": "MOVE_COLOR_SHAPE", "cost": 1 },
    "MOVE_COLOR_Y": {"name": "MOVE_COLOR_Y", "cost": 1 },
    "MOVE_COLOR_X": {"name": "MOVE_COLOR_X", "cost": 1 },

    "MOVE_SHAPE_DETAIL": {"name": "MOVE_SHAPE_DETAIL", "cost": 1 },
    "MOVE_SHAPE_TEXT": {"name": "MOVE_SHAPE_TEXT", "cost": 1 },
    "MOVE_SHAPE_COLUMN": {"name": "MOVE_SHAPE_COLUMN", "cost": 1 },
    "MOVE_SHAPE_ROW": {"name": "MOVE_SHAPE_ROW", "cost": 1 },
    "MOVE_SHAPE_SIZE": {"name": "MOVE_SHAPE_SIZE", "cost": 1 },
    "MOVE_SHAPE_COLOR": {"name": "MOVE_SHAPE_COLOR", "cost": 1 },
    "MOVE_SHAPE_Y": {"name": "MOVE_SHAPE_Y", "cost": 1 },
    "MOVE_SHAPE_X": {"name": "MOVE_SHAPE_X", "cost": 1 },

    "MOVE_SIZE_DETAIL": {"name": "MOVE_SIZE_DETAIL", "cost": 1 },
    "MOVE_SIZE_TEXT": {"name": "MOVE_SIZE_TEXT", "cost": 1 },
    "MOVE_SIZE_COLUMN": {"name": "MOVE_SIZE_COLUMN", "cost": 1 },
    "MOVE_SIZE_ROW": {"name": "MOVE_SIZE_ROW", "cost": 1 },
    "MOVE_SIZE_SHAPE": {"name": "MOVE_SIZE_SHAPE", "cost": 1 },
    "MOVE_SIZE_COLOR": {"name": "MOVE_SIZE_COLOR", "cost": 1 },
    "MOVE_SIZE_Y": {"name": "MOVE_SIZE_Y", "cost": 1 },
    "MOVE_SIZE_X": {"name": "MOVE_SIZE_X", "cost": 1 },

    "MOVE_ROW_DETAIL": {"name": "MOVE_ROW_DETAIL", "cost": 1 },
    "MOVE_ROW_TEXT": {"name": "MOVE_ROW_TEXT", "cost": 1 },
    "MOVE_ROW_COLUMN": {"name": "MOVE_ROW_COLUMN", "cost": 1 },
    "MOVE_ROW_SIZE": {"name": "MOVE_ROW_SIZE", "cost": 1 },
    "MOVE_ROW_SHAPE": {"name": "MOVE_ROW_SHAPE", "cost": 1 },
    "MOVE_ROW_COLOR": {"name": "MOVE_ROW_COLOR", "cost": 1 },
    "MOVE_ROW_Y": {"name": "MOVE_ROW_Y", "cost": 1 },
    "MOVE_ROW_X": {"name": "MOVE_ROW_X", "cost": 1 },

    "MOVE_COLUMN_DETAIL": {"name": "MOVE_COLUMN_DETAIL", "cost": 1 },
    "MOVE_COLUMN_TEXT": {"name": "MOVE_COLUMN_TEXT", "cost": 1 },
    "MOVE_COLUMN_ROW": {"name": "MOVE_COLUMN_ROW", "cost": 1 },
    "MOVE_COLUMN_SIZE": {"name": "MOVE_COLUMN_SIZE", "cost": 1 },
    "MOVE_COLUMN_SHAPE": {"name": "MOVE_COLUMN_SHAPE", "cost": 1 },
    "MOVE_COLUMN_COLOR": {"name": "MOVE_COLUMN_COLOR", "cost": 1 },
    "MOVE_COLUMN_Y": {"name": "MOVE_COLUMN_Y", "cost": 1 },
    "MOVE_COLUMN_X": {"name": "MOVE_COLUMN_X", "cost": 1 },

    "MOVE_TEXT_DETAIL": {"name": "MOVE_TEXT_DETAIL", "cost": 1 },
    "MOVE_TEXT_COLUMN": {"name": "MOVE_TEXT_COLUMN", "cost": 1 },
    "MOVE_TEXT_ROW": {"name": "MOVE_TEXT_ROW", "cost": 1 },
    "MOVE_TEXT_SIZE": {"name": "MOVE_TEXT_SIZE", "cost": 1 },
    "MOVE_TEXT_SHAPE": {"name": "MOVE_TEXT_SHAPE", "cost": 1 },
    "MOVE_TEXT_COLOR": {"name": "MOVE_TEXT_COLOR", "cost": 1 },
    "MOVE_TEXT_Y": {"name": "MOVE_TEXT_Y", "cost": 1 },
    "MOVE_TEXT_X": {"name": "MOVE_TEXT_X", "cost": 1 },

    "MOVE_DETAIL_TEXT": {"name": "MOVE_DETAIL_TEXT", "cost": 1 },
    "MOVE_DETAIL_COLUMN": {"name": "MOVE_DETAIL_COLUMN", "cost": 1 },
    "MOVE_DETAIL_ROW": {"name": "MOVE_DETAIL_ROW", "cost": 1 },
    "MOVE_DETAIL_SIZE": {"name": "MOVE_DETAIL_SIZE", "cost": 1 },
    "MOVE_DETAIL_SHAPE": {"name": "MOVE_DETAIL_SHAPE", "cost": 1 },
    "MOVE_DETAIL_COLOR": {"name": "MOVE_DETAIL_COLOR", "cost": 1 },
    "MOVE_DETAIL_Y": {"name": "MOVE_DETAIL_Y", "cost": 1 },
    "MOVE_DETAIL_X": {"name": "MOVE_DETAIL_X", "cost": 1 },


    "SWAP_X_DETAIL": {"name": "SWAP_X_DETAIL", "cost": 1 },
    "SWAP_X_TEXT": {"name": "SWAP_X_TEXT", "cost": 1 },
    "SWAP_X_COLUMN": {"name": "SWAP_X_COLUMN", "cost": 1 },
    "SWAP_X_ROW": {"name": "SWAP_X_ROW", "cost": 1 },
    "SWAP_X_SIZE": {"name": "SWAP_X_SIZE", "cost": 1 },
    "SWAP_X_SHAPE": {"name": "SWAP_X_SHAPE", "cost": 1 },
    "SWAP_X_COLOR": {"name": "SWAP_X_COLOR", "cost": 1 },
    "SWAP_X_Y": {"name": "SWAP_X_Y", "cost": 1 },

    "SWAP_Y_DETAIL": {"name": "SWAP_Y_DETAIL", "cost": 1 },
    "SWAP_Y_TEXT": {"name": "SWAP_Y_TEXT", "cost": 1 },
    "SWAP_Y_COLUMN": {"name": "SWAP_Y_COLUMN", "cost": 1 },
    "SWAP_Y_ROW": {"name": "SWAP_Y_ROW", "cost": 1 },
    "SWAP_Y_SIZE": {"name": "SWAP_Y_SIZE", "cost": 1 },
    "SWAP_Y_SHAPE": {"name": "SWAP_Y_SHAPE", "cost": 1 },
    "SWAP_Y_COLOR": {"name": "SWAP_Y_COLOR", "cost": 1 },

    "SWAP_COLOR_DETAIL": {"name": "SWAP_COLOR_DETAIL", "cost": 1 },
    "SWAP_COLOR_TEXT": {"name": "SWAP_COLOR_TEXT", "cost": 1 },
    "SWAP_COLOR_COLUMN": {"name": "SWAP_COLOR_COLUMN", "cost": 1 },
    "SWAP_COLOR_ROW": {"name": "SWAP_COLOR_ROW", "cost": 1 },
    "SWAP_COLOR_SIZE": {"name": "SWAP_COLOR_SIZE", "cost": 1 },
    "SWAP_COLOR_SHAPE": {"name": "SWAP_COLOR_SHAPE", "cost": 1 },

    "SWAP_SHAPE_DETAIL": {"name": "SWAP_SHAPE_DETAIL", "cost": 1 },
    "SWAP_SHAPE_TEXT": {"name": "SWAP_SHAPE_TEXT", "cost": 1 },
    "SWAP_SHAPE_COLUMN": {"name": "SWAP_SHAPE_COLUMN", "cost": 1 },
    "SWAP_SHAPE_ROW": {"name": "SWAP_SHAPE_ROW", "cost": 1 },
    "SWAP_SHAPE_SIZE": {"name": "SWAP_SHAPE_SIZE", "cost": 1 },

    "SWAP_SIZE_DETAIL": {"name": "SWAP_SIZE_DETAIL", "cost": 1 },
    "SWAP_SIZE_TEXT": {"name": "SWAP_SIZE_TEXT", "cost": 1 },
    "SWAP_SIZE_COLUMN": {"name": "SWAP_SIZE_COLUMN", "cost": 1 },
    "SWAP_SIZE_ROW": {"name": "SWAP_SIZE_ROW", "cost": 1 },

    "SWAP_ROW_DETAIL": {"name": "SWAP_ROW_DETAIL", "cost": 1 },
    "SWAP_ROW_TEXT": {"name": "SWAP_ROW_TEXT", "cost": 1 },
    "SWAP_ROW_COLUMN": {"name": "SWAP_ROW_COLUMN", "cost": 1 },

    "SWAP_COLUMN_DETAIL": {"name": "SWAP_COLUMN_DETAIL", "cost": 1 },
    "SWAP_COLUMN_TEXT": {"name": "SWAP_COLUMN_TEXT", "cost": 1 },

    "SWAP_TEXT_DETAIL": {"name": "SWAP_TEXT_DETAIL", "cost": 1 },

};
