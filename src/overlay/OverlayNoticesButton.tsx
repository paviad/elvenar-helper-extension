import React from 'react';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { Badge, IconButton, ListItemText, Menu, MenuItem } from '@mui/material';
import { sendRuntime } from '../chrome/messages';
import { useOverlayNotices } from './overlayNotices';
import { OVERLAY_MENU_Z_INDEX } from './overlayStacking';

/**
 * The title bar's bell: there only while something is up, with a count of how many, and opening
 * the list of them. A notice that names a page of the extension's tab opens it when clicked.
 */
export const OverlayNoticesButton = () => {
  const notices = useOverlayNotices();
  const [anchor, setAnchor] = React.useState<HTMLElement | null>(null);

  if (notices.length === 0) {
    return null;
  }

  return (
    <>
      <IconButton
        aria-label='Notices'
        title={notices.map((notice) => notice.title).join('\n')}
        size='small'
        onClick={(event) => setAnchor(event.currentTarget)}
      >
        <Badge
          badgeContent={notices.length}
          color='error'
          sx={{ '& .MuiBadge-badge': { fontSize: 10, minWidth: 16, height: 16 } }}
        >
          <NotificationsIcon fontSize='small' />
        </Badge>
      </IconButton>
      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        // In place rather than in a portal, for the same reason as the size menu: a portal would
        // put it behind the panel.
        disablePortal
        sx={{ zIndex: OVERLAY_MENU_Z_INDEX }}
      >
        {notices.map((notice) => (
          <MenuItem
            key={notice.title}
            // The game's page centres text, which the panel would otherwise pass on to these lines.
            sx={{ whiteSpace: 'normal', maxWidth: 340, textAlign: 'left' }}
            onClick={() => {
              setAnchor(null);
              const { page, onClick } = notice;
              if (onClick) {
                onClick();
              } else if (page) {
                void sendRuntime('openExtensionTab', { page });
              }
            }}
          >
            <ListItemText primary={notice.title} secondary={notice.detail} />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};
