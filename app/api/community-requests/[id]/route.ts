import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { CommunityRequest } from '@/models/CommunityRequest';
import { Community } from '@/models/Community';
import { CommunityMember } from '@/models/CommunityMember';
import { User } from '@/models/User';
import { Profile } from '@/models/Profile';
import { sendCommunityApprovalEmail, sendCommunityRejectionEmail } from '@/lib/resend-client';
import { z } from 'zod';

const updateRequestSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  rejectionReason: z.string().optional(),
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
    return decoded.userId === 'admin' || decoded.email === process.env.ADMIN_EMAIL;
  } catch (error: any) {
    return false;
  }
}

// PUT - Approve or reject a community request (admin only)
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!isAdmin(req)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    await connectDB();

    const requestId = params.id;
    const body = await req.json();
    const data = updateRequestSchema.parse(body);

    const request = await CommunityRequest.findById(requestId);
    if (!request) {
      return NextResponse.json(
        { error: 'Community request not found' },
        { status: 404 }
      );
    }

    if (request.status !== 'pending') {
      return NextResponse.json(
        { error: 'This request has already been processed' },
        { status: 400 }
      );
    }

    // Get admin user ID from token
    const token = req.cookies.get('token')?.value;
    let adminUserId = 'admin';
    if (token) {
      try {
        const jwt = require('jsonwebtoken');
        const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
        const decoded = jwt.verify(token, JWT_SECRET);
        adminUserId = decoded.userId || 'admin';
      } catch (error) {
        // Use default
      }
    }

    // Update request status
    request.status = data.status;
    request.reviewedBy = adminUserId;
    request.reviewedAt = new Date();
    if (data.status === 'rejected' && data.rejectionReason) {
      request.rejectionReason = data.rejectionReason;
    }

    await request.save();

    // If approved, create the community
    if (data.status === 'approved') {
      // Check if community already exists (race condition check)
      const existingCommunity = await Community.findOne({ name: request.name });
      if (existingCommunity) {
        return NextResponse.json(
          { error: 'A community with this name already exists' },
          { status: 400 }
        );
      }

      const community = new Community({
        name: request.name,
        description: request.description,
        createdBy: request.requestedBy,
      });

      await community.save();

      // Auto-join the requester
      await CommunityMember.create({
        communityId: community._id.toString(),
        userId: request.requestedBy,
      });

      // Send approval email to requester
      try {
        const user = await User.findById(request.requestedBy).lean();
        const profile = await Profile.findOne({ userId: request.requestedBy }).lean();
        
        if (user && user.email) {
          await sendCommunityApprovalEmail(
            user.email,
            profile?.fullName || user.name || 'User',
            request.name
          );
        }
      } catch (emailError) {
        console.error('Failed to send community approval email:', emailError);
        // Don't block the response if email fails
      }

      return NextResponse.json({
        message: 'Community request approved and community created',
        request: {
          id: request._id.toString(),
          status: request.status,
        },
        community: {
          id: community._id.toString(),
          name: community.name,
        },
      });
    }

    // If rejected, send rejection email
    if (data.status === 'rejected') {
      try {
        const user = await User.findById(request.requestedBy).lean();
        const profile = await Profile.findOne({ userId: request.requestedBy }).lean();
        
        if (user && user.email) {
          await sendCommunityRejectionEmail(
            user.email,
            profile?.fullName || user.name || 'User',
            request.name,
            data.rejectionReason || 'Your community request does not meet our requirements at this time.'
          );
        }
      } catch (emailError) {
        console.error('Failed to send community rejection email:', emailError);
        // Don't block the response if email fails
      }
    }

    return NextResponse.json({
      message: 'Community request rejected',
      request: {
        id: request._id.toString(),
        status: request.status,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Update community request error:', error);
    return NextResponse.json(
      { error: 'Failed to update community request' },
      { status: 500 }
    );
  }
}

