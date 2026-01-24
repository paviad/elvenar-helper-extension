import React from 'react';
import { getEntityMaxLevel } from '../getEntityMaxLevel';
import { useCity } from '../../CityContext';
import { useHelper } from '../../../helper/HelperContext';

export const handleMouseDown = (city: ReturnType<typeof useCity>, helperContext: ReturnType<typeof useHelper>, e: React.MouseEvent, index: number) => {
  const setDragIndex = city.setDragIndex;
  const setDragOffset = city.setDragOffset;
  const blocks = city.blocks;
  const setOriginalPos = city.setOriginalPos;
  const { GridSize, svgRef } = city;
  const maxLevels = city.maxLevels;

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
    helperContext.showMessage('drag_tip');
  }
};
