import React, { useState } from 'react';
// FIX: Added file extension to types import
import { User } from '../types.ts';
// FIX: Added file extension to firebaseConfig import
import { db } from '../firebaseConfig.ts';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
// FIX: Added file extension to icon import
import CoinIcon from './icons/CoinIcon.tsx';

interface DailyBonusModalProps {
    onClose: () => void;
    currentUser: User;
    onUpdateUser: (user: User) => void;
}

const DailyBonusModal: React.FC<DailyBonusModalProps> = ({ onClose, currentUser, onUpdateUser }) => {
    const [claimed, setClaimed] = useState(false);
    const bonusAmount = 50;

    const handleClaim = async () => {
        if (claimed || !db) return;
        
        const newCoinTotal = currentUser.coins + bonusAmount;
        const newBonusTimestamp = Timestamp.now();
        await updateDoc(doc(db, 'users', currentUser.id), {
            coins: newCoinTotal,
            lastDailyBonus: newBonusTimestamp
        });
        onUpdateUser({ ...currentUser, coins: newCoinTotal, lastDailyBonus: newBonusTimestamp });
        setClaimed(true);
    };

    return (
        <div className="absolute inset-0 bg-black/70 flex justify-center items-center z-[100]" onClick={onClose}>
            <div className="bg-white rounded-lg w-11/12 max-w-md p-6 text-center" onClick={e => e.stopPropagation()}>
                {!claimed ? (
                    <>
                        <h2 className="text-2xl font-bold">Daily Bonus!</h2>
                        <p className="mt-2">Claim your daily bonus of 50 coins!</p>
                        <CoinIcon className="w-16 h-16 mx-auto my-4 text-yellow-500" />
                        <button onClick={handleClaim} className="w-full py-3 bg-green-500 text-white font-bold rounded-lg">
                            Claim 50 Coins
                        </button>
                    </>
                ) : (
                    <>
                        <h2 className="text-2xl font-bold">Bonus Claimed!</h2>
                        <p className="mt-2">You received 50 coins. Come back tomorrow for more!</p>
                        <button onClick={onClose} className="w-full mt-4 py-3 bg-flame-orange text-white font-bold rounded-lg">
                            Awesome!
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default DailyBonusModal;