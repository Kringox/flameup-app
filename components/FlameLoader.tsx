
import React from 'react';
import FlameIcon from './icons/FlameIcon';

const FlameLoader: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  return (
    <div className="flex justify-center items-center p-4">
      <style>{`
        @keyframes pulse-loader {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.7;
            transform: scale(1.1);
          }
        }
        .animate-pulse-loader {
          animation: pulse-loader 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
      <div className="animate-pulse-loader">
        <FlameIcon isGradient={true} className={sizeClasses[size]} />
      </div>
    </div>
  );
};

export default FlameLoader;
