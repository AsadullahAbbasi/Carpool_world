import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/middleware';
import connectDB from '@/lib/mongodb';
import { Ride } from '@/models/Ride';

export const GET = authMiddleware(async (req) => {
    try {
        await connectDB();
        const userId = req.userId!;
        const now = new Date();

        // Find active ride
        const activeRide = await Ride.findOne({
            userId,
            isArchived: { $ne: true },
            expiresAt: { $gt: now },
        }).lean();

        // Find most recent expired ride
        const expiredRide = await Ride.findOne({
            userId,
            $or: [
                { isArchived: true },
                { expiresAt: { $lte: now } }
            ]
        }).sort({ createdAt: -1 }).lean();

        return NextResponse.json({
            hasActiveRide: !!activeRide,
            hasExpiredRide: !!expiredRide,
            activeRide: activeRide ? {
                id: activeRide._id?.toString(),
                type: activeRide.type,
                startLocation: activeRide.startLocation,
                endLocation: activeRide.endLocation,
            } : null,
            expiredRide: expiredRide ? {
                id: expiredRide._id?.toString(),
                type: expiredRide.type,
                startLocation: expiredRide.startLocation,
                endLocation: expiredRide.endLocation,
            } : null,
        });
    } catch (error: any) {
        console.error('Check rides error:', error);
        return NextResponse.json(
            { error: 'Failed to check rides' },
            { status: 500 }
        );
    }
});
