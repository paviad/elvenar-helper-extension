/**
 * Noticing that this script has been orphaned.
 *
 * When the extension is reloaded, updated or disabled, the scripts it injected into open pages
 * keep running but are cut off from it: `chrome.runtime.id` goes undefined and every chrome API
 * call throws 'Extension context invalidated'. Nothing but reloading the page recovers from that,
 * so the panel has to say so.
 *
 * This is NOT the service worker going to sleep. Under MV3 it is unloaded after a few seconds of
 * idling and the next message wakes it again, which is normal and needs no telling off. Only
 * invalidation counts here.
 */

/** How often the poll below looks. A local property read, so this can afford to be brisk. */
const POLL_INTERVAL_MS = 2000;

const INVALIDATED_MESSAGE = /Extension context invalidated/i;

/** True while this script can still reach the extension. */
export const isExtensionContextValid = () => !!chrome.runtime?.id;

let contextLost = false;
const listeners = new Set<() => void>();

const markContextLost = () => {
  if (contextLost) return;
  contextLost = true;
  for (const listener of [...listeners]) {
    listener();
  }
  listeners.clear();
};

/**
 * Run `callback` once the context is gone - immediately if it already is. It fires at most once,
 * because there is no way back from here.
 */
export const onExtensionContextLost = (callback: () => void) => {
  if (contextLost) {
    callback();
    return;
  }
  listeners.add(callback);
  if (!isExtensionContextValid()) {
    markContextLost();
  }
};

/**
 * Hand a failed chrome API call to this. Our own traffic is the quickest detector we have - the
 * game keeps it busy - so a send that fails because the context died reports it well before the
 * poll would come round. A failure with the context still intact is left alone: sends fail for
 * reasons that are none of our business, and crossing the panel out over one would be wrong.
 */
export const reportPossibleContextLoss = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  if (isExtensionContextValid() && !INVALIDATED_MESSAGE.test(message)) return;
  markContextLost();
};

/**
 * Watch for the context going away with nothing else going on. Reading `chrome.runtime.id` is a
 * local property read - it sends no message, so the service worker is left asleep - which is what
 * makes polling it affordable. A background tab throttles the timer to about once a minute, hence
 * the extra look when the tab comes back to the front.
 */
export const watchExtensionContext = () => {
  if (contextLost) return;

  const check = () => {
    if (isExtensionContextValid()) return;
    markContextLost();
  };

  const timer = setInterval(check, POLL_INTERVAL_MS);
  document.addEventListener('visibilitychange', check);

  onExtensionContextLost(() => {
    clearInterval(timer);
    document.removeEventListener('visibilitychange', check);
  });

  check();
};
