import React from 'react';
import { UnlockedArea } from '../../model/unlockedArea';
import { CityBlock } from './CityBlock';
import { CityViewState } from './CityViewState';
import { renderMoveLog, keyboardShortcutsEffect } from './MoveLog';
import { renderCityGrid } from './CityGrid';
import { renderLegend } from './Legend';

export function CityView(props: { blocks: CityBlock[]; unlockedAreas: UnlockedArea[] }) {
  const s = new CityViewState(props);

  keyboardShortcutsEffect(s);

  // setBlocksEffect(s);

  return (
    <div style={{ display: 'flex', flexDirection: 'row' }}>
      {renderMoveLog(s)}
      {renderCityGrid(s)}
      {renderLegend(s)}
    </div>
  );
}
