
import React, { useState, useEffect, useRef } from 'react';
import { Post, User } from '../types.ts';
import { db } from '../firebaseConfig.ts';
import { doc, updateDoc, arrayUnion, arrayRemove, increment, runTransaction, collection, serverTimestamp, deleteDoc } from 'firebase/firestore';
import HeartIcon from './icons/HeartIcon.tsx';
import CommentIcon from './icons/CommentIcon.tsx';
import ShareIcon from './icons/ShareIcon.tsx';
import UserPlusIcon from './icons/UserPlusIcon.tsx';
import VerifiedIcon from './icons/VerifiedIcon.tsx';
import FlameIcon from './icons/FlameIcon.tsx';
import { hapticFeedback } from '../utils/haptics.ts';
import { HotnessWeight } from '../utils/hotnessUtils.ts';
import ShareModal from './ShareModal.tsx';
import EditIcon from './icons/EditIcon.tsx';
import EditPostModal from './EditPostModal.tsx';

interface SinglePostViewProps {
    post: Post;
    currentUser: User;
    isActive: boolean;
    onOpenComments: (post: Post) => void;
    onViewProfile: (userId: string) => void;
    onUpdateUser: (user: User) => void;
    onPostDeleted?: (postId: string) => void; // New optional prop for handling deletion
}

