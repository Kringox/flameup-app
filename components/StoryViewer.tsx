
import React, { useState, useEffect, useCallback } from 'react';
import { Story } from '../types';

interface StoryViewerProps {
  stories: Story[];
  startIndex: number;
  onClose: () => void;
  onStoryViewed: (storyId: string) => void;
}

const STORY_DURATION = 5000; // 5 seconds

const StoryViewer: React.FC<StoryViewerProps> = ({ stories, startIndex, onClose, onStoryViewed }) => {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [animationKey, setAnimationKey] = useState(0);

  const goToNext = useCallback(() => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onClose();
    }
  }, [currentIndex, stories.length, onClose]);

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  useEffect(() => {
    onStoryViewed(stories[currentIndex].id);
    setAnimationKey(prev => prev + 1); // Reset animation

    const timer = setTimeout(() => {
      goToNext();
    }, STORY_DURATION);

    return () => clearTimeout(timer);
  }, [currentIndex, goToNext, onStoryViewed, stories]);

  const handleTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const { clientX, currentTarget } = e;
    const { left, width } = currentTarget.getBoundingClientRect();
    const tapPosition = clientX - left;
    
    if (tapPosition < width / 3) {
      goToPrevious();
    } else {
      goToNext();
    }
  };

  if (!stories[currentIndex]) return null;
  
  const currentStory = stories[currentIndex];

  return (
    <div className="absolute inset-0 bg-black z-[100] flex flex-col items-center justify-center">
       <style>{`
        @keyframes progress {
          from { width: 0%; }
          to { width: 100%; }
        }
        .progress-bar-inner {
          animation: progress ${STORY_DURATION / 1000}s linear;
        }
      `}</style>
      
      {/* Progress Bars */}
      <div className="absolute top-2 left-2 right-2 flex space-x-1">
        {stories.map((_, index) => (
          <div key={index} className="flex-1 h-1 bg-white/30 rounded-full">
            <div 
              className={`h-full rounded-full ${index < currentIndex ? 'bg-white' : ''} ${index === currentIndex ? 'bg-white progress-bar-inner' : ''}`}
              style={{ animationPlayState: 'running' }}
              key={index === currentIndex ? animationKey : undefined}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-5 left-4 flex items-center z-10">
        <img src={currentStory.user.profilePhoto} alt={currentStory.user.name} className="w-8 h-8 rounded-full object-cover" />
        <span className="text-white font-semibold ml-2">{currentStory.user.name}</span>
      </div>

      {/* Close Button */}
      <button onClick={onClose} className="absolute top-4 right-4 text-white z-10">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Story Content */}
      <div className="w-full h-full flex items-center justify-center">
        <img src={currentStory.mediaUrl} alt={`Story by ${currentStory.user.name}`} className="max-h-full max-w-full object-contain" />
      </div>

      {/* Navigation Taps */}
      <div 
        className="absolute inset-0 w-full h-full"
        onClick={handleTap}
      />
    </div>
  );
};

export default StoryViewer;
