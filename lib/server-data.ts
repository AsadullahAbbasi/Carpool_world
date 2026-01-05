/**
 * Server-side data fetching utilities
 * Used in Server Components to pre-fetch data
 */

import { cookies } from 'next/headers';
import { verifyToken } from './auth';
import connectDB from './mongodb';
import { User } from '@/models/User';
import { Profile } from '@/models/Profile';
import { Ride } from '@/models/Ride';
import { Community } from '@/models/Community';
import { CommunityMember } from '@/models/CommunityMember';

export interface ServerUser {
  id: string;
  email: string;
  emailVerified: boolean;
}

export interface ServerProfile {
  id: string;
  fullName: string;
  phone?: string;
  avatarUrl?: string;
  gender?: string;
  nicNumber?: string;
  nicVerified?: boolean;
  disableAutoExpiry?: boolean;
}

export interface ServerRide {
  id: string;
  type: string;
  gender_preference?: string;
  start_location: string;
  end_location: string;
  ride_date: string;
  ride_time: string;
  seats_available?: number;
  description?: string;
  phone?: string;
  expires_at: string;
  is_archived?: boolean;
  user_id: string;
  created_at: string;
  updated_at?: string;
  community_id?: string | null;
  community_ids?: string[] | null;
  recurring_days?: string[] | null;
  profiles?: {
    full_name: string;
    nic_verified?: boolean;
    disable_auto_expiry?: boolean;
  } | null;
}

function transformRide(ride: any, profile?: any): ServerRide {
  return {
    id: ride._id.toString(),
    type: ride.type,
    gender_preference: ride.genderPreference || ride.gender_preference,
    start_location: ride.startLocation,
    end_location: ride.endLocation,
    ride_date: ride.rideDate ? new Date(ride.rideDate).toISOString().split('T')[0] : '',
    ride_time: ride.rideTime,
    seats_available: ride.seatsAvailable,
    description: ride.description,
    phone: ride.phone,
    expires_at: ride.expiresAt ? new Date(ride.expiresAt).toISOString() : new Date().toISOString(),
    is_archived: ride.isArchived || false,
    user_id: ride.userId || ride.user_id || '',
    created_at: ride.createdAt ? new Date(ride.createdAt).toISOString() : new Date().toISOString(),
    updated_at: ride.updatedAt ? new Date(ride.updatedAt).toISOString() : ride.createdAt ? new Date(ride.createdAt).toISOString() : new Date().toISOString(),
    community_id: ride.communityId || null,
    community_ids: ride.communityIds || ride.community_ids || [],
    recurring_days: ride.recurringDays || null,
    profiles: profile ? {
      full_name: profile.fullName || 'Unknown',
      nic_verified: profile.nicVerified || false,
      disable_auto_expiry: profile.disableAutoExpiry || false,
    } : null,
  };
}

/**
 * Get current user from server-side (cookies)
 */
export async function getServerUser(): Promise<{ user: ServerUser | null; profile: ServerProfile | null }> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      return { user: null, profile: null };
    }

    const payload = verifyToken(token);
    if (!payload) {
      return { user: null, profile: null };
    }

    // Handle admin user
    if (payload.userId === 'admin') {
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
      return {
        user: {
          id: 'admin',
          email: adminEmail,
          emailVerified: true,
        },
        profile: null,
      };
    }

    await connectDB();

    const user = await User.findById(payload.userId);
    if (!user) {
      return { user: null, profile: null };
    }

    const profile = await Profile.findOne({ userId: payload.userId });

    return {
      user: {
        id: user._id.toString(),
        email: user.email,
        emailVerified: user.emailVerified,
      },
      profile: profile ? {
        id: profile._id.toString(),
        fullName: profile.fullName,
        phone: profile.phone,
        avatarUrl: profile.avatarUrl,
        gender: profile.gender,
        nicNumber: profile.nicNumber,
        nicVerified: profile.nicVerified || false,
        disableAutoExpiry: profile.disableAutoExpiry || false,
      } : null,
    };
  } catch (error) {
    console.error('Server get user error:', error);
    return { user: null, profile: null };
  }
}

/**
 * Get rides from server-side
 */
