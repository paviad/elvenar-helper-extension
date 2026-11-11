import { SeasonalEvent } from '../model/seasonalEvent';
import { tournamentMarks } from './tournamentMarks';

const tournament = (subType: string, state: string, remainingTime?: number): SeasonalEvent => ({
  __class__: 'SeasonalEventVO',
  eventId: 1,
  type: 'tournament',
  subType,
  name: subType,
  state,
  remainingTime,
});

const READ_AT = 1_000_000;

describe('tournamentMarks', () => {
  it('marks the tournament in play and the one after it', () => {
    const events = [tournament('steel', 'last'), tournament('planks', 'running', 3600)];
    expect(tournamentMarks(events, READ_AT, READ_AT + 1000)).toEqual({ current: 'planks', next: 'crystal' });
  });

  it('wraps round the rotation', () => {
    expect(tournamentMarks([tournament('gems', 'running', 3600)], READ_AT, READ_AT)).toEqual({
      current: 'gems',
      next: 'marble',
    });
  });

  it('marks only the next one between tournaments', () => {
    expect(tournamentMarks([tournament('planks', 'last')], READ_AT, READ_AT)).toEqual({
      current: undefined,
      next: 'crystal',
    });
  });

  it('takes a tournament whose time ran out since the game was loaded as over', () => {
    const events = [tournament('planks', 'running', 3600)];
    expect(tournamentMarks(events, READ_AT, READ_AT + 3600_000)).toEqual({ current: undefined, next: 'crystal' });
  });

  it('marks nothing when the game mentioned no tournament', () => {
    expect(tournamentMarks(undefined, READ_AT, READ_AT)).toEqual({ current: undefined, next: undefined });
  });
});
