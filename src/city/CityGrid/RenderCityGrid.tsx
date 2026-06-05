import React, { useEffect } from 'react';
import { Box, Dialog, Stack } from '@mui/material';
import { useSearchParams } from 'react-router';
import MyConfirmDialog from '../../widgets/MyConfirmDialog';
import { useCity } from '../CityContext';
import { CityContextMenu } from '../dialogs/CityContextMenu';
import { LevelDialog } from '../dialogs/LevelDialog';
import { NewBuildingSelector } from '../NewBuildingSelector';
import { useCityGridState } from '../useCityGridState';
import { CityToolbar } from './CityToolbar';
import ExportDialog from './ExportDialog';
import ImportDialog from './ImportDialog';
import { subscribeToIsoMouseMove } from './iso/handleIsoMouseMove';
import { IsometricCityGrid } from './iso/IsometricCityGrid';
import { refreshCity } from './refreshCity';
import SaveCityDialog from './SaveCityDialog';
import { TableCityView } from './table/TableCityView';
import { CityGrid } from './top/CityGrid';
import { subscribeToMouseMove as subscribeToTopMouseMove } from './top/handleMouseMove';

export const RenderCityGrid = () => {
  const city = useCity();
  const { blocks, setMenu, menu, menuRef, svgRef, maxLevels, chapter } = city;

  // Use Custom Hook for Logic & State
  const state = useCityGridState();

  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    async function Do() {
      const rc = searchParams.get('buildId');
      if (!rc) {
        return;
      }
      await state.onBuildFromInventory(Number(rc));

      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('buildId');
      setSearchParams(nextParams, { replace: true });
    }
    void Do();
  }, [searchParams]);

  // Mouse Subscription Effects (UI specific)
  React.useEffect(() => {
    const subscription = subscribeToTopMouseMove();
    const subscription2 = subscribeToIsoMouseMove();
    return () => {
      subscription.unsubscribe();
      subscription2.unsubscribe();
    };
  }, []);

  const hasHighlighted = React.useMemo(() => {
    return !Object.values(blocks).every((b) => !b.highlighted);
  }, [blocks]);

  return (
    <Stack>
      <CityToolbar
        isDetached={state.isDetached}
        onRefresh={() => refreshCity(city)}
        onSellStreets={state.sellStreets}
        onBuild={() => state.setShowBuildDialog(true)}
        onImport={state.importCity}
        onExport={state.exportCityAsJson}
        onSaveAs={state.saveCityAs}
        onDelete={state.deleteCity}
        onSave={state.saveCity}
        showSaveButton={false}
        onDeleteHighlighted={state.deleteHighlightedBlocks}
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
          />
        )}

        {/* ExportDialog Modal */}
        <ExportDialog
          isOpen={state.exportDialog.open}
          onClose={() => state.setExportDialog({ open: false, exportStr: '' })}
          exportString={state.exportDialog.exportStr}
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
          />
        </Dialog>
      </div>
    </Stack>
  );
};
