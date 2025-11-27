import React, { useState, useEffect } from 'react';
import { User, Post, AppTint } from '../types.ts';
import { db } from '../firebaseConfig.ts';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
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
    const [posts, setPosts] = useState<Post[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isWalletOpen, setIsWalletOpen] = useState(false);
    const [viewingFollowList, setViewingFollowList] = useState<'followers' | 'following' | null>(null);
    const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const { t } = useI18n();

    useEffect(() => {
        if (!db) return;
        setIsLoading(true);
        const q = query(collection(db, 'posts'), where('userId', '==', currentUser.id), orderBy('timestamp', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const userPosts = snapshot.docs.map(doc => {
                const data = doc.data();
                return { id: doc.id, ...data, user: data.user || { id: data.userId, name: data.userName, profilePhoto: data.userProfilePhoto } } as Post;
            });
            setPosts(userPosts);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [currentUser.id]);

    const handleSaveProfile = (updatedUser: User) => {
        onUpdateUser(updatedUser);
        setIsEditing(false);
    };

    return (
        <div className="w-full h-full flex flex-col bg-black text-white">
            {isEditing && <EditProfileScreen user={currentUser} onSave={handleSaveProfile} onClose={() => setIsEditing(false)} />}
            {isSettingsOpen && <SettingsScreen user={currentUser} onClose={() => setIsSettingsOpen(false)} onUpdateUser={onUpdateUser} localTint={localTint} setLocalTint={setLocalTint} />}
            {isWalletOpen && <WalletScreen user={currentUser} onClose={() => setIsWalletOpen(false)} onUpdateUser={onUpdateUser} />}
            {viewingFollowList && <FollowListScreen title={viewingFollowList === 'followers' ? 'Followers' : 'Following'} userIds={currentUser[viewingFollowList]} currentUser={currentUser} onClose={() => setViewingFollowList(null)} onViewProfile={onViewProfile} />}
            {isImageViewerOpen && <ImageViewer images={currentUser.profilePhotos} onClose={() => setIsImageViewerOpen(false)} />}
            
            <header className="flex justify-between items-center p-4 border-b border-zinc-800 sticky top-0 bg-black/80 backdrop-blur z-10">
                <div className="w-8"></div>
                <div className="flex items-center space-x-2">
                    <h1 className="text-xl font-bold">{currentUser.name}</h1>
                    {currentUser.isPremium && <VerifiedIcon />}
                </div>
                <button onClick={() => setIsSettingsOpen(true)}>
                    <SettingsIcon className="w-6 h-6 text-white" />
                </button>
            </header>
            
            <div className="flex-1 overflow-y-auto pb-32">
                {isLoading ? <ProfileSkeleton /> : (
                    <div className="p-4">
                        <div className="flex items-center">
                            <button onClick={() => setIsImageViewerOpen(true)} className="flex-shrink-0">
                                <img src={currentUser.profilePhotos[0]} alt={currentUser.name} className="w-24 h-24 rounded-full object-cover border-2 border-zinc-800" />
                            </button>
                            <div className="flex-1 ml-6 flex justify-around text-center">
                                <div><p className="text-xl font-bold text-white">{posts.length}</p><p className="text-gray-500 text-sm">{t('posts')}</p></div>
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
                                    <HotnessDisplay score={currentUser.hotnessScore || 0} />
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
                        
                        <div className="grid grid-cols-3 gap-0.5">
                            {posts.map((post, index) => (
                                <button key={post.id} onClick={() => onViewPostGrid(posts, index)} className="aspect-square relative group overflow-hidden bg-zinc-900">
                                    <img src={post.mediaUrls[0]} alt="post" className="w-full h-full object-cover" />
                                    {post.isPaid && <div className="absolute top-1 right-1 bg-flame-orange text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">PAID</div>}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProfileScreen;