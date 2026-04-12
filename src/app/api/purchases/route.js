import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { updateStoreStock } from '@/lib/storeStock';
import { createLedgerEntry } from '@/lib/ledger-helper';

// Helper for JSON errors
function errorResponse(message, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

// ========================================
// GET — Get all purchases or one purchase
// ========================================
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id') ? parseInt(searchParams.get('id')) : null; // optional: ?id=1
  const invoice = searchParams.get('invoice');

  try {
    if (id) {
      const purchase = await prisma.purchase.findUnique({
        where: { pur_id: id },
        include: {
          customer: true,
          cargo_account: true,
          store: true,
          updated_by_user: {
            select: {
              user_id: true,
              full_name: true,
              role: true
            }
          },
          purchase_details: {
            include: {
              product: {
                select: {
                  pro_id: true,
                  pro_title: true,
                  pro_unit: true
                }
              }
            }
          }
        }
      });

      if (!purchase) {
        return errorResponse('Purchase not found', 404);
      }

      // Calculate previous customer balance (closing balance of the last ledger entry before this purchase)
      let previousCustomerBalance = 0;
      try {
        const lastLedgerBefore = await prisma.ledger.findFirst({
          where: { cus_id: purchase.cus_id, created_at: { lt: purchase.created_at } },
          orderBy: { created_at: 'desc' },
          select: { closing_balance: true }
        });
        previousCustomerBalance = lastLedgerBefore ? parseFloat(lastLedgerBefore.closing_balance || 0) : 0;
      } catch (err) {
        console.warn('Could not compute previous customer balance for purchase', purchase.pur_id, err.message);
      }

      const purchaseWithPrev = Object.assign({}, purchase, { previous_customer_balance: previousCustomerBalance });
      return NextResponse.json(purchaseWithPrev);
    }

    if (invoice) {
      const purchase = await prisma.purchase.findFirst({
        where: { invoice_number: invoice },
        include: {
          customer: true,
          cargo_account: true,
          store: true,
          updated_by_user: {
            select: {
              user_id: true,
              full_name: true,
              role: true
            }
          },
          purchase_details: {
            include: {
              product: {
                select: {
                  pro_id: true,
                  pro_title: true,
                  pro_unit: true
                }
              }
            }
          }
        }
      });

      if (!purchase) {
        return errorResponse('Purchase not found', 404);
      }

      // Calculate previous customer balance (closing balance of the last ledger entry before this purchase)
      let previousCustomerBalance = 0;
      try {
        const lastLedgerBefore = await prisma.ledger.findFirst({
          where: { cus_id: purchase.cus_id, created_at: { lt: purchase.created_at } },
          orderBy: { created_at: 'desc' },
          select: { closing_balance: true }
        });
        previousCustomerBalance = lastLedgerBefore ? parseFloat(lastLedgerBefore.closing_balance || 0) : 0;
      } catch (err) {
        console.warn('Could not compute previous customer balance for purchase (invoice lookup)', purchase.pur_id, err.message);
      }

      const purchaseWithPrev = Object.assign({}, purchase, { previous_customer_balance: previousCustomerBalance });
      return NextResponse.json(purchaseWithPrev);
    }

    const purchases = await prisma.purchase.findMany({
      include: {
        customer: {
          select: {
            cus_id: true,
            cus_name: true,
            cus_phone_no: true
          }
        },
        cargo_account: {
          select: { cus_id: true, cus_name: true, cus_phone_no: true }
        },
        store: {
          select: {
            storeid: true,
            store_name: true,
            store_address: true
          }
        },
        updated_by_user: {
          select: {
            user_id: true,
            full_name: true,
            role: true
          }
        },
        purchase_details: {
          include: {
            product: {
              select: {
                pro_id: true,
                pro_title: true,
                pro_unit: true
              }
            }
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    return NextResponse.json(purchases);
  } catch (err) {
    console.error('❌ Error fetching purchases:', err);
    return errorResponse('Failed to fetch purchases', 500);
  }
}

// ========================================
// POST — Create a new purchase
// ========================================
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      cus_id,
      store_id,
      debit_account_id,
      total_amount,
      unloading_amount = 0,
      fare_amount = 0,
      transport_amount = 0,
      labour_amount = 0,
      // Cargo / Out charges
      out_labour_amount = 0,
      out_delivery_amount = 0,
      include_cargo_in_costprice = false,
      // Incity fields
      incity_own_labour = 0,
      incity_own_delivery = 0,
      incity_charges_total = 0,
      discount = 0,
      payment,
      payment_type,
      cash_payment = 0,
      bank_payment = 0,
      vehicle_no,
      invoice_number,
      updated_by,
      cargo_account_id = null,
      cargo_account_ids = null,
      purchase_type = 'new',
      return_for_purchase_id = null,
      purchase_details = [],
      bank_account_id = null
    } = body;

    // Ensure bank_account_id is always a proper integer (or null)
    const bankAccountIdInt = bank_account_id ? parseInt(bank_account_id) : null;

    let { credit_account_id } = body;
    const creditAccountIdInt = credit_account_id ? parseInt(credit_account_id) : null;

    console.log('🏦 PURCHASE POST - Payment fields received:', {
      cash_payment, bank_payment,
      bank_account_id, bankAccountIdInt,
      credit_account_id, creditAccountIdInt,
      payment_type
    });

    // Helper function to safely parse numbers and avoid NaN
    const safeParseFloat = (value, defaultValue = 0) => {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? defaultValue : parsed;
    };

    const safeParseInt = (value, defaultValue = null) => {
      const parsed = parseInt(value);
      return isNaN(parsed) ? defaultValue : parsed;
    };

    // Validation for required fields
    if (!cus_id) {
      return errorResponse('Customer ID is required');
    }
    if (!total_amount || total_amount <= 0) {
      return errorResponse('Total amount is required and must be greater than 0');
    }

    // Validate payment amounts
    const cashPaymentAmount = safeParseFloat(cash_payment);
    const bankPaymentAmount = safeParseFloat(bank_payment);
    const totalPaymentAmount = cashPaymentAmount + bankPaymentAmount;

    if (totalPaymentAmount < 0) {
      return errorResponse('Total payment amount must be non-negative');
    }

    // Determine payment type based on split payments
    // Note: Using BANK_TRANSFER for split payments since SPLIT is not in PaymentType enum
    let actualPaymentType = 'CASH';
    let isSplitPayment = false;

    if (cashPaymentAmount > 0 && bankPaymentAmount > 0) {
      actualPaymentType = 'BANK_TRANSFER'; // Use BANK_TRANSFER for split payments
      isSplitPayment = true;
    } else if (bankPaymentAmount > 0) {
      actualPaymentType = 'BANK_TRANSFER';
    }

    console.log('💳 Payment Type Logic:', {
      frontend_payment_type: payment_type,
      cashPaymentAmount,
      bankPaymentAmount,
      actualPaymentType,
      isSplitPayment
    });

    // Validate that we have a valid payment type (we'll use actualPaymentType for the database)
    if (!actualPaymentType || !['CASH', 'CHEQUE', 'BANK_TRANSFER'].includes(actualPaymentType)) {
      return errorResponse('Valid payment type is required (CASH, CHEQUE, BANK_TRANSFER)');
    }

    // Calculate net total: product subtotal + internal charges (unloading, fare, transport, labour) - discount
    // OUT charges (out_labour/out_delivery) are treated as external and should NOT be included in the supplier-facing net_total
    const net_total = safeParseFloat(total_amount) + safeParseFloat(unloading_amount) + safeParseFloat(fare_amount) + safeParseFloat(transport_amount) + safeParseFloat(labour_amount) - safeParseFloat(discount);

    // Update payment amount to use total payment from split payments
    // payment is now calculated as totalPaymentAmount

    // Check if customer exists
    const customer = await prisma.customer.findUnique({
      where: { cus_id }
    });

    if (!customer) {
      return errorResponse('Customer not found', 404);
    }

    // Ensure special accounts exist before transaction
    if (actualPaymentType === 'CASH' && cashPaymentAmount > 0) {
      // Find Cash Account by category, not by exact name
      const cashCategory = await prisma.customerCategory.findFirst({
        where: { cus_cat_title: 'Cash Account' }
      });

      let cashAccount = null;
      if (cashCategory) {
        cashAccount = await prisma.customer.findFirst({
          where: { cus_category: cashCategory.cus_cat_id }
        });
      }

      console.log('🔍 Cash Account search result (pre-transaction):', {
        found: !!cashAccount,
        cashAccount: cashAccount ? { id: cashAccount.cus_id, name: cashAccount.cus_name, category: cashCategory?.cus_cat_title } : null,
        credit_account_id_from_frontend: credit_account_id
      });

      if (!cashAccount && cashCategory) {
        // Get the cash type from database
        const cashType = await prisma.customerType.findFirst({
          where: { cus_type_title: 'cash' }
        });

        if (cashType) {
          cashAccount = await prisma.customer.create({
            data: {
              cus_name: 'Cash Account',
              cus_phone_no: '0000000000',
              cus_address: 'Main Office',
              cus_balance: 0,
              cus_type: cashType.cus_type_id,
              cus_category: cashCategory.cus_cat_id,
              city_id: 1, // Default city
              updated_by: updated_by ? parseInt(updated_by) : null
            }
          });
          console.log('✅ Created Cash Account (pre-transaction):', cashAccount);
        }
      }

      if (cashAccount) {
        credit_account_id = cashAccount.cus_id;
        console.log('✅ Using Cash Account ID (pre-transaction):', credit_account_id);
      }
    }

    // Create purchase with details and ledger entries in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Determine if this is a return (do this first so it can be used throughout)
      const isReturn = purchase_type === 'return';

      // Get customer's current balance
      const customerData = await tx.customer.findUnique({
        where: { cus_id },
        select: { cus_balance: true }
      });

      const currentBalance = parseFloat(customerData?.cus_balance || 0);


      console.log('🔍 Purchase data before parsing:', {
        cus_id,
        store_id,
        debit_account_id,
        credit_account_id,
        total_amount,
        unloading_amount,
        fare_amount,
        transport_amount,
        labour_amount,
        discount,
        net_total,
        payment,
        payment_type,
        vehicle_no,
        invoice_number,
        updated_by
      });

      // Prepare the data object for purchase creation
      const purchaseData = {
        cus_id: parseInt(cus_id),
        store_id: store_id ? safeParseInt(store_id) : null,
        debit_account_id: debit_account_id ? safeParseInt(debit_account_id) : null,
        credit_account_id: credit_account_id ? safeParseInt(credit_account_id) : null,
        total_amount: Number(safeParseFloat(total_amount).toFixed(2)),
        unloading_amount: Number(safeParseFloat(unloading_amount).toFixed(2)),
        fare_amount: Number(safeParseFloat(fare_amount).toFixed(2)),
        transport_amount: Number(safeParseFloat(transport_amount).toFixed(2)),
        labour_amount: Number(safeParseFloat(labour_amount).toFixed(2)),
        out_labour_amount: Number(safeParseFloat(out_labour_amount).toFixed(2)),
        out_delivery_amount: Number(safeParseFloat(out_delivery_amount).toFixed(2)),
        include_cargo_in_costprice: include_cargo_in_costprice ? true : false,
        // Incity fields
        incity_own_labour: Number(safeParseFloat(incity_own_labour).toFixed(2)),
        incity_own_delivery: Number(safeParseFloat(incity_own_delivery).toFixed(2)),
        incity_charges_total: Number(safeParseFloat(incity_charges_total).toFixed(2)),
        discount: Number(safeParseFloat(discount).toFixed(2)),
        cargo_account_id: cargo_account_id ? safeParseInt(cargo_account_id) : null,
        cargo_account_ids: cargo_account_ids ? (Array.isArray(cargo_account_ids) ? JSON.stringify(cargo_account_ids) : String(cargo_account_ids)) : null,
        net_total: Number(safeParseFloat(net_total).toFixed(2)),
        payment: Number(totalPaymentAmount.toFixed(2)),
        payment_type: actualPaymentType,
        cash_payment: Number(cashPaymentAmount.toFixed(2)),
        bank_payment: Number(bankPaymentAmount.toFixed(2)),
        bank_title: isSplitPayment && bankPaymentAmount > 0 ? 'Bank Payment' : null,
        vehicle_no: vehicle_no || null,
        invoice_number: invoice_number || null,
        updated_by: updated_by ? safeParseInt(updated_by) : null
      };

      console.log('🔍 Processed purchase data:', purchaseData);

      // Create the purchase using the prepared data
      const newPurchase = await tx.purchase.create({
        data: purchaseData
      });

      // Create purchase details if provided
      if (purchase_details && purchase_details.length > 0) {
        console.log('🔍 Processing purchase details:', purchase_details);

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
            net_total: Number(safeParseFloat(detail.total_amount).toFixed(2)), // Use total_amount as net_total for now
            updated_by: updated_by ? safeParseInt(updated_by) : null
          };

          console.log('🔍 Processed detail:', processedDetail);
          return processedDetail;
        });

        await tx.purchaseDetail.createMany({
          data: detailsData
        });
        // Update store stock for each product using per-detail store_id (fallback to purchase-level store_id)
        const storeStockUpdatePromises = purchase_details.map(async (detail, index) => {
          const detailStoreId = detail.store_id || store_id;
          if (!detailStoreId) return;
          const stockOperation = isReturn ? 'decrement' : 'increment';
          await updateStoreStock(detailStoreId, detailsData[index].pro_id, detailsData[index].qnty, stockOperation, updated_by, tx);
        });
        await Promise.all(storeStockUpdatePromises);
      }

      // Create comprehensive ledger entries for purchase (similar to sales)
      // For NEW PURCHASE: Debit supplier (amount owed increases), Credit cash/bank (payment decreases assets)
      // For PURCHASE RETURN: Reverse the entries
      // NOTE: Only product amount (minus discount) goes to supplier ledger
      // Labour, delivery, transport, unloading are separate expenses

      const ledgerEntries = [];
      let runningSupplierBalance = 0;

      // Calculate supplier amount — EXCLUDE OUT charges (Out labour/Out delivery are not billed to supplier)
      const supplierAmount = safeParseFloat(total_amount) - safeParseFloat(discount) + safeParseFloat(labour_amount) + safeParseFloat(transport_amount);

      // 1. Supplier Account Entry — includes product + labour + delivery (OUT charges are NOT included)
      if (cus_id) {
        const supplierData = await tx.customer.findUnique({ where: { cus_id: cus_id }, select: { cus_balance: true, cus_name: true } });
        runningSupplierBalance = parseFloat(supplierData?.cus_balance || 0);

        console.log(`\n📊 PURCHASE LEDGER ENTRY DEBUG`);
        console.log(`   Supplier: ${supplierData?.cus_name} (ID: ${cus_id})`);
        console.log(`   Opening Balance: ${runningSupplierBalance}`);
        console.log(`   Bill Amount (products + labour + delivery) [OUT charges excluded]: ${supplierAmount}${safeParseFloat(discount) > 0 ? ` (After Discount: ${safeParseFloat(discount)})` : ''}`);

        const supplierEntry = createLedgerEntry({
          cus_id: cus_id,
          opening_balance: runningSupplierBalance,
          debit_amount: isReturn ? 0 : supplierAmount,
          credit_amount: isReturn ? supplierAmount : 0,
          bill_no: newPurchase.pur_id.toString(),
          trnx_type: 'PURCHASE',
          details: `${isReturn ? 'Purchase Return' : 'Purchase Invoice'}${invoice_number ? ` #${invoice_number}` : ''} ${isReturn ? 'to' : 'from'} ${supplierData?.cus_name || 'Supplier'}${vehicle_no ? ` - Vehicle: ${vehicle_no}` : ''}${safeParseFloat(discount) > 0 ? ` [After Discount: ${safeParseFloat(discount)}]` : ''}`,
          payments: 0,
          updated_by: updated_by ? parseInt(updated_by) : null
        });

        ledgerEntries.push(supplierEntry);
        runningSupplierBalance = supplierEntry.closing_balance;

        console.log(`📝 Supplier Entry Created: Opening=${supplierEntry.opening_balance}, Debit=${supplierEntry.debit_amount}, Closing=${supplierEntry.closing_balance}`);
        console.log(`   Note: OUT charges will NOT be credited to the supplier; they are posted to Labour/Cargo and offset against Cash/Bank.`);
      }

      // 2. Payment entry against Supplier
      // New Purchase: CREDIT supplier (we paid them → they owe us less)
      // Purchase Return: DEBIT supplier (they paid us back → their balance comes back up)
      const totalPaymentAmount2 = cashPaymentAmount + bankPaymentAmount;

      if (totalPaymentAmount2 > 0) {
        const supplierData = await tx.customer.findUnique({
          where: { cus_id: cus_id },
          select: { cus_name: true }
        });

        let paymentParts = [];
        if (cashPaymentAmount > 0) paymentParts.push(`Cash: ${cashPaymentAmount}`);
        if (bankPaymentAmount > 0) {
          const bankNameForDesc = bankAccountIdInt
            ? (await tx.customer.findUnique({ where: { cus_id: bankAccountIdInt }, select: { cus_name: true } }))?.cus_name
            : null;
          paymentParts.push(`Bank (${bankNameForDesc || 'Bank Account'}): ${bankPaymentAmount}`);
        }
        const paymentDesc = paymentParts.length > 0 ? ` [${paymentParts.join(', ')}]` : '';

        const paymentEntry = createLedgerEntry({
          cus_id: cus_id,
          opening_balance: runningSupplierBalance,
          debit_amount: isReturn ? totalPaymentAmount2 : 0,   // Return: debit (they paid us back)
          credit_amount: isReturn ? 0 : totalPaymentAmount2,  // Purchase: credit (we paid them)
          bill_no: newPurchase.pur_id.toString(),
          trnx_type: 'PURCHASE',
          details: `${isReturn ? 'Payment received from' : 'Payment to'} ${supplierData?.cus_name || 'Supplier'} - Supplier Account${paymentDesc}`,
          payments: totalPaymentAmount2,
          cash_payment: cashPaymentAmount,
          bank_payment: bankPaymentAmount,
          updated_by: updated_by ? parseInt(updated_by) : null
        });
        ledgerEntries.push(paymentEntry);
        runningSupplierBalance = paymentEntry.closing_balance;
        console.log(`💳 Payment Entry: Opening=${paymentEntry.opening_balance}, Debit=${paymentEntry.debit_amount}, Credit=${paymentEntry.credit_amount}, Closing=${paymentEntry.closing_balance}`);
      }

      // 3. Bank Account - CREDIT (when bank payment is made)
      // When bank payment is made, bank account balance DECREASES (credit decreases asset)
      let usedBankAccountId = null;  // Track which bank account is being used

      if (parseFloat(bank_payment || 0) > 0) {
        let bankAccountToUse = null;

        console.log(`🏦 DEBUG: bank_account_id=${bankAccountIdInt}, credit_account_id=${creditAccountIdInt}, cash=${cashPaymentAmount}, bank=${bankPaymentAmount}`);

        // Primary: use bank_account_id if provided
        if (bankAccountIdInt) {
          const specificBank = await tx.customer.findUnique({
            where: { cus_id: bankAccountIdInt }
          });
          if (specificBank) {
            bankAccountToUse = specificBank;
            console.log(`🏦 Found via bank_account_id: ${specificBank.cus_name} (ID: ${specificBank.cus_id})`);
          } else {
            console.log(`⚠️ bank_account_id ${bankAccountIdInt} not found in customers`);
          }
        }

        // Fallback: for pure bank payment (no cash), credit_account_id IS the bank account
        if (!bankAccountToUse && cashPaymentAmount === 0 && creditAccountIdInt) {
          const fallbackBank = await tx.customer.findUnique({
            where: { cus_id: creditAccountIdInt }
          });
          if (fallbackBank) {
            bankAccountToUse = fallbackBank;
            console.log(`🏦 Fallback via credit_account_id: ${fallbackBank.cus_name} (ID: ${fallbackBank.cus_id})`);
          }
        }

        if (!bankAccountToUse) {
          console.log(`⚠️ No bank account resolved. bank_account_id=${bankAccountIdInt}, credit_account_id=${creditAccountIdInt}`);
        }

        if (bankAccountToUse) {
          usedBankAccountId = bankAccountToUse.cus_id;
          console.log(`🏦 BANK PAYMENT DETECTED: ${bank_payment}`);
          console.log(`🏦 Bank Account Before: ID=${bankAccountToUse.cus_id}, Name=${bankAccountToUse.cus_name}, Balance=${bankAccountToUse.cus_balance}`);

          // include supplier name in bank entry details for easy lookup
          const supplierForPayment = await tx.customer.findUnique({ where: { cus_id }, select: { cus_name: true } });

          // Purchase: CREDIT bank (money goes out)
          // Return: DEBIT bank (money comes back in)
          const bankEntry = createLedgerEntry({
            cus_id: bankAccountToUse.cus_id,
            opening_balance: bankAccountToUse.cus_balance,
            debit_amount: isReturn ? parseFloat(bank_payment) : 0,
            credit_amount: isReturn ? 0 : parseFloat(bank_payment),
            bill_no: newPurchase.pur_id.toString(),
            trnx_type: 'BANK_TRANSFER',
            details: `${isReturn ? 'Refund received from' : 'Payment made to'} ${supplierForPayment?.cus_name || 'Supplier'} - BANK Account: ${bankAccountToUse.cus_name}`,
            payments: parseFloat(bank_payment),
            cash_payment: 0,
            bank_payment: parseFloat(bank_payment),
            updated_by: updated_by ? parseInt(updated_by) : null
          });
          console.log(`🏦 Bank Ledger Entry: Opening=${bankEntry.opening_balance}, Credit=${bankEntry.credit_amount}, Closing=${bankEntry.closing_balance}`);
          ledgerEntries.push(bankEntry);
        } else {
          console.log(`⚠️ ERROR: Bank payment of ${bank_payment} requested but no valid bank account found`);
        }
      }

      // 4. Cash Account Entry (if cash payment exists)
      // Resolve cash account — never use the supplier ID as cash account
      const resolvedCashAccountId = (creditAccountIdInt && creditAccountIdInt !== cus_id) ? creditAccountIdInt : null;
      const effectiveCashAccountId = resolvedCashAccountId || await (async () => {
        const cashCat = await tx.customerCategory.findFirst({ where: { cus_cat_title: { contains: 'Cash' } } });
        if (!cashCat) return null;
        const acc = await tx.customer.findFirst({ where: { cus_category: cashCat.cus_cat_id }, select: { cus_id: true } });
        return acc?.cus_id || null;
      })();

      if (cashPaymentAmount > 0 && effectiveCashAccountId) {
        const cashAccountData = await tx.customer.findUnique({
          where: { cus_id: effectiveCashAccountId },
          select: { cus_balance: true, cus_name: true }
        });
        const cashCurrentBalance = parseFloat(cashAccountData?.cus_balance || 0);

        console.log(`💵 CASH PAYMENT DETECTED: ${cashPaymentAmount}`);
        console.log(`💵 Cash Account Before: ID=${effectiveCashAccountId}, Name=${cashAccountData?.cus_name}, Balance=${cashCurrentBalance}`);

        const supplierForPaymentCash = await tx.customer.findUnique({ where: { cus_id }, select: { cus_name: true } });

        // NEW PURCHASE: Credit Cash Account (money paid out)
        // PURCHASE RETURN: Debit Cash Account (money received back from supplier)
        const cashEntry = createLedgerEntry({
          cus_id: effectiveCashAccountId,
          opening_balance: cashCurrentBalance,
          debit_amount: isReturn ? cashPaymentAmount : 0,
          credit_amount: isReturn ? 0 : cashPaymentAmount,
          bill_no: newPurchase.pur_id.toString(),
          trnx_type: 'CASH',
          details: `${isReturn ? 'Cash Refund for Purchase Return' : `Cash Payment for Purchase to ${supplierForPaymentCash?.cus_name || 'Supplier'}`} - ${vehicle_no ? `Vehicle: ${vehicle_no}` : 'Purchase Order'}`,
          payments: cashPaymentAmount,
          cash_payment: cashPaymentAmount,
          bank_payment: 0,
          updated_by: updated_by ? parseInt(updated_by) : null
        });

        ledgerEntries.push(cashEntry);
        console.log(`💵 Cash Account Entry Created: Opening=${cashEntry.opening_balance}, Debit=${cashEntry.debit_amount}, Credit=${cashEntry.credit_amount}, Closing=${cashEntry.closing_balance}`);
      }

      // --- CARGO LEDGER POSTINGS ---
      // Cargo account: Debit out_delivery_amount only (not labour).
      // Supplier account: Credit out_delivery_amount (deduct cargo from supplier balance).
      // Labour account: Debit out_labour_amount only.
      const outDeliveryAmt = safeParseFloat(out_delivery_amount || 0);
      const outLabourAmt = safeParseFloat(out_labour_amount || 0);

      if (outDeliveryAmt > 0) {
        let cargoIds = [];
        try {
          if (cargo_account_ids) {
            cargoIds = Array.isArray(cargo_account_ids) ? cargo_account_ids : JSON.parse(cargo_account_ids || '[]');
          } else if (cargo_account_id) {
            cargoIds = [cargo_account_id];
          }
        } catch (err) {
          cargoIds = cargo_account_ids ? (Array.isArray(cargo_account_ids) ? cargo_account_ids : [cargo_account_ids]) : (cargo_account_id ? [cargo_account_id] : []);
        }

        if (cargoIds.length === 0 && cargo_account_id) cargoIds = [cargo_account_id];

        if (cargoIds.length > 0) {
          const perAccount = parseFloat((outDeliveryAmt / cargoIds.length).toFixed(2));
          let remainder = parseFloat((outDeliveryAmt - (perAccount * cargoIds.length)).toFixed(2));

          for (let i = 0; i < cargoIds.length; i++) {
            const aid = parseInt(cargoIds[i]);
            const cargoAcc = await tx.customer.findUnique({ where: { cus_id: aid }, select: { cus_id: true, cus_balance: true, cus_name: true } });
            if (!cargoAcc) {
              console.log(`⚠️ Cargo account ID ${aid} not found — skipping`);
              continue;
            }

            let allocate = perAccount;
            if (i === 0) allocate = parseFloat((perAccount + remainder).toFixed(2));

            // Debit cargo account for out delivery amount only
            const cargoEntry = createLedgerEntry({
              cus_id: cargoAcc.cus_id,
              opening_balance: parseFloat(cargoAcc.cus_balance || 0),
              debit_amount: allocate,
              credit_amount: 0,
              bill_no: newPurchase.pur_id.toString(),
              trnx_type: 'PURCHASE',
              details: `Cargo Charges - Purchase #${newPurchase.pur_id}${invoice_number ? ` (Inv: ${invoice_number})` : ''}`,
              payments: 0,
              updated_by: updated_by ? parseInt(updated_by) : null
            });
            ledgerEntries.push(cargoEntry);
            console.log(`📦 Cargo entry: ${cargoAcc.cus_name} debited ${allocate}`);

            // Credit the supplier for the cargo amount (deduct cargo from supplier balance)
            if (cus_id) {
              const supplierForCargo = await tx.customer.findUnique({ where: { cus_id }, select: { cus_name: true } });
              const supplierCreditForCargo = createLedgerEntry({
                cus_id: cus_id,
                opening_balance: runningSupplierBalance,
                debit_amount: 0,
                credit_amount: allocate,
                bill_no: newPurchase.pur_id.toString(),
                trnx_type: 'PURCHASE',
                details: `Cargo Charges deducted from ${supplierForCargo?.cus_name || 'Supplier'} via ${cargoAcc.cus_name} - Purchase #${newPurchase.pur_id}${invoice_number ? ` (Inv: ${invoice_number})` : ''}`,
                payments: 0,
                updated_by: updated_by ? parseInt(updated_by) : null
              });
              ledgerEntries.push(supplierCreditForCargo);
              runningSupplierBalance = supplierCreditForCargo.closing_balance;
              console.log(`📦 Supplier credit for cargo: ${supplierForCargo?.cus_name} credited ${allocate}`);
            }
          }
        } else {
          console.log('⚠️ Cargo delivery amount present but no cargo account selected — skipping cargo ledger postings');
        }
      }

      // Labour account: Debit out_labour_amount only
      if (outLabourAmt > 0) {
        const labourAccount = await tx.customer.findFirst({
          where: {
            OR: [
              { cus_name: { contains: 'Labour' } },
              { cus_name: { contains: 'labour' } },
              { customer_category: { cus_cat_title: { contains: 'Labour' } } },
              { customer_type: { cus_type_title: { contains: 'Labour' } } }
            ]
          },
          select: { cus_id: true, cus_balance: true, cus_name: true }
        });

        if (labourAccount) {
          const priorLabourEntries = ledgerEntries.filter(e => e.cus_id === labourAccount.cus_id);
          const labourOpeningBalance = priorLabourEntries.length > 0
            ? priorLabourEntries[priorLabourEntries.length - 1].closing_balance
            : parseFloat(labourAccount.cus_balance || 0);

          const labourEntry = createLedgerEntry({
            cus_id: labourAccount.cus_id,
            opening_balance: labourOpeningBalance,
            debit_amount: outLabourAmt,
            credit_amount: 0,
            bill_no: newPurchase.pur_id.toString(),
            trnx_type: 'PURCHASE',
            details: `Out Labour Charges - Purchase #${newPurchase.pur_id}${invoice_number ? ` (Inv: ${invoice_number})` : ''}`,
            payments: 0,
            updated_by: updated_by ? parseInt(updated_by) : null
          });
          ledgerEntries.push(labourEntry);
          console.log(`🔧 Labour account entry: ${labourAccount.cus_name} debited ${outLabourAmt}`);
        } else {
          console.log('⚠️ Out labour amount present but Labour account not found — skipping labour ledger posting');
        }
      }

      // --- INCITY CHARGES: Deduct from cash account directly ---
      // No double entry — just credit the cash account for the incity charges total.
      const incityTotal = safeParseFloat(incity_own_labour || 0) + safeParseFloat(incity_own_delivery || 0);

      if (incityTotal > 0) {
        // Reuse the already-resolved cash account (never the supplier ID)
        const incityCashAccount = effectiveCashAccountId
          ? await tx.customer.findUnique({ where: { cus_id: effectiveCashAccountId }, select: { cus_id: true, cus_balance: true, cus_name: true } })
          : null;

        if (incityCashAccount) {
          // Use closing balance from any prior entry for this account in this transaction
          const priorCashEntries = ledgerEntries.filter(e => e.cus_id === incityCashAccount.cus_id);
          const incityOpeningBalance = priorCashEntries.length > 0
            ? priorCashEntries[priorCashEntries.length - 1].closing_balance
            : parseFloat(incityCashAccount.cus_balance || 0);

          const incityCashEntry = createLedgerEntry({
            cus_id: incityCashAccount.cus_id,
            opening_balance: incityOpeningBalance,
            debit_amount: 0,
            credit_amount: incityTotal,
            bill_no: newPurchase.pur_id.toString(),
            trnx_type: 'CASH',
            details: `Incity Charges Payment - Purchase #${newPurchase.pur_id}${invoice_number ? ` (Inv: ${invoice_number})` : ''}`,
            payments: incityTotal,
            cash_payment: incityTotal,
            bank_payment: 0,
            updated_by: updated_by ? parseInt(updated_by) : null
          });
          ledgerEntries.push(incityCashEntry);
          console.log(`🏙️ Incity cash entry: ${incityCashAccount.cus_name} (ID: ${incityCashAccount.cus_id}) credited ${incityTotal}`);
        } else {
          console.log('⚠️ Incity charges present but cash account not found — skipping');
        }
      }

      console.log(`📊 CREATING ${ledgerEntries.length} LEDGER ENTRIES IN DATABASE (POST)`);
      for (let i = 0; i < ledgerEntries.length; i++) {
        const entry = ledgerEntries[i];

        console.log(`   Entry ${i + 1}: Customer=${entry.cus_id}, Debit=${entry.debit_amount}, Credit=${entry.credit_amount}`);

        await tx.ledger.create({
          data: {
            cus_id: entry.cus_id,
            opening_balance: entry.opening_balance,
            debit_amount: entry.debit_amount,
            credit_amount: entry.credit_amount,
            closing_balance: entry.closing_balance,
            bill_no: entry.bill_no,
            trnx_type: entry.trnx_type,
            details: entry.details,
            payments: entry.payments,
            cash_payment: entry.cash_payment,
            bank_payment: entry.bank_payment,
            updated_by: entry.updated_by
          }
        });

        console.log(`   ✅ Entry ${i + 1} created in database`);
      }

      console.log(`📊 All ${ledgerEntries.length} ledger entries created successfully\n`);

      // 6. Update Customer Balances from Ledger Entries
      // Update supplier balance
      if (cus_id) {
        const supplierLedgerEntries = ledgerEntries.filter(e => e.cus_id === cus_id);
        if (supplierLedgerEntries.length > 0) {
          const lastSupplierEntry = supplierLedgerEntries[supplierLedgerEntries.length - 1];
          const supplierClosingBalance = parseFloat(lastSupplierEntry.closing_balance);

          await tx.customer.update({
            where: { cus_id: cus_id },
            data: { cus_balance: supplierClosingBalance }
          });

          console.log(`💰 SUPPLIER BALANCE UPDATED: ${cus_id} balance set to ${supplierClosingBalance}`);
        }
      }

      // Update all non-supplier, non-bank accounts found in ledger entries (cash, incity cash, etc.)
      const alreadyUpdated = new Set([cus_id, usedBankAccountId].filter(Boolean));
      const otherAccountIds = [...new Set(ledgerEntries.map(e => e.cus_id).filter(id => !alreadyUpdated.has(id)))];
      for (const accountId of otherAccountIds) {
        const entries = ledgerEntries.filter(e => e.cus_id === accountId);
        if (entries.length > 0) {
          const lastEntry = entries[entries.length - 1];
          await tx.customer.update({ where: { cus_id: accountId }, data: { cus_balance: lastEntry.closing_balance } });
          console.log(`💵 ACCOUNT BALANCE UPDATED: ID=${accountId} balance set to ${lastEntry.closing_balance}`);
        }
      }

      // Update bank account balance (use the last BANK_TRANSFER ledger entry for the used bank)
      if (usedBankAccountId) {
        const bankLedgerEntries = ledgerEntries.filter(e => e.cus_id === usedBankAccountId && e.trnx_type === 'BANK_TRANSFER');
        if (bankLedgerEntries.length > 0) {
          const lastBankEntry = bankLedgerEntries[bankLedgerEntries.length - 1];
          await tx.customer.update({ where: { cus_id: usedBankAccountId }, data: { cus_balance: lastBankEntry.closing_balance } });
          console.log(`🏦 BANK ACCOUNT BALANCE UPDATED: ${usedBankAccountId} balance set to ${lastBankEntry.closing_balance}`);
        } else {
          console.log(`🏦 DEBUG: No bank ledger entry found to update balance for ID ${usedBankAccountId}`);
        }
      } else {
        console.log(`🏦 DEBUG: No bank balance update needed. usedBankAccountId=${usedBankAccountId}`);
      }

      return {
        purchase: newPurchase,
      };
    }, { maxWait: 20000, timeout: 60000 });

    // Fetch the complete purchase with relations
    const completePurchase = await prisma.purchase.findUnique({
      where: { pur_id: result.purchase.pur_id },
      include: {
        customer: true,
        updated_by_user: {
          select: {
            user_id: true,
            full_name: true,
            role: true
          }
        },
        purchase_details: {
          include: {
            product: {
              select: {
                pro_id: true,
                pro_title: true,
                pro_unit: true
              }
            }
          }
        }
      }
    });

    return NextResponse.json(completePurchase, { status: 201 });
  } catch (err) {
    console.error('❌ Error creating purchase:', err);
    return errorResponse('Failed to create purchase', 500);
  }
}

