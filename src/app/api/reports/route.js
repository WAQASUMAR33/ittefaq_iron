import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - Fetch different types of reports
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get('type');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const customerId = searchParams.get('customerId') ? parseInt(searchParams.get('customerId')) : null;

    switch (reportType) {
      case 'sales-by-date':
        return await getSalesByDateReport(startDate, endDate);
      
      case 'sales-by-customer':
        return await getSalesByCustomerReport(startDate, endDate);
      
      case 'customers-balance':
        return await getCustomersBalanceReport();
      
      case 'customer-ledger':
        return await getCustomerLedgerReport(customerId, startDate, endDate);
      
      case 'purchases-by-date':
        return await getPurchasesByDateReport(startDate, endDate);
      
      case 'purchases-by-supplier':
        return await getPurchasesBySupplierReport(startDate, endDate);
      
      case 'expenses-by-date':
        return await getExpensesByDateReport(startDate, endDate);
      
      default:
        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error fetching report:', error);
    return NextResponse.json({ error: 'Failed to fetch report' }, { status: 500 });
  }
}

// Sales Report by Date Range
async function getSalesByDateReport(startDate, endDate) {
  const whereClause = {};
  
  if (startDate && endDate) {
    whereClause.created_at = {
      gte: new Date(startDate),
      lte: new Date(endDate + 'T23:59:59.999Z')
    };
  }

  const sales = await prisma.sale.findMany({
    where: whereClause,
    include: {
      customer: {
        include: {
          customer_category: true
        }
      },
      sale_details: {
        include: {
          product: {
            include: {
              category: true,
              sub_category: true
            }
          }
        }
      },
      loader: true,
      updated_by_user: {
        select: {
          full_name: true,
          role: true
        }
      }
    },
    orderBy: {
      created_at: 'desc'
    }
  });

  // Calculate summary
  const summary = {
    totalSales: sales.length,
    totalAmount: sales.reduce((sum, s) => sum + parseFloat(s.total_amount), 0),
    totalDiscount: sales.reduce((sum, s) => sum + parseFloat(s.discount), 0),
    totalShipping: sales.reduce((sum, s) => sum + parseFloat(s.shipping_amount || 0), 0),
    totalPayment: sales.reduce((sum, s) => sum + parseFloat(s.payment), 0),
    netTotal: sales.reduce((sum, s) => 
      sum + parseFloat(s.total_amount) - parseFloat(s.discount) + parseFloat(s.shipping_amount || 0), 0
    )
  };

  return NextResponse.json({ sales, summary });
}

// Sales Report by Customer
async function getSalesByCustomerReport(startDate, endDate) {
  const whereClause = {};
  
  if (startDate && endDate) {
    whereClause.created_at = {
      gte: new Date(startDate),
      lte: new Date(endDate + 'T23:59:59.999Z')
    };
  }

  const sales = await prisma.sale.findMany({
    where: whereClause,
    include: {
      customer: {
        include: {
          customer_category: true
        }
      },
      sale_details: true
    },
    orderBy: {
      created_at: 'desc'
    }
  });

  // Group by customer
  const customerSales = {};
  
  sales.forEach(sale => {
    const cusId = sale.cus_id;
    if (!customerSales[cusId]) {
      customerSales[cusId] = {
        customer: sale.customer,
        sales: [],
        totalAmount: 0,
        totalDiscount: 0,
        totalShipping: 0,
        totalPayment: 0,
        netTotal: 0,
        salesCount: 0
      };
    }
    
    customerSales[cusId].sales.push(sale);
    customerSales[cusId].totalAmount += parseFloat(sale.total_amount);
    customerSales[cusId].totalDiscount += parseFloat(sale.discount);
    customerSales[cusId].totalShipping += parseFloat(sale.shipping_amount || 0);
    customerSales[cusId].totalPayment += parseFloat(sale.payment);
    customerSales[cusId].netTotal += parseFloat(sale.total_amount) - parseFloat(sale.discount) + parseFloat(sale.shipping_amount || 0);
    customerSales[cusId].salesCount++;
  });

  const reportData = Object.values(customerSales);
  
  // Calculate overall summary
  const summary = {
    totalCustomers: reportData.length,
    totalSales: sales.length,
    totalAmount: reportData.reduce((sum, c) => sum + c.totalAmount, 0),
    totalDiscount: reportData.reduce((sum, c) => sum + c.totalDiscount, 0),
    totalShipping: reportData.reduce((sum, c) => sum + c.totalShipping, 0),
    totalPayment: reportData.reduce((sum, c) => sum + c.totalPayment, 0),
    netTotal: reportData.reduce((sum, c) => sum + c.netTotal, 0)
  };

  return NextResponse.json({ customerSales: reportData, summary });
}

