import React from 'react';
import CloseIcon from '@mui/icons-material/Close';
import { Box, IconButton, Modal, Paper, Typography } from '@mui/material';
import { EXTENSION_NAME, EXTENSION_VERSION } from '../layout/extensionAboutInfo';
import { OVERLAY_TABS, shortcutLetter } from './overlayTabs';
import { GUIDE_AUTHORS } from './tournamentGuide';

interface HelpDialogProps {
  open: boolean;
  onClose: () => void;
}

const MUTED = '#8b949e';
const TEXT = '#e0e0e0';
const RULE = '#3a4048';

/** Things reached from somewhere other than a tab. */
const EXTRAS = [
  {
    title: 'City Planner',
    body: 'Click the icon in the panel’s title bar to open the planner.',
  },
  {
    title: 'Trade highlighting',
    body: 'From chapter 18, opening Trade Offers in game highlights the trades worth taking.',
  },
  {
    title: 'Panel size',
    body: 'Drag the bottom-right corner to resize; the size is remembered. The header button switches between Small and Large.',
  },
];

const Kbd = ({ children }: { children: React.ReactNode }) => (
  <Box
    component='span'
    sx={{
      fontFamily: 'monospace',
      fontSize: 11,
      lineHeight: 1.6,
      color: TEXT,
      background: '#2f353c',
      border: `1px solid ${RULE}`,
      borderRadius: 0.75,
      px: 0.75,
      py: 0.125,
      whiteSpace: 'nowrap',
    }}
  >
    {children}
  </Box>
);

const SectionHeading = ({ children }: { children: React.ReactNode }) => (
  <Typography
    sx={{ fontSize: 11, letterSpacing: 1.1, textTransform: 'uppercase', fontWeight: 700, color: MUTED, mb: 1.25 }}
  >
    {children}
  </Typography>
);

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
          width: 720,
          maxWidth: '92vw',
          maxHeight: '90vh',
          p: 0,
          outline: 'none',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          bgcolor: '#23272b',
          color: TEXT,
          borderRadius: 2,
          boxShadow: 24,
          textAlign: 'start',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            px: 2,
            py: 1.5,
            borderBottom: `1px solid ${RULE}`,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box component='img' src={iconAsset} alt='' sx={{ width: 22, height: 22 }} />
            <Typography id='help-modal-title' variant='h6' component='h2' sx={{ color: TEXT, fontWeight: 600 }}>
              {EXTENSION_NAME}
            </Typography>
            <Typography sx={{ color: MUTED, fontSize: 13 }}>v{EXTENSION_VERSION}</Typography>
          </Box>
          <IconButton onClick={onClose} aria-label='Close help' size='small' sx={{ color: MUTED }}>
            <CloseIcon fontSize='small' />
          </IconButton>
        </Box>

        <Box id='help-modal-description' sx={{ flex: 1, px: 3, py: 2.5, overflowY: 'auto' }}>
          <SectionHeading>Panels</SectionHeading>
          <Typography sx={{ fontSize: 12.5, color: MUTED, mb: 1.5 }}>
            Hold <Kbd>Alt</Kbd> <Kbd>C</Kbd>, then press the underlined letter to jump straight to a panel.
          </Typography>

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 3, rowGap: 1.75 }}>
            {OVERLAY_TABS.map((tab) => (
              <Box key={tab.key}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
                  <Typography component='span' sx={{ fontSize: 13.5, fontWeight: 700, color: TEXT }}>
                    {tab.label}
                  </Typography>
                  {tab.shortcut && <Kbd>{shortcutLetter(tab.shortcut)}</Kbd>}
                  {tab.isNew && (
                    <Box
                      component='span'
                      sx={{
                        fontSize: 9.5,
                        fontWeight: 700,
                        color: '#fff',
                        background: '#9c27b0',
                        borderRadius: 5,
                        px: 0.625,
                        py: 0.125,
                      }}
                    >
                      NEW
                    </Box>
                  )}
                </Box>
                <Typography sx={{ fontSize: 12.5, color: MUTED, lineHeight: 1.45 }}>{tab.help}</Typography>
              </Box>
            ))}
          </Box>

          <Box sx={{ mt: 3 }}>
            <SectionHeading>Elsewhere</SectionHeading>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 3, rowGap: 1.75 }}>
              {EXTRAS.map((extra) => (
                <Box key={extra.title}>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: TEXT, mb: 0.25 }}>{extra.title}</Typography>
                  <Typography sx={{ fontSize: 12.5, color: MUTED, lineHeight: 1.45 }}>{extra.body}</Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>

        {/* Kept to two lines: any taller and the help text above it goes behind a scrollbar. */}
        <Box sx={{ px: 3, py: 1.5, borderTop: `1px solid ${RULE}`, textAlign: 'center' }}>
          <Typography sx={{ fontSize: 12.5, color: MUTED, fontStyle: 'italic' }}>
            Special thanks to <Box component='span' sx={{ color: '#ccc', fontWeight: 600 }}>A S L A N</Box>
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: MUTED, fontStyle: 'italic' }}>
            Tournament guide by{' '}
            {GUIDE_AUTHORS.map((author, index) => (
              <React.Fragment key={author.name}>
                {index > 0 && (index === GUIDE_AUTHORS.length - 1 ? ' and ' : ', ')}
                <Box component='span' sx={{ color: '#ccc', fontWeight: 600 }}>
                  {author.name}
                </Box>{' '}
                ({author.world})
              </React.Fragment>
            ))}
          </Typography>
        </Box>
      </Paper>
    </Modal>
  );
};
