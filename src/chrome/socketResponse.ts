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

      for (const [index, response] of responses.entries()) {
        // Deliberately noisy, and matching the line the HTTP path logs. A pushed response is
        // otherwise invisible: nothing asked for it, so its absence looks exactly like a quiet
        // guild. This is what tells a frame that never arrived from one that arrived and was
        // ignored, which is the difference between two very different bugs.
        //
        // The position within the frame is what says whether a repeat is one frame carrying the
        // same news several times over, or the same frame reaching us several times.
        console.log(
          'E:',
          'socket',
          response.requestClass,
          response.requestMethod,
          `${index + 1}/${responses.length}`,
          response,
        );

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
