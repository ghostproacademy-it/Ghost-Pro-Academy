import type { PoolBallColorSpec } from './pool-table.constants';
import { POOL_BALL_COLORS } from './pool-table.constants';

export type PoolBallKind = 'cue' | 'solid' | 'eight' | 'stripe';

export type PoolBallAppearance =
  | { ballId: number; kind: 'cue'; label: ''; spec: Extract<PoolBallColorSpec, { variant: 'cue' }> }
  | { ballId: number; kind: 'solid'; label: string; spec: Extract<PoolBallColorSpec, { variant: 'solid' }> }
  | { ballId: number; kind: 'eight'; label: '8'; spec: Extract<PoolBallColorSpec, { variant: 'eight' }> }
  | { ballId: number; kind: 'stripe'; label: string; spec: Extract<PoolBallColorSpec, { variant: 'stripe' }> };

export const POOL_BALL_IDS = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
] as const;

export function poolBallAppearance(ballId: number): PoolBallAppearance {
  const spec = POOL_BALL_COLORS[ballId];
  if (!spec) {
    throw new Error(
      `POOL_BALL_COLORS[${ballId}] is missing — add an entry in pool-table.constants.`,
    );
  }
  switch (spec.variant) {
    case 'cue':
      return { ballId, kind: 'cue', label: '', spec };
    case 'solid':
      return { ballId, kind: 'solid', label: String(ballId), spec };
    case 'eight':
      return { ballId, kind: 'eight', label: '8', spec };
    case 'stripe':
      return { ballId, kind: 'stripe', label: String(ballId), spec };
  }
}
