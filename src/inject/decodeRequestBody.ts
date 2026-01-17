export function decodeRequestBody(body: Document | XMLHttpRequestBodyInit | null | undefined): string {
  if (!body) {
    return '';
  }

  const decoder = new TextDecoder('utf-8'); // Specify the encoding, UTF-8 is common
  let decodedString: string;
  if (body instanceof ArrayBuffer) {
    decodedString = decoder.decode(new Uint8Array(body));
  } else if (body instanceof Uint8Array) {
    decodedString = decoder.decode(body);
  } else if (typeof body === 'string') {
    decodedString = body;
  } else {
    decodedString = '';
  }
  return decodedString;
}
