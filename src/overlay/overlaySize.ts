import { chromeStorage } from '../util/chromeStorage';

export interface OverlaySize {
  width: number;
  height: number;
}

export type OverlaySizePreset = 'small' | 'large';

/**
 * The two sizes the panel can be reset to. Small is the 400x600 that Chat, Messages and Swaps
 * each demand through `ensureMinWidthAndHeight`, so it is both the size the panel has settled at
 * in practice and the smallest one those views will hold - a smaller preset would be undone the
 * next time any of them had something to show. Large's height is the panel's own max-height, so
 * it is as tall as the panel can get.
 */
export const OVERLAY_SIZE_PRESETS: Record<OverlaySizePreset, OverlaySize> = {
  small: { width: 400, height: 600 },
  large: { width: 630, height: 800 },
};

export const DEFAULT_OVERLAY_SIZE = OVERLAY_SIZE_PRESETS.small;

/**
 * Deliberately not per-account: the panel exists before we know which account the tab belongs
 * to, and how big a window you want is about your screen, not about a city.
 */
const STORAGE_KEY = 'elven-assist-overlay-size';

const isUsableSize = (size: Partial<OverlaySize> | null): size is OverlaySize =>
  !!size &&
  typeof size.width === 'number' &&
  typeof size.height === 'number' &&
  Number.isFinite(size.width) &&
  Number.isFinite(size.height) &&
  size.width > 0 &&
  size.height > 0;

/** The saved size, or undefined when nothing usable is stored. Never throws. */
export const loadOverlaySize = async (): Promise<OverlaySize | undefined> => {
  try {
    const raw = await chromeStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as Partial<OverlaySize> | null;
    return isUsableSize(parsed) ? { width: parsed.width, height: parsed.height } : undefined;
  } catch (error) {
    console.error('ElvenAssist: could not read the saved overlay size', error);
    return undefined;
  }
};

/** Fire and forget: a failed write costs the remembered size, nothing else. */
export const saveOverlaySize = (size: OverlaySize): void => {
  chromeStorage.setItem(STORAGE_KEY, JSON.stringify(size)).catch((error) => {
    console.error('ElvenAssist: could not save the overlay size', error);
  });
};

/** Which preset a size is, for ticking the active entry in the menu. */
export const matchOverlaySizePreset = (size: OverlaySize | undefined): OverlaySizePreset | undefined => {
  if (!size) return undefined;
  const presets = Object.keys(OVERLAY_SIZE_PRESETS) as OverlaySizePreset[];
  return presets.find(
    (key) => OVERLAY_SIZE_PRESETS[key].width === size.width && OVERLAY_SIZE_PRESETS[key].height === size.height,
  );
};
