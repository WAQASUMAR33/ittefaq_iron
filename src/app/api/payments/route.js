import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { calculateClosingBalance, createLedgerEntry } from '@/lib/ledger-helper';

const prisma = new PrismaClient();

// GET - Fetch all payments with related data
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id') ? parseInt(searchParams.get('id')) : null;
    const accountId = searchParams.get('account_id') ? parseInt(searchParams.get('account_id')) : null;
    const type = searchParams.get('type');
    const status = searchParams.get('status');

    if (id) {
      // Fetch single payment
      const payment = await prisma.payment.findUnique({
        where: { payment_id: id },
        include: {
          account: {
            select: {
              cus_id: true,
              cus_name: true,
              cus_phone_no: true
            }
          },
          cash_account: {
            select: {
              cus_id: true,
              cus_name: true
            }
          },
          bank_account: {
            select: {
              cus_id: true,
              cus_name: true
            }
          },
          payment_details: {
            include: {
              account: {
                select: {
                  cus_id: true,
                  cus_name: true
                }
              }
            }
          },
          created_by_user: {
            select: {
              full_name: true,
              role: true
            }
          }
        }
      });

      if (!payment) {
        return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
      }

      return NextResponse.json(payment);
    } else {
      // Fetch all payments with filters
      const where = {};
      if (accountId) where.account_id = accountId;
      if (type) where.payment_type = type;
      if (status) where.status = status;

      const payments = await prisma.payment.findMany({
        where,
        include: {
          account: {
            select: {
              cus_id: true,
              cus_name: true,
              cus_phone_no: true
            }
          },
          cash_account: {
            select: {
              cus_id: true,
              cus_name: true
            }
          },
          bank_account: {
            select: {
              cus_id: true,
              cus_name: true
            }
          },
          created_by_user: {
            select: {
              full_name: true,
              role: true
            }
          }
        },
        orderBy: { created_at: 'desc' }
      });

      return NextResponse.json(payments);
    }
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 });
  }
}

