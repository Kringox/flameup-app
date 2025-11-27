import React, { useState, useEffect } from 'react';
import { User, Post, NotificationType } from '../types.ts';
import { db } from '../firebaseConfig.ts';
import { doc, collection, query, where, orderBy, onSnapshot, updateDoc, arrayUnion, arrayRemove, addDoc, serverTimestamp, increment, runTransaction } from 'firebase/firestore';
import VerifiedIcon from '../components/icons/VerifiedIcon.tsx';
import ImageViewer from '../components/ImageViewer.tsx';
import HotnessDisplay from '../components/HotnessDisplay.tsx';
import { HotnessWeight } from '../utils/hotnessUtils.ts';
import PostGridViewer from '../components/PostGridViewer.tsx';
import CrownIcon from '../components/icons/CrownIcon.tsx';
import FlameIcon from '../components/icons/FlameIcon.tsx';

interface UserProfileScreenProps {
  currentUserId: string;
  viewingUserId: string;
  onClose: () => void;
  onStartChat: (partnerId: string) => void;
}

const THEME_CLASSES: { [key: string]: { bg: string; text: string; subtext: string; border: string; }} = {
    default: { bg: 'bg-white dark:bg-black', text: 'text-dark-gray dark:text-gray-200', subtext: 'text-gray-500 dark:text-gray-400', border: 'border-gray-200 dark:border-gray-700' },
    dusk: { bg: 'bg-theme-dusk-bg', text: 'text-theme-dusk-text', subtext: 'text-gray-400', border: 'border-gray-700' },
    rose: { bg: 'bg-theme-rose-bg', text: 'text-theme-rose-text', subtext: 'text-pink-200', border: 'border-pink-300' },
};

