import mongoose, { Schema, Model, Document, Types } from 'mongoose';

export interface IRide extends Document {
  userId: string;
  type: 'offering' | 'seeking';
  genderPreference: 'girls_only' | 'boys_only' | 'both';
  startLocation: string;
  endLocation: string;
  rideDate: Date;
  rideTime: string;
  seatsAvailable?: number;
  description?: string;
  phone?: string;
  expiresAt: Date;
  isArchived?: boolean;
  communityIds?: string[];
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
    genderPreference: {
      type: String,
      enum: ['girls_only', 'boys_only', 'both'],
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
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
    communityIds: [{
      type: String,
      ref: 'Community',
    }],
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