import { create } from 'zustand';

export interface GridPosition {
  x: number;
  y: number;
}

interface MouseGridState {
  position: GridPosition | null;
  setPosition: (position: GridPosition | null) => void;
}

/**
 * The grid tile under the cursor, kept out of CityContext on purpose.
 *
 * This updates about twenty times a second whenever the mouse moves over the grid -
 * hovering, panning or dragging. Holding it in the city context meant every consumer
 * re-rendered at that rate, which measurably dominated panning: a burst of React
 * reconciliation and MUI style recomputation for a value only one small panel reads.
 *
 * Deliberately not persisted. tabStore would serialise its whole state to
 * sessionStorage on every write, which is hundreds of kilobytes per update.
 */
export const useMouseGridStore = create<MouseGridState>()((set) => ({
  position: null,
  setPosition: (position) =>
    set((state) => {
      const current = state.position;
      // Ignore repeats: the pointer crosses many pixels per tile, and an unchanged
      // tile should not wake up subscribers.
      if (current === position) return state;
      if (current && position && current.x === position.x && current.y === position.y) return state;
      return { position };
    }),
}));

/** For the mouse handlers, which are plain functions rather than components. */
export const setMouseGridPosition = (position: GridPosition | null) =>
  useMouseGridStore.getState().setPosition(position);
