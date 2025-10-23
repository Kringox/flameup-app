import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, query, getDocs, orderBy, where, Timestamp } from 'firebase/firestore';
import { Story, Post, User } from '../types';
import StoryViewer from '../components/StoryViewer';
import BellIcon from '../components/icons/BellIcon';
import LoadingScreen from '../components/LoadingScreen';

const PLACEHOLDER_AVATAR = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI1MCIgZmlsbD0iI2VlZSIvPjwvc3ZnPg==';

const formatTimestamp = (timestamp: any): string => {
    if (!timestamp || !timestamp.toDate) {
        return 'Just now';
    }
    const date = timestamp.toDate();
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
};

const StoryCircle: React.FC<{ story: Story; onClick: () => void, isOwnStory: boolean, hasUnviewed: boolean }> = ({ story, onClick, isOwnStory, hasUnviewed }) => {
  const ringClass = hasUnviewed ? 'bg-gradient-to-tr from-orange-400 to-red-500' : 'bg-gray-200';
  
  return (
    <button onClick={onClick} className="flex flex-col items-center space-y-1 flex-shrink-0">
      <div className={`relative w-16 h-16 rounded-full p-0.5 ${ringClass}`}>
        <div className="w-full h-full bg-white rounded-full p-0.5">
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
      <span className="text-xs text-gray-700 w-16 truncate text-center">{story.user.name}</span>
    </button>
  );
};

const PostCard: React.FC<{ post: Post }> = ({ post }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-4">
      <div className="flex items-center p-3">
        <img className="w-8 h-8 rounded-full object-cover" src={post.user.profilePhoto} alt={post.user.name} />
        <span className="ml-3 font-semibold text-sm">{post.user.name}</span>
        <button className="ml-auto text-gray-500">
           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" /></svg>
        </button>
      </div>
      <img className="w-full h-auto object-cover" src={post.mediaUrls[0]} alt="Post content" />
      <div className="p-3">
        <div className="flex space-x-4 mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 cursor-pointer hover:text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 cursor-pointer hover:text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 cursor-pointer hover:text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
        </div>
        <div className="font-semibold text-sm">{post.likes} likes</div>
        <p className="text-sm mt-1">
          <span className="font-semibold">{post.user.name}</span> {post.caption}
        </p>
        <div className="text-xs text-gray-500 mt-2 uppercase">{formatTimestamp(post.timestamp)}</div>
      </div>
    </div>
  );
};

interface HomeScreenProps {
    currentUser: User;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ currentUser }) => {
  const [stories, setStories] = useState<Story[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewingStoryIndex, setViewingStoryIndex] = useState<number | null>(null);
  const [hasNotifications, setHasNotifications] = useState(true);

  useEffect(() => {
      const fetchData = async () => {
          if (!db) return;
          setIsLoading(true);
          try {
              // Fetch stories from the last 24 hours
              const twentyFourHoursAgo = Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);
              const storiesQuery = query(collection(db, 'stories'), where('timestamp', '>=', twentyFourHoursAgo), orderBy('timestamp', 'desc'));
              const storySnapshot = await getDocs(storiesQuery);
              const storyList = storySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Story));
              setStories(storyList);

              // Fetch posts
              const postsQuery = query(collection(db, 'posts'), orderBy('timestamp', 'desc'));
              const postSnapshot = await getDocs(postsQuery);
              const postList = postSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
              setPosts(postList);

          } catch (error) {
              console.error("Error fetching data:", error);
          } finally {
              setIsLoading(false);
          }
      };

      fetchData();
  }, []);
  

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
  
  const ownStories = stories.filter(s => s.user.id === currentUser.id);
  const otherStories = stories.filter(s => s.user.id !== currentUser.id);
  const hasUnviewedOwnStory = ownStories.some(s => !s.viewed);

  // Create the story list for the UI
  const storyListForUI = [
    // "Your Story" circle
    {
        id: 'currentUserStory',
        user: { id: currentUser.id, name: 'Your Story', profilePhoto: currentUser.profilePhotos?.[0] || PLACEHOLDER_AVATAR },
        mediaUrl: ownStories.length > 0 ? ownStories[0].mediaUrl : '',
        viewed: !hasUnviewedOwnStory,
        timestamp: null,
    },
    ...otherStories
  ];

  if (isLoading) {
      return <LoadingScreen />;
  }

  return (
    <div className="w-full">
        {viewingStoryIndex !== null && (
            <StoryViewer 
                stories={viewingStoryIndex === 0 ? ownStories : otherStories}
                startIndex={0} // Always start from the first story of the selected user
                onClose={closeStoryViewer}
                onStoryViewed={handleStoryViewed}
            />
        )}
        <header className="relative flex justify-center items-center p-4 border-b border-gray-200 bg-white sticky top-0 z-10">
            <button className="absolute left-4">
                <BellIcon hasNotification={hasNotifications} />
            </button>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-flame-orange to-flame-red">FlameUp</h1>
            <button className="absolute right-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            </button>
        </header>

      {/* Stories */}
      <div className="px-4 py-3 border-b border-gray-200 bg-white">
        <div className="flex space-x-4 overflow-x-auto pb-2">
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

      {/* Posts */}
      <div className="p-2 md:p-4">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
};

export default HomeScreen;