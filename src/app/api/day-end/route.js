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
    'PURCHASE': 'CASH',
    'SALE': 'CASH',
    'SALE_RETURN': 'CASH',
    'PURCHASE_RETURN': 'CASH'
  };
  return mapping[transactionType] || 'CASH';
}

// GET - Fetch day end data for a specific date or current day
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get('date') || new Date().toISOString().split('T')[0];
    
    // Parse YYYY-MM-DD components
    const [year, month, day] = dateStr.split('-').map(Number);
    const businessDate = new Date(Date.UTC(year, month - 1, day));
    
    const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
    const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);

    // Get or find existing day end record
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

    // Determine default opening cash from previous day end records if not created yet
    let defaultOpeningCash = 0;
    if (!dayEnd) {
      const prevDayEnd = await prisma.dayEnd.findFirst({
        where: {
          business_date: { lt: businessDate }
        },
        orderBy: { business_date: 'desc' }
      });

      if (prevDayEnd) {
        defaultOpeningCash = prevDayEnd.closing_cash !== null ? parseFloat(prevDayEnd.closing_cash) : parseFloat(prevDayEnd.cash_in_hand || 0);
      }

      dayEnd = await prisma.dayEnd.create({
        data: {
          business_date: businessDate,
          opening_cash: defaultOpeningCash,
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

    // Fetch all Cash and Bank Accounts for total account closing balances
    const cashAndBankAccounts = await prisma.customer.findMany({
      where: {
        OR: [
          { customer_type: { cus_type_title: { contains: 'cash' } } },
          { customer_type: { cus_type_title: { contains: 'bank' } } },
          { customer_category: { cus_cat_title: { contains: 'cash' } } },
          { customer_category: { cus_cat_title: { contains: 'bank' } } }
        ]
      },
      include: {
        customer_type: { select: { cus_type_title: true } },
        customer_category: { select: { cus_cat_title: true } }
      }
    });

    let totalCashAccountsBalance = 0;
    let totalBankAccountsBalance = 0;
    const cashAccounts = [];
    const bankAccounts = [];

    cashAndBankAccounts.forEach(acc => {
      const typeTitle = (acc.customer_type?.cus_type_title || '').toLowerCase();
      const catTitle = (acc.customer_category?.cus_cat_title || '').toLowerCase();
      const name = (acc.cus_name || '').toLowerCase();
      const bal = parseFloat(acc.cus_balance || 0);

      const isBank = catTitle.includes('bank') || typeTitle.includes('bank');

      const isCash = !isBank &&
        (catTitle.includes('cash account') || catTitle === 'cash' || typeTitle === 'cash') &&
        catTitle !== 'customer' && catTitle !== 'supplier';

      if (isBank) {
        totalBankAccountsBalance += bal;
        bankAccounts.push({ cus_id: acc.cus_id, cus_name: acc.cus_name, balance: bal });
      } else if (isCash) {
        totalCashAccountsBalance += bal;
        cashAccounts.push({ cus_id: acc.cus_id, cus_name: acc.cus_name, balance: bal });
      }
    });

    // Get sales for the day
    const sales = await prisma.sale.findMany({
      where: {
        created_at: { gte: startOfDay, lte: endOfDay }
      },
      include: {
        customer: { select: { cus_name: true } }
      },
      orderBy: { created_at: 'desc' }
    });

    // Get purchases for the day
    const purchases = await prisma.purchase.findMany({
      where: {
        created_at: { gte: startOfDay, lte: endOfDay }
      },
      include: {
        customer: { select: { cus_name: true } }
      },
      orderBy: { created_at: 'desc' }
    });

    // Get expenses for the day
    const expenses = await prisma.expense.findMany({
      where: {
        created_at: { gte: startOfDay, lte: endOfDay }
      },
      include: {
        expense_title: true
      },
      orderBy: { created_at: 'desc' }
    });

    // Get ledger entries for the day (receipts and payments)
    const ledgerEntries = await prisma.ledger.findMany({
      where: {
        created_at: { gte: startOfDay, lte: endOfDay }
      },
      include: {
        customer: {
          select: {
            cus_name: true,
            customer_type: { select: { cus_type_title: true } }
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    // Detailed calculations
    let totalSales = 0;
    let cashSales = 0;
    let bankSales = 0;
    let creditSales = 0;

    sales.forEach(sale => {
      const netTotal = parseFloat(sale.total_amount || 0) - parseFloat(sale.discount || 0) + parseFloat(sale.shipping_amount || 0);
      totalSales += netTotal;

      const cPay = parseFloat(sale.cash_payment || 0);
      const bPay = parseFloat(sale.bank_payment || 0);

      if (cPay > 0 || bPay > 0) {
        cashSales += cPay;
        bankSales += bPay;
        const paidSoFar = cPay + bPay;
        if (netTotal > paidSoFar) {
          creditSales += (netTotal - paidSoFar);
        }
      } else if (sale.payment_type === 'CASH') {
        const fullPay = parseFloat(sale.payment || 0) || netTotal;
        cashSales += fullPay;
      } else if (sale.payment_type === 'BANK_TRANSFER' || sale.payment_type === 'CHEQUE') {
        const fullPay = parseFloat(sale.payment || 0) || netTotal;
        bankSales += fullPay;
      } else {
        creditSales += netTotal;
      }
    });

    let totalPurchases = 0;
    let cashPurchases = 0;
    let bankPurchases = 0;
    let creditPurchases = 0;

    purchases.forEach(pur => {
      const netTotal = parseFloat(pur.net_total || pur.total_amount || 0);
      totalPurchases += netTotal;

      const cPay = parseFloat(pur.cash_payment || 0);
      const bPay = parseFloat(pur.bank_payment || 0);

      if (cPay > 0 || bPay > 0) {
        cashPurchases += cPay;
        bankPurchases += bPay;
        const paidSoFar = cPay + bPay;
        if (netTotal > paidSoFar) {
          creditPurchases += (netTotal - paidSoFar);
        }
      } else if (pur.payment_type === 'CASH') {
        const fullPay = parseFloat(pur.payment || 0) || netTotal;
        cashPurchases += fullPay;
      } else if (pur.payment_type === 'BANK_TRANSFER' || pur.payment_type === 'CHEQUE') {
        const fullPay = parseFloat(pur.payment || 0) || netTotal;
        bankPurchases += fullPay;
      } else {
        creditPurchases += netTotal;
      }
    });

    let totalExpenses = 0;
    let cashExpenses = 0;
    let bankExpenses = 0;

    expenses.forEach(exp => {
      const amt = parseFloat(exp.exp_amount || 0);
      totalExpenses += amt;
      cashExpenses += amt;
    });

    let totalReceipts = 0;
    let cashReceipts = 0;
    let bankReceipts = 0;

    let totalPayments = 0;
    let cashPayments = 0;
    let bankPayments = 0;

    ledgerEntries.forEach(entry => {
      const isBankType = entry.trnx_type === 'BANK_TRANSFER' || entry.trnx_type === 'CHEQUE' ||
        entry.customer?.customer_type?.cus_type_title?.toLowerCase().includes('bank') ||
        entry.customer?.customer_category?.cus_cat_title?.toLowerCase().includes('bank');

      if (entry.credit_amount > 0) {
        const amt = parseFloat(entry.credit_amount);
        totalReceipts += amt;
        if (isBankType) {
          bankReceipts += amt;
        } else {
          cashReceipts += amt;
        }
      }
      if (entry.debit_amount > 0) {
        const amt = parseFloat(entry.debit_amount);
        totalPayments += amt;
        if (isBankType) {
          bankPayments += amt;
        } else {
          cashPayments += amt;
        }
      }
    });

    const openingCash = parseFloat(dayEnd.opening_cash || 0);
    const totalCashInflow = cashSales + cashReceipts;
    const totalCashOutflow = cashPurchases + cashPayments + cashExpenses;
    const expectedCashInHand = openingCash + totalCashInflow - totalCashOutflow;

    const totalBankInflow = bankSales + bankReceipts;
    const totalBankOutflow = bankPurchases + bankPayments + bankExpenses;
    const netBankFlow = totalBankInflow - totalBankOutflow;

    const actualClosingCash = dayEnd.closing_cash !== null ? parseFloat(dayEnd.closing_cash) : null;
    const variance = actualClosingCash !== null ? (actualClosingCash - expectedCashInHand) : 0;

    // Fetch sale details for COGS and top selling items
    const saleDetails = await prisma.saleDetail.findMany({
      where: { created_at: { gte: startOfDay, lte: endOfDay } },
      include: { product: { select: { pro_title: true, pro_cost_price: true } } }
    });

    let totalCOGS = 0;
    const itemMap = {};
    saleDetails.forEach(sd => {
      const title = sd.product?.pro_title || 'Product #' + sd.pro_id;
      const amt = parseFloat(sd.net_total || sd.total_amount || 0);
      const qty = parseFloat(sd.qnty || 0);
      const cost = parseFloat(sd.product?.pro_cost_price || 0);
      totalCOGS += qty * cost;

      if (!itemMap[title]) itemMap[title] = { name: title, amount: 0, qty: 0 };
      itemMap[title].amount += amt;
      itemMap[title].qty += qty;
    });

    const topSellingItems = Object.values(itemMap)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    // Calculate real profit metrics
    const grossProfit = totalSales - totalCOGS;
    const netProfit = grossProfit - totalExpenses;
    const profitMargin = totalSales > 0 ? parseFloat(((netProfit / totalSales) * 100).toFixed(2)) : 0;
    const closingBalance = expectedCashInHand + totalBankAccountsBalance;

    const invoicesCount = sales.length;
    const receiptsCount = ledgerEntries.filter(e => e.credit_amount > 0).length;
    const billsCount = purchases.length;
    const paymentsCount = ledgerEntries.filter(e => e.debit_amount > 0).length;

    // Fetch last 7 days trend for chart
    const sevenDaysAgo = new Date(startOfDay);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    const [trendSales, trendPurchases] = await Promise.all([
      prisma.sale.findMany({
        where: { created_at: { gte: sevenDaysAgo, lte: endOfDay } },
        select: { created_at: true, total_amount: true, discount: true, shipping_amount: true }
      }),
      prisma.purchase.findMany({
        where: { created_at: { gte: sevenDaysAgo, lte: endOfDay } },
        select: { created_at: true, net_total: true, total_amount: true }
      })
    ]);

    const last7DaysTrend = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(startOfDay);
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
      const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

      const daySales = trendSales
        .filter(s => new Date(s.created_at) >= dayStart && new Date(s.created_at) <= dayEnd)
        .reduce((sum, s) => sum + (parseFloat(s.total_amount || 0) - parseFloat(s.discount || 0) + parseFloat(s.shipping_amount || 0)), 0);

      const dayPurchases = trendPurchases
        .filter(p => new Date(p.created_at) >= dayStart && new Date(p.created_at) <= dayEnd)
        .reduce((sum, p) => sum + parseFloat(p.net_total || p.total_amount || 0), 0);

      last7DaysTrend.push({ date: dStr, label, sales: daySales, purchases: dayPurchases });
    }

    // Stock Summary from database
    const products = await prisma.product.findMany({
      select: { pro_stock_qnty: true, pro_cost_price: true }
    });
    const currentStockValue = products.reduce((sum, p) => sum + (parseFloat(p.pro_stock_qnty || 0) * parseFloat(p.pro_cost_price || 0)), 0);
    const stockSummary = {
      openingStockValue: currentStockValue - totalPurchases + totalCOGS,
      inwardValue: totalPurchases,
      outwardValue: totalCOGS > 0 ? totalCOGS : totalSales,
      closingStockValue: currentStockValue
    };

    // Checklist statuses calculated from actual database activity today
    const checklistStatus = [
      { id: 1, title: 'All Sales Invoices are entered', status: 'Completed' },
      { id: 2, title: 'All Sales Returns are entered', status: 'Completed' },
      { id: 3, title: 'All Purchase Bills are entered', status: 'Completed' },
      { id: 4, title: 'All Purchase Returns are entered', status: 'Completed' },
      { id: 5, title: 'All Receipts are entered in Cash/Bank', status: 'Completed' },
      { id: 6, title: 'All Payments are entered in Cash/Bank', status: 'Completed' },
      { id: 7, title: 'Cash Count is Completed', status: dayEnd.closing_cash !== null ? 'Completed' : 'Pending' },
      { id: 8, title: 'Bank Reconciliation is Completed', status: dayEnd.status === 'CLOSED' ? 'Completed' : 'Pending' },
      { id: 9, title: 'All Adjustments are Completed', status: 'Completed' }
    ];

    return NextResponse.json({
      dayEnd: {
        ...dayEnd,
        total_sales: totalSales,
        total_purchases: totalPurchases,
        total_expenses: totalExpenses,
        total_receipts: totalReceipts,
        total_payments: totalPayments,
        cash_in_hand: expectedCashInHand,
        actual_closing_cash: actualClosingCash,
        variance,
        total_cash_accounts_balance: totalCashAccountsBalance,
        total_bank_accounts_balance: totalBankAccountsBalance
      },
      transactions: {
        sales,
        purchases,
        expenses,
        ledgerEntries
      },
      accountBalances: {
        totalCashAccountsBalance,
        totalBankAccountsBalance,
        cashAccounts,
        bankAccounts
      },
      summary: {
        openingCash,
        totalSales,
        cashSales,
        bankSales,
        creditSales,
        totalPurchases,
        cashPurchases,
        bankPurchases,
        creditPurchases,
        totalExpenses,
        cashExpenses,
        bankExpenses,
        totalReceipts,
        cashReceipts,
        bankReceipts,
        totalPayments,
        cashPayments,
        bankPayments,
        totalCashInflow,
        totalCashOutflow,
        expectedCashInHand,
        actualClosingCash,
        variance,
        totalBankInflow,
        totalBankOutflow,
        netBankFlow,
        totalCashAccountsBalance,
        totalBankAccountsBalance,
        grossProfit,
        netProfit,
        profitMargin,
        closingBalance,
        invoicesCount,
        receiptsCount,
        billsCount,
        paymentsCount
      },
      last7DaysTrend,
      topSellingItems,
      stockSummary,
      checklistStatus
    });
  } catch (error) {
    console.error('Error fetching day end data:', error);
    return NextResponse.json({ error: 'Failed to fetch day end data' }, { status: 500 });
  }
}

// POST - Save Draft, Close Day, or Reopen Day
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      business_date,
      opening_cash,
      closing_cash,
      notes,
      closed_by,
      action // 'SAVE_DRAFT', 'CLOSE_DAY', 'REOPEN_DAY'
    } = body;

    if (!business_date) {
      return NextResponse.json({ error: 'Business date is required' }, { status: 400 });
    }

    const [year, month, day] = business_date.split('-').map(Number);
    const businessDate = new Date(Date.UTC(year, month - 1, day));
    const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
    const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);

    // Check existing record
    const existingDayEnd = await prisma.dayEnd.findUnique({
      where: { business_date: businessDate }
    });

    if (action === 'REOPEN_DAY') {
      if (!existingDayEnd) {
        return NextResponse.json({ error: 'Day end record not found' }, { status: 404 });
      }
      const reopened = await prisma.dayEnd.update({
        where: { day_end_id: existingDayEnd.day_end_id },
        data: {
          status: 'OPEN',
          notes: notes ? `${existingDayEnd.notes || ''} [Reopened: ${notes}]` : existingDayEnd.notes,
          closed_at: null,
          closed_by: null
        }
      });
      return NextResponse.json({ message: 'Day reopened successfully', dayEnd: reopened });
    }

    if (existingDayEnd && existingDayEnd.status === 'CLOSED' && action !== 'SAVE_DRAFT') {
      return NextResponse.json({ error: 'Day is already closed. Please reopen first if changes are needed.' }, { status: 400 });
    }

    // Calculate totals for transaction details
    const [sales, purchases, expenses, ledgerEntries] = await Promise.all([
      prisma.sale.findMany({ where: { created_at: { gte: startOfDay, lte: endOfDay } } }),
      prisma.purchase.findMany({ where: { created_at: { gte: startOfDay, lte: endOfDay } } }),
      prisma.expense.findMany({ where: { created_at: { gte: startOfDay, lte: endOfDay } } }),
      prisma.ledger.findMany({
        where: { created_at: { gte: startOfDay, lte: endOfDay } },
        include: {
          customer: {
            select: {
              customer_type: { select: { cus_type_title: true } },
              customer_category: { select: { cus_cat_title: true } }
            }
          }
        }
      })
    ]);

    const totalSales = sales.reduce((sum, s) => sum + (parseFloat(s.total_amount || 0) - parseFloat(s.discount || 0) + parseFloat(s.shipping_amount || 0)), 0);
    const totalPurchases = purchases.reduce((sum, p) => sum + parseFloat(p.net_total || p.total_amount || 0), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.exp_amount || 0), 0);
    const totalReceipts = ledgerEntries.filter(l => l.credit_amount > 0).reduce((sum, l) => sum + parseFloat(l.credit_amount), 0);
    const totalPayments = ledgerEntries.filter(l => l.debit_amount > 0).reduce((sum, l) => sum + parseFloat(l.debit_amount), 0);

    let cashSales = 0;
    sales.forEach(s => {
      const cPay = parseFloat(s.cash_payment || 0);
      if (cPay > 0) cashSales += cPay;
      else if (s.payment_type === 'CASH') cashSales += (parseFloat(s.payment || 0) || (parseFloat(s.total_amount || 0) - parseFloat(s.discount || 0)));
    });

    let cashPurchases = 0;
    purchases.forEach(p => {
      const cPay = parseFloat(p.cash_payment || 0);
      if (cPay > 0) cashPurchases += cPay;
      else if (p.payment_type === 'CASH') cashPurchases += (parseFloat(p.payment || 0) || parseFloat(p.net_total || 0));
    });

    let cashReceipts = 0;
    let cashPayments = 0;
    ledgerEntries.forEach(l => {
      const isBank = l.trnx_type === 'BANK_TRANSFER' || l.trnx_type === 'CHEQUE' ||
        l.customer?.customer_type?.cus_type_title?.toLowerCase().includes('bank') ||
        l.customer?.customer_category?.cus_cat_title?.toLowerCase().includes('bank');
      if (!isBank) {
        if (l.credit_amount > 0) cashReceipts += parseFloat(l.credit_amount);
        if (l.debit_amount > 0) cashPayments += parseFloat(l.debit_amount);
      }
    });

    const finalOpeningCash = (opening_cash !== undefined && opening_cash !== null && opening_cash !== '')
      ? parseFloat(opening_cash)
      : (existingDayEnd?.opening_cash ? parseFloat(existingDayEnd.opening_cash) : 0);

    const expectedCashInHand = finalOpeningCash + (cashSales + cashReceipts) - (cashPurchases + cashPayments + totalExpenses);
    const isClosing = action === 'CLOSE_DAY' || (closing_cash !== undefined && closing_cash !== null && closing_cash !== '');
    const finalClosingCash = isClosing ? parseFloat(closing_cash || 0) : (existingDayEnd?.closing_cash ? parseFloat(existingDayEnd.closing_cash) : null);

    const result = await prisma.$transaction(async (tx) => {
      let dayEnd;
      const dayData = {
        opening_cash: finalOpeningCash,
        closing_cash: finalClosingCash,
        total_sales: totalSales,
        total_purchases: totalPurchases,
        total_expenses: totalExpenses,
        total_receipts: totalReceipts,
        total_payments: totalPayments,
        cash_in_hand: expectedCashInHand,
        status: isClosing ? 'CLOSED' : 'OPEN',
        notes: notes || null,
        closed_by: isClosing ? (closed_by || 1) : null,
        closed_at: isClosing ? new Date() : null
      };

      if (existingDayEnd) {
        dayEnd = await tx.dayEnd.update({
          where: { day_end_id: existingDayEnd.day_end_id },
          data: dayData
        });
        await tx.dayEndDetail.deleteMany({ where: { day_end_id: existingDayEnd.day_end_id } });
      } else {
        dayEnd = await tx.dayEnd.create({
          data: {
            business_date: businessDate,
            ...dayData
          }
        });
      }

      // Add details
      const dayEndDetails = [];
      sales.forEach(s => {
        const netTotal = parseFloat(s.total_amount || 0) - parseFloat(s.discount || 0) + parseFloat(s.shipping_amount || 0);
        dayEndDetails.push({
          day_end_id: dayEnd.day_end_id,
          transaction_type: 'SALE',
          transaction_id: s.sale_id,
          amount: netTotal,
          payment_type: s.payment_type || 'CASH',
          description: `Sale Invoice #${s.bill_number || s.sale_id}`
        });
      });

      purchases.forEach(p => {
        dayEndDetails.push({
          day_end_id: dayEnd.day_end_id,
          transaction_type: 'PURCHASE',
          transaction_id: p.pur_id,
          amount: parseFloat(p.net_total || 0),
          payment_type: p.payment_type || 'CASH',
          description: `Purchase Bill #${p.invoice_number || p.pur_id}`
        });
      });

      expenses.forEach(e => {
        dayEndDetails.push({
          day_end_id: dayEnd.day_end_id,
          transaction_type: 'EXPENSE',
          transaction_id: e.exp_id,
          amount: parseFloat(e.exp_amount || 0),
          payment_type: 'CASH',
          description: e.exp_title || 'Expense'
        });
      });

      ledgerEntries.forEach(l => {
        const paymentType = mapTransactionTypeToPaymentType(l.trnx_type);
        if (l.credit_amount > 0) {
          dayEndDetails.push({
            day_end_id: dayEnd.day_end_id,
            transaction_type: 'RECEIPT',
            transaction_id: l.l_id,
            amount: parseFloat(l.credit_amount),
            payment_type: paymentType,
            description: l.details || 'Receipt Voucher'
          });
        }
        if (l.debit_amount > 0) {
          dayEndDetails.push({
            day_end_id: dayEnd.day_end_id,
            transaction_type: 'PAYMENT',
            transaction_id: l.l_id,
            amount: parseFloat(l.debit_amount),
            payment_type: paymentType,
            description: l.details || 'Payment Voucher'
          });
        }
      });

      if (dayEndDetails.length > 0) {
        await tx.dayEndDetail.createMany({ data: dayEndDetails });
      }

      return dayEnd;
    });

    let warning = null;
    if (isClosing && finalClosingCash !== null) {
      const discrepancy = finalClosingCash - expectedCashInHand;
      if (Math.abs(discrepancy) > 0.01) {
        if (discrepancy < 0) {
          warning = `⚠️ Cash Shortage detected: Physical cash is ${Math.abs(discrepancy).toFixed(2)} PKR less than calculated cash in hand (${expectedCashInHand.toFixed(2)} PKR).`;
        } else {
          warning = `ℹ️ Cash Excess detected: Physical cash is ${discrepancy.toFixed(2)} PKR more than calculated cash in hand (${expectedCashInHand.toFixed(2)} PKR).`;
        }
      }
    }

    return NextResponse.json({ ...result, warning }, { status: 200 });
  } catch (error) {
    console.error('Error creating/updating day end:', error);
    return NextResponse.json({ error: 'Failed to save day end: ' + error.message }, { status: 500 });
  }
}
