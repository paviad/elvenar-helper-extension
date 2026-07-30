import React from 'react';
import { Box, Card, CardContent, Stack, Typography } from '@mui/material';
import { useCity } from './CityContext';
import { useMouseGridStore } from './mouseGridStore';

export const WorkingState: React.FC = () => {
  // Accessing blocks to count highlighted ones.
  // Assuming 'pointer' exists in context for grid coordinates {x, y}.
  // If not, it will gracefully fallback.
  const { emptySquares, highlightedIds } = useCity();
  // Subscribed here rather than through the city context, so a moving cursor
  // re-renders this panel alone.
  const mouseGridPosition = useMouseGridStore((state) => state.position);

  const highlightedCount = highlightedIds.size;

  return (
    <Card elevation={3}>
      <CardContent sx={{ pb: '16px !important' }}>
        <Typography variant='subtitle2' sx={{ fontWeight: 'bold', mb: 1.5 }}>
          Working State
        </Typography>

        <Stack spacing={1}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography
              variant='body2'
              sx={{
                color: 'text.secondary',
              }}
            >
              Grid Position
            </Typography>
            <Typography variant='body2' sx={{ fontFamily: 'monospace', fontWeight: 500 }}>
              {mouseGridPosition ? `X:${mouseGridPosition.x} Y:${mouseGridPosition.y}` : '-'}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography
              variant='body2'
              sx={{
                color: 'text.secondary',
              }}
            >
              Highlighted Buildings
            </Typography>
            <Typography
              variant='body2'
              sx={{
                fontWeight: 'bold',
              }}
            >
              {highlightedCount}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography
              variant='body2'
              sx={{
                color: 'text.secondary',
              }}
            >
              Empty Squares
            </Typography>
            <Typography
              variant='body2'
              sx={{
                fontWeight: 'bold',
              }}
            >
              {emptySquares}
            </Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};
