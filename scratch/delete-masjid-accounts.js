const { PrismaClient } = require('@prisma/client');

const localUrl = "mysql://Ittefaqiron:DildilPakistan786-786_waqas@72.60.76.68:3306/Ittefaqiron";
const liveUrl = "mysql://u889453186_parianwali:DildilPakistan786@786@parianwali@195.35.59.84:3306/u889453186_parianwali";

let dbLocal = new PrismaClient({
  datasources: { db: { url: localUrl } }
});

let dbLive = new PrismaClient({
  datasources: { db: { url: liveUrl } }
});

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function getDbClient(isLive) {
  return isLive ? dbLive : dbLocal;
}

async function safeQuery(isLive, queryFn, retries = 5) {
  let url = isLive ? liveUrl : localUrl;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const client = await getDbClient(isLive);
      return await queryFn(client);
    } catch (error) {
      console.warn(`⚠️ Warning: Query attempt ${attempt}/${retries} failed. Error: ${error.message}`);
      if (attempt === retries) throw error;
      if (error.message.includes('closed the connection') || error.message.includes('Can\'t reach database') || error.message.includes('connection')) {
        console.log('🔄 Re-connecting to database...');
        try {
          const oldClient = await getDbClient(isLive);
          await oldClient.$disconnect();
        } catch (e) {}
        await sleep(2000 * attempt);
        try {
          const newClient = new PrismaClient({
            datasources: { db: { url } }
          });
          await newClient.$connect();
          if (isLive) {
            dbLive = newClient;
          } else {
            dbLocal = newClient;
          }
          console.log('  ✅ Reconnected successfully.');
        } catch (reconnectErr) {
          console.warn('  ⚠️ Reconnection failed:', reconnectErr.message);
        }
      } else {
        await sleep(1000);
      }
    }
  }
}

