import { CityViewState } from '../CityViewState';

// Redo the last undone move
export const handleRedo = (s: CityViewState) => {
  const [redoStack, setRedoStack] = s.rRedoStack;
  const [_1, setBlocks] = s.rBlocks;
  const [_2, setMoveLog] = s.rMoveLog;

  if (redoStack.length === 0) return;
  const last = redoStack[redoStack.length - 1];
  if (last.type === 'delete' && last.deletedBlock) {
    setBlocks((prev) => prev.filter((b) => b.id !== last.id));
  } else if (last.type === 'duplicate' && last.duplicatedBlock) {
    const g = last.duplicatedBlock;
    setBlocks((prev) => [...prev, g]);
  } else {
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.id === last.id) {
          const moved = last.movedChanged !== b.moved;
          return {
            ...b,
            x: last.to.x,
            y: last.to.y,
            moved,
          };
        } else return b;
      }),
    );
  }
  setMoveLog((prev) => [...prev, last]);
  setRedoStack((prev) => prev.slice(0, -1));
};
