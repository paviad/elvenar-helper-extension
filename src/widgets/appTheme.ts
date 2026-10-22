import { ThemeOptions } from '@mui/material';

/**
 * Theme settings shared by every React root (the pages and the overlay).
 *
 * MUI tooltips are interactive by default: the tooltip itself takes the pointer, and resting on it
 * keeps it open, so it sits over the controls next to what it explains and swallows their clicks.
 * Non-interactive tooltips let the pointer through, so a click lands on whatever is underneath and
 * the tooltip closes as soon as the pointer leaves the element it belongs to. None of our tooltips
 * hold anything to click, so nothing is lost. Set here rather than on each Tooltip, so a tooltip
 * added later behaves the same.
 */
export const appThemeOptions: ThemeOptions = {
  components: {
    MuiTooltip: { defaultProps: { disableInteractive: true } },
  },
};
