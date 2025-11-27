
import React, { useState, useEffect, useRef, useContext } from 'react';
import { db } from '../firebaseConfig';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, increment, writeBatch } from 'firebase/firestore';
import { Post, User, Comment, NotificationType } from '../types.ts';
import VerifiedIcon from '../components/icons/VerifiedIcon.tsx';
import { XpContext } from '../contexts/XpContext.ts';
import { HotnessWeight } from '../utils/hotnessUtils.ts';
import XIcon from '../components/icons/XIcon.tsx';

const CommentRow: React.FC<{ comment: Comment; onViewProfile: (userId: string) => void; }> = ({ comment, onViewProfile }) => {
    return (
        <div className="flex items-start space-x-3 py-3 animate-fade-in">
            <button onClick={() => onViewProfile(comment.userId)}>
                <img src={comment.userProfilePhoto} alt={comment.userName} className="w-8 h-8 rounded-full object-cover" />
            </button>
            <div className="flex-1">
                <div className="flex items-center">
                    <button onClick={() => onViewProfile(comment.userId)} className="text-xs font-bold text-gray-500 dark:text-gray-400 mr-2 flex items-center">
                        {comment.userName}
                        {comment.isPremium && <VerifiedIcon className="w-3 h-3 ml-1" />}
                    </button>
                    <span className="text-[10px] text-gray-400">Now</span>
                </div>
                <p className="text-sm dark:text-gray-200 mt-0.5 leading-tight">
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
    const { showXpToast } = useContext(XpContext);

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
        const commentText = newComment.trim();

        try {
            const batch = writeBatch(db);
            const commentRef = doc(collection(db, 'posts', post.id, 'comments'));
            batch.set(commentRef, {
                postId: post.id,
                userId: currentUser.id,
                userName: currentUser.name,
                userProfilePhoto: currentUser.profilePhotos[0],
                isPremium: currentUser.isPremium || false,
                text: commentText,
                likedBy: [],
                timestamp: serverTimestamp(),
            });

            const postRef = doc(db, 'posts', post.id);
            batch.update(postRef, { commentCount: increment(1) });
            
            const ownerRef = doc(db, 'users', post.userId);
            batch.update(ownerRef, { hotnessScore: increment(HotnessWeight.COMMENT) });

            await batch.commit();
            showXpToast(20); 
            await createNotification(commentText);
            setNewComment('');
        } catch (error) {
            console.error("Error posting comment: ", error);
        } finally {
            setIsPosting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end" onClick={onClose}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 transition-opacity" />
            
            {/* Drawer */}
            <div 
                className="bg-white dark:bg-zinc-900 w-full h-[75vh] rounded-t-3xl shadow-2xl relative flex flex-col animate-slide-in-bottom"
                onClick={(e) => e.stopPropagation()}
            >
                <style>{`
                    @keyframes slide-in-bottom {
                        from { transform: translateY(100%); }
                        to { transform: translateY(0); }
                    }
                    .animate-slide-in-bottom { animation: slide-in-bottom 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
                `}</style>

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-zinc-800">
                    <div className="w-8"></div> {/* Spacer */}
                    <span className="font-bold text-sm dark:text-white">{comments.length} Comments</span>
                    <button onClick={onClose} className="p-1 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-500">
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Comments List */}
                <div className="flex-1 overflow-y-auto p-4">
                    {comments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                            <p className="text-sm">No comments yet. Be the first!</p>
                        </div>
                    ) : (
                        comments.map(comment => (
                            <CommentRow key={comment.id} comment={comment} onViewProfile={onViewProfile} />
                        ))
                    )}
                    <div ref={commentsEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-3 border-t border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 pb-8">
                    <div className="flex items-center bg-gray-100 dark:bg-zinc-800 rounded-full px-4 py-2">
                        <img src={currentUser.profilePhotos[0]} alt="My profile" className="w-8 h-8 rounded-full border border-gray-200 dark:border-zinc-700" />
                        <input
                            type="text"
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Add comment..."
                            className="flex-1 mx-3 bg-transparent border-none focus:outline-none text-sm dark:text-gray-200"
                            onKeyDown={(e) => e.key === 'Enter' && handlePostComment()}
                        />
                        <button 
                            onClick={handlePostComment} 
                            disabled={!newComment.trim() || isPosting} 
                            className="text-flame-orange font-bold text-sm disabled:opacity-50"
                        >
                            Post
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CommentScreen;
