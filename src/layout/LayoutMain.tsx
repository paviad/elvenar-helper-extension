import * as React from 'react';
import { Box, AppBar, Toolbar, IconButton, Typography, Button, Menu, MenuItem } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { NavLink, Outlet } from 'react-router';
import { useGlobalStore } from '../util/globalStore';
import { getAllStoredAccounts } from '../elvenar/AccountManager';

export const LayoutMain = () => {
  const setAccountId = useGlobalStore((state) => state.setAccountId);
  const accountId = useGlobalStore((state) => state.accountId);
  // Dummy account list for dropdown
  const accountList = getAllStoredAccounts();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [accountName, setAccountName] = React.useState('Select Account');
  const open = Boolean(anchorEl);

  const handleAccountClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleAccountClose = () => {
    setAnchorEl(null);
  };
  const handleAccountSelect = (accountId: string) => {
    setAccountId(accountId);
    setAnchorEl(null);
  };

  React.useEffect(() => {
    if (!accountId) {
      console.log('No accountId selected, defaulting to first account if available', accountList);
      setAccountId(accountList[0]?.[0]);
    }
    const accountData = accountList.find(([id]) => id === accountId)?.[1];
    const name = accountData?.cityQuery?.accountName || 'Select Account';
    setAccountName(name);
  }, [accountId]);

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
          <Box sx={{ flexGrow: 1 }} />
          <Typography variant='h6' sx={{ ml: 'auto', cursor: 'pointer' }} onClick={handleAccountClick}>
            {accountName}
          </Typography>
          <Menu
            anchorEl={anchorEl}
            open={open}
            onClose={handleAccountClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            {accountList.map(([accountIdx, accountData]) => (
              <MenuItem
                key={accountIdx}
                selected={accountId === accountIdx}
                onClick={() => handleAccountSelect(accountIdx)}
              >
                {accountData.cityQuery?.accountName}
              </MenuItem>
            ))}
          </Menu>
        </Toolbar>
      </AppBar>
      <Toolbar />
      <Outlet />
    </Box>
  );
};
