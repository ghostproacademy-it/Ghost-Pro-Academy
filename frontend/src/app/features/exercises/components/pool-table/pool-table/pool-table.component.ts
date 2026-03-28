import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  NgZone,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { buildPoolTableScene } from '../../../pool-table.geometry';
import { POOL_TABLE_ZONES } from '../../../scene/pool-table-zones-overlay';
import {
  BALL_RAD,
  POOL_TABLE_BALL_REFERENCE_SVG_WIDTH_PX,
  TABLE_CORNER_RADIUS,
  poolBallDiameterPxForTableSvgWidth,
  poolBallScaleInTableSvg,
} from '../../../pool-table.constants';
import {
  DEFAULT_ELEMENT_OPACITY,
  MAX_ANNOTATION_STROKE_WIDTH,
  MIN_ANNOTATION_STROKE_WIDTH,
  type PoolDiagramBallOnTable,
  type PoolDiagramDocument,
  type PoolEditorTool,
} from '../../../models/pool-diagram.model';
import { emptyDocument, parsePoolDiagramJson } from '../../../models/pool-diagram.serialization';
import { PoolBallGraphicComponent } from '../../pool-ball-graphic/pool-ball-graphic.component';
import { PoolBallDragDirective, type PoolBallDragBeginRequest } from '../../../directives/pool-ball-drag.directive';
import { PoolDiagramElementsComponent } from '../../pool-diagram-elements/pool-diagram-elements.component';
import { PoolDiagramEditorState } from '../../../state/pool-diagram-editor-state';
import { PoolTableToolsComponent } from '../pool-table-tools/pool-table-tools.component';
import { hitTestTopAnnotation } from '../../../utils/pool-diagram-annotation-hit';
import { clientToSvgPoint, svgPxPerUnitWidth } from '../../../utils/pool-svg-coords';

const RACK_SLOT_COUNT = 16;
const RACK_SLOT_INDEXES = Array.from({ length: RACK_SLOT_COUNT }, (_, i) => i);

const EDITOR_TOOL_OPTIONS: { id: PoolEditorTool; label: string }[] = [
  { id: 'select', label: 'Select' },
  { id: 'arrow', label: 'Arrow' },
  { id: 'segment', label: 'Line' },
  { id: 'dashed', label: 'Dashed' },
  { id: 'rect', label: 'Rectangle' },
  { id: 'text', label: 'Text' },
];

