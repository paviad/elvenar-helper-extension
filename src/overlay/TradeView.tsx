import * as React from 'react';
import { Box, FormControlLabel, Switch, Typography } from '@mui/material';
import { getOverlayStore } from './overlayStore';

const goodNames: Record<string, { name: string; x: number; y: number }> = {
  ascendedmarble: { name: 'Primordial Minerals', x: 26, y: 0 },
  ascendedsteel: { name: 'Ignited Ingots', x: 26, y: 104 },
  ascendedplanks: { name: 'Scholarly Sprouts', x: 26, y: 26 },
  ascendedcrystal: { name: 'Ethereal Aerosols', x: 0, y: 130 },
  ascendedscrolls: { name: 'Wonder Wax', x: 26, y: 52 },
  ascendedsilk: { name: 'Finest Flying Powder', x: 26, y: 78 },
  ascendedelixir: { name: 'Spicy Spread', x: 0, y: 156 },
  ascendedmagic_dust: { name: 'Genius Granule', x: 0, y: 208 },
  ascendedgems: { name: 'Marvellous Marbles', x: 0, y: 182 },
};

export const TradeView = () => {
  const useOverlayStore = getOverlayStore();
  const offeredGoods = useOverlayStore((state) => state.offeredGoods);
  const spriteUrl = chrome.runtime.getURL('sprite.png');

  const autoOpen = useOverlayStore((state) => state.autoOpenTrade ?? true);
  const setAutoOpen = useOverlayStore((state) => state.setAutoOpenTrade);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1 }}>
        {(offeredGoods.length > 0 && (
          <>
            <div style={{ fontWeight: 600, marginBottom: 12 }}>Boosted ascended trades available</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {offeredGoods.map((good) => {
                const goodInfo = goodNames[good];
                return (
                  <li key={good} style={{ display: 'flex', alignItems: 'center', marginBottom: 8, padding: '4px 0' }}>
                    {goodInfo && (
                      <img
                        src={spriteUrl}
                        alt={goodInfo.name}
                        width={24}
                        height={24}
                        style={{
                          objectFit: 'none',
                          objectPosition: `-${goodInfo.x}px -${goodInfo.y}px`,
                          imageRendering: 'pixelated',
                          marginRight: 10,
                        }}
                      />
                    )}
                    <span style={{ fontSize: '14px', color: '#333' }}>{goodInfo ? goodInfo.name : good}</span>
                  </li>
                );
              })}
            </ul>
          </>
        )) || (
          <div style={{ padding: 10, color: '#666', fontStyle: 'italic' }}>No boosted ascended trades available</div>
        )}
      </div>

      {/* Settings Footer */}
      <Box sx={{ mt: 2, pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
        <FormControlLabel
          control={<Switch checked={autoOpen} onChange={(e) => setAutoOpen(e.target.checked)} size='small' />}
          label={
            <Typography variant='body2' color='text.secondary' sx={{ fontSize: '13px' }}>
              Auto-open when visiting Trader
            </Typography>
          }
          sx={{ ml: 0, mr: 0 }}
        />
      </Box>
    </div>
  );
};
