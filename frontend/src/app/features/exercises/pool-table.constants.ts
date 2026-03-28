/**
 * Dimensions and palette aligned with the original CodePen demo
 * (units = SVG logical pixels).
 * No gameplay logic: only what rendering needs.
 */

export const INCH = 12;
export const FOOT = INCH * 12;
export const BALL_DI = 2.4375 * INCH;
export const BALL_RAD = BALL_DI / 2;

/** Must stay aligned with the `max-width` of `.pool-table__svg` in `pool-table.component.scss`. */
export const POOL_TABLE_BALL_REFERENCE_SVG_WIDTH_PX = 1180;

export const TABLE_W = 8 * FOOT;
export const TABLE_H = 4 * FOOT;

/**
 * Horizontal step between zones: distance between successive diamonds
 * on the long rails.
 * (8 zones across width = `TABLE_W / 8`).
 */
export const DIAMOND_ZONE_SPACING_SVG = TABLE_W / 8;

/** Display diameter of balls: this step equals 5.5 diameters (SVG reference table). */
export const BALL_DIAMETERS_PER_DIAMOND_ZONE = 5.5;
export const WALL_DI = 5 * INCH;
export const WALL_RAD = WALL_DI / 2;
export const POCKET_DI = 4.5 * INCH;
export const POCKET_RAD = POCKET_DI / 2;
/** Rounded corners of the table bed/slate in SVG units. */
export const TABLE_CORNER_RADIUS = 30;

/**
 * Diamonds on the **long rails** (top/bottom):
 * corner -> middle pocket in 4 segments;
 * guide points at 1/8, 2/8, 3/8, then 5/8, 6/8, 7/8
 * (we skip 4/8 = the center pocket axis).
 */
export const DIAMOND_EIGHTH_INDICES = [1, 2, 3, 5, 6, 7] as const;

/**
 * Short rails: 3 diamonds at quarters 1/4, 2/4, 3/4 of the playfield height
 * (4 vertical zones).
 */
export const DIAMOND_SHORT_RAIL_QUARTER_INDICES = [1, 2, 3] as const;
export const VIEW_W = WALL_DI * 2 + TABLE_W;
export const VIEW_H = WALL_DI * 2 + TABLE_H;

/** Ball diameter on the felt in SVG units (aligned to the step between diamonds). */
export function poolBallDiameterSvgOnTable(): number {
  return DIAMOND_ZONE_SPACING_SVG / BALL_DIAMETERS_PER_DIAMOND_ZONE;
}

/** Ball diameter in px for a given CSS width of the table SVG (viewBox `VIEW_W` × `VIEW_H`). */
export function poolBallDiameterPxForTableSvgWidth(tableSvgWidthPx: number): number {
  const w = Math.max(tableSvgWidthPx, 1);
  return poolBallDiameterSvgOnTable() * (w / VIEW_W);
}

/**
 * `scale()` on each ball in the table SVG:
 * SVG diameter = {@link poolBallDiameterSvgOnTable}.
 */
export function poolBallScaleInTableSvg(): number {
  return poolBallDiameterSvgOnTable() / (2 * BALL_RAD);
}

export const COLORS = {
  white: '#ffffff',
  red: '#F44336',
  black: '#212121',
  purple: '#9C27B0',
  blue: '#2196F3',
  green: '#8bc34a',
  yellow: '#FFC107',
  orange: '#FF9800',
  brown: '#795548',
  felt: '#757575',
  pocket: '#121212',
  frame: '#3E2723',
  /** Rails: slightly darker than the felt to separate visually. */
  cushion: '#5a5a5a',
} as const;

/**
 * Default editable table color theme (used by editor/viewer state and JSON fallback).
 * Keep these values centralized for easy customization.
 */
export const DEFAULT_TABLE_COLOR_CONFIG = {
  frame: '#272626',
  diamond: '#ffffff',
  cloth: '#c3c1c1',
  cushion: '#7f7a7a',
  zones: '#ffffff',
} as const;

/**
 * =====================================================================================
 * AMERICAN BALLS — COLOR CODE (hex)
 * =====================================================================================
 * Everything related to ball tint is grouped here:
 * tweak only this section to change the appearance.
 * The rest of the file derives `POOL_BALL_COLORS`.
 *
 * WPA reminder: 1–7 solid, 8 black, 9–15 striped
 * (9 = same yellow as 1, 10 = blue as 2, ...).
 * =====================================================================================
 */
export const POOL_BALL_THEME = {
  /** Number ink color for the white number plate (balls 1–15 + 8). */
  numberInk: '#0d0d0d',

  /** 0 — cue: body, rim, optional small blue mark. */
  cue: {
    body: '#f7f7f7',
    rim: '#d8d8d8',
    mark: '#1565c0',
  },

  /** 1–7 — solid balls (surface color). */
  solid: {
    1: '#ffff00', // yellow
    2: '#0000ff', // blue
    3: '#ff0000', // red
    4: '#800080', // purple
    5: '#ff8000', // orange
    6: '#008040', // green
    7: '#801a00', // brown / burgundy
  },

  /** 8 — eight ball: body, rim, central white circle. */
  eight: {
    body: '#0d0d0d',
    rim: '#2a2a2a',
    circle: '#f7f7f7',
  },

  /**
    * 9–15 — striped balls:
    * stripe color (the surrounding white comes from the SVG rendering).
    * Default mapping: same tint as solid 1–7 (9<->1, 10<->2, ..., 15<->7).
   */
  stripe: {
    9: '#ffff00',
    10: '#0000ff',
    11: '#ff0000',
    12: '#800080',
    13: '#ff8000',
    14: '#008040',
    15: '#801a00',
  },
} as const;

