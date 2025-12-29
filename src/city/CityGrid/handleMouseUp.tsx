
import { CityViewState } from '../CityViewState';
import { isOverlapping } from './isOverlapping';

export const handleMouseUp = (s: CityViewState) => {
  const [blocks, setBlocks] = s.rBlocks;
  const [dragIndex, setDragIndex] = s.rDragIndex;
  const [originalPos, setOriginalPos] = s.rOriginalPos;
  const [_2, setMoveLog] = s.rMoveLog;
  const [_3, setRedoStack] = s.rRedoStack;

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
        setBlocks((prev) =>
          prev.map((b, i) =>
            i === dragIndex
              ? {
                  ...b,
                  x: originalPos.x,
                  y: originalPos.y,
                }
              : b,
          ),
        );
      } else {
        // Duplicate case: remove the block
        setBlocks((prev) => prev.filter((_, i) => i !== dragIndex));
      }
    } else if (originalPos) {
      const b = blocks[dragIndex];
      const isOriginal = b.x === b.originalX && b.y === b.originalY;
      const movedChanged = block.moved === isOriginal;

      setBlocks((prev) =>
        prev.map((b, i) => {
          if (i === dragIndex) {
            return {
              ...b,
              moved: !isOriginal,
            };
          }
          return b;
        }),
      );
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
        setRedoStack([]); // Clear redo stack on new move
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
      setRedoStack([]);
    }
    setDragIndex(null);
    setOriginalPos(null);
  }
};
