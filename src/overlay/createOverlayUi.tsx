import React from 'react';
import { createTheme, ThemeProvider } from '@mui/material';
import { createRoot, Root } from 'react-dom/client';
import { appThemeOptions } from '../widgets/appTheme';
import { OverlayMain } from './OverlayMain';
import { OVERLAY_TOOLTIP_Z_INDEX } from './overlayStacking';

// createRoot on a container that already holds a root does not replace it: both roots keep
// rendering into the same div, and the older tree stays mounted with nothing to unmount it.
const roots = new WeakMap<HTMLElement, Root>();

/**
 * The shared theme plus the tooltips' stacking, which has to clear the panel. Set once here
 * rather than on each Tooltip, so a tooltip added later cannot open invisible again.
 */
const overlayTheme = createTheme(appThemeOptions, { zIndex: { tooltip: OVERLAY_TOOLTIP_Z_INDEX } });

export function createOverlayUi(el: HTMLDivElement, headerActionsSlot?: HTMLElement) {
  const root = roots.get(el) ?? createRoot(el);
  roots.set(el, root);
  root.render(
    <ThemeProvider theme={overlayTheme}>
      <OverlayMain headerActionsSlot={headerActionsSlot} />
    </ThemeProvider>,
  );
}
