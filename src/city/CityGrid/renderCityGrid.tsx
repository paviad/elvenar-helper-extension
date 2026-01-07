import {
  Stack,
  Button,
  TextField,
  Dialog,
  Slider,
  Typography,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  Paper,
} from '@mui/material';
import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { blockRect } from './blockRect';
import { CityViewState } from '../CityViewState';
import { handleMouseMove } from './handleMouseMove';
import { handleMouseUp } from './handleMouseUp';
import { sellStreets } from './sellStreets';
import { BuildingFinder } from '../buildingFinder';
import { CityBlock } from '../CityBlock';
import { sendRefreshCityMessage } from '../../chrome/messages';
import { loadAccountManagerFromStorage } from '../../elvenar/AccountManager';
import { useTabStore } from '../../util/tabStore';

interface ShowLevelDialogData {
  open: boolean;
  index: number;
}

export const renderCityGrid = (s: CityViewState) => {
  // State for Change Level dialog
  const [showLevelDialog, setShowLevelDialog] = useState({ open: false, index: -1 } as ShowLevelDialogData);
  const [levelInput, setLevelInput] = useState(1);
  const { GridSize, GridMax, svgRef, menuRef } = s;
  const [blocks, setBlocks] = s.rBlocks;
  const [dragIndex, setDragIndex] = s.rDragIndex;
  const [dragOffset, setDragOffset] = s.rDragOffset;
  const [searchTerm, setSearchTerm] = s.rSearchTerm;
  const [menu, setMenu] = s.rMenu;
  const [maxLevels] = s.rMaxLevels;
  const setGlobalError = useTabStore((state) => state.setGlobalError);

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
      Object.fromEntries(
        Object.entries(prev).map(([key, b]) => [
          Number(key),
          {
            ...b,
            highlighted: Boolean(!!matcher && ((b.name && matcher(b.name)) || (b.type && matcher(b.type)))),
          },
        ]),
      ),
    );
  }

  // Sticky-to-fixed search box logic (fixed: returns to original position when scrolling up)
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const searchBoxOffset = useRef<number | null>(null);
  const [isFixed, setIsFixed] = useState(false);
  useEffect(() => {
    const updateOffset = () => {
      if (searchBoxRef.current) {
        searchBoxOffset.current = searchBoxRef.current.getBoundingClientRect().top + window.scrollY;
      }
    };
    updateOffset();
    window.addEventListener('resize', updateOffset);
    return () => window.removeEventListener('resize', updateOffset);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (searchBoxOffset.current === null) return;
      if (window.scrollY >= searchBoxOffset.current) {
        setIsFixed(true);
      } else {
        setIsFixed(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Helper for level up/down: duplicate block, delete original, start drag
  // mode: 'up' | 'down'
  async function duplicateAndDeleteBlock(index: number, newLevel: number) {
    const blockToDup = blocks[index];
    if (!blockToDup || !blockToDup.label) return;
    let width = blockToDup.width;
    let length = blockToDup.length;

    const finder = new BuildingFinder();
    await finder.ensureInitialized();

    const newBuilding = finder.getBuilding(blockToDup.gameId, newLevel);

    if (!newBuilding || !newBuilding.id.endsWith(`_${newLevel}`)) {
      return; // Cannot level up/down
    }

    width = newBuilding.width;
    length = newBuilding.length;

    const newBlock = {
      ...blockToDup,
      id: new Date().getTime(), // Unique ID
      x: blockToDup.x + 1,
      y: blockToDup.y + 1,
      label: `${newLevel}`,
      width,
      length,
      moved: true,
    } satisfies CityBlock;
    setBlocks((prev) => {
      const { [index]: _, ...filtered } = prev;
      return { ...filtered, [newBlock.id]: newBlock };
    });
    // Log the delete for undo/redo
    const [moveLog, setMoveLog] = s.rMoveLog;
    setMoveLog((prev) => [
      ...prev,
      {
        id: blockToDup.id,
        name: blockToDup.name,
        from: { x: blockToDup.x, y: blockToDup.y },
        to: { x: blockToDup.x, y: blockToDup.y },
        movedChanged: false,
        type: 'delete',
        deletedBlock: blockToDup,
      },
    ]);
    setDragIndex(newBlock.id);
    setDragOffset({
      x: 10,
      y: 10,
    });
    s.rOriginalPos[1](null);
    setMenu(null);
  }

  function getPrefix(r: CityBlock) {
    const c = r.entity.cityentity_id[0];
    if (r.type.includes('premium')) return `X${c}`;
    if (c === 'M') return `M${r.entity.cityentity_id[2]}`;
    return c;
  }

  function renderLevelDialog() {
    const block = blocks[showLevelDialog.index];
    const prefix = getPrefix(block);
    const maxLevel = maxLevels[prefix];
    return (
      <Dialog open={showLevelDialog.open} onClose={() => setShowLevelDialog({ open: false, index: -1 })}>
        <Stack spacing={2} sx={{ p: 3, minWidth: 300, alignItems: 'center' }}>
          <Typography variant='h6'>Select Building Level</Typography>
          <Stack direction='row' alignItems='center' spacing={1} sx={{ mb: 1 }}>
            <Button
              variant='outlined'
              size='small'
              onClick={() => setLevelInput((prev) => Math.max(1, prev - 1))}
              sx={{ minWidth: 32, px: 0 }}
            >
              -
            </Button>
            <TextField
              label='Level'
              type='number'
              slotProps={{ htmlInput: { min: 1, max: maxLevel } }}
              value={levelInput}
              onChange={(e) => {
                let v = Number(e.target.value);
                if (isNaN(v)) v = 1;
                if (v < 1) v = 1;
                if (v > maxLevel) v = maxLevel;
                setLevelInput(v);
              }}
              size='small'
              sx={{ width: 80 }}
            />
            <Button
              variant='outlined'
              size='small'
              onClick={() => setLevelInput((prev) => Math.min(maxLevel, prev + 1))}
              sx={{ minWidth: 32, px: 0 }}
            >
              +
            </Button>
          </Stack>
          <Slider
            min={1}
            max={maxLevel}
            value={levelInput}
            onChange={(_, v) => setLevelInput(Number(v))}
            valueLabelDisplay='auto'
            sx={{ width: 250 }}
          />
          <Stack direction='row' spacing={2} sx={{ mt: 2 }}>
            <Button
              variant='contained'
              onClick={() => {
                setShowLevelDialog({ open: false, index: -1 });
                duplicateAndDeleteBlock(showLevelDialog.index, levelInput);
                setMenu(null);
              }}
            >
              OK
            </Button>
            <Button variant='outlined' onClick={() => setShowLevelDialog({ open: false, index: -1 })}>
              Cancel
            </Button>
          </Stack>
        </Stack>
      </Dialog>
    );
  }

  // Helper to convert SVG coordinates to page coordinates
  function svgToPageCoords(svg: SVGSVGElement | null, x: number, y: number) {
    if (!svg) return { left: x, top: y };
    const pt = svg.createSVGPoint();
    pt.x = x;
    pt.y = y;
    const screenCTM = svg.getScreenCTM();
    if (!screenCTM) return { left: x, top: y };
    const transformed = pt.matrixTransform(screenCTM);
    return {
      left: transformed.x + window.scrollX,
      top: transformed.y + window.scrollY,
    };
  }

  function renderContextMenu() {
    if (!menu) return null;
    const svgElem = svgRef.current;
    const coords = svgToPageCoords(svgElem, menu.x, menu.y);
    // Render menu as a portal to body
    return ReactDOM.createPortal(
      <Paper
        ref={menuRef}
        elevation={4}
        sx={{
          position: 'absolute',
          left: coords.left,
          top: coords.top,
          minWidth: 140,
          zIndex: 9999,
          pointerEvents: 'auto',
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <List dense disablePadding>
          <ListItemButton
            onClick={() => {
              if (typeof menu.key !== 'number') return setMenu(null);
              const blockToDup = blocks[menu.key];
              if (!blockToDup) return setMenu(null);
              const newBlock = {
                ...blockToDup,
                id: new Date().getTime(),
                x: blockToDup.x + 1,
                y: blockToDup.y + 1,
                moved: true,
              };
              setBlocks((prev) => {
                const newBlocks = { ...prev, [newBlock.id]: newBlock };
                return newBlocks;
              });
              setDragIndex(newBlock.id);
              s.rOriginalPos[1](null);
              setMenu(null);
            }}
          >
            <ListItemText primary='Duplicate' />
          </ListItemButton>
          <Divider />
          <ListItemButton
            onClick={() => {
              const [blocks, setBlocks] = s.rBlocks;
              const [moveLog, setMoveLog] = s.rMoveLog;
              const blockToDelete = blocks[menu.key as number];
              const { [menu.key as number]: _, ...newBlocks } = blocks;
              setBlocks(newBlocks);
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
          >
            <ListItemText primary='Delete' />
          </ListItemButton>
          <Divider />
          {typeof menu.key === 'number' && blocks[menu.key] && /^[GPRHMO]_/.test(blocks[menu.key].gameId) && (
            <ListItemButton
              onClick={() => {
                if (typeof menu.key !== 'number') return setMenu(null);
                setLevelInput(Number(blocks[menu.key].label) || 1);
                setMenu(null);
                setShowLevelDialog({ open: true, index: menu.key });
              }}
            >
              <ListItemText primary='Change Level' />
            </ListItemButton>
          )}
        </List>
      </Paper>,
      document.body,
    );
  }

  async function refreshCity(s: CityViewState) {
    const accountId = s.accountId;
    if (!accountId) {
      console.warn('No accountId set in CityViewState, cannot refresh city');
      return;
    }
    const response = await sendRefreshCityMessage(accountId);
    if (!response.success) {
      console.error('Failed to refresh city:', response.message);
      setGlobalError('Failed to refresh city, please refresh your Elvenar tab and try again.');
      return;
    }
    setGlobalError(undefined);
    await loadAccountManagerFromStorage(true);
    s.props.forceUpdate();
    // window.location.reload();
  }

  return (
    <Stack>
      <Stack direction='row'>
        <Button onClick={() => refreshCity(s)}>Refresh City</Button>
        <Button onClick={() => sellStreets(s)}>Sell Streets</Button>
      </Stack>
      <div>
        <div
          ref={searchBoxRef}
          style={
            isFixed
              ? {
                  position: 'fixed',
                  top: 0,
                  left: '20%',
                  width: '60%',
                  zIndex: 9999,
                  background: 'rgba(255,255,255,0.95)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  padding: 8,
                  transition: 'box-shadow 0.2s',
                }
              : { marginBottom: 8, background: 'inherit', transition: 'box-shadow 0.2s' }
          }
        >
          <TextField
            label='Search buildings (string or /regexp/)'
            variant='outlined'
            size='small'
            value={searchTerm}
            onChange={handleSearchChange}
            style={{ width: '100%' }}
          />
        </div>
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
            const withIndex = Object.entries(blocks);
            const blocksBelowUnmoved = withIndex.filter(
              ([i, b]) => Number(i) !== dragIndex && !b.moved && !b.highlighted,
            );
            const blocksBelow = withIndex.filter(([i, b]) => Number(i) !== dragIndex && b.moved && !b.highlighted);
            const blocksHighlighted = withIndex.filter(([i, b]) => Number(i) !== dragIndex && b.highlighted);
            const sortedBlocks = [
              ...blocksBelowUnmoved.map(([index, block]) => blockRect(s, Number(index), block)),
              ...blocksBelow.map(([index, block]) => blockRect(s, Number(index), block)),
              ...blocksHighlighted.map(([index, block]) => blockRect(s, Number(index), block)),
            ];
            if (dragIndex !== null) {
              const draggedBlock = blocks[dragIndex];
              sortedBlocks.push(blockRect(s, 'dragged', draggedBlock));
            }
            return sortedBlocks;
          })()}

          {/* Modal Numeric Input Dialog */}
          {showLevelDialog.open && renderLevelDialog()}

          {/* Context Menu (now rendered as portal) */}
          {menu && renderContextMenu()}
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
