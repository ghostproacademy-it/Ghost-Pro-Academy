import { computed, signal } from '@angular/core';
import {
  DEFAULT_ANNOTATION_STROKE_WIDTH,
  POOL_DIAGRAM_SCHEMA_VERSION,
  type PoolBallDragState,
  type PoolDiagramBallOnTable,
  type PoolDiagramDocument,
  type PoolDiagramElement,
  type PoolDiagramTableColors,
  type PoolEditorTool,
  isLineLike,
  isRectElement,
  isTextElement,
  newPoolBallInstanceId,
  newPoolDiagramDocumentId,
  newPoolDiagramElementId,
} from '../models/pool-diagram.model';
import { parsePoolDiagramJson } from '../models/pool-diagram.serialization';
import { POOL_BALL_IDS } from '../pool-ball-appearance';
import { DEFAULT_TABLE_COLOR_CONFIG } from '../pool-table.constants';
import { clampBallCenterToPlayfield } from '../pool-table.geometry';
import { clientToSvgPoint } from '../utils/pool-svg-coords';

/**
 * Editor state for the pool diagram.
 * This replaces the former Angular DI service with a plain class.
 */
const RACK_SLOT_COUNT = 16;
const STORAGE_KEY = 'pool-diagram-document';
const LEGACY_STORAGE_KEY = 'pool-diagram-layout';

/** Duplicate offset (SVG units) to place the copy next to the original. */
const DUPLICATE_BALL_OFFSET_SVG = { dx: 52, dy: 36 };

const DEFAULT_TABLE_COLORS: PoolDiagramTableColors = {
  ...DEFAULT_TABLE_COLOR_CONFIG,
};

function initialRackSlots(): (number | null)[] {
  return Array.from({ length: RACK_SLOT_COUNT }, (_, i) => i);
}

/** One ball per `ballId` on the rack when there is no copy of that number on the felt. */
function buildRackSlotsFromTableInstances(instances: PoolDiagramBallOnTable[]): (number | null)[] {
  const countOnTable = new Map<number, number>();
  for (const inst of instances) {
    countOnTable.set(inst.ballId, (countOnTable.get(inst.ballId) ?? 0) + 1);
  }
  const slots: (number | null)[] = Array(RACK_SLOT_COUNT).fill(null);
  let s = 0;
  for (const ballId of POOL_BALL_IDS) {
    if ((countOnTable.get(ballId) ?? 0) === 0 && s < RACK_SLOT_COUNT) {
      slots[s++] = ballId;
    }
  }
  return slots;
}

function removeBallFromRackSlots(slots: (number | null)[], ballId: number): (number | null)[] {
  const next = [...slots];
  const i = next.indexOf(ballId);
  if (i >= 0) {
    next[i] = null;
  }
  return next;
}

function addBallToRackSlots(slots: (number | null)[], ballId: number): (number | null)[] {
  const next = [...slots];
  const i = next.indexOf(null);
  if (i >= 0) {
    next[i] = ballId;
  }
  return next;
}

