/* eslint-disable @typescript-eslint/unbound-method */
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { decodeRequestBody } from './decodeRequestBody';
import { ElvenarRequestResponseEntry } from '../model/elvenarRequestResponseEntry';
import { getDecodedText } from './getDecodedText';
import { nonSpecificMatchers, NonSpecificMatcherSpecification } from './nonSpecificMatchers';
import { NonSpecificMessage } from './nonSpecificMessages';
import { playerSpecificMatchers } from './playerSpecificMatchers';
import { debounceTime, groupBy, mergeMap, Subject } from 'rxjs';
import { AggregateRequestResponse } from '../chrome/aggregateRequestResponse';

declare global {
  interface XMLHttpRequest {
    _requestUrl?: string;
    sharedInfo: ExtensionSharedInfo;
    urlMatch?: RegExpMatchArray | null;
    nonSpecificMatchFound?: NonSpecificMatcherSpecification;
  }
}

const requestMap = new Map<number, AggregateRequestResponse>();
const responseSubject = new Subject<number>();
const responseObservable = responseSubject.pipe(
  groupBy((requestId) => requestId),
  mergeMap((group) => group.pipe(debounceTime(300))),
);

const addRequest = (request: ElvenarRequestResponseEntry, nonce: string, sharedInfo: ExtensionSharedInfo): void => {
  if (!request.requestId) {
    return;
  }
  requestMap.set(request.requestId, { request, nonce, sharedInfo, response: [] });
};

const addResponse = (response: ElvenarRequestResponseEntry): void => {
  const existingEntry = requestMap.get(response.requestId);
  if (!existingEntry) {
    return;
  }
  existingEntry.response.push(response);
  responseSubject.next(response.requestId);
};

export class GlobalHttpInterceptorService {
  constructor() {
    this.initInterceptor();

    responseObservable.subscribe((requestId) => {
      const entry = requestMap.get(requestId);
      if (entry) {
        for (const matcher of playerSpecificMatchers.filter((r) => r.responseSelector && r.local)) {
          for (const response of entry.response) {
            if (
              matcher.responseSelector!.requestClass === response.requestClass &&
              matcher.responseSelector!.requestMethod === response.requestMethod
            ) {
              // console.log('AggregateRequestResponse matches playerSpecificMatcher response', matcher.id, payload);

              matcher.local!([response]).catch((error) => {
                console.error('Error in local handler for messageType', matcher, error);
              });
            }
          }
        }

        const message = {
          type: 'aggregateRequestResponse',
          payload: entry,
        };
        window.postMessage(message, '*');
      }
    });
  }

  private initInterceptor(): void {
    // Store the original methods of XMLHttpRequest
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;

    // Intercept requests before they are sent
    XMLHttpRequest.prototype.open = function (
      method: string,
      url: string | URL,
      async = true,
      user?: string | null,
      password?: string | null,
    ) {
      this._requestUrl = url.toString();

      this.sharedInfo = {
        reqUrl: '',
        reqReferrer: '',
        worldId: '',
        sessionId: '',
        tabId: -1,
        reqBody: '',
      };

      // Add your logic here to modify the request, add headers, etc.
      originalOpen.call(this, method, url, async as boolean, user, password);
    };

    // Intercept the response
    XMLHttpRequest.prototype.send = function (body, ...args) {
      const originalOnReadyStateChange = this.onreadystatechange;
      const requestUrl = toAbsoluteUrl(this._requestUrl || '');
      this.nonSpecificMatchFound = nonSpecificMatchers.find((matcher) => requestUrl.match(matcher.regex));

      const urlMatcher = /^(https:\/\/(.*?)\.elvenar\.com\/)game\/json\?h=([\w\d]+)$/;

      this.urlMatch = requestUrl.match(urlMatcher);

      if (!this.urlMatch && !this.nonSpecificMatchFound) {
        originalSend.apply(this, [body, ...args]);
        return;
      }

      if (this.urlMatch) {
        const decodedString = decodeRequestBody(body);

        const referer = this.urlMatch[1];
        const worldId = this.urlMatch[2];
        const sessionId = this.urlMatch[3];

        this.sharedInfo.reqReferrer = referer;
        this.sharedInfo.worldId = worldId;
        this.sharedInfo.reqUrl = requestUrl;
        this.sharedInfo.sessionId = sessionId;
        this.sharedInfo.reqBody = decodedString;

        const requestGeneric = JSON.parse(decodedString.substring(10)) as ElvenarRequestResponseEntry[];

        const requestNonce = decodedString.substring(0, 10);
        for (const request of requestGeneric) {
          addRequest(request, requestNonce, this.sharedInfo);
        }
      }

      this.onreadystatechange = (...cbArgs) => {
        if (this.readyState === 4) {
          const decodedResponse = getDecodedText(this);

          try {
            if (decodedResponse) {
              if (this.urlMatch) {
                const responseGeneric = JSON.parse(decodedResponse) as ElvenarRequestResponseEntry[];

                for (const response of responseGeneric) {
                  addResponse(response);
                }
              }

              if (this.nonSpecificMatchFound) {
                const message = {
                  type: this.nonSpecificMatchFound.messageType,
                  specific: false,
                  payload: {
                    decodedResponse,
                    sharedInfo: this.sharedInfo,
                  },
                } satisfies NonSpecificMessage;
                window.postMessage(message, '*');
              }
            }
          } catch (error) {
            console.error('Error parsing response JSON:', error);
          }
        }

        // Call the original onreadystatechange
        if (originalOnReadyStateChange) {
          originalOnReadyStateChange.apply(this, cbArgs);
        }
      };

      originalSend.apply(this, [body, ...args]);
    };
  }
}

function toAbsoluteUrl(url: string): string {
  if (!url) {
    return url;
  }

  // Handles protocol-relative URLs (//example.com)
  if (url.startsWith('//')) {
    return window.location.protocol + url;
  }
  // Handles other relative URLs
  try {
    return new URL(url, window.location.href).href;
  } catch {
    return url; // fallback if URL is invalid
  }
}
