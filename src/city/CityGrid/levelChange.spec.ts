import { makeCityBlock, makeCityEntityEx } from '../../testing/fixtures';
import { blockAtLevel, isLevelKey, stepLevelAndStage } from './levelChange';

describe('isLevelKey', () => {
  it('accepts both ends of the row and the numpad', () => {
    ['Equal', 'NumpadAdd', 'BracketRight', 'Minus', 'NumpadSubtract', 'Slash'].forEach((code) =>
      expect(isLevelKey(code)).toBe(true),
    );
  });

  it('ignores everything else', () => {
    ['KeyA', 'Delete', 'Digit1', 'Escape'].forEach((code) => expect(isLevelKey(code)).toBe(false));
  });
});

describe('stepLevelAndStage', () => {
  const at = (level: number, stage?: number) => ({ level, stage });

  it('steps the level up and down without Shift', () => {
    expect(stepLevelAndStage(at(4), 'Equal', false, 0)).toEqual(at(5));
    expect(stepLevelAndStage(at(4), 'Minus', false, 0)).toEqual(at(3));
  });

  it('leaves the stage alone when the level moves', () => {
    expect(stepLevelAndStage(at(4, 2), 'Equal', false, 5)).toEqual(at(5, 2));
  });

  it('stops going down at level 1', () => {
    expect(stepLevelAndStage(at(1), 'Minus', false, 0)).toEqual(at(1));
  });

  it('has no ceiling of its own - the catalog is what runs out', () => {
    expect(stepLevelAndStage(at(99), 'Equal', false, 0)).toEqual(at(100));
  });

  it('steps the stage with Shift, and holds the level', () => {
    expect(stepLevelAndStage(at(4, 2), 'Equal', true, 5)).toEqual(at(4, 3));
    expect(stepLevelAndStage(at(4, 2), 'Minus', true, 5)).toEqual(at(4, 1));
  });

  it('clamps the stage to the building max and to 1', () => {
    expect(stepLevelAndStage(at(4, 5), 'Equal', true, 5)).toEqual(at(4, 5));
    expect(stepLevelAndStage(at(4, 1), 'Minus', true, 5)).toEqual(at(4, 1));
  });

  it('does nothing on Shift for a building that has no stages', () => {
    expect(stepLevelAndStage(at(4), 'Equal', true, 0)).toEqual(at(4));
    expect(stepLevelAndStage(at(4), 'Minus', true, 0)).toEqual(at(4));
  });

  it('returns the input untouched for a key that is not a stepper', () => {
    const current = at(4, 2);
    expect(stepLevelAndStage(current, 'KeyA', false, 5)).toBe(current);
  });
});

describe('blockAtLevel', () => {
  const steel3 = { id: 'G_Steel_3', width: 4, length: 5 };

  it('renames the block to the new level and takes the new footprint', () => {
    const block = makeCityBlock();
    const result = blockAtLevel(block, { level: 3 }, steel3);

    expect(result.gameId).toBe('G_Steel_3');
    expect(result.entity.cityentity_id).toBe('G_Steel_3');
    expect(result.level).toBe(3);
    expect(result.entity.level).toBe(3);
    expect(result.label).toBe('3');
    expect([result.width, result.length]).toEqual([4, 5]);
  });

  it('leaves the block where it stands, under the same id', () => {
    const block = makeCityBlock({ id: 42, x: 5, y: 7 });
    const result = blockAtLevel(block, { level: 3 }, steel3);

    expect(result.id).toBe(42);
    expect([result.x, result.y]).toEqual([5, 7]);
  });

  it('carries the stage onto both the block and its entity', () => {
    const block = makeCityBlock({ stage: 2, entity: makeCityEntityEx({ stage: 2 }) });
    const result = blockAtLevel(block, { level: 1, stage: 3 }, { id: 'G_Steel_1', width: 3, length: 4 });

    expect(result.stage).toBe(3);
    expect(result.entity.stage).toBe(3);
  });

  it('re-derives the chapter, which for a premium building follows its level', () => {
    const entity = makeCityEntityEx({ cityentity_id: 'R_Premium_2', level: 2, type: 'premium_residential' });
    const block = makeCityBlock({ entity, chapter: 2 });

    const result = blockAtLevel(block, { level: 3 }, { id: 'R_Premium_3', width: 3, length: 3 });

    expect(result.chapter).toBe(3);
  });
});
