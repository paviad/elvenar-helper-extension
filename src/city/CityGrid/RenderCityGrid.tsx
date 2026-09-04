import React, { useEffect } from 'react';
import { Box, Dialog, Stack } from '@mui/material';
import { useSearchParams } from 'react-router';
import { InventoryRowRef } from '../../inventory/inventoryRowRef';
import MyConfirmDialog from '../../widgets/MyConfirmDialog';
import { useCity } from '../CityContext';
import { CityContextMenu } from '../dialogs/CityContextMenu';
import { LevelDialog } from '../dialogs/LevelDialog';
import { setHoverForDrag } from '../hoveredBlockStore';
import { NewBuildingSelector } from '../NewBuildingSelector';
import { useCityGridState } from '../useCityGridState';
import { CityToolbar } from './CityToolbar';
import ExportDialog from './ExportDialog';
import ImportDialog from './ImportDialog';
import { subscribeToIsoMouseMove } from './iso/handleIsoMouseMove';
import { IsometricCityGrid } from './iso/IsometricCityGrid';
import { refreshCity } from './refreshCity';
import SaveCityDialog from './SaveCityDialog';
import { ScreenshotDialog } from './ScreenshotDialog';
import { TableCityView } from './table/TableCityView';
import { CityGrid } from './top/CityGrid';
import { subscribeToMouseMove as subscribeToTopMouseMove } from './top/handleMouseMove';
import { unlockExpansion } from './unlockExpansion';
import { UpgradesCityView } from './upgrades/UpgradesCityView';

