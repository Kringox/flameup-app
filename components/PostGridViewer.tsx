
import React, { useEffect, useRef } from 'react';
import { Post, User } from '../types.ts';
import SinglePostView from './SinglePostView.tsx';

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
  const containerRef = useRef<HTMLDivElement>(null);
  const postRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    // Scroll to the selected post immediately on mount
    if (postRefs.current[startIndex]) {
        postRefs.current[startIndex]?.scrollIntoView({ behavior: 'auto' });
    }
  }, [startIndex]);

  return (
    <div className="fixed inset-0 bg-black z-[75] flex justify-center animate-fade-in">
      
      {/* Container constrained to mobile width */}
      <div className="w-full max-w-md h-full relative bg-black shadow-2xl flex flex-col">
          <header className="absolute top-0 left-0 right-0 p-4 z-50 bg-gradient-to-b from-black/80 to-transparent flex justify-between items-center pointer-events-none">
            <button onClick={onClose} className="text-white drop-shadow-md pointer-events-auto">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-lg font-bold text-white drop-shadow-md">Posts</h1>
            <div className="w-8"></div>
          </header>
          
          {/* Full screen vertical scroll snap inside the constrained container */}
          <div 
            ref={containerRef}
            className="w-full h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
          >
            {posts.map((post, index) => (
              <div 
                key={post.id} 
                // FIX: Ensure ref callback does not return a value.
                ref={el => { postRefs.current[index] = el; }}
                className="w-full h-full snap-start"
              >
                <SinglePostView 
                  post={post} 
                  currentUser={currentUser} 
                  isActive={true}
                  onOpenComments={onOpenComments}
                  onViewProfile={onViewProfile} 
                  onUpdateUser={onUpdateUser} 
                />
              </div>
            ))}
          </div>
      </div>
    </div>
  );
};

export default PostGridViewer;
