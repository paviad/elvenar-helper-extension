import React from 'react';
import { Box } from '@mui/material';
import { CityProvider } from './CityContext';
import { RenderCityGrid } from './CityGrid/RenderCityGrid';
import { CityResourceSummary } from './CityResourceSummary';
import { CitySettings } from './CitySettings';
import { RenderLegend } from './Legend/RenderLegend';
import { RenderMoveLog } from './MoveLog/RenderMoveLog';
import { WorkingState } from './WorkingState';
import { RuneShards } from './RuneShards';
import { SwitchableProduction } from './SwitchableProduction';

export function CityView() {
  return (
    <CityProvider>
      <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start' }}>
        {/* Left Column: Settings & Move Log */}
        <Box
          sx={{
            display: { xs: 'none', lg: 'flex' }, // Hide on screens smaller than 1200px
            flexDirection: 'column',
            mr: 2,
            position: 'sticky',
            top: 0,
            maxHeight: '100vh',
          }}
        >
          <CitySettings />
          <RenderMoveLog />
        </Box>

        {/* Center / Grid - Flex grow to fill space */}
        <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
          <RenderCityGrid />
        </Box>

        {/* Right Sidebar - Legend + Resource Summary */}
        <Box
          sx={{
            display: { xs: 'none', lg: 'flex' }, // Hide on screens smaller than 1200px
            flexDirection: 'column',
            width: 320,
            minWidth: 320,
            borderLeft: 1,
            borderColor: 'divider',
            bgcolor: 'grey.100', // Replaces #f5f5f5
            // Sticky positioning to keep sidebar in view while page scrolls
            position: 'sticky',
            top: 0,
            height: '100vh', // Ensure sidebar spans viewport height for internal scrolling if needed
          }}
        >
          {/* Legend - Scrollable Area */}
          <Box
            sx={{
              p: 1,
              borderTop: 1,
              borderColor: 'divider',
              bgcolor: 'grey.100',
              boxShadow: '0 -2px 5px rgba(0,0,0,0.05)',
              zIndex: 1,
            }}
          >
            <RenderLegend />
          </Box>

          {/* Working State */}
          <Box
            sx={{
              p: 1,
              borderTop: 1,
              borderColor: 'divider',
              bgcolor: 'grey.100',
              boxShadow: '0 -2px 5px rgba(0,0,0,0.05)',
              zIndex: 1,
            }}
          >
            <WorkingState />
          </Box>

          {/* Resource Summary - Fixed/Sticky at Bottom */}
          <Box
            sx={{
              p: 1,
              borderTop: 1,
              borderColor: 'divider',
              bgcolor: 'grey.100',
              boxShadow: '0 -2px 5px rgba(0,0,0,0.05)',
              zIndex: 1,
            }}
          >
            <CityResourceSummary />
          </Box>

          {/* Rune Shards */}
          <Box
            sx={{
              p: 1,
              borderTop: 1,
              borderColor: 'divider',
              bgcolor: 'grey.100',
              boxShadow: '0 -2px 5px rgba(0,0,0,0.05)',
              zIndex: 1,
            }}
          >
            <RuneShards />
          </Box>

          {/* Switchable Production */}
          <Box
            sx={{
              p: 1,
              borderTop: 1,
              borderColor: 'divider',
              bgcolor: 'grey.100',
              boxShadow: '0 -2px 5px rgba(0,0,0,0.05)',
              zIndex: 1,
            }}
          >
            <SwitchableProduction />
          </Box>
        </Box>
      </Box>
    </CityProvider>
  );
}
