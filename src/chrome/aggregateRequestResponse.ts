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

      console.log('E:', payload.request.requestId, requestClass, requestMethod, payload);

      for (const matcher of playerSpecificMatchers) {
        if (matcher.requestSelector) {
          if (matcher.requestSelector.requestClass === requestClass &&
            matcher.requestSelector.requestMethod === requestMethod) {
            // console.log('AggregateRequestResponse matches playerSpecificMatcher', matcher.id, payload);

            const message = {
              type: `Q:${requestClass}/${requestMethod}`,
              specific: true,
              payload: {
                response: payload.response,
                sharedInfo: payload.sharedInfo,
              },
            } satisfies PlayerSpecificMessage;

            await sendInterceptedPlayerSpecificRequest(message);

            console.log('Sending', message);
          }
        }

        if (matcher.responseSelector) {
          for (const response of payload.response) {
            if (matcher.responseSelector.requestClass === response.requestClass &&
              matcher.responseSelector.requestMethod === response.requestMethod) {
              // console.log('AggregateRequestResponse matches playerSpecificMatcher response', matcher.id, payload);

              const message = {
                type: `R:${response.requestClass}/${response.requestMethod}`,
                specific: true,
                payload: {
                  response: [response],
                  sharedInfo: payload.sharedInfo,
                },
              } satisfies PlayerSpecificMessage;

              await sendInterceptedPlayerSpecificRequest(message);

              console.log('Sending', message);
            }
          }
        }
      }
    }

    Do().catch((error) => {
      console.error('Error processing aggregateRequestResponse message:', error);
    });
  });
};
