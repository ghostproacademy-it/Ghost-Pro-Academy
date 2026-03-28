/**
 * Convert a screen point (clientX/clientY) into SVG internal coordinates
 * (the table SVG viewBox coordinate system).
 * Uses the SVG transformation matrix: required when the SVG is resized via CSS.
 */
export function clientToSvgPoint(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) {
    // Rare (SVG not rendered yet): avoids a crash; the point will be inaccurate.
    return { x: 0, y: 0 };
  }
  const p = pt.matrixTransform(ctm.inverse());
  return { x: p.x, y: p.y };
}

/** Number of screen pixels per 1 viewBox unit (CSS zoom of the SVG). */
export function svgPxPerUnitWidth(svg: SVGSVGElement): number {
  const rect = svg.getBoundingClientRect();
  const vb = svg.viewBox.baseVal;
  if (rect.width < 1 || vb.width < 1) {
    return 1;
  }
  return rect.width / vb.width;
}
