
import React from 'react';
import TimerIcon from './icons/TimerIcon.tsx';
import { RetentionPolicy } from '../types.ts';

interface ChatOptionsModalProps {
  onClose: () => void;
  onViewProfile: () => void;
  onReport: () => void;
  onBlock: () => void;
  onDeleteChat: () => void;
  currentRetention: RetentionPolicy;
  onUpdateRetention: (policy: RetentionPolicy) => void;
}

const ChatOptionsModal: React.FC<ChatOptionsModalProps> = ({ 
    onClose, 
    onViewProfile, 
    onReport, 
    onBlock, 
    onDeleteChat,
    currentRetention,
    onUpdateRetention
}) => {
    
  const retentionOptions: { value: RetentionPolicy; label: string }[] = [
      { value: 'forever', label: 'Keep Forever' },
      { value: 'read', label: 'Delete after Read' },
      { value: '5min', label: 'Delete after 5 minutes' },
  ];

  return (
    <div className="absolute inset-0 bg-black/60 z-[100] flex justify-center items-end" onClick={onClose}>
      <div 
        className="bg-white dark:bg-zinc-800 rounded-t-2xl w-full p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6">
            <h3 className="text-gray-500 dark:text-gray-400 font-bold uppercase text-xs mb-2 px-2 flex items-center">
                <TimerIcon className="w-4 h-4 mr-1"/> Chat Settings
            </h3>
            <div className="bg-gray-100 dark:bg-zinc-700 rounded-xl overflow-hidden divide-y divide-gray-200 dark:divide-zinc-600">
                {retentionOptions.map((option) => (
                    <button
                        key={option.value}
                        onClick={() => onUpdateRetention(option.value)}
                        className="w-full p-3 flex justify-between items-center text-left hover:bg-gray-200 dark:hover:bg-zinc-600"
                    >
                        <span className={`font-medium ${currentRetention === option.value ? 'text-flame-orange' : 'text-gray-800 dark:text-gray-200'}`}>
                            {option.label}
                        </span>
                        {currentRetention === option.value && (
                            <span className="text-flame-orange font-bold">✓</span>
                        )}
                    </button>
                ))}
            </div>
        </div>

        <div className="space-y-2">
          <button onClick={onViewProfile} className="w-full p-3 bg-gray-100 dark:bg-zinc-700 rounded-lg font-semibold text-gray-800 dark:text-gray-200 text-center">
            View Profile
          </button>
          <button onClick={onReport} className="w-full p-3 bg-gray-100 dark:bg-zinc-700 rounded-lg font-semibold text-gray-800 dark:text-gray-200 text-center">
            Report User
          </button>
          <button onClick={onDeleteChat} className="w-full p-3 bg-gray-100 dark:bg-zinc-700 rounded-lg font-semibold text-error-red text-center">
            Delete Chat
          </button>
          <button onClick={onBlock} className="w-full p-3 bg-gray-100 dark:bg-zinc-700 rounded-lg font-semibold text-error-red text-center">
            Block User
          </button>
        </div>
        <button onClick={onClose} className="w-full mt-4 py-3 bg-gray-200 dark:bg-zinc-700 text-gray-800 dark:text-gray-200 font-bold rounded-lg">
          Cancel
        </button>
      </div>
    </div>
  );
};

export default ChatOptionsModal;
