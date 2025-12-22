import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Profile } from '@/models/Profile';
import { User } from '@/models/User';
import { sendNICApprovalEmail, sendNICRejectionEmail } from '@/lib/resend-client';
import { z } from 'zod';
import { validateNIC } from '@/lib/validation';
import { deleteFile } from '@/lib/storage';
import mongoose from 'mongoose';

// Extract publicId from Cloudinary URL
function extractPublicId(url: string): string | null {
  try {
    // Cloudinary URL format: https://res.cloudinary.com/{cloud_name}/image/upload/{public_id}.{ext}
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

// Admin middleware - check if user is admin
function isAdmin(req: NextRequest): boolean {
  // In a real app, you'd verify the JWT token and check for admin role
  // For now, we'll check the cookie
  const token = req.cookies.get('token')?.value;
  if (!token) {
    console.log('[Admin Auth] No token found');
    return false;
  }

  // Simple check - in production, verify JWT properly
  try {
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    const decoded = jwt.verify(token, JWT_SECRET);
    const isAdminUser = decoded.email === 'asad';
    return isAdminUser;
  } catch (error: any) {
    return false;
  }
}

const verifyNicSchema = z.object({
  profileId: z.string(),
  nicNumber: z.string().optional(),
  rejectionReason: z.string().optional(),
  verified: z.boolean(),
}).refine((data) => {
  if (data.verified) {
    return !!data.nicNumber && data.nicNumber.length >= 13 && data.nicNumber.length <= 15;
  }
  return true;
}, {
  message: "NIC number is required and must be valid when verifying",
  path: ["nicNumber"],
}).refine((data) => {
  if (!data.verified) {
    return !!data.rejectionReason && data.rejectionReason.length > 0;
  }
  return true;
}, {
  message: "Rejection reason is required when rejecting",
  path: ["rejectionReason"],
});

export async function GET(req: NextRequest) {
  try {
    if (!isAdmin(req)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    // Get all profiles with NIC images but not verified
    const profiles = await Profile.find({
      $or: [
        { nicFrontImageUrl: { $exists: true, $ne: null } },
        { nicBackImageUrl: { $exists: true, $ne: null } },
      ],
      nicVerified: false,
    })
      .sort({ updatedAt: -1 })
      .lean();

    // Get user info for profiles (username from profile, email from user)
    // Note: userId in Profile is stored as string, need to convert to ObjectId for User lookup
    const userIds = profiles.map(p => {
      try {
        return new mongoose.Types.ObjectId(p.userId);
      } catch {
        return null;
      }
    }).filter(id => id !== null) as mongoose.Types.ObjectId[];

    const users = await User.find({ _id: { $in: userIds } }).select('email _id').lean();
    const userMap = new Map(users.map(u => [u._id.toString(), u.email]));

    const profilesWithUsers = profiles.map((profile) => ({
      ...profile,
      username: profile.fullName || 'Unknown',
      userEmail: userMap.get(profile.userId) || 'Unknown',
    }));

    return NextResponse.json({
      profiles: profilesWithUsers,
    });
  } catch (error: any) {
    console.error('Admin get NIC verifications error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch NIC verifications' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!isAdmin(req)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const body = await req.json();
    const parseResult = verifyNicSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation error', details: parseResult.error.errors },
        { status: 400 }
      );
    }

    const { profileId, nicNumber, verified, rejectionReason } = parseResult.data;

    const profile = await Profile.findById(profileId);
    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Validate NIC number format if verifying
    if (verified && nicNumber) {
      const validation = validateNIC(nicNumber);
      if (!validation.valid) {
        return NextResponse.json(
          { error: 'Invalid NIC number format', details: validation.error || 'Invalid NIC format' },
          { status: 400 }
        );
      }
    }

    // Handle images based on verification status
    if (verified && nicNumber) {
      // Move images from temporary fields to permanent fields
      if (profile.nicFrontImageUrl) {
        profile.front = profile.nicFrontImageUrl;
        profile.nicFrontImageUrl = undefined;
      }
      if (profile.nicBackImageUrl) {
        profile.back = profile.nicBackImageUrl;
        profile.nicBackImageUrl = undefined;
      }
      profile.nicNumber = nicNumber;
      profile.nicVerified = true;

      // Clear rejection fields when approved
      profile.nicRejectionReason = undefined;
      profile.nicRejectedAt = undefined;
    } else {
      // Rejected: Delete images from Cloudinary
      const deletePromises: Promise<void>[] = [];

      if (profile.nicFrontImageUrl) {
        const publicId = extractPublicId(profile.nicFrontImageUrl);
        if (publicId) {
          deletePromises.push(deleteFile(publicId).catch(err => {
            console.error('Failed to delete front image:', err);
          }));
        }
      }

      if (profile.nicBackImageUrl) {
        const publicId = extractPublicId(profile.nicBackImageUrl);
        if (publicId) {
          deletePromises.push(deleteFile(publicId).catch(err => {
            console.error('Failed to delete back image:', err);
          }));
        }
      }

      // Delete images in parallel
      await Promise.all(deletePromises);

      // Clear temporary fields
      profile.nicFrontImageUrl = undefined;
      profile.nicBackImageUrl = undefined;
      profile.nicNumber = undefined;
      profile.nicVerified = false;

      // Store rejection reason
      profile.nicRejectionReason = rejectionReason || 'Your NIC verification was rejected. Please review and resubmit.';
      profile.nicRejectedAt = new Date();
    }

    await profile.save();

    // Send approval email if NIC was verified
    if (verified && nicNumber) {
      try {
        const user = await User.findById(profile.userId).lean();
        if (user && user.email && profile.nicNumber) {
          await sendNICApprovalEmail(
            user.email,
            profile.fullName || user.name || 'User',
            profile.nicNumber
          );
        }
      } catch (emailError) {
        console.error('Failed to send NIC approval email:', emailError);
        // Don't block the response if email fails
      }
    } else {
      // Send rejection email if NIC was rejected
      try {
        const user = await User.findById(profile.userId).lean();
        if (user && user.email && profile.nicRejectionReason) {
          await sendNICRejectionEmail(
            user.email,
            profile.fullName || user.name || 'User',
            profile.nicRejectionReason
          );
        }
      } catch (emailError) {
        console.error('Failed to send NIC rejection email:', emailError);
        // Don't block the response if email fails
      }
    }

    return NextResponse.json({
      message: verified ? 'NIC verified successfully' : 'NIC marked as invalid',
      profile: {
        id: profile._id,
        nicNumber: profile.nicNumber,
        nicVerified: profile.nicVerified,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Admin verify NIC error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to verify NIC' },
      { status: 500 }
    );
  }
}