/** Click tolerance on annotations (~18px on screen), converted to SVG units. */
const ANNOTATION_HIT_TOLERANCE_CSS_PX = 18;
/** Second click too close to the first one → cancel the current line draft. */
const LINE_TOOL_CANCEL_DISTANCE_SVG = 6;
/** Rectangle too small → ignored when the drag ends. */
const RECT_MIN_DRAW_SIZE_SVG = 8;
const TEXT_FONT_SIZE_MIN = 10;
const TEXT_FONT_SIZE_MAX = 96;
const TEXT_FONT_OPTIONS = [
  { label: 'Inter', value: 'Inter, system-ui, sans-serif' },
  { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Georgia', value: 'Georgia, "Times New Roman", serif' },
  { label: 'Trebuchet MS', value: '"Trebuchet MS", Verdana, sans-serif' },
  { label: 'Courier New', value: '"Courier New", Courier, monospace' },
] as const;

type LineDraft = { x1: number; y1: number };
type RectDraft = { x: number; y: number };
type AnnotationDrag = { id: string; lastX: number; lastY: number };

/**
 * SVG table + toolbar: balls and annotations.
 * Clicks happen on the felt here; ball drag is handled via `PoolBallDragDirective` + `PoolDiagramStateService`.
 */
@Component({
  selector: 'app-pool-table',
  standalone: true,
  imports: [PoolBallGraphicComponent, PoolBallDragDirective, PoolDiagramElementsComponent, PoolTableToolsComponent],
  templateUrl: './pool-table.component.html',
  styleUrl: './pool-table.component.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PoolTableComponent implements AfterViewInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly zone = inject(NgZone);

  protected readonly state = new PoolDiagramEditorState();
  protected readonly scene = buildPoolTableScene();

  /** Diamond guides + black spot point (avoids the `zones` name in templates; conflicts with Zone.js). */
  protected readonly poolZones = POOL_TABLE_ZONES;

  /** Read-only mode: no rack, no ball dragging, no editable annotations. */
  readonly editable = input(true);

  /** Toolbar actions (save, tools) — disable when embedding in read-only mode. */
  readonly showToolbar = input(true);

  /** Document to display (takes priority over current state on load / change). */
  readonly document = input<PoolDiagramDocument | null>(null);

  /**
   * Default creator if the imported document has no `creatorId` (auth / host account).
   */
  readonly creatorId = input<string>('');

  /** If no `[document]` is provided, restore state from `localStorage` on mount. */
  readonly autoRestoreFromLocalStorage = input(false);

  /** After “Save configuration”, also store into `localStorage` (same key as auto restore). */
  readonly persistToLocalStorageOnSave = input(false);

  /** Emitted on every “Save configuration”, with the current exported document. */
  readonly configurationSaved = output<PoolDiagramDocument>();

  private readonly tableSvgRef = viewChild.required<ElementRef<SVGSVGElement>>('tableSvg');

  private readonly tableSvgWidthPx = signal(POOL_TABLE_BALL_REFERENCE_SVG_WIDTH_PX);

  protected readonly ballDiameterPx = computed(() =>
    poolBallDiameterPxForTableSvgWidth(this.tableSvgWidthPx()),
  );

  protected readonly ballScaleOnTable = poolBallScaleInTableSvg();
  protected readonly tableCornerRadius = TABLE_CORNER_RADIUS;
  protected readonly ballOnlyViewBox = ballClipViewBoxString(BALL_RAD);
  protected readonly rackSlotIndexes = RACK_SLOT_INDEXES;

  protected readonly editorToolOptions = EDITOR_TOOL_OPTIONS;
  protected readonly annotationStrokeMin = MIN_ANNOTATION_STROKE_WIDTH;
  protected readonly annotationStrokeMax = MAX_ANNOTATION_STROKE_WIDTH;
  protected readonly textFontSizeMin = TEXT_FONT_SIZE_MIN;
  protected readonly textFontSizeMax = TEXT_FONT_SIZE_MAX;
  protected readonly textFontOptions = TEXT_FONT_OPTIONS;

  protected readonly hasOpacitySelection = computed(
    () =>
      this.state.selectedAnnotationId() !== null || this.state.selectedTableBallInstanceId() !== null,
  );

  protected readonly selectionOpacityPercent = computed(() => {
    const ann = this.state.selectedAnnotationId();
    if (ann) {
      const e = this.state.elements().find((x) => x.id === ann);
      const u = e?.opacity ?? DEFAULT_ELEMENT_OPACITY;
      return Math.round(Math.max(0, Math.min(1, u)) * 100);
    }
    const bid = this.state.selectedTableBallInstanceId();
    if (bid) {
      const b = this.state.tableBalls().find((x) => x.id === bid);
      const u = b?.opacity ?? DEFAULT_ELEMENT_OPACITY;
      return Math.round(Math.max(0, Math.min(1, u)) * 100);
    }
    return 100;
  });

  protected readonly isJsonPasteDialogOpen = signal(false);
  protected readonly jsonPasteDraft = signal('');
  protected readonly isTableConfigDialogOpen = signal(false);

  protected readonly lineDraft = signal<LineDraft | null>(null);
  protected readonly linePreviewEnd = signal<{ x: number; y: number } | null>(null);
  protected readonly rectPreview = signal<{ x: number; y: number; w: number; h: number } | null>(null);

  private readonly annotationDrag = signal<AnnotationDrag | null>(null);
  private rectAnchor: RectDraft | null = null;

  /** Avoid re-applying the same JSON (new object references would be different). */
  private lastAppliedDocumentJson = '';

  constructor() {
    effect(() => {
      const doc = this.document();
      if (!doc) {
        return;
      }
      const json = JSON.stringify(doc);
      if (json === this.lastAppliedDocumentJson) {
        return;
      }
      this.lastAppliedDocumentJson = json;
      this.state.applyDocument(doc);
    });

    effect(() => {
      const fromHost = this.creatorId().trim();
      if (fromHost && !this.state.creatorId().trim()) {
        this.state.creatorId.set(fromHost);
      }
    });

    // Tool change: clear selections and drafts to avoid an inconsistent on-screen state.
    effect(() => {
      this.state.editorTool();
      this.state.selectTableBallInstance(null);
      this.state.selectAnnotation(null);
      this.lineDraft.set(null);
      this.linePreviewEnd.set(null);
      this.rectPreview.set(null);
    });
  }

  protected ballGroupOnTable(x: number, y: number): string {
    return `translate(${x},${y}) scale(${this.ballScaleOnTable})`;
  }

  protected ballTableOpacity(b: PoolDiagramBallOnTable): number {
    const u = b.opacity ?? DEFAULT_ELEMENT_OPACITY;
    return Math.max(0, Math.min(1, u));
  }

  protected onSelectionOpacityPercentInput(percent: number): void {
    this.state.applyOpacityToSelection(percent / 100);
  }

  ngAfterViewInit(): void {
    const svg = this.tableSvgRef().nativeElement;
    this.state.registerTableSvg(svg);

    // SVG CSS width -> ball diameter on screen (see `poolBallDiameterPxForTableSvgWidth`).
    const ro = new ResizeObserver(() => {
      this.zone.run(() => this.refreshTableSvgWidth());
    });
    ro.observe(svg);
    this.refreshTableSvgWidth();

    if (this.autoRestoreFromLocalStorage() && !this.document()) {
      this.state.loadFromLocalStorage();
    }

    this.destroyRef.onDestroy(() => {
      ro.disconnect();
      this.state.registerTableSvg(null);
      this.state.teardownDrag();
      this.teardownAnnotationDrag();
      this.teardownRectDraw();
    });
  }

  private refreshTableSvgWidth(): void {
    const el = this.tableSvgRef()?.nativeElement;
    if (!el) {
      return;
    }
    const w = el.getBoundingClientRect().width;
    if (w >= 1) {
      this.tableSvgWidthPx.set(w);
    }
  }

  protected onPoolBallDragBegin(req: PoolBallDragBeginRequest): void {
    this.state.beginDrag(req.ballId, req.tableInstanceId, req.event, req.hostElement, req.ghostSizePx);
  }

  protected setTool(t: PoolEditorTool): void {
    this.state.editorTool.set(t);
  }

  protected onTablePointerDown(ev: PointerEvent): void {
    if (!this.editable() || ev.button !== 0) {
      return;
    }
    const svg = this.tableSvgRef()?.nativeElement;
    if (!svg) {
      return;
    }
    const t = ev.target as Element | null;
    if (t?.closest('[data-pool-ball]')) {
      return;
    }

    const tool = this.state.editorTool();
    const pt = clientToSvgPoint(svg, ev.clientX, ev.clientY);

    if (tool === 'select') {
      const th = ANNOTATION_HIT_TOLERANCE_CSS_PX / svgPxPerUnitWidth(svg);
      const hit = hitTestTopAnnotation(pt.x, pt.y, this.state.elements(), th);
      if (hit) {
        this.state.selectAnnotation(hit.id);
        this.startAnnotationDrag(hit.id, pt);
      } else {
        this.state.selectAnnotation(null);
        this.state.selectTableBallInstance(null);
      }
      ev.preventDefault();
      return;
    }

    if (tool === 'rect') {
      this.rectAnchor = { x: pt.x, y: pt.y };
      this.rectPreview.set({ x: pt.x, y: pt.y, w: 0, h: 0 });
      window.addEventListener('pointermove', this.onRectPointerMove);
      window.addEventListener('pointerup', this.onRectPointerUp, { capture: true });
      window.addEventListener('pointercancel', this.onRectPointerUp, { capture: true });
      ev.preventDefault();
      return;
    }

    if (tool === 'text') {
      this.state.addElement(this.state.createTextElement(pt.x, pt.y));
      ev.preventDefault();
      return;
    }

    const draft = this.lineDraft();
    if (!draft) {
      this.lineDraft.set({ x1: pt.x, y1: pt.y });
      this.linePreviewEnd.set(pt);
      ev.preventDefault();
      return;
    }

    const d = Math.hypot(pt.x - draft.x1, pt.y - draft.y1);
    if (d < LINE_TOOL_CANCEL_DISTANCE_SVG) {
      this.lineDraft.set(null);
      this.linePreviewEnd.set(null);
      ev.preventDefault();
      return;
    }

    const kind = tool === 'arrow' ? 'arrow' : tool === 'dashed' ? 'dashed' : 'segment';
    this.state.addElement(this.state.createLineElement(kind, draft.x1, draft.y1, pt.x, pt.y));
    this.lineDraft.set(null);
    this.linePreviewEnd.set(null);
    ev.preventDefault();
  }

  protected onSvgPointerMove(ev: PointerEvent): void {
    if (!this.editable()) {
      this.linePreviewEnd.set(null);
      return;
    }
    const draft = this.lineDraft();
    const tool = this.state.editorTool();
    if (!draft || tool === 'select' || tool === 'rect') {
      this.linePreviewEnd.set(null);
      return;
    }
    const svg = this.tableSvgRef()?.nativeElement;
    if (!svg) {
      return;
    }
    this.linePreviewEnd.set(clientToSvgPoint(svg, ev.clientX, ev.clientY));
  }

  protected onSvgPointerLeave(): void {
    this.linePreviewEnd.set(null);
  }

  private startAnnotationDrag(id: string, pt: { x: number; y: number }): void {
    this.teardownAnnotationDrag();
    this.annotationDrag.set({ id, lastX: pt.x, lastY: pt.y });
    window.addEventListener('pointermove', this.onAnnotationPointerMove);
    window.addEventListener('pointerup', this.onAnnotationPointerUp, { capture: true });
    window.addEventListener('pointercancel', this.onAnnotationPointerUp, { capture: true });
  }

  /** Window handlers may run outside the Angular zone -> wrap with NgZone.run to update the UI. */
  private readonly onAnnotationPointerMove = (e: PointerEvent): void => {
    const d = this.annotationDrag();
    const svg = this.tableSvgRef()?.nativeElement;
    if (!d || !svg) {
      return;
    }
    this.zone.run(() => {
      const pt = clientToSvgPoint(svg, e.clientX, e.clientY);
      const dx = pt.x - d.lastX;
      const dy = pt.y - d.lastY;
      this.state.translateElement(d.id, dx, dy);
      this.annotationDrag.set({ ...d, lastX: pt.x, lastY: pt.y });
    });
  };

  private readonly onAnnotationPointerUp = (): void => {
    this.zone.run(() => this.teardownAnnotationDrag());
  };

  private teardownAnnotationDrag(): void {
    window.removeEventListener('pointermove', this.onAnnotationPointerMove);
    window.removeEventListener('pointerup', this.onAnnotationPointerUp, { capture: true });
    window.removeEventListener('pointercancel', this.onAnnotationPointerUp, { capture: true });
    this.annotationDrag.set(null);
  }

  /** Same pattern as `onAnnotationPointerMove`: `window` listener -> `NgZone.run`. */
  private readonly onRectPointerMove = (e: PointerEvent): void => {
    const anchor = this.rectAnchor;
    const svg = this.tableSvgRef()?.nativeElement;
    if (!anchor || !svg) {
      return;
    }
    this.zone.run(() => {
      const pt = clientToSvgPoint(svg, e.clientX, e.clientY);
      const x = Math.min(anchor.x, pt.x);
      const y = Math.min(anchor.y, pt.y);
      const w = Math.abs(pt.x - anchor.x);
      const h = Math.abs(pt.y - anchor.y);
      this.rectPreview.set({ x, y, w, h });
    });
  };

  private readonly onRectPointerUp = (): void => {
    this.zone.run(() => {
      const pr = this.rectPreview();
      this.teardownRectDraw();
      if (pr && pr.w > RECT_MIN_DRAW_SIZE_SVG && pr.h > RECT_MIN_DRAW_SIZE_SVG) {
        this.state.addElement(this.state.createRectElement(pr.x, pr.y, pr.w, pr.h));
      }
      this.rectPreview.set(null);
      this.rectAnchor = null;
    });
  };

  private teardownRectDraw(): void {
    window.removeEventListener('pointermove', this.onRectPointerMove);
    window.removeEventListener('pointerup', this.onRectPointerUp, { capture: true });
    window.removeEventListener('pointercancel', this.onRectPointerUp, { capture: true });
  }

  @HostListener('document:keydown', ['$event'])
  protected onKey(ev: KeyboardEvent): void {
    if (!this.editable()) {
      return;
    }
    if (ev.key !== 'Delete' && ev.key !== 'Backspace') {
      return;
    }
    const ann = this.state.selectedAnnotationId();
    if (ann) {
      ev.preventDefault();
      this.state.removeElement(ann);
      return;
    }
    const ballInst = this.state.selectedTableBallInstanceId();
    if (ballInst) {
      ev.preventDefault();
      this.state.removeTableBallInstance(ballInst);
    }
  }

  protected openJsonImportPicker(fileInput: HTMLInputElement): void {
    fileInput.value = '';
    fileInput.click();
  }

  protected async onImportJsonSelected(ev: Event): Promise<void> {
    const input = ev.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) {
      return;
    }
    try {
      const txt = await file.text();
      const parsed = parsePoolDiagramJson(JSON.parse(txt) as unknown);
      this.state.applyDocument(parsed);
    } catch {
      window.alert('Invalid configuration file.');
    } finally {
      if (input) {
        input.value = '';
      }
    }
  }

  /** Opens a simple JSON paste dialog, prefilled with the current diagram. */
  protected openPasteJsonDialog(): void {
    this.jsonPasteDraft.set(JSON.stringify(this.state.exportDocument(), null, 2));
    this.isJsonPasteDialogOpen.set(true);
  }

  protected closePasteJsonDialog(): void {
    this.isJsonPasteDialogOpen.set(false);
  }

  protected onJsonPasteDraftChange(value: string): void {
    this.jsonPasteDraft.set(value);
  }

  /** Parses and imports the JSON from the dialog, then keeps editing enabled. */
  protected importJsonFromDialog(): void {
    try {
      const parsed = parsePoolDiagramJson(JSON.parse(this.jsonPasteDraft()) as unknown);
      this.state.applyDocument(parsed);
      this.closePasteJsonDialog();
    } catch {
      window.alert('Invalid configuration.');
    }
  }

  protected openTableConfigDialog(): void {
    this.isTableConfigDialogOpen.set(true);
  }

  protected closeTableConfigDialog(): void {
    this.isTableConfigDialogOpen.set(false);
  }

  protected updateTableColor(
    key: 'frame' | 'diamond' | 'cloth' | 'cushion' | 'zones',
    value: string,
  ): void {
    this.state.tableColors.update((colors) => ({ ...colors, [key]: value }));
  }

  /** Safe file base name (no path separators; `.json` stripped if typed). */
  private sanitizeConfigDownloadBaseName(raw: string): string {
    let s = raw.trim();
    if (!s) {
      return '';
    }
    if (s.toLowerCase().endsWith('.json')) {
      s = s.slice(0, -5).trim();
    }
    s = s.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-');
    s = s.replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
    if (s.length > 120) {
      s = s.slice(0, 120);
    }
    return s;
  }

  /** Logical save: emit, optional localStorage persistence, console log (no file download). */
  protected saveConfiguration(): void {
    const doc = this.state.exportDocument();
    this.configurationSaved.emit(doc);
    if (this.persistToLocalStorageOnSave()) {
      this.state.saveToLocalStorage();
    }
    console.log('Pool diagram configuration (save):', doc);
  }

  /** Download the current JSON (filename based on diagram name). */
  protected exportConfigurationToFile(): void {
    const doc = this.state.exportDocument();
    const json = JSON.stringify(doc, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const base =
      this.sanitizeConfigDownloadBaseName(this.state.diagramName()) || 'pool-diagram';
    a.href = url;
    a.download = `${base}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  protected clearDiagram(): void {
    this.state.clearTableToRack();
  }

  /**
   * New diagram: new id, balls moved to rack, empty annotations; reapplies `[creatorId]` if provided.
   * Disabled when `[document]` is provided (the parent must reset the document object).
   */
  protected startNewDiagram(): void {
    if (this.document()) {
      return;
    }
    this.state.applyDocument(emptyDocument());
    const host = this.creatorId().trim();
    if (host) {
      this.state.creatorId.set(host);
    }
    this.lastAppliedDocumentJson = '';
  }

  protected clearAnnotations(): void {
    this.state.clearAnnotations();
  }

  protected deleteSelectedAnnotation(): void {
    const id = this.state.selectedAnnotationId();
    if (id) {
      this.state.removeElement(id);
    }
  }

  protected duplicateSelectedBall(): void {
    this.state.duplicateSelectedTableBall();
  }

  protected moveSelectedAnnotationForward(): void {
    const id = this.state.selectedAnnotationId();
    if (id) {
      this.state.moveElementLayerForward(id);
    }
  }

  protected moveSelectedAnnotationBackward(): void {
    const id = this.state.selectedAnnotationId();
    if (id) {
      this.state.moveElementLayerBackward(id);
    }
  }

  protected moveSelectedAnnotationToFront(): void {
    const id = this.state.selectedAnnotationId();
    if (id) {
      this.state.moveElementToFront(id);
    }
  }

  protected moveSelectedAnnotationToBack(): void {
    const id = this.state.selectedAnnotationId();
    if (id) {
      this.state.moveElementToBack(id);
    }
  }

  /** Remove the selected table instance (including duplicates); the ball goes back to the rack if there are no remaining copies. */
  protected removeSelectedTableBall(): void {
    const id = this.state.selectedTableBallInstanceId();
    if (id) {
      this.state.removeTableBallInstance(id);
    }
  }

  protected copyDocumentJson(): void {
    const json = JSON.stringify(this.state.exportDocument(), null, 2);
    void navigator.clipboard.writeText(json).catch(() => {
      window.prompt('Copy configuration:', json);
    });
  }

  /** Programmatic API: current diagram state. */
  getDiagram(): PoolDiagramDocument {
    return this.state.exportDocument();
  }

  setDiagram(doc: PoolDiagramDocument): void {
    this.state.applyDocument(doc);
  }

  public onTableColorChange(req: { key: 'frame' | 'diamond' | 'cloth' | 'cushion' | 'zones'; value: string }): void {
    this.state.tableColors.update((c) => ({ ...c, [req.key]: req.value }));
  }

  // Tools outputs (commands) -> forward to the existing editor methods.
  public startNewDiagramFromTools(): void {
    this.startNewDiagram();
  }

  public deleteSelectedAnnotationFromTools(): void {
    this.deleteSelectedAnnotation();
  }

  public moveSelectedAnnotationBackwardFromTools(): void {
    this.moveSelectedAnnotationBackward();
  }

  public moveSelectedAnnotationForwardFromTools(): void {
    this.moveSelectedAnnotationForward();
  }

  public moveSelectedAnnotationToBackFromTools(): void {
    this.moveSelectedAnnotationToBack();
  }

  public moveSelectedAnnotationToFrontFromTools(): void {
    this.moveSelectedAnnotationToFront();
  }

  public removeSelectedTableBallFromTools(): void {
    this.removeSelectedTableBall();
  }

  public saveConfigurationFromTools(): void {
    this.saveConfiguration();
  }
}

function ballClipViewBoxString(modelRadius: number): string {
  const half = modelRadius * 1.02;
  const side = half * 2;
  return `-${half} -${half} ${side} ${side}`;
}
