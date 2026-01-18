import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { User } from '@/models/User';
import { generateVerificationToken, verifyToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
    try {
        await connectDB();

        // 1. Try to get userId from token (authenticated)
        const token = req.cookies.get('token')?.value || req.headers.get('authorization')?.replace('Bearer ', '');
        let userId: string | undefined;

        if (token) {
            const payload = verifyToken(token);
            if (payload) userId = payload.userId;
        }

        let user;
        if (userId) {
            user = await User.findById(userId);
        } else {
            // 2. Try to get user from email/password (unauthenticated fallback)
            let body;
            try {
                body = await req.json();
            } catch (e) {
                // No body
            }

            const email = body?.email;
            const password = body?.password;

            if (!email || !password) {
                return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
            }

            user = await User.findOne({ email }).select('+password');
            if (!user || !(await user.comparePassword(password))) {
                return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
            }
        }

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (user.emailVerified) {
            return NextResponse.json({ message: 'Email already verified' }, { status: 400 });
        }

        // Throttling: Check if token was generated recently (less than 2 minutes ago)
        // Token expires in 24 hours, so if it expires more than 23h 58m from now, it was just sent.
        if (user.emailVerificationToken && user.emailVerificationExpires) {
            const now = new Date();
            const twoMinutesAgo = new Date(user.emailVerificationExpires.getTime() - 24 * 60 * 60 * 1000 + 2 * 60 * 1000);
            if (now < twoMinutesAgo) {
                return NextResponse.json({
                    error: 'Please wait a moment before requesting another link. Check your spam folder if you haven\'t received it.'
                }, { status: 429 });
            }
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
}
