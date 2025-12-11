
import React, { useState, useEffect } from 'react';
import { User, Post, AppTint } from '../types.ts';
import { db } from '../firebaseConfig.ts';
// FIX: Add QuerySnapshot and DocumentData to imports to resolve typing issue with onSnapshot.
import { collection, query, where, orderBy, onSnapshot, QuerySnapshot, DocumentData, getDocs } from 'firebase/firestore';
import SettingsIcon from '../components/icons/SettingsIcon.tsx';
import EditProfileScreen from './EditProfileScreen.tsx';
import SettingsScreen from './SettingsScreen.tsx';
import FollowListScreen from './FollowListScreen.tsx';
import ImageViewer from '../components/ImageViewer.tsx';
import VerifiedIcon from '../components/icons/VerifiedIcon.tsx';
import WalletScreen from './WalletScreen.tsx';
import FlameIcon from '../components/icons/FlameIcon.tsx';
import { useI18n } from '../contexts/I18nContext.ts';
import HotnessDisplay from '../components/HotnessDisplay.tsx';
import RankingModal from '../components/RankingModal.tsx';
import AnalyticsScreen from './AnalyticsScreen.tsx';
import BarChartIcon from '../components/icons/BarChartIcon.tsx';
import FlameLoader from '../components/FlameLoader.tsx';

const ProfileSkeleton = () => (
    <div className="animate-pulse p-4">
        <div className="flex items-center mb-6">
            <div className="w-24 h-24 bg-zinc-800 rounded-full"></div>
            <div className="flex-1 ml-6 flex justify-around">
                <div className="h-12 w-12 bg-zinc-800 rounded"></div>
                <div className="h-12 w-12 bg-zinc-800 rounded"></div>
                <div className="h-12 w-12 bg-zinc-800 rounded"></div>
            </div>
        </div>
        <div className="space-y-3 mb-8">
            <div className="h-6 w-48 bg-zinc-800 rounded"></div>
            <div className="h-4 w-full bg-zinc-800 rounded"></div>
        </div>
        <div className="grid grid-cols-3 gap-1">
            {Array.from({ length: 9 }).map((_, i) => <div key={i} className="aspect-square bg-zinc-800"></div>)}
        </div>
    </div>
);

interface ProfileScreenProps {
  currentUser: User;
  onUpdateUser: (updatedUser: User) => void;
  onViewProfile: (userId: string) => void;
  localTint: AppTint;
  setLocalTint: (tint: AppTint) => void;
  onViewPostGrid: (posts: Post[], index: number) => void;
}

