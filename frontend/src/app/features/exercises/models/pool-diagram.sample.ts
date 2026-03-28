/** Minimal sample for the viewer page (schema 3: each table ball has an `id`). */
export const POOL_DIAGRAM_SAMPLE_JSON = `{
  "schemaVersion": 3,
  "id": "diag-demo-viewer",
  "creatorId": "sample",
  "diagramName": "Demo",
  "ballsOnTable": [
    { "id": "demo-ball-1", "ballId": 0, "x": 480, "y": 320, "opacity": 0.85 },
    { "id": "demo-ball-2", "ballId": 1, "x": 620, "y": 300 }
  ],
  "elements": [
    {
      "id": "ex-arrow",
      "type": "arrow",
      "x1": 400,
      "y1": 260,
      "x2": 720,
      "y2": 380,
      "color": "#ff9800",
      "strokeWidth": 6
    },
    {
      "id": "ex-dash",
      "type": "dashed",
      "x1": 380,
      "y1": 400,
      "x2": 780,
      "y2": 400,
      "color": "#90caf9",
      "strokeWidth": 5,
      "opacity": 0.55
    },
    {
      "id": "ex-zone",
      "type": "rect",
      "x": 520,
      "y": 200,
      "width": 200,
      "height": 120,
      "color": "#e91e63",
      "filled": true,
      "fillOpacity": 0.25,
      "strokeWidth": 4
    }
  ]
}`;
