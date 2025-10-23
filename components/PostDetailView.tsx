import React from 'react';
import { Post, User } from '../types';
import PostCard from './PostCard';

interface PostDetailViewProps {
  post: Post;
  currentUser: User;
  onClose: () => void;
  onPostDeleted: (postId: string) => void;
}

const PostDetailView: React.FC<PostDetailViewProps> = ({ post, currentUser, onClose, onPostDeleted }) => {
  // Close the modal if the backdrop is clicked, but not the content inside
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/80 flex justify-center items-center z-50 animate-fade-in p-4"
      onClick={handleBackdropClick}
    >
        <style>{`
            @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
            .animate-fade-in { animation: fade-in 0.2s ease-out; }
        `}</style>

        {/* This inner container prevents the PostCard from being clicked to close */}
        <div className="w-full max-w-md my-4" onClick={(e) => e.stopPropagation()}>
            <PostCard post={post} currentUser={currentUser} onPostDeleted={onPostDeleted} />
        </div>

        <button onClick={onClose} className="absolute top-4 right-4 text-white z-[51]">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
        </button>
    </div>
  );
};

export default PostDetailView;
