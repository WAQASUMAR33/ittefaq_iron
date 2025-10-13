import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Helper for JSON errors
function errorResponse(message, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

// ========================================
// GET — Get all purchases or one purchase
// ========================================
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id'); // optional: ?id=1

  try {
    if (id) {
      const purchase = await prisma.purchase.findUnique({
        where: { pur_id: id },
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
      total_amount, 
      unloading_amount = 0, 
      fare_amount = 0, 
      discount = 0, 
      payment, 
      payment_type, 
      vehicle_no,
      updated_by,
      purchase_details = []
    } = body;

    // Validation for required fields
    if (!cus_id) {
      return errorResponse('Customer ID is required');
    }
    if (!total_amount || total_amount <= 0) {
      return errorResponse('Total amount is required and must be greater than 0');
    }
    if (!payment || payment < 0) {
      return errorResponse('Payment amount is required and must be non-negative');
    }
    if (!payment_type || !['CASH', 'CHEQUE', 'BANK_TRANSFER'].includes(payment_type)) {
      return errorResponse('Valid payment type is required (CASH, CHEQUE, BANK_TRANSFER)');
    }

    // Calculate net total: total_amount + unloading_amount + fare_amount - discount
    const net_total = parseFloat(total_amount) + parseFloat(unloading_amount) + parseFloat(fare_amount) - parseFloat(discount);

    // Check if customer exists
    const customer = await prisma.customer.findUnique({
      where: { cus_id }
    });

    if (!customer) {
      return errorResponse('Customer not found', 404);
    }

    // Create purchase with details and ledger entries in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Get customer's current balance
      const customerData = await tx.customer.findUnique({
        where: { cus_id },
        select: { cus_balance: true }
      });

      const currentBalance = parseFloat(customerData?.cus_balance || 0);

      // Create the purchase
      const newPurchase = await tx.purchase.create({
        data: {
          cus_id,
          total_amount: parseFloat(total_amount),
          unloading_amount: parseFloat(unloading_amount),
          fare_amount: parseFloat(fare_amount),
          discount: parseFloat(discount),
          net_total,
          payment: parseFloat(payment),
          payment_type,
          vehicle_no: vehicle_no || null,
          updated_by: updated_by || null
        }
      });

      // Create purchase details if provided
      if (purchase_details && purchase_details.length > 0) {
        const detailsData = purchase_details.map(detail => ({
          pur_id: newPurchase.pur_id,
          vehicle_no: vehicle_no || null,
          cus_id,
          pro_id: detail.pro_id,
          qnty: parseInt(detail.qnty),
          unit: detail.unit,
          unit_rate: parseFloat(detail.unit_rate),
          total_amount: parseFloat(detail.total_amount),
          net_total: parseFloat(detail.total_amount), // Use total_amount as net_total for now
          updated_by: updated_by || null
        }));

        await tx.purchaseDetail.createMany({
          data: detailsData
        });
      }

      // Create ledger entry for purchase (debit - customer owes money)
      const purchaseBalance = currentBalance + net_total;
      await tx.ledger.create({
        data: {
          cus_id,
          opening_balance: currentBalance,
          debit_amount: net_total,
          credit_amount: 0,
          closing_balance: purchaseBalance,
          bill_no: newPurchase.pur_id,
          trnx_type: payment_type,
          details: `Purchase - ${vehicle_no ? `Vehicle: ${vehicle_no}` : 'Purchase Order'}`,
          payments: 0,
          updated_by: updated_by || null
        }
      });

      // Create ledger entry for payment (credit - customer paid money)
      if (parseFloat(payment) > 0) {
        const paymentBalance = purchaseBalance - parseFloat(payment);
        await tx.ledger.create({
          data: {
            cus_id,
            opening_balance: purchaseBalance,
            debit_amount: 0,
            credit_amount: parseFloat(payment),
            closing_balance: paymentBalance,
            bill_no: newPurchase.pur_id,
            trnx_type: payment_type,
            details: `Payment - ${payment_type}`,
            payments: parseFloat(payment),
            updated_by: updated_by || null
          }
        });

        // Update customer balance
        await tx.customer.update({
          where: { cus_id },
          data: { cus_balance: paymentBalance }
        });
      } else {
        // Update customer balance with purchase amount only
        await tx.customer.update({
          where: { cus_id },
          data: { cus_balance: purchaseBalance }
        });
      }

      return newPurchase;
    });

    // Fetch the complete purchase with relations
    const completePurchase = await prisma.purchase.findUnique({
      where: { pur_id: result.pur_id },
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
      total_amount, 
      unloading_amount = 0, 
      fare_amount = 0, 
      discount = 0, 
      payment, 
      payment_type, 
      vehicle_no,
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

    // Calculate net total
    const net_total = parseFloat(total_amount) + parseFloat(unloading_amount) + parseFloat(fare_amount) - parseFloat(discount);

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
          cus_id,
          total_amount: parseFloat(total_amount),
          unloading_amount: parseFloat(unloading_amount),
          fare_amount: parseFloat(fare_amount),
          discount: parseFloat(discount),
          net_total,
          payment: parseFloat(payment),
          payment_type,
          vehicle_no: vehicle_no || null,
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
          cus_id,
          pro_id: detail.pro_id,
          qnty: parseInt(detail.qnty),
          unit: detail.unit,
          unit_rate: parseFloat(detail.unit_rate),
          total_amount: parseFloat(detail.total_amount),
          net_total: parseFloat(detail.total_amount), // Use total_amount as net_total for now
          updated_by: updated_by || existingPurchase.updated_by
        }));

        await tx.purchaseDetail.createMany({
          data: detailsData
        });
      }

      // Delete existing ledger entries for this purchase
      await tx.ledger.deleteMany({
        where: { bill_no: id }
      });

      // Create ledger entry for purchase (debit - customer owes money)
      const purchaseBalance = currentBalance + net_total;
      await tx.ledger.create({
        data: {
          cus_id,
          opening_balance: currentBalance,
          debit_amount: net_total,
          credit_amount: 0,
          closing_balance: purchaseBalance,
          bill_no: id,
          trnx_type: payment_type,
          details: `Purchase Update - ${vehicle_no ? `Vehicle: ${vehicle_no}` : 'Purchase Order'}`,
          payments: 0,
          updated_by: updated_by || existingPurchase.updated_by
        }
      });

      // Create ledger entry for payment (credit - customer paid money)
      if (parseFloat(payment) > 0) {
        const paymentBalance = purchaseBalance - parseFloat(payment);
        await tx.ledger.create({
          data: {
            cus_id,
            opening_balance: purchaseBalance,
            debit_amount: 0,
            credit_amount: parseFloat(payment),
            closing_balance: paymentBalance,
            bill_no: id,
            trnx_type: payment_type,
            details: `Payment Update - ${payment_type}`,
            payments: parseFloat(payment),
            updated_by: updated_by || existingPurchase.updated_by
          }
        });

        // Update customer balance
        await tx.customer.update({
          where: { cus_id },
          data: { cus_balance: paymentBalance }
        });
      } else {
        // Update customer balance with purchase amount only
        await tx.customer.update({
          where: { cus_id },
          data: { cus_balance: purchaseBalance }
        });
      }

      return updatedPurchase;
    });

    // Fetch the complete updated purchase with relations
    const completePurchase = await prisma.purchase.findUnique({
      where: { pur_id: result.pur_id },
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
  const id = searchParams.get('id'); // /api/purchases?id=1

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
