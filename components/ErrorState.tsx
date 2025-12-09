import React from 'react';
import WifiOffIcon from './icons/WifiOffIcon.tsx';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  icon?: React.ReactNode;
}

const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message = 'We couldn\'t load the content. Please try again later.',
  onRetry,
  icon = <WifiOffIcon className="w-16 h-16 text-gray-400 dark:text-gray-500" />
}) => {
  return (
    <div className="flex flex-col justify-center items-center h-full text-center p-8 bg-gray-50 dark:bg-black">
      {icon}
      <h2 className="text-xl font-bold text-dark-gray dark:text-gray-200 mt-4">{title}</h2>
      <p className="text-gray-500 dark:text-gray-400 mt-2">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-6 px-6 py-3 bg-flame-orange text-white font-bold rounded-full shadow-lg transform hover:scale-105 transition-transform"
        >
          Retry
        </button>
      )}
    </div>
  );
};

export default ErrorState;