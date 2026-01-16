import { getDecodedText } from './getDecodedText';
import { InjectMessage } from './injectMessages';
import { matchers } from './matchers';

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
      // Add your logic here to modify the request, add headers, etc.
      originalOpen.call(this, method, url, async as boolean, user, password);
    };

    // Intercept the response
    XMLHttpRequest.prototype.send = function (...args) {
      const originalOnReadyStateChange = this.onreadystatechange;

      this.onreadystatechange = (...cbArgs) => {
        const matchFound = matchers.find((matcher) => this.responseURL.match(matcher.regex));
        if (matchFound) {
          console.log(`XHR Interceptor: Matched ${matchFound.id} for URL: ${this.responseURL}, readyState: ${this.readyState}`);
          if (this.readyState === 4) {
            // Add your logic here to handle the response if needed
            // console.log('Intercepted XHR Response URL:', this.responseURL);

            const decodedResponse = getDecodedText(this);
            if (decodedResponse) {
              const payload = matchFound.processor(decodedResponse);
              const message = {
                type: matchFound.messageType,
                payload: payload,
              };
              window.postMessage(message, '*');
            }
          }
        }

        // Call the original onreadystatechange
        if (originalOnReadyStateChange) {
          originalOnReadyStateChange.apply(this, cbArgs);
        }
      };

      originalSend.apply(this, args);
    };
  }
}
