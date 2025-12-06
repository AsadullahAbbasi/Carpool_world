import mongoose, { Schema, Model, Document } from 'mongoose';

export interface ICommunityRequest extends Document {
  name: string;
  description: string; // Mandatory for requests
  requestedBy: string; // userId
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string; // admin userId (if admin user ID is stored)
  reviewedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const communityRequestSchema = new Schema<ICommunityRequest>(
  {
    name: {
      type: String,
      required: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
    },
    requestedBy: {
      type: String,
      required: true,
      ref: 'User',
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    reviewedBy: {
      type: String,
      ref: 'User',
    },
    reviewedAt: Date,
    rejectionReason: String,
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying of pending requests
communityRequestSchema.index({ status: 1, createdAt: -1 });

export const CommunityRequest: Model<ICommunityRequest> = 
  mongoose.models.CommunityRequest || 
  mongoose.model<ICommunityRequest>('CommunityRequest', communityRequestSchema);


