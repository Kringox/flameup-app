
import React, { useState } from 'react';
import { User } from '../types.ts';
import FlameIcon from '../components/icons/FlameIcon.tsx';
import BuyCoinsModal from '../components/BuyCoinsModal.tsx';
import { useI18n } from '../contexts/I18nContext.ts';

interface WalletScreenProps {
  user: User;
  onClose: () => void;
  onUpdateUser: (user: User) => void;
}

const WalletScreen: React.FC<WalletScreenProps> = ({ user, onClose, onUpdateUser }) => {
    const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
    const { t } = useI18n();
    
    return (
        <>
        {isBuyModalOpen && <BuyCoinsModal onClose={() => setIsBuyModalOpen(false)} currentUser={user} onUpdateUser={onUpdateUser} />}
        <div className="absolute inset-0 bg-gray-100 dark:bg-black z-[80] flex flex-col">
            <header className="flex items-center p-4 border-b dark:border-gray-800 bg-white dark:bg-zinc-900">
                 <button onClick={onClose} className="w-8 text-dark-gray dark:text-gray-200">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <h1 className="text-xl font-bold text-center flex-1 text-dark-gray dark:text-gray-200">{t('myWallet')}</h1>
                <div className="w-8"></div>
            </header>
            <main className="flex-1 p-4">
                <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 text-center shadow">
                    <p className="text-gray-500 dark:text-gray-400">{t('yourBalance')}</p>
                    <div className="flex items-center justify-center mt-2 text-dark-gray dark:text-gray-200">
                        <FlameIcon isGradient className="w-8 h-8" />
                        <span className="text-4xl font-bold ml-2">{Number(user.coins) || 0}</span>
                    </div>
                </div>

                <div className="mt-6">
                    {/* Daily Bonus removed from economy */}
                    <button onClick={() => setIsBuyModalOpen(true)} className="w-full mt-4 p-4 bg-flame-orange text-white rounded-lg font-bold text-lg">
                        {t('buyMoreCoins')}
                    </button>
                </div>
                
                <div className="mt-8">
                    <h2 className="font-bold text-lg dark:text-gray-200">{t('transactionHistory')}</h2>
                    <p className="text-center text-gray-500 dark:text-gray-400 mt-4">{t('noTransactions')}</p>
                </div>
            </main>
        </div>
        </>
    );
};

export default WalletScreen;
