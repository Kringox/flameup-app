import React, { useState, useEffect } from 'react';
import { User, NotificationType } from '../types';
import { db } from '../firebaseConfig';
import { collection, doc, getDocs, query, where, writeBatch, serverTimestamp, addDoc } from 'firebase/firestore';

const UserRow: React.FC<{ user: User, currentUser: User, onUnfollow: (targetUserId: string) => void, isFollowing: boolean }> = ({ user, currentUser, onUnfollow, isFollowing }) => {
    return (
        <div className="flex items-center p-3">
            <img src={user.profilePhotos?.[0]} alt={user.name} className="w-12 h-12 rounded-full object-cover" />
            <div className="flex-1 ml-3">
                <p className="font-semibold">{user.name}</p>
                <p className="text-sm text-gray-500">{user.bio.substring(0, 30)}...</p>
            </div>
            {user.id !== currentUser.id && (
                isFollowing ? (
                    <button onClick={() => onUnfollow(user.id)} className="bg-gray-200 text-gray-800 font-semibold py-1 px-4 rounded-lg text-sm">Following</button>
                ) : (
                    <button className="bg-flame-orange text-white font-semibold py-1 px-4 rounded-lg text-sm">Follow</button>
                )
            )}
        </div>
    )
};

interface FollowListScreenProps {
    title: 'Followers' | 'Following';
    userIds: string[];
    currentUser: User;
    onClose: () => void;
}

const FollowListScreen: React.FC<FollowListScreenProps> = ({ title, userIds, currentUser, onClose }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchUsers = async () => {
            if (!db || userIds.length === 0) {
                setIsLoading(false);
                return;
            };
            setIsLoading(true);
            try {
                const usersRef = collection(db, 'users');
                const q = query(usersRef, where('id', 'in', userIds));
                const querySnapshot = await getDocs(q);
                const userList = querySnapshot.docs.map(doc => doc.data() as User);
                setUsers(userList);
            } catch (error) {
                console.error("Error fetching users:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchUsers();
    }, [userIds]);

    const handleUnfollow = async (targetUserId: string) => {
        if (!db) return;
        
        // Optimistic UI update
        setUsers(users.filter(u => u.id !== targetUserId));

        const currentUserRef = doc(db, 'users', currentUser.id);
        const targetUserRef = doc(db, 'users', targetUserId);
        const batch = writeBatch(db);

        // Atomically update both users' documents
        const currentUserFollowing = currentUser.following.filter(id => id !== targetUserId);
        batch.update(currentUserRef, { following: currentUserFollowing });

        // We need the target user's data to update their followers, fetch if needed or assume it's loaded
        const targetUserData = users.find(u => u.id === targetUserId);
        if (targetUserData) {
            const targetUserFollowers = targetUserData.followers.filter(id => id !== currentUser.id);
            batch.update(targetUserRef, { followers: targetUserFollowers });
        }
        
        try {
            await batch.commit();
        } catch (error) {
            console.error("Failed to unfollow:", error);
            // Revert UI if needed (though optimistic is often fine here)
        }
    };

    return (
        <div className="fixed inset-0 bg-white z-50 flex flex-col">
            <header className="flex items-center p-4 border-b border-gray-200 flex-shrink-0">
                 <button onClick={onClose} className="text-lg text-gray-600 w-8">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <h1 className="text-xl font-bold text-dark-gray text-center flex-1">{title}</h1>
                <div className="w-8"></div>
            </header>

            <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                    <div className="flex justify-center items-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div></div>
                ) : users.length === 0 ? (
                    <p className="text-center text-gray-500 mt-8">No users to display.</p>
                ) : (
                    users.map(user => (
                        <UserRow 
                            key={user.id} 
                            user={user} 
                            currentUser={currentUser} 
                            onUnfollow={handleUnfollow}
                            isFollowing={currentUser.following.includes(user.id)}
                        />
                    ))
                )}
            </div>
        </div>
    );
};

export default FollowListScreen;
