
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebaseConfig.ts';
// FIX: Add QuerySnapshot and DocumentData to imports to resolve typing issue with onSnapshot.
import { collection, query, orderBy, onSnapshot, getDocs, QuerySnapshot, DocumentData, where, limit } from 'firebase/firestore';
import { Post, User, Story } from '../types.ts';
import BellIcon from '../components/icons/BellIcon.tsx';
import SearchIcon from '../components/icons/SearchIcon.tsx';
import SinglePostView from '../components/SinglePostView.tsx';
import FlameLoader from '../components/FlameLoader.tsx';
import PlusIcon from '../components/icons/PlusIcon.tsx';
import StoryViewer from '../components/StoryViewer.tsx';
import FlameIcon from '../components/icons/FlameIcon.tsx';

interface HomeScreenProps {
    currentUser: User;
    onOpenComments: (post: Post) => void;
    onOpenNotifications: () => void;
    onViewProfile: (userId: string) => void;
    onUpdateUser: (user: User) => void;
    onOpenSearch: () => void;
    onCreateStory: () => void;
    refreshTrigger?: number;
}

const StoryRail: React.FC<{ currentUser: User, onCreateStory: () => void, onOpenStory: (index: number, stories: Story[]) => void }> = ({ currentUser, onCreateStory, onOpenStory }) => {
    const [stories, setStories] = useState<Story[]>([]);

    useEffect(() => {
        if (!db) return;
        const q = query(collection(db, 'stories'), orderBy('timestamp', 'desc'), limit(20));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedStories = snapshot.docs.map(doc => {
                const data = doc.data();
                return { 
                    id: doc.id, 
                    ...data,
                    user: data.user || { id: 'unknown', name: 'Unknown', profilePhoto: '' } 
                } as any;
            });
            setStories(fetchedStories);
        });
        return () => unsubscribe();
    }, []);

    // Group stories by User to show one bubble per user
    const userStoriesMap = new Map<string, Story[]>();
    stories.forEach(story => {
        const uid = story.user?.id;
        if (uid) {
            if (!userStoriesMap.has(uid)) userStoriesMap.set(uid, []);
            userStoriesMap.get(uid)?.push(story);
        }
    });

    return (
        <div className="flex space-x-4 px-4 py-2 overflow-x-auto scrollbar-hide w-full">
            {/* My Story */}
            <div className="flex flex-col items-center space-y-1.5 cursor-pointer flex-shrink-0 transition-transform active:scale-95 duration-200" onClick={onCreateStory}>
                <div className="w-[68px] h-[68px] rounded-full border-2 border-gray-500 p-0.5 relative">
                    <img src={currentUser.profilePhotos[0]} className="w-full h-full rounded-full object-cover opacity-80" />
                    <div className="absolute bottom-0 right-0 bg-flame-orange rounded-full p-1.5 border-2 border-black">
                        <PlusIcon className="w-3 h-3 text-white" strokeWidth={4} />
                    </div>
                </div>
                <span className="text-xs text-white font-medium drop-shadow-md">You</span>
            </div>

            {/* Other Stories */}
            {Array.from(userStoriesMap.entries()).map(([uid, userStories], idx) => {
                const firstStory = userStories[0];
                if (!firstStory?.user) return null;

                // Find index in the flat 'stories' array to start viewer correctly
                const flatIndex = stories.findIndex(s => s.id === firstStory.id);
                
                return (
                    <div key={uid} className="flex flex-col items-center space-y-1.5 cursor-pointer flex-shrink-0 transition-transform active:scale-95 duration-200" onClick={() => onOpenStory(flatIndex, stories)}>
                        <div className="w-[68px] h-[68px] rounded-full border-2 border-flame-orange p-0.5">
                            <img src={firstStory.user.profilePhoto || ''} className="w-full h-full rounded-full object-cover" />
                        </div>
                        <span className="text-xs text-white w-16 truncate text-center font-medium drop-shadow-md">{firstStory.user.name || 'User'}</span>
                    </div>
                )
            })}
        </div>
    );
};

