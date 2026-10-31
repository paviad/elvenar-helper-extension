import { MessageResponses } from '../chrome/messages';
import { CauldronSync } from './cauldronSync';

/*
 * Content script on the Cauldron Optimizer site. When the player opens the cauldron in the game,
 * the service worker sends a CauldronSync here; when the player presses the site's "Fill from the
 * game" button, this asks the service worker for the latest one. Either way it gives the page the
 * city's name, which the active world takes if the player never named it, then fills in the
 * diplomas, premium ingredients, selected effects, wonder level and Witch Points and saves, all
 * through the API the site offers extensions (autofill.js on the site, version 9).
 */

/**
 * The sync not yet carried out, kept in the tab's sessionStorage, which outlives a reload. It
 * waits out the reload a world switch causes, and a page that has no API to answer: only the
 * optimizer's home page has one, so a sync arriving while the tab shows its results stays here
 * until the player is back there.
 */
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

const savePending = (sync: CauldronSync) => {
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(sync));
  } catch {
    /* storage blocked: only a sync the page cannot take right now is lost */
  }
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

/** First the city's world, then the fill once the page answers. */
const start = (sync: CauldronSync) => {
  // Kept until the page answers; a page without the API never does
  savePending(sync);
  selecting = sync;
  post({ type: 'cauldron:selectWorld', name: sync.worldName, create: true });
};

const autofill = (sync: CauldronSync) => {
  filling = true;
  // Saved too: the world then keeps the numbers without the player having to. Only ever our own
  // world is selected here, and every sync sends this week's numbers again, so nothing kept goes
  // stale.
  post({
    type: 'cauldron:autofill',
    n_diploma: sync.diplomas,
    premium_ingr: sync.premiumIngredients,
    selected_effects: sync.selectedEffects,
    wonder_level: sync.wonderLevel,
    // The site takes 1 or more; a bad field would refuse the whole fill, save included
    wp_max: sync.witchPoints && sync.witchPoints >= 1 ? sync.witchPoints : undefined,
    save: true,
  });
};

/** Lets the page tell an installed ElvenAssist from none, and which version answers it. */
const announce = () =>
  post({
    type: 'cauldron:extension',
    name: 'ElvenAssist',
    // The release, major.minor.patch
    version: (chrome.runtime.getManifest().version as string).split('.').slice(0, 3).join('.'),
    supports: ['request'],
  });

/** The page's "Fill from the game" button: the latest data, or word that there is none yet. */
const answerRequest = async () => {
  let sync: MessageResponses['cauldronRequest'] | undefined;
  try {
    sync = (await chrome.runtime.sendMessage({ type: 'cauldronRequest' })) as typeof sync;
  } catch {
    // The extension was reloaded under this page: left unanswered, the page explains what to do
    return;
  }
  if (sync) {
    start(sync);
  } else {
    post({ type: 'cauldron:request:result', ok: false, code: 'no_data' });
  }
};

const refused = (what: string, result: ApiResult) => {
  // complement_mode is the player's own doing ("Complete effects" is on), not a fault
  const log = result.code === 'complement_mode' ? console.log : console.warn;
  log(`ElvenAssist: Cauldron Optimizer refused ${what}`, result.code, result.errors);
};

chrome.runtime.onMessage.addListener((message: { type: string; payload: CauldronSync }) => {
  if (message.type === 'cauldronSync') {
    start(message.payload);
  }
  return undefined;
});

window.addEventListener('message', (event) => {
  if (event.source !== window) {
    return;
  }

  if (event.data?.type === 'cauldron:ready') {
    announce();
  }

  if (event.data?.type === 'cauldron:request') {
    void answerRequest();
  }

  if (event.data?.type === 'cauldron:selectWorld:result' && selecting) {
    const sync = selecting;
    selecting = undefined;
    const result = event.data as ApiResult & { reloading: boolean };
    if (result.reloading) {
      // The page reloads itself a moment after answering; the sync, still kept, starts again there
      return;
    }
    takePending();
    if (result.ok) {
      autofill(sync);
    } else {
      refused('to select the world', result);
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

// Running at document_idle, the site's API listener is already up (on the home page) and its ready
// announcement already gone, so announce ourselves and start a sync still kept from before this
// load straight away; back from a world switch, the world is then already selected and the fill
// follows at once.
announce();
const pending = takePending();
if (pending) {
  start(pending);
}
