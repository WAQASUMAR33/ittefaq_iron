'use client';

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
} from '@mui/material';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

export default function FingerprintDialog({
  open,
  mode,       // 'setup' | 'error'
  errorMsg,
  loading,
  onSetup,
  onClose,
}) {
  const isSetup = mode === 'setup';

  return (
    <Dialog
      open={open}
      onClose={isSetup ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle sx={{ textAlign: 'center', pt: 4, pb: 1 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
          {isSetup ? (
            <FingerprintIcon sx={{ fontSize: 56, color: 'primary.main' }} />
          ) : (
            <ErrorOutlineIcon sx={{ fontSize: 56, color: 'error.main' }} />
          )}
          <Typography variant="h6" fontWeight={700}>
            {isSetup ? 'Fingerprint Required' : 'Authentication Failed'}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ textAlign: 'center', px: 4 }}>
        <Typography variant="body2" color="text.secondary">
          {isSetup
            ? 'Fingerprint authentication is required to save records. Please register your fingerprint to continue.'
            : errorMsg || 'Authentication was not successful.'}
        </Typography>
      </DialogContent>

      <DialogActions sx={{ justifyContent: 'center', px: 3, pb: 3, gap: 1.5 }}>
        {isSetup ? (
          <>
            <Button onClick={onClose} color="inherit" disabled={loading} variant="outlined">
              Cancel
            </Button>
            <Button
              onClick={onSetup}
              variant="contained"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <FingerprintIcon />}
            >
              {loading ? 'Setting Up…' : 'Set Up Fingerprint'}
            </Button>
          </>
        ) : (
          <Button onClick={onClose} variant="contained" color="error">
            Close
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
