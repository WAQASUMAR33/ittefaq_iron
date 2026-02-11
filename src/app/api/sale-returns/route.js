import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { updateStoreStock } from '@/lib/storeStock';
import { createLedgerEntry } from '@/lib/ledger-helper';

const prisma = new PrismaClient();

// Helper: get special accounts (Cash, Bank, Sundry Debtors/Creditors)
async function getSpecialAccounts(tx) {
  // Find special accounts by category, not by exact name
  // This is more flexible and works regardless of the account's specific name
  const categories = await tx.customerCategory.findMany({
    where: {
      cus_cat_title: {
        in: ['Cash Account', 'Bank Account', 'Sundry Creditors', 'Sundry Debtors']
      }
    }
  });

  const categoryMap = {};
  categories.forEach(cat => {
    categoryMap[cat.cus_cat_title] = cat.cus_cat_id;
  });

  // Now find accounts using these category IDs
  const specialAccounts = await tx.customer.findMany({
    where: {
      cus_category: {
        in: Object.values(categoryMap)
      }
    }
  });

  const accounts = {};
  specialAccounts.forEach(account => {
    const categoryTitle = account.cus_category === categoryMap['Cash Account'] ? 'Cash Account' :
                        account.cus_category === categoryMap['Bank Account'] ? 'Bank Account' :
                        account.cus_category === categoryMap['Sundry Creditors'] ? 'Sundry Creditors' :
                        account.cus_category === categoryMap['Sundry Debtors'] ? 'Sundry Debtors' : null;
    
    if (categoryTitle === 'Cash Account') accounts.cash = account;
    if (categoryTitle === 'Bank Account') accounts.bank = account;
    if (categoryTitle === 'Sundry Creditors') accounts.sundryCreditors = account;
    if (categoryTitle === 'Sundry Debtors') accounts.sundryDebtors = account;
  });

  console.log('✅ Special accounts found:', {
    cash: accounts.cash ? `${accounts.cash.cus_name} (ID: ${accounts.cash.cus_id})` : 'Not found',
    bank: accounts.bank ? `${accounts.bank.cus_name} (ID: ${accounts.bank.cus_id})` : 'Not found',
    sundryCreditors: accounts.sundryCreditors ? `${accounts.sundryCreditors.cus_name} (ID: ${accounts.sundryCreditors.cus_id})` : 'Not found',
    sundryDebtors: accounts.sundryDebtors ? `${accounts.sundryDebtors.cus_name} (ID: ${accounts.sundryDebtors.cus_id})` : 'Not found'
  });

  return accounts;
}

