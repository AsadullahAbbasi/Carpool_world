'use client';

import { useState, useEffect, useRef } from 'react';
import { ridesApi, communitiesApi, authApi } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Plus } from 'lucide-react';
import { validatePhone, validateFutureDate, validateTime, validateRequired } from '@/lib/validation';
import { rideSchema } from '@/lib/zod-schemas';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MultiSelect } from '@/components/MultiSelect';
import RideLimitAlert from '@/components/RideLimitAlert';
import ProfileDialog from './ProfileDialog';
import { useRouter } from 'next/navigation';

interface CreateRideDialogProps {
  children?: React.ReactNode;
  rideToEdit?: any;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onRideCreated?: (ride: any) => void;
  onRideUpdated?: (ride: any) => void;
  preselectedCommunityId?: string; // Auto-select this community when dialog opens
}

// Helper function to get current date and time
const getCurrentDateTime = () => {
  const now = new Date();
  const date = now.toISOString().split('T')[0];
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return { date, time };
};

// Convert 12-hour time to 24-hour format
const convert12To24 = (time12: string): string => {
  const match = time12.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return time12; // Return as-is if already 24-hour format

  let hours = parseInt(match[1]);
  const minutes = match[2];
  const ampm = match[3].toUpperCase();

  if (ampm === 'PM' && hours !== 12) {
    hours += 12;
  } else if (ampm === 'AM' && hours === 12) {
    hours = 0;
  }

  return `${String(hours).padStart(2, '0')}:${minutes}`;
};

// Convert 24-hour time to 12-hour format
const convert24To12 = (time24: string): string => {
  const [hours24, minutes] = time24.split(':').map(Number);
  const hours12 = hours24 % 12 || 12;
  const ampm = hours24 >= 12 ? 'PM' : 'AM';
  return `${String(hours12).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${ampm}`;
};

