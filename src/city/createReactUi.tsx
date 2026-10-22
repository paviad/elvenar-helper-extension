import React from 'react';
import { createTheme, ThemeProvider } from '@mui/material';
import { createRoot } from 'react-dom/client';
import { createHashRouter, Navigate } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { FellowshipAdventure } from '../fellowship-adventure/FellowshipAdventure';
import { HelpPage } from '../help/HelpPage';
import { HelperProvider } from '../helper/HelperContext';
import { InventoryMain } from '../inventory/InventoryMain';
import { LayoutMain } from '../layout/LayoutMain';
import { appThemeOptions } from '../widgets/appTheme';
import { Activate } from './Activate';
import { CityMain } from './CityMain';

const router = createHashRouter([
  {
    path: '/',
    element: <LayoutMain />,
    children: [
      { path: 'activate', element: <Activate /> },
      { path: 'city', element: <CityMain /> },
      { path: 'inventory', element: <InventoryMain /> },
      // { path: 'trade', element: <TradeMain /> },
      { path: 'fellowship-adventure', element: <FellowshipAdventure /> },
      { path: 'help', element: <HelpPage /> },
      { path: '*', element: <Navigate to='/city' replace /> },
    ],
  },
]);

const appTheme = createTheme(appThemeOptions);

export function createReactUi() {
  const root = createRoot(document.getElementById('root') as HTMLElement);
  // root.render(<CityMain />);
  root.render(
    <ThemeProvider theme={appTheme}>
      <HelperProvider>
        <RouterProvider router={router} />
      </HelperProvider>
    </ThemeProvider>,
  );
}