// POST - Create a new payment
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      payment_date,
      payment_type,
      account_id,
      total_amount,
      discount_amount = 0,
      cash_account_id,
      cash_amount = 0,
      bank_account_id,
      bank_amount = 0,
      description,
      created_by
    } = body;

    // Validate required fields
    if (!payment_date || !payment_type || !account_id || !total_amount || !created_by) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const netAmount = parseFloat(total_amount) - parseFloat(discount_amount);
    const totalPaymentAmount = parseFloat(cash_amount) + parseFloat(bank_amount);

    // Validate payment amounts
    if (Math.abs(netAmount - totalPaymentAmount) > 0.01) {
      return NextResponse.json({
        error: 'Payment amounts do not match net amount'
      }, { status: 400 });
    }

    // Get current balances for all affected accounts (BEFORE transaction)
    const affectedAccountIds = [parseInt(account_id)];
    if (cash_account_id) affectedAccountIds.push(parseInt(cash_account_id));
    if (bank_account_id) affectedAccountIds.push(parseInt(bank_account_id));

    const accountBalances = await prisma.customer.findMany({
      where: { cus_id: { in: affectedAccountIds } },
      select: { cus_id: true, cus_balance: true }
    });

    const balanceMap = {};
    accountBalances.forEach(acc => {
      balanceMap[acc.cus_id] = parseFloat(acc.cus_balance || 0);
    });

    // Use transaction to ensure data consistency
    const result = await prisma.$transaction(
      async (tx) => {
        // Create payment
        const payment = await tx.payment.create({
          data: {
            payment_date: new Date(payment_date),
            payment_type,
            account_id: parseInt(account_id),
            total_amount: parseFloat(total_amount),
            discount_amount: parseFloat(discount_amount),
            net_amount: netAmount,
            cash_account_id: cash_account_id ? parseInt(cash_account_id) : null,
            cash_amount: parseFloat(cash_amount),
            bank_account_id: bank_account_id ? parseInt(bank_account_id) : null,
            bank_amount: parseFloat(bank_amount),
            description,
            created_by: parseInt(created_by)
          }
        });

        // Create payment details for ledger entries
        const paymentDetails = [];

        // Main account entry (debit for receive, credit for pay)
        if (payment_type === 'RECEIVE') {
          paymentDetails.push({
            payment_id: payment.payment_id,
            account_id: parseInt(account_id),
            amount: netAmount,
            description: description || `Payment received from account`
          });
        } else { // PAY
          paymentDetails.push({
            payment_id: payment.payment_id,
            account_id: parseInt(account_id),
            amount: parseFloat(total_amount), // Total amount for supplier credit
            description: description || `Payment made to account`
          });
        }

        // Cash account entry (if cash payment exists)
        if (cash_account_id && parseFloat(cash_amount) > 0) {
          if (payment_type === 'RECEIVE') {
            paymentDetails.push({
              payment_id: payment.payment_id,
              account_id: parseInt(cash_account_id),
              amount: -parseFloat(cash_amount), // Cash out for receive
              description: `Cash payment received`
            });
          } else { // PAY
            paymentDetails.push({
              payment_id: payment.payment_id,
              account_id: parseInt(cash_account_id),
              amount: -parseFloat(cash_amount), // Cash out for pay
              description: `Cash payment made`
            });
          }
        }

        // Bank account entry (if bank payment exists)
        if (bank_account_id && parseFloat(bank_amount) > 0) {
          if (payment_type === 'RECEIVE') {
            paymentDetails.push({
              payment_id: payment.payment_id,
              account_id: parseInt(bank_account_id),
              amount: -parseFloat(bank_amount), // Bank out for receive
              description: `Bank payment received`
            });
          } else { // PAY
            paymentDetails.push({
              payment_id: payment.payment_id,
              account_id: parseInt(bank_account_id),
              amount: -parseFloat(bank_amount), // Bank out for pay
              description: `Bank payment made`
            });
          }
        }

        // Create payment details
        if (paymentDetails.length > 0) {
          await tx.paymentDetail.createMany({
            data: paymentDetails
          });
        }
      const ledgerEntries = [];

      // Main account ledger entry
      let mainDebitAmount = 0;
      let mainCreditAmount = 0;
      if (payment_type === 'RECEIVE') {
        mainCreditAmount = parseFloat(total_amount); // Customer is credited for full amount including discount
      } else { // PAY
        mainCreditAmount = parseFloat(total_amount); // Supplier is credited for total amount (discount shown but balance reduced by full amount)
      }

      const mainAccountEntry = createLedgerEntry({
        cus_id: parseInt(account_id),
        opening_balance: balanceMap[parseInt(account_id)] || 0,
        debit_amount: mainDebitAmount,
        credit_amount: mainCreditAmount,
        bill_no: `PAY-${payment.payment_id}`,
        trnx_type: payment_type === 'RECEIVE' ? 'CASH_PAYMENT' : 'CASH',
        details: parseFloat(discount_amount) > 0 
          ? `${description || `${payment_type.toLowerCase()} payment`} (Total: ${total_amount}, Discount: ${discount_amount}, Net: ${netAmount})`
          : (description || `${payment_type.toLowerCase()} payment`),
        payments: netAmount,
        updated_by: parseInt(created_by)
      });
      ledgerEntries.push({
        ...mainAccountEntry,
        cash_payment: parseFloat(cash_amount),
        bank_payment: parseFloat(bank_amount)
      });

      // Update balance map for next entries
      balanceMap[parseInt(account_id)] = mainAccountEntry.closing_balance;

      // Cash account ledger entry (if applicable)
      if (cash_account_id && parseFloat(cash_amount) > 0) {
        let cashDebitAmount = 0;
        let cashCreditAmount = 0;
        if (payment_type === 'RECEIVE') {
          cashDebitAmount = parseFloat(cash_amount); // Cash increases when received
        } else { // PAY
          cashCreditAmount = parseFloat(cash_amount); // Cash decreases when paid out
        }

        const cashAccountEntry = createLedgerEntry({
          cus_id: parseInt(cash_account_id),
          opening_balance: balanceMap[parseInt(cash_account_id)] || 0,
          debit_amount: cashDebitAmount,
          credit_amount: cashCreditAmount,
          bill_no: `PAY-${payment.payment_id}`,
          trnx_type: 'CASH',
          details: `${payment_type.toLowerCase()} payment - cash`,
          payments: parseFloat(cash_amount),
          updated_by: parseInt(created_by)
        });
        ledgerEntries.push({
          ...cashAccountEntry,
          cash_payment: parseFloat(cash_amount),
          bank_payment: 0
        });

        // Update balance map
        balanceMap[parseInt(cash_account_id)] = cashAccountEntry.closing_balance;
      }

      // Bank account ledger entry (if applicable)
      if (bank_account_id && parseFloat(bank_amount) > 0) {
        let bankDebitAmount = 0;
        let bankCreditAmount = 0;
        if (payment_type === 'RECEIVE') {
          bankDebitAmount = parseFloat(bank_amount); // Bank increases when received
        } else { // PAY
          bankCreditAmount = parseFloat(bank_amount); // Bank decreases when paid out
        }

        const bankAccountEntry = createLedgerEntry({
          cus_id: parseInt(bank_account_id),
          opening_balance: balanceMap[parseInt(bank_account_id)] || 0,
          debit_amount: bankDebitAmount,
          credit_amount: bankCreditAmount,
          bill_no: `PAY-${payment.payment_id}`,
          trnx_type: 'BANK_TRANSFER',
          details: `${payment_type.toLowerCase()} payment - bank`,
          payments: parseFloat(bank_amount),
          updated_by: parseInt(created_by)
        });
        ledgerEntries.push({
          ...bankAccountEntry,
          cash_payment: 0,
          bank_payment: parseFloat(bank_amount)
        });
      }

      // Create ledger entries
      await tx.ledger.createMany({
        data: ledgerEntries
      });

      // Update customer balance AFTER ledger entries are created
      const currentCustomer = await tx.customer.findUnique({
        where: { cus_id: parseInt(account_id) },
        select: { cus_balance: true }
      });

      let newBalance = parseFloat(currentCustomer.cus_balance || 0);
      if (payment_type === 'RECEIVE') {
        newBalance -= parseFloat(total_amount); // Customer pays full amount including discount
      } else {
        newBalance -= parseFloat(total_amount); // You pay supplier total amount (discount is shown but balance reduced by full amount)
      }

      await tx.customer.update({
        where: { cus_id: parseInt(account_id) },
        data: { cus_balance: newBalance }
      });

      return payment;
    }, { timeout: 15000 });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error creating payment:', error);
    return NextResponse.json({ error: 'Failed to create payment' }, { status: 500 });
  }
}

