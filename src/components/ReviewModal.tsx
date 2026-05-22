import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { supabase, Vehicle, Review, Profile } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type ReviewModalProps = {
  vehicle: Vehicle & { profiles: Profile; reviews: (Review & { profiles: Profile })[] };
  onClose: () => void;
  hasBooked: boolean;
};

export const ReviewModal: React.FC<ReviewModalProps> = ({ vehicle, onClose, hasBooked }) => {
  const { profile } = useAuth();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitReview = async () => {
    if (!profile || !hasBooked) return;

    setSubmitting(true);
    const { error } = await supabase.from('reviews').insert({
      vehicle_id: vehicle.id,
      passenger_id: profile.id,
      rating,
      comment,
    });

    if (!error) {
      alert('Review submitted successfully!');
      setComment('');
      setRating(5);
      onClose();
    } else {
      if (error.code === '23505') {
        alert('You have already reviewed this vehicle.');
      } else {
        alert('Failed to submit review.');
      }
    }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-800">Reviews & Ratings</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">
            ✕
          </button>
        </div>

        <div className="mb-6 p-4 bg-orange-50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-gray-700 font-medium">Driver:</span>
            <span className="text-gray-800">{vehicle.profiles.full_name}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-700 font-medium">Vehicle:</span>
            <span className="text-gray-800">
              {vehicle.vehicle_type === '14_seater' ? '14' : '10'} Seater
            </span>
          </div>
        </div>

        {hasBooked && (
          <div className="mb-6 p-4 border border-gray-200 rounded-lg">
            <h4 className="font-medium text-gray-800 mb-3">Leave a Review</h4>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className="focus:outline-none"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        star <= rating
                          ? 'fill-orange-500 text-orange-500'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Comment</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your experience..."
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <button
              onClick={handleSubmitReview}
              disabled={submitting}
              className="w-full bg-orange-500 text-white py-2 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        )}

        <div>
          <h4 className="font-medium text-gray-800 mb-3">
            All Reviews ({vehicle.reviews.length})
          </h4>

          <div className="space-y-4">
            {vehicle.reviews.map((review) => (
              <div key={review.id} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-800">{review.profiles.full_name}</span>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-orange-500 text-orange-500" />
                    <span className="text-sm font-medium">{review.rating}</span>
                  </div>
                </div>
                {review.comment && (
                  <p className="text-gray-600 text-sm">{review.comment}</p>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  {new Date(review.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}

            {vehicle.reviews.length === 0 && (
              <div className="text-center py-8 text-gray-500">No reviews yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
