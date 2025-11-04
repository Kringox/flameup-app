import React from 'react';

interface XPToastProps {
  amount: number;
}

const XPToast: React.FC<XPToastProps> = ({ amount }) => {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[200] bg-gradient-to-r from-flame-orange to-flame-red text-white font-bold px-4 py-2 rounded-full shadow-lg animate-toast-in animate-toast-out">
      +{amount} XP
    </div>
  );
};

export default XPToast;
