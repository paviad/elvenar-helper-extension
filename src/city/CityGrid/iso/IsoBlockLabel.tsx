import React from 'react';
import { CityBlock } from '../../CityBlock';

interface IsoBlockLabelProps {
  block: CityBlock;
  GridSize: number;
  textColor?: string;
  sprite?: { url: string; width: number; height: number };
  showWarning?: boolean;
  showMaxLevel?: boolean;
}

export const IsoBlockLabel: React.FC<IsoBlockLabelProps> = ({
  block,
  GridSize,
  textColor = '#222',
  sprite,
  showWarning,
  showMaxLevel,
}) => {
  if (!block.label) return null;

  // Font size logic (same as BlockLabel)
  const fontSize = Math.max(GridSize * 0.6, 10);
  const isSufficientSpace = block.width >= 2 && block.length >= 2; // Slightly relaxed constraint for Iso view visibility

  // Render Warning Overlay (Centered, Large, Translucent)
  // In Iso view, this is just centered at (0,0) because the parent transforms it to the block center
  const renderWarning = () => {
    if (!showWarning) return null;

    // Size fits the smaller dimension of the block
    const size = Math.min(block.width, block.length) * GridSize;

    return (
      <g transform={`translate(-${size / 2}, -${size / 2})`}>
        <svg width={size} height={size} viewBox='0 0 24 24' style={{ overflow: 'visible', opacity: 0.6 }}>
          <circle cx='12' cy='12' r='10' fill='#d32f2f' stroke='white' strokeWidth='2' />
          <rect x='5' y='10' width='14' height='4' fill='white' rx='1' />
        </svg>
      </g>
    );
  };

  // Render Max Level Indicator (Top Right equivalent)
  // In Iso view, "Top Right" of the 2D block maps to the Right corner of the diamond.
  // However, since we are just rendering labels here, we might want it near the label or offset.
  // Let's position it to the right of the label content for clarity.
  const renderMaxLevel = () => {
    if (!showMaxLevel) return null;
    // Don't show if block is too small
    if (block.width * GridSize <= 20 || block.length * GridSize <= 20) return null;

    return (
      <g transform={`translate(12, -12)`}>
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
    return (
      <g pointerEvents='none'>
        {/* Main Label */}
        <text
          x={0}
          y={0}
          textAnchor='middle'
          alignmentBaseline={block.stage ? 'baseline' : 'middle'}
          fontSize={fontSize}
          fill={textColor}
          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }} // Add shadow for readability against varied backgrounds
        >
          {block.label}
        </text>

        {/* Optional Stage Label */}
        {block.stage && (
          <text
            x={0}
            y={fontSize * 0.8}
            textAnchor='middle'
            alignmentBaseline='hanging'
            fontSize={fontSize * 0.6}
            fill={textColor}
            opacity={0.9}
            style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
          >
            Stage {block.stage}
          </text>
        )}

        {/* Overlays */}
        {renderWarning()}
        {/* We might skip MaxLevel here or adjust its position to avoid overlap if text is long */}
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
  // Center group around (0,0)
  const groupStartX = -groupWidth / 2;

  // Scale down slightly to fit better in iso cells
  const scale = 0.75;

  return (
    <g pointerEvents='none' transform={`scale(${scale})`}>
      {/* Label Content Group */}
      <g transform={block.stage ? `translate(0, -${fontSize * 0.5})` : undefined}>
        <svg
          x={groupStartX}
          y={-iconSize / 2}
          width={iconSize}
          height={iconSize}
          viewBox={`${viewBoxX} ${viewBoxY} ${iconSize} ${iconSize}`}
          style={{ pointerEvents: 'none', verticalAlign: 'middle' }}
        >
          <image href={spriteUrl} width={spriteWidth} height={spriteHeight} style={{ imageRendering: 'smooth' }} />
        </svg>
        <text
          x={groupStartX + iconSize + 2 + labelWidth / 2}
          y={0}
          textAnchor='middle'
          alignmentBaseline='middle'
          fontSize={fontSize * 2}
          fill={textColor}
          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
        >
          {block.label}
        </text>
      </g>

      {block.stage && (
        <text
          x={0}
          y={fontSize * 0.8}
          textAnchor='middle'
          alignmentBaseline='hanging'
          fontSize={fontSize}
          fill={textColor}
          opacity={0.9}
          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
        >
          Stage {block.stage}
        </text>
      )}

      {/* Overlays */}
      {renderWarning()}
      {renderMaxLevel()}
    </g>
  );
};
