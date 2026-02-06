import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper function to map TransactionType to PaymentType
function mapTransactionTypeToPaymentType(transactionType) {
  const mapping = {
    'CASH': 'CASH',
    'CHEQUE': 'CHEQUE',
    'BANK_TRANSFER': 'BANK_TRANSFER',
    'BANK_PAYMENT': 'BANK_TRANSFER',
    'CASH_PAYMENT': 'CASH',
    'PURCHASE': 'CASH', // Default to CASH for unspecified types
    'SALE': 'CASH',
    'SALE_RETURN': 'CASH',
    'PURCHASE_RETURN': 'CASH'
  };
  return mapping[transactionType] || 'CASH'; // Default to CASH if not found
}

// GET - Fetch day end data for a specific date or current day
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const businessDate = new Date(date);

    // Get or create day end record for the date
    let dayEnd = await prisma.dayEnd.findUnique({
      where: { business_date: businessDate },
      include: {
        day_end_details: true,
        closed_by_user: {
          select: {
            full_name: true,
            role: true
          }
        }
      }
    });

    if (!dayEnd) {
      // Create new day end record
      dayEnd = await prisma.dayEnd.create({
        data: {
          business_date: businessDate,
          opening_cash: 0,
          status: 'OPEN'
        },
        include: {
          day_end_details: true,
          closed_by_user: {
            select: {
              full_name: true,
              role: true
            }
          }
        }
      });
    }

    // Calculate daily transactions
    const startOfDay = new Date(businessDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(businessDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Get sales for the day
    const sales = await prisma.sale.findMany({
      where: {
        created_at: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      include: {
        customer: {
          select: {
            cus_name: true
          }
        }
      }
    });

    // Get purchases for the day
    const purchases = await prisma.purchase.findMany({
      where: {
        created_at: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      include: {
        customer: {
          select: {
            cus_name: true
          }
        }
      }
    });

    // Get expenses for the day
    const expenses = await prisma.expense.findMany({
      where: {
        created_at: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      include: {
        expense_title: true
      }
    });

    // Get ledger entries for the day (receipts and payments)
    const ledgerEntries = await prisma.ledger.findMany({
      where: {
        created_at: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      include: {
        customer: {
          select: {
            cus_name: true
          }
        }
      }
    });

    // Calculate totals
    const totalSales = sales.reduce((sum, sale) => {
      const netTotal = parseFloat(sale.total_amount) - parseFloat(sale.discount) + parseFloat(sale.shipping_amount || 0);
      return sum + netTotal;
    }, 0);

    const totalPurchases = purchases.reduce((sum, purchase) => {
      return sum + parseFloat(purchase.net_total);
    }, 0);

    const totalExpenses = expenses.reduce((sum, expense) => {
      return sum + parseFloat(expense.exp_amount);
    }, 0);

    const totalReceipts = ledgerEntries
      .filter(entry => entry.credit_amount > 0)
      .reduce((sum, entry) => sum + parseFloat(entry.credit_amount), 0);

    const totalPayments = ledgerEntries
      .filter(entry => entry.debit_amount > 0)
      .reduce((sum, entry) => sum + parseFloat(entry.debit_amount), 0);

    // Calculate cash in hand
    const cashInHand = parseFloat(dayEnd.opening_cash) + totalReceipts - totalPayments;

    return NextResponse.json({
      dayEnd: {
        ...dayEnd,
        total_sales: totalSales,
        total_purchases: totalPurchases,
        total_expenses: totalExpenses,
        total_receipts: totalReceipts,
        total_payments: totalPayments,
        cash_in_hand: cashInHand
      },
      transactions: {
        sales,
        purchases,
        expenses,
        ledgerEntries
      },
      summary: {
        totalSales,
        totalPurchases,
        totalExpenses,
        totalReceipts,
        totalPayments,
        cashInHand,
        netCashFlow: totalReceipts - totalPayments
      }
    });
  } catch (error) {
    console.error('Error fetching day end data:', error);
    return NextResponse.json({ error: 'Failed to fetch day end data' }, { status: 500 });
  }
}

// POST - Create or update day end record
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      business_date,
      opening_cash,
      closing_cash,
      notes,
      closed_by
    } = body;

    const businessDate = new Date(business_date);

    // Check if day end already exists
    const existingDayEnd = await prisma.dayEnd.findUnique({
      where: { business_date: businessDate }
    });

    if (existingDayEnd && existingDayEnd.status === 'CLOSED') {
      return NextResponse.json({ error: 'Day is already closed' }, { status: 400 });
    }

    // Validate closing_cash if closing the day
    if (closing_cash) {
      const closingCashNum = parseFloat(closing_cash);
      if (isNaN(closingCashNum) || closingCashNum < 0) {
        return NextResponse.json({ error: 'Closing cash must be a valid positive number' }, { status: 400 });
      }
    }

    // Calculate daily transactions
    const startOfDay = new Date(businessDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(businessDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Get all transactions for the day
    const [sales, purchases, expenses, ledgerEntries] = await Promise.all([
      prisma.sale.findMany({
        where: {
          created_at: {
            gte: startOfDay,
            lte: endOfDay
          }
        }
      }),
      prisma.purchase.findMany({
        where: {
          created_at: {
            gte: startOfDay,
            lte: endOfDay
          }
        }
      }),
      prisma.expense.findMany({
        where: {
          created_at: {
            gte: startOfDay,
            lte: endOfDay
          }
        }
      }),
      prisma.ledger.findMany({
        where: {
          created_at: {
            gte: startOfDay,
            lte: endOfDay
          }
        }
      })
    ]);

    // Calculate totals
    const totalSales = sales.reduce((sum, sale) => {
      const netTotal = parseFloat(sale.total_amount) - parseFloat(sale.discount) + parseFloat(sale.shipping_amount || 0);
      return sum + netTotal;
    }, 0);

    const totalPurchases = purchases.reduce((sum, purchase) => {
      return sum + parseFloat(purchase.net_total);
    }, 0);

    const totalExpenses = expenses.reduce((sum, expense) => {
      return sum + parseFloat(expense.exp_amount);
    }, 0);

    const totalReceipts = ledgerEntries
      .filter(entry => entry.credit_amount > 0)
      .reduce((sum, entry) => sum + parseFloat(entry.credit_amount), 0);

    const totalPayments = ledgerEntries
      .filter(entry => entry.debit_amount > 0)
      .reduce((sum, entry) => sum + parseFloat(entry.debit_amount), 0);

    // Use transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      let dayEnd;
      
      // Determine opening_cash value: use provided value or existing value or default to 0
      const finalOpeningCash = opening_cash !== undefined && opening_cash !== null && opening_cash !== '' 
        ? parseFloat(opening_cash) 
        : (existingDayEnd?.opening_cash ? parseFloat(existingDayEnd.opening_cash) : 0);
      
      // Calculate cash_in_hand based on final opening cash
      const finalCashInHand = finalOpeningCash + totalReceipts - totalPayments;

      if (existingDayEnd) {
        // Update existing day end
        dayEnd = await tx.dayEnd.update({
          where: { day_end_id: existingDayEnd.day_end_id },
          data: {
            opening_cash: finalOpeningCash,
            closing_cash: closing_cash ? parseFloat(closing_cash) : null,
            total_sales: totalSales,
            total_purchases: totalPurchases,
            total_expenses: totalExpenses,
            total_receipts: totalReceipts,
            total_payments: totalPayments,
            cash_in_hand: finalCashInHand,
            status: closing_cash ? 'CLOSED' : 'OPEN',
            notes: notes || null,
            closed_by: closing_cash ? closed_by : null,
            closed_at: closing_cash ? new Date() : null
          }
        });

        // Delete existing day end details
        await tx.dayEndDetail.deleteMany({
          where: { day_end_id: existingDayEnd.day_end_id }
        });
      } else {
        // Create new day end
        dayEnd = await tx.dayEnd.create({
          data: {
            business_date: businessDate,
            opening_cash: finalOpeningCash,
            closing_cash: closing_cash ? parseFloat(closing_cash) : null,
            total_sales: totalSales,
            total_purchases: totalPurchases,
            total_expenses: totalExpenses,
            total_receipts: totalReceipts,
            total_payments: totalPayments,
            cash_in_hand: finalCashInHand,
            status: closing_cash ? 'CLOSED' : 'OPEN',
            notes: notes || null,
            closed_by: closing_cash ? closed_by : null,
            closed_at: closing_cash ? new Date() : null
          }
        });
      }

      // Create day end details for all transactions
      const dayEndDetails = [];

      // Add sales
      sales.forEach(sale => {
        const netTotal = parseFloat(sale.total_amount) - parseFloat(sale.discount) + parseFloat(sale.shipping_amount || 0);
        dayEndDetails.push({
          day_end_id: dayEnd.day_end_id,
          transaction_type: 'SALE',
          transaction_id: sale.sale_id,
          amount: netTotal,
          payment_type: sale.payment_type,
          description: `Sale to customer`
        });
      });

      // Add purchases
      purchases.forEach(purchase => {
        dayEndDetails.push({
          day_end_id: dayEnd.day_end_id,
          transaction_type: 'PURCHASE',
          transaction_id: purchase.pur_id,
          amount: parseFloat(purchase.net_total),
          payment_type: purchase.payment_type,
          description: `Purchase from supplier`
        });
      });

      // Add expenses
      expenses.forEach(expense => {
        dayEndDetails.push({
          day_end_id: dayEnd.day_end_id,
          transaction_type: 'EXPENSE',
          transaction_id: expense.exp_id,
          amount: parseFloat(expense.exp_amount),
          payment_type: 'CASH', // Default for expenses
          description: expense.exp_title
        });
      });

      // Add ledger entries
      ledgerEntries.forEach(entry => {
        const paymentType = mapTransactionTypeToPaymentType(entry.trnx_type);
        
        if (entry.credit_amount > 0) {
          dayEndDetails.push({
            day_end_id: dayEnd.day_end_id,
            transaction_type: 'RECEIPT',
            transaction_id: entry.l_id,
            amount: parseFloat(entry.credit_amount),
            payment_type: paymentType,
            description: entry.details || 'Receipt'
          });
        }
        if (entry.debit_amount > 0) {
          dayEndDetails.push({
            day_end_id: dayEnd.day_end_id,
            transaction_type: 'PAYMENT',
            transaction_id: entry.l_id,
            amount: parseFloat(entry.debit_amount),
            payment_type: paymentType,
            description: entry.details || 'Payment'
          });
        }
      });

      // Create all day end details
      if (dayEndDetails.length > 0) {
        await tx.dayEndDetail.createMany({
          data: dayEndDetails
        });
      }

      return dayEnd;
    }, {
      timeout: 15000
    });

    // Calculate cash discrepancy if day is closed
    let warning = null;
    if (closing_cash) {
      const closingCashNum = parseFloat(closing_cash);
      const finalCashInHand = result.cash_in_hand ? parseFloat(result.cash_in_hand) : 0;
      const discrepancy = Math.abs(closingCashNum - finalCashInHand);
      
      if (discrepancy > 0.01) { // Allow small floating-point differences
        warning = `Cash discrepancy detected: Calculated cash in hand is ${finalCashInHand.toFixed(2)}, but closing cash is ${closingCashNum.toFixed(2)}. Difference: ${discrepancy.toFixed(2)}`;
      }
    }

    return NextResponse.json({ 
      ...result,
      warning 
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating/updating day end:', error);
    return NextResponse.json({ error: 'Failed to create/update day end' }, { status: 500 });
  }
}

// PUT - Update day end (mainly for closing the day)
export async function PUT(request) {
  try {
    const body = await request.json();
    const {
      day_end_id,
      closing_cash,
      notes,
      closed_by
    } = body;

    if (!day_end_id) {
      return NextResponse.json({ error: 'Day end ID is required' }, { status: 400 });
    }

    if (!closing_cash) {
      return NextResponse.json({ error: 'Closing cash is required' }, { status: 400 });
    }

    const closingCashNum = parseFloat(closing_cash);
    if (isNaN(closingCashNum) || closingCashNum < 0) {
      return NextResponse.json({ error: 'Closing cash must be a valid positive number' }, { status: 400 });
    }

    // Get the day end record to calculate discrepancy
    const dayEndRecord = await prisma.dayEnd.findUnique({
      where: { day_end_id }
    });

    if (!dayEndRecord) {
      return NextResponse.json({ error: 'Day end record not found' }, { status: 404 });
    }

    if (dayEndRecord.status === 'CLOSED') {
      return NextResponse.json({ error: 'Day is already closed' }, { status: 400 });
    }

    const result = await prisma.dayEnd.update({
      where: { day_end_id },
      data: {
        closing_cash: closingCashNum,
        status: 'CLOSED',
        notes: notes || null,
        closed_by,
        closed_at: new Date()
      }
    });

    // Calculate cash discrepancy
    const calculatedCashInHand = result.cash_in_hand ? parseFloat(result.cash_in_hand) : 0;
    const discrepancy = Math.abs(closingCashNum - calculatedCashInHand);
    let warning = null;

    if (discrepancy > 0.01) {
      warning = `Cash discrepancy detected: Calculated cash in hand is ${calculatedCashInHand.toFixed(2)}, but closing cash is ${closingCashNum.toFixed(2)}. Difference: ${discrepancy.toFixed(2)}`;
    }

    return NextResponse.json({ 
      ...result,
      warning 
    });
  } catch (error) {
    console.error('Error updating day end:', error);
    return NextResponse.json({ error: 'Failed to update day end' }, { status: 500 });
  }
}


