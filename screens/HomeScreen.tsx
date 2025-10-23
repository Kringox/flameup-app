import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, query, getDocs, orderBy, where, Timestamp, onSnapshot } from 'firebase/firestore';
import { Story, Post, User } from '../types';
import StoryViewer from '../components/StoryViewer';
import BellIcon from '../components/icons/BellIcon';
import LoadingScreen from '../components/LoadingScreen';
import PostCard from '../components/PostCard';

const PLACEHOLDER_AVATAR = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI1MCIgZmlsbD0iI2VlZSIvPjwvc3ZnPg==';

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
      if (!db) {
          setIsLoading(false);
          return;
      }
      setIsLoading(true);

      // Fetch stories once
      const twentyFourHoursAgo = Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);
      const storiesQuery = query(collection(db, 'stories'), where('timestamp', '>=', twentyFourHoursAgo), orderBy('timestamp', 'desc'));
      getDocs(storiesQuery).then(storySnapshot => {
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
      }).catch(error => console.error("Error fetching stories:", error));

      // Fetch posts in real-time
      const postsQuery = query(collection(db, 'posts'), orderBy('timestamp', 'desc'));
      const unsubscribePosts = onSnapshot(postsQuery, (postSnapshot) => {
          const postList = postSnapshot.docs.map(doc => {
              const data = doc.data();
              return {
                  id: doc.id,
                  userId: data.userId,
                  mediaUrls: data.mediaUrls,
                  caption: data.caption,
                  likedBy: data.likedBy || [],
                  commentCount: data.commentCount || 0,
                  timestamp: data.timestamp,
                  user: {
                      id: data.userId,
                      name: data.userName,
                      profilePhoto: data.userProfilePhoto,
                  },
              } as Post;
          });
          setPosts(postList);
          setIsLoading(false);
      }, (error) => {
          console.error("Error fetching posts:", error);
          setIsLoading(false);
      });

      // Cleanup subscription on unmount
      return () => {
          unsubscribePosts();
      };
  }, []);
  
  const handlePostDeleted = (postId: string) => {
    // Optimistic update: remove the post from local state immediately.
    // The real-time listener will eventually sync, but this makes the UI feel faster.
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
          <PostCard key={post.id} post={post} currentUser={currentUser} onPostDeleted={handlePostDeleted} />
        ))}
      </div>
    </div>
  );
};

export default HomeScreen;