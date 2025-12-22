/**
 * Vercel Cron Job: Check for expired rides and send notifications
 * 
 * This endpoint is automatically called by Vercel according to the schedule
 * defined in vercel.json
 * 
 * Run frequency: Every 10 minutes via Vercel Cron
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Profile } from '@/models/Profile';
import { User } from '@/models/User';
import { sendRideExpirationEmail } from '@/lib/resend-client';

// Allow function to run for up to 60 seconds
export const maxDuration = 60;

// Vercel cron jobs automatically call this endpoint
export async function POST(req: NextRequest) {
  try {
    // Verify this is coming from Vercel Cron
    const authHeader = req.headers.get('authorization');
    
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.warn('Unauthorized cron request');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🔄 Starting expired rides check...');
    
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

    console.log(`📧 Found ${expiredRides.length} expired rides to process`);

    let emailsSent = 0;
    let emailsFailed = 0;

    for (const ride of expiredRides) {
      try {
        // Fetch user info
        const user = await User.findById(ride.userId).lean();
        const profile = await Profile.findOne({ userId: ride.userId }).lean();

        if (!user || !user.email) {
          console.warn(`⚠️ No email found for user ${ride.userId}`);
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
          { 
            $set: { 
              emailSent: true, 
              emailSentAt: new Date(),
              notificationSentAt: new Date(),
            } 
          }
        );

        console.log(`✅ Email sent for ride ${ride._id}`);
        emailsSent++;
      } catch (error) {
        console.error(`❌ Failed to send email for ride ${ride._id}:`, error);
        emailsFailed++;
      }
    }

    console.log(`✨ Cron job completed - Sent: ${emailsSent}, Failed: ${emailsFailed}`);

    return NextResponse.json({
      success: true,
      message: 'Expired rides check completed',
      expiredRidesFound: expiredRides.length,
      emailsSent,
      emailsFailed,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Cron job error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to process expired rides',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
