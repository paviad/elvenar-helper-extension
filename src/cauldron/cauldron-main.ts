import { CauldronSync } from './cauldronSync';

/*
 * Content script on the Cauldron Optimizer site. When the player opens the cauldron in the game,
 * the service worker sends a CauldronSync here. The site keeps settings per named "world", so this
 * has the page switch to the game city's own world (creating it the first time), then fill in the
 * diplomas and premium ingredients and save, all through the API the site offers extensions
 * (autofill.js on the site, version 2).
 */

/** Waits out the reload a world switch causes; the page's sessionStorage outlives it. */
const PENDING_KEY = 'elvenassist:cauldronSync';

interface ApiResult {
  ok: boolean;
  /** A stable reason when not ok: complement_mode, not_found, too_many_worlds, invalid_name, ... */
  code?: string;
  errors: string[];
}

/** What we asked the page for and have not had an answer to, so only our answers are acted on. */
let selecting: CauldronSync | undefined;
let filling = false;

const post = (message: object) => window.postMessage(message, window.location.origin);

const autofill = (sync: CauldronSync) => {
  filling = true;
  // Saved too: the world then keeps the diploma count without the player having to. Only ever our
  // own world is selected here, and the site leaves the premium ingredients out of a save, so
  // nothing is kept that would be wrong next week.
  post({ type: 'cauldron:autofill', n_diploma: sync.diplomas, premium_ingr: sync.premiumIngredients, save: true });
};

const takePending = (): CauldronSync | undefined => {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    sessionStorage.removeItem(PENDING_KEY);
    return raw ? (JSON.parse(raw) as CauldronSync) : undefined;
  } catch {
    return undefined;
  }
};

const refused = (what: string, result: ApiResult) => {
  // complement_mode is the player's own doing ("Complete effects" is on), not a fault
  const log = result.code === 'complement_mode' ? console.log : console.warn;
  log(`ElvenAssist: Cauldron Optimizer refused ${what}`, result.code, result.errors);
};

chrome.runtime.onMessage.addListener((message: { type: string; payload: CauldronSync }) => {
  if (message.type === 'cauldronSync') {
    selecting = message.payload;
    post({ type: 'cauldron:selectWorld', name: message.payload.worldName, create: true });
  }
  return undefined;
});

window.addEventListener('message', (event) => {
  if (event.source !== window) {
    return;
  }

  if (event.data?.type === 'cauldron:selectWorld:result' && selecting) {
    const sync = selecting;
    selecting = undefined;
    const result = event.data as ApiResult & { reloading: boolean };
    if (!result.ok) {
      refused('to select the world', result);
    } else if (result.reloading) {
      // The page reloads itself a moment after answering; the fill waits for the other side
      try {
        sessionStorage.setItem(PENDING_KEY, JSON.stringify(sync));
      } catch {
        /* storage blocked: the world is selected, only this fill is lost */
      }
    } else {
      autofill(sync);
    }
  }

  if (event.data?.type === 'cauldron:autofill:result' && filling) {
    filling = false;
    const result = event.data as ApiResult;
    if (!result.ok) {
      refused('the autofill', result);
    }
  }
});

// Back from the reload a world switch caused. Running at document_idle, the site's API listener is
// already up and its ready announcement already gone, so fill straight away.
const pending = takePending();
if (pending) {
  autofill(pending);
}
