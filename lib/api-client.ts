/**
 * Client-side API utility functions
 * Replaces Supabase client with fetch() calls to Next.js API routes
 */

const API_BASE = '/api';

export interface ApiError {
  error: string;
  details?: any;
}

async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json();

  if (!response.ok) {
    // Preserve error details from API
    const error: any = new Error(data.error || data.message || 'An error occurred');
    error.error = data.error;
    error.message = data.message || data.error || 'An error occurred';
    error.details = data.details;
    // Preserve other fields that might be useful
    if (data.nicVerified !== undefined) error.nicVerified = data.nicVerified;
    if (data.nicNumber !== undefined) error.nicNumber = data.nicNumber;
    throw error;
  }

  return data;
}

function getAuthHeaders(): HeadersInit {
  // Cookies are automatically sent with fetch requests in the browser
  return {
    'Content-Type': 'application/json',
  };
}

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;

  const cookies = document.cookie.split('; ');
  const tokenCookie = cookies.find(row => row.startsWith('token='));
  return tokenCookie ? tokenCookie.split('=')[1] : null;
}

// Auth API
export const authApi = {
  signup: async (email: string, password: string, fullName: string) => {
    const response = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password, fullName }),
    });
    return handleResponse(response);
  },

  login: async (email: string, password: string) => {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });
    return handleResponse(response);
  },

  logout: async () => {
    const response = await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    return handleResponse(response);
  },

  verifyEmail: async (token: string) => {
    const response = await fetch(`${API_BASE}/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ token }),
    });
    return handleResponse(response);
  },

  resendVerification: async () => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE}/auth/resend-verification`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      credentials: 'include',
    });
    return handleResponse<{ token: string; email: string; message: string }>(response);
  },

  forgotPassword: async (email: string) => {
    const response = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email }),
    });
    return handleResponse(response);
  },

  resetPassword: async (token: string, password: string) => {
    const response = await fetch(`${API_BASE}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ token, password }),
    });
    return handleResponse(response);
  },

  getCurrentUser: async () => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE}/auth/me`, {
      method: 'GET',
      headers: {
        ...getAuthHeaders(),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      credentials: 'include',
    });
    return handleResponse(response);
  },
};

// Storage API
export const storageApi = {
  uploadAvatar: async (file: File): Promise<{ url: string; key: string }> => {
    const formData = new FormData();
    formData.append('file', file);

    const token = getAuthToken();

    const response = await fetch(`${API_BASE}/storage/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: 'include',
      body: formData,
    });
    return handleResponse(response);
  },

  uploadNicImage: async (file: File, type: 'front' | 'back'): Promise<{ url: string; key: string; type: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    const token = getAuthToken();

    const response = await fetch(`${API_BASE}/storage/upload-nic`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: 'include',
      body: formData,
    });
    return handleResponse(response);
  },
};

// Profile API
export interface Profile {
  id: string;
  email: string;
  fullName: string;

  phone?: string;
  avatarUrl?: string;
  gender?: string;
  nicNumber?: string;
  nicVerified?: boolean;
  [key: string]: any;
}

export interface ProfileResponse {
  profile: Profile;
}

export const profileApi = {
  getProfile: async (): Promise<ProfileResponse> => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE}/profiles`, {
      method: 'GET',
      headers: {
        ...getAuthHeaders(),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      credentials: 'include',
    });
    return handleResponse<ProfileResponse>(response);
  },

  updateProfile: async (data: {
    fullName?: string;

    phone?: string;
    avatarUrl?: string;
    gender?: string;
    nicNumber?: string;
  }) => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE}/profiles`, {
      method: 'PUT',
      headers: {
        ...getAuthHeaders(),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  verifyNic: async (data: {
    nicFrontImageUrl: string;
    nicBackImageUrl: string;
  }) => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE}/profiles/verify-nic`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },
};

