import { useCity } from '../CityContext';
import { findSwapTarget } from './findSwapTarget';
import { isOverlapping } from './isOverlapping';

/**
 * Finishes a drag: settles the block's position, records it in the move log and
 * clears the drag state. Shared by the top-down and isometric views, which differ
 * only in how a drag position is computed, not in how a drop is resolved.
 *
 * A drop that cannot be made is refused rather than resolved: the drag stands, the
 * building stays on the cursor, and it can be put down somewhere it fits. Delete is how
 * you get rid of one you have decided against.
 */
export const commitDrop = (city: ReturnType<typeof useCity>) => {
  const setMoveLog = city.setMoveLog;
  const clearRedoStack = city.clearRedoStack;

  const blocks = city.blocks;
  const setBlocks = city.setBlocks;
  const dragIndex = city.dragIndex;
  const setDragIndex = city.setDragIndex;
  const originalPos = city.originalPos;
  const setOriginalPos = city.setOriginalPos;

  if (dragIndex === null) return;

  const block = blocks[dragIndex];
  const replacedArea = city.replacedArea;
  // The marker has done its job once something is dropped on the vacated footprint.
  const coversReplacedArea =
    !!replacedArea &&
    block.x <= replacedArea.x + replacedArea.width - 1 &&
    block.x + block.width - 1 >= replacedArea.x &&
    block.y <= replacedArea.y + replacedArea.length - 1 &&
    block.y + block.length - 1 >= replacedArea.y;

  const newX = block.x;
  const newY = block.y;

  const overlaps = isOverlapping(block, dragIndex, newX, newY, blocks);

  // A drop onto a single building is still a drop the city can take: the dragged one stays
  // where it was put and the building it landed on is handed to the cursor in its stead.
  // Where that one ends up is for the drag that carries on to decide, so the spot being
  // vacated is nothing more than a fallback, and only when it happens to be free.
  const swap = overlaps ? findSwapTarget(block, dragIndex, blocks, originalPos) : null;

  // Nothing else the city can make of it: the drop is refused and the drag stands, rather
  // than the building being thrown away or dragged back to where it started. A misplaced
  // click costs nothing that way, and the search for a spot simply carries on.
  if (overlaps && !swap) return;

  if (coversReplacedArea) {
    city.setReplacedArea(null);
  }

  if (swap) {
    const other = swap.block;
    const isOriginal = block.x === block.originalX && block.y === block.originalY;
    // Where the displaced building settles if the spot being vacated is free and it is
    // simply put down again. That is what the log records as its destination. Absent when
    // the dragged building has no spot of its own to hand over - one taken up by a swap of
    // its own is between homes until it lands.
    const settled =
      originalPos && swap.fitsVacated
        ? {
            ...other,
            x: originalPos.x,
            y: originalPos.y,
            moved: !(originalPos.x === other.originalX && originalPos.y === other.originalY),
          }
        : undefined;

    setBlocks((prev) => ({
      ...prev,
      // The drop stands as it was made; only the moved mark is settled, and only for a
      // building that had a place to be moved from.
      [dragIndex]: originalPos ? { ...prev[dragIndex], moved: !isOriginal } : prev[dragIndex],
      // Taken up in the same grip the dropped building was carried by - same drag offset,
      // same tile - so it comes up under the cursor exactly where that one went down.
      [swap.key]: { ...(settled ?? other), x: newX, y: newY },
    }));
    // One entry for the pair: undoing half a swap would leave the two of them on the
    // same tiles, so both sides of it are stored and put back together.
    setMoveLog((prev) => [
      ...prev,
      {
        id: block.id,
        name: block.name,
        from: originalPos ?? { x: newX, y: newY },
        to: { x: newX, y: newY },
        movedChanged: originalPos ? block.moved === isOriginal : false,
        type: 'swap',
        previousBlock: other,
        nextBlock: settled,
        // The dragged building came from nowhere, so undoing this takes it off the grid
        // rather than sending it back.
        duplicatedBlock: originalPos ? undefined : block,
      },
    ]);
    clearRedoStack();

    // The drag carries straight on with the displaced building, holding the spot the
    // dragged one vacated where that is free: dropping it there then needs no move of its
    // own. Where it is not free the building is between homes, like a duplicate that has
    // not been put down yet, and this entry is what undo reads to put it back where it
    // stood.
    setDragIndex(swap.key);
    setOriginalPos(settled ? { x: settled.x, y: settled.y } : null);
    return;
  }

  if (originalPos) {
    const isOriginal = newX === block.originalX && newY === block.originalY;

    setBlocks((prev) => ({
      ...prev,
      [dragIndex]: {
        ...prev[dragIndex],
        moved: !isOriginal,
      },
    }));
    // Only log if the position actually changed
    if (originalPos.x !== newX || originalPos.y !== newY) {
      setMoveLog((prev) => [
        ...prev,
        {
          id: block.id,
          name: block.name,
          from: { x: originalPos.x, y: originalPos.y },
          to: { x: newX, y: newY },
          movedChanged: block.moved === isOriginal,
        },
      ]);
      clearRedoStack(); // Clear redo stack on new move
    }
  } else {
    // This is a duplicate drop
    setMoveLog((prev) => [
      ...prev,
      {
        id: block.id,
        name: block.name,
        from: { x: newX, y: newY },
        to: { x: newX, y: newY },
        movedChanged: false,
        type: 'duplicate',
        duplicatedBlock: block,
      },
    ]);
    clearRedoStack();
  }

  setDragIndex(null);
  setOriginalPos(null);
};
