import React, { useState } from 'react';
// FIX: Added file extension to types import
import { User } from '../types.ts';
// FIX: Added file extension to firebaseConfig import
import { db } from '../firebaseConfig.ts';
import { doc, updateDoc, Timestamp, increment } from 'firebase/firestore';
// FIX: Added file extension to icon import
import FlameIcon from './icons/FlameIcon.tsx';

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
        setClaimed(true); // Optimistically update modal state
        
        const newCoinTotal = (currentUser.coins ?? 0) + bonusAmount;
        const newBonusTimestamp = Timestamp.now();
        
        try {
            await updateDoc(doc(db, 'users', currentUser.id), {
                coins: increment(bonusAmount),
                lastDailyBonus: newBonusTimestamp
            });
            onUpdateUser({ ...currentUser, coins: newCoinTotal, lastDailyBonus: newBonusTimestamp });
        } catch (error) {
            console.error("Error claiming bonus:", error);
            alert("Failed to claim bonus. Please try again.");
            setClaimed(false); // Revert on failure
        }
    };

    return (
        <div className="absolute inset-0 bg-black/70 flex justify-center items-center z-[100]" onClick={onClose}>
            <div className="bg-white dark:bg-zinc-800 rounded-lg w-11/12 max-w-md p-6 text-center" onClick={e => e.stopPropagation()}>
                {!claimed ? (
                    <>
                        <h2 className="text-2xl font-bold dark:text-gray-200">Daily Bonus!</h2>
                        <p className="mt-2 text-gray-600 dark:text-gray-400">Claim your daily bonus of 50 coins!</p>
                        <FlameIcon isGradient className="w-16 h-16 mx-auto my-4" />
                        <button onClick={handleClaim} className="w-full py-3 bg-green-500 text-white font-bold rounded-lg">
                            Claim 50 Coins
                        </button>
                    </>
                ) : (
                    <>
                        <h2 className="text-2xl font-bold dark:text-gray-200">Bonus Claimed!</h2>
                        <p className="mt-2 text-gray-600 dark:text-gray-400">You received 50 coins. Come back tomorrow for more!</p>
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