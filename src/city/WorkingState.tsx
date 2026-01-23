import React from 'react';
import { Card, CardContent, Typography, Box, Stack } from '@mui/material';
import { useCity } from './CityContext';

export const WorkingState: React.FC = () => {
  // Accessing blocks to count highlighted ones.
  // Assuming 'pointer' exists in context for grid coordinates {x, y}.
  // If not, it will gracefully fallback.
  const { blocks, mouseGridPosition } = useCity();

  const highlightedCount = React.useMemo(() => {
    if (!blocks) return 0;
    return Object.values(blocks).filter((b) => b.highlighted).length;
  }, [blocks]);

  return (
    <Card elevation={3}>
      <CardContent sx={{ pb: '16px !important' }}>
        <Typography variant='subtitle2' sx={{ fontWeight: 'bold', mb: 1.5 }}>
          Working State
        </Typography>

        <Stack spacing={1}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant='body2' color='text.secondary'>
              Grid Position
            </Typography>
            <Typography variant='body2' sx={{ fontFamily: 'monospace', fontWeight: 500 }}>
              {mouseGridPosition ? `X:${mouseGridPosition.x} Y:${mouseGridPosition.y}` : '-'}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant='body2' color='text.secondary'>
              Highlighted Buildings
            </Typography>
            <Typography variant='body2' fontWeight='bold'>
              {highlightedCount}
            </Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};
