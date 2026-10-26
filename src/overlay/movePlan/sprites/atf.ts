/**
 * The game's texture files: Adobe's ATF container holding DXT-compressed pixels. Every building
 * atlas seen (2026-10-26) is ATF version 3 with raw DXT5 - after the 16-byte header, the largest
 * picture's DXT data, then the PVRTC, ETC1 and ETC2 versions the format allows for other devices,
 * all left empty, then the smaller sizes. Only the largest DXT picture is read.
 */

export interface AtfTexture {
  width: number;
  height: number;
  format: 'dxt1' | 'dxt5';
  /** The largest picture's DXT blocks. */
  data: Uint8Array;
}

/** The raw-compressed formats, the only ones that are plain DXT inside. */
const FORMATS: Record<number, AtfTexture['format']> = { 3: 'dxt1', 5: 'dxt5' };

const u32 = (bytes: Uint8Array, at: number) =>
  ((bytes[at] << 24) | (bytes[at + 1] << 16) | (bytes[at + 2] << 8) | bytes[at + 3]) >>> 0;

export const parseAtf = (bytes: Uint8Array): AtfTexture | undefined => {
  const signed = bytes[0] === 0x41 && bytes[1] === 0x54 && bytes[2] === 0x46; // 'ATF'
  // Byte 6 is 0xFF from version 2 on, where the header is the 16 bytes read here.
  if (bytes.length < 20 || !signed || bytes[6] !== 0xff) return undefined;
  const kind = bytes[12];
  // A cube map is six pictures, which no building is.
  const format = kind & 0x80 ? undefined : FORMATS[kind & 0x7f];
  if (!format) return undefined;

  const width = 1 << bytes[13];
  const height = 1 << bytes[14];
  const length = u32(bytes, 16);
  const expected = Math.max(1, width / 4) * Math.max(1, height / 4) * (format === 'dxt5' ? 16 : 8);
  if (length !== expected || bytes.length < 20 + length) return undefined;
  return { width, height, format, data: bytes.subarray(20, 20 + length) };
};

const expand565 = (c: number): [number, number, number] => [
  Math.round(((c >> 11) & 31) * (255 / 31)),
  Math.round(((c >> 5) & 63) * (255 / 63)),
  Math.round((c & 31) * (255 / 31)),
];

/** The four colours a block's two end colours make. DXT1 drops to three and transparency when c0 <= c1. */
const palette = (c0: number, c1: number, threeColour: boolean) => {
  const a = expand565(c0);
  const b = expand565(c1);
  const mix = (p: number, q: number, wp: number, wq: number) =>
    a.map((_, i) => Math.round(([a, b][p][i] * wp + [a, b][q][i] * wq) / (wp + wq)));
  return threeColour
    ? [
        [...a, 255],
        [...b, 255],
        [...mix(0, 1, 1, 1), 255],
        [0, 0, 0, 0],
      ]
    : [
        [...a, 255],
        [...b, 255],
        [...mix(0, 1, 2, 1), 255],
        [...mix(0, 1, 1, 2), 255],
      ];
};

/** The eight alpha values a DXT5 block's two end values make. */
const alphas = (a0: number, a1: number) =>
  a0 > a1
    ? [a0, a1, ...[1, 2, 3, 4, 5, 6].map((i) => Math.round(((7 - i) * a0 + i * a1) / 7))]
    : [a0, a1, ...[1, 2, 3, 4].map((i) => Math.round(((5 - i) * a0 + i * a1) / 5)), 0, 255];

/** The texture's pixels, RGBA, row by row. */
export const decodeDxt = ({ width, height, format, data }: AtfTexture): Uint8ClampedArray<ArrayBuffer> => {
  const pixels = new Uint8ClampedArray(width * height * 4);
  const blockBytes = format === 'dxt5' ? 16 : 8;
  let at = 0;
  for (let by = 0; by < height; by += 4) {
    for (let bx = 0; bx < width; bx += 4, at += blockBytes) {
      let alphaOf: ((i: number) => number) | undefined;
      let colour = at;
      if (format === 'dxt5') {
        const values = alphas(data[at], data[at + 1]);
        // 48 bits of 3-bit indices, least significant first. They split evenly at the eighth
        // pixel, so two 24-bit halves stand in for one number too wide for bit operations.
        const low = data[at + 2] | (data[at + 3] << 8) | (data[at + 4] << 16);
        const high = data[at + 5] | (data[at + 6] << 8) | (data[at + 7] << 16);
        alphaOf = (i) => values[i < 8 ? (low >> (3 * i)) & 7 : (high >> (3 * (i - 8))) & 7];
        colour = at + 8;
      }
      const c0 = data[colour] | (data[colour + 1] << 8);
      const c1 = data[colour + 2] | (data[colour + 3] << 8);
      const colours = palette(c0, c1, format === 'dxt1' && c0 <= c1);
      const indices =
        (data[colour + 4] | (data[colour + 5] << 8) | (data[colour + 6] << 16) | (data[colour + 7] << 24)) >>> 0;

      for (let i = 0; i < 16; i++) {
        const x = bx + (i & 3);
        const y = by + (i >> 2);
        if (x >= width || y >= height) continue;
        const [r, g, b, a] = colours[(indices >>> (2 * i)) & 3];
        const p = (y * width + x) * 4;
        pixels[p] = r;
        pixels[p + 1] = g;
        pixels[p + 2] = b;
        pixels[p + 3] = alphaOf ? alphaOf(i) : a;
      }
    }
  }
  return pixels;
};
