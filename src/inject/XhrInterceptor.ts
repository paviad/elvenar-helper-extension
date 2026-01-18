import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { decodeRequestBody } from './decodeRequestBody';
import { getDecodedText } from './getDecodedText';
import { nonSpecificMatchers } from './nonSpecificMatchers';
import { NonSpecificMessage } from './nonSpecificMessages';
import { playerSpecificMatchers } from './playerSpecificMatchers';
import { PlayerSpecificMessage } from './playerSpecificMessages';

declare global {
  interface XMLHttpRequest {
    _requestUrl?: string;
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
      // Add your logic here to modify the request, add headers, etc.
      originalOpen.call(this, method, url, async as boolean, user, password);
    };

    // Intercept the response
    XMLHttpRequest.prototype.send = function (body, ...args) {
      const originalOnReadyStateChange = this.onreadystatechange;
      const requestUrl = toAbsoluteUrl(this._requestUrl || '');
      const nonSpecificMatchFound = nonSpecificMatchers.find((matcher) => requestUrl.match(matcher.regex));

      const urlMatcher = /^(https:\/\/(.*?)\.elvenar\.com\/)game\/json\?h=([\w\d]+)$/;
      let playerSpecificMatchFound: (typeof playerSpecificMatchers)[0] | undefined;

      const urlMatch = requestUrl.match(urlMatcher);

      const sharedInfo: ExtensionSharedInfo = {
        reqUrl: '',
        reqReferrer: '',
        worldId: '',
        sessionId: '',
        tabId: -1,
        reqBody: '',
      };

      let notificationServiceRequest: ElvenarRequestEntry | undefined;

      if (urlMatch) {
        const decodedString = decodeRequestBody(body);

        const parsedRequest = parseElvenarRequest(decodedString);
        notificationServiceRequest = parsedRequest.find(
          (req) =>
            req.requestClass === 'NotificationService' &&
            ['getAllNotifications', 'getPreviewNotifications'].includes(req.requestMethod),
        );

        const referer = urlMatch[1];
        const worldId = urlMatch[2];
        const sessionId = urlMatch[3];

        sharedInfo.reqReferrer = referer;
        sharedInfo.worldId = worldId;
        sharedInfo.reqUrl = requestUrl;
        sharedInfo.sessionId = sessionId;
        sharedInfo.reqBody = decodedString;

        playerSpecificMatchFound = playerSpecificMatchers.find((matcher) => decodedString.match(matcher.regex));
      }

      this.onreadystatechange = (...cbArgs) => {
        if (this.readyState === 4) {
          if (notificationServiceRequest) {
            const decodedResponse = getDecodedText(this);
            if (decodedResponse) {
              const message = {
                type: 'NOTIFICATIONS',
                specific: true,
                payload: {
                  decodedResponse,
                  sharedInfo,
                },
              } satisfies PlayerSpecificMessage;
              window.postMessage(message, '*');
            }
          }

          if (nonSpecificMatchFound) {
            const decodedResponse = getDecodedText(this);
            if (decodedResponse) {
              const message = {
                type: nonSpecificMatchFound.messageType,
                specific: false,
                payload: {
                  decodedResponse,
                  sharedInfo,
                },
              } satisfies NonSpecificMessage;
              window.postMessage(message, '*');
            }
          }

          if (playerSpecificMatchFound) {
            const decodedResponse = getDecodedText(this);
            if (decodedResponse) {
              const message = {
                type: playerSpecificMatchFound.messageType,
                specific: true,
                payload: {
                  decodedResponse,
                  sharedInfo,
                },
              } satisfies PlayerSpecificMessage;
              window.postMessage(message, '*');
            }
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

interface ElvenarRequestEntry {
  __class__: string;
  requestData: unknown;
  requestClass: string;
  requestMethod: string;
  requestId: number;
}

function parseElvenarRequest(requestBody: string): ElvenarRequestEntry[] {
  const requestJson = requestBody.substring(10);
  const parsed = JSON.parse(requestJson) as ElvenarRequestEntry[];
  return parsed;
}
