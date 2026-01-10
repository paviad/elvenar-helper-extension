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
import { useTabStore } from '../../util/tabStore';
import { refreshCity } from './refreshCity';
import {
  deleteCityById,
  getAccountById,
  getAllStoredAccounts,
  saveCityInPlace,
  saveCurrentCityAs,
  saveNewCityAs,
} from '../../elvenar/AccountManager';
import ExportDialog from './ExportDialog';
import SaveCityDialog from './SaveCityDialog';
import MyConfirmDialog from '../../widgets/MyConfirmDialog';
import { resetMovedInPlace, saveBack } from '../generateCity';
import { sendCitySavedMessage } from '../../chrome/messages';
import ImportDialog from './ImportDialog';
import { CityEntity } from '../../model/cityEntity';

interface ShowLevelDialogData {
  open: boolean;
  index: number;
}

export const renderCityGrid = (s: CityViewState, forceUpdate: () => void) => {
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
  const setAccountId = useTabStore((state) => state.setAccountId);

  // State for ExportDialog
  const [exportDialog, setExportDialog] = useState({ open: false, exportStr: '' });

  // State for SaveCityDialog
  const [saveAsDialog, setSaveAsDialog] = useState({ open: false, defaultName: '', existingCities: [] as string[] });

  // State for Delete Confirmation Dialog
  const [showDeleteConfirmationDialog, setShowDeleteConfirmationDialog] = useState({ open: false });

  // State for ImportDialog
  const [importDialog, setImportDialog] = useState({ open: false, existingCities: [] as string[] });

  function renderExportDialog() {
    return (
      <ExportDialog
        isOpen={exportDialog.open}
        onClose={() => setExportDialog({ open: false, exportStr: '' })}
        exportString={exportDialog.exportStr}
      />
    );
  }

  function renderSaveCityDialog() {
    async function doSave(name: string) {
      setSaveAsDialog({ open: false, defaultName: '', existingCities: [] });
      const cityEntities = saveBack(Object.values(blocks));
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      await saveCurrentCityAs(s.accountId!, name, cityEntities);
      await sendCitySavedMessage(name);
      resetMovedInPlace(Object.values(blocks));
      setAccountId(name);
    }

    return (
      <SaveCityDialog
        isOpen={saveAsDialog.open}
        onClose={() => setSaveAsDialog({ open: false, defaultName: '', existingCities: [] })}
        onSave={doSave}
        defaultName={saveAsDialog.defaultName}
        existingCities={saveAsDialog.existingCities}
      />
    );
  }

  function renderDeleteConfirmationDialog() {
    async function handleDelete() {
      setShowDeleteConfirmationDialog({ open: false });
      if (!s.accountId) {
        return;
      }
      await deleteCityById(s.accountId);
      const storedAccounts = getAllStoredAccounts();
      if (storedAccounts.length > 0) {
        const [firstAccountId] = storedAccounts[0];
        setAccountId(firstAccountId);
      } else {
        throw new Error('ElvenAssist: No more saved cities available after deletion.');
      }
    }

    return (
      <MyConfirmDialog
        isOpen={showDeleteConfirmationDialog.open}
        onClose={() => setShowDeleteConfirmationDialog({ open: false })}
        onConfirm={handleDelete}
        title='Delete Saved City?'
        message='Are you sure you want to remove this saved city? All associated data will be permanently lost.'
        severity='error'
        confirmLabel='Delete'
        cancelLabel='Keep it'
      />
    );
  }

  function renderImportDialog() {
    async function handleImport(name: string, data: string) {
      // placeholder
      try {
        const jsonStr = atob(data.trim());

        const importData = JSON.parse(jsonStr) as {
          city_map: {
            unlocked_areas: { x: number; y: number; width: number; length: number }[];
            entities: {
              id: number;
              cityentity_id: string;
              x: number;
              y: number;
              stage: number;
              type?: string;
              level?: number;
            }[];
          };
          user_data: { race: string };
        };

        const buildingFinder = new BuildingFinder();
        await buildingFinder.ensureInitialized();

        const cityEntities = importData.city_map.entities.map((e: (typeof importData.city_map.entities)[0]) => {
          const levelMatch = /_(\d+)$/.exec(e.cityentity_id);
          const level = e.level || (levelMatch ? parseInt(levelMatch[1]) : 1);
          const building = buildingFinder.getBuilding(e.cityentity_id, level);

          return {
            id: e.id,
            level,
            player_id: 0,
            cityentity_id: e.cityentity_id,
            x: e.x,
            y: e.y,
            stage: e.stage,
            type: e.type || building?.type || 'unknown',
            connected: false,
            connectionStrategy: building?.connectionStrategy || 'unknown',
          } satisfies CityEntity;
        });
        await saveNewCityAs(name, cityEntities, importData.user_data.race, importData.city_map.unlocked_areas);
        await sendCitySavedMessage('imported_' + name);
        setAccountId(name);
      } catch (e) {
        setGlobalError('Failed to decode or parse imported city data.');
        return;
      }
    }
    return (
      <ImportDialog
        isOpen={importDialog.open}
        onClose={() => setImportDialog({ open: false, existingCities: [] })}
        onImport={handleImport}
        existingCities={importDialog.existingCities}
      />
    );
  }

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

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const isDetached = !!getAccountById(s.accountId!)?.isDetached;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'KeyS' && !event.altKey && !event.repeat && event.ctrlKey && !event.metaKey) {
        // Ctrl+S
        event.preventDefault();
        if (isDetached) {
          saveCity(s);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [s.rBlocks[0]]);

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

  function exportCityAsJson(s: CityViewState) {
    if (!s.accountId) {
      return;
    }
    const accountData = getAccountById(s.accountId);
    if (!accountData?.cityQuery) {
      return;
    }

    const unlocked_areas = s.props.unlockedAreas;
    const entities = Object.values(blocks).map((b, idx) => ({
      id: idx + 1,
      cityentity_id: b.entity.cityentity_id,
      x: b.x,
      y: b.y,
      stage: b.entity.stage,

      type: b.type.replace(/_[xy]$/, ''),
      level: b.entity.level,
    }));
    const user_data = {
      race: accountData.cityQuery.userData.race,
    };

    const exportData = {
      city_map: {
        unlocked_areas,
        entities,
      },
      user_data,
    };

    const jsonStr = JSON.stringify(exportData);
    const base64Str = btoa(jsonStr);
    setExportDialog({ open: true, exportStr: base64Str });
  }

  function importCity(s: CityViewState) {
    const storedAccounts = getAllStoredAccounts();
    const existingCities = storedAccounts.filter(([, data]) => data.isDetached).map(([name, _]) => name);
    setImportDialog({ open: true, existingCities });
  }

  function saveCityAs(s: CityViewState) {
    const storedAccounts = getAllStoredAccounts();
    const existingCities = storedAccounts.filter(([, data]) => data.isDetached).map(([name, _]) => name);
    setSaveAsDialog({ open: true, defaultName: `CityLayout_${new Date().toISOString().slice(0, 10)}`, existingCities });
  }

  async function saveCity(s: CityViewState) {
    if (!s.accountId) {
      return;
    }
    const newBlocks = saveBack(Object.values(blocks));

    await saveCityInPlace(s.accountId, newBlocks);
    resetMovedInPlace(Object.values(blocks));
    forceUpdate();
  }

  function deleteCity(s: CityViewState) {
    setShowDeleteConfirmationDialog({ open: true });
  }

  return (
    <Stack>
      <Stack direction='row'>
        {isDetached && <span style={{ alignSelf: 'center' }}>(Detached City)</span>}
        {!isDetached && <Button onClick={() => refreshCity(s.accountId, s.props.forceUpdate)}>Refresh City</Button>}
        <Button onClick={() => sellStreets(s)}>Sell Streets</Button>
        <Button onClick={() => importCity(s)}>Import City</Button>
        <Button onClick={() => exportCityAsJson(s)}>Export City</Button>
        <Button onClick={() => saveCityAs(s)}>Save City As...</Button>
        {isDetached && (
          <Button onClick={() => deleteCity(s)} sx={{ color: 'red' }}>
            Delete
          </Button>
        )}
        {isDetached && <Button onClick={() => saveCity(s)}>Save</Button>}
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
        {/* ExportDialog Modal */}
        {exportDialog.open && renderExportDialog()}
        {/* SaveCityDialog Modal */}
        {saveAsDialog.open && renderSaveCityDialog()}
        {/* Delete Confirmation Dialog */}
        {showDeleteConfirmationDialog.open && renderDeleteConfirmationDialog()}
        {/* ImportDialog Modal */}
        {importDialog.open && renderImportDialog()}
      </div>
    </Stack>
  );
};
