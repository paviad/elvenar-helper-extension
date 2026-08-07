import React from 'react';

/**
 * Holds on to the last value seen while `settled` was true.
 *
 * Used to keep whole-city derivations off the drag path. A drag rewrites the blocks
 * object about twenty times a second, and anything derived from the entire city -
 * resource totals, the type palette, search matches - would otherwise be recomputed
 * on every one of those frames. None of them need to follow a block mid-gesture, so
 * they read the layout as of the last completed gesture instead.
 *
 * Writing a ref during render is safe here because it is idempotent: the same inputs
 * always store the same value, so a double render stores it twice and changes nothing.
 * The whole point is to return the held value during the render that asks for it, so an
 * effect-based sync cannot express this - it would hand back last render's value.
 */
/* eslint-disable react-hooks/refs */
export function useSettledValue<T>(value: T, settled: boolean): T {
  const settledValue = React.useRef(value);

  if (settled) {
    settledValue.current = value;
  }

  return settledValue.current;
}
/* eslint-enable react-hooks/refs */
