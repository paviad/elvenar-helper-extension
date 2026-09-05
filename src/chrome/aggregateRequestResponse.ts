import { playerSpecificMatchers } from '../inject/playerSpecificMatchers';
import { PlayerSpecificMessage } from '../inject/playerSpecificMessages';
import { ElvenarRequestResponseEntry } from '../model/elvenarRequestResponseEntry';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { sendInterceptedPlayerSpecificRequest } from './messages';

export interface AggregateRequestResponse {
  request: ElvenarRequestResponseEntry;
  nonce: string;
  sharedInfo: ExtensionSharedInfo;
  response: ElvenarRequestResponseEntry[];
}

export const setupAggregateRequestResponseListener = (): void => {
  window.addEventListener('message', (event) => {
    async function Do() {
      if (event.source !== window || !event.data || event.data.type !== 'aggregateRequestResponse') {
        return;
      }

      const payload = event.data.payload as AggregateRequestResponse;

      const requestClass = payload.request.requestClass;
      const requestMethod = payload.request.requestMethod;

      // Asked of the table once per thing to send, rather than sending once per matcher that
      // wants it. The table is allowed to name the same call twice, and what goes out says only
      // which call it is — so a second send would put identical data through the same processors
      // again rather than carrying anything new.
      const wanted = (selector: 'requestSelector' | 'responseSelector', entry: ElvenarRequestResponseEntry) =>
        playerSpecificMatchers.some(
          (matcher) =>
            matcher[selector]?.requestClass === entry.requestClass &&
            matcher[selector]?.requestMethod === entry.requestMethod,
        );

      if (wanted('requestSelector', payload.request)) {
        const message = {
          type: `Q:${requestClass}/${requestMethod}`,
          specific: true,
          payload: {
            request: payload.request,
            response: payload.response,
            sharedInfo: payload.sharedInfo,
          },
        } satisfies PlayerSpecificMessage;

        await sendInterceptedPlayerSpecificRequest(message);
      }

      for (const response of payload.response) {
        if (!wanted('responseSelector', response)) {
          continue;
        }

        const message = {
          type: `R:${response.requestClass}/${response.requestMethod}`,
          specific: true,
          payload: {
            request: payload.request,
            response: [response],
            sharedInfo: payload.sharedInfo,
          },
        } satisfies PlayerSpecificMessage;

        await sendInterceptedPlayerSpecificRequest(message);
      }
    }

    Do().catch((error) => {
      console.error('Error processing aggregateRequestResponse message:', error);
    });
  });
};
