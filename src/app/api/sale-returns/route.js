import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { updateStoreStock } from '@/lib/storeStock';

const prisma = new PrismaClient();

// Helper: get special accounts (Cash, Bank, Sundry Debtors/Creditors)
async function getSpecialAccounts(tx) {
  const specialAccounts = await tx.customer.findMany({
    where: {
      cus_name: {
        in: ['Cash Account', 'Bank Account', 'Sundry Creditors', 'Sundry Debtors']
      }
    }
  });

  const accounts = {};
  specialAccounts.forEach(account => {
    if (account.cus_name === 'Cash Account') accounts.cash = account;
    if (account.cus_name === 'Bank Account') accounts.bank = account;
    if (account.cus_name === 'Sundry Creditors') accounts.sundryCreditors = account;
    if (account.cus_name === 'Sundry Debtors') accounts.sundryDebtors = account;
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
      debit_account_id,
      credit_account_id,
      loader_id,
      shipping_amount,
      bill_type,
      reason,
      reference,
      return_details,
      updated_by
    } = body;

    // Validate required fields
    if (!sale_id || !cus_id || !total_amount || !payment || !return_details || return_details.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Calculate totals from return_details for safety and consistency
    const computedTotal = Array.isArray(return_details)
      ? return_details.reduce((sum, d) => sum + (parseFloat(d.total_amount) || 0), 0)
      : 0;
    const netTotal = computedTotal - parseFloat(discount || 0);

    // Use transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Get the original sale to get store_id and verify bill_type
      const sale = await tx.sale.findUnique({
        where: { sale_id },
        include: { sale_details: true }
      });

      if (!sale) {
        throw new Error('Sale not found');
      }

      // Use bill_type from sale if not provided in body
      const finalBillType = bill_type || sale.bill_type || 'BILL';
      const isQuotationReturn = finalBillType === 'QUOTATION';

      // Validate each return detail does not exceed sold quantity
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
          sale_id,
          cus_id,
          total_amount: computedTotal,
          discount: parseFloat(discount || 0),
          payment: parseFloat(payment || 0),
          payment_type,
          debit_account_id: debit_account_id || null,
          credit_account_id: credit_account_id || null,
          loader_id: loader_id || null,
          shipping_amount: parseFloat(shipping_amount || 0),
          reason: reason || null,
          reference: reference || null,
          updated_by
        }
      });

      // Create return details
      const returnDetailPromises = return_details.map(detail => 
        tx.saleReturnDetail.create({
          data: {
            return_id: saleReturn.return_id,
            pro_id: detail.pro_id,
            qnty: parseInt(detail.qnty),
            unit: detail.unit,
            unit_rate: parseFloat(detail.unit_rate),
            total_amount: parseFloat(detail.total_amount),
            discount: parseFloat(detail.discount || 0),
            net_total: parseFloat(detail.total_amount) - parseFloat(detail.discount || 0),
            cus_id,
            updated_by
          }
        })
      );

      await Promise.all(returnDetailPromises);

      // Skip financial transactions for quotation returns
      if (!isQuotationReturn) {
        // Restore store stock quantities (skip for quotations)
        // Use detail.store_id if available (for manual items), otherwise sale.store_id
        const storeStockRestorePromises = return_details.map(async detail => {
          const targetStoreId = detail.store_id || sale.store_id;
          if (targetStoreId) {
            await updateStoreStock(targetStoreId, detail.pro_id, parseInt(detail.qnty), 'increment', updated_by);
          }
        });

        await Promise.all(storeStockRestorePromises);

        // Create ledger entries (reverse of sale) - Skip for quotations
        // Credit entry for return (reduce customer debt)
        await tx.ledger.create({
          data: {
            cus_id,
            opening_balance: customer.cus_balance,
            debit_amount: 0,
            credit_amount: netTotal,
            closing_balance: customer.cus_balance - netTotal,
            bill_no: saleReturn.return_id,
            trnx_type: 'CASH',
            details: `Sale Return - ${finalBillType} - ${reason || 'Return'}`,
            payments: 0,
            updated_by
          }
        });

        // Handle payment refund ledger for cash/bank (if payment > 0)
        const refundAmount = parseFloat(payment || 0);
        if (refundAmount > 0) {
          // 1) Customer side: optional debit to reflect refund paid
          await tx.ledger.create({
            data: {
              cus_id,
              opening_balance: customer.cus_balance - netTotal,
              debit_amount: refundAmount,
              credit_amount: 0,
              closing_balance: customer.cus_balance - netTotal + refundAmount,
              bill_no: saleReturn.return_id,
              trnx_type: payment_type,
              details: `Refund - Sale Return ${finalBillType}`,
              payments: refundAmount,
              updated_by
            }
          });

          // 2) Cash/Bank account side: credit (cash/bank goes down)
          const specialAccounts = await getSpecialAccounts(tx);
          const refundAccount = payment_type === 'CASH' ? specialAccounts.cash : specialAccounts.bank;
          if (refundAccount) {
            await tx.ledger.create({
              data: {
                cus_id: refundAccount.cus_id,
                opening_balance: refundAccount.cus_balance,
                debit_amount: 0,
                credit_amount: refundAmount,
                closing_balance: refundAccount.cus_balance - refundAmount,
                bill_no: saleReturn.return_id,
                trnx_type: payment_type,
                details: `Refund Paid - Sale Return ${finalBillType} - ${payment_type} Account (Credit)`,
                payments: refundAmount,
                updated_by
              }
            });
          }
        }

        // Update customer balance (reduce balance for return) - Skip for quotations
        await tx.customer.update({
          where: { cus_id },
          data: {
            cus_balance: customer.cus_balance - netTotal + (parseFloat(payment || 0))
          }
        });

        // If loader is involved, subtract shipping amount from loader balance - Skip for quotations
        if (loader_id && parseFloat(shipping_amount || 0) > 0) {
          const loader = await tx.loader.findUnique({
            where: { loader_id }
          });

          if (loader) {
            await tx.loader.update({
              where: { loader_id },
              data: {
                loader_balance: loader.loader_balance - parseFloat(shipping_amount)
              }
            });
          }
        }

        // Update cash/bank balances to reflect refund outflow
        if (parseFloat(payment || 0) > 0) {
          const specialAccounts = await getSpecialAccounts(tx);
          const refundAccount = payment_type === 'CASH' ? specialAccounts.cash : specialAccounts.bank;
          if (refundAccount) {
            await tx.customer.update({
              where: { cus_id: refundAccount.cus_id },
              data: {
                cus_balance: refundAccount.cus_balance - parseFloat(payment)
              }
            });
          }
        }
      } // End of if (!isQuotationReturn)

      return saleReturn;
    }, {
      timeout: 15000 // 15 seconds timeout for complex transactions
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
          return_details: true
        }
      });

      if (!existingReturn) {
        throw new Error('Sale return not found');
      }

      // Reverse store stock quantities
      const storeStockReversePromises = existingReturn.return_details.map(async detail => {
        await updateStoreStock(existingReturn.sale.store_id, detail.pro_id, detail.qnty, 'decrement', updated_by);
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

