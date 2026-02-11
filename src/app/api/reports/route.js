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
      
      case 'cash-report':
        return await getCashReport(startDate, endDate);
      
      case 'bank-report':
        return await getBankReport(startDate, endDate);
      
      case 'order-report':
        return await getOrderReport(startDate, endDate);
      
      case 'stock-report':
        return await getStockReport();
      
      case 'sale-report':
        return await getSaleReport(startDate, endDate);
      
      case 'profit-report':
        return await getProfitReport(startDate, endDate);
      
      case 'purchase-report':
        return await getPurchaseReport(startDate, endDate);
      
      case 'balance-sheet':
        return await getBalanceSheet();

      case 'supplier-ledger':
        const supplierId = searchParams.get('supplierId') ? parseInt(searchParams.get('supplierId')) : null;
        return await getSupplierLedgerReport(supplierId, startDate, endDate);

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

// Cash Report - All cash transactions
async function getCashReport(startDate, endDate) {
  const whereClause = {
    trnx_type: 'CASH'
  };
  
  if (startDate && endDate) {
    whereClause.created_at = {
      gte: new Date(startDate),
      lte: new Date(endDate + 'T23:59:59.999Z')
    };
  }

  const ledgerEntries = await prisma.ledger.findMany({
    where: whereClause,
    include: {
      customer: {
        select: {
          cus_id: true,
          cus_name: true,
          cus_phone_no: true,
          customer_category: true
        }
      }
    },
    orderBy: {
      created_at: 'asc'
    }
  });

  // Also get cash sales
  const salesWhere = {
    payment_type: 'CASH'
  };
  
  if (startDate && endDate) {
    salesWhere.created_at = {
      gte: new Date(startDate),
      lte: new Date(endDate + 'T23:59:59.999Z')
    };
  }

  const cashSales = await prisma.sale.findMany({
    where: salesWhere,
    include: {
      customer: {
        select: {
          cus_id: true,
          cus_name: true,
          customer_category: true
        }
      }
    },
    orderBy: {
      created_at: 'asc'
    }
  });

  // Get cash purchases
  const purchasesWhere = {
    payment_type: 'CASH'
  };
  
  if (startDate && endDate) {
    purchasesWhere.created_at = {
      gte: new Date(startDate),
      lte: new Date(endDate + 'T23:59:59.999Z')
    };
  }

  const cashPurchases = await prisma.purchase.findMany({
    where: purchasesWhere,
    include: {
      customer: {
        select: {
          cus_id: true,
          cus_name: true,
          customer_category: true
        }
      }
    },
    orderBy: {
      created_at: 'asc'
    }
  });

  // Get cash expenses (all expenses are considered cash)
  const expensesWhere = {};
  if (startDate && endDate) {
    expensesWhere.created_at = {
      gte: new Date(startDate),
      lte: new Date(endDate + 'T23:59:59.999Z')
    };
  }

  const expenses = await prisma.expense.findMany({
    where: expensesWhere,
    include: {
      expense_title: true
    },
    orderBy: {
      created_at: 'asc'
    }
  });

  // Calculate summary
  const summary = {
    totalLedgerEntries: ledgerEntries.length,
    totalLedgerDebit: ledgerEntries.reduce((sum, l) => sum + parseFloat(l.debit_amount), 0),
    totalLedgerCredit: ledgerEntries.reduce((sum, l) => sum + parseFloat(l.credit_amount), 0),
    totalCashSales: cashSales.reduce((sum, s) => sum + parseFloat(s.payment), 0),
    totalCashPurchases: cashPurchases.reduce((sum, p) => sum + parseFloat(p.payment), 0),
    totalExpenses: expenses.reduce((sum, e) => sum + parseFloat(e.exp_amount), 0),
    cashIn: ledgerEntries.reduce((sum, l) => sum + parseFloat(l.credit_amount), 0) + cashSales.reduce((sum, s) => sum + parseFloat(s.payment), 0),
    cashOut: ledgerEntries.reduce((sum, l) => sum + parseFloat(l.debit_amount), 0) + cashPurchases.reduce((sum, p) => sum + parseFloat(p.payment), 0) + expenses.reduce((sum, e) => sum + parseFloat(e.exp_amount), 0)
  };

  return NextResponse.json({ 
    ledgerEntries, 
    cashSales, 
    cashPurchases, 
    expenses,
    summary 
  });
}

