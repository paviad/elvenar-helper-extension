import { EventChestArrival, EventChestMessage } from '../inject/local/eventChestTiming';
import { getOverlayStore } from './overlayStore';

/**
 * The latest event chest the page reported since it loaded, which is what says whether the clock
 * is running. Not persisted: a reload starts the clock over, and this along with it.
 */
let latest: EventChestArrival | undefined;

const listeners = new Set<(arrival: EventChestArrival | undefined) => void>();

export const getLatestEventChest = () => latest;

export const subscribeToEventChests = (listener: (arrival: EventChestArrival | undefined) => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const setupEventChestListener = () => {
  window.addEventListener('message', (event: MessageEvent<EventChestMessage>) => {
    if (event.source !== window || event.data?.type !== 'eventChest') {
      return;
    }
    latest = event.data.payload;
    const { at, ms } = latest;
    if (ms !== undefined) {
      // A second chest needs the page to have been up a while, so the account's store is there.
      const store = getOverlayStore();
      if (store) {
        store.getState().addEventChestInterval({ at, ms });
      } else {
        console.log('event chest: no account yet, interval not kept', ms);
      }
    }
    listeners.forEach((listener) => listener(latest));
  });
};
