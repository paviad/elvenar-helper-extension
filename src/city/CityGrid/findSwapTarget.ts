import { CityBlock } from '../CityBlock';
import { findOverlapping, isOverlapping } from './isOverlapping';

export interface SwapTarget {
  /** Record key of the building in the way. */
  key: number;
  /** The building in the way, as it stands before the swap. */
  block: CityBlock;
}

/**
 * The building a drop lands on, when the drop can be settled by sending that one back to
 * the spot the dragged building is leaving.
 *
 * Null when the drop covers more than one building, or when the one it covers would not
 * fit in the space being vacated - a swap is only worth offering if the layout it leaves
 * has nothing overlapping in it, and two buildings rarely have the same footprint.
 */
export function findSwapTarget(
  dragged: CityBlock,
  dragIndex: number,
  blocks: Record<number, CityBlock>,
  originalPos: { x: number; y: number },
): SwapTarget | null {
  const blockers = findOverlapping(dragged, dragIndex, dragged.x, dragged.y, blocks);
  if (blockers.length !== 1) return null;

  const key = blockers[0];
  const block = blocks[key];
  if (!block) return null;

  // Judged against the layout as it will stand: the dragged building has left its old
  // spot and taken this one, so it is only the rest of the city that has to make room.
  const after = { ...blocks, [dragIndex]: dragged };
  if (isOverlapping(block, key, originalPos.x, originalPos.y, after)) return null;

  return { key, block };
}
