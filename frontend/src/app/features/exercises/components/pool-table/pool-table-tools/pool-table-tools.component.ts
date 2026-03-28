import { ChangeDetectionStrategy, Component, computed, input, output, signal, Input as NgInput } from '@angular/core';
import type { PoolDiagramBallOnTable, PoolDiagramDocument, PoolDiagramElement } from '../../../models/pool-diagram.model';
import {
  DEFAULT_ELEMENT_OPACITY,
  MAX_ANNOTATION_STROKE_WIDTH,
  MIN_ANNOTATION_STROKE_WIDTH,
  type PoolEditorTool,
} from '../../../models/pool-diagram.model';
import { parsePoolDiagramJson } from '../../../models/pool-diagram.serialization';
import type { PoolDiagramEditorState } from '../../../state/pool-diagram-editor-state';

const EDITOR_TOOL_OPTIONS: { id: PoolEditorTool; label: string }[] = [
  { id: 'select', label: 'Select' },
  { id: 'arrow', label: 'Arrow' },
  { id: 'segment', label: 'Line' },
  { id: 'dashed', label: 'Dashed' },
  { id: 'rect', label: 'Rectangle' },
  { id: 'text', label: 'Text' },
];

const TEXT_FONT_SIZE_MIN = 10;
const TEXT_FONT_SIZE_MAX = 96;
const TEXT_FONT_OPTIONS = [
  { label: 'Inter', value: 'Inter, system-ui, sans-serif' },
  { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Georgia', value: 'Georgia, "Times New Roman", serif' },
  { label: 'Trebuchet MS', value: '"Trebuchet MS", Verdana, sans-serif' },
  { label: 'Courier New', value: '"Courier New", Courier, monospace' },
] as const;

@Component({
  selector: 'app-pool-table-tools',
  standalone: true,
  templateUrl: './pool-table-tools.component.html',
  styleUrl: './pool-table-tools.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PoolTableToolsComponent {
  @NgInput({ required: true }) state!: PoolDiagramEditorState;

  /** Editor display / behavior. */
  readonly editable = input(true);

  /** If provided, the table is driven by an external document. */
  readonly document = input<PoolDiagramDocument | null>(null);

  readonly diagramNameChangeRequested = output<string>();
  readonly rectFilledChangeRequested = output<boolean>();
  readonly strokeColorChangeRequested = output<string>();
  readonly annotationStrokeWidthChangeRequested = output<number>();
  readonly showZonesOverlayChangeRequested = output<boolean>();
  readonly textDraftChangeRequested = output<string>();
  readonly textFontFamilyChangeRequested = output<string>();
  readonly textFontSizeChangeRequested = output<number>();

  readonly toolChangeRequested = output<PoolEditorTool>();
  readonly selectionOpacityRequested = output<number>();

  readonly startNewDiagramRequested = output<void>();
  readonly clearDiagramRequested = output<void>();
  readonly clearAnnotationsRequested = output<void>();
  readonly deleteSelectedAnnotationRequested = output<void>();
  readonly duplicateSelectedBallRequested = output<void>();
  readonly moveSelectedAnnotationBackwardRequested = output<void>();
  readonly moveSelectedAnnotationForwardRequested = output<void>();
  readonly moveSelectedAnnotationToBackRequested = output<void>();
  readonly moveSelectedAnnotationToFrontRequested = output<void>();
  readonly removeSelectedTableBallRequested = output<void>();

  readonly tableColorChangeRequested = output<{ key: 'frame' | 'diamond' | 'cloth' | 'cushion' | 'zones'; value: string }>();
  readonly applyDocumentRequested = output<PoolDiagramDocument>();
  readonly saveConfigurationRequested = output<void>();

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
      const u = (e?.opacity ?? DEFAULT_ELEMENT_OPACITY) as number;
      return Math.round(Math.max(0, Math.min(1, u)) * 100);
    }

    const bid = this.state.selectedTableBallInstanceId();
    if (bid) {
      const b = this.state.tableBalls().find((x) => x.id === bid);
      const u = (b?.opacity ?? DEFAULT_ELEMENT_OPACITY) as number;
      return Math.round(Math.max(0, Math.min(1, u)) * 100);
    }
    return 100;
  });

  protected readonly isJsonPasteDialogOpen = signal(false);
  protected readonly jsonPasteDraft = signal('');
  protected readonly isTableConfigDialogOpen = signal(false);

  protected setTool(t: PoolEditorTool): void {
    this.toolChangeRequested.emit(t);
  }

  protected onSelectionOpacityPercentInput(percent: number): void {
    this.selectionOpacityRequested.emit(percent / 100);
  }

  protected onDiagramNameInput(value: string): void {
    this.diagramNameChangeRequested.emit(value);
  }

  protected onRectFilledChange(checked: boolean): void {
    this.rectFilledChangeRequested.emit(checked);
  }

  protected onStrokeColorInput(value: string): void {
    this.strokeColorChangeRequested.emit(value);
  }

  protected onAnnotationStrokeWidthInput(px: number): void {
    this.annotationStrokeWidthChangeRequested.emit(px);
  }

  protected onShowZonesOverlayChange(checked: boolean): void {
    this.showZonesOverlayChangeRequested.emit(checked);
  }

  protected onTextDraftInput(value: string): void {
    this.textDraftChangeRequested.emit(value);
  }

  protected onTextFontFamilyChange(value: string): void {
    this.textFontFamilyChangeRequested.emit(value);
  }

  protected onTextFontSizeChange(px: number): void {
    this.textFontSizeChangeRequested.emit(px);
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
      this.applyDocumentRequested.emit(parsed);
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

  /** Parses and imports the JSON from the dialog. */
  protected importJsonFromDialog(): void {
    try {
      const parsed = parsePoolDiagramJson(JSON.parse(this.jsonPasteDraft()) as unknown);
      this.applyDocumentRequested.emit(parsed);
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
    this.tableColorChangeRequested.emit({ key, value });
  }

  protected startNewDiagram(): void {
    if (this.document()) {
      return;
    }
    this.startNewDiagramRequested.emit();
  }

  protected clearDiagram(): void {
    this.clearDiagramRequested.emit();
  }

  protected clearAnnotations(): void {
    this.clearAnnotationsRequested.emit();
  }

  protected deleteSelectedAnnotation(): void {
    this.deleteSelectedAnnotationRequested.emit();
  }

  protected duplicateSelectedBall(): void {
    this.duplicateSelectedBallRequested.emit();
  }

  protected moveSelectedAnnotationBackward(): void {
    this.moveSelectedAnnotationBackwardRequested.emit();
  }

  protected moveSelectedAnnotationForward(): void {
    this.moveSelectedAnnotationForwardRequested.emit();
  }

  protected moveSelectedAnnotationToFront(): void {
    this.moveSelectedAnnotationToFrontRequested.emit();
  }

  protected moveSelectedAnnotationToBack(): void {
    this.moveSelectedAnnotationToBackRequested.emit();
  }

  protected removeSelectedTableBall(): void {
    this.removeSelectedTableBallRequested.emit();
  }

  protected configurationFileNameBase(): string {
    // "Save configuration" uses console log / emission. Export uses the sanitized file name.
    // Here we keep the same logic in exportConfigurationToFile().
    return this.sanitizeConfigDownloadBaseName(this.state.diagramName()) || 'pool-diagram';
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
    this.saveConfigurationRequested.emit();
  }

  /** Download the current JSON. */
  protected exportConfigurationToFile(): void {
    const fileBase = this.configurationFileNameBase();
    const diagramName = this.state.diagramName().trim();
    const label = diagramName || fileBase || 'pool-diagram';
    const ok = window.confirm(`Export configuration as "${label}.json"?`);
    if (!ok) {
      return;
    }
    const doc = this.state.exportDocument();
    const json = JSON.stringify(doc, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.configurationFileNameBase()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  protected copyDocumentJson(): void {
    const json = JSON.stringify(this.state.exportDocument(), null, 2);
    void navigator.clipboard.writeText(json).catch(() => {
      window.prompt('Copy configuration:', json);
    });
  }
}

