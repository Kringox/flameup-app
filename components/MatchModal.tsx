import React from 'react';
import { User } from '../types';

const PLACEHOLDER_AVATAR = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI1MCIgZmlsbD0iI2VlZSIvPjwvc3ZnPg==';

interface MatchModalProps {
    matchedUser: {
        id: string;
        name: string;
        profilePhoto: string;
    };
    currentUser: User;
    onSendMessage: () => void;
    onClose: () => void;
}

const MatchModal: React.FC<MatchModalProps> = ({ matchedUser, currentUser, onSendMessage, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 animate-fade-in">
      <style>{`
        @keyframes fade-in {
            from { opacity: 0; transform: scale(0.9); }
            to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in { animation: fade-in 0.3s ease-out; }
      `}</style>
      <div className="bg-white rounded-2xl p-8 flex flex-col items-center text-center w-11/12 max-w-sm">
        <h2 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-flame-orange to-flame-red">It's a Match! 🔥</h2>
        <p className="text-gray-600 mt-2">You and {matchedUser.name} have liked each other.</p>
        <div className="flex items-center space-x-4 my-6">
          <img src={currentUser.profilePhotos?.[0] || PLACEHOLDER_AVATAR} alt={currentUser.name} className="w-24 h-24 rounded-full border-4 border-white object-cover shadow-lg" />
          <img src={matchedUser.profilePhoto || PLACEHOLDER_AVATAR} alt={matchedUser.name} className="w-24 h-24 rounded-full border-4 border-white object-cover shadow-lg" />
        </div>
        <button onClick={onSendMessage} className="w-full py-3 bg-gradient-to-r from-flame-orange to-flame-red text-white font-bold rounded-full mb-3 shadow-lg transform hover:scale-105 transition-transform">
          Send a Message
        </button>
        <button onClick={onClose} className="w-full py-3 text-gray-600 font-semibold rounded-full">
          Keep Swiping
        </button>
      </div>
    </div>
  );
};

export default MatchModal;
