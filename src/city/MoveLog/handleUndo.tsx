import { CityViewState } from '../CityViewState';

// Undo the last move
export const handleUndo = (s: CityViewState) => {
  const [moveLog, setMoveLog] = s.rMoveLog;
  const [_1, setBlocks] = s.rBlocks;
  const [_2, setRedoStack] = s.rRedoStack;

  if (moveLog.length === 0) return;
  const last = moveLog[moveLog.length - 1];
  if (last.type === 'delete' && last.deletedBlock) {
    const g = last.deletedBlock;
    setBlocks((prev) => [...prev, g]);
  } else if (last.type === 'duplicate' && last.duplicatedBlock) {
    const g = last.duplicatedBlock;
    setBlocks((prev) => prev.filter((b) => b.id !== g.id));
  } else {
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.id === last.id) {
          const moved = last.movedChanged !== b.moved;
          return {
            ...b,
            x: last.from.x,
            y: last.from.y,
            moved,
          };
        } else return b;
      }),
    );
  }
  setMoveLog((prev) => prev.slice(0, -1));
  setRedoStack((prev) => [...prev, last]);
};
