import React from 'react';
// FIX: Added file extension to types import
import { User } from '../types.ts';
// FIX: Added file extension to icon import
import UsersIcon from '../components/icons/UsersIcon.tsx';

interface BestFriendsScreenProps {
  user: User;
  onClose: () => void;
}

const BestFriendsScreen: React.FC<BestFriendsScreenProps> = ({ user, onClose }) => {
    return (
        <div className="absolute inset-0 bg-white z-[80] flex flex-col animate-slide-in">
            <style>{`.animate-slide-in { animation: slideInFromRight 0.3s ease-out; } @keyframes slideInFromRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
            <header className="flex items-center p-4 border-b">
                 <button onClick={onClose} className="w-8">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <h1 className="text-xl font-bold text-center flex-1">Best Friends</h1>
                <div className="w-8"></div>
            </header>
            <main className="flex-1 flex flex-col justify-center items-center p-6 text-center">
                <UsersIcon className="w-16 h-16 text-gray-400" />
                <h2 className="text-xl font-bold mt-4">Coming Soon!</h2>
                <p className="text-gray-600 mt-2">Create a list of your closest friends to share exclusive content with.</p>
            </main>
        </div>
    );
};

export default BestFriendsScreen;