const SinglePostView: React.FC<SinglePostViewProps> = ({ post, currentUser, isActive, onOpenComments, onViewProfile, onUpdateUser, onPostDeleted }) => {
    const [isLiked, setIsLiked] = useState(post.likedBy?.includes(currentUser.id));
    const [likeCount, setLikeCount] = useState(post.likedBy?.length || 0);
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showShare, setShowShare] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [showBigHeart, setShowBigHeart] = useState(false);
    const [showRepostToast, setShowRepostToast] = useState(false);
    const [isReposted, setIsReposted] = useState(post.repostedBy?.includes(currentUser.id) || false);
    const lastTap = useRef(0);
    
    const isOwnPost = post.userId === currentUser.id;
    const isSubscribed = currentUser.subscriptions?.includes(post.userId);
    const hasPurchased = post.unlockedBy?.includes(currentUser.id);
    const isLocked = post.isPaid && !isOwnPost && !hasPurchased && !isSubscribed && !isUnlocked;

    useEffect(() => {
        setIsLiked(post.likedBy?.includes(currentUser.id));
        setLikeCount(post.likedBy?.length || 0);
        setIsReposted(post.repostedBy?.includes(currentUser.id) || false);
    }, [post, currentUser.id]);

    const performLike = async () => {
        if (!db) return;
        hapticFeedback('light');
        
        if (isLiked) {
            setShowBigHeart(true);
            setTimeout(() => setShowBigHeart(false), 800);
            return;
        }

        const newLikedState = true;
        setIsLiked(newLikedState);
        setLikeCount(prev => prev + 1);
        setShowBigHeart(true);
        setTimeout(() => setShowBigHeart(false), 800);

        const postRef = doc(db, 'posts', post.id);
        const targetUserRef = doc(db, 'users', post.userId);

        try {
            await updateDoc(postRef, {
                likedBy: arrayUnion(currentUser.id)
            });
            await updateDoc(targetUserRef, {
                hotnessScore: increment(HotnessWeight.LIKE)
            });
        } catch (error) {
            console.error(error);
            setIsLiked(false);
            setLikeCount(prev => prev - 1);
        }
    };

    const toggleLike = async () => {
        if (!db) return;
        hapticFeedback('light');
        
        const newLikedState = !isLiked;
        setIsLiked(newLikedState);
        setLikeCount(prev => newLikedState ? prev + 1 : prev - 1);

        const postRef = doc(db, 'posts', post.id);
        const targetUserRef = doc(db, 'users', post.userId);

        try {
            await updateDoc(postRef, {
                likedBy: newLikedState ? arrayUnion(currentUser.id) : arrayRemove(currentUser.id)
            });
            await updateDoc(targetUserRef, {
                hotnessScore: increment(newLikedState ? HotnessWeight.LIKE : -HotnessWeight.LIKE)
            });
        } catch (error) {
            console.error(error);
            setIsLiked(!newLikedState);
            setLikeCount(prev => newLikedState ? prev - 1 : prev + 1);
        }
    };

    const handleDoubleTap = (e: React.MouseEvent | React.TouchEvent) => {
        const now = Date.now();
        const DOUBLE_TAP_DELAY = 300;
        if (now - lastTap.current < DOUBLE_TAP_DELAY) {
            performLike();
        }
        lastTap.current = now;
    };

    const handleRepost = async () => {
        if (!db || isReposted) return;
        
        // TikTok Style: Direct action, then show toast feedback
        hapticFeedback('medium');
        setIsReposted(true);
        setShowRepostToast(true);
        setTimeout(() => setShowRepostToast(false), 3000);

        try {
            const postRef = doc(db, 'posts', post.id);
            // Update the ORIGINAL post to include the reposter ID
            await updateDoc(postRef, {
                repostedBy: arrayUnion(currentUser.id)
            });
        } catch (e) {
            console.error("Repost failed", e);
            setIsReposted(false); // Revert on error
            alert("Repost failed due to connection error."); 
        }
    };

    const handleUnlock = async () => {
        if (isProcessing || !post.price) return;
        const currentCoins = Number(currentUser.coins) || 0;
        if (currentCoins < post.price) {
            alert("Not enough coins!");
            return;
        }
        if (!window.confirm(`Unlock for ${post.price} coins?`)) return;

        setIsProcessing(true);
        try {
            await runTransaction(db, async (transaction) => {
                const userRef = doc(db, 'users', currentUser.id);
                const posterRef = doc(db, 'users', post.userId);
                const postRef = doc(db, 'posts', post.id);

                const creatorCut = Math.floor(post.price! * 0.97); // 3% fee

                transaction.update(userRef, { coins: increment(-post.price!) });
                transaction.update(posterRef, { 
                    coins: increment(creatorCut),
                    'analytics.earnings': increment(creatorCut)
                });
                transaction.update(postRef, { unlockedBy: arrayUnion(currentUser.id) });
            });
            setIsUnlocked(true);
            onUpdateUser({ ...currentUser, coins: currentCoins - post.price });
        } catch (e) {
            console.error(e);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDelete = async () => {
        if (!db) return;
        if (window.confirm("Are you sure you want to delete this post?")) {
            try {
                await deleteDoc(doc(db, 'posts', post.id));
                setIsEditing(false);
                if (onPostDeleted) {
                    onPostDeleted(post.id);
                }
            } catch (error) {
                console.error("Error deleting post:", error);
                alert("Could not delete post. Please try again.");
            }
        }
    };

    return (
        <div className="w-full h-full relative snap-start bg-black">
            {showShare && <ShareModal post={post} onClose={() => setShowShare(false)} />}
            {isEditing && (
                <EditPostModal
                    post={post}
                    onClose={() => setIsEditing(false)}
                    onSave={() => setIsEditing(false)}
                    onDelete={handleDelete}
                />
            )}
            
            <div className="relative w-full h-full overflow-hidden">
                
                {/* Background blurred image to fill space if ratio doesn't match */}
                <div className="absolute inset-0 z-0">
                    <img 
                        src={post.mediaUrls[0]} 
                        className="w-full h-full object-cover blur-3xl opacity-60" 
                        alt=""
                    />
                    <div className="absolute inset-0 bg-black/30" />
                </div>

                {/* Main Content Area with Double Tap */}
                <div 
                    className="absolute inset-0 z-10 flex items-center justify-center select-none"
                    onClick={handleDoubleTap}
                >
                    <img 
                        src={post.mediaUrls[0]} 
                        alt="Post" 
                        className={`max-w-full max-h-full object-contain shadow-lg ${isLocked ? 'blur-2xl scale-110 brightness-50' : ''}`} 
                    />
                    
                    {/* Big Heart Animation */}
                    {showBigHeart && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
                            <HeartIcon isLiked={true} className="w-32 h-32 text-white/90 fill-white animate-like-pop drop-shadow-2xl" />
                        </div>
                    )}
                </div>

                {/* Repost Toast Notification */}
                {showRepostToast && (
                    <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-50 bg-black/80 backdrop-blur-md text-white px-4 py-2 rounded-full flex items-center gap-2 shadow-lg animate-fade-in-fast border border-white/10">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-xs font-bold">Reposted!</span>
                    </div>
                )}

                {isLocked && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-8 text-center bg-black/40 backdrop-blur-sm">
                        <div className="bg-white/10 p-6 rounded-3xl backdrop-blur-md border border-white/20 shadow-2xl">
                            <FlameIcon isGradient className="w-16 h-16 mx-auto mb-4" />
                            <h3 className="text-2xl font-bold text-white mb-2">Flame Exclusive</h3>
                            <p className="text-gray-200 mb-6 text-sm">Unlock to see this exclusive content.</p>
                            <button 
                                onClick={handleUnlock}
                                disabled={isProcessing}
                                className="w-full py-3 bg-gradient-to-r from-flame-orange to-flame-red text-white font-bold rounded-full shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2"
                            >
                                <span>Unlock</span>
                                <span className="bg-black/20 px-2 py-0.5 rounded-full text-xs flex items-center">
                                    <FlameIcon className="w-3 h-3 mr-1" /> {post.price}
                                </span>
                            </button>
                        </div>
                    </div>
                )}

                <div className="absolute bottom-0 left-0 right-0 p-4 pb-24 pt-24 bg-gradient-to-t from-black/90 via-black/50 to-transparent z-20 pointer-events-none">
                    <div className="pointer-events-auto max-w-[80%]">
                        {isReposted && (
                            <p className="text-xs font-bold text-gray-300 mb-1 flex items-center gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Reposted by You
                            </p>
                        )}
                        <h3 className="text-white font-bold text-lg flex items-center shadow-black drop-shadow-md cursor-pointer mb-1" onClick={() => onViewProfile(post.userId)}>
                            @{post.user.name}
                            {post.user.isPremium && <VerifiedIcon className="w-4 h-4 ml-1" />}
                        </h3>
                        <p className="text-white/90 text-sm line-clamp-2 drop-shadow-md">
                            {post.caption}
                        </p>
                    </div>
                </div>

                <div className="absolute right-2 bottom-20 z-30 flex flex-col items-center gap-5 pb-4">
                    <div className="relative">
                        <button onClick={() => onViewProfile(post.userId)} className="relative">
                            <img src={post.user.profilePhoto} className="w-12 h-12 rounded-full border-2 border-white shadow-md object-cover" />
                            {!isOwnPost && (
                                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-flame-red rounded-full p-0.5">
                                    <UserPlusIcon className="w-3 h-3 text-white" />
                                </div>
                            )}
                        </button>
                    </div>

                    <div className="flex flex-col items-center gap-1">
                        <button onClick={toggleLike} className="active:scale-75 transition-transform p-1">
                            <HeartIcon isLiked={isLiked} className={`w-8 h-8 drop-shadow-lg ${isLiked ? 'text-red-500 fill-red-500' : 'text-white'}`} />
                        </button>
                        <span className="text-white text-xs font-bold drop-shadow-md">{likeCount}</span>
                    </div>

                    <div className="flex flex-col items-center gap-1">
                        <button onClick={() => onOpenComments(post)} className="active:scale-75 transition-transform p-1">
                            <CommentIcon className="w-8 h-8 text-white drop-shadow-lg" />
                        </button>
                        <span className="text-white text-xs font-bold drop-shadow-md">{post.commentCount}</span>
                    </div>

                    {/* Repost Button - now modifies existing post */}
                    {!isOwnPost && (
                        <button onClick={handleRepost} className={`active:scale-75 transition-transform p-1 ${isReposted ? 'text-green-400' : 'text-white'}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 drop-shadow-lg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>
                    )}

                    <button onClick={() => setShowShare(true)} className="active:scale-75 transition-transform p-1">
                        <ShareIcon className="w-8 h-8 text-white drop-shadow-lg" />
                    </button>
                    
                    {isOwnPost && (
                        <button onClick={() => setIsEditing(true)} className="active:scale-75 transition-transform p-1">
                            <EditIcon className="w-8 h-8 text-white drop-shadow-lg" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SinglePostView;
