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
        profileCompleted: profile.profileCompleted || false,
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

    // Calculate profileCompleted based on provided fields or existing fields combined with updates
    // For now, let's just use what's passed or default to false,
    // OR smarter: if all required fields are present (and they should be verified on client), set it to true.
    // However, the client might send partial updates.
    // Let's rely on the client to send the completion status for now, OR check here.
    // Better: Check here if all 4 fields are present in the final profile state.

    let profile = await Profile.findOne({ userId });

    if (profile) {
      if (data.fullName !== undefined) profile.fullName = data.fullName;

      if (data.phone !== undefined) profile.phone = data.phone;
      if (data.avatarUrl !== undefined) profile.avatarUrl = data.avatarUrl;
      if (data.gender !== undefined) profile.gender = data.gender;
      if (data.disableAutoExpiry !== undefined) profile.disableAutoExpiry = data.disableAutoExpiry;
      // NIC number cannot be edited - it's only set via verification endpoint

      // Check for completion
      if (profile.fullName && profile.phone && profile.avatarUrl && profile.gender) {
        profile.profileCompleted = true;
      }

      await profile.save();
    } else {
      const isComplete = !!(data.fullName && data.phone && data.avatarUrl && data.gender);

      profile = new Profile({
        userId,
        fullName: data.fullName || '',

        phone: data.phone,
        avatarUrl: data.avatarUrl,
        gender: data.gender,
        profileCompleted: isComplete,
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
        profileCompleted: profile.profileCompleted || false,
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