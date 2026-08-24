import React from 'react';

/** The chapter-icon strip downloaded from the game's tech tree. */
export interface TechSprite {
  url: string;
  width: number;
  height: number;
}

// Geometry of the sprite sheet itself, in sheet pixels. These describe the downloaded
// asset and have nothing to do with the size the icon is drawn at.
/** Horizontal distance between consecutive chapter cells. */
const SHEET_CELL_PITCH = 52;
/** X offset of the first chapter's icon. */
const SHEET_ICON_OFFSET = 26;
/** The square copied out of a cell. */
const SHEET_ICON_CROP = 24;

interface ChapterIconProps {
  sprite: TechSprite;
  chapter: number;
  /** Top-left corner and edge, in the caller's coordinate system. */
  x: number;
  y: number;
  size: number;
}

/** One chapter's icon, cropped out of the tech-tree sprite sheet. */
export const ChapterIcon: React.FC<ChapterIconProps> = ({ sprite, chapter, x, y, size }) => (
  <svg
    x={x}
    y={y}
    width={size}
    height={size}
    viewBox={`${SHEET_ICON_OFFSET + SHEET_CELL_PITCH * (chapter - 1)} 0 ${SHEET_ICON_CROP} ${SHEET_ICON_CROP}`}
    style={{ pointerEvents: 'none' }}
  >
    <image href={sprite.url} width={sprite.width} height={sprite.height} style={{ imageRendering: 'smooth' }} />
  </svg>
);
