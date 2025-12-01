import mongoose, { Schema, Model, Document, Types } from 'mongoose';

export interface IRide extends Document {
  userId: string;
  type: 'offering' | 'seeking';
  startLocation: string;
  endLocation: string;
  rideDate: Date;
  rideTime: string;
  seatsAvailable?: number;
  description?: string;
  phone?: string;
  expiresAt: Date;
  communityId?: string;
  recurringDays?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const rideSchema = new Schema<IRide>(
  {
    userId: {
      type: String,
      required: true,
      ref: 'User',
      index: true,
    },
    type: {
      type: String,
      enum: ['offering', 'seeking'],
      required: true,
    },
    startLocation: {
      type: String,
      required: true,
    },
    endLocation: {
      type: String,
      required: true,
    },
    rideDate: {
      type: Date,
      required: true,
    },
    rideTime: {
      type: String,
      required: true,
    },
    seatsAvailable: Number,
    description: String,
    phone: String,
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    communityId: {
      type: String,
      ref: 'Community',
      index: true,
    },
    recurringDays: [String],
  },
  {
    timestamps: true,
  }
);

// Text index for search
rideSchema.index({
  startLocation: 'text',
  endLocation: 'text',
  description: 'text',
});

export const Ride: Model<IRide> = mongoose.models.Ride || mongoose.model<IRide>('Ride', rideSchema);