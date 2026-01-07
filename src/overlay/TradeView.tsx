import * as React from 'react';
import { setupMessageListener, setupTradeParsedListener } from '../chrome/messages';
import { expandPanel } from '../overlay';
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

  return (
    <div>
      {(offeredGoods.length > 0 && (
        <>
          <div>Boosted ascended trades available</div>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {offeredGoods.map((good) => {
              const goodInfo = goodNames[good];
              return (
                <li key={good} style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
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
                        marginRight: 8,
                      }}
                    />
                  )}
                  <span>{goodInfo ? goodInfo.name : good}</span>
                </li>
              );
            })}
          </ul>
        </>
      )) || <div>No boosted ascended trades available</div>}
    </div>
  );
};
