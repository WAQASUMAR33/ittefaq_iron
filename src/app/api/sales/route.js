import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - Fetch all sales with related data
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      // Fetch single sale
      const sale = await prisma.sale.findUnique({
        where: { sale_id: id },
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
          updated_by_user: {
            select: {
              full_name: true,
              role: true
            }
          }
        }
      });

      if (!sale) {
        return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
      }

      return NextResponse.json(sale);
    } else {
      // Fetch all sales
      const sales = await prisma.sale.findMany({
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

      return NextResponse.json(sales);
    }
  } catch (error) {
    console.error('Error fetching sales:', error);
    return NextResponse.json({ error: 'Failed to fetch sales' }, { status: 500 });
  }
}

// POST - Create new sale
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      cus_id,
      total_amount,
      discount,
      payment,
      payment_type,
      bill_type,
      sale_details,
      updated_by
    } = body;

    // Validate required fields
    if (!cus_id || !total_amount || !payment || !sale_details || sale_details.length === 0) {
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

      // Create sale
      const sale = await tx.sale.create({
        data: {
          cus_id,
          total_amount: parseFloat(total_amount),
          discount: parseFloat(discount || 0),
          payment: parseFloat(payment),
          payment_type,
          bill_type: bill_type || 'BILL',
          updated_by
        }
      });

      // Create sale details
      const saleDetailPromises = sale_details.map(detail => 
        tx.saleDetail.create({
          data: {
            sale_id: sale.sale_id,
            pro_id: detail.pro_id,
            vehicle_no: detail.vehicle_no || null,
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

      await Promise.all(saleDetailPromises);

      // Update product stock quantities
      const stockUpdatePromises = sale_details.map(detail => 
        tx.product.update({
          where: { pro_id: detail.pro_id },
          data: {
            pro_stock_qnty: {
              decrement: parseInt(detail.qnty)
            }
          }
        })
      );

      await Promise.all(stockUpdatePromises);

      // Create ledger entries
      // Debit entry for sale
      await tx.ledger.create({
        data: {
          cus_id,
          opening_balance: customer.cus_balance,
          debit_amount: netTotal,
          credit_amount: 0,
          closing_balance: customer.cus_balance + netTotal,
          bill_no: sale.sale_id,
          trnx_type: 'CASH',
          details: `Sale - ${bill_type || 'BILL'}`,
          payments: 0,
          updated_by
        }
      });

      // Credit entry for payment (if payment > 0)
      if (parseFloat(payment) > 0) {
        await tx.ledger.create({
          data: {
            cus_id,
            opening_balance: customer.cus_balance + netTotal,
            debit_amount: 0,
            credit_amount: parseFloat(payment),
            closing_balance: customer.cus_balance + netTotal - parseFloat(payment),
            bill_no: sale.sale_id,
            trnx_type: payment_type,
            details: `Payment - ${bill_type || 'BILL'}`,
            payments: parseFloat(payment),
            updated_by
          }
        });
      }

      // Update customer balance
      await tx.customer.update({
        where: { cus_id },
        data: {
          cus_balance: customer.cus_balance + netTotal - parseFloat(payment)
        }
      });

      return sale;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating sale:', error);
    return NextResponse.json({ error: 'Failed to create sale' }, { status: 500 });
  }
}

// PUT - Update sale
export async function PUT(request) {
  try {
    const body = await request.json();
    const {
      id,
      cus_id,
      total_amount,
      discount,
      payment,
      payment_type,
      bill_type,
      sale_details,
      updated_by
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Sale ID is required' }, { status: 400 });
    }

    // Calculate net total
    const netTotal = parseFloat(total_amount) - parseFloat(discount || 0);

    // Use transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Get existing sale
      const existingSale = await tx.sale.findUnique({
        where: { sale_id: id },
        include: {
          sale_details: true
        }
      });

      if (!existingSale) {
        throw new Error('Sale not found');
      }

      // Get customer's current balance
      const customer = await tx.customer.findUnique({
        where: { cus_id }
      });

      if (!customer) {
        throw new Error('Customer not found');
      }

      // Delete existing sale details
      await tx.saleDetail.deleteMany({
        where: { sale_id: id }
      });

      // Delete existing ledger entries for this sale
      await tx.ledger.deleteMany({
        where: { bill_no: id }
      });

      // Restore product stock quantities from old sale details
      const stockRestorePromises = existingSale.sale_details.map(detail => 
        tx.product.update({
          where: { pro_id: detail.pro_id },
          data: {
            pro_stock_qnty: {
              increment: detail.qnty
            }
          }
        })
      );

      await Promise.all(stockRestorePromises);

      // Update sale
      const sale = await tx.sale.update({
        where: { sale_id: id },
        data: {
          cus_id,
          total_amount: parseFloat(total_amount),
          discount: parseFloat(discount || 0),
          payment: parseFloat(payment),
          payment_type,
          bill_type: bill_type || 'BILL',
          updated_by
        }
      });

      // Create new sale details
      const saleDetailPromises = sale_details.map(detail => 
        tx.saleDetail.create({
          data: {
            sale_id: sale.sale_id,
            pro_id: detail.pro_id,
            vehicle_no: detail.vehicle_no || null,
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

      await Promise.all(saleDetailPromises);

      // Update product stock quantities
      const stockUpdatePromises = sale_details.map(detail => 
        tx.product.update({
          where: { pro_id: detail.pro_id },
          data: {
            pro_stock_qnty: {
              decrement: parseInt(detail.qnty)
            }
          }
        })
      );

      await Promise.all(stockUpdatePromises);

      // Create new ledger entries
      // Debit entry for sale
      await tx.ledger.create({
        data: {
          cus_id,
          opening_balance: customer.cus_balance,
          debit_amount: netTotal,
          credit_amount: 0,
          closing_balance: customer.cus_balance + netTotal,
          bill_no: sale.sale_id,
          trnx_type: 'CASH',
          details: `Sale - ${bill_type || 'BILL'}`,
          payments: 0,
          updated_by
        }
      });

      // Credit entry for payment (if payment > 0)
      if (parseFloat(payment) > 0) {
        await tx.ledger.create({
          data: {
            cus_id,
            opening_balance: customer.cus_balance + netTotal,
            debit_amount: 0,
            credit_amount: parseFloat(payment),
            closing_balance: customer.cus_balance + netTotal - parseFloat(payment),
            bill_no: sale.sale_id,
            trnx_type: payment_type,
            details: `Payment - ${bill_type || 'BILL'}`,
            payments: parseFloat(payment),
            updated_by
          }
        });
      }

      // Update customer balance
      await tx.customer.update({
        where: { cus_id },
        data: {
          cus_balance: customer.cus_balance + netTotal - parseFloat(payment)
        }
      });

      return sale;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating sale:', error);
    return NextResponse.json({ error: 'Failed to update sale' }, { status: 500 });
  }
}

// DELETE - Delete sale
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Sale ID is required' }, { status: 400 });
    }

    // Use transaction to ensure data consistency
    await prisma.$transaction(async (tx) => {
      // Get existing sale with details
      const existingSale = await tx.sale.findUnique({
        where: { sale_id: id },
        include: {
          sale_details: true
        }
      });

      if (!existingSale) {
        throw new Error('Sale not found');
      }

      // Restore product stock quantities
      const stockRestorePromises = existingSale.sale_details.map(detail => 
        tx.product.update({
          where: { pro_id: detail.pro_id },
          data: {
            pro_stock_qnty: {
              increment: detail.qnty
            }
          }
        })
      );

      await Promise.all(stockRestorePromises);

      // Delete ledger entries for this sale
      await tx.ledger.deleteMany({
        where: { bill_no: id }
      });

      // Delete sale details (cascade should handle this, but being explicit)
      await tx.saleDetail.deleteMany({
        where: { sale_id: id }
      });

      // Delete sale
      await tx.sale.delete({
        where: { sale_id: id }
      });
    });

    return NextResponse.json({ message: 'Sale deleted successfully' });
  } catch (error) {
    console.error('Error deleting sale:', error);
    return NextResponse.json({ error: 'Failed to delete sale' }, { status: 500 });
  }
}
