/**
 * Cron Job: Check for expired rides and send notifications
 * This runs independently every 10 seconds
 * 
 * Can be triggered via:
 * - GET /api/cron/expire-rides?token=YOUR_SECRET
 * - Or set up with external cron service (EasyCron, Vercel Cron, etc)
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Profile } from '@/models/Profile';
import { User } from '@/models/User';
import { sendRideExpirationEmail } from '@/lib/resend-client';

export const dynamic = 'force-dynamic';

// Transform ride data
function transformRide(ride: any) {
  return {
    id: ride._id?.toString() || ride.id,
    type: ride.type,
    startLocation: ride.startLocation,
    endLocation: ride.endLocation,
    rideDate: ride.rideDate ? new Date(ride.rideDate).toISOString().split('T')[0] : '',
    rideTime: ride.rideTime,
  };
}

export async function GET(req: NextRequest) {
  try {
    // Verify auth token
    const token = req.nextUrl.searchParams.get('token');
    const secretToken = process.env.CRON_SECRET || 'your-secret-token';
    
    if (token !== secretToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Connect to MongoDB
    const mongoose = await connectDB();
    const db = mongoose.connection.db;
    
    if (!db) {
      throw new Error('Database connection not available');
    }

    const ridesCollection = db.collection('rides');
    const now = new Date();

    // Find rides that have expired but aren't archived yet
    const expiredRides = await ridesCollection.find({
      expiresAt: { $lte: now },
      isArchived: false,
      emailSent: { $ne: true }, // Only process rides we haven't sent emails for
    }).toArray();

    let emailsSent = 0;
    let emailsFailed = 0;

    for (const ride of expiredRides) {
      try {
        // Fetch user info
        const user = await User.findById(ride.userId).lean();
        const profile = await Profile.findOne({ userId: ride.userId }).lean();

        if (!user || !user.email) {
          console.warn(`No email found for user ${ride.userId}`);
          continue;
        }

        // Send email
        await sendRideExpirationEmail(
          user.email,
          profile?.fullName || user.name || 'User',
          {
            startLocation: ride.startLocation,
            endLocation: ride.endLocation,
            rideDate: ride.rideDate ? new Date(ride.rideDate).toISOString().split('T')[0] : '',
            rideTime: ride.rideTime,
            rideType: ride.type,
          }
        );

        // Mark email as sent in database
        await ridesCollection.updateOne(
          { _id: ride._id },
          { $set: { emailSent: true, emailSentAt: new Date() } }
        );

        emailsSent++;
      } catch (error) {
        console.error(`Failed to send email for ride ${ride._id}:`, error);
        emailsFailed++;
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Expired rides check completed',
      expiredRidesFound: expiredRides.length,
      emailsSent,
      emailsFailed,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { error: 'Failed to process expired rides' },
      { status: 500 }
    );
  }
}
