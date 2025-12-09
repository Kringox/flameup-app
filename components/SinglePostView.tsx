
import React, { useState, useEffect } from 'react';
import { Post, User } from '../types.ts';
import { db } from '../firebaseConfig.ts';
import { doc, updateDoc, arrayUnion, arrayRemove, increment, runTransaction } from 'firebase/firestore';
import HeartIcon from './icons/HeartIcon.tsx';
import CommentIcon from './icons/CommentIcon.tsx';
import ShareIcon from './icons/ShareIcon.tsx';
import UserPlusIcon from './icons/UserPlusIcon.tsx';
import VerifiedIcon from './icons/VerifiedIcon.tsx';
import FlameIcon from './icons/FlameIcon.tsx';
import { hapticFeedback } from '../utils/haptics.ts';
import { HotnessWeight } from '../utils/hotnessUtils.ts';
import ShareModal from './ShareModal.tsx';

interface SinglePostViewProps {
    post: Post;
    currentUser: User;
    isActive: boolean;
    onOpenComments: (post: Post) => void;
    onViewProfile: (userId: string) => void;
    onUpdateUser: (user: User) => void;
}

const SinglePostView: React.FC<SinglePostViewProps> = ({ post, currentUser, isActive, onOpenComments, onViewProfile, onUpdateUser }) => {
    const [isLiked, setIsLiked] = useState(post.likedBy?.includes(currentUser.id));
    const [likeCount, setLikeCount] = useState(post.likedBy?.length || 0);
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showShare, setShowShare] = useState(false);
    
    const isOwnPost = post.userId === currentUser.id;
    const isSubscribed = currentUser.subscriptions?.includes(post.userId);
    const hasPurchased = post.unlockedBy?.includes(currentUser.id);
    const isLocked = post.isPaid && !isOwnPost && !hasPurchased && !isSubscribed && !isUnlocked;

    useEffect(() => {
        setIsLiked(post.likedBy?.includes(currentUser.id));
        setLikeCount(post.likedBy?.length || 0);
    }, [post, currentUser.id]);

    const handleLike = async () => {
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

    return (
        <div className="w-full h-full relative snap-start flex items-center justify-center p-3 md:p-4 bg-black">
            {showShare && <ShareModal post={post} onClose={() => setShowShare(false)} />}
            
            <div className="relative w-full h-full max-h-[85vh] aspect-[9/16] md:aspect-[3/4] bg-gray-900 rounded-3xl overflow-hidden shadow-2xl border border-white/10">
                
                <div className="absolute inset-0 z-0">
                    <img 
                        src={post.mediaUrls[0]} 
                        className="w-full h-full object-cover blur-3xl opacity-60" 
                        alt=""
                    />
                    <div className="absolute inset-0 bg-black/20" />
                </div>

                <div className="absolute inset-0 z-10 flex items-center justify-center">
                    <img 
                        src={post.mediaUrls[0]} 
                        alt="Post" 
                        className={`max-w-full max-h-full object-contain shadow-lg ${isLocked ? 'blur-2xl scale-110 brightness-50' : ''}`} 
                    />
                </div>

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

                <div className="absolute bottom-0 left-0 right-0 p-4 pb-16 pt-24 bg-gradient-to-t from-black/90 via-black/50 to-transparent z-20 pointer-events-none">
                    <div className="pointer-events-auto max-w-[80%]">
                        <h3 className="text-white font-bold text-lg flex items-center shadow-black drop-shadow-md cursor-pointer mb-1" onClick={() => onViewProfile(post.userId)}>
                            @{post.user.name}
                            {post.user.isPremium && <VerifiedIcon className="w-4 h-4 ml-1" />}
                        </h3>
                        <p className="text-white/90 text-sm line-clamp-2 drop-shadow-md">
                            {post.caption}
                        </p>
                    </div>
                </div>

                <div className="absolute right-2 bottom-12 z-30 flex flex-col items-center gap-6 pb-4">
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
                        <button onClick={handleLike} className="active:scale-75 transition-transform p-1">
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

                    <button onClick={() => setShowShare(true)} className="active:scale-75 transition-transform p-1">
                        <ShareIcon className="w-8 h-8 text-white drop-shadow-lg" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SinglePostView;
