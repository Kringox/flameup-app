
import React, { useState } from 'react';
import EyeIcon from './icons/EyeIcon';
import FlameIcon from './icons/FlameIcon';

interface ViewOnceMediaProps {
  mediaUrl: string;
  mediaType: 'image' | 'video';
  isSender: boolean;
  viewed: boolean;
  viewCount?: number;
  onView: () => void;
}

const ViewOnceMedia: React.FC<ViewOnceMediaProps> = ({ mediaUrl, mediaType, isSender, viewed, viewCount = 0, onView }) => {
  const [isViewing, setIsViewing] = useState(false);

  // Maximum views allowed (Original + 1 Replay)
  const MAX_VIEWS = 2;
  const currentCount = viewCount || (viewed ? 1 : 0);
  const isExpired = currentCount >= MAX_VIEWS;
  const isReplay = currentCount === 1;

  const handleOpen = () => {
      if (isSender) return; 
      if (isExpired) return;
      
      onView(); // Trigger backend update (increment count)
      setIsViewing(true);
  };

  const closeViewer = (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsViewing(false);
  }

  if (isViewing) {
    return (
      <div className="fixed inset-0 bg-black/95 z-[100] flex flex-col items-center justify-center animate-fade-in" onClick={closeViewer}>
        <div className="absolute top-4 right-4 text-white">
             <span className="font-bold text-lg bg-gray-800/50 px-3 py-1 rounded-full">{mediaType === 'image' ? 'Image' : 'Video'}</span>
        </div>
        {mediaType === 'image' ? (
          <img src={mediaUrl} alt="View once content" className="max-h-screen max-w-full object-contain" />
        ) : (
          <video src={mediaUrl} controls autoPlay className="max-h-screen max-w-full" />
        )}
        <p className="absolute bottom-10 text-white font-semibold animate-pulse">Tap to close</p>
      </div>
    );
  }

  const containerClass = "flex items-center space-x-2 p-2 rounded-xl border border-dashed transition-all cursor-pointer select-none";
  const activeClass = isSender 
    ? "border-white/40 bg-white/10 text-white" 
    : "border-flame-orange/50 bg-flame-orange/10 text-flame-orange hover:bg-flame-orange/20";
    
  // Distinct style for replay available
  const replayClass = "border-purple-400 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-300 hover:bg-purple-100";
  
  const viewedClass = "border-gray-400 bg-gray-100 dark:bg-zinc-800 text-gray-500 cursor-default";

  if (isExpired && !isSender) {
      return (
        <div className={`${containerClass} ${viewedClass}`}>
             <div className="w-8 h-8 rounded-full border-2 border-gray-400 flex items-center justify-center">
                 <div className="w-full h-full rounded-full bg-transparent" />
             </div>
             <span className="font-bold italic">Opened</span>
        </div>
      );
  }
  
  if (isSender) {
      return (
        <div className={`${containerClass} ${activeClass}`}>
             <div className={`w-8 h-8 rounded-full border-2 ${isExpired ? 'border-gray-400' : 'border-white'} flex items-center justify-center`}>
                 <div className={`w-full h-full rounded-full ${isExpired ? 'bg-transparent' : 'bg-white'}`} />
             </div>
             <span className="font-bold italic">{isExpired ? 'Opened' : 'Sent View Once'}</span>
        </div>
      );
  }

  return (
    <button
      onClick={handleOpen}
      className={`${containerClass} ${isReplay ? replayClass : activeClass}`}
    >
        <div className="relative">
             {isReplay ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
             ) : (
                 <FlameIcon isGradient={true} className="w-6 h-6" />
             )}
        </div>
      <span className="font-bold">
          {isReplay ? 'Tap to Replay' : `Tap to view ${mediaType}`}
      </span>
    </button>
  );
};

export default ViewOnceMedia;
