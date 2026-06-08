import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Helper for JSON errors
function errorResponse(message, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

// ========================================
// GET — Get all ledger entries or one entry
// ========================================
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id') ? parseInt(searchParams.get('id')) : null; // optional: ?id=1
  const customerId = searchParams.get('customerId') ? parseInt(searchParams.get('customerId')) : null; // optional: ?customerId=1

  try {
    if (id) {
      const ledger = await prisma.ledger.findUnique({
        where: { l_id: id },
        include: {
          customer: {
            select: {
              cus_id: true,
              cus_name: true,
              cus_phone_no: true,
              cus_category: true,
              cus_type: true
            }
          },
          updated_by_user: {
            select: {
              user_id: true,
              full_name: true,
              role: true
            }
          }
        }
      });

      if (!ledger) {
        return errorResponse('Ledger entry not found', 404);
      }

      return NextResponse.json(ledger);
    }

    // Build where clause
    const where = {};
    if (customerId) {
      where.cus_id = customerId;
    }

    const ledgerEntries = await prisma.ledger.findMany({
      where,
      include: {
        customer: {
          select: {
            cus_id: true,
            cus_name: true,
            cus_phone_no: true,
            cus_category: true,
            cus_type: true
          }
        },
        updated_by_user: {
          select: {
            user_id: true,
            full_name: true,
            role: true
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    return NextResponse.json(ledgerEntries);
  } catch (err) {
    console.error('❌ Error fetching ledger entries:', err);
    return errorResponse('Failed to fetch ledger entries', 500);
  }
}

// ========================================
// POST — Create a new ledger entry
// ========================================
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      cus_id,
      debit_amount = 0,
      credit_amount = 0,
      bill_no,
      trnx_type,
      details,
      payments = 0,
      updated_by
    } = body;

    // Validation for required fields
    if (!cus_id) {
      return errorResponse('Customer ID is required');
    }
    if (!trnx_type || !['CASH', 'CHEQUE', 'BANK_TRANSFER', 'REBATE', 'PURCHASE', 'PURCHASE_RETURN', 'SALE', 'SALE_RETURN', 'CASH_PAYMENT', 'BANK_PAYMENT', 'ADJUSTMENT'].includes(trnx_type)) {
      return errorResponse('Valid transaction type is required');
    }
    if (debit_amount < 0 || credit_amount < 0) {
      return errorResponse('Debit and credit amounts must be non-negative');
    }
    if (debit_amount === 0 && credit_amount === 0) {
      return errorResponse('Either debit or credit amount must be greater than 0');
    }

    // Check if customer exists
    const customer = await prisma.customer.findUnique({
      where: { cus_id: parseInt(cus_id) }
    });

    if (!customer) {
      return errorResponse('Customer not found', 404);
    }

    // Verify updated_by user exists to avoid foreign key violation
    let validUpdatedBy = null;
    if (updated_by) {
      const userExists = await prisma.users.findUnique({
        where: { user_id: parseInt(updated_by) }
      });
      if (userExists) {
        validUpdatedBy = parseInt(updated_by);
      } else {
        console.warn(`⚠️ User with id ${updated_by} not found. Setting updated_by to null.`);
      }
    }

    // Get customer's current balance
    const customerData = await prisma.customer.findUnique({
      where: { cus_id: parseInt(cus_id) },
      select: { cus_balance: true }
    });

    if (!customerData) {
      return errorResponse('Customer data not found', 404);
    }

    const openingBalance = parseFloat(customerData.cus_balance || 0);
    const debitNum = parseFloat(debit_amount || 0);
    const creditNum = parseFloat(credit_amount || 0);
    const closingBalance = openingBalance + debitNum - creditNum;

    // Create the ledger entry
    const result = await prisma.ledger.create({
      data: {
        cus_id: parseInt(cus_id),
        opening_balance: openingBalance,
        debit_amount: debitNum,
        credit_amount: creditNum,
        closing_balance: closingBalance,
        bill_no: bill_no ? String(bill_no) : null,
        trnx_type: trnx_type,
        details: details || null,
        payments: parseFloat(payments || 0),
        updated_by: validUpdatedBy
      }
    });

    // Update customer balance
    await prisma.customer.update({
      where: { cus_id: parseInt(cus_id) },
      data: { cus_balance: closingBalance }
    });

    // Fetch the complete ledger entry with relations
    const completeLedger = await prisma.ledger.findUnique({
      where: { l_id: result.l_id },
      include: {
        customer: {
          select: {
            cus_id: true,
            cus_name: true,
            cus_phone_no: true,
            cus_category: true,
            cus_type: true
          }
        },
        updated_by_user: {
          select: {
            user_id: true,
            full_name: true,
            role: true
          }
        }
      }
    });

    return NextResponse.json(completeLedger, { status: 201 });
  } catch (err) {
    console.error('❌ Error creating ledger entry:', err);
    return errorResponse(`Failed to create ledger entry: ${err.message}`, 500);
  }
}

// ========================================
// PUT — Update an existing ledger entry
// ========================================
// Payment/Receiving entries: original entry kept intact; a new ADJUSTMENT entry
// is created for the net amount difference and the customer balance is updated
// by that delta only.
// Sale / Purchase / Return entries: cannot be edited here — edit the source
// document instead (which handles its own ledger adjustments).
export async function PUT(request) {
  try {
    const body = await request.json();
    const {
      id,
      cus_id,
      debit_amount = 0,
      credit_amount = 0,
      bill_no,
      trnx_type,
      details,
      updated_by
    } = body;

    if (!id)     return errorResponse('Ledger ID is required');
    if (!cus_id) return errorResponse('Customer ID is required');
    if (parseFloat(debit_amount) < 0 || parseFloat(credit_amount) < 0) {
      return errorResponse('Debit and credit amounts must be non-negative');
    }

    // Fetch existing entry
    const existingLedger = await prisma.ledger.findUnique({ where: { l_id: id } });
    if (!existingLedger) return errorResponse('Ledger entry not found', 404);

    // Only payment/receiving entries may be edited here
    const NON_EDITABLE = ['SALE', 'SALE_RETURN', 'PURCHASE', 'PURCHASE_RETURN', 'ORDER'];
    if (NON_EDITABLE.includes(existingLedger.trnx_type)) {
      return errorResponse(
        'Sale, purchase and order ledger entries cannot be edited here. Edit the source document instead.',
        403
      );
    }

    // Fetch customer
    const customer = await prisma.customer.findUnique({ where: { cus_id } });
    if (!customer) return errorResponse('Customer not found', 404);

    const result = await prisma.$transaction(async (tx) => {
      // ── Calculate net change in customer balance ──
      // Old effect on balance = old_debit - old_credit
      // Desired new effect    = new_debit - new_credit
      // Adjustment            = desired - old
      const oldDebit  = Number(parseFloat(existingLedger.debit_amount  || 0).toFixed(2));
      const oldCredit = Number(parseFloat(existingLedger.credit_amount || 0).toFixed(2));
      const newDebit  = Number(parseFloat(debit_amount  || 0).toFixed(2));
      const newCredit = Number(parseFloat(credit_amount || 0).toFixed(2));
      const netChange = Number(((newDebit - newCredit) - (oldDebit - oldCredit)).toFixed(2));

      // ── Update only the metadata on the original entry (amounts unchanged) ──
      const updatedLedger = await tx.ledger.update({
        where: { l_id: id },
        data: {
          bill_no:    bill_no !== undefined ? (bill_no ? String(bill_no) : null) : existingLedger.bill_no,
          trnx_type:  trnx_type  || existingLedger.trnx_type,
          details:    details    !== undefined ? (details || null) : existingLedger.details,
          updated_by: updated_by || existingLedger.updated_by
        }
      });

      // ── Create adjustment entry if the amount changed ──
      if (netChange !== 0) {
        const currentBalance = Number(parseFloat(customer.cus_balance || 0).toFixed(2));
        const isIncrease     = netChange > 0;
        const adjustmentAmt  = Math.abs(netChange);
        const newBalance     = Number((currentBalance + netChange).toFixed(2));
        const entryBillNo    = bill_no ? String(bill_no) : existingLedger.bill_no;
        const entryDesc      = details || existingLedger.details || '';
        const typeLabel      = isIncrease ? 'Debit' : 'Credit';

        await tx.ledger.create({
          data: {
            cus_id,
            opening_balance: currentBalance,
            debit_amount:    isIncrease ? adjustmentAmt : 0,
            credit_amount:   isIncrease ? 0 : adjustmentAmt,
            closing_balance: newBalance,
            bill_no:         entryBillNo,
            trnx_type:       'ADJUSTMENT',
            details:         `Payment Edit - ${typeLabel} Adjustment ${adjustmentAmt}${entryDesc ? ' | ' + entryDesc : ''}`,
            payments:        0,
            cash_payment:    0,
            bank_payment:    0,
            updated_by:      updated_by || null
          }
        });

        await tx.customer.update({
          where: { cus_id },
          data: { cus_balance: newBalance }
        });
      }

      return updatedLedger;
    });

    // Return updated entry with relations
    const completeLedger = await prisma.ledger.findUnique({
      where: { l_id: result.l_id },
      include: {
        customer: {
          select: { cus_id: true, cus_name: true, cus_phone_no: true, cus_category: true, cus_type: true }
        },
        updated_by_user: {
          select: { user_id: true, full_name: true, role: true }
        }
      }
    });

    return NextResponse.json(completeLedger);
  } catch (err) {
    console.error('❌ Error updating ledger entry:', err);
    return errorResponse('Failed to update ledger entry', 500);
  }
}

// ========================================
// DELETE — Delete a ledger entry
// ========================================
export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id') ? parseInt(searchParams.get('id')) : null; // /api/ledger?id=1

  if (!id) {
    return errorResponse('Ledger ID is required');
  }

  try {
    const existingLedger = await prisma.ledger.findUnique({
      where: { l_id: id }
    });

    if (!existingLedger) {
      return errorResponse('Ledger entry not found', 404);
    }

    // Delete the ledger entry
    await prisma.ledger.delete({
      where: { l_id: id }
    });

    return NextResponse.json({ message: 'Ledger entry deleted successfully' });
  } catch (err) {
    console.error('❌ Error deleting ledger entry:', err);
    return errorResponse('Failed to delete ledger entry', 500);
  }
}
