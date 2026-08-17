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

const fmtRateQty = (val) => {
  const n = parseFloat(val || 0);
  if (n % 1 === 0) return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const isWalkinCustomer = (customer) => {
  if (!customer) return true;
  const name = (customer.cus_name || '').toLowerCase();
  return name.includes('walk') || name.includes('cash customer') || name === 'cash';
};

const getBillDisplayNo = (data) => {
  if (!data) return 'N/A';
  if (data.bill_no) return data.bill_no;
  if (data.is_return) return `SR-${data.sale_id || data.id}`;
  return `SI-${data.sale_id || data.id}`;
};

/**
 * Universal Sale & Sale Return Receipt Component.
 * Can be recalled across Sales Page, Sales List Page, and Ledger Page.
 */
const SaleReceipt = React.memo(function SaleReceipt({
  saleData,
  currentUser,
  elementId = 'receipt-preview',
  className = '',
}) {
  if (!saleData) return null;

  const isReturn = !!saleData.is_return;

  return (
    <Box
      id={elementId}
      className={`thermal-receipt ${className}`}
      sx={{
        width: '100%',
        bgcolor: 'white',
        p: 3,
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
            color: isReturn ? '#d32f2f' : '#000',
          }}
        >
          {isReturn ? 'SALE RETURN INVOICE' : 'SALE INVOICE'}
        </Typography>
      </Box>

      {/* Customer and Invoice Details */}
      <Box sx={{ px: 2, py: 2, borderBottom: '1px solid #ddd', display: 'flex', justifyContent: 'space-between' }}>
        <Box sx={{ flex: '0 0 50%', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ display: 'flex', mb: 0.5 }}>
            <Typography variant="body2" sx={{ width: '130px', flexShrink: 0 }}>Customer Name:</Typography>
            <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '1.05rem' }}>
              {saleData.customer
                ? `${saleData.customer.cus_name}${saleData.customer.name_urdu ? ' ' + saleData.customer.name_urdu : ''}`
                : 'N/A'}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', mb: 0.5 }}>
            <Typography variant="body2" sx={{ width: '130px', flexShrink: 0 }}>Phone No:</Typography>
            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
              {saleData.customer?.cus_phone_no || 'N/A'}
            </Typography>
          </Box>
          {saleData.customer?.cus_address && (
            <Box sx={{ display: 'flex' }}>
              <Typography variant="body2" sx={{ width: '130px', flexShrink: 0 }}>Address:</Typography>
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                {saleData.customer.cus_address}
              </Typography>
            </Box>
          )}
        </Box>
        <Box sx={{ flex: '0 0 50%', display: 'flex', flexDirection: 'column', pl: 4 }}>
          <Box sx={{ display: 'flex', mb: 0.5 }}>
            <Typography variant="body2" sx={{ width: '100px', flexShrink: 0 }}>Invoice No:</Typography>
            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
              {getBillDisplayNo(saleData)}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', mb: 0.5 }}>
            <Typography variant="body2" sx={{ width: '100px', flexShrink: 0 }}>Date:</Typography>
            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
              {new Date(saleData.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', mb: 0.5 }}>
            <Typography variant="body2" sx={{ width: '100px', flexShrink: 0 }}>Time:</Typography>
            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
              {new Date(saleData.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', mb: 0.5 }}>
            <Typography variant="body2" sx={{ width: '100px', flexShrink: 0 }}>Created By:</Typography>
            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
              {getCreatedByName(saleData, currentUser)}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Product Table */}
      <Box sx={{ px: 2, py: 2 }}>
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
              {saleData.sale_details && saleData.sale_details.length > 0 ? (
                saleData.sale_details.map((detail, index) => (
                  <TableRow key={detail.sale_detail_id || index}>
                    <TableCell sx={{ px: 1, border: '1px solid #ddd' }}>{index + 1}</TableCell>
                    <TableCell sx={{ px: 1, border: '1px solid #ddd' }}>{detail.product?.pro_title || 'N/A'}</TableCell>
                    <TableCell sx={{ px: 1, border: '1px solid #ddd' }} align="right">{fmtRateQty(detail.qnty)}</TableCell>
                    <TableCell sx={{ px: 1, border: '1px solid #ddd' }} align="right">{fmtRateQty(detail.unit_rate)}</TableCell>
                    <TableCell sx={{ px: 1, border: '1px solid #ddd' }} align="right">{fmtAmt(detail.total_amount)}</TableCell>
                  </TableRow>
                ))
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

        {/* Payment Summary */}
        <Box sx={{ mt: 2, width: '100%', display: 'flex', justifyContent: 'space-between', gap: 2 }}>
          <Box sx={{ flex: '0 0 48%' }}>
            {!isWalkinCustomer(saleData?.customer) && (
              <TableContainer component={Paper} variant="outlined" sx={{ mb: 2, border: '1px solid #000', width: '100%' }}>
                <Table size="small">
                  <TableBody>
                    {isReturn ? (
                      (() => {
                        const netReturnCredit = parseFloat(saleData.total_amount || 0);
                        const totalRefund = parseFloat(saleData.payment || 0);
                        const prevBal = parseFloat(saleData.customer?.cus_balance ?? saleData.previous_customer_balance ?? 0);
                        const productTotal = (saleData.sale_details || []).reduce((sum, item) => sum + (parseFloat(item.total_amount) || 0), 0);
                        const discount = parseFloat(saleData.discount || 0);
                        const labour = parseFloat(saleData.labour_charges || saleData.labour || 0);
                        const shipping = parseFloat(saleData.shipping_amount || 0);
                        const newBal = prevBal - netReturnCredit;

                        return (
                          <>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: '1px solid #ddd' }}>منسوخ کردہ رقم</TableCell>
                              <TableCell align="right" sx={{ px: 1, py: 0.5, border: '1px solid #ddd' }}>{fmtAmt(productTotal)}</TableCell>
                            </TableRow>
                            {discount > 0 && (
                              <TableRow>
                                <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: '1px solid #ddd' }}>رعایت</TableCell>
                                <TableCell align="right" sx={{ px: 1, py: 0.5, border: '1px solid #ddd' }}>-{fmtAmt(discount)}</TableCell>
                              </TableRow>
                            )}
                            <TableRow>
                              <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: '1px solid #ddd' }}>مزدوری</TableCell>
                              <TableCell align="right" sx={{ px: 1, py: 0.5, border: '1px solid #ddd' }}>-{fmtAmt(labour)}</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: '1px solid #ddd' }}>کرایہ</TableCell>
                              <TableCell align="right" sx={{ px: 1, py: 0.5, border: '1px solid #ddd' }}>-{fmtAmt(shipping)}</TableCell>
                            </TableRow>
                            <TableRow sx={{ bgcolor: '#e8f5e9' }}>
                              <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: '1px solid #ddd' }}>کل منسوخی</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 'bold', px: 1, py: 0.5, border: '1px solid #ddd', color: '#2e7d32' }}>
                                {fmtAmt(netReturnCredit)}
                              </TableCell>
                            </TableRow>
                            <TableRow sx={{ bgcolor: '#ffe0b2' }}>
                              <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: '1px solid #ddd' }}>کل واپسی</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 'bold', px: 1, py: 0.5, border: '1px solid #ddd', color: '#e65100', fontSize: '1rem' }}>
                                {fmtAmt(totalRefund)}
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: '1px solid #ddd' }}>سابقہ بقایا</TableCell>
                              <TableCell align="right" sx={{ px: 1, py: 0.5, border: '1px solid #ddd' }}>{fmtAmt(prevBal)}</TableCell>
                            </TableRow>
                            <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                              <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: '1px solid #ddd' }}>موجودہ بقایا</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 'bold', px: 1, py: 0.5, border: '1px solid #ddd' }}>{fmtAmt(newBal)}</TableCell>
                            </TableRow>
                          </>
                        );
                      })()
                    ) : (
                      (() => {
                        const productTotal = (saleData.sale_details || []).reduce((sum, item) => sum + (parseFloat(item.total_amount) || 0), 0);
                        const discount = parseFloat(saleData.discount || 0);
                        const labour = parseFloat(saleData.labour_charges || saleData.labour || 0);
                        const shipping = parseFloat(saleData.shipping_amount || 0);
                        const billTotal = parseFloat(saleData.total_amount || 0);
                        const paid = parseFloat(saleData.payment || 0);
                        const prevBal = parseFloat(saleData.previous_customer_balance ?? saleData.customer?.cus_balance ?? 0);
                        const grandTotal = prevBal + billTotal;
                        const finalBal = grandTotal - paid;

                        return (
                          <>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: '1px solid #ddd' }}>کل رقم</TableCell>
                              <TableCell align="right" sx={{ px: 1, py: 0.5, border: '1px solid #ddd' }}>{fmtAmt(productTotal)}</TableCell>
                            </TableRow>
                            {discount > 0 && (
                              <TableRow>
                                <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: '1px solid #ddd' }}>رعایت</TableCell>
                                <TableCell align="right" sx={{ px: 1, py: 0.5, border: '1px solid #ddd' }}>-{fmtAmt(discount)}</TableCell>
                              </TableRow>
                            )}
                            {labour > 0 && (
                              <TableRow>
                                <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: '1px solid #ddd' }}>مزدوری</TableCell>
                                <TableCell align="right" sx={{ px: 1, py: 0.5, border: '1px solid #ddd' }}>+{fmtAmt(labour)}</TableCell>
                              </TableRow>
                            )}
                            {shipping > 0 && (
                              <TableRow>
                                <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: '1px solid #ddd' }}>کرایہ</TableCell>
                                <TableCell align="right" sx={{ px: 1, py: 0.5, border: '1px solid #ddd' }}>+{fmtAmt(shipping)}</TableCell>
                              </TableRow>
                            )}
                            <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                              <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: '1px solid #ddd' }}>بل کی رقم</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 'bold', px: 1, py: 0.5, border: '1px solid #ddd' }}>{fmtAmt(billTotal)}</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: '1px solid #ddd' }}>سابقہ بقایا</TableCell>
                              <TableCell align="right" sx={{ px: 1, py: 0.5, border: '1px solid #ddd' }}>{fmtAmt(prevBal)}</TableCell>
                            </TableRow>
                            <TableRow sx={{ bgcolor: '#e3f2fd' }}>
                              <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: '1px solid #ddd' }}>کل واصل</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 'bold', px: 1, py: 0.5, border: '1px solid #ddd' }}>{fmtAmt(grandTotal)}</TableCell>
                            </TableRow>
                            <TableRow sx={{ bgcolor: '#e8f5e9' }}>
                              <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: '1px solid #ddd' }}>وصول شدہ</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 'bold', px: 1, py: 0.5, border: '1px solid #ddd', color: '#2e7d32' }}>{fmtAmt(paid)}</TableCell>
                            </TableRow>
                            <TableRow sx={{ bgcolor: finalBal > 0 ? '#ffebee' : '#e8f5e9' }}>
                              <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: '1px solid #ddd' }}>بقایا جات</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 'bold', px: 1, py: 0.5, border: '1px solid #ddd', color: finalBal > 0 ? '#c62828' : '#2e7d32', fontSize: '1.05rem' }}>
                                {fmtAmt(finalBal)}
                              </TableCell>
                            </TableRow>
                          </>
                        );
                      })()
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        </Box>

        <Box sx={{ textAlign: 'center', borderTop: '1px solid #000', mt: 2, pt: 1 }}>
          <Typography sx={{ fontSize: '11px', fontWeight: 'bold' }}>Thank you for your business!</Typography>
        </Box>
      </Box>
    </Box>
  );
});

export default SaleReceipt;
