import { decodeDxt, parseAtf } from './atf';
import { parseTextureAtlas, placePicture } from './textureAtlas';

/** An ATF v3 file around one picture's DXT data, the empty blocks for other devices left off. */
const atf = (format: number, log2w: number, log2h: number, data: number[]) => {
  const length = data.length;
  return new Uint8Array([
    0x41,
    0x54,
    0x46,
    0x00,
    0x00,
    0x02,
    0xff,
    0x03,
    0,
    0,
    0,
    0,
    format,
    log2w,
    log2h,
    1,
    (length >>> 24) & 255,
    (length >>> 16) & 255,
    (length >>> 8) & 255,
    length & 255,
    ...data,
  ]);
};

const RED = 0xf800;
const BLUE = 0x001f;
const lo = (c: number) => c & 255;
const hi = (c: number) => c >> 8;

/** A 4 x 4 DXT5 picture: one block. */
const dxt5Block = (a0: number, a1: number, alphaBits: number[], c0: number, c1: number, colourIndices: number[]) => [
  a0,
  a1,
  ...alphaBits,
  lo(c0),
  hi(c0),
  lo(c1),
  hi(c1),
  ...colourIndices,
];

const pixel = (pixels: Uint8ClampedArray, i: number) => [...pixels.slice(i * 4, i * 4 + 4)];

describe('parseAtf', () => {
  it('reads the size, the format and the largest picture’s blocks', () => {
    const texture = parseAtf(atf(5, 2, 2, dxt5Block(255, 255, [0, 0, 0, 0, 0, 0], RED, RED, [0, 0, 0, 0])));

    expect(texture).toMatchObject({ width: 4, height: 4, format: 'dxt5' });
    expect(texture?.data).toHaveLength(16);
  });

  it('turns down a file that is not plain DXT inside', () => {
    expect(parseAtf(atf(2, 2, 2, new Array<number>(16).fill(0)))).toBeUndefined();
    expect(parseAtf(new Uint8Array(32))).toBeUndefined();
  });

  it('turns down a picture whose length does not match its size', () => {
    expect(parseAtf(atf(5, 3, 3, new Array<number>(16).fill(0)))).toBeUndefined();
  });
});

describe('decodeDxt', () => {
  it('gives a block in one colour that colour, at the alpha it names', () => {
    const pixels = decodeDxt(parseAtf(atf(5, 2, 2, dxt5Block(255, 255, [0, 0, 0, 0, 0, 0], RED, RED, [0, 0, 0, 0])))!);

    expect(pixel(pixels, 0)).toEqual([255, 0, 0, 255]);
    expect(pixel(pixels, 15)).toEqual([255, 0, 0, 255]);
  });

  it('mixes the two end colours two thirds and one third', () => {
    // Index 2 for the first pixel, 3 for the second: the two mixes of red and blue.
    const pixels = decodeDxt(
      parseAtf(atf(5, 2, 2, dxt5Block(255, 255, [0, 0, 0, 0, 0, 0], RED, BLUE, [0b1110, 0, 0, 0])))!,
    );

    expect(pixel(pixels, 0).slice(0, 3)).toEqual([170, 0, 85]);
    expect(pixel(pixels, 1).slice(0, 3)).toEqual([85, 0, 170]);
  });

  it('takes each pixel’s alpha from the 3-bit indices, first pixel lowest', () => {
    // Pixel 0 index 1 (alpha1 = 0), pixel 1 index 0 (alpha0 = 255), and pixel 8 - the first held
    // in the upper half of the 48 bits - index 1 again.
    const pixels = decodeDxt(
      parseAtf(atf(5, 2, 2, dxt5Block(255, 0, [0b001, 0, 0, 0b001, 0, 0], RED, RED, [0, 0, 0, 0])))!,
    );

    expect([0, 1, 8, 9].map((i) => pixel(pixels, i)[3])).toEqual([0, 255, 0, 255]);
  });

  it('makes index 3 transparent in a DXT1 block whose first colour is not the greater', () => {
    const block = [lo(BLUE), hi(BLUE), lo(RED), hi(RED), 0b11, 0, 0, 0];
    const pixels = decodeDxt(parseAtf(atf(3, 2, 2, block))!);

    expect(pixel(pixels, 0)).toEqual([0, 0, 0, 0]);
  });
});

describe('the atlas XML', () => {
  // The Paper Mill's still atlas (2026-10-26): its base stored turned a quarter.
  const xml = `<TextureAtlas imagePath="atlas.png" width="1024" height="1024">
    <SubTexture name="animation_frame_00" x="1" y="623" width="209" height="227" frameX="-12" frameY="-3" frameWidth="221" frameHeight="234"/>
    <SubTexture name="base_frame_00" x="1" y="1" rotated="true" width="462" height="620" frameX="-2" frameY="-1" frameWidth="624" frameHeight="465"/>
  </TextureAtlas>`;

  it('names each picture with where it is stored and how', () => {
    expect(parseTextureAtlas(xml).base_frame_00).toEqual({
      x: 1,
      y: 1,
      width: 462,
      height: 620,
      rotated: true,
      frameX: -2,
      frameY: -1,
    });
  });

  it('places a picture by its pivot, at the size it is shown', () => {
    const base = parseTextureAtlas(xml).base_frame_00;

    // Pivot (414, 150): the frame starts that far up and left of the anchor, the picture 2 and 1 further in.
    expect(placePicture(base, { x: 414, y: 150 })).toEqual({ left: -412, top: -149, width: 620, height: 462 });
  });
});
