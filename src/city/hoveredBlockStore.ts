import { create } from 'zustand';

interface HoveredBlockState {
  hoveredId: number | null;
  setHoveredId: (id: number | null) => void;
}

/**
 * The block under the cursor, kept out of CityContext for the same reason as the
 * mouse position: every block would re-render each time the pointer crossed a
 * building, and the blocks are memoised precisely to avoid that. Read through a
 * selector each block only wakes up when its own hovered state flips.
 */
export const useHoveredBlockStore = create<HoveredBlockState>()((set) => ({
  hoveredId: null,
  setHoveredId: (hoveredId) => set((state) => (state.hoveredId === hoveredId ? state : { hoveredId })),
}));

/** For the mouse handlers and the keyboard shortcuts, which are not components. */
export const setHoveredBlockId = (id: number | null) => useHoveredBlockStore.getState().setHoveredId(id);

/**
 * Clears the hover only if `id` still holds it. Leaving a block hands the hover on to
 * whatever lies underneath, and the browser can report the arrival before the departure.
 */
export const clearHoveredBlockId = (id: number) => {
  const store = useHoveredBlockStore.getState();
  if (store.hoveredId === id) store.setHoveredId(null);
};

export const getHoveredBlockId = () => useHoveredBlockStore.getState().hoveredId;
