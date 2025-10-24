import React from 'react';
// FIX: Added file extension to types import
import { User } from '../types.ts';
// FIX: Added file extension to icon import
import SparklesIcon from '../components/icons/SparklesIcon.tsx';

interface ManageSubscriptionScreenProps {
  user: User;
  onClose: () => void;
}

const ManageSubscriptionScreen: React.FC<ManageSubscriptionScreenProps> = ({ user, onClose }) => {
    return (
        <div className="absolute inset-0 bg-gray-100 z-[80] flex flex-col animate-slide-in">
            <style>{`.animate-slide-in { animation: slideInFromRight 0.3s ease-out; } @keyframes slideInFromRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
            <header className="flex items-center p-4 border-b bg-white">
                 <button onClick={onClose} className="w-8">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <h1 className="text-xl font-bold text-center flex-1">FlameUp Premium</h1>
                <div className="w-8"></div>
            </header>
            <main className="flex-1 p-6 text-center">
                <SparklesIcon className="w-16 h-16 mx-auto text-premium-gold" />
                <h2 className="text-2xl font-bold mt-4">Unlock Your Superpowers</h2>
                <p className="text-gray-600 mt-2">Get the most out of FlameUp with these exclusive features.</p>

                <ul className="text-left space-y-3 mt-8">
                    <li className="flex items-center"><SparklesIcon className="w-5 h-5 text-premium-gold mr-3" /> See who likes you</li>
                    <li className="flex items-center"><SparklesIcon className="w-5 h-5 text-premium-gold mr-3" /> Unlimited swipes</li>
                    <li className="flex items-center"><SparklesIcon className="w-5 h-5 text-premium-gold mr-3" /> See who visited your profile</li>
                    <li className="flex items-center"><SparklesIcon className="w-5 h-5 text-premium-gold mr-3" /> Customize your profile theme</li>
                </ul>

                {user.isPremium ? (
                    <div className="mt-8">
                        <p className="font-semibold text-green-600">You are a Premium member!</p>
                        <button className="w-full mt-4 p-3 bg-gray-200 rounded-lg">Manage Subscription</button>
                    </div>
                ) : (
                    <button className="w-full mt-8 p-4 bg-premium-gold text-white rounded-lg font-bold text-lg">
                        Upgrade for $9.99/mo
                    </button>
                )}
            </main>
        </div>
    );
};

export default ManageSubscriptionScreen;
