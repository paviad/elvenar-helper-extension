import React from 'react';
import { createRoot } from 'react-dom/client';
import { OverlayMain } from './OverlayMain';

export function createOverlayUi(el: HTMLDivElement) {
  const root = createRoot(el);
  root.render(<OverlayMain />);
}
