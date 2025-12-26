import React, { useRef, useState } from 'react';
import { CityBlock } from './CityBlock';
import { UnlockedArea } from '../model/unlockedArea';
import { Button, Stack } from '@mui/material';

interface MoveLog {
  id: number;
  name: string;
  from: {
    x: number;
    y: number;
  };
  to: {
    x: number;
    y: number;
  };
  movedChanged: boolean;
}

export function CityView(props: {
  blocks: CityBlock[];
  unlockedAreas: UnlockedArea[];
}) {
  // Log of block moves
  const [moveLog, setMoveLog] = useState<MoveLog[]>([]);
  // Redo stack for undone moves
  const [redoStack, setRedoStack] = useState<MoveLog[]>([]);

  // Local state for drag
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [blocks, setBlocks] = useState<CityBlock[]>(props.blocks);

  const GridSize = 15;
  const GridMax = 80;
  const opacity = 0.8;

  // Undo the last move
  const handleUndo = () => {
    if (moveLog.length === 0) return;
    const last = moveLog[moveLog.length - 1];
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.id === last.id) {
          const moved = last.movedChanged !== b.moved;
          return {
            ...b,
            x: last.from.x,
            y: last.from.y,
            moved,
          };
        } else return b;
      })
    );
    setMoveLog((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, last]);
  };

  // Redo the last undone move
  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const last = redoStack[redoStack.length - 1];
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.id === last.id) {
          const moved = last.movedChanged !== b.moved;
          return {
            ...b,
            x: last.to.x,
            y: last.to.y,
            moved,
          };
        } else return b;
      })
    );
    setMoveLog((prev) => [...prev, last]);
    setRedoStack((prev) => prev.slice(0, -1));
  };

  // Keyboard shortcuts for undo/redo
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        (e.ctrlKey || e.metaKey) &&
        !e.shiftKey &&
        e.key.toLowerCase() === 'z'
      ) {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Get all unique types for color mapping
  const allTypes = React.useMemo(() => {
    const set = new Set<string>();
    (props.blocks || []).forEach((b) => set.add(b.type));
    return Array.from(set);
  }, [props.blocks]);
  const [originalPos, setOriginalPos] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [mouseGrid, setMouseGrid] = useState<{ x: number; y: number } | null>(
    null
  );

  // Sync blocks with props
  React.useEffect(() => {
    setBlocks(props.blocks);
  }, [props.blocks]);

  const handleMouseDown = (e: React.MouseEvent, index: number) => {
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

  // Helper to check overlap
  function isOverlapping(
    moving: CityBlock,
    movingIndex: number,
    newX: number,
    newY: number,
    allBlocks: CityBlock[]
  ): boolean {
    const mx1 = newX;
    const my1 = newY;
    const mx2 = newX + moving.width - 1;
    const my2 = newY + moving.length - 1;
    for (let i = 0; i < allBlocks.length; i++) {
      if (i === movingIndex) continue;
      const b = allBlocks[i];
      const bx1 = b.x;
      const by1 = b.y;
      const bx2 = b.x + b.width - 1;
      const by2 = b.y + b.length - 1;
      // Check for overlap
      if (mx1 <= bx2 && mx2 >= bx1 && my1 <= by2 && my2 >= by1) {
        return true;
      }
    }
    return false;
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    if (dragIndex !== null) {
      const newX = Math.max(
        0,
        Math.min(
          GridMax - blocks[dragIndex].width,
          Math.round((mouseX - dragOffset.x) / GridSize)
        )
      );
      const newY = Math.max(
        0,
        Math.min(
          GridMax - blocks[dragIndex].length,
          Math.round((mouseY - dragOffset.y) / GridSize)
        )
      );
      setBlocks((prev) =>
        prev.map((b, i) => (i === dragIndex ? { ...b, x: newX, y: newY } : b))
      );
      setMouseGrid({ x: newX, y: newY });
    } else {
      const gridX = Math.floor(mouseX / GridSize);
      const gridY = Math.floor(mouseY / GridSize);
      setMouseGrid({ x: gridX, y: gridY });
    }
  };

  const handleMouseUp = () => {
    if (dragIndex !== null && originalPos) {
      const block = blocks[dragIndex];
      const newX = block.x;
      const newY = block.y;
      let finalX = newX;
      let finalY = newY;

      if (isOverlapping(block, dragIndex, newX, newY, blocks)) {
        finalX = originalPos.x;
        finalY = originalPos.y;
        setBlocks((prev) =>
          prev.map((b, i) =>
            i === dragIndex
              ? {
                  ...b,
                  x: originalPos.x,
                  y: originalPos.y,
                }
              : b
          )
        );
      } else {
        const b = blocks[dragIndex];
        const isOriginal = b.x === b.originalX && b.y === b.originalY;
        const movedChanged = block.moved === isOriginal;

        setBlocks((prev) =>
          prev.map((b, i) => {
            if (i === dragIndex) {
              return {
                ...b,
                moved: !isOriginal,
              };
            }
            return b;
          })
        );
        // Only log if the position actually changed
        if (originalPos.x !== finalX || originalPos.y !== finalY) {
          setMoveLog((prev) => [
            ...prev,
            {
              id: block.id,
              name: block.name,
              from: { x: originalPos.x, y: originalPos.y },
              to: { x: finalX, y: finalY },
              movedChanged,
            },
          ]);
          setRedoStack([]); // Clear redo stack on new move
        }
      }
    }
    setDragIndex(null);
    setOriginalPos(null);
    setMouseGrid(null);
  };

  const sellStreets = () => {
    setBlocks((prev) => prev.filter((b) => b.type !== 'street'));
  };

  const blockRect = (key: string | number, block: CityBlock) => {
    const dragging = typeof key === 'number';
    const handler = dragging
      ? (e: React.MouseEvent<SVGRectElement, MouseEvent>) =>
          handleMouseDown(e, key)
      : // eslint-disable-next-line @typescript-eslint/no-empty-function
        () => {};
    const cursor = dragging ? 'grabbing' : 'grab';
    return (
      <g key={key}>
        <rect
          opacity={opacity}
          x={block.x * GridSize}
          y={block.y * GridSize}
          width={block.width * GridSize}
          height={block.length * GridSize}
          fill={getTypeColor(block.type, allTypes, block.moved)}
          stroke={block.moved ? 'black' : '#000'}
          strokeWidth={block.moved ? 2 : 1}
          style={{ cursor }}
          onMouseDown={handler}
        >
          <title>{block.name}</title>
        </rect>
        {block.label && (
          <text
            x={(block.x + block.width / 2) * GridSize}
            y={(block.y + block.length / 2) * GridSize}
            textAnchor='middle'
            alignmentBaseline='middle'
            fontSize={Math.max(GridSize * 0.6, 10)}
            fill='#222'
            pointerEvents='none'
            transform={
              block.length > 1 && block.width > 1
                ? `scale(2,2) translate(${
                    -(block.x + block.width / 2) * GridSize * 0.5
                  },${-(block.y + block.length / 2) * GridSize * 0.5})`
                : undefined
            }
          >
            {block.label}
          </text>
        )}
      </g>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'row' }}>
      {/* Move log list */}
      <div style={{ width: 300, marginRight: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontWeight: 'bold', marginRight: 8 }}>Move Log</span>
          <button
            onClick={handleUndo}
            disabled={moveLog.length === 0}
            style={{
              padding: '2px 10px',
              fontSize: 13,
              borderRadius: 4,
              border: '1px solid #888',
              background: moveLog.length === 0 ? '#eee' : '#fff',
              color: moveLog.length === 0 ? '#aaa' : '#222',
              cursor: moveLog.length === 0 ? 'not-allowed' : 'pointer',
              marginLeft: 8,
            }}
            title='Undo last move'
          >
            Undo (Ctrl+Z)
          </button>
          <button
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            style={{
              padding: '2px 10px',
              fontSize: 13,
              borderRadius: 4,
              border: '1px solid #888',
              background: redoStack.length === 0 ? '#eee' : '#fff',
              color: redoStack.length === 0 ? '#aaa' : '#222',
              cursor: redoStack.length === 0 ? 'not-allowed' : 'pointer',
              marginLeft: 8,
            }}
            title='Redo last undone move'
          >
            Redo (Ctrl+Y)
          </button>
        </div>
        <ol
          style={{
            fontSize: 13,
            paddingLeft: 18,
            maxHeight: 400,
            overflowY: 'auto',
            background: '#f8f8ff',
            border: '1px solid #ccc',
            borderRadius: 4,
          }}
        >
          {moveLog.length === 0 && (
            <li style={{ color: '#888' }}>No moves yet</li>
          )}
          {moveLog.map((log, idx) => (
            <li key={idx}>
              <span style={{ fontWeight: 500 }}>{log.name}</span>: ({log.from.x}
              , {log.from.y}) → ({log.to.x}, {log.to.y})
            </li>
          ))}
        </ol>
        <div style={{ marginTop: 12, fontSize: 12, color: '#888' }}>
          Most recent at bottom
        </div>
      </div>
      <Stack>
        <Stack direction='row'>
          <Button onClick={() => sellStreets()}>Sell Streets</Button>
        </Stack>
        <div>
          <div style={{ marginBottom: 8, fontWeight: 'bold' }}>
            {mouseGrid
              ? `Grid: (${mouseGrid.x}, ${mouseGrid.y})`
              : 'Grid: (-, -)'}
          </div>
          <svg
            ref={svgRef}
            width={GridSize * GridMax}
            height={GridSize * GridMax}
            style={{
              border: '1px solid black',
              cursor: dragIndex !== null ? 'grabbing' : 'default',
            }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <rect
              x={0}
              y={0}
              width={GridSize * GridMax}
              height={GridSize * GridMax}
              fill='#145214'
            />

            {props.unlockedAreas.map((area, idx) => (
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
              if (dragIndex !== null) {
                const blocksBelowUnmoved = blocks.filter(
                  (b, i) => i !== dragIndex && !b.moved
                );
                const blocksBelow = blocks.filter(
                  (b, i) => i !== dragIndex && b.moved
                );
                const draggedBlock = blocks[dragIndex];
                return [
                  ...blocksBelowUnmoved.map((block, index) =>
                    blockRect(index, block)
                  ),
                  ...blocksBelow.map((block, index) => blockRect(index, block)),
                  blockRect('dragged', draggedBlock),
                ];
              } else {
                const blocksBelowUnmoved = blocks
                  .map((b, i) => [b, i] as const)
                  .filter(([b, i]) => !b.moved);
                const blocksBelow = blocks
                  .map((b, i) => [b, i] as const)
                  .filter(([b, i]) => b.moved);
                return [
                  ...blocksBelowUnmoved.map(([block, index]) =>
                    blockRect(index, block)
                  ),
                  ...blocksBelow.map(([block, index]) =>
                    blockRect(index, block)
                  ),
                ];
              }
            })()}
          </svg>
        </div>
      </Stack>

      {/* Legend */}
      <div style={{ width: 300, marginLeft: 16 }}>
        <div style={{ fontWeight: 'bold', marginBottom: 8 }}>Color Legend</div>
        <ul style={{ listStyle: 'none', padding: 0, fontSize: 13 }}>
          {Object.entries(colorDescriptions).map(([color, desc]) => (
            <li
              key={color}
              style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: 6,
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: 18,
                  height: 18,
                  background: color,
                  border: '1px solid #888',
                  borderRadius: 4,
                  marginRight: 8,
                }}
              />
              <span>{desc}</span>
            </li>
          ))}
        </ul>

        {(() => {
          const unknownTypes = allTypes.filter(type => !Object.keys(colorDescriptions).includes(getTypeColor(type, allTypes, false)));
          if (unknownTypes.length === 0) return null;
          return (
            <>
              <div style={{ fontWeight: 'bold', marginBottom: 8 }}>Unknown Type Legend</div>
              <ul style={{ listStyle: 'none', padding: 0, fontSize: 13 }}>
                {unknownTypes.map((type) => (
                  <li
                    key={type}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      marginBottom: 6,
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-block',
                        width: 18,
                        height: 18,
                        background: getTypeColor(type, allTypes, false),
                        border: '1px solid #888',
                        borderRadius: 4,
                        marginRight: 8,
                      }}
                    />
                    <span>{type}</span>
                  </li>
                ))}
              </ul>
            </>
          );
        })()}
      </div>
    </div>
  );
}

