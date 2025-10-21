import React, { useState } from 'react';
import { MOCK_STORIES, MOCK_POSTS } from '../constants';
import { Story, Post } from '../types';
import StoryViewer from '../components/StoryViewer';

const StoryCircle: React.FC<{ story: Story; onClick: () => void }> = ({ story, onClick }) => {
  const isOwnStory = story.user.name === 'Your Story';
  const hasContent = story.mediaUrl !== '';
  const ringClass = !story.viewed && hasContent ? 'bg-gradient-to-tr from-orange-400 to-red-500' : 'bg-gray-200';
  
  return (
    <button onClick={onClick} disabled={!hasContent && !isOwnStory} className="flex flex-col items-center space-y-1 flex-shrink-0 disabled:opacity-70">
      <div className={`relative w-16 h-16 rounded-full p-0.5 ${ringClass}`}>
        <div className="w-full h-full bg-white rounded-full p-0.5">
          <img
            className="w-full h-full rounded-full object-cover"
            src={story.user.profilePhoto}
            alt={story.user.name}
          />
        </div>
        {isOwnStory && (
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
        <div className="text-xs text-gray-500 mt-2">{post.timestamp}</div>
      </div>
    </div>
  );
};


const HomeScreen: React.FC = () => {
  const [stories, setStories] = useState<Story[]>(MOCK_STORIES);
  const [viewingStoryIndex, setViewingStoryIndex] = useState<number | null>(null);

  const openStoryViewer = (index: number) => {
    // We only want to view stories that have content
    const storiesWithContent = stories.map((s, i) => ({...s, originalIndex: i}))
                                      .filter(s => s.mediaUrl !== '');
    const clickedStory = stories[index];
    if (clickedStory.mediaUrl === '') return; // Don't open empty stories

    const viewerStartIndex = storiesWithContent.findIndex(s => s.id === clickedStory.id);
    setViewingStoryIndex(viewerStartIndex);
  };

  const closeStoryViewer = () => {
    setViewingStoryIndex(null);
  };

  const handleStoryViewed = (storyId: string) => {
    setStories(prevStories =>
      prevStories.map(s => (s.id === storyId ? { ...s, viewed: true } : s))
    );
  };

  const storiesWithContent = stories.filter(s => s.mediaUrl !== '');

  return (
    <div className="w-full">
        {viewingStoryIndex !== null && (
            <StoryViewer 
                stories={storiesWithContent}
                startIndex={viewingStoryIndex}
                onClose={closeStoryViewer}
                onStoryViewed={handleStoryViewed}
            />
        )}
        <header className="flex justify-between items-center p-4 border-b border-gray-200 bg-white sticky top-0 z-10">
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-flame-orange to-flame-red">FlameUp</h1>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </header>

      {/* Stories */}
      <div className="px-4 py-3 border-b border-gray-200 bg-white">
        <div className="flex space-x-4 overflow-x-auto pb-2">
          {stories.map((story, index) => (
            <StoryCircle key={story.id} story={story} onClick={() => openStoryViewer(index)} />
          ))}
        </div>
      </div>

      {/* Posts */}
      <div className="p-2 md:p-4">
        {MOCK_POSTS.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
};

export default HomeScreen;