const ChipList: React.FC<{ items: string }> = ({ items }) => {
    if (!items) return null;
    const list = items.split(',').map(i => i.trim()).filter(i => i.length > 0);
    if (list.length === 0) return null;
    return (
        <div className="flex flex-wrap gap-2 mt-2">
            {list.map((item, index) => (
                <span key={index} className="px-3 py-1.5 rounded-full text-sm font-medium bg-zinc-800 text-gray-200 border border-zinc-700">
                    {item}
                </span>
            ))}
        </div>
    );
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ currentUser, onUpdateUser, onViewProfile, localTint, setLocalTint, onViewPostGrid }) => {
    // State for different content types
    const [ownPosts, setOwnPosts] = useState<Post[]>([]);
    const [reposts, setReposts] = useState<Post[]>([]);
    const [likedPosts, setLikedPosts] = useState<Post[]>([]);
    
    // Loading states per category
    const [loadingState, setLoadingState] = useState({ posts: true, reposts: true, likes: true });
    
    const [activeTab, setActiveTab] = useState<'posts' | 'reposts' | 'likes'>('posts');
    const [isEditing, setIsEditing] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isWalletOpen, setIsWalletOpen] = useState(false);
    const [viewingFollowList, setViewingFollowList] = useState<'followers' | 'following' | null>(null);
    const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
    const [isRankingOpen, setIsRankingOpen] = useState(false);
    const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
    
    const { t } = useI18n();

    // Helper to process snapshots
    const processSnapshot = (snapshot: QuerySnapshot<DocumentData>) => {
        return snapshot.docs.map(doc => {
            const data = doc.data();
            return { 
                id: doc.id, 
                ...data, 
                user: data.user || { id: data.userId, name: data.userName, profilePhoto: data.userProfilePhoto } 
            } as Post;
        });
    };

    // Helper to sort client-side (needed for Reposts/Likes where composite index might be missing)
    const sortByTimeDesc = (a: Post, b: Post) => {
        const tA = a.timestamp?.toMillis ? a.timestamp.toMillis() : 0;
        const tB = b.timestamp?.toMillis ? b.timestamp.toMillis() : 0;
        return tB - tA; 
    };

    // --- EFFECT 1: Fetch Own Posts ---
    useEffect(() => {
        if (!db) return;
        const q = query(collection(db, 'posts'), where('userId', '==', currentUser.id), orderBy('timestamp', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setOwnPosts(processSnapshot(snapshot));
            setLoadingState(prev => ({ ...prev, posts: false }));
        }, (err) => {
            console.error("Error fetching posts:", err);
            setLoadingState(prev => ({ ...prev, posts: false }));
        });
        return () => unsubscribe();
    }, [currentUser.id]);

    // --- EFFECT 2: Fetch Reposts ---
    useEffect(() => {
        if (!db) return;
        const q = query(collection(db, 'posts'), where('repostedBy', 'array-contains', currentUser.id));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setReposts(processSnapshot(snapshot).sort(sortByTimeDesc));
            setLoadingState(prev => ({ ...prev, reposts: false }));
        }, (err) => {
            console.error("Error fetching reposts:", err);
            setLoadingState(prev => ({ ...prev, reposts: false }));
        });
        return () => unsubscribe();
    }, [currentUser.id]);

    // --- EFFECT 3: Fetch Likes ---
    useEffect(() => {
        if (!db) return;
        const q = query(collection(db, 'posts'), where('likedBy', 'array-contains', currentUser.id));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setLikedPosts(processSnapshot(snapshot).sort(sortByTimeDesc));
            setLoadingState(prev => ({ ...prev, likes: false }));
        }, (err) => {
            console.error("Error fetching likes:", err);
            setLoadingState(prev => ({ ...prev, likes: false }));
        });
        return () => unsubscribe();
    }, [currentUser.id]);


    const handleSaveProfile = (updatedUser: User) => {
        onUpdateUser(updatedUser);
        setIsEditing(false);
    };

    // Determine current posts to show based on tab
    let currentPosts: Post[] = [];
    let isCurrentTabLoading = true;

    if (activeTab === 'posts') {
        currentPosts = ownPosts;
        isCurrentTabLoading = loadingState.posts;
    } else if (activeTab === 'reposts') {
        currentPosts = reposts;
        isCurrentTabLoading = loadingState.reposts;
    } else if (activeTab === 'likes') {
        currentPosts = likedPosts;
        isCurrentTabLoading = loadingState.likes;
    }

    return (
        <div className="w-full h-full flex flex-col bg-black text-white">
            {isEditing && <EditProfileScreen user={currentUser} onSave={handleSaveProfile} onClose={() => setIsEditing(false)} />}
            {isSettingsOpen && <SettingsScreen user={currentUser} onClose={() => setIsSettingsOpen(false)} onUpdateUser={onUpdateUser} localTint={localTint} setLocalTint={setLocalTint} />}
            {isWalletOpen && <WalletScreen user={currentUser} onClose={() => setIsWalletOpen(false)} onUpdateUser={onUpdateUser} />}
            {viewingFollowList && <FollowListScreen title={viewingFollowList === 'followers' ? 'Followers' : 'Following'} userIds={currentUser[viewingFollowList]} currentUser={currentUser} onClose={() => setViewingFollowList(null)} onViewProfile={onViewProfile} />}
            {isImageViewerOpen && <ImageViewer images={currentUser.profilePhotos} onClose={() => setIsImageViewerOpen(false)} />}
            {isRankingOpen && <RankingModal onClose={() => setIsRankingOpen(false)} onViewProfile={onViewProfile} />}
            {isAnalyticsOpen && <AnalyticsScreen user={currentUser} onClose={() => setIsAnalyticsOpen(false)} />}
            
            <header className="flex justify-between items-center p-4 pt-[env(safe-area-inset-top)] border-b border-zinc-800 sticky top-0 bg-black/80 backdrop-blur z-10">
                <button onClick={() => setIsAnalyticsOpen(true)} className="p-2 bg-zinc-800 rounded-full">
                    <BarChartIcon className="w-5 h-5 text-gray-300" />
                </button>
                <div className="flex items-center space-x-2">
                    <h1 className="text-xl font-bold">{currentUser.name}</h1>
                    {currentUser.isPremium && <VerifiedIcon />}
                </div>
                <button onClick={() => setIsSettingsOpen(true)}>
                    <SettingsIcon className="w-6 h-6 text-white" />
                </button>
            </header>
            
            <div className="flex-1 overflow-y-auto pb-32">
                <div className="p-4">
                    <div className="flex items-center">
                        <button onClick={() => setIsImageViewerOpen(true)} className="flex-shrink-0">
                            <img src={currentUser.profilePhotos[0]} alt={currentUser.name} className="w-24 h-24 rounded-full object-cover border-2 border-zinc-800" />
                        </button>
                        <div className="flex-1 ml-6 flex justify-around text-center">
                            <div><p className="text-xl font-bold text-white">{ownPosts.length}</p><p className="text-gray-500 text-sm">{t('posts')}</p></div>
                            <button onClick={() => setViewingFollowList('followers')}>
                                <p className="text-xl font-bold text-white">{currentUser.followers.length}</p><p className="text-gray-500 text-sm">{t('followers')}</p>
                            </button>
                            <button onClick={() => setViewingFollowList('following')}>
                                <p className="text-xl font-bold text-white">{currentUser.following.length}</p><p className="text-gray-500 text-sm">{t('following')}</p>
                            </button>
                        </div>
                    </div>

                    <div className="mt-6 space-y-4">
                        <div>
                            <div className="flex justify-between items-start">
                                <p className="font-semibold text-xl flex items-center">
                                    {currentUser.name}, {currentUser.age}
                                    {currentUser.isPremium && <VerifiedIcon className="ml-1.5 w-5 h-5" />}
                                </p>
                                <HotnessDisplay score={currentUser.hotnessScore || 0} size="md" onClick={() => setIsRankingOpen(true)} />
                            </div>
                            {currentUser.aboutMe && <p className="text-gray-300 whitespace-pre-wrap mt-2 text-sm leading-relaxed">{currentUser.aboutMe}</p>}
                        </div>
                        {currentUser.interests && <div><h3 className="font-bold text-xs uppercase text-gray-500 mb-2">{t('interests')}</h3><ChipList items={currentUser.interests} /></div>}
                        {currentUser.lifestyle && <div><h3 className="font-bold text-xs uppercase text-gray-500 mb-2">{t('lifestyle')}</h3><ChipList items={currentUser.lifestyle} /></div>}
                    </div>

                    <div className="flex gap-4 mt-8 mb-6">
                        <button onClick={() => setIsEditing(true)} className="flex-1 py-3 px-4 rounded-xl font-bold text-base bg-zinc-800 text-white border border-zinc-700 active:scale-95 transition-all">
                            {t('editProfile')}
                        </button>
                        <button onClick={() => setIsWalletOpen(true)} className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white text-black active:scale-95 transition-all font-bold">
                            <span>{t('wallet')}</span>
                            <div className="flex items-center bg-black text-flame-orange px-2 py-0.5 rounded-full text-sm">
                                <FlameIcon isGradient className="w-3.5 h-3.5 mr-1" />
                                <span>{Number(currentUser.coins) || 0}</span>
                            </div>
                        </button>
                    </div>
                    
                    {/* Tabs */}
                    <div className="flex justify-around border-b border-zinc-800 mb-2">
                        <button 
                            onClick={() => setActiveTab('posts')} 
                            className={`py-3 flex-1 font-bold text-sm uppercase transition-colors ${activeTab === 'posts' ? 'text-white border-b-2 border-white' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            Posts
                        </button>
                        <button 
                            onClick={() => setActiveTab('reposts')} 
                            className={`py-3 flex-1 font-bold text-sm uppercase transition-colors ${activeTab === 'reposts' ? 'text-white border-b-2 border-white' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            Reposts
                        </button>
                        <button 
                            onClick={() => setActiveTab('likes')} 
                            className={`py-3 flex-1 font-bold text-sm uppercase transition-colors ${activeTab === 'likes' ? 'text-white border-b-2 border-white' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            Likes
                        </button>
                    </div>
                    
                    {/* Content Grid */}
                    <div className="min-h-[200px]">
                        {isCurrentTabLoading ? (
                            <div className="py-20 flex justify-center items-center">
                                <FlameLoader size="sm" />
                            </div>
                        ) : currentPosts.length === 0 ? (
                            <div className="py-20 text-center text-gray-500 text-sm">
                                {activeTab === 'posts' && "No posts yet."}
                                {activeTab === 'reposts' && "You haven't reposted anything yet."}
                                {activeTab === 'likes' && "You haven't liked any posts yet."}
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 gap-0.5">
                                {currentPosts.map((post, index) => (
                                    <button key={post.id} onClick={() => onViewPostGrid(currentPosts, index)} className="aspect-square relative group overflow-hidden bg-zinc-900">
                                        <img src={post.mediaUrls[0]} alt="post" className="w-full h-full object-cover" />
                                        {post.isPaid && <div className="absolute top-1 right-1 bg-flame-orange text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">PAID</div>}
                                        {activeTab === 'reposts' && <div className="absolute bottom-1 right-1 bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm flex items-center"><svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg></div>}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfileScreen;
