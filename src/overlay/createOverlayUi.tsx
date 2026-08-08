import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { OverlayMain } from './OverlayMain';

// createRoot on a container that already holds a root does not replace it: both roots keep
// rendering into the same div, and the older tree stays mounted with nothing to unmount it.
const roots = new WeakMap<HTMLElement, Root>();

export function createOverlayUi(el: HTMLDivElement, headerActionsSlot?: HTMLElement) {
  const root = roots.get(el) ?? createRoot(el);
  roots.set(el, root);
  root.render(<OverlayMain headerActionsSlot={headerActionsSlot} />);
}