// Bank Report - All bank transactions
async function getBankReport(startDate, endDate) {
  const whereClause = {
    trnx_type: 'BANK_TRANSFER'
  };
  
  if (startDate && endDate) {
    whereClause.created_at = {
      gte: new Date(startDate),
      lte: new Date(endDate + 'T23:59:59.999Z')
    };
  }

  const ledgerEntries = await prisma.ledger.findMany({
    where: whereClause,
    include: {
      customer: {
        select: {
          cus_id: true,
          cus_name: true,
          cus_phone_no: true,
          customer_category: true
        }
      }
    },
    orderBy: {
      created_at: 'asc'
    }
  });

  // Get bank sales
  const salesWhere = {
    payment_type: 'BANK_TRANSFER'
  };
  
  if (startDate && endDate) {
    salesWhere.created_at = {
      gte: new Date(startDate),
      lte: new Date(endDate + 'T23:59:59.999Z')
    };
  }

  const bankSales = await prisma.sale.findMany({
    where: salesWhere,
    include: {
      customer: {
        select: {
          cus_id: true,
          cus_name: true,
          customer_category: true
        }
      }
    },
    orderBy: {
      created_at: 'asc'
    }
  });

  // Get bank purchases
  const purchasesWhere = {
    payment_type: 'BANK_TRANSFER'
  };
  
  if (startDate && endDate) {
    purchasesWhere.created_at = {
      gte: new Date(startDate),
      lte: new Date(endDate + 'T23:59:59.999Z')
    };
  }

  const bankPurchases = await prisma.purchase.findMany({
    where: purchasesWhere,
    include: {
      customer: {
        select: {
          cus_id: true,
          cus_name: true,
          customer_category: true
        }
      }
    },
    orderBy: {
      created_at: 'asc'
    }
  });

  // Calculate summary
  const summary = {
    totalLedgerEntries: ledgerEntries.length,
    totalLedgerDebit: ledgerEntries.reduce((sum, l) => sum + parseFloat(l.debit_amount), 0),
    totalLedgerCredit: ledgerEntries.reduce((sum, l) => sum + parseFloat(l.credit_amount), 0),
    totalBankSales: bankSales.reduce((sum, s) => sum + parseFloat(s.payment), 0),
    totalBankPurchases: bankPurchases.reduce((sum, p) => sum + parseFloat(p.payment), 0),
    bankIn: ledgerEntries.reduce((sum, l) => sum + parseFloat(l.credit_amount), 0) + bankSales.reduce((sum, s) => sum + parseFloat(s.payment), 0),
    bankOut: ledgerEntries.reduce((sum, l) => sum + parseFloat(l.debit_amount), 0) + bankPurchases.reduce((sum, p) => sum + parseFloat(p.payment), 0)
  };

  return NextResponse.json({ 
    ledgerEntries, 
    bankSales, 
    bankPurchases, 
    summary 
  });
}

