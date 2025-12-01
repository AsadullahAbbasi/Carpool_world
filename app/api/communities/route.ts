import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/middleware';
import connectDB from '@/lib/mongodb';
import { Community } from '@/models/Community';
import { CommunityMember } from '@/models/CommunityMember';
import { z } from 'zod';

const createCommunitySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

export const GET = async (req: NextRequest) => {
  try {
    await connectDB();

    const communities = await Community.find().sort({ createdAt: -1 }).lean();

    return NextResponse.json({
      communities: communities.map((c: any) => ({
        id: c._id.toString(),
        name: c.name,
        description: c.description,
        created_by: c.createdBy,
        created_at: c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString(),
        updated_at: c.updatedAt ? new Date(c.updatedAt).toISOString() : new Date().toISOString(),
      })),
    });
  } catch (error: any) {
    console.error('Get communities error:', error);
    return NextResponse.json(
      { error: 'Failed to get communities' },
      { status: 500 }
    );
  }
};

export const POST = authMiddleware(async (req) => {
  try {
    await connectDB();
    const userId = req.userId!;

    const body = await req.json();
    const data = createCommunitySchema.parse(body);

    const community = new Community({
      ...data,
      createdBy: userId,
    });
    await community.save();

    // Auto-join creator
    await CommunityMember.create({
      communityId: community._id.toString(),
      userId,
    });

    return NextResponse.json({
      community: {
        ...community.toObject(),
        id: community._id.toString(),
      },
    }, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Create community error:', error);
    return NextResponse.json(
      { error: 'Failed to create community' },
      { status: 500 }
    );
  }
});
