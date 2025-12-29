import { Stack, Button, TextField } from '@mui/material';
import React, { useState } from 'react';
import { blockRect } from './blockRect';
import { CityViewState } from '../CityViewState';
import { handleMouseMove } from './handleMouseMove';
import { handleMouseUp } from './handleMouseUp';
import { sellStreets } from './sellStreets';

export const renderCityGrid = (s: CityViewState) => {
  const { GridSize, GridMax, svgRef, menuRef } = s;
  const [blocks, setBlocks] = s.rBlocks;
  const [dragIndex, setDragIndex] = s.rDragIndex;
  const [_, setDragOffset] = s.rDragOffset;

  // Search state
  const [searchTerm, setSearchTerm] = s.rSearchTerm;
  const [menu, setMenu] = s.rMenu;

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const term = e.target.value;
    setSearchTerm(term);
    let matcher: ((name: string) => boolean) | null = null;
    if (term.length > 2 && term.startsWith('/') && term.endsWith('/')) {
      // Regex mode
      try {
        const regex = new RegExp(term.slice(1, -1), 'i');
        matcher = (name: string) => regex.test(name);
      } catch {
        matcher = null; // Invalid regex, no highlight
      }
    } else if (term) {
      matcher = (name: string) => name.toLowerCase().includes(term.toLowerCase());
    }
    setBlocks((prev) =>
      prev.map((b) => ({
        ...b,
        highlighted: Boolean(!!matcher && ((b.name && matcher(b.name)) || (b.type && matcher(b.type)))),
      })),
    );
  }

  return (
    <Stack>
      <Stack direction='row'>
        <Button onClick={() => sellStreets(s)}>Sell Streets</Button>
      </Stack>
      <div>
        <TextField
          label='Search buildings (string or /regexp/)'
          variant='outlined'
          size='small'
          value={searchTerm}
          onChange={handleSearchChange}
          style={{ marginBottom: 8, width: '100%' }}
        />
        <div ref={s.mousePositionRef} style={{ marginBottom: 8, fontWeight: 'bold' }}>
          Grid: (-, -)
        </div>
        <svg
          ref={svgRef}
          width={GridSize * GridMax}
          height={GridSize * GridMax}
          style={{
            border: '1px solid black',
            cursor: dragIndex !== null ? 'grabbing' : 'default',
            userSelect: 'none',
          }}
          onMouseMove={(e) => handleMouseMove(s, e)}
          onClick={() => handleMouseUp(s)}
          // onMouseLeave={() => handleMouseUp(s)}
        >
          <rect x={0} y={0} width={GridSize * GridMax} height={GridSize * GridMax} fill='#145214' />

          {s.props.unlockedAreas.map((area, idx) => (
            <rect
              key={`unlocked-${idx}`}
              x={area.x * GridSize}
              y={area.y * GridSize}
              width={area.width * GridSize}
              height={area.length * GridSize}
              fill='rgba(255, 255, 255, 0.3)'
              stroke='green'
              strokeWidth={1}
              pointerEvents='none'
            />
          ))}

          {Array.from({ length: GridMax }).map((_, i) => (
            <g key={'grid-' + i} style={{ pointerEvents: 'none' }}>
              <line
                x1='0'
                y1={i * GridSize}
                x2={GridSize * GridMax}
                y2={i * GridSize}
                stroke='#ffffff80'
                strokeWidth={i % 5 === 0 ? 2 : 1}
              />
              <line
                x1={i * GridSize}
                y1='0'
                x2={i * GridSize}
                y2={GridSize * GridMax}
                stroke='#ffffff80'
                strokeWidth={i % 5 === 0 ? 2 : 1}
              />
            </g>
          ))}

          {(() => {
            // If dragging, render dragged block last (on top)
            const withIndex = blocks.map((b, i) => [b, i] as const);
            const blocksBelowUnmoved = withIndex.filter(([b, i]) => i !== dragIndex && !b.moved && !b.highlighted);
            const blocksBelow = withIndex.filter(([b, i]) => i !== dragIndex && b.moved && !b.highlighted);
            const blocksHighlighted = withIndex.filter(([b, i]) => i !== dragIndex && b.highlighted);
            const sortedBlocks = [
              ...blocksBelowUnmoved.map(([block, index]) => blockRect(s, index, block)),
              ...blocksBelow.map(([block, index]) => blockRect(s, index, block)),
              ...blocksHighlighted.map(([block, index]) => blockRect(s, index, block)),
            ];
            if (dragIndex !== null) {
              const draggedBlock = blocks[dragIndex];
              sortedBlocks.push(blockRect(s, 'dragged', draggedBlock));
            }
            return sortedBlocks;
          })()}

          {/* Context Menu */}
          {menu && (
            <foreignObject x={menu.x} y={menu.y} width={140} height={70} style={{ pointerEvents: 'none' }}>
              <div
                ref={menuRef}
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  background: 'white',
                  border: '1px solid #ccc',
                  borderRadius: 4,
                  // boxShadow removed due to visual issues
                  zIndex: 9999,
                  minWidth: 120,
                  pointerEvents: 'auto',
                }}
                onContextMenu={(e) => e.preventDefault()}
              >
                <MenuEntry
                  label='Duplicate'
                  onClick={() => {
                    if (typeof menu.key !== 'number') return setMenu(null);
                    const blockToDup = blocks[menu.key];
                    if (!blockToDup) return setMenu(null);
                    const newBlock = {
                      ...blockToDup,
                      id: blocks.length,
                      x: blockToDup.x + 1,
                      y: blockToDup.y + 1,
                    };
                    setBlocks((prev) => {
                      const newBlocks = [...prev, newBlock];
                      return newBlocks;
                    });
                    setDragIndex(newBlock.id);
                    s.rOriginalPos[1](null);
                    setMenu(null);
                  }}
                />
                <MenuEntry
                  label='Delete'
                  onClick={() => {
                    const [blocks, setBlocks] = s.rBlocks;
                    const [moveLog, setMoveLog] = s.rMoveLog;
                    const blockToDelete = blocks[menu.key as number];
                    setBlocks(blocks.filter((b, i) => i !== menu.key));
                    setMoveLog((prev) => [
                      ...prev,
                      {
                        id: blockToDelete.id,
                        name: blockToDelete.name,
                        from: { x: blockToDelete.x, y: blockToDelete.y },
                        to: { x: blockToDelete.x, y: blockToDelete.y },
                        movedChanged: false,
                        type: 'delete',
                        deletedBlock: blockToDelete,
                      },
                    ]);
                    setMenu(null);
                  }}
                />
              </div>
            </foreignObject>
          )}
        </svg>
      </div>
    </Stack>
  );
};

// Context menu entry with hover effect
interface MenuEntryProps {
  label: string;
  onClick?: () => void;
}
const MenuEntry: React.FC<MenuEntryProps> = ({ label, onClick }) => {
  const [hover, setHover] = React.useState(false);
  return (
    <div
      style={{
        padding: '8px 16px',
        cursor: 'pointer',
        background: hover ? '#e6f0fa' : undefined,
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
    >
      {label}
    </div>
  );
};
