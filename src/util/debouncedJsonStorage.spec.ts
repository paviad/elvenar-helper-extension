import { StateStorage } from 'zustand/middleware';
import { createDebouncedJsonStorage } from './debouncedJsonStorage';

const fakeStorage = () => {
  const stored: Record<string, string> = {};
  const storage: StateStorage = {
    getItem: jest.fn((name: string) => Promise.resolve(stored[name] ?? null)),
    setItem: jest.fn((name: string, value: string) => {
      stored[name] = value;
      return Promise.resolve();
    }),
    removeItem: jest.fn((name: string) => {
      delete stored[name];
      return Promise.resolve();
    }),
  };
  return { stored, storage };
};

const value = (count: number) => ({ state: { count }, version: 0 });

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('createDebouncedJsonStorage', () => {
  it('writes once changes pause, with the last of them', () => {
    const { stored, storage } = fakeStorage();
    const debounced = createDebouncedJsonStorage<{ count: number }>(storage, 1000);

    void debounced.setItem('s', value(1));
    jest.advanceTimersByTime(500);
    void debounced.setItem('s', value(2));
    jest.advanceTimersByTime(999);
    expect(storage.setItem).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    expect(JSON.parse(stored.s)).toEqual(value(2));
  });

  it('answers a read with a write still waiting', async () => {
    const { stored, storage } = fakeStorage();
    stored.s = JSON.stringify(value(1));
    const debounced = createDebouncedJsonStorage<{ count: number }>(storage, 1000);

    void debounced.setItem('s', value(2));

    expect(await debounced.getItem('s')).toEqual(value(2));
  });

  it('reads what is stored when nothing is waiting', async () => {
    const { stored, storage } = fakeStorage();
    stored.s = JSON.stringify(value(3));
    const debounced = createDebouncedJsonStorage<{ count: number }>(storage, 1000);

    expect(await debounced.getItem('s')).toEqual(value(3));
    expect(await debounced.getItem('missing')).toBeNull();
  });

  it('drops a waiting write when the name is removed', async () => {
    const { stored, storage } = fakeStorage();
    const debounced = createDebouncedJsonStorage<{ count: number }>(storage, 1000);

    void debounced.setItem('s', value(1));
    await debounced.removeItem('s');
    jest.advanceTimersByTime(1000);

    expect(storage.setItem).not.toHaveBeenCalled();
    expect(stored.s).toBeUndefined();
  });

  it('writes at once when the page goes away, and not again when the pause runs out', () => {
    const handlers: Record<string, () => void> = {};
    const target = globalThis as unknown as { addEventListener?: (type: string, handler: () => void) => void };
    const original = target.addEventListener;
    target.addEventListener = (type, handler) => {
      handlers[type] = handler;
    };
    try {
      const { stored, storage } = fakeStorage();
      const debounced = createDebouncedJsonStorage<{ count: number }>(storage, 1000);

      void debounced.setItem('s', value(1));
      handlers.pagehide();
      expect(JSON.parse(stored.s)).toEqual(value(1));

      jest.advanceTimersByTime(1000);
      expect(storage.setItem).toHaveBeenCalledTimes(1);
    } finally {
      target.addEventListener = original;
    }
  });

  it('keeps names apart', () => {
    const { stored, storage } = fakeStorage();
    const debounced = createDebouncedJsonStorage<{ count: number }>(storage, 1000);

    void debounced.setItem('a', value(1));
    void debounced.setItem('b', value(2));
    jest.advanceTimersByTime(1000);

    expect(JSON.parse(stored.a)).toEqual(value(1));
    expect(JSON.parse(stored.b)).toEqual(value(2));
  });
});
