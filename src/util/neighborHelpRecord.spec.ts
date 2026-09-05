import { WorldNeighbor } from '../model/worldNeighbors';
import { applyProvinceUpdate, isAvailableForHelp, markHelpSent } from './neighborHelpRecord';

const NOW = 1_700_000_000_000;

/** A neighbor is only interesting here for who it is and where its cooldown stands. */
const neighbor = (player_id: number, cool_down?: number): WorldNeighbor =>
  ({
    player_id,
    name: `P${player_id}`,
    guild_info: { id: 7, name: 'Guild' },
    cool_down,
    cooldownEndsAt: cool_down === undefined ? undefined : NOW - 1000 + cool_down * 1000,
  }) as unknown as WorldNeighbor;

describe('neighborHelpRecord', () => {
  it('offers only neighbors who are off cooldown and not yet sent help', () => {
    const neighbors = markHelpSent([neighbor(1), neighbor(2), neighbor(3, 600)], 2, NOW);

    expect(neighbors.filter(isAvailableForHelp).map((n) => n.player_id)).toEqual([1]);
  });

  it('marks only the neighbor that was helped and leaves the others untouched', () => {
    const before = [neighbor(1), neighbor(2)];
    const after = markHelpSent(before, 2, NOW);

    expect(after[0]).toBe(before[0]);
    expect(after[1].helpSentAt).toBe(NOW);
    expect(before[1].helpSentAt).toBeUndefined();
  });

  it('replaces the provisional mark with the cooldown the server pushed', () => {
    const neighbors = markHelpSent([neighbor(1), neighbor(2)], 2, NOW - 500);
    const pushed = { player_id: 2, name: 'P2', cool_down: 3600 } as unknown as WorldNeighbor;

    const updated = applyProvinceUpdate(neighbors, pushed, NOW)[1];

    expect(updated.helpSentAt).toBeUndefined();
    expect(updated.cool_down).toBe(3600);
    expect(updated.cooldownEndsAt).toBe(NOW + 3600 * 1000);
    // What the push left out survives from the listed entry.
    expect(updated.guild_info?.name).toBe('Guild');
    expect(isAvailableForHelp(updated)).toBe(false);
  });

  it('clears a stale end time when the pushed province is off cooldown', () => {
    const pushed = { player_id: 1, cool_down: 0 } as unknown as WorldNeighbor;

    const updated = applyProvinceUpdate([neighbor(1, 600)], pushed, NOW)[0];

    expect(updated.cooldownEndsAt).toBeUndefined();
    expect(isAvailableForHelp(updated)).toBe(true);
  });

  it('ignores a province that is not one of the listed neighbors', () => {
    const neighbors = [neighbor(1)];
    const pushed = { player_id: 99, cool_down: 3600 } as unknown as WorldNeighbor;

    expect(applyProvinceUpdate(neighbors, pushed, NOW)).toBe(neighbors);
  });
});
