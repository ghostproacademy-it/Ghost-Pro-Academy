import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { poolBallAppearance } from '../../pool-ball-appearance';
import { BALL_RAD, POOL_BALL_RENDER } from '../../pool-table.constants';

/**
 * Vector drawing of a ball (local reference: center 0,0, radius `ballRadius`).
 * Definition ids (`clipPath`, gradients) must be unique: pass `defsIdPrefix`.
 */
@Component({
  selector: 'g[appPoolBallGraphic]',
  standalone: true,
  templateUrl: './pool-ball-graphic.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PoolBallGraphicComponent {
  readonly ballId = input.required<number>();
  readonly ballRadius = input(BALL_RAD);
  readonly defsIdPrefix = input.required<string>();

  protected readonly render = POOL_BALL_RENDER;

  protected readonly appearance = computed(() => poolBallAppearance(this.ballId()));

  protected readonly ballClipId = computed(() => `${this.defsIdPrefix()}-ballClip`);
  /** SVG equivalent of `_grad-light` (radial 100% 100% at 70% 15%). */
  protected readonly poolLightId = computed(() => `${this.defsIdPrefix()}-poolLight`);
  /** `linear-gradient` 180deg for striped balls (--_stripe * 22.5%). */
  protected readonly stripeBandId = computed(() => `${this.defsIdPrefix()}-stripeBand`);

  protected readonly labelFontSize = computed(() => {
    const r = this.ballRadius();
    const label = this.appearance().label;
    return label.length > 1 ? r * 0.58 : r * 0.72;
  });

  /** CSS reference: underline on balls 6 and 9. */
  protected readonly numberUnderline = computed(
    () => this.ballId() === 6 || this.ballId() === 9,
  );

  protected readonly plateR = computed(() => this.ballRadius() * POOL_BALL_RENDER.numberPlateRadiusRatio);

  /** Percentage offsets for the striped band (sharp edges like in CSS). */
  protected readonly stripeGrad = (() => {
    const s = POOL_BALL_RENDER.stripeBandStart * 100;
    const e = POOL_BALL_RENDER.stripeBandEnd * 100;
    return {
      t0: '0%',
      t1: `${Math.max(0, s - 0.12).toFixed(2)}%`,
      t2: `${s.toFixed(2)}%`,
      t3: `${e.toFixed(2)}%`,
      t4: `${Math.min(100, e + 0.12).toFixed(2)}%`,
      t5: '100%',
    } as const;
  })();
}
