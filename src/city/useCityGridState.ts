import React from 'react';
import { sendCitySavedMessage } from '../chrome/messages';
import {
  deleteCityById,
  getAccountById,
  getAllStoredAccounts,
  saveCityInPlace,
  saveCurrentCityAs,
  saveNewCityAs,
} from '../elvenar/AccountManager';
import { getBuildings } from '../elvenar/getBuildings';
import { useHelper } from '../helper/HelperContext';
import { CityEntity, CityEntityEx } from '../model/cityEntity';
import { UnlockedArea } from '../model/unlockedArea';
import { generateUniqueId } from '../util/generateUniqueId';
import { guessRankingPointsFromChapter } from '../util/guessRankingPointsFromChapter';
import { useTabStore } from '../util/tabStore';
import { BuildingFinder } from './buildingFinder';
import { BuildingConfig, BuildingDefinition } from './CATEGORIES';
import { CityBlock } from './CityBlock';
import { useCity } from './CityContext';
import { getEntityMaxLevel } from './CityGrid/getEntityMaxLevel';
import { resetMovedInPlace, saveBack } from './generateCity';
import { getChapterFromEntity, getCityBlockFromCityEntity } from './getCityBlockFromCityEntity';
import { MoveLogInterface } from './MoveLog/moveLogInterface';

interface ShowLevelDialogData {
  open: boolean;
  index: number;
}

