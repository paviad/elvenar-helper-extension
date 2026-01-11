const COMPRESSION_PREFIX = 'ZIP:';

/**
 * Compresses a string using the native browser CompressionStream API.
 * Returns the compressed string (Base64) only if it is smaller than the input.
 */
export async function smartCompress(input: string): Promise<string> {
  if (!input || input.length === 0) return input;

  try {
    // 1. Encode string to byte stream
    const stream = new Blob([input]).stream();

    // 2. Compress using 'deflate' (or 'gzip')
    const compressedStream = stream.pipeThrough(new CompressionStream('deflate'));

    // 3. Read the stream and convert to Base64
    const response = await new Response(compressedStream);
    const blob = await response.blob();
    const buffer = await blob.arrayBuffer();

    // Convert ArrayBuffer to Base64
    const base64Compressed = arrayBufferToBase64(buffer);

    // 4. Compare sizes
    const finalSize = base64Compressed.length + COMPRESSION_PREFIX.length;

    if (finalSize < input.length) {
      return `${COMPRESSION_PREFIX}${base64Compressed}`;
    }

    return input;
  } catch (error) {
    console.warn('Compression failed, falling back to plain text:', error);
    return input;
  }
}

/**
 * Decompresses a string using the native browser DecompressionStream API.
 */
export async function smartDecompress(input: string): Promise<string> {
  if (!input || !input.startsWith(COMPRESSION_PREFIX)) {
    return input;
  }

  try {
    // 1. Remove Prefix and convert Base64 to binary
    const rawBase64 = input.slice(COMPRESSION_PREFIX.length);
    const binaryString = atob(rawBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // 2. Decompress
    const stream = new Blob([bytes]).stream();
    const decompressedStream = stream.pipeThrough(new DecompressionStream('deflate'));

    // 3. Decode back to text
    const response = await new Response(decompressedStream);
    return await response.text();
  } catch (error) {
    console.error('Decompression failed:', error);
    return input;
  }
}

// --- Helper Utility ---

/**
 * Converts an ArrayBuffer to a Base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
