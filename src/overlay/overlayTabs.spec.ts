import { documentedOverlayTabs, OVERLAY_TABS, shortcutLetter, visibleOverlayTabs } from './overlayTabs';

describe('visibleOverlayTabs', () => {
  it('hides the Trade tab until its chapter', () => {
    expect(visibleOverlayTabs(17).map((tab) => tab.key)).not.toContain('trade');
    expect(visibleOverlayTabs(18).map((tab) => tab.key)).toContain('trade');
  });

  it('shows every other tab regardless of chapter', () => {
    const alwaysOn = OVERLAY_TABS.filter((tab) => tab.fromChapter === undefined).map((tab) => tab.key);

    expect(visibleOverlayTabs(0).map((tab) => tab.key)).toEqual(alwaysOn);
  });
});

describe('documentedOverlayTabs', () => {
  /**
   * The help dialog describes the product, not whatever happens to be on the tab bar, so adding a
   * tab does not document it. Anything added here is a deliberate decision to describe it to
   * players — update this list only when that is what you mean.
   */
  it('documents exactly these tabs', () => {
    expect(documentedOverlayTabs().map((tab) => tab.key)).toEqual([
      'chat',
      'trade',
      'ee',
      'quests',
      'messages',
      'tourny',
    ]);
  });

  it('gives every documented tab something to say', () => {
    documentedOverlayTabs().forEach((tab) => {
      expect(tab.help.length).toBeGreaterThan(0);
    });
  });
});

describe('shortcutLetter', () => {
  it('reads the letter off the key code', () => {
    expect(shortcutLetter('KeyT')).toBe('T');
    expect(shortcutLetter('KeyC')).toBe('C');
  });
});
