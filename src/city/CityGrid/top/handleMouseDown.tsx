import React from 'react';
import { useHelper } from '../../../helper/HelperContext';
import { useCity } from '../../CityContext';
import { getEntityMaxLevel } from '../getEntityMaxLevel';

export const handleMouseDown = (
  city: ReturnType<typeof useCity>,
  helperContext: ReturnType<typeof useHelper>,
  e: React.MouseEvent,
  index: number,
  zoom: number,
) => {
  const setDragIndex = city.setDragIndex;
  const setDragOffset = city.setDragOffset;
  const blocks = city.blocks;
  const setOriginalPos = city.setOriginalPos;
  const { GridSize, svgRef, maxLevels } = city;

  // Calculate scaled grid size
  const sGridSize = GridSize * zoom;

  e.stopPropagation();
  const svg = svgRef.current;
  if (!svg) return;
  const rect = svg.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  setDragIndex(index);
  const block = blocks[index];

  const dragOffset = {
    x: mouseX - block.x * sGridSize,
    y: mouseY - block.y * sGridSize,
  };

  setDragOffset(dragOffset);
  setOriginalPos({ x: block.x, y: block.y });
  const maxLevel = getEntityMaxLevel(block.entity.cityentity_id, block.type, maxLevels);
  if (maxLevel !== 1) {
    helperContext.showMessage('drag_tip');
  }
};
