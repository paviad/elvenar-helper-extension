import GridViewIcon from '@mui/icons-material/GridView';
import TableRowsIcon from '@mui/icons-material/TableRows';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import { Button, Stack, TextField, ToggleButton, ToggleButtonGroup, Tooltip } from '@mui/material';
import React from 'react';

interface CityToolbarProps {
  isDetached: boolean;
  onRefresh: () => void | Promise<void>;
  onSellStreets: () => void;
  onBuild: () => void;
  onImport: () => void;
  onExport: () => void;
  onSaveAs: () => void;
  onDelete: () => void;
  onSave: () => void | Promise<void>;
  showSaveButton: boolean;
  onDeleteHighlighted: (highlighted: boolean) => void;
  hasHighlightedBlocks: boolean;
  searchTerm: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  mousePositionRef: React.RefObject<HTMLDivElement | null>;
  viewMode: 'top' | 'iso' | 'table';
  onViewModeChange: (mode: 'top' | 'iso' | 'table') => void;
  modified: boolean;
}

export const CityToolbar: React.FC<CityToolbarProps> = ({
  isDetached,
  onRefresh,
  onSellStreets,
  onBuild,
  onImport,
  onExport,
  onSaveAs,
  onDelete,
  onSave,
  showSaveButton,
  onDeleteHighlighted,
  hasHighlightedBlocks,
  searchTerm,
  onSearchChange,
  mousePositionRef,
  viewMode,
  onViewModeChange,
  modified,
}) => {
  // Sticky-to-fixed search box logic
  const searchBoxRef = React.useRef<HTMLDivElement>(null);
  const searchBoxOffset = React.useRef<number | null>(null);
  const [isFixed, setIsFixed] = React.useState(false);

  React.useEffect(() => {
    const updateOffset = () => {
      if (searchBoxRef.current) {
        searchBoxOffset.current = searchBoxRef.current.getBoundingClientRect().top + window.scrollY;
      }
    };
    updateOffset();
    window.addEventListener('resize', updateOffset);
    return () => window.removeEventListener('resize', updateOffset);
  }, []);

  React.useEffect(() => {
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

  return (
    <Stack>
      <Stack direction='row'>
        {isDetached && <span style={{ alignSelf: 'center' }}>(Detached City)</span>}
        {!isDetached && <Button onClick={() => void onRefresh()} disabled={!modified}>Refresh City</Button>}
        <Button onClick={onSellStreets}>Sell Streets</Button>
        <Button onClick={onBuild}>Build</Button>
        <Button onClick={onImport}>Import City</Button>
        <Button onClick={onExport}>Export City</Button>
        <Button onClick={onSaveAs}>Save City As...</Button>
        <Button onClick={onDelete} sx={{ color: 'red' }}>
          Delete
        </Button>

        {showSaveButton && <Button onClick={() => void onSave()}>Save</Button>}
        <Button onClick={() => onDeleteHighlighted(true)} disabled={!hasHighlightedBlocks}>
          Delete Highlighted
        </Button>
        <Button onClick={() => onDeleteHighlighted(false)} disabled={!hasHighlightedBlocks}>
          Delete Non-Highlighted
        </Button>
      </Stack>
      <div>
        {/* Toolbar Line: Search + Grid Position + View Toggle */}
        <div
          ref={searchBoxRef}
          style={{
            marginBottom: 8,
            background: isFixed ? 'rgba(255,255,255,0.95)' : 'inherit',
            transition: 'box-shadow 0.2s',
            position: isFixed ? 'fixed' : 'static',
            top: isFixed ? 0 : 'auto',
            left: isFixed ? '20%' : 'auto',
            width: isFixed ? '60%' : '100%',
            zIndex: isFixed ? 9999 : 'auto',
            boxShadow: isFixed ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
            padding: isFixed ? 8 : 0,
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <TextField
            label='Search buildings (string or /regexp/)'
            variant='outlined'
            size='small'
            value={searchTerm}
            onChange={onSearchChange}
            style={{ flexGrow: 1 }}
          />

          {/* Grid Position & View Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', whiteSpace: 'nowrap' }}>
            <div ref={mousePositionRef} style={{ fontWeight: 'bold' }}>
              Grid: (-, -)
            </div>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(e, newMode: 'top' | 'iso' | 'table') => newMode && onViewModeChange(newMode)}
              size='small'
              aria-label='view mode'
            >
              <ToggleButton value='top' aria-label='top view'>
                <Tooltip title='Top-down 2D view'>
                  <GridViewIcon fontSize='small' />
                </Tooltip>
              </ToggleButton>
              <ToggleButton value='iso' aria-label='isometric view'>
                <Tooltip title='Isometric 2.5D view'>
                  <ViewInArIcon fontSize='small' />
                </Tooltip>
              </ToggleButton>
              <ToggleButton value='table' aria-label='table view'>
                <Tooltip title='List/Table view'>
                  <TableRowsIcon fontSize='small' />
                </Tooltip>
              </ToggleButton>
            </ToggleButtonGroup>
          </div>
        </div>
      </div>
    </Stack>
  );
};
