import { makeCityBlock } from '../../testing/fixtures';
import { CityBlock } from '../CityBlock';
import { findSwapTarget } from './findSwapTarget';

const at = (key: number, x: number, y: number, width = 2, length = 2): [number, CityBlock] => [
  key,
  makeCityBlock({ id: key, x, y, width, length }),
];

const record = (...entries: [number, CityBlock][]): Record<number, CityBlock> => Object.fromEntries(entries);

describe('findSwapTarget', () => {
  it('names the single building a drop lands on', () => {
    // Dragged from (0,0), dropped on the one at (10,10).
    const [, dragged] = at(1, 10, 10);
    const other = at(2, 10, 10);
    const blocks = record([1, dragged], other);

    expect(findSwapTarget(dragged, 1, blocks, { x: 0, y: 0 })).toEqual({
      key: 2,
      block: other[1],
      fitsVacated: true,
    });
  });

  it('refuses a drop that covers two buildings', () => {
    const [, dragged] = at(1, 10, 10, 4, 4);
    const blocks = record([1, dragged], at(2, 10, 10), at(3, 12, 12));

    expect(findSwapTarget(dragged, 1, blocks, { x: 0, y: 0 })).toBeNull();
  });

  it('returns null when the drop is clear, so the caller settles it as an ordinary drop', () => {
    const [, dragged] = at(1, 10, 10);
    const blocks = record([1, dragged], at(2, 20, 20));

    expect(findSwapTarget(dragged, 1, blocks, { x: 0, y: 0 })).toBeNull();
  });

  it('offers the swap whether or not the vacated spot could hold the building taken up', () => {
    // The dragged building is 2x2 and leaves a 2x2 hole; the one in the way is 4x4 and
    // would cover the bystander at (2,0) if it were sent there. It is not: it is carried.
    const [, dragged] = at(1, 10, 10);
    const blocks = record([1, dragged], at(2, 10, 10, 4, 4), at(3, 2, 0));

    expect(findSwapTarget(dragged, 1, blocks, { x: 0, y: 0 })).toMatchObject({ key: 2, fitsVacated: false });
  });

  it('reports the vacated spot as free when nothing stands near it', () => {
    const [, dragged] = at(1, 10, 10);
    const blocks = record([1, dragged], at(2, 10, 10, 4, 4));

    expect(findSwapTarget(dragged, 1, blocks, { x: 0, y: 0 })).toMatchObject({ key: 2, fitsVacated: true });
  });

  it('measures the vacated spot against the place the dragged building has taken', () => {
    // The building in the way is long enough to reach back over the drop site from (0,0),
    // so the spot it leaves behind cannot serve as its fallback.
    const [, dragged] = at(1, 6, 0);
    const blocks = record([1, dragged], at(2, 6, 0, 8, 2));

    expect(findSwapTarget(dragged, 1, blocks, { x: 0, y: 0 })).toMatchObject({ key: 2, fitsVacated: false });
  });
});
