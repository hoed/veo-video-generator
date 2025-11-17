import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message = 'Loading...' }) => {
  return (
    <div className="flex flex-col items-center justify-center p-6 bg-indigo-50 rounded-lg shadow-md text-indigo-800">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent mb-4"></div>
      <p className="text-lg font-semibold text-center">{message}</p>
    </div>
  );
};

export default LoadingSpinner;
