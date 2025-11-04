import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Helper function to create ledger entry
async function createLedgerEntry(tx, data) {
  return await tx.ledger.create({
    data: {
      cus_id: data.cus_id,
      opening_balance: data.opening_balance,
      debit_amount: data.debit_amount || 0,
      credit_amount: data.credit_amount || 0,
      closing_balance: data.closing_balance,
      bill_no: data.bill_no,
      trnx_type: data.trnx_type,
      details: data.details,
      payments: data.payments || 0,
      updated_by: data.updated_by
    }
  });
}

// GET - Fetch all subscriptions
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id') ? parseInt(searchParams.get('id')) : null;
    const cus_id = searchParams.get('cus_id') ? parseInt(searchParams.get('cus_id')) : null;

    if (id) {
      const subscription = await prisma.subscription.findUnique({
        where: { subscription_id: id },
        include: {
          customer: true,
          package: true,
          updated_by_user: {
            select: {
              full_name: true,
              role: true
            }
          }
        }
      });

      if (!subscription) {
        return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
      }

      return NextResponse.json(subscription);
    } else {
      const where = cus_id ? { cus_id } : {};
      
      const subscriptions = await prisma.subscription.findMany({
        where,
        include: {
          customer: true,
          package: true,
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

      return NextResponse.json(subscriptions);
    }
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 });
  }
}

// POST - Create new subscription (with balance deduction)
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      cus_id,
      package_id,
      payment_method,
      reference,
      updated_by
    } = body;

    if (!cus_id || !package_id) {
      return NextResponse.json({ error: 'Missing required fields (cus_id, package_id)' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Get package details
      const packageData = await tx.package.findUnique({
        where: { package_id }
      });

      if (!packageData) {
        throw new Error('Package not found');
      }

      if (!packageData.is_active) {
        throw new Error('Package is not active');
      }

      // Get customer details
      const customer = await tx.customer.findUnique({
        where: { cus_id }
      });

      if (!customer) {
        throw new Error('Customer not found');
      }

      // Calculate dates
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + packageData.duration_days);

      // Check balance if payment method is BALANCE
      const finalPaymentMethod = payment_method || 'BALANCE';
      if (finalPaymentMethod === 'BALANCE') {
        const currentBalance = parseFloat(customer.cus_balance || 0);
        const packagePrice = parseFloat(packageData.price);

        if (currentBalance < packagePrice) {
          throw new Error(`Insufficient balance. Required: ${packagePrice.toFixed(2)}, Available: ${currentBalance.toFixed(2)}`);
        }
      }

      // Create subscription
      const subscription = await tx.subscription.create({
        data: {
          cus_id,
          package_id,
          amount: packageData.price,
          status: 'ACTIVE',
          start_date: startDate,
          end_date: endDate,
          payment_method: finalPaymentMethod,
          reference: reference || null,
          updated_by: updated_by || null
        }
      });

      // If payment method is BALANCE, deduct from customer balance and create ledger entry
      if (finalPaymentMethod === 'BALANCE') {
        const packagePrice = parseFloat(packageData.price);
        const newBalance = parseFloat(customer.cus_balance) - packagePrice;

        // Update customer balance
        await tx.customer.update({
          where: { cus_id },
          data: {
            cus_balance: newBalance
          }
        });

        // Create ledger entry for subscription payment
        await createLedgerEntry(tx, {
          cus_id,
          opening_balance: parseFloat(customer.cus_balance),
          debit_amount: 0,
          credit_amount: packagePrice,
          closing_balance: newBalance,
          bill_no: subscription.subscription_id.toString(),
          trnx_type: 'CASH',
          details: `Package Subscription - ${packageData.package_name}`,
          payments: packagePrice,
          updated_by: updated_by || null
        });
      }

      // Return subscription with related data
      return await tx.subscription.findUnique({
        where: { subscription_id: subscription.subscription_id },
        include: {
          customer: true,
          package: true
        }
      });
    }, {
      timeout: 15000
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating subscription:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to create subscription' 
    }, { status: 500 });
  }
}

// PUT - Update subscription
export async function PUT(request) {
  try {
    const body = await request.json();
    const {
      subscription_id,
      status,
      reference,
      updated_by
    } = body;

    if (!subscription_id) {
      return NextResponse.json({ error: 'Subscription ID is required' }, { status: 400 });
    }

    const subscription = await prisma.subscription.update({
      where: { subscription_id },
      data: {
        status,
        reference,
        updated_by
      },
      include: {
        customer: true,
        package: true
      }
    });

    return NextResponse.json(subscription);
  } catch (error) {
    console.error('Error updating subscription:', error);
    return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
  }
}

// DELETE - Delete subscription
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id') ? parseInt(searchParams.get('id')) : null;

    if (!id) {
      return NextResponse.json({ error: 'Subscription ID is required' }, { status: 400 });
    }

    await prisma.subscription.delete({
      where: { subscription_id: id }
    });

    return NextResponse.json({ message: 'Subscription deleted successfully' });
  } catch (error) {
    console.error('Error deleting subscription:', error);
    return NextResponse.json({ error: 'Failed to delete subscription' }, { status: 500 });
  }
}

