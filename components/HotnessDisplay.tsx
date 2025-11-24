
import React from 'react';

interface HotnessDisplayProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

const HotnessDisplay: React.FC<HotnessDisplayProps> = ({ score, size = 'md' }) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-lg px-6 py-2',
  };

  const getFireCount = () => {
      if (score < 50) return '🔥';
      if (score < 200) return '🔥🔥';
      return '🔥🔥🔥';
  }

  return (
    <div className={`
      inline-flex items-center justify-center
      bg-gradient-to-r from-flame-orange to-flame-red
      text-white font-black italic tracking-wider
      transform -skew-x-12
      border-2 border-yellow-400/50 shadow-lg shadow-flame-orange/30
      ${sizeClasses[size]}
      rounded-lg
    `}>
      <span className="not-italic mr-1">{getFireCount()}</span>
      <span>HOTNESS {score || 0}</span>
    </div>
  );
};

export default HotnessDisplay;
