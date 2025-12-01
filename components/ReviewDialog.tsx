'use client';

import { useState, useEffect } from 'react';
import { reviewsApi } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Star } from 'lucide-react';

interface ReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rideId: string;
  driverId: string;
  existingReview?: {
    id: string;
    rating: number;
    comment?: string;
  } | null;
}

const ReviewDialog = ({ open, onOpenChange, rideId, driverId, existingReview }: ReviewDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState(existingReview?.comment || '');
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setRating(existingReview?.rating || 0);
      setComment(existingReview?.comment || '');
    }
  }, [open, existingReview]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      toast({
        title: 'Rating Required',
        description: 'Please select a rating',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      if (existingReview) {
        await reviewsApi.updateReview(existingReview.id, {
          rating,
          comment: comment || undefined,
        });
        toast({
          title: 'Review Updated!',
          description: 'Your review has been updated.',
        });
      } else {
        await reviewsApi.createReview({
          rideId,
          driverId,
          rating,
          comment: comment || undefined,
        });
        toast({
          title: 'Review Submitted!',
          description: 'Thank you for your feedback.',
        });
      }

      setRating(0);
      setComment('');
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit review',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{existingReview ? 'Edit Your Review' : 'Rate Your Ride'}</DialogTitle>
          <DialogDescription>How was your experience with the driver?</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label>Rating</Label>
            <div className="flex gap-2 justify-center py-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-10 h-10 ${star <= (hoveredRating || rating)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                      }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment">Comment (optional)</Label>
            <Textarea
              id="comment"
              placeholder="Share your experience..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Submitting...' : (existingReview ? 'Update Review' : 'Submit Review')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ReviewDialog;
