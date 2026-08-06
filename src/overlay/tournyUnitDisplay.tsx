import React from 'react';
import { Box } from '@mui/material';
import { TrainingBuilding, TroopType } from '../model/armyDetails';

/** Frame order in `military_sprite.png`, a 110x22 sheet of five 22px frames. */
export const SPRITE_ORDER: TroopType[] = ['lm', 'hr', 'hm', 'ma', 'lr'];
const SPRITE_FRAME = 22;

export const TROOP_LABELS: Record<TroopType, string> = {
  lm: 'Light Melee',
  lr: 'Light Ranged',
  ma: 'Mage',
  hm: 'Heavy Melee',
  hr: 'Heavy Ranged',
};

export const BUILDING_LABELS: Record<TrainingBuilding, string> = {
  hb: 'Barracks',
  eb: 'Barracks',
  mc: 'Mercenary Camp',
  tg: 'Training Grounds',
};

export const formatSeconds = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return [h, m, s].map((v) => v.toString().padStart(2, '0')).join(':');
};

export const UnitSprite = ({ troopType, spriteUrl }: { troopType: TroopType; spriteUrl: string }) => (
  <Box
    sx={{
      width: 20,
      height: 20,
      flexShrink: 0,
      backgroundImage: `url(${spriteUrl})`,
      backgroundPosition: `-${SPRITE_ORDER.indexOf(troopType) * SPRITE_FRAME}px 0px`,
      backgroundSize: `${SPRITE_ORDER.length * SPRITE_FRAME}px ${SPRITE_FRAME}px`,
      imageRendering: 'pixelated',
    }}
  />
);
