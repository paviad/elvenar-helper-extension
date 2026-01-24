import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Navigate, Route, Routes } from 'react-router';
import { FellowshipAdventure } from '../fellowship-adventure/FellowshipAdventure';
import { HelperProvider } from '../helper/HelperContext';
import { InventoryMain } from '../inventory/InventoryMain';
import { LayoutMain } from '../layout/LayoutMain';
import { Activate } from './Activate';
import { CityMain } from './CityMain';

export function createReactUi() {
  const root = createRoot(document.getElementById('root') as HTMLElement);
  // root.render(<CityMain />);
  root.render(
    <HelperProvider>
      <HashRouter>
        <Routes>
          <Route element={<LayoutMain />}>
            <Route path='/activate' element={<Activate />} />
            <Route path='/city' element={<CityMain />} />
            <Route path='/inventory' element={<InventoryMain />} />
            {/* <Route path='/trade' element={<TradeMain />} /> */}
            <Route path='/fellowship-adventure' element={<FellowshipAdventure />} />
            <Route path='*' element={<Navigate to='/city' replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </HelperProvider>,
  );
}