/**
 * Practical alias when importing elsewhere only the number ink color.
 */
export const POOL_BALL_NUMBER_INK = POOL_BALL_THEME.numberInk;

/**
 * Visual theme for balls — render types.
 * `variant`: cue | solid | eight | stripe
 * (id 0 cue, 1–7 solid, 8 eight, 9–15 striped).
 */
export type PoolBallColorCue = {
  variant: 'cue';
  body: string;
  rim: string;
  cueMark: string;
};

export type PoolBallColorSolid = {
  variant: 'solid';
  body: string;
  numberInk: string;
};

export type PoolBallColorEight = {
  variant: 'eight';
  body: string;
  rim: string;
  circle: string;
  numberInk: string;
};

export type PoolBallColorStripe = {
  variant: 'stripe';
  stripe: string;
  numberInk: string;
};

export type PoolBallColorSpec =
  | PoolBallColorCue
  | PoolBallColorSolid
  | PoolBallColorEight
  | PoolBallColorStripe;

/**
 * Rendering modeled after the CSS snippet `.billiard-ball[data-pool]`:
 * - `_grad-light` → radial 70% 15% (SVG equivalent in `defs`)
 * - number plate: relative radius (increased vs the CSS 20% for better table readability)
 * - striped: `--_stripe * 22.5%` → stripe from 22.5% to 77.5% (`linear-gradient` 180deg)
 */
export const POOL_BALL_RENDER = {
  outerRim: '#1a1a1a',
  outerRimWidthRatio: 0.022,
  /** Underlay under the layers (slightly lighter than the reference for contrast on dark tables). */
  baseWhite: '#f7f7f7',
  /** Relative radius of the central white number plate (fraction of ball radius). */
  numberPlateRadiusRatio: 0.41,
  numberPlateStroke: '#c8c8c8',
  numberPlateStrokeWidthRatio: 0.012,
  /** Stripe band: sharp edges like `calc(22.5%)` over the height. */
  stripeBandStart: 0.225,
  stripeBandEnd: 0.775,
} as const;

export const POOL_BALL_COLORS: Record<number, PoolBallColorSpec> = {
  0: {
    variant: 'cue',
    body: POOL_BALL_THEME.cue.body,
    rim: POOL_BALL_THEME.cue.rim,
    cueMark: POOL_BALL_THEME.cue.mark,
  },
  1: { variant: 'solid', body: POOL_BALL_THEME.solid[1], numberInk: POOL_BALL_THEME.numberInk },
  2: { variant: 'solid', body: POOL_BALL_THEME.solid[2], numberInk: POOL_BALL_THEME.numberInk },
  3: { variant: 'solid', body: POOL_BALL_THEME.solid[3], numberInk: POOL_BALL_THEME.numberInk },
  4: { variant: 'solid', body: POOL_BALL_THEME.solid[4], numberInk: POOL_BALL_THEME.numberInk },
  5: { variant: 'solid', body: POOL_BALL_THEME.solid[5], numberInk: POOL_BALL_THEME.numberInk },
  6: { variant: 'solid', body: POOL_BALL_THEME.solid[6], numberInk: POOL_BALL_THEME.numberInk },
  7: { variant: 'solid', body: POOL_BALL_THEME.solid[7], numberInk: POOL_BALL_THEME.numberInk },
  8: {
    variant: 'eight',
    body: POOL_BALL_THEME.eight.body,
    rim: POOL_BALL_THEME.eight.rim,
    circle: POOL_BALL_THEME.eight.circle,
    numberInk: POOL_BALL_THEME.numberInk,
  },
  9: { variant: 'stripe', stripe: POOL_BALL_THEME.stripe[9], numberInk: POOL_BALL_THEME.numberInk },
  10: { variant: 'stripe', stripe: POOL_BALL_THEME.stripe[10], numberInk: POOL_BALL_THEME.numberInk },
  11: { variant: 'stripe', stripe: POOL_BALL_THEME.stripe[11], numberInk: POOL_BALL_THEME.numberInk },
  12: { variant: 'stripe', stripe: POOL_BALL_THEME.stripe[12], numberInk: POOL_BALL_THEME.numberInk },
  13: { variant: 'stripe', stripe: POOL_BALL_THEME.stripe[13], numberInk: POOL_BALL_THEME.numberInk },
  14: { variant: 'stripe', stripe: POOL_BALL_THEME.stripe[14], numberInk: POOL_BALL_THEME.numberInk },
  15: { variant: 'stripe', stripe: POOL_BALL_THEME.stripe[15], numberInk: POOL_BALL_THEME.numberInk },
};

/** Pocket centers (same placement as the CodePen). */
export const POCKET_CENTERS = [
  { cx: WALL_DI * 0.75, cy: WALL_DI * 0.75 },
  { cx: TABLE_W / 2 + WALL_DI, cy: WALL_DI * 0.75 },
  { cx: TABLE_W + WALL_DI * 1.25, cy: WALL_DI * 0.75 },
  { cx: WALL_DI * 0.75, cy: TABLE_H + WALL_DI * 1.25 },
  { cx: TABLE_W / 2 + WALL_DI, cy: TABLE_H + WALL_DI * 1.25 },
  { cx: TABLE_W + WALL_DI * 1.25, cy: TABLE_H + WALL_DI * 1.25 },
] as const;