export const useCityGridState = () => {
  const city = useCity();
  const helper = useHelper();
  const {
    blocks,
    setBlocks,
    setMoveLog,
    setDragIndex,
    setDragOffset,
    setOriginalPos,
    setSearchTerm,
    setMenu,
    maxLevels,
    dragIndex,
  } = city;

  // Global Store State
  const viewMode = useTabStore((state) => state.viewMode);
  const setViewMode = useTabStore((state) => state.setViewMode);
  const setGlobalError = useTabStore((state) => state.setGlobalError);
  const setAccountId = useTabStore((state) => state.setAccountId);

  // Local UI State
  const [showLevelDialog, setShowLevelDialog] = React.useState<ShowLevelDialogData>({ open: false, index: -1 });
  const [levelInput, setLevelInput] = React.useState(1);
  const [showBuildDialog, setShowBuildDialog] = React.useState(false);
  const [buildings, setBuildings] = React.useState<BuildingDefinition[]>([]);

  // Dialog States
  const [exportDialog, setExportDialog] = React.useState({ open: false, exportStr: '' });
  const [saveAsDialog, setSaveAsDialog] = React.useState({
    open: false,
    defaultName: '',
    existingCities: [] as string[],
  });
  const [showDeleteConfirmationDialog, setShowDeleteConfirmationDialog] = React.useState({ open: false });
  const [importDialog, setImportDialog] = React.useState({ open: false, existingCities: [] as string[] });

  // Derived State
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const isDetached = !!getAccountById(city.accountId!)?.isDetached;

  // --- Effects ---

  // Initial Data Load (Buildings for Build Menu)
  React.useEffect(() => {
    async function loadBuildings() {
      const finder = new BuildingFinder();
      await finder.ensureInitialized();
      const blds = finder.getAllBuildingsByCategory(city.race);
      setBuildings(blds);
    }
    loadBuildings();
  }, [city.race]);

  // Keyboard Handler for Dragging (Level Up/Down/Delete)
  React.useEffect(() => {
    if (dragIndex === null) return;

    const handleKeyDown = async (event: KeyboardEvent) => {
      // Level up/down
      if (event.key === '+' || event.key === '=' || event.key === '-') {
        event.preventDefault();
        const block = blocks[dragIndex];
        if (!block) return;

        const maxLevel = getEntityMaxLevel(block.entity.cityentity_id, block.type, maxLevels);
        if (maxLevel === 1) return;

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
          // First level change during this drag
          if (newLevel !== block.entity.level) {
            const newBuilding = finder.getBuilding(block.entity.cityentity_id, newLevel);
            if (!newBuilding) return;

            const newBlock = {
              ...block,
              entity: { ...block.entity, level: newLevel },
              width: newBuilding.width,
              length: newBuilding.length,
              level: newLevel,
              chapter: getChapterFromEntity(undefined, block.entity.cityentity_id, block.type, newLevel),
              label: `${newLevel}`,
              id: generateUniqueId(),
            } satisfies CityBlock;

            setBlocks((prev) => {
              const { [dragIndex]: _, ...updated } = prev;
              updated[newBlock.id] = newBlock;
              return updated;
            });

            setMoveLog((prev) => [
              ...prev,
              {
                id: block.id,
                name: block.name,
                from: { x: originalPos.x, y: originalPos.y, level: block.entity.level },
                to: { x: originalPos.x, y: originalPos.y, level: block.entity.level },
                movedChanged: false,
                type: 'delete',
                deletedBlock: { ...block, x: originalPos.x, y: originalPos.y },
              },
            ]);
            setOriginalPos(null);
            setDragIndex(newBlock.id);
          }
        } else {
          // Subsequent level change
          const newBuilding = finder.getBuilding(block.entity.cityentity_id, newLevel);
          if (!newBuilding) return;

          setBlocks((prev) => ({
            ...prev,
            [dragIndex]: {
              ...prev[dragIndex],
              entity: { ...prev[dragIndex].entity, level: newLevel },
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
            from: { x: block.x, y: block.y },
            to: { x: block.x, y: block.y },
            movedChanged: false,
            type: 'delete',
            deletedBlock: block,
          } satisfies MoveLogInterface,
        ]);
        setDragIndex(null);
        setDragOffset({ x: 0, y: 0 });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    dragIndex,
    blocks,
    maxLevels,
    setBlocks,
    setDragIndex,
    setDragOffset,
    setMoveLog,
    city.originalPos,
    setOriginalPos,
  ]);

  // Keyboard Shortcuts (Ctrl+S, Alt+B)
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'KeyS' && !event.altKey && !event.repeat && event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        saveCity();
      }
      if (event.code === 'KeyB' && event.altKey && !event.repeat && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        setShowBuildDialog(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [blocks]); // Dependency on blocks for saveCity closure

  // Helper Tip
  React.useEffect(() => {
    if (showBuildDialog) {
      helper.showMessage('you_can_press_alt_b_to_build');
    }
  }, [showBuildDialog, helper]);

  // --- Logic / Handlers ---

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const term = e.target.value;
    setSearchTerm(term);
    let matcher: ((name: string) => boolean) | null = null;
    if (term.length > 2 && term.startsWith('/') && term.endsWith('/')) {
      try {
        const regex = new RegExp(term.slice(1, -1), 'i');
        matcher = (name: string) => regex.test(name);
      } catch {
        matcher = null;
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
          } satisfies CityBlock,
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

  async function duplicateAndDeleteBlock(index: number, newLevel: number) {
    const blockToDup = blocks[index];
    if (!blockToDup || !blockToDup.label) return;

    const finder = new BuildingFinder();
    await finder.ensureInitialized();
    const newBuilding = finder.getBuilding(blockToDup.gameId, newLevel);

    if (!newBuilding || !newBuilding.id.endsWith(`_${newLevel}`)) {
      return;
    }

    const newBlock = {
      ...blockToDup,
      id: generateUniqueId(),
      x: blockToDup.x + 1,
      y: blockToDup.y + 1,
      label: `${newLevel}`,
      level: newLevel,
      width: newBuilding.width,
      length: newBuilding.length,
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
    setDragOffset({ x: 10, y: 10 });
    setOriginalPos(null);
    setMenu(null);
  }

  const sellStreets = () => {
    setBlocks((prev) => Object.fromEntries(Object.entries(prev).filter(([_, b]) => b.type !== 'street')));
  };

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

    if (!newBuilding) return;

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

    setBlocks((prev) => ({ ...prev, [newBlock.id]: newBlock }));
    setDragIndex(newBlock.id);
    setDragOffset({ x: 10, y: 10 });
    setOriginalPos(null);
  }

  // --- Dialog Triggers & Actions ---

  function exportCityAsJson() {
    if (!city.accountId) return;
    const accountData = getAccountById(city.accountId);
    if (!accountData?.cityQuery) return;

    const entities = Object.values(city.blocks).map((b, idx) => ({
      id: idx + 1,
      cityentity_id: b.entity.cityentity_id,
      x: b.x,
      y: b.y,
      stage: b.entity.stage,
      type: b.type.replace(/_[xy]$/, ''),
      level: b.entity.level,
    }));
    const user_data = { race: accountData.cityQuery.userData.race };
    const exportData = {
      city_map: { unlocked_areas: city.unlockedAreas, entities },
      user_data,
    };

    const jsonStr = JSON.stringify(exportData);
    const base64Str = btoa(jsonStr);
    setExportDialog({ open: true, exportStr: base64Str });
  }

  function importCity() {
    const storedAccounts = getAllStoredAccounts();
    const existingCities = storedAccounts
      .filter(([id, data]) => data.isDetached && id !== 'Visited')
      .map(([name]) => name);
    setImportDialog({ open: true, existingCities });
  }

  async function handleImport(name: string, data: string) {
    try {
      const jsonStr = atob(data.trim());
      const importData = JSON.parse(jsonStr) as {
        city_map: {
          entities: CityEntity[];
          unlocked_areas: UnlockedArea[];
        };
        user_data: { race: string };
      }; // Type assertion could be stricter here

      const buildingFinder = new BuildingFinder();
      await buildingFinder.ensureInitialized();

      let minChapter = 0;
      const cityEntities = importData.city_map.entities.map((e: CityEntity) => {
        const levelMatch = /_(\d+)$/.exec(e.cityentity_id);
        const level = e.level || (levelMatch ? parseInt(levelMatch[1]) : 1);
        const building = buildingFinder.getBuilding(e.cityentity_id, level);

        const reqChapter = building?.sourceBuilding.requirements.chapter || 0;
        if (reqChapter > minChapter) minChapter = reqChapter;

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

      const rankingPoints = guessRankingPointsFromChapter(minChapter);
      await saveNewCityAs(
        name,
        cityEntities,
        importData.user_data.race,
        importData.city_map.unlocked_areas,
        minChapter,
        rankingPoints,
      );
      await sendCitySavedMessage('imported_' + name);
      setAccountId(name);
    } catch (e) {
      setGlobalError('Failed to decode or parse imported city data.');
    }
  }

  function saveCityAs() {
    const storedAccounts = getAllStoredAccounts();
    const existingCities = storedAccounts
      .filter(([id, data]) => data.isDetached && id !== 'Visited')
      .map(([name]) => name);
    if (!city.accountId) return;
    const accountData = getAccountById(city.accountId);
    let defaultName = `${accountData?.cityQuery?.userData.user_name} ${new Date().toISOString().slice(0, 10)}`;
    if (city.accountId === 'Visited') {
      defaultName = `${accountData?.cityQuery?.userData.user_name}`;
    }
    setSaveAsDialog({ open: true, defaultName, existingCities });
  }

  async function saveCity() {
    if (!city.accountId) return;
    const newBlocks = saveBack(Object.values(blocks));

    if (city.accountId === 'Visited' || !isDetached) {
      saveCityAs();
      return;
    }

    await saveCityInPlace(city.accountId, newBlocks, city.chapter);
    resetMovedInPlace(Object.values(blocks));
    city.triggerForceUpdate();
  }

  async function handleSaveDialogSave(name: string) {
    setSaveAsDialog({ open: false, defaultName: '', existingCities: [] });
    const cityEntities = saveBack(Object.values(blocks));
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    await saveCurrentCityAs(city.accountId!, name, cityEntities, city.chapter);
    await sendCitySavedMessage(name);
    resetMovedInPlace(Object.values(blocks));
    setAccountId(name);
  }

  async function handleDelete() {
    setShowDeleteConfirmationDialog({ open: false });
    if (!city.accountId) return;
    await deleteCityById(city.accountId);
    const storedAccounts = getAllStoredAccounts();
    if (storedAccounts.length > 0) {
      const [firstAccountId] = storedAccounts[0];
      city.setAccountId(firstAccountId);
    } else {
      throw new Error('ElvenAssist: No more saved cities available after deletion.');
    }
  }

  function deleteCity() {
    setShowDeleteConfirmationDialog({ open: true });
  }

  const handleDuplicateBlock = (key: number | string | undefined) => {
    if (typeof key !== 'number') return null;
    const blockToDup = blocks[key];
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
    setDragIndex(newBlock.id);
    setOriginalPos(null);
    setMenu(null);
  };

  const handleDeleteBlock = (key: number | string | undefined) => {
    if (typeof key !== 'number') return null;
    const blocks = city.blocks;
    const blockToDelete = blocks[key];
    const { [key]: _, ...newBlocks } = blocks;
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
  };

  const handleChangeLevel = (key: number | string | undefined) => {
    if (typeof key !== 'number') return null;
    const block = blocks[key];
    setLevelInput(Number(block.label) || 1);
    setMenu(null);
    setShowLevelDialog({ open: true, index: key });
  };

  return {
    // State
    viewMode,
    setViewMode,
    showLevelDialog,
    setShowLevelDialog,
    levelInput,
    setLevelInput,
    showBuildDialog,
    setShowBuildDialog,
    buildings,
    exportDialog,
    setExportDialog,
    saveAsDialog,
    setSaveAsDialog,
    showDeleteConfirmationDialog,
    setShowDeleteConfirmationDialog,
    importDialog,
    setImportDialog,
    isDetached,

    // Actions
    handleSearchChange,
    deleteHighlightedBlocks,
    duplicateAndDeleteBlock,
    sellStreets,
    onSelectBuilding,
    exportCityAsJson,
    importCity,
    handleImport,
    saveCityAs,
    saveCity,
    handleSaveDialogSave,
    deleteCity,
    handleDelete,
    handleDuplicateBlock,
    handleDeleteBlock,
    handleChangeLevel,
  };
};