const HomeScreen: React.FC<HomeScreenProps> = ({ currentUser, onOpenComments, onOpenNotifications, onViewProfile, onUpdateUser, onOpenSearch, onCreateStory, refreshTrigger }) => {
    const [posts, setPosts] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const containerRef = useRef<HTMLDivElement>(null);
    const [showStories, setShowStories] = useState(true);
    const lastScrollY = useRef(0);
    
    // Story Viewer State lifted to HomeScreen to avoid clipping
    const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
    const [storyList, setStoryList] = useState<Story[]>([]);

    // Feed Toggle State
    const [feedType, setFeedType] = useState<'forYou' | 'flame'>('forYou');

    // --- REALTIME FEED LISTENER ---
    useEffect(() => {
        if (!db) return;
        setIsLoading(true);
        
        // Listen to posts in real-time
        const postsQuery = query(collection(db, 'posts'), orderBy('timestamp', 'desc'));
        
        const unsubscribe = onSnapshot(postsQuery, (snapshot: QuerySnapshot<DocumentData>) => {
            const postList = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    user: data.user || { id: data.userId, name: 'User', profilePhoto: '' }
                } as Post;
            });
            setPosts(postList);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching feed:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Handle manual Refresh (tap on Home icon)
    useEffect(() => {
        if (refreshTrigger && refreshTrigger > 0 && containerRef.current) {
            containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
            setShowStories(true);
        }
    }, [refreshTrigger]);

    // Feed switch effect: Reset is implicit by re-mounting the scroll container via key={feedType}
    useEffect(() => {
        // Reset stories visibility when switching tabs
        setShowStories(true);
    }, [feedType]);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const currentScrollY = e.currentTarget.scrollTop;
        
        // Only show stories if perfectly at top or bouncing (negative scroll on iOS)
        if (currentScrollY <= 10) {
            setShowStories(true);
        } 
        // Hide stories as soon as we scroll down past a small threshold
        else if (currentScrollY > 50 && currentScrollY > lastScrollY.current) {
            setShowStories(false);
        }
        
        lastScrollY.current = currentScrollY;
    };

    // Filter Posts based on Feed Type
    const displayedPosts = posts.filter(post => {
        if (feedType === 'flame') {
            return post.isPaid === true;
        }
        return true; // "For You" shows all posts (could be algorithmic later)
    });

    return (
        <div className="relative w-full h-full bg-black">
            {/* Story Viewer Overlay - Rendered at Root of Home to prevent distortion */}
            {activeStoryIndex !== null && storyList.length > 0 && (
                <div className="fixed inset-0 z-[200]">
                    <StoryViewer 
                        stories={storyList} 
                        currentUser={currentUser} 
                        startIndex={activeStoryIndex} 
                        onClose={() => setActiveStoryIndex(null)} 
                        onStoryViewed={() => {}}
                    />
                </div>
            )}

            {/* Floating Header */}
            <div className="absolute top-0 left-0 right-0 z-40 flex flex-col pointer-events-none">
                {/* Extended Gradient for readability - Smooth transition */}
                <div className="absolute inset-0 h-[180px] bg-gradient-to-b from-black via-black/70 to-transparent pointer-events-none transition-opacity duration-500" />

                {/* Branding Row - More padding top */}
                <div className="relative z-10 flex justify-between items-center px-5 pt-8 pb-1 pointer-events-auto">
                    <button onClick={onOpenNotifications} className="text-white drop-shadow-lg p-2 rounded-full hover:bg-white/10 transition-all active:scale-90">
                        <BellIcon className="w-7 h-7" />
                    </button>
                    
                    <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-flame-orange to-flame-red drop-shadow-lg tracking-wide font-sans italic select-none">
                        FlameUp
                    </h1>

                    <button onClick={onOpenSearch} className="text-white drop-shadow-lg p-2 rounded-full hover:bg-white/10 transition-all active:scale-90">
                        <SearchIcon className="w-7 h-7" />
                    </button>
                </div>

                {/* Tabs Row - Spaced out from branding */}
                <div className="relative z-10 flex justify-center items-center space-x-10 pt-3 pb-2 pointer-events-auto select-none">
                    <button
                        onClick={() => setFeedType('forYou')}
                        className={`text-base font-bold transition-all duration-300 relative px-2 ${feedType === 'forYou' ? 'text-white scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]' : 'text-white/50 hover:text-white/80'}`}
                    >
                        For You
                        {feedType === 'forYou' && (
                            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-6 h-1 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)] animate-fade-in-fast"></div>
                        )}
                    </button>
                    <button
                        onClick={() => setFeedType('flame')}
                        className={`text-base font-bold transition-all duration-300 flex items-center relative px-2 ${feedType === 'flame' ? 'text-flame-orange scale-110 drop-shadow-[0_0_8px_rgba(255,107,53,0.5)]' : 'text-white/50 hover:text-white/80'}`}
                    >
                        <FlameIcon className="w-4 h-4 mr-1 transition-colors duration-300" fill={feedType === 'flame' ? "currentColor" : "none"} />
                        Flame
                        {feedType === 'flame' && (
                            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-6 h-1 bg-flame-orange rounded-full shadow-[0_0_10px_rgba(255,107,53,0.8)] animate-fade-in-fast"></div>
                        )}
                    </button>
                </div>
            </div>

            {/* Stories Rail - "TikTok Style" */}
            <div 
                className={`absolute top-[135px] left-0 right-0 z-30 transition-all duration-700 cubic-bezier(0.33, 1, 0.68, 1) origin-top ${showStories ? 'opacity-100 scale-y-100 translate-y-0' : 'opacity-0 scale-y-0 -translate-y-10 pointer-events-none'}`}
            >
                <StoryRail 
                    currentUser={currentUser} 
                    onCreateStory={onCreateStory} 
                    onOpenStory={(index, stories) => {
                        setStoryList(stories);
                        setActiveStoryIndex(index);
                    }}
                />
            </div>

            {/* Vertical Scroll Snap Container */}
            <div 
                key={feedType} // Key here forces remount on tab change -> resets scroll & animates
                ref={containerRef}
                onScroll={handleScroll}
                className="w-full h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide scroll-smooth animate-fade-in"
            >
                {isLoading ? (
                    <div className="h-full w-full flex flex-col items-center justify-center text-white bg-black animate-pulse">
                        <FlameLoader />
                        <p className="mt-4 text-sm font-medium tracking-wide opacity-70">Loading Feed...</p>
                    </div>
                ) : displayedPosts.length === 0 ? (
                    <div className="h-full w-full flex flex-col items-center justify-center text-gray-400 animate-fade-in">
                        {feedType === 'flame' ? (
                            <>
                                <FlameIcon isGradient className="w-20 h-20 mb-6 opacity-50" />
                                <p className="text-lg font-semibold">No paid posts yet.</p>
                                <p className="text-sm mt-2 opacity-60">Be the first to post exclusive content!</p>
                            </>
                        ) : (
                            <>
                                <p className="text-lg font-semibold">No posts yet.</p>
                                <button onClick={onCreateStory} className="mt-6 px-6 py-3 bg-gradient-to-r from-flame-orange to-flame-red text-white rounded-full text-sm font-bold shadow-lg hover:scale-105 transition-transform">
                                    Create First Post
                                </button>
                            </>
                        )}
                    </div>
                ) : (
                    // Removing the intermediate div wrapper that broke the height chain.
                    // React Fragment or direct array map return is fine here.
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
