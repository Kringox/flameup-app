import React from 'react';
import FlameLoader from './FlameLoader.tsx';

const LoadingScreen: React.FC = () => {
  return (
    <div className="h-screen w-screen flex flex-col justify-center items-center bg-gray-100 dark:bg-black">
      <FlameLoader size="lg" />
      <p className="text-gray-500 dark:text-gray-400 mt-4 text-lg font-semibold">Loading FlameUp...</p>
    </div>
  );
};

export default LoadingScreen;
