import {
  AVG_GLYPH_ADVANCE_EM,
  ICON_TEXT_GAP_TILES,
  ICON_TILES,
  LABEL_FILL_FRACTION,
  layoutBlockLabel,
  MAX_FONT_TILES,
  SUB_LINE_FONT_RATIO,
} from './labelLayout';

const base = { subLines: [] as string[], wantIcon: false, widthTiles: 4, lengthTiles: 4 };

describe('layoutBlockLabel', () => {
  it('caps a short label on a large block at the maximum font size, centred', () => {
    const l = layoutBlockLabel({ ...base, label: '5' });

    expect(l.fontTiles).toBe(MAX_FONT_TILES);
    expect(l.mainX).toBe(0);
    expect(l.mainY).toBe(0);
    expect(l.subLines).toEqual([]);
    expect(l.icon).toBeNull();
  });

  it('shrinks the font until the text fits the block width', () => {
    const l = layoutBlockLabel({ ...base, widthTiles: 1, lengthTiles: 1, label: '14d' });

    expect(l.fontTiles * 3 * AVG_GLYPH_ADVANCE_EM).toBeCloseTo(1 * LABEL_FILL_FRACTION);
  });

  it('shrinks the font until the text fits the block height', () => {
    const l = layoutBlockLabel({ ...base, widthTiles: 10, lengthTiles: 0.5, label: '5' });

    expect(l.fontTiles).toBeCloseTo(0.5 * LABEL_FILL_FRACTION);
  });

  describe('chapter icon', () => {
    it('shows the icon only when wanted and the block is at least 3x2', () => {
      expect(layoutBlockLabel({ ...base, wantIcon: true, label: '9' }).icon).not.toBeNull();
      expect(layoutBlockLabel({ ...base, wantIcon: true, widthTiles: 2, label: '9' }).icon).toBeNull();
      expect(layoutBlockLabel({ ...base, wantIcon: true, lengthTiles: 1, label: '9' }).icon).toBeNull();
      expect(layoutBlockLabel({ ...base, label: '9' }).icon).toBeNull();
    });

    it('centres the icon and text as one row, icon on the main line', () => {
      const l = layoutBlockLabel({ ...base, wantIcon: true, label: '12' });
      const textW = 2 * AVG_GLYPH_ADVANCE_EM * l.fontTiles;
      const rowWidth = ICON_TILES + ICON_TEXT_GAP_TILES + textW;

      expect(l.icon).not.toBeNull();
      expect(l.icon!.x).toBeCloseTo(-rowWidth / 2);
      // The right edge of the text mirrors the left edge of the icon.
      expect(l.mainX + textW / 2).toBeCloseTo(rowWidth / 2);
      expect(l.icon!.y + l.icon!.size / 2).toBeCloseTo(l.mainY);
    });

    it('reserves width for the icon when sizing the text', () => {
      const noIcon = layoutBlockLabel({ ...base, widthTiles: 3, lengthTiles: 2, label: '999d' });
      const withIcon = layoutBlockLabel({ ...base, wantIcon: true, widthTiles: 3, lengthTiles: 2, label: '999d' });

      expect(withIcon.fontTiles).toBeLessThan(noIcon.fontTiles);
    });
  });

  describe('sub-lines', () => {
    it('stacks a sub-line under the main line, centred as a group', () => {
      const l = layoutBlockLabel({ ...base, label: '7', subLines: ['Stage 3'] });

      expect(l.subLines).toHaveLength(1);
      expect(l.subLines[0].text).toBe('Stage 3');
      expect(l.subLines[0].fontTiles).toBeCloseTo(l.fontTiles * SUB_LINE_FONT_RATIO);
      expect(l.mainY).toBeLessThan(l.subLines[0].y);
      // Centred: the top of the main line mirrors the bottom of the sub-line.
      expect(-(l.mainY - l.fontTiles / 2)).toBeCloseTo(l.subLines[0].y + l.subLines[0].fontTiles / 2);
    });

    it('stacks several sub-lines in order, still centred as a group', () => {
      const l = layoutBlockLabel({ ...base, label: '7', subLines: ['Stage 3', '12d'] });

      expect(l.subLines.map((s) => s.text)).toEqual(['Stage 3', '12d']);
      expect(l.subLines[0].y).toBeLessThan(l.subLines[1].y);
      const top = l.mainY - l.fontTiles / 2;
      const bottom = l.subLines[1].y + l.subLines[1].fontTiles / 2;
      expect(-top).toBeCloseTo(bottom);
    });

    it('keeps the whole stack inside the block height', () => {
      const l = layoutBlockLabel({ ...base, lengthTiles: 1, label: '7', subLines: ['Stage 3', '12d'] });
      const top = l.mainY - l.fontTiles / 2;
      const last = l.subLines[l.subLines.length - 1];
      const bottom = last.y + last.fontTiles / 2;

      expect(bottom - top).toBeLessThanOrEqual(1 * LABEL_FILL_FRACTION + 1e-9);
    });

    it('lets a wide sub-line drive the font size down', () => {
      const l = layoutBlockLabel({ ...base, widthTiles: 2, lengthTiles: 10, label: '7', subLines: ['Stage 12'] });

      expect(l.subLines[0].fontTiles * 'Stage 12'.length * AVG_GLYPH_ADVANCE_EM).toBeLessThanOrEqual(
        2 * LABEL_FILL_FRACTION + 1e-9,
      );
    });
  });
});
