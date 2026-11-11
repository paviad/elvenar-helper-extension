import { gameCanvas } from '../movePlan/camera/locateCamera';
import { GreyFrame, Rows, sameShare } from './frameCompare';

/**
 * Keeps track of where the game's world map is looking, from what the player does and sees.
 *
 * The world map has no zoom, opens centred on the player's city, and moves exactly as far as the
 * mouse drags it, with no glide afterwards. So the view is known from the moment the map opens,
 * and each drag moves it by the mouse's own distance. What cannot be followed that way - the game
 * jumping to a province, or showing something other than the map - is caught by the picture: one
 * is kept of the map as last seen, and the view counts as known only while the game still shows
 * it. Nothing of the game's code is read and nothing is sent.
 */

/** How far the map has been dragged since it opened, in the game canvas's pixels. */
export interface MapPan {
  x: number;
  y: number;
}

/**
 * `showing` while the game shows the map where the tracker thinks it is; `hidden` while it shows
 * something else, a province or the city, and may yet come back; `unknown` once the view is lost,
 * until the map is opened again.
 */
export type MapViewStatus = 'showing' | 'hidden' | 'unknown';

/** `moving` while a drag is under way: the pan then changes with every mouse movement. */
export type MapViewListener = (pan: MapPan | undefined, status: MapViewStatus, moving: boolean) => void;

/** The pictures compared are the canvas shrunk by this much. */
const SHRINK = 8;
/** The game's bars at the top and bottom of the canvas, in its pixels, as the city camera leaves them out. */
const BARS = { top: 80, bottom: 130 };
/** Grey levels a square may differ by and still be the same, in a picture that has not moved. */
const STILL_TOLERANCE = 6;
/** The same for a picture that moved, where the shrinking blurs the two differently. */
const MOVED_TOLERANCE = 20;
/** How much of the picture must be the same for the game to be showing the same view: a window may cover the rest. */
const STILL_SHARE = 0.3;
const MOVED_SHARE = 0.4;
/** A drag that leaves less than this share of the picture in view cannot be checked against it. */
const MIN_OVERLAP = 0.3;
/** When the map is first looked at after opening, and how often then until it has stopped changing. */
const SETTLE_FIRST_MS = 800;
const SETTLE_EVERY_MS = 400;
const SETTLE_TRIES = 20;
/** When the picture is looked at after a click or a key, by which the game has redrawn. */
const AFTER_INPUT_MS = [450, 1150, 2400];
/** How often it is looked at with nothing happening, while somebody is watching. */
const CHECK_EVERY_MS = 3200;
/** A press that moves less than this is a click, not a drag. */
const CLICK_SLOP = 3;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** The game's picture as last drawn, shrunk to grey levels; nothing while the tab is hidden. */
const grab = (): Promise<GreyFrame | undefined> =>
  new Promise((resolve) => {
    const game = gameCanvas();
    if (!game || document.visibilityState !== 'visible') {
      resolve(undefined);
      return;
    }
    // Inside an animation frame, after the game has drawn: it keeps no picture between frames.
    requestAnimationFrame(() => {
      const width = Math.floor(game.width / SHRINK);
      const height = Math.floor(game.height / SHRINK);
      const copy = document.createElement('canvas');
      copy.width = width;
      copy.height = height;
      const ctx = copy.getContext('2d', { willReadFrequently: true })!;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(game, 0, 0, width, height);
      const rgba = ctx.getImageData(0, 0, width, height).data;
      const data = new Uint8Array(width * height);
      for (let i = 0; i < data.length; i++) {
        data[i] = (rgba[i * 4] * 77 + rgba[i * 4 + 1] * 150 + rgba[i * 4 + 2] * 29) >> 8;
      }
      resolve({ width, height, data });
    });
  });

const rows: Rows = { top: Math.ceil(BARS.top / SHRINK), bottom: Math.ceil(BARS.bottom / SHRINK) };

