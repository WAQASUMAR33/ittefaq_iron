import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { updateStoreStock } from '../../../lib/storeStock';

// GET - Fetch all purchase returns
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      // Fetch single purchase return
      const purchaseReturn = await prisma.purchaseReturn.findUnique({
        where: { id: parseInt(id) },
        include: {
          purchase: {
            include: {
              customer: true,
              store: true,
              purchase_details: {
                include: {
                  product: true
                }
              }
            }
          },
          return_details: {
            include: {
              product: true
            }
          }
        }
      });

      if (!purchaseReturn) {
        return NextResponse.json({ error: 'Purchase return not found' }, { status: 404 });
      }

      return NextResponse.json(purchaseReturn);
    } else {
      // Fetch all purchase returns
      const purchaseReturns = await prisma.purchaseReturn.findMany({
        include: {
          purchase: {
            include: {
              customer: true,
              store: true
            }
          },
          return_details: {
            include: {
              product: true
            }
          }
        },
        orderBy: {
          created_at: 'desc'
        }
      });

      return NextResponse.json(purchaseReturns);
    }
  } catch (error) {
    console.error('Error fetching purchase returns:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new purchase return
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      purchase_id,
      return_date,
      return_reason,
      return_details,
      total_return_amount,
      notes
    } = body;

    console.log('Creating purchase return:', body);

    // Validate required fields
    if (!purchase_id || !return_date || !return_reason || !return_details || return_details.length === 0) {
      return NextResponse.json({ 
        error: 'Missing required fields: purchase_id, return_date, return_reason, and return_details are required' 
      }, { status: 400 });
    }

    // Validate return quantities don't exceed original quantities
    const purchase = await prisma.purchase.findUnique({
      where: { pur_id: parseInt(purchase_id) },
      include: {
        purchase_details: true
      }
    });

    if (!purchase) {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
    }

    // Check return quantities
    for (const returnDetail of return_details) {
      const originalDetail = purchase.purchase_details.find(pd => pd.pro_id === returnDetail.pro_id);
      if (!originalDetail) {
        return NextResponse.json({ 
          error: `Product ${returnDetail.pro_id} not found in original purchase` 
        }, { status: 400 });
      }
      
      if (returnDetail.return_quantity > originalDetail.qnty) {
        return NextResponse.json({ 
          error: `Return quantity for product ${returnDetail.pro_id} exceeds original quantity` 
        }, { status: 400 });
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      // Create purchase return
      const newPurchaseReturn = await tx.purchaseReturn.create({
        data: {
          purchase_id: parseInt(purchase_id),
          return_date: new Date(return_date),
          return_reason,
          total_return_amount: parseFloat(total_return_amount || 0),
          notes: notes || null,
          status: 'COMPLETED'
        }
      });

      // Create return details
      const returnDetailsData = return_details.map(detail => ({
        return_id: newPurchaseReturn.id,
        pro_id: parseInt(detail.pro_id),
        return_quantity: parseInt(detail.return_quantity),
        unit_rate: parseFloat(detail.unit_rate || 0),
        return_amount: parseFloat(detail.return_amount || 0)
      }));

      await tx.purchaseReturnDetail.createMany({
        data: returnDetailsData
      });

      // Update store stock (add back returned quantities)
      for (const detail of return_details) {
        await updateStoreStock(purchase.store_id, parseInt(detail.pro_id), parseInt(detail.return_quantity), 'increment', updated_by);
      }

      // Update customer balance (reduce the amount owed)
      const customer = await tx.customer.findUnique({
        where: { cus_id: purchase.cus_id },
        select: { cus_balance: true }
      });

      const currentBalance = parseFloat(customer?.cus_balance || 0);
      const newBalance = currentBalance - parseFloat(total_return_amount || 0);

      await tx.customer.update({
        where: { cus_id: purchase.cus_id },
        data: { cus_balance: newBalance }
      });

      // Create ledger entry for the return
      await tx.ledger.create({
        data: {
          cus_id: purchase.cus_id,
          opening_balance: currentBalance,
          debit_amount: 0,
          credit_amount: parseFloat(total_return_amount || 0),
          closing_balance: newBalance,
          bill_no: newPurchaseReturn.id.toString(),
          trnx_type: 'RETURN',
          details: `Purchase Return - ${return_reason}`,
          payments: 0,
          updated_by: null
        }
      });

      return newPurchaseReturn;
    });

    console.log('Purchase return created successfully:', result);
    return NextResponse.json(result, { status: 201 });

  } catch (error) {
    console.error('Error creating purchase return:', error);
    return NextResponse.json({ 
      error: 'Failed to create purchase return',
      details: error.message 
    }, { status: 500 });
  }
}

