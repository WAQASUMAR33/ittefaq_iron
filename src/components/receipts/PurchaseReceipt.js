'use client';

import React from 'react';
import { Box, Typography, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Paper } from '@mui/material';
import { Phone as PhoneIcon } from '@mui/icons-material';
import { getCreatedByName } from '@/lib/date-helper';

const fmtAmt = (val) => {
  const n = parseFloat(val || 0);
  if (n % 1 === 0) return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

/**
 * Universal Purchase Receipt Component.
 * Recalled across New Purchase page, Purchase List page, and Ledger page.
 */
const PurchaseReceipt = React.memo(function PurchaseReceipt({
  purchaseData,
  currentUser,
  elementId = 'receipt-preview',
  className = '',
}) {
  if (!purchaseData) return null;

  return (
    <Box
      id={elementId}
      className={`thermal-receipt ${className}`}
      sx={{
        width: '100%',
        bgcolor: 'white',
        p: 3,
        mt: 2,
        color: '#000',
        fontWeight: 'bold',
        '& *': { fontWeight: 'bold !important', color: '#000 !important' },
      }}
    >
      {/* Company Header */}
      <Box sx={{ textAlign: 'center', py: 2, borderBottom: '2px solid #000' }}>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 'bold',
            mb: 1,
            fontFamily: 'Arial, sans-serif',
            direction: 'rtl',
          }}
        >
          اتفاق آئرن اینڈ سیمنٹ سٹور
        </Typography>
        <Typography variant="body2" sx={{ mb: 1, direction: 'rtl' }}>
          گجرات سرگودھا روڈ، پاہڑیانوالی
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
          <PhoneIcon sx={{ color: '#25D366', fontSize: '1rem' }} />
          <Typography variant="body2">Ph:- 0346-7560306, 0300-7560306</Typography>
        </Box>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 'bold',
            textTransform: 'uppercase',
            letterSpacing: 1,
            mt: 1,
          }}
        >
          PURCHASE INVOICE
        </Typography>
      </Box>

      {/* Customer / Supplier and Invoice Details */}
      <Box sx={{ px: 3, py: 2, borderBottom: '1px solid #ddd', display: 'flex', justifyContent: 'space-between' }}>
        <Box sx={{ flex: '0 0 50%' }}>
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            Customer Name: <strong>{purchaseData.customer?.cus_name || 'N/A'}</strong>
          </Typography>
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            Phone No: <strong>{purchaseData.customer?.cus_phone_no || 'N/A'}</strong>
          </Typography>
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            Address: <strong>{purchaseData.customer?.cus_address || 'N/A'}</strong>
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', textAlign: 'right', flex: '0 0 50%' }}>
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            Invoice No: <strong>#{purchaseData.pur_id}</strong>
          </Typography>
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            Date: <strong>{new Date(purchaseData.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</strong>
          </Typography>
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            Time: <strong>{new Date(purchaseData.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</strong>
          </Typography>
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            Bill Type: <strong>{purchaseData.bill_type || 'PURCHASE'}</strong>
          </Typography>
          <Typography variant="body2">
            Created By: <strong>{getCreatedByName(purchaseData, currentUser)}</strong>
          </Typography>
        </Box>
      </Box>

      {/* Product Table */}
      <Box sx={{ px: 3, py: 2 }}>
        <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#9e9e9e' }}>
                <TableCell sx={{ fontWeight: 'bold', color: 'white', py: 1, px: 1, border: '1px solid #bbb' }}>S#</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'white', py: 1, px: 1, border: '1px solid #bbb' }}>Product Name</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'white', py: 1, px: 1, border: '1px solid #bbb' }} align="right">Qty</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'white', py: 1, px: 1, border: '1px solid #bbb' }} align="right">Rate</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'white', py: 1, px: 1, border: '1px solid #bbb' }} align="right">Amount</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {purchaseData.purchase_details && purchaseData.purchase_details.length > 0 ? (
                <>
                  {purchaseData.purchase_details.map((detail, index) => (
                    <TableRow key={detail.pur_detail_id || index}>
                      <TableCell sx={{ px: 1, border: '1px solid #ddd' }}>{index + 1}</TableCell>
                      <TableCell sx={{ px: 1, border: '1px solid #ddd' }}>{detail.product?.pro_title || detail.pro_title || 'N/A'}</TableCell>
                      <TableCell sx={{ px: 1, border: '1px solid #ddd' }} align="right">{detail.qnty || 0}</TableCell>
                      <TableCell sx={{ px: 1, border: '1px solid #ddd' }} align="right">{fmtAmt(detail.crate || detail.unit_rate || detail.rate || 0)}</TableCell>
                      <TableCell sx={{ px: 1, border: '1px solid #ddd' }} align="right">{fmtAmt(detail.total_amount || detail.amount || 0)}</TableCell>
                    </TableRow>
                  ))}

                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell sx={{ px: 1, border: '1px solid #ddd' }} />
                    <TableCell sx={{ px: 1, fontWeight: 'bold', border: '1px solid #ddd' }}>Total</TableCell>
                    <TableCell sx={{ px: 1, fontWeight: 'bold', border: '1px solid #ddd' }} align="right">
                      {(purchaseData.purchase_details || []).reduce((s, d) => s + parseFloat(d.qnty || 0), 0)}
                    </TableCell>
                    <TableCell sx={{ px: 1, border: '1px solid #ddd' }} align="right" />
                    <TableCell sx={{ px: 1, fontWeight: 'bold', border: '1px solid #ddd' }} align="right">
                      {fmtAmt((purchaseData.purchase_details || []).reduce((s, d) => s + parseFloat(d.total_amount || d.amount || 0), 0))}
                    </TableCell>
                  </TableRow>
                </>
              ) : (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    No items found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Purchase Summary */}
        <Box sx={{ mt: 2, width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
          <Box sx={{ width: '320px' }}>
            <TableContainer component={Paper} variant="outlined" sx={{ border: '1px solid #000' }}>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold', px: 1, py: 0.5, border: '1px solid #ddd' }}>Net Purchase Amount</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', px: 1, py: 0.5, border: '1px solid #ddd' }}>
                      {fmtAmt(purchaseData.total_amount || 0)}
                    </TableCell>
                  </TableRow>
                  {parseFloat(purchaseData.paid_amount || purchaseData.payment || 0) > 0 && (
                    <TableRow sx={{ bgcolor: '#e8f5e9' }}>
                      <TableCell sx={{ fontWeight: 'bold', px: 1, py: 0.5, border: '1px solid #ddd', color: '#2e7d32' }}>Paid Amount</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold', px: 1, py: 0.5, border: '1px solid #ddd', color: '#2e7d32' }}>
                        {fmtAmt(purchaseData.paid_amount || purchaseData.payment || 0)}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Box>

        <Box sx={{ textAlign: 'center', borderTop: '1px solid #000', mt: 2, pt: 1 }}>
          <Typography sx={{ fontSize: '11px', fontWeight: 'bold' }}>Thank you for your partnership!</Typography>
        </Box>
      </Box>
    </Box>
  );
});

export default PurchaseReceipt;
