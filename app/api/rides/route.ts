import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/middleware';
import connectDB from '@/lib/mongodb';
import { Ride } from '@/models/Ride';
import { Profile } from '@/models/Profile';
import { z } from 'zod';

const createRideSchema = z.object({
  type: z.enum(['offering', 'seeking']),
  startLocation: z.string().min(1),
  endLocation: z.string().min(1),
  rideDate: z.string(),
  rideTime: z.string(),
  seatsAvailable: z.number().optional(),
  description: z.string().optional(),
  phone: z.string().optional(),
  expiresAt: z.string(),
  communityId: z.string().optional().nullable(),
  recurringDays: z.array(z.string()).optional(),
});

// Transform ride from MongoDB format to API format (snake_case for frontend compatibility)
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

export const GET = async (req: NextRequest) => {
  try {
    await connectDB();

    const searchParams = req.nextUrl.searchParams;
    const searchQuery = searchParams.get('search') || '';
    const communityId = searchParams.get('communityId');
    const type = searchParams.get('type');
    const userId = searchParams.get('userId'); // For "My Rides" - show expired/archived rides
    const sortBy = searchParams.get('sortBy') || 'newest';
    const filterType = searchParams.get('filterType') || 'all';

    let query: any = {};
    
    if (communityId) {
      query.communityId = communityId;
    }
    
    // Only apply type filter if it's a valid ride type (not 'all' or 'verified')
    if (type && type !== 'all' && type !== 'verified') {
      query.type = type;
    }

    // If userId is provided (My Rides), filter by user and don't filter expired/archived
    if (userId) {
      query.userId = userId;
    } else {
      // Otherwise, filter out expired and archived rides
      query.isArchived = { $ne: true };
      const now = new Date();
      query.expiresAt = { $gt: now };
    }

    // Determine sort order
    let sortOrder: any = { createdAt: -1 }; // Default to newest first
    if (sortBy === 'oldest') {
      sortOrder = { createdAt: 1 };
    } else if (sortBy === 'date') {
      // For date sorting, we'll sort by rideDate and rideTime
      sortOrder = { rideDate: 1, rideTime: 1 };
    }

    let rides = await Ride.find(query)
      .sort(sortOrder)
      .lean();

    // Apply text search if provided
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      rides = rides.filter((ride: any) =>
        (ride.startLocation || '').toLowerCase().includes(lowerQuery) ||
        (ride.endLocation || '').toLowerCase().includes(lowerQuery) ||
        (ride.description || '').toLowerCase().includes(lowerQuery)
      );
    }

    // Fetch profiles for each ride
    const ridesWithProfiles = await Promise.all(
      rides.map(async (ride: any) => {
        const profile = await Profile.findOne({ userId: ride.userId || ride.user_id }).lean();
        return transformRide(ride, profile || undefined);
      })
    );

    // Apply client-side filters
    let filteredRides = ridesWithProfiles;

    // Filter by verification status if "verified" filter is selected
    if (filterType === 'verified') {
      filteredRides = filteredRides.filter((ride: any) => ride.profiles?.nic_verified === true);
    }

    // Apply sorting (if not already sorted by MongoDB query, or for date sorting)
    if (sortBy === 'date') {
      // Date sorting needs to be done client-side since it combines rideDate and rideTime
      filteredRides.sort((a: any, b: any) => {
        const dateA = new Date(`${a.ride_date} ${a.ride_time}`);
        const dateB = new Date(`${b.ride_date} ${b.ride_time}`);
        return dateA.getTime() - dateB.getTime();
      });
    } else if (sortBy === 'oldest') {
      // Ensure oldest-first sorting (MongoDB already sorted, but ensure consistency)
      filteredRides.sort((a: any, b: any) => {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
    }
    // 'newest' is already sorted by MongoDB query

    return NextResponse.json({ rides: filteredRides });
  } catch (error: any) {
    console.error('Get rides error:', error);
    return NextResponse.json(
      { error: 'Failed to get rides' },
      { status: 500 }
    );
  }
};

export const POST = authMiddleware(async (req) => {
  try {
    await connectDB();
    const userId = req.userId!;

    const body = await req.json();
    const data = createRideSchema.parse(body);

    const ride = new Ride({
      userId,
      type: data.type,
      startLocation: data.startLocation,
      endLocation: data.endLocation,
      rideDate: new Date(data.rideDate),
      rideTime: data.rideTime,
      seatsAvailable: data.seatsAvailable,
      description: data.description,
      phone: data.phone,
      expiresAt: new Date(data.expiresAt),
      communityId: data.communityId || null,
      recurringDays: data.recurringDays || [],
    });
    await ride.save();

    const profile = await Profile.findOne({ userId }).lean();

    return NextResponse.json({
      ride: transformRide(ride, profile || undefined),
    }, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Create ride error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create ride' },
      { status: 500 }
    );
  }
});