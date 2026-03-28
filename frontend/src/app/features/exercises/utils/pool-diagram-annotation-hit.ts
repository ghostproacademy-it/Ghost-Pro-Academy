import {
  DEFAULT_ANNOTATION_STROKE_WIDTH,
  type PoolDiagramElement,
  type PoolDiagramRectElement,
  type PoolDiagramTextElement,
  isLineLike,
  isRectElement,
  isTextElement,
} from '../models/pool-diagram.model';

function distSq(ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  return dx * dx + dy * dy;
}

/** Distance from point P to segment [A,B]:
 * project P onto line (AB) and clamp to the segment.
 */
function distPointToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const l2 = distSq(x1, y1, x2, y2);
  if (l2 === 0) {
    return Math.hypot(px - x1, py - y1);
  }
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  const qx = x1 + t * (x2 - x1);
  const qy = y1 + t * (y2 - y1);
  return Math.hypot(px - qx, py - qy);
}

function hitRect(el: PoolDiagramRectElement, px: number, py: number, threshold: number): boolean {
  const { x, y, width, height } = el;
  const sw = el.strokeWidth ?? DEFAULT_ANNOTATION_STROKE_WIDTH;
  const pad = threshold + sw / 2;
  if (el.filled) {
    return px >= x - pad && px <= x + width + pad && py >= y - pad && py <= y + height + pad;
  }
  const outer =
    px >= x - pad && px <= x + width + pad && py >= y - pad && py <= y + height + pad;
  const inner =
    px >= x + pad && px <= x + width - pad && py >= y + pad && py <= y + height - pad;
  return outer && !inner;
}

function hitText(el: PoolDiagramTextElement, px: number, py: number, threshold: number): boolean {
  // Keep this intentionally generous: text glyph metrics vary by font, and we do not measure DOM bbox here.
  // A larger hit box makes selection predictable, like other annotation tools.
  const width = Math.max(el.text.length, 1) * el.fontSize * 0.74;
  const height = el.fontSize * 1.55;
  const pad = Math.max(threshold, el.fontSize * 0.25);
  return (
    px >= el.x - pad &&
    px <= el.x + width + pad &&
    py >= el.y - pad &&
    py <= el.y + height + pad
  );
}

/**
 * Top-most element under a point (lines, arrows, rectangles).
 * Z-order: later items are above earlier ones. `thresholdSvg` is in SVG units (table coordinates).
 */
export function hitTestTopAnnotation(
  px: number,
  py: number,
  elements: PoolDiagramElement[],
  thresholdSvg: number,
): PoolDiagramElement | null {
  for (let i = elements.length - 1; i >= 0; i--) {
    const e = elements[i];
    const sw = e.strokeWidth ?? DEFAULT_ANNOTATION_STROKE_WIDTH;
    const tol = thresholdSvg + sw * 0.35;
    if (isLineLike(e)) {
      if (distPointToSegment(px, py, e.x1, e.y1, e.x2, e.y2) <= tol) {
        return e;
      }
    } else if (isRectElement(e)) {
      if (hitRect(e, px, py, thresholdSvg)) {
        return e;
      }
    } else if (isTextElement(e)) {
      if (hitText(e, px, py, thresholdSvg)) {
        return e;
      }
    }
  }
  return null;
}
