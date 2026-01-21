import React from 'react';
import { Box, Typography, Divider, Stack } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { BuildingEx } from '../../model/buildingEx';
import { useCity } from '../CityContext';

interface BuildingTooltipProps {
  building: BuildingEx;
  isMaxLevel?: boolean;
}

export const BuildingTooltip: React.FC<BuildingTooltipProps> = ({ building, isMaxLevel }) => {
  const city = useCity();
  const goodsNames = city.goodsNames;
  const currentChapter = city.chapter;
  const source = building.sourceBuilding;

  // Extract Provisions (Population, Culture, etc.)
  const provisions = source?.provisions?.resources?.resources;
  const hasProvisions = provisions && Object.keys(provisions).length > 0;

  // Extract Requirements (Population, Culture cost, etc.)
  const requirements = source?.requirements?.resources;
  const hasRequirements = requirements && Object.keys(requirements).length > 0;

  // Extract Upgrade Requirements (Chapter)
  const upgradeRequirementChapter = source?.upgradeRequirements?.chapter;

  // Extract Production Types (What does it make?)
  const productionResources = new Set<string>();
  if (source?.production?.products) {
    source.production.products.forEach((product) => {
      if (product.revenue?.resources) {
        Object.keys(product.revenue.resources).forEach((res) => productionResources.add(res));
      }
    });
  }
  const hasProduction = productionResources.size > 0;

  const formatResourceName = (name: string) => {
    if (name.startsWith('unit_')) {
      return (
        {
          unit_1: 'Light Melee',
          unit_2: 'Light Ranged',
          unit_3: 'Mage',
          unit_4: 'Heavy Melee',
          unit_5: 'Heavy Ranged',
        }[name] || name
      );
    }
    if (name.startsWith('boosted_')) {
      const match = /^boosted_(ascended_|sentient_|)plus_(\d)_quality_(\d)$/.exec(name);
      if (!match) return name;
      const [, type, plus, quality] = match;
      const startIndex = type === 'ascended_' ? 6 : type === 'sentient_' ? 3 : 0;
      const actualIndex = ((parseInt(quality) - 1 + parseInt(plus)) % 3) + startIndex;
      const adjustedName = city.boostedGoods[actualIndex];
      return goodsNames[adjustedName] || name;
    }
    return goodsNames[name] || name;
  };

  return (
    <Box sx={{ p: 0.5, maxWidth: 280 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Typography variant='subtitle2' sx={{ fontWeight: 700, lineHeight: 1.2 }}>
          {building.name}
        </Typography>
        {isMaxLevel && (
          <Box sx={{ display: 'flex', alignItems: 'center', ml: 1, color: '#4caf50' }}>
            <CheckCircleIcon sx={{ fontSize: 14, mr: 0.5 }} />
            <Typography variant='caption' sx={{ fontWeight: 'bold', fontSize: '0.7rem' }}>
              MAX
            </Typography>
          </Box>
        )}
      </Box>

      <Typography variant='caption' display='block' sx={{ mb: 0.5, color: 'rgba(255, 255, 255, 0.7)' }}>
        {building.width}x{building.length}
        {building.chapter ? ` • Chapter ${building.chapter}` : ''}
        {source?.type ? ` • ${formatResourceName(source.type)}` : ''}
      </Typography>

      {/* Description */}
      {building.description && (
        <>
          <Divider sx={{ my: 1, borderColor: 'rgba(255,255,255,0.2)' }} />
          <Typography variant='body2' sx={{ fontStyle: 'italic', fontSize: '0.8rem', opacity: 0.9 }}>
            {building.description}
          </Typography>
        </>
      )}

      {/* Provisions (Population / Culture) */}
      {hasProvisions && provisions && (
        <>
          <Divider sx={{ my: 1, borderColor: 'rgba(255,255,255,0.2)' }} />
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {Object.entries(provisions).map(([key, value]) => {
              if (typeof value !== 'number' || value === 0) return null;
              return (
                <Typography key={key} variant='caption' sx={{ fontWeight: 600 }}>
                  {value} {formatResourceName(key)}
                </Typography>
              );
            })}
          </Box>
        </>
      )}

      {/* Requirements (Costs & Tech) */}
      {(hasRequirements || upgradeRequirementChapter) && (
        <>
          <Divider sx={{ my: 1, borderColor: 'rgba(255,255,255,0.2)' }} />
          <Typography variant='caption' display='block' sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            Requires:
          </Typography>

          {/* Tech Requirement */}
          {upgradeRequirementChapter && (
            <Typography
              variant='caption'
              display='block'
              sx={{
                fontWeight: 600,
                color: currentChapter && upgradeRequirementChapter > currentChapter ? '#f48fb1' : 'inherit',
                mb: 0.5,
              }}
            >
              Reach Chapter {upgradeRequirementChapter}
            </Typography>
          )}

          {/* Resource Costs */}
          {hasRequirements && requirements && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {Object.entries(requirements).map(([key, value]) => {
                if (typeof value !== 'number' || value === 0) return null;
                return (
                  <Typography key={key} variant='caption' sx={{ fontWeight: 600, color: '#ffcc80' }}>
                    {value} {formatResourceName(key)}
                  </Typography>
                );
              })}
            </Box>
          )}
        </>
      )}

      {/* Production Info */}
      {hasProduction && (
        <>
          <Divider sx={{ my: 1, borderColor: 'rgba(255,255,255,0.2)' }} />
          <Typography variant='caption' display='block' sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            Produces:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {Array.from(productionResources).map((res) => (
              <Typography
                key={res}
                variant='caption'
                sx={{
                  bgcolor: 'rgba(255,255,255,0.1)',
                  px: 0.5,
                  borderRadius: 0.5,
                  whiteSpace: 'nowrap',
                }}
              >
                {formatResourceName(res)}
              </Typography>
            ))}
          </Box>
        </>
      )}
    </Box>
  );
};