// Utility: assign a color for each type
const TYPE_COLORS: string[] = [
  '#1f77b4', // blue
  '#ff7f0e', // orange
  '#2ca02c', // green
  '#d62728', // red
  '#9467bd', // purple
  '#8c564b', // brown
  '#e377c2', // pink
  '#7f7f7f', // gray
  '#bcbd22', // olive
  '#17becf', // cyan
];

const knownTypes: Record<string, string> = {
  culture_residential: '#9452fe',
  culture: '#9452fe',
  expiring: '#9452fe',

  culture_residential_x: '#aaf5fe',
  culture_x: '#aaf5fe',

  culture_y: '#110cff',
  culture_residential_y: '#110cff',
  expiring_y: '#110cff',

  main_building_y: '#f9c602',
  trader: '#f9c602',
  residential: '#f9c602',
  premium_residential: '#f9c602',
  worker_hut: '#f9c602',
  academy: '#f9c602',

  goods: '#fe2ad5',

  production: '#13b7f4',
  premium_production: '#13b7f4',

  ancient_wonder: '#fef7c6',
  ancient_wonder_x: '#fef7c6',

  portal: '#02e880',
  portal_x: '#02e880',
  goods_x: '#02e880',
  guardian: '#02e880',

  military: '#fe0230',
  armory: '#fe0230',
  
  street: '#d7d7d7',
};

const colorDescriptions: Record<string, string> = {
  '#9452fe': 'Culture(/Residential)',
  '#110cff': 'Culture(/Residential) Standalone',
  '#f9c602': 'Residential/Main/Trader/Academy/Worker Hut',
  '#fe2ad5': 'Goods Buildings',
  '#13b7f4': 'Production Buildings',
  '#fef7c6': 'Ancient Wonders',
  '#02e880': 'Portal/Settlement',
  '#fe0230': 'Military/Armory',
  '#d7d7d7': 'Street',
  '#aaf5fe': 'Buildable Culture'
};

function getTypeColor(
  type: string,
  allTypes: string[],
  moved?: boolean
): string {
  let color: string;
  if (knownTypes[type]) {
    // Ensure color starts with #
    const knownColor = knownTypes[type];
    color = knownColor.startsWith('#') ? knownColor : `#${knownColor}`;
  } else {
    const idx = allTypes.indexOf(type);
    color = TYPE_COLORS[idx % TYPE_COLORS.length] || '#000';
  }
  if (moved) {
    // Dim color for moved blocks
    color = color + 'AA'; // Add alpha for transparency
  }
  return color;
}
