import React from 'react';
import GroupWorkIcon from '@mui/icons-material/GroupWork';
import InsightsIcon from '@mui/icons-material/Insights';
import RuleIcon from '@mui/icons-material/Rule';
import StraightenIcon from '@mui/icons-material/Straighten';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import UpgradeIcon from '@mui/icons-material/Upgrade';
import { Box, Divider, List, ListItem, ListItemText, Typography } from '@mui/material';

export const UpgradeFinder = () => (
  <Box>
    <Typography variant='h4' gutterBottom>
      Upgrade Finder
    </Typography>
    <Typography component='p' variant='body1' gutterBottom>
      Your inventory quietly fills up with event buildings that are better than what you already have placed. The
      Upgrade Finder compares the two and shows you only the swaps that cannot lose: an inventory building that matches
      or beats the placed one on everything it provides, and does more per square.
    </Typography>

    <Divider sx={{ my: 2 }} />

    <Typography variant='h6' gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <UpgradeIcon color='primary' fontSize='small' /> Opening it
    </Typography>
    <List dense disablePadding>
      <ListItem>
        <ListItemText
          primary='The fourth view'
          secondary='In the City Planner toolbar, next to Top-Down, Isometric and Table, is the Upgrade Suggestions view.'
        />
      </ListItem>
      <ListItem>
        <ListItemText
          primary='Inventory data is needed first'
          secondary='Open your in-game inventory once (the Summonings tab) so the extension can read what you own. Without it the list has nothing to offer you.'
        />
      </ListItem>
    </List>

    <Box sx={{ mt: 2 }} />

    <Typography variant='h6' gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <RuleIcon color='primary' fontSize='small' /> What counts as an upgrade
    </Typography>
    <List dense disablePadding>
      <ListItem>
        <ListItemText
          primary='Nothing is given up'
          secondary='The replacement must match or beat the placed building on mana, seeds, orcs, unurium, nox and culture, and may never cost you population. A building that trades one resource for another is not offered.'
        />
      </ListItem>
      <ListItem>
        <ListItemText
          primary='Better per square'
          secondary='Production is compared over 24 hours, per square as well as in total, so a larger building has to earn its extra ground.'
        />
      </ListItem>
      <ListItem>
        <ListItemText
          primary='Switchable production is respected'
          secondary='A building that switches between products is only replaced by one that covers every option, whether at once or by switching too.'
        />
      </ListItem>
      <ListItem>
        <ListItemText
          primary='Left alone'
          secondary='Set buildings, evolving buildings and expiring buildings already in your city are never suggested for replacement, and buildings you can simply build - residences, workshops, manufactories - are ignored on both sides.'
        />
      </ListItem>
      <ListItem>
        <ListItemText
          primary='Thin buildings'
          secondary='A 1xN building is never offered in place of one that is at least two tiles on both sides, since it collects less neighbourly help.'
        />
      </ListItem>
      <ListItem>
        <ListItemText
          primary='Buildings inside Tomes'
          secondary='A building a Tome can be opened for is weighed like one in the inventory, at the chapter the Tome was won in, and its row names the Tome under the replacement. Replace hands it to you to place just the same; opening the Tome for it is yours to do.'
        />
      </ListItem>
    </List>

    <Box sx={{ mt: 2 }} />

    <Typography variant='h6' gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <InsightsIcon color='primary' fontSize='small' /> Reading a row
    </Typography>
    <List dense disablePadding>
      <ListItem>
        <ListItemText
          primary='Every resource, twice'
          secondary='Each column shows the total gain per day and, underneath, the gain per square. Hover a figure to see the before and after values it came from.'
        />
      </ListItem>
      <ListItem>
        <ListItemText
          primary='Evolving replacements'
          secondary='An evolving building is compared at the highest stage your artifacts can reach, and the row says so: "Stage 1 to 5 (max)" means it cannot go further, while "Stage 1 to 3 of 10" means more artifacts would take it higher.'
        />
      </ListItem>
      <ListItem>
        <ListItemText
          primary='Also makes'
          secondary='Anything outside the tracked resources - coins, supplies, goods, spell fragments - is listed under each building, so you can see what a swap quietly gains or gives up.'
        />
      </ListItem>
    </List>

    <Box sx={{ mt: 2 }} />

    <Typography variant='h6' gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <StraightenIcon color='primary' fontSize='small' /> Size at a glance
    </Typography>
    <List dense disablePadding>
      <ListItem>
        <ListItemText
          primary='Green'
          secondary='The replacement fits inside the footprint it inherits, so it drops straight in and may even free a square.'
        />
      </ListItem>
      <ListItem>
        <ListItemText primary='Red' secondary='It grows on at least one side, so you will have to make room for it.' />
      </ListItem>
      <ListItem>
        <ListItemText
          primary='Sorting by size'
          secondary='Sorting the Size column puts the swaps that keep the footprint first, then the ones that shrink it, then those that grow by the least.'
        />
      </ListItem>
    </List>

    <Box sx={{ mt: 2 }} />

    <Typography variant='h6' gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <GroupWorkIcon color='primary' fontSize='small' /> Grouping
    </Typography>
    <List dense disablePadding>
      <ListItem>
        <ListItemText
          primary='Group by either side'
          secondary='The City Building and Replacement headers carry a group icon. Click one to gather the rows under it, and click again to ungroup. Group headings collapse when clicked.'
        />
      </ListItem>
      <ListItem>
        <ListItemText
          primary='Each copy on its own'
          secondary='Grouping follows the individual placed building or inventory entry, so two copies of the same building are kept apart and can be dealt with separately.'
        />
      </ListItem>
    </List>

    <Box sx={{ mt: 2 }} />

    <Typography variant='h6' gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <SwapHorizIcon color='primary' fontSize='small' /> Making the swap
    </Typography>
    <List dense disablePadding>
      <ListItem>
        <ListItemText
          primary='Replace'
          secondary='Removes the placed building and hands you the replacement, already held for placing - at the evolved stage the row was compared at.'
        />
      </ListItem>
      <ListItem>
        <ListItemText
          primary='The red marker'
          secondary='The squares the old building stood on are marked in red, and the view jumps there at 1:1 zoom. The marker clears once you drop something on it, or press Escape to dismiss it.'
        />
      </ListItem>
      <ListItem>
        <ListItemText
          primary='You place it'
          secondary='Positioning is yours, as is making room when the replacement is larger. Nothing is changed in your real city - this is a plan until you carry it out yourself.'
        />
      </ListItem>
    </List>
  </Box>
);
