import React from 'react';
import { UnlockedArea } from '../model/unlockedArea';
import { CityBlock } from './CityBlock';
import { RenderMoveLog } from './MoveLog';
import { RenderCityGrid } from './CityGrid';
import { RenderLegend } from './Legend';
import { CityProvider } from './CityContext';
import { CityResourceSummary } from './CityResourceSummary';
import { CitySettings } from './CitySettings';
import { getAccountById } from '../elvenar/AccountManager';
import { useTabStore } from '../util/tabStore';
import { generateCity } from './generateCity';
import { generateCityBlocks } from './generateCityBlocks';
import { generateUnlockedAreas } from './generateUnlockedAreas';
import { CityEntityEx } from '../model/cityEntity';
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
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start' }}>
        {/* Left Column: Settings & Move Log */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            marginRight: 16,
            position: 'sticky',
            top: 0,
            overflowY: 'auto',
          }}
        >
          <CitySettings />
          <RenderMoveLog />
        </div>

        {/* Center / Grid - Flex grow to fill space */}
        <div style={{ flexGrow: 1 }}>
          <RenderCityGrid />
        </div>

        {/* Right Sidebar - Legend + Resource Summary */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: 320,
            minWidth: 320,
            borderLeft: '1px solid rgba(0,0,0,0.12)',
            backgroundColor: '#f5f5f5',
            // Sticky positioning to keep sidebar in view while page scrolls
            position: 'sticky',
            top: 0,
          }}
        >
          {/* Legend - Scrollable Area */}
          <div
            style={{
              overflowY: 'auto',
              padding: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <RenderLegend />
          </div>

          {/* Working State */}
          <div
            style={{
              padding: '8px',
              borderTop: '1px solid rgba(0,0,0,0.12)',
              backgroundColor: '#f5f5f5',
              boxShadow: '0 -2px 5px rgba(0,0,0,0.05)',
            }}
          >
            <WorkingState />
          </div>

          {/* Resource Summary - Fixed/Sticky at Bottom */}
          <div
            style={{
              padding: '8px',
              borderTop: '1px solid rgba(0,0,0,0.12)',
              backgroundColor: '#f5f5f5',
              boxShadow: '0 -2px 5px rgba(0,0,0,0.05)',
            }}
          >
            <CityResourceSummary />
          </div>
        </div>
      </div>
    </CityProvider>
  );
}