export const RenderCityGrid = () => {
  const city = useCity();
  const { blocks, setMenu, menu, menuRef, svgRef, maxLevels, chapter } = city;

  // Use Custom Hook for Logic & State
  const state = useCityGridState();

  const [searchParams, setSearchParams] = useSearchParams();

  // A buildId in the query is what triggers this; the grid state is only what carries the
  // build out. useCityGridState hands back a fresh object every render, so listing it would
  // re-run the build on every render, and leaving it out left this closing over the state
  // from whichever render first registered it - and so building into a stale layout.
  const onBuildFromInventoryRef = React.useRef(state.onBuildFromInventory);
  React.useEffect(() => {
    onBuildFromInventoryRef.current = state.onBuildFromInventory;
  });

  useEffect(() => {
    async function Do() {
      const rc = searchParams.get('buildId');
      if (!rc) {
        return;
      }
      await onBuildFromInventoryRef.current({ id: Number(rc) });

      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('buildId');
      setSearchParams(nextParams, { replace: true });
    }
    void Do();
  }, [searchParams, setSearchParams]);

  // The hover names whatever is being carried and holds there for the length of the drag;
  // see the note in the store. It ends up on the building where it was dropped, which is
  // where the cursor is. Kept here rather than in the views, so it covers both of them and
  // survives a switch between them mid-drag.
  const { dragIndex } = city;
  React.useEffect(() => setHoverForDrag(dragIndex), [dragIndex]);

  // Mouse Subscription Effects (UI specific)
  React.useEffect(() => {
    const subscription = subscribeToTopMouseMove();
    const subscription2 = subscribeToIsoMouseMove();
    return () => {
      subscription.unsubscribe();
      subscription2.unsubscribe();
    };
  }, []);

  const hasHighlighted = city.highlightedIds.size > 0;

  // Replace = delete the old building, then spawn the inventory item in drag mode
  // on the top-down grid. The user positions it and makes room if needed, guided by
  // the marker left on the vacated footprint.
  const handleReplace = (blockId: number, item: InventoryRowRef, stage?: number) => {
    const block = city.blocks[blockId];
    if (block) {
      city.setReplacedArea({ x: block.x, y: block.y, width: block.width, length: block.length, name: block.name });
    }
    state.setViewMode('top');
    state.handleDeleteBlock(blockId);
    // The suggestion was made for an evolved stage, so the building is placed at that stage.
    void state.onBuildFromInventory(item, stage);
  };

  // The marker clears itself once something is dropped on it; Escape dismisses it early.
  const { replacedArea, setReplacedArea } = city;
  useEffect(() => {
    if (!replacedArea) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setReplacedArea(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [replacedArea, setReplacedArea]);

  return (
    <Stack>
      <CityToolbar
        isDetached={state.isDetached}
        onRefresh={() => refreshCity(city)}
        onSellStreets={state.sellStreets}
        onBuild={() => state.setShowBuildDialog(true)}
        onImport={state.importCity}
        onExport={() => void state.exportCityAsJson()}
        onScreenshot={state.captureScreenshot}
        onSaveAs={state.saveCityAs}
        onDelete={state.deleteCity}
        onSave={state.saveCity}
        showSaveButton={false}
        onDeleteHighlighted={state.deleteHighlightedBlocks}
        onUnlockArea={() => city.setUnlockAreaMode(true)}
        hasHighlightedBlocks={hasHighlighted}
        searchTerm={city.searchTerm}
        onSearchChange={state.handleSearchChange}
        mousePositionRef={city.mousePositionRef}
        viewMode={state.viewMode}
        onViewModeChange={state.setViewMode}
        modified={city.modified}
      />
      <div>
        {/* Viewport for City Grid */}
        <Box
          sx={{
            width: '100%',
            height: 'calc(100vh - 220px)', // Adjust for header/toolbar height
            border: '1px solid #444',
            borderRadius: 1,
            overflow: 'hidden', // Viewport handles overflow, scrollbars managed internally by components
            display: 'flex',
            bgcolor: state.viewMode === 'iso' ? '#1a1a2e' : undefined, // Conditional bg
          }}
        >
          {state.viewMode === 'top' && <CityGrid />}
          {state.viewMode === 'iso' && <IsometricCityGrid />}
          {state.viewMode === 'table' && <TableCityView />}
          {state.viewMode === 'upgrades' && <UpgradesCityView onReplace={handleReplace} />}
        </Box>

        {/* Modal Numeric Input Dialog */}
        <LevelDialog
          open={state.showLevelDialog.open}
          onClose={() => state.setShowLevelDialog({ open: false, index: -1 })}
          block={state.showLevelDialog.index !== -1 ? blocks[state.showLevelDialog.index] : undefined}
          maxLevels={maxLevels}
          levelInput={state.levelInput}
          setLevelInput={state.setLevelInput}
          onUpdate={(newLevel) => {
            void (async () => {
              state.setShowLevelDialog({ open: false, index: -1 });
              await state.duplicateAndDeleteBlock(state.showLevelDialog.index, newLevel);
              setMenu(null);
            })();
          }}
        />

        {/* Context Menu (now rendered as portal) */}
        {menu && svgRef && menuRef && (
          <CityContextMenu
            menu={menu}
            svgRef={svgRef}
            menuRef={menuRef}
            block={typeof menu.key === 'number' ? blocks[menu.key] : undefined}
            onDuplicate={() => state.handleDuplicateBlock(menu.key)}
            onDelete={() => state.handleDeleteBlock(menu.key)}
            onChangeLevel={() => state.handleChangeLevel(menu.key)}
            onUnlockArea={
              typeof menu.key === 'string' && menu.key.startsWith('locked:')
                ? () => {
                    const [cx, cy] = (menu.key as string).slice('locked:'.length).split(',').map(Number);
                    unlockExpansion(city, cx, cy);
                  }
                : undefined
            }
          />
        )}

        {/* ExportDialog Modal */}
        <ExportDialog
          isOpen={state.exportDialog.open}
          onClose={() => state.setExportDialog({ open: false, exportStr: '' })}
          exportString={state.exportDialog.exportStr}
        />

        {/* ScreenshotDialog Modal. The picture is kept on close so the dialog fades out on it. */}
        <ScreenshotDialog
          open={state.screenshotDialog.open}
          onClose={() => state.setScreenshotDialog((prev) => ({ ...prev, open: false }))}
          image={state.screenshotDialog.image}
          error={state.screenshotDialog.error}
          fileName={state.screenshotDialog.fileName}
        />

        {/* SaveCityDialog Modal */}
        <SaveCityDialog
          isOpen={state.saveAsDialog.open}
          onClose={() => state.setSaveAsDialog({ open: false, defaultName: '', existingCities: [] })}
          onSave={state.handleSaveDialogSave}
          defaultName={state.saveAsDialog.defaultName}
          existingCities={state.saveAsDialog.existingCities}
        />

        {/* Delete Confirmation Dialog */}
        <MyConfirmDialog
          isOpen={state.showDeleteConfirmationDialog.open}
          onClose={() => state.setShowDeleteConfirmationDialog({ open: false })}
          onConfirm={state.handleDelete}
          title='Delete Saved City?'
          message='Are you sure you want to remove this saved city? All associated data will be permanently lost.'
          severity='error'
          confirmLabel='Delete'
          cancelLabel='Keep it'
        />

        {/* ImportDialog Modal */}
        <ImportDialog
          isOpen={state.importDialog.open}
          onClose={() => state.setImportDialog({ open: false, existingCities: [] })}
          onImport={state.handleImport}
          existingCities={state.importDialog.existingCities}
        />

        {/* Build (NewBuildingSelector) Modal */}
        <Dialog
          open={state.showBuildDialog}
          onClose={() => state.setShowBuildDialog(false)}
          maxWidth={false}
          slotProps={{
            paper: { sx: { width: 'auto', maxWidth: 'none', backgroundColor: 'transparent', boxShadow: 'none' } },
          }}
        >
          <NewBuildingSelector
            onSelectBuilding={state.onSelectBuilding}
            buildings={state.buildings}
            currentCityChapter={chapter}
            maxChapter={city.maxChapter}
          />
        </Dialog>
      </div>
    </Stack>
  );
};
