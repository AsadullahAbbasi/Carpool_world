'use client';

import { useState, useEffect } from 'react';
import { storageApi, profileApi } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Upload, CheckCircle2, XCircle, Image as ImageIcon, ShieldCheck } from 'lucide-react';

interface NicVerificationProps {
  onVerificationComplete?: () => void;
}

const NicVerification = ({ onVerificationComplete }: NicVerificationProps) => {
  const [uploadingFront, setUploadingFront] = useState(false);
  const [uploadingBack, setUploadingBack] = useState(false);
  const [nicFrontImageUrl, setNicFrontImageUrl] = useState('');
  const [nicBackImageUrl, setNicBackImageUrl] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [isAlreadyVerified, setIsAlreadyVerified] = useState(false);
  const [existingNicNumber, setExistingNicNumber] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<{
    nicVerified: boolean;
    nicNumber?: string;
    confidence?: 'high' | 'medium' | 'low';
    requiresReview?: boolean;
  } | null>(null);
  const { toast } = useToast();

  // Check if NIC is already verified
  useEffect(() => {
    const checkVerificationStatus = async () => {
      try {
        const response: any = await profileApi.getProfile();
        const profile = response?.profile;
        if (profile?.nicVerified) {
          setIsAlreadyVerified(true);
          setExistingNicNumber(profile.nicNumber || null);
        }
      } catch (error) {
        // Silently fail - user can still try to verify
      }
    };
    checkVerificationStatus();
  }, []);

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'front' | 'back'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side validation
    // Check file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid File Type',
        description: 'Please upload an image file (JPEG, PNG, or WebP)',
        variant: 'destructive',
      });
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'Image size must be less than 5MB. Please compress the image and try again.',
        variant: 'destructive',
      });
      return;
    }

    // Check minimum file size (too small might be invalid)
    if (file.size < 10 * 1024) { // Less than 10KB is suspicious
      toast({
        title: 'File Too Small',
        description: 'Image appears to be too small. Please ensure you upload a clear, high-quality image.',
        variant: 'destructive',
      });
      return;
    }

    const setUploading = type === 'front' ? setUploadingFront : setUploadingBack;
    const setImageUrl = type === 'front' ? setNicFrontImageUrl : setNicBackImageUrl;

    setUploading(true);
    try {
      // Upload to dedicated NIC images endpoint
      const { url } = await storageApi.uploadNicImage(file, type);
      setImageUrl(url);

      toast({
        title: '✅ Image Uploaded',
        description: `NIC ${type === 'front' ? 'front' : 'back'} image uploaded successfully! Make sure the image is clear and shows the full NIC card.`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || `Failed to upload ${type} image`,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleVerify = async () => {
    if (!nicFrontImageUrl || !nicBackImageUrl) {
      toast({
        title: 'Error',
        description: 'Please upload both front and back images of your NIC',
        variant: 'destructive',
      });
      return;
    }

    setVerifying(true);
    try {
      const data: any = await profileApi.verifyNic({
        nicFrontImageUrl,
        nicBackImageUrl,
      });

      setVerificationResult(data);
      setVerified(data.nicVerified || false);

      if (data.nicVerified) {
        toast({
          title: '✅ NIC Verified Successfully',
          description: `Your NIC has been verified. NIC Number: ${data.nicNumber || 'N/A'}`,
        });
      } else {
        toast({
          title: '📋 Verification Submitted',
          description: 'Your NIC images have been submitted and are pending admin review. You will be notified once verified.',
        });
      }

      if (onVerificationComplete) {
        onVerificationComplete();
      }
    } catch (error: any) {
      // Handle already verified error
      if (error.message?.includes('already verified') || error.error === 'NIC already verified') {
        setIsAlreadyVerified(true);
        setExistingNicNumber(error.nicNumber || null);
        toast({
          title: 'NIC Already Verified',
          description: 'Your NIC has already been verified and cannot be changed.',
        });
        return;
      }
      
      // Handle other errors
      {
        // Extract error message from response if available
        let errorMessage = error.message || 'Failed to verify NIC';
        if (error.error) {
          errorMessage = error.error;
          if (error.message) {
            errorMessage += ': ' + error.message;
          }
        }
        
        toast({
          title: 'Error',
          description: errorMessage + '. Please check your internet connection and try again.',
          variant: 'destructive',
        });
      }
      
      console.error('NIC verification error:', error);
    } finally {
      setVerifying(false);
    }
  };

  // Show already verified state
  if (isAlreadyVerified) {
    return (
      <Card className="w-full max-w-2xl animate-fade-in border-green-500/50 bg-green-500/5">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-green-600 dark:text-green-400" />
            NIC Already Verified
          </CardTitle>
          <CardDescription>
            Your NIC has been successfully verified and cannot be changed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
            <p className="text-sm font-semibold text-green-900 dark:text-green-100 mb-2">
              Verified NIC Number:
            </p>
            <p className="text-lg font-mono font-bold text-green-800 dark:text-green-200">
              {existingNicNumber || 'N/A'}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Your NIC verification is permanent and cannot be modified. This helps maintain trust and security in the platform.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl animate-fade-in">
      <CardHeader>
        <CardTitle className="text-2xl">NIC Verification</CardTitle>
        <CardDescription>
          Upload clear photos of your NIC front and back for verification. This helps build trust in the community.
          <br />
          <strong className="text-foreground">Note: You can only verify your NIC once. Make sure images are clear and accurate.</strong>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Front Image */}
          <div className="space-y-2">
            <Label htmlFor="nic-front">NIC Front</Label>
            <div className="relative border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center min-h-[200px] hover:border-foreground/20 transition-colors">
              {nicFrontImageUrl ? (
                <div className="relative w-full h-full">
                  <img
                    src={nicFrontImageUrl}
                    alt="NIC Front"
                    className="w-full h-auto rounded-lg max-h-[200px] object-contain"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={() => setNicFrontImageUrl('')}
                  >
                    <XCircle className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <ImageIcon className="w-12 h-12 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground text-center mb-2">
                    Upload NIC front image
                  </p>
                  <input
                    type="file"
                    id="nic-front"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageUpload(e, 'front')}
                    disabled={uploadingFront}
                  />
                  <Label htmlFor="nic-front">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={uploadingFront}
                      onClick={() => document.getElementById('nic-front')?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {uploadingFront ? 'Uploading...' : 'Choose File'}
                    </Button>
                  </Label>
                </>
              )}
            </div>
          </div>

          {/* Back Image */}
          <div className="space-y-2">
            <Label htmlFor="nic-back">NIC Back</Label>
            <div className="relative border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center min-h-[200px] hover:border-foreground/20 transition-colors">
              {nicBackImageUrl ? (
                <div className="relative w-full h-full">
                  <img
                    src={nicBackImageUrl}
                    alt="NIC Back"
                    className="w-full h-auto rounded-lg max-h-[200px] object-contain"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={() => setNicBackImageUrl('')}
                  >
                    <XCircle className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <ImageIcon className="w-12 h-12 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground text-center mb-2">
                    Upload NIC back image
                  </p>
                  <input
                    type="file"
                    id="nic-back"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageUpload(e, 'back')}
                    disabled={uploadingBack}
                  />
                  <Label htmlFor="nic-back">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={uploadingBack}
                      onClick={() => document.getElementById('nic-back')?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {uploadingBack ? 'Uploading...' : 'Choose File'}
                    </Button>
                  </Label>
                </>
              )}
            </div>
          </div>
        </div>

        {nicFrontImageUrl && nicBackImageUrl && (
          <Button
            type="button"
            onClick={handleVerify}
            disabled={verifying}
            className="w-full"
          >
            {verifying ? (
              'Processing...'
            ) : verified ? (
              '✓ Verified'
            ) : (
              'Submit for Verification'
            )}
          </Button>
        )}

        {verificationResult && (
          <div className={`p-4 rounded-lg border ${
            verificationResult.nicVerified 
              ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800' 
              : 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800'
          }`}>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {verificationResult.nicVerified ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                )}
                <p className={`font-semibold ${
                  verificationResult.nicVerified 
                    ? 'text-green-800 dark:text-green-200' 
                    : 'text-yellow-800 dark:text-yellow-200'
                }`}>
                  {verificationResult.nicVerified 
                    ? 'NIC Verified Successfully' 
                    : 'Verification Pending Review'}
                </p>
              </div>
              {verificationResult.requiresReview && (
                <p className="text-xs text-muted-foreground">
                  Your verification will be reviewed by an administrator. You will be notified once verified.
                </p>
              )}
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center">
          NIC verification is optional. Upload clear, well-lit images of your NIC front and back for best results.
        </p>
      </CardContent>
    </Card>
  );
};

export default NicVerification;

