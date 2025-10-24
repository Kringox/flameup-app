// FIX: Create content for missing file
import React, { useState } from 'react';
import StarRating from './StarRating.tsx';

interface ReviewModalProps {
  onClose: () => void;
  onSubmit: (rating: number, comment: string) => void;
}

const ReviewModal: React.FC<ReviewModalProps> = ({ onClose, onSubmit }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const handleSubmit = () => {
    if (rating === 0) {
      alert('Please select a rating.');
      return;
    }
    onSubmit(rating, comment);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-[100]" onClick={onClose}>
      <div className="bg-white rounded-lg w-11/12 max-w-md p-6 text-center" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold">Enjoying FlameUp?</h2>
        <p className="text-gray-600 mt-2">
          Your feedback helps us improve. Please take a moment to rate your experience.
        </p>
        <div className="my-6">
          <StarRating rating={rating} onRatingChange={setRating} />
        </div>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Leave a comment (optional)"
          className="w-full mt-2 p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-flame-orange"
          rows={3}
        />
        <div className="flex justify-end space-x-2 mt-4">
          <button onClick={onClose} className="py-2 px-4 bg-gray-200 text-gray-800 rounded-lg font-semibold">
            Not Now
          </button>
          <button
            onClick={handleSubmit}
            className="py-2 px-4 bg-flame-orange text-white rounded-lg font-semibold"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReviewModal;
