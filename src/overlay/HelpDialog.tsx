import CloseIcon from '@mui/icons-material/Close';
import { Box, IconButton, Modal, Paper, Typography } from '@mui/material';
import React from 'react';
import { EXTENSION_NAME, EXTENSION_VERSION } from '../layout/extensionAboutInfo';

interface HelpDialogProps {
  open: boolean;
  onClose: () => void;
}

export const HelpDialog: React.FC<HelpDialogProps> = ({ open, onClose }) => {
  const iconAsset = chrome.runtime.getURL('icon32.png');
  return (
    <Modal open={open} onClose={onClose} aria-labelledby='help-modal-title' aria-describedby='help-modal-description'>
      <Paper
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 600,
          height: 400,
          p: 0,
          outline: 'none',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          bgcolor: '#23272b',
          color: '#e0e0e0',
          borderRadius: 2,
          boxShadow: 24,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 2,
            pb: 1,
            borderBottom: '1px solid #444',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <IconButton onClick={onClose} aria-label='Close help' sx={{ color: '#e0e0e0', mr: 1 }}>
              <CloseIcon />
            </IconButton>
            <Typography id='help-modal-title' variant='h6' component='h2' sx={{ color: '#e0e0e0', fontWeight: 600 }}>
              {EXTENSION_NAME} Help
            </Typography>
          </Box>
          <Typography sx={{ color: '#aaa', fontSize: 14, fontWeight: 400, ml: 2, minWidth: 80, textAlign: 'right' }}>
            v{EXTENSION_VERSION}
          </Typography>
        </Box>
        <Box sx={{ flex: 1, p: 3, overflowY: 'auto' }}>
          {/* --- HELP CONTENT START --- */}
          <Typography id='help-modal-description' sx={{ color: '#e0e0e0', textAlign: 'left' }}>
            <Box component='ol' sx={{ pl: 3, mt: 0, mb: 0, textAlign: 'left' }}>
              <li style={{ marginBottom: 16 }}>
                <img
                  src={iconAsset}
                  alt='City Planner Icon'
                  style={{
                    width: 20,
                    height: 20,
                    verticalAlign: 'middle',
                    marginRight: 6,
                    marginTop: -2,
                    display: 'inline-block',
                  }}
                />
                <b>Open the City Planner:</b>
                <br />
                Click the <span style={{ fontWeight: 600 }}>icon image</span> in the helper window title bar to launch
                the city planner tool.
              </li>
              <li style={{ marginBottom: 16 }}>
                <span role='img' aria-label='trade'>
                  💱
                </span>{' '}
                <b>Trade Offers Highlighting:</b>
                <br />
                If you are at <span style={{ fontWeight: 600 }}>chapter 18 or above</span>, opening the Trade Offers tab
                in the in-game trade window will automatically highlight desirable trades for you.
              </li>
              <li>
                <span role='img' aria-label='chat'>
                  💬
                </span>{' '}
                <b>Quick Chat Toggle:</b>
                <br />
                Press{' '}
                <span style={{ fontFamily: 'monospace', background: '#333', padding: '2px 6px', borderRadius: 4 }}>
                  Alt+C
                </span>{' '}
                to quickly toggle the chat view.
              </li>
            </Box>
          </Typography>
          {/* --- HELP CONTENT END --- */}
        </Box>
      </Paper>
    </Modal>
  );
};
