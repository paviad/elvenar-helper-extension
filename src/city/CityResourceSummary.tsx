import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PeopleIcon from '@mui/icons-material/People';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import WorkIcon from '@mui/icons-material/Work';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Card,
  CardContent,
  Divider,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import React, { useState } from 'react';
import { Building } from '../model/building';
import { useCity } from './CityContext';
import { calculateCityBonuses } from './calculateCityBonuses';

export const CityResourceSummary = () => {
  const city = useCity();
  const [collapsed, setCollapsed] = useState(false);
  const blocks = React.useMemo(() => Object.values(city.blocks), [city.blocks]);
  const blocksIdAndLevel = React.useMemo(() => blocks.map((b) => ({ id: b.gameId, level: b.level })), [blocks]);
  const buildingFinder = city.buildingFinder;
  const evolvingBuildings = city.evolvingBuildings;

  const { residentialBonus, availablePopulationBonus, cultureByRankingPoints, extraAvailableCulture } = React.useMemo(
    () => calculateCityBonuses(city, blocksIdAndLevel),
    [city.effects, city.squadSize, blocksIdAndLevel],
  );

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

      // disregard building if outside of city limits
      if (block.outOfGrid) {
        return;
      }

      if (building.sourceBuilding.type === 'ancient_wonder') {
        awLevels += block.level;
      }

      if (building.sourceBuilding.type === 'main_building') {
        mhRankingPoints = building.sourceBuilding.rankingPoints || 0;
      }

      // Provisions (Benefits)
      const provisions = source.provisions?.resources?.resources;
      if (provisions) {
        const popProvidedByThisBuilding = Math.floor((provisions.population || 0) * populationFactor);
        popProvided += popProvidedByThisBuilding;

        if (['residential', 'premium_residential'].includes(block.entity.type)) {
          residentialPop += popProvidedByThisBuilding;
        }

        const cultureProvidedByThisBuilding = Math.floor((provisions.culture || 0) * cultureFactor);
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
    const extraAvailablePopulation = Math.ceil(popRequired * availablePopulationBonus);
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
  }, [blocks, city.effects, city.squadSize]);

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
    <Box>
      <Accordion
        expanded={!collapsed}
        onChange={(_, expanded) => setCollapsed(!expanded)}
        elevation={3}
        disableGutters
        sx={{ borderRadius: 2 }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls='legend-content' id='legend-header'>
          <Typography fontWeight='bold'>Resource Summary</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {renderRow('Population', <PeopleIcon fontSize='small' />, summary.population, '#4caf50')}
          <Divider sx={{ my: 1.5 }} />
          {renderRow('Culture', <WbSunnyIcon fontSize='small' />, summary.culture, '#ff9800')}

          {(summary.prosperity.provided > 0 || summary.prosperity.required > 0) && (
            <>
              <Divider sx={{ my: 1.5 }} />
              {renderRow('Prosperity', <WorkIcon fontSize='small' />, summary.prosperity, '#9c27b0')}
            </>
          )}
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};
