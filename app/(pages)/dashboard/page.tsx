import { getServerUser, getServerRides, getServerCommunities, getServerUserCommunities } from '@/lib/server-data';
import DashboardClient from '@/components/DashboardClient';

export const dynamic = 'force-dynamic';

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

  // Allow unauthenticated access - users can browse without signing in
  // Authentication is only required for creating rides

  // Pre-fetch only what we need for first paint.
  // "My Rides" is fetched client-side when that tab is opened.
  const [allRides, communities, userCommunities] = await Promise.all([
    getServerRides({
      sortBy: 'newest',
      filterType: 'all',
    }),
    getServerCommunities(),
    user ? getServerUserCommunities(user.id) : Promise.resolve([]),
  ]);

  return (
    <DashboardClient
      initialUser={user}
      initialProfile={profile}
      initialRides={allRides}
      initialMyRides={[]}
      initialCommunities={communities}
      initialUserCommunities={userCommunities}
    />
  );
}
