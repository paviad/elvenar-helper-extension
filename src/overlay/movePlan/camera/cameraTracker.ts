import { Camera, panned, Point, withZoomStep, zoomedAbout } from './camera';
import { Found, gameCanvas, grabFrame, Pass, Placed, refine, searchEverywhere, SHARPEN } from './locateCamera';

/**
 * Keeps the game's camera known while the player plays. The map pans only by dragging and zooms
 * only by the wheel, a step at a time, so the camera changes only on those - and the player's own
 * mouse says how: a drag moves it by as much as the mouse moved, a zoom keeps the spot under the
 * cursor. Each change is then checked against the picture, which also catches a drag that moved a
 * building rather than the map, and the camera is searched for afresh whenever it is lost.
 */

/** `moving` while a drag is under way: the camera then changes with every mouse movement. */
export type CameraListener = (camera: Camera | undefined, moving: boolean) => void;

/** Whether the camera is known, being looked for, or not found and left for a while. */
export type CameraStatus = 'found' | 'searching' | 'lost';

/** How well the pictures must agree, at the finest pass, for a camera to be believed. */
const BELIEVED = 0.6;
/**
 * The scales searched with no guess at all, from the farthest zoom out to past the nearest zoom in
 * (1.0). Each is 15% above the last: the first sharpening tries 8% either way, so no scale in
 * between is missed.
 *
 * Taken as given: the low graphics setting, or at least a zoom not far out. The high setting's
 * farthest steps shrink the buildings to a few pixels, too few to match reliably.
 */
const ALL_SCALES = Array.from({ length: 13 }, (_, i) => 0.28 * Math.pow(1.15, i));
/** How long after a zoom's last wheel turn its smooth transition has surely ended. */
const ZOOM_SETTLES_MS = 600;
/** How long after a drag's release the map has stopped gliding. */
const DRAG_SETTLES_MS = 250;
/** How often the camera is checked while nothing happens. */
const CHECK_EVERY_MS = 10000;
/**
 * How long a camera not found anywhere is left before it is searched for again unprompted: the
 * game may be showing something other than the city, as another player's, and the search is work.
 */
const RETRY_LOST_MS = 30000;

type Job =
  | { type: 'everywhere' }
  | { type: 'drag'; from: Camera; dx: number; dy: number }
  | { type: 'zoom'; from: Camera; cursor: Point }
  | { type: 'check' }
  | { type: 'wide' };

/** Which job wins when several are waiting: finding the camera at all comes first. */
const PRIORITY: Record<Job['type'], number> = { everywhere: 4, zoom: 3, wide: 2, drag: 1, check: 0 };

class CameraTracker {
  private buildings: Placed[] = [];
  private camera: Camera | undefined;
  /** False while the picture is changing in a way the camera cannot follow, as during a zoom. */
  private shown = true;
  private zoomSteps: number[] = [];
  private listeners = new Set<CameraListener>();
  private statusListeners = new Set<(status: CameraStatus) => void>();
  private told: CameraStatus | undefined;
  private waiting: Job | undefined;
  private running = false;
  private drag: { x: number; y: number; ratio: number; from: Camera | undefined; moved: boolean } | undefined;
  private zoomFrom: { from: Camera; cursor: Point } | undefined;
  private timers: ReturnType<typeof setTimeout>[] = [];
  private zoomTimer: ReturnType<typeof setTimeout> | undefined;
  private lastInput = 0;
  /** When a search everywhere last came up empty. */
  private lostAt = 0;
  private detach: (() => void) | undefined;

  subscribe(listener: CameraListener) {
    this.listeners.add(listener);
    if (this.listeners.size === 1) this.start();
    listener(this.current(), false);
    return () => {
      this.listeners.delete(listener);
      if (!this.listeners.size) this.stop();
    };
  }

  /** Told the status now and whenever it changes; does not start the tracker on its own. */
  onStatus(listener: (status: CameraStatus) => void) {
    this.statusListeners.add(listener);
    listener(this.status());
    return () => void this.statusListeners.delete(listener);
  }

  private status(): CameraStatus {
    if (this.current()) return 'found';
    // The city still being drawn counts as looking: the search starts as soon as it is.
    return !this.buildings.length || this.running || this.waiting || this.zoomFrom ? 'searching' : 'lost';
  }

