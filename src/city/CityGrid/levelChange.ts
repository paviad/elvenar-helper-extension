import { BuildingEx } from '../../model/buildingEx';
import { CityBlock } from '../CityBlock';
import { getChapterFromEntity } from '../getCityBlockFromCityEntity';

// Codes rather than keys: '+' and '-' sit on different keys from one keyboard
// layout to the next, and the numpad pair carries its own codes either way.
const LEVEL_UP_CODES = ['Equal', 'NumpadAdd', 'BracketRight'];
const LEVEL_DOWN_CODES = ['Minus', 'NumpadSubtract', 'Slash'];

/** Whether a key press is one of the level/stage steppers. */
export function isLevelKey(code: string): boolean {
  return LEVEL_UP_CODES.includes(code) || LEVEL_DOWN_CODES.includes(code);
}

export interface LevelAndStage {
  level: number;
  stage?: number;
}

/**
 * Where a +/- press lands. Shift steps the stage of an evolving building, anything
 * else the level. A step that would run past an end - level 1, stage 1, the last
 * stage - returns the input unchanged, and so does a stage step on a building that
 * has no stages, which is how a caller tells a press apart from a change.
 *
 * The level has no ceiling here: how far a building goes is a property of the
 * building catalog, so the caller finds out by asking it for the new level.
 */
export function stepLevelAndStage(
  current: LevelAndStage,
  code: string,
  shiftKey: boolean,
  maxStage: number,
): LevelAndStage {
  const up = LEVEL_UP_CODES.includes(code);
  if (!up && !LEVEL_DOWN_CODES.includes(code)) return current;

  if (shiftKey) {
    const stage = current.stage;
    if (stage === undefined) return current;
    if (up) return stage < maxStage ? { ...current, stage: stage + 1 } : current;
    return stage > 1 ? { ...current, stage: stage - 1 } : current;
  }

  if (up) return { ...current, level: current.level + 1 };
  return current.level > 1 ? { ...current, level: current.level - 1 } : current;
}

/**
 * The block as it stands at `target`, taking its footprint from the building the
 * catalog holds at that level. Position and id are left alone: whether the change
 * settles in place or becomes a fresh block to carry around is the caller's call.
 */
export function blockAtLevel(
  block: CityBlock,
  target: LevelAndStage,
  newBuilding: Pick<BuildingEx, 'id' | 'width' | 'length'>,
): CityBlock {
  const { level, stage } = target;

  return {
    ...block,
    gameId: block.gameId.replace(/_\d+$/, `_${level}`),
    entity: {
      ...block.entity,
      cityentity_id: block.entity.cityentity_id.replace(/_\d+$/, `_${level}`),
      level,
      stage,
    },
    width: newBuilding.width,
    length: newBuilding.length,
    level,
    stage,
    chapter: getChapterFromEntity(undefined, newBuilding.id, block.type, level),
    label: `${level}`,
  };
}
