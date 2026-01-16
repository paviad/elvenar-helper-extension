import * as React from 'react';
import { Box, AppBar, Toolbar, IconButton, Typography, Button, Menu, MenuItem, Alert } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { NavLink, Outlet } from 'react-router';
import { useTabStore } from '../util/tabStore';
import { getAllStoredAccounts, setSaveHook } from '../elvenar/AccountManager';
import { AboutDialog } from './AboutDialog';
import { getFromStorage, saveToStorage } from '../chrome/storage';
import HelperAvatar from '../helper/HelperAvatar';
import { useHelper } from '../helper/HelperContext';

const ERROR_BAR_HEIGHT = 48; // px

export const LayoutMain = () => {
  const forceUpdate = useTabStore((state) => state.forceUpdate);

  const setAccountId = useTabStore((state) => state.setAccountId);
  const accountId = useTabStore((state) => state.accountId);
  const globalError = useTabStore((state) => state.globalError);
  const setGlobalError = useTabStore((state) => state.setGlobalError);
  // Dummy account list for dropdown
  const accountList = getAllStoredAccounts();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [accountName, setAccountName] = React.useState('Select Account');
  const [cityName, setCityName] = React.useState('');
  const open = Boolean(anchorEl);

  const [menuAnchor, setMenuAnchor] = React.useState<null | HTMLElement>(null);
  const [aboutOpen, setAboutOpen] = React.useState(false);

  const setTechSprite = useTabStore((state) => state.setTechSprite);
  const helper = useHelper();

  const [saved, triggerSaved] = React.useReducer((x) => x + 1, 0);

  setSaveHook(() => {
    triggerSaved();
  });

  React.useEffect(() => {
    async function Do() {
      const notifyMultipleAccounts = await getFromStorage('notifyMultipleAccounts');
      if (`${notifyMultipleAccounts}` === 'true') {
        helper.showMessage('multiple_accounts_notice');
        await saveToStorage('notifyMultipleAccounts', 'false');
      }
    }
    Do();
  }, [saved]);

  React.useEffect(() => {
    async function getSpriteUrl() {
      const url = await getFromStorage('techTreeSpriteUrl');
      if (!url) return;
      const img = new window.Image();
      img.onload = () => {
        return setTechSprite({ url, width: img.width, height: img.height });
      };
      img.src = url;
    }
    getSpriteUrl();
  }, []);

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
      const firstNonDetachedAccount = accountList.find(([id, data]) => !data.isDetached);
      if (firstNonDetachedAccount) {
        setAccountId(firstNonDetachedAccount[0]);
      } else {
        setAccountId(accountList[0]?.[0]);
      }
    }
    const accountData = accountList.find(([id]) => id === accountId)?.[1];
    const name = accountData?.cityQuery?.accountName || 'Select Account';
    setAccountName(name);
    const city = accountData?.cityQuery?.cityName || '';
    setCityName(city);
  }, [accountId, forceUpdate]);

  const otherCityUpdated = useTabStore((state) => state.otherCityUpdated);
  const setOtherCityUpdated = useTabStore((state) => state.setOtherCityUpdated);
  React.useEffect(() => {
    if (otherCityUpdated) {
      // Reset the flag
      setOtherCityUpdated(false);
      const visitedCity = accountList.find((r) => r[0] === 'Visited')?.[1].cityQuery?.accountName || '???';
      helper.showMessage('visited_other', { params: [visitedCity] });
    }
  }, [otherCityUpdated]);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchor(event.currentTarget);
  };
  const handleMenuClose = () => {
    setMenuAnchor(null);
  };
  const handleAboutOpen = () => {
    setAboutOpen(true);
    setMenuAnchor(null);
  };
  const handleAboutClose = () => {
    setAboutOpen(false);
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Error bar overlays AppBar, both are fixed at top */}
      {globalError != null && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: ERROR_BAR_HEIGHT,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Alert severity='error' onClose={() => setGlobalError(undefined)} sx={{ width: '100%' }}>
            {globalError}
          </Alert>
        </Box>
      )}
      <AppBar position='fixed' sx={{ top: globalError != null ? `${ERROR_BAR_HEIGHT}px` : 0 }}>
        <Toolbar>
          <IconButton
            size='large'
            edge='start'
            color='inherit'
            aria-label='menu'
            sx={{ mr: 2 }}
            onClick={handleMenuClick}
          >
            <MenuIcon />
          </IconButton>
          <Menu
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={handleMenuClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          >
            <MenuItem onClick={handleAboutOpen}>About</MenuItem>
          </Menu>
          <Button component={NavLink} to='/city' color='inherit' sx={{ mr: 2 }}>
            City
          </Button>
          <Button component={NavLink} to='/inventory' color='inherit' sx={{ mr: 2 }}>
            Inventory
          </Button>
          <Button component={NavLink} to='/fellowship-adventure' color='inherit' sx={{ mr: 2 }}>
            Fellowship Adventure
          </Button>

          {/* <Button component={NavLink} to='/trade' color='inherit' sx={{ mr: 2 }}>
            Trade
          </Button> */}
          <Box sx={{ flexGrow: 1 }} />
          <Box
            sx={{ ml: 'auto', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}
            onClick={handleAccountClick}
          >
            <Typography variant='h6'>{accountName}</Typography>
            {cityName && (
              <Typography variant='caption' sx={{ lineHeight: 1, color: 'rgba(255,255,255,0.7)' }}>
                {cityName}
              </Typography>
            )}
          </Box>
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
          <AboutDialog open={aboutOpen} onClose={handleAboutClose} />
        </Toolbar>
      </AppBar>
      {/* Only one Toolbar for AppBar, content starts below both bars */}
      {globalError != null && <Toolbar sx={{ height: `${ERROR_BAR_HEIGHT}px`, pointerEvents: 'none' }} />}
      <Toolbar sx={{ pointerEvents: 'none' }} />
      <Outlet />
      <HelperAvatar />
    </Box>
  );
};