// Customers Balance Report
async function getCustomersBalanceReport() {
  const customers = await prisma.customer.findMany({
    include: {
      customer_category: true,
      customer_type: true,
      city: true
    },
    orderBy: {
      cus_name: 'asc'
    }
  });

  // Calculate summary
  const summary = {
    totalCustomers: customers.length,
    totalBalance: customers.reduce((sum, c) => sum + parseFloat(c.cus_balance), 0),
    creditBalance: customers.reduce((sum, c) => parseFloat(c.cus_balance) > 0 ? sum + parseFloat(c.cus_balance) : sum, 0),
    debitBalance: customers.reduce((sum, c) => parseFloat(c.cus_balance) < 0 ? sum + Math.abs(parseFloat(c.cus_balance)) : sum, 0)
  };

  return NextResponse.json({ customers, summary });
}

// Customer Ledger Report
async function getCustomerLedgerReport(customerId, startDate, endDate) {
  if (!customerId) {
    return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 });
  }

  const whereClause = { cus_id: customerId };
  
  if (startDate && endDate) {
    whereClause.created_at = {
      gte: new Date(startDate),
      lte: new Date(endDate + 'T23:59:59.999Z')
    };
  }

  const [customer, ledgerEntries] = await Promise.all([
    prisma.customer.findUnique({
      where: { cus_id: customerId },
      include: {
        customer_category: true,
        customer_type: true,
        city: true
      }
    }),
    prisma.ledger.findMany({
      where: whereClause,
      include: {
        updated_by_user: {
          select: {
            full_name: true,
            role: true
          }
        }
      },
      orderBy: {
        created_at: 'asc'
      }
    })
  ]);

  if (!customer) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  }

  // Calculate summary
  const summary = {
    totalEntries: ledgerEntries.length,
    totalDebit: ledgerEntries.reduce((sum, l) => sum + parseFloat(l.debit_amount), 0),
    totalCredit: ledgerEntries.reduce((sum, l) => sum + parseFloat(l.credit_amount), 0),
    totalPayments: ledgerEntries.reduce((sum, l) => sum + parseFloat(l.payments), 0),
    openingBalance: ledgerEntries.length > 0 ? parseFloat(ledgerEntries[0].opening_balance) : parseFloat(customer.cus_balance),
    closingBalance: ledgerEntries.length > 0 ? parseFloat(ledgerEntries[ledgerEntries.length - 1].closing_balance) : parseFloat(customer.cus_balance)
  };

  return NextResponse.json({ customer, ledgerEntries, summary });
}

// Purchase Report by Date Range
async function getPurchasesByDateReport(startDate, endDate) {
  const whereClause = {};
  
  if (startDate && endDate) {
    whereClause.created_at = {
      gte: new Date(startDate),
      lte: new Date(endDate + 'T23:59:59.999Z')
    };
  }

  const purchases = await prisma.purchase.findMany({
    where: whereClause,
    include: {
      customer: {
        include: {
          customer_category: true
        }
      },
      purchase_details: {
        include: {
          product: {
            include: {
              category: true,
              sub_category: true
            }
          }
        }
      },
      updated_by_user: {
        select: {
          full_name: true,
          role: true
        }
      }
    },
    orderBy: {
      created_at: 'desc'
    }
  });

  // Calculate summary
  const summary = {
    totalPurchases: purchases.length,
    totalAmount: purchases.reduce((sum, p) => sum + parseFloat(p.total_amount), 0),
    totalUnloading: purchases.reduce((sum, p) => sum + parseFloat(p.unloading_amount), 0),
    totalFare: purchases.reduce((sum, p) => sum + parseFloat(p.fare_amount), 0),
    totalDiscount: purchases.reduce((sum, p) => sum + parseFloat(p.discount), 0),
    netTotal: purchases.reduce((sum, p) => sum + parseFloat(p.net_total), 0),
    totalPayment: purchases.reduce((sum, p) => sum + parseFloat(p.payment), 0)
  };

  return NextResponse.json({ purchases, summary });
}

