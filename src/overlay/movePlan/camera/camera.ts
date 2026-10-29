import { Tile } from '../../../city/movePlan/rulesSimulator';

/**
 * Where the game's camera looks, found from what is on screen. A tile corner (x, y) is drawn at
 * `scale * iso(x, y) + offset` in the game canvas's pixels; the game's isometric angle never
 * changes, so these three numbers are all there is to it.
 */
export interface Camera {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export interface Point {
  x: number;
  y: number;
}

/** A tile corner in the game's picture pixels, at full size: a tile is 104 x 52. */
export const iso = ({ x, y }: Tile): Point => ({ x: (x - y) * 52, y: (x + y) * 26 });

/** A tile corner on screen, in canvas pixels. */
export const toScreen = (camera: Camera, tile: Tile): Point => {
  const p = iso(tile);
  return { x: p.x * camera.scale + camera.offsetX, y: p.y * camera.scale + camera.offsetY };
};

/** The tile under a point on screen, as a fractional tile position. */
export const toTile = (camera: Camera, point: Point): Tile => {
  const px = (point.x - camera.offsetX) / camera.scale;
  const py = (point.y - camera.offsetY) / camera.scale;
  // Inverting iso: x - y = px / 52, x + y = py / 26.
  return { x: (px / 52 + py / 26) / 2, y: (py / 26 - px / 52) / 2 };
};

/** The camera moved by a drag across the screen: the map follows the mouse. */
export const panned = (camera: Camera, dx: number, dy: number): Camera => ({
  ...camera,
  offsetX: camera.offsetX + dx,
  offsetY: camera.offsetY + dy,
});

/** The camera zoomed to a new scale about a point on screen, which stays over the same spot of the map. */
export const zoomedAbout = (camera: Camera, point: Point, scale: number): Camera => ({
  scale,
  offsetX: point.x - (point.x - camera.offsetX) * (scale / camera.scale),
  offsetY: point.y - (point.y - camera.offsetY) * (scale / camera.scale),
});

/**
 * The zoom steps seen so far, with a new one added unless it is one of them. The steps depend on
 * the game's graphics setting, so they are learned rather than known.
 */
export const withZoomStep = (steps: readonly number[], scale: number, tolerance = 0.02): number[] =>
  steps.some((s) => Math.abs(s - scale) / s <= tolerance) ? [...steps] : [...steps, scale].sort((a, b) => a - b);

export interface EdgeArrow {
  /** Where the arrow stands, just inside the screen's edge. */
  at: Point;
  /** The direction it points, in radians, 0 being to the right. */
  angle: number;
}

/**
 * An arrow at the screen's edge pointing towards a point off screen, along the line from the
 * screen's centre; none when the point is on screen.
 */
export const edgeArrow = (target: Point, width: number, height: number, inset: number): EdgeArrow | undefined => {
  if (target.x >= 0 && target.x <= width && target.y >= 0 && target.y <= height) return undefined;
  const cx = width / 2;
  const cy = height / 2;
  const dx = target.x - cx;
  const dy = target.y - cy;
  const reach = Math.min(
    dx === 0 ? Infinity : (cx - inset) / Math.abs(dx),
    dy === 0 ? Infinity : (cy - inset) / Math.abs(dy),
  );
  return { at: { x: cx + dx * reach, y: cy + dy * reach }, angle: Math.atan2(dy, dx) };
};
