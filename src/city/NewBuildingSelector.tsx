import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import BusinessIcon from '@mui/icons-material/Business'; // Fallback icon
import ClearIcon from '@mui/icons-material/Clear';
import SearchIcon from '@mui/icons-material/Search';
import {
  Avatar,
  Box,
  Button,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import React from 'react';
import { BuildingDefinition, CATEGORIES } from './CATEGORIES';
import { knownTypes } from './Legend/knownTypes';

// --- Types ---

export interface BuildingConfig {
  level?: number;
  chapter?: number;
  stage?: number;
}

interface NewBuildingSelectorProps {
  onSelectBuilding: (building: BuildingDefinition, config: BuildingConfig) => void;
  buildings: BuildingDefinition[];
}

const getTypeColor = (type: string) => {
  return knownTypes[type] || '#e0e0e0';
};

export const NewBuildingSelector: React.FC<NewBuildingSelectorProps> = ({ onSelectBuilding, buildings }) => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activeTab, setActiveTab] = React.useState(0);

  // Selection & Configuration State
  const [selectedBuilding, setSelectedBuilding] = React.useState<BuildingDefinition | null>(null);
  const [configValues, setConfigValues] = React.useState<{ level: string; chapter: string; stage: string }>({
    level: '1',
    chapter: '1',
    stage: '1',
  });

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
    // Default to the configuration step if fields are supported,
    // otherwise verify if we should just add it directly.
    // For now, let's open the config view if any fields are defined.
    if (building.supportedFields && building.supportedFields.length > 0) {
      setSelectedBuilding(building);
      // Reset defaults
      setConfigValues({ level: '1', chapter: '1', stage: '1' });
    } else {
      // Direct add if no configuration needed
      onSelectBuilding(building, {});
    }
  };

  const handleConfigBack = () => {
    setSelectedBuilding(null);
  };

  const handleConfigChange =
    (field: keyof typeof configValues, max?: number) => (event: React.ChangeEvent<HTMLInputElement>) => {
      const val = event.target.value;
      // Allow empty string for typing
      if (val === '') {
        setConfigValues((prev) => ({ ...prev, [field]: val }));
        return;
      }

      // Ensure positive integer
      if (/^[0-9]+$/.test(val)) {
        const numVal = parseInt(val, 10);
        // Check max constraint if provided
        if (max !== undefined && numVal > max) {
          return;
        }
        setConfigValues((prev) => ({ ...prev, [field]: val }));
      }
    };

  const handleAddBuilding = () => {
    if (!selectedBuilding) return;

    const config: BuildingConfig = {};
    const fields = selectedBuilding.supportedFields || [];

    if (fields.includes('Level')) config.level = parseInt(configValues.level, 10) || 1;
    if (fields.includes('Chapter')) config.chapter = parseInt(configValues.chapter, 10) || 1;
    if (fields.includes('Stage')) config.stage = parseInt(configValues.stage, 10) || 1;

    onSelectBuilding(selectedBuilding, config);
    setSelectedBuilding(null);
  };

  // --- Filtering Logic ---

  const displayList = React.useMemo(() => {
    const normalizedQuery = searchQuery.toLowerCase().trim();

    if (normalizedQuery) {
      return buildings.filter((b) => b.name.toLowerCase().includes(normalizedQuery));
    } else {
      const currentCategory = CATEGORIES[activeTab];
      return buildings.filter((b) => b.category === currentCategory);
    }
  }, [searchQuery, activeTab, buildings]);

  // --- Render Configuration View ---
  if (selectedBuilding) {
    const fields = selectedBuilding.supportedFields || [];

    // Calculate dynamic size based on level
    let currentWidth = selectedBuilding.width;
    let currentLength = selectedBuilding.length;
    const level = parseInt(configValues.level, 10) || 1;

    if (fields.includes('Level') && selectedBuilding.getSizeAtLevel) {
      const size = selectedBuilding.getSizeAtLevel(level);
      currentWidth = size.width;
      currentLength = size.length;
    }

    const cellSize = 18; // Increased preview grid cell size for visibility
    const gridWidth = currentWidth * cellSize;
    const gridHeight = currentLength * cellSize;
    const fillColor = getTypeColor(selectedBuilding.type);

    return (
      <Paper
        elevation={3}
        sx={{
          width: 800,
          height: 600, // Fixed height matching list view to prevent resizing
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderRadius: 2,
        }}
      >
        <Box
          sx={{
            p: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <IconButton onClick={handleConfigBack} size='small'>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant='h6' component='div' sx={{ fontWeight: 600 }}>
            Configure Building
          </Typography>
        </Box>

        <Box sx={{ p: 3, flexGrow: 1, overflowY: 'auto' }}>
          <Stack spacing={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant='h6'>{selectedBuilding.name}</Typography>
              <Typography variant='body2' color='text.secondary'>
                Size: {currentWidth} x {currentLength}
              </Typography>
            </Box>

            <Stack direction='row' spacing={3} alignItems='flex-start'>
              {/* Inputs Column */}
              <Stack spacing={2} sx={{ flex: 1 }}>
                {fields.includes('Level') && (
                  <TextField
                    label='Level'
                    type='number'
                    fullWidth
                    value={configValues.level}
                    onChange={handleConfigChange('level', selectedBuilding.maxLevel)}
                    slotProps={{
                      htmlInput: {
                        min: 1,
                        max: selectedBuilding.maxLevel,
                      },
                    }}
                    helperText={selectedBuilding.maxLevel ? `Max Level: ${selectedBuilding.maxLevel}` : undefined}
                  />
                )}
                {fields.includes('Chapter') && (
                  <TextField
                    label='Chapter'
                    type='number'
                    fullWidth
                    value={configValues.chapter}
                    onChange={handleConfigChange('chapter')}
                    slotProps={{ htmlInput: { min: 1 } }}
                  />
                )}
                {fields.includes('Stage') && (
                  <TextField
                    label='Stage'
                    type='number'
                    fullWidth
                    value={configValues.stage}
                    onChange={handleConfigChange('stage')}
                    slotProps={{ htmlInput: { min: 1, max: 10 } }}
                  />
                )}
              </Stack>

              {/* Grid Preview Column */}
              <Box
                sx={{
                  flex: 1,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  p: 2,
                  bgcolor: '#fafafa', // Subtle background for the grid area
                  borderRadius: 1,
                  border: '1px solid #eee',
                  height: 260, // Fixed container height
                  overflow: 'hidden',
                }}
              >
                <svg
                  width={gridWidth}
                  height={gridHeight}
                  viewBox={`0 0 ${gridWidth} ${gridHeight}`}
                  style={{ maxWidth: '100%', maxHeight: '100%', display: 'block' }}
                >
                  {Array.from({ length: currentLength }).map((_, rowIndex) =>
                    Array.from({ length: currentWidth }).map((_, colIndex) => (
                      <rect
                        key={`${colIndex}-${rowIndex}`}
                        x={colIndex * cellSize}
                        y={rowIndex * cellSize}
                        width={cellSize}
                        height={cellSize}
                        fill={fillColor}
                        stroke='black'
                        strokeWidth='1'
                      />
                    )),
                  )}
                </svg>
              </Box>
            </Stack>
          </Stack>
        </Box>

        <Box
          sx={{
            p: 2,
            borderTop: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 1,
          }}
        >
          <Button onClick={handleConfigBack}>Cancel</Button>
          <Button variant='contained' onClick={handleAddBuilding}>
            Add Building
          </Button>
        </Box>
      </Paper>
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
          placeholder='Search buildings...'
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
          <Typography variant='subtitle2' color='text.secondary'>
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
                  slotProps={{ primary: { fontWeight: 500 } }}
                />
              </ListItemButton>
            </ListItem>
          ))
        ) : (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant='body2' color='text.secondary'>
              No buildings found.
            </Typography>
          </Box>
        )}
      </List>
    </Paper>
  );
};
