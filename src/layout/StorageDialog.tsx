import React from 'react';
import StorageIcon from '@mui/icons-material/Storage';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  LinearProgress,
  List,
  ListItem,
  Typography,
} from '@mui/material';
import { generateStorageReport, StorageReport } from '../util/storageReporter';

interface StorageDialogProps {
  open: boolean;
  onClose: () => void;
}

export const StorageDialog: React.FC<StorageDialogProps> = ({ open, onClose }) => {
  const [storageReport, setStorageReport] = React.useState<StorageReport | null>(null);
  const [storageLoading, setStorageLoading] = React.useState(false);

  const fetchStorageReport = React.useCallback(async () => {
    setStorageLoading(true);
    try {
      const data = await generateStorageReport();
      setStorageReport(data);
    } catch (err) {
      console.error('ElvenAssist: Failed to run storage diagnostics:', err);
    } finally {
      setStorageLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (open) {
      void fetchStorageReport();
    }
  }, [open, fetchStorageReport]);

  // Separate and sort accounts vs other system files
  const { accountItems, otherItems } = React.useMemo(() => {
    if (!storageReport) return { accountItems: [], otherItems: [] };

    // Leverage the new isAccount flag for reliable categorization
    const accounts = storageReport.breakdown.filter((item) => item.isAccount);
    const others = storageReport.breakdown.filter((item) => !item.isAccount);

    // Sort descending by storage footprint size (bytes)
    accounts.sort((a, b) => b.bytes - a.bytes);
    others.sort((a, b) => b.bytes - a.bytes);

    return { accountItems: accounts, otherItems: others };
  }, [storageReport]);

  const renderItemRow = (item: (typeof accountItems)[0]) => (
    <ListItem
      key={item.key}
      sx={{
        py: 1,
        px: 2,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <Typography
        variant='caption'
        sx={{
          fontWeight: 600,
          color: 'text.primary',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          pr: 2,
        }}
      >
        {item.label}
      </Typography>
      <Typography
        variant='caption'
        sx={{
          color: 'text.secondary',
          fontWeight: 700,
          fontSize: '0.75rem',
          whiteSpace: 'nowrap',
          minWidth: 'fit-content',
        }}
      >
        {item.formattedSize}
      </Typography>
    </ListItem>
  );

  const exceedsLimitThreshold = storageReport && storageReport.totalBytes > 10 * 1024 * 1024;

  return (
    <Dialog open={open} onClose={onClose} maxWidth='xs' fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <StorageIcon color='warning' />
        <Typography variant='h6' component='span' sx={{ fontWeight: 700 }}>
          Storage Diagnostics
        </Typography>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 2 }}>
        {storageLoading ? (
          <Box sx={{ width: '100%', py: 4, textAlign: 'center' }}>
            <LinearProgress color='warning' />
            <Typography variant='body2' color='text.secondary' sx={{ mt: 2 }}>
              Calculating footprint allocations...
            </Typography>
          </Box>
        ) : storageReport ? (
          <Box>
            {/* New Unlimited-Aware Storage Footprint Header */}
            <Box
              sx={{
                mb: 3,
                p: 1.5,
                borderRadius: 1.5,
                bgcolor: 'action.hover',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Box>
                <Typography variant='body2' sx={{ fontWeight: 700, color: 'text.primary' }}>
                  Total Disk Usage
                </Typography>
                <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block' }}>
                  Unlimited Quota Active
                </Typography>
              </Box>
              <Typography
                variant='h6'
                sx={{
                  fontWeight: 800,
                  color: exceedsLimitThreshold ? 'warning.main' : 'success.main',
                }}
              >
                {storageReport.formattedTotal}
              </Typography>
            </Box>

            <Typography variant='caption' sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 1 }}>
              Individual Key Footprints
            </Typography>

            <List
              disablePadding
              sx={{
                maxHeight: 280,
                overflowY: 'auto',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1.5,
              }}
            >
              {accountItems.length === 0 && otherItems.length === 0 ? (
                <ListItem sx={{ py: 1.5, px: 2 }}>
                  <Typography variant='caption' color='text.secondary'>
                    No persistent data keys found
                  </Typography>
                </ListItem>
              ) : (
                <>
                  {/* Category Section 1: Cities (Account files) */}
                  {accountItems.map((item, index) => (
                    <React.Fragment key={item.key}>
                      {renderItemRow(item)}
                      {index < accountItems.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}

                  {/* Section Divider with header */}
                  {accountItems.length > 0 && otherItems.length > 0 && (
                    <Box
                      sx={{
                        bgcolor: 'action.hover',
                        py: 0.75,
                        px: 2,
                        borderTop: '1px solid',
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        userSelect: 'none',
                      }}
                    >
                      <Typography
                        variant='caption'
                        sx={{
                          fontWeight: 750,
                          color: 'text.secondary',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          fontSize: '0.65rem',
                        }}
                      >
                        System & Configuration
                      </Typography>
                    </Box>
                  )}

                  {/* Category Section 2: Other configurations */}
                  {otherItems.map((item, index) => (
                    <React.Fragment key={item.key}>
                      {renderItemRow(item)}
                      {index < otherItems.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </>
              )}
            </List>
          </Box>
        ) : (
          <Typography color='error' variant='body2'>
            Could not retrieve storage analysis metrics.
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} size='small'>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};
