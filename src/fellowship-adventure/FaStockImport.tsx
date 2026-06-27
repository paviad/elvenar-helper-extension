// src/fellowship-adventure/FaStockImport.tsx
import React, { useState } from 'react';
import { Alert, Button, Paper, TextField, Typography } from '@mui/material';
import { Badges } from '../model/badges';

interface FaStockImportProps {
  onImportSuccess: (ownerName: string, badges: Partial<Badges>) => void;
}

export const FaStockImport: React.FC<FaStockImportProps> = ({ onImportSuccess }) => {
  const [pastedText, setPastedText] = useState('');
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({
    type: null,
    message: '',
  });

  const handleImport = () => {
    try {
      if (!pastedText.trim()) throw new Error('Please paste data first.');

      const lines = pastedText.trim().split('\n');

      let importedAccountsCount = 0;
      let currentOwnerName: string | null = null;
      let currentBadges: Partial<Badges> = {};

      const commitCurrentAccount = () => {
        if (currentOwnerName && Object.keys(currentBadges).length > 0) {
          onImportSuccess(currentOwnerName, currentBadges);
          importedAccountsCount++;
        }
      };

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const headerMatch = line.match(/\*\*My Current FA Badge Stock \((.+?)\):\*\*/);

        if (headerMatch && headerMatch[1]) {
          commitCurrentAccount();
          currentOwnerName = headerMatch[1];
          currentBadges = {};
          continue;
        }

        const lineMatch = line.match(/-\s+(.+?) \((.+?)\):\s+(\d+)/);
        if (lineMatch && currentOwnerName) {
          const badgeKey = lineMatch[2];
          const count = parseInt(lineMatch[3], 10);
          currentBadges[badgeKey as keyof Badges] = count;
        }
      }

      commitCurrentAccount();

      if (importedAccountsCount === 0) {
        throw new Error('No valid badge data found. Make sure headers and badge formats are correct.');
      }

      setStatus({
        type: 'success',
        message: `Successfully imported stock for ${importedAccountsCount} member${importedAccountsCount > 1 ? 's' : ''}!`,
      });
      setPastedText('');
      setTimeout(() => setStatus({ type: null, message: '' }), 3000);
    } catch (err: unknown) {
      setStatus({ type: 'error', message: (err as Error).message || 'Failed to parse pasted text.' });
    }
  };

  return (
    <Paper variant='outlined' sx={{ p: 2, maxWidth: 320, bgcolor: 'background.paper', borderRadius: 2 }}>
      <Typography variant='subtitle1' sx={{ fontWeight: 700, mb: 1 }}>
        Import Member Stock
      </Typography>
      <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
        Paste a clipboard export from one or more fellowship members to add their inventory to the group total.
      </Typography>
      <TextField
        fullWidth
        multiline
        rows={4}
        size='small'
        placeholder='**My Current FA Badge Stock (Alice):**&#10;- Breweries (badge_brewery): 5&#10;&#10;**My Current FA Badge Stock (Bob):**&#10;- Farmers (badge_farmers): 2'
        value={pastedText}
        onChange={(e) => setPastedText(e.target.value)}
        sx={{ mb: 2 }}
      />
      {status.type && (
        <Alert severity={status.type} sx={{ mb: 2, py: 0 }}>
          {status.message}
        </Alert>
      )}
      <Button variant='contained' disableElevation fullWidth onClick={handleImport} disabled={!pastedText.trim()}>
        Import Badges
      </Button>
    </Paper>
  );
};
