import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/middleware';
import { uploadFile } from '@/lib/storage';
import connectDB from '@/lib/mongodb';
import { Profile } from '@/models/Profile';

/**
 * Dedicated endpoint for uploading NIC images to Cloudinary
 * Stores images in nic-images/{username}/ folder
 */
export const POST = authMiddleware(async (req) => {
  try {
    await connectDB();
    const userId = req.userId!;

    // Get profile to get username (nickname or fullName)
    const profile = await Profile.findOne({ userId });
    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    const username = profile.fullName || userId;
    // Sanitize username for folder name (remove special chars)
    const sanitizedUsername = username.replace(/[^a-zA-Z0-9-_]/g, '_');

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string; // 'front' or 'back'

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!type || !['front', 'back'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be "front" or "back"' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Only image files are allowed' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 5MB' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const folder = `nic-images/${sanitizedUsername}`;

    // Upload to Cloudinary with high quality settings
    const result = await uploadFile(buffer, folder, {
      width: 2000,
      height: 2000,
      crop: 'limit', // Don't crop, just limit size
      format: 'auto',
    });

    return NextResponse.json({
      url: result.url,
      key: result.publicId,
      type,
    });
  } catch (error: any) {
    console.error('NIC image upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload NIC image' },
      { status: 500 }
    );
  }
});


