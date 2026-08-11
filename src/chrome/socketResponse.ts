import { PlayerSpecificMessage } from '../inject/playerSpecificMessages';
import { SocketResponseMessage } from '../inject/socketResponses';
import { sendInterceptedPlayerSpecificRequest } from './messages';

/**
 * Relays websocket-pushed responses to the service worker as ordinary `R:` messages.
 *
 * The injected script has already checked them against the matchers, so everything arriving
 * here is wanted. Only the response half exists — a push answers no request — so the response
 * entry stands in for its own request, which is what the processors that ignore the request
 * argument were always given anyway.
 */
export const setupSocketResponseListener = (): void => {
  window.addEventListener('message', (event) => {
    async function Do() {
      if (event.source !== window || !event.data || event.data.type !== 'socketResponse') {
        return;
      }

      const { responses, sharedInfo } = (event.data as SocketResponseMessage).payload;

      for (const response of responses) {
        // Kept, not scaffolding, and matching the line the HTTP path logs for every aggregate.
        // A pushed response is otherwise invisible - nothing asked for it, so its absence looks
        // exactly like a quiet guild, and that is what made a wonder's total go stale for a week
        // without anywhere to look. Whether one of these arrived is the first question every
        // time, and the point of the E: prefix is that a line worth keeping can say so.
        console.log('E:', 'socket', response.requestClass, response.requestMethod, response);

        const message = {
          type: `R:${response.requestClass}/${response.requestMethod}`,
          specific: true,
          payload: { request: response, response: [response], sharedInfo },
        } satisfies PlayerSpecificMessage;

        await sendInterceptedPlayerSpecificRequest(message);
      }
    }

    Do().catch((error) => {
      console.error('Error processing socketResponse message:', error);
    });
  });
};
