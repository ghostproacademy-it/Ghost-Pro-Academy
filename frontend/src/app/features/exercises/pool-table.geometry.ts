/**
 * Construction of SVG paths/positions.
 * Reuses the canvas/Matter logic from the CodePen (fromVertices, drawSlate, drawWall)
 * without any physics engine.
 */

import type { DiamondVm, PoolTableScene, WallPieceVm } from './models/pool-table.model';
import {
  BALL_RAD,
  COLORS,
  DIAMOND_EIGHTH_INDICES,
  DIAMOND_SHORT_RAIL_QUARTER_INDICES,
  POCKET_CENTERS,
  POCKET_RAD,
  TABLE_H,
  TABLE_W,
  VIEW_H,
  VIEW_W,
  WALL_DI,
  WALL_RAD,
} from './pool-table.constants';

/** Offset a table coordinate into the SVG viewBox coordinate system (wood margin). */
function rel(x: number): number {
  return x + WALL_DI;
}

/**
 * Allowed area for the **center** of a ball on the felt (inside the rails),
 * expressed in the table viewBox coordinate system.
 */
export function playfieldBoundsForBallCenters(): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
} {
  return {
    minX: WALL_DI + BALL_RAD,
    maxX: WALL_DI + TABLE_W - BALL_RAD,
    minY: WALL_DI + BALL_RAD,
    maxY: WALL_DI + TABLE_H - BALL_RAD,
  };
}

export function clampBallCenterToPlayfield(
  x: number,
  y: number,
  bounds = playfieldBoundsForBallCenters(),
): { x: number; y: number } {
  return {
    x: Math.min(Math.max(x, bounds.minX), bounds.maxX),
    y: Math.min(Math.max(y, bounds.minY), bounds.maxY),
  };
}

/** Felt surface (drawSlate from the CodePen) — same rectangle as the `fillRect` canvas. */
export function outerSlateRect(): { x: number; y: number; w: number; h: number } {
  return {
    x: WALL_RAD,
    y: WALL_RAD,
    w: TABLE_W + WALL_DI,
    h: TABLE_H + WALL_DI,
  };
}

/**
 * Large rubber rectangle, replicated into each rail segment via clip-path:
 * only its intersection with the wood is visible as the cushion.
 */
export function bumperMaskRect(): { x: number; y: number; w: number; h: number } {
  const clipOff = WALL_DI * 0.75;
  const clipDiff = WALL_DI - clipOff;
  return {
    x: clipOff,
    y: clipOff,
    w: TABLE_W + clipDiff * 2,
    h: TABLE_H + clipDiff * 2,
  };
}

function fmtPath(n: number): string {
  return (Math.round(n * 1000) / 1000).toString();
}

function pathFromVerts(pts: { x: number; y: number }[]): string {
  if (!pts.length) {
    return '';
  }
  let d = `M ${fmtPath(pts[0].x)} ${fmtPath(pts[0].y)}`;
  for (let i = 1; i < pts.length; i++) {
    d += ` L ${fmtPath(pts[i].x)} ${fmtPath(pts[i].y)}`;
  }
  d += ' Z';
  return d;
}

/** Polygon area centroid (close to Matter's centroid for `fromVertices`). */
function polygonCentroid(pts: { x: number; y: number }[]): { x: number; y: number } {
  const n = pts.length;
  if (n === 0) {
    return { x: 0, y: 0 };
  }
  let a = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const cross = pts[i].x * pts[j].y - pts[j].x * pts[i].y;
    a += cross;
    cx += (pts[i].x + pts[j].x) * cross;
    cy += (pts[i].y + pts[j].y) * cross;
  }
  a *= 0.5;
  if (Math.abs(a) < 1e-6) {
    return {
      x: pts.reduce((s, p) => s + p.x, 0) / n,
      y: pts.reduce((s, p) => s + p.y, 0) / n,
    };
  }
  return { x: cx / (6 * a), y: cy / (6 * a) };
}

