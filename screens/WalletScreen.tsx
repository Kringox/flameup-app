
import React, { useState } from 'react';
import { User } from '../types.ts';
import FlameIcon from '../components/icons/FlameIcon.tsx';
import BuyCoinsModal from '../components/BuyCoinsModal.tsx';
import { useI18n } from '../contexts/I18nContext.ts';
import CashOutScreen from './CashOutScreen.tsx';
import { db } from '../firebaseConfig.ts';
import { doc, updateDoc, increment } from 'firebase/firestore';

interface WalletScreenProps {
  user: User;
  onClose: () => void;
  onUpdateUser: (user: User) => void;
}

const WalletScreen: React.FC<WalletScreenProps> = ({ user, onClose, onUpdateUser }) => {
    const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
    const [isCashOutOpen, setIsCashOutOpen] = useState(false);
    const { t } = useI18n();
    
    // NOTE: Coins are managed via App.tsx real-time listener.
    // We only trigger Firestore updates here.
    
    const handlePurchase = async (item: 'swipes' | 'superlike') => {
        if (!db) return;
        
        const costs = { swipes: 10, superlike: 5 };
        const cost = costs[item];

        if ((user.coins || 0) < cost) {
            alert('Not enough coins!');
            return;
        }

        const confirmText = item === 'swipes' 
            ? `Buy 10 extra swipes for 10 coins?`
            : `Buy 1 Superlike for 5 coins?`;

        if (window.confirm(confirmText)) {
            try {
                const userRef = doc(db, 'users', user.id);
                const updates: any = { coins: increment(-cost) };
                
                if (item === 'swipes') {
                    // Decrementing swipes used effectively adds swipes to the daily limit
                    updates.dailySwipesUsed = increment(-10);
                } else if (item === 'superlike') {
                    updates.freeSuperLikes = increment(1);
                }
                
                await updateDoc(userRef, updates);

                // FIX: Removed optimistic update for coins to prevent overwriting the source of truth (Firestore listener in App.tsx)
                // The UI will update automatically when Firestore syncs.
                // We still optimistically update other props if needed for immediate feedback, but coins is critical.
                
            } catch (error) {
                console.error(`Error purchasing ${item}:`, error);
                alert('Purchase failed. Please try again.');
            }
        }
    };

    return (
        <>
        {isBuyModalOpen && <BuyCoinsModal onClose={() => setIsBuyModalOpen(false)} currentUser={user} onUpdateUser={onUpdateUser} />}
        {isCashOutOpen && <CashOutScreen user={user} onClose={() => setIsCashOutOpen(false)} />}
        <div className="absolute inset-0 bg-gray-100 dark:bg-black z-[80] flex flex-col">
            <header className="flex items-center p-4 border-b dark:border-gray-800 bg-white dark:bg-zinc-900">
                 <button onClick={onClose} className="w-8 text-dark-gray dark:text-gray-200">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <h1 className="text-xl font-bold text-center flex-1 text-dark-gray dark:text-gray-200">{t('myWallet')}</h1>
                <div className="w-8"></div>
            </header>
            <main className="flex-1 p-4 overflow-y-auto">
                <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 text-center shadow">
                    <p className="text-gray-500 dark:text-gray-400">{t('yourBalance')}</p>
                    <div className="flex items-center justify-center mt-2 text-dark-gray dark:text-gray-200">
                        <FlameIcon isGradient className="w-8 h-8" />
                        <span className="text-4xl font-bold ml-2">{Number(user.coins) || 0}</span>
                    </div>
                     <p className="text-xs text-gray-400 mt-2">(≈ €{( (Number(user.coins) || 0) / 100).toFixed(2)})</p>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6">
                    <button onClick={() => setIsBuyModalOpen(true)} className="p-4 bg-flame-orange text-white rounded-lg font-bold text-lg">
                        {t('buyMoreCoins')}
                    </button>
                     <button onClick={() => setIsCashOutOpen(true)} className="p-4 bg-gray-200 dark:bg-zinc-700 text-dark-gray dark:text-gray-200 rounded-lg font-bold text-lg">
                        Cash Out
                    </button>
                </div>

                <div className="mt-8">
                    <h2 className="font-bold text-lg dark:text-gray-200">Spend Coins</h2>
                     <div className="bg-white dark:bg-zinc-800 rounded-lg p-2 mt-2 space-y-2">
                         <button onClick={() => handlePurchase('swipes')} className="w-full flex justify-between items-center p-3 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-lg">
                            <span className="font-semibold text-dark-gray dark:text-gray-200">⚡️ Buy 10 Swipes</span>
                            <span className="flex items-center font-bold text-flame-orange">10 <FlameIcon className="w-4 h-4 ml-1"/></span>
                         </button>
                          <button onClick={() => handlePurchase('superlike')} className="w-full flex justify-between items-center p-3 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-lg">
                            <span className="font-semibold text-dark-gray dark:text-gray-200">⭐️ Buy 1 Superlike</span>
                            <span className="flex items-center font-bold text-flame-orange">5 <FlameIcon className="w-4 h-4 ml-1"/></span>
                         </button>
                    </div>
                </div>
                
                <div className="mt-8">
                    <div className="flex justify-between items-center">
                        <h2 className="font-bold text-lg dark:text-gray-200">{t('transactionHistory')}</h2>
                        <button className="text-sm text-flame-orange font-semibold" disabled>View All</button>
                    </div>
                    <div className="bg-white dark:bg-zinc-800 rounded-lg p-8 text-center mt-2">
                        <p className="text-gray-500 dark:text-gray-400">{t('noTransactions')}</p>
                    </div>
                </div>
            </main>
        </div>
        </>
    );
};

export default WalletScreen;
