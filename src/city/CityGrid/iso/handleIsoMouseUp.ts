import { useCity } from '../../CityContext';
import { isOverlapping } from '../isOverlapping';

export const handleIsoMouseUp = (city: ReturnType<typeof useCity>) => {
  const setMoveLog = city.setMoveLog;
  const clearRedoStack = city.clearRedoStack;

  const blocks = city.blocks;
  const setBlocks = city.setBlocks;
  const dragIndex = city.dragIndex;
  const setDragIndex = city.setDragIndex;
  const originalPos = city.originalPos;
  const setOriginalPos = city.setOriginalPos;

  if (dragIndex !== null) {
    const block = blocks[dragIndex];
    const newX = block.x;
    const newY = block.y;
    let finalX = newX;
    let finalY = newY;

    if (isOverlapping(block, dragIndex, newX, newY, blocks)) {
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
    } else if (!originalPos) {
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
  }
};
