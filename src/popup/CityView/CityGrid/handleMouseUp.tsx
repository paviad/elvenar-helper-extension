import { CityViewState } from '../CityViewState';
import { isOverlapping } from './isOverlapping';

export const handleMouseUp = (s: CityViewState) => {
  const [blocks, setBlocks] = s.rBlocks;
  const [dragIndex, setDragIndex] = s.rDragIndex;
  const [originalPos, setOriginalPos] = s.rOriginalPos;
  const [_1, setMouseGrid] = s.rMouseGrid;
  const [_2, setMoveLog] = s.rMoveLog;
  const [_3, setRedoStack] = s.rRedoStack;

  if (dragIndex !== null && originalPos) {
    const block = blocks[dragIndex];
    const newX = block.x;
    const newY = block.y;
    let finalX = newX;
    let finalY = newY;

    if (isOverlapping(block, dragIndex, newX, newY, blocks)) {
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
    }
  }
  setDragIndex(null);
  setOriginalPos(null);
  setMouseGrid(null);
};
