import React from 'react';
import { createRoot } from 'react-dom/client';
import { OverlayMain } from './OverlayMain';
import { setupMessageListener } from '../chrome/messages';

export function createOverlayUi(el: HTMLDivElement) {
  setupMessageListener();
  const root = createRoot(el);
  root.render(<OverlayMain />);
}