  private tellStatus() {
    const status = this.status();
    if (status === this.told) return;
    this.told = status;
    this.statusListeners.forEach((listener) => listener(status));
  }

  /** The city as stored, drawn to compare with the game's picture. */
  setBuildings(buildings: Placed[]) {
    const first = !this.buildings.length;
    this.buildings = buildings;
    if (first && this.listeners.size) this.ask(this.camera ? { type: 'check' } : { type: 'everywhere' });
  }

  private current() {
    return this.shown ? this.camera : undefined;
  }

  private publish(moving = false) {
    const camera = this.current();
    this.listeners.forEach((listener) => listener(camera, moving));
    this.tellStatus();
  }

  /** The ratio of the canvas's pixels to the page's, which mouse positions come in. */
  private ratio() {
    const game = gameCanvas();
    if (!game) return 1;
    return game.width / Math.max(1, game.getBoundingClientRect().width);
  }

  private start() {
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 || e.target !== gameCanvas()) return;
      this.lastInput = Date.now();
      this.drag = { x: e.clientX, y: e.clientY, ratio: this.ratio(), from: this.camera, moved: false };
    };
    const onMove = (e: PointerEvent) => {
      if (!this.drag || !(e.buttons & 1)) return;
      this.lastInput = Date.now();
      const dx = (e.clientX - this.drag.x) * this.drag.ratio;
      const dy = (e.clientY - this.drag.y) * this.drag.ratio;
      if (Math.abs(dx) + Math.abs(dy) > 3) this.drag.moved = true;
      // Most drags pan the map, so the camera follows at once; the check after the release puts
      // it right when the drag moved a building instead.
      if (this.drag.from && this.drag.moved) {
        this.camera = panned(this.drag.from, dx, dy);
        this.publish(true);
      }
    };
    const onUp = (e: PointerEvent) => {
      const drag = this.drag;
      this.drag = undefined;
      if (!drag?.moved) return;
      this.lastInput = Date.now();
      const dx = (e.clientX - drag.x) * drag.ratio;
      const dy = (e.clientY - drag.y) * drag.ratio;
      // Laid out properly again, not just shifted, now that the drag is over.
      this.publish();
      this.later(DRAG_SETTLES_MS, () =>
        this.ask(drag.from ? { type: 'drag', from: drag.from, dx, dy } : { type: 'everywhere' }),
      );
    };
    const onWheel = (e: WheelEvent) => {
      if (e.target !== gameCanvas()) return;
      this.lastInput = Date.now();
      const r = this.ratio();
      if (!this.zoomFrom && this.camera) {
        this.zoomFrom = { from: this.camera, cursor: { x: e.clientX * r, y: e.clientY * r } };
      }
      // While the zoom glides from step to step, no camera would be right for long.
      this.shown = false;
      this.publish();
      clearTimeout(this.zoomTimer);
      this.zoomTimer = setTimeout(() => {
        const zoom = this.zoomFrom;
        this.zoomFrom = undefined;
        this.ask(zoom ? { type: 'zoom', ...zoom } : { type: 'everywhere' });
      }, ZOOM_SETTLES_MS);
    };
    const onResize = () => {
      this.lastInput = Date.now();
      this.later(300, () => this.ask({ type: 'wide' }));
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') this.ask({ type: 'check' });
    };
    window.addEventListener('pointerdown', onDown, { capture: true, passive: true });
    window.addEventListener('pointermove', onMove, { capture: true, passive: true });
    window.addEventListener('pointerup', onUp, { capture: true, passive: true });
    window.addEventListener('wheel', onWheel, { capture: true, passive: true });
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVisible);
    const checking = setInterval(() => {
      const now = Date.now();
      const resting = now - this.lastInput > 2000 && !this.drag && !this.zoomFrom;
      const giveUp = !this.current() && now - this.lostAt < RETRY_LOST_MS;
      if (!this.running && resting && !giveUp) {
        this.ask(this.camera ? { type: 'check' } : { type: 'everywhere' });
      }
    }, CHECK_EVERY_MS);
    this.detach = () => {
      window.removeEventListener('pointerdown', onDown, { capture: true });
      window.removeEventListener('pointermove', onMove, { capture: true });
      window.removeEventListener('pointerup', onUp, { capture: true });
      window.removeEventListener('wheel', onWheel, { capture: true });
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(checking);
    };
    if (this.buildings.length) this.ask(this.camera ? { type: 'check' } : { type: 'everywhere' });
  }

  private stop() {
    this.detach?.();
    this.detach = undefined;
    // Nothing is followed until the next listener comes, so the camera kept is only a guess by
    // then: hidden until a check confirms it.
    this.shown = false;
    this.timers.forEach(clearTimeout);
    this.timers = [];
    clearTimeout(this.zoomTimer);
    this.waiting = undefined;
    this.drag = undefined;
    this.zoomFrom = undefined;
  }

  private later(ms: number, then: () => void) {
    this.timers.push(setTimeout(then, ms));
  }

  private ask(job: Job) {
    if (!this.waiting || PRIORITY[job.type] >= PRIORITY[this.waiting.type]) this.waiting = job;
    void this.run();
  }

  private async run() {
    if (this.running) return;
    this.running = true;
    this.tellStatus();
    try {
      while (this.waiting && this.buildings.length && this.detach) {
        const job = this.waiting;
        this.waiting = undefined;
        await this.do(job);
      }
    } finally {
      this.running = false;
      this.tellStatus();
    }
  }

  private async do(job: Job) {
    const started = Date.now();
    const frame = await grabFrame();
    if (!frame) return;
    // The map moving meanwhile puts the frame out of date, and the input has a job of its own; the
    // search stops at its next pause rather than hold up the game while the player drags.
    const stale = () => this.lastInput >= started || !!this.drag || !!this.zoomFrom;
    const found = await this.search(job, frame, stale);
    if (stale()) return;
    if (found && found.score >= BELIEVED) {
      this.camera = { scale: found.scale, offsetX: found.offsetX, offsetY: found.offsetY };
      this.zoomSteps = withZoomStep(this.zoomSteps, found.scale);
      this.shown = true;
      this.publish();
      return;
    }
    // Lost: hidden until found again, by a wider search and then by searching everywhere.
    this.shown = false;
    this.publish();
    if (job.type === 'check' || job.type === 'drag' || job.type === 'zoom') this.ask({ type: 'wide' });
    else if (job.type === 'wide') this.ask({ type: 'everywhere' });
    else this.lostAt = Date.now();
  }

  private search(job: Job, frame: HTMLCanvasElement, stale: () => boolean): Promise<Found | undefined> {
    const b = this.buildings;
    switch (job.type) {
      case 'everywhere':
        return searchEverywhere(frame, b, ALL_SCALES, stale);
      case 'check':
        return this.camera
          ? refine(stale, frame, b, [this.camera], [{ d: 8, reach: 2, factors: [1] }, ...SHARPEN.slice(1)])
          : Promise.resolve(undefined);
      case 'drag': {
        // A pan, or a building moved and the map left where it was.
        const first: Pass = { d: 8, reach: 12, factors: [1] };
        return refine(stale, frame, b, [panned(job.from, job.dx, job.dy), job.from], [first, ...SHARPEN.slice(1)]);
      }
      case 'zoom': {
        // The steps seen so far exactly, and any scale within a few steps either way in case it is
        // one not seen yet.
        const scales = [
          ...this.zoomSteps,
          ...Array.from({ length: 30 }, (_, i) => job.from.scale * Math.pow(1.04, i - 14)),
        ].filter((s) => Math.abs(s - job.from.scale) / job.from.scale > 0.02);
        // The spot under the cursor most likely stays put; the screen's centre is the other guess.
        const centre = { x: frame.width / 2, y: frame.height / 2 };
        const guesses = scales.flatMap((s) => [zoomedAbout(job.from, job.cursor, s), zoomedAbout(job.from, centre, s)]);
        return refine(stale, frame, b, [...guesses, job.from], [{ d: 12, reach: 5, factors: [1] }, ...SHARPEN]);
      }
      case 'wide':
        return this.camera
          ? refine(stale, frame, b, [this.camera], [{ d: 16, reach: 30, factors: [0.97, 1, 1.03] }, ...SHARPEN])
          : searchEverywhere(frame, b, ALL_SCALES, stale);
    }
  }
}

/** The one tracker, started by its first listener and stopped with its last. */
export const cameraTracker = new CameraTracker();
