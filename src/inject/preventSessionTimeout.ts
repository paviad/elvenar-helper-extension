// Stop the game timing its own session out.
//
// `ApplicationModel` registers `deactivate`/`activate` on the stage, and losing the window's
// focus schedules it on the `GameClock` for 2,400,000 ms (`_onApplicationLostFocus`). Forty
// unbroken minutes later `onTick` raises the "Session Timed Out … we need to reload Elvenar"
// window, whose one button navigates the page to the game's index. Getting the focus back at any
// point unschedules it, and re-scheduling starts the accumulator at zero, so it is forty minutes
// of never once coming back - which a tab left running in the background is exactly.
//
// Nothing about it involves the server. It is the client deciding on its own that a long
// unattended page had better start fresh; the session behind it is usually still perfectly good.
// It also only became reachable at all with the frame keep-alive (§0.1) - the `GameClock` counts
// on `enterFrame`, and before that a hidden tab got no frames, so the accumulator never arrived.
// (rev-eng/06 §0.2)

/**
 * Takes the watchdog out, leaving everything around it alone.
 *
 * `ApplicationModel.onTick` exists for this and nothing else: `schedule(this, 2400000)` at L10734
 * is the only place the model is ever put on the clock, and no one calls its `onTick` directly.
 * So the whole of what is unwanted is inside that one method, and the focus listeners, the
 * `LOST_FOCUS`/`RECEIVE_FOCUS` events and everything that listens to them go on as before.
 *
 * The replacement still unschedules, which is what the original does on its way out - otherwise
 * the model sits on the clock's list being walked every frame for the life of the page.
 *
 * Patched on the prototype rather than the instance because `GameClock._proceedTick` reaches for
 * `handler.onTick` at call time (it is not a `$bind` closure, finding 10), so this holds whether
 * or not the model has been constructed yet - and it is called the moment the rewritten bundle
 * has run, which is before it has.
 */
export const preventSessionTimeout = () => {
  const classes = window.aviad as typeof window.aviad | undefined;
  const applicationModel = classes?.['de.innogames.onyx.city.model.ApplicationModel'];
  const clock = classes?.['de.innogames.shared.util.clock.GameClock'];

  if (!applicationModel?.prototype || !clock) {
    console.warn('session timeout left in place - the game classes are not there to patch');
    return false;
  }

  applicationModel.prototype.onTick = function (this: object) {
    clock.unschedule(this);
  };
  console.log('session timeout disabled - the game will not ask to reload after 40 minutes unfocused');
  return true;
};
