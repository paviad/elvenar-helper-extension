import { preventSessionTimeout } from './preventSessionTimeout';

/** Enough of the class registry to be patched, and a clock that records what left it. */
const fakeGame = ({ withModel = true, withClock = true } = {}) => {
  const unscheduled: unknown[] = [];
  const original = jest.fn();
  const applicationModel = { prototype: { onTick: original } };
  const clock = { unschedule: (tickObject: unknown) => unscheduled.push(tickObject) };

  (globalThis as { window?: unknown }).window = {
    aviad: {
      ...(withModel ? { 'de.innogames.onyx.city.model.ApplicationModel': applicationModel } : {}),
      ...(withClock ? { 'de.innogames.shared.util.clock.GameClock': clock } : {}),
    },
  };

  return { applicationModel, original, unscheduled };
};

describe('preventSessionTimeout', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete (globalThis as { window?: unknown }).window;
  });

  it('replaces the watchdog so it can never raise the reload window', () => {
    const { applicationModel, original } = fakeGame();

    expect(preventSessionTimeout()).toBe(true);
    expect(applicationModel.prototype.onTick).not.toBe(original);

    // What the clock does forty minutes after the window loses focus.
    applicationModel.prototype.onTick.call({}, 2400000);
    expect(original).not.toHaveBeenCalled();
  });

  it('still takes the model back off the clock, as the original does on its way out', () => {
    const { applicationModel, unscheduled } = fakeGame();
    preventSessionTimeout();

    const model = { iAm: 'ApplicationModel' };
    applicationModel.prototype.onTick.call(model, 2400000);
    expect(unscheduled).toEqual([model]);
  });

  it('survives the watchdog being scheduled more than once - a blur per alt-tab', () => {
    const { applicationModel, unscheduled } = fakeGame();
    preventSessionTimeout();

    const model = {};
    applicationModel.prototype.onTick.call(model, 2400000);
    applicationModel.prototype.onTick.call(model, 2400000);
    expect(unscheduled).toHaveLength(2);
  });

  it('says so and leaves the game alone when the registry is not there to patch', () => {
    (globalThis as { window?: unknown }).window = {};
    expect(preventSessionTimeout()).toBe(false);

    const { applicationModel, original } = fakeGame({ withClock: false });
    expect(preventSessionTimeout()).toBe(false);
    // Left as it was rather than half-patched into something that throws on the clock's next tick.
    expect(applicationModel.prototype.onTick).toBe(original);
  });
});