class WorldMapTracker {
  private pan: MapPan | undefined;
  /** The map as last seen at `pan`. */
  private reference: GreyFrame | undefined;
  /** Whether the game was showing the reference when last looked at. */
  private showing = false;
  private listeners = new Set<MapViewListener>();
  private drag: { x: number; y: number; ratio: number; from: MapPan | undefined; moved: boolean } | undefined;
  /** Counts the map's openings, so that work begun for one stops when the next comes. */
  private opening = 0;
  /** The work on pictures, one piece after another, as each depends on the one before. */
  private queue: Promise<void> = Promise.resolve();
  private timers: ReturnType<typeof setTimeout>[] = [];
  private checking: ReturnType<typeof setInterval> | undefined;
  private started = false;

  /** Begins following the mouse. Costs nothing until the map is opened. */
  start() {
    if (this.started) return;
    this.started = true;
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 || e.target !== gameCanvas() || !this.pan) return;
      this.drag = { x: e.clientX, y: e.clientY, ratio: this.ratio(), from: this.pan, moved: false };
    };
    const onMove = (e: PointerEvent) => {
      const drag = this.drag;
      if (!drag || !(e.buttons & 1)) return;
      const dx = (e.clientX - drag.x) * drag.ratio;
      const dy = (e.clientY - drag.y) * drag.ratio;
      if (Math.abs(dx) + Math.abs(dy) > CLICK_SLOP) drag.moved = true;
      if (drag.moved && drag.from && this.pan) {
        this.pan = { x: drag.from.x + dx, y: drag.from.y + dy };
        if (this.showing) this.publish(true);
      }
    };
    const onUp = (e: PointerEvent) => {
      const drag = this.drag;
      this.drag = undefined;
      if (!drag) return;
      if (!drag.moved) {
        this.afterInput();
        return;
      }
      const dx = Math.round((e.clientX - drag.x) * drag.ratio);
      const dy = Math.round((e.clientY - drag.y) * drag.ratio);
      if (!drag.from || !this.pan) return;
      this.pan = { x: drag.from.x + dx, y: drag.from.y + dy };
      this.enqueue(() => this.afterDrag(dx, dy));
    };
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest?.('input, textarea, [contenteditable], #elven-assist-draggable-panel')) return;
      this.afterInput();
    };
    window.addEventListener('pointerdown', onDown, { capture: true, passive: true });
    window.addEventListener('pointermove', onMove, { capture: true, passive: true });
    window.addEventListener('pointerup', onUp, { capture: true, passive: true });
    window.addEventListener('keydown', onKey, { capture: true, passive: true });
    // Where the map sits in a canvas of another size is not known.
    window.addEventListener('resize', () => this.lose());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.listeners.size) this.enqueue(() => this.check());
    });
  }

  /** The game has just opened the world map, which puts the player's city in the middle. */
  opened() {
    const opening = ++this.opening;
    this.drag = undefined;
    this.pan = { x: 0, y: 0 };
    this.reference = undefined;
    this.showing = false;
    this.publish();
    this.enqueue(() => this.settle(opening));
  }

  /** Told the view now and whenever it changes. The picture is looked at only while somebody listens. */
  subscribe(listener: MapViewListener) {
    this.listeners.add(listener);
    if (this.listeners.size === 1) {
      this.checking = setInterval(() => this.enqueue(() => this.check()), CHECK_EVERY_MS);
      this.enqueue(() => this.check());
    }
    listener(this.showing ? this.pan : undefined, this.status(), false);
    return () => {
      this.listeners.delete(listener);
      if (!this.listeners.size) {
        clearInterval(this.checking);
        this.timers.forEach(clearTimeout);
        this.timers = [];
      }
    };
  }

  private status(): MapViewStatus {
    if (!this.pan) return 'unknown';
    return this.showing ? 'showing' : 'hidden';
  }

  private publish(moving = false) {
    const pan = this.showing ? this.pan : undefined;
    const status = this.status();
    this.listeners.forEach((listener) => listener(pan, status, moving));
  }

  /** The ratio of the canvas's pixels to the page's, which mouse positions come in. */
  private ratio() {
    const game = gameCanvas();
    return game ? game.width / Math.max(1, game.getBoundingClientRect().width) : 1;
  }

  private enqueue(work: () => Promise<void>) {
    this.queue = this.queue.then(work).catch(() => undefined);
  }

  private lose() {
    if (!this.pan) return;
    this.pan = undefined;
    this.reference = undefined;
    this.showing = false;
    this.drag = undefined;
    this.publish();
  }

  /**
   * Waits for the map to appear and keeps the first picture of it that comes out the same twice
   * running. The game says it is opening the map before it shows it, so a still picture is taken
   * for the map only once it differs from what was on screen when the game said so; if none ever
   * does, the map was already up by then, and the still picture is taken after all.
   */
  private async settle(opening: number) {
    const stale = () => opening !== this.opening || !this.pan || !!this.reference || !!this.drag;
    const keep = (frame: GreyFrame) => {
      this.reference = frame;
      this.showing = true;
      this.publish();
    };
    const before = await grab();
    let last: GreyFrame | undefined;
    let still: GreyFrame | undefined;
    await wait(SETTLE_FIRST_MS);
    for (let i = 0; i < SETTLE_TRIES; i++) {
      // Opened again, lost, or dragged meanwhile: a drag takes its own picture when it ends.
      if (stale()) return;
      const frame = await grab();
      if (stale()) return;
      if (frame && last && sameShare(last, frame, 0, 0, STILL_TOLERANCE, rows) > 0.98) {
        still = frame;
        if (!before || sameShare(before, frame, 0, 0, STILL_TOLERANCE, rows) < STILL_SHARE) {
          keep(frame);
          return;
        }
      }
      last = frame;
      await wait(SETTLE_EVERY_MS);
    }
    if (still && !stale()) keep(still);
  }

  /** A drag has ended: the picture should be the one before it, moved as far as the mouse. */
  private async afterDrag(dx: number, dy: number) {
    const before = this.reference;
    const frame = await grab();
    if (!this.pan) return;
    if (!frame) {
      // Nothing to see, so nothing to go by from here on.
      this.lose();
      return;
    }
    if (before) {
      const sx = Math.round(dx / SHRINK);
      const sy = Math.round(dy / SHRINK);
      const overlaps =
        Math.abs(sx) < frame.width * (1 - MIN_OVERLAP) &&
        Math.abs(sy) < (frame.height - rows.top - rows.bottom) * (1 - MIN_OVERLAP);
      if (overlaps && sameShare(before, frame, sx, sy, MOVED_TOLERANCE, rows) < MOVED_SHARE) {
        if (sameShare(before, frame, 0, 0, STILL_TOLERANCE, rows) >= STILL_SHARE) {
          // The map stayed where it was: the drag was of something lying over it.
          this.pan = { x: this.pan.x - dx, y: this.pan.y - dy };
          this.showing = true;
          this.publish();
        } else {
          // Not the map as it was known, so the drag started from somewhere else.
          this.lose();
        }
        return;
      }
    }
    this.reference = frame;
    this.showing = true;
    this.publish();
  }

  /** Looks whether the game still shows the map as last seen. */
  private async check() {
    if (!this.listeners.size || !this.pan || !this.reference || this.drag) return;
    const reference = this.reference;
    const frame = await grab();
    if (!frame || this.reference !== reference || this.drag) return;
    const showing = sameShare(reference, frame, 0, 0, STILL_TOLERANCE, rows) >= STILL_SHARE;
    if (showing !== this.showing) {
      this.showing = showing;
      this.publish();
    }
  }

  /** A click or a key can change what the game shows, so the picture is looked at once it has. */
  private afterInput() {
    if (!this.listeners.size || !this.pan) return;
    this.timers.forEach(clearTimeout);
    this.timers = AFTER_INPUT_MS.map((ms) => setTimeout(() => this.enqueue(() => this.check()), ms));
  }
}

/** The one tracker for the page. */
export const worldMapTracker = new WorldMapTracker();
