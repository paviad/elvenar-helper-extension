/** Pixels as a canvas holds them: RGBA, row by row. */
export interface Pixels {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

/** The frame's rows the game covers with its own bars, left out of every comparison. */
export interface Ignore {
  top: number;
  bottom: number;
}

export interface Hit {
  /** The render pixel that falls on frame pixel (0, 0). */
  tx: number;
  ty: number;
  score: number;
}

/** No placement scores, for want of enough of the city in view. */
const NONE = -1;

/** How much of the frame the city has to cover for a placement to count. */
const MIN_SHARE = 0.15;

/**
 * How well the frame agrees with the render placed so that render pixel (tx, ty) falls on frame
 * pixel (0, 0): their correlation, -1 to 1, over only the pixels where the render has a building.
 * Ground, streets and the game's own pop-ups are not in the render, so they do not count against
 * it.
 */
export const score = (frame: Pixels, render: Pixels, tx: number, ty: number, ignore: Ignore): number => {
  const f = frame.data;
  const r = render.data;
  const j1 = frame.height - ignore.bottom;
  let n = 0;
  let sf = 0;
  let sr = 0;
  let sff = 0;
  let srr = 0;
  let sfr = 0;
  for (let j = Math.max(ignore.top, -ty); j < j1; j++) {
    const v = ty + j;
    if (v >= render.height) break;
    const i0 = Math.max(0, -tx);
    const i1 = Math.min(frame.width, render.width - tx);
    for (let i = i0; i < i1; i++) {
      const ri = (v * render.width + tx + i) * 4;
      if (r[ri + 3] < 200) continue;
      const fi = (j * frame.width + i) * 4;
      for (let ch = 0; ch < 3; ch++) {
        const a = f[fi + ch];
        const b = r[ri + ch];
        sf += a;
        sr += b;
        sff += a * a;
        srr += b * b;
        sfr += a * b;
      }
      n += 3;
    }
  }
  if (n < frame.width * (j1 - ignore.top) * 3 * MIN_SHARE) return NONE;
  const cov = sfr - (sf * sr) / n;
  const vf = sff - (sf * sf) / n;
  const vr = srr - (sr * sr) / n;
  return vf > 0 && vr > 0 ? cov / Math.sqrt(vf * vr) : NONE;
};

/** The best few placements of the render anywhere over the frame, trying every `stride`-th. */
export const searchAll = (frame: Pixels, render: Pixels, stride: number, ignore: Ignore, keep: number): Hit[] => {
  const hits: Hit[] = [];
  for (let ty = -Math.floor(frame.height / 2); ty < render.height - frame.height / 2; ty += stride) {
    for (let tx = -Math.floor(frame.width / 2); tx < render.width - frame.width / 2; tx += stride) {
      const s = score(frame, render, tx, ty, ignore);
      if (s > NONE) hits.push({ tx, ty, score: s });
    }
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, keep);
};

/** The best placement within `reach` pixels of a guess. */
export const searchNear = (
  frame: Pixels,
  render: Pixels,
  tx0: number,
  ty0: number,
  reach: number,
  ignore: Ignore,
): Hit => {
  let best: Hit = { tx: tx0, ty: ty0, score: NONE };
  for (let ty = ty0 - reach; ty <= ty0 + reach; ty++) {
    for (let tx = tx0 - reach; tx <= tx0 + reach; tx++) {
      const s = score(frame, render, tx, ty, ignore);
      if (s > best.score) best = { tx, ty, score: s };
    }
  }
  return best;
};
