
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
                <img src={comment.userProfilePhoto} alt={comment.userName} className="w-8 h-8 rounded-full object-cover border border-zinc-700" />
            </button>
            <div className="flex-1">
                <div className="flex items-center">
                    <button onClick={() => onViewProfile(comment.userId)} className="text-xs font-bold text-gray-400 mr-2 flex items-center hover:text-white">
                        {comment.userName}
                        {comment.isPremium && <VerifiedIcon className="w-3 h-3 ml-1" />}
                    </button>
                    <span className="text-[10px] text-zinc-600">Now</span>
                </div>
                <p className="text-sm text-gray-200 mt-0.5 leading-tight">
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
        <div className="fixed inset-0 z-[100] flex justify-center items-end" onClick={onClose}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" />
            
            {/* Drawer Container - Constrained Width */}
            <div className="w-full max-w-md h-[75vh] relative z-10">
                <div 
                    className="bg-zinc-900 w-full h-full rounded-t-3xl shadow-2xl flex flex-col animate-slide-in-bottom border-t border-zinc-800 overflow-hidden"
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
                    <div className="flex items-center justify-between p-4 border-b border-zinc-800 flex-shrink-0">
                        <div className="w-8"></div> {/* Spacer */}
                        <span className="font-bold text-sm text-white">{comments.length} Comments</span>
                        <button onClick={onClose} className="p-1 rounded-full bg-zinc-800 text-gray-400 hover:text-white">
                            <XIcon className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Comments List */}
                    <div className="flex-1 overflow-y-auto p-4 bg-zinc-900">
                        {comments.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                <p className="text-sm">No comments yet. Start the conversation!</p>
                            </div>
                        ) : (
                            comments.map(comment => (
                                <CommentRow key={comment.id} comment={comment} onViewProfile={onViewProfile} />
                            ))
                        )}
                        <div ref={commentsEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-3 border-t border-zinc-800 bg-zinc-900 pb-[env(safe-area-inset-bottom)] flex-shrink-0">
                        <div className="flex items-center bg-black rounded-full px-4 py-3 border border-zinc-800">
                            <img src={currentUser.profilePhotos[0]} alt="Me" className="w-8 h-8 rounded-full border border-zinc-700" />
                            <input
                                type="text"
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Add comment..."
                                className="flex-1 mx-3 bg-transparent border-none focus:outline-none text-sm text-white placeholder-zinc-600"
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
        </div>
    );
};

export default CommentScreen;
