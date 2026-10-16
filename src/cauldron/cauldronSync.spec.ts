import { Ingredient } from '../model/ingredient';
import {
  cauldronWorldName,
  disabledEffectIndexes,
  effectIndex,
  ingredientIndex,
  premiumIngredientIndexes,
  selectedEffectIndexes,
} from './cauldronSync';

const ingredient = (id: string, isPremium: boolean): Ingredient => ({ id, name: id, isPremium, description: '' });

describe('cauldronWorldName', () => {
  it('names the world after the player and the server', () => {
    expect(cauldronWorldName('Balrogville', 'en3')).toBe('EA-Balrogville-en3');
  });

  it('cuts a long player name to fit the site limit, keeping the server', () => {
    const name = cauldronWorldName('AVeryLongPlayerNameIndeed', 'en13');
    expect(name).toBe('EA-AVeryLongPlayerN-en13');
    expect(name).toHaveLength(24);
  });

  it('collapses whitespace the way the site does', () => {
    expect(cauldronWorldName('  Lord   of  Elves ', 'zz')).toBe('EA-Lord of Elves-zz');
  });

  it('leaves no space before the server when the cut lands on one', () => {
    // 16 characters fit beside "en13", and the 16th is the space after "letters"
    expect(cauldronWorldName('Fifteen letters X', 'en13')).toBe('EA-Fifteen letters-en13');
  });
});

describe('ingredientIndex', () => {
  it('maps the game ids to the site indexes', () => {
    expect(ingredientIndex('cauldron_ingredient1')).toBe(0);
    expect(ingredientIndex('cauldron_ingredient12')).toBe(11);
  });

  it('rejects anything else', () => {
    expect(ingredientIndex('cauldron_ingredient0')).toBeUndefined();
    expect(ingredientIndex('cauldron_ingredient13')).toBeUndefined();
    expect(ingredientIndex('marble')).toBeUndefined();
  });
});

describe('premiumIngredientIndexes', () => {
  it('lists the premium ingredients as sorted site indexes', () => {
    expect(
      premiumIngredientIndexes([
        ingredient('cauldron_ingredient11', true),
        ingredient('cauldron_ingredient2', false),
        ingredient('cauldron_ingredient1', true),
        ingredient('cauldron_ingredient12', true),
      ]),
    ).toEqual([0, 10, 11]);
  });

  it('is empty when the game sent no ingredients, as during the cooldown', () => {
    expect(premiumIngredientIndexes([])).toEqual([]);
  });
});

describe('effectIndex', () => {
  it('maps the game effect ids to the site indexes', () => {
    expect(effectIndex('pe_301')).toBe(0);
    expect(effectIndex('pe_325')).toBe(24);
  });

  it('rejects anything else', () => {
    expect(effectIndex('pe_300')).toBeUndefined();
    expect(effectIndex('marble')).toBeUndefined();
  });
});

describe('disabledEffectIndexes', () => {
  it('lists only the effects switched off, sorted', () => {
    expect(
      disabledEffectIndexes([
        { id: 'pe_310', enabled: false },
        { id: 'pe_301', enabled: true },
        { id: 'pe_303', enabled: false },
        { id: 'pe_302', enabled: true },
      ]),
    ).toEqual([2, 9]);
  });

  it('counts an effect without enabled as switched off, as the game sends it', () => {
    expect(disabledEffectIndexes([{ id: 'pe_304' }, { id: 'pe_301', enabled: true }])).toEqual([3]);
  });
});

describe('selectedEffectIndexes', () => {
  it('keeps the unlocked effects left on', () => {
    expect(selectedEffectIndexes(5, [1, 3])).toEqual([0, 2, 4]);
  });

  it('ignores switched-off effects not unlocked yet', () => {
    expect(selectedEffectIndexes(3, [7])).toEqual([0, 1, 2]);
  });
});
