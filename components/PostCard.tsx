import React, { useState, useEffect } from 'react';
import { Post, User } from '../types';
import { db } from '../firebaseConfig';
import { doc, updateDoc, deleteDoc, arrayUnion, arrayRemove } from 'firebase/firestore';

// Icon Imports
import HeartIcon from './icons/HeartIcon';
import CommentIcon from './icons/CommentIcon';
import SendIcon from './icons/SendIcon';
import MoreHorizontalIcon from './icons/MoreHorizontalIcon';

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

interface PostCardProps {
  post: Post;
  currentUser: User;
  onPostDeleted: (postId: string) => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, currentUser, onPostDeleted }) => {
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [showOptions, setShowOptions] = useState(false);

  useEffect(() => {
    setIsLiked(post.likedBy.includes(currentUser.id));
    setLikeCount(post.likedBy.length);
  }, [post.likedBy, currentUser.id]);

  const handleLike = async () => {
    if (!db) return;
    const postRef = doc(db, 'posts', post.id);
    
    // Optimistic UI update
    const newLikedState = !isLiked;
    const newLikeCount = newLikedState ? likeCount + 1 : likeCount - 1;
    setIsLiked(newLikedState);
    setLikeCount(newLikeCount);

    try {
      await updateDoc(postRef, {
        likedBy: newLikedState ? arrayUnion(currentUser.id) : arrayRemove(currentUser.id)
      });
    } catch (error) {
      console.error("Error updating like:", error);
      // Revert UI on failure
      setIsLiked(!newLikedState);
      setLikeCount(likeCount);
      alert("Could not update like. Please try again.");
    }
  };

  const handleDelete = async () => {
    if (!db) return;
    if (window.confirm("Are you sure you want to delete this post?")) {
        try {
            await deleteDoc(doc(db, 'posts', post.id));
            onPostDeleted(post.id);
        } catch (error) {
            console.error("Error deleting post:", error);
            alert("Could not delete post. Please try again.");
        }
    }
    setShowOptions(false);
  };
  
  const isOwnPost = post.userId === currentUser.id;

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-4">
      <div className="flex items-center p-3">
        <img className="w-8 h-8 rounded-full object-cover" src={post.user.profilePhoto} alt={post.user.name} />
        <span className="ml-3 font-semibold text-sm">{post.user.name}</span>
        {isOwnPost && (
            <div className="relative ml-auto">
                 <button onClick={() => setShowOptions(!showOptions)}>
                    <MoreHorizontalIcon className="h-5 w-5 text-gray-500" />
                </button>
                {showOptions && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-20">
                        <ul className="py-1">
                            <li>
                                <button
                                    onClick={() => alert('Edit feature coming soon!')}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                    Edit
                                </button>
                            </li>
                            <li>
                                <button
                                    onClick={handleDelete}
                                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                                >
                                    Delete
                                </button>
                            </li>
                        </ul>
                    </div>
                )}
            </div>
        )}
      </div>

      <img className="w-full h-auto object-cover" src={post.mediaUrls[0]} alt="Post content" />
      
      <div className="p-3">
        <div className="flex space-x-4 mb-2">
            <button onClick={handleLike}>
                <HeartIcon isLiked={isLiked} />
            </button>
            <button>
                <CommentIcon />
            </button>
            <button>
                <SendIcon />
            </button>
        </div>
        <div className="font-semibold text-sm">{likeCount} likes</div>
        <p className="text-sm mt-1">
          <span className="font-semibold">{post.user.name}</span> {post.caption}
        </p>
        <div className="text-xs text-gray-500 mt-2 uppercase">{formatTimestamp(post.timestamp)}</div>
      </div>
    </div>
  );
};

export default PostCard;
