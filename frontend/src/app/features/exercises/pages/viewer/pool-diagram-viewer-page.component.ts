import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PoolDiagramViewerComponent } from '../../components/pool-diagram-viewer/pool-diagram-viewer.component';
import { POOL_DIAGRAM_SAMPLE_JSON } from '../../models/pool-diagram.sample';

/** Test/import page: textarea text updates the viewer in real time. */
@Component({
  selector: 'app-pool-diagram-viewer-page',
  standalone: true,
  imports: [RouterLink, PoolDiagramViewerComponent],
  templateUrl: './pool-diagram-viewer-page.component.html',
  styleUrl: './pool-diagram-viewer-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PoolDiagramViewerPageComponent {
  protected readonly jsonText = signal(POOL_DIAGRAM_SAMPLE_JSON);

  protected onJsonFile(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    void file.text().then((t) => this.jsonText.set(t));
  }
}
