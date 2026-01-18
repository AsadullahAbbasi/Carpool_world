import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/middleware';
import connectDB from '@/lib/mongodb';
import { Ride } from '@/models/Ride';
import { Profile } from '@/models/Profile';
import { z } from 'zod';

const createRideSchema = z.object({
  type: z.enum(['offering', 'seeking']),
  genderPreference: z.enum(['girls_only', 'boys_only', 'both']),
  startLocation: z.string().min(1),
  endLocation: z.string().min(1),
  rideDate: z.string(),
  rideTime: z.string(),
  seatsAvailable: z.number().optional(),
  description: z.string().max(200, 'Description must be 200 characters or less').optional(),
  phone: z.string().optional(),
  expiresAt: z.string(),
  communityIds: z.array(z.string()).optional(),
  recurringDays: z.array(z.string()).optional(),
});

// Transform ride from MongoDB format to API format (snake_case for frontend compatibility)
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
    community_ids: ride.communityIds || ride.community_ids || [],
    recurring_days: ride.recurringDays || ride.recurring_days || [],
    profiles: profile ? {
      full_name: profile.fullName || profile.full_name || 'Unknown',
      nic_verified: profile.nicVerified || profile.nic_verified || false,
      disable_auto_expiry: profile.disableAutoExpiry || profile.disable_auto_expiry || false,
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
      query.communityIds = communityId; // Match if ride includes this community
    }

    // Only apply type filter if it's a valid ride type (not 'all' or 'verified')
    if (type && type !== 'all' && type !== 'verified') {
      query.type = type;
    }

    // If userId is provided (My Rides), filter by user and don't filter expired/archived
    if (userId) {
      query.userId = userId;
    } else {
      // Otherwise, filter out archived rides
      query.isArchived = { $ne: true };

      // We'll handle expiration filtering after fetching profiles 
      // OR we can use a complex query if we want to do it in MongoDB.
      // For now, let's fetch more and filter in memory since we need profile data anyway.
    }

    // Determine sort order
    // Use updatedAt to reflect most recent edits/reactivations
    let sortOrder: any = { updatedAt: -1 }; // Default to newest (most recently updated) first
    if (sortBy === 'oldest') {
      sortOrder = { updatedAt: 1 };
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

    // Bulk fetch profiles for all rides
    const userIds = Array.from(new Set(rides.map((ride: any) => ride.userId)));
    const profiles = await Profile.find({ userId: { $in: userIds } }).lean();
    const profileMap = new Map(profiles.map(p => [p.userId, p]));

    // Transform rides and apply expiry filtering
    const now = new Date();
    const ridesWithProfiles = [];

    for (const ride of rides) {
      const profile = profileMap.get(ride.userId);
      const transformed = transformRide(ride, profile || undefined);

      // If not "My Rides" view, filter out expired rides UNLESS disableAutoExpiry is true
      if (!userId) {
        const isActuallyExpired = new Date(transformed.expires_at) <= now && !transformed.profiles?.disable_auto_expiry;
        if (!isActuallyExpired) {
          ridesWithProfiles.push(transformed);
        }
      } else {
        ridesWithProfiles.push(transformed);
      }
    }

    // Apply client-side filters
    let filteredRides = ridesWithProfiles;

    // Filter by verification status if "verified" filter is selected
    if (filterType === 'verified') {
      filteredRides = filteredRides.filter((ride: any) => ride.profiles?.nic_verified === true);
    }

    // Filter by gender preference if selected
    if (filterType === 'girls_only' || filterType === 'boys_only' || filterType === 'both') {
      filteredRides = filteredRides.filter((ride: any) => ride.gender_preference === filterType);
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
        return new Date(a.updated_at || a.created_at).getTime() - new Date(b.updated_at || b.created_at).getTime();
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

    // Check for existing active rides
    const now = new Date();
    const userProfile = await Profile.findOne({ userId }).lean();

    // Find all non-archived rides for this user
    const existingRides = await Ride.find({
      userId,
      isArchived: { $ne: true },
    }).lean();

    // Check if any are "active" (either not chronologicaly expired OR auto-expiry is disabled)
    const activeRide = existingRides.find(ride => {
      const isChronologicallyActive = new Date(ride.expiresAt) > now;
      const isAutoExpiryDisabled = userProfile?.disableAutoExpiry === true;
      return isChronologicallyActive || isAutoExpiryDisabled;
    });

    if (activeRide) {
      return NextResponse.json(
        {
          error: 'You already have an active ride',
          hasActiveRide: true,
          rideId: activeRide._id?.toString(),
        },
        { status: 400 }
      );
    }

    // Check for existing expired rides
    const existingExpiredRide = await Ride.findOne({
      userId,
      $or: [
        { isArchived: true },
        { expiresAt: { $lte: now } }
      ]
    }).lean();

    const ride = new Ride({
      userId,
      type: data.type,
      genderPreference: data.genderPreference,
      startLocation: data.startLocation,
      endLocation: data.endLocation,
      rideDate: new Date(data.rideDate),
      rideTime: data.rideTime,
      seatsAvailable: data.seatsAvailable,
      description: data.description,
      phone: data.phone,
      expiresAt: new Date(data.expiresAt),
      communityIds: data.communityIds || [],
      recurringDays: data.recurringDays || [],
    });
    await ride.save();

    const profile = await Profile.findOne({ userId }).lean();

    return NextResponse.json({
      ride: transformRide(ride, profile || undefined),
      hasExpiredRide: !!existingExpiredRide,
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