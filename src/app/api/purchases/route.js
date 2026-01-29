import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { updateStoreStock } from '@/lib/storeStock';

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

  try {
    if (id) {
      const purchase = await prisma.purchase.findUnique({
        where: { pur_id: id },
        include: {
          customer: true,
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

      return NextResponse.json(purchase);
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
      // Find or create Cash Account
      let cashAccount = await prisma.customer.findFirst({
        where: { cus_name: 'Cash Account' }
      });
      
      console.log('🔍 Cash Account search result (pre-transaction):', {
        found: !!cashAccount,
        cashAccount: cashAccount ? { id: cashAccount.cus_id, name: cashAccount.cus_name } : null,
        credit_account_id_from_frontend: credit_account_id
      });
      
      if (!cashAccount) {
        // Get the Cash Account customer type
        const cashAccountType = await prisma.customerType.findFirst({
          where: { cus_type_title: 'Cash Account' }
        });
        
        if (cashAccountType) {
          cashAccount = await prisma.customer.create({
            data: {
              cus_name: 'Cash Account',
              cus_phone_no: '0000000000',
              cus_address: 'Main Office',
              cus_balance: 0,
              cus_type: cashAccountType.cus_type_id,
              cus_category: 1, // Default category
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
        discount: safeParseFloat(discount),
        net_total: safeParseFloat(net_total),
        payment: totalPaymentAmount,
        payment_type: actualPaymentType,
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
            await updateStoreStock(store_id, detail.pro_id, detail.qnty, 'increment', updated_by, tx);
          });
          await Promise.all(storeStockUpdatePromises);
        }
      }

      // Create comprehensive ledger entries for purchase
      // 1. Debit Entry: Supplier Account (Amount owed to supplier increases with net_total)
      let currentSupplierBalance = 0;
      if (cus_id) {
        const supplierData = await tx.customer.findUnique({
          where: { cus_id: cus_id },
          select: { cus_balance: true, cus_name: true }
        });
        currentSupplierBalance = parseFloat(supplierData?.cus_balance || 0);
        const supplierNewBalance = currentSupplierBalance + net_total;

        // Debit Supplier Account (Amount owed increases by invoice net total)
        await tx.ledger.create({
          data: {
            cus_id: cus_id,
            opening_balance: currentSupplierBalance,
            debit_amount: net_total,
            credit_amount: 0,
            closing_balance: supplierNewBalance,
            bill_no: newPurchase.pur_id.toString(),
            trnx_type: 'CASH', // Should this be PURCHASE? Using CASH for now to match existing
            details: `Purchase Invoice${invoice_number ? ` #${invoice_number}` : ''} from ${supplierData?.cus_name || 'Supplier'}${vehicle_no ? ` - Vehicle: ${vehicle_no}` : ''}`,
            payments: 0,
            updated_by: updated_by ? parseInt(updated_by) : null
          }
        });
        
        // Update running balance
        currentSupplierBalance = supplierNewBalance;
      }

      // 2. Payment Entries based on payment type
      // Use the already calculated values from validation
      
      console.log('🔍 Payment Debug Info:', {
        payment_type: actualPaymentType,
        credit_account_id,
        total_payment: totalPaymentAmount,
        cash_payment: cashPaymentAmount,
        bank_payment: bankPaymentAmount,
        cus_id
      });

      // Handle Cash Payment
      if (cashPaymentAmount > 0) {
        // Cash Payment: Debit Cash Account, Credit Supplier Account
        const cashAccountData = await tx.customer.findUnique({
          where: { cus_id: credit_account_id },
          select: { cus_balance: true, cus_name: true }
        });
        const cashCurrentBalance = parseFloat(cashAccountData?.cus_balance || 0);
        const cashNewBalance = cashCurrentBalance - cashPaymentAmount;

        // Debit Cash Account (Cash decreases when payment is made)
        await tx.ledger.create({
          data: {
            cus_id: credit_account_id,
            opening_balance: cashCurrentBalance,
            debit_amount: cashPaymentAmount, // Note: System uses Debit to decrease Cash Asset?
            credit_amount: 0,
            closing_balance: cashNewBalance,
            bill_no: newPurchase.pur_id.toString(),
            trnx_type: 'CASH',
            details: `Cash Payment for Purchase - ${vehicle_no ? `Vehicle: ${vehicle_no}` : 'Purchase Order'}`,
            payments: cashPaymentAmount,
            updated_by: updated_by ? parseInt(updated_by) : null
          }
        });
        
        // Update Cash Account Balance
        await tx.customer.update({
          where: { cus_id: credit_account_id },
          data: { cus_balance: cashNewBalance }
        });

        // Credit Supplier Account (Amount owed decreases when payment is made)
        if (cus_id) {
          const supplierData = await tx.customer.findUnique({
            where: { cus_id: cus_id },
            select: { cus_name: true }
          });
          // Use running balance
          const supplierNewBalance = currentSupplierBalance - cashPaymentAmount;

          await tx.ledger.create({
            data: {
              cus_id: cus_id,
              opening_balance: currentSupplierBalance,
              debit_amount: 0,
              credit_amount: cashPaymentAmount,
              closing_balance: supplierNewBalance,
              bill_no: newPurchase.pur_id.toString(),
              trnx_type: 'CASH',
              details: `Cash Payment to ${supplierData?.cus_name || 'Supplier'} - ${vehicle_no ? `Vehicle: ${vehicle_no}` : 'Purchase Order'}`,
              payments: cashPaymentAmount,
              updated_by: updated_by ? parseInt(updated_by) : null
            }
          });

          // Update running balance
          currentSupplierBalance = supplierNewBalance;
        }
      }

      // Handle Bank Payment
      if (bankPaymentAmount > 0) {
        // For bank payments, use the selected customer from the bank dropdown
        let bankAccountId = null;
        
        if (body.bank_account_id) {
          bankAccountId = body.bank_account_id;
          console.log('🏦 Using selected bank account customer ID:', bankAccountId);
        } else {
          console.error('❌ No bank account customer selected for bank payment');
          return errorResponse('Bank account customer is required for bank payment');
        }
        
        // Bank Payment: Debit Selected Bank Customer, Credit Supplier Account
        const bankAccountData = await tx.customer.findUnique({
          where: { cus_id: bankAccountId },
          select: { cus_balance: true, cus_name: true }
        });
        const bankCurrentBalance = parseFloat(bankAccountData?.cus_balance || 0);
        const bankNewBalance = bankCurrentBalance - bankPaymentAmount;

        // Debit Selected Bank Customer (Bank customer balance decreases when payment is made)
        await tx.ledger.create({
          data: {
            cus_id: bankAccountId,
            opening_balance: bankCurrentBalance,
            debit_amount: bankPaymentAmount,
            credit_amount: 0,
            closing_balance: bankNewBalance,
            bill_no: newPurchase.pur_id.toString(),
            trnx_type: 'BANK_TRANSFER',
            details: `Bank Payment to ${bankAccountData?.cus_name || 'Selected Bank Customer'} - ${vehicle_no ? `Vehicle: ${vehicle_no}` : 'Purchase Order'}`,
            payments: bankPaymentAmount,
            updated_by: updated_by ? parseInt(updated_by) : null
          }
        });
        
        // Update Bank Account Balance
        await tx.customer.update({
          where: { cus_id: bankAccountId },
          data: { cus_balance: bankNewBalance }
        });

        // Credit Supplier Account (Amount owed decreases when payment is made)
        if (cus_id) {
          const supplierData = await tx.customer.findUnique({
            where: { cus_id: cus_id },
            select: { cus_name: true }
          });
          // Use running balance
          const supplierNewBalance = currentSupplierBalance - bankPaymentAmount;

          await tx.ledger.create({
            data: {
              cus_id: cus_id,
              opening_balance: currentSupplierBalance,
              debit_amount: 0,
              credit_amount: bankPaymentAmount,
              closing_balance: supplierNewBalance,
              bill_no: newPurchase.pur_id.toString(),
              trnx_type: 'BANK_TRANSFER',
              details: `Bank Payment to ${supplierData?.cus_name || 'Supplier'} - ${vehicle_no ? `Vehicle: ${vehicle_no}` : 'Purchase Order'}`,
              payments: bankPaymentAmount,
              updated_by: updated_by ? parseInt(updated_by) : null
            }
          });

          // Update running balance
          currentSupplierBalance = supplierNewBalance;
        }
      }

      // 3. Final supplier balance update
      if (cus_id) {
        await tx.customer.update({
          where: { cus_id: cus_id },
          data: { cus_balance: currentSupplierBalance }
        });
        
        console.log('💰 Final supplier balance update:', {
          supplier_id: cus_id,
          final_balance: currentSupplierBalance
        });
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
      total_amount, 
      unloading_amount = 0, 
      fare_amount = 0, 
      transport_amount = 0,
      labour_amount = 0,
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
          discount: parseFloat(discount),
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

      // Supplier debit entry for purchase amount
      if (cus_id) {
        const supplierData = await tx.customer.findUnique({
          where: { cus_id: cus_id },
          select: { cus_balance: true, cus_name: true }
        });
        const supplierCurrentBalance = parseFloat(supplierData?.cus_balance || 0);
        const supplierNewBalance = supplierCurrentBalance + parseFloat(net_total || 0);

        await tx.ledger.create({
          data: {
            cus_id: cus_id,
            opening_balance: supplierCurrentBalance,
            debit_amount: parseFloat(net_total || 0),
            credit_amount: 0,
            closing_balance: supplierNewBalance,
            bill_no: id.toString(),
            trnx_type: 'CASH',
            details: `Purchase Update from ${supplierData?.cus_name || 'Supplier'} - ${vehicle_no ? `Vehicle: ${vehicle_no}` : 'Purchase Order'}`,
            payments: 0,
            updated_by: updated_by || existingPurchase.updated_by
          }
        });

        // Update supplier balance
        await tx.customer.update({
          where: { cus_id: cus_id },
          data: { cus_balance: supplierNewBalance }
        });
      }

      // Payments
      if (payment_type === 'CASH' && credit_account_id && parseFloat(payment || 0) > 0) {
        const cashAccountData = await tx.customer.findUnique({
          where: { cus_id: credit_account_id },
          select: { cus_balance: true, cus_name: true }
        });
        const cashCurrentBalance = parseFloat(cashAccountData?.cus_balance || 0);
        const cashNewBalance = cashCurrentBalance - parseFloat(payment || 0);

      await tx.ledger.create({
        data: {
            cus_id: credit_account_id,
            opening_balance: cashCurrentBalance,
            debit_amount: parseFloat(payment || 0),
          credit_amount: 0,
            closing_balance: cashNewBalance,
          bill_no: id.toString(),
            trnx_type: 'CASH',
            details: `Cash Payment for Purchase Update - ${vehicle_no ? `Vehicle: ${vehicle_no}` : 'Purchase Order'}`,
            payments: parseFloat(payment || 0),
          updated_by: updated_by || existingPurchase.updated_by
        }
      });

        if (cus_id) {
          const supplierData = await tx.customer.findUnique({
            where: { cus_id: cus_id },
            select: { cus_balance: true, cus_name: true }
          });
          const supplierCurrentBalance = parseFloat(supplierData?.cus_balance || 0);
          const supplierNewBalance = supplierCurrentBalance - parseFloat(payment || 0);

          await tx.ledger.create({
            data: {
              cus_id: cus_id,
              opening_balance: supplierCurrentBalance,
              debit_amount: 0,
              credit_amount: parseFloat(payment || 0),
              closing_balance: supplierNewBalance,
              bill_no: id.toString(),
              trnx_type: 'CASH',
              details: `Cash Payment to ${supplierData?.cus_name || 'Supplier'} - ${vehicle_no ? `Vehicle: ${vehicle_no}` : 'Purchase Order'}`,
              payments: parseFloat(payment || 0),
              updated_by: updated_by || existingPurchase.updated_by
            }
          });

          await tx.customer.update({ where: { cus_id: credit_account_id }, data: { cus_balance: cashNewBalance } });
          await tx.customer.update({ where: { cus_id: cus_id }, data: { cus_balance: supplierNewBalance } });
        }
      } else if (payment_type === 'BANK_TRANSFER' && credit_account_id && parseFloat(payment || 0) > 0) {
        const bankAccountData = await tx.customer.findUnique({ where: { cus_id: credit_account_id }, select: { cus_balance: true, cus_name: true } });
        const bankCurrentBalance = parseFloat(bankAccountData?.cus_balance || 0);
        const bankNewBalance = bankCurrentBalance - parseFloat(payment || 0);

        await tx.ledger.create({
          data: {
            cus_id: credit_account_id,
            opening_balance: bankCurrentBalance,
            debit_amount: parseFloat(payment || 0),
            credit_amount: 0,
            closing_balance: bankNewBalance,
            bill_no: id.toString(),
            trnx_type: 'BANK_TRANSFER',
            details: `Bank Payment for Purchase Update - ${vehicle_no ? `Vehicle: ${vehicle_no}` : 'Purchase Order'}`,
            payments: parseFloat(payment || 0),
            updated_by: updated_by || existingPurchase.updated_by
          }
        });

        if (cus_id) {
          const supplierData = await tx.customer.findUnique({ where: { cus_id: cus_id }, select: { cus_balance: true, cus_name: true } });
          const supplierCurrentBalance = parseFloat(supplierData?.cus_balance || 0);
          const supplierNewBalance = supplierCurrentBalance - parseFloat(payment || 0);

          await tx.ledger.create({
            data: {
              cus_id: cus_id,
              opening_balance: supplierCurrentBalance,
              debit_amount: 0,
              credit_amount: parseFloat(payment || 0),
              closing_balance: supplierNewBalance,
              bill_no: id.toString(),
              trnx_type: 'BANK_TRANSFER',
              details: `Bank Payment to ${supplierData?.cus_name || 'Supplier'} - ${vehicle_no ? `Vehicle: ${vehicle_no}` : 'Purchase Order'}`,
              payments: parseFloat(payment || 0),
              updated_by: updated_by || existingPurchase.updated_by
            }
          });

          await tx.customer.update({ where: { cus_id: credit_account_id }, data: { cus_balance: bankNewBalance } });
          await tx.customer.update({ where: { cus_id: cus_id }, data: { cus_balance: supplierNewBalance } });
        }
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
