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
