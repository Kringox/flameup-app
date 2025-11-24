
import React, { useState } from 'react';
import EyeIcon from './icons/EyeIcon';
import FlameIcon from './icons/FlameIcon';

interface ViewOnceMediaProps {
  mediaUrl: string;
  mediaType: 'image' | 'video';
  isSender: boolean;
  viewed: boolean;
  onView: () => void;
}

const ViewOnceMedia: React.FC<ViewOnceMediaProps> = ({ mediaUrl, mediaType, isSender, viewed, onView }) => {
  const [isViewing, setIsViewing] = useState(false);

  const handleOpen = () => {
      if (isSender) return; // Sender cannot view their own "View Once" media again usually in Snap, or just preview. Let's block re-viewing for simplicity or strict privacy.
      if (viewed) return;
      
      onView(); // Trigger backend update
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
  const viewedClass = "border-gray-400 bg-gray-100 dark:bg-zinc-800 text-gray-500 cursor-default";

  if (viewed) {
      return (
        <div className={`${containerClass} ${viewedClass}`}>
             <div className="w-8 h-8 rounded-full border-2 border-gray-400 flex items-center justify-center">
                 <div className="w-full h-full rounded-full bg-transparent" />
             </div>
             <span className="font-bold italic">Opened</span>
        </div>
      );
  }

  return (
    <button
      onClick={handleOpen}
      disabled={isSender}
      className={`${containerClass} ${activeClass}`}
    >
        <div className="relative">
             <FlameIcon isGradient={!isSender} className="w-6 h-6" />
             {!isSender && <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping" />}
        </div>
      <span className="font-bold">
          {isSender ? 'Sent View Once' : `Tap to view ${mediaType}`}
      </span>
    </button>
  );
};

export default ViewOnceMedia;
