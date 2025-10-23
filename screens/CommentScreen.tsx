import React, { useState, useEffect, useRef } from 'react';
import { Post, User, Comment, NotificationType } from '../types';
import { db } from '../firebaseConfig';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, deleteDoc, updateDoc, arrayUnion, arrayRemove, increment } from 'firebase/firestore';

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
    postId: string;
}

const CommentRow: React.FC<CommentRowProps> = ({ comment, currentUser, postAuthorId, onDelete, postId }) => {
    const [isLiked, setIsLiked] = useState(false);

    useEffect(() => {
        setIsLiked(comment.likedBy.includes(currentUser.id));
    }, [comment, currentUser.id]);

    const handleLike = async () => {
        if (!db) return;
        const commentRef = doc(db, 'posts', postId, 'comments', comment.id);
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
            <img src={comment.userProfilePhoto} alt={comment.userName} className="w-8 h-8 rounded-full object-cover" />
            <div className="flex-1">
                <p>
                    <span className="font-semibold text-sm">{comment.userName}</span>{' '}
                    <span className="text-sm">{comment.text}</span>
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
}

const CommentScreen: React.FC<CommentScreenProps> = ({ post, currentUser, onClose }) => {
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!db) return;
        const commentsRef = collection(db, 'posts', post.id, 'comments');
        const q = query(commentsRef, orderBy('timestamp', 'asc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const commentsList = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Comment));
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

        const commentsRef = collection(db, 'posts', post.id, 'comments');
        const postRef = doc(db, 'posts', post.id);

        try {
            // Step 1: Add the comment document. This is the critical operation.
            // If this fails, the user will see the error alert.
            await addDoc(commentsRef, {
                userId: currentUser.id,
                userName: currentUser.name,
                userProfilePhoto: currentUser.profilePhotos?.[0] || '',
                text: tempComment,
                likedBy: [],
                timestamp: serverTimestamp()
            });
            
            // From this point on, subsequent operations are "fire and forget".
            // Their failure won't block the user or show an error, as the main
            // action (posting the comment) has succeeded.

            // Step 2 (Optional): Atomically increment the post's comment count.
            updateDoc(postRef, { commentCount: increment(1) }).catch(error => {
                console.warn("Could not update comment count. This may be due to security rules.", error);
            });

            // Step 3 (Optional): Create a notification for the post author.
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
                    console.warn("Could not create notification. This may be due to security rules.", error);
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

        const commentRef = doc(db, 'posts', post.id, 'comments', commentId);
        const postRef = doc(db, 'posts', post.id);

        try {
            // Step 1: Delete the comment. This is the critical part.
            await deleteDoc(commentRef);
            
            // Step 2 (Optional): Decrement the post's comment count.
            updateDoc(postRef, { commentCount: increment(-1) }).catch(error => {
                console.warn("Could not update comment count on delete. This may be due to security rules.", error);
            });
        } catch (e) {
            console.error("Failed to delete comment:", e);
            alert("Could not delete comment. Please try again.");
        }
    };

    return (
        <div className="absolute inset-0 bg-white z-50 flex flex-col">
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
                ) : (
                    comments.map(comment => <CommentRow key={comment.id} comment={comment} currentUser={currentUser} postAuthorId={post.userId} onDelete={handleDeleteComment} postId={post.id} />)
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