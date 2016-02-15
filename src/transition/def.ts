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
