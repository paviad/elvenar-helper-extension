import React, { useMemo } from 'react';
import BusinessIcon from '@mui/icons-material/Business'; // Fallback icon
import ClearIcon from '@mui/icons-material/Clear';
import SearchIcon from '@mui/icons-material/Search';
import {
  Avatar,
  Box,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Paper,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { BuildingConfiguration } from './BuildingConfiguration';
import { BuildingConfig, BuildingDefinition, CATEGORIES } from './CATEGORIES';

interface NewBuildingSelectorProps {
  onSelectBuilding: (building: BuildingDefinition, config: BuildingConfig) => void | Promise<void>;
  buildings: BuildingDefinition[];
  currentCityChapter: number;
}

export const NewBuildingSelector: React.FC<NewBuildingSelectorProps> = ({
  onSelectBuilding,
  buildings,
  currentCityChapter,
}) => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activeTab, setActiveTab] = React.useState(0);

  // Selection & Configuration State
  const [selectedBuilding, setSelectedBuilding] = React.useState<BuildingDefinition | null>(null);

  // --- Handlers ---

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleBuildingClick = (building: BuildingDefinition) => {
    void (async () => {
      if (building.supportedFields && building.supportedFields.length > 0) {
        if (building.supportedFields.includes('Chapter')) {
          building.chapter = currentCityChapter;
        }
        setSelectedBuilding(building);
      } else {
        await onSelectBuilding(building, {});
      }
    })();
  };

  const handleAddBuilding = (config: BuildingConfig) => {
    if (!selectedBuilding) return;
    void (async () => {
      await onSelectBuilding(selectedBuilding, config);
      setSelectedBuilding(null);
    })();
  };

  // --- Filtering Logic ---

  const displayList = useMemo(() => {
    const normalizedQuery = searchQuery.toLowerCase().trim();

    if (normalizedQuery) {
      // Detect if query is in the format "number x number" (e.g., "6x4", "6 x 4")
      const dimensionMatch = normalizedQuery.match(/^(\d+)\s*x\s*(\d+)$/);
      const widthOnlyMatch = normalizedQuery.match(/^(\d+)\s*x$/);
      const lengthOnlyMatch = normalizedQuery.match(/^x\s*(\d+)$/);
      let searchWidth: number | null = null;
      let searchLength: number | null = null;

      if (dimensionMatch) {
        searchWidth = parseInt(dimensionMatch[1], 10);
        searchLength = parseInt(dimensionMatch[2], 10);
      }
      if (widthOnlyMatch) {
        searchWidth = parseInt(widthOnlyMatch[1], 10);
      }
      if (lengthOnlyMatch) {
        searchLength = parseInt(lengthOnlyMatch[1], 10);
      }

      return buildings.filter((b) => {
        // 1. Match by building name
        if (b.name.toLowerCase().includes(normalizedQuery)) {
          return true;
        }

        // 2. Match by dimensions (checking both WxL and LxW)
        if (searchWidth !== null || searchLength !== null) {
          if ((!searchWidth || b.width === searchWidth) && (!searchLength || b.length === searchLength)) {
            return true;
          }

          if (b.getSizeAtLevel) {
            // size might shrink per level
            const maxLevel = b.maxLevel || 100; // Arbitrary high number if not defined
            for (let level = 1; level <= maxLevel; level++) {
              const size = b.getSizeAtLevel(level);
              if ((!searchWidth || size.width === searchWidth) && (!searchLength || size.length === searchLength)) {
                return true;
              }
            }
          }
        }

        return false;
      });
    } else {
      const currentCategory = CATEGORIES[activeTab];
      return buildings.filter((b) => b.category === currentCategory);
    }
  }, [searchQuery, activeTab, buildings]);

  // --- Render Configuration View ---
  if (selectedBuilding) {
    return (
      <BuildingConfiguration
        building={selectedBuilding}
        onBack={() => setSelectedBuilding(null)}
        onAdd={handleAddBuilding}
        defaultConfig={{ chapter: currentCityChapter }}
      />
    );
  }

  // --- Render Selection List View ---
  return (
    <Paper
      elevation={3}
      sx={{
        width: 800,
        height: 600,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        borderRadius: 2,
      }}
    >
      {/* 1. Header & Search Area */}
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Typography variant='h6' component='div' sx={{ mb: 1.5, fontWeight: 600 }}>
          Add Building
        </Typography>
        <TextField
          fullWidth
          variant='outlined'
          placeholder='Search name or size (e.g., 6x4)...'
          size='small'
          value={searchQuery}
          autoFocus
          onChange={handleSearchChange}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position='start'>
                  <SearchIcon color='action' />
                </InputAdornment>
              ),
              endAdornment: searchQuery ? (
                <InputAdornment position='end'>
                  <IconButton onClick={handleClearSearch} size='small'>
                    <ClearIcon fontSize='small' />
                  </IconButton>
                </InputAdornment>
              ) : null,
            },
          }}
        />
      </Box>
      {/* 2. Tabs (Hidden when searching) */}
      {!searchQuery && (
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant='scrollable'
            scrollButtons='auto'
            textColor='primary'
            indicatorColor='primary'
            aria-label='building categories'
          >
            {CATEGORIES.map((cat) => (
              <Tab key={cat} label={cat} />
            ))}
          </Tabs>
        </Box>
      )}
      {/* 3. Search Result Header (Only visible when searching) */}
      {searchQuery && (
        <Box sx={{ px: 2, py: 1, bgcolor: 'action.hover' }}>
          <Typography
            variant='subtitle2'
            sx={{
              color: 'text.secondary',
            }}
          >
            Search Results ({displayList.length})
          </Typography>
        </Box>
      )}
      {/* 4. Scrollable List */}
      <List sx={{ flexGrow: 1, overflowY: 'auto', p: 0 }}>
        {displayList.length > 0 ? (
          displayList.map((building) => (
            <ListItem key={building.id} disablePadding>
              <ListItemButton onClick={() => handleBuildingClick(building)}>
                <ListItemAvatar>
                  <Avatar
                    variant='rounded'
                    src={building.iconUrl}
                    alt={building.name}
                    sx={{ bgcolor: 'primary.light' }}
                  >
                    {!building.iconUrl && <BusinessIcon />}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={building.name}
                  secondary={`${building.getSizeAtLevel ? 'Variable' : `${building.width}x${building.length}`} • ${building.category}`}
                  slotProps={{ primary: { sx: { fontWeight: 500 } } }}
                />
              </ListItemButton>
            </ListItem>
          ))
        ) : (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography
              variant='body2'
              sx={{
                color: 'text.secondary',
              }}
            >
              No buildings found.
            </Typography>
          </Box>
        )}
      </List>
    </Paper>
  );
};
