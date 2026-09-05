// focus-probe.js — why does the "n/32" loading screen freeze when the window loses focus?
//
// Paste the whole file into the DevTools console of the game tab (top frame, MAIN world)
// right after a reload, while the loading screen is still counting. Then switch away
// (click another window / minimise / cover it) and read the log when you come back.
//
// What it measures, once per second:
//   rAF/s        — frames the browser is actually delivering. The game's whole frame loop
//                  (lime `handleApplicationEvent`, enterFrame, GameClock, Starling, the
//                  loading-screen redraw) hangs off requestAnimationFrame. 0 here = the
//                  browser withheld frames = everything frame-driven in the game is stalled.
//   ticks/s      — setInterval(50ms) ticks; drops to ~1 when Chrome throttles timers.
//   vis / focus  — document.visibilityState / document.hasFocus() at the time of each line.
// It also logs window blur/focus, visibilitychange, and each bootstrap step transition
// (needs the extension's `window.aviad` class registry).
//
// Optional experiment: `window.__keepAlive = true` makes any rAF callback fall back to a
// 100 ms setTimeout when the browser has not delivered a frame in time. If the counter
// keeps advancing while unfocused with this on, the freeze is "browser withheld rAF" and
// nothing else. Set it to false (default) for a pure passthrough.
(() => {
  const t0 = performance.now();
  const stamp = () =>
    `${((performance.now() - t0) / 1000).toFixed(1)}s vis=${document.visibilityState} focus=${document.hasFocus()}`;
  const log = (...args) => console.log(`[probe ${stamp()}]`, ...args);

  const nativeRAF = window.requestAnimationFrame.bind(window);
  const nativeCancel = window.cancelAnimationFrame.bind(window);

  // 1. Is the browser still delivering frames / timers?
  let frames = 0;
  let ticks = 0;
  const onFrame = () => {
    frames++;
    nativeRAF(onFrame);
  };
  nativeRAF(onFrame);
  setInterval(() => ticks++, 50);
  setInterval(() => {
    log(`rAF/s=${frames}  setInterval(50ms) ticks/s=${ticks}  (expect ~60 / ~20)`);
    frames = 0;
    ticks = 0;
  }, 1000);

  // 2. What does the page see when you switch away?
  window.addEventListener('blur', () => log('window blur'));
  window.addEventListener('focus', () => log('window focus'));
  document.addEventListener('visibilitychange', () => log('visibilitychange ->', document.visibilityState));

  // 3. Optional keep-alive (see header). Pure passthrough while window.__keepAlive is falsy.
  //    The fallback keeps polling until either the real frame arrives or the flag is turned on,
  //    so flipping the flag later still revives a callback already parked in the rAF queue.
  //    Only affects callers that look up window.requestAnimationFrame at call time (lime does);
  //    GSAP captures it at load, so tweens stay frozen unless TweenLite.ticker.useRAF(false).
  window.__keepAlive = window.__keepAlive || false;
  window.requestAnimationFrame = (cb) => {
    let done = false;
    let timer = 0;
    const id = nativeRAF((ts) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      cb(ts);
    });
    const fallback = () => {
      if (done) return;
      if (!window.__keepAlive) {
        timer = setTimeout(fallback, 100);
        return;
      }
      done = true;
      nativeCancel(id);
      cb(performance.now());
    };
    timer = setTimeout(fallback, 100);
    return id;
  };

  // 4. Which bootstrap step just finished / is running next.
  const registry = window.aviad;
  const Sequence = registry && registry['de.innogames.onyx.city.controller.bootstrap.ConfigurationSequence'];
  if (!Sequence) {
    log('window.aviad not found - bootstrap step logging disabled (probe still measures frames)');
    return;
  }
  const className = (o) => (o && o.__class__ && o.__class__.__name__ ? o.__class__.__name__.split('.').pop() : '?');
  const originalOnProgress = Sequence.prototype.onProgress;
  Sequence.prototype.onProgress = function (event) {
    originalOnProgress.call(this, event);
    const next = this._commands && this._commands.get ? this._commands.get(this._stepIndex) : null;
    log(`bootstrap ${this.get_progress()}/${this.get_total()}  finished ${this._getStepName()}  next ${className(next)}`);
  };
  log('probe armed');
})();
