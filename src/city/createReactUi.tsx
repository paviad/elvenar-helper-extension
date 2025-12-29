import React from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router';
import { createRoot } from 'react-dom/client';
import { PopupMain } from './CityView/PopupMain';
import { InventoryMain } from '../inventory/InventoryMain';
import { LayoutMain } from '../layout/LayoutMain';
import { TradeMain } from '../trade/TradeMain';
import { setupMessageListener, setupTradeOpenedListener } from '../chrome/messages';
import { tradeOpenedCallback } from '../trade/tradeOpenedCallback';

export function createReactUi() {
  const root = createRoot(document.getElementById('root') as HTMLElement);
  // root.render(<PopupMain />);
  root.render(
    <HashRouter>
      <Routes>
        <Route element={<LayoutMain />}>
          <Route path='/city' element={<PopupMain />} />
          <Route path='/inventory' element={<InventoryMain />} />
          <Route path='/trade' element={<TradeMain />} />
          <Route path='*' element={<Navigate to='/city' replace />} />
        </Route>
      </Routes>
    </HashRouter>,
  );

  setupMessageListener();
  setupTradeOpenedListener(tradeOpenedCallback);
}

