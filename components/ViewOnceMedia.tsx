import React, { useState } from 'react';
import EyeIcon from './icons/EyeIcon';

interface ViewOnceMediaProps {
  mediaUrl: string;
  mediaType: 'image' | 'video';
}

const ViewOnceMedia: React.FC<ViewOnceMediaProps> = ({ mediaUrl, mediaType }) => {
  const [hasViewed, setHasViewed] = useState(false);
  const [isViewing, setIsViewing] = useState(false);

  const handleView = () => {
    setIsViewing(true);
    setHasViewed(true);
  };

  if (isViewing) {
    return (
      <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center" onClick={() => setIsViewing(false)}>
        {mediaType === 'image' ? (
          <img src={mediaUrl} alt="View once content" className="max-h-full max-w-full object-contain" />
        ) : (
          <video src={mediaUrl} controls autoPlay className="max-h-full max-w-full" />
        )}
      </div>
    );
  }

  return (
    <button
      onClick={handleView}
      disabled={hasViewed}
      className="w-48 h-64 bg-gray-800 rounded-lg flex flex-col justify-center items-center text-white disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <EyeIcon className="w-8 h-8 mb-2" />
      <span className="font-semibold">{hasViewed ? 'Viewed' : `Tap to view ${mediaType}`}</span>
    </button>
  );
};

export default ViewOnceMedia;
