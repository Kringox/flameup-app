
import React, { useState, useEffect, useRef } from 'react';
// FIX: Added file extension to types import
import { Story, User } from '../types.ts';
import HeartIcon from './icons/HeartIcon.tsx';
import { db } from '../firebaseConfig.ts';
// FIX: Using namespace import for firestore
import * as firestore from 'firebase/firestore';
import PlusIcon from './icons/PlusIcon.tsx';


interface StoryViewerProps {
    stories: Story[];
    currentUser: User;
    startIndex?: number;
    onClose: () => void;
    onStoryViewed: (storyId: string) => void;
    onAddStory?: () => void;
}

const StoryViewer: React.FC<StoryViewerProps> = ({ stories, currentUser, startIndex = 0, onClose, onStoryViewed, onAddStory }) => {
    const [currentIndex, setCurrentIndex] = useState(startIndex);
    const [progress, setProgress] = useState(0);
    const [isLiked, setIsLiked] = useState(false);
    const [isAnimatingLike, setIsAnimatingLike] = useState(false);
    const timerRef = useRef<number | null>(null);
    const storyDuration = 5000; // 5 seconds per story
    
    const currentStory = stories[currentIndex];

    useEffect(() => {
        if (currentStory?.id) {
            onStoryViewed(currentStory.id);
            setIsLiked(currentStory.likedBy?.includes(currentUser.id) || false);
        }
    }, [currentIndex, stories, onStoryViewed, currentUser.id, currentStory]);

    const goToNextStory = () => {
        if (currentIndex < stories.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            onClose();
        }
    };
    
    const goToPrevStory = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        }
    };
    
    useEffect(() => {
        setProgress(0);
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        timerRef.current = window.setInterval(() => {
            setProgress(p => {
                if (p >= 100) {
                    goToNextStory();
                    return 100;
                }
                return p + (100 / (storyDuration / 100));
            });
        }, 100);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [currentIndex, stories.length]);

    const handleLike = async () => {
        if (!db || !currentStory || !currentStory.id) return;

        if (!isLiked) {
            setIsAnimatingLike(true);
            setTimeout(() => setIsAnimatingLike(false), 400);
        }
        
        const newLikedState = !isLiked;
        setIsLiked(newLikedState);

        try {
            const storyRef = firestore.doc(db, 'stories', currentStory.id);
            await firestore.updateDoc(storyRef, {
                likedBy: newLikedState ? firestore.arrayUnion(currentUser.id) : firestore.arrayRemove(currentUser.id)
            });
        } catch (error) {
            console.error("Error liking story:", error);
            setIsLiked(!newLikedState); // Revert on error
        }
    };

    if (!stories || stories.length === 0 || !currentStory || !currentStory.user) {
        // If data is invalid or missing, close viewer safely
        // Avoid rendering if closing to prevent flash
        setTimeout(onClose, 0); 
        return null;
    }

    const storyUser = currentStory.user;
    const isOwnStory = storyUser.id === currentUser.id;

    return (
        <div className="absolute inset-0 bg-black z-[100] flex flex-col justify-center animate-fade-in">
            <div className="absolute top-0 left-0 right-0 p-3 z-10">
                <div className="flex items-center space-x-1">
                    {stories.map((_, index) => (
                        <div key={index} className="flex-1 h-1 bg-white/30 rounded-full">
                            <div
                                className="h-full bg-white rounded-full transition-all duration-100 linear"
                                style={{ width: `${index < currentIndex ? 100 : (index === currentIndex ? progress : 0)}%` }}
                            />
                        </div>
                    ))}
                </div>
                <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center">
                        <img src={storyUser.profilePhoto || ''} alt={storyUser.name} className="w-8 h-8 rounded-full border border-white/20" />
                        <span className="text-white font-semibold ml-2 text-sm drop-shadow-md">{storyUser.name}</span>
                        {isOwnStory && onAddStory && (
                            <button onClick={onAddStory} className="ml-2 bg-white/20 rounded-full p-1 text-white hover:bg-white/30">
                                <PlusIcon className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    <button onClick={onClose} className="text-white">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            </div>
            
            <div className="relative w-full h-full flex items-center justify-center bg-black">
                {/* Changed to object-cover to fill the screen (mobile format) */}
                <img src={currentStory.mediaUrl} alt="Story content" className="w-full h-full object-cover" />
                
                {/* Caption Overlay */}
                {currentStory.caption && (
                    <div className="absolute bottom-20 left-0 right-0 p-4 text-center">
                        <p className="text-white font-bold text-xl drop-shadow-lg bg-black/30 p-2 rounded inline-block">{currentStory.caption}</p>
                    </div>
                )}

                <div className="absolute inset-0 flex">
                    <div className="w-1/3 h-full" onClick={goToPrevStory}></div>
                    <div className="w-2/3 h-full" onClick={goToNextStory}></div>
                </div>
            </div>
            <div className="absolute bottom-6 right-4 z-20">
                 <button onClick={handleLike} className={`transition-transform duration-200 ${isAnimatingLike ? 'animate-like-pop' : ''}`}>
                    <HeartIcon isLiked={isLiked} className="w-8 h-8 text-white drop-shadow-lg" />
                </button>
            </div>
        </div>
    );
};

export default StoryViewer;
