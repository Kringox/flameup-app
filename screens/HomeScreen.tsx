
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '../firebaseConfig.ts';
import { collection, query, getDocs, orderBy, where, Timestamp, onSnapshot } from 'firebase/firestore';
import { Story, Post, User } from '../types.ts';
import StoryViewer from '../components/StoryViewer.tsx';
import BellIcon from '../components/icons/BellIcon.tsx';
import LoadingScreen from '../components/LoadingScreen.tsx';
import PostCard from '../components/PostCard.tsx';
import { promiseWithTimeout } from '../utils/promiseUtils.ts';
import WifiOffIcon from '../components/icons/WifiOffIcon.tsx';
import SearchIcon from '../components/icons/SearchIcon.tsx';
import FlameIcon from '../components/icons/FlameIcon.tsx';


const PLACEHOLDER_AVATAR = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI1MCIgZmlsbD0iI2VlZSIvPjwvc3ZnPg==';

const StoryCircle: React.FC<{ story: Story; onClick: () => void, isOwnStory: boolean, hasUnviewed: boolean }> = ({ story, onClick, isOwnStory, hasUnviewed }) => {
  const ringClass = hasUnviewed ? 'bg-gradient-to-tr from-orange-400 to-red-500' : 'bg-gray-200 dark:bg-gray-700';
  
  return (
    <button onClick={onClick} className="flex flex-col items-center space-y-1 flex-shrink-0">
      <div className={`relative w-16 h-16 rounded-full p-0.5 ${ringClass}`}>
        <div className="w-full h-full bg-white dark:bg-black rounded-full p-0.5">
          <img
            className="w-full h-full rounded-full object-cover"
            src={story.user.profilePhoto}
            alt={story.user.name}
          />
        </div>
        {isOwnStory && !hasUnviewed && (
          <div className="absolute bottom-0 right-0 w-5 h-5 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
             </svg>
          </div>
        )}
      </div>
      <span className="text-xs text-gray-700 dark:text-gray-300 w-16 truncate text-center">{story.user.name}</span>
    </button>
  );
};

