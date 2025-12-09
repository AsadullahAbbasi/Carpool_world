import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getServerUser, getServerRides, getServerCommunities, getServerUserCommunities } from '@/lib/server-data';
import DashboardClient from '@/components/DashboardClient';

// Loading skeleton for Suspense boundary
function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="space-y-6">
          <div className="h-12 bg-muted/50 rounded-md animate-pulse-slow" />
          <div className="h-10 bg-muted/50 rounded-md w-1/3 animate-pulse-slow" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="border rounded-lg p-4 space-y-3">
                <div className="h-4 bg-muted rounded w-1/3 mb-2" />
                <div className="h-3 bg-muted rounded w-2/3" />
                <div className="h-20 bg-muted rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Server Component - fetches data on the server
export default async function DashboardPage() {
  // Fetch user and rides data on the server
  const { user, profile } = await getServerUser();

  // Redirect to auth if not authenticated
  if (!user) {
    redirect('/auth');
  }

  // Pre-fetch data for all tabs
  const [allRides, myRides, communities, userCommunities] = await Promise.all([
    getServerRides({
      sortBy: 'newest',
      filterType: 'all',
    }),
    getServerRides({
      userId: user.id,
      sortBy: 'newest',
      filterType: 'all',
    }),
    getServerCommunities(),
    getServerUserCommunities(user.id),
  ]);

  return (
    <DashboardClient
      initialUser={user}
      initialProfile={profile}
      initialRides={allRides}
      initialMyRides={myRides}
      initialCommunities={communities}
      initialUserCommunities={userCommunities}
    />
  );
}
