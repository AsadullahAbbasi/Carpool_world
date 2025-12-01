import { NextRequest, NextResponse } from 'next/server';
import { generateToken } from '@/lib/auth';

// Hardcoded admin credentials
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Check if admin credentials are configured
    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
      console.error('Admin credentials not configured. Please set ADMIN_EMAIL and ADMIN_PASSWORD in .env.local');
      return NextResponse.json(
        { error: 'Admin credentials not configured. Please contact the administrator.' },
        { status: 500 }
      );
    }

    // Check credentials
    if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Generate admin token
    const token = generateToken({
      userId: 'admin',
      email: ADMIN_EMAIL!,
    });

    // Set cookie
    const response = NextResponse.json({
      message: 'Login successful',
      user: {
        email: ADMIN_EMAIL,
        role: 'admin',
      },
    });

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/', // Ensure cookie is available for all paths
    });

    return response;
  } catch (error: any) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to login' },
      { status: 500 }
    );
  }
}

