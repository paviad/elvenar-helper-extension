import { SeasonalEvent } from '../model/seasonalEvent';
import { nextTournament, TOURNAMENT_CYCLE } from './tournamentGuide';
import { readTournamentStatus, upcomingTournament } from './tournamentSchedule';

const event = (subType: string, state: string, remainingTime?: number): SeasonalEvent =>
  ({
    __class__: 'SeasonalEventVO',
    eventId: 1,
    type: 'tournament',
    subType,
    name: `${subType} Tournament`,
    state,
    remainingTime,
  }) satisfies SeasonalEvent;

describe('nextTournament', () => {
  it('follows the rotation', () => {
    expect(nextTournament('marble')).toBe('steel');
    expect(nextTournament('scrolls')).toBe('silk');
    expect(nextTournament('magic_dust')).toBe('gems');
  });

  it('wraps around at the end', () => {
    expect(nextTournament('gems')).toBe('marble');
  });

  it('walks the whole cycle and returns to the start', () => {
    const walked = TOURNAMENT_CYCLE.reduce((good) => nextTournament(good), TOURNAMENT_CYCLE[0]);
    expect(walked).toBe(TOURNAMENT_CYCLE[0]);
  });
});

describe('readTournamentStatus', () => {
  // The shape of a real startup response: the previous tournament is kept as 'last'.
  const liveEvents = [
    event('magic_dust', 'last'),
    event('gems', 'running', 83080),
    { ...event('ignored', 'running'), type: 'spireEvent' },
  ];

  it('reads the running tournament and the one before it', () => {
    const status = readTournamentStatus(liveEvents);

    expect(status.running).toEqual({ good: 'gems', remainingTime: 83080 });
    expect(status.ended).toBe('magic_dust');
  });

  it('anchors on the running tournament when there is one', () => {
    expect(readTournamentStatus(liveEvents).anchor).toBe('gems');
  });

  it('anchors on the ended one between rounds', () => {
    expect(readTournamentStatus([event('gems', 'last')]).anchor).toBe('gems');
  });

  it('treats a freshly announced tournament as running', () => {
    expect(readTournamentStatus([event('silk', 'new')]).anchor).toBe('silk');
  });

  it('ignores events that are not tournaments', () => {
    const status = readTournamentStatus([{ ...event('spire_something', 'running'), type: 'spireEvent' }]);

    expect(status.anchor).toBeUndefined();
  });

  it('copes with no events at all', () => {
    expect(readTournamentStatus(undefined).anchor).toBeUndefined();
  });
});

describe('upcomingTournament', () => {
  it('counts forward from the running tournament', () => {
    // Gems is the last of the rotation, so preparation rolls back round to Marble.
    expect(upcomingTournament(readTournamentStatus([event('gems', 'running')]), undefined)).toBe('marble');
  });

  it('counts forward from the one that just ended', () => {
    expect(upcomingTournament(readTournamentStatus([event('magic_dust', 'last')]), undefined)).toBe('gems');
  });

  it('falls back on what was remembered when the events say nothing', () => {
    expect(upcomingTournament({}, 'scrolls')).toBe('silk');
  });

  it('prefers live events over what was remembered', () => {
    expect(upcomingTournament(readTournamentStatus([event('steel', 'running')]), 'scrolls')).toBe('planks');
  });

  it('has no answer before any tournament has been seen', () => {
    expect(upcomingTournament({}, undefined)).toBeUndefined();
  });
});
