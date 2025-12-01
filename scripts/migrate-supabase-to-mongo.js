#!/usr/bin/env node

/**
 * Migration script to export data from Supabase and import to MongoDB
 * 
 * Usage:
 *   node scripts/migrate-supabase-to-mongo.js
 * 
 * Requires:
 *   - SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
 *   - MONGODB_URI in .env
 */

import { createClient } from '@supabase/supabase-js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MONGODB_URI = process.env.MONGODB_URI;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !MONGODB_URI) {
  console.error('Missing required environment variables');
  console.error('Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, MONGODB_URI');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// MongoDB schemas (simplified for migration)
const UserSchema = new mongoose.Schema({}, { strict: false, timestamps: true });
const ProfileSchema = new mongoose.Schema({}, { strict: false, timestamps: true });
const RideSchema = new mongoose.Schema({}, { strict: false, timestamps: true });
const CommunitySchema = new mongoose.Schema({}, { strict: false, timestamps: true });
const CommunityMemberSchema = new mongoose.Schema({}, { strict: false, timestamps: true });
const ReviewSchema = new mongoose.Schema({}, { strict: false, timestamps: true });

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Profile = mongoose.models.Profile || mongoose.model('Profile', ProfileSchema);
const Ride = mongoose.models.Ride || mongoose.model('Ride', RideSchema);
const Community = mongoose.models.Community || mongoose.model('Community', CommunitySchema);
const CommunityMember = mongoose.models.CommunityMember || mongoose.model('CommunityMember', CommunityMemberSchema);
const Review = mongoose.models.Review || mongoose.model('Review', ReviewSchema);

async function migrateUsers() {
  console.log('Migrating users...');
  
  // Note: Supabase auth users need to be handled separately
  // This script focuses on profiles and application data
  // You'll need to export auth.users separately and handle password hashing
  
  console.log('Note: Users table requires manual migration due to password hashing');
  console.log('Please export auth.users from Supabase dashboard and handle separately');
}

async function migrateProfiles() {
  console.log('Migrating profiles...');
  
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*');
  
  if (error) {
    console.error('Error fetching profiles:', error);
    return;
  }
  
  if (!profiles || profiles.length === 0) {
    console.log('No profiles to migrate');
    return;
  }
  
  const transformed = profiles.map(p => ({
    userId: p.id,
    fullName: p.full_name,
    nickname: p.nickname,
    phone: p.phone,
    avatarUrl: p.avatar_url,
    gender: p.gender,
    nicNumber: p.nic_number,
    createdAt: p.created_at ? new Date(p.created_at) : new Date(),
    updatedAt: p.updated_at ? new Date(p.updated_at) : new Date(),
  }));
  
  await Profile.insertMany(transformed);
  console.log(`Migrated ${transformed.length} profiles`);
}

async function migrateCommunities() {
  console.log('Migrating communities...');
  
  const { data: communities, error } = await supabase
    .from('communities')
    .select('*');
  
  if (error) {
    console.error('Error fetching communities:', error);
    return;
  }
  
  if (!communities || communities.length === 0) {
    console.log('No communities to migrate');
    return;
  }
  
  const transformed = communities.map(c => ({
    _id: c.id,
    name: c.name,
    description: c.description,
    createdBy: c.created_by,
    createdAt: c.created_at ? new Date(c.created_at) : new Date(),
    updatedAt: c.updated_at ? new Date(c.updated_at) : new Date(),
  }));
  
  await Community.insertMany(transformed);
  console.log(`Migrated ${transformed.length} communities`);
}

async function migrateCommunityMembers() {
  console.log('Migrating community members...');
  
  const { data: members, error } = await supabase
    .from('community_members')
    .select('*');
  
  if (error) {
    console.error('Error fetching community members:', error);
    return;
  }
  
  if (!members || members.length === 0) {
    console.log('No community members to migrate');
    return;
  }
  
  const transformed = members.map(m => ({
    _id: m.id,
    communityId: m.community_id,
    userId: m.user_id,
    joinedAt: m.joined_at ? new Date(m.joined_at) : new Date(),
    createdAt: m.joined_at ? new Date(m.joined_at) : new Date(),
    updatedAt: m.joined_at ? new Date(m.joined_at) : new Date(),
  }));
  
  await CommunityMember.insertMany(transformed);
  console.log(`Migrated ${transformed.length} community members`);
}

async function migrateRides() {
  console.log('Migrating rides...');
  
  const { data: rides, error } = await supabase
    .from('rides')
    .select('*');
  
  if (error) {
    console.error('Error fetching rides:', error);
    return;
  }
  
  if (!rides || rides.length === 0) {
    console.log('No rides to migrate');
    return;
  }
  
  const transformed = rides.map(r => ({
    _id: r.id,
    userId: r.user_id,
    type: r.type,
    startLocation: r.start_location,
    endLocation: r.end_location,
    rideDate: r.ride_date ? new Date(r.ride_date) : new Date(),
    rideTime: r.ride_time,
    seatsAvailable: r.seats_available,
    description: r.description,
    phone: r.phone,
    expiresAt: r.expires_at ? new Date(r.expires_at) : new Date(),
    communityId: r.community_id,
    recurringDays: r.recurring_days,
    createdAt: r.created_at ? new Date(r.created_at) : new Date(),
    updatedAt: r.updated_at ? new Date(r.updated_at) : new Date(),
  }));
  
  await Ride.insertMany(transformed);
  console.log(`Migrated ${transformed.length} rides`);
}

async function migrateReviews() {
  console.log('Migrating reviews...');
  
  const { data: reviews, error } = await supabase
    .from('reviews')
    .select('*');
  
  if (error) {
    console.error('Error fetching reviews:', error);
    return;
  }
  
  if (!reviews || reviews.length === 0) {
    console.log('No reviews to migrate');
    return;
  }
  
  const transformed = reviews.map(r => ({
    _id: r.id,
    rideId: r.ride_id,
    driverId: r.driver_id,
    reviewerId: r.reviewer_id,
    rating: r.rating,
    comment: r.comment,
    createdAt: r.created_at ? new Date(r.created_at) : new Date(),
    updatedAt: r.updated_at ? new Date(r.updated_at) : new Date(),
  }));
  
  await Review.insertMany(transformed);
  console.log(`Migrated ${transformed.length} reviews`);
}

async function exportToJSON() {
  console.log('Exporting Supabase data to JSON files...');
  
  const exportDir = path.join(process.cwd(), 'migration-export');
  await fs.mkdir(exportDir, { recursive: true });
  
  const tables = ['profiles', 'communities', 'community_members', 'rides', 'reviews'];
  
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*');
    
    if (error) {
      console.error(`Error exporting ${table}:`, error);
      continue;
    }
    
    const filePath = path.join(exportDir, `${table}.json`);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    console.log(`Exported ${table} to ${filePath}`);
  }
  
  console.log(`\nData exported to ${exportDir}`);
  console.log('You can review and manually import this data if needed');
}

async function main() {
  console.log('Starting migration from Supabase to MongoDB...\n');
  
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB\n');
    
    // First export to JSON as backup
    await exportToJSON();
    console.log('\n');
    
    // Clear existing collections (optional - comment out if you want to append)
    // await mongoose.connection.db.dropDatabase();
    // console.log('Cleared existing collections\n');
    
    // Migrate data
    await migrateProfiles();
    await migrateCommunities();
    await migrateCommunityMembers();
    await migrateRides();
    await migrateReviews();
    await migrateUsers();
    
    console.log('\n✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

main();
