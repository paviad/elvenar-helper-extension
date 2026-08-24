import React from 'react';
import { CityBlock } from '../CityBlock';
import { ChapterIcon, TechSprite } from './ChapterIcon';
import { LABEL_UNITS_PER_TILE, layoutBlockLabel } from './labelLayout';

interface BlockLabelContentProps {
  block: CityBlock;
  textColor?: string;
  sprite?: TechSprite;
  /** Shadow behind the text, for the view whose backgrounds the text colour was not picked against. */
  shadow?: boolean;
}

/**
 * A block's label - chapter icon, label text and stage line - drawn about (0,0) in
 * label units (LABEL_UNITS_PER_TILE to a tile). The caller centres and scales it;
 * neither view's geometry appears here, so both views render the same label.
 */
export const BlockLabelContent: React.FC<BlockLabelContentProps> = ({ block, textColor = '#222', sprite, shadow }) => {
  if (!block.label) return null;

  const u = LABEL_UNITS_PER_TILE;
  const layout = layoutBlockLabel({
    label: block.label,
    stage: block.stage,
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
        {block.label}
      </text>
      {layout.stage && (
        <text
          x={0}
          y={layout.stage.y * u}
          textAnchor='middle'
          dominantBaseline='central'
          fontSize={layout.stage.fontTiles * u}
          fill={textColor}
          opacity={0.8}
          style={textStyle}
        >
          Stage {block.stage}
        </text>
      )}
    </g>
  );
};
