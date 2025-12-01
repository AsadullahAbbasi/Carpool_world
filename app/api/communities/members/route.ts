import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/middleware';
import connectDB from '@/lib/mongodb';
import { CommunityMember } from '@/models/CommunityMember';
import { Community } from '@/models/Community';
import { z } from 'zod';

const joinLeaveSchema = z.object({
  communityId: z.string(),
});

export const GET = authMiddleware(async (req) => {
  try {
    await connectDB();
    const userId = req.userId!;

    const memberships = await CommunityMember.find({ userId }).lean();

    return NextResponse.json({
      communities: memberships.map((m) => m.communityId),
    });
  } catch (error: any) {
    console.error('Get memberships error:', error);
    return NextResponse.json(
      { error: 'Failed to get memberships' },
      { status: 500 }
    );
  }
});

export const POST = authMiddleware(async (req) => {
  try {
    await connectDB();
    const userId = req.userId!;

    const body = await req.json();
    const { communityId } = joinLeaveSchema.parse(body);

    // Check if community exists
    const community = await Community.findById(communityId);
    if (!community) {
      return NextResponse.json(
        { error: 'Community not found' },
        { status: 404 }
      );
    }

    // Check if already a member
    const existing = await CommunityMember.findOne({
      communityId,
      userId,
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Already a member' },
        { status: 400 }
      );
    }

    await CommunityMember.create({
      communityId,
      userId,
    });

    return NextResponse.json({ message: 'Joined community successfully' }, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'Already a member' },
        { status: 400 }
      );
    }

    console.error('Join community error:', error);
    return NextResponse.json(
      { error: 'Failed to join community' },
      { status: 500 }
    );
  }
});

export const DELETE = authMiddleware(async (req) => {
  try {
    await connectDB();
    const userId = req.userId!;

    const searchParams = req.nextUrl.searchParams;
    const communityId = searchParams.get('communityId');

    if (!communityId) {
      return NextResponse.json(
        { error: 'communityId is required' },
        { status: 400 }
      );
    }

    // Check if user is the creator
    const community = await Community.findById(communityId);
    if (community?.createdBy === userId) {
      return NextResponse.json(
        { error: 'Community creators cannot leave their own communities' },
        { status: 400 }
      );
    }

    await CommunityMember.deleteOne({
      communityId,
      userId,
    });

    return NextResponse.json({ message: 'Left community successfully' });
  } catch (error: any) {
    console.error('Leave community error:', error);
    return NextResponse.json(
      { error: 'Failed to leave community' },
      { status: 500 }
    );
  }
});
