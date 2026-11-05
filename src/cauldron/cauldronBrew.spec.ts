import { addBrew, addGobletResult, CauldronBrew, confirmGoblet, MAX_BREWS } from './cauldronBrew';

const brew = (at: number): CauldronBrew => ({
  id: `en3-${at}`,
  at,
  worldId: 'en3',
  ingredients: [],
  spellFragments: 0,
  premiumBoost: 0,
  effects: [],
  disabledEffects: [],
  goblets: [],
});

describe('addBrew', () => {
  it('starts the list', () => {
    expect(addBrew(undefined, brew(1)).map((b) => b.at)).toEqual([1]);
  });

  it('keeps only the latest brews', () => {
    const brews = Array.from({ length: MAX_BREWS }, (_, i) => brew(i));
    const kept = addBrew(brews, brew(MAX_BREWS));
    expect(kept).toHaveLength(MAX_BREWS);
    expect(kept[0].at).toBe(1);
    expect(kept.at(-1)?.at).toBe(MAX_BREWS);
  });
});

describe('addGobletResult', () => {
  it('adds the goblets in the order they come', () => {
    const b = brew(1);
    addGobletResult(b, { gobletsLeft: 2, success: { id: 7 } });
    addGobletResult(b, { gobletsLeft: 1, failure: { spellFragmentsRefund: 50 } });
    expect(b.goblets.map((g) => g.gobletsLeft)).toEqual([2, 1]);
  });

  it('replaces a result sent again, keeping what the player chose', () => {
    const b = brew(1);
    addGobletResult(b, { gobletsLeft: 2, conflict: { a: 1 } });
    confirmGoblet(b, 9);
    addGobletResult(b, { gobletsLeft: 2, conflict: { a: 1 } });
    expect(b.goblets).toEqual([{ gobletsLeft: 2, conflict: { a: 1 }, confirmed: 9 }]);
  });
});

describe('confirmGoblet', () => {
  it('marks the latest result', () => {
    const b = brew(1);
    addGobletResult(b, { gobletsLeft: 2, success: {} });
    addGobletResult(b, { gobletsLeft: 1, success: {} });
    confirmGoblet(b, 0);
    expect(b.goblets.map((g) => g.confirmed)).toEqual([undefined, 0]);
  });

  it('ignores a confirmation with no result to go with', () => {
    const b = brew(1);
    confirmGoblet(b, 0);
    expect(b.goblets).toEqual([]);
  });
});
