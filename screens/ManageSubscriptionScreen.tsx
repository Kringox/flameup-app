
import React, { useEffect, useState } from 'react';
import { User } from '../types.ts';
import SparklesIcon from '../components/icons/SparklesIcon.tsx';
import { db } from '../firebaseConfig.ts';
import { collection, query, where, getDocs, doc, updateDoc, arrayRemove } from 'firebase/firestore';

interface ManageSubscriptionScreenProps {
  user: User;
  onClose: () => void;
}

const ManageSubscriptionScreen: React.FC<ManageSubscriptionScreenProps> = ({ user, onClose }) => {
    const [subscriptions, setSubscriptions] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchSubscriptions = async () => {
            if (!user.subscriptions || user.subscriptions.length === 0 || !db) {
                setIsLoading(false);
                return;
            }

            try {
                // Firestore 'in' limit is 10 (or 30 depending on version), simple loop for now safe for <10 subs
                // For production, batching is needed.
                const subs: User[] = [];
                const chunks = [];
                const chunkSize = 10;
                
                for (let i = 0; i < user.subscriptions.length; i += chunkSize) {
                    chunks.push(user.subscriptions.slice(i, i + chunkSize));
                }

                for (const chunk of chunks) {
                     const q = query(collection(db, 'users'), where('__name__', 'in', chunk));
                     const snap = await getDocs(q);
                     snap.forEach(d => subs.push({id: d.id, ...(d.data() || {})} as User));
                }
                
                setSubscriptions(subs);
            } catch (error) {
                console.error("Error fetching subscriptions", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchSubscriptions();
    }, [user.subscriptions]);

    const handleUnsubscribe = async (creatorId: string) => {
        if (!db || !window.confirm("Are you sure you want to cancel this subscription? You will lose access immediately.")) return;
        
        try {
            await updateDoc(doc(db, 'users', user.id), {
                subscriptions: arrayRemove(creatorId)
            });
            setSubscriptions(prev => prev.filter(u => u.id !== creatorId));
        } catch (e) {
            console.error("Unsubscribe failed", e);
        }
    };

    // Calculate dates (mocked for now, real app needs a 'subscriptions' collection with timestamps)
    const startDate = new Date().toLocaleDateString();
    const renewalDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString();

    return (
        <div className="absolute inset-0 bg-gray-100 dark:bg-black z-[80] flex flex-col animate-slide-in">
            <style>{`.animate-slide-in { animation: slideInFromRight 0.3s ease-out; } @keyframes slideInFromRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
            <header className="flex items-center p-4 border-b dark:border-gray-800 bg-white dark:bg-zinc-900">
                 <button onClick={onClose} className="w-8 text-dark-gray dark:text-gray-200">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <h1 className="text-xl font-bold text-center flex-1 text-dark-gray dark:text-gray-200">My Subscriptions</h1>
                <div className="w-8"></div>
            </header>
            <main className="flex-1 p-4 overflow-y-auto">
                <div className="text-center mb-6">
                    <SparklesIcon className="w-12 h-12 mx-auto text-premium-gold mb-2" />
                    <h2 className="text-lg font-bold dark:text-white">Active Creator Subscriptions</h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Manage the creators you support.</p>
                </div>

                {isLoading ? (
                    <div className="flex justify-center p-4"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div></div>
                ) : subscriptions.length === 0 ? (
                    <div className="text-center p-8 bg-white dark:bg-zinc-800 rounded-lg shadow-sm">
                        <p className="text-gray-500 dark:text-gray-400">You haven't subscribed to any creators yet.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {subscriptions.map(creator => (
                            <div key={creator.id} className="p-4 bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-700">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center">
                                        <img src={creator.profilePhotos[0]} alt={creator.name} className="w-12 h-12 rounded-full object-cover border border-gray-200" />
                                        <div className="ml-3">
                                            <p className="font-bold dark:text-white">{creator.name}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {creator.subscriptionPrice} Coins/mo
                                            </p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleUnsubscribe(creator.id)}
                                        className="px-3 py-1 bg-gray-100 dark:bg-zinc-700 text-red-500 text-xs font-bold rounded-lg hover:bg-red-50"
                                    >
                                        Cancel
                                    </button>
                                </div>
                                <div className="text-xs text-gray-500 border-t border-gray-100 dark:border-zinc-700 pt-2 flex justify-between">
                                    <span>Started: {startDate}</span>
                                    <span>Renews: {renewalDate}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default ManageSubscriptionScreen;