/** Like Matter `Bodies.fromVertices(x, y, verts)`: world position = local polygon centroid. */
function worldVertsFromLocal(local: { x: number; y: number }[], bx: number, by: number): { x: number; y: number }[] {
  const { x: cx, y: cy } = polygonCentroid(local);
  return local.map((v) => ({ x: v.x - cx + bx, y: v.y - cy + by }));
}

function rectCenterPath(cx: number, cy: number, w: number, h: number): string {
  const x = cx - w / 2;
  const y = cy - h / 2;
  return `M ${fmtPath(x)} ${fmtPath(y)} h ${fmtPath(w)} v ${fmtPath(h)} h ${fmtPath(-w)} Z`;
}

function tableWallVertices(): {
  bottom: { x: number; y: number }[];
  top: { x: number; y: number }[];
  left: { x: number; y: number }[];
  right: { x: number; y: number }[];
} {
  const quarterW = (TABLE_W - POCKET_RAD * 2) / 4;
  const halfH = (TABLE_H - POCKET_RAD) / 2;
  return {
    bottom: [
      { x: -quarterW, y: WALL_DI },
      { x: quarterW, y: WALL_DI },
      { x: quarterW, y: POCKET_RAD },
      { x: quarterW - POCKET_RAD, y: 0 },
      { x: -quarterW + POCKET_RAD, y: 0 },
      { x: -quarterW, y: POCKET_RAD },
    ],
    top: [
      { x: -quarterW, y: 0 },
      { x: quarterW, y: 0 },
      { x: quarterW, y: WALL_DI - POCKET_RAD },
      { x: quarterW - POCKET_RAD, y: WALL_DI },
      { x: -quarterW + POCKET_RAD, y: WALL_DI },
      { x: -quarterW, y: WALL_DI - POCKET_RAD },
    ],
    left: [
      { x: 0, y: -halfH },
      { x: 0, y: halfH },
      { x: WALL_DI - POCKET_RAD, y: halfH },
      { x: WALL_DI, y: halfH - POCKET_RAD },
      { x: WALL_DI, y: -halfH + POCKET_RAD },
      { x: WALL_DI - POCKET_RAD, y: -halfH },
    ],
    right: [
      { x: WALL_DI, y: -halfH },
      { x: WALL_DI, y: halfH },
      { x: POCKET_RAD, y: halfH },
      { x: 0, y: halfH - POCKET_RAD },
      { x: 0, y: -halfH + POCKET_RAD },
      { x: POCKET_RAD, y: -halfH },
    ],
  };
}

/**
 * Wood pieces + rail inclination (polygons from `fromVertices` + rectangles from the `Table.buildWall` CodePen).
 */
