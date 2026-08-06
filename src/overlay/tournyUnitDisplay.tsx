import React from 'react';
import { Box, Typography } from '@mui/material';
import { TrainingBuilding, TroopType } from '../model/armyDetails';

/** More dominant enemy classes means a harder week, so the tier drives the accent colour. */
export type TierColor = 'success' | 'warning' | 'error';

export const TIER_COLORS: Record<1 | 2 | 3, TierColor> = {
  1: 'success',
  2: 'warning',
  3: 'error',
};

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

export const SectionLabel = ({ icon, text }: { icon: React.ReactNode; text: string }) => (
  <Typography
    variant='caption'
    color='text.secondary'
    sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 'bold', textTransform: 'uppercase' }}
  >
    {icon} {text}
  </Typography>
);

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
