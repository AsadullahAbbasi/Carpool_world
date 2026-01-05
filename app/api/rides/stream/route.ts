import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Profile } from '@/models/Profile';
import { User } from '@/models/User';

export const dynamic = 'force-dynamic';

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
    expires_at: ride.expiresAt ? new Date(ride.expiresAt).toISOString() : ride.expires_at,
    is_archived: ride.isArchived || false,
    user_id: ride.userId || ride.user_id,
    created_at: ride.createdAt ? new Date(ride.createdAt).toISOString() : ride.created_at,
    updated_at: ride.updatedAt ? new Date(ride.updatedAt).toISOString() : ride.updated_at,
    community_ids: ride.communityIds || ride.community_ids || [],
    recurring_days: ride.recurringDays || ride.recurring_days || [],
    profiles: profile ? {
      full_name: profile.fullName || profile.full_name,
      nic_verified: profile.nicVerified !== undefined ? profile.nicVerified : (profile.nic_verified !== undefined ? profile.nic_verified : false),
      disable_auto_expiry: profile.disableAutoExpiry || false,
    } : null,
  };
}

export async function GET(req: NextRequest) {
  // Set up SSE headers
  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable nginx buffering
  });

  const encoder = new TextEncoder();

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      let changeStream: any = null;
      let heartbeatInterval: NodeJS.Timeout | null = null;
      let expirationCheckInterval: NodeJS.Timeout | null = null;
      let isClosed = false;
      let ridesCollection: any = null;
      let trackedExpiredRides = new Set<string>(); // Track which rides we've already notified about

      const sendEvent = (data: any) => {
        if (isClosed) return;
        try {
          const message = `data: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));
        } catch (error) {
          console.error('Error sending SSE event:', error);
        }
      };

      const sendHeartbeat = () => {
        if (isClosed) return;
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch (error) {
          console.error('Error sending heartbeat:', error);
        }
      };

      // Check for expired rides periodically
      const checkForExpiredRides = async () => {
        if (isClosed || !ridesCollection) return;
        try {
          const now = new Date();

          // Find rides that have expired but aren't archived yet
          const expiredRides = await ridesCollection.find({
            expiresAt: { $lte: now },
            isArchived: false,
          }).toArray();

          for (const ride of expiredRides) {
            const rideId = ride._id.toString();
            // Only notify once per ride expiration
            if (!trackedExpiredRides.has(rideId)) {
              trackedExpiredRides.add(rideId);

              // Fetch profile and user for the ride
              const profile = await Profile.findOne({ userId: ride.userId }).lean();

              // Skip if user has auto-expiry disabled
              if (profile?.disableAutoExpiry) {
                continue;
              }

              const user = await User.findById(ride.userId).lean();
              const transformedRide = transformRide(ride, profile || undefined);

              // Send expiration event to SSE clients
              sendEvent({
                operation: 'expire',
                ride: transformedRide,
              });

              // Email sending is now handled by Vercel Cron (daily at 12 AM)
              // No need to send emails in real-time streaming
            }
          }
        } catch (error) {
          console.error('Error checking for expired rides:', error);
        }
      };

      const cleanup = async () => {
        isClosed = true;
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
          heartbeatInterval = null;
        }
        if (expirationCheckInterval) {
          clearInterval(expirationCheckInterval);
          expirationCheckInterval = null;
        }
        if (changeStream) {
          try {
            await changeStream.close();
          } catch (error) {
            console.error('Error closing change stream:', error);
          }
          changeStream = null;
        }
        try {
          controller.close();
        } catch (error) {
          console.error('Error closing controller:', error);
        }
      };

      try {
        // Connect to MongoDB
        const mongoose = await connectDB();

        // Get the native MongoDB client from Mongoose
        const db = mongoose.connection.db;
        if (!db) {
          throw new Error('Database connection not available');
        }

        // Get the collection
        ridesCollection = db.collection('rides');

        // Set up change stream with fullDocument: 'updateLookup'
        changeStream = ridesCollection.watch(
          [
            { $match: { 'operationType': { $in: ['insert', 'update', 'delete'] } } }
          ],
          {
            fullDocument: 'updateLookup',
          }
        );

        // Send initial connection message
        sendEvent({ type: 'connected', message: 'Connected to ride updates stream' });

        // Set up heartbeat (every 30 seconds)
        heartbeatInterval = setInterval(() => {
          sendHeartbeat();
        }, 30000);

        // Set up expiration check (every 10 seconds)
        expirationCheckInterval = setInterval(() => {
          checkForExpiredRides();
        }, 10000);

        // Handle change stream events
        changeStream.on('change', async (change: any) => {
          try {
            if (isClosed) return;

            const operationType = change.operationType;

            // Handle delete operations
            if (operationType === 'delete') {
              // For delete operations, we only have the documentKey
              const rideId = change.documentKey?._id?.toString();
              if (rideId) {
                trackedExpiredRides.delete(rideId); // Clean up tracking
                sendEvent({
                  operation: 'delete',
                  rideId: rideId,
                });
              }
              return;
            }

            // Handle insert and update operations
            if (operationType === 'insert' || operationType === 'update') {
              let rideDocument = change.fullDocument;

              // If no fullDocument in update, try to get it from documentKey
              if (!rideDocument && change.documentKey) {
                rideDocument = await ridesCollection.findOne({ _id: change.documentKey._id });
              }

              if (!rideDocument) {
                console.warn('No document found for change event:', change);
                return;
              }

              // Filter out archived and expired rides (for consistency with GET endpoint)
              const now = new Date();
              if (rideDocument.isArchived || (rideDocument.expiresAt && new Date(rideDocument.expiresAt) <= now)) {
                // Still send the event, but client can filter if needed
                // This allows clients to remove expired/archived rides from their list
              }

              // Fetch profile for the ride
              const profile = await Profile.findOne({ userId: rideDocument.userId || rideDocument.user_id }).lean();

              // Transform the ride document
              const transformedRide = transformRide(rideDocument, profile || undefined);

              // Send the event
              sendEvent({
                operation: operationType,
                ride: transformedRide,
              });
            }
          } catch (error) {
            console.error('Error processing change event:', error);
            sendEvent({
              type: 'error',
              message: 'Error processing change event',
            });
          }
        });

        // Handle change stream errors
        changeStream.on('error', (error: any) => {
          console.error('Change stream error:', error);
          sendEvent({
            type: 'error',
            message: 'Change stream error occurred',
          });
          cleanup();
        });

        // Handle client disconnect
        req.signal.addEventListener('abort', () => {
          cleanup();
        });

      } catch (error: any) {
        console.error('SSE stream setup error:', error);
        sendEvent({
          type: 'error',
          message: error.message || 'Failed to set up change stream',
        });
        await cleanup();
      }
    },
  });

  return new Response(stream, { headers });
}

