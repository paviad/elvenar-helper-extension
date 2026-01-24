import React from 'react';
import { CityBlock } from '../../CityBlock';

interface BlockLabelProps {
  block: CityBlock;
  GridSize: number;
  textColor?: string;
  sprite?: { url: string; width: number; height: number };
  showWarning?: boolean;
  showMaxLevel?: boolean;
}

export const BlockLabel: React.FC<BlockLabelProps> = ({
  block,
  GridSize,
  textColor = '#222',
  sprite,
  showWarning,
  showMaxLevel,
}) => {
  if (!block.label) return null;

  // Center point for label
  const centerX = (block.x + block.width / 2) * GridSize;
  const centerY = (block.y + block.length / 2) * GridSize;
  const fontSize = Math.max(GridSize * 0.6, 10);
  const isSufficientSpace = block.width >= 3 && block.length >= 2;

  // Render Warning Overlay (Centered, Large, Translucent)
  const renderWarning = () => {
    if (!showWarning) return null;

    // Size fits the smaller dimension of the block
    const size = Math.min(block.width, block.length) * GridSize;
    // Top-left corner to center the square icon within the rectangular block
    const x = block.x * GridSize + (block.width * GridSize - size) / 2;
    const y = block.y * GridSize + (block.length * GridSize - size) / 2;

    return (
      <g transform={`translate(${x}, ${y})`}>
        <svg width={size} height={size} viewBox='0 0 24 24' style={{ overflow: 'visible', opacity: 0.6 }}>
          <circle cx='12' cy='12' r='10' fill='#d32f2f' stroke='white' strokeWidth='2' />
          <rect x='5' y='10' width='14' height='4' fill='white' rx='1' />
        </svg>
      </g>
    );
  };

  // Render Max Level Indicator (Top Right, Green Checkmark)
  const renderMaxLevel = () => {
    if (!showMaxLevel) return null;
    // Don't show if block is too small
    if (block.width * GridSize <= 20 || block.length * GridSize <= 20) return null;

    // Position at top right corner inside the block
    const x = (block.x + block.width) * GridSize - 16;
    const y = block.y * GridSize + 2;

    return (
      <g transform={`translate(${x}, ${y})`}>
        <circle cx='7' cy='7' r='6' fill='#4caf50' stroke='#fff' strokeWidth='1' />
        <path
          d='M4 7 l2 2 4 -4'
          stroke='#fff'
          strokeWidth='1.5'
          fill='none'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
      </g>
    );
  };

  // 1. Simple Text Label (No Sprite or insufficient space)
  if (typeof block.chapter === 'undefined' || !isSufficientSpace || !sprite) {
    const transform =
      block.length > 1 && block.width > 1
        ? `scale(2,2) translate(${-(block.x + block.width / 2) * GridSize * 0.5},${
            -(block.y + block.length / 2) * GridSize * 0.5
          })`
        : undefined;

    return (
      <g pointerEvents='none'>
        {/* Label Content Group */}
        <g transform={transform}>
          <text
            x={centerX}
            y={centerY}
            textAnchor='middle'
            alignmentBaseline={block.stage ? 'baseline' : 'middle'}
            fontSize={fontSize}
            fill={textColor}
          >
            {block.label}
          </text>

          {block.stage && (
            <text
              x={centerX}
              y={centerY + fontSize * 0.8}
              textAnchor='middle'
              alignmentBaseline='hanging'
              fontSize={fontSize * 0.6}
              fill={textColor}
              opacity={0.8}
            >
              Stage {block.stage}
            </text>
          )}
        </g>

        {/* Overlays */}
        {renderWarning()}
        {renderMaxLevel()}
      </g>
    );
  }

  // 2. Sprite + Text Label
  const iconSize = 24;
  const spriteUrl = sprite.url;
  const spriteWidth = sprite.width;
  const spriteHeight = sprite.height;
  const iconIndex = block.chapter - 1;
  const viewBoxX = (iconSize + 2) * 2 * (iconIndex + 0.5);
  const viewBoxY = 0;

  const labelWidth = fontSize * (block.label.length * 0.9) + 3;
  const groupWidth = iconSize + labelWidth;
  const groupStartX = centerX - groupWidth / 2;

  const scale = 0.75;
  const groupTransform = `translate(${centerX},${centerY}) scale(${scale}) translate(${-centerX},${-centerY})`;

  return (
    <g pointerEvents='none'>
      {/* Label Content Group */}
      <g transform={groupTransform}>
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

      {/* Overlays */}
      {renderWarning()}
      {renderMaxLevel()}
    </g>
  );
};
