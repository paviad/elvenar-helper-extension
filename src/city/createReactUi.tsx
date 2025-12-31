import React from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router';
import { createRoot } from 'react-dom/client';
import { CityMain } from './CityMain';
import { InventoryMain } from '../inventory/InventoryMain';
import { LayoutMain } from '../layout/LayoutMain';
import { TradeMain } from '../trade/TradeMain';

export function createReactUi() {
  const root = createRoot(document.getElementById('root') as HTMLElement);
  // root.render(<CityMain />);
  root.render(
    <HashRouter>
      <Routes>
        <Route element={<LayoutMain />}>
          <Route path='/city' element={<CityMain />} />
          <Route path='/inventory' element={<InventoryMain />} />
          <Route path='/trade' element={<TradeMain />} />
          <Route path='*' element={<Navigate to='/city' replace />} />
        </Route>
      </Routes>
    </HashRouter>,
  );
}
