import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, query, where, getDocs, limit, doc, updateDoc, arrayUnion, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';
// FIX: Added file extension to types and constants imports
import { User, NotificationType } from '../types.ts';
// FIX: Added file extension to icon imports
import XIcon from '../components/icons/XIcon.tsx';
import HeartIcon from '../components/icons/HeartIcon.tsx';
import StarIcon from '../components/icons/StarIcon.tsx';
import RocketIcon from '../components/icons/RocketIcon.tsx';
import FilterIcon from '../components/icons/FilterIcon.tsx';
import FilterModal from '../components/FilterModal.tsx';
import FlameLoader from '../components/FlameLoader.tsx';

// A simple Profile Card component for the swipe screen
const ProfileCard: React.FC<{ user: User }> = ({ user }) => (
    <div className="absolute top-0 left-0 w-full h-full rounded-2xl overflow-hidden shadow-2xl bg-gray-300">
        <img src={user.profilePhotos[0]} alt={user.name} className="w-full h-full object-cover" />
        <div className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-black/80 to-transparent p-4 flex flex-col justify-end">
            <h2 className="text-white text-3xl font-bold">{user.name}, {user.age}</h2>
            <p className="text-white text-lg line-clamp-2">{user.bio}</p>
        </div>
    </div>
);

interface SwipeScreenProps {
    currentUser: User;
    onNewMatch: (matchedUser: User) => void;
}

const SwipeScreen: React.FC<SwipeScreenProps> = ({ currentUser, onNewMatch }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [filters, setFilters] = useState({ ageRange: [18, 40] as [number, number], distance: 50 });

    useEffect(() => {
        const fetchUsers = async () => {
            if (!db) return;
            setIsLoading(true);

            // Get a list of users already swiped on to exclude them
            const seenUsers = [
                ...(currentUser.swipedLeft || []),
                ...(currentUser.swipedRight || []),
                currentUser.id,
            ];
            
            // NOTE: Firestore `not-in` queries are limited to 30 elements. 
            // A more scalable solution for a huge app would involve a more complex backend, 
            // but for this scope, fetching and filtering client-side is effective.
            const usersRef = collection(db, 'users');
            // Fetch users who are not the current user. We will filter `seenUsers` client-side.
            const q = query(usersRef, where('id', '!=', currentUser.id), limit(30));
            const querySnapshot = await getDocs(q);

            const fetchedUsers = querySnapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as User))
                .filter(user => !seenUsers.includes(user.id)); // Filter out already seen users

            setUsers(fetchedUsers);
            setCurrentIndex(0);
            setIsLoading(false);
        };

        fetchUsers();
    }, [currentUser]);
    
    const goToNextCard = () => {
        setCurrentIndex(prev => prev + 1);
    };

    const handleSwipe = async (targetUserId: string, direction: 'left' | 'right') => {
        if (!db) return;

        const userRef = doc(db, 'users', currentUser.id);

        if (direction === 'left') {
            await updateDoc(userRef, { swipedLeft: arrayUnion(targetUserId) });
        } else {
            const targetUser = users.find(u => u.id === targetUserId);
            if (!targetUser) return;
            
            await updateDoc(userRef, { swipedRight: arrayUnion(targetUserId) });

            // Check for a match
            const targetUserDoc = await getDoc(doc(db, 'users', targetUserId));
            if (targetUserDoc.exists() && targetUserDoc.data().swipedRight?.includes(currentUser.id)) {
                // It's a match!
                onNewMatch(targetUser);

                // Create notifications for both users
                const notificationPayload = {
                    type: NotificationType.Match,
                    read: false,
                    timestamp: serverTimestamp(),
                };
                
                // Notification for matched user
                const theirNotifRef = collection(db, 'users', targetUserId, 'notifications');
                await addDoc(theirNotifRef, { ...notificationPayload, fromUser: { id: currentUser.id, name: currentUser.name, profilePhoto: currentUser.profilePhotos[0] } });
                
                // Notification for current user
                const myNotifRef = collection(db, 'users', currentUser.id, 'notifications');
                await addDoc(myNotifRef, { ...notificationPayload, fromUser: { id: targetUser.id, name: targetUser.name, profilePhoto: targetUser.profilePhotos[0] } });
            }
        }
        
        goToNextCard();
    };
    
    const handleApplyFilters = (newFilters: { ageRange: [number, number]; distance: number; }) => {
        setFilters(newFilters);
        // Here you would refetch users based on new filters
    };

    const currentProfile = !isLoading && users.length > currentIndex ? users[currentIndex] : null;

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
                {isLoading ? (
                    <div className="flex justify-center items-center h-full">
                        <FlameLoader />
                    </div>
                ) : currentProfile ? (
                    <ProfileCard user={currentProfile} />
                ) : (
                    <div className="flex flex-col justify-center items-center h-full text-center p-4 bg-white rounded-2xl shadow-lg">
                        <h2 className="text-xl font-bold text-dark-gray">That's Everyone!</h2>
                        <p className="text-gray-500 mt-2">You've seen all the profiles nearby. Check back later for new people.</p>
                    </div>
                )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-around items-center w-full max-w-sm">
                <button onClick={() => currentProfile && handleSwipe(currentProfile.id, 'left')} disabled={!currentProfile} className="w-16 h-16 rounded-full bg-white shadow-lg flex justify-center items-center text-yellow-500 disabled:opacity-50">
                    <XIcon className="w-8 h-8 text-gray-500" />
                </button>
                 <button className="w-12 h-12 rounded-full bg-white shadow-lg flex justify-center items-center text-purple-500 disabled:opacity-50" disabled={!currentProfile}>
                    <RocketIcon className="w-6 h-6" />
                </button>
                <button onClick={() => currentProfile && handleSwipe(currentProfile.id, 'right')} disabled={!currentProfile} className="w-20 h-20 rounded-full bg-white shadow-lg flex justify-center items-center text-red-500 disabled:opacity-50">
                    <HeartIcon isLiked={false} className="w-10 h-10" />
                </button>
                 <button className="w-12 h-12 rounded-full bg-white shadow-lg flex justify-center items-center text-blue-500 disabled:opacity-50" disabled={!currentProfile}>
                    <StarIcon className="w-6 h-6" />
                </button>
            </div>
        </div>
    );
};

export default SwipeScreen;