// Order Report - All orders/quotations
async function getOrderReport(startDate, endDate) {
  const whereClause = {
    bill_type: 'ORDER'
  };
  
  if (startDate && endDate) {
    whereClause.created_at = {
      gte: new Date(startDate),
      lte: new Date(endDate + 'T23:59:59.999Z')
    };
  }

  const orders = await prisma.sale.findMany({
    where: whereClause,
    include: {
      customer: {
        include: {
          customer_category: true
        }
      },
      sale_details: {
        include: {
          product: true
        }
      },
      loader: true
    },
    orderBy: {
      created_at: 'desc'
    }
  });

  // Calculate summary
  const summary = {
    totalOrders: orders.length,
    totalAmount: orders.reduce((sum, o) => sum + parseFloat(o.total_amount), 0),
    totalDiscount: orders.reduce((sum, o) => sum + parseFloat(o.discount), 0),
    totalShipping: orders.reduce((sum, o) => sum + parseFloat(o.shipping_amount || 0), 0),
    netTotal: orders.reduce((sum, o) => 
      sum + parseFloat(o.total_amount) - parseFloat(o.discount) + parseFloat(o.shipping_amount || 0), 0
    ),
    pendingPayment: orders.reduce((sum, o) => {
      const netTotal = parseFloat(o.total_amount) - parseFloat(o.discount) + parseFloat(o.shipping_amount || 0);
      return sum + (netTotal - parseFloat(o.payment));
    }, 0)
  };

  return NextResponse.json({ orders, summary });
}

// Stock Report - Current stock levels
async function getStockReport() {
  const products = await prisma.product.findMany({
    include: {
      category: true,
      sub_category: true,
      store_stocks: {
        include: {
          store: true
        }
      }
    },
    orderBy: [
      { category: { cat_name: 'asc' } },
      { pro_title: 'asc' }
    ]
  });

  // Group by category
  const stockByCategory = {};
  
  products.forEach(product => {
    const catName = product.category?.cat_name || 'Uncategorized';
    const catId = product.cat_id;
    
    // Calculate total stock from all stores for this product
    const totalStockQty = product.store_stocks?.reduce((sum, storeStock) => {
      return sum + (storeStock.stock_quantity || 0);
    }, 0) || 0;
    
    if (!stockByCategory[catId]) {
      stockByCategory[catId] = {
        categoryId: catId,
        categoryName: catName,
        products: [],
        totalProducts: 0,
        totalStock: 0,
        totalValue: 0
      };
    }
    
    // Use actual store stock quantity instead of pro_stock_qnty
    const stockValue = totalStockQty * parseFloat(product.pro_cost_price || 0);
    
    // Add calculated stock quantity to product object
    const productWithStock = {
      ...product,
      actualStockQty: totalStockQty, // Add calculated stock
      pro_stock_qnty: totalStockQty, // Override with actual stock for compatibility
      stockValue
    };
    
    stockByCategory[catId].products.push(productWithStock);
    stockByCategory[catId].totalProducts++;
    stockByCategory[catId].totalStock += totalStockQty;
    stockByCategory[catId].totalValue += stockValue;
  });

  const reportData = Object.values(stockByCategory);
  
  // Calculate summary using actual store stock
  const summary = {
    totalProducts: products.length,
    totalCategories: reportData.length,
    totalStock: products.reduce((sum, p) => {
      const actualStock = p.store_stocks?.reduce((storeSum, ss) => storeSum + (ss.stock_quantity || 0), 0) || 0;
      return sum + actualStock;
    }, 0),
    totalStockValue: products.reduce((sum, p) => {
      const actualStock = p.store_stocks?.reduce((storeSum, ss) => storeSum + (ss.stock_quantity || 0), 0) || 0;
      return sum + (actualStock * parseFloat(p.pro_cost_price || 0));
    }, 0),
    lowStockItems: products.filter(p => {
      const actualStock = p.store_stocks?.reduce((storeSum, ss) => storeSum + (ss.stock_quantity || 0), 0) || 0;
      return actualStock < 10 && actualStock > 0;
    }).length,
    outOfStockItems: products.filter(p => {
      const actualStock = p.store_stocks?.reduce((storeSum, ss) => storeSum + (ss.stock_quantity || 0), 0) || 0;
      return actualStock === 0;
    }).length
  };

  return NextResponse.json({ products, stockByCategory: reportData, summary });
}

