import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Box, Button, IconButton, Paper, Stack, Typography } from '@mui/material';
import React from 'react';
import { BuildingConfig, BuildingDefinition } from './CATEGORIES';
import { knownTypes } from './Legend/knownTypes';
import { NumericInputControl } from './NumericInputControl';
import { getMaxChapter } from '../elvenar/getMaxChapter';

interface BuildingConfigurationProps {
  building: BuildingDefinition;
  onBack: () => void;
  onAdd: (config: BuildingConfig) => void;
  defaultConfig: BuildingConfig;
}

const getTypeColor = (type?: string) => {
  if (!type) return '#e0e0e0';
  return knownTypes[type] || '#e0e0e0';
};

export const BuildingConfiguration: React.FC<BuildingConfigurationProps> = ({
  building,
  onBack,
  onAdd,
  defaultConfig,
}) => {
  const [configValues, setConfigValues] = React.useState<{ level: number; chapter: number; stage: number }>({
    level: 1,
    chapter: 1,
    stage: 1,
    ...defaultConfig,
  });

  const [maxChapter, setMaxChapter] = React.useState(24); // Default max chapter

  React.useEffect(() => {
    // Fetch max chapter from storage or other source if needed
    async function fetchMaxChapter() {
      const maxChapter = await getMaxChapter();
      setMaxChapter(maxChapter);
    }
    void fetchMaxChapter();
  }, []);

  const updateConfig = (field: keyof typeof configValues) => (value: number | undefined) => {
    setConfigValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleAdd = () => {
    const config: BuildingConfig = {};
    const fields = building.supportedFields || [];

    if (fields.includes('Level')) config.level = configValues.level || 1;
    if (fields.includes('Chapter')) config.chapter = configValues.chapter || 1;
    if (fields.includes('Stage')) config.stage = configValues.stage || 1;

    onAdd(config);
  };

  const fields = building.supportedFields || [];

  // Calculate dynamic size based on level
  let currentWidth = building.width;
  let currentLength = building.length;
  const level = configValues.level || 1;

  if (fields.includes('Level') && building.getSizeAtLevel) {
    const size = building.getSizeAtLevel(level);
    currentWidth = size.width;
    currentLength = size.length;
  }

  const cellSize = 18;
  const gridWidth = currentWidth * cellSize;
  const gridHeight = currentLength * cellSize;
  const fillColor = getTypeColor(building.type);

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
        <IconButton onClick={onBack} size='small'>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant='h6' component='div' sx={{ fontWeight: 600 }}>
          Configure Building
        </Typography>
      </Box>

      <Box sx={{ p: 3, flexGrow: 1, overflowY: 'auto' }}>
        <Stack spacing={3}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant='h6'>{building.name}</Typography>
            <Typography variant='body2' color='text.secondary'>
              Size: {currentWidth} x {currentLength}
            </Typography>
          </Box>

          <Stack direction='row' spacing={3} alignItems='flex-start'>
            {/* Inputs Column */}
            <Stack spacing={2} sx={{ flex: 1 }}>
              {fields.includes('Level') && (
                <NumericInputControl
                  label='Level'
                  value={`${configValues.level}`}
                  onChange={updateConfig('level')}
                  min={1}
                  max={building.maxLevel || 45}
                  helperText={building.maxLevel ? `Max Level: ${building.maxLevel}` : undefined}
                />
              )}

              {fields.includes('Chapter') && (
                <NumericInputControl
                  label='Chapter'
                  value={`${configValues.chapter}`}
                  onChange={updateConfig('chapter')}
                  min={1}
                  max={maxChapter}
                />
              )}

              {fields.includes('Stage') && (
                <NumericInputControl
                  label='Stage'
                  value={`${configValues.stage}`}
                  onChange={updateConfig('stage')}
                  min={1}
                  max={building.maxStage || 10}
                  helperText={building.maxStage ? `Max Stage: ${building.maxStage}` : undefined}
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
                bgcolor: '#fafafa',
                borderRadius: 1,
                border: '1px solid #eee',
                height: 260,
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
        <Button onClick={onBack}>Cancel</Button>
        <Button variant='contained' onClick={handleAdd}>
          Add Building
        </Button>
      </Box>
    </Paper>
  );
};
