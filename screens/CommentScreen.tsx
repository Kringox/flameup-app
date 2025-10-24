import React, { useState, useEffect, useRef } from 'react';
// FIX: Added file extension to types import
import { Post, User, Comment, NotificationType } from '../types.ts';
import { db } from '../firebaseConfig';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, deleteDoc, updateDoc, arrayUnion, arrayRemove, increment, where } from 'firebase/firestore';
import VerifiedIcon from '../components/icons/VerifiedIcon.tsx';

const formatTimestamp = (timestamp: any): string => {
    if (!timestamp?.toDate) return 'Just now';
    const date = timestamp.toDate();
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
};

interface CommentRowProps {
    comment: Comment;
    currentUser: User;
    postAuthorId: string;
    onDelete: (commentId: string) => void;
    onViewProfile: (userId: string) => void;
}

const CommentRow: React.FC<CommentRowProps> = ({ comment, currentUser, postAuthorId, onDelete, onViewProfile }) => {
    const [isLiked, setIsLiked] = useState(false);

    useEffect(() => {
        setIsLiked(comment.likedBy.includes(currentUser.id));
    }, [comment, currentUser.id]);

    const handleLike = async () => {
        if (!db) return;
        // Comments are now in a top-level collection
        const commentRef = doc(db, 'comments', comment.id);
        const newLikedState = !isLiked;
        setIsLiked(newLikedState); // Optimistic update

        try {
            await updateDoc(commentRef, {
                likedBy: newLikedState ? arrayUnion(currentUser.id) : arrayRemove(currentUser.id)
            });
        } catch (e) {
            console.error(e);
            setIsLiked(!newLikedState); // Revert on error
        }
    };

    const canDelete = currentUser.id === comment.userId || currentUser.id === postAuthorId;
    return (
        <div className="flex items-start p-3 space-x-3">
            <button onClick={() => onViewProfile(comment.userId)}>
                <img src={comment.userProfilePhoto} alt={comment.userName} className="w-8 h-8 rounded-full object-cover" />
            </button>
            <div className="flex-1">
                <p className="text-sm">
                    <button onClick={() => onViewProfile(comment.userId)} className="font-semibold text-sm mr-1">{comment.userName}</button>
                    {comment.isPremium && <VerifiedIcon className="inline-block align-middle" />}
                    {' '}
                    <span>{comment.text}</span>
                </p>
                <div className="flex items-center space-x-3 text-xs text-gray-500 mt-1">
                    <span>{formatTimestamp(comment.timestamp)}</span>
                    {canDelete && <button onClick={() => onDelete(comment.id)} className="font-semibold">Delete</button>}
                </div>
            </div>
            <button onClick={handleLike}>
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isLiked ? 'text-red-500' : 'text-gray-400'}`} fill={isLiked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
            </button>
        </div>
    );
};


interface CommentScreenProps {
    post: Post;
    currentUser: User;
    onClose: () => void;
    onViewProfile: (userId: string) => void;
}

const CommentScreen: React.FC<CommentScreenProps> = ({ post, currentUser, onClose, onViewProfile }) => {
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!db) return;
        
        const commentsRef = collection(db, 'comments');
        const q = query(commentsRef, where('postId', '==', post.id));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const commentsList = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Comment));
            
            commentsList.sort((a, b) => {
                const timeA = a.timestamp?.toMillis() || 0;
                const timeB = b.timestamp?.toMillis() || 0;
                return timeA - timeB;
            });

            setComments(commentsList);
            setIsLoading(false);
            setTimeout(() => listRef.current?.scrollTo(0, listRef.current.scrollHeight), 100);
        }, (error) => {
            console.error("Error fetching comments:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [post.id]);

    const handlePostComment = async () => {
        if (!db || newComment.trim() === '') return;
        
        const tempComment = newComment;
        setNewComment('');

        const commentsRef = collection(db, 'comments');
        const postRef = doc(db, 'posts', post.id);

        try {
            await addDoc(commentsRef, {
                postId: post.id,
                userId: currentUser.id,
                userName: currentUser.name,
                userProfilePhoto: currentUser.profilePhotos?.[0] || '',
                isPremium: currentUser.isPremium || false,
                text: tempComment,
                likedBy: [],
                timestamp: serverTimestamp()
            });
            
            updateDoc(postRef, { commentCount: increment(1) }).catch(error => {
                console.warn("Could not update comment count.", error);
            });

            if (post.userId !== currentUser.id) {
                const notificationsRef = collection(db, 'users', post.userId, 'notifications');
                addDoc(notificationsRef, {
                    type: NotificationType.Comment,
                    fromUser: {
                        id: currentUser.id, name: currentUser.name, profilePhoto: currentUser.profilePhotos?.[0] || ''
                    },
                    post: { id: post.id, mediaUrl: post.mediaUrls[0] },
                    commentText: tempComment,
                    read: false,
                    timestamp: serverTimestamp(),
                }).catch(error => {
                    console.warn("Could not create notification.", error);
                });
            }
        } catch (e) {
            console.error("Failed to post comment: ", e);
            alert("Failed to post comment. Please try again.");
            setNewComment(tempComment);
        }
    };
    
    const handleDeleteComment = async (commentId: string) => {
        if (!db) return;

        const commentRef = doc(db, 'comments', commentId);
        const postRef = doc(db, 'posts', post.id);

        try {
            await deleteDoc(commentRef);
            
            updateDoc(postRef, { commentCount: increment(-1) }).catch(error => {
                console.warn("Could not update comment count on delete.", error);
            });
        } catch (e) {
            console.error("Failed to delete comment:", e);
            alert("Could not delete comment. Please try again.");
        }
    };

    return (
        <div className="absolute inset-0 bg-white z-[90] flex flex-col">
            <header className="flex items-center p-4 border-b border-gray-200 flex-shrink-0">
                <div className="w-8"></div>
                <h1 className="text-xl font-bold text-dark-gray text-center flex-1">Comments</h1>
                <button onClick={onClose} className="text-lg text-gray-600 w-8">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </header>

            <div ref={listRef} className="flex-1 overflow-y-auto">
                {isLoading ? (
                     <div className="flex justify-center items-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div></div>
                ) : comments.length === 0 ? (
                    <p className="text-center text-gray-500 mt-8">No comments yet. Be the first!</p>
                ) : (
                    comments.map(comment => <CommentRow key={comment.id} comment={comment} currentUser={currentUser} postAuthorId={post.userId} onDelete={handleDeleteComment} onViewProfile={onViewProfile} />)
                )}
            </div>

            <footer className="p-2 border-t border-gray-200 bg-white">
                <div className="flex items-center space-x-2">
                    <img src={currentUser.profilePhotos?.[0]} alt="My avatar" className="w-10 h-10 rounded-full object-cover"/>
                    <input
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add a comment..."
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-flame-orange"
                        onKeyPress={(e) => e.key === 'Enter' && handlePostComment()}
                    />
                    <button onClick={handlePostComment} className="text-flame-orange font-semibold disabled:opacity-50" disabled={!newComment.trim()}>Post</button>
                </div>
            </footer>
        </div>
    );
};

export default CommentScreen;
