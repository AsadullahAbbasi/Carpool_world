import mongoose, { Schema, Model, Document } from 'mongoose';

export interface ICommunityMember extends Document {
  communityId: string;
  userId: string;
  joinedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const communityMemberSchema = new Schema<ICommunityMember>(
  {
    communityId: {
      type: String,
      required: true,
      ref: 'Community',
      index: true,
    },
    userId: {
      type: String,
      required: true,
      ref: 'User',
      index: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index
communityMemberSchema.index({ communityId: 1, userId: 1 }, { unique: true });

export const CommunityMember: Model<ICommunityMember> = mongoose.models.CommunityMember || mongoose.model<ICommunityMember>('CommunityMember', communityMemberSchema);