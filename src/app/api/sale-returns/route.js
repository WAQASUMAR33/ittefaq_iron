import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
      reason,
      reference,
      return_details,
      updated_by
    } = body;

    // Validate required fields
    if (!sale_id || !cus_id || !total_amount || !payment || !return_details || return_details.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Calculate net total
    const netTotal = parseFloat(total_amount) - parseFloat(discount || 0);

    // Use transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
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
          total_amount: parseFloat(total_amount),
          discount: parseFloat(discount || 0),
          payment: parseFloat(payment),
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

      // Restore product stock quantities
      const stockRestorePromises = return_details.map(detail => 
        tx.product.update({
          where: { pro_id: detail.pro_id },
          data: {
            pro_stock_qnty: {
              increment: parseInt(detail.qnty)
            }
          }
        })
      );

      await Promise.all(stockRestorePromises);

      // Create ledger entries (reverse of sale)
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
          details: `Sale Return - ${reason || 'Return'}`,
          payments: 0,
          updated_by
        }
      });

      // Debit entry for payment refund (if payment > 0)
      if (parseFloat(payment) > 0) {
        await tx.ledger.create({
          data: {
            cus_id,
            opening_balance: customer.cus_balance - netTotal,
            debit_amount: parseFloat(payment),
            credit_amount: 0,
            closing_balance: customer.cus_balance - netTotal + parseFloat(payment),
            bill_no: saleReturn.return_id,
            trnx_type: payment_type,
            details: `Refund - Sale Return`,
            payments: parseFloat(payment),
            updated_by
          }
        });
      }

      // Update customer balance (reduce balance for return)
      await tx.customer.update({
        where: { cus_id },
        data: {
          cus_balance: customer.cus_balance - netTotal + parseFloat(payment)
        }
      });

      // If loader is involved, subtract shipping amount from loader balance
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

      // Reverse product stock quantities
      const stockReversePromises = existingReturn.return_details.map(detail => 
        tx.product.update({
          where: { pro_id: detail.pro_id },
          data: {
            pro_stock_qnty: {
              decrement: detail.qnty
            }
          }
        })
      );

      await Promise.all(stockReversePromises);

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

