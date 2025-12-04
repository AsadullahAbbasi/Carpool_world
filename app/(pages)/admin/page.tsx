'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ShieldCheck, X, CheckCircle2, XCircle, LogOut, Eye, Users, Clock } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Profile {
  _id: string;
  userId: string;
  fullName: string;

  nicFrontImageUrl?: string;
  nicBackImageUrl?: string;
  nicNumber?: string;
  nicVerified: boolean;
  username: string;
  userEmail: string;
}

export default function AdminPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  const [nicNumber, setNicNumber] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [communityRequests, setCommunityRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processingRequest, setProcessingRequest] = useState(false);
  const [requestStatusFilter, setRequestStatusFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');

  useEffect(() => {
    // Check if already logged in
    checkAuth();
  }, []);

  const checkAuth = async () => {
    setCheckingAuth(true);
    try {
      const response = await fetch('/api/admin/verify-nic', {
        method: 'GET',
        credentials: 'include',
      });
      if (response.ok) {
        setIsLoggedIn(true);
        loadProfiles();
        loadCommunityRequests();
      } else {
        setIsLoggedIn(false);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setIsLoggedIn(false);
    } finally {
      setCheckingAuth(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Wait a bit for cookie to be set, then check auth
        setTimeout(() => {
          checkAuth();
        }, 100);
        toast({
          title: 'Login successful',
          description: 'Welcome to the admin panel',
        });
      } else {
        toast({
          title: 'Login failed',
          description: data.error || 'Invalid credentials',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to login',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      setIsLoggedIn(false);
      setProfiles([]);
      toast({
        title: 'Logged out',
        description: 'You have been logged out',
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const loadProfiles = async () => {
    setLoadingProfiles(true);
    try {
      const response = await fetch('/api/admin/verify-nic', {
        method: 'GET',
        credentials: 'include',
      });
      const data = await response.json();
      if (response.ok) {
        setProfiles(data.profiles || []);
      } else {
        if (response.status === 401) {
          setIsLoggedIn(false);
          toast({
            title: 'Session Expired',
            description: 'Please login again',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Error',
            description: data.error || 'Failed to load profiles',
            variant: 'destructive',
          });
        }
      }
    } catch (error: any) {
      console.error('Load profiles error:', error);
      if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        setIsLoggedIn(false);
      }
      toast({
        title: 'Error',
        description: error.message || 'Failed to load profiles',
        variant: 'destructive',
      });
    } finally {
      setLoadingProfiles(false);
    }
  };

  const handleVerify = async (verified: boolean) => {
    if (!selectedProfile) return;

    if (verified && !nicNumber.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter NIC number',
        variant: 'destructive',
      });
      return;
    }

    setVerifying(true);
    try {
      const response = await fetch('/api/admin/verify-nic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          profileId: selectedProfile._id,
          nicNumber: nicNumber.trim(),
          verified,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: verified ? 'NIC Verified' : 'NIC Rejected',
          description: data.message,
        });
        setShowVerifyDialog(false);
        setSelectedProfile(null);
        setNicNumber('');
        loadProfiles();
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to verify NIC',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to verify NIC',
        variant: 'destructive',
      });
    } finally {
      setVerifying(false);
    }
  };

  const openVerifyDialog = (profile: Profile) => {
    setSelectedProfile(profile);
    setNicNumber(profile.nicNumber || '');
    setShowVerifyDialog(true);
  };

  const loadCommunityRequests = async () => {
    setLoadingRequests(true);
    try {
      const response = await fetch(`/api/community-requests?status=${requestStatusFilter}`, {
        method: 'GET',
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setCommunityRequests(data.requests || []);
      }
    } catch (error) {
      console.error('Error loading community requests:', error);
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      loadCommunityRequests();
    }
  }, [isLoggedIn, requestStatusFilter]);

  const handleApproveRequest = async (requestId: string) => {
    setProcessingRequest(true);
    try {
      const response = await fetch(`/api/community-requests/${requestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'approved' }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Request Approved',
          description: 'Community has been created successfully.',
        });
        setShowRequestDialog(false);
        setSelectedRequest(null);
        loadCommunityRequests();
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to approve request',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve request',
        variant: 'destructive',
      });
    } finally {
      setProcessingRequest(false);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    if (!rejectionReason.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please provide a reason for rejection',
        variant: 'destructive',
      });
      return;
    }

    setProcessingRequest(true);
    try {
      const response = await fetch(`/api/community-requests/${requestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'rejected', rejectionReason: rejectionReason.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Request Rejected',
          description: 'The community request has been rejected.',
        });
        setShowRequestDialog(false);
        setSelectedRequest(null);
        setRejectionReason('');
        loadCommunityRequests();
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to reject request',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reject request',
        variant: 'destructive',
      });
    } finally {
      setProcessingRequest(false);
    }
  };

  const openRequestDialog = (request: any) => {
    setSelectedRequest(request);
    setRejectionReason('');
    setShowRequestDialog(true);
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="w-6 h-6" />
              Admin Login
            </CardTitle>
            <CardDescription>Enter your admin credentials to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Logging in...' : 'Login'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <ShieldCheck className="w-8 h-8" />
              Admin Panel
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage NIC verifications and community requests
            </p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>

        <Tabs defaultValue="nic" className="space-y-6">
          <TabsList>
            <TabsTrigger value="nic">NIC Verifications</TabsTrigger>
            <TabsTrigger value="communities">Community Requests</TabsTrigger>
          </TabsList>

          <TabsContent value="nic">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Pending NIC Verifications</CardTitle>
                    <CardDescription>
                      {profiles.length} profile(s) awaiting verification
                    </CardDescription>
                  </div>
                  <Button onClick={loadProfiles} variant="outline" disabled={loadingProfiles}>
                    {loadingProfiles ? 'Loading...' : 'Refresh'}
                  </Button>
                </div>
              </CardHeader>
          <CardContent>
            {loadingProfiles ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : profiles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No pending verifications
              </div>
            ) : (
              <div className="space-y-4">
                {profiles.map((profile) => (
                  <Card key={profile._id} className="border">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{profile.fullName}</CardTitle>
                          <CardDescription>Username: {profile.username}</CardDescription>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openVerifyDialog(profile)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Review
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {profile.nicFrontImageUrl && (
                          <div>
                            <Label className="text-sm font-semibold mb-2 block">
                              Front Image
                            </Label>
                            <img
                              src={profile.nicFrontImageUrl}
                              alt="NIC Front"
                              className="w-full rounded-lg border max-h-64 object-contain bg-gray-50"
                            />
                          </div>
                        )}
                        {profile.nicBackImageUrl && (
                          <div>
                            <Label className="text-sm font-semibold mb-2 block">
                              Back Image
                            </Label>
                            <img
                              src={profile.nicBackImageUrl}
                              alt="NIC Back"
                              className="w-full rounded-lg border max-h-64 object-contain bg-gray-50"
                            />
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="communities">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Community Requests</CardTitle>
                    <CardDescription>
                      Review and approve/reject community creation requests
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={requestStatusFilter}
                      onChange={(e) => setRequestStatusFilter(e.target.value as any)}
                      className="px-3 py-2 border rounded-md text-sm"
                    >
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                    <Button onClick={loadCommunityRequests} variant="outline" disabled={loadingRequests}>
                      {loadingRequests ? 'Loading...' : 'Refresh'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loadingRequests ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : communityRequests.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No {requestStatusFilter} requests
                  </div>
                ) : (
                  <div className="space-y-4">
                    {communityRequests.map((request) => (
                      <Card key={request.id} className="border">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-lg flex items-center gap-2">
                                <Users className="w-5 h-5" />
                                {request.name}
                              </CardTitle>
                              <CardDescription className="mt-1">
                                Requested by: {request.requestedByUsername} ({request.requestedByEmail})
                              </CardDescription>
                              <CardDescription className="text-xs mt-1">
                                {new Date(request.createdAt).toLocaleString()}
                              </CardDescription>
                            </div>
                            {request.status === 'pending' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openRequestDialog(request)}
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                Review
                              </Button>
                            )}
                            {request.status === 'approved' && (
                              <Badge className="bg-green-500">Approved</Badge>
                            )}
                            {request.status === 'rejected' && (
                              <Badge variant="destructive">Rejected</Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <Label className="text-sm font-semibold">Description:</Label>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                              {request.description}
                            </p>
                          </div>
                          {request.status === 'rejected' && request.rejectionReason && (
                            <div className="mt-4 space-y-2">
                              <Label className="text-sm font-semibold text-destructive">Rejection Reason:</Label>
                              <p className="text-sm text-muted-foreground">{request.rejectionReason}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showVerifyDialog} onOpenChange={setShowVerifyDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Verify NIC - {selectedProfile?.fullName}</DialogTitle>
            <DialogDescription>
              Review the NIC images and enter the NIC number to verify
            </DialogDescription>
          </DialogHeader>
          {selectedProfile && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedProfile.nicFrontImageUrl && (
                  <div>
                    <Label className="text-sm font-semibold mb-2 block">
                      Front Image
                    </Label>
                    <img
                      src={selectedProfile.nicFrontImageUrl}
                      alt="NIC Front"
                      className="w-full rounded-lg border max-h-96 object-contain bg-gray-50"
                    />
                  </div>
                )}
                {selectedProfile.nicBackImageUrl && (
                  <div>
                    <Label className="text-sm font-semibold mb-2 block">
                      Back Image
                    </Label>
                    <img
                      src={selectedProfile.nicBackImageUrl}
                      alt="NIC Back"
                      className="w-full rounded-lg border max-h-96 object-contain bg-gray-50"
                    />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="nicNumber">NIC Number</Label>
                <Input
                  id="nicNumber"
                  type="text"
                  inputMode="numeric"
                  value={nicNumber}
                  onChange={(e) => {
                    // Only allow numeric characters
                    const value = e.target.value.replace(/\D/g, '');
                    setNicNumber(value);
                  }}
                  onKeyDown={(e) => {
                    // Prevent non-numeric keys except editing keys
                    if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  onWheel={(e) => {
                    // Prevent scroll from changing number
                    e.currentTarget.blur();
                  }}
                  placeholder="Enter 13-digit NIC number"
                  maxLength={15}
                />
                <p className="text-xs text-muted-foreground">
                  Format: 12345-1234567-1 or 1234512345671
                </p>
              </div>
            </div>
          )}
          <DialogFooter className="flex gap-2">
            <Button
              variant="destructive"
              onClick={() => handleVerify(false)}
              disabled={verifying}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Reject
            </Button>
            <Button
              onClick={() => handleVerify(true)}
              disabled={verifying || !nicNumber.trim()}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              {verifying ? 'Verifying...' : 'Verify'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRequestDialog} onOpenChange={(open) => {
        setShowRequestDialog(open);
        if (!open) {
          setSelectedRequest(null);
          setRejectionReason('');
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Community Request - {selectedRequest?.name}</DialogTitle>
            <DialogDescription>
              Review the request details and approve or reject
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Community Name:</Label>
                <p className="text-sm">{selectedRequest.name}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Requested By:</Label>
                <p className="text-sm">{selectedRequest.requestedByUsername} ({selectedRequest.requestedByEmail})</p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Description:</Label>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedRequest.description}</p>
              </div>
              
              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <Label className="text-sm font-semibold">Rejection Guidelines:</Label>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Duplicate or similar community name already exists</li>
                  <li>Inappropriate, offensive, or spam content</li>
                  <li>Vague or unclear purpose (description doesn't explain why it's needed)</li>
                  <li>Not related to carpooling/ridesharing purpose</li>
                  <li>Violates platform terms or community guidelines</li>
                  <li>Request appears to be for personal/commercial use unrelated to ridesharing</li>
                </ul>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rejectionReason" className="text-sm font-semibold">
                  Rejection Reason (required if rejecting):
                </Label>
                <Textarea
                  id="rejectionReason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain why this request is being rejected (e.g., 'Duplicate community name', 'Description too vague', 'Not related to carpooling')"
                  rows={3}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  A clear rejection reason helps the requester understand and improve future requests.
                </p>
              </div>
            </div>
          )}
          <DialogFooter className="flex gap-2">
            <Button
              variant="destructive"
              onClick={() => selectedRequest && handleRejectRequest(selectedRequest.id)}
              disabled={processingRequest}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Reject
            </Button>
            <Button
              onClick={() => selectedRequest && handleApproveRequest(selectedRequest.id)}
              disabled={processingRequest}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              {processingRequest ? 'Processing...' : 'Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

