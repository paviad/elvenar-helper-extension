import * as React from 'react';
import { setupMessageListener, setupTradeParsedListener } from '../chrome/messages';
import { expandPanel } from '..';

const goodNames: Record<string, { name: string; x: number; y: number }> = {
  ascendedmarble: { name: 'Primordial Minerals', x: 25, y: 0 },
  ascendedsteel: { name: 'Ignited Ingots', x: 25, y: 103 },
  ascendedplanks: { name: 'Scholarly Sprouts', x: 25, y: 26 },
  ascendedcrystal: { name: 'Ethereal Aerosols', x: 0, y: 130 },
  ascendedscrolls: { name: 'Wonder Wax', x: 25, y: 51 },
  ascendedsilk: { name: 'Finest Flying Powder', x: 25, y: 78 },
  ascendedelixir: { name: 'Spicy Spread', x: 0, y: 156 },
  ascendedmagic_dust: { name: 'Genius Granule', x: 0, y: 207 },
  ascendedgems: { name: 'Marvellous Marbles', x: 0, y: 181 },
};

export const OverlayMain = () => {
  const [offeredGoods, setOfferedGoods] = React.useState<string[]>([]);
  const spriteUrl = chrome.runtime.getURL('sprite.png');

  setupMessageListener();
  setupTradeParsedListener((tradesMsg) => {
    const offeredGoods = Array.from(new Set(tradesMsg.trades.map((trade) => trade.offer)));
    setOfferedGoods(offeredGoods);
    expandPanel(offeredGoods.length > 0);
  });

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
                      width={26}
                      height={26}
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
