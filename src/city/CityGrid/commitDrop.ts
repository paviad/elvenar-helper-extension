import { useCity } from '../CityContext';
import { findSwapTarget } from './findSwapTarget';
import { isOverlapping } from './isOverlapping';

/**
 * Finishes a drag: settles the block's position, records it in the move log and
 * clears the drag state. Shared by the top-down and isometric views, which differ
 * only in how a drag position is computed, not in how a drop is resolved.
 *
 * A block with no originalPos is one that has never been placed - a duplicate or a
 * newly built building - so an overlapping drop discards it instead of snapping back.
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
  let finalX = newX;
  let finalY = newY;

  const overlaps = isOverlapping(block, dragIndex, newX, newY, blocks);

  // A drop onto a single building is still a drop the city can take: the dragged one stays
  // where it was put and the building it landed on is handed to the cursor in its stead.
  // Only when that building could sit in the spot being vacated, which is where it starts
  // from and where it goes back to if the drop that follows fails - so however the pair
  // ends up, nothing is left overlapping.
  const swap = overlaps && originalPos ? findSwapTarget(block, dragIndex, blocks, originalPos) : null;

  if ((!overlaps || swap) && coversReplacedArea) {
    city.setReplacedArea(null);
  }

  if (swap && originalPos) {
    const other = swap.block;
    const isOriginal = block.x === block.originalX && block.y === block.originalY;
    const otherIsOriginal = originalPos.x === other.originalX && originalPos.y === other.originalY;
    // Where the displaced building settles if it is simply put down: the spot the dragged
    // one is leaving. That is what the log records and what a failed drop falls back to.
    const swapped = { ...other, x: originalPos.x, y: originalPos.y, moved: !otherIsOriginal };

    setBlocks((prev) => ({
      ...prev,
      [dragIndex]: { ...prev[dragIndex], moved: !isOriginal },
      // Taken up in the same grip the dropped building was carried by - same drag offset,
      // same tile - so it comes up under the cursor exactly where that one went down.
      [swap.key]: { ...swapped, x: finalX, y: finalY },
    }));
    // One entry for the pair: undoing half a swap would leave the two of them on the
    // same tiles, so both sides of it are stored and put back together.
    setMoveLog((prev) => [
      ...prev,
      {
        id: block.id,
        name: block.name,
        from: { x: originalPos.x, y: originalPos.y },
        to: { x: finalX, y: finalY },
        movedChanged: block.moved === isOriginal,
        type: 'swap',
        previousBlock: other,
        nextBlock: swapped,
      },
    ]);
    clearRedoStack();

    // The drag carries straight on with the displaced building, from the spot the dragged
    // one vacated: dropping it there needs no move of its own, and an impossible drop
    // settles it there rather than losing it.
    setDragIndex(swap.key);
    setOriginalPos({ x: originalPos.x, y: originalPos.y });
    return;
  }

  if (overlaps) {
    if (originalPos) {
      // Normal case: snap back
      finalX = originalPos.x;
      finalY = originalPos.y;
      setBlocks((prev) => ({
        ...prev,
        [dragIndex]: {
          ...prev[dragIndex],
          x: originalPos.x,
          y: originalPos.y,
        },
      }));
    } else {
      // Duplicate case: remove the block
      setBlocks((prev) => {
        const { [dragIndex]: _, ...newBlocks } = prev;
        return newBlocks;
      });
    }
  } else if (originalPos) {
    const b = blocks[dragIndex];
    const isOriginal = b.x === b.originalX && b.y === b.originalY;
    const movedChanged = block.moved === isOriginal;

    setBlocks((prev) => ({
      ...prev,
      [dragIndex]: {
        ...prev[dragIndex],
        moved: !isOriginal,
      },
    }));
    // Only log if the position actually changed
    if (originalPos.x !== finalX || originalPos.y !== finalY) {
      setMoveLog((prev) => [
        ...prev,
        {
          id: block.id,
          name: block.name,
          from: { x: originalPos.x, y: originalPos.y },
          to: { x: finalX, y: finalY },
          movedChanged,
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
        from: { x: block.x, y: block.y },
        to: { x: block.x, y: block.y },
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
