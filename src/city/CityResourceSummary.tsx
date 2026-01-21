import React, { useMemo } from 'react';
import { Card, CardContent, Typography, Box, Divider, Stack, LinearProgress } from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import WorkIcon from '@mui/icons-material/Work';
import { Building } from '../model/building';
import { useCity } from './CityContext';

export const CityResourceSummary = () => {
  const city = useCity();
  const blocks = Object.values(city.blocks);
  const buildingFinder = city.buildingFinder;
  const evolvingBuildings = city.evolvingBuildings;
  const effects = city.effects.filter((r) => r.action.includes('population'));
  const effects1 = effects.filter((r) => r.action === 'residential_population_boost');
  const effects2 = effects.filter((r) => r.action === 'available_population_bonus');

  const residentialBonus = effects1
    .map((r) => {
      const origin = r.origins?.[0];
      if (!origin) return 0;
      const block = blocks.find((b) => b.gameId.startsWith(origin));
      if (!block) return 0;
      const level = block.level;
      const factor = r.values?.[level] || 1;
      return factor;
    })
    .reduce((sum, effect) => sum * (effect || 1), 1);

  const availableBonus = effects2
    .map((r) => {
      const origin = r.origins?.[0];
      if (!origin) return 0;
      const block = blocks.find((b) => b.gameId.startsWith(origin));
      if (!block) return 0;
      const level = block.level;
      const factor = r.values?.[level] || 0;
      return factor;
    })
    .reduce((sum, effect) => sum + (effect || 0), 0);

  const summary = useMemo(() => {
    let popProvided = 0;
    let popRequired = 0;
    let cultureProvided = 0;
    let cultureRequired = 0;
    let prosperityProvided = 0;
    let prosperityRequired = 0;

    let residentialPop = 0;

    blocks.forEach((block) => {
      const building = buildingFinder.getBuilding(block.gameId, block.level);
      const evolvingBuilding = evolvingBuildings.find((eb) => eb.baseName === building?.sourceBuilding.base_name);
      const cultureFactor = evolvingBuilding?.stages.find((s) => s.id === block.stage)?.culture || 1;
      const populationFactor = evolvingBuilding?.stages.find((s) => s.id === block.stage)?.population || 1;

      if (!building) return;
      const source: Building = building.sourceBuilding;

      // Provisions (Benefits)
      const provisions = source.provisions?.resources?.resources;
      if (provisions) {
        const popProvidedByThisBuilding = (provisions.population || 0) * populationFactor;
        popProvided += popProvidedByThisBuilding;

        if (['residential', 'premium_residential'].includes(block.entity.type)) {
          residentialPop += popProvidedByThisBuilding;
        }

        cultureProvided += (provisions.culture || 0) * cultureFactor;
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

    const extraResidential = Math.round(residentialPop * (residentialBonus - 1));
    const extraAvailable = Math.round(popRequired * availableBonus);

    const totalProvided = popProvided + extraResidential + extraAvailable;

    return {
      population: { provided: totalProvided, required: popRequired, net: totalProvided - popRequired },
      culture: { provided: cultureProvided, required: cultureRequired, net: cultureProvided - cultureRequired },
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
