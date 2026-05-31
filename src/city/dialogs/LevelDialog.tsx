import React from 'react';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { Box, Button, Dialog, IconButton, Slider, Stack, TextField, Typography } from '@mui/material';
import { getPrefix } from '../../util/getPrefix';
import { CityBlock } from '../CityBlock';

interface LevelDialogProps {
  open: boolean;
  onClose: () => void;
  block?: CityBlock;
  maxLevels: Record<string, number>;
  levelInput: number;
  setLevelInput: React.Dispatch<React.SetStateAction<number>>;
  onUpdate: (level: number) => void;
}

export const LevelDialog: React.FC<LevelDialogProps> = ({
  open,
  onClose,
  block,
  maxLevels,
  levelInput,
  setLevelInput,
  onUpdate,
}) => {
  if (!block) return null;

  const prefix = getPrefix(block.entity.cityentity_id, block.entity.type);
  const maxLevel = maxLevels[prefix] || 99;

  return (
    <Dialog open={open} onClose={onClose} slotProps={{ paper: { sx: { borderRadius: 2, p: 1 } } }}>
      <Stack spacing={3} sx={{ p: 2, minWidth: 320, alignItems: 'center' }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography
            variant='h6'
            sx={{
              fontWeight: 'bold',
            }}
          >
            Change Level
          </Typography>
          <Typography
            variant='body2'
            sx={{
              color: 'text.secondary',
            }}
          >
            Max Level: {maxLevel}
          </Typography>
        </Box>

        <Stack
          direction='row'
          spacing={2}
          sx={{
            alignItems: 'center',
          }}
        >
          <IconButton
            onClick={() => setLevelInput((prev) => Math.max(1, prev - 1))}
            disabled={levelInput <= 1}
            color='primary'
            sx={{ border: '1px solid', borderColor: 'divider' }}
          >
            <RemoveIcon />
          </IconButton>

          <TextField
            value={levelInput}
            onChange={(e) => {
              let v = Number(e.target.value);
              if (isNaN(v)) v = 1;
              if (v < 1) v = 1;
              if (v > maxLevel) v = maxLevel;
              setLevelInput(v);
            }}
            type='number'
            variant='outlined'
            size='small'
            sx={{ width: 80, '& input': { textAlign: 'center', fontWeight: 'bold' } }}
            slotProps={{ htmlInput: { min: 1, max: maxLevel } }}
          />

          <IconButton
            onClick={() => setLevelInput((prev) => Math.min(maxLevel, prev + 1))}
            disabled={levelInput >= maxLevel}
            color='primary'
            sx={{ border: '1px solid', borderColor: 'divider' }}
          >
            <AddIcon />
          </IconButton>
        </Stack>

        <Box sx={{ width: '100%', px: 2 }}>
          <Slider
            min={1}
            max={maxLevel}
            value={levelInput}
            onChange={(_, v) => setLevelInput(Number(v))}
            valueLabelDisplay='auto'
          />
        </Box>

        <Stack
          direction='row'
          spacing={2}
          sx={{
            width: '100%',
          }}
        >
          <Button fullWidth variant='outlined' onClick={onClose}>
            Cancel
          </Button>
          <Button
            fullWidth
            variant='contained'
            onClick={() => {
              onUpdate(levelInput);
            }}
          >
            Update
          </Button>
        </Stack>
      </Stack>
    </Dialog>
  );
};
