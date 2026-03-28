import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PoolTableComponent } from '../../components/pool-table/pool-table/pool-table.component';

/** Editor page: table + diagram state (service is provided here, not at the app root). */
@Component({
  selector: 'app-pool-diagram-editor-page',
  standalone: true,
  imports: [RouterLink, PoolTableComponent],
  templateUrl: './pool-diagram-editor-page.component.html',
  styleUrl: './pool-diagram-editor-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PoolDiagramEditorPageComponent {}
