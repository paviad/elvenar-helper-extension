/**
 * The isometric projection used by the iso city view.
 *
 * Grid coordinates are tile positions; screen coordinates are pixels inside the
 * iso SVG, before any scroll offset. The projection depends on zoom, so build a
 * new one whenever zoom changes rather than holding on to one.
 */

/** Vertical breathing room above the top corner of the padded grid. */
const ORIGIN_TOP_MARGIN = 50;

/** A tile is twice as wide as it is tall, at 1.8 : 0.9 of the top-down grid size. */
const TILE_WIDTH_FACTOR = 1.8;
const TILE_HEIGHT_FACTOR = 0.9;

export interface IsoProjectionInput {
  GridSize: number;
  GridMax: number;
  PaddingTiles: number;
  zoom: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface IsoProjection {
  tileWidth: number;
  tileHeight: number;
  originX: number;
  originY: number;
  /** Grid position -> screen position of that tile corner. */
  toIso: (x: number, y: number) => Point;
  /**
   * Screen position -> grid position, as fractional tiles. Callers that need a
   * tile index floor the result; callers anchoring a zoom keep the fraction.
   */
  fromIso: (screenX: number, screenY: number) => Point;
}

export function createIsoProjection({ GridSize, GridMax, PaddingTiles, zoom }: IsoProjectionInput): IsoProjection {
  const tileWidth = GridSize * TILE_WIDTH_FACTOR * zoom;
  const tileHeight = GridSize * TILE_HEIGHT_FACTOR * zoom;

  // The grid is drawn as a diamond, so the horizontal origin is the middle of the
  // padded grid's width and the vertical origin is its top corner.
  const paddedGridMax = GridMax + PaddingTiles * 2;
  const originX = (paddedGridMax * tileWidth) / 2;
  const originY = ORIGIN_TOP_MARGIN + PaddingTiles * tileHeight;

  return {
    tileWidth,
    tileHeight,
    originX,
    originY,

    toIso: (x, y) => ({
      x: originX + (x - y) * (tileWidth / 2),
      y: originY + (x + y) * (tileHeight / 2),
    }),

    fromIso: (screenX, screenY) => {
      const adjX = screenX - originX;
      const adjY = screenY - originY;

      return {
        x: (adjY / (tileHeight / 2) + adjX / (tileWidth / 2)) / 2,
        y: (adjY / (tileHeight / 2) - adjX / (tileWidth / 2)) / 2,
      };
    },
  };
}
