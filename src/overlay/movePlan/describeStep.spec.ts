import { ChecklistStep } from '../../city/movePlan/checklist';
import { describeStep, describeUnresolved, Names } from './describeStep';

const names: Names = {
  kind: (kind) => ({ G_Humans_FactoryPaper: 'Paper Mill', O_Humans_Armory: 'Armory' })[kind] ?? kind,
};

const chain = (buildings: { id: number; kind: string; then?: { x: number; y: number } }[]): ChecklistStep => ({
  action: { type: 'chain', drops: buildings.map((b) => ({ id: b.id, x: 0, y: 0 })) },
  expect: { type: 'at', buildings: buildings.map((b) => ({ ...b, x: 0, y: 0 })) },
  done: false,
});

describe('describeStep', () => {
  it('names a single move by the building', () => {
    expect(describeStep(chain([{ id: 1, kind: 'G_Humans_FactoryPaper' }]), names).title).toBe('Move Paper Mill');
  });

  it('names a drag through several buildings in the order they come up', () => {
    const text = describeStep(
      chain([
        { id: 1, kind: 'G_Humans_FactoryPaper' },
        { id: 2, kind: 'O_Humans_Armory' },
      ]),
      names,
    );

    expect(text.title).toBe('Move Paper Mill → Armory');
    expect(text.detail).toMatch(/One drag/);
  });

  it('says when a building is only being set aside', () => {
    expect(describeStep(chain([{ id: 1, kind: 'O_Humans_Armory', then: { x: 9, y: 9 } }]), names).title).toBe(
      'Set Armory aside',
    );
  });

  it('gives an upgrade the level it reaches', () => {
    const step: ChecklistStep = {
      action: { type: 'upgrade', id: 1, width: 2, length: 2 },
      expect: { type: 'level', id: 1, kind: 'O_Humans_Armory', level: 7 },
      done: false,
    };

    expect(describeStep(step, names).title).toBe('Upgrade Armory to level 7');
  });

  it('names the building street tiles are vacated for, and leaves selling or moving them to the player', () => {
    const armory = { kind: 'O_Humans_Armory', level: 1, x: 1, y: 1, width: 2, length: 2 };
    const step = (free?: boolean): ChecklistStep => ({
      action: { type: 'sellStreets', tiles: [{ x: 1, y: 1 }], ...(free ? { free } : {}), for: [armory] },
      expect: { type: 'noStreets', tiles: [] },
      done: false,
    });

    expect(describeStep(step(), names)).toEqual({
      title: 'Vacate 1 street tile for Armory',
      detail: 'Sell them, or move them anywhere.',
    });
    // Only the free street, which is not worth keeping, is simply sold.
    expect(describeStep(step(true), names)).toEqual({ title: 'Sell 1 street tile for Armory' });
  });
});

describe('describeUnresolved', () => {
  it('names the buildings it could not find room for', () => {
    const text = describeUnresolved({ reason: 'no-room', ids: [1] }, names, () => 'O_Humans_Armory');

    expect(text).toBe('There is no spare ground to set a building aside on, so Armory cannot be moved yet.');
  });
});