async function cleanAndForceDeleteCustomer(isLive, label, targetId) {
  console.log(`\nChecking if customer ID ${targetId} exists in ${label}...`);

  const customer = await safeQuery(isLive, async (tx) => {
    return await tx.customer.findUnique({ where: { cus_id: targetId } });
  });

  if (!customer) {
    console.log(`  Customer ID ${targetId} not found in ${label}.`);
    return;
  }

  console.log(`  Cleaning up references for ID ${targetId} ("${customer.cus_name}")...`);

  // 1. Clean up payments referencing targetId
  await safeQuery(isLive, async (tx) => {
    const updatedPaymentsCash = await tx.payment.updateMany({
      where: { cash_account_id: targetId },
      data: { cash_account_id: 2551 }
    });
    const updatedPaymentsBank = await tx.payment.updateMany({
      where: { bank_account_id: targetId },
      data: { bank_account_id: 2551 }
    });
    const updatedPaymentsAccount = await tx.payment.updateMany({
      where: { account_id: targetId },
      data: { account_id: 2551 }
    });
    console.log(`    Updated payments: Cash ref updated=${updatedPaymentsCash.count}, Bank ref updated=${updatedPaymentsBank.count}, Account ref updated=${updatedPaymentsAccount.count}`);
  });

  // 2. Clean up split payments referencing targetId
  await safeQuery(isLive, async (tx) => {
    const updatedSplitDebit = await tx.splitPayment.updateMany({
      where: { debit_account_id: targetId },
      data: { debit_account_id: 2551 }
    });
    const updatedSplitCredit = await tx.splitPayment.updateMany({
      where: { credit_account_id: targetId },
      data: { credit_account_id: 2551 }
    });
    console.log(`    Updated split payments: Debit ref updated=${updatedSplitDebit.count}, Credit ref updated=${updatedSplitCredit.count}`);
  });

  // 3. Clean up expenses referencing targetId
  await safeQuery(isLive, async (tx) => {
    const updatedExpensesPaid = await tx.expense.updateMany({
      where: { paid_from_account_id: targetId },
      data: { paid_from_account_id: 2551 }
    });
    const updatedExpensesBank = await tx.expense.updateMany({
      where: { bank_account_id: targetId },
      data: { bank_account_id: 2551 }
    });
    console.log(`    Updated expenses: Paid from updated=${updatedExpensesPaid.count}, Bank updated=${updatedExpensesBank.count}`);
  });

  // 4. Clean up sales referencing targetId
  await safeQuery(isLive, async (tx) => {
    const updatedSalesCus = await tx.sale.updateMany({
      where: { cus_id: targetId },
      data: { cus_id: 2551 }
    });
    const updatedSalesCredit = await tx.sale.updateMany({
      where: { credit_account_id: targetId },
      data: { credit_account_id: 2551 }
    });
    const updatedSalesDebit = await tx.sale.updateMany({
      where: { debit_account_id: targetId },
      data: { debit_account_id: 2551 }
    });
    console.log(`    Updated sales: Cus updated=${updatedSalesCus.count}, Credit updated=${updatedSalesCredit.count}, Debit updated=${updatedSalesDebit.count}`);
  });

  // 5. Clean up sale details referencing targetId
  await safeQuery(isLive, async (tx) => {
    const updatedSaleDetails = await tx.saleDetail.updateMany({
      where: { cus_id: targetId },
      data: { cus_id: 2551 }
    });
    console.log(`    Updated sale details: updated=${updatedSaleDetails.count}`);
  });

  // 6. Clean up purchases referencing targetId
  await safeQuery(isLive, async (tx) => {
    const updatedPurchasesCus = await tx.purchase.updateMany({
      where: { cus_id: targetId },
      data: { cus_id: 2551 }
    });
    const updatedPurchasesCredit = await tx.purchase.updateMany({
      where: { credit_account_id: targetId },
      data: { credit_account_id: 2551 }
    });
    const updatedPurchasesDebit = await tx.purchase.updateMany({
      where: { debit_account_id: targetId },
      data: { debit_account_id: 2551 }
    });
    const updatedPurchasesCargo = await tx.purchase.updateMany({
      where: { cargo_account_id: targetId },
      data: { cargo_account_id: 2551 }
    });
    console.log(`    Updated purchases: Cus updated=${updatedPurchasesCus.count}, Credit updated=${updatedPurchasesCredit.count}, Debit updated=${updatedPurchasesDebit.count}, Cargo updated=${updatedPurchasesCargo.count}`);
  });

  // 7. Clean up purchase details referencing targetId
  await safeQuery(isLive, async (tx) => {
    const updatedPurchaseDetails = await tx.purchaseDetail.updateMany({
      where: { cus_id: targetId },
      data: { cus_id: 2551 }
    });
    console.log(`    Updated purchase details: updated=${updatedPurchaseDetails.count}`);
  });

  // 8. Clean up sale returns referencing targetId
  await safeQuery(isLive, async (tx) => {
    const updatedSaleReturnsCus = await tx.saleReturn.updateMany({
      where: { cus_id: targetId },
      data: { cus_id: 2551 }
    });
    const updatedSaleReturnsCredit = await tx.saleReturn.updateMany({
      where: { credit_account_id: targetId },
      data: { credit_account_id: 2551 }
    });
    const updatedSaleReturnsDebit = await tx.saleReturn.updateMany({
      where: { debit_account_id: targetId },
      data: { debit_account_id: 2551 }
    });
    console.log(`    Updated sale returns: Cus updated=${updatedSaleReturnsCus.count}, Credit updated=${updatedSaleReturnsCredit.count}, Debit updated=${updatedSaleReturnsDebit.count}`);
  });

  // 9. Clean up sale return details referencing targetId
  await safeQuery(isLive, async (tx) => {
    const updatedSaleReturnDetails = await tx.saleReturnDetail.updateMany({
      where: { cus_id: targetId },
      data: { cus_id: 2551 }
    });
    console.log(`    Updated sale return details: updated=${updatedSaleReturnDetails.count}`);
  });

  // 10. Clean up payment_details referencing targetId
  await safeQuery(isLive, async (tx) => {
    const updatedPaymentDetails = await tx.paymentDetail.updateMany({
      where: { account_id: targetId },
      data: { account_id: 2551 }
    });
    console.log(`    Updated payment details: updated=${updatedPaymentDetails.count}`);
  });

  // 11. Clean up journal_details referencing targetId
  await safeQuery(isLive, async (tx) => {
    const updatedJournalDetails = await tx.journalDetail.updateMany({
      where: { account_id: targetId },
      data: { account_id: 2551 }
    });
    console.log(`    Updated journal details: updated=${updatedJournalDetails.count}`);
  });

  // 12. Clean up hold_bills referencing targetId
  await safeQuery(isLive, async (tx) => {
    const updatedHoldBillsCus = await tx.holdBill.updateMany({
      where: { cus_id: targetId },
      data: { cus_id: 2551 }
    });
    const updatedHoldBillsCredit = await tx.holdBill.updateMany({
      where: { credit_account_id: targetId },
      data: { credit_account_id: 2551 }
    });
    const updatedHoldBillsDebit = await tx.holdBill.updateMany({
      where: { debit_account_id: targetId },
      data: { debit_account_id: 2551 }
    });
    console.log(`    Updated hold bills: Cus updated=${updatedHoldBillsCus.count}, Credit updated=${updatedHoldBillsCredit.count}, Debit updated=${updatedHoldBillsDebit.count}`);
  });

  // 13. Clean up hold_bill_details referencing targetId
  await safeQuery(isLive, async (tx) => {
    const updatedHoldBillDetails = await tx.holdBillDetail.updateMany({
      where: { cus_id: targetId },
      data: { cus_id: 2551 }
    });
    console.log(`    Updated hold bill details: updated=${updatedHoldBillDetails.count}`);
  });

  // 14. Clean up draft_sales referencing targetId
  await safeQuery(isLive, async (tx) => {
    const updatedDraftSales = await tx.draftSale.updateMany({
      where: { cus_id: targetId },
      data: { cus_id: 2551 }
    });
    console.log(`    Updated draft sales: updated=${updatedDraftSales.count}`);
  });

  // 15. Clean up subscriptions referencing targetId
  await safeQuery(isLive, async (tx) => {
    const updatedSubscriptions = await tx.subscription.updateMany({
      where: { cus_id: targetId },
      data: { cus_id: 2551 }
    });
    console.log(`    Updated subscriptions: updated=${updatedSubscriptions.count}`);
  });

  // 16. Transfer ledger entries to 2551 and align ledger_type
  const entries = await safeQuery(isLive, async (tx) => {
    return await tx.ledger.findMany({ where: { cus_id: targetId } });
  });

  if (entries.length > 0) {
    console.log(`    Found ${entries.length} ledger entries. Updating and moving to Cash Account (ID: 2551)...`);
    for (const entry of entries) {
      const debit = parseFloat(entry.debit_amount || 0);
      const credit = parseFloat(entry.credit_amount || 0);

      let alignedLedgerType = entry.ledger_type;
      if (debit > 0) {
        alignedLedgerType = 'Receiving';
      } else if (credit > 0) {
        alignedLedgerType = 'Payment';
      }

      await safeQuery(isLive, async (tx) => {
        return await tx.ledger.update({
          where: { l_id: entry.l_id },
          data: {
            cus_id: 2551,
            ledger_type: alignedLedgerType
          }
        });
      });
    }
  }

  // 17. Delete the customer
  await safeQuery(isLive, async (tx) => {
    return await tx.customer.delete({ where: { cus_id: targetId } });
  });
  console.log(`  ✅ Customer ID ${targetId} deleted successfully.`);
}

