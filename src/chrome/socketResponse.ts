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