const UserProfileScreen: React.FC<UserProfileScreenProps> = ({ currentUserId, viewingUserId, onClose, onStartChat }) => {
    const [user, setUser] = useState<User | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
    const [viewingPostIndex, setViewingPostIndex] = useState<number | null>(null);
    const [isProcessingSub, setIsProcessingSub] = useState(false);

    useEffect(() => {
        if (!db) return;
        const fetchUserData = async () => {
            setIsLoading(true);
            const userRef = doc(db, 'users', viewingUserId);
            const unsubscribeUser = onSnapshot(userRef, (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setUser({ 
                        id: docSnap.id, 
                        ...data,
                        followers: data.followers || [],
                        following: data.following || [] 
                    } as User);
                }
            });

            const currentUserRef = doc(db, 'users', currentUserId);
            const unsubscribeCurrentUser = onSnapshot(currentUserRef, (docSnap) => {
                if (docSnap.exists()) {
                    const data = { 
                        id: docSnap.id, 
                        ...docSnap.data(),
                        following: docSnap.data().following || []
                    } as User;
                    setCurrentUser(data);
                }
            });
            
            const postsQuery = query(collection(db, 'posts'), where('userId', '==', viewingUserId), orderBy('timestamp', 'desc'));
            const unsubscribePosts = onSnapshot(postsQuery, (snapshot) => {
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
            return () => {
                unsubscribeUser();
                unsubscribeCurrentUser();
                unsubscribePosts();
            };
        };
        fetchUserData();
    }, [viewingUserId, currentUserId]);

    const isFollowing = currentUser?.following?.includes(viewingUserId) || false;

    const handleFollowToggle = async () => {
        if (!db || !user || !currentUser) return;
        const currentUserRef = doc(db, 'users', currentUserId);
        const targetUserRef = doc(db, 'users', viewingUserId);
        const newFollowingState = !isFollowing;
        
        try {
            await updateDoc(currentUserRef, {
                following: newFollowingState ? arrayUnion(viewingUserId) : arrayRemove(viewingUserId)
            });
            await updateDoc(targetUserRef, {
                hotnessScore: increment(newFollowingState ? HotnessWeight.FOLLOW : -HotnessWeight.FOLLOW),
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
        }
    };

    const handleSubscribe = async () => {
        if (!db || !currentUser || !user || isProcessingSub) return;
        const price = user.subscriptionPrice || 0;
        const currentCoins = Number(currentUser.coins) || 0;

        if (currentCoins < price) {
            alert("Nicht genug Münzen! Bitte lade dein Wallet auf.");
            return;
        }

        if (!window.confirm(`Möchtest du ${user.name} für ${price} Münzen/Monat abonnieren?`)) return;

        setIsProcessingSub(true);
        try {
            await runTransaction(db, async (transaction) => {
                const userRef = doc(db, 'users', currentUser.id);
                const creatorRef = doc(db, 'users', user.id);

                transaction.update(userRef, { 
                    coins: increment(-price),
                    subscriptions: arrayUnion(user.id)
                });
                transaction.update(creatorRef, { 
                    coins: increment(price),
                    hotnessScore: increment(HotnessWeight.SUBSCRIBE) 
                });
            });

            const notificationsRef = collection(db, 'users', user.id, 'notifications');
            await addDoc(notificationsRef, {
                type: NotificationType.Subscribe,
                fromUser: {
                    id: currentUser.id, name: currentUser.name, profilePhoto: currentUser.profilePhotos?.[0] || ''
                },
                read: false,
                coinsSpent: price,
                timestamp: serverTimestamp(),
            });

        } catch (error) {
            console.error("Subscription failed:", error);
            alert("Abonnement fehlgeschlagen.");
        } finally {
            setIsProcessingSub(false);
        }
    };
    
    if (isLoading || !user) {
        return <div className="absolute inset-0 bg-white dark:bg-black z-[70] flex justify-center items-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div></div>;
    }
    
    const themeClass = THEME_CLASSES[user.profileTheme || 'default'] || THEME_CLASSES.default;
    const isSubscribed = currentUser?.subscriptions?.includes(user.id);
    const hasSubscriptionPrice = (user.subscriptionPrice || 0) > 0;

    return (
        <div className={`absolute inset-0 h-full w-full overflow-hidden z-[40] flex flex-col animate-slide-in ${themeClass.bg}`}>
            {isImageViewerOpen && <ImageViewer images={user.profilePhotos} onClose={() => setIsImageViewerOpen(false)} />}
            
            {viewingPostIndex !== null && currentUser && (
                <PostGridViewer 
                    posts={posts}
                    startIndex={viewingPostIndex}
                    currentUser={currentUser}
                    onClose={() => setViewingPostIndex(null)}
                    onOpenComments={() => {}} 
                    onViewProfile={() => {}} 
                    onUpdateUser={() => {}} 
                />
            )}
            
            <style>{`.animate-slide-in { animation: slideInFromRight 0.3s ease-out; } @keyframes slideInFromRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
            
            <header className="flex items-center p-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0 bg-white/80 dark:bg-black/80 backdrop-blur-md sticky top-0 z-10">
                 <button onClick={onClose} className="w-8 text-dark-gray dark:text-gray-200">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <h1 className={`text-xl font-bold text-center flex-1 truncate ${themeClass.text}`}>{user.name}</h1>
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
                        <div><p className={`text-xl font-bold ${themeClass.text}`}>{posts.length}</p><p className="text-sm text-gray-500">Posts</p></div>
                        <div><p className={`text-xl font-bold ${themeClass.text}`}>{user.followers?.length || 0}</p><p className="text-sm text-gray-500">Followers</p></div>
                        <div><p className={`text-xl font-bold ${themeClass.text}`}>{user.following?.length || 0}</p><p className="text-sm text-gray-500">Following</p></div>
                    </div>
                </div>

                <div className="mt-6">
                    <div className="flex justify-between items-start">
                        <p className={`font-bold flex items-center text-xl ${themeClass.text}`}>
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
                        className={`flex-1 py-3 rounded-xl font-bold transition-all transform active:scale-95 ${isFollowing ? 'bg-gray-200 text-gray-800 dark:bg-zinc-700 dark:text-gray-200' : 'bg-flame-orange text-white shadow-md'}`}
                    >
                        {isFollowing ? 'Following' : 'Follow'}
                    </button>
                     <button 
                        onClick={() => onStartChat(user.id)} 
                        className="flex-1 py-3 border-2 border-gray-200 dark:border-zinc-700 rounded-xl font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
                    >
                        Message
                    </button>
                </div>
                
                {hasSubscriptionPrice && !isSubscribed && (
                    <div className="mt-6">
                        <button
                            onClick={handleSubscribe}
                            disabled={isProcessingSub}
                            className="w-full relative overflow-hidden group rounded-2xl p-4 bg-gradient-to-r from-gray-900 to-black dark:from-zinc-800 dark:to-black text-white shadow-lg active:scale-95 transition-all"
                        >
                            <div className="absolute top-0 right-0 p-2 opacity-10">
                                <CrownIcon className="w-24 h-24" />
                            </div>
                            <div className="flex items-center justify-between relative z-10">
                                <div className="text-left">
                                    <p className="text-xs text-gray-300 uppercase font-bold tracking-wider mb-1">Exclusive Access</p>
                                    <p className="font-bold text-lg">Unlock all posts</p>
                                </div>
                                <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl flex items-center">
                                    <FlameIcon className="w-5 h-5 text-flame-orange mr-1.5" />
                                    <span className="font-bold text-xl">{user.subscriptionPrice}</span>
                                </div>
                            </div>
                        </button>
                    </div>
                )}
                
                <div className="grid grid-cols-3 gap-1 mt-6">
                    {posts.map((post, index) => {
                        const isUnlocked = !post.isPaid || post.unlockedBy?.includes(currentUserId) || isSubscribed || post.user.id === currentUserId;
                        
                        return (
                            <button key={post.id} onClick={() => setViewingPostIndex(index)} className="aspect-square bg-gray-200 dark:bg-zinc-800 relative group overflow-hidden">
                                <img 
                                    src={post.mediaUrls[0]} 
                                    alt="post" 
                                    className={`w-full h-full object-cover transition-all duration-300 ${!isUnlocked ? 'blur-xl scale-110 brightness-75' : ''}`} 
                                />
                                {!isUnlocked && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-black/10">
                                        <div className="bg-black/40 p-2 rounded-full backdrop-blur-sm mb-1">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                            </svg>
                                        </div>
                                        {post.price && (
                                            <span className="text-white text-xs font-bold drop-shadow-md flex items-center bg-black/50 px-2 py-0.5 rounded-full">
                                                <FlameIcon className="w-3 h-3 mr-1" />{post.price}
                                            </span>
                                        )}
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default UserProfileScreen;