async function recalculateCashAccount(isLive, label) {
  console.log(`\nRecalculating balances for Cash Account (ID: 2551) in ${label}...`);
  
  const remainingEntries = await safeQuery(isLive, async (prisma) => {
    return await prisma.ledger.findMany({
      where: { cus_id: 2551 },
      orderBy: [
        { created_at: 'asc' },
        { l_id: 'asc' }
      ]
    });
  });

  if (remainingEntries.length === 0) {
    console.log('  No entries found for Cash Account.');
    return;
  }

  console.log(`  Calculating balances for ${remainingEntries.length} entries in memory...`);

  let runningBalance = parseFloat(remainingEntries[0].opening_balance || 0);
  const whenOpening = [];
  const whenClosing = [];
  const idsToUpdate = [];

  for (const entry of remainingEntries) {
    const opening = runningBalance;
    const debit = parseFloat(entry.debit_amount || 0);
    const credit = parseFloat(entry.credit_amount || 0);

    const change = debit - credit;
    const closing = opening + change;

    whenOpening.push(`WHEN ${entry.l_id} THEN ${Number(opening.toFixed(2))}`);
    whenClosing.push(`WHEN ${entry.l_id} THEN ${Number(closing.toFixed(2))}`);
    idsToUpdate.push(entry.l_id);

    runningBalance = closing;
  }

  console.log('  Executing fast bulk SQL update...');
  const query = `
    UPDATE ledger
    SET
      opening_balance = CASE l_id
        ${whenOpening.join('\n')}
      END,
      closing_balance = CASE l_id
        ${whenClosing.join('\n')}
      END
    WHERE l_id IN (${idsToUpdate.join(',')})
  `;

  await safeQuery(isLive, async (prisma) => {
    return await prisma.$executeRawUnsafe(query);
  });

  await safeQuery(isLive, async (prisma) => {
    return await prisma.customer.update({
      where: { cus_id: 2551 },
      data: { cus_balance: Number(runningBalance.toFixed(2)) }
    });
  });

  console.log(`  ✅ Cash Account balance recalculation complete. Final balance: ${runningBalance.toFixed(2)}`);
}

async function main() {
  console.log('Starting Force Delete and Recalculation script...');

  // 1. Office DB
  try {
    await cleanAndForceDeleteCustomer(false, 'Office DB', 2729);
    await cleanAndForceDeleteCustomer(false, 'Office DB', 2730);
    await recalculateCashAccount(false, 'Office DB');
    console.log('✅ Completed Office DB processing successfully.');
  } catch (error) {
    console.error('❌ Failed processing Office DB:', error.message);
  }

  // 2. Live DB
  try {
    await cleanAndForceDeleteCustomer(true, 'Live DB', 2729);
    await cleanAndForceDeleteCustomer(true, 'Live DB', 2730);
    await recalculateCashAccount(true, 'Live DB');
    console.log('✅ Completed Live DB processing successfully.');
  } catch (error) {
    console.error('❌ Failed processing Live DB:', error.message);
  }

  try { await dbLocal.$disconnect(); } catch (e) {}
  try { await dbLive.$disconnect(); } catch (e) {}
}

main();
