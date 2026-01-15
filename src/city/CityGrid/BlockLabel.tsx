import React from 'react';
import { CityBlock } from '../CityBlock';

interface BlockLabelProps {
  block: CityBlock;
  GridSize: number;
  textColor?: string;
  sprite?: { url: string; width: number; height: number };
}

export const BlockLabel: React.FC<BlockLabelProps> = ({ block, GridSize, textColor = '#222', sprite }) => {
  if (!block.label) return null;

  // Center point for label
  const centerX = (block.x + block.width / 2) * GridSize;
  const centerY = (block.y + block.length / 2) * GridSize;
  const fontSize = Math.max(GridSize * 0.6, 10);
  const isSufficientSpace = block.width >= 3 && block.length >= 2;

  // If chapter is not present, just show label
  if (typeof block.chapter === 'undefined' || !isSufficientSpace || !sprite) {
    const transform =
      block.length > 1 && block.width > 1
        ? `scale(2,2) translate(${-(block.x + block.width / 2) * GridSize * 0.5},${
            -(block.y + block.length / 2) * GridSize * 0.5
          })`
        : undefined;

    return (
      <g pointerEvents='none' transform={transform}>
        {/* Main Label */}
        <text
          x={centerX}
          y={centerY}
          textAnchor='middle'
          alignmentBaseline={block.stage ? 'baseline' : 'middle'} // Shift up slightly if stage exists
          fontSize={fontSize}
          fill={textColor}
        >
          {block.label}
        </text>

        {/* Optional Stage Label */}
        {block.stage && (
          <text
            x={centerX}
            y={centerY + fontSize * 0.8} // Position below the main label
            textAnchor='middle'
            alignmentBaseline='hanging'
            fontSize={fontSize * 0.6} // Smaller font
            fill={textColor}
            opacity={0.8}
          >
            Stage {block.stage}
          </text>
        )}
      </g>
    );
  }

  // If chapter is present, show sprite + label (and optionally stage below)
  const iconSize = 24;
  const spriteUrl = sprite.url;
  const spriteWidth = sprite.width;
  const spriteHeight = sprite.height;
  const iconIndex = block.chapter - 1;
  const viewBoxX = (iconSize + 2) * 2 * (iconIndex + 0.5);
  const viewBoxY = 0;

  // Center both image and label as a group
  const labelWidth = fontSize * (block.label.length * 0.9) + 3;
  const groupWidth = iconSize + labelWidth;
  const groupStartX = centerX - groupWidth / 2;

  // Center and scale as a group
  const scale = 0.75;
  const groupTransform = `translate(${centerX},${centerY}) scale(${scale}) translate(${-centerX},${-centerY})`;

  return (
    <g pointerEvents='none' transform={groupTransform}>
      {/* Icon + Level Group */}
      <g transform={block.stage ? `translate(0, -${fontSize * 0.5})` : undefined}>
        <svg
          x={groupStartX}
          y={centerY - iconSize / 2}
          width={iconSize}
          height={iconSize}
          viewBox={`${viewBoxX} ${viewBoxY} ${iconSize} ${iconSize}`}
          style={{ pointerEvents: 'none', verticalAlign: 'middle' }}
        >
          <image href={spriteUrl} width={spriteWidth} height={spriteHeight} style={{ imageRendering: 'smooth' }} />
        </svg>
        <text
          x={groupStartX + iconSize + 2 + labelWidth / 2}
          y={centerY}
          textAnchor='middle'
          alignmentBaseline='middle'
          fontSize={fontSize * 2}
          fill={textColor}
        >
          {block.label}
        </text>
      </g>

      {/* Stage Label (Centered below the entire group) */}
      {block.stage && (
        <text
          x={centerX}
          y={centerY + fontSize * 0.8}
          textAnchor='middle'
          alignmentBaseline='hanging'
          fontSize={fontSize}
          fill={textColor}
          opacity={0.8}
        >
          Stage {block.stage}
        </text>
      )}
    </g>
  );
};
