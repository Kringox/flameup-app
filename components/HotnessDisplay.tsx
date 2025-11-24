
import React from 'react';

interface HotnessDisplayProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

const HotnessDisplay: React.FC<HotnessDisplayProps> = ({ score, size = 'md' }) => {
  // Ensure score is never negative for display
  const displayScore = Math.max(0, score);
  
  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-lg px-5 py-1.5',
  };

  const getFireCount = () => {
      if (displayScore < 50) return '🔥';
      if (displayScore < 200) return '🔥🔥';
      return '🔥🔥🔥';
  }

  return (
    <div className={`
      inline-flex items-center justify-center
      bg-gradient-to-r from-orange-400 to-red-500
      text-white font-extrabold italic
      shadow-md shadow-orange-500/30
      rounded-lg transform -skew-x-3
      border-b-2 border-red-700/20
      ${sizeClasses[size]}
    `}>
      <span className="not-italic mr-1 drop-shadow-sm">{getFireCount()}</span>
      <span className="tracking-wider drop-shadow-md uppercase">HOTNESS {displayScore}</span>
    </div>
  );
};

export default HotnessDisplay;
