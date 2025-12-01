import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/middleware';
import connectDB from '@/lib/mongodb';
import { Review } from '@/models/Review';
import { z } from 'zod';

const updateReviewSchema = z.object({
    rating: z.number().min(1).max(5).optional(),
    comment: z.string().optional(),
});

export const PUT = authMiddleware(async (req, { params }: { params: { id: string } }) => {
    try {
        await connectDB();
        const reviewId = params.id;
        const userId = req.userId!;

        const body = await req.json();
        const data = updateReviewSchema.parse(body);

        const review = await Review.findOne({ _id: reviewId, reviewerId: userId });

        if (!review) {
            return NextResponse.json(
                { error: 'Review not found or you are not authorized to edit it' },
                { status: 404 }
            );
        }

        if (data.rating) review.rating = data.rating;
        if (data.comment !== undefined) review.comment = data.comment;

        await review.save();

        return NextResponse.json({
            review: {
                ...review.toObject(),
                id: review._id.toString(),
            },
        });
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Validation error', details: error.errors },
                { status: 400 }
            );
        }

        console.error('Update review error:', error);
        return NextResponse.json(
            { error: 'Failed to update review' },
            { status: 500 }
        );
    }
});
