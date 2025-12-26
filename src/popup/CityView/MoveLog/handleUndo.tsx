import { CityViewState } from '../CityViewState';

// Undo the last move
export const handleUndo = (s: CityViewState) => {
  const [moveLog, setMoveLog] = s.rMoveLog;
  const [_1, setBlocks] = s.rBlocks;
  const [_2, setRedoStack] = s.rRedoStack;

  if (moveLog.length === 0) return;
  const last = moveLog[moveLog.length - 1];
  setBlocks((prev) => prev.map((b) => {
    if (b.id === last.id) {
      const moved = last.movedChanged !== b.moved;
      return {
        ...b,
        x: last.from.x,
        y: last.from.y,
        moved,
      };
    } else return b;
  })
  );
  setMoveLog((prev) => prev.slice(0, -1));
  setRedoStack((prev) => [...prev, last]);
};
