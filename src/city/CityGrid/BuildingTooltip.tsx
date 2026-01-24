import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { Box, Divider, Typography } from '@mui/material';
import React from 'react';
import { BuildingEx } from '../../model/buildingEx';
import { useCity } from '../CityContext';
import { knownTypeNames } from '../Legend/knownTypes';

interface BuildingTooltipProps {
  building: BuildingEx;
  isMaxLevel?: boolean;
  stage?: number;
}

export const BuildingTooltip: React.FC<BuildingTooltipProps> = ({ building, isMaxLevel, stage }) => {
  const city = useCity();
  const goodsNames = city.goodsNames;
  const currentChapter = city.chapter;
  const source = building.sourceBuilding;
  const squadSize = city.squadSize;
  const popRequired = city.popRequired;
  const residentialPop = city.residentialPop;
  const awLevels = city.awLevels;
  const mhRankingPoints = city.mhRankingPoints;
  const evolvingBuildings = city.evolvingBuildings;

  const effectsResidentialPopulationBoost = city.effects.filter((r) => r.action === 'residential_population_boost');
  const effectsAvailablePopulationBonus = city.effects.filter((r) => r.action === 'available_population_bonus');
  const effectsAvailableCultureBonus = city.effects.filter((r) => r.action === 'available_culture_bonus');
  const effectsCultureByRankingPoints = city.effects.filter((r) => r.action === 'culture_by_ranking_points');

  const residentialBonus = effectsResidentialPopulationBoost
    .map((r) => {
      const match = r.origins?.some((origin) => building.sourceBuilding.id.startsWith(origin));
      if (!match) return 0;
      const level = building.sourceBuilding.level;
      const factor = r.values?.[level] || 1;
      return factor;
    })
    .reduce((sum, effect) => sum * (effect || 1), 1);

  const availableCultureBonus = effectsAvailableCultureBonus
    .map((r) => {
      const match = r.origins?.some((origin) => building.sourceBuilding.id.startsWith(origin));
      if (!match) return 0;
      const level = building.sourceBuilding.level;
      const factor = r.values?.[level] || 0;
      return factor;
    })
    .reduce((sum, effect) => sum + (effect || 0), 0);

  const availablePopulationBonus = effectsAvailablePopulationBonus
    .map((r) => {
      const match = r.origins?.some((origin) => building.sourceBuilding.id.startsWith(origin));
      if (!match) return 0;
      const level = building.sourceBuilding.level;
      const factor = r.values?.[level] || 0;
      return factor;
    })
    .reduce((sum, effect) => sum + (effect || 0), 0);

  const cultureByRankingPoints = effectsCultureByRankingPoints
    .map((r) => {
      const match = r.origins?.some((origin) => building.sourceBuilding.id.startsWith(origin));
      if (!match) return 0;
      const level = building.sourceBuilding.level;
      const factor = r.values?.[level] || 0;
      return factor;
    })
    .reduce((sum, effect) => sum + (effect || 0), 0);

  const evolvingBuilding = evolvingBuildings.find((eb) => eb.baseName === building?.sourceBuilding.base_name);
  const cultureFactor = evolvingBuilding?.stages.find((s) => s.id === stage)?.culture || 1;
  const populationFactor = evolvingBuilding?.stages.find((s) => s.id === stage)?.population || 1;

  const extraResidential = Math.round(residentialPop * (residentialBonus - 1));
  const extraAvailablePopulation = Math.round(popRequired * availablePopulationBonus);
  const extraAvailableCulture = Math.round(squadSize * availableCultureBonus);
  const extraCultureFromRanking = Math.round(cultureByRankingPoints * mhRankingPoints * awLevels);

  // Extract Provisions (Population, Culture, etc.)
  let provisions = source?.provisions?.resources?.resources && { ...source?.provisions?.resources?.resources };

  if (extraAvailableCulture || extraCultureFromRanking || cultureFactor !== 1) {
    if (!provisions) {
      provisions = {};
    }
    let culture = (provisions?.['culture'] || 0) * cultureFactor;
    if (extraAvailableCulture) {
      culture += extraAvailableCulture;
    }
    if (extraCultureFromRanking) {
      culture += extraCultureFromRanking;
    }
    provisions['culture'] = culture;
  }

  if (extraAvailablePopulation || extraResidential || populationFactor !== 1) {
    if (!provisions) {
      provisions = {};
    }
    let population = (provisions?.['population'] || 0) * populationFactor;
    if (extraAvailablePopulation) {
      population += extraAvailablePopulation;
    }
    if (extraResidential) {
      population += extraResidential;
    }
    provisions['population'] = population;
  }

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

  const formatBuildingType = (type: string) => {
    return knownTypeNames[type] || type;
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
        {source?.type ? ` • ${formatBuildingType(source.type)}` : ''}
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
