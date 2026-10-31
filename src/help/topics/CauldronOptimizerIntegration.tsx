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
      ElvenAssist fills the optimizer in for you. The optimizer's <strong>Fill from the game</strong> button, beside
      Save, does the same with the cauldron you opened last:
    </Typography>
    <Alert severity='warning' sx={{ my: 1 }}>
      In Firefox, check that ElvenAssist may access the optimizer: open Add-ons and Themes, choose ElvenAssist, and on
      its Permissions tab switch on <strong>cauldron-optimizer.vercel.app</strong>.
    </Alert>
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
      <PublicIcon color='primary' fontSize='small' /> Worlds
    </Typography>
    <Typography component='p' variant='body1' gutterBottom>
      The optimizer keeps its settings per "world", and ElvenAssist fills in the one you have selected there and saves
      it. If you never named that world, it is named after your player and server, such as{' '}
      <strong>EA-Balrogville-en3</strong>; a name you chose is kept. With several cities, select the world for the city
      before you open its cauldron.
    </Typography>
    <Typography component='p' variant='body1' gutterBottom>
      Each panel of the optimizer has an ElvenAssist switch: turn it off to keep ElvenAssist from changing that panel.
      While the optimizer's "Complete effects" mode is on, it leaves everything as it is until you turn that mode off.
    </Typography>
    <Box sx={{ mt: 3 }} />
    <Alert severity='info' icon={<SecurityIcon fontSize='inherit' />}>
      <strong>Fair Play & Safety:</strong> The extension only reads what the game already sends when you open the
      cauldron. It never brews or clicks anything in the game.
    </Alert>
  </Box>
);
