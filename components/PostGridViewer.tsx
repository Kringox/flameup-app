
import React, { useEffect, useRef, useState } from 'react';
import { Post, User } from '../types.ts';
import PostCard from './PostCard.tsx';

interface PostGridViewerProps {
  posts: Post[];
  startIndex: number;
  currentUser: User;
  onClose: () => void;
  onOpenComments: (post: Post) => void;
  onViewProfile: (userId: string) => void;
  onUpdateUser: (user: User) => void;
}

const PostGridViewer: React.FC<PostGridViewerProps> = ({ 
    posts, 
    startIndex, 
    currentUser, 
    onClose, 
    onOpenComments, 
    onViewProfile, 
    onUpdateUser 
}) => {
  const [currentPosts, setCurrentPosts] = useState(posts);
  const postRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    // Scroll to the post that was clicked
    postRefs.current[startIndex]?.scrollIntoView();
  }, [startIndex]);

  const handlePostDeleted = (postId: string) => {
    setCurrentPosts(prevPosts => prevPosts.filter(p => p.id !== postId));
  };

  return (
    <div className="absolute inset-0 bg-white dark:bg-black z-[75] flex flex-col animate-fade-in">
      <header className="flex items-center p-4 border-b border-gray-200 dark:border-zinc-800 bg-white dark:bg-black sticky top-0 z-10">
        <button onClick={onClose} className="w-8 text-dark-gray dark:text-gray-200">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-center flex-1 text-dark-gray dark:text-gray-100">Explore</h1>
        <div className="w-8"></div>
      </header>
      
      <div className="flex-1 overflow-y-auto p-2 md:p-4">
        {currentPosts.map((post, index) => (
          <div key={post.id} ref={el => postRefs.current[index] = el}>
            <PostCard 
              post={post} 
              currentUser={currentUser} 
              onPostDeleted={handlePostDeleted}
              onOpenComments={onOpenComments} 
              onViewProfile={onViewProfile} 
              onUpdateUser={onUpdateUser} 
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default PostGridViewer;
