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
  community_id?: string | null;
  recurring_days?: string[] | null;
  profiles?: {
    full_name: string;
    nic_verified?: boolean;
  } | null;
}

function transformRide(ride: any, profile?: any): ServerRide {
  return {
    id: ride._id.toString(),
    type: ride.type,
    start_location: ride.startLocation,
    end_location: ride.endLocation,
    ride_date: ride.rideDate,
    ride_time: ride.rideTime,
    seats_available: ride.seatsAvailable,
    description: ride.description,
    phone: ride.phone,
    expires_at: ride.expiresAt ? new Date(ride.expiresAt).toISOString() : new Date().toISOString(),
    is_archived: ride.isArchived || false,
    user_id: ride.userId || ride.user_id || '',
    created_at: ride.createdAt ? new Date(ride.createdAt).toISOString() : new Date().toISOString(),
    community_id: ride.communityId || null,
    recurring_days: ride.recurringDays || null,
    profiles: profile ? {
      full_name: profile.fullName || 'Unknown',
      nic_verified: profile.nicVerified || false,
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
      query.communityId = params.communityId;
    }
    
    if (params?.type && params.type !== 'all' && params.type !== 'verified') {
      query.type = params.type;
    }

    // If userId is provided (My Rides), don't filter expired/archived
    // Otherwise, filter out expired and archived rides
    if (!params?.userId) {
      query.isArchived = { $ne: true };
      const now = new Date();
      query.expiresAt = { $gt: now };
    }

    let rides = await Ride.find(query)
      .sort({ createdAt: -1 })
      .lean();

    // Apply text search if provided
    if (params?.search) {
      const lowerQuery = params.search.toLowerCase();
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
    if (params?.filterType === 'verified') {
      filteredRides = filteredRides.filter((ride) => ride.profiles?.nic_verified === true);
    }

    // Apply sorting
    if (params?.sortBy) {
      filteredRides.sort((a, b) => {
        if (params.sortBy === 'newest') {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        } else if (params.sortBy === 'oldest') {
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        } else if (params.sortBy === 'date') {
          const dateA = new Date(`${a.ride_date} ${a.ride_time}`);
          const dateB = new Date(`${b.ride_date} ${b.ride_time}`);
          return dateA.getTime() - dateB.getTime();
        }
        return 0;
      });
    }

    return filteredRides;
  } catch (error) {
    console.error('Server get rides error:', error);
    return [];
  }
}

