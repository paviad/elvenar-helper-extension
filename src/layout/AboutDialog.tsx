import React from 'react';
import { Dialog, DialogContent, DialogContentText, DialogActions, Button } from '@mui/material';

const EXTENSION_NAME = 'Elvenar Helper Extension';
const EXTENSION_VERSION = '3.2.0';
const EXTENSION_DATE = '5-Jan-2026';

export function AboutDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogContent>
        <DialogContentText
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            p: 2,
          }}
        >
          <span style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: 8 }}>{EXTENSION_NAME}</span>
          <span style={{ fontSize: '1.1rem', margin: '8px 0 0 0' }}>Version: {EXTENSION_VERSION}</span>
          {EXTENSION_DATE && (
            <span style={{ fontSize: '1.05rem', margin: '4px 0 0 0', color: '#888' }}>
              Release Date: {EXTENSION_DATE}
            </span>
          )}
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
        <Button onClick={onClose} autoFocus variant="contained" color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
