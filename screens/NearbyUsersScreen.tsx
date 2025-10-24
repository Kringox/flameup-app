import React from 'react';
// FIX: Added file extension to types import
import { User } from '../types.ts';
// FIX: Added file extension to icon import
import MapPinIcon from '../components/icons/MapPinIcon.tsx';

// This is just a UI component, logic would be in a parent screen.
interface NearbyUsersScreenProps {
    users: User[];
    onViewProfile: (userId: string) => void;
}

const NearbyUsersScreen: React.FC<NearbyUsersScreenProps> = ({ users, onViewProfile }) => {
    if (users.length === 0) {
        return (
            <div className="flex-1 flex flex-col justify-center items-center text-center p-8">
                <MapPinIcon className="w-16 h-16 text-gray-300 mb-4" />
                <h2 className="text-xl font-semibold text-gray-700">No Users Found Nearby</h2>
                <p className="text-gray-500 mt-2">
                    Try expanding your search radius or check back later.
                </p>
            </div>
        );
    }
    
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4">
            {users.map(user => (
                <button key={user.id} onClick={() => onViewProfile(user.id)} className="relative aspect-square rounded-lg overflow-hidden shadow-lg">
                    <img src={user.profilePhotos[0]} alt={user.name} className="w-full h-full object-cover" />
                    <div className="absolute bottom-0 left-0 w-full p-2 bg-gradient-to-t from-black/70 to-transparent">
                        <p className="text-white font-bold truncate">{user.name}, {user.age}</p>
                    </div>
                </button>
            ))}
        </div>
    );
};

export default NearbyUsersScreen;
