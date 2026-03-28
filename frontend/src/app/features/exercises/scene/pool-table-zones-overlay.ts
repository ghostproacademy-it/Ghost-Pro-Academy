/**
 * Coaching overlay:
 * guides between diamonds + middle axis + black spot point
 * (without drawing the spot diagonals).
 * Center line: segments with a break at the middle pockets (same axis as the table).
 */

import { POCKET_CENTERS, POCKET_RAD, TABLE_H, TABLE_W, WALL_DI } from '../pool-table.constants';
import { getBilliardDiamondCenters } from '../pool-table.geometry';

const DIAMONDS_PER_LONG_RAIL = 6;
const DIAMONDS_PER_SHORT_RAIL = 3;

/** Clearance beyond the pocket radius to stop the line before the hole (SVG units). */
const CENTER_LINE_POCKET_CLEARANCE = 5;

/** Small nudge to the right:
 * the geometric spot (pockets) lands slightly left of the visual diamond + axis intersection.
 */
const BLACK_SPOT_NUDGE_X = 7;

/** Playable felt rectangle (between rail noses), table viewBox reference. */
export function getPlayfieldInteriorRect(): { x: number; y: number; w: number; h: number } {
  return { x: WALL_DI, y: WALL_DI, w: TABLE_W, h: TABLE_H };
}

export type ZoneOverlaySegment = { x1: number; y1: number; x2: number; y2: number };

/** Intersection of lines (P1→P2) and (P3→P4). */
function intersectLines(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  x4: number,
  y4: number,
): { x: number; y: number } | null {
  const dx1 = x2 - x1;
  const dy1 = y2 - y1;
  const dx2 = x4 - x3;
  const dy2 = y4 - y3;
  const denom = dx1 * dy2 - dy1 * dx2;
  if (Math.abs(denom) < 1e-9) {
    return null;
  }
  const cx = x3 - x1;
  const cy = y3 - y1;
  const t = (cx * dy2 - cy * dx2) / denom;
  return { x: x1 + t * dx1, y: y1 + t * dy1 };
}

/**
 * Vertical center axis split into segments so we do not cross the side pockets (indices 1 and 4).
 */
export function buildCenterLineSegmentsAvoidingSidePockets(): ZoneOverlaySegment[] {
  const xm = WALL_DI + TABLE_W / 2;
  const yPlayMin = WALL_DI;
  const yPlayMax = WALL_DI + TABLE_H;
  const effectiveR = POCKET_RAD + CENTER_LINE_POCKET_CLEARANCE;

  const blocked: { y0: number; y1: number }[] = [];
  for (const idx of [1, 4] as const) {
    const pc = POCKET_CENTERS[idx];
    const dx = Math.abs(xm - pc.cx);
    if (dx >= effectiveR) {
      continue;
    }
    const halfChord = Math.sqrt(effectiveR * effectiveR - dx * dx);
    blocked.push({ y0: pc.cy - halfChord, y1: pc.cy + halfChord });
  }

  blocked.sort((a, b) => a.y0 - b.y0);
  const merged: { y0: number; y1: number }[] = [];
  for (const b of blocked) {
    const last = merged[merged.length - 1];
    if (!last || b.y0 > last.y1 + 0.5) {
      merged.push({ ...b });
    } else {
      last.y1 = Math.max(last.y1, b.y1);
    }
  }

  const segments: ZoneOverlaySegment[] = [];
  let y = yPlayMin;
  for (const b of merged) {
    const gapLo = Math.max(b.y0, yPlayMin);
    const gapHi = Math.min(b.y1, yPlayMax);
    if (gapLo >= gapHi) {
      continue;
    }
    if (y < gapLo - 1e-3) {
      segments.push({ x1: xm, y1: y, x2: xm, y2: gapLo });
    }
    y = Math.max(y, gapHi);
  }
  if (y < yPlayMax - 1e-3) {
    segments.push({ x1: xm, y1: y, x2: xm, y2: yPlayMax });
  }
  return segments;
}

/**
 * Geometric construction of the black spot (not drawn):
 * HG → bottom middle, and BG → top middle.
 */
function blackSpotConstructionSegments(): ZoneOverlaySegment[] {
  const p = POCKET_CENTERS;
  return [
    { x1: p[0].cx, y1: p[0].cy, x2: p[4].cx, y2: p[4].cy },
    { x1: p[3].cx, y1: p[3].cy, x2: p[1].cx, y2: p[1].cy },
  ];
}

/**
 * Lines between opposite diamonds + middle axis cut around the middle pockets.
 */
export function buildZonesOverlaySegments(): ZoneOverlaySegment[] {
  const d = getBilliardDiamondCenters();
  const segments: ZoneOverlaySegment[] = [];

  for (let i = 0; i < DIAMONDS_PER_LONG_RAIL; i++) {
    const top = d[i];
    const bottom = d[i + DIAMONDS_PER_LONG_RAIL];
    segments.push({ x1: top.x, y1: top.y, x2: bottom.x, y2: bottom.y });
  }

  const leftStart = DIAMONDS_PER_LONG_RAIL * 2;
  for (let i = 0; i < DIAMONDS_PER_SHORT_RAIL; i++) {
    const left = d[leftStart + i];
    const right = d[leftStart + DIAMONDS_PER_SHORT_RAIL + i];
    segments.push({ x1: left.x, y1: left.y, x2: right.x, y2: right.y });
  }

  segments.push(...buildCenterLineSegmentsAvoidingSidePockets());

  return segments;
}

/**
 * Black spot point:
 * pocket intersection (0→4 and 3→1) + small +X nudge for the on-screen grid.
 */
export function getBlackSpotPosition(): { x: number; y: number } {
  const [a, b] = blackSpotConstructionSegments();
  const hit = intersectLines(a.x1, a.y1, a.x2, a.y2, b.x1, b.y1, b.x2, b.y2);
  if (!hit) {
    const r = getPlayfieldInteriorRect();
    return { x: r.x + r.w * 0.25 + BLACK_SPOT_NUDGE_X, y: r.y + r.h * 0.5 };
  }
  return { x: hit.x + BLACK_SPOT_NUDGE_X, y: hit.y };
}

export const POOL_TABLE_ZONE_OVERLAY_STYLE = {
  lineStroke: 'rgba(248, 245, 238, 0.28)',
  lineWidth: 0.9,
  spotFill: 'rgba(18, 16, 15, 0.88)',
  spotRadius: 3.2,
} as const;

export const POOL_TABLE_ZONES = {
  playfieldClip: getPlayfieldInteriorRect(),
  segments: buildZonesOverlaySegments(),
  blackSpot: getBlackSpotPosition(),
  style: POOL_TABLE_ZONE_OVERLAY_STYLE,
} as const;

export const drawZonesOverlay = buildZonesOverlaySegments;
