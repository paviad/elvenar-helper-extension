import React from 'react';
import { createRoot } from 'react-dom/client';
import { setupMessageListener } from '../chrome/messages';
import { OverlayMain } from './OverlayMain';

export function createOverlayUi(el: HTMLDivElement) {
  setupMessageListener();
  const root = createRoot(el);
  root.render(<OverlayMain />);
}
