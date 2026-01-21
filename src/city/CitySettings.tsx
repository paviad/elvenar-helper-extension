import React from 'react';
import { Card, CardContent, Typography, Slider, Input, Grid } from '@mui/material';
import { useCity } from './CityContext';

export const CitySettings: React.FC = () => {
  const { chapter, setChapter } = useCity();
  const value = chapter || 1;

  const handleSliderChange = (event: Event, newValue: number | number[]) => {
    setChapter(newValue as number);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setChapter(event.target.value === '' ? 0 : Number(event.target.value));
  };

  const handleBlur = () => {
    if (value < 1) {
      setChapter(1);
    } else if (value > 24) {
      setChapter(24);
    }
  };

  return (
    <Card elevation={3} sx={{ mb: 2, minWidth: 250 }}>
      <CardContent>
        <Typography variant='h6' sx={{ mb: 2, fontWeight: 'bold' }}>
          City Settings
        </Typography>
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
      </CardContent>
    </Card>
  );
};
