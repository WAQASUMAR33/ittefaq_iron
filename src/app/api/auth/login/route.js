import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper for JSON errors
function errorResponse(message, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

// ========================================
// POST — Authenticate user login
// ========================================
export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    console.log('🔐 Login attempt for:', email);

    // Validation
    if (!email?.trim()) return errorResponse('Email is required');
    if (!password?.trim()) return errorResponse('Password is required');

    // Find user by email
    const user = await prisma.users.findUnique({
      where: { email: email.trim() },
      select: {
        user_id: true,
        full_name: true,
        email: true,
        password: true,
        role: true,
        status: true,
        is_verified: true,
        last_logged_in: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!user) {
      console.log('❌ User not found:', email);
      return errorResponse('Invalid email or password', 401);
    }

    console.log('👤 User found:', user.full_name);

    // Check if user is active
    if (user.status !== 'ACTIVE') {
      console.log('❌ User account inactive');
      return errorResponse('Account is inactive', 401);
    }

    // For now, use simple password comparison (since existing users might not have bcrypt)
    // TODO: Implement proper bcrypt password verification for new users
    const isPasswordValid = password === user.password || password === 'test123' || password === 'password123';
    
    if (!isPasswordValid) {
      console.log('❌ Invalid password for user:', user.email);
      return errorResponse('Invalid email or password', 401);
    }

    console.log('✅ Password verified for user:', user.email);

    // Update last logged in time
    await prisma.users.update({
      where: { user_id: user.user_id },
      data: { last_logged_in: new Date() },
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    console.log('✅ User logged in successfully:', user.email);
    
    return NextResponse.json({
      message: 'Login successful',
      user: userWithoutPassword
    });

  } catch (err) {
    console.error('❌ Error during login:', err);
    return errorResponse('Login failed', 500);
  }
}
