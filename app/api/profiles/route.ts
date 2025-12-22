import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/middleware';
import connectDB from '@/lib/mongodb';
import { Profile } from '@/models/Profile';
import { z } from 'zod';

const updateProfileSchema = z.object({
  fullName: z.string().min(1).optional(),

  phone: z.string().optional(),
  avatarUrl: z.string().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  disableAutoExpiry: z.boolean().optional(),
  // NIC number cannot be edited - it's only set via verification
});

export const GET = authMiddleware(async (req) => {
  try {
    await connectDB();
    const userId = req.userId!;

    const profile = await Profile.findOne({ userId });
    if (!profile) {
      return NextResponse.json({ profile: null });
    }

    return NextResponse.json({
      profile: {
        id: profile._id.toString(),
        fullName: profile.fullName,

        phone: profile.phone,
        avatarUrl: profile.avatarUrl,
        gender: profile.gender,
        nicNumber: profile.nicNumber,
        nicVerified: profile.nicVerified || false,
        front: profile.front,
        back: profile.back,
        nicRejectionReason: profile.nicRejectionReason,
        disableAutoExpiry: profile.disableAutoExpiry || false,
      },
    });
  } catch (error: any) {
    console.error('Get profile error:', error);
    return NextResponse.json(
      { error: 'Failed to get profile' },
      { status: 500 }
    );
  }
});

export const PUT = authMiddleware(async (req) => {
  try {
    await connectDB();
    const userId = req.userId!;

    const body = await req.json();
    const data = updateProfileSchema.parse(body);

    let profile = await Profile.findOne({ userId });

    if (profile) {
      if (data.fullName !== undefined) profile.fullName = data.fullName;

      if (data.phone !== undefined) profile.phone = data.phone;
      if (data.avatarUrl !== undefined) profile.avatarUrl = data.avatarUrl;
      if (data.gender !== undefined) profile.gender = data.gender;
      if (data.disableAutoExpiry !== undefined) profile.disableAutoExpiry = data.disableAutoExpiry;
      // NIC number cannot be edited - it's only set via verification endpoint
      await profile.save();
    } else {
      profile = new Profile({
        userId,
        fullName: data.fullName || '',

        phone: data.phone,
        avatarUrl: data.avatarUrl,
        gender: data.gender,
        // NIC number is only set via verification endpoint
      });
      await profile.save();
    }

    return NextResponse.json({
      profile: {
        id: profile._id.toString(),
        fullName: profile.fullName,

        phone: profile.phone,
        avatarUrl: profile.avatarUrl,
        gender: profile.gender,
        nicNumber: profile.nicNumber,
        nicVerified: profile.nicVerified || false,
        front: profile.front,
        back: profile.back,
        nicRejectionReason: profile.nicRejectionReason,
        disableAutoExpiry: profile.disableAutoExpiry || false,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Update profile error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update profile' },
      { status: 500 }
    );
  }
});