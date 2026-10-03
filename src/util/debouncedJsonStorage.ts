import { debounceTime, groupBy, mergeMap, Subject } from 'rxjs';
import { PersistStorage, StateStorage, StorageValue } from 'zustand/middleware';

/**
 * A storage for zustand's `persist` that writes once changes pause, rather than on every change.
 *
 * `persist` writes the whole persisted state after every `set`, including sets of fields it leaves
 * out, and a store holding weeks of chat makes that a large JSON string built on the game's own
 * thread each time. Here a change only replaces what is waiting to be written; the string is built
 * and stored `delayMs` after the last one, or straight away when the page is hidden or goes away.
 * A read of a name with a write still waiting answers with what is waiting.
 */
export function createDebouncedJsonStorage<S>(storage: StateStorage, delayMs: number): PersistStorage<S> {
  // What each name is waiting to have written. A write takes the value out, so a name written
  // early, or removed, has nothing left by the time its debounce comes round.
  const waiting = new Map<string, StorageValue<S>>();

  const write = async (name: string) => {
    const value = waiting.get(name);
    if (value === undefined) return;
    waiting.delete(name);
    try {
      await storage.setItem(name, JSON.stringify(value));
    } catch (error) {
      console.warn(`ElvenAssist: Failed to store ${name}:`, error);
    }
  };

  const changeSubject = new Subject<string>();
  changeSubject
    .pipe(
      groupBy((name) => name),
      mergeMap((group) => group.pipe(debounceTime(delayMs))),
    )
    .subscribe((name) => void write(name));

  const writeAll = () => {
    for (const name of [...waiting.keys()]) {
      void write(name);
    }
  };
  globalThis.addEventListener?.('pagehide', writeAll);
  globalThis.document?.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      writeAll();
    }
  });

  return {
    getItem: async (name) => {
      const value = waiting.get(name);
      if (value !== undefined) return value;
      const raw = await storage.getItem(name);
      return raw === null ? null : (JSON.parse(raw) as StorageValue<S>);
    },
    setItem: (name, value) => {
      waiting.set(name, value);
      changeSubject.next(name);
    },
    removeItem: async (name) => {
      waiting.delete(name);
      await storage.removeItem(name);
    },
  };
}
