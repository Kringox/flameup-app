import React from 'react';

interface ChatOptionsModalProps {
  onClose: () => void;
  onViewProfile: () => void;
  onReport: () => void;
  onBlock: () => void;
}

const ChatOptionsModal: React.FC<ChatOptionsModalProps> = ({ onClose, onViewProfile, onReport, onBlock }) => {
  return (
    <div className="absolute inset-0 bg-black/60 z-50 flex justify-center items-end" onClick={onClose}>
      <div 
        className="bg-white rounded-t-2xl w-full p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-2">
          <button onClick={onViewProfile} className="w-full p-3 bg-gray-100 rounded-lg font-semibold text-gray-800 text-center">
            View Profile
          </button>
          <button onClick={onReport} className="w-full p-3 bg-gray-100 rounded-lg font-semibold text-gray-800 text-center">
            Report User
          </button>
          <button onClick={onBlock} className="w-full p-3 bg-gray-100 rounded-lg font-semibold text-error-red text-center">
            Block User
          </button>
        </div>
        <button onClick={onClose} className="w-full mt-4 py-3 bg-gray-200 text-gray-800 font-bold rounded-lg">
          Cancel
        </button>
      </div>
    </div>
  );
};

export default ChatOptionsModal;
