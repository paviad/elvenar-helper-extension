import { CityViewState } from '../CityViewState';

// Undo the last move
export const handleUndo = (s: CityViewState) => {
  const [moveLog, setMoveLog] = s.rMoveLog;
  const [_1, setBlocks] = s.rBlocks;
  const [_2, setRedoStack] = s.rRedoStack;
  const [dragIndex, _3] = s.rDragIndex;

  // Prevent undo while dragging
  if (dragIndex !== null) return;

  if (moveLog.length === 0) return;
  const last = moveLog[moveLog.length - 1];
  if (last.type === 'delete' && last.deletedBlock) {
    const g = last.deletedBlock;
    setBlocks((prev) => ({ ...prev, [g.id]: g }));
  } else if (last.type === 'duplicate' && last.duplicatedBlock) {
    const g = last.duplicatedBlock;
    setBlocks((prev) => {
      const { [g.id]: _, ...rest } = prev;
      return rest;
    });
  } else {
    setBlocks((prev) => ({
      ...prev,
      [last.id]: {
        ...prev[last.id],
        x: last.from.x,
        y: last.from.y,
        moved: last.movedChanged !== prev[last.id].moved,
      },
    }));
  }
  setMoveLog((prev) => prev.slice(0, -1));
  setRedoStack((prev) => [...prev, last]);
};
