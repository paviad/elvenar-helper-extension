import React from 'react';
import { Box } from '@mui/material';
import { getAccountById } from '../elvenar/AccountManager';
import { CityEntityEx } from '../model/cityEntity';
import { UnlockedArea } from '../model/unlockedArea';
import { useTabStore } from '../util/tabStore';
import { CityBlock } from './CityBlock';
import { CityProvider } from './CityContext';
import { RenderCityGrid } from './CityGrid/RenderCityGrid';
import { CityResourceSummary } from './CityResourceSummary';
import { CitySettings } from './CitySettings';
import { generateCity } from './generateCity';
import { generateCityBlocks } from './generateCityBlocks';
import { generateUnlockedAreas } from './generateUnlockedAreas';
import { RenderLegend } from './Legend/RenderLegend';
import { RenderMoveLog } from './MoveLog/RenderMoveLog';
import { WorkingState } from './WorkingState';

export function CityView() {
  const [cityEntities, setCityEntities] = React.useState([[], []] as [CityEntityEx[], UnlockedArea[]]);
  const [blocks, setBlocks] = React.useState([] as CityBlock[]);
  const [unlockedAreas, setUnlockedAreas] = React.useState([] as UnlockedArea[]);
  const accountId = useTabStore((state) => state.accountId);

  const triggerForceUpdate = useTabStore((state) => state.triggerForceUpdate);
  const forceUpdate = useTabStore((state) => state.forceUpdate);

  React.useEffect(() => {
    async function fetchCityData() {
      if (!accountId) {
        return;
      }
      const accountData = getAccountById(accountId);
      if (!accountData || !accountData.cityQuery) {
        return;
      }
      const entities = await generateCity(accountData);
      if (entities) {
        setCityEntities([entities.q, entities.unlockedAreas]);
      }
    }
    fetchCityData();
  }, [accountId, forceUpdate]);

  React.useEffect(() => {
    async function updateBlocks() {
      const blocks = await generateCityBlocks(cityEntities[0]);
      const unlockedAreas = generateUnlockedAreas(cityEntities[1]);
      setBlocks(blocks);
      setUnlockedAreas(unlockedAreas);
    }
    updateBlocks();
  }, [cityEntities]);

  return (
    <CityProvider
      sourceBlocks={blocks}
      unlockedAreas={unlockedAreas}
      forceUpdate={forceUpdate}
      triggerForceUpdate={triggerForceUpdate}
    >
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
              overflowY: 'auto',
              p: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
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
        </Box>
      </Box>
    </CityProvider>
  );
}
