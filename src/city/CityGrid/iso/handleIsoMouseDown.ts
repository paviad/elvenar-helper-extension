import React from 'react';
import { useHelper } from '../../../helper/HelperContext';
import { useCity } from '../../CityContext';
import { getEntityMaxLevel } from '../getEntityMaxLevel';
import { createIsoProjection } from './isoProjection';

export const handleIsoMouseDownWithZoom = (
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
  const { GridSize, svgRef, GridMax, maxLevels, PaddingTiles } = city;

  e.stopPropagation();
  const svg = svgRef.current;
  if (!svg) return;
  const rect = svg.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  const { toIso } = createIsoProjection({ GridSize, GridMax, PaddingTiles, zoom });

  setDragIndex(index);
  const block = blocks[index];

  const blockScreenPos = toIso(block.x, block.y);

  setDragOffset({
    x: mouseX - blockScreenPos.x,
    y: mouseY - blockScreenPos.y,
  });

  setOriginalPos({ x: block.x, y: block.y });

  const maxLevel = getEntityMaxLevel(block.entity.cityentity_id, block.type, maxLevels);
  if (maxLevel !== 1) {
    helperContext.showMessage('drag_tip');
  }
};
