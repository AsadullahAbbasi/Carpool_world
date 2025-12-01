/**
 * Zod validation schemas for form validation
 * Used for client and server-side validation
 */

import { z } from 'zod';

// Pakistan phone number regex: 92XXXXXXXXXX or 0XXXXXXXXXX
const pakistanPhoneRegex = /^(92[0-9]{10}|0[0-9]{10})$/;

// Normalize phone number: convert 0XXXXXXXXXX to 92XXXXXXXXXX
export const normalizePhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/[\s\-\(\)\+]/g, '');
  if (cleaned.startsWith('0')) {
    return '92' + cleaned.substring(1);
  }
  return cleaned;
};

// Phone number schema with auto-normalization
export const phoneSchema = z
  .string()
  .min(1, 'Phone number is required')
  .refine(
    (val) => {
      const cleaned = val.replace(/[\s\-\(\)\+]/g, '');
      return pakistanPhoneRegex.test(cleaned);
    },
    {
      message: 'Please enter a valid Pakistani mobile number (e.g., 923001234567 or 03001234567)',
    }
  )
  .transform((val) => normalizePhoneNumber(val));

// Profile completion schema
export const profileCompletionSchema = z.object({
  fullName: z.string().min(1, 'Full name is required').min(2, 'Full name must be at least 2 characters'),

  phone: phoneSchema,
  avatarUrl: z.string().min(1, 'Profile picture is required'),
  gender: z.enum(['male', 'female', 'other'], {
    required_error: 'Gender is required',
  }),
});

// NIC verification schema (optional)
export const nicVerificationSchema = z.object({
  nicFrontImageUrl: z.string().min(1, 'NIC front image is required'),
  nicBackImageUrl: z.string().min(1, 'NIC back image is required'),
  nicNumber: z.string().optional(), // Will be extracted from OCR
});

// Ride posting schema
export const rideSchema = z.object({
  type: z.enum(['offering', 'seeking']),
  startLocation: z.string().min(1, 'Start location is required'),
  endLocation: z.string().min(1, 'End location is required'),
  rideDate: z.string().refine(
    (val) => {
      // Compare date strings directly to avoid timezone issues
      const inputDate = val; // Format: YYYY-MM-DD
      const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
      return inputDate >= today;
    },
    {
      message: 'Ride date must be today or in the future',
    }
  ),
  rideTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  seatsAvailable: z.number().int().positive().optional(),
  description: z.string().optional(),
  phone: phoneSchema.optional(),
  communityId: z.string().optional().nullable(),
  recurringDays: z.array(z.string()).optional(),
});

// Signup schema
export const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(1, 'Full name is required'),
});

// Login schema
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Email verification schema
export const emailVerificationSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

