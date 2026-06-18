const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Inline helper functions
function calculateClosingBalance(openingBalance, debitAmount = 0, creditAmount = 0, accountNature = 'RECEIVABLE') {
  const opening = parseFloat(openingBalance || 0);
  const debit = parseFloat(debitAmount || 0);
  const credit = parseFloat(creditAmount || 0);
  if (accountNature === 'PAYABLE') {
    return opening - debit + credit;
  }
  return opening + debit - credit;
}

function createLedgerEntry(config) {
  const {
    cus_id,
    opening_balance,
    debit_amount = 0,
    credit_amount = 0,
    bill_no,
    trnx_type,
    details,
    payments = 0,
    cash_payment = 0,
    bank_payment = 0,
    updated_by = null,
    account_nature = 'RECEIVABLE'
  } = config;
  const closing_balance = calculateClosingBalance(opening_balance, debit_amount, credit_amount, account_nature);
  return {
    cus_id,
    opening_balance: parseFloat(opening_balance),
    debit_amount: parseFloat(debit_amount || 0),
    credit_amount: parseFloat(credit_amount || 0),
    closing_balance,
    bill_no: bill_no.toString(),
    trnx_type,
    details,
    payments: parseFloat(payments || 0),
    cash_payment: parseFloat(cash_payment || 0),
    bank_payment: parseFloat(bank_payment || 0),
    updated_by: updated_by ? parseInt(updated_by) : null
  };
}

function createPayableLedgerEntry(config) {
  return createLedgerEntry({ ...config, account_nature: 'PAYABLE' });
}

async function resolveOpeningBalance(tx, cus_id, target_created_at) {
  const priorEntry = await tx.ledger.findFirst({
    where: { cus_id, created_at: { lt: target_created_at } },
    orderBy: [
      { created_at: 'desc' },
      { l_id: 'desc' }
    ],
    select: { closing_balance: true }
  });
  if (priorEntry) return parseFloat(priorEntry.closing_balance || 0);
  return 0;
}

const safeParseFloat = (value, defaultValue = 0) => {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
};

const safeParseInt = (value, defaultValue = null) => {
  const parsed = parseInt(value);
  return isNaN(parsed) ? defaultValue : parsed;
};

