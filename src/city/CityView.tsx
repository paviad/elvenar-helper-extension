import React from 'react';
import { UnlockedArea } from '../model/unlockedArea';
import { CityBlock } from './CityBlock';
import { RenderMoveLog } from './MoveLog';
import { RenderCityGrid } from './CityGrid';
import { RenderLegend } from './Legend';
import { CityProvider } from './CityContext';
import { CityResourceSummary } from './CityResourceSummary';

export function CityView(props: { blocks: CityBlock[]; unlockedAreas: UnlockedArea[]; forceUpdate: () => void }) {
  return (
    <CityProvider sourceBlocks={props.blocks} unlockedAreas={props.unlockedAreas} forceUpdate={props.forceUpdate}>
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start' }}>
        {/* Left / Log */}
        <RenderMoveLog />

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
