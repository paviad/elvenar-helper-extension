import { ElvenarRequestResponseEntry } from '../model/elvenarRequestResponseEntry';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { playerSpecificMatchers } from './playerSpecificMatchers';

/**
 * Responses the game pushed down the websocket instead of answering a request with.
 *
 * They carry the same `ServerResponseVO` shape as the HTTP ones, so the service worker's
 * processors take them unchanged. What they do not carry is a request to pair them with or a
 * session of their own, which is why they travel separately from `aggregateRequestResponse`
 * rather than being dressed up as one.
 */
export interface SocketResponseMessage {
  type: 'socketResponse';
  payload: {
    responses: ElvenarRequestResponseEntry[];
    sharedInfo: ExtensionSharedInfo;
  };
}

/**
 * The responses in a socket frame that the service worker wants, which is the same table the
 * HTTP path consults. Matchers with a local handler are left out: those run in the page, and
 * the socket path has already run them by the time this is asked.
 *
 * A frame that is not an array of responses — chat traffic, a STOMP receipt — yields nothing.
 */
export function matchedSocketResponses(body: unknown): ElvenarRequestResponseEntry[] {
  if (!Array.isArray(body)) {
    return [];
  }

  return (body as ElvenarRequestResponseEntry[]).filter(
    (response) =>
      response?.__class__ &&
      playerSpecificMatchers.some(
        (matcher) =>
          matcher.responseSelector &&
          !matcher.local &&
          matcher.responseSelector.requestClass === response.requestClass &&
          matcher.responseSelector.requestMethod === response.requestMethod,
      ),
  );
}

/** How long a response stays remembered. Repeats land within milliseconds of each other. */
const REPEAT_WINDOW_MS = 5000;

/** How many responses to remember. A burst is a handful; this is room to spare. */
const REPEAT_CAPACITY = 32;

/**
 * Drops responses the server has only just sent us already.
 *
 * It sends the same notification several times over — one contribution to a wonder arrives as
 * five separate STOMP messages, each with its own uuid and message id, all saying the same
 * thing. Nothing in the frame marks a repeat, so the payload has to speak for itself.
 *
 * Safe to drop because every response the matchers want carries a state of the world rather
 * than a change to it: a wonder's phase reports the total invested, not the increment. Acting
 * on an identical one a second time would arrive at the state it is already in — the work was
 * only ever wasted, never load-bearing. The window keeps that claim narrow: a genuine response
 * that happens to be identical minutes later is still let through, since by then it is news
 * that the state has come back round rather than an echo of the same event.
 *
 * `now` is passed in rather than read, so the window can be exercised without waiting on it.
 */
export function createRepeatFilter({ windowMs = REPEAT_WINDOW_MS, capacity = REPEAT_CAPACITY } = {}) {
  let seen: { key: string; at: number }[] = [];

  return (responses: ElvenarRequestResponseEntry[], now: number): ElvenarRequestResponseEntry[] => {
    seen = seen.filter((entry) => now - entry.at <= windowMs);

    const fresh = responses.filter((response) => {
      const key = JSON.stringify(response);
      if (seen.some((entry) => entry.key === key)) {
        return false;
      }
      seen.push({ key, at: now });
      return true;
    });

    if (seen.length > capacity) {
      seen = seen.slice(-capacity);
    }
    return fresh;
  };
}
