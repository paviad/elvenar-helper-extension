import React from 'react';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import PublicIcon from '@mui/icons-material/Public';
import SecurityIcon from '@mui/icons-material/Security';
import { Alert, Box, Divider, Link, List, ListItem, ListItemText, Typography } from '@mui/material';

export const CauldronOptimizerIntegration = () => (
  <Box>
    <Typography variant='h4' gutterBottom>
      Cauldron Optimizer Integration
    </Typography>
    <Typography component='p' variant='body1' gutterBottom>
      ElvenAssist works together with the{' '}
      <Link href='https://cauldron-optimizer.vercel.app/home' target='_blank' rel='noopener'>
        Cauldron Optimizer
      </Link>
      , an external tool that finds the best recipe for the potion effects you want from the Witch's Cauldron.
    </Typography>
    <Divider sx={{ my: 2 }} />
    <Typography variant='h6' gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <AutoFixHighIcon color='primary' fontSize='small' /> Automatic Setup
    </Typography>
    <Typography component='p' variant='body1' gutterBottom>
      Keep the Cauldron Optimizer open in another tab and log in there. When you open the Cauldron in the Magic Academy,
      ElvenAssist fills the optimizer in for you:
    </Typography>
    <List dense disablePadding>
      <ListItem>
        <ListItemText
          primary='Diplomas'
          secondary='How many diplomas you have, so the optimizer offers exactly the effects you have unlocked.'
        />
      </ListItem>
      <ListItem>
        <ListItemText
          primary='Premium ingredients'
          secondary="This week's premium ingredients, so recipes avoid them. The game only tells which they are when you log in while the cauldron is ready to brew, so during the cooldown they are left out. If the cooldown ended since you logged in, reload the game first."
        />
      </ListItem>
      <ListItem>
        <ListItemText
          primary='Selected effects'
          secondary="The effects you left switched on in the cauldron's Upgrade Effects screen. Switching one on or off there updates the optimizer straight away."
        />
      </ListItem>
      <ListItem>
        <ListItemText
          primary='Wonder level and Witch Points'
          secondary='The level of the wonder that makes ingredients cheaper, and your Witch Points as the most a recipe may cost.'
        />
      </ListItem>
    </List>
    <Box sx={{ mt: 2 }} />
    <Typography variant='h6' gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <PublicIcon color='primary' fontSize='small' /> A World for Each City
    </Typography>
    <Typography component='p' variant='body1' gutterBottom>
      The optimizer keeps its settings per "world". ElvenAssist uses a world of its own for each of your cities, named
      after your player and server, such as <strong>EA-Balrogville-en3</strong>. It creates the world the first time and
      switches the optimizer to it whenever you open that city's cauldron, so your own worlds are never changed. Your
      diploma count is saved on that world each time; the effects and weights you pick there are kept as well. While the
      optimizer's "Complete effects" mode is on, it leaves everything as it is until you turn that mode off.
    </Typography>
    <Box sx={{ mt: 3 }} />
    <Alert severity='info' icon={<SecurityIcon fontSize='inherit' />}>
      <strong>Fair Play & Safety:</strong> The extension only reads what the game already sends when you open the
      cauldron. It never brews or clicks anything in the game.
    </Alert>
  </Box>
);
