/**
 * Import / export JSON for the diagram (balls + annotations).
 * To add a new annotation type: model → parse here → template `pool-diagram-elements` → hit-test `pool-diagram-annotation-hit` → `translateElement` if movable.
 */

import {
  DEFAULT_ANNOTATION_STROKE_WIDTH,
  POOL_DIAGRAM_SCHEMA_VERSION,
  newPoolBallInstanceId,
  newPoolDiagramDocumentId,
  type PoolDiagramArrowElement,
  type PoolDiagramBallOnTable,
  type PoolDiagramDashedElement,
  type PoolDiagramDocument,
  type PoolDiagramElement,
  type PoolDiagramRectElement,
  type PoolDiagramSegmentElement,
  type PoolDiagramTableColors,
  type PoolDiagramTextElement,
} from './pool-diagram.model';
import { DEFAULT_TABLE_COLOR_CONFIG } from '../pool-table.constants';

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null;
}

function bool(v: unknown): boolean | null {
  return typeof v === 'boolean' ? v : null;
}

/** Ball without id (schemas 1–2) → stable id for import. */
function parseBallOnTableLoose(raw: unknown, index: number): PoolDiagramBallOnTable | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const o = raw as Record<string, unknown>;
  const ballId = num(o['ballId']);
  const x = num(o['x']);
  const y = num(o['y']);
  if (ballId === null || x === null || y === null || ballId < 0 || ballId > 15) {
    return null;
  }
  const id = str(o['id']);
  const opacity = parseElementOpacity(o);
  return {
    id: id ?? `imported-${ballId}-${index}-${newPoolBallInstanceId().slice(-10)}`,
    ballId,
    x,
    y,
    ...(opacity !== undefined ? { opacity } : {}),
  };
}

function strokeWidth(o: Record<string, unknown>): number | undefined {
  const w = num(o['strokeWidth']);
  return w !== null && w > 0 ? w : undefined;
}

/** Element/ball opacity: 0–1; >=1 or absent → no field (opaque by default). */
function parseElementOpacity(o: Record<string, unknown>): number | undefined {
  const v = num(o['opacity']);
  if (v === null || v < 0 || v > 1 || v >= 1) {
    return undefined;
  }
  return v;
}

function parseArrow(o: Record<string, unknown>): PoolDiagramArrowElement | null {
  const x1 = num(o['x1']);
  const y1 = num(o['y1']);
  const x2 = num(o['x2']);
  const y2 = num(o['y2']);
  const color = str(o['color']);
  const id = str(o['id']);
  if (x1 === null || y1 === null || x2 === null || y2 === null || !color || !id) {
    return null;
  }
  const opacity = parseElementOpacity(o);
  return {
    type: 'arrow',
    id,
    color,
    x1,
    y1,
    x2,
    y2,
    strokeWidth: strokeWidth(o),
    ...(opacity !== undefined ? { opacity } : {}),
  };
}

function parseSegment(o: Record<string, unknown>): PoolDiagramSegmentElement | null {
  const x1 = num(o['x1']);
  const y1 = num(o['y1']);
  const x2 = num(o['x2']);
  const y2 = num(o['y2']);
  const color = str(o['color']);
  const id = str(o['id']);
  if (x1 === null || y1 === null || x2 === null || y2 === null || !color || !id) {
    return null;
  }
  const opacity = parseElementOpacity(o);
  return {
    type: 'segment',
    id,
    color,
    x1,
    y1,
    x2,
    y2,
    strokeWidth: strokeWidth(o),
    ...(opacity !== undefined ? { opacity } : {}),
  };
}

function parseDashed(o: Record<string, unknown>): PoolDiagramDashedElement | null {
  const x1 = num(o['x1']);
  const y1 = num(o['y1']);
  const x2 = num(o['x2']);
  const y2 = num(o['y2']);
  const color = str(o['color']);
  const id = str(o['id']);
  if (x1 === null || y1 === null || x2 === null || y2 === null || !color || !id) {
    return null;
  }
  const opacity = parseElementOpacity(o);
  return {
    type: 'dashed',
    id,
    color,
    x1,
    y1,
    x2,
    y2,
    strokeWidth: strokeWidth(o),
    ...(opacity !== undefined ? { opacity } : {}),
  };
}

function parseRect(o: Record<string, unknown>): PoolDiagramRectElement | null {
  const x = num(o['x']);
  const y = num(o['y']);
  const width = num(o['width']);
  const height = num(o['height']);
  const color = str(o['color']);
  const id = str(o['id']);
  const filled = bool(o['filled']);
  if (x === null || y === null || width === null || height === null || !color || !id || filled === null) {
    return null;
  }
  if (width <= 0 || height <= 0) {
    return null;
  }
  const fillOpacity = num(o['fillOpacity']);
  const opacity = parseElementOpacity(o);
  return {
    type: 'rect',
    id,
    color,
    x,
    y,
    width,
    height,
    filled,
    strokeWidth: strokeWidth(o),
    fillOpacity: fillOpacity !== null && fillOpacity >= 0 && fillOpacity <= 1 ? fillOpacity : undefined,
    ...(opacity !== undefined ? { opacity } : {}),
  };
}

