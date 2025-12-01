import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/middleware';
import connectDB from '@/lib/mongodb';
import { Review } from '@/models/Review';
import { z } from 'zod';

const createReviewSchema = z.object({
  rideId: z.string(),
  driverId: z.string(),
  rating: z.number().min(1).max(5),
  comment: z.string().optional(),
});

export const POST = authMiddleware(async (req) => {
  try {
    await connectDB();
    const reviewerId = req.userId!;

    const body = await req.json();
    const data = createReviewSchema.parse(body);

    // Check if review already exists
    const existingReview = await Review.findOne({
      rideId: data.rideId,
      reviewerId,
    });

    if (existingReview) {
      return NextResponse.json(
        { error: 'You have already reviewed this ride' },
        { status: 400 }
      );
    }

    const review = new Review({
      ...data,
      reviewerId,
    });
    await review.save();

    return NextResponse.json({
      review: {
        ...review.toObject(),
        id: review._id.toString(),
      },
    }, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'You have already reviewed this ride' },
        { status: 400 }
      );
    }

    console.error('Create review error:', error);
    return NextResponse.json(
      { error: 'Failed to create review' },
      { status: 500 }
    );
  }
});

export const GET = authMiddleware(async (req) => {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const rideId = searchParams.get('rideId');
    const driverId = searchParams.get('driverId');

    const query: any = {};
    if (rideId) query.rideId = rideId;
    if (driverId) query.driverId = driverId;

    const reviews = await Review.find(query)
      .sort({ createdAt: -1 })
      .populate('reviewerId', 'fullName avatarUrl')
      .lean();

    const formattedReviews = reviews.map((review: any) => ({
      ...review,
      id: review._id.toString(),
      reviewer: review.reviewerId ? {
        fullName: review.reviewerId.fullName,
        avatarUrl: review.reviewerId.avatarUrl,
      } : null,
    }));

    return NextResponse.json({ reviews: formattedReviews });
  } catch (error: any) {
    console.error('Fetch reviews error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
});
