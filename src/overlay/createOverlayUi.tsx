import React from 'react';
import { createRoot } from 'react-dom/client';
import { OverlayMain } from './OverlayMain';

export function createOverlayUi(el: HTMLDivElement, headerActionsSlot?: HTMLElement) {
  const root = createRoot(el);
  root.render(<OverlayMain headerActionsSlot={headerActionsSlot} />);
}