// Rides API
export const ridesApi = {
  getRides: async (params?: {
    search?: string;
    communityId?: string;
    type?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append('search', params.search);
    if (params?.communityId) queryParams.append('communityId', params.communityId);
    if (params?.type) queryParams.append('type', params.type);

    const token = getAuthToken();
    const response = await fetch(`${API_BASE}/rides?${queryParams.toString()}`, {
      method: 'GET',
      headers: {
        ...getAuthHeaders(),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      credentials: 'include',
    });
    return handleResponse(response);
  },

  createRide: async (data: {
    type: 'offering' | 'seeking';
    startLocation: string;
    endLocation: string;
    rideDate: string;
    rideTime: string;
    seatsAvailable?: number;
    description?: string;
    phone?: string;
    expiresAt: string;
    communityId?: string | null;
    recurringDays?: string[];
  }) => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE}/rides`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  updateRide: async (id: string, data: Partial<{
    type: 'offering' | 'seeking';
    startLocation: string;
    endLocation: string;
    rideDate: string;
    rideTime: string;
    seatsAvailable?: number;
    description?: string;
    phone?: string;
    expiresAt: string;
    communityId?: string | null;
    recurringDays?: string[];
  }>) => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE}/rides/${id}`, {
      method: 'PUT',
      headers: {
        ...getAuthHeaders(),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  deleteRide: async (id: string) => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE}/rides/${id}`, {
      method: 'DELETE',
      headers: {
        ...getAuthHeaders(),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      credentials: 'include',
    });
    return handleResponse(response);
  },
};

// Communities API
export interface Community {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at?: string;
  updated_at?: string;
  _count?: number;
}

export interface CommunitiesResponse {
  communities: Community[];
}

export interface CommunityResponse {
  community: Community;
}

export interface UserCommunitiesResponse {
  communities: string[];
}

export const communitiesApi = {
  getCommunities: async (): Promise<CommunitiesResponse> => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE}/communities`, {
      method: 'GET',
      headers: {
        ...getAuthHeaders(),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      credentials: 'include',
    });
    return handleResponse<CommunitiesResponse>(response);
  },

  createCommunity: async (data: { name: string; description?: string }): Promise<CommunityResponse> => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE}/communities`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    return handleResponse<CommunityResponse>(response);
  },

  updateCommunity: async (id: string, data: { name?: string; description?: string }) => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE}/communities/${id}`, {
      method: 'PUT',
      headers: {
        ...getAuthHeaders(),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  deleteCommunity: async (id: string) => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE}/communities/${id}`, {
      method: 'DELETE',
      headers: {
        ...getAuthHeaders(),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      credentials: 'include',
    });
    return handleResponse(response);
  },

  getUserCommunities: async (): Promise<UserCommunitiesResponse> => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE}/communities/members`, {
      method: 'GET',
      headers: {
        ...getAuthHeaders(),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      credentials: 'include',
    });
    return handleResponse<UserCommunitiesResponse>(response);
  },

  joinCommunity: async (communityId: string) => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE}/communities/members`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      credentials: 'include',
      body: JSON.stringify({ communityId }),
    });
    return handleResponse(response);
  },

  leaveCommunity: async (communityId: string) => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE}/communities/members?communityId=${communityId}`, {
      method: 'DELETE',
      headers: {
        ...getAuthHeaders(),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      credentials: 'include',
    });
    return handleResponse(response);
  },
};

// Reviews API
export const reviewsApi = {
  getReviews: async (params: { rideId?: string; driverId?: string }) => {
    const queryParams = new URLSearchParams();
    if (params.rideId) queryParams.append('rideId', params.rideId);
    if (params.driverId) queryParams.append('driverId', params.driverId);

    const token = getAuthToken();
    const response = await fetch(`${API_BASE}/reviews?${queryParams.toString()}`, {
      method: 'GET',
      headers: {
        ...getAuthHeaders(),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      credentials: 'include',
    });
    return handleResponse<{ reviews: any[] }>(response);
  },

  createReview: async (data: {
    rideId: string;
    driverId: string;
    rating: number;
    comment?: string;
  }) => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE}/reviews`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  updateReview: async (id: string, data: {
    rating: number;
    comment?: string;
  }) => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE}/reviews/${id}`, {
      method: 'PUT',
      headers: {
        ...getAuthHeaders(),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },
};