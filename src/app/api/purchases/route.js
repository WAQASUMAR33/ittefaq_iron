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
      purchase_details = []
    } = body;

    let { credit_account_id } = body;

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

    // Calculate net total: total_amount + unloading_amount + fare_amount + transport_amount + labour_amount - discount
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
        total_amount: safeParseFloat(total_amount),
        unloading_amount: safeParseFloat(unloading_amount),
        fare_amount: safeParseFloat(fare_amount),
        transport_amount: safeParseFloat(transport_amount),
        labour_amount: safeParseFloat(labour_amount),
        // Incity fields
        incity_own_labour: safeParseFloat(incity_own_labour),
        incity_own_delivery: safeParseFloat(incity_own_delivery),
        incity_charges_total: safeParseFloat(incity_charges_total),
        discount: safeParseFloat(discount),
        cargo_account_id: cargo_account_id ? safeParseInt(cargo_account_id) : null,
        cargo_account_ids: cargo_account_ids ? (Array.isArray(cargo_account_ids) ? JSON.stringify(cargo_account_ids) : String(cargo_account_ids)) : null,
        net_total: safeParseFloat(net_total),
        payment: totalPaymentAmount,
        payment_type: actualPaymentType,
        cash_payment: cashPaymentAmount,
        bank_payment: bankPaymentAmount,
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
            qnty: safeParseInt(detail.qnty || detail.quantity, 1),
            unit: detail.unit || 'pcs',
            unit_rate: safeParseFloat(detail.unit_rate || detail.rate),
            prate: safeParseFloat(detail.prate || detail.unit_rate || detail.rate),
            crate: safeParseFloat(detail.crate || detail.unit_rate || detail.rate),
            total_amount: safeParseFloat(detail.total_amount),
            net_total: safeParseFloat(detail.total_amount), // Use total_amount as net_total for now
            updated_by: updated_by ? safeParseInt(updated_by) : null
          };

          console.log('🔍 Processed detail:', processedDetail);
          return processedDetail;
        });

        await tx.purchaseDetail.createMany({
          data: detailsData
        });
        // Update store stock for each product
        if (store_id) {
          const storeStockUpdatePromises = detailsData.map(async detail => {
            // For NEW PURCHASE: increment stock (items added)
            // For PURCHASE RETURN: decrement stock (items removed)
            const stockOperation = isReturn ? 'decrement' : 'increment';
            await updateStoreStock(store_id, detail.pro_id, detail.qnty, stockOperation, updated_by, tx);
          });
          await Promise.all(storeStockUpdatePromises);
        }
      }

      // Create comprehensive ledger entries for purchase (similar to sales)
      // For NEW PURCHASE: Debit supplier (amount owed increases), Credit cash/bank (payment decreases assets)
      // For PURCHASE RETURN: Reverse the entries
      // NOTE: Only product amount (minus discount) goes to supplier ledger
      // Labour, delivery, transport, unloading are separate expenses

      const ledgerEntries = [];
      let runningSupplierBalance = 0;

      // Calculate supplier amount — now includes labour and delivery (transport) charges so they become part of supplier invoice.
      // NOTE: We intentionally include labour_amount and transport_amount in the supplier ledger; labour/delivery
      // will NOT be created as separate expense records for purchases.
      const supplierAmount = safeParseFloat(total_amount) - safeParseFloat(discount) + safeParseFloat(labour_amount) + safeParseFloat(transport_amount);

      // 1. Supplier Account Entry — includes product + labour + delivery
      if (cus_id) {
        const supplierData = await tx.customer.findUnique({ where: { cus_id: cus_id }, select: { cus_balance: true, cus_name: true } });
        runningSupplierBalance = parseFloat(supplierData?.cus_balance || 0);

        console.log(`\n📊 PURCHASE LEDGER ENTRY DEBUG`);
        console.log(`   Supplier: ${supplierData?.cus_name} (ID: ${cus_id})`);
        console.log(`   Opening Balance: ${runningSupplierBalance}`);
        console.log(`   Bill Amount (products + labour + delivery): ${supplierAmount}${safeParseFloat(discount) > 0 ? ` (After Discount: ${safeParseFloat(discount)})` : ''}`);

        const supplierEntry = createLedgerEntry({
          cus_id: cus_id,
          opening_balance: runningSupplierBalance,
          debit_amount: isReturn ? 0 : supplierAmount,
          credit_amount: isReturn ? supplierAmount : 0,
          bill_no: newPurchase.pur_id.toString(),
          trnx_type: 'CASH',
          details: `${isReturn ? 'Purchase Return' : 'Purchase Invoice'}${invoice_number ? ` #${invoice_number}` : ''} ${isReturn ? 'to' : 'from'} ${supplierData?.cus_name || 'Supplier'}${vehicle_no ? ` - Vehicle: ${vehicle_no}` : ''}${safeParseFloat(discount) > 0 ? ` [After Discount: ${safeParseFloat(discount)}]` : ''} (includes labour & delivery)`,
          payments: 0,
          updated_by: updated_by ? parseInt(updated_by) : null
        });

        ledgerEntries.push(supplierEntry);
        runningSupplierBalance = supplierEntry.closing_balance;

        console.log(`📝 Supplier Entry Created: Opening=${supplierEntry.opening_balance}, Debit=${supplierEntry.debit_amount}, Closing=${supplierEntry.closing_balance}`);
        console.log(`   Note: Supplier invoice now includes labour and delivery charges — no separate expense will be created for them.`);
      }

      // 2. Consolidated Payment Entry - Cash + Bank Payment to Supplier (similar to sales page)
      const cashPaymentForSupplier = isReturn ? 0 : cashPaymentAmount;
      const bankPaymentForSupplier = isReturn ? 0 : bankPaymentAmount;
      const totalPaymentToSupplier = cashPaymentForSupplier + bankPaymentForSupplier;

      if (totalPaymentToSupplier > 0 && cus_id) {
        const supplierData = await tx.customer.findUnique({
          where: { cus_id: cus_id },
          select: { cus_name: true }
        });

        console.log(`💳 CREATING CONSOLIDATED PAYMENT ENTRY: Total=${totalPaymentToSupplier}`);
        console.log(`   Breakdown: Cash=${cashPaymentForSupplier}, Bank=${bankPaymentForSupplier}`);
        console.log(`   Opening Balance: ${runningSupplierBalance}`);

        // Build payment details with breakdown
        let paymentDetails = `Payment for Invoice to ${supplierData?.cus_name || 'Supplier'} (includes labour & delivery)`;
        const breakdown = [];
        if (cashPaymentForSupplier > 0) breakdown.push(`Cash: ${cashPaymentForSupplier.toFixed(2)}`);
        if (bankPaymentForSupplier > 0) breakdown.push(`Bank: ${bankPaymentForSupplier.toFixed(2)}`);
        if (breakdown.length > 0) {
          paymentDetails += ` | Split: [${breakdown.join(', ')}]`;
        }
        if (cashPaymentForSupplier > 0 && bankPaymentForSupplier > 0) {
          paymentDetails += ` | {cash_amount: ${cashPaymentForSupplier}, bank_amount: ${bankPaymentForSupplier}}`;
        }

        const supplierPaymentEntry = createLedgerEntry({
          cus_id: cus_id,
          opening_balance: runningSupplierBalance,
          debit_amount: 0,
          credit_amount: totalPaymentToSupplier,  // Credit reduces supplier balance owed
          bill_no: newPurchase.pur_id.toString(),
          trnx_type: totalPaymentToSupplier > 0 && bankPaymentForSupplier > 0 && cashPaymentForSupplier === 0 ? 'BANK_TRANSFER' : 'CASH',
          details: paymentDetails,
          payments: totalPaymentToSupplier,
          cash_payment: cashPaymentForSupplier,  // Add cash breakdown
          bank_payment: bankPaymentForSupplier,  // Add bank breakdown
          updated_by: updated_by ? parseInt(updated_by) : null
        });

        ledgerEntries.push(supplierPaymentEntry);
        runningSupplierBalance = supplierPaymentEntry.closing_balance;

        console.log(`💳 Supplier Payment Entry Created: Opening=${supplierPaymentEntry.opening_balance}, Credit=${supplierPaymentEntry.credit_amount}, Closing=${supplierPaymentEntry.closing_balance}`);
        console.log(`   Note: Payment applies to full invoice (products + labour + delivery). No separate expense will be created for labour/delivery.`);
      }

      // 3. Bank Account - CREDIT (when bank payment is made)
      // When bank payment is made, bank account balance DECREASES (credit decreases asset)
      let usedBankAccountId = null;  // Track which bank account is being used
      
      if (parseFloat(bank_payment || 0) > 0) {
        let bankAccountToUse = null;

        console.log(`🏦 DEBUG: Looking for bank account with ID: ${body.bank_account_id}`);

        // If a specific bank account ID is provided, use it
        if (body.bank_account_id) {
          const specificBank = await tx.customer.findUnique({
            where: { cus_id: body.bank_account_id }
          });

          if (specificBank) {
            bankAccountToUse = specificBank;
            console.log(`🏦 Using specific bank: ${specificBank.cus_name} (ID: ${specificBank.cus_id})`);
          } else {
            console.log(`⚠️ Bank account ID ${body.bank_account_id} not found`);
          }
        } else {
          console.log(`⚠️ No bank_account_id provided in request body`);
        }

        if (bankAccountToUse) {
          usedBankAccountId = bankAccountToUse.cus_id;
          console.log(`🏦 BANK PAYMENT DETECTED: ${bank_payment}`);
          console.log(`🏦 Bank Account Before: ID=${bankAccountToUse.cus_id}, Name=${bankAccountToUse.cus_name}, Balance=${bankAccountToUse.cus_balance}`);

          const bankEntry = createLedgerEntry({
            cus_id: bankAccountToUse.cus_id,
            opening_balance: bankAccountToUse.cus_balance,
            debit_amount: 0,
            credit_amount: parseFloat(bank_payment),
            bill_no: newPurchase.pur_id.toString(),
            trnx_type: 'BANK_TRANSFER',
            details: `Payment made - Purchase - BANK Account: ${bankAccountToUse.cus_name} (Credit)`,
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
      if (cashPaymentAmount > 0 && credit_account_id) {
        const cashAccountData = await tx.customer.findUnique({
          where: { cus_id: credit_account_id },
          select: { cus_balance: true, cus_name: true }
        });
        const cashCurrentBalance = parseFloat(cashAccountData?.cus_balance || 0);

        console.log(`💵 CASH PAYMENT DETECTED: ${cashPaymentAmount}`);
        console.log(`💵 Cash Account Before: ID=${credit_account_id}, Name=${cashAccountData?.cus_name}, Balance=${cashCurrentBalance}`);

        // NEW PURCHASE: Credit Cash Account (reduces asset - money paid out)
        // PURCHASE RETURN: Debit Cash Account (increases asset - money received back)
        const cashEntry = createLedgerEntry({
          cus_id: credit_account_id,
          opening_balance: cashCurrentBalance,
          debit_amount: isReturn ? cashPaymentAmount : 0,    // Debit on return
          credit_amount: isReturn ? 0 : cashPaymentAmount,   // Credit on purchase
          bill_no: newPurchase.pur_id.toString(),
          trnx_type: 'CASH',
          details: `${isReturn ? 'Cash Refund for Purchase Return' : 'Cash Payment for Purchase'} - ${vehicle_no ? `Vehicle: ${vehicle_no}` : 'Purchase Order'}`,
          payments: cashPaymentAmount,
          cash_payment: cashPaymentAmount,  // Mark as cash payment
          bank_payment: 0,
          updated_by: updated_by ? parseInt(updated_by) : null
        });

        ledgerEntries.push(cashEntry);

        console.log(`💵 Cash Account Entry Created: Opening=${cashEntry.opening_balance}, Debit=${cashEntry.debit_amount}, Credit=${cashEntry.credit_amount}, Closing=${cashEntry.closing_balance}`);
      }

      // --- Incity (OWN) Ledger Postings (POST) ---
      // Create separate ledger entries for Incity fields when provided:
      // - incity_own_labour: DEBIT to Labour account
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
          const labourEntry = createLedgerEntry({
            cus_id: incityLabourAccount.cus_id,
            opening_balance: parseFloat(incityLabourAccount.cus_balance || 0),
            debit_amount: incityLabourAmt,
            credit_amount: 0,
            bill_no: newPurchase.pur_id.toString(),
            trnx_type: 'CASH',
            details: `Incity (Own) - Labour - Purchase #${newPurchase.pur_id}${invoice_number ? ` (Inv: ${invoice_number})` : ''}`,
            payments: 0,
            updated_by: updated_by ? parseInt(updated_by) : null
          });

          ledgerEntries.push(labourEntry);
          console.log(`🔧 Incity labour ledger entry queued for account ${incityLabourAccount.cus_name} (ID: ${incityLabourAccount.cus_id}) amount=${incityLabourAmt}`);
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
          const deliveryEntry = createLedgerEntry({
            cus_id: incityDeliveryAccount.cus_id,
            opening_balance: parseFloat(incityDeliveryAccount.cus_balance || 0),
            debit_amount: incityDeliveryAmt,
            credit_amount: 0,
            bill_no: newPurchase.pur_id.toString(),
            trnx_type: 'CASH',
            details: `Incity (Own) - Delivery - Purchase #${newPurchase.pur_id}${invoice_number ? ` (Inv: ${invoice_number})` : ''}`,
            payments: 0,
            updated_by: updated_by ? parseInt(updated_by) : null
          });

          ledgerEntries.push(deliveryEntry);
          console.log(`🔧 Incity delivery ledger entry queued for account ${incityDeliveryAccount.cus_name} (ID: ${incityDeliveryAccount.cus_id}) amount=${incityDeliveryAmt}`);
        } else {
          console.log('⚠️ Incity delivery amount present but Delivery/Transport account not found — skipping Incity delivery ledger posting');
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

      // Update cash account balance
      if (cashPaymentAmount > 0 && credit_account_id) {
        const cashLedgerEntry = ledgerEntries.find(e => e.cus_id === credit_account_id);
        if (cashLedgerEntry) {
          await tx.customer.update({
            where: { cus_id: credit_account_id },
            data: { cus_balance: cashLedgerEntry.closing_balance }
          });

          console.log(`💵 CASH ACCOUNT BALANCE UPDATED: ${credit_account_id} balance set to ${cashLedgerEntry.closing_balance}`);
        }
      }

      // Update bank account balance (only the specific bank that was used)
      if (parseFloat(bank_payment || 0) > 0 && usedBankAccountId) {
        console.log(`🏦 DEBUG: Updating bank balance for ID ${usedBankAccountId}`);
        console.log(`🏦 DEBUG: Looking for ledger entry with cus_id=${usedBankAccountId}, trnx_type=BANK_TRANSFER`);
        
        const bankLedgerEntry = ledgerEntries.find(e => 
          e.cus_id === usedBankAccountId && e.trnx_type === 'BANK_TRANSFER'
        );
        
        console.log(`🏦 DEBUG: Found ledger entry:`, bankLedgerEntry ? `Yes (closing_balance=${bankLedgerEntry.closing_balance})` : `No`);
        
        if (bankLedgerEntry) {
          console.log(`🏦 DEBUG: Updating customer ${usedBankAccountId} balance to ${bankLedgerEntry.closing_balance}`);
          await tx.customer.update({
            where: { cus_id: usedBankAccountId },
            data: { cus_balance: bankLedgerEntry.closing_balance }
          });

          console.log(`🏦 BANK ACCOUNT BALANCE UPDATED: ${usedBankAccountId} balance set to ${bankLedgerEntry.closing_balance}`);
        } else {
          console.log(`❌ ERROR: Could not find bank ledger entry for balance update`);
        }
      } else {
        console.log(`🏦 DEBUG: No bank balance update needed. bank_payment=${bank_payment}, usedBankAccountId=${usedBankAccountId}`);
      }

      // 7. Labour & Delivery charges are INCLUDED in the supplier invoice and supplier ledger entry.
      // Additionally create/update separate ledger balances for Incity (OWN) Labour/Delivery accounts if we created entries above.

      // Update Incity Labour account balance (if a ledger entry was created)
      if (typeof incityLabourAccount !== 'undefined' && incityLabourAccount && ledgerEntries.find(e => e.cus_id === incityLabourAccount.cus_id)) {
        const labourLedgerEntry = ledgerEntries.find(e => e.cus_id === incityLabourAccount.cus_id);
        await tx.customer.update({ where: { cus_id: incityLabourAccount.cus_id }, data: { cus_balance: labourLedgerEntry.closing_balance } });
        console.log(`💼 Incity Labour account updated: ID=${incityLabourAccount.cus_id} balance=${labourLedgerEntry.closing_balance}`);
      }

      // Update Incity Delivery/Transport account balance (if a ledger entry was created)
      if (typeof incityDeliveryAccount !== 'undefined' && incityDeliveryAccount && ledgerEntries.find(e => e.cus_id === incityDeliveryAccount.cus_id)) {
        const deliveryLedgerEntry = ledgerEntries.find(e => e.cus_id === incityDeliveryAccount.cus_id);
        await tx.customer.update({ where: { cus_id: incityDeliveryAccount.cus_id }, data: { cus_balance: deliveryLedgerEntry.closing_balance } });
        console.log(`💼 Incity Delivery account updated: ID=${incityDeliveryAccount.cus_id} balance=${deliveryLedgerEntry.closing_balance}`);
      }

      // Note: We still DO NOT create separate Expense records for Labour or Delivery here —
      // the Incity values are posted as ledger entries to the specified Labour/Delivery accounts.


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

    // Calculate net total
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

        // Update store stock for each product
        if (store_id) {
          const storeStockUpdatePromises = detailsData.map(async detail => {
            await updateStoreStock(store_id, detail.pro_id, detail.qnty, 'increment', updated_by, tx);
          });
          await Promise.all(storeStockUpdatePromises);
        }
      }

      // Create comprehensive ledger entries (similar to POST method)
      const ledgerEntries = [];
      let runningSupplierBalance = 0;

      // Calculate supplier amount — include labour and delivery so the supplier invoice reflects them
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
          trnx_type: 'CASH',
          details: `Purchase Update from ${supplierData?.cus_name || 'Supplier'}${invoice_number ? ` #${invoice_number}` : ''}${vehicle_no ? ` - Vehicle: ${vehicle_no}` : ''} (includes labour & delivery)`,
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

        const cashEntry = createLedgerEntry({
          cus_id: credit_account_id,
          opening_balance: cashCurrentBalance,
          debit_amount: 0,
          credit_amount: paymentAmount,
          bill_no: id.toString(),
          trnx_type: 'CASH',
          details: `Cash Payment for Purchase Update${vehicle_no ? ` - Vehicle: ${vehicle_no}` : ''}`,
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

        const bankEntry = createLedgerEntry({
          cus_id: credit_account_id,
          opening_balance: bankCurrentBalance,
          debit_amount: 0,
          credit_amount: paymentAmount,
          bill_no: id.toString(),
          trnx_type: 'BANK_TRANSFER',
          details: `Bank Payment for Purchase Update${vehicle_no ? ` - Vehicle: ${vehicle_no}` : ''}`,
          payments: paymentAmount,
          cash_payment: 0,
          bank_payment: paymentAmount,  // Track as bank payment
          updated_by: updated_by ? parseInt(updated_by) : null
        });

        ledgerEntries.push(bankEntry);
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
          const labourEntry = createLedgerEntry({
            cus_id: incityLabourAccount.cus_id,
            opening_balance: parseFloat(incityLabourAccount.cus_balance || 0),
            debit_amount: incityLabourAmt,
            credit_amount: 0,
            bill_no: id.toString(),
            trnx_type: 'CASH',
            details: `Incity (Own) - Labour - Purchase Update #${id}${invoice_number ? ` (Inv: ${invoice_number})` : ''}`,
            payments: 0,
            updated_by: updated_by ? parseInt(updated_by) : null
          });

          ledgerEntries.push(labourEntry);
          console.log(`🔧 Incity labour ledger entry queued for account ${incityLabourAccount.cus_name} (ID: ${incityLabourAccount.cus_id}) amount=${incityLabourAmt}`);
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
          const deliveryEntry = createLedgerEntry({
            cus_id: incityDeliveryAccount.cus_id,
            opening_balance: parseFloat(incityDeliveryAccount.cus_balance || 0),
            debit_amount: incityDeliveryAmt,
            credit_amount: 0,
            bill_no: id.toString(),
            trnx_type: 'CASH',
            details: `Incity (Own) - Delivery - Purchase Update #${id}${invoice_number ? ` (Inv: ${invoice_number})` : ''}`,
            payments: 0,
            updated_by: updated_by ? parseInt(updated_by) : null
          });

          ledgerEntries.push(deliveryEntry);
          console.log(`🔧 Incity delivery ledger entry queued for account ${incityDeliveryAccount.cus_name} (ID: ${incityDeliveryAccount.cus_id}) amount=${incityDeliveryAmt}`);
        } else {
          console.log('⚠️ Incity delivery amount present but Delivery/Transport account not found — skipping Incity delivery ledger posting');
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

      // Update cash/bank account balances
      if (credit_account_id && paymentAmount > 0) {
        const accountLedgerEntry = ledgerEntries.find(e => e.cus_id === credit_account_id);
        if (accountLedgerEntry) {
          await tx.customer.update({
            where: { cus_id: credit_account_id },
            data: { cus_balance: accountLedgerEntry.closing_balance }
          });
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
