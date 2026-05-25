import React from 'react';
import { sampleTime, Subject } from 'rxjs';
import { useCity } from '../../CityContext';

// Updated Subject to include zoom
const isoSubject = new Subject<{ city: ReturnType<typeof useCity>; e: React.MouseEvent; zoom: number }>();
const isoThrottled = isoSubject.pipe(sampleTime(50));

export const handleIsoMouseMove = (city: ReturnType<typeof useCity>, e: React.MouseEvent, zoom: number) => {
  isoSubject.next({ city, e, zoom });
};

export const subscribeToIsoMouseMove = () => {
  return isoThrottled.subscribe((r) => {
    if (!r) return;
    const { city, e, zoom } = r;
    processIsoMouseMove(city, e, zoom);
  });
};

const processIsoMouseMove = (city: ReturnType<typeof useCity>, e: React.MouseEvent, zoom: number) => {
  const blocks = city.blocks;
  const setBlocks = city.setBlocks;

  const dragIndex = city.dragIndex;
  const dragOffset = city.dragOffset;

  const { GridSize, svgRef, GridMax, mousePositionRef, PaddingTiles } = city;

  const svg = svgRef.current;
  if (!svg) return;
  const mouseGrid = mousePositionRef.current;
  const rect = svg.getBoundingClientRect();

  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  // --- Isometric Constants ---
  const tileWidth = GridSize * 1.8 * zoom;
  const tileHeight = GridSize * 0.9 * zoom;
  const paddedGridMax = GridMax + PaddingTiles * 2;
  const originX = (paddedGridMax * tileWidth) / 2;
  const originY = 50 + PaddingTiles * tileHeight;

  // --- Coordinate Transformation Helper ---
  const fromIso = (screenX: number, screenY: number) => {
    const adjX = screenX - originX;
    const adjY = screenY - originY;

    const gy = (adjY / (tileHeight / 2) - adjX / (tileWidth / 2)) / 2;
    const gx = (adjY / (tileHeight / 2) + adjX / (tileWidth / 2)) / 2;

    return { x: Math.floor(gx), y: Math.floor(gy) };
  };

  if (dragIndex !== null) {
    if (!blocks[dragIndex]) {
      return;
    }

    const targetScreenX = mouseX - dragOffset.x;
    const targetScreenY = mouseY - dragOffset.y;
    const gridPos = fromIso(targetScreenX, targetScreenY);

    const newX = Math.max(-PaddingTiles, Math.min(GridMax - blocks[dragIndex].width + PaddingTiles, gridPos.x));
    const newY = Math.max(-PaddingTiles, Math.min(GridMax - blocks[dragIndex].length + PaddingTiles, gridPos.y));

    if (blocks[dragIndex].x === newX && blocks[dragIndex].y === newY) {
      return;
    }

    const outOfGrid =
      newX < 0 || newY < 0 || newX + blocks[dragIndex].width > GridMax || newY + blocks[dragIndex].length > GridMax;

    setBlocks((prev) => {
      if (!prev[dragIndex]) {
        return prev;
      }
      return {
        ...prev,
        [dragIndex]: {
          ...prev[dragIndex],
          x: newX,
          y: newY,
          outOfGrid,
        },
      };
    });

    if (mouseGrid) {
      mouseGrid.innerText = `Grid: (${newX}, ${newY})`;
      city.setMouseGridPosition({ x: newX, y: newY });
    }
  } else {
    const { x: gridX, y: gridY } = fromIso(mouseX, mouseY);

    if (mouseGrid) {
      if (
        gridX >= -PaddingTiles &&
        gridX < GridMax + PaddingTiles &&
        gridY >= -PaddingTiles &&
        gridY < GridMax + PaddingTiles
      ) {
        // Show coordinate even if negative
        mouseGrid.innerText = `Grid: (${gridX}, ${gridY})`;
        city.setMouseGridPosition({ x: gridX, y: gridY });
      } else {
        mouseGrid.innerText = `Grid: -`;
      }
    }
  }
};
