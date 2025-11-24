
import React, { useState, useEffect } from 'react';
import { User, Post } from '../types.ts';
import { db } from '../firebaseConfig.ts';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import SettingsIcon from '../components/icons/SettingsIcon.tsx';
import EditProfileScreen from './EditProfileScreen.tsx';
import SettingsScreen from './SettingsScreen.tsx';
import FollowListScreen from './FollowListScreen.tsx';
import PostDetailView from '../components/PostDetailView.tsx';
import ImageViewer from '../components/ImageViewer.tsx';
import VerifiedIcon from '../components/icons/VerifiedIcon.tsx';
import WalletScreen from './WalletScreen.tsx';
import FlameIcon from '../components/icons/FlameIcon.tsx';
import { useI18n } from '../contexts/I18nContext.ts';
import HotnessDisplay from '../components/HotnessDisplay.tsx';

const THEME_CLASSES: { [key: string]: { bg: string; text: string; subtext: string; border: string; }} = {
    default: { bg: 'bg-white dark:bg-black', text: 'text-dark-gray dark:text-gray-200', subtext: 'text-gray-500 dark:text-gray-400', border: 'border-gray-200 dark:border-gray-800' },
    ocean: { bg: 'bg-blue-50 dark:bg-slate-900', text: 'text-blue-900 dark:text-blue-100', subtext: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' },
    dusk: { bg: 'bg-theme-dusk-bg', text: 'text-theme-dusk-text', subtext: 'text-gray-400', border: 'border-gray-700' },
    rose: { bg: 'bg-theme-rose-bg', text: 'text-theme-rose-text', subtext: 'text-pink-200', border: 'border-pink-300' },
}

type Theme = 'light' | 'dark' | 'system';
type AppTint = 'default' | 'ocean' | 'rose' | 'dusk';

interface ProfileScreenProps {
  currentUser: User;
  onUpdateUser: (updatedUser: User) => void;
  onViewProfile: (userId: string) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  localTint: AppTint;
  setLocalTint: (tint: AppTint) => void;
}

// Helper to assign icons based on keywords
const getIconForKeyword = (keyword: string): string => {
    const lower = keyword.toLowerCase();
    if (lower.includes('sport') || lower.includes('fitness') || lower.includes('gym') || lower.includes('workout')) return '🏋️';
    if (lower.includes('music') || lower.includes('musik')) return '🎵';
    if (lower.includes('travel') || lower.includes('reisen') || lower.includes('wanderlust')) return '✈️';
    if (lower.includes('food') || lower.includes('essen') || lower.includes('cooking') || lower.includes('kochen')) return '🍳';
    if (lower.includes('art') || lower.includes('kunst') || lower.includes('drawing')) return '🎨';
    if (lower.includes('game') || lower.includes('zocken') || lower.includes('gaming')) return '🎮';
    if (lower.includes('movie') || lower.includes('film') || lower.includes('netflix')) return '🎬';
    if (lower.includes('tech') || lower.includes('code') || lower.includes('software')) return '💻';
    if (lower.includes('nature') || lower.includes('natur') || lower.includes('hiking') || lower.includes('wandern')) return '🌲';
    if (lower.includes('book') || lower.includes('lesen') || lower.includes('reading')) return '📚';
    if (lower.includes('photo') || lower.includes('foto')) return '📸';
    if (lower.includes('animal') || lower.includes('tier') || lower.includes('dog') || lower.includes('hund') || lower.includes('cat')) return '🐾';
    if (lower.includes('coffee') || lower.includes('kaffee')) return '☕';
    if (lower.includes('drink') || lower.includes('beer') || lower.includes('bier') || lower.includes('party')) return '🍻';
    return '✨';
};

const ChipList: React.FC<{ items: string, themeClasses: any }> = ({ items, themeClasses }) => {
    if (!items) return null;
    const list = items.split(',').map(i => i.trim()).filter(i => i.length > 0);
    
    if (list.length === 0) return null;

    return (
        <div className="flex flex-wrap gap-2 mt-2">
            {list.map((item, index) => (
                <span 
                    key={index} 
                    className={`px-3 py-1.5 rounded-full text-sm font-medium flex items-center shadow-sm transition-transform hover:scale-105 bg-gray-100 dark:bg-zinc-800 ${themeClasses.text} border border-gray-200 dark:border-zinc-700`}
                >
                    <span className="mr-1.5">{getIconForKeyword(item)}</span>
                    {item}
                </span>
            ))}
        </div>
    );
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ currentUser, onUpdateUser, onViewProfile, theme, setTheme, localTint, setLocalTint }) => {
    const [posts, setPosts] = useState<Post[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isWalletOpen, setIsWalletOpen] = useState(false);
    const [viewingFollowList, setViewingFollowList] = useState<'followers' | 'following' | null>(null);
    const [viewingPost, setViewingPost] = useState<Post | null>(null);
    const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
    const { t } = useI18n();

    useEffect(() => {
        if (!db) return;
        const q = query(collection(db, 'posts'), where('userId', '==', currentUser.id), orderBy('timestamp', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
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
        return () => unsubscribe();
    }, [currentUser.id]);

    const handleSaveProfile = (updatedUser: User) => {
        onUpdateUser(updatedUser);
        setIsEditing(false);
    };

    const handlePostDeleted = (postId: string) => {
        setPosts(current => current.filter(p => p.id !== postId));
        setViewingPost(null);
    };

    const handlePostUpdated = (updatedPost: Post) => {
        setPosts(current => current.map(p => p.id === updatedPost.id ? updatedPost : p));
        setViewingPost(updatedPost);
    };
    
    const themeClasses = THEME_CLASSES[localTint || 'default'] || THEME_CLASSES.default;

    return (
        <div className={`w-full h-full flex flex-col ${themeClasses.bg}`}>
            {isEditing && <EditProfileScreen user={currentUser} onSave={handleSaveProfile} onClose={() => setIsEditing(false)} />}
            {isSettingsOpen && <SettingsScreen user={currentUser} onClose={() => setIsSettingsOpen(false)} onUpdateUser={onUpdateUser} theme={theme} setTheme={setTheme} localTint={localTint} setLocalTint={setLocalTint} />}
            {isWalletOpen && <WalletScreen user={currentUser} onClose={() => setIsWalletOpen(false)} onUpdateUser={onUpdateUser} />}
            {viewingFollowList && <FollowListScreen title={viewingFollowList === 'followers' ? 'Followers' : 'Following'} userIds={currentUser[viewingFollowList]} currentUser={currentUser} onClose={() => setViewingFollowList(null)} onViewProfile={onViewProfile} />}
            {viewingPost && <PostDetailView post={viewingPost} currentUser={currentUser} onClose={() => setViewingPost(null)} onPostDeleted={handlePostDeleted} onPostUpdated={handlePostUpdated} onOpenComments={() => {}} />}
            {isImageViewerOpen && <ImageViewer images={currentUser.profilePhotos} onClose={() => setIsImageViewerOpen(false)} />}
            
            <header className={`flex justify-between items-center p-4 ${themeClasses.border} border-b sticky top-0 bg-white/90 dark:bg-black/90 backdrop-blur z-10`}>
                <div className="w-8"></div>
                <div className={`flex items-center space-x-2`}>
                    <h1 className={`text-xl font-bold ${themeClasses.text}`}>{currentUser.name}</h1>
                    {currentUser.isPremium && <VerifiedIcon />}
                </div>
                <button onClick={() => setIsSettingsOpen(true)}>
                    <SettingsIcon className={`w-6 h-6 ${themeClasses.text}`} />
                </button>
            </header>
            
            <div className="flex-1 overflow-y-auto p-4 pb-20">
                <div className="flex items-center">
                    <button onClick={() => setIsImageViewerOpen(true)} className="flex-shrink-0">
                        <img src={currentUser.profilePhotos[0]} alt={currentUser.name} className="w-24 h-24 rounded-full object-cover border-4 border-flame-orange shadow-md" />
                    </button>
                    <div className="flex-1 ml-6 flex justify-around text-center">
                        <div>
                            <p className={`text-xl font-bold ${themeClasses.text}`}>{posts.length}</p>
                            <p className={`${themeClasses.subtext}`}>{t('posts')}</p>
                        </div>
                        <button onClick={() => setViewingFollowList('followers')}>
                            <p className={`text-xl font-bold ${themeClasses.text}`}>{currentUser.followers.length}</p>
                            <p className={`${themeClasses.subtext}`}>{t('followers')}</p>
                        </button>
                        <button onClick={() => setViewingFollowList('following')}>
                            <p className={`text-xl font-bold ${themeClasses.text}`}>{currentUser.following.length}</p>
                            <p className={`${themeClasses.subtext}`}>{t('following')}</p>
                        </button>
                    </div>
                </div>

                <div className="mt-6 space-y-6">
                    <div>
                        <div className="flex justify-between items-start">
                            <p className={`font-semibold text-xl ${themeClasses.text} flex items-center`}>
                                {currentUser.name}, {currentUser.age}
                                {currentUser.isPremium && <VerifiedIcon className="ml-1.5 w-5 h-5" />}
                            </p>
                            <HotnessDisplay score={currentUser.hotnessScore || 0} />
                        </div>
                         {currentUser.aboutMe && (
                            <p className={`${themeClasses.text} whitespace-pre-wrap mt-2 text-sm leading-relaxed`}>{currentUser.aboutMe}</p>
                        )}
                    </div>

                    {currentUser.interests && (
                        <div>
                            <h3 className={`font-bold text-xs uppercase tracking-wider ${themeClasses.subtext} mb-2`}>{t('interests')}</h3>
                            <ChipList items={currentUser.interests} themeClasses={themeClasses} />
                        </div>
                    )}
                    
                    {currentUser.lifestyle && (
                        <div>
                            <h3 className={`font-bold text-xs uppercase tracking-wider ${themeClasses.subtext} mb-2`}>{t('lifestyle')}</h3>
                            <ChipList items={currentUser.lifestyle} themeClasses={themeClasses} />
                        </div>
                    )}
                </div>

                {/* UPDATED BUTTON LAYOUT: Side-by-Side, Clean White/Border Style */}
                <div className="flex space-x-3 mt-8 mb-6">
                    <button 
                         onClick={() => setIsEditing(true)}
                         className="flex-1 py-3 border-2 border-black dark:border-gray-500 rounded-xl font-semibold text-lg bg-white dark:bg-zinc-800 text-black dark:text-white shadow-sm active:scale-95 transition-transform"
                    >
                        {t('editProfile')}
                    </button>
                    
                    <button 
                        onClick={() => setIsWalletOpen(true)} 
                        className="flex-1 flex items-center justify-center space-x-2 py-3 border-2 border-black dark:border-gray-500 rounded-xl bg-white dark:bg-zinc-800 text-black dark:text-white shadow-sm active:scale-95 transition-transform"
                    >
                        <span className="font-semibold text-lg">{t('wallet')}</span>
                        <div className="flex items-center text-flame-orange font-bold">
                             <FlameIcon isGradient className="w-5 h-5 mr-1" />
                             <span>{Number(currentUser.coins) || 0}</span>
                        </div>
                    </button>
                </div>
                
                <div className="grid grid-cols-3 gap-1">
                    {posts.map(post => (
                        <button key={post.id} onClick={() => setViewingPost(post)} className="aspect-square relative group overflow-hidden bg-gray-100 dark:bg-zinc-800">
                            <img src={post.mediaUrls[0]} alt="post" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ProfileScreen;
