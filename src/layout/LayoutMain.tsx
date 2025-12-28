import * as React from 'react';
import { Box, AppBar, Toolbar, IconButton, Typography, Button } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { NavLink, Outlet } from 'react-router';

export const LayoutMain = () => {
  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position='fixed'>
        <Toolbar>
          <IconButton size='large' edge='start' color='inherit' aria-label='menu' sx={{ mr: 2 }}>
            <MenuIcon />
          </IconButton>
          <Button component={NavLink} to='/city' color='inherit' sx={{ mr: 2 }}>
            City
          </Button>
          <Button component={NavLink} to='/inventory' color='inherit' sx={{ mr: 2 }}>
            Inventory
          </Button>
          {/* <Button component={NavLink} to='/trade' color='inherit' sx={{ mr: 2 }}>
            Trade
          </Button> */}
        </Toolbar>
      </AppBar>
      <Toolbar />
      <Outlet />
    </Box>
  );
};
