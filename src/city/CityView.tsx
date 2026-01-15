import React from 'react';
import { UnlockedArea } from '../model/unlockedArea';
import { CityBlock } from './CityBlock';
import { RenderMoveLog } from './MoveLog';
import { RenderCityGrid } from './CityGrid';
import { RenderLegend } from './Legend';
import { CityProvider } from './CityContext';

export function CityView(props: { blocks: CityBlock[]; unlockedAreas: UnlockedArea[]; forceUpdate: () => void }) {
  return (
    <CityProvider sourceBlocks={props.blocks} unlockedAreas={props.unlockedAreas} forceUpdate={props.forceUpdate}>
      <div style={{ display: 'flex', flexDirection: 'row' }}>
        <RenderMoveLog />
        <RenderCityGrid />
        <RenderLegend />
      </div>
    </CityProvider>
  );
}
