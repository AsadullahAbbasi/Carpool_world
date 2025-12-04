import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { User } from '@/models/User';
import { generateToken } from '@/lib/auth';
import { z } from 'zod';

const verifySchema = z.object({
  token: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { token } = verifySchema.parse(body);

    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired verification token' },
        { status: 400 }
      );
    }

    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    // Auto-login the user after verification
    const jwtToken = generateToken({
      userId: user._id.toString(),
      email: user.email,
    });

    const response = NextResponse.json({
      message: 'Email verified successfully',
      token: jwtToken,
      user: {
        id: user._id.toString(),
        email: user.email,
        emailVerified: user.emailVerified,
      },
    });

    // Set authentication cookie
    response.headers.set(
      'Set-Cookie',
      `token=${jwtToken}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${7 * 24 * 60 * 60}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
    );

    return response;
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Email verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify email' },
      { status: 500 }
    );
  }
}
