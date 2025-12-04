import mongoose, { Schema, Model, Document } from 'mongoose';

export interface IProfile extends Document {
  userId: string;
  fullName: string;

  phone?: string;
  avatarUrl?: string;
  gender?: 'male' | 'female' | 'other';
  // NIC verification fields
  nicVerified?: boolean;
  front?: string; // Cloudinary URL for NIC front image (verified)
  back?: string; // Cloudinary URL for NIC back image (verified)
  nicNumber?: string; // NIC number (set by admin during verification)
  // Temporary fields for pending verification
  nicFrontImageUrl?: string; // Temporary: pending verification
  nicBackImageUrl?: string; // Temporary: pending verification
  // Settings
  disableAutoExpiry?: boolean; // If true, rides won't auto-expire
  createdAt: Date;
  updatedAt: Date;
}

const profileSchema = new Schema<IProfile>(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      ref: 'User',
      index: true,
    },
    fullName: {
      type: String,
      required: true,
    },

    phone: String,
    avatarUrl: String,
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
    },
    // NIC verification
    nicVerified: {
      type: Boolean,
      default: false,
    },
    front: String, // Cloudinary URL for NIC front image (verified)
    back: String, // Cloudinary URL for NIC back image (verified)
    nicNumber: String, // NIC number (set by admin during verification)
    // Temporary fields for pending verification
    nicFrontImageUrl: String, // Temporary: pending verification
    nicBackImageUrl: String, // Temporary: pending verification
    // Settings
    disableAutoExpiry: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export const Profile: Model<IProfile> = mongoose.models.Profile || mongoose.model<IProfile>('Profile', profileSchema);