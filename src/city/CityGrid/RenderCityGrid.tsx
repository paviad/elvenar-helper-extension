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
import { handleMouseMove } from './handleMouseMove';
import { handleMouseUp } from './handleMouseUp';
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
import { CityEntity, CityEntityEx } from '../../model/cityEntity';
import { generateUniqueId } from '../../util/generateUniqueId';
import { getEntityMaxLevel } from './getEntityMaxLevel';
import { MoveLogInterface } from '../MoveLog/MoveLogInterface';
import { useCity } from '../CityContext';
import { BuildingConfig, NewBuildingSelector } from '../NewBuildingSelector';
import { BuildingDefinition } from '../CATEGORIES';
import { getBuildings } from '../../elvenar/getBuildings';
import { getChapterFromEntity, getCityBlockFromCityEntity } from '../getCityBlockFromCityEntity';
import { useHelper } from '../../helper/HelperContext';

interface ShowLevelDialogData {
  open: boolean;
  index: number;
}

export const RenderCityGrid = () => {
  const city = useCity();
  const helper = useHelper();
  const setMoveLog = city.setMoveLog;

  // State for Change Level dialog
  const [showLevelDialog, setShowLevelDialog] = useState({ open: false, index: -1 } as ShowLevelDialogData);
  const [levelInput, setLevelInput] = useState(1);
  const { GridSize, GridMax, svgRef, menuRef } = city;

  const [showBuildDialog, setShowBuildDialog] = useState(false);
  const [buildings, setBuildings] = useState([] as BuildingDefinition[]);

  const blocks = city.blocks;
  const setBlocks = city.setBlocks;

  const dragIndex = city.dragIndex;
  const setDragIndex = city.setDragIndex;

  const dragOffset = city.dragOffset;
  const setDragOffset = city.setDragOffset;

  const searchTerm = city.searchTerm;
  const setSearchTerm = city.setSearchTerm;

  const menu = city.menu;
  const setMenu = city.setMenu;

  const maxLevels = city.maxLevels;
  const setGlobalError = useTabStore((state) => state.setGlobalError);
  const setAccountId = useTabStore((state) => state.setAccountId);

  useEffect(() => {
    async function Do() {
      const finder = new BuildingFinder();
      await finder.ensureInitialized();
      const buildings = finder.getAllBuildingsByCategory(city.race);
      setBuildings(buildings);
    }
    Do();
  }, []);

  // Key handler for changing level while dragging
  useEffect(() => {
    if (dragIndex === null) {
      return;
    }
    const handleKeyDown = async (event: KeyboardEvent) => {
      // Level up/down
      if (event.key === '+' || event.key === '=' || event.key === '-') {
        event.preventDefault();
        const block = blocks[dragIndex];
        if (!block) {
          return;
        }
        const maxLevel = getEntityMaxLevel(block.entity.cityentity_id, block.type, maxLevels);
        if (maxLevel === 1) {
          return;
        }
        const finder = new BuildingFinder();
        await finder.ensureInitialized();
        let newLevel = block.entity.level || 1;
        if (event.key === '+' || event.key === '=') {
          if (newLevel < maxLevel) newLevel++;
        } else if (event.key === '-') {
          if (newLevel > 1) newLevel--;
        }
        const originalPos = city.originalPos;
        if (originalPos) {
          // This is the first level change
          if (newLevel !== block.entity.level) {
            const newBuilding = finder.getBuilding(block.entity.cityentity_id, newLevel);
            if (!newBuilding) return;
            // Prepare new block
            const newBlock = {
              ...block,
              entity: {
                ...block.entity,
                level: newLevel,
              },
              width: newBuilding.width,
              length: newBuilding.length,
              level: newLevel,
              chapter: getChapterFromEntity(undefined, block.entity.cityentity_id, block.type, newLevel),
              label: `${newLevel}`,
              id: generateUniqueId(), // new id for duplication
            } satisfies CityBlock;
            setBlocks((prev) => {
              const { [dragIndex]: _, ...updated } = prev;
              updated[newBlock.id] = newBlock;
              return updated;
            });
            // Log as delete of original, then add of new
            setMoveLog((prev) => [
              ...prev,
              {
                id: block.id,
                name: block.name,
                from: { x: originalPos.x, y: originalPos.y, level: block.entity.level },
                to: { x: originalPos.x, y: originalPos.y, level: block.entity.level },
                movedChanged: false,
                type: 'delete',
                deletedBlock: {
                  ...block,
                  x: originalPos.x,
                  y: originalPos.y,
                },
              },
            ]);
            city.setOriginalPos(null);
            setDragIndex(newBlock.id);
          }
        } else {
          // This is a subsequent level change
          const newBuilding = finder.getBuilding(block.entity.cityentity_id, newLevel);
          if (!newBuilding) return;
          // Update block
          setBlocks((prev) => ({
            ...prev,
            [dragIndex]: {
              ...prev[dragIndex],
              entity: {
                ...prev[dragIndex].entity,
                level: newLevel,
              },
              level: newLevel,
              chapter: getChapterFromEntity(undefined, block.entity.cityentity_id, block.type, newLevel),
              width: newBuilding.width,
              length: newBuilding.length,
              label: `${newLevel}`,
            },
          }));
        }
      }
      // Delete block
      if (event.key === 'Delete') {
        event.preventDefault();
        const block = blocks[dragIndex];
        if (!block) return;
        setBlocks((prev) => {
          const { [dragIndex]: _, ...updated } = prev;
          return updated;
        });
        setMoveLog((prev) => [
          ...prev,
          {
            id: block.id,
            name: block.name,
            from: { x: block.x, y: block.y, level: block.entity.level },
            to: { x: block.x, y: block.y, level: block.entity.level },
            movedChanged: false,
            type: 'delete',
            deletedBlock: block,
          },
        ]);
        setDragIndex(null);
        setDragOffset({ x: 0, y: 0 });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dragIndex, blocks, maxLevels, setBlocks, setDragIndex, setDragOffset, setMoveLog]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'KeyB' && event.altKey && !event.repeat && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        setShowBuildDialog(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (showBuildDialog) {
      helper.showMessage('you_can_press_alt_b_to_build');
    }
  }, [showBuildDialog]);

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
      await saveCurrentCityAs(city.accountId!, name, cityEntities);
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
      if (!city.accountId) {
        return;
      }
      await deleteCityById(city.accountId);
      const storedAccounts = getAllStoredAccounts();
      if (storedAccounts.length > 0) {
        const [firstAccountId] = storedAccounts[0];
        city.setAccountId(firstAccountId);
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

  function deleteHighlightedBlocks(highlighted: boolean) {
    const blocksToDelete = Object.entries(blocks).filter(([_, block]) => block.highlighted === highlighted);
    if (blocksToDelete.length === 0) return;
    setBlocks((prev) => {
      const updated = Object.fromEntries(
        Object.entries(prev).filter(([_, block]) => block.highlighted !== highlighted),
      );
      return updated;
    });
    setMoveLog((prev) => [
      ...prev,
      ...blocksToDelete.map(
        ([_, block]) =>
          ({
            id: block.id,
            name: block.name,
            from: { x: block.x, y: block.y },
            to: { x: block.x, y: block.y },
            movedChanged: false,
            type: 'delete',
            deletedBlock: block,
          }) satisfies MoveLogInterface,
      ),
    ]);
  }

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const isDetached = !!getAccountById(city.accountId!)?.isDetached;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'KeyS' && !event.altKey && !event.repeat && event.ctrlKey && !event.metaKey) {
        // Ctrl+S
        event.preventDefault();
        saveCity();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [city.blocks]);

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
      id: generateUniqueId(), // Unique ID
      x: blockToDup.x + 1,
      y: blockToDup.y + 1,
      label: `${newLevel}`,
      level: newLevel,
      width,
      length,
      moved: true,
    } satisfies CityBlock;
    setBlocks((prev) => {
      const { [index]: _, ...filtered } = prev;
      return { ...filtered, [newBlock.id]: newBlock };
    });
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
    city.setOriginalPos(null);
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
                id: generateUniqueId(),
                x: blockToDup.x + 1,
                y: blockToDup.y + 1,
                moved: true,
              };
              setBlocks((prev) => {
                const newBlocks = { ...prev, [newBlock.id]: newBlock };
                return newBlocks;
              });
              city.setDragIndex(newBlock.id);
              city.setOriginalPos(null);
              setMenu(null);
            }}
          >
            <ListItemText primary='Duplicate' />
          </ListItemButton>
          <Divider />
          <ListItemButton
            onClick={() => {
              const blocks = city.blocks;
              const setBlocks = city.setBlocks;
              const blockToDelete = blocks[menu.key as number];
              const { [menu.key as number]: _, ...newBlocks } = blocks;
              city.overwriteBlocks(newBlocks);
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
          {typeof menu.key === 'number' && blocks[menu.key] && /^[GPRHMOYDBZ]_/.test(blocks[menu.key].gameId) && (
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

  function exportCityAsJson() {
    if (!city.accountId) {
      return;
    }
    const accountData = getAccountById(city.accountId);
    if (!accountData?.cityQuery) {
      return;
    }

    const unlocked_areas = city.unlockedAreas;
    const entities = Object.values(city.blocks).map((b, idx) => ({
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

  const sellStreets = () => {
    const setBlocks = city.setBlocks;
    setBlocks((prev) => Object.fromEntries(Object.entries(prev).filter(([_, b]) => b.type !== 'street')));
  };

  function importCity() {
    const storedAccounts = getAllStoredAccounts();
    const existingCities = storedAccounts
      .filter(([id, data]) => data.isDetached && id !== 'Visited')
      .map(([name, _]) => name);
    setImportDialog({ open: true, existingCities });
  }

  function saveCityAs() {
    const storedAccounts = getAllStoredAccounts();
    const existingCities = storedAccounts
      .filter(([id, data]) => data.isDetached && id !== 'Visited')
      .map(([name, _]) => name);
    if (!city.accountId) {
      return;
    }
    const accountData = getAccountById(city.accountId);
    let defaultName = `${accountData?.cityQuery?.userData.user_name} ${new Date().toISOString().slice(0, 10)}`;
    if (city.accountId === 'Visited') {
      defaultName = `${accountData?.cityQuery?.userData.user_name}`;
    }

    setSaveAsDialog({ open: true, defaultName, existingCities });
  }

  async function saveCity() {
    if (!city.accountId) {
      return;
    }
    const newBlocks = saveBack(Object.values(blocks));

    if (city.accountId === 'Visited' || !isDetached) {
      saveCityAs();
      return;
    }

    await saveCityInPlace(city.accountId, newBlocks);
    resetMovedInPlace(Object.values(blocks));
    city.forceUpdate();
  }

  function deleteCity() {
    setShowDeleteConfirmationDialog({ open: true });
  }

  async function onSelectBuilding(building: BuildingDefinition, config: BuildingConfig) {
    const allBuildings = await getBuildings();
    const qual = config.level || config.chapter || '';
    const id1 = `${building.id}_${qual}`.replace(/_$/, '');
    const id2 = building.id;
    const blds1 = allBuildings.find((b) => b.id === id1);
    const blds2 = allBuildings.find((b) => b.id === id2);
    const blds3 = allBuildings.find((b) => b.base_name === building.id);
    const newBuilding = blds1 || blds2 || blds3;
    setShowBuildDialog(false);

    if (!newBuilding) {
      return;
    }

    const newLevel = newBuilding.level || 1;
    const chapter = newBuilding.requirements.worker && newBuilding.requirements.chapter;

    const newEntity = {
      id: generateUniqueId(),
      cityentity_id: newBuilding.id,
      level: newLevel,
      player_id: 0,
      stage: config.stage,
      type: newBuilding.type,
      connected: false,
      connectionStrategy: newBuilding.requirements.connectionStrategyId,
      x: 0,
      y: 0,
      chapter,
      length: newBuilding.length,
      width: newBuilding.width,
      description: newBuilding.description,
      name: newBuilding.name,
    } satisfies CityEntityEx;

    const newBlock = {
      ...getCityBlockFromCityEntity(newEntity),
      id: newEntity.id,
    };

    setBlocks((prev) => {
      return { ...prev, [newBlock.id]: newBlock };
    });
    setDragIndex(newBlock.id);
    setDragOffset({
      x: 10,
      y: 10,
    });
    city.setOriginalPos(null);
  }

  return (
    <Stack>
      <Stack direction='row'>
        {isDetached && <span style={{ alignSelf: 'center' }}>(Detached City)</span>}
        {!isDetached && <Button onClick={() => refreshCity(city.accountId, city.forceUpdate)}>Refresh City</Button>}
        <Button onClick={() => sellStreets()}>Sell Streets</Button>
        <Button onClick={() => setShowBuildDialog(true)}>Build</Button>
        <Button onClick={() => importCity()}>Import City</Button>
        <Button onClick={() => exportCityAsJson()}>Export City</Button>
        <Button onClick={() => saveCityAs()}>Save City As...</Button>
        {isDetached && (
          <Button onClick={() => deleteCity()} sx={{ color: 'red' }}>
            Delete
          </Button>
        )}
        {isDetached && city.accountId !== 'Visited' && <Button onClick={() => saveCity()}>Save</Button>}
        <Button
          onClick={() => deleteHighlightedBlocks(true)}
          disabled={Object.values(blocks).every((b) => !b.highlighted)}
        >
          Delete Highlighted
        </Button>
        <Button
          onClick={() => deleteHighlightedBlocks(false)}
          disabled={Object.values(blocks).every((b) => !b.highlighted)}
        >
          Delete Non-Highlighted
        </Button>
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
        <div ref={city.mousePositionRef} style={{ marginBottom: 8, fontWeight: 'bold' }}>
          Grid: (-, -)
        </div>
        <svg
          ref={city.svgRef}
          width={GridSize * GridMax}
          height={GridSize * GridMax}
          style={{
            border: '1px solid black',
            cursor: dragIndex !== null ? 'grabbing' : 'default',
            userSelect: 'none',
          }}
          onMouseMove={(e) => handleMouseMove(city, e)}
          onClick={() => handleMouseUp(city)}
          // onMouseLeave={() => handleMouseUp(city)}
        >
          <rect x={0} y={0} width={GridSize * GridMax} height={GridSize * GridMax} fill='#145214' />

          {city.unlockedAreas.map((area, idx) => (
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
              ...blocksBelowUnmoved.map(([index, block]) => blockRect(Number(index), block)),
              ...blocksBelow.map(([index, block]) => blockRect(Number(index), block)),
              ...blocksHighlighted.map(([index, block]) => blockRect(Number(index), block)),
            ];
            if (dragIndex !== null) {
              const draggedBlock = blocks[dragIndex];
              sortedBlocks.push(blockRect('dragged', draggedBlock));
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
        {/* Build (NewBuildingSelector) Modal */}
        {showBuildDialog && (
          <Dialog
            open={showBuildDialog}
            onClose={() => setShowBuildDialog(false)}
            maxWidth={false}
            slotProps={{ paper: { sx: { width: 800 } } }}
          >
            <NewBuildingSelector onSelectBuilding={onSelectBuilding} buildings={buildings} />
          </Dialog>
        )}
      </div>
    </Stack>
  );
};
