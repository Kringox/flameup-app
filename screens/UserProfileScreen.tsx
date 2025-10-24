import React, { useState, useEffect } from 'react';
// FIX: Added file extension to types import
import { User, Post, NotificationType } from '../types.ts';
import { db } from '../firebaseConfig';
import { doc, getDoc, collection, query, where, orderBy, onSnapshot, updateDoc, arrayUnion, arrayRemove, addDoc, serverTimestamp } from 'firebase/firestore';
// FIX: Added missing component imports
import LevelProgressBar from '../components/LevelProgressBar.tsx';
import VerifiedIcon from '../components/icons/VerifiedIcon.tsx';

interface UserProfileScreenProps {
  currentUserId: string;
  viewingUserId: string;
  onClose: () => void;
  onStartChat: (partnerId: string) => void;
}

const UserProfileScreen: React.FC<UserProfileScreenProps> = ({ currentUserId, viewingUserId, onClose, onStartChat }) => {
    const [user, setUser] = useState<User | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFollowing, setIsFollowing] = useState(false);
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    useEffect(() => {
        if (!db) return;
        const fetchUserData = async () => {
            setIsLoading(true);
            const userRef = doc(db, 'users', viewingUserId);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                setUser({ id: userSnap.id, ...userSnap.data() } as User);
            }

            const currentUserRef = doc(db, 'users', currentUserId);
            const currentUserSnap = await getDoc(currentUserRef);
            if(currentUserSnap.exists()){
                const currentUserData = { id: currentUserSnap.id, ...currentUserSnap.data() } as User;
                setCurrentUser(currentUserData);
                setIsFollowing(currentUserData.following.includes(viewingUserId));
            }
            
            const postsQuery = query(collection(db, 'posts'), where('userId', '==', viewingUserId), orderBy('timestamp', 'desc'));
            const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
                const userPosts = snapshot.docs.map(doc => {
                    const data = doc.data();
                    const postUser = data.user || {
                        id: data.userId,
                        name: data.userName,
                        profilePhoto: data.userProfilePhoto,
                        isPremium: data.isPremium || false,
                    };
                    return {
                        id: doc.id,
                        ...data,
                        user: postUser,
                    } as Post;
                });
                setPosts(userPosts);
            });
            
            setIsLoading(false);
            return () => unsubscribe();
        };
        fetchUserData();
    }, [viewingUserId, currentUserId]);

    const handleFollowToggle = async () => {
        if (!db || !user || !currentUser) return;
        
        const currentUserRef = doc(db, 'users', currentUserId);
        const targetUserRef = doc(db, 'users', viewingUserId);

        const newFollowingState = !isFollowing;
        setIsFollowing(newFollowingState); // Optimistic update

        try {
            await updateDoc(currentUserRef, {
                following: newFollowingState ? arrayUnion(viewingUserId) : arrayRemove(viewingUserId)
            });
            await updateDoc(targetUserRef, {
                followers: newFollowingState ? arrayUnion(currentUserId) : arrayRemove(currentUserId)
            });
            
            if (newFollowingState) {
                const notificationsRef = collection(db, 'users', viewingUserId, 'notifications');
                await addDoc(notificationsRef, {
                    type: NotificationType.Follow,
                    fromUser: {
                        id: currentUser.id, name: currentUser.name, profilePhoto: currentUser.profilePhotos?.[0] || ''
                    },
                    read: false,
                    timestamp: serverTimestamp(),
                });
            }

        } catch (error) {
            console.error("Error updating follow status:", error);
            setIsFollowing(!newFollowingState); // Revert on error
        }
    };
    
    if (isLoading || !user) {
        return <div className="absolute inset-0 bg-white z-[70] flex justify-center items-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div></div>;
    }
    
    const themeClass = THEME_CLASSES[user.profileTheme || 'default'] || THEME_CLASSES.default;

    return (
        <div className={`absolute inset-0 ${themeClass.bg} z-[70] flex flex-col animate-slide-in`}>
            <style>{`.animate-slide-in { animation: slideInFromRight 0.3s ease-out; } @keyframes slideInFromRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
            <header className="flex items-center p-4 border-b">
                 <button onClick={onClose} className="w-8">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <h1 className="text-xl font-bold text-center flex-1">{user.name}</h1>
                <div className="w-8"></div>
            </header>

            <div className="flex-1 overflow-y-auto p-4">
                <div className="flex items-center">
                    <img src={user.profilePhotos[0]} alt={user.name} className="w-24 h-24 rounded-full object-cover border-4 border-flame-orange" />
                    <div className="flex-1 ml-6 flex justify-around text-center">
                        <div><p className="text-xl font-bold">{posts.length}</p><p>Posts</p></div>
                        <div><p className="text-xl font-bold">{user.followers.length}</p><p>Followers</p></div>
                        <div><p className="text-xl font-bold">{user.following.length}</p><p>Following</p></div>
                    </div>
                </div>

                <div className="mt-4">
                    <p className="font-semibold flex items-center">{user.name} {user.isPremium && <VerifiedIcon className="ml-1" />}</p>
                    <p>{user.bio}</p>
                </div>

                <div className="my-4">
                    <LevelProgressBar xp={user.xp} />
                </div>
                
                <div className="flex space-x-2">
                    <button onClick={handleFollowToggle} className={`flex-1 py-2 rounded-lg font-semibold ${isFollowing ? 'bg-gray-200 text-gray-800' : 'bg-flame-orange text-white'}`}>
                        {isFollowing ? 'Following' : 'Follow'}
                    </button>
                     <button onClick={() => onStartChat(user.id)} className="flex-1 py-2 border border-gray-300 rounded-lg font-semibold">Message</button>
                </div>
                
                <div className="grid grid-cols-3 gap-1 mt-4">
                    {posts.map(post => (
                        <div key={post.id} className="aspect-square bg-gray-200">
                            <img src={post.mediaUrls[0]} alt="post" className="w-full h-full object-cover" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const THEME_CLASSES: { [key: string]: { bg: string; text: string; subtext: string; border: string; }} = {
    default: { bg: 'bg-white', text: 'text-dark-gray', subtext: 'text-gray-500', border: 'border-gray-200' },
    dusk: { bg: 'bg-theme-dusk-bg', text: 'text-theme-dusk-text', subtext: 'text-gray-400', border: 'border-gray-700' },
    rose: { bg: 'bg-theme-rose-bg', text: 'text-theme-rose-text', subtext: 'text-pink-200', border: 'border-pink-300' },
};

export default UserProfileScreen;