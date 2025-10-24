import React, { useState } from 'react';
// FIX: Added file extension to types and constants imports
import { User } from '../types.ts';
import { DEMO_USERS_FOR_UI } from '../constants.ts';
// FIX: Added file extension to icon imports
import XIcon from '../components/icons/XIcon.tsx';
import HeartIcon from '../components/icons/HeartIcon.tsx';
import StarIcon from '../components/icons/StarIcon.tsx';
import RocketIcon from '../components/icons/RocketIcon.tsx';
import FilterIcon from '../components/icons/FilterIcon.tsx';
import FilterModal from '../components/FilterModal.tsx';

// A simple Profile Card component for the swipe screen
const ProfileCard: React.FC<{ user: User }> = ({ user }) => (
    <div className="absolute top-0 left-0 w-full h-full rounded-2xl overflow-hidden shadow-2xl bg-gray-300">
        <img src={user.profilePhotos[0]} alt={user.name} className="w-full h-full object-cover" />
        <div className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-black/80 to-transparent p-4 flex flex-col justify-end">
            <h2 className="text-white text-3xl font-bold">{user.name}, {user.age}</h2>
            <p className="text-white text-lg">{user.bio}</p>
        </div>
    </div>
);


const SwipeScreen: React.FC = () => {
    const [users, setUsers] = useState(DEMO_USERS_FOR_UI);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [filters, setFilters] = useState({ ageRange: [18, 40] as [number, number], distance: 50 });

    const handleSwipe = () => {
        // In a real app, this would trigger an animation
        setCurrentIndex(prev => (prev + 1) % users.length);
    };
    
    const handleApplyFilters = (newFilters: { ageRange: [number, number]; distance: number; }) => {
        setFilters(newFilters);
        // Here you would refetch users based on new filters
    };

    const currentUser = users[currentIndex];

    return (
        <div className="w-full h-full flex flex-col items-center bg-gray-100 p-4">
            {isFilterModalOpen && (
                <FilterModal
                    onClose={() => setIsFilterModalOpen(false)}
                    onApply={handleApplyFilters}
                    currentFilters={filters}
                />
            )}
            <header className="w-full flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-flame-orange to-flame-red">Discover</h1>
                <button onClick={() => setIsFilterModalOpen(true)}>
                    <FilterIcon className="w-6 h-6 text-gray-600" />
                </button>
            </header>

            {/* Swipeable Card Area */}
            <div className="relative flex-1 w-full max-w-sm mb-4">
                {currentUser ? (
                    <ProfileCard user={currentUser} />
                ) : (
                    <div className="flex justify-center items-center h-full">
                        <p>No more profiles to show.</p>
                    </div>
                )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-around items-center w-full max-w-sm">
                <button onClick={handleSwipe} className="w-16 h-16 rounded-full bg-white shadow-lg flex justify-center items-center text-yellow-500">
                    <XIcon className="w-8 h-8 text-gray-500" />
                </button>
                 <button className="w-12 h-12 rounded-full bg-white shadow-lg flex justify-center items-center text-purple-500">
                    <RocketIcon className="w-6 h-6" />
                </button>
                <button onClick={handleSwipe} className="w-20 h-20 rounded-full bg-white shadow-lg flex justify-center items-center text-red-500">
                    <HeartIcon isLiked={false} className="w-10 h-10" />
                </button>
                 <button className="w-12 h-12 rounded-full bg-white shadow-lg flex justify-center items-center text-blue-500">
                    <StarIcon className="w-6 h-6" />
                </button>
            </div>
        </div>
    );
};

export default SwipeScreen;