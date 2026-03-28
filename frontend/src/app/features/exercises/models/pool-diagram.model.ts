/**
 * Pool diagram document:
 * - The coordinate system matches the table SVG `viewBox` (ball centers).
 * - schemaVersion 3: each ball instance on the felt has a unique `id`; the document has `id` + `creatorId`.
 */

export const POOL_DIAGRAM_SCHEMA_VERSION = 3 as const;

/** Ball placed on the table (one entry = one instance, `ballId` can repeat). */
export type PoolDiagramBallOnTable = {
  id: string;
  ballId: number;
  x: number;
  y: number;
  /** 0–1, absent = opaque (`DEFAULT_ELEMENT_OPACITY`). */
  opacity?: number;
};

/** @deprecated Historical alias — use `PoolDiagramBallOnTable` instead. */
export type PoolDiagramBallPosition = PoolDiagramBallOnTable;

export type PoolEditorTool = 'select' | 'arrow' | 'segment' | 'dashed' | 'rect' | 'text';

export type PoolDiagramElementBase = {
  id: string;
  color: string;
  strokeWidth?: number;
  /** 0–1, absent = opaque (`DEFAULT_ELEMENT_OPACITY`). */
  opacity?: number;
};

export type PoolDiagramArrowElement = PoolDiagramElementBase & {
  type: 'arrow';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type PoolDiagramSegmentElement = PoolDiagramElementBase & {
  type: 'segment';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type PoolDiagramDashedElement = PoolDiagramElementBase & {
  type: 'dashed';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type PoolDiagramRectElement = PoolDiagramElementBase & {
  type: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
  filled: boolean;
  fillOpacity?: number;
};

export type PoolDiagramTextElement = PoolDiagramElementBase & {
  type: 'text';
  x: number;
  y: number;
  text: string;
  fontSize: number;
  fontFamily: string;
};

export type PoolDiagramElement =
  | PoolDiagramArrowElement
  | PoolDiagramSegmentElement
  | PoolDiagramDashedElement
  | PoolDiagramRectElement
  | PoolDiagramTextElement;

export type PoolDiagramTableColors = {
  frame: string;
  diamond: string;
  cloth: string;
  cushion: string;
  zones: string;
};

export type PoolDiagramDocument = {
  schemaVersion: typeof POOL_DIAGRAM_SCHEMA_VERSION;
  /** Unique diagram identifier (persisted through import/export). */
  id: string;
  /** Creator identifier (account, auth, etc.). */
  creatorId: string;
  /** Diagram title / name (metadata, export + import). */
  diagramName?: string;
  ballsOnTable: PoolDiagramBallOnTable[];
  elements: PoolDiagramElement[];
  /** Zone guides (diamond lines + black spot): persisted in JSON / viewer. */
  showZonesOverlay?: boolean;
  /** Optional table theme persisted in JSON (editor + viewer). */
  tableColors?: PoolDiagramTableColors;
};

export type PoolBallDragState = {
  ballId: number;
  /** If the ball comes from the felt, we reuse this id on drop. */
  tableInstanceId: string | null;
  grabOffsetClientX: number;
  grabOffsetClientY: number;
  clientX: number;
  clientY: number;
  ghostSizePx: number;
  pointerId: number;
  /** Used to release the pointer capture on the original element (if still in the DOM). */
  dragHost: HTMLElement | null;
};

export function newPoolDiagramElementId(): string {
  return `el-${crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`}`;
}

export function newPoolBallInstanceId(): string {
  return `ball-${crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`}`;
}

export function newPoolDiagramDocumentId(): string {
  return `diag-${crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`}`;
}

/** Default stroke width (new strokes + fallback if missing in JSON). */
export const DEFAULT_ANNOTATION_STROKE_WIDTH = 2;

export const MIN_ANNOTATION_STROKE_WIDTH = 2;
export const MAX_ANNOTATION_STROKE_WIDTH = 36;

/** Default opacity (100%) for balls on the felt and shapes / text. */
export const DEFAULT_ELEMENT_OPACITY = 1;

export function isLineLike(
  e: PoolDiagramElement,
): e is PoolDiagramArrowElement | PoolDiagramSegmentElement | PoolDiagramDashedElement {
  return e.type === 'arrow' || e.type === 'segment' || e.type === 'dashed';
}

export function isRectElement(e: PoolDiagramElement): e is PoolDiagramRectElement {
  return e.type === 'rect';
}

export function isTextElement(e: PoolDiagramElement): e is PoolDiagramTextElement {
  return e.type === 'text';
}
