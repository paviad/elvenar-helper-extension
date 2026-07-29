import { getTypeColor, getTypeName } from './getTypeColor';
import { knownTypes } from './knownTypes';
import { TYPE_COLORS } from './TYPE_COLORS';

describe('getTypeColor', () => {
  it('uses the mapped colour for a known type', () => {
    expect(getTypeColor('goods', [])).toBe(knownTypes.goods);
  });

  it('assigns unknown types a palette colour by their position in allTypes', () => {
    const allTypes = ['mystery_a', 'mystery_b'];

    expect(getTypeColor('mystery_a', allTypes)).toBe(TYPE_COLORS[0]);
    expect(getTypeColor('mystery_b', allTypes)).toBe(TYPE_COLORS[1]);
  });

  it('wraps around when there are more unknown types than palette colours', () => {
    const allTypes = Array.from({ length: TYPE_COLORS.length + 1 }, (_, i) => `mystery_${i}`);

    expect(getTypeColor(`mystery_${TYPE_COLORS.length}`, allTypes)).toBe(TYPE_COLORS[0]);
  });

  it('falls back to black for an unknown type missing from allTypes', () => {
    expect(getTypeColor('mystery', [])).toBe('#000');
  });

  it('adds an alpha suffix for moved blocks', () => {
    expect(getTypeColor('goods', [], true)).toBe(`${knownTypes.goods}AA`);
  });
});

describe('getTypeName', () => {
  it('describes a known colour', () => {
    expect(getTypeName('goods', [])).toBe('Goods Buildings');
  });

  it('reports unknown for a palette colour', () => {
    expect(getTypeName('mystery_a', ['mystery_a'])).toBe('Unknown Type');
  });

  it('reports unknown for a moved block, because the alpha suffix is not a legend key', () => {
    expect(getTypeName('goods', [], true)).toBe('Unknown Type');
  });
});
