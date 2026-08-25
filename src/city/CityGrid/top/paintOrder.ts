import { CityBlock } from '../../CityBlock';

/**
 * The order the blocks are painted in, back to front: blocks standing where the game
 * has them, then ones that have been moved, then highlighted ones - so what the user
 * has been working on, or is searching for, is never hidden under a neighbour. The
 * block being carried is left out; the view paints it last, from a copy of its own.
 * Keys are the record's own, as strings, the way Object.entries hands them out.
 */
export function paintOrder<T extends Pick<CityBlock, 'id' | 'moved'>>(
  blocks: Record<number, T>,
  highlightedIds: Set<number>,
  dragIndex: number | null,
): [string, T][] {
  const entries = Object.entries(blocks).filter(([i]) => Number(i) !== dragIndex);
  const unmoved = entries.filter(([, b]) => !b.moved && !highlightedIds.has(b.id));
  const moved = entries.filter(([, b]) => b.moved && !highlightedIds.has(b.id));
  const highlighted = entries.filter(([, b]) => highlightedIds.has(b.id));
  return [...unmoved, ...moved, ...highlighted];
}
