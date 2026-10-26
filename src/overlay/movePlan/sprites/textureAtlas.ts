import { Pivot } from '../../../elvenar/buildingRenders';

/** One picture in an atlas, as its XML describes it. */
export interface SubTexture {
  x: number;
  y: number;
  /** Its size as stored in the atlas, which a rotated picture has turned a quarter. */
  width: number;
  height: number;
  /** Stored turned a quarter clockwise, so it is shown turned back. */
  rotated: boolean;
  /** Where the stored picture sits in its untrimmed frame: zero or negative, the margin cut off. */
  frameX: number;
  frameY: number;
}

/** The pictures of an atlas by name, from its XML: `base_frame_00`, and `animation_frame_00` for a still. */
export const parseTextureAtlas = (xml: string): Record<string, SubTexture> => {
  const pictures: Record<string, SubTexture> = {};
  for (const [, attributes] of xml.matchAll(/<SubTexture\b([^>]*)>/g)) {
    const read = Object.fromEntries([...attributes.matchAll(/(\w+)="([^"]*)"/g)].map(([, k, v]) => [k, v]));
    if (!read.name) continue;
    pictures[read.name] = {
      x: Number(read.x),
      y: Number(read.y),
      width: Number(read.width),
      height: Number(read.height),
      rotated: read.rotated === 'true',
      frameX: Number(read.frameX ?? 0),
      frameY: Number(read.frameY ?? 0),
    };
  }
  return pictures;
};

/** Where a picture is drawn, relative to the building's anchor, at the size it is shown. */
export interface Placement {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Where a picture goes, given the point of its untrimmed frame that sits on the anchor: the
 * frame's top-left is that far up and left of the anchor, and the stored picture is the cut-off
 * margin further in.
 */
export const placePicture = (picture: SubTexture, pivot: Pivot): Placement => ({
  left: -pivot.x - picture.frameX,
  top: -pivot.y - picture.frameY,
  width: picture.rotated ? picture.height : picture.width,
  height: picture.rotated ? picture.width : picture.height,
});
