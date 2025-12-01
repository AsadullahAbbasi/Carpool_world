import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/middleware';
import connectDB from '@/lib/mongodb';
import { Community } from '@/models/Community';
import { z } from 'zod';

const updateCommunitySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
});

export const PUT = authMiddleware(async (req) => {
  try {
    await connectDB();
    const userId = req.userId!;
    const communityId = req.nextUrl.pathname.split('/').pop()!;

    const body = await req.json();
    const data = updateCommunitySchema.parse(body);

    const community = await Community.findById(communityId);
    if (!community) {
      return NextResponse.json(
        { error: 'Community not found' },
        { status: 404 }
      );
    }

    if (community.createdBy !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    Object.assign(community, data);
    await community.save();

    return NextResponse.json({
      community: {
        ...community.toObject(),
        id: community._id.toString(),
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Update community error:', error);
    return NextResponse.json(
      { error: 'Failed to update community' },
      { status: 500 }
    );
  }
});

export const DELETE = authMiddleware(async (req) => {
  try {
    await connectDB();
    const userId = req.userId!;
    const communityId = req.nextUrl.pathname.split('/').pop()!;

    const community = await Community.findById(communityId);
    if (!community) {
      return NextResponse.json(
        { error: 'Community not found' },
        { status: 404 }
      );
    }

    if (community.createdBy !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    await Community.deleteOne({ _id: communityId });

    return NextResponse.json({ message: 'Community deleted successfully' });
  } catch (error: any) {
    console.error('Delete community error:', error);
    return NextResponse.json(
      { error: 'Failed to delete community' },
      { status: 500 }
    );
  }
});
