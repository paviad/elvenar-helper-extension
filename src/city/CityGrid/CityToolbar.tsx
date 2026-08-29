import React from 'react';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import GridViewIcon from '@mui/icons-material/GridView';
import TableRowsIcon from '@mui/icons-material/TableRows';
import UpgradeIcon from '@mui/icons-material/Upgrade';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import {
  Badge,
  BadgeProps,
  Button,
  Divider,
  Menu,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
} from '@mui/material';

/**
 * The "NEW" tag worn by a freshly added control. Overlaid on the top-right corner, the
 * way a badge is, unless `inline` sets it after the content instead - the fit for a
 * menu item's text. Everything else is passed through, so a Tooltip can wrap it.
 */
const NewBadge: React.FC<Omit<BadgeProps, 'badgeContent' | 'color'> & { inline?: boolean }> = ({
  inline,
  children,
  ...rest
}) => (
  <Badge
    {...rest}
    badgeContent='NEW'
    color='secondary'
    sx={{
      '& .MuiBadge-badge': {
        fontSize: '0.6rem',
        height: 16,
        minWidth: 16,
        px: 0.5,
        ...(inline ? { position: 'static', transform: 'none', ml: 1 } : { mr: 1, mt: -0.7 }),
      },
    }}
  >
    {children}
  </Badge>
);

interface CityToolbarProps {
  isDetached: boolean;
  onRefresh: () => void | Promise<void>;
  onSellStreets: () => void;
  onBuild: () => void;
  onImport: () => void;
  onExport: () => void;
  onScreenshot: () => void;
  onSaveAs: () => void;
  onDelete: () => void;
  onSave: () => void | Promise<void>;
  showSaveButton: boolean;
  onDeleteHighlighted: (highlighted: boolean) => void;
  onUnlockArea: () => void;
  hasHighlightedBlocks: boolean;
  searchTerm: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  mousePositionRef: React.RefObject<HTMLDivElement | null>;
  viewMode: 'top' | 'iso' | 'table' | 'upgrades';
  onViewModeChange: (mode: 'top' | 'iso' | 'table' | 'upgrades') => void;
  modified: boolean;
}

export const CityToolbar: React.FC<CityToolbarProps> = ({
  isDetached,
  onRefresh,
  onSellStreets,
  onBuild,
  onImport,
  onExport,
  onScreenshot,
  onSaveAs,
  onDelete,
  onSave,
  showSaveButton,
  onDeleteHighlighted,
  onUnlockArea,
  hasHighlightedBlocks,
  searchTerm,
  onSearchChange,
  mousePositionRef,
  viewMode,
  onViewModeChange,
  modified,
}) => {
  // City / Edit dropdown menus
  const [cityMenuAnchor, setCityMenuAnchor] = React.useState<HTMLElement | null>(null);
  const [editMenuAnchor, setEditMenuAnchor] = React.useState<HTMLElement | null>(null);
  const closeMenus = (action?: () => void) => () => {
    setCityMenuAnchor(null);
    setEditMenuAnchor(null);
    action?.();
  };

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
        {!isDetached && (
          <Button onClick={() => void onRefresh()} disabled={!modified}>
            Refresh City
          </Button>
        )}
        <Button onClick={onBuild}>Build</Button>
        {showSaveButton && <Button onClick={() => void onSave()}>Save</Button>}
        <Button endIcon={<ArrowDropDownIcon />} onClick={(e) => setCityMenuAnchor(e.currentTarget)}>
          City
        </Button>
        <Button endIcon={<ArrowDropDownIcon />} onClick={(e) => setEditMenuAnchor(e.currentTarget)}>
          Edit
        </Button>
        <Menu anchorEl={cityMenuAnchor} open={cityMenuAnchor !== null} onClose={closeMenus()}>
          <MenuItem onClick={closeMenus(onImport)}>Import</MenuItem>
          <MenuItem onClick={closeMenus(onExport)}>Export</MenuItem>
          <MenuItem onClick={closeMenus(onScreenshot)}>
            <NewBadge inline>Screenshot</NewBadge>
          </MenuItem>
          <MenuItem onClick={closeMenus(onSaveAs)}>Save As...</MenuItem>
          <Divider />
          <MenuItem onClick={closeMenus(onDelete)} sx={{ color: 'red' }}>
            Delete City
          </MenuItem>
        </Menu>
        <Menu anchorEl={editMenuAnchor} open={editMenuAnchor !== null} onClose={closeMenus()}>
          <MenuItem onClick={closeMenus(onSellStreets)}>Sell Streets</MenuItem>
          <MenuItem onClick={closeMenus(() => onDeleteHighlighted(true))} disabled={!hasHighlightedBlocks}>
            Delete Highlighted
          </MenuItem>
          <MenuItem onClick={closeMenus(() => onDeleteHighlighted(false))} disabled={!hasHighlightedBlocks}>
            Delete Non-Highlighted
          </MenuItem>
          <Tooltip title={viewMode !== 'top' ? 'Available in the top-down view' : 'Click a locked area to unlock it'}>
            <span>
              <MenuItem onClick={closeMenus(onUnlockArea)} disabled={viewMode !== 'top'}>
                Unlock Area
              </MenuItem>
            </span>
          </Tooltip>
        </Menu>
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
            label='Search buildings (string, /regexp/ or size 7x3)'
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
              onChange={(e, newMode: 'top' | 'iso' | 'table' | 'upgrades') => newMode && onViewModeChange(newMode)}
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
              <ToggleButton value='upgrades' aria-label='upgrade suggestions view'>
                <Tooltip title='Upgrade suggestions from your inventory'>
                  <NewBadge>
                    <UpgradeIcon fontSize='small' />
                  </NewBadge>
                </Tooltip>
              </ToggleButton>
            </ToggleButtonGroup>
          </div>
        </div>
      </div>
    </Stack>
  );
};
