import { CityEntity } from '../model/cityEntity';
import { decide, WatchedBuilding } from './productionWatcher';

const CITY_LOADED_AT = 1_000_000;
const NOW = 2_000_000;

const entity = (stateClass: string, next_state_transition_in?: number, stateAt?: number): CityEntity =>
  ({
    cityentity_id: 'P_Humans_Workshop_1',
    id: 17020,
    level: 1,
    player_id: 1,
    type: 'production',
    x: 1,
    y: 1,
    connected: true,
    stateAt,
    state: { __class__: stateClass, next_state_transition_in },
  }) as unknown as CityEntity;

const fresh = (): WatchedBuilding => ({ key: 'whatever' });

/** The default is a manual production - the only kind there is anything to start. */
const ctx = (manual = true) => ({ manual, cityLoadedAt: CITY_LOADED_AT, now: NOW });

const after = (action: 'pickup' | 'start', agoMs: number): WatchedBuilding => ({
  key: 'whatever',
  last: { action, at: NOW - agoMs },
});

describe('decide', () => {
  it('leaves a production that is still running alone', () => {
    const producing = entity('ProducingVO', 120, NOW);

    expect(decide(producing, fresh(), ctx())).toEqual({ action: 'none', note: 'producing' });
  });

  it('collects a production whose countdown has run out, even though the game still calls it running', () => {
    const elapsed = entity('ProducingVO', 120, NOW - 200_000);

    expect(decide(elapsed, fresh(), ctx()).action).toBe('pickup');
  });

  it('collects a production the game has reported as finished', () => {
    expect(decide(entity('ProductionFinishedVO'), fresh(), ctx()).action).toBe('pickup');
  });

  it('starts an idle building straight away', () => {
    expect(decide(entity('IdleVO'), fresh(), ctx()).action).toBe('start');
  });

  it('starts on the poll after a collect, without waiting for the game to report the idle state', () => {
    // The stored state still says finished - the game's own model went idle when the collect
    // landed, and `localStartProduction` passes over the building if it did not.
    const state = decide(entity('ProductionFinishedVO'), after('pickup', 5_000), ctx());

    expect(state.action).toBe('start');
  });

  it('sends nothing more while it waits for the start to be reported back', () => {
    const state = decide(entity('IdleVO'), after('start', 5_000), ctx());

    expect(state).toEqual({ action: 'none', note: 'waiting for the game to report the new production' });
  });

  it('starts again when the building is still idle long after the start went out', () => {
    // What a start the stock could not pay for looks like: nothing happened and nothing said so.
    const state = decide(entity('IdleVO'), after('start', 60_000), ctx());

    expect(state).toEqual({ action: 'start', note: 'retrying the start' });
  });

  it('collects again when the building is still holding a finished production', () => {
    // A collect the game refused - a full storage, say - leaves it exactly like this.
    const state = decide(entity('ProductionFinishedVO'), after('start', 60_000), ctx());

    expect(state).toEqual({ action: 'pickup', note: 'retrying the collect' });
  });

  it('collects a production that is not started by hand, but does not start one', () => {
    // An automatic building makes its own way; there is nothing to send it.
    expect(decide(entity('ProductionFinishedVO'), fresh(), ctx(false)).action).toBe('pickup');
    expect(decide(entity('IdleVO'), fresh(), ctx(false))).toEqual({
      action: 'none',
      note: 'not a manual production to start',
    });
  });

  it('does not start one after collecting it either', () => {
    const state = decide(entity('ProductionFinishedVO'), after('pickup', 5_000), ctx(false));

    expect(state.action).toBe('none');
  });

  it('does not take the retry as licence to start one', () => {
    const state = decide(entity('IdleVO'), after('start', 60_000), ctx(false));

    expect(state.action).toBe('none');
  });

  it('does nothing to a building that is doing something else entirely', () => {
    expect(decide(entity('UpgradingVO', 900, NOW), fresh(), ctx())).toEqual({
      action: 'none',
      note: 'is UpgradingVO',
    });
  });

  it('measures the countdown from the city load when the building has not been reported since', () => {
    // 120s from a city loaded 1000s ago: long over.
    expect(decide(entity('ProducingVO', 120), fresh(), ctx()).action).toBe('pickup');
    // 2000s from that same load: still 1000s to go.
    expect(decide(entity('ProducingVO', 2000), fresh(), ctx()).note).toBe('producing');
  });
});
