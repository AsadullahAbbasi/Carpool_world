import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/middleware';
import connectDB from '@/lib/mongodb';
import { Ride } from '@/models/Ride';
import { Profile } from '@/models/Profile';
import { z } from 'zod';

const updateRideSchema = z.object({
  type: z.enum(['offering', 'seeking']).optional(),
  genderPreference: z.enum(['girls_only', 'boys_only', 'both']).optional(),
  startLocation: z.string().min(1).optional(),
  endLocation: z.string().min(1).optional(),
  rideDate: z.string().optional(),
  rideTime: z.string().optional(),
  seatsAvailable: z.number().optional(),
  description: z.string().max(200, 'Description must be 200 characters or less').optional(),
  phone: z.string().optional(),
  expiresAt: z.string().optional(),
  isArchived: z.boolean().optional(),
  communityId: z.string().nullable().optional(),
  communityIds: z.array(z.string()).optional(),
  recurringDays: z.array(z.string()).optional(),
});

// Transform ride from MongoDB format to API format
function transformRide(ride: any, profile?: any) {
  return {
    id: ride._id?.toString() || ride.id,
    type: ride.type,
    gender_preference: ride.genderPreference || ride.gender_preference,
    start_location: ride.startLocation || ride.start_location,
    end_location: ride.endLocation || ride.end_location,
    ride_date: ride.rideDate ? new Date(ride.rideDate).toISOString().split('T')[0] : ride.ride_date,
    ride_time: ride.rideTime || ride.ride_time,
    seats_available: ride.seatsAvailable ?? ride.seats_available,
    description: ride.description,
    phone: ride.phone,
    expires_at: ride.expiresAt ? new Date(ride.expiresAt).toISOString() : (ride.expires_at || new Date().toISOString()),
    is_archived: ride.isArchived || ride.is_archived || false,
    user_id: ride.userId || ride.user_id,
    created_at: ride.createdAt ? new Date(ride.createdAt).toISOString() : (ride.created_at || new Date().toISOString()),
    updated_at: ride.updatedAt ? new Date(ride.updatedAt).toISOString() : (ride.updated_at || ride.createdAt ? new Date(ride.createdAt).toISOString() : new Date().toISOString()),
    community_id: ride.communityId ?? ride.community_id,
    community_ids: ride.communityIds || ride.community_ids || [],
    recurring_days: ride.recurringDays || ride.recurring_days || [],
    profiles: profile ? {
      full_name: profile.fullName || profile.full_name || 'Unknown',
      nic_verified: profile.nicVerified || profile.nic_verified || false,
      disable_auto_expiry: profile.disableAutoExpiry || profile.disable_auto_expiry || false,
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

    // Prepare update object for database-level update
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0); // Set to start of day

    // Get current time in HH:MM format (24-hour)
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const updateData: any = {
      // Always update rideDate to current date when updating a ride
      rideDate: today,
      // Always update rideTime to current time when updating a ride
      rideTime: currentTime,
      // Track update time explicitly
      updatedAt: now,
    };

    // Update other fields if provided
    if (data.type !== undefined) updateData.type = data.type;
    if (data.startLocation !== undefined) updateData.startLocation = data.startLocation;
    if (data.endLocation !== undefined) updateData.endLocation = data.endLocation;
    if (data.genderPreference !== undefined) updateData.genderPreference = data.genderPreference;
    if (data.seatsAvailable !== undefined) updateData.seatsAvailable = data.seatsAvailable;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.expiresAt !== undefined) updateData.expiresAt = new Date(data.expiresAt);
    if (data.isArchived !== undefined) updateData.isArchived = data.isArchived;
    if (data.communityId !== undefined) updateData.communityId = data.communityId ?? undefined;
    if (data.communityIds !== undefined) updateData.communityIds = data.communityIds || [];
    if (data.recurringDays !== undefined) updateData.recurringDays = data.recurringDays || [];

    // Log timestamp changes for debugging


    // Use findByIdAndUpdate for database-level update
    const updatedRide = await Ride.findByIdAndUpdate(
      rideId,
      { $set: updateData },
      { new: true, runValidators: true, timestamps: true }
    );

    if (!updatedRide) {
      return NextResponse.json(
        { error: 'Failed to update ride' },
        { status: 500 }
      );
    }

    const profile = await Profile.findOne({ userId }).lean();

    return NextResponse.json({
      ride: transformRide(updatedRide, profile || undefined),
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