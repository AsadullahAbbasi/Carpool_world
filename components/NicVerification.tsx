'use client';

import { useState } from 'react';
import { storageApi } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Upload, CheckCircle2, XCircle, Image as ImageIcon } from 'lucide-react';
import { profileApi } from '@/lib/api-client';

interface NicVerificationProps {
  onVerificationComplete?: () => void;
}

interface NicVerificationResponse {
  message?: string;
  nicVerified: boolean;
  nicNumber?: string;
  confidence?: 'high' | 'medium' | 'low';
  requiresReview?: boolean;
  error?: string;
}

const NicVerification = ({ onVerificationComplete }: NicVerificationProps) => {
  const [uploadingFront, setUploadingFront] = useState(false);
  const [uploadingBack, setUploadingBack] = useState(false);
  const [nicFrontImageUrl, setNicFrontImageUrl] = useState('');
  const [nicBackImageUrl, setNicBackImageUrl] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    nicVerified: boolean;
    nicNumber?: string;
    confidence?: 'high' | 'medium' | 'low';
    requiresReview?: boolean;
  } | null>(null);
  const { toast } = useToast();

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'front' | 'back'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const setUploading = type === 'front' ? setUploadingFront : setUploadingBack;
    const setImageUrl = type === 'front' ? setNicFrontImageUrl : setNicBackImageUrl;

    setUploading(true);
    try {
      // Upload to storage (using avatar upload endpoint for now, you may want a dedicated NIC endpoint)
      const { url } = await storageApi.uploadAvatar(file);
      setImageUrl(url);

      toast({
        title: '✅ Image Uploaded',
        description: `NIC ${type === 'front' ? 'front' : 'back'} image uploaded successfully!`,
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
      const data = await profileApi.verifyNic({
        nicFrontImageUrl,
        nicBackImageUrl,
      }) as NicVerificationResponse;

      setVerificationResult({
        nicVerified: data.nicVerified,
        nicNumber: data.nicNumber,
        confidence: data.confidence,
        requiresReview: data.requiresReview,
      });
      setVerified(data.nicVerified || false);

      if (data.nicVerified) {
        toast({
          title: '✅ NIC Verified Successfully',
          description: `Your NIC has been verified automatically. NIC Number: ${data.nicNumber || 'N/A'}`,
        });
      } else if (data.nicNumber) {
        toast({
          title: '⚠️ Verification Pending Review',
          description: 'NIC number extracted but requires manual review. You can still use the platform.',
        });
      } else {
        toast({
          title: '⚠️ Verification Submitted',
          description: data.message || 'Your NIC verification has been submitted and is pending admin review.',
        });
      }

      if (onVerificationComplete) {
        onVerificationComplete();
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

  return (
    <Card className="w-full max-w-2xl animate-fade-in">
      <CardHeader>
        <CardTitle className="text-[clamp(1.25rem,2.5vw+0.75rem,1.5rem)]">NIC Verification (Optional)</CardTitle>
        <CardDescription>
          Upload clear photos of your NIC front and back for verification. This helps build trust in the community.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-[1.25rem] sm:gap-[1.5rem]">
        <div className="grid grid-cols-1 gap-[1.25rem] md:grid-cols-2 md:gap-[1.5rem]">
          {/* Front Image */}
          <div className="flex flex-col gap-[0.5rem]">
            <Label htmlFor="nic-front">NIC Front</Label>
            <div className="relative border-2 border-dashed border-border rounded-lg p-[1rem] flex flex-col items-center justify-center min-h-[12.5rem] hover:border-foreground/20 transition-colors sm:p-[1.5rem]">
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
                  <ImageIcon className="w-[3rem] h-[3rem] text-muted-foreground mb-[0.75rem]" />
                  <p className="text-base text-muted-foreground text-center mb-[0.75rem] sm:text-sm">
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
                      <Upload className="w-[1.25rem] h-[1.25rem] mr-[0.5rem] sm:w-[1rem] sm:h-[1rem]" />
                      {uploadingFront ? 'Uploading...' : 'Choose File'}
                    </Button>
                  </Label>
                </>
              )}
            </div>
          </div>

          {/* Back Image */}
          <div className="flex flex-col gap-[0.5rem]">
            <Label htmlFor="nic-back">NIC Back</Label>
            <div className="relative border-2 border-dashed border-border rounded-lg p-[1rem] flex flex-col items-center justify-center min-h-[12.5rem] hover:border-foreground/20 transition-colors sm:p-[1.5rem]">
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
                  <ImageIcon className="w-[3rem] h-[3rem] text-muted-foreground mb-[0.75rem]" />
                  <p className="text-base text-muted-foreground text-center mb-[0.75rem] sm:text-sm">
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
                      <Upload className="w-[1.25rem] h-[1.25rem] mr-[0.5rem] sm:w-[1rem] sm:h-[1rem]" />
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
          <div className={`p-[1rem] rounded-lg border ${
            verificationResult.nicVerified 
              ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800' 
              : verificationResult.nicNumber
              ? 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800'
              : 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
          }`}>
            <div className="flex flex-col gap-[0.5rem]">
              <div className="flex items-center gap-[0.5rem]">
                {verificationResult.nicVerified ? (
                  <CheckCircle2 className="w-[1.25rem] h-[1.25rem] text-green-600 dark:text-green-400 shrink-0" />
                ) : (
                  <XCircle className="w-[1.25rem] h-[1.25rem] text-yellow-600 dark:text-yellow-400 shrink-0" />
                )}
                <p className={`font-semibold text-base sm:text-sm ${
                  verificationResult.nicVerified 
                    ? 'text-green-800 dark:text-green-200' 
                    : 'text-yellow-800 dark:text-yellow-200'
                }`}>
                  {verificationResult.nicVerified 
                    ? 'NIC Verified Successfully' 
                    : verificationResult.nicNumber
                    ? 'Verification Pending Review'
                    : 'Could Not Extract NIC Number'}
                </p>
              </div>
              {verificationResult.nicNumber && (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Extracted NIC: <span className="font-mono font-semibold">{verificationResult.nicNumber}</span>
                </p>
              )}
              {verificationResult.confidence && (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Confidence: <span className="capitalize">{verificationResult.confidence}</span>
                </p>
              )}
              {verificationResult.requiresReview && (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your verification will be reviewed by an administrator.
                </p>
              )}
            </div>
          </div>
        )}

        <p className="text-sm text-muted-foreground text-center leading-relaxed sm:text-xs">
          NIC verification is optional. Upload clear, well-lit images of your NIC front and back for best results.
        </p>
      </CardContent>
    </Card>
  );
};

export default NicVerification;

