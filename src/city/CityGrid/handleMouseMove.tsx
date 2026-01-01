import React from 'react';
import { CityViewState } from '../CityViewState';

export const handleMouseMove = (s: CityViewState, e: React.MouseEvent) => {
  const [blocks, setBlocks] = s.rBlocks;
  const [dragIndex, _1] = s.rDragIndex;
  const [dragOffset, _2] = s.rDragOffset;
  const { GridSize, svgRef, GridMax, mousePositionRef } = s;

  const svg = svgRef.current;
  if (!svg) return;
  const mouseGrid = mousePositionRef.current;
  const rect = svg.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  if (dragIndex !== null) {
    const newX = Math.max(
      0,
      Math.min(GridMax - blocks[dragIndex].width, Math.round((mouseX - dragOffset.x) / GridSize)),
    );
    const newY = Math.max(
      0,
      Math.min(GridMax - blocks[dragIndex].length, Math.round((mouseY - dragOffset.y) / GridSize)),
    );

    setBlocks((prev) => ({
      ...prev,
      [dragIndex]: {
        ...prev[dragIndex],
        x: newX,
        y: newY,
      },
    }));

    if (mouseGrid) {
      mouseGrid.innerText = `Grid: (${newX}, ${newY})`;
    }
  } else {
    const gridX = Math.floor(mouseX / GridSize);
    const gridY = Math.floor(mouseY / GridSize);
    if (mouseGrid) {
      mouseGrid.innerText = `Grid: (${gridX}, ${gridY})`;
    }
  }
};
