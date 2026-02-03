import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

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

    const result = await prisma.$transaction(
      async (tx) => {
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

      // Update store stock - DECREMENT stock when returning to supplier
      // (Items are going back to supplier, so our stock decreases)
      if (purchase.store_id) {
        for (const detail of return_details) {
          const storeIdInt = parseInt(purchase.store_id);
          const productIdInt = parseInt(detail.pro_id);
          const qtyChange = parseInt(detail.return_quantity);
          
          try {
            // Use single upsert-style query for faster execution
            await tx.$executeRaw`
              INSERT INTO store_stocks (store_id, pro_id, stock_quantity, min_stock, max_stock, created_at, updated_at) 
              VALUES (${storeIdInt}, ${productIdInt}, -${qtyChange}, 0, 1000, NOW(), NOW())
              ON DUPLICATE KEY UPDATE stock_quantity = stock_quantity - ${qtyChange}, updated_at = NOW()
            `;
          } catch (stockError) {
            console.warn('Stock update warning:', stockError.message);
          }
        }
      }

      // Get supplier's current balance
      const supplier = await tx.customer.findUnique({
        where: { cus_id: purchase.cus_id },
        select: { cus_balance: true, cus_name: true }
      });

      const currentBalance = parseFloat(supplier?.cus_balance || 0);
      
      // PURCHASE RETURN ACCOUNTING:
      // When we return goods to supplier:
      // - Our liability (amount we owe them) DECREASES
      // - Since Purchase DEBITS supplier (increases liability), 
      //   Purchase Return should CREDIT supplier (decrease liability)
      const returnAmount = parseFloat(total_return_amount || 0);
      const newBalance = currentBalance - returnAmount;

      // Update supplier balance
      await tx.customer.update({
        where: { cus_id: purchase.cus_id },
        data: { cus_balance: newBalance }
      });

      // Create ledger entry - Credit Supplier (reduces what we owe)
      await tx.ledger.create({
        data: {
          cus_id: purchase.cus_id,
          opening_balance: currentBalance,
          debit_amount: 0,
          credit_amount: returnAmount,
          closing_balance: newBalance,
          bill_no: `PR-${newPurchaseReturn.id}`,
          trnx_type: 'PURCHASE_RETURN',
          details: `Purchase Return #${newPurchaseReturn.id} - ${return_reason} - Goods returned to ${supplier?.cus_name || 'Supplier'}`,
          payments: 0,
          updated_by: null
        }
      });

      return newPurchaseReturn;
      },
      {
        timeout: 30000, // 30 seconds
        maxWait: 60000   // 60 seconds max wait
      }
    );

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
        return_details: true,
        purchase: true
      }
    });

    if (!existingReturn) {
      return NextResponse.json({ error: 'Purchase return not found' }, { status: 404 });
    }

    const purchase = existingReturn.purchase;

    const result = await prisma.$transaction(
      async (tx) => {
        // 1. First, REVERSE the old return effects
        
        // Reverse old stock changes (increment back what was decremented)
        if (purchase.store_id) {
          for (const detail of existingReturn.return_details) {
            const storeIdInt = parseInt(purchase.store_id);
            const productIdInt = parseInt(detail.pro_id);
            const qtyChange = parseInt(detail.return_quantity);
            try {
              await tx.$executeRaw`
                UPDATE store_stocks 
                SET stock_quantity = stock_quantity + ${qtyChange}, updated_at = NOW() 
                WHERE store_id = ${storeIdInt} AND pro_id = ${productIdInt}
              `;
            } catch (stockError) {
              console.warn('Stock reversal warning:', stockError.message);
          }
        }
      }

      // Reverse old balance change (debit back what was credited)
      const supplierBeforeReverse = await tx.customer.findUnique({
        where: { cus_id: purchase.cus_id },
        select: { cus_balance: true, cus_name: true }
      });
      const balanceBeforeReverse = parseFloat(supplierBeforeReverse?.cus_balance || 0);
      const oldReturnAmount = parseFloat(existingReturn.total_return_amount || 0);
      const balanceAfterReverse = balanceBeforeReverse + oldReturnAmount;

      await tx.customer.update({
        where: { cus_id: purchase.cus_id },
        data: { cus_balance: balanceAfterReverse }
      });

      // Delete old return details
      await tx.purchaseReturnDetail.deleteMany({
        where: { return_id: parseInt(id) }
      });

      // Delete old ledger entries for this return
      await tx.ledger.deleteMany({
        where: { bill_no: `PR-${id}` }
      });

      // 2. Now apply the NEW return effects
      
      // Update purchase return record
      const updatedReturn = await tx.purchaseReturn.update({
        where: { id: parseInt(id) },
        data: {
          return_date: new Date(return_date),
          return_reason,
          total_return_amount: parseFloat(total_return_amount || 0),
          notes: notes || null
        }
      });

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

        // Apply new stock changes (decrement for return)
        if (purchase.store_id) {
          for (const detail of return_details) {
            const storeIdInt = parseInt(purchase.store_id);
            const productIdInt = parseInt(detail.pro_id);
            const qtyChange = parseInt(detail.return_quantity);
            try {
              await tx.$executeRaw`
                INSERT INTO store_stocks (store_id, pro_id, stock_quantity, min_stock, max_stock, created_at, updated_at) 
                VALUES (${storeIdInt}, ${productIdInt}, -${qtyChange}, 0, 1000, NOW(), NOW())
                ON DUPLICATE KEY UPDATE stock_quantity = stock_quantity - ${qtyChange}, updated_at = NOW()
              `;
            } catch (stockError) {
              console.warn('Stock update warning:', stockError.message);
            }
          }
        }
      }

      // Apply new balance change
      const newReturnAmount = parseFloat(total_return_amount || 0);
      const finalBalance = balanceAfterReverse - newReturnAmount;

      await tx.customer.update({
        where: { cus_id: purchase.cus_id },
        data: { cus_balance: finalBalance }
      });

      // Create new ledger entry
      await tx.ledger.create({
        data: {
          cus_id: purchase.cus_id,
          opening_balance: balanceAfterReverse,
          debit_amount: 0,
          credit_amount: newReturnAmount,
          closing_balance: finalBalance,
          bill_no: `PR-${id}`,
          trnx_type: 'PURCHASE_RETURN',
          details: `Purchase Return #${id} (Updated) - ${return_reason} - Goods returned to ${supplierBeforeReverse?.cus_name || 'Supplier'}`,
          payments: 0,
          updated_by: null
        }
      });

      return updatedReturn;
      },
      {
        timeout: 30000, // 30 seconds
        maxWait: 60000   // 60 seconds max wait
      }
    );

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

    const purchase = existingReturn.purchase;

    const result = await prisma.$transaction(
      async (tx) => {
        // Revert store stock changes - INCREMENT back what was decremented
        // (Items that were returned to supplier are now back in our stock conceptually)
        if (purchase.store_id) {
          for (const detail of existingReturn.return_details) {
            const storeIdInt = parseInt(purchase.store_id);
            const productIdInt = parseInt(detail.pro_id);
            const qtyChange = parseInt(detail.return_quantity);
            try {
              await tx.$executeRaw`
                UPDATE store_stocks 
                SET stock_quantity = stock_quantity + ${qtyChange}, updated_at = NOW() 
                WHERE store_id = ${storeIdInt} AND pro_id = ${productIdInt}
              `;
            } catch (stockError) {
            console.warn('Stock reversal warning:', stockError.message);
          }
        }
      }

      // Revert supplier balance - DEBIT back what was credited
      const supplier = await tx.customer.findUnique({
        where: { cus_id: purchase.cus_id },
        select: { cus_balance: true, cus_name: true }
      });

      const currentBalance = parseFloat(supplier?.cus_balance || 0);
      const returnAmount = parseFloat(existingReturn.total_return_amount || 0);
      const newBalance = currentBalance + returnAmount;  // Add back what was reduced

      await tx.customer.update({
        where: { cus_id: purchase.cus_id },
        data: { cus_balance: newBalance }
      });

      // Create reversal ledger entry
      await tx.ledger.create({
        data: {
          cus_id: purchase.cus_id,
          opening_balance: currentBalance,
          debit_amount: returnAmount,  // Debit to reverse the credit
          credit_amount: 0,
          closing_balance: newBalance,
          bill_no: `PR-${id}-DELETED`,
          trnx_type: 'PURCHASE_RETURN',
          details: `Purchase Return #${id} CANCELLED/DELETED - Reversal entry for ${supplier?.cus_name || 'Supplier'}`,
          payments: 0,
          updated_by: null
        }
      });

      // Delete return details
      await tx.purchaseReturnDetail.deleteMany({
        where: { return_id: parseInt(id) }
      });

      // Delete original ledger entries related to this return
      await tx.ledger.deleteMany({
        where: { bill_no: `PR-${id}` }
      });

      // Delete purchase return
      const deletedReturn = await tx.purchaseReturn.delete({
        where: { id: parseInt(id) }
      });

      return deletedReturn;
      },
      {
        timeout: 30000, // 30 seconds
        maxWait: 60000   // 60 seconds max wait
      }
    );

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



