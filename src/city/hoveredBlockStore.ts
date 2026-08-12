import { create } from 'zustand';

interface HoveredBlockState {
  hoveredId: number | null;
  /**
   * Set while a building is being carried, which pins the hover to that building and
   * ignores the mouse until it lands. The pointer sits inside the copy on the cursor, but
   * that copy is repositioned frame by frame and the pointer slips onto the buildings
   * underneath in between, so each one a drag passed over flashed as it went.
   */
  suspended: boolean;
  setHoveredId: (id: number | null) => void;
  followDrag: (dragIndex: number | null) => void;
}

/**
 * The block under the cursor, kept out of CityContext for the same reason as the
 * mouse position: every block would re-render each time the pointer crossed a
 * building, and the blocks are memoised precisely to avoid that. Read through a
 * selector each block only wakes up when its own hovered state flips.
 */
export const useHoveredBlockStore = create<HoveredBlockState>()((set) => ({
  hoveredId: null,
  suspended: false,
  setHoveredId: (hoveredId) =>
    set((state) => (state.suspended || state.hoveredId === hoveredId ? state : { hoveredId })),
  followDrag: (dragIndex) =>
    set((state) => {
      if (dragIndex === null) return state.suspended ? { suspended: false } : state;
      if (state.hoveredId === dragIndex && state.suspended) return state;
      return { hoveredId: dragIndex, suspended: true };
    }),
}));

/** For the mouse handlers and the keyboard shortcuts, which are not components. */
export const setHoveredBlockId = (id: number | null) => useHoveredBlockStore.getState().setHoveredId(id);

/**
 * Hands the hover to the building being carried and holds it there until the drag ends,
 * which leaves it on the building where it was dropped - where the cursor is.
 */
export const setHoverForDrag = (dragIndex: number | null) => useHoveredBlockStore.getState().followDrag(dragIndex);

/**
 * Clears the hover only if `id` still holds it. Leaving a block hands the hover on to
 * whatever lies underneath, and the browser can report the arrival before the departure.
 */
export const clearHoveredBlockId = (id: number) => {
  const store = useHoveredBlockStore.getState();
  if (store.hoveredId === id) store.setHoveredId(null);
};

export const getHoveredBlockId = () => useHoveredBlockStore.getState().hoveredId;
