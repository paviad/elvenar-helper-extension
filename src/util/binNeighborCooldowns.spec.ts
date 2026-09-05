import { WorldNeighbor } from '../model/worldNeighbors';
import { binNeighborCooldowns, COOLDOWN_BIN_MS } from './binNeighborCooldowns';

const NOW = 1_700_000_000_000;

/** A neighbor is only interesting here for its name and when its cooldown runs out. */
const neighbor = (name: string, endsInMinutes?: number): WorldNeighbor =>
  ({
    name,
    player_id: name.length,
    cool_down: endsInMinutes === undefined ? undefined : endsInMinutes * 60,
    cooldownEndsAt: endsInMinutes === undefined ? undefined : NOW + endsInMinutes * 60 * 1000,
  }) as unknown as WorldNeighbor;

describe('binNeighborCooldowns', () => {
  it('has nothing to show when everybody is off cooldown', () => {
    expect(binNeighborCooldowns([neighbor('Ana'), neighbor('Bo')], NOW)).toEqual([]);
  });

  it('puts everyone due inside the hour in the first bin', () => {
    const bins = binNeighborCooldowns([neighbor('Ana', 5), neighbor('Bo', 59)], NOW);

    expect(bins).toHaveLength(1);
    expect(bins[0].hour).toBe(0);
    expect(bins[0].neighbors.map((n) => n.name)).toEqual(['Ana', 'Bo']);
  });

  it('splits the hours apart on the hour boundary', () => {
    const bins = binNeighborCooldowns([neighbor('Ana', 60), neighbor('Bo', 59)], NOW);

    expect(bins.map((bin) => bin.neighbors.map((n) => n.name))).toEqual([['Bo'], ['Ana']]);
  });

  it('keeps the empty hours in between so the timeline stays continuous', () => {
    const bins = binNeighborCooldowns([neighbor('Ana', 10), neighbor('Bo', 200)], NOW);

    expect(bins.map((bin) => bin.hour)).toEqual([0, 1, 2, 3]);
    expect(bins.map((bin) => bin.neighbors.length)).toEqual([1, 0, 0, 1]);
  });

  it('runs a total of how many will be back by the end of each bin', () => {
    const bins = binNeighborCooldowns([neighbor('Ana', 10), neighbor('Bo', 20), neighbor('Cy', 130)], NOW);

    expect(bins.map((bin) => bin.cumulative)).toEqual([2, 2, 3]);
  });

  it('spans each bin from the hour it covers', () => {
    const bins = binNeighborCooldowns([neighbor('Ana', 70)], NOW);

    expect(bins[1].start).toBe(NOW + COOLDOWN_BIN_MS);
    expect(bins[1].end).toBe(NOW + 2 * COOLDOWN_BIN_MS);
  });

  it('counts a cooldown that ran out while the list sat around as due within the hour', () => {
    // The stamp is what makes this visible at all: `cool_down` alone would still claim the full
    // twenty minutes were left.
    const bins = binNeighborCooldowns([neighbor('Ana', -20), neighbor('Bo', 30)], NOW);

    expect(bins).toHaveLength(1);
    expect(bins[0].neighbors.map((n) => n.name)).toEqual(['Ana', 'Bo']);
  });

  it('sorts the soonest first inside a bin whatever order they arrived in', () => {
    const bins = binNeighborCooldowns([neighbor('Cy', 40), neighbor('Ana', 5), neighbor('Bo', 20)], NOW);

    expect(bins[0].neighbors.map((n) => n.name)).toEqual(['Ana', 'Bo', 'Cy']);
  });

  it('leaves the list it was given alone', () => {
    const neighbors = [neighbor('Cy', 40), neighbor('Ana', 5)];

    binNeighborCooldowns(neighbors, NOW);

    expect(neighbors.map((n) => n.name)).toEqual(['Cy', 'Ana']);
  });
});
