import React, { useState, useEffect, useRef } from 'react';
// FIX: Added file extension to types import
import { Story } from '../types.ts';

interface StoryViewerProps {
    stories: Story[];
    startIndex?: number;
    onClose: () => void;
    onStoryViewed: (storyId: string) => void;
}

const StoryViewer: React.FC<StoryViewerProps> = ({ stories, startIndex = 0, onClose, onStoryViewed }) => {
    const [currentIndex, setCurrentIndex] = useState(startIndex);
    const [progress, setProgress] = useState(0);
    const timerRef = useRef<number | null>(null);
    const storyDuration = 5000; // 5 seconds per story

    useEffect(() => {
        if (stories.length > 0 && stories[currentIndex]?.id) {
            onStoryViewed(stories[currentIndex].id);
        }
    }, [currentIndex, stories, onStoryViewed]);

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

    if (!stories || stories.length === 0) {
        onClose();
        return null;
    }

    const currentStory = stories[currentIndex];
    const storyUser = currentStory.user;

    return (
        <div className="absolute inset-0 bg-black z-[100] flex flex-col justify-center">
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
                        <img src={storyUser.profilePhoto} alt={storyUser.name} className="w-8 h-8 rounded-full" />
                        <span className="text-white font-semibold ml-2">{storyUser.name}</span>
                    </div>
                    <button onClick={onClose} className="text-white">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            </div>
            
            <div className="relative w-full h-full">
                <img src={currentStory.mediaUrl} alt="Story content" className="w-full h-full object-contain" />
                <div className="absolute inset-0 flex">
                    <div className="w-1/3 h-full" onClick={goToPrevStory}></div>
                    <div className="w-2/3 h-full" onClick={goToNextStory}></div>
                </div>
            </div>
        </div>
    );
};

export default StoryViewer;
