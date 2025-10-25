import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper for JSON errors
function errorResponse(message, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

// ========================================
// GET — Get all or one user
// ========================================
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id') ? parseInt(searchParams.get('id')) : null; // optional: ?id=user_id

  try {
    if (id) {
      // Get single user
      const user = await prisma.users.findUnique({
        where: { user_id: id },
        include: {
          _count: {
            select: {
              products: true,
              sales: true,
              purchases: true,
              expenses: true
            }
          }
        }
      });

      if (!user) {
        return errorResponse('User not found', 404);
      }

      return NextResponse.json(user);
    }

    // Get all users with counts
    const users = await prisma.users.findMany({
      include: {
        _count: {
          select: {
            products: true,
            sales: true,
            purchases: true,
            expenses: true
          }
        }
      },
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json(users);
  } catch (err) {
    console.error('❌ Error fetching users:', err);
    return errorResponse('Failed to fetch users', 500);
  }
}

// ========================================
// POST — Create a new user
// ========================================
export async function POST(request) {
  try {
    const body = await request.json();
    const { full_name, email, password, role, status, is_verified } = body;

    // Validation for required fields
    if (!full_name || full_name.trim() === '') {
      return errorResponse('Full name is required');
    }
    if (!email || email.trim() === '') {
      return errorResponse('Email is required');
    }
    if (!password || password.trim() === '') {
      return errorResponse('Password is required');
    }
    if (!role || !['SUPER_ADMIN', 'ADMIN', 'SALESMAN'].includes(role)) {
      return errorResponse('Valid role is required (SUPER_ADMIN, ADMIN, SALESMAN)');
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return errorResponse('Invalid email format');
    }

    // Check if email already exists
    const existingUser = await prisma.users.findUnique({
      where: { email: email.trim() }
    });

    if (existingUser) {
      return errorResponse('User with this email already exists', 409);
    }

    // Password strength validation (minimum 6 characters)
    if (password.length < 6) {
      return errorResponse('Password must be at least 6 characters long');
    }

    // Create new user
    const newUser = await prisma.users.create({
      data: {
        full_name: full_name.trim(),
        email: email.trim(),
        password: password, // In production, this should be hashed
        role: role,
        status: status || 'ACTIVE',
        is_verified: is_verified || false,
      },
      include: {
        _count: {
          select: {
            products: true,
            sales: true,
            purchases: true,
            expenses: true
          }
        }
      }
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = newUser;

    return NextResponse.json(userWithoutPassword, { status: 201 });
  } catch (err) {
    console.error('❌ Error creating user:', err);
    return errorResponse('Failed to create user', 500);
  }
}

// ========================================
// PUT — Update an existing user
// ========================================
export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, full_name, email, password, role, status, is_verified } = body;

    if (!id) {
      return errorResponse('User ID is required');
    }

    // Check if user exists
    const existingUser = await prisma.users.findUnique({
      where: { user_id: id }
    });

    if (!existingUser) {
      return errorResponse('User not found', 404);
    }

    // Validation for required fields
    if (!full_name || full_name.trim() === '') {
      return errorResponse('Full name is required');
    }
    if (!email || email.trim() === '') {
      return errorResponse('Email is required');
    }
    if (!role || !['SUPER_ADMIN', 'ADMIN', 'SALESMAN'].includes(role)) {
      return errorResponse('Valid role is required (SUPER_ADMIN, ADMIN, SALESMAN)');
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return errorResponse('Invalid email format');
    }

    // Check if email is taken by another user
    const emailTaken = await prisma.users.findFirst({
      where: {
        email: email.trim(),
        NOT: { user_id: id }
      }
    });

    if (emailTaken) {
      return errorResponse('Email is already taken by another user', 409);
    }

    // Password validation (if provided)
    if (password && password.length < 6) {
      return errorResponse('Password must be at least 6 characters long');
    }

    // Prepare update data
    const updateData = {
      full_name: full_name.trim(),
      email: email.trim(),
      role: role,
      status: status || 'ACTIVE',
      is_verified: is_verified || false,
    };

    // Only update password if provided
    if (password && password.trim() !== '') {
      updateData.password = password; // In production, this should be hashed
    }

    // Update user
    const updatedUser = await prisma.users.update({
      where: { user_id: id },
      data: updateData,
      include: {
        _count: {
          select: {
            products: true,
            sales: true,
            purchases: true,
            expenses: true
          }
        }
      }
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = updatedUser;

    return NextResponse.json(userWithoutPassword);
  } catch (err) {
    console.error('❌ Error updating user:', err);
    return errorResponse('Failed to update user', 500);
  }
}

// ========================================
// DELETE — Delete a user
// ========================================
export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id') ? parseInt(searchParams.get('id')) : null; // /api/users?id=user_id

  if (!id) {
    return errorResponse('User ID is required');
  }

  try {
    // Check if user exists
    const existingUser = await prisma.users.findUnique({
      where: { user_id: id },
      include: {
        _count: {
          select: {
            products: true,
            sales: true,
            purchases: true,
            expenses: true
          }
        }
      }
    });

    if (!existingUser) {
      return errorResponse('User not found', 404);
    }

    // Check if user has related data (optional - you might want to prevent deletion)
    const totalRelatedData = existingUser._count.products + 
                           existingUser._count.sales + 
                           existingUser._count.purchases + 
                           existingUser._count.expenses;

    if (totalRelatedData > 0) {
      return errorResponse(
        `Cannot delete user. User has ${totalRelatedData} related records (products, sales, purchases, or expenses). Please reassign or delete related data first.`, 
        409
      );
    }

    // Delete user
    await prisma.users.delete({
      where: { user_id: id }
    });

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('❌ Error deleting user:', err);
    return errorResponse('Failed to delete user', 500);
  }
}
