import React from 'react';

const LoadingScreen: React.FC = () => {
  return (
    <div className="h-screen w-screen flex flex-col justify-center items-center bg-gray-100">
      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.7;
            transform: scale(1.1);
          }
        }
        .animate-pulse-icon {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
      <div className="animate-pulse-icon">
        <img src="/assets/logo-icon.png" alt="FlameUp Logo" className="w-24 h-24" />
      </div>
      <p className="text-gray-500 mt-4 text-lg">Loading FlameUp...</p>
    </div>
  );
};

export default LoadingScreen;
