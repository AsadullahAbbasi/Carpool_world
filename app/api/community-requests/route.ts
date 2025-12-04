import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/middleware';
import connectDB from '@/lib/mongodb';
import { CommunityRequest } from '@/models/CommunityRequest';
import { Community } from '@/models/Community';
import { CommunityMember } from '@/models/CommunityMember';
import { User } from '@/models/User';
import { Profile } from '@/models/Profile';
import { z } from 'zod';

const createCommunityRequestSchema = z.object({
  name: z.string().min(1, 'Community name is required'),
  description: z.string().min(1, 'Description is required'),
});

// Admin check function
function isAdmin(req: NextRequest): boolean {
  const token = req.cookies.get('token')?.value;
  if (!token) {
    return false;
  }

  try {
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    const decoded = jwt.verify(token, JWT_SECRET);
    // Check if user is admin (userId === 'admin' or email matches admin email)
    return decoded.userId === 'admin' || decoded.email === process.env.ADMIN_EMAIL;
  } catch (error: any) {
    return false;
  }
}

// POST - Submit a community request
export const POST = authMiddleware(async (req) => {
  try {
    await connectDB();
    const userId = req.userId!;

    const body = await req.json();
    const data = createCommunityRequestSchema.parse(body);

    // Check if a community with this name already exists
    const existingCommunity = await Community.findOne({ name: data.name });
    if (existingCommunity) {
      return NextResponse.json(
        { error: 'A community with this name already exists' },
        { status: 400 }
      );
    }

    // Check if there's already a pending request with this name
    const existingRequest = await CommunityRequest.findOne({
      name: data.name,
      status: 'pending',
    });
    if (existingRequest) {
      return NextResponse.json(
        { error: 'A request for this community name is already pending' },
        { status: 400 }
      );
    }

    const request = new CommunityRequest({
      name: data.name,
      description: data.description,
      requestedBy: userId,
      status: 'pending',
    });

    await request.save();

    return NextResponse.json({
      request: {
        id: request._id.toString(),
        name: request.name,
        description: request.description,
        status: request.status,
        requestedBy: request.requestedBy,
        createdAt: request.createdAt,
      },
    }, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Create community request error:', error);
    return NextResponse.json(
      { error: 'Failed to submit community request' },
      { status: 500 }
    );
  }
});

// GET - Get community requests (admin only) or user's own requests
export const GET = async (req: NextRequest) => {
  try {
    await connectDB();

    const token = req.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'pending';
    const userId = searchParams.get('userId'); // For users to get their own requests

    // If userId param is provided and matches the logged-in user, return their requests
    if (userId && (decoded.userId === userId || decoded.userId === 'admin')) {
      const requests = await CommunityRequest.find({ requestedBy: userId })
        .sort({ createdAt: -1 })
        .lean();

      const requestsWithUserInfo = await Promise.all(
        requests.map(async (req: any) => {
          const user = await User.findById(req.requestedBy);
          const profile = user ? await Profile.findOne({ userId: user._id.toString() }) : null;

          return {
            id: req._id.toString(),
            name: req.name,
            description: req.description,
            status: req.status,
            requestedBy: req.requestedBy,
            requestedByEmail: user?.email || 'Unknown',
            requestedByUsername: profile?.fullName || user?.email || 'Unknown',
            reviewedBy: req.reviewedBy,
            reviewedAt: req.reviewedAt,
            rejectionReason: req.rejectionReason,
            createdAt: req.createdAt,
            updatedAt: req.updatedAt,
          };
        })
      );

      return NextResponse.json({
        requests: requestsWithUserInfo,
      });
    }

    // Admin-only: get all requests by status
    if (!isAdmin(req)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const requests = await CommunityRequest.find({ status })
      .sort({ createdAt: -1 })
      .lean();

    // Populate user information
    const requestsWithUserInfo = await Promise.all(
      requests.map(async (req: any) => {
        const user = await User.findById(req.requestedBy);
        const profile = user ? await Profile.findOne({ userId: user._id.toString() }) : null;

        return {
          id: req._id.toString(),
          name: req.name,
          description: req.description,
          status: req.status,
          requestedBy: req.requestedBy,
          requestedByEmail: user?.email || 'Unknown',
          requestedByUsername: profile?.fullName || user?.email || 'Unknown',
          reviewedBy: req.reviewedBy,
          reviewedAt: req.reviewedAt,
          rejectionReason: req.rejectionReason,
          createdAt: req.createdAt,
          updatedAt: req.updatedAt,
        };
      })
    );

    return NextResponse.json({
      requests: requestsWithUserInfo,
    });
  } catch (error: any) {
    console.error('Get community requests error:', error);
    return NextResponse.json(
      { error: 'Failed to get community requests' },
      { status: 500 }
    );
  }
};

