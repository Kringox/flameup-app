import React, { useState, useEffect } from 'react';
// FIX: Added file extension to types import
import { User } from '../types.ts';
import { db } from '../firebaseConfig';
import { collection, doc, getDocs, query, where } from 'firebase/firestore';
// FIX: Added file extension to constants import
import { DEMO_USERS_FOR_UI } from '../constants.ts'; // Using demo users for now

const UserRow: React.FC<{ user: User; onViewProfile: (userId: string) => void }> = ({ user, onViewProfile }) => {
    return (
        <button onClick={() => onViewProfile(user.id)} className="w-full flex items-center p-3 text-left hover:bg-gray-50">
            <img src={user.profilePhotos?.[0]} alt={user.name} className="w-12 h-12 rounded-full object-cover" />
            <div className="flex-1 ml-3">
                <p className="font-semibold">{user.name}</p>
                <p className="text-sm text-gray-500 truncate">{user.bio}</p>
            </div>
        </button>
    )
};

interface ProfileVisitorsScreenProps {
    currentUser: User;
    onClose: () => void;
    onViewProfile: (userId: string) => void;
}

const ProfileVisitorsScreen: React.FC<ProfileVisitorsScreenProps> = ({ currentUser, onClose, onViewProfile }) => {
    const [visitors, setVisitors] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchVisitors = async () => {
            // This is a placeholder/mock implementation.
            // A real implementation would require a backend mechanism to track profile views.
            // For now, we'll just show some demo users who are not the current user.
            const mockVisitors = DEMO_USERS_FOR_UI.filter(u => u.id !== currentUser.id);
            setVisitors(mockVisitors);
            setIsLoading(false);
        };
        fetchVisitors();
    }, [currentUser.id]);

    const handleProfileClick = (userId: string) => {
        onClose();
        onViewProfile(userId);
    };

    return (
        <div className="absolute inset-0 bg-white z-[80] flex flex-col animate-slide-in">
            <style>{`.animate-slide-in { animation: slideInFromRight 0.3s ease-out; } @keyframes slideInFromRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
            <header className="flex items-center p-4 border-b border-gray-200 flex-shrink-0 sticky top-0">
                 <button onClick={onClose} className="text-lg text-gray-600 w-8">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <h1 className="text-xl font-bold text-dark-gray text-center flex-1">Profile Visitors</h1>
                <div className="w-8"></div>
            </header>

            <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                    <div className="flex justify-center items-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div></div>
                ) : visitors.length === 0 ? (
                    <p className="text-center text-gray-500 mt-8">No one has visited your profile yet.</p>
                ) : (
                    visitors.map(user => (
                        <UserRow 
                            key={user.id} 
                            user={user} 
                            onViewProfile={handleProfileClick}
                        />
                    ))
                )}
            </div>
        </div>
    );
};

export default ProfileVisitorsScreen;