// Inline storeStock logic
async function ensureStoreStocksTable(prismaClient) {
  try {
    await prismaClient.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS store_stocks (
        store_stock_id INT NOT NULL AUTO_INCREMENT,
        store_id INT NOT NULL,
        pro_id INT NOT NULL,
        stock_quantity DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        min_stock DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        max_stock DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        updated_by INT NULL,
        UNIQUE KEY store_id_pro_id (store_id, pro_id),
        PRIMARY KEY (store_stock_id)
      ) ENGINE=InnoDB;
    `);
  } catch (e) {
    console.warn('ensureStoreStocksTable: could not ensure table exists:', e.message);
  }
}

async function getOrCreateStoreStock(storeId, productId, updatedBy = null, prismaClient = null) {
  const tx = prismaClient ?? prisma;
  const storeIdInt = parseInt(storeId);
  const productIdInt = parseInt(productId);

  const useDelegate = !!tx.storeStock;
  let storeStock;
  if (useDelegate) {
    try {
      storeStock = await tx.storeStock.findUnique({
        where: {
          store_id_pro_id: {
            store_id: storeIdInt,
            pro_id: productIdInt
          }
        }
      });
    } catch (e) {
      if (e.code === 'P2021') {
        await ensureStoreStocksTable(tx);
      } else {
        throw e;
      }
    }
  }

  if (!storeStock) {
    const rows = await tx.$queryRaw`SELECT * FROM store_stocks WHERE store_id = ${storeIdInt} AND pro_id = ${productIdInt} LIMIT 1`;
    storeStock = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  }

  if (!storeStock) {
    if (useDelegate) {
      try {
        storeStock = await tx.storeStock.upsert({
          where: {
            store_id_pro_id: {
              store_id: storeIdInt,
              pro_id: productIdInt
            }
          },
          create: {
            store_id: storeIdInt,
            pro_id: productIdInt,
            stock_quantity: 0,
            min_stock: 0,
            max_stock: 1000,
            updated_by: updatedBy
          },
          update: {}
        });
      } catch (e) {
        if (e.code === 'P2021') {
          await ensureStoreStocksTable(tx);
        } else {
          throw e;
        }
      }
    }

    if (!storeStock) {
      await tx.$executeRaw`INSERT INTO store_stocks (store_id, pro_id, stock_quantity, min_stock, max_stock, updated_by) VALUES (${storeIdInt}, ${productIdInt}, 0.00, 0.00, 1000.00, ${updatedBy}) ON DUPLICATE KEY UPDATE store_stock_id = store_stock_id`;
      const rows2 = await tx.$queryRaw`SELECT * FROM store_stocks WHERE store_id = ${storeIdInt} AND pro_id = ${productIdInt} LIMIT 1`;
      storeStock = Array.isArray(rows2) && rows2.length > 0 ? rows2[0] : null;
    }
  }

  return storeStock;
}

async function updateStoreStock(storeId, productId, quantityChange, operation = 'increment', updatedBy = null, prismaClient = null) {
  const tx = prismaClient ?? prisma;
  const storeIdInt = parseInt(storeId);
  const productIdInt = parseInt(productId);

  const storeStock = await getOrCreateStoreStock(storeIdInt, productIdInt, updatedBy, tx);

  const updateData = {
    updated_by: updatedBy,
    updated_at: new Date()
  };

  if (operation === 'increment') {
    updateData.stock_quantity = { increment: quantityChange };
  } else if (operation === 'decrement') {
    updateData.stock_quantity = { decrement: quantityChange };
  } else if (operation === 'set') {
    updateData.stock_quantity = quantityChange;
  }

  if (tx.storeStock) {
    try {
      return await tx.storeStock.update({
        where: {
          store_id_pro_id: {
            store_id: storeIdInt,
            pro_id: productIdInt
          }
        },
        data: updateData
      });
    } catch (e) {
      if (e.code !== 'P2021') throw e;
      await ensureStoreStocksTable(tx);
    }
  }

  if (operation === 'increment') {
    await tx.$executeRaw`UPDATE store_stocks SET stock_quantity = stock_quantity + ${quantityChange}, updated_by = ${updatedBy}, updated_at = NOW() WHERE store_id = ${storeIdInt} AND pro_id = ${productIdInt}`;
  } else if (operation === 'decrement') {
    await tx.$executeRaw`UPDATE store_stocks SET stock_quantity = stock_quantity - ${quantityChange}, updated_by = ${updatedBy}, updated_at = NOW() WHERE store_id = ${storeIdInt} AND pro_id = ${productIdInt}`;
  } else {
    await tx.$executeRaw`UPDATE store_stocks SET stock_quantity = ${quantityChange}, updated_by = ${updatedBy}, updated_at = NOW() WHERE store_id = ${storeIdInt} AND pro_id = ${productIdInt}`;
  }
  const rows = await tx.$queryRaw`SELECT * FROM store_stocks WHERE store_id = ${storeIdInt} AND pro_id = ${productIdInt} LIMIT 1`;
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

async function testPost() {
  try {
    const supplier = await prisma.customer.findFirst({
      where: { customer_category: { cus_cat_title: { contains: 'Supplier' } } }
    });
    const product = await prisma.product.findFirst();
    const store = await prisma.store.findFirst();

    if (!supplier || !product || !store) {
      console.error('Missing seed data');
      return;
    }

    const body = {
      cus_id: supplier.cus_id,
      store_id: store.storeid,
      total_amount: 11700,
      payment: 0,
      payment_type: 'CASH',
      cash_payment: 0,
      bank_payment: 0,
      purchase_details: [
        {
          pro_id: product.pro_id,
          qnty: 1,
          unit: 'pcs',
          unit_rate: 11700,
          total_amount: 11700
        }
      ]
    };

    const {
      cus_id,
      store_id,
      debit_account_id,
      total_amount,
      unloading_amount = 0,
      fare_amount = 0,
      transport_amount = 0,
      labour_amount = 0,
      discount = 0,
      payment,
      payment_type,
      cash_payment = 0,
      bank_payment = 0,
      vehicle_no,
      invoice_number,
      updated_by,
      purchase_details = []
    } = body;

    const cashPaymentAmount = safeParseFloat(cash_payment);
    const bankPaymentAmount = safeParseFloat(bank_payment);
    const totalPaymentAmount = cashPaymentAmount + bankPaymentAmount;
    const actualPaymentType = 'CASH';
    const isReturn = false;
    const net_total = 11700;
    const supplierAmount = 11700;

    await prisma.$transaction(async (tx) => {
      const purchaseData = {
        cus_id: parseInt(cus_id),
        store_id: store_id ? safeParseInt(store_id) : null,
        debit_account_id: debit_account_id ? safeParseInt(debit_account_id) : null,
        credit_account_id: null,
        total_amount: Number(safeParseFloat(total_amount).toFixed(2)),
        unloading_amount: Number(safeParseFloat(unloading_amount).toFixed(2)),
        fare_amount: Number(safeParseFloat(fare_amount).toFixed(2)),
        transport_amount: Number(safeParseFloat(transport_amount).toFixed(2)),
        labour_amount: Number(safeParseFloat(labour_amount).toFixed(2)),
        net_total: Number(safeParseFloat(net_total).toFixed(2)),
        payment: Number(totalPaymentAmount.toFixed(2)),
        payment_type: actualPaymentType,
        cash_payment: Number(cashPaymentAmount.toFixed(2)),
        bank_payment: Number(bankPaymentAmount.toFixed(2)),
        vehicle_no: vehicle_no || null,
        invoice_number: invoice_number || null,
        updated_by: updated_by ? safeParseInt(updated_by) : null
      };

      const newPurchase = await tx.purchase.create({
        data: purchaseData
      });

      if (purchase_details && purchase_details.length > 0) {
        const detailsData = purchase_details.map(detail => {
          const processedDetail = {
            pur_id: newPurchase.pur_id,
            vehicle_no: vehicle_no || null,
            cus_id: parseInt(cus_id),
            pro_id: safeParseInt(detail.pro_id, 0),
            qnty: Number(safeParseFloat(detail.qnty || detail.quantity, 1).toFixed(2)),
            unit: detail.unit || 'pcs',
            unit_rate: Number(safeParseFloat(detail.unit_rate || detail.rate).toFixed(2)),
            prate: Number(safeParseFloat(detail.prate || detail.unit_rate || detail.rate).toFixed(2)),
            crate: Number(safeParseFloat(detail.crate || detail.unit_rate || detail.rate).toFixed(2)),
            total_amount: Number(safeParseFloat(detail.total_amount).toFixed(2)),
            net_total: Number(safeParseFloat(detail.total_amount).toFixed(2)),
            updated_by: updated_by ? safeParseInt(updated_by) : null
          };
          return processedDetail;
        });

        await tx.purchaseDetail.createMany({
          data: detailsData
        });

        const storeStockUpdatePromises = purchase_details.map(async (detail, index) => {
          const detailStoreId = detail.store_id || store_id;
          if (!detailStoreId) return;
          const stockOperation = isReturn ? 'decrement' : 'increment';
          await updateStoreStock(detailStoreId, detailsData[index].pro_id, detailsData[index].qnty, stockOperation, updated_by, tx);
        });
        await Promise.all(storeStockUpdatePromises);
      }

      const ledgerEntries = [];
      let runningSupplierBalance = await resolveOpeningBalance(tx, cus_id, newPurchase.created_at);

      const supplierEntry = createPayableLedgerEntry({
        cus_id: cus_id,
        opening_balance: runningSupplierBalance,
        debit_amount: isReturn ? 0 : supplierAmount,
        credit_amount: isReturn ? supplierAmount : 0,
        bill_no: newPurchase.pur_id.toString(),
        trnx_type: 'PURCHASE',
        details: 'Test details',
        payments: 0,
        updated_by: null
      });

      ledgerEntries.push(supplierEntry);
      runningSupplierBalance = supplierEntry.closing_balance;

      await tx.ledger.create({
        data: {
          cus_id: supplierEntry.cus_id,
          opening_balance: supplierEntry.opening_balance,
          debit_amount: supplierEntry.debit_amount,
          credit_amount: supplierEntry.credit_amount,
          closing_balance: supplierEntry.closing_balance,
          bill_no: supplierEntry.bill_no,
          trnx_type: supplierEntry.trnx_type,
          details: supplierEntry.details,
          payments: supplierEntry.payments,
          cash_payment: supplierEntry.cash_payment,
          bank_payment: supplierEntry.bank_payment,
          updated_by: supplierEntry.updated_by
        }
      });

      const affectedCusIds = [...new Set(ledgerEntries.map(e => e.cus_id))];
      console.log('Affected customer IDs:', affectedCusIds);
    });

    console.log('✅ Full transaction call succeeded!');
  } catch (error) {
    console.error('❌ Error stack trace:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPost();
