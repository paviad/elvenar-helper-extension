import { sameOfferedGoods } from './offeredGoods';

describe('sameOfferedGoods', () => {
  it('treats a reordered list as the same list', () => {
    expect(sameOfferedGoods(['ascendedsilk', 'ascendedgems'], ['ascendedgems', 'ascendedsilk'])).toBe(true);
  });

  it('treats two empty lists as the same list', () => {
    expect(sameOfferedGoods([], [])).toBe(true);
  });

  it('spots a good that was added', () => {
    expect(sameOfferedGoods(['ascendedsilk', 'ascendedgems'], ['ascendedsilk'])).toBe(false);
  });

  it('spots a good that was swapped for another', () => {
    expect(sameOfferedGoods(['ascendedsilk'], ['ascendedgems'])).toBe(false);
  });

  it('spots the list emptying out', () => {
    expect(sameOfferedGoods([], ['ascendedsilk'])).toBe(false);
  });
});