function elementCenterClient(el: HTMLElement): { x: number; y: number } {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

function isClientInsideSvg(svg: SVGSVGElement, clientX: number, clientY: number): boolean {
  const b = svg.getBoundingClientRect();
  return clientX >= b.left && clientX <= b.right && clientY >= b.top && clientY <= b.bottom;
}

export class PoolDiagramEditorState {
  private readonly tableSvg = signal<SVGSVGElement | null>(null);

  private readonly rackSlotsState = signal<(number | null)[]>(initialRackSlots());

  private readonly tableInstances = signal<PoolDiagramBallOnTable[]>([]);

  readonly elements = signal<PoolDiagramElement[]>([]);

  readonly selectedAnnotationId = signal<string | null>(null);

  readonly selectedTableBallInstanceId = signal<string | null>(null);

  readonly editorTool = signal<PoolEditorTool>('select');

  readonly strokeColor = signal('#000000');

  /** Stroke width for **new** strokes / rectangle borders (SVG px). */
  readonly annotationStrokeWidth = signal(DEFAULT_ANNOTATION_STROKE_WIDTH);

  readonly rectFilled = signal(false);
  readonly textDraft = signal('Text');
  readonly textFontSize = signal(26);
  readonly textFontFamily = signal('Inter, system-ui, sans-serif');

  readonly drag = signal<PoolBallDragState | null>(null);

  /** Zone guides on the table (exported in JSON + restored in viewer). */
  readonly showZonesOverlay = signal(true);

  readonly tableColors = signal<PoolDiagramTableColors>({ ...DEFAULT_TABLE_COLORS });

  /** Diagram name (field `diagramName` in exported JSON). */
  readonly diagramName = signal('');

  /** Diagram id (`id` in JSON). */
  readonly diagramId = signal(newPoolDiagramDocumentId());

  /** Creator (`creatorId` in JSON). */
  readonly creatorId = signal('');

  readonly rackSlots = computed(() => this.rackSlotsState());
  readonly tableBalls = computed(() => this.tableInstances());

  registerTableSvg(svg: SVGSVGElement | null): void {
    this.tableSvg.set(svg);
  }

  exportDocument(): PoolDiagramDocument {
    return {
      schemaVersion: POOL_DIAGRAM_SCHEMA_VERSION,
      id: this.diagramId(),
      creatorId: this.creatorId().trim(),
      diagramName: this.diagramName().trim(),
      ballsOnTable: [...this.tableInstances()],
      elements: [...this.elements()],
      showZonesOverlay: this.showZonesOverlay(),
      tableColors: { ...this.tableColors() },
    };
  }

  applyDocument(doc: PoolDiagramDocument): void {
    const balls = [...doc.ballsOnTable];
    this.tableInstances.set(balls);
    this.rackSlotsState.set(buildRackSlotsFromTableInstances(balls));
    this.elements.set([...doc.elements]);
    this.showZonesOverlay.set(doc.showZonesOverlay ?? false);
    this.tableColors.set({ ...(doc.tableColors ?? DEFAULT_TABLE_COLORS) });
    this.diagramName.set(typeof doc.diagramName === 'string' ? doc.diagramName.trim() : '');

    const id =
      typeof doc.id === 'string' && doc.id.trim().length > 0 ? doc.id.trim() : newPoolDiagramDocumentId();
    this.diagramId.set(id);
    this.creatorId.set(typeof doc.creatorId === 'string' ? doc.creatorId.trim() : '');
    this.selectedAnnotationId.set(null);
    this.selectedTableBallInstanceId.set(null);
  }

  /** Start a new diagram: new `id`, optional creator. */
  resetDocumentIdentity(creatorId = ''): void {
    this.diagramId.set(newPoolDiagramDocumentId());
    this.creatorId.set(creatorId.trim());
  }

  saveToLocalStorage(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.exportDocument()));
  }

  loadFromLocalStorage(): boolean {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) {
      return false;
    }
    try {
      const doc = parsePoolDiagramJson(JSON.parse(raw) as unknown);
      this.applyDocument(doc);
      return true;
    } catch {
      return false;
    }
  }

  clearTableToRack(): void {
    this.tableInstances.set([]);
    this.rackSlotsState.set(initialRackSlots());
    this.selectedTableBallInstanceId.set(null);
  }

  clearAnnotations(): void {
    this.elements.set([]);
    this.selectedAnnotationId.set(null);
  }

  addElement(el: PoolDiagramElement): void {
    this.elements.update((list) => [...list, el]);
  }

  removeElement(id: string): void {
    this.elements.update((list) => list.filter((e) => e.id !== id));
    this.selectedAnnotationId.update((s) => (s === id ? null : s));
  }

  translateElement(id: string, dx: number, dy: number): void {
    this.elements.update((list) =>
      list.map((e) => {
        if (e.id !== id) {
          return e;
        }
        if (isLineLike(e)) {
          return { ...e, x1: e.x1 + dx, y1: e.y1 + dy, x2: e.x2 + dx, y2: e.y2 + dy };
        }
        if (isRectElement(e)) {
          return { ...e, x: e.x + dx, y: e.y + dy };
        }
        if (isTextElement(e)) {
          return { ...e, x: e.x + dx, y: e.y + dy };
        }
        return e;
      }),
    );
  }

  moveElementLayerForward(id: string): void {
    this.elements.update((list) => {
      const i = list.findIndex((e) => e.id === id);
      if (i < 0 || i >= list.length - 1) {
        return list;
      }
      const next = [...list];
      [next[i], next[i + 1]] = [next[i + 1], next[i]];
      return next;
    });
  }

  moveElementLayerBackward(id: string): void {
    this.elements.update((list) => {
      const i = list.findIndex((e) => e.id === id);
      if (i <= 0) {
        return list;
      }
      const next = [...list];
      [next[i - 1], next[i]] = [next[i], next[i - 1]];
      return next;
    });
  }

  moveElementToFront(id: string): void {
    this.elements.update((list) => {
      const i = list.findIndex((e) => e.id === id);
      if (i < 0 || i === list.length - 1) {
        return list;
      }
      const next = [...list];
      const [el] = next.splice(i, 1);
      next.push(el);
      return next;
    });
  }

  moveElementToBack(id: string): void {
    this.elements.update((list) => {
      const i = list.findIndex((e) => e.id === id);
      if (i <= 0) {
        return list;
      }
      const next = [...list];
      const [el] = next.splice(i, 1);
      next.unshift(el);
      return next;
    });
  }

  selectAnnotation(id: string | null): void {
    this.selectedAnnotationId.set(id);
    if (id) {
      this.selectedTableBallInstanceId.set(null);
    }
  }

  selectTableBallInstance(id: string | null): void {
    this.selectedTableBallInstanceId.set(id);
    if (id) {
      this.selectedAnnotationId.set(null);
    }
  }

  /** Opacity 0–1 on the selected shape or ball (100% when >= 1 -> the opacity property is removed). */
  applyOpacityToSelection(opacity: number): void {
    const o = Math.max(0, Math.min(1, opacity));
    const annId = this.selectedAnnotationId();
    if (annId) {
      this.elements.update((list) =>
        list.map((e) => {
          if (e.id !== annId) {
            return e;
          }
          if (o >= 1) {
            return this.stripElementOpacity(e);
          }
          return { ...e, opacity: o };
        }),
      );
      return;
    }

    const ballInstId = this.selectedTableBallInstanceId();
    if (ballInstId) {
      this.tableInstances.update((list) =>
        list.map((b) => {
          if (b.id !== ballInstId) {
            return b;
          }
          if (o >= 1) {
            const { opacity: _op, ...rest } = b;
            return rest;
          }
          return { ...b, opacity: o };
        }),
      );
    }
  }

  removeTableBallInstance(id: string): void {
    this.tableInstances.update((list) => list.filter((b) => b.id !== id));
    this.rackSlotsState.set(buildRackSlotsFromTableInstances(this.tableInstances()));
    this.selectedTableBallInstanceId.update((s) => (s === id ? null : s));
  }

  duplicateSelectedTableBall(): void {
    const sid = this.selectedTableBallInstanceId();
    if (!sid) {
      return;
    }
    const inst = this.tableInstances().find((b) => b.id === sid);
    if (!inst) {
      return;
    }

    const c = clampBallCenterToPlayfield(inst.x + DUPLICATE_BALL_OFFSET_SVG.dx, inst.y + DUPLICATE_BALL_OFFSET_SVG.dy);
    const copy: PoolDiagramBallOnTable = {
      ...inst,
      id: newPoolBallInstanceId(),
      x: c.x,
      y: c.y,
    };
    this.tableInstances.update((list) => [...list, copy]);
    this.rackSlotsState.set(buildRackSlotsFromTableInstances([...this.tableInstances()]));
    this.selectedTableBallInstanceId.set(copy.id);
  }

  /**
   * Begin a drag operation:
   * the ball is removed from rack / felt, and the ghost follows the pointer.
   */
  beginDrag(
    ballId: number,
    tableInstanceId: string | null,
    event: PointerEvent,
    hostElement: HTMLElement,
    ghostSizePx: number,
  ): void {
    if (event.button !== 0 || this.drag() !== null) {
      return;
    }
    event.preventDefault();
    const center = elementCenterClient(hostElement);

    this.drag.set({
      ballId,
      tableInstanceId,
      grabOffsetClientX: event.clientX - center.x,
      grabOffsetClientY: event.clientY - center.y,
      clientX: event.clientX,
      clientY: event.clientY,
      ghostSizePx,
      pointerId: event.pointerId,
      dragHost: hostElement,
    });

    window.addEventListener('pointermove', this.onWindowPointerMove);
    window.addEventListener('pointerup', this.onWindowPointerUp, { capture: true });
    window.addEventListener('pointercancel', this.onWindowPointerUp, { capture: true });
    try {
      hostElement.setPointerCapture(event.pointerId);
    } catch {
      /* setPointerCapture may fail if the element left the DOM */
    }

    if (tableInstanceId) {
      this.tableInstances.update((list) => list.filter((b) => b.id !== tableInstanceId));
    } else {
      this.rackSlotsState.update((slots) => removeBallFromRackSlots(slots, ballId));
    }
  }

  private readonly onWindowPointerMove = (e: PointerEvent): void => {
    const d = this.drag();
    if (!d || e.pointerId !== d.pointerId) {
      return;
    }
    this.drag.set({ ...d, clientX: e.clientX, clientY: e.clientY });
  };

  private readonly onWindowPointerUp = (e: PointerEvent): void => {
    const d = this.drag();
    if (!d) {
      this.stopListeningWindowPointer();
      return;
    }
    if (e.pointerId !== d.pointerId) {
      return;
    }
    this.stopListeningWindowPointer();
    this.releaseDragHostPointerCapture(d);
    this.drag.set(null);

    const svg = this.tableSvg();
    if (svg && isClientInsideSvg(svg, e.clientX, e.clientY)) {
      this.dropBallOnTable(d, svg, e);
    } else {
      this.dropBallOnRack(d);
    }
  };

  private releaseDragHostPointerCapture(d: PoolBallDragState): void {
    const el = d.dragHost;
    if (!el) {
      return;
    }
    try {
      el.releasePointerCapture(d.pointerId);
    } catch {
      /* element already removed or pointer capture already released */
    }
  }

  private stopListeningWindowPointer(): void {
    window.removeEventListener('pointermove', this.onWindowPointerMove);
    window.removeEventListener('pointerup', this.onWindowPointerUp, { capture: true });
    window.removeEventListener('pointercancel', this.onWindowPointerUp, { capture: true });
  }

  /** Cleanup when the host component is destroyed (avoids leaving global listeners behind). */
  teardownDrag(): void {
    this.stopListeningWindowPointer();
    this.drag.set(null);
  }

  private dropBallOnTable(d: PoolBallDragState, svg: SVGSVGElement, e: PointerEvent): void {
    const cx = e.clientX - d.grabOffsetClientX;
    const cy = e.clientY - d.grabOffsetClientY;
    const svgPt = clientToSvgPoint(svg, cx, cy);
    const clamped = clampBallCenterToPlayfield(svgPt.x, svgPt.y);
    const id = d.tableInstanceId ?? newPoolBallInstanceId();
    this.tableInstances.update((list) => [...list, { id, ballId: d.ballId, x: clamped.x, y: clamped.y }]);
    this.rackSlotsState.set(buildRackSlotsFromTableInstances(this.tableInstances()));
    // Keep the selection useful after a tiny move / a drop from the rack.
    this.selectTableBallInstance(id);
    this.selectAnnotation(null);
  }

  private dropBallOnRack(d: PoolBallDragState): void {
    this.rackSlotsState.update((slots) => addBallToRackSlots(slots, d.ballId));
    if (d.tableInstanceId && this.selectedTableBallInstanceId() === d.tableInstanceId) {
      this.selectTableBallInstance(null);
    }
  }

  createLineElement(kind: 'arrow' | 'segment' | 'dashed', x1: number, y1: number, x2: number, y2: number): PoolDiagramElement {
    const color = this.strokeColor();
    const sw = this.annotationStrokeWidth();
    const base = { id: newPoolDiagramElementId(), color, strokeWidth: sw, x1, y1, x2, y2 };
    if (kind === 'arrow') return { type: 'arrow', ...base };
    if (kind === 'segment') return { type: 'segment', ...base };
    return { type: 'dashed', ...base };
  }

  createRectElement(x: number, y: number, width: number, height: number): PoolDiagramElement {
    const x0 = Math.min(x, x + width);
    const y0 = Math.min(y, y + height);
    const w = Math.abs(width);
    const h = Math.abs(height);
    return {
      type: 'rect',
      id: newPoolDiagramElementId(),
      color: this.strokeColor(),
      strokeWidth: this.annotationStrokeWidth(),
      x: x0,
      y: y0,
      width: w,
      height: h,
      filled: this.rectFilled(),
    };
  }

  createTextElement(x: number, y: number): PoolDiagramElement {
    const txt = this.textDraft().trim();
    return {
      type: 'text',
      id: newPoolDiagramElementId(),
      color: this.strokeColor(),
      x,
      y,
      text: txt.length > 0 ? txt : 'Text',
      fontSize: this.textFontSize(),
      fontFamily: this.textFontFamily(),
    };
  }

  private stripElementOpacity(el: PoolDiagramElement): PoolDiagramElement {
    const c = { ...el } as PoolDiagramElement & { opacity?: number };
    delete c.opacity;
    return c;
  }
}