interface HomeScreenProps {
    currentUser: User;
    onOpenComments: (post: Post) => void;
    onOpenNotifications: () => void;
    onViewProfile: (userId: string) => void;
    onUpdateUser: (user: User) => void;
    onOpenSearch: () => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ currentUser, onOpenComments, onOpenNotifications, onViewProfile, onUpdateUser, onOpenSearch }) => {
  const [stories, setStories] = useState<Story[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewingStoryIndex, setViewingStoryIndex] = useState<number | null>(null);
  const [hasNotifications, setHasNotifications] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    if (!db || !currentUser) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      const twentyFourHoursAgo = Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);
      const storiesQuery = query(collection(db, 'stories'), where('timestamp', '>=', twentyFourHoursAgo), orderBy('timestamp', 'desc'));
      const postsQuery = query(collection(db, 'posts'), orderBy('timestamp', 'desc'));

      const fetchDataPromise = Promise.all([getDocs(storiesQuery), getDocs(postsQuery)]);

      const [storySnapshot, postSnapshot] = await promiseWithTimeout(
        fetchDataPromise,
        8000,
        new Error("Loading feed took too long.")
      );

      const storyList = storySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          mediaUrl: data.mediaUrl,
          viewed: data.viewed,
          timestamp: data.timestamp,
          user: {
            id: data.userId,
            name: data.userName,
            profilePhoto: data.userProfilePhoto,
          },
        } as Story;
      });
      setStories(storyList);

      const postList = postSnapshot.docs.map(doc => {
        const data = doc.data();
        const postUser = data.user || {
          id: data.userId,
          name: data.userName,
          profilePhoto: data.userProfilePhoto,
          isPremium: data.isPremium || false,
        };
        return {
          id: doc.id,
          userId: data.userId,
          mediaUrls: data.mediaUrls,
          caption: data.caption,
          likedBy: data.likedBy || [],
          commentCount: data.commentCount || 0,
          timestamp: data.timestamp,
          user: postUser,
        } as Post;
      });
      setPosts(postList);
    } catch (err: any) {
      console.error("Error fetching home screen data:", err);
      if (err.message.includes("too long")) {
        setError("The feed took too long to load. Please check your connection and try again.");
      } else {
        setError("Could not load the feed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchData(); // Initial data fetch

    // Notifications can remain real-time as it's a lightweight and critical feature
    if (!db || !currentUser) return;
    const notificationsQuery = query(collection(db, 'users', currentUser.id, 'notifications'), where('read', '==', false));
    const unsubscribeNotifications = onSnapshot(notificationsQuery, (snapshot) => {
      setHasNotifications(!snapshot.empty);
    });

    return () => {
      unsubscribeNotifications();
    };
  }, [fetchData, currentUser]);
  
  const handlePostDeleted = (postId: string) => {
    setPosts(currentPosts => currentPosts.filter(p => p.id !== postId));
  };

  const openStoryViewer = (index: number) => {
    setViewingStoryIndex(index);
  };

  const closeStoryViewer = () => {
    setViewingStoryIndex(null);
  };

  const handleStoryViewed = (storyId: string) => {
    setStories(prevStories =>
      prevStories.map(s => (s.id === storyId ? { ...s, viewed: true } : s))
    );
  };
  
  const handleLogoClick = () => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isLoading) {
      return <LoadingScreen />;
  }

  const ownStories = stories.filter(s => s.user.id === currentUser.id);
  const otherStories = stories.filter(s => s.user.id !== currentUser.id);
  const hasUnviewedOwnStory = ownStories.some(s => !s.viewed);

  const storyListForUI: Story[] = [
    {
        id: 'currentUserStory',
        user: { id: currentUser.id, name: 'Your Story', profilePhoto: currentUser.profilePhotos?.[0] || PLACEHOLDER_AVATAR },
        mediaUrl: ownStories.length > 0 ? ownStories[0].mediaUrl : '',
        viewed: !hasUnviewedOwnStory,
        timestamp: null,
    },
    ...otherStories
  ];

  const renderHeader = () => (
     <header className="relative flex justify-between items-center px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-black sticky top-0 z-10">
        <button onClick={onOpenNotifications} className="w-8 flex justify-start">
            <BellIcon hasNotification={hasNotifications} />
        </button>
        {/* Central Flame Logo */}
        <button onClick={handleLogoClick} className="flex justify-center items-center transform active:scale-95 transition-transform">
            <FlameIcon isGradient className="w-8 h-8" />
        </button>
        <button onClick={onOpenSearch} className="w-8 flex justify-end">
            <SearchIcon className="h-6 w-6 text-gray-600 dark:text-gray-300" />
        </button>
    </header>
  );

  if (error) {
    return (
        <div className="w-full h-full flex flex-col">
            {renderHeader()}
            <div className="flex-1 flex flex-col justify-center items-center text-center p-4">
                <WifiOffIcon className="w-16 h-16 text-gray-400 mb-4" />
                <h3 className="font-bold text-lg dark:text-gray-200">Oops! Something went wrong.</h3>
                <p className="text-gray-600 dark:text-gray-400">{error}</p>
                <button onClick={fetchData} className="mt-4 px-4 py-2 bg-flame-orange text-white rounded-lg">Try Again</button>
            </div>
        </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col" ref={scrollRef}>
        {viewingStoryIndex !== null && (
            <StoryViewer 
                stories={viewingStoryIndex === 0 ? ownStories : otherStories.filter((_, i) => i >= viewingStoryIndex - 1)}
                currentUser={currentUser}
                startIndex={0}
                onClose={closeStoryViewer}
                onStoryViewed={handleStoryViewed}
            />
        )}
        {renderHeader()}

      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
        <div className="flex space-x-4 overflow-x-auto pb-2 scrollbar-hide">
          {storyListForUI.map((story, index) => (
             <StoryCircle 
                key={story.id} 
                story={story} 
                onClick={() => openStoryViewer(index)} 
                isOwnStory={index === 0}
                hasUnviewed={index === 0 ? hasUnviewedOwnStory : !story.viewed}
             />
          ))}
        </div>
      </div>

      <div className="p-2 md:p-4 pb-20">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} currentUser={currentUser} onPostDeleted={handlePostDeleted} onOpenComments={onOpenComments} onViewProfile={onViewProfile} onUpdateUser={onUpdateUser} />
        ))}
      </div>
    </div>
  );
};

export default HomeScreen;
