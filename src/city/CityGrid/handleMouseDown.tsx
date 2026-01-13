import React from 'react';
import { CityViewState } from '../CityViewState';
import { getEntityMaxLevel } from './getEntityMaxLevel';

export const handleMouseDown = (s: CityViewState, e: React.MouseEvent, index: number) => {
  const [_1, setDragIndex] = s.rDragIndex;
  const [_2, setDragOffset] = s.rDragOffset;
  const [blocks, _3] = s.rBlocks;
  const [_4, setOriginalPos] = s.rOriginalPos;
  const { GridSize, svgRef } = s;
  const [maxLevels] = s.rMaxLevels;

  e.stopPropagation();
  const svg = svgRef.current;
  if (!svg) return;
  const rect = svg.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  setDragIndex(index);
  const block = blocks[index];
  setDragOffset({
    x: mouseX - block.x * GridSize,
    y: mouseY - block.y * GridSize,
  });
  setOriginalPos({ x: block.x, y: block.y });
  const maxLevel = getEntityMaxLevel(block.entity.cityentity_id, block.type, maxLevels);
  if (maxLevel !== 1) {
    s.helperContext.showMessage('drag_tip');
  }
};
