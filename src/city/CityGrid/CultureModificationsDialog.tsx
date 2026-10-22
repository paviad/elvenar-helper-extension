import React from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Slider, Stack, Typography } from '@mui/material';
import { getCultureBonusLevel, NO_CULTURE_MODIFIERS } from '../../model/cultureBonus';
import { useCity } from '../CityContext';
import { CultureBonusBar } from '../CultureBonusBar';
import { useCultureLadder } from '../useCultureLadder';

const toPercent = (share: number) => Math.round(share * 100);

/**
 * Sets how much neighbourly help and Ensorcelled Endowment a saved city is planned with, with
 * the culture bonus it gives shown as the sliders move. It is mounted only while open, so it
 * always starts from what the city holds now.
 */
export const CultureModificationsDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const city = useCity();
  const initial = city.cultureModifiers ?? NO_CULTURE_MODIFIERS;
  const [help, setHelp] = React.useState(toPercent(initial.help));
  const [enchant, setEnchant] = React.useState(toPercent(initial.enchant));

  const modifiers = React.useMemo(() => ({ help: help / 100, enchant: enchant / 100 }), [help, enchant]);
  const { summary, cultureHelp, cultureBonus } = useCultureLadder(modifiers);
  const level = getCultureBonusLevel(cultureBonus, summary.culture.net);

  const save = () => {
    void city.setCultureModifiers(modifiers).then(onClose);
  };

  return (
    // Wide enough that the longest captions keep to one line, so the dialog holds its height as
    // the sliders move.
    <Dialog open onClose={onClose} fullWidth slotProps={{ paper: { sx: { maxWidth: 510 } } }}>
      <DialogTitle>Culture Modifications</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ pt: 1 }}>
          <div>
            <Typography gutterBottom>Neighborly help: {help}%</Typography>
            <Slider value={help} onChange={(_, value) => setHelp(value)} min={0} max={100} />
            <Typography variant='caption' sx={{ color: 'text.secondary' }}>
              {cultureHelp.helped} of {cultureHelp.helpable} culture buildings helped, biggest first, adding{' '}
              {cultureHelp.neighbourlyHelpBonus.toLocaleString()} culture
            </Typography>
          </div>
          <div>
            <Typography gutterBottom>Ensorcelled Endowment: {enchant}%</Typography>
            <Slider value={enchant} onChange={(_, value) => setEnchant(value)} min={0} max={100} />
            <Typography variant='caption' sx={{ color: 'text.secondary' }}>
              {cultureHelp.enchanted} of {cultureHelp.helped} helped buildings enchanted, adding{' '}
              {cultureHelp.spellFactor}% to the bonus
            </Typography>
          </div>
          <div>
            <CultureBonusBar bonus={cultureBonus} availableCulture={summary.culture.net} plannedHelp={cultureHelp} />
            <Typography variant='caption' component='div' sx={{ color: 'text.secondary', mt: 0.5 }}>
              Culture bonus {level.percentage.toLocaleString()}% (level {level.level})
              {level.neededForNext !== undefined &&
                `, ${level.neededForNext.toLocaleString()} culture to ${level.nextPercentage?.toLocaleString()}%`}
            </Typography>
          </div>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={save} variant='contained'>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};
