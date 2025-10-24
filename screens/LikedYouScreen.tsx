// FIX: Create content for missing file
import React, { useState, useEffect } from 'react';
import { User } from '../types.ts';
import { DEMO_USERS_FOR_UI } from '../constants.ts'; // Using demo for now
import SparklesIcon from '../components/icons/SparklesIcon.tsx';

interface LikedYouScreenProps {
  currentUser: User;
  onClose: () => void;
  onViewProfile: (userId: string) => void;
}

const LikedYouScreen: React.FC<LikedYouScreenProps> = ({ currentUser, onClose, onViewProfile }) => {
  const [likers, setLikers] = useState<User[]>([]);

  useEffect(() => {
    // In a real app, this would fetch a list of user IDs who liked the current user.
    // For now, we use demo data.
    const mockLikers = DEMO_USERS_FOR_UI.filter(u => u.id !== currentUser.id);
    setLikers(mockLikers);
  }, [currentUser.id]);
  
  const handleProfileClick = (userId: string) => {
      onViewProfile(userId);
      onClose();
  }

  if (!currentUser.isPremium) {
    return (
      <div className="absolute inset-0 bg-gray-100 z-[80] flex flex-col items-center justify-center p-6 text-center">
        <SparklesIcon className="w-16 h-16 text-premium-gold mb-4" />
        <h2 className="text-2xl font-bold">See Who Likes You!</h2>
        <p className="text-gray-600 mt-2">Upgrade to FlameUp Premium to see everyone who has already liked your profile.</p>
        <button className="mt-6 w-full max-w-xs py-3 bg-premium-gold text-white font-bold rounded-lg">
          Upgrade to Premium
        </button>
        <button onClick={onClose} className="mt-4 text-gray-600 font-semibold">
          Maybe Later
        </button>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 bg-white z-[80] flex flex-col">
      <header className="flex items-center p-4 border-b">
        <button onClick={onClose} className="w-8">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h1 className="text-xl font-bold text-center flex-1">Likes</h1>
        <div className="w-8"></div>
      </header>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-1 p-1 flex-1 overflow-y-auto">
        {likers.map(user => (
          <button key={user.id} onClick={() => handleProfileClick(user.id)} className="relative aspect-[3/4] group">
            <img src={user.profilePhotos[0]} alt={user.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
              <p className="text-white font-bold">{user.name}, {user.age}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default LikedYouScreen;
