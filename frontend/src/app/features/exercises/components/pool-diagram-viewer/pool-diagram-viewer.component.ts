import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { PoolDiagramDocument } from '../../models/pool-diagram.model';
import { parsePoolDiagramJson } from '../../models/pool-diagram.serialization';
import { PoolTableComponent } from '../pool-table/pool-table/pool-table.component';

/**
 * Read-only diagram viewer.
 * Inputs: `diagram` (object) or `diagramJson` (string).
 * It provides its own `PoolDiagramStateService` (isolated embed).
 */
@Component({
  selector: 'app-pool-diagram-viewer',
  standalone: true,
  imports: [PoolTableComponent],
  template: `
    @if (resolved(); as doc) {
      <app-pool-table [editable]="false" [document]="doc" [showToolbar]="false" />
    } @else {
      <p class="pool-diagram-viewer__empty" role="status">No valid diagram to display.</p>
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .pool-diagram-viewer__empty {
        margin: 0;
        padding: 1rem;
        color: #b5a99f;
        font-size: 0.9rem;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PoolDiagramViewerComponent {
  readonly diagram = input<PoolDiagramDocument | null>(null);

  readonly diagramJson = input<string | null>(null);

  protected readonly resolved = computed((): PoolDiagramDocument | null => {
    const direct = this.diagram();
    if (direct) {
      return direct;
    }
    const raw = this.diagramJson();
    if (raw == null || raw.trim() === '') {
      return null;
    }
    try {
      return parsePoolDiagramJson(JSON.parse(raw) as unknown);
    } catch {
      return null;
    }
  });
}
