import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/middleware';
import connectDB from '@/lib/mongodb';
import { User } from '@/models/User';
import { generateVerificationToken } from '@/lib/auth';

export const POST = authMiddleware(async (req) => {
    try {
        await connectDB();
        const userId = req.userId!;

        const user = await User.findById(userId);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (user.emailVerified) {
            return NextResponse.json({ message: 'Email already verified' }, { status: 400 });
        }

        // Generate new token
        const verificationToken = generateVerificationToken();
        user.emailVerificationToken = verificationToken;
        user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        await user.save();

        return NextResponse.json({
            message: 'Verification token generated',
            token: verificationToken,
            email: user.email
        });
    } catch (error: any) {
        console.error('Resend verification error:', error);
        return NextResponse.json({ error: 'Failed to generate verification token' }, { status: 500 });
    }
});
