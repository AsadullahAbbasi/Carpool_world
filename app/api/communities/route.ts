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

    const communities = await Community.aggregate([
      {
        $lookup: {
          from: 'communitymembers',
          let: { communityId: { $toString: '$_id' } },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ['$communityId', '$$communityId'] },
                    { $eq: ['$communityId', { $toObjectId: '$$communityId' }] }
                  ]
                }
              }
            }
          ],
          as: 'members'
        }
      },
      {
        $lookup: {
          from: 'rides',
          let: { communityId: { $toString: '$_id' } },
          pipeline: [
            {
              $match: {
                $and: [
                  { isArchived: { $ne: true } },
                  {
                    $expr: {
                      $or: [
                        // Check in communityIds array (new format)
                        { $in: ['$$communityId', { $ifNull: ['$communityIds', []] }] },
                        { $in: [{ $toObjectId: '$$communityId' }, { $ifNull: ['$communityIds', []] }] },
                        // Check communityId singular (legacy format)
                        { $eq: ['$communityId', '$$communityId'] },
                        { $eq: ['$communityId', { $toObjectId: '$$communityId' }] }
                      ]
                    }
                  }
                ]
              }
            }
          ],
          as: 'rides'
        }
      },
      {
        $project: {
          name: 1,
          description: 1,
          createdBy: 1,
          createdAt: 1,
          updatedAt: 1,
          memberCount: { $size: '$members' },
          rideCount: { $size: '$rides' }
        }
      },
      { $sort: { createdAt: -1 } }
    ]);

    return NextResponse.json({
      communities: communities.map((c: any) => ({
        id: c._id.toString(),
        name: c.name,
        description: c.description,
        created_by: c.createdBy,
        created_at: c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString(),
        updated_at: c.updatedAt ? new Date(c.updatedAt).toISOString() : new Date().toISOString(),
        memberCount: c.memberCount || 0,
        rideCount: c.rideCount || 0,
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
