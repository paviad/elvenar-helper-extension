import React from 'react';
import { CityViewState } from '../CityViewState';

export const handleMouseDown = (s: CityViewState, e: React.MouseEvent, index: number) => {
  const [_1, setDragIndex] = s.rDragIndex;
  const [_2, setDragOffset] = s.rDragOffset;
  const [blocks, _3] = s.rBlocks;
  const [_4, setOriginalPos] = s.rOriginalPos;
  const { GridSize, svgRef } = s;

  e.stopPropagation();
  const svg = svgRef.current;
  if (!svg) return;
  const rect = svg.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  setDragIndex(index);
  setDragOffset({
    x: mouseX - blocks[index].x * GridSize,
    y: mouseY - blocks[index].y * GridSize,
  });
  setOriginalPos({ x: blocks[index].x, y: blocks[index].y });
};