// GET - Fetch all sale returns with related data
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id') ? parseInt(searchParams.get('id')) : null;

    if (id) {
      // Fetch single sale return
      const saleReturn = await prisma.saleReturn.findUnique({
        where: { return_id: id },
        include: {
          sale: true,
          customer: {
            include: {
              customer_category: true
            }
          },
          return_details: {
            include: {
              product: {
                include: {
                  category: true,
                  sub_category: true
                }
              }
            }
          },
          debit_account: {
            select: {
              cus_id: true,
              cus_name: true,
              cus_phone_no: true
            }
          },
          credit_account: {
            select: {
              cus_id: true,
              cus_name: true,
              cus_phone_no: true
            }
          },
          loader: {
            select: {
              loader_id: true,
              loader_name: true,
              loader_number: true,
              loader_phone: true,
              loader_balance: true
            }
          },
          updated_by_user: {
            select: {
              full_name: true,
              role: true
            }
          }
        }
      });

      if (!saleReturn) {
        return NextResponse.json({ error: 'Sale return not found' }, { status: 404 });
      }

      return NextResponse.json(saleReturn);
    } else {
      // Fetch all sale returns
      const saleReturns = await prisma.saleReturn.findMany({
        include: {
          sale: true,
          customer: {
            include: {
              customer_category: true
            }
          },
          return_details: {
            include: {
              product: {
                include: {
                  category: true,
                  sub_category: true
                }
              }
            }
          },
          debit_account: {
            select: {
              cus_id: true,
              cus_name: true,
              cus_phone_no: true
            }
          },
          credit_account: {
            select: {
              cus_id: true,
              cus_name: true,
              cus_phone_no: true
            }
          },
          loader: {
            select: {
              loader_id: true,
              loader_name: true,
              loader_number: true,
              loader_phone: true,
              loader_balance: true
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

      return NextResponse.json(saleReturns);
    }
  } catch (error) {
    console.error('Error fetching sale returns:', error);
    return NextResponse.json({ error: 'Failed to fetch sale returns' }, { status: 500 });
  }
}

// POST - Create new sale return
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      sale_id,
      cus_id,
      total_amount,
      discount,
      payment,
      payment_type,
      cash_return,
      bank_return,
      bank_account_id,
      debit_account_id,
      credit_account_id,
      loader_id,
      labour_charges,
      shipping_amount,
      bill_type,
      reason,
      reference,
      return_details,
      manual_sale_inv,
      updated_by
    } = body;

    // Validate required fields
    if (!cus_id || !total_amount || !payment || !return_details || return_details.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Calculate totals from return_details for safety and consistency
    const computedTotal = Array.isArray(return_details)
      ? return_details.reduce((sum, d) => sum + (parseFloat(d.total_amount) || 0), 0)
      : 0;
    const discountAmount = parseFloat(discount || 0);
    const labourChargesAmount = parseFloat(labour_charges || 0);
    const shippingAmount = parseFloat(shipping_amount || 0);

    // Grand Total = Product Total - Discount + Labour + Shipping
    const grandTotal = computedTotal - discountAmount + labourChargesAmount + shippingAmount;
    const refundAmount = parseFloat(payment || 0); // Amount being refunded to customer
    const cashRefund = parseFloat(cash_return || 0);
    const bankRefund = parseFloat(bank_return || 0);

    console.log('📥 Sale Return Request Received:', {
      sale_id,
      cus_id,
      payment,
      payment_type,
      cash_return,
      bank_return,
      bank_account_id,
      refundAmount,
      cashRefund,
      bankRefund,
      grandTotal
    });

    // Use transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Get the original sale to get store_id and verify bill_type
      let sale = null;
      if (sale_id) {
        sale = await tx.sale.findUnique({
          where: { sale_id },
          include: { sale_details: true }
        });

        if (!sale) {
          throw new Error('Sale not found');
        }
      }

      // Use bill_type from sale if not provided in body
      const finalBillType = bill_type || sale?.bill_type || 'BILL';
      const isQuotationReturn = finalBillType === 'QUOTATION';

      // Validate each return detail if sale exists
      if (sale) {
        const qtyByProduct = new Map();
        for (const d of sale.sale_details) {
          qtyByProduct.set(d.pro_id, (qtyByProduct.get(d.pro_id) || 0) + Number(d.qnty || 0));
        }
        for (const rd of return_details) {
          const soldQty = qtyByProduct.get(rd.pro_id) || 0;
          const returnQty = parseInt(rd.qnty) || 0;
          if (returnQty <= 0) {
            throw new Error(`Invalid return quantity for product ${rd.pro_id}`);
          }
          if (returnQty > soldQty) {
            throw new Error(`Return qty (${returnQty}) exceeds sold qty (${soldQty}) for product ${rd.pro_id}`);
          }
        }
      }

      // Get customer's current balance
      const customer = await tx.customer.findUnique({
        where: { cus_id }
      });

      if (!customer) {
        throw new Error('Customer not found');
      }

      // Create sale return
      const saleReturn = await tx.saleReturn.create({
        data: {
          sale_id: sale_id || null,
          cus_id,
          total_amount: computedTotal,
          discount: parseFloat(discount || 0),
          payment: parseFloat(payment || 0),
          payment_type,
          debit_account_id: debit_account_id || null,
          credit_account_id: credit_account_id || null,
          loader_id: loader_id || null,
          labour_charges: parseFloat(labour_charges || 0),
          shipping_amount: parseFloat(shipping_amount || 0),
          reason: reason || null,
          reference: reference || null,
          manual_sale_inv: manual_sale_inv || null,
          updated_by
        }
      });

      // Create return details
      const returnDetailPromises = return_details.map(async detail => {
        // Get unit from original sale details or default
        let unit = 'PCS';
        if (sale) {
          const originalDetail = sale.sale_details.find(sd => sd.pro_id === detail.pro_id);
          if (originalDetail) unit = originalDetail.unit;
        } else if (detail.unit) {
          unit = detail.unit;
        }

        return tx.saleReturnDetail.create({
          data: {
            return_id: saleReturn.return_id,
            pro_id: detail.pro_id,
            qnty: parseInt(detail.qnty),
            unit: unit,
            unit_rate: parseFloat(detail.unit_rate),
            total_amount: parseFloat(detail.total_amount),
            discount: parseFloat(detail.discount || 0),
            net_total: parseFloat(detail.total_amount) - parseFloat(detail.discount || 0),
            cus_id,
            store_id: detail.store_id || sale?.store_id || null,
            updated_by
          }
        });
      });

      await Promise.all(returnDetailPromises);

      // Skip financial transactions for quotation returns
      if (!isQuotationReturn) {
        // Restore store stock quantities (skip for quotations)
        // Use detail.store_id if available (for manual items), otherwise sale.store_id
        const storeStockRestorePromises = return_details.map(async detail => {
          const targetStoreId = detail.store_id || sale?.store_id;
          if (targetStoreId) {
            await updateStoreStock(targetStoreId, detail.pro_id, parseInt(detail.qnty), 'increment', updated_by);
          }
        });

        await Promise.all(storeStockRestorePromises);

        // Create ledger entries for Sale Return
        // Entry 1: Main return entry - Customer side (credit because return reduces debt)
        await tx.ledger.create({
          data: {
            cus_id,
            opening_balance: customer.cus_balance,
            debit_amount: 0,
            credit_amount: grandTotal, // Grand total with all charges
            closing_balance: customer.cus_balance - grandTotal,
            bill_no: saleReturn.return_id.toString(),
            trnx_type: 'SALE_RETURN',
            details: `Sale Return - Product: ${computedTotal}, Labour: ${labourChargesAmount}, Delivery: ${shippingAmount}, Discount: -${discountAmount}, Grand Total: ${grandTotal}`,
            payments: 0,
            updated_by
          }
        });

        // Entry 2: Refund entries - Handle CASH and BANK separately if both exist
        const specialAccounts = await getSpecialAccounts(tx);

        console.log('🔄 Refund Processing:', {
          cashRefund,
          bankRefund,
          totalRefund: refundAmount,
          bank_account_id,
          specialAccounts: {
            cash: specialAccounts.cash?.cus_name,
            bank: specialAccounts.bank?.cus_name
          }
        });

        // SEQUENCE: CASH Account → CASH Customer → BANK Account → BANK Customer

        // Entry 2a: CASH Account Deduction if cash_return > 0
        if (cashRefund > 0) {
          const cashAccount = specialAccounts.cash;
          if (cashAccount) {
            // Ledger entry: Cash account credits (money going out)
            await tx.ledger.create({
              data: {
                cus_id: cashAccount.cus_id,
                opening_balance: cashAccount.cus_balance,
                debit_amount: 0,
                credit_amount: cashRefund, // Cash decreases (credit)
                closing_balance: cashAccount.cus_balance - cashRefund,
                bill_no: saleReturn.return_id.toString(),
                trnx_type: 'CASH_PAYMENT',
                details: `Refund Paid Out (CASH) - Sale Return #${saleReturn.return_id} - Amount: ${cashRefund}`,
                payments: cashRefund,
                updated_by
              }
            });

            console.log('✅ CASH ACCOUNT: Refund paid out:', { cashRefund, account: cashAccount.cus_name });

            // Update cash account balance - DECREASE
            await tx.customer.update({
              where: { cus_id: cashAccount.cus_id },
              data: {
                cus_balance: cashAccount.cus_balance - cashRefund
              }
            });

            // Entry 2b: CUSTOMER Balance Update after CASH Refund (immediately after cash account)
            const customerAfterCash = customer.cus_balance - grandTotal + cashRefund;
            await tx.ledger.create({
              data: {
                cus_id,
                opening_balance: customer.cus_balance - grandTotal, // Balance after main return
                debit_amount: cashRefund, // Cash payment received/credited to customer
                credit_amount: 0,
                closing_balance: customerAfterCash,
                bill_no: saleReturn.return_id.toString(),
                trnx_type: 'CASH_PAYMENT',
                details: `Customer Balance Update - CASH Refund Received: ${cashRefund} for Sale Return #${saleReturn.return_id}`,
                payments: 0,
                updated_by
              }
            });
            console.log('✅ CUSTOMER: Balance updated after CASH refund:', { customerAfterCash, cashRefund });
          }
        }

        // Entry 3: BANK Account Deduction if bank_return > 0
        if (bankRefund > 0) {
          // If bank_account_id provided from frontend, use it directly (priority)
          // Otherwise try to find bank account from special accounts
          let bankAccount = null;

          if (bank_account_id) {
            console.log('🔍 Looking up bank account by ID:', bank_account_id);
            bankAccount = await tx.customer.findUnique({
              where: { cus_id: parseInt(bank_account_id) }
            });
            if (bankAccount) {
              console.log('✅ Found bank account by ID:', { id: bank_account_id, name: bankAccount.cus_name });
            }
          }

          // Fallback to special accounts if not found by ID
          if (!bankAccount) {
            console.log('📍 Falling back to special accounts for bank account');
            bankAccount = specialAccounts.bank;
          }

          if (bankAccount) {
            // Ledger entry: Bank account credits (money going out)
            await tx.ledger.create({
              data: {
                cus_id: bankAccount.cus_id,
                opening_balance: bankAccount.cus_balance,
                debit_amount: 0,
                credit_amount: bankRefund, // Bank decreases (credit)
                closing_balance: bankAccount.cus_balance - bankRefund,
                bill_no: saleReturn.return_id.toString(),
                trnx_type: 'BANK_PAYMENT',
                details: `Refund Paid Out (BANK) - Sale Return #${saleReturn.return_id} - Amount: ${bankRefund}`,
                payments: bankRefund,
                updated_by
              }
            });

            console.log('✅ BANK ACCOUNT: Refund paid out:', { bankRefund, account: bankAccount.cus_name, cus_id: bankAccount.cus_id });

            // Update bank account balance - DECREASE
            await tx.customer.update({
              where: { cus_id: bankAccount.cus_id },
              data: {
                cus_balance: bankAccount.cus_balance - bankRefund
              }
            });

            // Entry 3b: CUSTOMER Balance Update after BANK Refund (immediately after bank account)
            const customerAfterBank = customer.cus_balance - grandTotal + cashRefund + bankRefund;
            await tx.ledger.create({
              data: {
                cus_id,
                opening_balance: customer.cus_balance - grandTotal + cashRefund, // Balance after cash refund
                debit_amount: bankRefund, // Bank payment received/credited to customer
                credit_amount: 0,
                closing_balance: customerAfterBank,
                bill_no: saleReturn.return_id.toString(),
                trnx_type: 'BANK_PAYMENT',
                details: `Customer Balance Update - BANK Refund Received: ${bankRefund} for Sale Return #${saleReturn.return_id}`,
                payments: 0,
                updated_by
              }
            });
            console.log('✅ CUSTOMER: Balance updated after BANK refund:', { customerAfterBank, bankRefund });
          } else {
            console.log('❌ Bank account not found - checked both bank_account_id and specialAccounts:', { bank_account_id, specialAccounts });
          }
        } else {
          console.log('⚠️ Bank refund is 0:', { bankRefund });
        }

        // Update customer balance - decrease by grand total, but add back the refund amount
        // Net effect: customer owes less (return reduces debt) + refund paid increases their receivable
        await tx.customer.update({
          where: { cus_id },
          data: {
            cus_balance: customer.cus_balance - grandTotal + refundAmount
          }
        });

        // If loader is involved, update loader balance for shipping
        if (loader_id && shippingAmount > 0) {
          const loader = await tx.loader.findUnique({
            where: { loader_id }
          });

          if (loader) {
            await tx.loader.update({
              where: { loader_id },
              data: {
                loader_balance: loader.loader_balance - shippingAmount
              }
            });
          }
        }
      } // End of if (!isQuotationReturn)

      return saleReturn;
    }, {
      timeout: 60000 // 60 seconds timeout for complex transactions with multiple operations
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating sale return:', error);
    return NextResponse.json({ error: 'Failed to create sale return: ' + error.message }, { status: 500 });
  }
}

// DELETE - Delete sale return
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id') ? parseInt(searchParams.get('id')) : null;

    if (!id) {
      return NextResponse.json({ error: 'Sale return ID is required' }, { status: 400 });
    }

    // Use transaction to ensure data consistency
    await prisma.$transaction(async (tx) => {
      // Get existing sale return with details
      const existingReturn = await tx.saleReturn.findUnique({
        where: { return_id: id },
        include: {
          return_details: true,
          sale: true
        }
      });

      if (!existingReturn) {
        throw new Error('Sale return not found');
      }

      // Reverse store stock quantities
      const storeStockReversePromises = existingReturn.return_details.map(async detail => {
        const targetStoreId = detail.store_id || existingReturn.sale?.store_id;
        if (targetStoreId) {
          await updateStoreStock(targetStoreId, detail.pro_id, detail.qnty, 'decrement', 1);
        }
      });

      await Promise.all(storeStockReversePromises);

      // If loader was involved, add back shipping amount to loader balance
      if (existingReturn.loader_id && parseFloat(existingReturn.shipping_amount || 0) > 0) {
        const loader = await tx.loader.findUnique({
          where: { loader_id: existingReturn.loader_id }
        });

        if (loader) {
          await tx.loader.update({
            where: { loader_id: existingReturn.loader_id },
            data: {
              loader_balance: loader.loader_balance + parseFloat(existingReturn.shipping_amount)
            }
          });
        }
      }

      // Delete ledger entries for this return
      await tx.ledger.deleteMany({
        where: { bill_no: id }
      });

      // Delete return details
      await tx.saleReturnDetail.deleteMany({
        where: { return_id: id }
      });

      // Delete sale return
      await tx.saleReturn.delete({
        where: { return_id: id }
      });
    }, {
      timeout: 15000 // 15 seconds timeout for complex transactions
    });

    return NextResponse.json({ message: 'Sale return deleted successfully' });
  } catch (error) {
    console.error('Error deleting sale return:', error);
    return NextResponse.json({ error: 'Failed to delete sale return: ' + error.message }, { status: 500 });
  }
}

