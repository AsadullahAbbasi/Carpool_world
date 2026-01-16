'use client';

import { useEffect, useState } from 'react';
import { reviewsApi } from '@/lib/api-client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Star, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Review {
    id: string;
    rating: number;
    comment?: string;
    createdAt: string;
    reviewer: {
        fullName: string;
        avatarUrl?: string;
    } | null;
}

interface ReviewsListProps {
    rideId?: string;
    driverId?: string;
}

const ReviewsList = ({ rideId, driverId }: ReviewsListProps) => {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReviews = async () => {
            try {
                const data = await reviewsApi.getReviews({ rideId, driverId });
                setReviews(data.reviews);
            } catch (error) {

            } finally {
                setLoading(false);
            }
        };

        if (rideId || driverId) {
            fetchReviews();
        }
    }, [rideId, driverId]);

    if (loading) {
        return <div className="text-center py-4 text-muted-foreground">Loading reviews...</div>;
    }

    if (reviews.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground bg-muted/30 rounded-lg">
                No reviews yet.
            </div>
        );
    }

    const averageRating = reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center gap-1">
                    <Star className="w-6 h-6 fill-yellow-400 text-yellow-400" />
                    <span className="text-2xl font-bold">{averageRating.toFixed(1)}</span>
                </div>
                <span className="text-muted-foreground">
                    ({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})
                </span>
            </div>

            <div className="grid gap-4">
                {reviews.map((review) => (
                    <Card key={review.id} className="bg-card/50">
                        <CardHeader className="pb-2">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <Avatar className="w-8 h-8">
                                        <AvatarImage src={review.reviewer?.avatarUrl} />
                                        <AvatarFallback>
                                            {review.reviewer?.fullName?.charAt(0).toUpperCase() || <User className="w-4 h-4" />}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <CardTitle className="text-sm font-medium">
                                            {review.reviewer?.fullName || 'Anonymous User'}
                                        </CardTitle>
                                        <p className="text-xs text-muted-foreground">
                                            {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-0.5">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <Star
                                            key={star}
                                            className={`w-4 h-4 ${star <= review.rating
                                                ? 'fill-yellow-400 text-yellow-400'
                                                : 'text-muted/20'
                                                }`}
                                        />
                                    ))}
                                </div>
                            </div>
                        </CardHeader>
                        {review.comment && (
                            <CardContent>
                                <p className="text-sm text-muted-foreground">{review.comment}</p>
                            </CardContent>
                        )}
                    </Card>
                ))}
            </div>
        </div>
    );
};

export default ReviewsList;