function parseText(o: Record<string, unknown>): PoolDiagramTextElement | null {
  const x = num(o['x']);
  const y = num(o['y']);
  const text = str(o['text']);
  const color = str(o['color']);
  const id = str(o['id']);
  const fontFamily = str(o['fontFamily']);
  const fontSize = num(o['fontSize']);
  if (x === null || y === null || !text || !color || !id || !fontFamily || fontSize === null || fontSize <= 0) {
    return null;
  }
  const opacity = parseElementOpacity(o);
  return {
    type: 'text',
    id,
    color,
    x,
    y,
    text,
    fontSize,
    fontFamily,
    ...(opacity !== undefined ? { opacity } : {}),
  };
}

const elementParsers: Record<string, (o: Record<string, unknown>) => PoolDiagramElement | null> = {
  arrow: parseArrow,
  segment: parseSegment,
  dashed: parseDashed,
  rect: parseRect,
  text: parseText,
};

export function parsePoolDiagramElement(raw: unknown): PoolDiagramElement | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const o = raw as Record<string, unknown>;
  const t = o['type'];
  if (typeof t !== 'string') {
    return null;
  }
  const p = elementParsers[t];
  return p ? p(o) : null;
}

function readDiagramName(o: Record<string, unknown>): string {
  const v = o['diagramName'];
  return typeof v === 'string' ? v.trim() : '';
}

function readPoolDiagramId(o: Record<string, unknown>): string {
  const id = str(o['id']);
  return id ?? newPoolDiagramDocumentId();
}

function readCreatorId(o: Record<string, unknown>): string {
  const v = o['creatorId'];
  return typeof v === 'string' ? v.trim() : '';
}

function parseShowZonesOverlay(o: Record<string, unknown>): boolean {
  const v = o['showZonesOverlay'];
  return typeof v === 'boolean' ? v : true;
}

function parseTableColors(o: Record<string, unknown>): PoolDiagramTableColors | undefined {
  const raw = o['tableColors'];
  if (!raw || typeof raw !== 'object') {
    return undefined;
  }
  const c = raw as Record<string, unknown>;
  const frame = str(c['frame']);
  const diamond = str(c['diamond']);
  const cloth = str(c['cloth']);
  const cushion = str(c['cushion']);
  const zones = str(c['zones']);
  if (!frame || !diamond || !cloth || !cushion) {
    return undefined;
  }
  return { frame, diamond, cloth, cushion, zones: zones ?? DEFAULT_TABLE_COLOR_CONFIG.zones };
}

function parseElements(o: Record<string, unknown>): PoolDiagramElement[] {
  const elements: PoolDiagramElement[] = [];
  const els = o['elements'];
  if (Array.isArray(els)) {
    for (const e of els) {
      const el = parsePoolDiagramElement(e);
      if (el) {
        elements.push(el);
      }
    }
  }
  return elements;
}

export function parsePoolDiagramJson(data: unknown): PoolDiagramDocument {
  if (!data || typeof data !== 'object') {
    return emptyDocument();
  }
  const o = data as Record<string, unknown>;
  const ver = num(o['schemaVersion']);
  const ballsRaw = o['ballsOnTable'];

  if (ver === 1 || ver === 2) {
    const ballsOnTable: PoolDiagramBallOnTable[] = [];
    if (Array.isArray(ballsRaw)) {
      ballsRaw.forEach((b, i) => {
        const p = parseBallOnTableLoose(b, i);
        if (p) {
          ballsOnTable.push(p);
        }
      });
    }
    return {
      schemaVersion: POOL_DIAGRAM_SCHEMA_VERSION,
      id: readPoolDiagramId(o),
      creatorId: readCreatorId(o),
      diagramName: readDiagramName(o),
      ballsOnTable,
      elements: parseElements(o),
      showZonesOverlay: parseShowZonesOverlay(o),
      tableColors: parseTableColors(o),
    };
  }

  if (ver !== POOL_DIAGRAM_SCHEMA_VERSION) {
    return emptyDocument();
  }

  const ballsOnTable: PoolDiagramBallOnTable[] = [];
  if (Array.isArray(ballsRaw)) {
    ballsRaw.forEach((b, i) => {
      const p = parseBallOnTableLoose(b, i);
      if (p) {
        ballsOnTable.push(p);
      }
    });
  }

  return {
    schemaVersion: POOL_DIAGRAM_SCHEMA_VERSION,
    id: readPoolDiagramId(o),
    creatorId: readCreatorId(o),
    diagramName: readDiagramName(o),
    ballsOnTable,
    elements: parseElements(o),
    showZonesOverlay: parseShowZonesOverlay(o),
    tableColors: parseTableColors(o),
  };
}

export function emptyDocument(): PoolDiagramDocument {
  return {
    schemaVersion: POOL_DIAGRAM_SCHEMA_VERSION,
    id: newPoolDiagramDocumentId(),
    creatorId: '',
    diagramName: '',
    ballsOnTable: [],
    elements: [],
    showZonesOverlay: true,
  };
}

export function serializePoolDiagramDocument(doc: PoolDiagramDocument): string {
  return JSON.stringify(doc, null, 2);
}

export function withAnnotationDefaults(el: PoolDiagramElement): PoolDiagramElement {
  const sw = el.strokeWidth ?? DEFAULT_ANNOTATION_STROKE_WIDTH;
  if (el.type === 'rect') {
    return { ...el, strokeWidth: sw };
  }
  return { ...el, strokeWidth: sw };
}
