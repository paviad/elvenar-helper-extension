export function getDecodedText(request: XMLHttpRequest) {
  let decodedResponse: string | null = null;
  if (request.responseType === '' || request.responseType === 'text') {
    decodedResponse = request.responseText;
  } else if (request.responseType === 'arraybuffer' && request.response instanceof ArrayBuffer) {
    try {
      decodedResponse = new TextDecoder().decode(request.response);
    } catch (e) {
      console.log('Intercepted XHR Response (ArrayBuffer): decode failed');
    }
  } else {
    // console.log('Intercepted XHR Response URL:', this.responseURL);
    console.log('Intercepted XHR Response Type:', request.responseType);
  }
  return decodedResponse;
}
