'use client';

import React from 'react';
import { Box, Typography } from '@mui/material';
import { getCreatedByName } from '@/lib/date-helper';

const fmtAmt = (val) => {
  const n = parseFloat(val || 0);
  if (n % 1 === 0) return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

/**
 * Universal Receiving Receipt Voucher Component.
 * Recalled in Ledger Page (Finance) for Customer Receiving Transactions.
 */
const ReceivingReceipt = React.memo(function ReceivingReceipt({
  voucherData,
  currentUser,
  elementId = 'payment-receipt-preview',
  className = '',
}) {
  if (!voucherData) return null;

  return (
    <Box id={elementId} className={className} sx={{ bgcolor: 'white', p: 3, color: '#000', fontWeight: 'bold', '& *': { fontWeight: 'bold !important', color: '#000 !important' } }}>
      {/* Header */}
      <Box sx={{ textAlign: 'center', pb: 2, borderBottom: '2px solid #000', mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold', direction: 'rtl', fontFamily: 'Arial' }}>اتفاق آئرن اینڈ سیمنٹ سٹور</Typography>
        <Typography variant="body2" sx={{ direction: 'rtl' }}>گجرات سرگودھا روڈ، پاہڑیانوالی</Typography>
        <Typography variant="body2">Ph:- 0346-7560306, 0300-7560306</Typography>
        <Typography variant="h6" sx={{ fontWeight: 'bold', mt: 1, letterSpacing: 1, color: '#16a34a' }}>
          RECEIPT VOUCHER (وصولی کی رسید)
        </Typography>
      </Box>

      {/* Meta info */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, px: 1 }}>
        <Box>
          <Typography variant="body2"><strong>Account / Customer:</strong> {voucherData.customer?.cus_name || voucherData.accountName || 'N/A'}</Typography>
          <Typography variant="body2"><strong>Phone:</strong> {voucherData.customer?.cus_phone_no || '—'}</Typography>
          {voucherData.description && (
            <Typography variant="body2"><strong>Note:</strong> {voucherData.description}</Typography>
          )}
        </Box>
        <Box sx={{ textAlign: 'right' }}>
          <Typography variant="body2"><strong>Ref #:</strong> REC-{voucherData.paymentId || voucherData.id || 'N/A'}</Typography>
          <Typography variant="body2"><strong>Date:</strong> {voucherData.date}</Typography>
          <Typography variant="body2"><strong>Time:</strong> {voucherData.time}</Typography>
          <Typography variant="body2"><strong>Created By:</strong> {getCreatedByName(voucherData, currentUser)}</Typography>
        </Box>
      </Box>

      {/* Payment breakdown table */}
      <Box sx={{ border: '1px solid #000', borderRadius: 1, overflow: 'hidden', mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 2, py: 1, borderBottom: '1px solid #ddd', bgcolor: '#f5f5f5' }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>Description</Typography>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>Amount (PKR)</Typography>
        </Box>
        {/* Previous Balance */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 2, py: 1, borderBottom: '1px solid #eee', bgcolor: '#fafafa' }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>Previous Balance (سابقہ بقایا)</Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>{voucherData.previousBalance == null ? '—' : fmtAmt(voucherData.previousBalance)}</Typography>
        </Box>
        {parseFloat(voucherData.cashAmount || 0) > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 2, py: 1, borderBottom: '1px solid #eee' }}>
            <Typography variant="body2">Cash {voucherData.cashAcc ? `(${voucherData.cashAcc.cus_name})` : ''}</Typography>
            <Typography variant="body2">{fmtAmt(voucherData.cashAmount)}</Typography>
          </Box>
        )}
        {parseFloat(voucherData.bankAmount || 0) > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 2, py: 1, borderBottom: '1px solid #eee' }}>
            <Typography variant="body2">Bank {voucherData.bankAcc ? `(${voucherData.bankAcc.cus_name})` : ''}</Typography>
            <Typography variant="body2">{fmtAmt(voucherData.bankAmount)}</Typography>
          </Box>
        )}
        {parseFloat(voucherData.discountAmount || 0) > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 2, py: 1, borderBottom: '1px solid #eee' }}>
            <Typography variant="body2">Discount</Typography>
            <Typography variant="body2">{fmtAmt(voucherData.discountAmount)}</Typography>
          </Box>
        )}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 2, py: 1, borderBottom: '1px solid #ddd', bgcolor: '#f1f5f9' }}>
          <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a' }}>Total Received</Typography>
          <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a' }}>
            {fmtAmt(voucherData.totalAmount)}
          </Typography>
        </Box>
        {/* Remaining Balance */}
        <Box className="remaining-balance-bar" sx={{ display: 'flex', justifyContent: 'space-between', px: 2, py: 1.5, bgcolor: '#1e293b', color: '#ffffff !important' }}>
          <Typography variant="body2" sx={{ fontWeight: 700, color: '#ffffff !important' }}>Remaining Balance (کل بقایا)</Typography>
          <Typography variant="body2" sx={{ fontWeight: 700, color: voucherData.remainingBalance == null ? '#ffffff !important' : (voucherData.remainingBalance > 0 ? '#facc15 !important' : '#4ade80 !important') }}>
            {voucherData.remainingBalance == null ? '—' : `PKR ${fmtAmt(voucherData.remainingBalance)}`}
          </Typography>
        </Box>
      </Box>

      {/* Signature line */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4, pt: 2 }}>
        <Box sx={{ textAlign: 'center', flex: 1 }}>
          <Box sx={{ borderTop: '1px solid #000', pt: 0.5, mx: 3 }}>
            <Typography variant="caption">Received By</Typography>
          </Box>
        </Box>
        <Box sx={{ textAlign: 'center', flex: 1 }}>
          <Box sx={{ borderTop: '1px solid #000', pt: 0.5, mx: 3 }}>
            <Typography variant="caption">Authorized Signature</Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
});

export default ReceivingReceipt;
