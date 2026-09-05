import { emptyRecruitBook, recordSighting } from '../recruits/recruitBook';
import { keepUnchanged } from './useRecruitBook';

const bookOf = (...ids: number[]) => {
  const book = emptyRecruitBook();
  ids.forEach((playerId) =>
    recordSighting(book, { playerId, name: `p${playerId}`, source: 'neighbour', at: 1, chapter: 7, guild: null }, {}),
  );
  return book;
};

describe('keepUnchanged', () => {
  it('keeps the earlier object for a candidate whose data is the same, and takes the new one otherwise', () => {
    const before = bookOf(1, 2);
    const after = bookOf(1, 2, 3);
    after.recruits['2'].notes = 'changed';

    const kept = keepUnchanged(before, after);

    expect(kept.recruits['1']).toBe(before.recruits['1']);
    expect(kept.recruits['2']).toBe(after.recruits['2']);
    expect(kept.recruits['3']).toBe(after.recruits['3']);
  });

  it('takes the new book as it is the first time', () => {
    const after = bookOf(1);
    expect(keepUnchanged(undefined, after)).toBe(after);
  });
});
