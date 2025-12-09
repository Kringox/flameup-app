import React from 'react';

interface HotnessDisplayProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

const HotnessDisplay: React.FC<HotnessDisplayProps> = ({ score, size = 'md', onClick }) => {
  const displayScore = Math.max(0, score);
  
  const sizeConfig = {
    sm: { container: 'px-2 py-0.5 rounded-md', text: 'text-[10px]', icon: 'text-xs' },
    md: { container: 'px-4 py-1.5 rounded-xl', text: 'text-sm', icon: 'text-base' },
    lg: { container: 'px-6 py-2 rounded-2xl', text: 'text-xl', icon: 'text-2xl' },
  };

  const currentSize = sizeConfig[size];

  const getFireCount = () => {
      if (displayScore < 50) return '🔥';
      if (displayScore < 200) return '🔥🔥';
      return '🔥🔥🔥';
  }

  return (
    <div 
      onClick={(e) => {
          if (onClick) {
              e.stopPropagation();
              onClick();
          }
      }}
      className={`
      relative group select-none
      inline-flex items-center justify-center gap-1
      bg-gradient-to-r from-orange-600 via-red-500 to-pink-600
      text-white font-black italic tracking-wider
      shadow-[0_4px_15px_-3px_rgba(255,107,53,0.5)]
      border border-white/20
      transform transition-transform active:scale-95
      ${currentSize.container}
      ${onClick ? 'cursor-pointer hover:scale-105' : 'cursor-default'}
    `}>
      <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent rounded-[inherit] pointer-events-none" />
      
      <span className={`drop-shadow-sm ${currentSize.icon}`}>{getFireCount()}</span>
      <span className={`drop-shadow-md uppercase ${currentSize.text}`}>
        {size !== 'sm' && <span className="mr-1">HOTNESS</span>} 
        <span className="text-yellow-200">{displayScore}</span>
      </span>
    </div>
  );
};

export default HotnessDisplay;