// Sale Report - Detailed sales report
async function getSaleReport(startDate, endDate) {
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
              category: true
            }
          }
        }
      },
      loader: true
    },
    orderBy: {
      created_at: 'desc'
    }
  });

  // Group by payment type
  const salesByPayment = {
    CASH: { sales: [], total: 0, count: 0 },
    BANK_TRANSFER: { sales: [], total: 0, count: 0 },
    CHEQUE: { sales: [], total: 0, count: 0 },
    SPLIT: { sales: [], total: 0, count: 0 }
  };

  sales.forEach(sale => {
    let paymentType = sale.payment_type;
    
    // Handle split payments (when both cash and bank payments exist)
    if ((sale.cash_payment > 0 && sale.bank_payment > 0) || sale.split_payments?.length > 0) {
      paymentType = 'SPLIT';
    }
    
    if (salesByPayment[paymentType]) {
      salesByPayment[paymentType].sales.push(sale);
      salesByPayment[paymentType].total += parseFloat(sale.total_amount);
      salesByPayment[paymentType].count++;
    }
  });

  // Calculate summary
  const summary = {
    totalSales: sales.length,
    totalAmount: sales.reduce((sum, s) => sum + parseFloat(s.total_amount), 0),
    totalDiscount: sales.reduce((sum, s) => sum + parseFloat(s.discount), 0),
    totalShipping: sales.reduce((sum, s) => sum + parseFloat(s.shipping_amount || 0), 0),
    netTotal: sales.reduce((sum, s) => 
      sum + parseFloat(s.total_amount) - parseFloat(s.discount) + parseFloat(s.shipping_amount || 0), 0
    ),
    totalReceived: sales.reduce((sum, s) => sum + parseFloat(s.payment), 0),
    cashSales: salesByPayment.CASH.total,
    bankSales: salesByPayment.BANK_TRANSFER.total,
    chequeSales: salesByPayment.CHEQUE.total,
    splitSales: salesByPayment.SPLIT.total
  };

  return NextResponse.json({ sales, salesByPayment, summary });
}

// Profit Report - Calculate profit from sales
async function getProfitReport(startDate, endDate) {
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
          product: true
        }
      }
    },
    orderBy: {
      created_at: 'desc'
    }
  });

  // Calculate profit for each sale
  const salesWithProfit = sales.map(sale => {
    let totalCost = 0;
    let totalSale = 0;
    
    sale.sale_details.forEach(detail => {
      const costPrice = parseFloat(detail.product?.pro_cost_price || 0);
      const saleAmount = parseFloat(detail.net_total);
      totalCost += costPrice * detail.qnty;
      totalSale += saleAmount;
    });
    
    const profit = totalSale - totalCost - parseFloat(sale.discount);
    const profitMargin = totalSale > 0 ? (profit / totalSale * 100) : 0;
    
    return {
      ...sale,
      totalCost,
      totalSale,
      profit,
      profitMargin
    };
  });

  // Get expenses for the period
  const expensesWhere = {};
  if (startDate && endDate) {
    expensesWhere.created_at = {
      gte: new Date(startDate),
      lte: new Date(endDate + 'T23:59:59.999Z')
    };
  }

  const expenses = await prisma.expense.findMany({
    where: expensesWhere
  });

  const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.exp_amount), 0);

  // Calculate summary
  const totalSales = salesWithProfit.reduce((sum, s) => sum + s.totalSale, 0);
  const totalCost = salesWithProfit.reduce((sum, s) => sum + s.totalCost, 0);
  const totalDiscount = salesWithProfit.reduce((sum, s) => sum + parseFloat(s.discount), 0);
  const grossProfit = totalSales - totalCost - totalDiscount;
  const netProfit = grossProfit - totalExpenses;

  const summary = {
    totalSales,
    totalCost,
    totalDiscount,
    grossProfit,
    totalExpenses,
    netProfit,
    profitMargin: totalSales > 0 ? (grossProfit / totalSales * 100) : 0,
    netProfitMargin: totalSales > 0 ? (netProfit / totalSales * 100) : 0
  };

  return NextResponse.json({ sales: salesWithProfit, expenses, summary });
}

