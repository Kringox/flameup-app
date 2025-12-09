import React, { useState } from 'react';
import StarRating from './StarRating.tsx';
import { useI18n } from '../contexts/I18nContext.ts';

interface ReviewModalProps {
  onClose: () => void;
  onSubmit: (rating: number, comment: string) => void;
}

const ReviewModal: React.FC<ReviewModalProps> = ({ onClose, onSubmit }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const { t } = useI18n();

  const handleSubmit = () => {
    if (rating === 0) {
      alert('Please select a rating.');
      return;
    }
    onSubmit(rating, comment);
    setSubmitted(true);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-[100] p-4" onClick={onClose}>
      <div className="bg-white dark:bg-zinc-800 rounded-2xl w-full max-w-sm p-6 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {submitted ? (
            <div className="animate-fade-in">
                <h2 className="text-2xl font-bold dark:text-white">Thank You!</h2>
                <p className="text-gray-600 dark:text-gray-400 mt-2">Your feedback helps us improve FlameUp.</p>
                <button onClick={onClose} className="w-full mt-6 py-3 bg-flame-orange text-white font-bold rounded-lg">
                    Close
                </button>
            </div>
        ) : (
            <>
                <h2 className="text-2xl font-bold dark:text-white">Enjoying FlameUp?</h2>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                Your feedback helps us improve. Please take a moment to rate your experience.
                </p>
                <div className="my-6">
                <StarRating rating={rating} onRatingChange={setRating} size={8} />
                </div>
                <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Leave a comment (optional)"
                className="w-full mt-2 p-2 border dark:border-zinc-600 rounded-md focus:outline-none focus:ring-2 focus:ring-flame-orange bg-gray-50 dark:bg-zinc-700 dark:text-white"
                rows={3}
                />
                <div className="flex flex-col sm:flex-row gap-2 mt-6">
                    <button onClick={onClose} className="py-3 px-4 bg-gray-200 dark:bg-zinc-700 text-gray-800 dark:text-gray-200 rounded-lg font-semibold flex-1 order-2 sm:order-1">
                        Not Now
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={rating === 0}
                        className="py-3 px-4 bg-flame-orange text-white rounded-lg font-semibold flex-1 disabled:opacity-50 order-1 sm:order-2"
                    >
                        Submit
                    </button>
                </div>
            </>
        )}
      </div>
    </div>
  );
};

export default ReviewModal;