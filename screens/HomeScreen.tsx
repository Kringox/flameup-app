import React, { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../firebaseConfig.ts';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { Post, User } from '../types.ts';
import BellIcon from '../components/icons/BellIcon.tsx';
import SearchIcon from '../components/icons/SearchIcon.tsx';
import FlameIcon from '../components/icons/FlameIcon.tsx';
import SinglePostView from '../components/SinglePostView.tsx';

interface HomeScreenProps {
    currentUser: User;
    onOpenComments: (post: Post) => void;
    onOpenNotifications: () => void;
    onViewProfile: (userId: string) => void;
    onUpdateUser: (user: User) => void;
    onOpenSearch: () => void;
    onCreateStory: () => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ currentUser, onOpenComments, onOpenNotifications, onViewProfile, onUpdateUser, onOpenSearch }) => {
    const [posts, setPosts] = useState<Post[]>([]);
    const [activeTab, setActiveTab] = useState<'foryou' | 'flame'>('foryou');
    const [isLoading, setIsLoading] = useState(true);
    const containerRef = useRef<HTMLDivElement>(null);

    const fetchData = useCallback(async () => {
        if (!db) return;
        try {
            const postsQuery = query(collection(db, 'posts'), orderBy('timestamp', 'desc'));
            const postSnapshot = await getDocs(postsQuery);
            
            const postList = postSnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    user: data.user || { id: data.userId, name: 'User', profilePhoto: '' }
                } as Post;
            });
            setPosts(postList);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const displayedPosts = posts.filter(p => {
        if (activeTab === 'flame') return p.isPaid;
        return true; 
    });

    return (
        <div className="relative w-full h-full bg-black">
            {/* Floating Header */}
            <div className="absolute top-0 left-0 right-0 z-40 flex justify-between items-center px-4 py-4 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
                <button onClick={onOpenNotifications} className="text-white drop-shadow-md pointer-events-auto">
                    <BellIcon />
                </button>
                
                <div className="flex gap-4 text-base font-bold drop-shadow-md pointer-events-auto">
                    <button 
                        onClick={() => setActiveTab('foryou')}
                        className={`transition-opacity ${activeTab === 'foryou' ? 'text-white opacity-100' : 'text-gray-300 opacity-60'}`}
                    >
                        For You
                    </button>
                    <div className="w-[1px] h-4 bg-white/40 self-center"></div>
                    <button 
                        onClick={() => setActiveTab('flame')}
                        className={`flex items-center gap-1 transition-opacity ${activeTab === 'flame' ? 'text-flame-orange opacity-100' : 'text-gray-300 opacity-60'}`}
                    >
                        Flame <FlameIcon className="w-3 h-3" />
                    </button>
                </div>

                <button onClick={onOpenSearch} className="text-white drop-shadow-md pointer-events-auto">
                    <SearchIcon className="w-6 h-6" />
                </button>
            </div>

            {/* Vertical Scroll Snap Container */}
            <div 
                ref={containerRef}
                className="w-full h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
            >
                {isLoading ? (
                    <div className="h-full w-full flex items-center justify-center text-white">Loading...</div>
                ) : displayedPosts.length === 0 ? (
                    <div className="h-full w-full flex flex-col items-center justify-center text-gray-400">
                        <p>No posts yet.</p>
                        {activeTab === 'flame' && <p className="text-xs mt-2">Check 'For You' for regular posts.</p>}
                    </div>
                ) : (
                    displayedPosts.map((post) => (
                        <div key={post.id} className="w-full h-full snap-start">
                            <SinglePostView 
                                post={post} 
                                currentUser={currentUser} 
                                isActive={true} 
                                onOpenComments={onOpenComments}
                                onViewProfile={onViewProfile}
                                onUpdateUser={onUpdateUser}
                            />
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default HomeScreen;