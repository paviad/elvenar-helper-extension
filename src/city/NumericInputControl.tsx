import React from 'react';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { Box, IconButton, Slider, Stack, TextField } from '@mui/material';

interface NumericInputControlProps {
  label: string;
  value: string;
  min?: number;
  max?: number;
  onChange: (value: number | undefined) => void;
  helperText?: string;
}

export const NumericInputControl: React.FC<NumericInputControlProps> = ({
  label,
  value,
  min = 1,
  max = 99,
  onChange,
  helperText,
}) => {
  // Parse current value for Slider/Math operations (fallback to min if empty/invalid)
  const numericValue = parseInt(value, 10) || min;

  const handleIncrement = () => {
    const newVal = Math.min(numericValue + 1, max);
    onChange(newVal);
  };

  const handleDecrement = () => {
    const newVal = Math.max(numericValue - 1, min);
    onChange(newVal);
  };

  const handleSliderChange = (_: Event, val: number | number[]) => {
    onChange(Number(val));
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const val = event.target.value;

    // Allow clearing the input
    if (val === '') {
      onChange(undefined);
      return;
    }

    // Validate integer input
    if (/^[0-9]+$/.test(val)) {
      const numVal = parseInt(val, 10);
      // Enforce max constraint (min constraint usually enforced on blur or allowed during typing)
      if (numVal <= max) {
        onChange(numVal);
      }
    }
  };

  return (
    <Box>
      <Stack
        direction='row'
        spacing={1}
        sx={{
          alignItems: 'center',
        }}
      >
        <IconButton onClick={handleDecrement} disabled={numericValue <= min} size='small'>
          <RemoveIcon fontSize='small' />
        </IconButton>
        <TextField
          label={label}
          type='number'
          fullWidth
          size='small'
          value={value}
          onChange={handleInputChange}
          slotProps={{
            htmlInput: {
              min,
              max,
              style: { textAlign: 'center' },
            },
          }}
          helperText={helperText}
        />
        <IconButton onClick={handleIncrement} disabled={numericValue >= max} size='small'>
          <AddIcon fontSize='small' />
        </IconButton>
      </Stack>
      <Box sx={{ px: 2, mt: 0.5 }}>
        <Slider
          value={numericValue}
          min={min}
          max={max}
          onChange={handleSliderChange}
          valueLabelDisplay='auto'
          size='small'
        />
      </Box>
    </Box>
  );
};
