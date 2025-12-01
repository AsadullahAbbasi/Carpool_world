import mongoose, { Schema, Model, Document } from 'mongoose';

export interface ICommunity extends Document {
  name: string;
  description?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const communitySchema = new Schema<ICommunity>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    description: String,
    createdBy: {
      type: String,
      required: true,
      ref: 'User',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Community: Model<ICommunity> = mongoose.models.Community || mongoose.model<ICommunity>('Community', communitySchema);