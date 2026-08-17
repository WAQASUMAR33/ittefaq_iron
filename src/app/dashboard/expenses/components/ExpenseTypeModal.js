'use client';

import React from 'react';
import { Tag, X } from 'lucide-react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box, Typography, IconButton } from '@mui/material';

/**
 * Expense Category/Type Modal Component.
 */
const ExpenseTypeModal = React.memo(function ExpenseTypeModal({
  isOpen,
  onClose,
  newTypeName,
  setNewTypeName,
  onSubmit,
  isSubmitting,
}) {
  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '20px',
          p: 0.5,
        },
      }}
    >
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', itemsAlign: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tag style={{ color: '#ef4444', width: 20, height: 20 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.125rem', color: '#111827' }}>
            Add New Expense Type
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <X size={18} />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ py: 2.5, pt: 3 }}>
        <TextField
          fullWidth
          autoFocus
          label="Type Title *"
          value={newTypeName}
          onChange={(e) => setNewTypeName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onSubmit();
            }
          }}
          placeholder="e.g., Electricity, Rent, Salary"
          size="small"
          variant="outlined"
          sx={{
            mt: 1,
            '& .MuiOutlinedInput-root': { borderRadius: '12px' },
          }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 2.5, py: 1.5, borderTop: '1px solid #f3f4f6' }}>
        <Button
          onClick={onClose}
          sx={{ textTransform: 'none', color: '#4b5563', fontWeight: 600 }}
        >
          Cancel
        </Button>
        <Button
          onClick={onSubmit}
          disabled={isSubmitting || !newTypeName.trim()}
          variant="contained"
          sx={{
            textTransform: 'none',
            fontWeight: 700,
            px: 3,
            borderRadius: '10px',
            background: 'linear-gradient(to right, #ef4444, #ec4899)',
            '&:hover': {
              background: 'linear-gradient(to right, #dc2626, #db2777)',
            },
          }}
        >
          {isSubmitting ? 'Saving...' : 'Add Type'}
        </Button>
      </DialogActions>
    </Dialog>
  );
});

export default ExpenseTypeModal;
