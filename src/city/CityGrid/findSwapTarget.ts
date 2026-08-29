import { CityBlock } from '../CityBlock';
import { findOverlapping, isOverlapping } from './isOverlapping';

export interface SwapTarget {
  /** Record key of the building in the way. */
  key: number;
  /** The building in the way, as it stands before the swap. */
  block: CityBlock;
  /**
   * Whether it would sit in the spot the dragged building is leaving. It is not sent
   * there - it is handed to the cursor - so this decides nothing about the swap itself,
   * only whether that spot can serve as the place it falls back to.
   */
  fitsVacated: boolean;
}

/**
 * The building a drop lands on, when the drop can be settled by taking that one up in the
 * dragged building's stead. Null when the drop covers more than one building: the one that
 * makes way has to be a single building for there to be anything to take up.
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
  const fitsVacated = !isOverlapping(block, key, originalPos.x, originalPos.y, after);

  return { key, block, fitsVacated };
}
