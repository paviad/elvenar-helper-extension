import PeopleIcon from '@mui/icons-material/People';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import WorkIcon from '@mui/icons-material/Work';
import { Box, Card, CardContent, Divider, LinearProgress, Stack, Typography } from '@mui/material';
import React from 'react';
import { Building } from '../model/building';
import { useCity } from './CityContext';

export const CityResourceSummary = () => {
  const city = useCity();
  const blocks = React.useMemo(() => Object.values(city.blocks), [city.blocks]);
  const buildingFinder = city.buildingFinder;
  const evolvingBuildings = city.evolvingBuildings;
  const effectsResidentialPopulationBoost = city.effects.filter((r) => r.action === 'residential_population_boost');
  const effectsAvailablePopulationBonus = city.effects.filter((r) => r.action === 'available_population_bonus');
  const effectsAvailableCultureBonus = city.effects.filter((r) => r.action === 'available_culture_bonus');
  const effectsCultureByRankingPoints = city.effects.filter((r) => r.action === 'culture_by_ranking_points');
  const squadSize = city.squadSize;

  const residentialBonus = effectsResidentialPopulationBoost
    .map((r) => {
      const block = r.origins?.map((origin) => blocks.find((b) => b.gameId.startsWith(origin))).filter((r) => !!r)[0];
      if (!block) return 0;
      const level = block.level;
      const factor = r.values?.[level] || 1;
      return factor;
    })
    .reduce((sum, effect) => sum * (effect || 1), 1);

  const availablePopulationBonus = effectsAvailablePopulationBonus
    .map((r) => {
      const block = r.origins?.map((origin) => blocks.find((b) => b.gameId.startsWith(origin))).filter((r) => !!r)[0];
      if (!block) return 0;
      const level = block.level;
      const factor = r.values?.[level] || 0;
      return factor;
    })
    .reduce((sum, effect) => sum + (effect || 0), 0);

  const availableCultureBonus = effectsAvailableCultureBonus
    .map((r) => {
      const block = r.origins?.map((origin) => blocks.find((b) => b.gameId.startsWith(origin))).filter((r) => !!r)[0];
      if (!block) return 0;
      const level = block.level;
      const factor = r.values?.[level] || 0;
      return factor;
    })
    .reduce((sum, effect) => sum + (effect || 0), 0);

  const cultureByRankingPoints = effectsCultureByRankingPoints
    .map((r) => {
      const block = r.origins?.map((origin) => blocks.find((b) => b.gameId.startsWith(origin))).filter((r) => !!r)[0];
      if (!block) return 0;
      const level = block.level;
      const factor = r.values?.[level] || 0;
      return factor;
    })
    .reduce((sum, effect) => sum + (effect || 0), 0);

  const extraAvailableCulture = Math.round(squadSize * availableCultureBonus);

  const summary = React.useMemo(() => {
    let popProvided = 0;
    let popRequired = 0;
    let cultureProvided = 0;
    let cultureRequired = 0;
    let prosperityProvided = 0;
    let prosperityRequired = 0;

    let residentialPop = 0;
    let awLevels = 0;
    let mhRankingPoints = 0;

    blocks.forEach((block) => {
      const building = buildingFinder.getBuilding(block.gameId, block.level);
      const evolvingBuilding = evolvingBuildings.find((eb) => eb.baseName === building?.sourceBuilding.base_name);
      const cultureFactor = evolvingBuilding?.stages.find((s) => s.id === block.stage)?.culture || 1;
      const populationFactor = evolvingBuilding?.stages.find((s) => s.id === block.stage)?.population || 1;

      if (!building) return;
      const source: Building = building.sourceBuilding;

      if (building.sourceBuilding.type === 'ancient_wonder') {
        awLevels += block.level;
      }

      if (building.sourceBuilding.type === 'main_building') {
        mhRankingPoints = building.sourceBuilding.rankingPoints || 0;
      }

      // Provisions (Benefits)
      const provisions = source.provisions?.resources?.resources;
      if (provisions) {
        const popProvidedByThisBuilding = (provisions.population || 0) * populationFactor;
        popProvided += popProvidedByThisBuilding;

        if (['residential', 'premium_residential'].includes(block.entity.type)) {
          residentialPop += popProvidedByThisBuilding;
        }

        const cultureProvidedByThisBuilding = (provisions.culture || 0) * cultureFactor;
        cultureProvided += cultureProvidedByThisBuilding;
        prosperityProvided += provisions.prosperity || 0;
      }

      // Requirements (Costs)
      const requirements = source.requirements?.resources;
      if (requirements) {
        popRequired += requirements.population || 0;
        cultureRequired += requirements.culture || 0;
        prosperityRequired += requirements.prosperity || 0;
      }
    });

    city.setPopRequired(popRequired);
    city.setResidentialPop(residentialPop);
    city.setAwLevels(awLevels);
    city.setMhRankingPoints(mhRankingPoints);

    const extraResidential = Math.round(residentialPop * (residentialBonus - 1));
    const extraAvailablePopulation = Math.round(popRequired * availablePopulationBonus);
    const extraCultureFromRanking = Math.round(cultureByRankingPoints * mhRankingPoints * awLevels);

    const totalPopulationProvided = popProvided + extraResidential + extraAvailablePopulation;
    const totalCultureProvided = cultureProvided + extraAvailableCulture + extraCultureFromRanking;

    return {
      population: {
        provided: totalPopulationProvided,
        required: popRequired,
        net: totalPopulationProvided - popRequired,
      },
      culture: {
        provided: totalCultureProvided,
        required: cultureRequired,
        net: totalCultureProvided - cultureRequired,
      },
      prosperity: {
        provided: prosperityProvided,
        required: prosperityRequired,
        net: prosperityProvided - prosperityRequired,
      },
    };
  }, [blocks]);

  const renderRow = (
    label: string,
    icon: React.ReactNode,
    data: { provided: number; required: number; net: number },
    color: string,
  ) => {
    // Calculate usage percentage for the bar
    // If net is negative, we want the bar to be full (error color),
    // otherwise proportional to usage.
    const totalBase = data.provided > 0 ? data.provided : data.required > 0 ? data.required : 1;
    const percent = Math.min((data.required / totalBase) * 100, 100);

    return (
      <Box sx={{ mb: 2 }}>
        <Stack direction='row' alignItems='center' spacing={1} sx={{ mb: 0.5 }}>
          <Box sx={{ color, display: 'flex' }}>{icon}</Box>
          <Typography variant='body2' fontWeight='bold'>
            {label}
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Typography
            variant='body2'
            fontWeight='bold'
            sx={{
              color: data.net >= 0 ? 'text.primary' : '#d32f2f', // Red 700
            }}
          >
            {data.net >= 0 ? '+' : ''}
            {data.net.toLocaleString()}
          </Typography>{' '}
        </Stack>

        <LinearProgress
          variant='determinate'
          value={percent}
          sx={{
            height: 6,
            borderRadius: 3,
            bgcolor: 'action.hover',
            '& .MuiLinearProgress-bar': {
              bgcolor: data.net >= 0 ? color : 'error.main',
            },
          }}
        />

        <Stack direction='row' justifyContent='space-between' sx={{ mt: 0.5 }}>
          <Typography variant='caption' color='text.secondary'>
            Total: {data.provided.toLocaleString()}
          </Typography>
          <Typography variant='caption' color='text.secondary'>
            Used: {data.required.toLocaleString()}
          </Typography>
        </Stack>
      </Box>
    );
  };

  return (
    <Card elevation={3} sx={{ height: '100%', overflow: 'auto' }}>
      <CardContent>
        <Typography variant='h6' component='div' sx={{ mb: 2, fontWeight: 'bold' }}>
          Resource Summary
        </Typography>

        {renderRow('Population', <PeopleIcon fontSize='small' />, summary.population, '#4caf50')}
        <Divider sx={{ my: 1.5 }} />
        {renderRow('Culture', <WbSunnyIcon fontSize='small' />, summary.culture, '#ff9800')}

        {(summary.prosperity.provided > 0 || summary.prosperity.required > 0) && (
          <>
            <Divider sx={{ my: 1.5 }} />
            {renderRow('Prosperity', <WorkIcon fontSize='small' />, summary.prosperity, '#9c27b0')}
          </>
        )}
      </CardContent>
    </Card>
  );
};
