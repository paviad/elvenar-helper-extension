import React from 'react';
import { CityBlock } from '../CityBlock';
import { ChapterIcon, TechSprite } from './ChapterIcon';
import { daysLeftLabel } from './expiry';
import { LABEL_UNITS_PER_TILE, layoutBlockLabel } from './labelLayout';

interface BlockLabelContentProps {
  block: CityBlock;
  /** Clock reading the days-left line is measured against. */
  now: number;
  textColor?: string;
  sprite?: TechSprite;
  /** Shadow behind the text, for the view whose backgrounds the text colour was not picked against. */
  shadow?: boolean;
}

/**
 * A block's label - chapter icon, label text and the smaller lines under it - drawn
 * about (0,0) in label units (LABEL_UNITS_PER_TILE to a tile). The caller centres and
 * scales it; neither view's geometry appears here, so both views render the same label.
 *
 * An expiring building always shows its days left: as the label itself when nothing
 * else labels it, otherwise as a sub-line. The figure never depends on which label
 * rule won.
 */
export const BlockLabelContent: React.FC<BlockLabelContentProps> = ({
  block,
  now,
  textColor = '#222',
  sprite,
  shadow,
}) => {
  const daysLeft = daysLeftLabel(block.expirationEnd, now);
  const label = block.label ?? daysLeft;
  if (!label) return null;

  const subLines = [...(block.stage ? [`Stage ${block.stage}`] : []), ...(block.label && daysLeft ? [daysLeft] : [])];

  const u = LABEL_UNITS_PER_TILE;
  const layout = layoutBlockLabel({
    label,
    subLines,
    wantIcon: sprite !== undefined && block.chapter !== undefined,
    widthTiles: block.width,
    lengthTiles: block.length,
  });

  const textStyle: React.CSSProperties = {
    userSelect: 'none',
    ...(shadow ? { textShadow: '0 1px 2px rgba(0,0,0,0.5)' } : undefined),
  };

  return (
    <g pointerEvents='none'>
      {layout.icon && sprite && block.chapter !== undefined && (
        <ChapterIcon
          sprite={sprite}
          chapter={block.chapter}
          x={layout.icon.x * u}
          y={layout.icon.y * u}
          size={layout.icon.size * u}
        />
      )}
      <text
        x={layout.mainX * u}
        y={layout.mainY * u}
        textAnchor='middle'
        dominantBaseline='central'
        fontSize={layout.fontTiles * u}
        fill={textColor}
        style={textStyle}
      >
        {label}
      </text>
      {layout.subLines.map((line, i) => (
        <text
          key={i}
          x={0}
          y={line.y * u}
          textAnchor='middle'
          dominantBaseline='central'
          fontSize={line.fontTiles * u}
          fill={textColor}
          opacity={0.8}
          style={textStyle}
        >
          {line.text}
        </text>
      ))}
    </g>
  );
};
