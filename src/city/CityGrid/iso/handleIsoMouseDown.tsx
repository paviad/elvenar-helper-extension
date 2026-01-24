import React from 'react';
import { getEntityMaxLevel } from '../getEntityMaxLevel';
import { useCity } from '../../CityContext';
import { useHelper } from '../../../helper/HelperContext';

const PADDING_TILES = 10;

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
  const { GridSize, svgRef, GridMax, maxLevels } = city;

  e.stopPropagation();
  const svg = svgRef.current;
  if (!svg) return;
  const rect = svg.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  const tileWidth = GridSize * 1.8 * zoom;
  const tileHeight = GridSize * 0.9 * zoom;

  // Updated Origins with Padding
  const paddedGridMax = GridMax + PADDING_TILES * 2;
  const originX = (paddedGridMax * tileWidth) / 2;
  const originY = 50 + PADDING_TILES * tileHeight;

  const toIso = (x: number, y: number) => {
    return {
      x: originX + (x - y) * (tileWidth / 2),
      y: originY + (x + y) * (tileHeight / 2),
    };
  };

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