// PUT - Update purchase return
export async function PUT(request) {
  try {
    const body = await request.json();
    const {
      id,
      purchase_id,
      return_date,
      return_reason,
      return_details,
      total_return_amount,
      notes
    } = body;

    console.log('Updating purchase return:', body);

    if (!id) {
      return NextResponse.json({ error: 'Purchase return ID is required' }, { status: 400 });
    }

    // Check if purchase return exists
    const existingReturn = await prisma.purchaseReturn.findUnique({
      where: { id: parseInt(id) },
      include: {
        return_details: true
      }
    });

    if (!existingReturn) {
      return NextResponse.json({ error: 'Purchase return not found' }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Update purchase return
      const updatedReturn = await tx.purchaseReturn.update({
        where: { id: parseInt(id) },
        data: {
          return_date: new Date(return_date),
          return_reason,
          total_return_amount: parseFloat(total_return_amount || 0),
          notes: notes || null
        }
      });

      // Delete existing return details
      await tx.purchaseReturnDetail.deleteMany({
        where: { return_id: parseInt(id) }
      });

      // Revert previous stock changes
      for (const detail of existingReturn.return_details) {
        await tx.product.update({
          where: { pro_id: detail.pro_id },
          data: {
            pro_stock_qnty: {
              decrement: detail.return_quantity
            }
          }
        });
      }

      // Create new return details
      if (return_details && return_details.length > 0) {
        const returnDetailsData = return_details.map(detail => ({
          return_id: parseInt(id),
          pro_id: parseInt(detail.pro_id),
          return_quantity: parseInt(detail.return_quantity),
          unit_rate: parseFloat(detail.unit_rate || 0),
          return_amount: parseFloat(detail.return_amount || 0)
        }));

        await tx.purchaseReturnDetail.createMany({
          data: returnDetailsData
        });

        // Apply new store stock changes
        for (const detail of return_details) {
          await updateStoreStock(purchase.store_id, parseInt(detail.pro_id), parseInt(detail.return_quantity), 'increment', updated_by);
        }
      }

      return updatedReturn;
    });

    console.log('Purchase return updated successfully:', result);
    return NextResponse.json(result);

  } catch (error) {
    console.error('Error updating purchase return:', error);
    return NextResponse.json({ 
      error: 'Failed to update purchase return',
      details: error.message 
    }, { status: 500 });
  }
}

// DELETE - Delete purchase return
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Purchase return ID is required' }, { status: 400 });
    }

    // Check if purchase return exists
    const existingReturn = await prisma.purchaseReturn.findUnique({
      where: { id: parseInt(id) },
      include: {
        return_details: true,
        purchase: true
      }
    });

    if (!existingReturn) {
      return NextResponse.json({ error: 'Purchase return not found' }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Revert store stock changes
      for (const detail of existingReturn.return_details) {
        await updateStoreStock(existingReturn.purchase.store_id, detail.pro_id, detail.return_quantity, 'decrement', updated_by);
      }

      // Revert customer balance
      const customer = await tx.customer.findUnique({
        where: { cus_id: existingReturn.purchase.cus_id },
        select: { cus_balance: true }
      });

      const currentBalance = parseFloat(customer?.cus_balance || 0);
      const newBalance = currentBalance + parseFloat(existingReturn.total_return_amount || 0);

      await tx.customer.update({
        where: { cus_id: existingReturn.purchase.cus_id },
        data: { cus_balance: newBalance }
      });

      // Delete return details
      await tx.purchaseReturnDetail.deleteMany({
        where: { return_id: parseInt(id) }
      });

      // Delete ledger entries related to this return
      await tx.ledger.deleteMany({
        where: { 
          bill_no: id.toString(),
          trnx_type: 'RETURN'
        }
      });

      // Delete purchase return
      const deletedReturn = await tx.purchaseReturn.delete({
        where: { id: parseInt(id) }
      });

      return deletedReturn;
    });

    console.log('Purchase return deleted successfully:', result);
    return NextResponse.json({ message: 'Purchase return deleted successfully' });

  } catch (error) {
    console.error('Error deleting purchase return:', error);
    return NextResponse.json({ 
      error: 'Failed to delete purchase return',
      details: error.message 
    }, { status: 500 });
  }
}



