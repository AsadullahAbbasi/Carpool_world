# Carpool App - Next.js + MongoDB

A carpool/rideshare application built with Next.js App Router, MongoDB, Mongoose, and custom JWT authentication. Previously migrated from Vite + React + Supabase.

## Features

- 🔐 **Custom JWT Authentication** - Secure authentication with bcrypt password hashing
- 📧 **Email Verification** - Email verification and password reset flows
- 🗄️ **MongoDB Database** - Flexible NoSQL database with Mongoose ODM
- 💾 **S3-Compatible Storage** - File uploads for avatars (AWS S3 or DigitalOcean Spaces)
- 🚗 **Ride Management** - Post, edit, and search rides
- 👥 **Communities** - Create and join ride-sharing communities
- ⭐ **Reviews** - Rate and review drivers
- 📱 **Responsive UI** - Modern design with shadcn/ui components

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: MongoDB with Mongoose
- **Authentication**: Custom JWT with bcrypt
- **Storage**: AWS S3 / DigitalOcean Spaces (S3-compatible)
- **Email**: Nodemailer (SMTP)
- **UI**: React, Tailwind CSS, shadcn/ui
- **Validation**: Zod

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- MongoDB database (local or Atlas)
- S3-compatible storage (AWS S3 or DigitalOcean Spaces)
- SMTP email service (Gmail, SendGrid, etc.)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd post-a-ride
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/carpool
# or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/carpool

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# Next.js App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# S3 Storage (AWS or DigitalOcean Spaces)
STORAGE_ENDPOINT=https://s3.amazonaws.com
STORAGE_REGION=us-east-1
STORAGE_BUCKET_NAME=your-bucket-name
STORAGE_ACCESS_KEY_ID=your-access-key-id
STORAGE_SECRET_ACCESS_KEY=your-secret-access-key
STORAGE_PUBLIC_DOMAIN=https://your-bucket-name.s3.amazonaws.com
STORAGE_FORCE_PATH_STYLE=false

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@yourdomain.com
```

4. Run the development server:
```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Migration from Supabase

If you're migrating from Supabase, use the migration script:

```bash
# Add Supabase credentials to .env.local
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Run migration
npm run migrate
```

The script will:
1. Export Supabase data to JSON files
2. Import data into MongoDB
3. Transform schema from PostgreSQL to MongoDB format

**Note**: User passwords need to be handled separately since they're hashed differently.

## Project Structure

```
post-a-ride/
├── app/                      # Next.js App Router pages
│   ├── (pages)/             # Route groups
│   │   ├── auth/            # Authentication page
│   │   ├── dashboard/       # Main dashboard
│   │   └── profile-completion/  # Profile setup
│   ├── api/                 # API routes
│   │   ├── auth/            # Authentication endpoints
│   │   ├── rides/           # Ride CRUD
│   │   ├── communities/     # Community management
│   │   ├── profiles/        # Profile management
│   │   ├── reviews/         # Review submissions
│   │   └── storage/         # File uploads
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Home page
│   └── globals.css          # Global styles
├── components/              # React components
│   └── ui/                  # shadcn/ui components
├── lib/                     # Utilities
│   ├── api-client.ts        # Client-side API calls
│   ├── auth.ts              # JWT utilities
│   ├── mongodb.ts           # MongoDB connection
│   ├── storage.ts           # S3 storage adapter
│   ├── email.ts             # Email utilities
│   └── middleware.ts        # API middleware
├── models/                  # Mongoose models
│   ├── User.ts
│   ├── Profile.ts
│   ├── Ride.ts
│   ├── Community.ts
│   ├── CommunityMember.ts
│   └── Review.ts
├── scripts/                 # Utility scripts
│   └── migrate-supabase-to-mongo.js  # Migration script
└── public/                  # Static assets
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `POST /api/auth/verify-email` - Verify email address
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password
- `GET /api/auth/me` - Get current user

### Rides
- `GET /api/rides` - List rides (with optional filters)
- `POST /api/rides` - Create ride
- `PUT /api/rides/[id]` - Update ride
- `DELETE /api/rides/[id]` - Delete ride

### Communities
- `GET /api/communities` - List communities
- `POST /api/communities` - Create community
- `PUT /api/communities/[id]` - Update community
- `DELETE /api/communities/[id]` - Delete community
- `GET /api/communities/members` - Get user's communities
- `POST /api/communities/members` - Join community
- `DELETE /api/communities/members` - Leave community

### Profiles
- `GET /api/profiles` - Get current user's profile
- `PUT /api/profiles` - Update profile

### Storage
- `POST /api/storage/upload` - Upload avatar image

### Reviews
- `POST /api/reviews` - Submit review

## Database Schema

### User
- `email` (unique, indexed)
- `password` (hashed with bcrypt)
- `emailVerified`
- `emailVerificationToken`
- `passwordResetToken`

### Profile
- `userId` (unique, indexed)
- `fullName`
- `nickname`
- `phone`
- `avatarUrl`
- `gender`
- `nicNumber`

### Ride
- `userId` (indexed)
- `type` ('offering' | 'seeking')
- `startLocation`, `endLocation`
- `rideDate`, `rideTime`
- `seatsAvailable`
- `communityId` (optional, indexed)
- `expiresAt` (indexed)
- Text index on locations and description

### Community
- `name` (indexed)
- `description`
- `createdBy` (indexed)

### CommunityMember
- `communityId` + `userId` (compound unique index)
- `joinedAt`

### Review
- `rideId` (indexed)
- `driverId` (indexed)
- `reviewerId` (indexed)
- `rating` (1-5)
- `comment`
- Unique constraint on `rideId` + `reviewerId`

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

### Environment Variables for Production

Make sure to set all required environment variables in your hosting platform:

- `MONGODB_URI`
- `JWT_SECRET` (use a strong random string)
- `NEXT_PUBLIC_APP_URL` (your production URL)
- Storage credentials
- SMTP credentials

## Testing

Basic authentication flow tests are included. To add more:

```bash
npm install --save-dev jest @testing-library/react
```

## Security Considerations

- ✅ Passwords hashed with bcrypt
- ✅ JWT tokens with expiration
- ✅ Email verification required
- ✅ Password reset tokens expire after 1 hour
- ✅ API routes protected with auth middleware
- ✅ Input validation with Zod
- ✅ CORS and CSRF protection (via Next.js)
- ⚠️ **Important**: Change `JWT_SECRET` in production!
- ⚠️ Use HTTPS in production
- ⚠️ Secure your MongoDB connection (use Atlas with IP whitelist)

## Troubleshooting

### MongoDB Connection Issues
- Check `MONGODB_URI` format
- Ensure MongoDB is running (if local)
- Check network/firewall settings

### Storage Upload Issues
- Verify S3 credentials
- Check bucket permissions (public-read for avatars)
- Verify bucket CORS settings

### Email Not Sending
- Check SMTP credentials
- For Gmail, use App Password (not regular password)
- Check spam folder

## License

MIT

## Contributing

Contributions welcome! Please open an issue or PR.