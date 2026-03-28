import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
  DEFAULT_ANNOTATION_STROKE_WIDTH,
  DEFAULT_ELEMENT_OPACITY,
  type PoolDiagramArrowElement,
  type PoolDiagramElement,
  type PoolDiagramRectElement,
  type PoolDiagramTextElement,
  isLineLike,
  isRectElement,
  isTextElement,
} from '../../models/pool-diagram.model';
import { withAnnotationDefaults } from '../../models/pool-diagram.serialization';

/** SVG layer for diagram annotations (drawn above the felt, below the balls). */
@Component({
  selector: 'g[appPoolDiagramElements]',
  standalone: true,
  templateUrl: './pool-diagram-elements.component.html',
  styleUrl: './pool-diagram-elements.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PoolDiagramElementsComponent {
  readonly elements = input<PoolDiagramElement[]>([]);
  readonly selectedId = input<string | null>(null);

  protected readonly normalized = computed(() => this.elements().map(withAnnotationDefaults));

  /** Arrow head length along the line direction (same for tip + shaft). */
  private arrowHeadLength(el: PoolDiagramArrowElement): number {
    const sw = el.strokeWidth ?? DEFAULT_ANNOTATION_STROKE_WIDTH;
    return Math.max(10, sw * 2.4);
  }

  /** End of the visible segment: arrow shaft base (not the tip) to avoid overshooting lines. */
  protected arrowShaftEnd(el: PoolDiagramArrowElement): { x: number; y: number } {
    const dx = el.x2 - el.x1;
    const dy = el.y2 - el.y1;
    const L = Math.hypot(dx, dy) || 1;
    const len = Math.min(this.arrowHeadLength(el), L * 0.92);
    const ux = dx / L;
    const uy = dy / L;
    return { x: el.x2 - ux * len, y: el.y2 - uy * len };
  }

  protected arrowHeadPoints(el: PoolDiagramArrowElement): string {
    const dx = el.x2 - el.x1;
    const dy = el.y2 - el.y1;
    const L = Math.hypot(dx, dy) || 1;
    const len = Math.min(this.arrowHeadLength(el), L * 0.92);
    return triangleBehindTip(el.x1, el.y1, el.x2, el.y2, len);
  }

  protected isSelected(id: string): boolean {
    return this.selectedId() === id;
  }

  protected isLine(el: PoolDiagramElement): el is Extract<PoolDiagramElement, { x1: number }> {
    return isLineLike(el);
  }

  protected isRect(el: PoolDiagramElement): el is PoolDiagramRectElement {
    return isRectElement(el);
  }

  protected isText(el: PoolDiagramElement): el is PoolDiagramTextElement {
    return isTextElement(el);
  }

  protected elementDisplayOpacity(el: PoolDiagramElement): number {
    const o = el.opacity ?? DEFAULT_ELEMENT_OPACITY;
    return Math.max(0, Math.min(1, o));
  }
}

/** Arrow tip triangle vertices:
 * a base perpendicular to the line, shifted back by `len` from the tip.
 */
function triangleBehindTip(x1: number, y1: number, x2: number, y2: number, len: number): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const L = Math.hypot(dx, dy) || 1;
  const ux = dx / L;
  const uy = dy / L;
  const bx = x2 - ux * len;
  const by = y2 - uy * len;
  const px = -uy;
  const py = ux;
  const hw = len * 0.48;
  return `${x2},${y2} ${bx + px * hw},${by + py * hw} ${bx - px * hw},${by - py * hw}`;
}
