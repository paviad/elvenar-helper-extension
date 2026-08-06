import React, { useState } from 'react';
import { Box, Tab, Tabs, Typography } from '@mui/material';
import { TournyAdvisor } from './TournyAdvisor';
import { TournyPrep } from './TournyPrep';

interface TournySubTab {
  key: string;
  label: string;
  render: () => React.ReactNode;
}

/** The bar is only drawn once there is more than one of these to choose between. */
const SUB_TABS: TournySubTab[] = [
  { key: 'counters', label: 'Counters', render: () => <TournyAdvisor /> },
  { key: 'prep', label: 'Prep', render: () => <TournyPrep /> },
];

export const Tourny = () => {
  const [subTabKey, setSubTabKey] = useState(SUB_TABS[0].key);
  const activeIndex = Math.max(
    0,
    SUB_TABS.findIndex((t) => t.key === subTabKey),
  );

  return (
    <Box
      sx={{
        p: 2,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        overflow: 'hidden',
        bgcolor: 'background.default',
        color: 'text.primary',
        // The game page leaks a centred text-align into the injected overlay — the same reason
        // `overlay.ts` forces `start` on the panel title. Flex layouts hide it; plain text does not.
        textAlign: 'start',
      }}
    >
      <Typography variant='h5' sx={{ fontWeight: 'bold', mb: 1 }}>
        Tournament
      </Typography>

      {SUB_TABS.length > 1 && (
        <Tabs
          value={activeIndex}
          onChange={(_, index: number) => setSubTabKey(SUB_TABS[index].key)}
          variant='scrollable'
          scrollButtons='auto'
          sx={{ minHeight: 36, mb: 1, '& .MuiTab-root': { minHeight: 36, py: 0 } }}
        >
          {SUB_TABS.map((tab) => (
            <Tab key={tab.key} label={tab.label} />
          ))}
        </Tabs>
      )}

      <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>{SUB_TABS[activeIndex].render()}</Box>
    </Box>
  );
};
