import React, { useState } from 'react';
// FIX: Added file extension to types import
import { User } from '../types.ts';
// FIX: Added file extensions to component imports
import CoinIcon from '../components/icons/CoinIcon.tsx';
import BuyCoinsModal from '../components/BuyCoinsModal.tsx';
import DailyBonusModal from '../components/DailyBonusModal.tsx';
import { Timestamp } from 'firebase/firestore';

interface WalletScreenProps {
  user: User;
  onClose: () => void;
  onUpdateUser: (user: User) => void;
}

const WalletScreen: React.FC<WalletScreenProps> = ({ user, onClose, onUpdateUser }) => {
    const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
    const [isBonusModalOpen, setIsBonusModalOpen] = useState(false);
    
    const canClaimBonus = () => {
        if (!user.lastDailyBonus) return true;
        const lastBonusDate = user.lastDailyBonus.toDate();
        const now = new Date();
        return now.getTime() - lastBonusDate.getTime() > 24 * 60 * 60 * 1000;
    };
    
    const handleClaimBonus = () => {
        setIsBonusModalOpen(true);
    };

    return (
        <>
        {isBuyModalOpen && <BuyCoinsModal onClose={() => setIsBuyModalOpen(false)} currentUser={user} onUpdateUser={onUpdateUser} />}
        {isBonusModalOpen && <DailyBonusModal onClose={() => setIsBonusModalOpen(false)} currentUser={user} onUpdateUser={onUpdateUser} />}
        <div className="absolute inset-0 bg-gray-100 z-[80] flex flex-col">
            <header className="flex items-center p-4 border-b bg-white">
                 <button onClick={onClose} className="w-8">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <h1 className="text-xl font-bold text-center flex-1">My Wallet</h1>
                <div className="w-8"></div>
            </header>
            <main className="flex-1 p-4">
                <div className="bg-white rounded-lg p-6 text-center shadow">
                    <p className="text-gray-500">Your Balance</p>
                    <div className="flex items-center justify-center mt-2">
                        <CoinIcon className="w-8 h-8 text-yellow-500" />
                        <span className="text-4xl font-bold ml-2">{user.coins}</span>
                    </div>
                </div>

                <div className="mt-6">
                    <button onClick={handleClaimBonus} disabled={!canClaimBonus()} className="w-full p-4 bg-green-500 text-white rounded-lg font-bold text-lg disabled:bg-gray-400">
                        {canClaimBonus() ? 'Claim Daily Bonus' : 'Bonus Claimed Today'}
                    </button>
                    <button onClick={() => setIsBuyModalOpen(true)} className="w-full mt-4 p-4 bg-flame-orange text-white rounded-lg font-bold text-lg">
                        Buy More Coins
                    </button>
                </div>
                
                <div className="mt-8">
                    <h2 className="font-bold text-lg">Transaction History</h2>
                    <p className="text-center text-gray-500 mt-4">No transactions yet.</p>
                </div>
            </main>
        </div>
        </>
    );
};

export default WalletScreen;
