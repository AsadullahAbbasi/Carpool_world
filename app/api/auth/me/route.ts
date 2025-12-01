import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/middleware';
import connectDB from '@/lib/mongodb';
import { User } from '@/models/User';
import { Profile } from '@/models/Profile';

export const GET = authMiddleware(async (req) => {
  try {
    const userId = req.userId!;

    // Handle admin user - don't query database, return admin user data
    if (userId === 'admin') {
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
      return NextResponse.json({
        user: {
          id: 'admin',
          email: adminEmail,
          emailVerified: true,
          role: 'admin',
        },
        profile: null, // Admin doesn't have a profile
      });
    }

    // Regular user - query database
    await connectDB();

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const profile = await Profile.findOne({ userId });

    return NextResponse.json({
      user: {
        id: user._id.toString(),
        email: user.email,
        emailVerified: user.emailVerified,
      },
      profile: profile ? {
        id: profile._id.toString(),
        fullName: profile.fullName,

        phone: profile.phone,
        avatarUrl: profile.avatarUrl,
        gender: profile.gender,
        nicNumber: profile.nicNumber,
        nicVerified: profile.nicVerified || false,
        front: profile.front,
        back: profile.back,
        nicFrontImageUrl: profile.nicFrontImageUrl,
        nicBackImageUrl: profile.nicBackImageUrl,
      } : null,
    });
  } catch (error: any) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: 'Failed to get user' },
      { status: 500 }
    );
  }
});
