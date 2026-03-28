import { Routes } from '@angular/router';

export const EXERCISES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/editor/pool-diagram-editor-page.component').then(
        (m) => m.PoolDiagramEditorPageComponent,
      ),
  },
  {
    path: 'viewer',
    loadComponent: () =>
      import('./pages/viewer/pool-diagram-viewer-page.component').then(
        (m) => m.PoolDiagramViewerPageComponent,
      ),
  },
];