// ========================================
// PUT — Update an existing purchase
// ========================================
export async function PUT(request) {
  try {
    const body = await request.json();
    const {
      id,
      cus_id,
      store_id,
      debit_account_id,
      credit_account_id,
      cargo_account_id = null,
      cargo_account_ids = null,
      total_amount,
      unloading_amount = 0,
      fare_amount = 0,
      transport_amount = 0,
      labour_amount = 0,
      out_labour_amount = 0,
      out_delivery_amount = 0,
      include_cargo_in_costprice = false,
      // Incity fields
      incity_own_labour = 0,
      incity_own_delivery = 0,
      incity_charges_total = 0,
      discount = 0,
      payment,
      payment_type,
      vehicle_no,
      invoice_number,
      updated_by,
      purchase_details = []
    } = body;

    if (!id) return errorResponse('Purchase ID is required');
    if (!cus_id) return errorResponse('Customer ID is required');
    if (!total_amount || total_amount <= 0) return errorResponse('Total amount is required and must be greater than 0');
    if (!payment || payment < 0) return errorResponse('Payment amount is required and must be non-negative');
    if (!payment_type || !['CASH', 'CHEQUE', 'BANK_TRANSFER'].includes(payment_type)) {
      return errorResponse('Valid payment type is required (CASH, CHEQUE, BANK_TRANSFER)');
    }

    // Helper function to safely parse numbers and avoid NaN
    const safeParseFloat = (value, defaultValue = 0) => {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? defaultValue : parsed;
    };

    const safeParseInt = (value, defaultValue = null) => {
      const parsed = parseInt(value);
      return isNaN(parsed) ? defaultValue : parsed;
    };

    // Calculate net total: exclude OUT charges (they are posted separately as external expenses)
    const net_total = safeParseFloat(total_amount) + safeParseFloat(unloading_amount) + safeParseFloat(fare_amount) + safeParseFloat(transport_amount) + safeParseFloat(labour_amount) - safeParseFloat(discount);

    // Check if purchase exists
    const existingPurchase = await prisma.purchase.findUnique({
      where: { pur_id: id }
    });

    if (!existingPurchase) {
      return errorResponse('Purchase not found', 404);
    }

    // Check if customer exists
    const customer = await prisma.customer.findUnique({
      where: { cus_id }
    });

    if (!customer) {
      return errorResponse('Customer not found', 404);
    }

    // Update purchase with details and ledger entries in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Get customer's current balance
      const customerData = await tx.customer.findUnique({
        where: { cus_id },
        select: { cus_balance: true }
      });

      const currentBalance = parseFloat(customerData?.cus_balance || 0);

      // Update the purchase
      const updatedPurchase = await tx.purchase.update({
        where: { pur_id: id },
        data: {
          cus_id: parseInt(cus_id),
          store_id: store_id ? parseInt(store_id) : null,
          debit_account_id: debit_account_id ? parseInt(debit_account_id) : null,
          credit_account_id: credit_account_id ? parseInt(credit_account_id) : null,
          total_amount: parseFloat(total_amount),
          unloading_amount: parseFloat(unloading_amount),
          fare_amount: parseFloat(fare_amount),
          transport_amount: parseFloat(transport_amount),
          labour_amount: parseFloat(labour_amount),
          out_labour_amount: parseFloat(out_labour_amount),
          out_delivery_amount: parseFloat(out_delivery_amount),
          include_cargo_in_costprice: include_cargo_in_costprice ? true : false,
          // Incity fields
          incity_own_labour: parseFloat(incity_own_labour),
          incity_own_delivery: parseFloat(incity_own_delivery),
          incity_charges_total: parseFloat(incity_charges_total),
          discount: parseFloat(discount),
          cargo_account_id: cargo_account_id ? parseInt(cargo_account_id) : null,
          cargo_account_ids: cargo_account_ids ? (Array.isArray(cargo_account_ids) ? JSON.stringify(cargo_account_ids) : String(cargo_account_ids)) : null,
          net_total: parseFloat(net_total),
          payment: parseFloat(payment),
          payment_type,
          vehicle_no: vehicle_no || null,
          invoice_number: invoice_number || null,
          updated_by: updated_by || existingPurchase.updated_by
        }
      });

      // Delete existing purchase details
      await tx.purchaseDetail.deleteMany({
        where: { pur_id: id }
      });

      // Delete existing ledger entries for this purchase
      await tx.ledger.deleteMany({
        where: { bill_no: id ? String(id) : null }
      });

      // Create new purchase details if provided
      if (purchase_details && purchase_details.length > 0) {
        const detailsData = purchase_details.map(detail => ({
          pur_id: id,
          vehicle_no: vehicle_no || null,
          cus_id: parseInt(cus_id),
          pro_id: parseInt(detail.pro_id),
          qnty: parseInt(detail.qnty || detail.quantity || 1),
          unit: detail.unit || 'pcs',
          unit_rate: parseFloat(detail.unit_rate || detail.rate),
          prate: parseFloat(detail.prate || detail.unit_rate || detail.rate),
          crate: parseFloat(detail.crate || detail.unit_rate || detail.rate),
          total_amount: parseFloat(detail.total_amount),
          net_total: parseFloat(detail.total_amount),
          updated_by: updated_by || existingPurchase.updated_by
        }));

        await tx.purchaseDetail.createMany({ data: detailsData });

        // Update store stock for each product using per-detail store_id (fallback to purchase-level store_id)
        const storeStockUpdatePromises = purchase_details.map(async (detail, index) => {
          const detailStoreId = detail.store_id || store_id;
          if (!detailStoreId) return;
          await updateStoreStock(detailStoreId, detailsData[index].pro_id, detailsData[index].qnty, 'increment', updated_by, tx);
        });
        await Promise.all(storeStockUpdatePromises);
      }

      // Create comprehensive ledger entries (similar to POST method)
      const ledgerEntries = [];
      let runningSupplierBalance = 0;

      // Calculate supplier amount — EXCLUDE OUT charges (Out labour/Out delivery are not billed to supplier)
      const supplierAmount = safeParseFloat(total_amount) - safeParseFloat(discount) + safeParseFloat(labour_amount) + safeParseFloat(transport_amount);

      // 1. Supplier Account Entry
      if (cus_id) {
        const supplierData = await tx.customer.findUnique({
          where: { cus_id: cus_id },
          select: { cus_balance: true, cus_name: true }
        });
        runningSupplierBalance = parseFloat(supplierData?.cus_balance || 0);

        const supplierEntry = createLedgerEntry({
          cus_id: cus_id,
          opening_balance: runningSupplierBalance,
          debit_amount: supplierAmount,
          credit_amount: 0,
          bill_no: id.toString(),
          trnx_type: 'PURCHASE',
          details: `Purchase Update from ${supplierData?.cus_name || 'Supplier'}${invoice_number ? ` #${invoice_number}` : ''}${vehicle_no ? ` - Vehicle: ${vehicle_no}` : ''}`,
          payments: 0,
          updated_by: updated_by ? parseInt(updated_by) : null
        });

        ledgerEntries.push(supplierEntry);
        runningSupplierBalance = supplierEntry.closing_balance;
      }

      // 2. Payment Entry - only if payment > 0
      const paymentAmount = safeParseFloat(payment);
      if (paymentAmount > 0 && cus_id) {
        const supplierData = await tx.customer.findUnique({
          where: { cus_id: cus_id },
          select: { cus_name: true }
        });

        const paymentEntry = createLedgerEntry({
          cus_id: cus_id,
          opening_balance: runningSupplierBalance,
          debit_amount: 0,
          credit_amount: paymentAmount,
          bill_no: id.toString(),
          trnx_type: payment_type || 'CASH',
          details: `Payment to ${supplierData?.cus_name || 'Supplier'} - Purchase Update${vehicle_no ? ` - Vehicle: ${vehicle_no}` : ''}`,
          payments: paymentAmount,
          cash_payment: payment_type === 'CASH' ? paymentAmount : 0,  // Track cash breakdown
          bank_payment: payment_type === 'BANK_TRANSFER' ? paymentAmount : 0,  // Track bank breakdown
          updated_by: updated_by ? parseInt(updated_by) : null
        });

        ledgerEntries.push(paymentEntry);
        runningSupplierBalance = paymentEntry.closing_balance;
      }

      // 3. Cash Account Entry (if payment_type is CASH)
      if (payment_type === 'CASH' && paymentAmount > 0 && credit_account_id) {
        const cashAccountData = await tx.customer.findUnique({
          where: { cus_id: credit_account_id },
          select: { cus_balance: true, cus_name: true }
        });
        const cashCurrentBalance = parseFloat(cashAccountData?.cus_balance || 0);

        const supplierForPaymentUpdateCash = await tx.customer.findUnique({ where: { cus_id }, select: { cus_name: true } });

        const cashEntry = createLedgerEntry({
          cus_id: credit_account_id,
          opening_balance: cashCurrentBalance,
          debit_amount: 0,
          credit_amount: paymentAmount,
          bill_no: id.toString(),
          trnx_type: 'CASH',
          details: `Cash Payment for Purchase Update to ${supplierForPaymentUpdateCash?.cus_name || 'Supplier'}${vehicle_no ? ` - Vehicle: ${vehicle_no}` : ''}`,
          payments: paymentAmount,
          cash_payment: paymentAmount,  // Track as cash
          bank_payment: 0,
          updated_by: updated_by ? parseInt(updated_by) : null
        });

        ledgerEntries.push(cashEntry);
      }

      // 4. Bank Account Entry (if payment_type is BANK_TRANSFER)
      if (payment_type === 'BANK_TRANSFER' && paymentAmount > 0 && credit_account_id) {
        const bankAccountData = await tx.customer.findUnique({
          where: { cus_id: credit_account_id },
          select: { cus_balance: true, cus_name: true }
        });
        const bankCurrentBalance = parseFloat(bankAccountData?.cus_balance || 0);

        const supplierForPaymentUpdateBank = await tx.customer.findUnique({ where: { cus_id }, select: { cus_name: true } });

        const bankEntry = createLedgerEntry({
          cus_id: credit_account_id,
          opening_balance: bankCurrentBalance,
          debit_amount: 0,
          credit_amount: paymentAmount,
          bill_no: id.toString(),
          trnx_type: 'BANK_TRANSFER',
          details: `Bank Payment for Purchase Update to ${supplierForPaymentUpdateBank?.cus_name || 'Supplier'}${vehicle_no ? ` - Vehicle: ${vehicle_no}` : ''}`,
          payments: paymentAmount,
          cash_payment: 0,
          bank_payment: paymentAmount,  // Track as bank payment
          updated_by: updated_by ? parseInt(updated_by) : null
        });

        ledgerEntries.push(bankEntry);
      }

      // --- CARGO / OUT CHARGES LEDGER POSTINGS (PUT) ---
      // Out charges should be posted to Labour/Cargo only — DO NOT create Cash/Bank offset entries.
      const outLabourAmtPUT = safeParseFloat(out_labour_amount || 0);
      const outDeliveryAmtPUT = safeParseFloat(out_delivery_amount || 0);

      // OUT‑LABOUR (PUT): Debit Labour account for out_labour_amount only (no supplier credit, no cash/bank offset)
      if (outLabourAmtPUT > 0) {
        const labourAccountPUT = await tx.customer.findFirst({
          where: {
            OR: [
              { cus_name: { contains: 'Labour' } },
              { cus_name: { contains: 'labour' } },
              { customer_category: { cus_cat_title: { contains: 'Labour' } } },
              { customer_type: { cus_type_title: { contains: 'Labour' } } }
            ]
          },
          select: { cus_id: true, cus_balance: true, cus_name: true }
        });

        if (labourAccountPUT) {
          const priorLabourEntriesPUT = ledgerEntries.filter(e => e.cus_id === labourAccountPUT.cus_id);
          const labourOpeningBalancePUT = priorLabourEntriesPUT.length > 0
            ? priorLabourEntriesPUT[priorLabourEntriesPUT.length - 1].closing_balance
            : parseFloat(labourAccountPUT.cus_balance || 0);

          const labourEntryPUT = createLedgerEntry({
            cus_id: labourAccountPUT.cus_id,
            opening_balance: labourOpeningBalancePUT,
            debit_amount: outLabourAmtPUT,
            credit_amount: 0,
            bill_no: id.toString(),
            trnx_type: 'PURCHASE',
            details: `Out Labour Charges - Purchase #${id}${invoice_number ? ` (Inv: ${invoice_number})` : ''}`,
            payments: 0,
            updated_by: updated_by ? parseInt(updated_by) : null
          });
          ledgerEntries.push(labourEntryPUT);
          console.log(`🔧 Labour account (PUT) entry: ${labourAccountPUT.cus_name} debited ${outLabourAmtPUT}`);
        } else {
          console.log('⚠️ Out labour amount present but Labour account not found — skipping labour ledger posting (PUT)');
        }
      }

      if (outDeliveryAmtPUT > 0) {
        let cargoIdsPUT = [];
        try {
          if (cargo_account_ids) {
            cargoIdsPUT = Array.isArray(cargo_account_ids) ? cargo_account_ids : JSON.parse(cargo_account_ids || '[]');
          } else if (cargo_account_id) {
            cargoIdsPUT = [cargo_account_id];
          }
        } catch (err) {
          cargoIdsPUT = cargo_account_ids ? (Array.isArray(cargo_account_ids) ? cargo_account_ids : [cargo_account_ids]) : (cargo_account_id ? [cargo_account_id] : []);
        }

        if (cargoIdsPUT.length === 0 && cargo_account_id) cargoIdsPUT = [cargo_account_id];

        if (cargoIdsPUT.length > 0) {
          const perAccountPUT = parseFloat((outDeliveryAmtPUT / cargoIdsPUT.length).toFixed(2));
          let remainderPUT = parseFloat((outDeliveryAmtPUT - (perAccountPUT * cargoIdsPUT.length)).toFixed(2));

          for (let i = 0; i < cargoIdsPUT.length; i++) {
            const aid = parseInt(cargoIdsPUT[i]);
            const cargoAcc = await tx.customer.findUnique({ where: { cus_id: aid }, select: { cus_id: true, cus_balance: true, cus_name: true } });
            if (!cargoAcc) {
              console.log(`⚠️ Cargo account ID ${aid} not found — skipping (PUT)`);
              continue;
            }

            let allocatePUT = perAccountPUT;
            if (i === 0) allocatePUT = parseFloat((perAccountPUT + remainderPUT).toFixed(2));

            const cargoEntry = createLedgerEntry({
              cus_id: cargoAcc.cus_id,
              opening_balance: parseFloat(cargoAcc.cus_balance || 0),
              debit_amount: allocatePUT,
              credit_amount: 0,
              bill_no: id.toString(),
              trnx_type: 'PURCHASE',
              details: `Out Delivery - Purchase #${id}${invoice_number ? ` (Inv: ${invoice_number})` : ''}`,
              payments: 0,
              updated_by: updated_by ? parseInt(updated_by) : null
            });

            ledgerEntries.push(cargoEntry);

            // --- CREDIT the Supplier for Out Delivery (PUT). Do NOT involve Cash/Bank.
            let paymentAccountIdForDeliveryPUT = null;
            let paymentTrnxTypeForDeliveryPUT = 'CASH';

            if (payment_type === 'CASH' && credit_account_id) {
              paymentAccountIdForDeliveryPUT = credit_account_id;
              paymentTrnxTypeForDeliveryPUT = 'CASH';
            } else if (payment_type === 'BANK_TRANSFER' && credit_account_id) {
              paymentAccountIdForDeliveryPUT = credit_account_id;
              paymentTrnxTypeForDeliveryPUT = 'BANK_TRANSFER';
            } else if (credit_account_id) {
              paymentAccountIdForDeliveryPUT = credit_account_id;
            }

            // Credit the Supplier for this portion (do NOT use Cash/Bank)
            if (cus_id) {
              const supplierCreditForCargoPUT = createLedgerEntry({
                cus_id: cus_id,
                opening_balance: runningSupplierBalance,
                debit_amount: 0,
                credit_amount: allocatePUT,
                bill_no: id.toString(),
                trnx_type: 'PURCHASE',
                details: `Out Delivery allocated to ${cargoAcc.cus_name} - Purchase #${id}`,
                payments: allocatePUT,
                cash_payment: payment_type === 'BANK_TRANSFER' ? 0 : allocatePUT,
                bank_payment: payment_type === 'BANK_TRANSFER' ? allocatePUT : 0,
                updated_by: updated_by ? parseInt(updated_by) : null
              });

              ledgerEntries.push(supplierCreditForCargoPUT);
              runningSupplierBalance = supplierCreditForCargoPUT.closing_balance;
            } else {
              console.log(`⚠️ No supplier available for Out Delivery allocation to ${cargoAcc.cus_name} (PUT) — cargo debit created only`);
            }
          }
        } else {
          console.log('⚠️ Out Delivery present but no cargo account selected — skipping cargo ledger postings (PUT)');
        }
      }

      // --- Incity (OWN) Ledger Postings (PUT) ---
      // Create separate ledger entries for Incity fields when provided:
      // - incity_own_labour: CREDIT to Labour account
      // - incity_own_delivery: DEBIT to Delivery account
      const incityLabourAmt = safeParseFloat(incity_own_labour || 0);
      const incityDeliveryAmt = safeParseFloat(incity_own_delivery || 0);

      let incityLabourAccount = null;
      let incityDeliveryAccount = null;

      if (incityLabourAmt > 0) {
        incityLabourAccount = await tx.customer.findFirst({
          where: {
            OR: [
              { cus_name: { contains: 'labour' } },
              { customer_category: { cus_cat_title: { contains: 'labour' } } },
              { customer_type: { cus_type_title: { contains: 'labour' } } }
            ]
          },
          select: { cus_id: true, cus_balance: true, cus_name: true }
        });

        if (incityLabourAccount) {
          // 1) Expense recognition: DEBIT Labour account (existing behaviour)
          const labourEntry = createLedgerEntry({
            cus_id: incityLabourAccount.cus_id,
            opening_balance: parseFloat(incityLabourAccount.cus_balance || 0),
            debit_amount: incityLabourAmt,
            credit_amount: 0,
            bill_no: id.toString(),
            trnx_type: 'CASH',
            details: `Incity (Own) - Labour - Purchase Update #${id}${invoice_number ? ` (Inv: ${invoice_number})` : ''}`,
            payments: 0,
            cash_payment: 0,
            bank_payment: 0,
            updated_by: updated_by ? parseInt(updated_by) : null
          });

          ledgerEntries.push(labourEntry);
          console.log(`🔧 Incity labour ledger entry queued for account ${incityLabourAccount.cus_name} (ID: ${incityLabourAccount.cus_id}) amount=${incityLabourAmt}`);

          // 2) Record payment to Labour account: CREDIT the labour account and mark cash/bank so it shows in Cash/Bank columns
          const incityLabourPaidViaPUT = cashPaymentAmount > 0 ? 'CASH' : (bankPaymentAmount > 0 ? 'BANK_TRANSFER' : 'CASH');
          const incityLabourCashPUT = incityLabourPaidViaPUT === 'CASH' ? incityLabourAmt : 0;
          const incityLabourBankPUT = incityLabourPaidViaPUT === 'BANK_TRANSFER' ? incityLabourAmt : 0;

          // include supplier name in the payment and cash/bank details (PUT)
          const supplierForIncityPUT = cus_id ? await tx.customer.findUnique({ where: { cus_id }, select: { cus_name: true } }) : null;

          const labourPaymentEntryPUT = createLedgerEntry({
            cus_id: incityLabourAccount.cus_id,
            opening_balance: labourEntry.closing_balance,
            debit_amount: 0,
            credit_amount: incityLabourAmt,
            bill_no: id.toString(),
            trnx_type: incityLabourPaidViaPUT,
            details: `Payment for Incity (Own) Labour - Purchase Update #${id}${invoice_number ? ` (Inv: ${invoice_number})` : ''} ${supplierForIncityPUT?.cus_name ? `- Supplier: ${supplierForIncityPUT.cus_name}` : ''}`,
            payments: incityLabourAmt,
            cash_payment: incityLabourCashPUT,
            bank_payment: incityLabourBankPUT,
            updated_by: updated_by ? parseInt(updated_by) : null
          });

          ledgerEntries.push(labourPaymentEntryPUT);

          // 3) Create corresponding Cash/Bank account entry (credit the cash/bank account to show outflow)
          if (incityLabourCashPUT > 0 && credit_account_id) {
            const cashAccountDataPUT = await tx.customer.findUnique({ where: { cus_id: credit_account_id }, select: { cus_balance: true, cus_name: true } });
            if (cashAccountDataPUT) {
              const cashLabourEntryPUT = createLedgerEntry({
                cus_id: credit_account_id,
                opening_balance: parseFloat(cashAccountDataPUT?.cus_balance || 0),
                debit_amount: 0,
                credit_amount: incityLabourCashPUT,
                bill_no: id.toString(),
                trnx_type: 'CASH',
                details: `Cash Payment for Incity Labour - Purchase Update #${id}${supplierForIncityPUT?.cus_name ? ` - Supplier: ${supplierForIncityPUT.cus_name}` : ''}`,
                payments: incityLabourCashPUT,
                cash_payment: incityLabourCashPUT,
                bank_payment: 0,
                updated_by: updated_by ? parseInt(updated_by) : null
              });

              ledgerEntries.push(cashLabourEntryPUT);
            } else {
              console.log('⚠️ Incity labour cash payment requested but cash account not found (PUT)');
            }
          } else if (incityLabourBankPUT > 0 && bankAccountIdInt) {
            const bankAccPUT = await tx.customer.findUnique({ where: { cus_id: bankAccountIdInt }, select: { cus_balance: true, cus_name: true } });
            if (bankAccPUT) {
              const bankLabourEntryPUT = createLedgerEntry({
                cus_id: bankAccountIdInt,
                opening_balance: parseFloat(bankAccPUT?.cus_balance || 0),
                debit_amount: 0,
                credit_amount: incityLabourBankPUT,
                bill_no: id.toString(),
                trnx_type: 'BANK_TRANSFER',
                details: `Bank Payment for Incity Labour - Purchase Update #${id}${supplierForIncityPUT?.cus_name ? ` - Supplier: ${supplierForIncityPUT.cus_name}` : ''}`,
                payments: incityLabourBankPUT,
                cash_payment: 0,
                bank_payment: incityLabourBankPUT,
                updated_by: updated_by ? parseInt(updated_by) : null
              });

              ledgerEntries.push(bankLabourEntryPUT);
            } else {
              console.log('⚠️ Incity labour bank payment requested but bank account not found (PUT)');
            }
          }
        } else {
          console.log('⚠️ Incity labour amount present but Labour account not found — skipping Incity labour ledger posting');
        }
      }

      if (incityDeliveryAmt > 0) {
        incityDeliveryAccount = await tx.customer.findFirst({
          where: {
            OR: [
              { cus_name: { contains: 'delivery' } },
              { cus_name: { contains: 'transport' } },
              { customer_category: { cus_cat_title: { contains: 'delivery' } } },
              { customer_type: { cus_type_title: { contains: 'delivery' } } }
            ]
          },
          select: { cus_id: true, cus_balance: true, cus_name: true }
        });

        if (incityDeliveryAccount) {
          // 1) Expense recognition: DEBIT Delivery/Transport account (existing behaviour)
          const deliveryEntry = createLedgerEntry({
            cus_id: incityDeliveryAccount.cus_id,
            opening_balance: parseFloat(incityDeliveryAccount.cus_balance || 0),
            debit_amount: incityDeliveryAmt,
            credit_amount: 0,
            bill_no: id.toString(),
            trnx_type: 'CASH',
            details: `Incity (Own) - Delivery - Purchase Update #${id}${invoice_number ? ` (Inv: ${invoice_number})` : ''}`,
            payments: 0,
            cash_payment: 0,
            bank_payment: 0,
            updated_by: updated_by ? parseInt(updated_by) : null
          });

          ledgerEntries.push(deliveryEntry);
          console.log(`🔧 Incity delivery ledger entry queued for account ${incityDeliveryAccount.cus_name} (ID: ${incityDeliveryAccount.cus_id}) amount=${incityDeliveryAmt}`);

          // 2) Record payment to Delivery account: CREDIT the delivery account and include cash/bank breakdown
          const incityDeliveryPaidViaPUT = cashPaymentAmount > 0 ? 'CASH' : (bankPaymentAmount > 0 ? 'BANK_TRANSFER' : 'CASH');
          const incityDeliveryCashPUT = incityDeliveryPaidViaPUT === 'CASH' ? incityDeliveryAmt : 0;
          const incityDeliveryBankPUT = incityDeliveryPaidViaPUT === 'BANK_TRANSFER' ? incityDeliveryAmt : 0;

          const deliveryPaymentEntryPUT = createLedgerEntry({
            cus_id: incityDeliveryAccount.cus_id,
            opening_balance: deliveryEntry.closing_balance,
            debit_amount: 0,
            credit_amount: incityDeliveryAmt,
            bill_no: id.toString(),
            trnx_type: incityDeliveryPaidViaPUT,
            details: `Payment for Incity (Own) Delivery - Purchase Update #${id}${invoice_number ? ` (Inv: ${invoice_number})` : ''}`,
            payments: incityDeliveryAmt,
            cash_payment: incityDeliveryCashPUT,
            bank_payment: incityDeliveryBankPUT,
            updated_by: updated_by ? parseInt(updated_by) : null
          });

          ledgerEntries.push(deliveryPaymentEntryPUT);

          // 3) Create corresponding Cash/Bank account entry (credit the cash/bank account to show outflow)
          if (incityDeliveryCashPUT > 0 && credit_account_id) {
            const cashAccountDataPUT = await tx.customer.findUnique({ where: { cus_id: credit_account_id }, select: { cus_balance: true, cus_name: true } });
            if (cashAccountDataPUT) {
              const cashDeliveryEntryPUT = createLedgerEntry({
                cus_id: credit_account_id,
                opening_balance: parseFloat(cashAccountDataPUT?.cus_balance || 0),
                debit_amount: 0,
                credit_amount: incityDeliveryCashPUT,
                bill_no: id.toString(),
                trnx_type: 'CASH',
                details: `Cash Payment for Incity Delivery - Purchase Update #${id}`,
                payments: incityDeliveryCashPUT,
                cash_payment: incityDeliveryCashPUT,
                bank_payment: 0,
                updated_by: updated_by ? parseInt(updated_by) : null
              });

              ledgerEntries.push(cashDeliveryEntryPUT);
            } else {
              console.log('⚠️ Incity delivery cash payment requested but cash account not found (PUT)');
            }
          } else if (incityDeliveryBankPUT > 0 && bankAccountIdInt) {
            const bankAccPUT = await tx.customer.findUnique({ where: { cus_id: bankAccountIdInt }, select: { cus_balance: true, cus_name: true } });
            if (bankAccPUT) {
              const bankDeliveryEntryPUT = createLedgerEntry({
                cus_id: bankAccountIdInt,
                opening_balance: parseFloat(bankAccPUT?.cus_balance || 0),
                debit_amount: 0,
                credit_amount: incityDeliveryBankPUT,
                bill_no: id.toString(),
                trnx_type: 'BANK_TRANSFER',
                details: `Bank Payment for Incity Delivery - Purchase Update #${id}`,
                payments: incityDeliveryBankPUT,
                cash_payment: 0,
                bank_payment: incityDeliveryBankPUT,
                updated_by: updated_by ? parseInt(updated_by) : null
              });

              ledgerEntries.push(bankDeliveryEntryPUT);
            } else {
              console.log('⚠️ Incity delivery bank payment requested but bank account not found (PUT)');
            }
          }
        } else {
          console.log('⚠️ Incity delivery amount present but Delivery/Transport account not found — skipping Incity delivery ledger posting (PUT)');
        }
      }

      // 5. Create all ledger entries
      console.log(`📊 CREATING ${ledgerEntries.length} LEDGER ENTRIES IN DATABASE (PUT)`);

      for (let i = 0; i < ledgerEntries.length; i++) {
        const entry = ledgerEntries[i];
        console.log(`   Entry ${i + 1}: Customer=${entry.cus_id}, Debit=${entry.debit_amount}, Credit=${entry.credit_amount}`);

        await tx.ledger.create({
          data: {
            cus_id: entry.cus_id,
            opening_balance: entry.opening_balance,
            debit_amount: entry.debit_amount,
            credit_amount: entry.credit_amount,
            closing_balance: entry.closing_balance,
            bill_no: entry.bill_no,
            trnx_type: entry.trnx_type,
            details: entry.details,
            payments: entry.payments,
            cash_payment: entry.cash_payment,
            bank_payment: entry.bank_payment,
            updated_by: entry.updated_by
          }
        });
      }

      // 6. Update Customer Balances
      if (cus_id) {
        const supplierLedgerEntries = ledgerEntries.filter(e => e.cus_id === cus_id);
        if (supplierLedgerEntries.length > 0) {
          const lastSupplierEntry = supplierLedgerEntries[supplierLedgerEntries.length - 1];
          const supplierClosingBalance = parseFloat(lastSupplierEntry.closing_balance);

          await tx.customer.update({
            where: { cus_id: cus_id },
            data: { cus_balance: supplierClosingBalance }
          });
        }
      }

      // Update cash/bank account balances (use the latest ledger entry for the account)
      if (credit_account_id) {
        const acctEntries = ledgerEntries.filter(e => e.cus_id === credit_account_id);
        if (acctEntries.length > 0) {
          const lastAcctEntry = acctEntries[acctEntries.length - 1];
          await tx.customer.update({ where: { cus_id: credit_account_id }, data: { cus_balance: lastAcctEntry.closing_balance } });
        }
      }

      // Update Incity Labour/Delivery account balances (if we queued entries above)
      if (typeof incityLabourAccount !== 'undefined' && incityLabourAccount && ledgerEntries.find(e => e.cus_id === incityLabourAccount.cus_id)) {
        const labourLedgerEntry = ledgerEntries.find(e => e.cus_id === incityLabourAccount.cus_id);
        await tx.customer.update({ where: { cus_id: incityLabourAccount.cus_id }, data: { cus_balance: labourLedgerEntry.closing_balance } });
        console.log(`💼 Incity Labour account updated (PUT): ID=${incityLabourAccount.cus_id} balance=${labourLedgerEntry.closing_balance}`);
      }

      if (typeof incityDeliveryAccount !== 'undefined' && incityDeliveryAccount && ledgerEntries.find(e => e.cus_id === incityDeliveryAccount.cus_id)) {
        const deliveryLedgerEntry = ledgerEntries.find(e => e.cus_id === incityDeliveryAccount.cus_id);
        await tx.customer.update({ where: { cus_id: incityDeliveryAccount.cus_id }, data: { cus_balance: deliveryLedgerEntry.closing_balance } });
        console.log(`💼 Incity Delivery account updated (PUT): ID=${incityDeliveryAccount.cus_id} balance=${deliveryLedgerEntry.closing_balance}`);
      }

      // --- Update OUT-Labour / Cargo / Out-Payment account balances (PUT) ---
      // Labour account and Cargo account balances are updated via the generic otherAccountIds loop below.

      try {
        const cargoIdsUsed = [];
        if (cargo_account_ids) {
          cargoIdsUsed.push(...(Array.isArray(cargo_account_ids) ? cargo_account_ids.map(id => parseInt(id)) : (JSON.parse(cargo_account_ids || '[]') || [])));
        } else if (cargo_account_id) {
          cargoIdsUsed.push(parseInt(cargo_account_id));
        }

        for (const cid of cargoIdsUsed) {
          const ledgerForCargo = ledgerEntries.filter(e => e.cus_id === cid);
          if (ledgerForCargo && ledgerForCargo.length > 0) {
            const lastCargoEntry = ledgerForCargo[ledgerForCargo.length - 1];
            await tx.customer.update({ where: { cus_id: cid }, data: { cus_balance: lastCargoEntry.closing_balance } });
            console.log(`💼 Cargo account updated (PUT): ID=${cid} balance=${lastCargoEntry.closing_balance}`);
          }
        }
      } catch (err) {
        console.log('⚠️ Error updating cargo account balances (PUT):', err.message);
      }

      return { purchase: updatedPurchase };
    }, { maxWait: 10000, timeout: 30000 });

    // Fetch the complete updated purchase with relations
    const completePurchase = await prisma.purchase.findUnique({
      where: { pur_id: result.purchase.pur_id },
      include: {
        customer: true,
        updated_by_user: {
          select: {
            user_id: true,
            full_name: true,
            role: true
          }
        },
        purchase_details: {
          include: {
            product: {
              select: {
                pro_id: true,
                pro_title: true,
                pro_unit: true
              }
            }
          }
        }
      }
    });

    return NextResponse.json(completePurchase);
  } catch (err) {
    console.error('❌ Error updating purchase:', err);
    return errorResponse('Failed to update purchase', 500);
  }
}

// ========================================
// DELETE — Delete a purchase
// ========================================
export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id') ? parseInt(searchParams.get('id')) : null; // /api/purchases?id=1

  if (!id) {
    return errorResponse('Purchase ID is required');
  }

  try {
    const existingPurchase = await prisma.purchase.findUnique({
      where: { pur_id: id }
    });

    if (!existingPurchase) {
      return errorResponse('Purchase not found', 404);
    }

    // Delete purchase details first (due to foreign key constraint)
    await prisma.purchaseDetail.deleteMany({
      where: { pur_id: id }
    });

    // Delete the purchase
    await prisma.purchase.delete({
      where: { pur_id: id }
    });

    return NextResponse.json({ message: 'Purchase deleted successfully' });
  } catch (err) {
    console.error('❌ Error deleting purchase:', err);
    return errorResponse('Failed to delete purchase', 500);
  }
}
