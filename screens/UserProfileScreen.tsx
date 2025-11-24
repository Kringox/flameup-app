
import React, { useState, useEffect } from 'react';
import { User, Post, NotificationType } from '../types.ts';
import { db } from '../firebaseConfig.ts';
import { doc, getDoc, collection, query, where, orderBy, onSnapshot, updateDoc, arrayUnion, arrayRemove, addDoc, serverTimestamp, increment } from 'firebase/firestore';
import VerifiedIcon from '../components/icons/VerifiedIcon.tsx';
import ImageViewer from '../components/ImageViewer.tsx';
import HotnessDisplay from '../components/HotnessDisplay.tsx';
import { HotnessWeight } from '../utils/hotnessUtils.ts';
import PostDetailView from '../components/PostDetailView.tsx';

interface UserProfileScreenProps {
  currentUserId: string;
  viewingUserId: string;
  onClose: () => void;
  onStartChat: (partnerId: string) => void;
}

const THEME_CLASSES: { [key: string]: { bg: string; text: string; subtext: string; border: string; }} = {
    default: { bg: 'bg-white', text: 'text-dark-gray', subtext: 'text-gray-500', border: 'border-gray-200' },
    dusk: { bg: 'bg-theme-dusk-bg', text: 'text-theme-dusk-text', subtext: 'text-gray-400', border: 'border-gray-700' },
    rose: { bg: 'bg-theme-rose-bg', text: 'text-theme-rose-text', subtext: 'text-pink-200', border: 'border-pink-300' },
};

const UserProfileScreen: React.FC<UserProfileScreenProps> = ({ currentUserId, viewingUserId, onClose, onStartChat }) => {
    const [user, setUser] = useState<User | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFollowing, setIsFollowing] = useState(false);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
    const [viewingPost, setViewingPost] = useState<Post | null>(null);

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
        setIsFollowing(newFollowingState);

        setUser(prevUser => {
            if (!prevUser) return null;
            const currentFollowers = prevUser.followers || [];
            const newFollowers = newFollowingState
                ? [...currentFollowers, currentUserId]
                : currentFollowers.filter(id => id !== currentUserId);
            
            // Optimistically update hotness
            const hotnessDiff = newFollowingState ? HotnessWeight.FOLLOW : -HotnessWeight.FOLLOW;
            return { 
                ...prevUser, 
                followers: newFollowers,
                hotnessScore: (prevUser.hotnessScore || 0) + hotnessDiff 
            };
        });

        try {
            await updateDoc(currentUserRef, {
                following: newFollowingState ? arrayUnion(viewingUserId) : arrayRemove(viewingUserId)
            });

            // Update Target's Hotness Score
            await updateDoc(targetUserRef, {
                hotnessScore: increment(newFollowingState ? HotnessWeight.FOLLOW : -HotnessWeight.FOLLOW)
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
            setIsFollowing(!newFollowingState); 
        }
    };
    
    if (isLoading || !user) {
        return <div className="absolute inset-0 bg-white z-[70] flex justify-center items-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div></div>;
    }
    
    const themeClass = THEME_CLASSES[user.profileTheme || 'default'] || THEME_CLASSES.default;

    return (
        <div className={`absolute inset-0 ${themeClass.bg} z-[70] flex flex-col animate-slide-in`}>
            {isImageViewerOpen && <ImageViewer images={user.profilePhotos} onClose={() => setIsImageViewerOpen(false)} />}
            {viewingPost && currentUser && (
                <PostDetailView 
                    post={viewingPost} 
                    currentUser={currentUser} 
                    onClose={() => setViewingPost(null)} 
                    onPostDeleted={() => {}} 
                    onPostUpdated={() => {}} 
                    onOpenComments={() => {}} 
                />
            )}
            
            <style>{`.animate-slide-in { animation: slideInFromRight 0.3s ease-out; } @keyframes slideInFromRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
            
            <header className="flex items-center p-4 border-b flex-shrink-0 bg-white/80 backdrop-blur-md sticky top-0 z-10">
                 <button onClick={onClose} className="w-8">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <h1 className="text-xl font-bold text-center flex-1 truncate">{user.name}</h1>
                <div className="w-8"></div>
            </header>

            <div className="flex-1 overflow-y-auto p-4 pb-20">
                <div className="flex items-center">
                    <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setIsImageViewerOpen(true); }}
                        className="relative group flex-shrink-0 cursor-pointer"
                    >
                        <img src={user.profilePhotos[0]} alt={user.name} className="w-24 h-24 rounded-full object-cover border-4 border-flame-orange shadow-md transform active:scale-95 transition-transform" />
                        <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/10 transition-colors" />
                    </button>
                    
                    <div className="flex-1 ml-6 flex justify-around text-center">
                        <div><p className="text-xl font-bold">{posts.length}</p><p className="text-sm text-gray-500">Posts</p></div>
                        <div><p className="text-xl font-bold">{user.followers.length}</p><p className="text-sm text-gray-500">Followers</p></div>
                        <div><p className="text-xl font-bold">{user.following.length}</p><p className="text-sm text-gray-500">Following</p></div>
                    </div>
                </div>

                <div className="mt-6">
                    <div className="flex justify-between items-start">
                        <p className="font-bold flex items-center text-xl">
                            {user.name}, {user.age}
                            {user.isPremium && <VerifiedIcon className="ml-1 w-5 h-5" />}
                        </p>
                        <HotnessDisplay score={user.hotnessScore || 0} />
                    </div>
                    
                    <div className="mt-4 space-y-4">
                        {user.aboutMe && (
                            <div>
                                <h3 className={`font-bold text-xs uppercase tracking-wider ${themeClass.subtext} mb-1`}>About Me</h3>
                                <p className={`${themeClass.text} whitespace-pre-wrap text-sm leading-relaxed`}>{user.aboutMe}</p>
                            </div>
                        )}
                        {user.interests && (
                            <div>
                                <h3 className={`font-bold text-xs uppercase tracking-wider ${themeClass.subtext} mb-1`}>Interests</h3>
                                <p className={`${themeClass.text} whitespace-pre-wrap text-sm`}>{user.interests}</p>
                            </div>
                        )}
                        {user.lifestyle && (
                            <div>
                                <h3 className={`font-bold text-xs uppercase tracking-wider ${themeClass.subtext} mb-1`}>Lifestyle</h3>
                                <p className={`${themeClass.text} whitespace-pre-wrap text-sm`}>{user.lifestyle}</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex space-x-3 mt-6">
                    <button 
                        onClick={handleFollowToggle} 
                        className={`flex-1 py-3 rounded-xl font-bold transition-all transform active:scale-95 ${isFollowing ? 'bg-gray-200 text-gray-800' : 'bg-flame-orange text-white shadow-md'}`}
                    >
                        {isFollowing ? 'Following' : 'Follow'}
                    </button>
                     <button 
                        onClick={() => onStartChat(user.id)} 
                        className="flex-1 py-3 border-2 border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        Message
                    </button>
                </div>
                
                <div className="grid grid-cols-3 gap-1 mt-8">
                    {posts.map(post => (
                        <button key={post.id} onClick={() => setViewingPost(post)} className="aspect-square bg-gray-200 relative group overflow-hidden">
                            <img src={post.mediaUrls[0]} alt="post" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default UserProfileScreen;