// PUT - Update payment status
export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'Payment ID and status are required' }, { status: 400 });
    }

    const payment = await prisma.payment.update({
      where: { payment_id: parseInt(id) },
      data: { status }
    });

    return NextResponse.json(payment);
  } catch (error) {
    console.error('Error updating payment:', error);
    return NextResponse.json({ error: 'Failed to update payment' }, { status: 500 });
  }
}

// DELETE - Cancel payment
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Payment ID is required' }, { status: 400 });
    }

    // Use transaction to reverse the payment
    await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { payment_id: parseInt(id) },
        include: { payment_details: true }
      });

      if (!payment) {
        throw new Error('Payment not found');
      }

      // Reverse customer balance
      const currentCustomer = await tx.customer.findUnique({
        where: { cus_id: payment.account_id },
        select: { cus_balance: true }
      });

      let newBalance = parseFloat(currentCustomer.cus_balance || 0);
      if (payment.payment_type === 'RECEIVE') {
        newBalance -= parseFloat(payment.net_amount);
      } else {
        newBalance += parseFloat(payment.net_amount);
      }

      await tx.customer.update({
        where: { cus_id: payment.account_id },
        data: { cus_balance: newBalance }
      });

      // Mark payment as cancelled
      await tx.payment.update({
        where: { payment_id: parseInt(id) },
        data: { status: 'CANCELLED' }
      });

      // Note: In a real application, you might want to create reversing ledger entries
      // For now, we'll just mark the payment as cancelled
    });

    return NextResponse.json({ message: 'Payment cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling payment:', error);
    return NextResponse.json({ error: 'Failed to cancel payment' }, { status: 500 });
  }
}