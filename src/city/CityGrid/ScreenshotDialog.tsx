import React from 'react';
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';

interface ScreenshotDialogProps {
  open: boolean;
  onClose: () => void;
  /** The picture, once taken. */
  image: Blob | null;
  /** Why there is no picture, when taking it failed. */
  error: string | null;
  /** The name the picture is saved under. */
  fileName: string;
}

/** Shows the screenshot as soon as it is taken and offers it as a download or on the clipboard. */
export const ScreenshotDialog: React.FC<ScreenshotDialogProps> = ({ open, onClose, image, error, fileName }) => {
  // The preview and the download link both need an object URL for the picture; it is
  // released as soon as the picture it names is replaced or gone.
  const url = React.useMemo(() => (image ? URL.createObjectURL(image) : null), [image]);
  React.useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );

  // Which picture was copied, so the button reads "Copied!" for that one only.
  const [copiedImage, setCopiedImage] = React.useState<Blob | null>(null);
  const copied = image !== null && copiedImage === image;
  const canCopy = typeof ClipboardItem !== 'undefined' && typeof navigator.clipboard?.write === 'function';
  const copy = () => {
    if (!image) return;
    navigator.clipboard
      .write([new ClipboardItem({ 'image/png': image })])
      .then(() => setCopiedImage(image))
      .catch((err: unknown) => console.error('ElvenAssist: Failed to copy the screenshot: ', err));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth='lg'>
      <DialogTitle>City Screenshot</DialogTitle>
      <DialogContent>
        {error ? (
          <Alert severity='error'>{error}</Alert>
        ) : url ? (
          <img src={url} alt='The city' style={{ display: 'block', maxWidth: '100%', maxHeight: '65vh' }} />
        ) : (
          <Stack direction='row' spacing={1.5} sx={{ py: 2, alignItems: 'center' }}>
            <CircularProgress size={20} />
            <Typography>Taking the screenshot...</Typography>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        {canCopy && (
          <Button onClick={copy} disabled={!image}>
            {copied ? 'Copied!' : 'Copy Image'}
          </Button>
        )}
        <Button component='a' href={url ?? undefined} download={fileName} variant='contained' disabled={!url}>
          Download
        </Button>
      </DialogActions>
    </Dialog>
  );
};
