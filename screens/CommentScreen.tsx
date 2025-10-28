import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebaseConfig';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';
// FIX: Added file extension to types import
import { Post, User, Comment, NotificationType } from '../types.ts';
// FIX: Added file extension to VerifiedIcon import
import VerifiedIcon from '../components/icons/VerifiedIcon.tsx';

const CommentRow: React.FC<{ comment: Comment; onViewProfile: (userId: string) => void; }> = ({ comment, onViewProfile }) => {
    return (
        <div className="flex items-start space-x-3 py-2">
            <button onClick={() => onViewProfile(comment.userId)}>
                <img src={comment.userProfilePhoto} alt={comment.userName} className="w-8 h-8 rounded-full" />
            </button>
            <div className="flex-1">
                <p className="text-sm">
                    <button onClick={() => onViewProfile(comment.userId)} className="font-semibold mr-1 flex items-center">
                        {comment.userName}
                        {comment.isPremium && <VerifiedIcon className="w-4 h-4 ml-1" />}
                    </button>
                    {comment.text}
                </p>
            </div>
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
    const [isPosting, setIsPosting] = useState(false);
    const commentsEndRef = useRef<null | HTMLDivElement>(null);

    useEffect(() => {
        if (!db) return;
        const q = query(collection(db, 'posts', post.id, 'comments'), orderBy('timestamp', 'asc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const commentsList = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Comment));
            setComments(commentsList);
        });
        return () => unsubscribe();
    }, [post.id]);

    useEffect(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [comments]);
    
    const createNotification = async (commentText: string) => {
      if (!db || post.userId === currentUser.id) return;

      try {
          const notificationsRef = collection(db, 'users', post.userId, 'notifications');
          await addDoc(notificationsRef, {
              type: NotificationType.Comment,
              fromUser: {
                  id: currentUser.id,
                  name: currentUser.name,
                  profilePhoto: currentUser.profilePhotos?.[0] || '',
              },
              post: {
                  id: post.id,
                  mediaUrl: post.mediaUrls[0],
              },
              commentText: commentText,
              read: false,
              timestamp: serverTimestamp(),
          });
      } catch (error) {
          console.error("Error creating notification:", error);
      }
    };

    const handlePostComment = async () => {
        if (newComment.trim() === '' || !db || isPosting) return;
        setIsPosting(true);
        const commentData = {
            postId: post.id,
            userId: currentUser.id,
            userName: currentUser.name,
            userProfilePhoto: currentUser.profilePhotos[0],
            isPremium: currentUser.isPremium || false,
            text: newComment.trim(),
            likedBy: [],
            timestamp: serverTimestamp(),
        };

        try {
            await addDoc(collection(db, 'posts', post.id, 'comments'), commentData);
            await updateDoc(doc(db, 'posts', post.id), {
                commentCount: increment(1)
            });
            await createNotification(newComment.trim());
            setNewComment('');
        } catch (error) {
            console.error("Error posting comment: ", error);
        } finally {
            setIsPosting(false);
        }
    };

    return (
        <div className="absolute inset-0 bg-white z-50 flex flex-col">
            <header className="flex items-center p-4 border-b border-gray-200">
                <button onClick={onClose} className="w-8">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <h1 className="text-xl font-bold text-center flex-1">Comments</h1>
                <div className="w-8"></div>
            </header>

            <div className="flex-1 overflow-y-auto p-4">
                {comments.map(comment => <CommentRow key={comment.id} comment={comment} onViewProfile={onViewProfile} />)}
                <div ref={commentsEndRef} />
            </div>

            <div className="p-2 border-t border-gray-200 flex items-center">
                <img src={currentUser.profilePhotos[0]} alt="My profile" className="w-10 h-10 rounded-full" />
                <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder={`Comment as ${currentUser.name}...`}
                    className="flex-1 mx-2 p-2 border-none focus:outline-none"
                    onKeyDown={(e) => e.key === 'Enter' && handlePostComment()}
                />
                <button onClick={handlePostComment} disabled={!newComment.trim() || isPosting} className="font-bold text-flame-orange disabled:opacity-50">
                    Post
                </button>
            </div>
        </div>
    );
};

export default CommentScreen;
