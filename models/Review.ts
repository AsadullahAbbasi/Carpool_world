import mongoose, { Schema, Model, Document } from 'mongoose';

export interface IReview extends Document {
  rideId: string;
  driverId: string;
  reviewerId: string;
  rating: number;
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    rideId: {
      type: String,
      required: true,
      ref: 'Ride',
      index: true,
    },
    driverId: {
      type: String,
      required: true,
      ref: 'User',
      index: true,
    },
    reviewerId: {
      type: String,
      required: true,
      ref: 'User',
      index: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: String,
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate reviews
reviewSchema.index({ rideId: 1, reviewerId: 1 }, { unique: true });

export const Review: Model<IReview> = mongoose.models.Review || mongoose.model<IReview>('Review', reviewSchema);