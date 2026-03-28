import { COLORS } from '../pool-table.constants';

/** Un morceau de bois de bande + chemin pour clipper le caoutchouc. */
export type WallPieceVm = {
  id: string;
  woodPath: string;
};

export type DiamondVm = { points: string; half: number };

/** Frozen table snapshot:
 * everything is derived from constants + geometry (no physics).
 */
export type PoolTableScene = {
  view: { w: number; h: number };
  colors: typeof COLORS;
  slate: { x: number; y: number; w: number; h: number };
  bumperMask: { x: number; y: number; w: number; h: number };
  walls: WallPieceVm[];
  pockets: readonly { readonly cx: number; readonly cy: number }[];
  pocketRadius: number;
  diamonds: DiamondVm[];
  feltGradientRadius: number;
};
