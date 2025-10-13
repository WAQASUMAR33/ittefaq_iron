import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - Fetch all expenses with related data
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      // Fetch single expense
      const expense = await prisma.expense.findUnique({
        where: { exp_id: id },
        include: {
          expense_title: true,
          updated_by_user: {
            select: {
              full_name: true,
              role: true
            }
          }
        }
      });

      if (!expense) {
        return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
      }

      return NextResponse.json(expense);
    } else {
      // Fetch all expenses
      const expenses = await prisma.expense.findMany({
        include: {
          expense_title: true,
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

      return NextResponse.json(expenses);
    }
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
  }
}

// POST - Create new expense
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      exp_title,
      exp_type,
      exp_detail,
      exp_amount,
      updated_by
    } = body;

    // Validate required fields
    if (!exp_title || !exp_type || !exp_amount) {
      return NextResponse.json({ error: 'Title, type, and amount are required' }, { status: 400 });
    }

    // Validate amount
    if (parseFloat(exp_amount) <= 0) {
      return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 });
    }

    // Check if expense title exists
    const expenseTitle = await prisma.expenseTitle.findUnique({
      where: { id: exp_type }
    });

    if (!expenseTitle) {
      return NextResponse.json({ error: 'Invalid expense type' }, { status: 400 });
    }

    // Create expense
    const expense = await prisma.expense.create({
      data: {
        exp_title: exp_title.trim(),
        exp_type,
        exp_detail: exp_detail?.trim() || null,
        exp_amount: parseFloat(exp_amount),
        updated_by
      },
      include: {
        expense_title: true,
        updated_by_user: {
          select: {
            full_name: true,
            role: true
          }
        }
      }
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error('Error creating expense:', error);
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
  }
}

// PUT - Update expense
export async function PUT(request) {
  try {
    const body = await request.json();
    const {
      id,
      exp_title,
      exp_type,
      exp_detail,
      exp_amount,
      updated_by
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Expense ID is required' }, { status: 400 });
    }

    if (!exp_title || !exp_type || !exp_amount) {
      return NextResponse.json({ error: 'Title, type, and amount are required' }, { status: 400 });
    }

    // Validate amount
    if (parseFloat(exp_amount) <= 0) {
      return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 });
    }

    // Check if expense title exists
    const expenseTitle = await prisma.expenseTitle.findUnique({
      where: { id: exp_type }
    });

    if (!expenseTitle) {
      return NextResponse.json({ error: 'Invalid expense type' }, { status: 400 });
    }

    // Update expense
    const expense = await prisma.expense.update({
      where: { exp_id: id },
      data: {
        exp_title: exp_title.trim(),
        exp_type,
        exp_detail: exp_detail?.trim() || null,
        exp_amount: parseFloat(exp_amount),
        updated_by
      },
      include: {
        expense_title: true,
        updated_by_user: {
          select: {
            full_name: true,
            role: true
          }
        }
      }
    });

    return NextResponse.json(expense);
  } catch (error) {
    console.error('Error updating expense:', error);
    return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 });
  }
}

// DELETE - Delete expense
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Expense ID is required' }, { status: 400 });
    }

    // Delete expense
    await prisma.expense.delete({
      where: { exp_id: id }
    });

    return NextResponse.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Error deleting expense:', error);
    return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 });
  }
}
