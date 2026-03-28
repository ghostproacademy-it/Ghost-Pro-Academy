import { Directive, ElementRef, EventEmitter, Output, inject, input } from '@angular/core';

/**
 * Drag and drop a ball (rack or felt).
 * The service listens to move/up on `window` and handles the drop.
 */
export type PoolBallDragBeginRequest = {
  ballId: number;
  tableInstanceId: string | null;
  event: PointerEvent;
  hostElement: HTMLElement;
  ghostSizePx: number;
};

@Directive({
  standalone: true,
  selector: '[appPoolBallDrag]',
  host: {
    '(pointerdown)': 'onPointerDown($event)',
    style: 'cursor: grab; touch-action: none; user-select: none; -webkit-user-select: none',
  },
})
export class PoolBallDragDirective {
  readonly ballId = input.required<number>();
  /** If defined, the ball is a felt instance (otherwise it's a rack ball). */
  readonly tableInstanceId = input<string | null>(null);
  readonly ghostSizePx = input.required<number>();
  /** Allows disabling drag in read-only mode. */
  readonly dragEnabled = input(true);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  @Output() readonly beginDrag = new EventEmitter<PoolBallDragBeginRequest>();

  onPointerDown(event: PointerEvent): void {
    if (!this.dragEnabled()) {
      return;
    }
    // Prevent the table-level pointer handler from handling the same event.
    event.stopPropagation();
    this.beginDrag.emit({
      ballId: this.ballId(),
      tableInstanceId: this.tableInstanceId(),
      event,
      hostElement: this.host.nativeElement,
      ghostSizePx: this.ghostSizePx(),
    });
  }
}
