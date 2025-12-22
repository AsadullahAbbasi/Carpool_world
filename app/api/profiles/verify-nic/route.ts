import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/middleware';
import connectDB from '@/lib/mongodb';
import { Profile } from '@/models/Profile';
import { z } from 'zod';

const verifyNicSchema = z.object({
  nicFrontImageUrl: z.string().url(),
  nicBackImageUrl: z.string().url(),
});

/**
 * Submit NIC images for manual verification by admin
 * Images are stored and await admin review
 */
export const POST = authMiddleware(async (req) => {
  try {
    await connectDB();

    const userId = req.userId!;
    const body = await req.json();
    const { nicFrontImageUrl, nicBackImageUrl } = verifyNicSchema.parse(body);

    const profile = await Profile.findOne({ userId });
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Prevent re-verification if already verified
    if (profile.nicVerified) {
      return NextResponse.json(
        { 
          error: 'NIC already verified',
          message: 'Your NIC has already been verified and cannot be changed.',
          nicVerified: true,
          nicNumber: profile.nicNumber,
        },
        { status: 400 }
      );
    }

    // Allow resubmission if previously rejected
    // Clear rejection fields when resubmitting
    profile.nicRejectionReason = undefined;
    profile.nicRejectedAt = undefined;

    // Update profile with NIC verification images
    profile.nicFrontImageUrl = nicFrontImageUrl;
    profile.nicBackImageUrl = nicBackImageUrl;
    profile.nicVerified = false; // Awaiting admin verification
    
    await profile.save();

    return NextResponse.json({
      message: 'NIC images submitted successfully. Your verification is pending admin review.',
      nicVerified: false,
      requiresReview: true,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('NIC verification error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to submit NIC images' },
      { status: 500 }
    );
  }
});

