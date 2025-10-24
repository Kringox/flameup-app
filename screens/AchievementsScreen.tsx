import React, { useState, useEffect } from 'react';
// FIX: Added file extension to types import
import { User, Post } from '../types.ts';
import { db } from '../firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';
// FIX: Added file extension to achievementUtils import
import { Achievement, ACHIEVEMENTS } from '../utils/achievementUtils.ts';

interface AchievementsScreenProps {
  user: User;
  onClose: () => void;
}

const AchievementRow: React.FC<{ achievement: Achievement, isUnlocked: boolean }> = ({ achievement, isUnlocked }) => (
    <div className={`flex items-center p-4 bg-white rounded-lg shadow-sm ${!isUnlocked && 'opacity-50'}`}>
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isUnlocked ? 'bg-premium-gold/20' : 'bg-gray-200'}`}>
            {React.cloneElement(achievement.icon, { className: `w-6 h-6 ${isUnlocked ? 'text-premium-gold' : 'text-gray-500'}`})}
        </div>
        <div className="ml-4">
            <h3 className="font-bold">{achievement.title}</h3>
            <p className="text-sm text-gray-600">{achievement.description}</p>
        </div>
    </div>
);

const AchievementsScreen: React.FC<AchievementsScreenProps> = ({ user, onClose }) => {
    const [userPosts, setUserPosts] = useState<Post[]>([]);

    useEffect(() => {
        const fetchPosts = async () => {
            if (!db) return;
            const q = query(collection(db, 'posts'), where('userId', '==', user.id));
            const querySnapshot = await getDocs(q);
            setUserPosts(querySnapshot.docs.map(doc => doc.data() as Post));
        };
        fetchPosts();
    }, [user.id]);
    
    return (
        <div className="absolute inset-0 bg-gray-100 z-[80] flex flex-col animate-slide-in">
            <style>{`.animate-slide-in { animation: slideInFromRight 0.3s ease-out; } @keyframes slideInFromRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
            <header className="flex items-center p-4 border-b bg-white">
                 <button onClick={onClose} className="w-8">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <h1 className="text-xl font-bold text-center flex-1">Achievements</h1>
                <div className="w-8"></div>
            </header>
            <main className="flex-1 p-4 space-y-3 overflow-y-auto">
                {ACHIEVEMENTS.map(ach => (
                    <AchievementRow 
                        key={ach.id} 
                        achievement={ach} 
                        isUnlocked={ach.isUnlocked(user, { posts: userPosts })} 
                    />
                ))}
            </main>
        </div>
    );
};

export default AchievementsScreen;
