import React from 'react';
// FIX: Added file extension to types import
import { User } from '../types.ts';

interface MatchModalProps {
  currentUser: User;
  matchedUser: User;
  onSendMessage: () => void;
  onClose: () => void;
}

const MatchModal: React.FC<MatchModalProps> = ({ currentUser, matchedUser, onSendMessage, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex justify-center items-center p-4 animate-fade-in">
       <style>{`
            @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
            .animate-fade-in { animation: fade-in 0.3s ease-out; }
            @keyframes scale-up { from { transform: scale(0.7); opacity: 0; } to { transform: scale(1); opacity: 1; } }
            .animate-scale-up { animation: scale-up 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        `}</style>
      <div className="relative w-full max-w-md text-center">
        <h1 className="text-5xl font-bold text-white mb-8 bg-clip-text text-transparent bg-gradient-to-r from-flame-orange to-flame-red animate-scale-up" style={{ animationDelay: '0.1s' }}>
          It's a Match!
        </h1>
        <p className="text-white text-lg mb-8 animate-scale-up" style={{ animationDelay: '0.2s' }}>
            You and {matchedUser.name} have liked each other.
        </p>
        <div className="flex justify-center items-center space-x-[-2rem] mb-12">
            <img 
                src={currentUser.profilePhotos[0]} 
                alt={currentUser.name} 
                className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg animate-scale-up" 
                style={{ animationDelay: '0.3s' }}
            />
            <img 
                src={matchedUser.profilePhotos[0]} 
                alt={matchedUser.name} 
                className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg animate-scale-up" 
                style={{ animationDelay: '0.4s' }}
            />
        </div>

        <div className="flex flex-col space-y-4">
            <button 
                onClick={onSendMessage}
                className="w-full py-3 bg-gradient-to-r from-flame-orange to-flame-red text-white font-bold rounded-full shadow-lg transform hover:scale-105 transition-transform"
            >
                Send a Message
            </button>
            <button 
                onClick={onClose}
                className="w-full py-3 bg-white/20 text-white font-semibold rounded-full hover:bg-white/30 transition-colors"
            >
                Keep Swiping
            </button>
        </div>
      </div>
    </div>
  );
};

export default MatchModal;