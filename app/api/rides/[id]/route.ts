import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/middleware';
import connectDB from '@/lib/mongodb';
import { Ride } from '@/models/Ride';
import { Profile } from '@/models/Profile';
import { z } from 'zod';

const updateRideSchema = z.object({
  type: z.enum(['offering', 'seeking']).optional(),
  startLocation: z.string().min(1).optional(),
  endLocation: z.string().min(1).optional(),
  rideDate: z.string().optional(),
  rideTime: z.string().optional(),
  seatsAvailable: z.number().optional(),
  description: z.string().optional(),
  phone: z.string().optional(),
  expiresAt: z.string().optional(),
  isArchived: z.boolean().optional(),
  communityId: z.string().nullable().optional(),
  recurringDays: z.array(z.string()).optional(),
});

// Transform ride from MongoDB format to API format
function transformRide(ride: any, profile?: any) {
  return {
    id: ride._id?.toString() || ride.id,
    type: ride.type,
    start_location: ride.startLocation || ride.start_location,
    end_location: ride.endLocation || ride.end_location,
    ride_date: ride.rideDate ? new Date(ride.rideDate).toISOString().split('T')[0] : ride.ride_date,
    ride_time: ride.rideTime || ride.ride_time,
    seats_available: ride.seatsAvailable ?? ride.seats_available,
    description: ride.description,
    phone: ride.phone,
    expires_at: ride.expiresAt ? new Date(ride.expiresAt).toISOString() : ride.expires_at,
    is_archived: ride.isArchived || false,
    user_id: ride.userId || ride.user_id,
    created_at: ride.createdAt ? new Date(ride.createdAt).toISOString() : ride.created_at,
    updated_at: ride.updatedAt ? new Date(ride.updatedAt).toISOString() : ride.updated_at,
    community_id: ride.communityId ?? ride.community_id,
    recurring_days: ride.recurringDays || ride.recurring_days || [],
    profiles: profile ? {
      full_name: profile.fullName || profile.full_name,
      nic_verified: profile.nicVerified !== undefined ? profile.nicVerified : (profile.nic_verified !== undefined ? profile.nic_verified : false),
    } : null,
  };
}

export const PUT = authMiddleware(async (req) => {
  try {
    await connectDB();
    const userId = req.userId!;
    const rideId = req.nextUrl.pathname.split('/').pop()!;

    const body = await req.json();
    const data = updateRideSchema.parse(body);

    const ride = await Ride.findById(rideId);
    if (!ride) {
      return NextResponse.json(
        { error: 'Ride not found' },
        { status: 404 }
      );
    }

    if (ride.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Update fields
    if (data.type !== undefined) ride.type = data.type;
    if (data.startLocation !== undefined) ride.startLocation = data.startLocation;
    if (data.endLocation !== undefined) ride.endLocation = data.endLocation;
    if (data.rideDate !== undefined) ride.rideDate = new Date(data.rideDate);
    if (data.rideTime !== undefined) ride.rideTime = data.rideTime;
    if (data.seatsAvailable !== undefined) ride.seatsAvailable = data.seatsAvailable;
    if (data.description !== undefined) ride.description = data.description;
    if (data.phone !== undefined) ride.phone = data.phone;
    if (data.expiresAt !== undefined) ride.expiresAt = new Date(data.expiresAt);
    if (data.isArchived !== undefined) ride.isArchived = data.isArchived;
    if (data.communityId !== undefined) ride.communityId = data.communityId ?? undefined;
    if (data.recurringDays !== undefined) ride.recurringDays = data.recurringDays || [];

    await ride.save();

    const profile = await Profile.findOne({ userId }).lean();

    return NextResponse.json({
      ride: transformRide(ride, profile || undefined),
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Update ride error:', error);
    return NextResponse.json(
      { error: 'Failed to update ride' },
      { status: 500 }
    );
  }
});

export const DELETE = authMiddleware(async (req) => {
  try {
    await connectDB();
    const userId = req.userId!;
    const rideId = req.nextUrl.pathname.split('/').pop()!;

    const ride = await Ride.findById(rideId);
    if (!ride) {
      return NextResponse.json(
        { error: 'Ride not found' },
        { status: 404 }
      );
    }

    if (ride.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    await Ride.deleteOne({ _id: rideId });

    return NextResponse.json({ message: 'Ride deleted successfully' });
  } catch (error: any) {
    console.error('Delete ride error:', error);
    return NextResponse.json(
      { error: 'Failed to delete ride' },
      { status: 500 }
    );
  }
});