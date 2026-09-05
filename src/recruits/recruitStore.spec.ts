import { parseRecruitBook } from './recruitStore';

describe('parseRecruitBook', () => {
  it('turns the bare timestamps of an older book into moments of unknown kind', () => {
    const book = parseRecruitBook(JSON.stringify({ recruits: { 42: { playerId: 42, activityAt: [5, 9] } } }));
    expect(book.recruits['42'].activity).toEqual([
      { at: 5, kind: 'other' },
      { at: 9, kind: 'other' },
    ]);
    expect('activityAt' in book.recruits['42']).toBe(false);
  });

  it('starts empty from nothing, or from something that is not a book', () => {
    expect(parseRecruitBook(undefined).recruits).toEqual({});
    expect(parseRecruitBook('not json').recruits).toEqual({});
  });
});
