import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { decodeRequestBody } from './decodeRequestBody';
import { ElvenarRequestResponseEntry } from '../model/elvenarRequestResponseEntry';
import { getDecodedText } from './getDecodedText';
import { nonSpecificMatchers, NonSpecificMatcherSpecification } from './nonSpecificMatchers';
import { NonSpecificMessage } from './nonSpecificMessages';
import { playerSpecificMatchers, PlayerSpecificMatcherSpecification } from './playerSpecificMatchers';
import { PlayerSpecificMessage } from './playerSpecificMessages';

declare global {
  interface XMLHttpRequest {
    _requestUrl?: string;
    sharedInfo: ExtensionSharedInfo;
    urlMatch?: RegExpMatchArray | null;
    nonSpecificMatchFound?: NonSpecificMatcherSpecification;
    matchesFound: PlayerSpecificMatcherSpecification[];
  }
}

export class GlobalHttpInterceptorService {
  constructor() {
    this.initInterceptor();
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

      this.matchesFound = [];
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

        const requestSelectorMatches = playerSpecificMatchers.filter(
          (matcher) =>
            matcher.requestSelector &&
            requestGeneric.some(
              (entry) =>
                entry.requestClass === matcher.requestSelector?.requestClass &&
                entry.requestMethod === matcher.requestSelector?.requestMethod,
            ),
        );

        const playerSpecificMatchesFound = playerSpecificMatchers.filter(
          (matcher) => matcher.regex && decodedString.match(matcher.regex),
        );

        // Combine requestSelectorMatches and playerSpecificMatchesFound
        this.matchesFound = [...requestSelectorMatches, ...playerSpecificMatchesFound];
      }

      this.onreadystatechange = (...cbArgs) => {
        if (this.readyState === 4) {
          const decodedResponse = getDecodedText(this);

          try {
            if (decodedResponse) {
              if (this.urlMatch) {
                const responseGeneric = JSON.parse(decodedResponse) as ElvenarRequestResponseEntry[];

                const responseSelectorMatches = playerSpecificMatchers.filter(
                  (matcher) =>
                    matcher.responseSelector &&
                    responseGeneric.some(
                      (entry) =>
                        entry.requestClass === matcher.responseSelector?.requestClass &&
                        entry.requestMethod === matcher.responseSelector?.requestMethod,
                    ),
                );

                this.matchesFound.push(...responseSelectorMatches);

                for (const match of this.matchesFound) {
                  if (match.local) {
                    match.local?.(decodedResponse, this.sharedInfo);
                  }
                  const message = {
                    type: match.messageType,
                    specific: true,
                    payload: {
                      decodedResponse,
                      sharedInfo: this.sharedInfo,
                    },
                  } satisfies PlayerSpecificMessage;
                  window.postMessage(message, '*');
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
