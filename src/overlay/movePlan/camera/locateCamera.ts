import { Sprite } from '../sprites/buildingSprite';
import { Camera, iso, Point, zoomedAbout } from './camera';
import { Ignore, Pixels, searchAll, searchNear } from './match';

/**
 * Finding the game's camera from its picture. The game draws the city in one WebGL canvas, which
 * can be read inside an animation frame, after the game has drawn - it keeps no buffer between
 * frames. The city is drawn here from the stored positions and the game's own sprites, and the
 * camera is the zoom and pan at which the two pictures agree best. Nothing of the game's code is
 * read and nothing is sent: only what the player sees.
 */

/** A building to draw: its footprint, and its picture when there is one. */
export interface Placed {
  x: number;
  y: number;
  width: number;
  length: number;
  sprite: Sprite | undefined;
}

/** A camera, and how well the pictures agree with it, -1 to 1. */
export interface Found extends Camera {
  score: number;
}

/** The game's bars at the top and bottom of the canvas, in its pixels. */
const BARS = { top: 80, bottom: 130 };

export const gameCanvas = () => document.querySelector<HTMLCanvasElement>('canvas');

/** The game's picture as it was last drawn, or nothing while the tab is hidden and the game draws nothing. */
export const grabFrame = (): Promise<HTMLCanvasElement | undefined> =>
  new Promise((resolve) => {
    const game = gameCanvas();
    if (!game || document.visibilityState !== 'visible') {
      resolve(undefined);
      return;
    }
    requestAnimationFrame(() => {
      const copy = document.createElement('canvas');
      copy.width = game.width;
      copy.height = game.height;
      copy.getContext('2d')!.drawImage(game, 0, 0);
      resolve(copy);
    });
  });

/** A frame shrunk by d, with the game's bars to leave out. */
interface Shrunk {
  pixels: Pixels;
  ignore: Ignore;
  d: number;
}

const shrink = (source: HTMLCanvasElement, d: number): Shrunk => {
  const w = Math.floor(source.width / d);
  const h = Math.floor(source.height / d);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, w, h);
  return {
    pixels: ctx.getImageData(0, 0, w, h),
    ignore: { top: Math.ceil(BARS.top / d), bottom: Math.ceil(BARS.bottom / d) },
    d,
  };
};

/** A box of picture pixels at full size, as iso places them. */
interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

const spriteBox = (b: Placed): Box => {
  const a = iso(b);
  const s = b.sprite!;
  return {
    left: a.x - s.anchorX,
    top: a.y - s.anchorY,
    right: a.x - s.anchorX + s.image.width,
    bottom: a.y - s.anchorY + s.image.height,
  };
};

const cityBox = (buildings: Placed[]): Box => {
  const boxes = buildings.filter((b) => b.sprite).map(spriteBox);
  return {
    left: Math.min(...boxes.map((b) => b.left)),
    top: Math.min(...boxes.map((b) => b.top)),
    right: Math.max(...boxes.map((b) => b.right)),
    bottom: Math.max(...boxes.map((b) => b.bottom)),
  };
};

/** The picture pixels a camera shows of a frame of this size, with a margin of screen pixels round it. */
const visibleBox = (camera: Camera, width: number, height: number, margin: number): Box => ({
  left: (-camera.offsetX - margin) / camera.scale,
  top: (-camera.offsetY - margin) / camera.scale,
  right: (width - camera.offsetX + margin) / camera.scale,
  bottom: (height - camera.offsetY + margin) / camera.scale,
});

/** The city drawn at a scale and shrunk by d, over a box of picture pixels, back to front. */
const renderCity = (buildings: Placed[], scale: number, d: number, box: Box): Pixels => {
  const k = scale / d;
  const w = Math.max(1, Math.ceil((box.right - box.left) * k));
  const h = Math.max(1, Math.ceil((box.bottom - box.top) * k));
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.imageSmoothingQuality = 'high';
  const depth = (b: Placed) => b.x + b.width + b.y + b.length;
  for (const b of buildings.filter((b) => b.sprite).sort((p, q) => depth(p) - depth(q))) {
    const s = spriteBox(b);
    if (s.right < box.left || s.left > box.right || s.bottom < box.top || s.top > box.bottom) continue;
    ctx.drawImage(
      b.sprite!.image,
      (s.left - box.left) * k,
      (s.top - box.top) * k,
      b.sprite!.image.width * k,
      b.sprite!.image.height * k,
    );
  }
  return ctx.getImageData(0, 0, w, h);
};