export const CreateRideDialog = ({ children, rideToEdit, open: controlledOpen, onOpenChange, onRideCreated, onRideUpdated, preselectedCommunityId }: CreateRideDialogProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = (value: boolean) => {
    // Check authentication when trying to open
    if (value && isAuthenticated === false) {
      setShowAuthModal(true);
      return;
    }
    
    if (onOpenChange) {
      onOpenChange(value);
    } else {
      setInternalOpen(value);
    }
  };

  const [loading, setLoading] = useState(false);
  const [communities, setCommunities] = useState<Array<{ id: string; name: string }>>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [disableAutoExpiry, setDisableAutoExpiry] = useState(false);

  // Refs to track if date/time pickers are open
  const rideDateRef = useRef<HTMLInputElement>(null);
  const expiryDateRef = useRef<HTMLInputElement>(null);
  const expiryTimeRef = useRef<HTMLInputElement>(null);
  const rideTimeRef = useRef<HTMLInputElement>(null);
  const [isRideDateOpen, setIsRideDateOpen] = useState(false);
  const [isExpiryDateOpen, setIsExpiryDateOpen] = useState(false);
  const [isExpiryTimeOpen, setIsExpiryTimeOpen] = useState(false);

  // Track if user has made changes to prevent accidental data loss
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const getInitialFormData = () => {
    const { date, time } = getCurrentDateTime();
    // Convert 24-hour time to 12-hour format for display
    const [hours24, minutes] = time.split(':').map(Number);
    const hours12 = hours24 % 12 || 12;
    const ampm = hours24 >= 12 ? 'PM' : 'AM';
    const time12 = `${String(hours12).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${ampm}`;

    return {
      type: 'offering',
      gender_preference: 'both',
      start_location: '',
      end_location: '',
      ride_date: date,
      ride_time: time12, // Store in 12-hour format
      seats_available: '',
      description: '',
      phone: '',
      community_ids: [] as string[],
      recurring_days: [] as string[],
      expiry_date: '', // Optional expiry date
      expiry_time: '', // Optional expiry time (24-hour format)
    };
  };

  const [formData, setFormData] = useState(getInitialFormData);

  const router = useRouter();
  // Checking active/expired rides
  const [activeRideAlertOpen, setActiveRideAlertOpen] = useState(false);
  const [expiredRideAlertOpen, setExpiredRideAlertOpen] = useState(false);

  // Track initial form data for change detection
  const [initialFormData, setInitialFormData] = useState(getInitialFormData);

  const { toast } = useToast();

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const data: any = await authApi.getCurrentUser();
        setIsAuthenticated(!!(data && data.user));
      } catch (error) {
        setIsAuthenticated(false);
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchCommunities();
      fetchUserSettings();
      // Auto-fill phone from profile when dialog opens (only if creating new ride)
      if (!rideToEdit) {
        fetchUserPhone();
      }
    }
  }, [isAuthenticated]);

  // Track unsaved changes
  useEffect(() => {
    const hasChanges = JSON.stringify(formData) !== JSON.stringify(initialFormData);
    setHasUnsavedChanges(hasChanges);
  }, [formData, initialFormData]);

  const fetchUserSettings = async () => {
    try {
      const userData: any = await authApi.getCurrentUser();
      if (userData?.profile?.disableAutoExpiry) {
        setDisableAutoExpiry(true);
      }
    } catch (error) {
      // Ignore errors, use default
    }
  };

  const fetchUserPhone = async () => {
    try {
      const userData: any = await authApi.getCurrentUser();
      if (userData?.profile?.phone) {
        setUserPhoneFromProfile(userData.profile.phone);
        setFormData(prev => ({
          ...prev,
          phone: userData.profile.phone,
        }));
      }
    } catch (error) {
      // Ignore errors
    }
  };

  useEffect(() => {
    if (rideToEdit) {
      // Handle legacy community_id compatibility or array community_ids
      let commIds: string[] = [];
      if (rideToEdit.community_ids && Array.isArray(rideToEdit.community_ids)) {
        commIds = rideToEdit.community_ids;
      } else if (rideToEdit.community_id && rideToEdit.community_id !== 'none') {
        commIds = [rideToEdit.community_id];
      }

      // Get current date/time for auto-update when editing
      const { date, time } = getCurrentDateTime();
      const time12 = convert24To12(time);

      const editFormData = {
        type: rideToEdit.type,
        gender_preference: rideToEdit.gender_preference || 'both',
        start_location: rideToEdit.start_location,
        end_location: rideToEdit.end_location,
        ride_date: date, // Auto-update to current date
        ride_time: time12, // Auto-update to current time
        seats_available: rideToEdit.seats_available?.toString() || '',
        description: rideToEdit.description || '',
        phone: rideToEdit.phone || '',
        community_ids: commIds,
        recurring_days: rideToEdit.recurring_days || [],
        expiry_date: '', // Will be calculated from expires_at if needed
        expiry_time: '',
      };

      setFormData(editFormData);
      setInitialFormData(editFormData); // Set initial state for change tracking
    } else {
      // Reset to current date/time when creating new ride
      const { date, time } = getCurrentDateTime();
      const time12 = convert24To12(time);
      const newFormData = {
        ...getInitialFormData(),
        ride_date: date,
        ride_time: time12,
        community_ids: preselectedCommunityId ? [preselectedCommunityId] : [],
      };
      setFormData(newFormData);
      setInitialFormData(newFormData);
    }
  }, [rideToEdit, preselectedCommunityId]);

  const fetchCommunities = async () => {
    try {
      // Fetch all communities, not just joined ones
      const allCommunitiesResponse: any = await communitiesApi.getCommunities();
      const allCommunities = allCommunitiesResponse?.communities || [];
      setCommunities(allCommunities || []);
    } catch (error) {
      console.error('Error fetching communities:', error);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate required fields
    const startLocationCheck = validateRequired(formData.start_location, 'Start location');
    if (!startLocationCheck.valid) newErrors.start_location = startLocationCheck.error || '';

    const endLocationCheck = validateRequired(formData.end_location, 'End location');
    if (!endLocationCheck.valid) newErrors.end_location = endLocationCheck.error || '';

    // Validate ride date
    const dateCheck = validateFutureDate(formData.ride_date);
    if (!dateCheck.valid) newErrors.ride_date = dateCheck.error || '';

    // Validate ride time - convert to 24-hour format first to check format
    if (formData.ride_time) {
      const rideTime24 = convert12To24(formData.ride_time);
      const timeCheck = validateTime(rideTime24);
      if (!timeCheck.valid) newErrors.ride_time = timeCheck.error || '';
    } else {
      newErrors.ride_time = 'Time is required';
    }

    // Phone is now mandatory - use the actual displayed value (formData.phone || userPhoneFromProfile)
    const phoneValue = formData.phone || userPhoneFromProfile;
    const phoneCheck = validatePhone(phoneValue, true);
    if (!phoneCheck.valid) newErrors.phone = phoneCheck.error || '';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [profileCompletionMessage, setProfileCompletionMessage] = useState('');
  const [userPhoneFromProfile, setUserPhoneFromProfile] = useState('');

  // Check profile function returns boolean indicating if profile is complete
  const checkProfile = async (): Promise<boolean> => {
    try {
      const userData: any = await authApi.getCurrentUser();
      const profile = userData.profile;

      if (profile) {
        // Check required fields based on gender
        const missingFields: string[] = [];

        if (!profile.fullName) missingFields.push('Full Name');
        if (!profile.phone) missingFields.push('Phone Number');
        if (!profile.gender) missingFields.push('Gender');

        // Avatar is required for male/other, optional for female
        if (profile.gender !== 'female' && !profile.avatarUrl) {
          missingFields.push('Profile Picture');
        }

        if (missingFields.length > 0) {
          const message = `To ensure trust and safety in our community, please complete your profile before creating a ride. Missing: ${missingFields.join(', ')}.`;
          setProfileCompletionMessage(message);
          setShowProfileDialog(true); // Open profile dialog
          return false;
        }
      }
      return true;
    } catch (error) {
      console.error('Error checking profile:', error);
      return false; // Fail safe
    }
  };

  const handleTriggerClick = async (e: React.MouseEvent) => {
    // Prevent default to stop any parent handlers or default button behavior
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // Ensure we have a fresh auth state before proceeding.
    // This prevents the dialog from opening (or doing nothing) while auth is still "unknown" (null).
    try {
      const data: any = await authApi.getCurrentUser();
      const authed = !!(data && data.user);
      setIsAuthenticated(authed);
      if (!authed) {
        setShowAuthModal(true);
        return;
      }
    } catch {
      setIsAuthenticated(false);
      setShowAuthModal(true);
      return;
    }

    // If editing, just open
    if (rideToEdit) {
      setOpen(true);
      return;
    }

    // Reset form data for new ride creation
    const freshFormData = getInitialFormData();
    // Auto-select preselected community if provided
    if (preselectedCommunityId) {
      freshFormData.community_ids = [preselectedCommunityId];
    }
    setFormData(freshFormData);
    setInitialFormData(freshFormData);
    setHasUnsavedChanges(false);

    // Check for existing active/expired rides if creating new
    try {
      const rideStatus = await ridesApi.checkRides();
      if (rideStatus.hasActiveRide) {
        setActiveRideAlertOpen(true);
        return;
      }
      if (rideStatus.hasExpiredRide) {
        setExpiredRideAlertOpen(true);
        // We still allow them to proceed if they choose to "Create New Ride" in the alert
        // But we wait for user action in the alert
        return;
      }
    } catch (error) {
      console.error('Failed to check rides:', error);
      // Fallback: allow opening if check fails
    }

    const isComplete = await checkProfile();
    if (isComplete) {
      setOpen(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    if (!validateForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors in the form',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    const previousErrors = { ...errors };
    setErrors({});

    try {
      // Always use current date and time as fallback
      const { date, time } = getCurrentDateTime();
      // When editing, always use current date; otherwise use form data or current date
      const rideDate = rideToEdit ? date : (formData.ride_date || date);
      // Convert user's selected time from 12-hour format to 24-hour format
      // If formData.ride_time exists, convert it; otherwise use current time
      const rideTime24 = formData.ride_time ? convert12To24(formData.ride_time) : time;

      // Calculate expiration (using local timezone-aware parsing)
      let expiresAt: Date;

      // If user has disabled auto-expiry, set to a far future date (30 days)
      if (disableAutoExpiry) {
        expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        expiresAt.setHours(23, 59, 59, 999);
      }
      // If user provided custom expiry date/time, use that
      else if (formData.expiry_date) {
        // Parse date in local timezone
        const [year, month, day] = formData.expiry_date.split('-').map(Number);

        if (formData.expiry_time) {
          // Both date and time provided
          const [expHours, expMinutes] = formData.expiry_time.split(':').map(Number);
          expiresAt = new Date(year, month - 1, day, expHours, expMinutes, 0, 0);
        } else {
          // Only date provided, set to end of day
          expiresAt = new Date(year, month - 1, day, 23, 59, 59, 999);
        }
      }
      // Otherwise, default to 24 hours after scheduled ride time
      else {
        // Parse ride date in local timezone
        const [year, month, day] = rideDate.split('-').map(Number);
        const [hours, minutes] = rideTime24.split(':').map(Number);

        // Create scheduled date/time in local timezone
        const scheduledDateTime = new Date(year, month - 1, day, hours, minutes, 0, 0);

        // Add 24 hours for expiration
        expiresAt = new Date(scheduledDateTime.getTime() + 24 * 60 * 60 * 1000);
      }

      // Safety check: ensure expiration is at least 1 hour in the future
      const minExpiration = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
      if (expiresAt < minExpiration) {
        expiresAt = minExpiration;
      }

      // Validate with Zod schema (using 24-hour format for rideTime)
      // Use the actual phone value (formData.phone || userPhoneFromProfile) to match what's displayed and validated
      const phoneValue = formData.phone || userPhoneFromProfile;
      const validatedData = rideSchema.parse({
        type: formData.type as 'offering' | 'seeking',
        genderPreference: formData.gender_preference as 'girls_only' | 'boys_only' | 'both',
        startLocation: formData.start_location,
        endLocation: formData.end_location,
        rideDate: rideDate,
        rideTime: rideTime24, // Use 24-hour format for API
        seatsAvailable: formData.seats_available && formData.seats_available.trim() ? parseInt(formData.seats_available) : undefined,
        description: formData.description || undefined,
        phone: phoneValue || undefined,
        communityIds: formData.community_ids.length > 0 ? formData.community_ids : undefined,
        recurringDays: formData.recurring_days.length > 0 ? formData.recurring_days : undefined,
      });

      // Add expiresAt (not in schema but required for API)
      const rideData = {
        ...validatedData,
        expiresAt: expiresAt.toISOString(),
      };

      // Get current user for optimistic update
      let currentUser: any = null;
      try {
        const userData: any = await authApi.getCurrentUser();
        currentUser = userData.user;
      } catch { }

      // Close dialog immediately (optimistic)
      setOpen(false);

      if (rideToEdit) {
        // Optimistic update for edit
        const optimisticRide = {
          ...rideToEdit,
          ...rideData,
          start_location: rideData.startLocation,
          end_location: rideData.endLocation,
          gender_preference: rideData.genderPreference || rideToEdit.gender_preference,
          ride_date: rideData.rideDate,
          ride_time: rideData.rideTime,
          seats_available: rideData.seatsAvailable,
          phone: rideData.phone,
          community_ids: rideData.communityIds || [],
          // Keep legacy for safety if needed
          community_id: rideData.communityIds && rideData.communityIds.length > 0 ? rideData.communityIds[0] : null,
          updated_at: new Date().toISOString(),
        };

        if (onRideUpdated) {
          onRideUpdated(optimisticRide);
        }

        // Make API call in background
        ridesApi.updateRide(rideToEdit.id, rideData).then((response: any) => {
          toast({
            title: '✅ Ride Updated!',
            description: `Your ${formData.type === 'offering' ? 'ride offer' : 'ride request'} has been updated successfully!`,
          });
          if (onRideUpdated && response.ride) {
            onRideUpdated(response.ride);
          }
        }).catch((error: any) => {
          toast({
            title: 'Error',
            description: error.message || 'Failed to update ride',
            variant: 'destructive',
          });
          setOpen(true); // Reopen dialog on error
          setErrors(previousErrors);
        });
      } else {
        // Optimistic update for create
        const tempId = `temp-${Date.now()}`;
        const optimisticRide = {
          id: tempId,
          type: rideData.type,
          start_location: rideData.startLocation,
          end_location: rideData.endLocation,
          ride_date: rideData.rideDate,
          ride_time: rideData.rideTime,
          seats_available: rideData.seatsAvailable,
          description: rideData.description,
          phone: rideData.phone,
          expires_at: rideData.expiresAt,
          user_id: currentUser?.id || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          community_ids: rideData.communityIds || [],
          recurring_days: rideData.recurringDays || [],
          profiles: currentUser ? { full_name: currentUser.email?.split('@')[0] || 'You' } : null,
        };

        if (onRideCreated) {
          onRideCreated(optimisticRide);
        }

        // Make API call in background
        ridesApi.createRide(rideData).then((response: any) => {
          toast({
            title: '🎉 Success!',
            description: `Your ${formData.type === 'offering' ? 'ride offer' : 'ride request'} from ${formData.start_location} to ${formData.end_location} has been posted!`,
          });
          if (onRideCreated && response.ride) {
            // Replace optimistic ride with real one
            onRideCreated(response.ride);
          }
        }).catch((error: any) => {
          // Identify if it was an Active Ride Error
          if (error.hasActiveRide) {
            setActiveRideAlertOpen(true);
            // Don't reopen dialog form
          } else {
            toast({
              title: 'Error',
              description: error.message || 'Failed to create ride',
              variant: 'destructive',
            });
            setOpen(true); // Reopen dialog on error
            setErrors(previousErrors);
          }
        });
      }

      // Reset form if creating new ride
      if (!rideToEdit) {
        const { date, time } = getCurrentDateTime();
        const time12 = convert24To12(time);
        const resetData = {
          type: 'offering',
          gender_preference: 'both',
          start_location: '',
          end_location: '',
          ride_date: date,
          ride_time: time12,
          seats_available: '',
          description: '',
          phone: '',
          community_ids: [],
          recurring_days: [],
          expiry_date: '',
          expiry_time: '',
        };
        setFormData(resetData);
        setInitialFormData(resetData);
        setHasUnsavedChanges(false);
      }
    } catch (error: any) {
      // Handle Zod validation errors
      if (error.name === 'ZodError' || error.errors || error.issues) {
        const zodErrors = error.issues || error.errors || [];
        const fieldErrors: Record<string, string> = {};
        let errorMessages: string[] = [];

        // Map Zod errors to form field errors
        zodErrors.forEach((err: any) => {
          const fieldName = err.path?.join('.') || '';
          const errorMsg = err.message || '';
          
          // Map schema field names to form field names
          if (fieldName === 'startLocation') fieldErrors.start_location = errorMsg;
          else if (fieldName === 'endLocation') fieldErrors.end_location = errorMsg;
          else if (fieldName === 'rideDate') fieldErrors.ride_date = errorMsg;
          else if (fieldName === 'rideTime') fieldErrors.ride_time = errorMsg;
          else if (fieldName === 'phone') fieldErrors.phone = errorMsg;
          else if (fieldName === 'genderPreference') fieldErrors.gender_preference = errorMsg;
          else if (fieldName === 'seatsAvailable') fieldErrors.seats_available = errorMsg;
          else if (fieldName === 'description') fieldErrors.description = errorMsg;
          
          errorMessages.push(`${fieldName}: ${errorMsg}`);
        });

        setErrors(fieldErrors);

        const errorMessage = errorMessages.length > 0
          ? errorMessages[0] // Show first error in toast
          : 'Please check your input and try again';

        toast({
          title: 'Validation Error',
          description: errorMessage,
          variant: 'destructive',
        });
      } else {
        // Handle other errors
        const errorMessage = typeof error.message === 'string'
          ? error.message
          : 'Failed to save ride. Please try again.';

        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
      }
      setOpen(true); // Reopen dialog on error
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateToMyRides = () => {
    setActiveRideAlertOpen(false);
    setExpiredRideAlertOpen(false);
    setOpen(false);
    // Navigate to dashboard with my-rides tab active
    router.replace('/dashboard?tab=my-rides');
  };

  const communityOptions = communities.map(c => ({
    label: c.name,
    value: c.id
  }));

  return (
    <>
      <RideLimitAlert
        open={activeRideAlertOpen}
        onOpenChange={setActiveRideAlertOpen}
        type="active"
        onNavigateToMyRides={handleNavigateToMyRides}
      />

      <RideLimitAlert
        open={expiredRideAlertOpen}
        onOpenChange={setExpiredRideAlertOpen}
        type="expired"
        onNavigateToMyRides={handleNavigateToMyRides}
        onProceed={() => {
          setExpiredRideAlertOpen(false);
          setOpen(true);
        }}
      />

      {children ? (
        <div onClick={handleTriggerClick} className="inline-block cursor-pointer">
          {children}
        </div>
      ) : null}

      <Dialog
        open={open}
        onOpenChange={(newOpen) => {
          // Prevent closing if there are unsaved changes
          if (!newOpen && hasUnsavedChanges) {
            const confirmClose = window.confirm(
              'You have unsaved changes. Are you sure you want to close? Your entered data will be lost.'
            );
            if (!confirmClose) {
              return; // Don't close the dialog
            }
          }
          setOpen(newOpen);
        }}
      >
        {/* Mobile-first: full width on mobile, max-w on desktop, scrollable content */}
        <DialogContent className="w-[calc(100%-1rem)] max-w-2xl max-h-[90vh] overflow-y-auto sm:w-full">
          <DialogHeader>
            <DialogTitle>{rideToEdit ? 'Edit Ride' : 'Post a Ride'}</DialogTitle>
            <DialogDescription>
              {rideToEdit ? 'Update your ride details' : 'Share your ride or request a ride from the community'}
            </DialogDescription>
          </DialogHeader>
          {!disableAutoExpiry && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-800">
              <p className="font-medium mb-1">ℹ️ Auto-Expiry Notice</p>
              <p>This ride will automatically expire 24 hours after the scheduled time if you don't select expiry date below. You can re-activate in my rides tab.</p>
            </div>
          )}
          {/* Mobile-first: adequate spacing between form fields */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-[1.25rem] sm:gap-[1rem]">
            <div className="flex flex-col gap-[0.5rem]">
              <Label htmlFor="type">Type of Ride</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger id="type">
                  <SelectValue placeholder="Select ride type" />
                </SelectTrigger>
                <SelectContent position="popper" side="bottom" align="start" sideOffset={4}>
                  <SelectItem value="offering">Offering a Ride</SelectItem>
                  <SelectItem value="seeking">Seeking a Ride</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-[0.5rem]">
              <Label htmlFor="gender_preference">Gender Preference <span className="text-destructive">*</span></Label>
              <Select
                value={formData.gender_preference}
                onValueChange={(value) => setFormData({ ...formData, gender_preference: value })}
              >
                <SelectTrigger id="gender_preference">
                  <SelectValue placeholder="Select gender preference" />
                </SelectTrigger>
                <SelectContent position="popper" side="bottom" align="start" sideOffset={4}>
                  <SelectItem value="girls_only">Girls Only</SelectItem>
                  <SelectItem value="boys_only">Boys Only</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-[0.5rem]">
              <Label htmlFor="community">Communities (Optional)</Label>
              <MultiSelect
                options={communityOptions}
                selected={formData.community_ids}
                onChange={(selected) => setFormData({ ...formData, community_ids: selected })}
                placeholder="Select communities (optional)"
              />
              <p className="text-xs text-muted-foreground">
                Select multiple communities to post to all of them at once.
              </p>
            </div>

            {/* Mobile-first: stack on mobile, side-by-side on tablet+ */}
            <div className="grid grid-cols-1 gap-[1.25rem] sm:grid-cols-2 sm:gap-[1rem]">
              <div className="flex flex-col gap-[0.5rem]">
                <Label htmlFor="start_location">Start Location</Label>
                <Input
                  id="start_location"
                  placeholder="E.g., Downtown"
                  value={formData.start_location}
                  onChange={(e) => {
                    setFormData({ ...formData, start_location: e.target.value });
                    if (errors.start_location) setErrors({ ...errors, start_location: '' });
                  }}
                  required
                  className={errors.start_location ? 'border-destructive' : ''}
                />
                {errors.start_location && (
                  <p className="text-base text-destructive leading-relaxed sm:text-sm sm:leading-normal">{errors.start_location}</p>
                )}
              </div>
              <div className="flex flex-col gap-[0.5rem]">
                <Label htmlFor="end_location">End Location</Label>
                <Input
                  id="end_location"
                  placeholder="E.g., Airport"
                  value={formData.end_location}
                  onChange={(e) => {
                    setFormData({ ...formData, end_location: e.target.value });
                    if (errors.end_location) setErrors({ ...errors, end_location: '' });
                  }}
                  required
                  className={errors.end_location ? 'border-destructive' : ''}
                />
                {errors.end_location && (
                  <p className="text-base text-destructive leading-relaxed sm:text-sm sm:leading-normal">{errors.end_location}</p>
                )}
              </div>
            </div>

            {/* Ride Date */}
            <div className="flex flex-col gap-[0.5rem]">
              <Label htmlFor="ride_date">Ride Date <span className="text-destructive">*</span></Label>
              <Input
                ref={rideDateRef}
                id="ride_date"
                type="date"
                value={formData.ride_date}
                onChange={(e) => {
                  setFormData({ ...formData, ride_date: e.target.value });
                  if (errors.ride_date) setErrors({ ...errors, ride_date: '' });
                  // Clear time error if date changes to future date
                  if (errors.ride_time) {
                    const selectedDate = new Date(e.target.value);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    selectedDate.setHours(0, 0, 0, 0);

                    if (selectedDate > today) {
                      const newErrors = { ...errors };
                      delete newErrors.ride_time;
                      setErrors(newErrors);
                    }
                  }
                }}
                onMouseDown={(e) => {
                  // If already focused (picker is open), close it
                  if (document.activeElement === rideDateRef.current) {
                    e.preventDefault();
                    if (rideDateRef.current) {
                      rideDateRef.current.blur();
                    }
                  }
                }}
                onFocus={() => {
                  setIsRideDateOpen(true);
                }}
                onBlur={() => {
                  setIsRideDateOpen(false);
                }}
                min={new Date().toISOString().split('T')[0]}
                required
                className={errors.ride_date ? 'border-destructive' : ''}
              />
              {errors.ride_date && (
                <p className="text-base text-destructive leading-relaxed sm:text-sm sm:leading-normal">{errors.ride_date}</p>
              )}
            </div>

            {/* Optional Expiry Date and Time (24-hour format) */}
            {!disableAutoExpiry && (
              <div className="grid grid-cols-1 gap-[1.25rem] sm:grid-cols-2 sm:gap-[1rem]">
                <div className="flex flex-col gap-[0.5rem]">
                  <Label htmlFor="expiry_date">Expiry Date (Optional)</Label>
                  <Input
                    ref={expiryDateRef}
                    id="expiry_date"
                    type="date"
                    value={formData.expiry_date}
                    onChange={(e) => {
                      setFormData({ ...formData, expiry_date: e.target.value });
                    }}
                    onMouseDown={(e) => {
                      // If already focused (picker is open), close it
                      if (document.activeElement === expiryDateRef.current) {
                        e.preventDefault();
                        if (expiryDateRef.current) {
                          expiryDateRef.current.blur();
                        }
                      }
                    }}
                    onFocus={() => {
                      setIsExpiryDateOpen(true);
                    }}
                    onBlur={() => {
                      setIsExpiryDateOpen(false);
                    }}
                    min={formData.ride_date || new Date().toISOString().split('T')[0]}
                  />
                  <p className="text-xs text-muted-foreground">Leave empty to auto-expire 24h after ride time</p>
                </div>
                <div className="flex flex-col gap-[0.5rem]">
                  <Label htmlFor="expiry_time">Expiry Time</Label>
                  <Input
                    ref={expiryTimeRef}
                    id="expiry_time"
                    type="time"
                    value={formData.expiry_time}
                    onChange={(e) => {
                      setFormData({ ...formData, expiry_time: e.target.value });
                    }}
                    onMouseDown={(e) => {
                      // If already focused (picker is open), close it
                      if (document.activeElement === expiryTimeRef.current && !expiryTimeRef.current?.disabled) {
                        e.preventDefault();
                        if (expiryTimeRef.current) {
                          expiryTimeRef.current.blur();
                        }
                      }
                    }}
                    onFocus={() => {
                      if (!expiryTimeRef.current?.disabled) {
                        setIsExpiryTimeOpen(true);
                      }
                    }}
                    onBlur={() => {
                      setIsExpiryTimeOpen(false);
                    }}
                    disabled={!formData.expiry_date}
                  />
                </div>
              </div>
            )}


            {formData.type === 'offering' && (
              <div className="flex flex-col gap-[0.5rem]">
                <Label htmlFor="seats_available">Available Seats</Label>
                <Input
                  id="seats_available"
                  type="number"
                  min="1"
                  placeholder="Number of seats"
                  value={formData.seats_available}
                  onChange={(e) =>
                    setFormData({ ...formData, seats_available: e.target.value })
                  }
                />
              </div>
            )}

            <div className="flex flex-col gap-[0.5rem]">
              <Label htmlFor="phone">Contact Phone <span className="text-destructive">*</span></Label>
              <Input
                id="phone"
                type="tel"
                maxLength={15}
                placeholder="+92 300 1234567 or 03001234567"
                value={formData.phone || userPhoneFromProfile}
                onChange={(e) => {
                  setFormData({ ...formData, phone: e.target.value });
                  if (errors.phone) setErrors({ ...errors, phone: '' });
                }}
                required
                className={errors.phone ? 'border-destructive' : ''}
              />
              {errors.phone && (
                <p className="text-base text-destructive leading-relaxed sm:text-sm sm:leading-normal">{errors.phone}</p>
              )}
            </div>

            <div className="flex flex-col gap-[0.5rem]">
              <Label htmlFor="description">Description (optional, max 200 chars)</Label>
              <Textarea
                id="description"
                placeholder="Any additional details..."
                value={formData.description}
                maxLength={200}
                onChange={(e) => {
                  const value = e.target.value;
                  setFormData({ ...formData, description: value });
                  if (value.length > 200) {
                    setErrors(prev => ({ ...prev, description: 'Description must be 200 characters or less' }));
                  } else if (errors.description) {
                    const { description, ...rest } = errors;
                    setErrors(rest);
                  }
                }}
                rows={3}
                className={errors.description ? 'border-destructive' : ''}
              />
              <div className="text-xs text-muted-foreground text-right">
                {formData.description.length}/200
              </div>
              {errors.description && (
                <p className="text-base text-destructive leading-relaxed sm:text-sm sm:leading-normal">{errors.description}</p>
              )}
            </div>

            <div className="flex flex-col gap-[0.5rem]">
              <Label>Recurring Days (for daily commutes)</Label>
              {/* Mobile-first: adequate spacing for touch targets */}
              <div className="flex flex-wrap gap-[0.5rem]">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                  <label
                    key={day}
                    className="flex items-center gap-[0.5rem] cursor-pointer px-[0.75rem] py-[0.625rem] border rounded-md hover:bg-accent min-h-[2.75rem] sm:min-h-[2.5rem] sm:px-[0.625rem] sm:py-[0.5rem]"
                  >
                    <input
                      type="checkbox"
                      checked={formData.recurring_days.includes(day)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            recurring_days: [...formData.recurring_days, day],
                          });
                        } else {
                          setFormData({
                            ...formData,
                            recurring_days: formData.recurring_days.filter((d) => d !== day),
                          });
                        }
                      }}
                      className="rounded w-[1.125rem] h-[1.125rem] sm:w-[1rem] sm:h-[1rem]"
                    />
                    <span className="text-base leading-none sm:text-sm">{day.slice(0, 3)}</span>
                  </label>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Saving...' : rideToEdit ? 'Update Ride' : 'Post Ride'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ProfileDialog
        open={showProfileDialog}
        onOpenChange={setShowProfileDialog}
        completionMessage={profileCompletionMessage}
        onProfileUpdate={() => {
          setShowProfileDialog(false);
          toast({
            title: 'Profile Updated',
            description: 'You can now create your ride.',
          });
        }}
      />

      {/* Auth Modal - shown when unauthenticated user tries to create a ride */}
      <Dialog open={showAuthModal} onOpenChange={setShowAuthModal}>
        <DialogContent className="animate-scale-in">
          <DialogHeader>
            <DialogTitle>Sign In Required</DialogTitle>
            <DialogDescription>
              You need to sign in to create a ride. Create an account or sign in to continue.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-4">
            <Button
              onClick={() => {
                router.push('/auth');
                setShowAuthModal(false);
              }}
              className="w-full"
            >
              Sign In / Sign Up
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowAuthModal(false)}
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