export async function getServerRides(params?: {
  search?: string;
  communityId?: string;
  type?: string;
  userId?: string;
  sortBy?: string;
  filterType?: string;
}): Promise<ServerRide[]> {
  try {
    await connectDB();

    let query: any = {};

    if (params?.communityId) {
      query.$or = [
        { communityId: params.communityId },
        { communityIds: params.communityId }
      ];
    }

    if (params?.type && params.type !== 'all' && params.type !== 'verified') {
      query.type = params.type;
    }

    // If userId is provided (My Rides), filter by user and don't filter expired/archived
    if (params?.userId) {
      query.userId = params.userId;
    } else {
      // Otherwise, filter out archived rides
      // We'll filter out expired rides later after fetching profile settings
      query.isArchived = { $ne: true };
    }

    // Determine sort order
    let sortOrder: any = { createdAt: -1 }; // Default to newest first
    if (params?.sortBy === 'oldest') {
      sortOrder = { createdAt: 1 };
    } else if (params?.sortBy === 'date') {
      // For date sorting, we'll sort by rideDate and rideTime
      sortOrder = { rideDate: 1, rideTime: 1 };
    }

    // Use Mongo text index for search when provided (much faster than JS filtering)
    if (params?.search) {
      query.$text = { $search: params.search };
    }

    const rides = await Ride.find(query)
      .sort(sortOrder)
      .lean();

    // ---- N+1 FIX: fetch all needed profiles in ONE query ----
    const userIds = Array.from(
      new Set(
        rides
          .map((r: any) => (r.userId || r.user_id) as string | undefined)
          .filter(Boolean) as string[]
      )
    );

    const profiles = userIds.length
      ? await Profile.find({ userId: { $in: userIds } })
        .select({ userId: 1, fullName: 1, nicVerified: 1, disableAutoExpiry: 1 })
        .lean()
      : [];

    const profileByUserId = new Map<string, any>();
    for (const p of profiles as any[]) {
      profileByUserId.set(p.userId, p);
    }

    const ridesWithProfiles = rides.map((ride: any) => {
      const uid = (ride.userId || ride.user_id) as string | undefined;
      const profile = uid ? profileByUserId.get(uid) : undefined;
      return transformRide(ride, profile);
    });

    // Apply client-side filters
    let filteredRides = ridesWithProfiles;

    // If not "My Rides" view, filter out expired rides UNLESS disableAutoExpiry is true
    if (!params?.userId) {
      const now = new Date();
      filteredRides = filteredRides.filter((ride: any) => {
        const isActuallyExpired = new Date(ride.expires_at) <= now && !ride.profiles?.disable_auto_expiry;
        return !isActuallyExpired;
      });
    }

    // Filter by verification status if "verified" filter is selected
    if (params?.filterType === 'verified') {
      filteredRides = filteredRides.filter((ride) => ride.profiles?.nic_verified === true);
    }

    // Apply sorting (if not already sorted by MongoDB query, or for date sorting)
    if (params?.sortBy === 'date') {
      // Date sorting needs to be done client-side since it combines rideDate and rideTime
      filteredRides.sort((a, b) => {
        const dateA = new Date(`${a.ride_date} ${a.ride_time}`);
        const dateB = new Date(`${b.ride_date} ${b.ride_time}`);
        return dateA.getTime() - dateB.getTime();
      });
    } else if (params?.sortBy === 'oldest') {
      // Ensure oldest-first sorting (MongoDB already sorted, but ensure consistency)
      filteredRides.sort((a, b) => {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
    }
    // 'newest' is already sorted by MongoDB query

    return filteredRides;
  } catch (error) {
    console.error('Server get rides error:', error);
    return [];
  }
}

export interface ServerCommunity {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

/**
 * Get all communities from server-side
 */
export async function getServerCommunities(): Promise<ServerCommunity[]> {
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

    return communities.map((community: any) => ({
      id: community._id.toString(),
      name: community.name,
      description: community.description || null,
      created_by: community.createdBy,
      created_at: community.createdAt ? new Date(community.createdAt).toISOString() : new Date().toISOString(),
      updated_at: community.updatedAt ? new Date(community.updatedAt).toISOString() : new Date().toISOString(),
      memberCount: community.memberCount || 0,
      rideCount: community.rideCount || 0,
    }));
  } catch (error) {
    console.error('Server get communities error:', error);
    return [];
  }
}

/**
 * Get user's community memberships from server-side
 */
export async function getServerUserCommunities(userId: string): Promise<string[]> {
  try {
    await connectDB();

    const memberships = await CommunityMember.find({ userId })
      .lean();

    return memberships.map((m: any) => m.communityId.toString());
  } catch (error) {
    console.error('Server get user communities error:', error);
    return [];
  }
}

/**
 * Get individual community data from server-side
 */
export async function getServerCommunity(communityId: string): Promise<ServerCommunity | null> {
  try {
    await connectDB();

    const community = await Community.findById(communityId).lean();

    if (!community) {
      return null;
    }

    return {
      id: community._id.toString(),
      name: community.name,
      description: community.description || null,
      created_by: community.createdBy,
      created_at: community.createdAt ? new Date(community.createdAt).toISOString() : new Date().toISOString(),
      updated_at: community.updatedAt ? new Date(community.updatedAt).toISOString() : new Date().toISOString(),
    };
  } catch (error) {
    console.error('Server get community error:', error);
    return null;
  }
}

/**
 * Get community rides from server-side
 */
export async function getServerCommunityRides(communityId: string, params?: {
  sortBy?: string;
  filterType?: string;
  userId?: string;
}): Promise<ServerRide[]> {
  try {
    await connectDB();

    let query: any = {
      $or: [
        { communityId: communityId },
        { communityIds: communityId }
      ]
    };

    // If userId is provided (My Rides), filter by user and don't filter expired/archived
    if (params?.userId) {
      query.userId = params.userId;
    } else {
      // Otherwise, filter out archived rides
      // We'll filter out expired rides later after fetching profile settings
      query.isArchived = { $ne: true };
    }

    // Apply ride type filter
    if (params?.filterType && params.filterType !== 'all' && params.filterType !== 'verified') {
      if (params.filterType === 'offering' || params.filterType === 'seeking') {
        query.type = params.filterType;
      }
    }

    // Determine sort order
    let sortOrder: any = { createdAt: -1 }; // Default to newest first
    if (params?.sortBy === 'oldest') {
      sortOrder = { createdAt: 1 };
    } else if (params?.sortBy === 'date') {
      sortOrder = { rideDate: 1, rideTime: 1 };
    }

    const rides = await Ride.find(query)
      .sort(sortOrder)
      .lean();

    // ---- N+1 FIX: fetch all needed profiles in ONE query ----
    const userIds = Array.from(
      new Set(
        rides
          .map((r: any) => (r.userId || r.user_id) as string | undefined)
          .filter(Boolean) as string[]
      )
    );

    const profiles = userIds.length
      ? await Profile.find({ userId: { $in: userIds } })
        .select({ userId: 1, fullName: 1, nicVerified: 1, disableAutoExpiry: 1 })
        .lean()
      : [];

    const profileByUserId = new Map<string, any>();
    for (const p of profiles as any[]) {
      profileByUserId.set(p.userId, p);
    }

    const ridesWithProfiles = rides.map((ride: any) => {
      const uid = (ride.userId || ride.user_id) as string | undefined;
      const profile = uid ? profileByUserId.get(uid) : undefined;
      return transformRide(ride, profile);
    });

    // Apply client-side filters
    let filteredRides = ridesWithProfiles;

    // If not "My Rides" view, filter out expired rides UNLESS disableAutoExpiry is true
    if (!params?.userId) {
      const now = new Date();
      filteredRides = filteredRides.filter((ride: any) => {
        const isActuallyExpired = new Date(ride.expires_at) <= now && !ride.profiles?.disable_auto_expiry;
        return !isActuallyExpired;
      });
    }

    // Filter by verification status if "verified" filter is selected
    if (params?.filterType === 'verified') {
      filteredRides = filteredRides.filter((ride) => ride.profiles?.nic_verified === true);
    }

    // Apply gender preference filters
    if (params?.filterType === 'girls_only' || params?.filterType === 'boys_only' || params?.filterType === 'both') {
      filteredRides = filteredRides.filter((ride) => ride.gender_preference === params?.filterType);
    }

    // Apply sorting (if not already sorted by MongoDB query, or for date sorting)
    if (params?.sortBy === 'date') {
      filteredRides.sort((a, b) => {
        const dateA = new Date(`${a.ride_date} ${a.ride_time}`);
        const dateB = new Date(`${b.ride_date} ${b.ride_time}`);
        return dateA.getTime() - dateB.getTime();
      });
    } else if (params?.sortBy === 'oldest') {
      filteredRides.sort((a, b) => {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
    }

    return filteredRides;
  } catch (error) {
    console.error('Server get community rides error:', error);
    return [];
  }
}

/**
 * Get community member count from server-side
 */
export async function getServerCommunityMemberCount(communityId: string): Promise<number> {
  try {
    await connectDB();

    const count = await CommunityMember.countDocuments({ communityId });
    return count;
  } catch (error) {
    console.error('Server get community member count error:', error);
    return 0;
  }
}