/** The camera under which render pixel (tx, ty) falls on frame pixel (0, 0). */
const cameraOf = (scale: number, d: number, box: Box, tx: number, ty: number): Camera => ({
  scale,
  // Frame pixel i, screen pixel i * d, shows render pixel tx + i: picture pixel box.left + (tx + i) * d / scale.
  offsetX: -box.left * scale - tx * d,
  offsetY: -box.top * scale - ty * d,
});

/** The render pixel a camera puts on frame pixel (0, 0). */
const placementOf = (camera: Camera, d: number, box: Box) => ({
  tx: Math.round((-camera.offsetX / camera.scale - box.left) * (camera.scale / d)),
  ty: Math.round((-camera.offsetY / camera.scale - box.top) * (camera.scale / d)),
});

/** The best camera within `reach` shrunk pixels of a guess, at the guess's scale. */
const bestNear = (
  frame: Shrunk,
  buildings: Placed[],
  guess: Camera,
  reach: number,
  width: number,
  height: number,
): Found => {
  const box = visibleBox(guess, width, height, (reach + 2) * frame.d);
  const render = renderCity(buildings, guess.scale, frame.d, box);
  const { tx, ty } = placementOf(guess, frame.d, box);
  const hit = searchNear(frame.pixels, render, tx, ty, reach, frame.ignore);
  return { ...cameraOf(guess.scale, frame.d, box, hit.tx, hit.ty), score: hit.score };
};

/** One pass of a search: the frame shrunk by d, each guess tried within `reach`, at each of the scale factors. */
export interface Pass {
  d: number;
  reach: number;
  factors: number[];
}

const nextFrame = () => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * The best camera near any of the guesses, sharpened pass by pass: the first pass tries every
 * guess, the later ones only the best so far. A scale tried around a camera keeps the frame's
 * centre over the same spot, as a guess has nothing better to go on.
 */
export const refine = async (
  stale: () => boolean,
  full: HTMLCanvasElement,
  buildings: Placed[],
  guesses: Camera[],
  passes: Pass[],
): Promise<Found | undefined> => {
  let best: Found | undefined;
  const centre: Point = { x: full.width / 2, y: full.height / 2 };
  for (const [index, pass] of passes.entries()) {
    const frame = shrink(full, pass.d);
    const around = index === 0 ? guesses : [best!];
    let passBest: Found | undefined;
    for (const guess of around) {
      for (const factor of pass.factors) {
        const found = bestNear(
          frame,
          buildings,
          zoomedAbout(guess, centre, guess.scale * factor),
          pass.reach,
          full.width,
          full.height,
        );
        if (!passBest || found.score > passBest.score) passBest = found;
        // A pause after every comparison, so a drag starting now waits for one at most.
        await nextFrame();
        if (stale()) return undefined;
      }
    }
    best = passBest;
  }
  return best;
};

/** The usual sharpening once a guess is close: the right scale within a few per cent, the pan within a few pixels. */
export const SHARPEN: Pass[] = [
  { d: 8, reach: 3, factors: [0.98, 0.99, 1, 1.01, 1.02] },
  { d: 4, reach: 2, factors: [0.995, 1, 1.005] },
];

/**
 * The camera found with no guess at all: the whole city tried at every scale in a coarse
 * picture, the best few then sharpened. Seconds of work, spread over frames so the game does not
 * stall; done once, and again only when the camera is lost.
 */
export const searchEverywhere = async (
  full: HTMLCanvasElement,
  buildings: Placed[],
  scales: number[],
  stale: () => boolean,
): Promise<Found | undefined> => {
  const D = 32;
  const frame = shrink(full, D);
  const box = cityBox(buildings);
  const guesses: Found[] = [];
  for (const scale of scales) {
    const render = renderCity(buildings, scale, D, box);
    for (const hit of searchAll(frame.pixels, render, 2, frame.ignore, 2)) {
      guesses.push({ ...cameraOf(scale, D, box, hit.tx, hit.ty), score: hit.score });
    }
    await nextFrame();
    if (stale()) return undefined;
  }
  guesses.sort((a, b) => b.score - a.score);
  // Scales a step apart need more room in the first sharpening than a close guess does.
  return refine(stale, full, buildings, guesses.slice(0, 4), [
    { d: 12, reach: 4, factors: [0.92, 0.96, 1, 1.04, 1.08] },
    ...SHARPEN,
  ]);
};
