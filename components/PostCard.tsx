
import React, { useState, useEffect } from 'react';
import { Post, User, NotificationType } from '../types.ts';
import { db } from '../firebaseConfig.ts';
import { doc, updateDoc, deleteDoc, arrayUnion, arrayRemove, addDoc, collection, serverTimestamp, increment } from 'firebase/firestore';

import HeartIcon from './icons/HeartIcon.tsx';
import CommentIcon from './icons/CommentIcon.tsx';
import SendIcon from './icons/SendIcon.tsx';
import MoreHorizontalIcon from './icons/MoreHorizontalIcon.tsx';
import EditPostModal from './EditPostModal.tsx';
import VerifiedIcon from './icons/VerifiedIcon.tsx';
import UserPlusIcon from './icons/UserPlusIcon.tsx';
import { hapticFeedback } from '../utils/haptics.ts';
import { HotnessWeight } from '../utils/hotnessUtils.ts';

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
  onPostUpdated?: (post: Post) => void;
  onOpenComments: (post: Post) => void;
  onViewProfile?: (userId: string) => void;
  onUpdateUser: (user: User) => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, currentUser, onPostDeleted, onPostUpdated, onOpenComments, onViewProfile, onUpdateUser }) => {
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [showOptions, setShowOptions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isAnimatingLike, setIsAnimatingLike] = useState(false);
  const [isFollowing, setIsFollowing] = useState(currentUser.following.includes(post.user.id));
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  useEffect(() => {
    setIsLiked(post.likedBy.includes(currentUser.id));
    setLikeCount(post.likedBy.length);
  }, [post.likedBy, currentUser.id]);
  
  useEffect(() => {
    setIsFollowing(currentUser.following.includes(post.user.id));
  }, [currentUser.following, post.user.id]);
  
  const createNotification = async (type: NotificationType) => {
      if (!db || post.userId === currentUser.id) return; // Don't notify yourself

      try {
          const notificationsRef = collection(db, 'users', post.userId, 'notifications');
          await addDoc(notificationsRef, {
              type,
              fromUser: {
                  id: currentUser.id,
                  name: currentUser.name,
                  profilePhoto: currentUser.profilePhotos?.[0] || '',
              },
              post: {
                  id: post.id,
                  mediaUrl: post.mediaUrls[0],
              },
              read: false,
              timestamp: serverTimestamp(),
          });
      } catch (error) {
          console.error("Error creating notification:", error);
      }
  };
  
  const handleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigating to profile
    if (!db || isFollowLoading) return;
    setIsFollowLoading(true);
    hapticFeedback('selection');

    const currentUserRef = doc(db, 'users', currentUser.id);
    const targetUserRef = doc(db, 'users', post.user.id);

    try {
        await updateDoc(currentUserRef, {
            following: arrayUnion(post.user.id)
        });

        // Increase Hotness of the person being followed
        await updateDoc(targetUserRef, {
            hotnessScore: increment(HotnessWeight.FOLLOW)
        });

        const notificationsRef = collection(db, 'users', post.user.id, 'notifications');
        await addDoc(notificationsRef, {
            type: NotificationType.Follow,
            fromUser: {
                id: currentUser.id, name: currentUser.name, profilePhoto: currentUser.profilePhotos?.[0] || ''
            },
            read: false,
            timestamp: serverTimestamp(),
        });

        setIsFollowing(true);
        const updatedFollowingList = [...currentUser.following, post.user.id];
        onUpdateUser({ ...currentUser, following: updatedFollowingList });

    } catch (error) {
        console.error("Error following user:", error);
    } finally {
        setIsFollowLoading(false);
    }
  };

  const handleLike = async () => {
    if (!db) return;
    hapticFeedback('light');
    
    if (!isLiked) {
        setIsAnimatingLike(true);
        setTimeout(() => setIsAnimatingLike(false), 400);
    }

    const postRef = doc(db, 'posts', post.id);
    const targetUserRef = doc(db, 'users', post.userId);
    
    const newLikedState = !isLiked;
    const newLikeCount = newLikedState ? likeCount + 1 : likeCount - 1;
    setIsLiked(newLikedState);
    setLikeCount(newLikeCount);

    try {
      await updateDoc(postRef, {
        likedBy: newLikedState ? arrayUnion(currentUser.id) : arrayRemove(currentUser.id)
      });
      
      // Update Hotness of the post owner
      await updateDoc(targetUserRef, {
          hotnessScore: increment(newLikedState ? HotnessWeight.LIKE : -HotnessWeight.LIKE)
      });

      if (newLikedState) {
          createNotification(NotificationType.Like);
      }
    } catch (error) {
      console.error("Error updating like:", error);
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
  
  const handleUpdateCaption = (newCaption: string) => {
    const updatedPost = { ...post, caption: newCaption };
    if (onPostUpdated) {
        onPostUpdated(updatedPost);
    }
    setIsEditing(false);
  }

  const handleProfileClick = () => {
    if (onViewProfile) {
        onViewProfile(post.user.id);
    }
  };

  const isOwnPost = post.userId === currentUser.id;

  return (
    <>
    {isEditing && (
        <EditPostModal
            post={post}
            onClose={() => setIsEditing(false)}
            onSave={handleUpdateCaption}
        />
    )}
    <div className="bg-white dark:bg-zinc-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden mb-4 shadow-sm">
      <div className="flex items-center justify-between p-3">
        {/* User Info Header */}
        <div className="flex items-center flex-1 min-w-0">
            <button onClick={handleProfileClick} disabled={!onViewProfile} className="flex-shrink-0 disabled:cursor-default">
                <img className="w-9 h-9 rounded-full object-cover border border-gray-100 dark:border-zinc-700" src={post.user.profilePhoto} alt={post.user.name} />
            </button>
            <div className="ml-3 flex items-center min-w-0">
                <button onClick={handleProfileClick} disabled={!onViewProfile} className="font-semibold text-sm text-dark-gray dark:text-gray-200 truncate disabled:cursor-default">
                    {post.user.name}
                </button>
                {post.user.isPremium && <VerifiedIcon className="w-3.5 h-3.5 ml-1 flex-shrink-0" />}
                
                {/* 1-Tap Follow Icon */}
                {!isOwnPost && !isFollowing && (
                    <button 
                        onClick={handleFollow} 
                        disabled={isFollowLoading} 
                        className="ml-2 bg-flame-orange/10 text-flame-orange hover:bg-flame-orange hover:text-white transition-colors rounded-full p-1 flex items-center justify-center disabled:opacity-50"
                        aria-label="Follow"
                    >
                        <UserPlusIcon className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>
        </div>

        {/* Options */}
        {isOwnPost && (
            <div className="relative">
                 <button onClick={() => setShowOptions(!showOptions)} className="p-1">
                    <MoreHorizontalIcon className="h-5 w-5 text-gray-500" />
                </button>
                {showOptions && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-700 rounded-md shadow-lg z-20 animate-fade-in-fast border border-gray-100 dark:border-gray-600">
                        <ul className="py-1">
                            <li>
                                <button
                                    onClick={() => {
                                        setIsEditing(true);
                                        setShowOptions(false);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-600"
                                >
                                    Edit
                                </button>
                            </li>
                            <li>
                                <button
                                    onClick={handleDelete}
                                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-zinc-600"
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
            <button onClick={handleLike} className={`cursor-pointer transition-transform duration-200 ${isAnimatingLike ? 'animate-like-pop' : ''}`}>
                <HeartIcon isLiked={isLiked} className={`w-6 h-6 ${isLiked ? "text-red-500" : "text-dark-gray dark:text-gray-200 hover:text-red-500"}`} />
            </button>
            <button onClick={() => onOpenComments(post)} className="cursor-pointer transition-transform hover:scale-110">
                <CommentIcon className="w-6 h-6 text-dark-gray dark:text-gray-200 hover:text-gray-500 dark:hover:text-gray-400"/>
            </button>
            <button className="cursor-pointer transition-transform hover:scale-110">
                <SendIcon className="w-6 h-6 text-dark-gray dark:text-gray-200 hover:text-gray-500 dark:hover:text-gray-400"/>
            </button>
        </div>
        <div className="font-semibold text-sm text-dark-gray dark:text-gray-200">{likeCount} likes</div>
        <p className="text-sm mt-1 text-dark-gray dark:text-gray-200">
          <button onClick={handleProfileClick} disabled={!onViewProfile} className="font-semibold mr-1 hover:underline">{post.user.name}</button>
          {post.caption}
        </p>
         {post.commentCount > 0 && (
            <button onClick={() => onOpenComments(post)} className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                View all {post.commentCount} comments
            </button>
        )}
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 uppercase">{formatTimestamp(post.timestamp)}</div>
      </div>
    </div>
    </>
  );
};

export default PostCard;
