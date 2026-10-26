import { ChecklistStep } from '../../city/movePlan/checklist';
import { describeStep, describeUnresolved, Names } from './describeStep';

const names: Names = {
  kind: (kind) => ({ G_Humans_FactoryPaper: 'Paper Mill', O_Humans_Armory: 'Armory' })[kind] ?? kind,
  type: (type) => ({ S_Humans_Trail: 'Trail' })[type] ?? type,
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

  it('counts the tiles of a street run, ends included', () => {
    const step: ChecklistStep = {
      action: { type: 'layRun', street: 'S_Humans_Trail', from: { x: 2, y: 5 }, to: { x: 8, y: 5 } },
      expect: { type: 'streets', street: 'S_Humans_Trail', tiles: [] },
      done: false,
    };

    expect(describeStep(step, names).title).toBe('Lay Trail, 7 tiles');
  });
});

describe('describeUnresolved', () => {
  it('names the buildings it could not find room for', () => {
    const text = describeUnresolved({ reason: 'no-room', ids: [1] }, names, () => 'O_Humans_Armory');

    expect(text).toBe('There is no spare ground to set a building aside on, so Armory cannot be moved yet.');
  });
});
