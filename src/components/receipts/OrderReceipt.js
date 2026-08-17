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

const getBillDisplayNo = (data) => {
  if (!data) return 'N/A';
  if (data.bill_no) return data.bill_no;
  return `ORD-${data.sale_id || data.id}`;
};

/**
 * Universal Order Receipt Component.
 * Recalled across New Order page, Order List page, and Ledger page.
 */
const OrderReceipt = React.memo(function OrderReceipt({
  orderData,
  currentUser,
  elementId = 'receipt-preview',
  className = '',
}) {
  if (!orderData) return null;

  return (
    <Box
      id={elementId}
      className={`thermal-receipt ${className}`}
      sx={{
        width: '100%',
        bgcolor: 'white',
        p: 2,
        color: '#000',
        fontWeight: 'bold',
        '& *': { fontWeight: 'bold !important', color: '#000 !important' },
      }}
    >
      {/* Company Header */}
      <Box sx={{ textAlign: 'center', pb: 1, mb: 1, borderBottom: '2px solid #000' }}>
        <Typography
          sx={{
            fontWeight: 'bold',
            mb: 0.25,
            fontFamily: 'Arial, sans-serif',
            fontSize: '1.4rem',
            direction: 'rtl',
            color: '#000',
          }}
        >
          اتفاق آئرن اینڈ سیمنٹ سٹور
        </Typography>
        <Typography sx={{ mb: 0.25, fontSize: '0.85rem', direction: 'rtl', color: '#000' }}>
          گجرات سرگودھا روڈ، پاہڑیانوالی
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mb: 0.5 }}>
          <PhoneIcon sx={{ color: '#25D366', fontSize: '0.9rem' }} />
          <Typography sx={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#000' }}>
            Ph:- 0346-7560306, 0300-7560306
          </Typography>
        </Box>
        <Typography
          sx={{
            fontWeight: 'bold',
            textTransform: 'uppercase',
            letterSpacing: 1,
            mt: 0.5,
            fontSize: '1rem',
            color: '#000',
          }}
        >
          ORDER INVOICE
        </Typography>
      </Box>

      {/* Customer and Invoice Details */}
      <Box sx={{ px: 1, py: 1, mb: 1.5, borderBottom: '1px solid #ddd', display: 'flex', justifyContent: 'space-between' }}>
        <Box sx={{ flex: '0 0 50%' }}>
          <Typography sx={{ mb: 0.25, fontSize: '0.85rem', color: '#000' }}>
            Customer Name: &nbsp;<strong>{orderData.customer?.cus_name || 'Cash Customer'}</strong>
          </Typography>
          <Typography sx={{ mb: 0.25, fontSize: '0.85rem', color: '#000' }}>
            Phone No: &nbsp;<strong>{orderData.customer?.cus_phone_no || 'N/A'}</strong>
          </Typography>
          {orderData.customer?.cus_address && (
            <Typography sx={{ fontSize: '0.85rem', color: '#000' }}>
              Address: &nbsp;<strong>{orderData.customer.cus_address}</strong>
            </Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', textAlign: 'right', flex: '0 0 50%' }}>
          <Typography sx={{ mb: 0.25, fontSize: '0.85rem', color: '#000' }}>
            Invoice No: &nbsp;<strong>{getBillDisplayNo(orderData)}</strong>
          </Typography>
          <Typography sx={{ mb: 0.25, fontSize: '0.85rem', color: '#000' }}>
            Date: &nbsp;<strong>{new Date(orderData.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</strong>
          </Typography>
          <Typography sx={{ mb: 0.25, fontSize: '0.85rem', color: '#000' }}>
            Time: &nbsp;<strong>{new Date(orderData.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</strong>
          </Typography>
          <Typography sx={{ fontSize: '0.85rem', color: '#000' }}>
            Created By: &nbsp;<strong>{getCreatedByName(orderData, currentUser)}</strong>
          </Typography>
        </Box>
      </Box>

      {/* Product Table */}
      <Box sx={{ px: 1, py: 0.5 }}>
        <TableContainer component={Paper} variant="outlined" sx={{ mb: 1.5, border: '1px solid #000', boxShadow: 'none' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#808080' }}>
                <TableCell sx={{ fontWeight: 'bold', color: '#ffffff', py: 0.75, px: 1, fontSize: '0.85rem', border: '1px solid #777' }}>S#</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#ffffff', py: 0.75, px: 1, fontSize: '0.85rem', border: '1px solid #777' }}>Product Name</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#ffffff', py: 0.75, px: 1, fontSize: '0.85rem', border: '1px solid #777' }} align="center">Qty</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#ffffff', py: 0.75, px: 1, fontSize: '0.85rem', border: '1px solid #777' }} align="right">Rate</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#ffffff', py: 0.75, px: 1, fontSize: '0.85rem', border: '1px solid #777' }} align="right">Amount</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orderData.sale_details && orderData.sale_details.length > 0 ? (
                orderData.sale_details.map((detail, index) => (
                  <TableRow key={detail.sale_detail_id || index}>
                    <TableCell sx={{ px: 1, py: 0.5, color: '#000', fontSize: '0.85rem', border: '1px solid #777' }}>{index + 1}</TableCell>
                    <TableCell sx={{ px: 1, py: 0.5, color: '#000', fontWeight: 'bold', fontSize: '0.85rem', border: '1px solid #777' }}>
                      {detail.product?.pro_title || detail.product?.pro_name || 'N/A'}
                    </TableCell>
                    <TableCell sx={{ px: 1, py: 0.5, color: '#000', fontWeight: 'bold', fontSize: '0.85rem', border: '1px solid #777' }} align="center">
                      {fmtAmt(detail.qnty || 0)}
                    </TableCell>
                    <TableCell sx={{ px: 1, py: 0.5, color: '#000', fontSize: '0.85rem', border: '1px solid #777' }} align="right">
                      {fmtAmt(detail.unit_rate)}
                    </TableCell>
                    <TableCell sx={{ px: 1, py: 0.5, color: '#000', fontWeight: 'bold', fontSize: '0.85rem', border: '1px solid #777' }} align="right">
                      {fmtAmt(detail.total_amount)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 2, color: '#000', fontSize: '0.85rem' }}>
                    No items found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Order Totals Summary */}
        <Box sx={{ mt: 1, width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
          <Box sx={{ width: '280px' }}>
            <TableContainer component={Paper} variant="outlined" sx={{ border: '1px solid #000' }}>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold', px: 1, py: 0.5, border: '1px solid #ddd' }}>Total Amount</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', px: 1, py: 0.5, border: '1px solid #ddd' }}>{fmtAmt(orderData.total_amount)}</TableCell>
                  </TableRow>
                  {parseFloat(orderData.advance_payment || 0) > 0 && (
                    <TableRow sx={{ bgcolor: '#e8f5e9' }}>
                      <TableCell sx={{ fontWeight: 'bold', px: 1, py: 0.5, border: '1px solid #ddd', color: '#2e7d32' }}>Advance Received</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold', px: 1, py: 0.5, border: '1px solid #ddd', color: '#2e7d32' }}>{fmtAmt(orderData.advance_payment)}</TableCell>
                    </TableRow>
                  )}
                  {parseFloat(orderData.advance_payment || 0) > 0 && (
                    <TableRow sx={{ bgcolor: '#fff3e0' }}>
                      <TableCell sx={{ fontWeight: 'bold', px: 1, py: 0.5, border: '1px solid #ddd', color: '#e65100' }}>Balance Due</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold', px: 1, py: 0.5, border: '1px solid #ddd', color: '#e65100' }}>
                        {fmtAmt(parseFloat(orderData.total_amount || 0) - parseFloat(orderData.advance_payment || 0))}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Box>

        <Box sx={{ textAlign: 'center', borderTop: '1px solid #000', mt: 2, pt: 1 }}>
          <Typography sx={{ fontSize: '10px', fontWeight: 'bold', color: '#000' }}>Thank you for your order!</Typography>
        </Box>
      </Box>
    </Box>
  );
});

export default OrderReceipt;
