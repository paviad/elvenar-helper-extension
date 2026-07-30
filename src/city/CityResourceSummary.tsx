import React, { useState } from 'react';
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
import { Building } from '../model/building';
import { calculateCityBonuses } from './calculateCityBonuses';
import { useCity } from './CityContext';
import { isOutOfGrid } from './isOutOfGrid';

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
    const {
      popProvided,
      popRequired,
      cultureProvided,
      cultureRequired,
      prosperityProvided,
      prosperityRequired,
      residentialPop,
      awLevels,
      mhRankingPoints,
    } = city.cityTotals;

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
  }, [city.cityTotals, residentialBonus, availablePopulationBonus, cultureByRankingPoints, extraAvailableCulture]);

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
        <Stack
          direction='row'
          spacing={1}
          sx={{
            alignItems: 'center',
            mb: 0.5,
          }}
        >
          <Box sx={{ color, display: 'flex' }}>{icon}</Box>
          <Typography
            variant='body2'
            sx={{
              fontWeight: 'bold',
            }}
          >
            {label}
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Typography
            variant='body2'
            sx={{
              fontWeight: 'bold',
              color: data.net >= 0 ? 'text.primary' : '#d32f2f',
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
        <Stack
          direction='row'
          sx={{
            justifyContent: 'space-between',
            mt: 0.5,
          }}
        >
          <Typography
            variant='caption'
            sx={{
              color: 'text.secondary',
            }}
          >
            Total: {data.provided.toLocaleString()}
          </Typography>
          <Typography
            variant='caption'
            sx={{
              color: 'text.secondary',
            }}
          >
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
          <Typography
            sx={{
              fontWeight: 'bold',
            }}
          >
            Resource Summary
          </Typography>
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
