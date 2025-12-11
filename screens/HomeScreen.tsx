
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebaseConfig.ts';
// FIX: Add QuerySnapshot and DocumentData to imports to resolve typing issue with onSnapshot.
import { collection, query, orderBy, onSnapshot, getDocs, QuerySnapshot, DocumentData, where, limit } from 'firebase/firestore';
import { Post, User, Story } from '../types.ts';
import BellIcon from '../components/icons/BellIcon.tsx';
import SearchIcon from '../components/icons/SearchIcon.tsx';
import FlameIcon from '../components/icons/FlameIcon.tsx';
import SinglePostView from '../components/SinglePostView.tsx';
import FlameLoader from '../components/FlameLoader.tsx';
import PlusIcon from '../components/icons/PlusIcon.tsx';
import StoryViewer from '../components/StoryViewer.tsx';

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

const StoryRail: React.FC<{ currentUser: User, onCreateStory: () => void }> = ({ currentUser, onCreateStory }) => {
    const [stories, setStories] = useState<Story[]>([]);
    const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);

    useEffect(() => {
        if (!db) return;
        const q = query(collection(db, 'stories'), orderBy('timestamp', 'desc'), limit(10));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            // Safety map to prevent crashes if data is incomplete
            const fetchedStories = snapshot.docs.map(doc => {
                const data = doc.data();
                return { 
                    id: doc.id, 
                    ...data,
                    // Ensure user object exists to prevent crashes
                    user: data.user || { id: 'unknown', name: 'Unknown', profilePhoto: '' } 
                } as any;
            });
            setStories(fetchedStories);
        });
        return () => unsubscribe();
    }, []);

    // Group stories by User
    const userStoriesMap = new Map<string, Story[]>();
    stories.forEach(story => {
        const uid = story.user?.id;
        if (uid) {
            if (!userStoriesMap.has(uid)) userStoriesMap.set(uid, []);
            userStoriesMap.get(uid)?.push(story);
        }
    });

    return (
        <>
        {activeStoryIndex !== null && stories.length > 0 && (
            <StoryViewer 
                stories={stories} 
                currentUser={currentUser} 
                startIndex={activeStoryIndex} 
                onClose={() => setActiveStoryIndex(null)} 
                onStoryViewed={() => {}}
            />
        )}
        <div className="flex space-x-4 p-4 overflow-x-auto scrollbar-hide bg-black/20 backdrop-blur-md w-full">
            {/* My Story */}
            <div className="flex flex-col items-center space-y-1 cursor-pointer flex-shrink-0" onClick={onCreateStory}>
                <div className="w-16 h-16 rounded-full border-2 border-gray-500 p-0.5 relative">
                    <img src={currentUser.profilePhotos[0]} className="w-full h-full rounded-full object-cover opacity-80" />
                    <div className="absolute bottom-0 right-0 bg-flame-orange rounded-full p-1 border border-black">
                        <PlusIcon className="w-3 h-3 text-white" />
                    </div>
                </div>
                <span className="text-xs text-white">You</span>
            </div>

            {/* Other Stories */}
            {Array.from(userStoriesMap.entries()).map(([uid, userStories], idx) => {
                const firstStory = userStories[0];
                if (!firstStory?.user) return null;

                // Find index in flat list for viewer
                const flatIndex = stories.findIndex(s => s.id === firstStory.id);
                return (
                    <div key={uid} className="flex flex-col items-center space-y-1 cursor-pointer flex-shrink-0" onClick={() => setActiveStoryIndex(flatIndex)}>
                        <div className="w-16 h-16 rounded-full border-2 border-flame-orange p-0.5">
                            <img src={firstStory.user.profilePhoto || ''} className="w-full h-full rounded-full object-cover" />
                        </div>
                        <span className="text-xs text-white w-16 truncate text-center">{firstStory.user.name || 'User'}</span>
                    </div>
                )
            })}
        </div>
        </>
    );
};

const HomeScreen: React.FC<HomeScreenProps> = ({ currentUser, onOpenComments, onOpenNotifications, onViewProfile, onUpdateUser, onOpenSearch, onCreateStory, refreshTrigger }) => {
    const [posts, setPosts] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const containerRef = useRef<HTMLDivElement>(null);
    const [showStories, setShowStories] = useState(true);
    const lastScrollY = useRef(0);

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

    return (
        <div className="relative w-full h-full bg-black">
            {/* Floating Header */}
            <div className="absolute top-0 left-0 right-0 z-40 flex justify-between items-center px-4 py-4 bg-gradient-to-b from-black/80 to-transparent pointer-events-none transition-opacity duration-300">
                <button onClick={onOpenNotifications} className="text-white drop-shadow-md pointer-events-auto">
                    <BellIcon />
                </button>
                
                <h1 className="text-2xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-flame-orange to-flame-red drop-shadow-md pointer-events-auto tracking-wider">
                    FLAME
                </h1>

                <button onClick={onOpenSearch} className="text-white drop-shadow-md pointer-events-auto">
                    <SearchIcon className="w-6 h-6" />
                </button>
            </div>

            {/* Stories Rail - "TikTok Style" */}
            <div 
                className={`absolute top-[70px] left-0 right-0 z-30 transition-all duration-500 ease-in-out origin-top ${showStories ? 'opacity-100 scale-y-100 translate-y-0' : 'opacity-0 scale-y-0 -translate-y-10 pointer-events-none'}`}
            >
                <StoryRail currentUser={currentUser} onCreateStory={onCreateStory} />
            </div>

            {/* Vertical Scroll Snap Container */}
            <div 
                ref={containerRef}
                onScroll={handleScroll}
                className="w-full h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
            >
                {isLoading ? (
                    <div className="h-full w-full flex flex-col items-center justify-center text-white bg-black">
                        <FlameLoader />
                        <p className="mt-4 text-sm animate-pulse">Loading Feed...</p>
                    </div>
                ) : posts.length === 0 ? (
                    <div className="h-full w-full flex flex-col items-center justify-center text-gray-400">
                        <p>No posts yet.</p>
                        <button onClick={onCreateStory} className="mt-4 px-4 py-2 bg-flame-orange text-white rounded-full text-sm font-bold">
                            Create First Post
                        </button>
                    </div>
                ) : (
                    posts.map((post) => (
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
