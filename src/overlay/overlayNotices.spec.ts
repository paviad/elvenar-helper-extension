import { getOverlayNotices, setOverlayNotice } from './overlayNotices';

describe('overlay notices', () => {
  afterEach(() => {
    setOverlayNotice('a', undefined);
    setOverlayNotice('b', undefined);
  });

  const titles = () => getOverlayNotices().map((notice) => notice.title);

  it('keeps one notice per source', () => {
    setOverlayNotice('a', { title: 'one' });
    setOverlayNotice('b', { title: 'two' });
    setOverlayNotice('a', { title: 'three' });
    expect(titles()).toEqual(['three', 'two']);
  });

  it('takes a notice down', () => {
    setOverlayNotice('a', { title: 'one' });
    setOverlayNotice('b', { title: 'two' });
    setOverlayNotice('a', undefined);
    expect(titles()).toEqual(['two']);
  });

  it('hands out the same list until something changes', () => {
    setOverlayNotice('a', { title: 'one' });
    const before = getOverlayNotices();
    setOverlayNotice('b', undefined);
    expect(getOverlayNotices()).toBe(before);
    setOverlayNotice('b', { title: 'two' });
    expect(getOverlayNotices()).not.toBe(before);
  });
});