// Purchase Report by Supplier
async function getPurchasesBySupplierReport(startDate, endDate) {
  const whereClause = {};
  
  if (startDate && endDate) {
    whereClause.created_at = {
      gte: new Date(startDate),
      lte: new Date(endDate + 'T23:59:59.999Z')
    };
  }

  const purchases = await prisma.purchase.findMany({
    where: whereClause,
    include: {
      customer: {
        include: {
          customer_category: true
        }
      },
      purchase_details: true
    },
    orderBy: {
      created_at: 'desc'
    }
  });

  // Group by supplier (customer)
  const supplierPurchases = {};
  
  purchases.forEach(purchase => {
    const cusId = purchase.cus_id;
    if (!supplierPurchases[cusId]) {
      supplierPurchases[cusId] = {
        supplier: purchase.customer,
        purchases: [],
        totalAmount: 0,
        totalUnloading: 0,
        totalFare: 0,
        totalDiscount: 0,
        netTotal: 0,
        totalPayment: 0,
        purchasesCount: 0
      };
    }
    
    supplierPurchases[cusId].purchases.push(purchase);
    supplierPurchases[cusId].totalAmount += parseFloat(purchase.total_amount);
    supplierPurchases[cusId].totalUnloading += parseFloat(purchase.unloading_amount);
    supplierPurchases[cusId].totalFare += parseFloat(purchase.fare_amount);
    supplierPurchases[cusId].totalDiscount += parseFloat(purchase.discount);
    supplierPurchases[cusId].netTotal += parseFloat(purchase.net_total);
    supplierPurchases[cusId].totalPayment += parseFloat(purchase.payment);
    supplierPurchases[cusId].purchasesCount++;
  });

  const reportData = Object.values(supplierPurchases);
  
  // Calculate overall summary
  const summary = {
    totalSuppliers: reportData.length,
    totalPurchases: purchases.length,
    totalAmount: reportData.reduce((sum, s) => sum + s.totalAmount, 0),
    totalUnloading: reportData.reduce((sum, s) => sum + s.totalUnloading, 0),
    totalFare: reportData.reduce((sum, s) => sum + s.totalFare, 0),
    totalDiscount: reportData.reduce((sum, s) => sum + s.totalDiscount, 0),
    netTotal: reportData.reduce((sum, s) => sum + s.netTotal, 0),
    totalPayment: reportData.reduce((sum, s) => sum + s.totalPayment, 0)
  };

  return NextResponse.json({ supplierPurchases: reportData, summary });
}

// Expense Report by Date Range
async function getExpensesByDateReport(startDate, endDate) {
  const whereClause = {};
  
  if (startDate && endDate) {
    whereClause.created_at = {
      gte: new Date(startDate),
      lte: new Date(endDate + 'T23:59:59.999Z')
    };
  }

  const expenses = await prisma.expense.findMany({
    where: whereClause,
    include: {
      expense_title: true,
      updated_by_user: {
        select: {
          full_name: true,
          role: true
        }
      }
    },
    orderBy: {
      created_at: 'desc'
    }
  });

  // Group by expense type
  const expensesByType = {};
  
  expenses.forEach(expense => {
    const typeId = expense.exp_type;
    const typeName = expense.expense_title?.title || 'Unknown';
    
    if (!expensesByType[typeId]) {
      expensesByType[typeId] = {
        expenseType: typeName,
        expenses: [],
        totalAmount: 0,
        count: 0
      };
    }
    
    expensesByType[typeId].expenses.push(expense);
    expensesByType[typeId].totalAmount += parseFloat(expense.exp_amount);
    expensesByType[typeId].count++;
  });

  const reportData = Object.values(expensesByType);
  
  // Calculate summary
  const summary = {
    totalExpenses: expenses.length,
    totalAmount: expenses.reduce((sum, e) => sum + parseFloat(e.exp_amount), 0),
    totalTypes: reportData.length
  };

  return NextResponse.json({ expenses, expensesByType: reportData, summary });
}

