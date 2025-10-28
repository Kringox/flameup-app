import React, { useState, useEffect } from 'react';
// FIX: Added file extension to types and other component/screen imports
import { User, Post } from '../types.ts';
import { db } from '../firebaseConfig.ts';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import SettingsIcon from '../components/icons/SettingsIcon.tsx';
import EditProfileScreen from './EditProfileScreen.tsx';
import SettingsScreen from './SettingsScreen.tsx';
import FollowListScreen from './FollowListScreen.tsx';
import PostDetailView from '../components/PostDetailView.tsx';
import LevelProgressBar from '../components/LevelProgressBar.tsx';
import ImageViewer from '../components/ImageViewer.tsx';
import VerifiedIcon from '../components/icons/VerifiedIcon.tsx';

const THEME_CLASSES: { [key: string]: { bg: string; text: string; subtext: string; border: string; }} = {
    default: { bg: 'bg-white dark:bg-black', text: 'text-dark-gray dark:text-gray-200', subtext: 'text-gray-500 dark:text-gray-400', border: 'border-gray-200 dark:border-gray-800' },
    dusk: { bg: 'bg-theme-dusk-bg', text: 'text-theme-dusk-text', subtext: 'text-gray-400', border: 'border-gray-700' },
    rose: { bg: 'bg-theme-rose-bg', text: 'text-theme-rose-text', subtext: 'text-pink-200', border: 'border-pink-300' },
}

type Theme = 'light' | 'dark' | 'system';

interface ProfileScreenProps {
  currentUser: User;
  onUpdateUser: (updatedUser: User) => void;
  onViewProfile: (userId: string) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ currentUser, onUpdateUser, onViewProfile, theme, setTheme }) => {
    const [posts, setPosts] = useState<Post[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [viewingFollowList, setViewingFollowList] = useState<'followers' | 'following' | null>(null);
    const [viewingPost, setViewingPost] = useState<Post | null>(null);
    const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);

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
    
    const themeClasses = THEME_CLASSES[currentUser.profileTheme || 'default'] || THEME_CLASSES.default;

    return (
        <div className={`w-full h-full flex flex-col ${themeClasses.bg}`}>
            {isEditing && <EditProfileScreen user={currentUser} onSave={handleSaveProfile} onClose={() => setIsEditing(false)} />}
            {isSettingsOpen && <SettingsScreen user={currentUser} onClose={() => setIsSettingsOpen(false)} onUpdateUser={onUpdateUser} theme={theme} setTheme={setTheme} />}
            {viewingFollowList && <FollowListScreen title={viewingFollowList === 'followers' ? 'Followers' : 'Following'} userIds={currentUser[viewingFollowList]} currentUser={currentUser} onClose={() => setViewingFollowList(null)} onViewProfile={onViewProfile} />}
            {viewingPost && <PostDetailView post={viewingPost} currentUser={currentUser} onClose={() => setViewingPost(null)} onPostDeleted={handlePostDeleted} onPostUpdated={handlePostUpdated} onOpenComments={() => {}} />}
            {isImageViewerOpen && <ImageViewer images={currentUser.profilePhotos} onClose={() => setIsImageViewerOpen(false)} />}
            
            <header className={`flex justify-between items-center p-4 ${themeClasses.border} border-b`}>
                <div className="w-8"></div>
                <div className={`flex items-center space-x-2`}>
                    <h1 className={`text-xl font-bold ${themeClasses.text}`}>{currentUser.name}</h1>
                    {currentUser.isPremium && <VerifiedIcon />}
                </div>
                <button onClick={() => setIsSettingsOpen(true)}>
                    <SettingsIcon className={`w-6 h-6 ${themeClasses.text}`} />
                </button>
            </header>
            
            <div className="flex-1 overflow-y-auto p-4">
                <div className="flex items-center">
                    <button onClick={() => setIsImageViewerOpen(true)}>
                        <img src={currentUser.profilePhotos[0]} alt={currentUser.name} className="w-24 h-24 rounded-full object-cover border-4 border-flame-orange" />
                    </button>
                    <div className="flex-1 ml-6 flex justify-around text-center">
                        <div>
                            <p className={`text-xl font-bold ${themeClasses.text}`}>{posts.length}</p>
                            <p className={`${themeClasses.subtext}`}>Posts</p>
                        </div>
                        <button onClick={() => setViewingFollowList('followers')}>
                            <p className={`text-xl font-bold ${themeClasses.text}`}>{currentUser.followers.length}</p>
                            <p className={`${themeClasses.subtext}`}>Followers</p>
                        </button>
                        <button onClick={() => setViewingFollowList('following')}>
                            <p className={`text-xl font-bold ${themeClasses.text}`}>{currentUser.following.length}</p>
                            <p className={`${themeClasses.subtext}`}>Following</p>
                        </button>
                    </div>
                </div>

                <div className="mt-4">
                    <p className={`font-semibold ${themeClasses.text}`}>{currentUser.name}</p>
                    <p className={`${themeClasses.text} whitespace-pre-wrap`}>{currentUser.bio}</p>
                </div>
                
                 <div className="my-4">
                    <LevelProgressBar xp={currentUser.xp} />
                </div>

                <button onClick={() => setIsEditing(true)} className={`w-full py-2 ${themeClasses.border} border rounded-lg font-semibold ${themeClasses.text}`}>
                    Edit Profile
                </button>
                
                <div className="grid grid-cols-3 gap-1 mt-4">
                    {posts.map(post => (
                        <button key={post.id} onClick={() => setViewingPost(post)} className="aspect-square">
                            <img src={post.mediaUrls[0]} alt="post" className="w-full h-full object-cover" />
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ProfileScreen;