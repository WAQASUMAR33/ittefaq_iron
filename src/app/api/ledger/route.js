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
              cus_phone_no: true
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
            cus_phone_no: true
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
    if (!trnx_type || !['CASH', 'CHEQUE', 'BANK_TRANSFER'].includes(trnx_type)) {
      return errorResponse('Valid transaction type is required (CASH, CHEQUE, BANK_TRANSFER)');
    }
    if (debit_amount < 0 || credit_amount < 0) {
      return errorResponse('Debit and credit amounts must be non-negative');
    }
    if (debit_amount === 0 && credit_amount === 0) {
      return errorResponse('Either debit or credit amount must be greater than 0');
    }

    // Check if customer exists
    const customer = await prisma.customer.findUnique({
      where: { cus_id }
    });

    if (!customer) {
      return errorResponse('Customer not found', 404);
    }

    // Create ledger entry in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Get customer's current balance
      const customerData = await tx.customer.findUnique({
        where: { cus_id },
        select: { cus_balance: true }
      });

      const openingBalance = parseFloat(customerData?.cus_balance || 0);
      const closingBalance = openingBalance + parseFloat(debit_amount) - parseFloat(credit_amount);

      // Create the ledger entry
      const newLedger = await tx.ledger.create({
        data: {
          cus_id,
          opening_balance: openingBalance,
          debit_amount: parseFloat(debit_amount),
          credit_amount: parseFloat(credit_amount),
          closing_balance: closingBalance,
          bill_no: bill_no || null,
          trnx_type,
          details: details || null,
          payments: parseFloat(payments),
          updated_by: updated_by || null
        }
      });

      // Update customer balance
      await tx.customer.update({
        where: { cus_id },
        data: { cus_balance: closingBalance }
      });

      return newLedger;
    });

    // Fetch the complete ledger entry with relations
    const completeLedger = await prisma.ledger.findUnique({
      where: { l_id: result.l_id },
      include: {
        customer: {
          select: {
            cus_id: true,
            cus_name: true,
            cus_phone_no: true
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
    return errorResponse('Failed to create ledger entry', 500);
  }
}

// ========================================
// PUT — Update an existing ledger entry
// ========================================
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
      payments = 0,
      updated_by
    } = body;

    if (!id) return errorResponse('Ledger ID is required');
    if (!cus_id) return errorResponse('Customer ID is required');
    if (!trnx_type || !['CASH', 'CHEQUE', 'BANK_TRANSFER'].includes(trnx_type)) {
      return errorResponse('Valid transaction type is required (CASH, CHEQUE, BANK_TRANSFER)');
    }
    if (debit_amount < 0 || credit_amount < 0) {
      return errorResponse('Debit and credit amounts must be non-negative');
    }
    if (debit_amount === 0 && credit_amount === 0) {
      return errorResponse('Either debit or credit amount must be greater than 0');
    }

    // Check if ledger entry exists
    const existingLedger = await prisma.ledger.findUnique({
      where: { l_id: id }
    });

    if (!existingLedger) {
      return errorResponse('Ledger entry not found', 404);
    }

    // Check if customer exists
    const customer = await prisma.customer.findUnique({
      where: { cus_id }
    });

    if (!customer) {
      return errorResponse('Customer not found', 404);
    }

    // Update ledger entry in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Get customer's current balance
      const customerData = await tx.customer.findUnique({
        where: { cus_id },
        select: { cus_balance: true }
      });

      const openingBalance = parseFloat(customerData?.cus_balance || 0);
      const closingBalance = openingBalance + parseFloat(debit_amount) - parseFloat(credit_amount);

      // Update the ledger entry
      const updatedLedger = await tx.ledger.update({
        where: { l_id: id },
        data: {
          cus_id,
          opening_balance: openingBalance,
          debit_amount: parseFloat(debit_amount),
          credit_amount: parseFloat(credit_amount),
          closing_balance: closingBalance,
          bill_no: bill_no || null,
          trnx_type,
          details: details || null,
          payments: parseFloat(payments),
          updated_by: updated_by || existingLedger.updated_by
        }
      });

      // Update customer balance
      await tx.customer.update({
        where: { cus_id },
        data: { cus_balance: closingBalance }
      });

      return updatedLedger;
    });

    // Fetch the complete updated ledger entry with relations
    const completeLedger = await prisma.ledger.findUnique({
      where: { l_id: result.l_id },
      include: {
        customer: {
          select: {
            cus_id: true,
            cus_name: true,
            cus_phone_no: true
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
