import { loadOverlaySize, matchOverlaySizePreset, OVERLAY_SIZE_PRESETS, saveOverlaySize } from './overlaySize';

const STORAGE_KEY = 'elven-assist-overlay-size';

let store: Record<string, string>;

// chromeStorage reads `chrome` at call time, so a plain stub of the two calls it makes is enough.
beforeEach(() => {
  store = {};
  (globalThis as unknown as { chrome: unknown }).chrome = {
    storage: {
      local: {
        get: (name: string) => Promise.resolve({ [name]: store[name] }),
        set: (items: Record<string, string>) => {
          Object.assign(store, items);
          return Promise.resolve();
        },
      },
    },
  };
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('loadOverlaySize', () => {
  it('returns nothing when the panel has never been resized', async () => {
    await expect(loadOverlaySize()).resolves.toBeUndefined();
  });

  it('reads back what was saved', async () => {
    saveOverlaySize({ width: 512, height: 640 });
    await expect(loadOverlaySize()).resolves.toEqual({ width: 512, height: 640 });
  });

  it.each([
    ['unparseable text', 'not json'],
    ['a size with no height', '{"width":300}'],
    ['a non-numeric width', '{"width":"300","height":400}'],
    ['a zero height', '{"width":300,"height":0}'],
    ['a null entry', 'null'],
  ])('falls back to the default for %s', async (_case, raw) => {
    store[STORAGE_KEY] = raw;
    await expect(loadOverlaySize()).resolves.toBeUndefined();
  });
});

describe('matchOverlaySizePreset', () => {
  it('names the preset a size came from', () => {
    expect(matchOverlaySizePreset(OVERLAY_SIZE_PRESETS.small)).toBe('small');
    expect(matchOverlaySizePreset(OVERLAY_SIZE_PRESETS.large)).toBe('large');
  });

  it('names no preset for a hand-dragged size or a collapsed panel', () => {
    expect(matchOverlaySizePreset({ width: 251, height: 450 })).toBeUndefined();
    expect(matchOverlaySizePreset(undefined)).toBeUndefined();
  });
});