export function buildWallPieces(): WallPieceVm[] {
  const wv = tableWallVertices();
  const pieces: WallPieceVm[] = [];
  let i = 0;
  const add = (path: string) => {
    pieces.push({ id: `wall-${i++}`, woodPath: path });
  };

  add(pathFromVerts(worldVertsFromLocal(wv.bottom, rel(TABLE_W / 4), rel(TABLE_H + WALL_RAD))));
  add(pathFromVerts(worldVertsFromLocal(wv.bottom, rel(TABLE_W / 4 + TABLE_W / 2), rel(TABLE_H + WALL_RAD))));
  add(pathFromVerts(worldVertsFromLocal(wv.top, rel(TABLE_W / 4), rel(0 - WALL_RAD))));
  add(pathFromVerts(worldVertsFromLocal(wv.top, rel(TABLE_W / 4 + TABLE_W / 2), rel(0 - WALL_RAD))));
  add(pathFromVerts(worldVertsFromLocal(wv.left, rel(0 - WALL_RAD), rel(TABLE_H / 2))));
  add(pathFromVerts(worldVertsFromLocal(wv.right, rel(TABLE_W + WALL_RAD), rel(TABLE_H / 2))));

  const horizontalBlock = { width: WALL_DI * 1.5, height: WALL_DI - POCKET_RAD };
  const verticalBlock = { width: WALL_DI - POCKET_RAD, height: WALL_DI * 1.5 };
  const middleBlock = { width: WALL_DI - POCKET_RAD, height: WALL_DI - POCKET_RAD };

  const horTY = horizontalBlock.height / 2;
  const horBY = rel(TABLE_H + WALL_DI - horizontalBlock.height / 2);
  const horLX = horizontalBlock.width / 2;
  const horRX = rel(TABLE_W + WALL_DI - horizontalBlock.width / 2);
  const verTY = verticalBlock.height / 2;
  const verBY = rel(TABLE_H + WALL_DI - verticalBlock.height / 2);
  const verLX = verticalBlock.width / 2;
  const verRX = rel(TABLE_W + WALL_DI - verticalBlock.width / 2);

  add(rectCenterPath(horLX, horTY, horizontalBlock.width, horizontalBlock.height));
  add(rectCenterPath(horRX, horTY, horizontalBlock.width, horizontalBlock.height));
  add(rectCenterPath(horLX, horBY, horizontalBlock.width, horizontalBlock.height));
  add(rectCenterPath(horRX, horBY, horizontalBlock.width, horizontalBlock.height));
  add(rectCenterPath(verLX, verTY, verticalBlock.width, verticalBlock.height));
  add(rectCenterPath(verRX, verTY, verticalBlock.width, verticalBlock.height));
  add(rectCenterPath(verLX, verBY, verticalBlock.width, verticalBlock.height));
  add(rectCenterPath(verRX, verBY, verticalBlock.width, verticalBlock.height));
  add(rectCenterPath(rel(TABLE_W / 2), horBY, middleBlock.width, middleBlock.height));
  add(rectCenterPath(rel(TABLE_W / 2), horTY, middleBlock.width, middleBlock.height));

  return pieces;
}

/**
 * Diamond centers on the wooden rails (viewBox coordinate system).
 * Long rails: `DIAMOND_EIGHTH_INDICES`; short rails: `DIAMOND_SHORT_RAIL_QUARTER_INDICES`
 * (3 diamonds -> 4 vertical zones).
 */
export function getBilliardDiamondCenters(): ReadonlyArray<{ x: number; y: number }> {
  const yTop = WALL_RAD * 0.75;
  const yBottom = rel(TABLE_H + WALL_RAD * 1.25);
  const xLeft = WALL_RAD * 0.75;
  const xRight = rel(TABLE_W + WALL_RAD * 1.25);

  const longXs = DIAMOND_EIGHTH_INDICES.map((k) => WALL_DI + (TABLE_W * k) / 8);
  const shortYs = DIAMOND_SHORT_RAIL_QUARTER_INDICES.map((k) => WALL_DI + (TABLE_H * k) / 4);

  const top = longXs.map((x) => ({ x, y: yTop }));
  const bottom = longXs.map((x) => ({ x, y: yBottom }));
  const left = shortYs.map((y) => ({ x: xLeft, y }));
  const right = shortYs.map((y) => ({ x: xRight, y }));

  return [...top, ...bottom, ...left, ...right];
}

/** Diamond guides (CodePen `drawPoints`). */
export function buildDiamondPoints(): DiamondVm[] {
  const di = 10;
  const half = di * 0.5;
  return getBilliardDiamondCenters().map((c) => ({
    half,
    points: `${c.x},${c.y - half} ${c.x + half},${c.y} ${c.x},${c.y + half} ${c.x - half},${c.y}`,
  }));
}

/** Aggregates everything the table template consumes (built once on load). */
export function buildPoolTableScene(): PoolTableScene {
  return {
    view: { w: VIEW_W, h: VIEW_H },
    colors: COLORS,
    slate: outerSlateRect(),
    bumperMask: bumperMaskRect(),
    walls: buildWallPieces(),
    pockets: POCKET_CENTERS,
    pocketRadius: POCKET_RAD,
    diamonds: buildDiamondPoints(),
    feltGradientRadius: TABLE_H * 0.75 * 1.5,
  };
}
