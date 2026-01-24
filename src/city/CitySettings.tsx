import { Card, CardContent, Grid, Input, Slider, Typography } from '@mui/material';
import React from 'react';
import { useCity } from './CityContext';

export const CitySettings: React.FC = () => {
  const { chapter, setChapter, squadSize, setSquadSize, rankingPoints, setRankingPoints } = useCity();
  const value = chapter || 1;
  const currentSquadSize = squadSize || 0;
  const currentRankingPoints = rankingPoints || 0;

  const handleSliderChange = (event: Event, newValue: number | number[]) => {
    setChapter(newValue as number);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setChapter(event.target.value === '' ? 0 : Number(event.target.value));
  };

  const handleSquadSizeSliderChange = (event: Event, newValue: number | number[]) => {
    setSquadSize(newValue as number);
  };

  const handleSquadSizeInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSquadSize(event.target.value === '' ? 0 : Number(event.target.value));
  };

  const handleRankingPointsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRankingPoints(event.target.value === '' ? 0 : Number(event.target.value));
  };

  const handleBlur = () => {
    if (value < 1) {
      setChapter(1);
    } else if (value > 24) {
      setChapter(24);
    }
  };

  const handleSquadSizeBlur = () => {
    if (currentSquadSize < 0) {
      setSquadSize(0);
    } else if (currentSquadSize > 30000) {
      setSquadSize(30000);
    }
  };

  return (
    <Card elevation={3} sx={{ mb: 2, minWidth: 250 }}>
      <CardContent>
        <Typography variant='h6' sx={{ mb: 2, fontWeight: 'bold' }}>
          City Settings
        </Typography>

        {/* Chapter Control */}
        <Typography id='input-slider' gutterBottom variant='caption' color='text.secondary'>
          Current Chapter
        </Typography>
        <Grid container spacing={2} alignItems='center'>
          <Grid sx={{ flexGrow: 1 }}>
            <Slider
              value={typeof value === 'number' ? value : 1}
              onChange={handleSliderChange}
              aria-labelledby='input-slider'
              step={1}
              min={1}
              max={24}
              valueLabelDisplay='auto'
            />
          </Grid>
          <Grid>
            <Input
              value={value}
              size='small'
              onChange={handleInputChange}
              onBlur={handleBlur}
              inputProps={{
                step: 1,
                min: 1,
                max: 24,
                type: 'number',
                'aria-labelledby': 'input-slider',
                style: { textAlign: 'center' },
              }}
              sx={{ width: 50 }}
            />
          </Grid>
        </Grid>

        {/* Squad Size Control */}
        <Typography
          id='squad-size-slider'
          gutterBottom
          variant='caption'
          color='text.secondary'
          sx={{ mt: 2, display: 'block' }}
        >
          Squad Size
        </Typography>
        <Grid container spacing={2} alignItems='center'>
          <Grid sx={{ flexGrow: 1 }}>
            <Slider
              value={typeof currentSquadSize === 'number' ? currentSquadSize : 0}
              onChange={handleSquadSizeSliderChange}
              aria-labelledby='squad-size-slider'
              step={10}
              min={0}
              max={30000}
              valueLabelDisplay='auto'
            />
          </Grid>
          <Grid>
            <Input
              value={currentSquadSize}
              size='small'
              onChange={handleSquadSizeInputChange}
              onBlur={handleSquadSizeBlur}
              inputProps={{
                step: 10,
                min: 0,
                max: 30000,
                type: 'number',
                'aria-labelledby': 'squad-size-slider',
                style: { textAlign: 'center' },
              }}
              sx={{ width: 70 }}
            />
          </Grid>
        </Grid>

        {/* Ranking Points Control */}
        <Typography
          id='ranking-points-label'
          gutterBottom
          variant='caption'
          color='text.secondary'
          sx={{ mt: 2, display: 'block' }}
        >
          Ranking Points (static)
        </Typography>
        <Grid container spacing={2} alignItems='center'>
          <Grid sx={{ flexGrow: 1 }} />
          <Grid>
            <Input
              value={currentRankingPoints}
              size='small'
              onChange={handleRankingPointsChange}
              inputProps={{
                min: 0,
                type: 'number',
                'aria-labelledby': 'ranking-points-label',
                style: { textAlign: 'center' },
              }}
              sx={{ width: 100 }}
            />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};