// Purchase Report - Detailed purchases report
async function getPurchaseReport(startDate, endDate) {
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
              category: true
            }
          }
        }
      }
    },
    orderBy: {
      created_at: 'desc'
    }
  });

  // Group by payment type
  const purchasesByPayment = {
    CASH: { purchases: [], total: 0, count: 0 },
    BANK_TRANSFER: { purchases: [], total: 0, count: 0 },
    CHEQUE: { purchases: [], total: 0, count: 0 },
    ON_CREDIT: { purchases: [], total: 0, count: 0 },
    SPLIT: { purchases: [], total: 0, count: 0 }
  };

  purchases.forEach(purchase => {
    const paymentType = purchase.payment_type;
    if (purchasesByPayment[paymentType]) {
      purchasesByPayment[paymentType].purchases.push(purchase);
      purchasesByPayment[paymentType].total += parseFloat(purchase.net_total);
      purchasesByPayment[paymentType].count++;
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
    totalPaid: purchases.reduce((sum, p) => sum + parseFloat(p.payment), 0),
    cashPurchases: purchasesByPayment.CASH.total,
    bankPurchases: purchasesByPayment.BANK_TRANSFER.total,
    creditPurchases: purchasesByPayment.ON_CREDIT.total
  };

  return NextResponse.json({ purchases, purchasesByPayment, summary });
}

// Balance Sheet - Overall financial position
async function getBalanceSheet() {
  // Get all customers with their balances
  const customers = await prisma.customer.findMany({
    include: {
      customer_category: true
    },
    orderBy: {
      cus_name: 'asc'
    }
  });

  // Calculate receivables and payables
  const receivables = customers.filter(c => parseFloat(c.cus_balance) > 0);
  const payables = customers.filter(c => parseFloat(c.cus_balance) < 0);

  // Get stock value
  const products = await prisma.product.findMany();
  const stockValue = products.reduce((sum, p) => sum + (p.pro_stock_qnty * parseFloat(p.pro_cost_price)), 0);

  // Get total sales
  const totalSales = await prisma.sale.aggregate({
    _sum: {
      total_amount: true,
      payment: true
    }
  });

  // Get total purchases
  const totalPurchases = await prisma.purchase.aggregate({
    _sum: {
      net_total: true,
      payment: true
    }
  });

  // Get total expenses
  const totalExpenses = await prisma.expense.aggregate({
    _sum: {
      exp_amount: true
    }
  });

  const summary = {
    // Assets
    totalReceivables: receivables.reduce((sum, c) => sum + parseFloat(c.cus_balance), 0),
    receivablesCount: receivables.length,
    stockValue,
    totalAssets: receivables.reduce((sum, c) => sum + parseFloat(c.cus_balance), 0) + stockValue,
    
    // Liabilities
    totalPayables: Math.abs(payables.reduce((sum, c) => sum + parseFloat(c.cus_balance), 0)),
    payablesCount: payables.length,
    totalLiabilities: Math.abs(payables.reduce((sum, c) => sum + parseFloat(c.cus_balance), 0)),
    
    // Income Statement
    totalSalesAmount: parseFloat(totalSales._sum.total_amount || 0),
    totalSalesReceived: parseFloat(totalSales._sum.payment || 0),
    totalPurchaseAmount: parseFloat(totalPurchases._sum.net_total || 0),
    totalPurchasePaid: parseFloat(totalPurchases._sum.payment || 0),
    totalExpensesAmount: parseFloat(totalExpenses._sum.exp_amount || 0),
    
    // Net Worth
    netWorth: (receivables.reduce((sum, c) => sum + parseFloat(c.cus_balance), 0) + stockValue) - 
              Math.abs(payables.reduce((sum, c) => sum + parseFloat(c.cus_balance), 0))
  };

  return NextResponse.json({ receivables, payables, products, summary });
}
